/**
 * Primary Cross-Platform 6DoF SLAM Provider using self-hosted @8thwall/engine-binary.
 * Delivers ARKit-caliber 6DoF world tracking + absolute metric scale inside iOS Safari
 * and Android Chrome, rendering directly through Three.js.
 *
 * Includes Niantic Spatial XR Engine Binary license attribution notice as required.
 */

import * as THREE from 'three';
import type { ARTrackingProvider, ARTrackingProviderCallbacks } from '../types';

interface XR8ThreejsScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

interface XR8Global {
  loadChunk?: (chunk: string) => Promise<void>;
  addCameraPipelineModules: (modules: unknown[]) => void;
  clearCameraPipelineModules: () => void;
  run: (config: { canvas: HTMLCanvasElement; allowedDevices?: string }) => void;
  stop: () => void;
  XrController: {
    configure: (opts: {
      scale?: 'absolute' | 'responsive';
      disableWorldTracking?: boolean;
      enableLighting?: boolean;
    }) => void;
    pipelineModule: () => unknown;
    recenter: () => void;
  };
  GlTextureRenderer: {
    pipelineModule: () => unknown;
  };
  Threejs: {
    pipelineModule: () => unknown;
    xrScene: () => XR8ThreejsScene;
  };
  XrConfig?: {
    device: () => { ANY: string; MOBILE: string };
  };
}

declare global {
  interface Window {
    THREE?: typeof THREE;
    XR8?: XR8Global;
  }
}

let scriptLoadPromise: Promise<XR8Global> | null = null;

function loadSelfHostedXR8(timeoutMs = 12000): Promise<XR8Global> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('XR8 requires a browser environment'));
  }
  if (window.XR8) {
    return Promise.resolve(window.XR8);
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<XR8Global>((resolve, reject) => {
    // XR8.Threejs reads window.THREE
    window.THREE = THREE;

    const timer = window.setTimeout(() => {
      scriptLoadPromise = null;
      reject(new Error('Timed out loading @8thwall/engine-binary (/external/xr/xr.js)'));
    }, timeoutMs);

    const onLoaded = () => {
      window.clearTimeout(timer);
      window.removeEventListener('xrloaded', onLoaded);
      if (window.XR8) {
        resolve(window.XR8);
      } else {
        scriptLoadPromise = null;
        reject(new Error('xrloaded fired but window.XR8 is undefined'));
      }
    };

    window.addEventListener('xrloaded', onLoaded);

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-loota-xr8="true"]'
    );
    if (!existing) {
      const script = document.createElement('script');
      script.src = '/external/xr/xr.js';
      script.async = true;
      script.setAttribute('data-preload-chunks', 'slam');
      script.setAttribute('data-loota-xr8', 'true');
      script.onerror = () => {
        window.clearTimeout(timer);
        window.removeEventListener('xrloaded', onLoaded);
        scriptLoadPromise = null;
        reject(new Error('Failed to load self-hosted /external/xr/xr.js'));
      };
      document.head.appendChild(script);
    }
  });

  return scriptLoadPromise;
}

export class EighthWallProvider implements ARTrackingProvider {
  public readonly mode = '8thwall' as const;
  private xr8: XR8Global | null = null;
  private running = false;
  private lastFrameMs = 0;

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
    const { canvas, callbacks, onSceneReady } = params;
    callbacks.onStatusChange?.('initializing', 'Loading 8th Wall 6DoF SLAM runtime…');

    window.THREE = THREE;
    const XR8 = await loadSelfHostedXR8();
    this.xr8 = XR8;

    if (typeof XR8.loadChunk === 'function') {
      callbacks.onStatusChange?.('initializing', 'Initializing SLAM world tracker…');
      await XR8.loadChunk('slam');
    }

    XR8.XrController.configure({
      scale: 'absolute',
      disableWorldTracking: false,
      enableLighting: false,
    });

    XR8.clearCameraPipelineModules();

    let sceneInitialized = false;
    this.lastFrameMs = performance.now();

    const customLootaModule = {
      name: 'loota-world-tracking',
      onStart: () => {
        const xrScene = XR8.Threejs.xrScene();
        if (!xrScene) return;
        const { scene, camera, renderer } = xrScene;
        camera.position.set(0, 1.6, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        if (!sceneInitialized) {
          sceneInitialized = true;
          onSceneReady({ scene, camera, renderer });
        }
        callbacks.onStatusChange?.('tracking', '6DoF SLAM active (Absolute Scale)');
      },
      onUpdate: () => {
        if (!this.running) return;
        const xrScene = XR8.Threejs.xrScene();
        if (!xrScene) return;
        const now = performance.now();
        const dt = Math.min(0.1, Math.max(0.001, (now - this.lastFrameMs) / 1000));
        this.lastFrameMs = now;
        callbacks.onFrame(dt, xrScene.camera, xrScene.scene);
      },
      onException: (err: unknown) => {
        console.error('[EighthWallProvider] XR8 exception:', err);
        callbacks.onStatusChange?.(
          'error',
          err instanceof Error ? err.message : 'SLAM runtime error'
        );
      },
    };

    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      customLootaModule,
    ]);

    this.running = true;

    // Wait for either onStart or a startup failure timeout so callers can gracefully fall back
    await new Promise<void>((resolve, reject) => {
      const guard = window.setTimeout(() => {
        if (!sceneInitialized) {
          reject(new Error('8th Wall camera pipeline did not initialize in time'));
        }
      }, 9000);

      const originalOnStart = customLootaModule.onStart;
      customLootaModule.onStart = () => {
        window.clearTimeout(guard);
        originalOnStart();
        resolve();
      };

      try {
        XR8.run({
          canvas,
          allowedDevices: XR8.XrConfig?.device?.()?.ANY ?? 'any',
        });
      } catch (err) {
        window.clearTimeout(guard);
        reject(err);
      }
    });
  }

  public recenter(): void {
    this.xr8?.XrController.recenter();
  }

  public stop(): void {
    this.running = false;
    if (this.xr8) {
      try {
        this.xr8.stop();
        this.xr8.clearCameraPipelineModules();
      } catch (err) {
        console.warn('[EighthWallProvider] Stop warning:', err);
      }
      this.xr8 = null;
    }
  }
}
