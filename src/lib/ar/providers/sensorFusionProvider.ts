/**
 * Universal Zero-Dependency AR Fallback Provider:
 *  - Live rear-camera video feed (getUserMedia environment facing)
 *  - Gyro-First Complementary Sensor Fusion (smooth 60fps orientation with
 *    low-gain True-North magnetometer drift correction — zero compass wobble!)
 *  - Accelerometer step-based Pedestrian Dead Reckoning (PDR) so walking forward
 *    smoothly moves the camera toward coins even without visual SLAM.
 */

import * as THREE from 'three';
import { AR_GAMEPLAY_CONFIG } from '../experienceConfig';
import { degreesToRadians, shortestAngleDeltaRad } from '../geoMath';
import type { SensorHub } from '../sensorHub';
import type { ARTrackingProvider, ARTrackingProviderCallbacks } from '../types';

const ZEE = new THREE.Vector3(0, 0, 1);
const EULER = new THREE.Euler();
const Q0 = new THREE.Quaternion();
const Q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

function deviceOrientationToQuaternion(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientDeg: number,
  out: THREE.Quaternion
): THREE.Quaternion {
  const alpha = degreesToRadians(alphaDeg);
  const beta = degreesToRadians(betaDeg);
  const gamma = degreesToRadians(gammaDeg);
  const orient = degreesToRadians(screenOrientDeg);

  EULER.set(beta, alpha, -gamma, 'YXZ');
  out.setFromEuler(EULER);
  out.multiply(Q1); // camera looks out back of phone
  out.multiply(Q0.setFromAxisAngle(ZEE, -orient));
  return out;
}

export class SensorFusionProvider implements ARTrackingProvider {
  public readonly mode = 'sensor-fusion' as const;

  private sensorHub: SensorHub;
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unsubStep: (() => void) | null = null;

  private smoothedQuat = new THREE.Quaternion();
  private hasQuatInit = false;
  private cameraPos = new THREE.Vector3(0, 1.6, 0);
  private targetCameraPos = new THREE.Vector3(0, 1.6, 0);
  private yawCorrectionRad = 0;

  constructor(sensorHub: SensorHub) {
    this.sensorHub = sensorHub;
  }

  public async start(params: {
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    callbacks: ARTrackingProviderCallbacks;
    onSceneReady: (ctx: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
    }) => void;
  }): Promise<void> {
    const { container, canvas, callbacks, onSceneReady } = params;
    callbacks.onStatusChange?.('initializing', 'Starting camera & sensor fusion…');

    // 1. Mount rear camera feed behind the transparent WebGL canvas
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        const video = document.createElement('video');
        video.srcObject = this.stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.autoplay = true;
        video.style.position = 'absolute';
        video.style.inset = '0';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.zIndex = '0';
        container.insertBefore(video, container.firstChild);
        this.videoEl = video;
        await video.play().catch(() => {});
      } catch (err) {
        console.warn('[SensorFusionProvider] Camera feed unavailable, continuing in compass mode:', err);
      }
    }

    // 2. Setup Three.js transparent overlay
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.05, 500);
    camera.position.copy(this.cameraPos);
    this.camera = camera;

    onSceneReady({ scene, camera, renderer });

    // Listen for PDR footsteps to smoothly step camera forward along horizontal gaze
    this.unsubStep = this.sensorHub.onStep((stepLenMeters) => {
      if (!this.camera) return;
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      fwd.y = 0;
      if (fwd.lengthSq() > 0.01) {
        fwd.normalize();
        this.targetCameraPos.addScaledVector(fwd, stepLenMeters);
      }
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    });
    this.resizeObserver.observe(container);

    callbacks.onStatusChange?.('tracking', 'Camera + Gyro Sensor Fusion active');

    // 3. Render loop with gyro-first smoothing + low-gain compass correction
    let lastTime = performance.now();
    const rawQuat = new THREE.Quaternion();
    const yawFixQuat = new THREE.Quaternion();
    const upAxis = new THREE.Vector3(0, 1, 0);

    const tick = (now: number) => {
      this.rafId = window.requestAnimationFrame(tick);
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const orient = this.sensorHub.getLatestOrientation();
      if (orient) {
        const screenAngle =
          typeof window.screen?.orientation?.angle === 'number'
            ? window.screen.orientation.angle
            : 0;
        deviceOrientationToQuaternion(
          orient.alpha,
          orient.beta,
          orient.gamma,
          screenAngle,
          rawQuat
        );

        // Low-gain True-North yaw stabilization (avoids compass jitter!)
        const headingDeg = this.sensorHub.getSmoothedHeadingDeg();
        if (headingDeg !== null) {
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(rawQuat);
          const currentYawFromNorth = Math.atan2(fwd.x, -fwd.z);
          const desiredYawFromNorth = degreesToRadians(headingDeg);
          const delta = shortestAngleDeltaRad(currentYawFromNorth, desiredYawFromNorth);
          const blend = Math.min(1, AR_GAMEPLAY_CONFIG.tracking.compassLowGainBlendPerSec * dt * 10);
          this.yawCorrectionRad += shortestAngleDeltaRad(this.yawCorrectionRad, -delta) * blend;
        }

        yawFixQuat.setFromAxisAngle(upAxis, this.yawCorrectionRad);
        rawQuat.premultiply(yawFixQuat);

        if (!this.hasQuatInit) {
          this.smoothedQuat.copy(rawQuat);
          this.hasQuatInit = true;
        } else {
          // High-responsiveness slerp removes high-frequency sensor chatter
          const slerpAlpha = 1 - Math.exp(-18 * dt);
          this.smoothedQuat.slerp(rawQuat, slerpAlpha);
        }

        camera.quaternion.copy(this.smoothedQuat);
      }

      // Smoothly interpolate PDR walking position
      const posAlpha = 1 - Math.exp(-8 * dt);
      this.cameraPos.lerp(this.targetCameraPos, posAlpha);
      camera.position.copy(this.cameraPos);

      callbacks.onFrame(dt, camera, scene);
      renderer.render(scene, camera);
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  public recenter(): void {
    this.cameraPos.set(0, 1.6, 0);
    this.targetCameraPos.set(0, 1.6, 0);
  }

  public stop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.unsubStep?.();
    this.unsubStep = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.remove();
      this.videoEl = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
