/**
 * Geospatial & spatial coordinate utilities for Loota Web AR.
 * Mirrors loota-mobile's WGS84 meters-per-degree math and surveyor bearing parser,
 * extended with 2D SLAM-to-True-North rigid rotation & walking-trajectory calibration.
 */

export const FEET_TO_METERS = 0.3048;
export const METERS_TO_FEET = 3.280839895;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function degreesToRadians(deg: number): number {
  return deg * DEG_TO_RAD;
}

export function radiansToDegrees(rad: number): number {
  return rad * RAD_TO_DEG;
}

/** Normalize angle to [-PI, PI] */
export function normalizeAngleRad(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Normalize compass degrees to [0, 360) */
export function normalizeCompassDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Shortest signed delta from `fromRad` to `toRad` in [-PI, PI] */
export function shortestAngleDeltaRad(fromRad: number, toRad: number): number {
  return normalizeAngleRad(toRad - fromRad);
}

/** Smooth circular angle interpolation */
export function lerpAngleRad(fromRad: number, toRad: number, factor: number): number {
  const clamped = Math.max(0, Math.min(1, factor));
  return normalizeAngleRad(fromRad + shortestAngleDeltaRad(fromRad, toRad) * clamped);
}

/** Weighted circular mean of angles in radians */
export function circularMeanRad(samples: Array<{ rad: number; weight?: number }>): number | null {
  if (samples.length === 0) return null;
  let sinSum = 0;
  let cosSum = 0;
  for (const s of samples) {
    const w = s.weight ?? 1;
    sinSum += Math.sin(s.rad) * w;
    cosSum += Math.cos(s.rad) * w;
  }
  if (Math.hypot(sinSum, cosSum) < 1e-6) return null;
  return normalizeAngleRad(Math.atan2(sinSum, cosSum));
}

/**
 * WGS84 ellipsoid meters-per-degree conversion (exact match with loota-mobile's
 * ARViewContainer+Utilities.swift convertToARWorldCoordinate).
 */
export function gpsDeltaToEastNorthMeters(
  origin: { lat: number; lng: number },
  target: { lat: number; lng: number }
): { east: number; north: number; distance: number } {
  const latRad = degreesToRadians(origin.lat);
  const metersPerDegreeLat =
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegreeLon =
    111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

  const north = (target.lat - origin.lat) * metersPerDegreeLat;
  const east = (target.lng - origin.lng) * metersPerDegreeLon;
  const distance = Math.hypot(east, north);

  return { east, north, distance };
}

/**
 * Inverse of gpsDeltaToEastNorthMeters — useful for Simulator virtual GPS motion.
 */
export function offsetGpsByEastNorthMeters(
  origin: { lat: number; lng: number },
  eastMeters: number,
  northMeters: number
): { lat: number; lng: number } {
  const latRad = degreesToRadians(origin.lat);
  const metersPerDegreeLat =
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegreeLon =
    111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

  return {
    lat: origin.lat + northMeters / metersPerDegreeLat,
    lng: origin.lng + eastMeters / metersPerDegreeLon,
  };
}

/**
 * Parses Loota surveyor direction strings (e.g., "N32E", "S45W", "W70N", "N", "E")
 * into radians clockwise from North [0, 2*PI).
 * Exact parity with loota-mobile's parseDirectionStringToRadians.
 */
export function parseDirectionStringToRadians(dir: string): number | null {
  const clean = dir.trim().toUpperCase();
  const match = /^([NESW])(\d+(?:\.\d+)?)?([NESW])?$/.exec(clean);
  if (!match) return null;

  const primary = match[1];
  const angle = match[2] ? parseFloat(match[2]) : 0;
  const secondary = match[3] || '';

  let bearingDeg = 0;

  if (!secondary) {
    switch (primary) {
      case 'N':
        bearingDeg = 0;
        break;
      case 'E':
        bearingDeg = 90;
        break;
      case 'S':
        bearingDeg = 180;
        break;
      case 'W':
        bearingDeg = 270;
        break;
    }
  } else {
    const pair = `${primary}${secondary}`;
    switch (pair) {
      case 'NE':
        bearingDeg = angle;
        break;
      case 'NW':
        bearingDeg = 360 - angle;
        break;
      case 'SE':
        bearingDeg = 180 - angle;
        break;
      case 'SW':
        bearingDeg = 180 + angle;
        break;
      case 'EN':
        bearingDeg = 90 - angle;
        break;
      case 'ES':
        bearingDeg = 90 + angle;
        break;
      case 'WN':
        bearingDeg = 270 + angle;
        break;
      case 'WS':
        bearingDeg = 270 - angle;
        break;
      default:
        return null;
    }
  }

  return degreesToRadians(normalizeCompassDeg(bearingDeg));
}

export function proximityPinToEastNorthMeters(
  distanceFt: number,
  directionStr: string
): { east: number; north: number; distance: number } | null {
  const bearingRad = parseDirectionStringToRadians(directionStr);
  if (bearingRad === null) return null;
  const distMeters = distanceFt * FEET_TO_METERS;
  return {
    east: distMeters * Math.sin(bearingRad),
    north: distMeters * Math.cos(bearingRad),
    distance: distMeters,
  };
}

/**
 * Converts a real-world horizontal offset (east, north) into local Three.js/SLAM
 * coordinates (x, z) given `slamToNorthYawRad` (clockwise azimuth of SLAM -Z from True North).
 * When slamToNorthYawRad === 0 (SLAM -Z points True North), x = east and z = -north.
 */
export function eastNorthToSlamXZ(
  east: number,
  north: number,
  slamToNorthYawRad: number
): { x: number; z: number } {
  const c = Math.cos(slamToNorthYawRad);
  const s = Math.sin(slamToNorthYawRad);
  return {
    x: east * c - north * s,
    z: -east * s - north * c,
  };
}

/**
 * Inverse: converts local SLAM displacement (dx, dz) into real-world (east, north).
 */
export function slamXZToEastNorth(
  dx: number,
  dz: number,
  slamToNorthYawRad: number
): { east: number; north: number } {
  const c = Math.cos(slamToNorthYawRad);
  const s = Math.sin(slamToNorthYawRad);
  return {
    east: dx * c - dz * s,
    north: -dx * s - dz * c,
  };
}

/**
 * Walking-trajectory yaw estimator:
 * Given a walked displacement in SLAM space (dx, dz) and the corresponding
 * GPS displacement (east, north), solves for `slamToNorthYawRad`.
 */
export function estimateSlamToNorthYawFromMotion(
  slamDelta: { dx: number; dz: number },
  gpsDelta: { east: number; north: number }
): number | null {
  const slamDist = Math.hypot(slamDelta.dx, slamDelta.dz);
  const gpsDist = Math.hypot(gpsDelta.east, gpsDelta.north);
  if (slamDist < 2.0 || gpsDist < 2.0) return null;

  const slamBearing = Math.atan2(slamDelta.dx, -slamDelta.dz);
  const gpsBearing = Math.atan2(gpsDelta.east, gpsDelta.north);
  return normalizeAngleRad(gpsBearing - slamBearing);
}

/**
 * Formats distance cleanly for Trailhead HUD badges.
 */
export function formatDistanceFeet(meters: number): string {
  const ft = meters * METERS_TO_FEET;
  if (ft < 10) return `${ft.toFixed(1)} ft`;
  if (ft < 1000) return `${Math.round(ft)} ft`;
  return `${(ft / 5280).toFixed(2)} mi`;
}
