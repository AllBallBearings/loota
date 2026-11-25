/**
 * Cross-platform mobile browser sensor hub for Loota Web AR.
 * Handles:
 *  - iOS Safari explicit gesture permission prompts (DeviceOrientation / DeviceMotion)
 *  - High-accuracy GPS watch with inverse-variance weighted smoothing & outlier rejection
 *  - True-North compass extraction (webkitCompassHeading on iOS, deviceorientationabsolute on Android)
 *  - Gyroscope & accelerometer stream + lightweight step detection for PDR fallback
 *  - Restricted in-app browser detection (Instagram, Facebook, TikTok, etc.)
 */

import { AR_GAMEPLAY_CONFIG } from './experienceConfig';
import {
  circularMeanRad,
  degreesToRadians,
  normalizeCompassDeg,
  radiansToDegrees,
} from './geoMath';
import type { GpsFix, HeadingSample } from './types';

export interface EnvironmentCapabilities {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSecureContext: boolean;
  inAppBrowserName: string | null;
  requiresOrientationPermission: boolean;
  hasWebXRAR: boolean;
  hasCameraAPI: boolean;
}

export interface MotionSample {
  alphaRateDeg: number; // yaw rate deg/s
  betaRateDeg: number; // pitch rate deg/s
  gammaRateDeg: number; // roll rate deg/s
  accelX: number;
  accelY: number;
  accelZ: number;
  gravityX: number;
  gravityY: number;
  gravityZ: number;
  timestamp: number;
}

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

export async function detectEnvironmentCapabilities(): Promise<EnvironmentCapabilities> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSecureContext: false,
      inAppBrowserName: null,
      requiresOrientationPermission: false,
      hasWebXRAR: false,
      hasCameraAPI: false,
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);

  let inAppBrowserName: string | null = null;
  if (/Instagram/i.test(ua)) inAppBrowserName = 'Instagram';
  else if (/FBAN|FBAV/i.test(ua)) inAppBrowserName = 'Facebook';
  else if (/BytedanceWebview|TikTok|musical_ly/i.test(ua)) inAppBrowserName = 'TikTok';
  else if (/Snapchat/i.test(ua)) inAppBrowserName = 'Snapchat';
  else if (/Line\//i.test(ua)) inAppBrowserName = 'LINE';

  const requiresOrientationPermission =
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as DeviceOrientationEventWithPermission)
      .requestPermission === 'function';

  let hasWebXRAR = false;
  if ('xr' in navigator && navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
    try {
      hasWebXRAR = await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
      hasWebXRAR = false;
    }
  }

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSecureContext: window.isSecureContext,
    inAppBrowserName,
    requiresOrientationPermission,
    hasWebXRAR,
    hasCameraAPI: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  };
}

export class SensorHub {
  private gpsWatchId: number | null = null;
  private gpsBuffer: GpsFix[] = [];
  private latestGpsFix: GpsFix | null = null;
  private weightedGpsFix: GpsFix | null = null;

  private headingBuffer: HeadingSample[] = [];
  private latestHeading: HeadingSample | null = null;
  private latestOrientation: {
    alpha: number;
    beta: number;
    gamma: number;
    absolute: boolean;
  } | null = null;
  private latestMotion: MotionSample | null = null;

  private orientationListener: ((e: Event) => void) | null = null;
  private motionListener: ((e: DeviceMotionEvent) => void) | null = null;

  private stepCount = 0;
  private lastStepTime = 0;
  private accelMagAvg = 9.81;

  private gpsListeners = new Set<(fix: GpsFix) => void>();
  private headingListeners = new Set<(sample: HeadingSample) => void>();
  private stepListeners = new Set<(stepLengthMeters: number) => void>();

  public async requestPermissions(): Promise<{
    orientationGranted: boolean;
    motionGranted: boolean;
    gpsStarted: boolean;
  }> {
    let orientationGranted = true;
    let motionGranted = true;

    if (typeof DeviceOrientationEvent !== 'undefined') {
      const doe = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
      if (typeof doe.requestPermission === 'function') {
        try {
          const result = await doe.requestPermission();
          orientationGranted = result === 'granted';
        } catch (err) {
          console.warn('[SensorHub] DeviceOrientation permission failed:', err);
          orientationGranted = false;
        }
      }
    }

    if (typeof DeviceMotionEvent !== 'undefined') {
      const dme = DeviceMotionEvent as DeviceMotionEventWithPermission;
      if (typeof dme.requestPermission === 'function') {
        try {
          const result = await dme.requestPermission();
          motionGranted = result === 'granted';
        } catch (err) {
          console.warn('[SensorHub] DeviceMotion permission failed:', err);
          motionGranted = false;
        }
      }
    }

    this.startOrientationAndMotion();
    const gpsStarted = this.startGpsWatch();

    return { orientationGranted, motionGranted, gpsStarted };
  }

  public startGpsWatch(): boolean {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return false;
    if (this.gpsWatchId !== null) return true;

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: GpsFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : 50,
          timestamp: pos.timestamp || Date.now(),
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        };
        this.ingestGpsFix(fix);
      },
      (err) => {
        console.warn('[SensorHub] Geolocation error:', err.code, err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 12000,
      }
    );
    return true;
  }

  /** Allows Simulator mode to inject virtual GPS positions cleanly */
  public injectVirtualGpsFix(fix: GpsFix): void {
    this.ingestGpsFix(fix);
  }

  private ingestGpsFix(fix: GpsFix): void {
    this.latestGpsFix = fix;

    const maxAcceptable = AR_GAMEPLAY_CONFIG.tracking.gpsMaxAcceptableAccuracyMeters;
    // Keep a rolling window of recent fixes (last 8s, max 10 samples)
    const now = Date.now();
    this.gpsBuffer = this.gpsBuffer.filter((s) => now - s.timestamp < 8000);

    // Accept if within accuracy budget OR if buffer is still empty
    if (fix.accuracy <= maxAcceptable || this.gpsBuffer.length === 0) {
      this.gpsBuffer.push(fix);
      if (this.gpsBuffer.length > 10) {
        this.gpsBuffer.shift();
      }
    }

    // Compute inverse-variance weighted average
    let weightSum = 0;
    let latSum = 0;
    let lngSum = 0;
    let bestAcc = Infinity;

    for (const sample of this.gpsBuffer) {
      const sigma = Math.max(2, sample.accuracy);
      const w = 1 / (sigma * sigma);
      weightSum += w;
      latSum += sample.lat * w;
      lngSum += sample.lng * w;
      if (sample.accuracy < bestAcc) bestAcc = sample.accuracy;
    }

    if (weightSum > 0) {
      this.weightedGpsFix = {
        lat: latSum / weightSum,
        lng: lngSum / weightSum,
        accuracy: bestAcc,
        timestamp: fix.timestamp,
        speed: fix.speed,
        heading: fix.heading,
      };
    } else {
      this.weightedGpsFix = fix;
    }

    for (const listener of this.gpsListeners) {
      listener(this.weightedGpsFix);
    }
  }

  private startOrientationAndMotion(): void {
    if (typeof window === 'undefined') return;

    if (!this.orientationListener) {
      const handler = (rawEvent: Event) => {
        const e = rawEvent as WebkitDeviceOrientationEvent;
        if (e.alpha === null || e.beta === null || e.gamma === null) return;

        this.latestOrientation = {
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma,
          absolute: Boolean(e.absolute || rawEvent.type === 'deviceorientationabsolute'),
        };

        let headingDeg: number | null = null;
        let accuracyDeg = 25;
        let isTrueNorth = false;

        if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
          headingDeg = normalizeCompassDeg(e.webkitCompassHeading);
          accuracyDeg =
            typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy > 0
              ? e.webkitCompassAccuracy
              : 15;
          isTrueNorth = true;
        } else if (e.absolute || rawEvent.type === 'deviceorientationabsolute') {
          headingDeg = normalizeCompassDeg(360 - e.alpha);
          accuracyDeg = 18;
          isTrueNorth = true;
        } else {
          headingDeg = normalizeCompassDeg(360 - e.alpha);
          accuracyDeg = 45;
          isTrueNorth = false;
        }

        if (headingDeg !== null) {
          const sample: HeadingSample = {
            headingDeg,
            accuracyDeg,
            isTrueNorth,
            timestamp: Date.now(),
          };
          this.ingestHeading(sample);
        }
      };

      this.orientationListener = handler;
      window.addEventListener('deviceorientationabsolute', handler, true);
      window.addEventListener('deviceorientation', handler, true);
    }

    if (!this.motionListener) {
      const motionHandler = (e: DeviceMotionEvent) => {
        const rot = e.rotationRate;
        const acc = e.acceleration;
        const accG = e.accelerationIncludingGravity;

        const sample: MotionSample = {
          alphaRateDeg: rot?.alpha ?? 0,
          betaRateDeg: rot?.beta ?? 0,
          gammaRateDeg: rot?.gamma ?? 0,
          accelX: acc?.x ?? 0,
          accelY: acc?.y ?? 0,
          accelZ: acc?.z ?? 0,
          gravityX: accG?.x ?? 0,
          gravityY: accG?.y ?? -9.81,
          gravityZ: accG?.z ?? 0,
          timestamp: Date.now(),
        };
        this.latestMotion = sample;

        // Lightweight Pedestrian Dead Reckoning (PDR) step detector
        const mag = Math.hypot(sample.gravityX, sample.gravityY, sample.gravityZ);
        this.accelMagAvg = this.accelMagAvg * 0.9 + mag * 0.1;
        const dynamicPeak = mag - this.accelMagAvg;
        const now = sample.timestamp;
        if (dynamicPeak > 1.35 && now - this.lastStepTime > 360) {
          this.lastStepTime = now;
          this.stepCount += 1;
          const estimatedStepLengthMeters = 0.68;
          for (const listener of this.stepListeners) {
            listener(estimatedStepLengthMeters);
          }
        }
      };

      this.motionListener = motionHandler;
      window.addEventListener('devicemotion', motionHandler, true);
    }
  }

  private ingestHeading(sample: HeadingSample): void {
    const now = sample.timestamp;
    this.latestHeading = sample;
    this.headingBuffer = this.headingBuffer.filter((h) => now - h.timestamp < 2500);

    // Reject compass spikes when user is spinning fast (> 35 deg/s)
    const yawRate = Math.abs(this.latestMotion?.alphaRateDeg ?? 0);
    if (yawRate < 35) {
      this.headingBuffer.push(sample);
      if (this.headingBuffer.length > 25) {
        this.headingBuffer.shift();
      }
    }

    for (const listener of this.headingListeners) {
      listener(sample);
    }
  }

  public getWeightedGpsFix(): GpsFix | null {
    return this.weightedGpsFix ?? this.latestGpsFix;
  }

  public getLatestHeading(): HeadingSample | null {
    return this.latestHeading;
  }

  public getSmoothedHeadingDeg(): number | null {
    if (this.headingBuffer.length === 0) {
      return this.latestHeading?.headingDeg ?? null;
    }
    const meanRad = circularMeanRad(
      this.headingBuffer.map((h) => ({
        rad: degreesToRadians(h.headingDeg),
        weight: 1 / Math.max(5, h.accuracyDeg),
      }))
    );
    if (meanRad === null) return this.latestHeading?.headingDeg ?? null;
    return normalizeCompassDeg(radiansToDegrees(meanRad));
  }

  public getLatestOrientation() {
    return this.latestOrientation;
  }

  public getLatestMotion(): MotionSample | null {
    return this.latestMotion;
  }

  public getStepCount(): number {
    return this.stepCount;
  }

  public onGps(cb: (fix: GpsFix) => void): () => void {
    this.gpsListeners.add(cb);
    if (this.weightedGpsFix) cb(this.weightedGpsFix);
    return () => this.gpsListeners.delete(cb);
  }

  public onHeading(cb: (sample: HeadingSample) => void): () => void {
    this.headingListeners.add(cb);
    if (this.latestHeading) cb(this.latestHeading);
    return () => this.headingListeners.delete(cb);
  }

  public onStep(cb: (stepMeters: number) => void): () => void {
    this.stepListeners.add(cb);
    return () => this.stepListeners.delete(cb);
  }

  public dispose(): void {
    if (this.gpsWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    if (this.orientationListener && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientationabsolute', this.orientationListener, true);
      window.removeEventListener('deviceorientation', this.orientationListener, true);
      this.orientationListener = null;
    }
    if (this.motionListener && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.motionListener, true);
      this.motionListener = null;
    }
    this.gpsListeners.clear();
    this.headingListeners.clear();
    this.stepListeners.clear();
  }
}
