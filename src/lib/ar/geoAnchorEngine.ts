/**
 * GeoAnchorEngine — Two-Phase Spatial Locking & Walking-Trajectory North Calibration.
 *
 * Solves the #1 cause of glitchy mobile web location AR:
 *  - Proximity hunts: Converts surveyor bearings ("N32E", distanceFt) into local 6DoF SLAM anchors.
 *  - Geolocation hunts:
 *      1. Seeds SLAM-to-True-North yaw from circular-averaged compass heading.
 *      2. While pins are FAR (> 15m), refines alignment continuously AND uses walked
 *         SLAM vs. GPS displacement (>= 8m) to solve exact True-North yaw without compass noise.
 *      3. The moment a pin enters the LOCAL LOCK zone (<= 15m), freezes its world position
 *         in 6DoF SLAM space so live GPS jitter NEVER teleports a visible coin.
 *      4. Uncertainty-Aware Guaranteed Discovery: if the user walks inside a pin's GPS
 *         uncertainty bubble (max(6m, accuracy)) while it drifted away in SLAM space,
 *         smoothly reveals it at a reachable 4.2m spot ahead so players are never stuck.
 */

import * as THREE from 'three';
import type { HuntData, PinData } from '@/types/hunt';
import { AR_GAMEPLAY_CONFIG } from './experienceConfig';
import {
  degreesToRadians,
  eastNorthToSlamXZ,
  estimateSlamToNorthYawFromMotion,
  gpsDeltaToEastNorthMeters,
  lerpAngleRad,
  normalizeAngleRad,
  proximityPinToEastNorthMeters,
} from './geoMath';
import type { ARPinAnchorState, GpsFix, LootObjectType } from './types';

function resolveObjectType(pin: PinData): LootObjectType {
  if (pin.objectType === 'giftCard') return 'giftCard';
  if (pin.objectType === 'dollarSign') return 'dollarSign';
  return 'coin';
}

export class GeoAnchorEngine {
  private huntType: 'geolocation' | 'proximity';
  private pins: PinData[];
  private anchors = new Map<string, ARPinAnchorState>();

  private originGps: GpsFix | null = null;
  private latestGps: GpsFix | null = null;
  private originCameraPos = new THREE.Vector3(0, 0, 0);
  private baseHoverY = 0;
  private hasInitializedOrigin = false;

  // Clockwise azimuth of SLAM -Z relative to True North (radians)
  private slamToNorthYawRad = 0;
  private hasHeadingSeed = false;
  private walkCalibrated = false;

  // Anchors for walking-trajectory calibration
  private walkStartGps: GpsFix | null = null;
  private walkStartSlam = new THREE.Vector3();

  constructor(hunt: Pick<HuntData, 'type' | 'pins'>) {
    this.huntType = hunt.type === 'proximity' ? 'proximity' : 'geolocation';
    this.pins = [...hunt.pins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  public syncExternalCollections(collectedPinIds: Set<string>): void {
    for (const [pinId, anchor] of this.anchors.entries()) {
      if (collectedPinIds.has(pinId)) {
        anchor.collected = true;
      }
    }
  }

  public markCollected(pinId: string): void {
    const anchor = this.anchors.get(pinId);
    if (anchor) anchor.collected = true;
  }

  public seedInitialHeading(headingDeg: number, cameraYawRad = 0): void {
    if (this.walkCalibrated) return;
    // Compass headingDeg is the azimuth of camera forward.
    // Camera forward in SLAM has clockwise yaw = -cameraYawRad from SLAM -Z.
    // Therefore SLAM -Z azimuth = headingRad + cameraYawRad.
    const estimatedSlamYaw = normalizeAngleRad(degreesToRadians(headingDeg) + cameraYawRad);
    if (!this.hasHeadingSeed) {
      this.slamToNorthYawRad = estimatedSlamYaw;
      this.hasHeadingSeed = true;
    } else {
      // Gentle pre-lock refinement
      this.slamToNorthYawRad = lerpAngleRad(this.slamToNorthYawRad, estimatedSlamYaw, 0.12);
    }
  }

  public recenter(cameraPos: THREE.Vector3, headingDeg: number | null, cameraYawRad = 0): void {
    this.originCameraPos.copy(cameraPos);
    this.baseHoverY = cameraPos.y - 0.12;
    if (headingDeg !== null) {
      this.slamToNorthYawRad = normalizeAngleRad(degreesToRadians(headingDeg) + cameraYawRad);
      this.hasHeadingSeed = true;
    }
    this.walkCalibrated = false;
    this.walkStartGps = this.latestGps;
    this.walkStartSlam.copy(cameraPos);
    this.anchors.clear();
    this.hasInitializedOrigin = false;
  }

  /**
   * Called every frame (or on sensor tick) with current camera pose & latest weighted GPS fix.
   */
  public update(params: {
    cameraPosition: THREE.Vector3;
    cameraForward: THREE.Vector3;
    gpsFix: GpsFix | null;
    headingDeg: number | null;
  }): ARPinAnchorState[] {
    const { cameraPosition, cameraForward, gpsFix, headingDeg } = params;

    // Derive camera yaw in SLAM horizontal plane (clockwise from SLAM -Z)
    const flatFwd = new THREE.Vector3(cameraForward.x, 0, cameraForward.z);
    const cameraSlamYaw =
      flatFwd.lengthSq() > 1e-4 ? Math.atan2(flatFwd.x, -flatFwd.z) : 0;

    if (headingDeg !== null && !this.hasHeadingSeed) {
      this.seedInitialHeading(headingDeg, -cameraSlamYaw);
    }

    if (!this.hasInitializedOrigin) {
      this.originCameraPos.copy(cameraPosition);
      // Place coins right at comfortable chest/eye hover height relative to camera
      this.baseHoverY = cameraPosition.y - 0.12;
      if (this.huntType === 'proximity') {
        this.initializeProximityAnchors();
        this.hasInitializedOrigin = true;
      } else if (gpsFix) {
        this.originGps = gpsFix;
        this.latestGps = gpsFix;
        this.walkStartGps = gpsFix;
        this.walkStartSlam.copy(cameraPosition);
        this.initializeGeolocationAnchors(gpsFix);
        this.hasInitializedOrigin = true;
      }
    }

    if (this.huntType === 'proximity') {
      // Update live distances in local SLAM space
      for (const anchor of this.anchors.values()) {
        if (anchor.collected) continue;
        anchor.realDistanceMeters = Math.hypot(
          anchor.worldPos.x - cameraPosition.x,
          anchor.worldPos.y - cameraPosition.y,
          anchor.worldPos.z - cameraPosition.z
        );
      }
      return Array.from(this.anchors.values());
    }

    // Geolocation Hunt update
    if (gpsFix) {
      this.latestGps = gpsFix;
      this.tryWalkTrajectoryCalibration(cameraPosition, gpsFix);
      this.updateGeolocationAnchors(cameraPosition, cameraForward, gpsFix);
    } else {
      for (const anchor of this.anchors.values()) {
        if (anchor.collected) continue;
        anchor.realDistanceMeters = Math.hypot(
          anchor.worldPos.x - cameraPosition.x,
          anchor.worldPos.y - cameraPosition.y,
          anchor.worldPos.z - cameraPosition.z
        );
      }
    }

    return Array.from(this.anchors.values());
  }

  private initializeProximityAnchors(): void {
    this.pins.forEach((pin, idx) => {
      const distFt = Number(pin.distanceFt ?? 0);
      const dirStr = pin.directionStr || 'N';
      const en = proximityPinToEastNorthMeters(distFt, dirStr) ?? {
        east: 0,
        north: Math.max(2.5, distFt * 0.3048),
        distance: Math.max(2.5, distFt * 0.3048),
      };

      const xz = eastNorthToSlamXZ(en.east, en.north, this.slamToNorthYawRad);
      const worldPos = {
        x: this.originCameraPos.x + xz.x,
        y: this.baseHoverY,
        z: this.originCameraPos.z + xz.z,
      };

      this.anchors.set(pin.id, {
        pinId: pin.id,
        order: pin.order ?? idx,
        objectType: resolveObjectType(pin),
        worldPos,
        phase: 'locked', // Proximity pins start locked in local 6DoF SLAM space
        realDistanceMeters: en.distance,
        collected: Boolean(pin.collectedByUserId),
        label: `#${(pin.order ?? idx) + 1} · ${dirStr}`,
        rawPin: pin,
      });
    });
  }

  private initializeGeolocationAnchors(gpsFix: GpsFix): void {
    const lockRadius = AR_GAMEPLAY_CONFIG.tracking.localLockRadiusMeters;

    this.pins.forEach((pin, idx) => {
      const lat = Number(pin.lat);
      const lng = Number(pin.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const en = gpsDeltaToEastNorthMeters(gpsFix, { lat, lng });
      const xz = eastNorthToSlamXZ(en.east, en.north, this.slamToNorthYawRad);
      const isNear = en.distance <= lockRadius;

      const worldPos = {
        x: this.originCameraPos.x + xz.x,
        y: this.baseHoverY,
        z: this.originCameraPos.z + xz.z,
      };

      this.anchors.set(pin.id, {
        pinId: pin.id,
        order: pin.order ?? idx,
        objectType: resolveObjectType(pin),
        worldPos,
        phase: isNear ? 'locked' : 'far',
        realDistanceMeters: en.distance,
        collected: Boolean(pin.collectedByUserId),
        label: `#${(pin.order ?? idx) + 1}`,
        rawPin: pin,
      });
    });
  }

  private tryWalkTrajectoryCalibration(cameraPosition: THREE.Vector3, gpsFix: GpsFix): void {
    if (!this.walkStartGps) {
      this.walkStartGps = gpsFix;
      this.walkStartSlam.copy(cameraPosition);
      return;
    }

    const minWalk = AR_GAMEPLAY_CONFIG.tracking.walkCalibrationMinDistanceMeters;
    const slamDx = cameraPosition.x - this.walkStartSlam.x;
    const slamDz = cameraPosition.z - this.walkStartSlam.z;
    const slamDist = Math.hypot(slamDx, slamDz);

    if (slamDist < minWalk) return;
    if (gpsFix.accuracy > 15) return;

    const gpsDelta = gpsDeltaToEastNorthMeters(this.walkStartGps, gpsFix);
    if (gpsDelta.distance < minWalk * 0.65) return;

    const estimatedYaw = estimateSlamToNorthYawFromMotion(
      { dx: slamDx, dz: slamDz },
      { east: gpsDelta.east, north: gpsDelta.north }
    );

    if (estimatedYaw !== null) {
      this.slamToNorthYawRad = this.walkCalibrated
        ? lerpAngleRad(this.slamToNorthYawRad, estimatedYaw, 0.25)
        : lerpAngleRad(this.slamToNorthYawRad, estimatedYaw, 0.65);
      this.walkCalibrated = true;
      this.hasHeadingSeed = true;

      // Slide the calibration window forward
      this.walkStartGps = gpsFix;
      this.walkStartSlam.copy(cameraPosition);
    }
  }

  private updateGeolocationAnchors(
    cameraPosition: THREE.Vector3,
    cameraForward: THREE.Vector3,
    gpsFix: GpsFix
  ): void {
    const {
      localLockRadiusMeters,
      offscreenNudgeMinDeltaMeters,
      offscreenNudgeFactor,
      guaranteedDiscoveryMinRadiusMeters,
      guaranteedDiscoverySpawnDistanceMeters,
    } = AR_GAMEPLAY_CONFIG.tracking;

    const flatForward = new THREE.Vector3(cameraForward.x, 0, cameraForward.z).normalize();

    for (const anchor of this.anchors.values()) {
      if (anchor.collected) continue;

      const pinLat = Number(anchor.rawPin.lat);
      const pinLng = Number(anchor.rawPin.lng);
      if (!Number.isFinite(pinLat) || !Number.isFinite(pinLng)) continue;

      const en = gpsDeltaToEastNorthMeters(gpsFix, { lat: pinLat, lng: pinLng });
      const xz = eastNorthToSlamXZ(en.east, en.north, this.slamToNorthYawRad);
      const expectedWorldX = cameraPosition.x + xz.x;
      const expectedWorldZ = cameraPosition.z + xz.z;

      if (anchor.phase === 'far') {
        // Smoothly glide far anchor toward refined GPS estimate
        anchor.worldPos.x += (expectedWorldX - anchor.worldPos.x) * 0.15;
        anchor.worldPos.z += (expectedWorldZ - anchor.worldPos.z) * 0.15;
        anchor.worldPos.y = this.baseHoverY;
        anchor.realDistanceMeters = en.distance;

        // Transition to LOCAL LOCK once within discovery radius!
        if (en.distance <= localLockRadiusMeters) {
          anchor.worldPos.x = expectedWorldX;
          anchor.worldPos.z = expectedWorldZ;
          anchor.phase = 'locked';
        }
      } else {
        // LOCKED IN 6DoF SLAM SPACE: never let live GPS jitter jump a visible coin!
        const slamDist = Math.hypot(
          anchor.worldPos.x - cameraPosition.x,
          anchor.worldPos.y - cameraPosition.y,
          anchor.worldPos.z - cameraPosition.z
        );
        anchor.realDistanceMeters = slamDist;

        // Check if anchor is currently behind the camera (out of frustum)
        const toPin = new THREE.Vector3(
          anchor.worldPos.x - cameraPosition.x,
          0,
          anchor.worldPos.z - cameraPosition.z
        );
        const toPinLen = toPin.length();
        const isBehindCamera =
          toPinLen > 0.5 && toPin.clone().normalize().dot(flatForward) < -0.25;

        // 1) Off-screen damped correction if GPS disagrees heavily while player looks away
        const driftFromGps = Math.hypot(
          expectedWorldX - anchor.worldPos.x,
          expectedWorldZ - anchor.worldPos.z
        );
        if (
          isBehindCamera &&
          gpsFix.accuracy <= 10 &&
          driftFromGps > offscreenNudgeMinDeltaMeters
        ) {
          anchor.worldPos.x += (expectedWorldX - anchor.worldPos.x) * offscreenNudgeFactor;
          anchor.worldPos.z += (expectedWorldZ - anchor.worldPos.z) * offscreenNudgeFactor;
        }

        // 2) Uncertainty-Aware Guaranteed Discovery:
        // If GPS says player is standing right inside the uncertainty bubble of the pin,
        // yet SLAM still thinks the pin is >14m away (e.g. initial GPS jumped when walking in),
        // materialize it cleanly ahead in reachable eye-level space!
        const arrivalRadius = Math.max(
          guaranteedDiscoveryMinRadiusMeters,
          Math.min(14, gpsFix.accuracy)
        );
        if (en.distance <= arrivalRadius && slamDist > 14 && flatForward.lengthSq() > 0.5) {
          anchor.worldPos.x =
            cameraPosition.x + flatForward.x * guaranteedDiscoverySpawnDistanceMeters;
          anchor.worldPos.z =
            cameraPosition.z + flatForward.z * guaranteedDiscoverySpawnDistanceMeters;
          anchor.worldPos.y = cameraPosition.y - 0.1;
          anchor.realDistanceMeters = guaranteedDiscoverySpawnDistanceMeters;
        }
      }
    }
  }

  public getSlamToNorthYawDeg(): number {
    return (this.slamToNorthYawRad * 180) / Math.PI;
  }

  public isWalkCalibrated(): boolean {
    return this.walkCalibrated;
  }

  public getOriginGps(): GpsFix | null {
    return this.originGps;
  }

  public getAnchors(): ARPinAnchorState[] {
    return Array.from(this.anchors.values());
  }
}
