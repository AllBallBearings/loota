/**
 * Optional Android Chrome Native WebXR Provider (`immersive-ar` + `local-floor` + `dom-overlay`).
 * Uses OS-level ARCore 6DoF tracking directly with the exact same Three.js Loota scene.
 */

import * as THREE from 'three';
import type { ARTrackingProvider, ARTrackingProviderCallbacks } from '../types';

export class WebXRProvider implements ARTrackingProvider {
  public readonly mode = 'webxr' as const;

  private renderer: THREE.WebGLRenderer | null = null;
  private session: XRSession | null = null;
  private lastTimeMs = 0;
  private contextLost = false;
  private stopRequested = false;
  private contextLostCleanup: (() => void) | null = null;

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

    if (!navigator.xr || !(await navigator.xr.isSessionSupported('immersive-ar'))) {
      throw new Error('WebXR immersive-ar is not supported on this device');
    }

    callbacks.onStatusChange?.('initializing', 'Starting Android WebXR 6DoF session…');
    this.contextLost = false;
    this.stopRequested = false;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      this.contextLost = true;
      if (!this.stopRequested) {
        callbacks.onCameraInterrupted?.('AR graphics context paused after screen lock.');
      }
    };
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    this.contextLostCleanup = () => canvas.removeEventListener('webglcontextlost', onContextLost, false);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight, false);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.05,
      400
    );

    const sessionInit: XRSessionInit = {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['dom-overlay'],
    };

    const overlayRoot = document.getElementById('loota-ar-hud-overlay') ?? container;
    (sessionInit as XRSessionInit & { domOverlay?: { root: Element } }).domOverlay = {
      root: overlayRoot,
    };

    const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
    this.session = session;
    session.addEventListener('end', () => {
      this.session = null;
      callbacks.onStatusChange?.('idle', 'WebXR session ended');
      if (!this.stopRequested) {
        callbacks.onCameraInterrupted?.('AR camera session ended after screen lock.');
      }
    });

    await renderer.xr.setSession(session);
    onSceneReady({ scene, camera, renderer });
    callbacks.onStatusChange?.('tracking', 'Native WebXR 6DoF active');

    this.lastTimeMs = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.1, Math.max(0.001, (now - this.lastTimeMs) / 1000));
      this.lastTimeMs = now;
      const xrCamera = renderer.xr.getCamera();
      callbacks.onFrame(dt, xrCamera as unknown as THREE.PerspectiveCamera, scene);
      renderer.render(scene, camera);
    });
  }

  public isCameraHealthy(): boolean {
    if (this.contextLost || !this.session) return false;
    return performance.now() - this.lastTimeMs <= 2200;
  }

  public recenter(): void {
    // WebXR local-floor tracks physical ground; GeoAnchorEngine handles logical recenter
  }

  public stop(): void {
    this.stopRequested = true;
    this.contextLostCleanup?.();
    this.contextLostCleanup = null;
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.session) {
      void this.session.end().catch(() => {});
      this.session = null;
    }
  }
}
