/**
 * GeoAnchorEngine — Rigid SE(2) World-Frame Spatial Locking & Anti-Swing North Calibration.
 *
 * Prevents GPS jitter and walking/turning from causing 180-degree swings or teleporting objects:
 *  - Proximity hunts: Converts surveyor bearings ("N32E", distanceFt) into local 6DoF SLAM anchors.
 *  - Geolocation hunts:
 *      1. Anchors all pins to ONE rigid 2D geo-to-SLAM world frame (originGps, originSlam, slamToNorthYawRad)
 *         so pins never drag with the camera between GPS updates or jitter on every 1 Hz GPS tick.
 *      2. Applies a deadband + 3-fix directional consistency gate before applying bounded translational
 *         drift correction — normal ±4–10m GPS noise produces zero object movement.
 *      3. Requires straight walking paths (straightness >= 0.82), scale agreement between SLAM & GPS,
 *         high GPS accuracy on both endpoints, and 2-segment confirmation for large (>35 deg) yaw changes
 *         so walking, turning 180 deg, or GPS multipath spikes can NEVER flip the world 180 degrees.
 *      4. Supports instant zero-refresh on-screen realignment (`realignToMap`, `nudgeYawDeg`,
 *         `setManualYawOffsetDeg`) rotating rigidly around the player's current position.
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
  radiansToDegrees,
  shortestAngleDeltaRad,
  slamXZToEastNorth,
} from './geoMath';
import type { ARPinAnchorState, GpsFix, LootObjectType } from './types';

function resolveObjectType(pin: PinData): LootObjectType {
  if (pin.objectType === 'giftCard') return 'giftCard';
  if (pin.objectType === 'dollarSign') return 'dollarSign';
  return 'coin';
}

function extractCameraSlamYaw(cameraForward: THREE.Vector3): number {
  const lenSq = cameraForward.x * cameraForward.x + cameraForward.z * cameraForward.z;
  return lenSq > 1e-4 ? Math.atan2(cameraForward.x, -cameraForward.z) : 0;
}

export class GeoAnchorEngine {
  private huntType: 'geolocation' | 'proximity';
  private pins: PinData[];
  private anchors = new Map<string, ARPinAnchorState>();

  // Rigid SE(2) world frame mapping WGS84 (originGps) <-> SLAM (originSlam, slamToNorthYawRad)
  private originGps: GpsFix | null = null;
  private latestGps: GpsFix | null = null;
  private originCameraPos = new THREE.Vector3(0, 0, 0);
  private baseHoverY = 0;
  private hasInitializedOrigin = false;

  // Clockwise azimuth of SLAM -Z relative to True North (radians)
  private baseSlamToNorthYawRad = 0;
  private manualYawOffsetRad = 0;
  private manualYawLocked = false;
  private hasHeadingSeed = false;
  private walkCalibrated = false;

  // GPS drift filter state (only runs when a NEW GPS timestamp arrives)
  private lastProcessedGpsTimestamp = 0;
  private consecutiveDriftCount = 0;
  private lastDriftDirX = 0;
  private lastDriftDirY = 0;

  // Straight-path walking-trajectory calibration state
  private walkStartGps: GpsFix | null = null;
  private walkStartSlam = new THREE.Vector3();
  private lastWalkSampleSlam = new THREE.Vector3();
  private hasWalkSampleSlam = false;
  private walkPathLengthMeters = 0;
  private pendingLargeYawRad: number | null = null;

  constructor(hunt: Pick<HuntData, 'type' | 'pins'>) {
    this.huntType = hunt.type === 'proximity' ? 'proximity' : 'geolocation';
    this.pins = [...hunt.pins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private getEffectiveYawRad(): number {
    // Positive manualYawOffsetRad rotates AR pins clockwise (rightward on screen)
    return normalizeAngleRad(this.baseSlamToNorthYawRad - this.manualYawOffsetRad);
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
    if (this.walkCalibrated || this.manualYawLocked) return;
    // Compass headingDeg is the clockwise azimuth of camera forward from True North.
    // cameraYawRad is passed as -cameraSlamYaw so SLAM -Z azimuth = headingRad - cameraSlamYaw.
    const estimatedSlamYaw = normalizeAngleRad(degreesToRadians(headingDeg) + cameraYawRad);
    if (!this.hasHeadingSeed) {
      this.baseSlamToNorthYawRad = estimatedSlamYaw;
      this.hasHeadingSeed = true;
    } else {
      // Gentle pre-lock refinement
      this.baseSlamToNorthYawRad = lerpAngleRad(this.baseSlamToNorthYawRad, estimatedSlamYaw, 0.12);
    }
  }

  /**
   * Rigidly rotates the geo-to-SLAM world frame around the player's current cameraPosition
   * so nudging or flipping heading rotates all pins smoothly around the user (not around origin).
   */
  private rotateWorldFrameAroundCamera(
    oldEffectiveYawRad: number,
    newEffectiveYawRad: number,
    cameraPosition: THREE.Vector3,
    snapLockedPins: boolean
  ): void {
    if (!this.hasInitializedOrigin) return;

    if (this.huntType === 'geolocation' && this.originGps) {
      const playerEN = slamXZToEastNorth(
        cameraPosition.x - this.originCameraPos.x,
        cameraPosition.z - this.originCameraPos.z,
        oldEffectiveYawRad
      );
      const newPlayerXZ = eastNorthToSlamXZ(playerEN.east, playerEN.north, newEffectiveYawRad);
      this.originCameraPos.x = cameraPosition.x - newPlayerXZ.x;
      this.originCameraPos.z = cameraPosition.z - newPlayerXZ.z;

      for (const anchor of this.anchors.values()) {
        if (anchor.collected) continue;
        if (!snapLockedPins && anchor.phase === 'locked') continue;
        const pinLat = Number(anchor.rawPin.lat);
        const pinLng = Number(anchor.rawPin.lng);
        if (!Number.isFinite(pinLat) || !Number.isFinite(pinLng)) continue;
        const en = gpsDeltaToEastNorthMeters(this.originGps, { lat: pinLat, lng: pinLng });
        const xz = eastNorthToSlamXZ(en.east, en.north, newEffectiveYawRad);
        anchor.worldPos.x = this.originCameraPos.x + xz.x;
        anchor.worldPos.z = this.originCameraPos.z + xz.z;
      }
    } else if (this.huntType === 'proximity') {
      // Matches eastNorthToSlamXZ(slamXZToEastNorth(rx, rz, oldYaw), newYaw)
      const delta = shortestAngleDeltaRad(oldEffectiveYawRad, newEffectiveYawRad);
      const c = Math.cos(delta);
      const s = Math.sin(delta);
      for (const anchor of this.anchors.values()) {
        if (anchor.collected) continue;
        const rx = anchor.worldPos.x - cameraPosition.x;
        const rz = anchor.worldPos.z - cameraPosition.z;
        anchor.worldPos.x = cameraPosition.x + rx * c + rz * s;
        anchor.worldPos.z = cameraPosition.z - rx * s + rz * c;
      }
    }
  }

  /**
   * Manually nudges map alignment clockwise by `deltaDeg` around the player's current position.
   * Locks manual alignment so automatic compass/walk drift does not fight the user.
   */
  public nudgeYawDeg(deltaDeg: number, cameraPosition: THREE.Vector3): void {
    const oldYaw = this.getEffectiveYawRad();
    this.manualYawOffsetRad = normalizeAngleRad(
      this.manualYawOffsetRad + degreesToRadians(deltaDeg)
    );
    this.manualYawLocked = true;
    const newYaw = this.getEffectiveYawRad();
    this.rotateWorldFrameAroundCamera(oldYaw, newYaw, cameraPosition, true);
  }

  /**
   * Sets an explicit manual compass offset in degrees [-180, 180] and rotates rigidly around player.
   */
  public setManualYawOffsetDeg(offsetDeg: number, cameraPosition: THREE.Vector3): void {
    const oldYaw = this.getEffectiveYawRad();
    this.manualYawOffsetRad = normalizeAngleRad(degreesToRadians(offsetDeg));
    this.manualYawLocked = Math.abs(this.manualYawOffsetRad) > 1e-4;
    const newYaw = this.getEffectiveYawRad();
    this.rotateWorldFrameAroundCamera(oldYaw, newYaw, cameraPosition, true);
  }

  public resetManualYawOffset(cameraPosition: THREE.Vector3): void {
    const oldYaw = this.getEffectiveYawRad();
    this.manualYawOffsetRad = 0;
    this.manualYawLocked = false;
    const newYaw = this.getEffectiveYawRad();
    this.rotateWorldFrameAroundCamera(oldYaw, newYaw, cameraPosition, true);
  }

  /**
   * Instant zero-refresh map realignment: re-anchors the rigid world frame directly at the
   * player's live SLAM camera pose using a fresh GPS fix & current compass heading.
   */
  public realignToMap(params: {
    cameraPosition: THREE.Vector3;
    cameraForward: THREE.Vector3;
    gpsFix: GpsFix | null;
    headingDeg: number | null;
    resetManualOffset?: boolean;
  }): void {
    const { cameraPosition, cameraForward, gpsFix, headingDeg, resetManualOffset = true } = params;
    const cameraSlamYaw = extractCameraSlamYaw(cameraForward);

    this.originCameraPos.copy(cameraPosition);
    this.baseHoverY = cameraPosition.y - 0.12;

    if (resetManualOffset) {
      this.manualYawOffsetRad = 0;
      this.manualYawLocked = false;
    }

    if (headingDeg !== null) {
      this.baseSlamToNorthYawRad = normalizeAngleRad(
        degreesToRadians(headingDeg) - cameraSlamYaw
      );
      this.hasHeadingSeed = true;
    }

    this.walkCalibrated = false;
    this.pendingLargeYawRad = null;
    this.consecutiveDriftCount = 0;
    this.walkPathLengthMeters = 0;
    this.hasWalkSampleSlam = false;
    this.walkStartSlam.copy(cameraPosition);

    const effectiveGps = gpsFix ?? this.latestGps ?? this.originGps;
    if (this.huntType === 'geolocation' && effectiveGps) {
      this.originGps = effectiveGps;
      this.latestGps = effectiveGps;
      this.walkStartGps = effectiveGps;
      this.lastProcessedGpsTimestamp = effectiveGps.timestamp;

      // Preserve collected states while cleanly re-anchoring every remaining pin to the map
      const collectedIds = new Set<string>();
      for (const [id, anchor] of this.anchors.entries()) {
        if (anchor.collected) collectedIds.add(id);
      }
      this.anchors.clear();
      this.initializeGeolocationAnchors(effectiveGps);
      this.syncExternalCollections(collectedIds);
      this.hasInitializedOrigin = true;
    } else if (this.huntType === 'proximity') {
      const collectedIds = new Set<string>();
      for (const [id, anchor] of this.anchors.entries()) {
        if (anchor.collected) collectedIds.add(id);
      }
      this.anchors.clear();
      this.initializeProximityAnchors();
      this.syncExternalCollections(collectedIds);
      this.hasInitializedOrigin = true;
    } else {
      this.anchors.clear();
      this.hasInitializedOrigin = false;
    }
  }

  /** Backward-compatible recenter wrapper (now respects actual camera yaw cleanly). */
  public recenter(
    cameraPos: THREE.Vector3,
    headingDeg: number | null,
    cameraYawRad = 0,
    gpsFix?: GpsFix | null
  ): void {
    const fwd = new THREE.Vector3(Math.sin(cameraYawRad), 0, -Math.cos(cameraYawRad));
    this.realignToMap({
      cameraPosition: cameraPos,
      cameraForward: fwd,
      gpsFix: gpsFix ?? this.latestGps,
      headingDeg,
      resetManualOffset: true,
    });
  }

  /**
   * Called every frame with current camera pose & latest GPS fixes.
   */
  public update(params: {
    cameraPosition: THREE.Vector3;
    cameraForward: THREE.Vector3;
    gpsFix: GpsFix | null;
    rawGpsFix?: GpsFix | null;
    headingDeg: number | null;
  }): ARPinAnchorState[] {
    const { cameraPosition, cameraForward, gpsFix, rawGpsFix, headingDeg } = params;
    const cameraSlamYaw = extractCameraSlamYaw(cameraForward);

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
        this.lastProcessedGpsTimestamp = gpsFix.timestamp;
        this.walkStartGps = rawGpsFix ?? gpsFix;
        this.walkStartSlam.copy(cameraPosition);
        this.lastWalkSampleSlam.copy(cameraPosition);
        this.hasWalkSampleSlam = true;
        this.walkPathLengthMeters = 0;
        this.initializeGeolocationAnchors(gpsFix);
        this.hasInitializedOrigin = true;
      }
    }

    if (this.huntType === 'proximity') {
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

    // Track cumulative walked SLAM path length for straightness check
    if (this.hasWalkSampleSlam) {
      const stepDx = cameraPosition.x - this.lastWalkSampleSlam.x;
      const stepDz = cameraPosition.z - this.lastWalkSampleSlam.z;
      const stepLen = Math.hypot(stepDx, stepDz);
      if (stepLen >= 3.0) {
        // SLAM tracking discontinuity or app-resume jump: discard current calibration segment
        this.walkStartGps = null;
        this.walkPathLengthMeters = 0;
        this.pendingLargeYawRad = null;
      } else if (stepLen > 0.02) {
        this.walkPathLengthMeters += stepLen;
      }
      this.lastWalkSampleSlam.copy(cameraPosition);
    } else {
      this.lastWalkSampleSlam.copy(cameraPosition);
      this.hasWalkSampleSlam = true;
    }

    // Geolocation Hunt update: only process GPS drift/calibration when a NEW GPS fix arrives
    if (gpsFix) {
      this.latestGps = gpsFix;
      const isNewFix = gpsFix.timestamp !== this.lastProcessedGpsTimestamp;
      if (isNewFix) {
        this.lastProcessedGpsTimestamp = gpsFix.timestamp;
        this.tryWalkTrajectoryCalibration(cameraPosition, rawGpsFix ?? gpsFix);
        this.applyBoundedGpsDriftCorrection(cameraPosition, gpsFix);
      }
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
    const yaw = this.getEffectiveYawRad();
    this.pins.forEach((pin, idx) => {
      const distFt = Number(pin.distanceFt ?? 0);
      const dirStr = pin.directionStr || 'N';
      const en = proximityPinToEastNorthMeters(distFt, dirStr) ?? {
        east: 0,
        north: Math.max(2.5, distFt * 0.3048),
        distance: Math.max(2.5, distFt * 0.3048),
      };

      const xz = eastNorthToSlamXZ(en.east, en.north, yaw);
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
        phase: 'locked',
        realDistanceMeters: en.distance,
        collected: Boolean(pin.collectedByUserId),
        label: `#${(pin.order ?? idx) + 1} · ${dirStr}`,
        rawPin: pin,
      });
    });
  }

  private initializeGeolocationAnchors(gpsFix: GpsFix): void {
    const lockRadius = AR_GAMEPLAY_CONFIG.tracking.localLockRadiusMeters;
    const yaw = this.getEffectiveYawRad();

    this.pins.forEach((pin, idx) => {
      const lat = Number(pin.lat);
      const lng = Number(pin.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const en = gpsDeltaToEastNorthMeters(gpsFix, { lat, lng });
      const xz = eastNorthToSlamXZ(en.east, en.north, yaw);
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

  /**
   * Straight-path walking-trajectory North calibration with strict outlier & turn rejection.
   * Prevents turning around, walking in loops, or GPS spikes from ever swinging objects 180°.
   */
  private tryWalkTrajectoryCalibration(cameraPosition: THREE.Vector3, gpsFix: GpsFix): void {
    // Respect explicit user manual alignment
    if (this.manualYawLocked) return;

    // Require high accuracy on BOTH start and end fixes
    if (gpsFix.accuracy > 12) return;

    if (!this.walkStartGps || this.walkStartGps.accuracy > 12) {
      this.walkStartGps = gpsFix;
      this.walkStartSlam.copy(cameraPosition);
      this.walkPathLengthMeters = 0;
      return;
    }

    const slamDx = cameraPosition.x - this.walkStartSlam.x;
    const slamDz = cameraPosition.z - this.walkStartSlam.z;
    const netSlamDist = Math.hypot(slamDx, slamDz);

    // If the user turned sharply or walked in a curve/loop, reset the calibration window!
    if (this.walkPathLengthMeters > 4.0 && netSlamDist / this.walkPathLengthMeters < 0.82) {
      this.walkStartGps = gpsFix;
      this.walkStartSlam.copy(cameraPosition);
      this.walkPathLengthMeters = 0;
      this.pendingLargeYawRad = null;
      return;
    }

    const worstAccuracy = Math.max(gpsFix.accuracy, this.walkStartGps.accuracy);
    const minWalk = Math.max(
      12,
      AR_GAMEPLAY_CONFIG.tracking.walkCalibrationMinDistanceMeters,
      worstAccuracy * 1.8
    );
    if (netSlamDist < minWalk) return;

    const gpsDelta = gpsDeltaToEastNorthMeters(this.walkStartGps, gpsFix);
    // Require strong scale agreement between SLAM distance and GPS distance
    const scaleRatio = gpsDelta.distance / Math.max(0.01, netSlamDist);
    if (gpsDelta.distance < minWalk * 0.7 || scaleRatio < 0.65 || scaleRatio > 1.45) {
      // Slide window forward so stale noisy start fix doesn't linger
      this.walkStartGps = gpsFix;
      this.walkStartSlam.copy(cameraPosition);
      this.walkPathLengthMeters = 0;
      return;
    }

    const estimatedYaw = estimateSlamToNorthYawFromMotion(
      { dx: slamDx, dz: slamDz },
      { east: gpsDelta.east, north: gpsDelta.north }
    );

    if (estimatedYaw === null) return;

    const currentYaw = this.getEffectiveYawRad();
    const deltaYaw = shortestAngleDeltaRad(currentYaw, estimatedYaw);
    const absDeltaDeg = Math.abs(radiansToDegrees(deltaYaw));

    // Slide window forward after consuming this straight segment
    this.walkStartGps = gpsFix;
    this.walkStartSlam.copy(cameraPosition);
    this.walkPathLengthMeters = 0;

    // Innovation gate: large corrections (> 35°) require TWO consecutive consistent straight
    // walk segments before being accepted, completely eliminating single-spike 180° flips.
    if (absDeltaDeg > 35) {
      if (this.pendingLargeYawRad === null) {
        this.pendingLargeYawRad = estimatedYaw;
        return;
      }
      const agreementDeg = Math.abs(
        radiansToDegrees(shortestAngleDeltaRad(this.pendingLargeYawRad, estimatedYaw))
      );
      if (agreementDeg > 30) {
        this.pendingLargeYawRad = estimatedYaw;
        return;
      }
      this.pendingLargeYawRad = null;
    } else {
      this.pendingLargeYawRad = null;
    }

    const oldYaw = this.getEffectiveYawRad();
    const blend = this.walkCalibrated ? 0.2 : 0.45;
    // Clamp per-update yaw step to <= 25° so far pins glide calmly instead of snapping
    const maxStepRad = degreesToRadians(25);
    const appliedDelta = Math.max(-maxStepRad, Math.min(maxStepRad, deltaYaw * blend));
    this.baseSlamToNorthYawRad = normalizeAngleRad(this.baseSlamToNorthYawRad + appliedDelta);
    this.walkCalibrated = true;
    this.hasHeadingSeed = true;

    const newYaw = this.getEffectiveYawRad();
    this.rotateWorldFrameAroundCamera(oldYaw, newYaw, cameraPosition, false);
  }

  /**
   * Slow, deadband-gated translational drift correction on the rigid world origin.
   * Normal GPS jitter inside the deadband causes 0.0m of object movement.
   */
  private applyBoundedGpsDriftCorrection(cameraPosition: THREE.Vector3, gpsFix: GpsFix): void {
    if (!this.originGps || !this.hasInitializedOrigin) return;
    if (gpsFix.accuracy > 18) return;

    const yaw = this.getEffectiveYawRad();
    const predEN = slamXZToEastNorth(
      cameraPosition.x - this.originCameraPos.x,
      cameraPosition.z - this.originCameraPos.z,
      yaw
    );
    const measEN = gpsDeltaToEastNorthMeters(this.originGps, gpsFix);
    const errEast = measEN.east - predEN.east;
    const errNorth = measEN.north - predEN.north;
    const errDist = Math.hypot(errEast, errNorth);

    const deadband = Math.max(4.5, gpsFix.accuracy * 0.8);
    if (errDist <= deadband) {
      this.consecutiveDriftCount = 0;
      return;
    }

    const dirX = errEast / errDist;
    const dirY = errNorth / errDist;

    if (
      this.consecutiveDriftCount > 0 &&
      dirX * this.lastDriftDirX + dirY * this.lastDriftDirY >= 0.45
    ) {
      this.consecutiveDriftCount += 1;
    } else {
      this.consecutiveDriftCount = 1;
    }
    this.lastDriftDirX = dirX;
    this.lastDriftDirY = dirY;

    // Require 3 consecutive directionally-consistent fixes before shifting the rigid world frame
    if (this.consecutiveDriftCount < 3) return;

    // Apply a small, strictly rate-limited correction (max 1.2m per confirmed fix)
    const excessMeters = errDist - deadband;
    const shiftMeters = Math.min(1.2, excessMeters * 0.25);
    const shiftXZ = eastNorthToSlamXZ(dirX * shiftMeters, dirY * shiftMeters, yaw);
    this.originCameraPos.x -= shiftXZ.x;
    this.originCameraPos.z -= shiftXZ.z;
  }

  private updateGeolocationAnchors(
    cameraPosition: THREE.Vector3,
    cameraForward: THREE.Vector3,
    gpsFix: GpsFix
  ): void {
    if (!this.originGps) return;

    const {
      localLockRadiusMeters,
      offscreenNudgeMinDeltaMeters,
      offscreenNudgeFactor,
      guaranteedDiscoveryMinRadiusMeters,
      guaranteedDiscoverySpawnDistanceMeters,
    } = AR_GAMEPLAY_CONFIG.tracking;

    const yaw = this.getEffectiveYawRad();
    const flatForward = new THREE.Vector3(cameraForward.x, 0, cameraForward.z);
    if (flatForward.lengthSq() > 1e-4) flatForward.normalize();

    for (const anchor of this.anchors.values()) {
      if (anchor.collected) continue;

      const pinLat = Number(anchor.rawPin.lat);
      const pinLng = Number(anchor.rawPin.lng);
      if (!Number.isFinite(pinLat) || !Number.isFinite(pinLng)) continue;

      // Rigid world-frame position of this pin (rock-solid across GPS ticks!)
      const pinFromOriginEN = gpsDeltaToEastNorthMeters(this.originGps, {
        lat: pinLat,
        lng: pinLng,
      });
      const pinFromOriginXZ = eastNorthToSlamXZ(
        pinFromOriginEN.east,
        pinFromOriginEN.north,
        yaw
      );
      const rigidWorldX = this.originCameraPos.x + pinFromOriginXZ.x;
      const rigidWorldZ = this.originCameraPos.z + pinFromOriginXZ.z;

      const slamDist = Math.hypot(
        anchor.worldPos.x - cameraPosition.x,
        anchor.worldPos.y - cameraPosition.y,
        anchor.worldPos.z - cameraPosition.z
      );

      if (anchor.phase === 'far') {
        // Gently follow only the rigid world frame (never noisy raw GPS!)
        anchor.worldPos.x += (rigidWorldX - anchor.worldPos.x) * 0.08;
        anchor.worldPos.z += (rigidWorldZ - anchor.worldPos.z) * 0.08;
        anchor.worldPos.y = this.baseHoverY;
        anchor.realDistanceMeters = Math.hypot(
          anchor.worldPos.x - cameraPosition.x,
          anchor.worldPos.y - cameraPosition.y,
          anchor.worldPos.z - cameraPosition.z
        );

        // Transition to LOCAL LOCK once within discovery radius in SLAM space
        if (anchor.realDistanceMeters <= localLockRadiusMeters) {
          anchor.phase = 'locked';
        }
      } else {
        // LOCKED IN 6DoF SLAM SPACE: live GPS jitter never jumps a visible coin!
        anchor.realDistanceMeters = slamDist;

        const toPin = new THREE.Vector3(
          anchor.worldPos.x - cameraPosition.x,
          0,
          anchor.worldPos.z - cameraPosition.z
        );
        const toPinLen = toPin.length();
        const isBehindCamera =
          toPinLen > 0.5 &&
          flatForward.lengthSq() > 0.5 &&
          toPin.clone().normalize().dot(flatForward) < -0.25;

        // 1) Gentle off-screen correction toward the rigid world frame if it drifted while behind user
        const driftFromRigid = Math.hypot(
          rigidWorldX - anchor.worldPos.x,
          rigidWorldZ - anchor.worldPos.z
        );
        if (
          isBehindCamera &&
          gpsFix.accuracy <= 10 &&
          driftFromRigid > offscreenNudgeMinDeltaMeters
        ) {
          anchor.worldPos.x += (rigidWorldX - anchor.worldPos.x) * offscreenNudgeFactor * 0.35;
          anchor.worldPos.z += (rigidWorldZ - anchor.worldPos.z) * offscreenNudgeFactor * 0.35;
        }

        // 2) Uncertainty-Aware Guaranteed Discovery:
        // Only triggers if high-confidence GPS confirms the player is standing right on the pin
        // while SLAM still thinks it's > 16m away.
        const liveGpsToPin = gpsDeltaToEastNorthMeters(gpsFix, { lat: pinLat, lng: pinLng });
        const arrivalRadius = Math.max(
          guaranteedDiscoveryMinRadiusMeters,
          Math.min(12, gpsFix.accuracy)
        );
        if (
          gpsFix.accuracy <= 12 &&
          liveGpsToPin.distance <= arrivalRadius &&
          slamDist > 16 &&
          flatForward.lengthSq() > 0.5
        ) {
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
    return radiansToDegrees(this.getEffectiveYawRad());
  }

  public getManualYawOffsetDeg(): number {
    return radiansToDegrees(this.manualYawOffsetRad);
  }

  public isManualYawLocked(): boolean {
    return this.manualYawLocked;
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
