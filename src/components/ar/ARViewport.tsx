'use client';

/**
 * ARViewport — Core Three.js + ARTrackingProvider + GeoAnchorEngine runtime.
 * Shared identically by /ar-lab (real-device tracking test bench) and /hunt/[huntId]/play.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { HuntData } from '@/types/hunt';
import { AR_GAMEPLAY_CONFIG, type CoinStyle } from '@/lib/ar/experienceConfig';
import { GeoAnchorEngine } from '@/lib/ar/geoAnchorEngine';
import {
  createDebugHorizonRing,
  createLootEntityBundle,
  setupLootLighting,
  type LootEntityBundle,
} from '@/lib/ar/lootModels';
import { formatDistanceFeet, lerpAngleRad } from '@/lib/ar/geoMath';
import type { SensorHub } from '@/lib/ar/sensorHub';
import { EighthWallProvider } from '@/lib/ar/providers/eighthWallProvider';
import { SensorFusionProvider } from '@/lib/ar/providers/sensorFusionProvider';
import { SimulatorProvider } from '@/lib/ar/providers/simulatorProvider';
import { WebXRProvider } from '@/lib/ar/providers/webxrProvider';
import type {
  ARPinAnchorState,
  ARTelemetry,
  ARTrackingMode,
  ARTrackingProvider,
  ARTrackingStatus,
  SimulatorInput,
} from '@/lib/ar/types';

export interface ARViewportProps {
  hunt: Pick<HuntData, 'id' | 'type' | 'pins'>;
  sensorHub: SensorHub;
  preferredMode: ARTrackingMode;
  coinStyle: CoinStyle;
  showHorizon: boolean;
  isSummoning: boolean;
  recenterNonce: number;
  externalCollectedPinIds: Set<string>;
  simulatorInputRef?: React.MutableRefObject<SimulatorInput>;
  onTelemetry: (telemetry: ARTelemetry, anchors: ARPinAnchorState[]) => void;
  onPinCollected: (pinId: string, method: 'walkup' | 'summon') => void;
  onFocusChange?: (pinId: string | null) => void;
  onProviderResolved?: (mode: ARTrackingMode, fallbackReason?: string) => void;
}

interface ActiveEntityRecord {
  pinId: string;
  bundle: LootEntityBundle;
  basePos: THREE.Vector3;
  summonStartPos: THREE.Vector3 | null;
  summonInitialDist: number;
  summonProgress: number;
  farBeaconOpacity: number;
}

export const ARViewport: React.FC<ARViewportProps> = ({
  hunt,
  sensorHub,
  preferredMode,
  coinStyle,
  showHorizon,
  isSummoning,
  recenterNonce,
  externalCollectedPinIds,
  simulatorInputRef,
  onTelemetry,
  onPinCollected,
  onFocusChange,
  onProviderResolved,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest reactive props stored in refs so the 60fps loop never restarts on HUD changes
  const isSummoningRef = useRef(isSummoning);
  const showHorizonRef = useRef(showHorizon);
  const onTelemetryRef = useRef(onTelemetry);
  const onPinCollectedRef = useRef(onPinCollected);
  const onFocusChangeRef = useRef(onFocusChange);
  const onProviderResolvedRef = useRef(onProviderResolved);
  const externalCollectedRef = useRef(externalCollectedPinIds);

  useEffect(() => {
    isSummoningRef.current = isSummoning;
  }, [isSummoning]);

  useEffect(() => {
    showHorizonRef.current = showHorizon;
  }, [showHorizon]);

  useEffect(() => {
    onTelemetryRef.current = onTelemetry;
    onPinCollectedRef.current = onPinCollected;
    onFocusChangeRef.current = onFocusChange;
    onProviderResolvedRef.current = onProviderResolved;
  }, [onTelemetry, onPinCollected, onFocusChange, onProviderResolved]);

  const engineRef = useRef<GeoAnchorEngine | null>(null);
  const providerRef = useRef<ARTrackingProvider | null>(null);
  const lastCameraPosRef = useRef(new THREE.Vector3(0, 1.6, 0));
  const pinsRef = useRef(hunt.pins);
  useEffect(() => {
    pinsRef.current = hunt.pins;
  }, [hunt.pins]);

  // Sync pins collected by other players
  useEffect(() => {
    externalCollectedRef.current = externalCollectedPinIds;
    engineRef.current?.syncExternalCollections(externalCollectedPinIds);
  }, [externalCollectedPinIds]);

  // Handle manual recenter trigger
  useEffect(() => {
    if (recenterNonce === 0) return;
    providerRef.current?.recenter();
    engineRef.current?.recenter(
      lastCameraPosRef.current,
      sensorHub.getSmoothedHeadingDeg()
    );
  }, [recenterNonce, sensorHub]);

  // Main AR provider + Three.js scene lifecycle
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let disposed = false;
    const initialPins = pinsRef.current;
    const engine = new GeoAnchorEngine({ type: hunt.type, pins: initialPins });
    engine.syncExternalCollections(externalCollectedRef.current);
    engineRef.current = engine;

    // Pick initial GPS origin for Simulator mode (center near first geolocation pin!)
    let simOrigin: { lat: number; lng: number } | undefined;
    if (hunt.type === 'geolocation') {
      const firstGeoPin = initialPins.find(
        (p) => p.lat !== undefined && p.lng !== undefined && !p.collectedByUserId
      );
      if (firstGeoPin && firstGeoPin.lat !== undefined && firstGeoPin.lng !== undefined) {
        // Place virtual player ~7m South of the first pin so it's immediately visible ahead!
        simOrigin = {
          lat: Number(firstGeoPin.lat) - 0.000065,
          lng: Number(firstGeoPin.lng),
        };
      }
    }

    const entities = new Map<string, ActiveEntityRecord>();
    const localCollected = new Set<string>(externalCollectedRef.current);
    let horizonRing: THREE.Mesh | null = null;
    let sceneRef: THREE.Scene | null = null;

    let activeMode: ARTrackingMode = preferredMode;
    let status: ARTrackingStatus = 'initializing';
    let statusDetail = 'Starting AR…';

    let focusedPinId: string | null = null;
    let focusedDistanceMeters: number | null = null;
    let summoningPinId: string | null = null;
    let smoothedBearingRad = 0;

    let elapsedSec = 0;
    let frameCount = 0;
    let fpsAccum = 0;
    let currentFps = 60;
    let lastTelemetryPush = 0;

    const camForward = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const toEntity = new THREE.Vector3();

    const createProvider = (mode: ARTrackingMode): ARTrackingProvider => {
      switch (mode) {
        case '8thwall':
          return new EighthWallProvider();
        case 'webxr':
          return new WebXRProvider();
        case 'simulator':
          return new SimulatorProvider(sensorHub, simOrigin);
        case 'sensor-fusion':
        default:
          return new SensorFusionProvider(sensorHub);
      }
    };

    const removeEntity = (pinId: string) => {
      const rec = entities.get(pinId);
      if (rec && sceneRef) {
        sceneRef.remove(rec.bundle.root);
      }
      entities.delete(pinId);
    };

    const triggerCollect = (pinId: string, method: 'walkup' | 'summon') => {
      if (localCollected.has(pinId)) return;
      localCollected.add(pinId);
      engine.markCollected(pinId);
      removeEntity(pinId);

      if (focusedPinId === pinId) {
        focusedPinId = null;
        focusedDistanceMeters = null;
        onFocusChangeRef.current?.(null);
      }
      if (summoningPinId === pinId) {
        summoningPinId = null;
      }

      onPinCollectedRef.current(pinId, method);
    };

    const onFrame = (
      dt: number,
      camera: THREE.PerspectiveCamera,
      scene: THREE.Scene
    ) => {
      if (disposed) return;

      elapsedSec += dt;
      frameCount += 1;
      fpsAccum += dt;
      if (fpsAccum >= 0.5) {
        currentFps = Math.round(frameCount / fpsAccum);
        frameCount = 0;
        fpsAccum = 0;
      }

      // Forward simulator virtual joystick inputs if active
      if (simulatorInputRef?.current && providerRef.current?.setSimulatorInput) {
        providerRef.current.setSimulatorInput(simulatorInputRef.current);
      }

      lastCameraPosRef.current.copy(camera.position);
      camera.getWorldDirection(camForward);
      camRight.crossVectors(camForward, camera.up).normalize();

      // Update debug horizon ring
      if (horizonRing) {
        horizonRing.visible = showHorizonRef.current;
        horizonRing.position.set(camera.position.x, camera.position.y - 0.1, camera.position.z);
      }

      const gpsFix = sensorHub.getWeightedGpsFix();
      const headingDeg = sensorHub.getSmoothedHeadingDeg();
      const anchors = engine.update({
        cameraPosition: camera.position,
        cameraForward: camForward,
        gpsFix,
        headingDeg,
      });

      // Sync meshes with anchor states
      for (const anchor of anchors) {
        if (anchor.collected || localCollected.has(anchor.pinId)) {
          if (entities.has(anchor.pinId)) {
            removeEntity(anchor.pinId);
          }
          continue;
        }

        let rec = entities.get(anchor.pinId);
        if (!rec) {
          const bundle = createLootEntityBundle(anchor.objectType, coinStyle);
          bundle.root.position.set(anchor.worldPos.x, anchor.worldPos.y, anchor.worldPos.z);
          scene.add(bundle.root);
          rec = {
            pinId: anchor.pinId,
            bundle,
            basePos: new THREE.Vector3(anchor.worldPos.x, anchor.worldPos.y, anchor.worldPos.z),
            summonStartPos: null,
            summonInitialDist: 0,
            summonProgress: 0,
            farBeaconOpacity: 0,
          };
          entities.set(anchor.pinId, rec);
        }

        // Update basePos when not mid-summon
        if (summoningPinId !== anchor.pinId) {
          rec.basePos.set(anchor.worldPos.x, anchor.worldPos.y, anchor.worldPos.z);
        }
      }

      // Gameplay constants from shared ar-gameplay.json
      const {
        focusRangeMeters,
        degradedGpsFocusRangeMeters,
        degradedGpsThresholdMeters,
        focusHotspot,
        walkUpCollectMeters,
        summonCollectMeters,
        summonSpeedMinMps,
        summonSpeedMaxMps,
        summonScaleMax,
        bobAmplitudeMeters,
        bobPeriodSec,
        spinPeriodSec,
      } = AR_GAMEPLAY_CONFIG.gameplay;

      const effectiveFocusRange =
        gpsFix && gpsFix.accuracy > degradedGpsThresholdMeters
          ? degradedGpsFocusRangeMeters
          : focusRangeMeters;

      // Nearest loot + screen-space focus hotspot evaluation
      let nearestPinId: string | null = null;
      let nearestDist = Infinity;
      let nearestWorldPos: THREE.Vector3 | null = null;

      let bestFocusId: string | null = null;
      let bestFocusDist = Infinity;
      let bestFocusCenterOffset = Infinity;

      const bobOffset =
        Math.sin((elapsedSec / bobPeriodSec) * Math.PI * 2) * bobAmplitudeMeters;
      const spinAngle = (elapsedSec / spinPeriodSec) * Math.PI; // 180 deg per 2s (matches iOS)

      for (const anchor of anchors) {
        if (anchor.collected || localCollected.has(anchor.pinId)) continue;
        const rec = entities.get(anchor.pinId);
        if (!rec) continue;

        const isBeingSummoned = summoningPinId === anchor.pinId && isSummoningRef.current;

        // If button was released mid-summon, smoothly snap back to original SLAM position & 1x scale
        if (!isBeingSummoned && rec.summonStartPos) {
          rec.bundle.root.position.copy(rec.summonStartPos);
          rec.bundle.visual.scale.setScalar(1);
          rec.summonStartPos = null;
          rec.summonProgress = 0;
          if (summoningPinId === anchor.pinId) {
            summoningPinId = null;
          }
        }

        // Apply idle spin + bobbing
        rec.bundle.visual.rotation.y = spinAngle;
        if (!isBeingSummoned) {
          rec.bundle.root.position.set(
            rec.basePos.x,
            rec.basePos.y + bobOffset,
            rec.basePos.z
          );
        }

        // Distance from live camera
        const dist = rec.bundle.root.position.distanceTo(camera.position);

        // Soft fading distant glow + distance badge:
        // Only appears for truly distant outdoor pins (> 30.48m / 100 ft)
        // AND only when the pin is inside the middle third of the AR viewport (sx in [1/3, 2/3]).
        const farMinDist = AR_GAMEPLAY_CONFIG.tracking.farBeaconMinDistanceMeters;
        let targetBeaconOpacity = 0;

        if (dist > farMinDist) {
          toEntity.subVectors(rec.basePos, camera.position).normalize();
          if (camForward.dot(toEntity) > 0.15) {
            projected.copy(rec.basePos).project(camera);
            const sx = (projected.x + 1) * 0.5;
            if (sx >= 1 / 3 && sx <= 2 / 3) {
              // Smooth edge feathering over 5% inside the middle third so the glow softly blooms in/out
              const leftFeather = Math.min(1, (sx - 1 / 3) / 0.05);
              const rightFeather = Math.min(1, (2 / 3 - sx) / 0.05);
              const edgeFactor = Math.min(leftFeather, rightFeather);
              targetBeaconOpacity = 0.82 * edgeFactor;
            }
          }
        }

        const fadeRate = Math.min(1, dt * 8);
        rec.farBeaconOpacity += (targetBeaconOpacity - rec.farBeaconOpacity) * fadeRate;

        const beaconMat = rec.bundle.farBeacon.material as THREE.MeshBasicMaterial;
        const labelMat = rec.bundle.farDistanceSprite.material as THREE.SpriteMaterial;
        const showFarGlow = rec.farBeaconOpacity > 0.02;

        rec.bundle.farBeacon.visible = showFarGlow;
        rec.bundle.farDistanceSprite.visible = showFarGlow;

        if (showFarGlow) {
          // Scale proportionally to distance so the soft veil & distance pill stay crisp at 100ft–500ft
          const scaledWidth = Math.max(2.4, dist * 0.12);
          rec.bundle.farBeacon.scale.set(scaledWidth, scaledWidth, 1);
          rec.bundle.farBeacon.position.y = scaledWidth * 0.65;
          // Cylindrical billboard: stays upright while facing the camera horizontally
          const yawToCam = Math.atan2(
            camera.position.x - rec.bundle.root.position.x,
            camera.position.z - rec.bundle.root.position.z
          );
          rec.bundle.farBeacon.rotation.set(0, yawToCam, 0);
          beaconMat.opacity = rec.farBeaconOpacity;

          // Distance readout centered cleanly inside the glowing core
          const labelW = Math.max(1.8, dist * 0.095);
          rec.bundle.farDistanceSprite.scale.set(labelW, labelW * (96 / 256), 1);
          rec.bundle.farDistanceSprite.position.y = scaledWidth * 0.45;
          rec.bundle.updateFarDistanceText(formatDistanceFeet(dist));
          labelMat.opacity = Math.min(1, rec.farBeaconOpacity * 1.25);
        } else {
          beaconMat.opacity = 0;
          labelMat.opacity = 0;
        }

        rec.bundle.groundShadow.visible = anchor.phase === 'locked' && !isBeingSummoned;

        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPinId = anchor.pinId;
          nearestWorldPos = rec.bundle.root.position;
        }

        // Walk-up auto-collect (< 0.25m)
        if (dist <= walkUpCollectMeters) {
          triggerCollect(anchor.pinId, 'walkup');
          continue;
        }

        // Focus hotspot evaluation (projected NDC -> normalized screen 0..1)
        if (dist <= effectiveFocusRange) {
          toEntity.subVectors(rec.basePos, camera.position).normalize();
          if (camForward.dot(toEntity) > 0.15) {
            projected.copy(rec.basePos).project(camera);
            const sx = (projected.x + 1) * 0.5;
            const sy = (1 - projected.y) * 0.5;
            if (
              sx >= focusHotspot.xMin &&
              sx <= focusHotspot.xMax &&
              sy >= focusHotspot.yMin &&
              sy <= focusHotspot.yMax
            ) {
              const centerOffset = Math.hypot(sx - 0.5, sy - 0.35);
              if (
                centerOffset < bestFocusCenterOffset - 0.03 ||
                (Math.abs(centerOffset - bestFocusCenterOffset) <= 0.03 && dist < bestFocusDist)
              ) {
                bestFocusId = anchor.pinId;
                bestFocusDist = dist;
                bestFocusCenterOffset = centerOffset;
              }
            }
          }
        }

        // Pulse focus halo ring facing the camera
        const ringMat = rec.bundle.focusRing.material as THREE.MeshBasicMaterial;
        const isFocusedOrSummoning =
          focusedPinId === anchor.pinId || summoningPinId === anchor.pinId;
        ringMat.opacity = isFocusedOrSummoning ? 0.72 + Math.sin(elapsedSec * 7) * 0.2 : 0;
        if (isFocusedOrSummoning) {
          rec.bundle.focusRing.lookAt(camera.position);
        }
      }

      // Update focused target (keep current lock while actively summoning)
      const nextFocusId =
        isSummoningRef.current && summoningPinId
          ? summoningPinId
          : bestFocusId;

      if (nextFocusId !== focusedPinId) {
        focusedPinId = nextFocusId;
        onFocusChangeRef.current?.(focusedPinId);
      }
      focusedDistanceMeters = focusedPinId
        ? entities.get(focusedPinId)?.bundle.root.position.distanceTo(camera.position) ?? null
        : null;

      // Active Hold-to-Summon physics (exact cubic ease-in curve from loota-mobile!)
      let activeSummonProgress = 0;
      if (isSummoningRef.current && focusedPinId) {
        const rec = entities.get(focusedPinId);
        if (rec) {
          if (summoningPinId !== focusedPinId) {
            summoningPinId = focusedPinId;
            rec.summonStartPos = rec.basePos.clone();
            rec.summonInitialDist = Math.max(
              0.01,
              rec.bundle.root.position.distanceTo(camera.position)
            );
            rec.summonProgress = 0;
          }

          const currentDist = rec.bundle.root.position.distanceTo(camera.position);
          if (currentDist <= summonCollectMeters) {
            triggerCollect(focusedPinId, 'summon');
          } else {
            const traveledRatio = Math.max(
              0,
              Math.min(
                1,
                1 - (currentDist - summonCollectMeters) / Math.max(0.1, rec.summonInitialDist - summonCollectMeters)
              )
            );
            rec.summonProgress = traveledRatio;
            activeSummonProgress = traveledRatio;

            // Cubic ease-in speed: 0.3 -> 4.0 m/s
            const easedSpeed =
              summonSpeedMinMps +
              (summonSpeedMaxMps - summonSpeedMinMps) * Math.pow(traveledRatio, 3);
            const pullDir = new THREE.Vector3()
              .subVectors(camera.position, rec.bundle.root.position)
              .normalize();
            rec.bundle.root.position.addScaledVector(pullDir, easedSpeed * dt);

            // Progressive 1x -> 3x scale up
            const scale = 1 + (summonScaleMax - 1) * traveledRatio;
            rec.bundle.visual.scale.setScalar(scale);
            // Faster excited spin while summoned
            rec.bundle.visual.rotation.y += 4.5 * dt;

            if (rec.bundle.root.position.distanceTo(camera.position) <= summonCollectMeters) {
              triggerCollect(focusedPinId, 'summon');
            }
          }
        }
      } else if (!isSummoningRef.current && summoningPinId) {
        const rec = entities.get(summoningPinId);
        if (rec && rec.summonStartPos) {
          rec.bundle.root.position.copy(rec.summonStartPos);
          rec.bundle.visual.scale.setScalar(1);
          rec.summonStartPos = null;
          rec.summonProgress = 0;
        }
        summoningPinId = null;
      }

      // Compute relative horizontal bearing to nearest loot for 3D compass needle
      if (nearestWorldPos) {
        const flatToNearest = new THREE.Vector3(
          nearestWorldPos.x - camera.position.x,
          0,
          nearestWorldPos.z - camera.position.z
        );
        const flatFwd = new THREE.Vector3(camForward.x, 0, camForward.z);
        const flatRight = new THREE.Vector3(camRight.x, 0, camRight.z);

        if (flatToNearest.lengthSq() > 0.001 && flatFwd.lengthSq() > 0.001) {
          flatToNearest.normalize();
          flatFwd.normalize();
          flatRight.normalize();
          const targetBearing = Math.atan2(
            flatToNearest.dot(flatRight),
            flatToNearest.dot(flatFwd)
          );
          smoothedBearingRad = lerpAngleRad(
            smoothedBearingRad,
            targetBearing,
            Math.min(1, AR_GAMEPLAY_CONFIG.tracking.compassSmoothingFactor * (dt * 10))
          );
        }
      }

      // Push throttled telemetry (~10 Hz) to React HUD
      const nowMs = performance.now();
      if (nowMs - lastTelemetryPush >= 100) {
        lastTelemetryPush = nowMs;
        const activeAnchors = anchors.filter(
          (a) => !a.collected && !localCollected.has(a.pinId)
        );
        onTelemetryRef.current(
          {
            provider: activeMode,
            status,
            statusDetail,
            fps: currentFps,
            gpsFix,
            headingDeg,
            yawOffsetDeg: engine.getSlamToNorthYawDeg(),
            walkCalibrated: engine.isWalkCalibrated(),
            lockedPinCount: activeAnchors.filter((a) => a.phase === 'locked').length,
            totalActivePins: activeAnchors.length,
            nearestPinId,
            nearestDistanceMeters: Number.isFinite(nearestDist) ? nearestDist : null,
            nearestBearingRad: smoothedBearingRad,
            focusedPinId,
            focusedDistanceMeters,
            isSummoning: Boolean(summoningPinId && isSummoningRef.current),
            summonProgress: activeSummonProgress,
            cameraPosition: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            effectiveFocusRangeMeters: effectiveFocusRange,
          },
          anchors
        );
      }
    };

    const startWithFallback = async () => {
      const attemptStart = async (mode: ARTrackingMode): Promise<boolean> => {
        const provider = createProvider(mode);
        providerRef.current = provider;
        activeMode = mode;

        try {
          await provider.start({
            container,
            canvas,
            callbacks: {
              onFrame,
              onStatusChange: (nextStatus, detail) => {
                status = nextStatus;
                statusDetail = detail;
              },
            },
            onSceneReady: ({ scene, renderer }) => {
              sceneRef = scene;
              setupLootLighting(scene, renderer);
              horizonRing = createDebugHorizonRing();
              scene.add(horizonRing);
            },
          });
          return true;
        } catch (err) {
          console.warn(`[ARViewport] Provider "${mode}" failed:`, err);
          provider.stop();
          return false;
        }
      };

      const started = await attemptStart(preferredMode);
      if (disposed) return;

      if (started) {
        onProviderResolvedRef.current?.(preferredMode);
        return;
      }

      // Automatic graceful degradation chain:
      // 8thwall / webxr -> sensor-fusion -> simulator
      if (preferredMode === '8thwall' || preferredMode === 'webxr') {
        const sfStarted = await attemptStart('sensor-fusion');
        if (!disposed && sfStarted) {
          onProviderResolvedRef.current?.(
            'sensor-fusion',
            `${preferredMode} unavailable — switched to Gyro Sensor Fusion`
          );
          return;
        }
      }

      if (preferredMode !== 'simulator') {
        const simStarted = await attemptStart('simulator');
        if (!disposed && simStarted) {
          onProviderResolvedRef.current?.(
            'simulator',
            'Camera unavailable — running in 3D Simulator mode'
          );
        }
      }
    };

    void startWithFallback();

    return () => {
      disposed = true;
      providerRef.current?.stop();
      providerRef.current = null;
      entities.clear();
      horizonRing = null;
      sceneRef = null;
    };
  }, [hunt.id, hunt.type, preferredMode, coinStyle, sensorHub, simulatorInputRef]);

  return (
    <div ref={containerRef} className="ar-canvas-wrap" data-testid="ar-viewport">
      <canvas ref={canvasRef} className="ar-canvas" />
    </div>
  );
};
