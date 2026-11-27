import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { GeoAnchorEngine } from '../src/lib/ar/geoAnchorEngine';
import {
  gpsDeltaToEastNorthMeters,
  offsetGpsByEastNorthMeters,
  radiansToDegrees,
  shortestAngleDeltaRad,
  degreesToRadians,
} from '../src/lib/ar/geoMath';
import { SensorHub } from '../src/lib/ar/sensorHub';
import type { GpsFix } from '../src/lib/ar/types';

/** Deterministic PRNG (Mulberry32) so GPS noise simulations are 100% reproducible */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Box-Muller Gaussian sample */
function randGaussian(rng: () => number): number {
  const u1 = Math.max(1e-6, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const BASE_ORIGIN = { lat: 35.6721, lng: -78.7517 };

function makeGeoHunt() {
  const pinNear = offsetGpsByEastNorthMeters(BASE_ORIGIN, 0, 12); // 12m North (locked)
  const pinMid = offsetGpsByEastNorthMeters(BASE_ORIGIN, 18, 10); // ~20.6m NE (far -> locked as user walks)
  const pinFar = offsetGpsByEastNorthMeters(BASE_ORIGIN, 42, -8); // ~42.8m ESE (far)
  return {
    type: 'geolocation' as const,
    pins: [
      { id: 'pin-near', order: 0, lat: pinNear.lat, lng: pinNear.lng, objectType: 'coin' },
      { id: 'pin-mid', order: 1, lat: pinMid.lat, lng: pinMid.lng, objectType: 'giftCard' },
      { id: 'pin-far', order: 2, lat: pinFar.lat, lng: pinFar.lng, objectType: 'coin' },
    ],
  };
}

function makeNoisyGps(
  trueEast: number,
  trueNorth: number,
  timestamp: number,
  rng: () => number,
  sigmaMeters = 3.2,
  accuracyMeters = 7.5
): GpsFix {
  const noisyEast = trueEast + randGaussian(rng) * sigmaMeters;
  const noisyNorth = trueNorth + randGaussian(rng) * sigmaMeters;
  const ll = offsetGpsByEastNorthMeters(BASE_ORIGIN, noisyEast, noisyNorth);
  return {
    lat: ll.lat,
    lng: ll.lng,
    accuracy: accuracyMeters,
    timestamp,
  };
}

test.describe('GeoAnchorEngine & SensorHub Spatial Stability Under Continuous GPS', () => {
  test('standing still under continuous 1 Hz ±5m GPS jitter and multipath teleport spike keeps objects rock-solid', () => {
    const rng = createRng(1337);
    const hub = new SensorHub();
    const engine = new GeoAnchorEngine(makeGeoHunt());

    const camPos = new THREE.Vector3(0, 1.6, 0);
    const camFwd = new THREE.Vector3(0, 0, -1);

    // Initial clean fix at t = 1000ms
    const t0 = 1_000_000;
    hub.injectVirtualGpsFix({
      lat: BASE_ORIGIN.lat,
      lng: BASE_ORIGIN.lng,
      accuracy: 5,
      timestamp: t0,
    });

    const initialAnchors = engine.update({
      cameraPosition: camPos,
      cameraForward: camFwd,
      gpsFix: hub.getWeightedGpsFix(),
      rawGpsFix: hub.getLatestRawGpsFix(),
      headingDeg: 0,
    });
    const initialPosById = new Map(
      initialAnchors.map((a) => [a.pinId, { x: a.worldPos.x, z: a.worldPos.z }])
    );

    let maxDriftMeters = 0;
    let maxYawShiftDeg = 0;

    // 25 seconds of standing still with 1 Hz noisy GPS + a 35m multipath spike at sec 12
    for (let sec = 1; sec <= 25; sec++) {
      const ts = t0 + sec * 1000;
      if (sec === 12) {
        // Sudden 35m single-fix multipath teleport spike (should be rejected by SensorHub)
        const spike = offsetGpsByEastNorthMeters(BASE_ORIGIN, 35, -20);
        hub.injectVirtualGpsFix({
          lat: spike.lat,
          lng: spike.lng,
          accuracy: 8,
          timestamp: ts,
        });
      } else {
        hub.injectVirtualGpsFix(makeNoisyGps(0, 0, ts, rng, 2.8, 7 + (sec % 5)));
      }

      // 30 frames per second while user turns head left/right in place
      for (let f = 0; f < 30; f++) {
        const lookAngle = Math.sin((sec + f / 30) * 0.7) * 1.4;
        camFwd.set(Math.sin(lookAngle), 0, -Math.cos(lookAngle));
        const anchors = engine.update({
          cameraPosition: camPos,
          cameraForward: camFwd,
          gpsFix: hub.getWeightedGpsFix(),
          rawGpsFix: hub.getLatestRawGpsFix(),
          headingDeg: (radiansToDegrees(lookAngle) + 360) % 360,
        });

        for (const a of anchors) {
          const orig = initialPosById.get(a.pinId)!;
          const drift = Math.hypot(a.worldPos.x - orig.x, a.worldPos.z - orig.z);
          maxDriftMeters = Math.max(maxDriftMeters, drift);
        }
        maxYawShiftDeg = Math.max(maxYawShiftDeg, Math.abs(engine.getSlamToNorthYawDeg()));
      }
    }

    expect(maxDriftMeters).toBeLessThan(0.05);
    expect(maxYawShiftDeg).toBeLessThan(0.5);
  });

  test('walking, turning 90°, making a 180° U-turn, and looping with continuous noisy GPS never swings objects 180°', () => {
    const rng = createRng(4242);
    const hub = new SensorHub();
    const engine = new GeoAnchorEngine(makeGeoHunt());

    const t0 = 2_000_000;
    let trueEast = 0;
    let trueNorth = 0;
    let camYaw = 0; // 0 = facing North (-Z)

    const camPos = new THREE.Vector3(0, 1.6, 0);
    const camFwd = new THREE.Vector3(0, 0, -1);

    hub.injectVirtualGpsFix({
      lat: BASE_ORIGIN.lat,
      lng: BASE_ORIGIN.lng,
      accuracy: 5,
      timestamp: t0,
    });

    let prevAnchors = engine.update({
      cameraPosition: camPos,
      cameraForward: camFwd,
      gpsFix: hub.getWeightedGpsFix(),
      rawGpsFix: hub.getLatestRawGpsFix(),
      headingDeg: 0,
    });
    let prevYawDeg = engine.getSlamToNorthYawDeg();

    let maxFrameJumpMeters = 0;
    let maxYawStepDeg = 0;
    let maxAbsYawErrorDeg = 0;

    // 70-second realistic outdoor trajectory at 30 Hz (2,100 frames) with continuous 1 Hz GPS:
    //  0..12s:  Walk 15m North (1.25 m/s)
    // 12..24s:  Turn 90° East and walk 15m East
    // 24..36s:  Make a sharp 180° U-turn and walk 15m West
    // 36..52s:  Walk a tight circle (radius 5m) — classic curve/loop trigger for bad calibrations
    // 52..70s:  Walk South-West back toward start with occasional 22m GPS spike
    const fps = 30;
    const dt = 1 / fps;

    for (let sec = 0; sec < 70; sec++) {
      for (let f = 0; f < fps; f++) {
        const elapsed = sec + f * dt;
        let vx = 0; // East m/s
        let vn = 0; // North m/s

        if (elapsed < 12) {
          vx = 0;
          vn = 1.25;
        } else if (elapsed < 24) {
          vx = 1.25;
          vn = 0;
        } else if (elapsed < 36) {
          vx = -1.25;
          vn = 0;
        } else if (elapsed < 52) {
          const omega = (2 * Math.PI) / 16;
          const theta = (elapsed - 36) * omega;
          vx = 5 * omega * Math.cos(theta);
          vn = -5 * omega * Math.sin(theta);
        } else {
          vx = -0.6;
          vn = -0.7;
        }

        trueEast += vx * dt;
        trueNorth += vn * dt;
        camYaw = Math.atan2(vx, vn);
        camPos.set(trueEast, 1.6, -trueNorth);
        camFwd.set(Math.sin(camYaw), 0, -Math.cos(camYaw));

        // 1 Hz continuous GPS updates with realistic ±3.5m jitter + periodic spikes
        if (f === 0 && sec > 0) {
          const ts = t0 + sec * 1000;
          if (sec === 25 || sec === 48) {
            // 26m multipath teleport spike right during a turn!
            const spike = offsetGpsByEastNorthMeters(
              BASE_ORIGIN,
              trueEast + 22,
              trueNorth - 14
            );
            hub.injectVirtualGpsFix({
              lat: spike.lat,
              lng: spike.lng,
              accuracy: 9,
              timestamp: ts,
            });
          } else {
            hub.injectVirtualGpsFix(
              makeNoisyGps(trueEast, trueNorth, ts, rng, 3.2, 6 + (sec % 6))
            );
          }
        }

        const anchors = engine.update({
          cameraPosition: camPos,
          cameraForward: camFwd,
          gpsFix: hub.getWeightedGpsFix(),
          rawGpsFix: hub.getLatestRawGpsFix(),
          headingDeg: (radiansToDegrees(camYaw) + 360) % 360,
        });

        for (const a of anchors) {
          const prev = prevAnchors.find((p) => p.pinId === a.pinId);
          if (prev) {
            const jump = Math.hypot(
              a.worldPos.x - prev.worldPos.x,
              a.worldPos.z - prev.worldPos.z
            );
            maxFrameJumpMeters = Math.max(maxFrameJumpMeters, jump);
          }
        }

        const curYawDeg = engine.getSlamToNorthYawDeg();
        const yawStep = Math.abs(
          radiansToDegrees(
            shortestAngleDeltaRad(degreesToRadians(prevYawDeg), degreesToRadians(curYawDeg))
          )
        );
        maxYawStepDeg = Math.max(maxYawStepDeg, yawStep);
        maxAbsYawErrorDeg = Math.max(maxAbsYawErrorDeg, Math.abs(curYawDeg));

        prevAnchors = anchors;
        prevYawDeg = curYawDeg;
      }
    }

    // No 180° flips, no violent jitter, and pins stay accurately positioned!
    expect(maxYawStepDeg).toBeLessThan(15);
    expect(maxAbsYawErrorDeg).toBeLessThan(20);
    expect(maxFrameJumpMeters).toBeLessThan(0.6);

    // Verify locked pin-near stayed close to its true physical coordinate (0, -12)
    const pinNear = prevAnchors.find((a) => a.pinId === 'pin-near')!;
    const nearPosErr = Math.hypot(pinNear.worldPos.x - 0, pinNear.worldPos.z - -12);
    expect(nearPosErr).toBeLessThan(2.5);
  });

  test('biased initial compass (+50°) converges smoothly on straight walk without overshooting or flipping', () => {
    const rng = createRng(9001);
    const hub = new SensorHub();
    const engine = new GeoAnchorEngine(makeGeoHunt());

    const t0 = 3_000_000;
    const camPos = new THREE.Vector3(0, 1.6, 0);
    const camFwd = new THREE.Vector3(0, 0, -1);

    // True SLAM-to-North yaw is 0°, but initial phone compass is biased by +50°
    hub.injectVirtualGpsFix({
      lat: BASE_ORIGIN.lat,
      lng: BASE_ORIGIN.lng,
      accuracy: 5,
      timestamp: t0,
    });
    engine.update({
      cameraPosition: camPos,
      cameraForward: camFwd,
      gpsFix: hub.getWeightedGpsFix(),
      rawGpsFix: hub.getLatestRawGpsFix(),
      headingDeg: 50,
    });
    expect(Math.round(engine.getSlamToNorthYawDeg())).toBe(50);

    let prevYaw = engine.getSlamToNorthYawDeg();
    let maxStepDeg = 0;

    // Walk straight North for ~50 meters over 42 seconds (4 consecutive >12m straight segments)
    for (let sec = 1; sec <= 42; sec++) {
      const northDist = sec * 1.2;
      camPos.set(0, 1.6, -northDist);
      hub.injectVirtualGpsFix(makeNoisyGps(0, northDist, t0 + sec * 1000, rng, 1.4, 5.5));
      engine.update({
        cameraPosition: camPos,
        cameraForward: camFwd,
        gpsFix: hub.getWeightedGpsFix(),
        rawGpsFix: hub.getLatestRawGpsFix(),
        headingDeg: 50,
      });

      const curYaw = engine.getSlamToNorthYawDeg();
      const step = Math.abs(
        radiansToDegrees(
          shortestAngleDeltaRad(degreesToRadians(prevYaw), degreesToRadians(curYaw))
        )
      );
      maxStepDeg = Math.max(maxStepDeg, step);
      prevYaw = curYaw;
    }

    expect(engine.isWalkCalibrated()).toBe(true);
    // Converged significantly toward true 0° without any single-step snap > 25.1°
    expect(Math.abs(engine.getSlamToNorthYawDeg())).toBeLessThan(28);
    expect(maxStepDeg).toBeLessThanOrEqual(25.1);
  });

  test('manual 180° flip and zero-refresh realignToMap immediately fix an inverted compass and resist noisy GPS', () => {
    const rng = createRng(777);
    const hub = new SensorHub();
    const engine = new GeoAnchorEngine(makeGeoHunt());

    const t0 = 4_000_000;
    const camPos = new THREE.Vector3(2, 1.6, -3);
    const camFwd = new THREE.Vector3(0, 0, -1);

    // Compass starts 180° inverted (reports South = 180° while user is facing North)
    hub.injectVirtualGpsFix({
      lat: BASE_ORIGIN.lat,
      lng: BASE_ORIGIN.lng,
      accuracy: 6,
      timestamp: t0,
    });
    let anchors = engine.update({
      cameraPosition: camPos,
      cameraForward: camFwd,
      gpsFix: hub.getWeightedGpsFix(),
      rawGpsFix: hub.getLatestRawGpsFix(),
      headingDeg: 180,
    });

    // Pin 1 (12m North) starts BEHIND the camera at z = -3 + 12 = +9
    const pinBefore = anchors.find((a) => a.pinId === 'pin-near')!;
    expect(pinBefore.worldPos.z).toBeCloseTo(9, 0);

    // User taps on-screen "Flip 180°"
    engine.nudgeYawDeg(180, camPos);
    expect(engine.isManualYawLocked()).toBe(true);

    anchors = engine.update({
      cameraPosition: camPos,
      cameraForward: camFwd,
      gpsFix: hub.getWeightedGpsFix(),
      rawGpsFix: hub.getLatestRawGpsFix(),
      headingDeg: 180,
    });
    // Pin 1 immediately rotates around camera to directly in front: z = -3 - 12 = -15!
    const pinAfterFlip = anchors.find((a) => a.pinId === 'pin-near')!;
    expect(pinAfterFlip.worldPos.x).toBeCloseTo(2, 0);
    expect(pinAfterFlip.worldPos.z).toBeCloseTo(-15, 0);

    // Walk 14m straight while manual lock is active — automatic calibration must NOT override user!
    for (let sec = 1; sec <= 14; sec++) {
      camPos.set(2, 1.6, -3 - sec);
      hub.injectVirtualGpsFix(makeNoisyGps(0, sec, t0 + sec * 1000, rng, 2.5, 6));
      engine.update({
        cameraPosition: camPos,
        cameraForward: camFwd,
        gpsFix: hub.getWeightedGpsFix(),
        rawGpsFix: hub.getLatestRawGpsFix(),
        headingDeg: 180,
      });
    }
    expect(Math.abs(engine.getSlamToNorthYawDeg())).toBeLessThan(1);

    // Now simulate user turning 90° East (cameraForward = +X) and tapping "Re-Sync GPS & Map"
    const freshGpsLoc = offsetGpsByEastNorthMeters(BASE_ORIGIN, 0, 5); // 5m North of original start
    const freshGps: GpsFix = {
      lat: freshGpsLoc.lat,
      lng: freshGpsLoc.lng,
      accuracy: 4,
      timestamp: t0 + 20_000,
    };
    const eastCamPos = new THREE.Vector3(10, 1.6, -10);
    const eastCamFwd = new THREE.Vector3(1, 0, 0); // Looking +X (East in SLAM)
    engine.realignToMap({
      cameraPosition: eastCamPos,
      cameraForward: eastCamFwd,
      gpsFix: freshGps,
      headingDeg: 90, // Phone compass accurately says East (90°)
      resetManualOffset: true,
    });

    expect(engine.isManualYawLocked()).toBe(false);
    // Because camera faces +X (cameraSlamYaw = +90°) AND headingDeg = 90°, slamToNorthYaw must be 0°!
    expect(Math.abs(engine.getSlamToNorthYawDeg())).toBeLessThan(0.5);

    // Pin 1 (12m North of BASE_ORIGIN = 7m North of freshGps) must now sit 7m North (-Z) of eastCamPos!
    const pinAfterRealign = engine.getAnchors().find((a) => a.pinId === 'pin-near')!;
    const expectedFromFresh = gpsDeltaToEastNorthMeters(freshGps, {
      lat: Number(pinAfterRealign.rawPin.lat),
      lng: Number(pinAfterRealign.rawPin.lng),
    });
    expect(pinAfterRealign.worldPos.x).toBeCloseTo(eastCamPos.x + expectedFromFresh.east, 1);
    expect(pinAfterRealign.worldPos.z).toBeCloseTo(eastCamPos.z - expectedFromFresh.north, 1);
  });
});
