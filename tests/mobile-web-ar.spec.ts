import { test, expect } from '@playwright/test';

test.describe('Loota Mobile Web AR', () => {
  test('GET /api/config/experience returns Trailhead Arcade tokens and AR config', async ({
    request,
  }) => {
    const res = await request.get('/api/config/experience');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.designTokens.themeName).toBe('Trailhead Arcade');
    expect(json.designTokens.colors.blaze).toBe('#FF5428');
    expect(json.arGameplay.gameplay.focusRangeMeters).toBe(5);
    expect(json.arGameplay.tracking.localLockRadiusMeters).toBe(15);
  });

  test('/ar-lab launches 3D Simulator, locks onto nearby coin, and collects via Hold-to-Summon', async ({
    page,
  }) => {
    await page.goto('/ar-lab');
    await expect(page.getByTestId('ar-lab-setup')).toBeVisible();

    await page.getByTestId('ar-lab-launch-sim').click();
    await expect(page.getByTestId('ar-lab-active')).toBeVisible();
    await expect(page.getByTestId('ar-viewport')).toBeVisible();
    await expect(page.getByTestId('ar-collected-count')).toHaveText('0');
    await expect(page.getByTestId('ar-remaining-count')).toHaveText('4');

    // Pin #1 is 12 ft (3.65m) straight North — within 5m focus range and centered in screen!
    const summonBtn = page.getByTestId('ar-summon-button');
    await expect(summonBtn).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('ar-edge-glow')).toBeVisible();

    // Hold Spacebar (or pointer down) to summon until auto-collect (< 0.8m)
    await page.keyboard.down('Space');
    await expect(page.getByTestId('ar-collected-count')).toHaveText('1', { timeout: 10000 });
    await page.keyboard.up('Space');

    await expect(page.getByTestId('ar-remaining-count')).toHaveText('3');

    // Open AR Tools debug drawer and verify controls
    await page.getByTestId('ar-debug-toggle').click();
    await expect(page.getByTestId('ar-debug-panel')).toBeVisible();
  });

  test('/hunt/[huntId]/play full join -> simulator collect -> victory podium flow', async ({
    page,
  }) => {
    const mockHuntId = '11111111-1111-4111-8111-111111111111';
    const mockPinId = '22222222-2222-4222-8222-222222222222';
    const mockUserId = '33333333-3333-4333-8333-333333333333';
    let pinCollected = false;

    await page.route(/\/api\/users(\/|\?|$)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({
        status: 201,
        json: { message: 'Registered', userId: mockUserId },
      });
    });

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}(\\?|$)`),
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            id: mockHuntId,
            name: 'Trailhead Test Drop',
            type: 'proximity',
            proximityRadiusFt: 50,
            isCompleted: pinCollected,
            winnerId: pinCollected ? mockUserId : null,
            creator: { id: 'host-1', name: 'Jared' },
            creatorContact: pinCollected
              ? { phone: '5551234567', email: 'host@loota.fun', preferred: 'phone' }
              : undefined,
            participants: [],
            pins: [
              {
                id: mockPinId,
                order: 0,
                distanceFt: 10,
                directionStr: 'N',
                objectType: 'giftCard',
                collectedByUserId: pinCollected ? mockUserId : null,
                collectedByUser: pinCollected ? { id: mockUserId, name: 'Scout' } : null,
              },
            ],
          },
        });
      }
    );

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}/participants`),
      async (route) => {
        await route.fulfill({
          status: 201,
          json: { message: 'Joined', participationId: 'part-1' },
        });
      }
    );

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}/pins/${mockPinId}/collect`),
      async (route) => {
        pinCollected = true;
        await route.fulfill({
          status: 200,
          json: {
            message: 'Pin collected successfully',
            pinId: mockPinId,
            remainingPins: 0,
            huntCompleted: true,
            winnerId: mockUserId,
          },
        });
      }
    );

    await page.goto(`/hunt/${mockHuntId}/play?mode=simulator`);
    await expect(page.getByTestId('ar-join-screen')).toBeVisible();

    // Validation check: short phone should show error
    await page.getByTestId('ar-join-name').fill('Scout');
    await page.getByTestId('ar-join-phone').fill('555');
    await page.getByTestId('ar-join-sim-btn').click();
    await expect(page.getByTestId('ar-join-error')).toBeVisible();

    // Valid 10-digit phone enters simulator
    await page.getByTestId('ar-join-phone').fill('5551234567');
    await page.getByTestId('ar-join-sim-btn').click();
    await expect(page.getByTestId('ar-active-stage')).toBeVisible();

    // Epic Gift Card is 10 ft straight ahead — summon it to win!
    await expect(page.getByTestId('ar-summon-button')).toBeVisible({ timeout: 8000 });
    await page.keyboard.down('Space');
    await expect(page.getByTestId('ar-victory-screen')).toBeVisible({ timeout: 10000 });
    await page.keyboard.up('Space');

    // Verify winner contact card appears
    await expect(page.getByTestId('ar-winner-contact')).toBeVisible();
  });

  test('/ar-lab 8th Wall SLAM fills mobile viewport, clears color buffer before camera draw, and preserves HUD z-order across resizes', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 700 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    // Provide a faithful XR8 runtime stub mirroring @8thwall/engine-binary's pipeline order,
    // Threejs setSize(w, h) inline style mutation, and Z() canvas-size tracking.
    await page.addInitScript(() => {
      type PipelineMod = {
        name: string;
        onAttach?: (args: { GLctx: WebGL2RenderingContext | null }) => void;
        onStart?: (args: { canvas: HTMLCanvasElement; canvasWidth: number; canvasHeight: number }) => void;
        onCanvasSizeChange?: (args: { canvasWidth: number; canvasHeight: number }) => void;
        onUpdate?: () => void;
        onRender?: () => void;
        onDetach?: () => void;
      };

      const state = {
        moduleNames: [] as string[],
        fullWindowCanvasUsed: false,
        preClearCount: 0,
        glTextureViewport: { width: 0, height: 0 },
        mutatedCanvasInsideSizeChange: false,
        runCanvasWidth: 0,
        runCanvasHeight: 0,
      };
      (window as unknown as Record<string, unknown>).__xr8TestState = state;

      let modules: PipelineMod[] = [];
      let rafId = 0;
      let activeCanvas: HTMLCanvasElement | null = null;
      let lastTrackedW = -1;
      let lastTrackedH = -1;
      let threeScene: {
        scene: unknown;
        camera: unknown;
        renderer: {
          toneMapping: number;
          toneMappingExposure: number;
          setSize: (w: number, h: number, updateStyle?: boolean) => void;
          setRenderTarget: (rt: unknown) => void;
        };
      } | null = null;

      (window as unknown as Record<string, unknown>).XR8 = {
        loadChunk: async () => {},
        XrConfig: { device: () => ({ ANY: 'any', MOBILE: 'mobile' }) },
        XrController: {
          configure: () => {},
          updateCameraProjectionMatrix: () => {},
          recenter: () => {},
          pipelineModule: () => ({ name: 'reality' }),
        },
        // Trap deprecated FullWindowCanvas: if ever called, flag failure!
        FullWindowCanvas: {
          pipelineModule: () => {
            state.fullWindowCanvasUsed = true;
            return { name: 'fullwindowcanvas' };
          },
        },
        GlTextureRenderer: {
          pipelineModule: () => ({
            name: 'gltexturerenderer',
            onStart: ({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) => {
              state.glTextureViewport = { width: canvasWidth, height: canvasHeight };
            },
            onCanvasSizeChange: ({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) => {
              state.glTextureViewport = { width: canvasWidth, height: canvasHeight };
            },
            onRender: () => {},
          }),
        },
        Threejs: {
          xrScene: () => threeScene,
          pipelineModule: () => ({
            name: 'threejsrenderer',
            onStart: ({ canvas, canvasWidth, canvasHeight }: { canvas: HTMLCanvasElement; canvasWidth: number; canvasHeight: number }) => {
              const THREE = (window as unknown as Record<string, Record<string, new (...args: unknown[]) => unknown>>).THREE;
              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(60, canvasWidth / canvasHeight, 0.05, 500);
              const renderer = {
                toneMapping: 0,
                toneMappingExposure: 1,
                setSize: (w: number, h: number, updateStyle = true) => {
                  canvas.width = w;
                  canvas.height = h;
                  if (updateStyle) {
                    canvas.style.width = `${w}px`;
                    canvas.style.height = `${h}px`;
                  }
                },
                setRenderTarget: () => {},
              };
              // Mirrors XR8.Threejs calling renderer.setSize(Q, B) with updateStyle=true
              renderer.setSize(canvasWidth, canvasHeight);
              threeScene = { scene, camera, renderer };
            },
            onCanvasSizeChange: ({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) => {
              threeScene?.renderer.setSize(canvasWidth, canvasHeight);
            },
          }),
        },
        clearCameraPipelineModules: () => {
          modules = [];
        },
        addCameraPipelineModules: (next: PipelineMod[]) => {
          modules.push(...next);
          state.moduleNames = modules.map((m) => m.name);
        },
        run: ({ canvas }: { canvas: HTMLCanvasElement }) => {
          activeCanvas = canvas;
          state.runCanvasWidth = canvas.width;
          state.runCanvasHeight = canvas.height;
          lastTrackedW = canvas.width;
          lastTrackedH = canvas.height;

          const fakeGl = {
            SCISSOR_TEST: 0x0c11,
            FRAMEBUFFER: 0x8d40,
            COLOR_BUFFER_BIT: 0x4000,
            isEnabled: () => false,
            disable: () => {},
            enable: () => {},
            bindFramebuffer: () => {},
            colorMask: () => {},
            clearColor: () => {},
            clear: () => {
              state.preClearCount += 1;
            },
          } as unknown as WebGL2RenderingContext;

          modules.forEach((m) =>
            m.onStart?.({ canvas, canvasWidth: canvas.width, canvasHeight: canvas.height })
          );
          modules.forEach((m) => m.onAttach?.({ GLctx: fakeGl }));

          const loop = () => {
            if (!activeCanvas) return;
            if (activeCanvas.width !== lastTrackedW || activeCanvas.height !== lastTrackedH) {
              const cw = activeCanvas.width;
              const ch = activeCanvas.height;
              modules.forEach((m) => m.onCanvasSizeChange?.({ canvasWidth: cw, canvasHeight: ch }));
              if (activeCanvas.width !== cw || activeCanvas.height !== ch) {
                state.mutatedCanvasInsideSizeChange = true;
              }
              lastTrackedW = activeCanvas.width;
              lastTrackedH = activeCanvas.height;
            }
            modules.forEach((m) => m.onUpdate?.());
            modules.forEach((m) => m.onRender?.());
            rafId = window.requestAnimationFrame(loop);
          };
          rafId = window.requestAnimationFrame(loop);
        },
        stop: () => {
          window.cancelAnimationFrame(rafId);
          modules.forEach((m) => m.onDetach?.());
          activeCanvas = null;
          threeScene = null;
        },
      };
    });

    await page.goto('/ar-lab');
    await page.getByTestId('ar-lab-launch-8thwall').click();
    await expect(page.getByTestId('ar-lab-active')).toBeVisible();
    await expect(page.getByTestId('ar-provider-badge')).toContainText('6DoF SLAM');
    await page.waitForTimeout(300);

    const initial = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas.ar-canvas')!;
      const closeBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Exit AR"]')!;
      const hud = document.getElementById('loota-ar-hud-overlay')!;
      const wrap = canvas.parentElement!;
      return {
        xr8: (window as unknown as Record<string, unknown>).__xr8TestState as {
          moduleNames: string[];
          fullWindowCanvasUsed: boolean;
          preClearCount: number;
          glTextureViewport: { width: number; height: number };
          mutatedCanvasInsideSizeChange: boolean;
          runCanvasWidth: number;
          runCanvasHeight: number;
        },
        parentClass: wrap.className,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        canvasRect: canvas.getBoundingClientRect().toJSON(),
        hudZ: Number(getComputedStyle(hud).zIndex),
        wrapZ: Number(getComputedStyle(wrap).zIndex),
        closeBtnRight: closeBtn.getBoundingClientRect().right,
      };
    });

    // 1. Deprecated FullWindowCanvas must NEVER be used; canvas stays inside .ar-canvas-wrap
    expect(initial.xr8.fullWindowCanvasUsed).toBe(false);
    expect(initial.parentClass).toBe('ar-canvas-wrap');
    expect(initial.hudZ).toBeGreaterThan(initial.wrapZ);

    // 2. Pre-clear module must be registered BEFORE GlTextureRenderer and actually execute
    const preClearIdx = initial.xr8.moduleNames.indexOf('loota-pre-clear');
    const glTexIdx = initial.xr8.moduleNames.indexOf('gltexturerenderer');
    expect(preClearIdx).toBeGreaterThanOrEqual(0);
    expect(glTexIdx).toBeGreaterThan(preClearIdx);
    expect(initial.xr8.preClearCount).toBeGreaterThan(0);

    // 3. Canvas buffer and GlTextureRenderer viewport must match full 2x DPR viewport (786x1400)
    expect(initial.xr8.runCanvasWidth).toBe(786);
    expect(initial.xr8.runCanvasHeight).toBe(1400);
    expect(initial.canvasWidth).toBe(786);
    expect(initial.canvasHeight).toBe(1400);
    expect(initial.xr8.glTextureViewport).toEqual({ width: 786, height: 1400 });
    expect(Math.round(initial.canvasRect.width)).toBe(393);
    expect(Math.round(initial.canvasRect.height)).toBe(700);

    // 4. Mobile top HUD must not clip past right edge of 393px screen
    expect(initial.closeBtnRight).toBeLessThanOrEqual(393);

    // 5. Dynamic resize (e.g. mobile browser address bar collapse) must keep GlTextureRenderer in sync
    await page.setViewportSize({ width: 393, height: 760 });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const canvas = document.querySelector<HTMLCanvasElement>('canvas.ar-canvas')!;
            const xr8 = (window as unknown as Record<string, unknown>).__xr8TestState as {
              glTextureViewport: { width: number; height: number };
              mutatedCanvasInsideSizeChange: boolean;
            };
            return {
              glTextureViewport: xr8.glTextureViewport,
              mutatedCanvasInsideSizeChange: xr8.mutatedCanvasInsideSizeChange,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              canvasRectHeight: Math.round(canvas.getBoundingClientRect().height),
            };
          }),
        { timeout: 5000 }
      )
      .toEqual({
        glTextureViewport: { width: 786, height: 1520 },
        mutatedCanvasInsideSizeChange: false,
        canvasWidth: 786,
        canvasHeight: 1520,
        canvasRectHeight: 760,
      });

    await context.close();
  });
});
