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
    updateCameraProjectionMatrix?: (opts: {
      origin: THREE.Vector3;
      facing: THREE.Quaternion;
    }) => void;
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
  private resizeCleanup: (() => void) | null = null;

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
    callbacks.onStatusChange?.('initializing', 'Loading 8th Wall 6DoF SLAM runtime…');

    const keepCanvasCssFull = () => {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };

    // Size the WebGL drawing buffer to match the full viewport container at up to 2x DPR.
    // IMPORTANT: Never call this inside XR8's onCanvasSizeChange callback — XR8 detects
    // canvas.width/height changes on the next frame and propagates onCanvasSizeChange in
    // lockstep to GlTextureRenderer, Threejs, and XrController. Mutating canvas.width inside
    // onCanvasSizeChange causes XR8 to cache the new width without notifying GlTextureRenderer,
    // leaving the camera feed stuck in a sub-rectangle of the screen.
    const syncCanvasBuffer = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.max(1, Math.round(w * dpr));
      const targetH = Math.max(1, Math.round(h * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      keepCanvasCssFull();
    };

    syncCanvasBuffer();

    let orientationTimer: number | null = null;
    let rafResizeId: number | null = null;
    const scheduleSyncCanvasBuffer = () => {
      syncCanvasBuffer();
      if (rafResizeId !== null) window.cancelAnimationFrame(rafResizeId);
      rafResizeId = window.requestAnimationFrame(() => {
        rafResizeId = null;
        syncCanvasBuffer();
      });
    };
    const onOrientationChange = () => {
      scheduleSyncCanvasBuffer();
      if (orientationTimer !== null) window.clearTimeout(orientationTimer);
      orientationTimer = window.setTimeout(() => {
        orientationTimer = null;
        syncCanvasBuffer();
      }, 180);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleSyncCanvasBuffer())
        : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', scheduleSyncCanvasBuffer);
    window.addEventListener('orientationchange', onOrientationChange);
    window.visualViewport?.addEventListener('resize', scheduleSyncCanvasBuffer);

    this.resizeCleanup = () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleSyncCanvasBuffer);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.visualViewport?.removeEventListener('resize', scheduleSyncCanvasBuffer);
      if (orientationTimer !== null) {
        window.clearTimeout(orientationTimer);
        orientationTimer = null;
      }
      if (rafResizeId !== null) {
        window.cancelAnimationFrame(rafResizeId);
        rafResizeId = null;
      }
    };

    window.THREE = THREE;
    const XR8 = await loadSelfHostedXR8();
    this.xr8 = XR8;

    if (typeof XR8.loadChunk === 'function') {
      callbacks.onStatusChange?.('initializing', 'Initializing SLAM world tracker…');
      await XR8.loadChunk('slam');
    }

    // Re-sync right before XR8.run in case mobile browser bars / layout shifted during script load
    syncCanvasBuffer();

    XR8.XrController.configure({
      scale: 'absolute',
      disableWorldTracking: false,
      enableLighting: false,
    });

    XR8.clearCameraPipelineModules();

    let sceneInitialized = false;
    this.lastFrameMs = performance.now();

    // Clear the full color buffer before GlTextureRenderer draws the camera feed each frame.
    // Because XR8.Threejs sets renderer.autoClear = false and only clears depth (relying on
    // GlTextureRenderer to overwrite the entire color buffer), this guarantees zero frame
    // ghosting / "burn-in" even during viewport resizes or dropped camera frames.
    let drawGlCtx: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    const preClearModule = {
      name: 'loota-pre-clear',
      onAttach: ({ GLctx }: { GLctx?: WebGLRenderingContext | WebGL2RenderingContext }) => {
        drawGlCtx = GLctx ?? null;
      },
      onDetach: () => {
        drawGlCtx = null;
      },
      onRender: () => {
        if (!drawGlCtx) return;
        const scissorWasEnabled = drawGlCtx.isEnabled(drawGlCtx.SCISSOR_TEST);
        if (scissorWasEnabled) {
          drawGlCtx.disable(drawGlCtx.SCISSOR_TEST);
        }
        drawGlCtx.bindFramebuffer(drawGlCtx.FRAMEBUFFER, null);
        drawGlCtx.colorMask(true, true, true, true);
        drawGlCtx.clearColor(0.086, 0.149, 0.114, 1.0);
        drawGlCtx.clear(drawGlCtx.COLOR_BUFFER_BIT);
        if (scissorWasEnabled) {
          drawGlCtx.enable(drawGlCtx.SCISSOR_TEST);
        }
      },
    };

    const customLootaModule = {
      name: 'loota-world-tracking',
      onStart: () => {
        // XR8.Threejs.onStart calls renderer.setSize(w, h) with updateStyle=true,
        // writing physical pixel dimensions onto canvas.style — restore 100% CSS fill.
        keepCanvasCssFull();

        const xrScene = XR8.Threejs.xrScene();
        if (!xrScene) return;
        const { scene, camera, renderer } = xrScene;
        camera.position.set(0, 1.6, 0);
        XR8.XrController.updateCameraProjectionMatrix?.({
          origin: camera.position,
          facing: camera.quaternion,
        });
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        if (!sceneInitialized) {
          sceneInitialized = true;
          onSceneReady({ scene, camera, renderer });
          renderer.setRenderTarget(null);
        }

        // Schedule a next-frame buffer check in case the viewport resized during startup
        scheduleSyncCanvasBuffer();
        callbacks.onStatusChange?.('tracking', '6DoF SLAM active (Absolute Scale)');
      },
      onCanvasSizeChange: () => {
        // XR8.Threejs.onCanvasSizeChange calls renderer.setSize(w, h) with updateStyle=true.
        // Only restore CSS 100% fill here; never mutate canvas.width/height inside this callback.
        keepCanvasCssFull();
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

    // Note: Do NOT add deprecated XR8.FullWindowCanvas.pipelineModule().
    // Its onAttach reparents our React <canvas> onto document.body (breaking HUD z-order)
    // and shrinks canvas.width/height to 1x CSS pixels.
    XR8.addCameraPipelineModules([
      preClearModule,
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
    this.resizeCleanup?.();
    this.resizeCleanup = null;
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
