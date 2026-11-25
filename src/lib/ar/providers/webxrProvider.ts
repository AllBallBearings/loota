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
      callbacks.onStatusChange?.('idle', 'WebXR session ended');
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

  public recenter(): void {
    // WebXR local-floor tracks physical ground; GeoAnchorEngine handles logical recenter
  }

  public stop(): void {
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
