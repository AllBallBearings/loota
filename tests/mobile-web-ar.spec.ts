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
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const xr8 = (window as unknown as Record<string, { preClearCount?: number }>)
              .__xr8TestState;
            return xr8?.preClearCount ?? 0;
          }),
        { timeout: 5000 }
      )
      .toBeGreaterThan(0);

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

  test('/hunt/[huntId]/play geolocation AR stays stable under continuous noisy GPS while walking & turning, and realigns to map on-screen without refresh', async ({
    browser,
  }) => {
    const mockHuntId = '44444444-4444-4444-8444-444444444444';
    const mockUserId = '55555555-5555-4555-8555-555555555555';
    const baseLat = 35.6721;
    const baseLng = -78.7517;
    // WGS84 offsets around 35.6721°N (~110953 m/deg lat, ~90497 m/deg lng)
    const pinNearLat = baseLat + 12 / 110953; // 12m North
    const pinNearLng = baseLng;
    const pinFarLat = baseLat;
    const pinFarLng = baseLng + 42 / 90497; // 42m East

    const context = await browser.newContext({
      viewport: { width: 393, height: 700 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.route(/\/api\/users(\/|\?|$)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({ status: 201, json: { message: 'Registered', userId: mockUserId } });
    });

    await page.route(new RegExp(`/api/client/hunts/${mockHuntId}(\\?|$)`), async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          id: mockHuntId,
          name: 'Park Walk Geo Drop',
          type: 'geolocation',
          isCompleted: false,
          winnerId: null,
          creator: { id: 'host-geo', name: 'Trailhead Host' },
          participants: [],
          pins: [
            {
              id: 'geo-pin-near',
              order: 0,
              lat: pinNearLat,
              lng: pinNearLng,
              objectType: 'coin',
              collectedByUserId: null,
            },
            {
              id: 'geo-pin-far',
              order: 1,
              lat: pinFarLat,
              lng: pinFarLng,
              objectType: 'giftCard',
              collectedByUserId: null,
            },
          ],
        },
      });
    });

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}/participants`),
      async (route) => {
        await route.fulfill({
          status: 201,
          json: { message: 'Joined', participationId: 'part-geo-1' },
        });
      }
    );

    // Install controllable 6DoF XR8 camera + continuous mock Geolocation + DeviceOrientation driver
    await page.addInitScript(
      ({ initLat, initLng }) => {
        type PosCb = (pos: GeolocationPosition) => void;
        const watchCallbacks = new Map<number, PosCb>();
        let nextWatchId = 1;

        let currentGps = {
          lat: initLat,
          lng: initLng,
          accuracy: 5,
          timestamp: Date.now(),
        };
        let freshFixOverride: { lat: number; lng: number; accuracy: number } | null = null;
        let freshFixCalls = 0;

        const makeGeoPos = (fix: {
          lat: number;
          lng: number;
          accuracy: number;
          timestamp: number;
        }): GeolocationPosition =>
          ({
            coords: {
              latitude: fix.lat,
              longitude: fix.lng,
              accuracy: fix.accuracy,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: fix.timestamp,
            toJSON: () => ({}),
          }) as GeolocationPosition;

        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: {
            watchPosition: (success: PosCb) => {
              const id = nextWatchId++;
              watchCallbacks.set(id, success);
              // Emit initial fix asynchronously
              window.setTimeout(() => {
                if (watchCallbacks.has(id)) {
                  success(makeGeoPos(currentGps));
                }
              }, 20);
              return id;
            },
            clearWatch: (id: number) => {
              watchCallbacks.delete(id);
            },
            getCurrentPosition: (success: PosCb) => {
              freshFixCalls += 1;
              const fix = freshFixOverride
                ? { ...freshFixOverride, timestamp: Date.now() }
                : { ...currentGps, timestamp: Date.now() };
              currentGps = fix;
              window.setTimeout(() => success(makeGeoPos(fix)), 15);
            },
          },
        });

        // Controllable 6DoF camera state driven by the test
        const camPose = { x: 0, y: 1.6, z: 0, yawRad: 0 };

        (window as unknown as Record<string, unknown>).__geoWalkDriver = {
          setCameraPose: (x: number, z: number, yawRad: number) => {
            camPose.x = x;
            camPose.z = z;
            camPose.yawRad = yawRad;
          },
          emitGpsMeters: (eastMeters: number, northMeters: number, accuracy = 6) => {
            currentGps = {
              lat: initLat + northMeters / 110953,
              lng: initLng + eastMeters / 90497,
              accuracy,
              timestamp: Date.now(),
            };
            watchCallbacks.forEach((cb) => cb(makeGeoPos(currentGps)));
          },
          setFreshGpsOverrideMeters: (eastMeters: number, northMeters: number, accuracy = 3.5) => {
            freshFixOverride = {
              lat: initLat + northMeters / 110953,
              lng: initLng + eastMeters / 90497,
              accuracy,
            };
          },
          emitCompassHeading: (headingDeg: number, webkitInvalid = false) => {
            const ev = new Event('deviceorientation') as Event & {
              alpha: number;
              beta: number;
              gamma: number;
              absolute: boolean;
              webkitCompassHeading?: number;
              webkitCompassAccuracy?: number;
            };
            // Simulate upright phone near beta=90° facing headingDeg
            ev.alpha = (360 - headingDeg + 360) % 360;
            ev.beta = 90;
            ev.gamma = 0;
            ev.absolute = true;
            if (webkitInvalid) {
              ev.webkitCompassHeading = (headingDeg + 180) % 360;
              ev.webkitCompassAccuracy = -1; // iOS uncalibrated reading — must be ignored!
            }
            window.dispatchEvent(ev);
          },
          getFreshFixCalls: () => freshFixCalls,
        };

        // Lightweight XR8 runtime stub driving Three.js camera from camPose
        type PipelineMod = {
          name: string;
          onAttach?: (args: { GLctx: WebGL2RenderingContext | null }) => void;
          onStart?: (args: {
            canvas: HTMLCanvasElement;
            canvasWidth: number;
            canvasHeight: number;
          }) => void;
          onUpdate?: () => void;
          onRender?: () => void;
          onDetach?: () => void;
        };

        let modules: PipelineMod[] = [];
        let rafId = 0;
        let threeScene: {
          scene: unknown;
          camera: {
            position: { set: (x: number, y: number, z: number) => void };
            rotation: { order: string; set: (x: number, y: number, z: number) => void };
            updateMatrixWorld: (force?: boolean) => void;
          };
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
          GlTextureRenderer: {
            pipelineModule: () => ({ name: 'gltexturerenderer', onRender: () => {} }),
          },
          Threejs: {
            xrScene: () => threeScene,
            pipelineModule: () => ({
              name: 'threejsrenderer',
              onStart: ({
                canvas,
                canvasWidth,
                canvasHeight,
              }: {
                canvas: HTMLCanvasElement;
                canvasWidth: number;
                canvasHeight: number;
              }) => {
                const THREE = (
                  window as unknown as Record<
                    string,
                    Record<string, new (...args: unknown[]) => unknown>
                  >
                ).THREE;
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(
                  60,
                  canvasWidth / canvasHeight,
                  0.05,
                  500
                ) as NonNullable<typeof threeScene>['camera'];
                camera.rotation.order = 'YXZ';
                const renderer = {
                  toneMapping: 0,
                  toneMappingExposure: 1,
                  setSize: (w: number, h: number) => {
                    canvas.width = w;
                    canvas.height = h;
                  },
                  setRenderTarget: () => {},
                };
                renderer.setSize(canvasWidth, canvasHeight);
                threeScene = { scene, camera, renderer };
              },
            }),
          },
          clearCameraPipelineModules: () => {
            modules = [];
          },
          addCameraPipelineModules: (next: PipelineMod[]) => {
            modules.push(...next);
          },
          run: ({ canvas }: { canvas: HTMLCanvasElement }) => {
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
              clear: () => {},
            } as unknown as WebGL2RenderingContext;

            modules.forEach((m) =>
              m.onStart?.({ canvas, canvasWidth: canvas.width, canvasHeight: canvas.height })
            );
            modules.forEach((m) => m.onAttach?.({ GLctx: fakeGl }));

            const loop = () => {
              if (threeScene) {
                threeScene.camera.position.set(camPose.x, camPose.y, camPose.z);
                // Three.js +Y yaw is CCW; clockwise heading yawRad maps to rotation.y = -yawRad
                threeScene.camera.rotation.set(0, -camPose.yawRad, 0);
                threeScene.camera.updateMatrixWorld(true);
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
            threeScene = null;
          },
        };
      },
      { initLat: baseLat, initLng: baseLng }
    );

    await page.goto(`/hunt/${mockHuntId}/play`);
    await expect(page.getByTestId('ar-join-screen')).toBeVisible();

    await page.getByTestId('ar-join-name').fill('Walker');
    await page.getByTestId('ar-join-phone').fill('5559876543');
    await page.getByTestId('ar-join-live-btn').click();
    await expect(page.getByTestId('ar-active-stage')).toBeVisible();
    await expect(page.getByTestId('ar-provider-badge')).toContainText('6DoF SLAM');

    // Seed initial North compass heading and verify iOS invalid compass (-1) is ignored
    await page.evaluate(() => {
      const driver = (window as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>)
        .__geoWalkDriver;
      driver.emitCompassHeading(0, false);
      driver.emitCompassHeading(180, true); // invalid accuracy=-1, should be rejected!
    });

    // Wait for GeoAnchorEngine to publish initial anchors via telemetry
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const dbg = (window as unknown as Record<string, { anchors?: unknown[] }>)
              .__LOOTA_AR_DEBUG__;
            return dbg?.anchors?.length ?? 0;
          }),
        { timeout: 5000 }
      )
      .toBe(2);

    // Simulate a person walking North, turning 90° East, turning 180° West, and turning South
    // while GPS updates continuously with ±4m jitter and a 32m multipath spike!
    const walkSteps = [
      { east: 0, north: 2, yawRad: 0, jitterE: 2.8, jitterN: -2.1 },
      { east: 0, north: 5, yawRad: 0, jitterE: -3.2, jitterN: 1.9 },
      { east: 0, north: 8, yawRad: 0.4, jitterE: 3.5, jitterN: -2.5 },
      // 90° turn East + sudden 32m multipath GPS teleport spike (must be rejected!)
      { east: 3, north: 8, yawRad: Math.PI / 2, jitterE: 32, jitterN: -18 },
      { east: 6, north: 8, yawRad: Math.PI / 2, jitterE: -2.9, jitterN: 3.1 },
      // 180° U-turn West
      { east: 3, north: 8, yawRad: -Math.PI / 2, jitterE: 3.4, jitterN: -3.0 },
      { east: 0, north: 8, yawRad: -Math.PI / 2, jitterE: -2.4, jitterN: 2.2 },
      // Turn South back toward origin
      { east: 0, north: 5, yawRad: Math.PI, jitterE: 2.6, jitterN: -2.8 },
    ];

    const observedYaws: number[] = [];
    const observedNearPositions: Array<{ x: number; z: number }> = [];
    const observedFarPositions: Array<{ x: number; z: number }> = [];

    for (const step of walkSteps) {
      await page.evaluate((s) => {
        const driver = (
          window as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>
        ).__geoWalkDriver;
        driver.setCameraPose(s.east, -s.north, s.yawRad);
        driver.emitGpsMeters(s.east + s.jitterE, s.north + s.jitterN, 7);
        const deg = (((s.yawRad * 180) / Math.PI) % 360 + 360) % 360;
        driver.emitCompassHeading(deg, false);
      }, step);
      await page.waitForTimeout(180);

      const snap = await page.evaluate(() => {
        const dbg = (
          window as unknown as Record<
            string,
            {
              telemetry: { yawOffsetDeg: number };
              anchors: Array<{ pinId: string; worldPos: { x: number; z: number } }>;
            }
          >
        ).__LOOTA_AR_DEBUG__;
        return {
          yaw: dbg.telemetry.yawOffsetDeg,
          near: dbg.anchors.find((a) => a.pinId === 'geo-pin-near')!.worldPos,
          far: dbg.anchors.find((a) => a.pinId === 'geo-pin-far')!.worldPos,
        };
      });

      observedYaws.push(snap.yaw);
      observedNearPositions.push(snap.near);
      observedFarPositions.push(snap.far);
    }

    // Assert zero 180° swings and rock-solid world anchoring across the entire walk + turns + GPS spikes!
    for (let i = 0; i < observedYaws.length; i++) {
      expect(Math.abs(observedYaws[i])).toBeLessThan(20);
      // Pin Near should stay anchored near (0, -12)
      expect(Math.hypot(observedNearPositions[i].x - 0, observedNearPositions[i].z - -12)).toBeLessThan(2.5);
      // Pin Far should stay anchored near (42, 0)
      expect(Math.hypot(observedFarPositions[i].x - 42, observedFarPositions[i].z - 0)).toBeLessThan(3.0);
    }

    // Now verify ON-SCREEN MAP REALIGNMENT WITHOUT PAGE REFRESH!
    await page.evaluate(() => {
      (window as unknown as Record<string, string>).__noReloadToken = 'still-same-session';
    });

    // Open on-screen Align panel
    await page.getByTestId('ar-recenter-btn').click();
    await expect(page.getByTestId('ar-align-panel')).toBeVisible();

    const beforeFlipNear = await page.evaluate(() => {
      const dbg = (
        window as unknown as Record<
          string,
          { anchors: Array<{ pinId: string; worldPos: { x: number; z: number } }> }
        >
      ).__LOOTA_AR_DEBUG__;
      return dbg.anchors.find((a) => a.pinId === 'geo-pin-near')!.worldPos;
    });

    // 1. Tap "Flip 180°" — pin rotates 180° around player's current position (0, -5)
    await page.getByTestId('ar-align-flip-180').click();
    await expect(page.getByTestId('ar-align-deg-readout')).toHaveText(/180°/);
    await expect(page.getByTestId('ar-gps-status-chip')).toContainText('Manual');

    const afterFlipNear = await page.evaluate(() => {
      const dbg = (
        window as unknown as Record<
          string,
          { anchors: Array<{ pinId: string; worldPos: { x: number; z: number } }> }
        >
      ).__LOOTA_AR_DEBUG__;
      return dbg.anchors.find((a) => a.pinId === 'geo-pin-near')!.worldPos;
    });
    // Player is at z = -5; flipping pin near z = -12 around z = -5 moves it to z = +2!
    expect(beforeFlipNear.z).toBeLessThan(-9);
    expect(afterFlipNear.z).toBeGreaterThan(-1);

    // 2. Tap "+15°" nudge then "0°" reset
    await page.getByTestId('ar-align-nudge-right-15').click();
    await expect(page.getByTestId('ar-align-deg-readout')).not.toHaveText('0°');
    await page.getByTestId('ar-align-reset-yaw').click();
    await expect(page.getByTestId('ar-align-deg-readout')).toHaveText('0°');

    // 3. Tap "Re-Sync GPS & Map" with a fresh GPS fix (player actually at 2m North, facing North)
    await page.evaluate(() => {
      const driver = (
        window as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>
      ).__geoWalkDriver;
      driver.setCameraPose(0, -5, 0);
      driver.emitCompassHeading(0, false);
      driver.setFreshGpsOverrideMeters(0, 2, 3.5);
    });
    await page.waitForTimeout(120);

    await page.getByTestId('ar-realign-snap-btn').click();

    // Wait for fresh getCurrentPosition to apply and re-anchor pin-near (12m N - 2m N = 10m ahead -> z = -15)
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const driver = (
              window as unknown as Record<string, Record<string, () => number>>
            ).__geoWalkDriver;
            const dbg = (
              window as unknown as Record<
                string,
                { anchors: Array<{ pinId: string; worldPos: { x: number; z: number } }> }
              >
            ).__LOOTA_AR_DEBUG__;
            const near = dbg.anchors.find((a) => a.pinId === 'geo-pin-near')!.worldPos;
            return {
              freshCalls: driver.getFreshFixCalls(),
              nearZ: Math.round(near.z),
              token: (window as unknown as Record<string, string>).__noReloadToken,
            };
          }),
        { timeout: 5000 }
      )
      .toEqual({
        freshCalls: 1,
        nearZ: -15,
        token: 'still-same-session',
      });

    await context.close();
  });

  test('/hunt/[huntId]/play detects frozen camera after screen lock/unlock and reloads camera front-and-center without refreshing the page', async ({
    browser,
  }) => {
    const mockHuntId = '66666666-6666-4666-8666-666666666666';
    const mockUserId = '77777777-7777-4777-8777-777777777777';

    const context = await browser.newContext({
      viewport: { width: 393, height: 700 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.route(/\/api\/users(\/|\?|$)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({ status: 201, json: { message: 'Registered', userId: mockUserId } });
    });

    await page.route(new RegExp(`/api/client/hunts/${mockHuntId}(\\?|$)`), async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          id: mockHuntId,
          name: 'Screen Lock Recovery Drop',
          type: 'proximity',
          proximityRadiusFt: 50,
          isCompleted: false,
          winnerId: null,
          creator: { id: 'host-rec', name: 'Trailhead Host' },
          participants: [],
          pins: [
            {
              id: 'rec-pin-1',
              order: 0,
              distanceFt: 18,
              directionStr: 'N',
              objectType: 'coin',
              collectedByUserId: null,
            },
          ],
        },
      });
    });

    await page.route(
      new RegExp(`/api/client/hunts/${mockHuntId}/participants`),
      async (route) => {
        await route.fulfill({
          status: 201,
          json: { message: 'Joined', participationId: 'part-rec-1' },
        });
      }
    );

    await page.addInitScript(() => {
      // Controllable document.visibilityState for simulating phone screen off -> on
      let mockVisibility: DocumentVisibilityState = 'visible';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => mockVisibility,
      });

      type PipelineMod = {
        name: string;
        onAttach?: (args: { GLctx: WebGL2RenderingContext | null }) => void;
        onStart?: (args: {
          canvas: HTMLCanvasElement;
          canvasWidth: number;
          canvasHeight: number;
        }) => void;
        onCameraStatusChange?: (args: {
          status: string;
          stream?: MediaStream;
          video?: HTMLVideoElement;
        }) => void;
        onUpdate?: () => void;
        onRender?: () => void;
        onDetach?: () => void;
      };

      const cameraLifecycle = {
        runCount: 0,
        stopCount: 0,
        loopFrozen: false,
        activeTrack: null as (EventTarget & { readyState: string; muted: boolean }) | null,
      };

      let modules: PipelineMod[] = [];
      let rafId = 0;
      let threeScene: {
        scene: unknown;
        camera: unknown;
        renderer: {
          toneMapping: number;
          toneMappingExposure: number;
          setSize: (w: number, h: number) => void;
          setRenderTarget: (rt: unknown) => void;
        };
      } | null = null;

      (window as unknown as Record<string, unknown>).__cameraRecoveryDriver = {
        getStats: () => ({
          runCount: cameraLifecycle.runCount,
          stopCount: cameraLifecycle.stopCount,
        }),
        simulateScreenOffWithEndedTrack: () => {
          mockVisibility = 'hidden';
          document.dispatchEvent(new Event('visibilitychange'));
          if (cameraLifecycle.activeTrack) {
            cameraLifecycle.activeTrack.readyState = 'ended';
            cameraLifecycle.activeTrack.dispatchEvent(new Event('ended'));
          }
        },
        simulateScreenOn: () => {
          mockVisibility = 'visible';
          document.dispatchEvent(new Event('visibilitychange'));
        },
        simulateScreenOffWithFrozenLoop: () => {
          mockVisibility = 'hidden';
          document.dispatchEvent(new Event('visibilitychange'));
          cameraLifecycle.loopFrozen = true;
        },
      };

      (window as unknown as Record<string, unknown>).XR8 = {
        loadChunk: async () => {},
        XrConfig: { device: () => ({ ANY: 'any', MOBILE: 'mobile' }) },
        XrController: {
          configure: () => {},
          updateCameraProjectionMatrix: () => {},
          recenter: () => {},
          pipelineModule: () => ({ name: 'reality' }),
        },
        GlTextureRenderer: {
          pipelineModule: () => ({ name: 'gltexturerenderer', onRender: () => {} }),
        },
        Threejs: {
          xrScene: () => threeScene,
          pipelineModule: () => ({
            name: 'threejsrenderer',
            onStart: ({
              canvas,
              canvasWidth,
              canvasHeight,
            }: {
              canvas: HTMLCanvasElement;
              canvasWidth: number;
              canvasHeight: number;
            }) => {
              const THREE = (
                window as unknown as Record<
                  string,
                  Record<string, new (...args: unknown[]) => unknown>
                >
              ).THREE;
              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(60, canvasWidth / canvasHeight, 0.05, 500);
              const renderer = {
                toneMapping: 0,
                toneMappingExposure: 1,
                setSize: (w: number, h: number) => {
                  canvas.width = w;
                  canvas.height = h;
                },
                setRenderTarget: () => {},
              };
              renderer.setSize(canvasWidth, canvasHeight);
              threeScene = { scene, camera, renderer };
            },
          }),
        },
        clearCameraPipelineModules: () => {
          modules = [];
        },
        addCameraPipelineModules: (next: PipelineMod[]) => {
          modules.push(...next);
        },
        run: ({ canvas }: { canvas: HTMLCanvasElement }) => {
          cameraLifecycle.runCount += 1;
          cameraLifecycle.loopFrozen = false;

          const mockTrack = Object.assign(new EventTarget(), {
            readyState: 'live',
            muted: false,
            stop: () => {
              mockTrack.readyState = 'ended';
            },
          });
          cameraLifecycle.activeTrack = mockTrack;
          const mockStream = {
            getVideoTracks: () => [mockTrack],
          } as unknown as MediaStream;

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
            clear: () => {},
          } as unknown as WebGL2RenderingContext;

          modules.forEach((m) =>
            m.onCameraStatusChange?.({ status: 'hasStream', stream: mockStream })
          );
          modules.forEach((m) =>
            m.onStart?.({ canvas, canvasWidth: canvas.width, canvasHeight: canvas.height })
          );
          modules.forEach((m) => m.onAttach?.({ GLctx: fakeGl }));

          const loop = () => {
            if (!cameraLifecycle.loopFrozen) {
              modules.forEach((m) => m.onUpdate?.());
              modules.forEach((m) => m.onRender?.());
            }
            rafId = window.requestAnimationFrame(loop);
          };
          rafId = window.requestAnimationFrame(loop);
        },
        stop: () => {
          cameraLifecycle.stopCount += 1;
          window.cancelAnimationFrame(rafId);
          modules.forEach((m) => m.onDetach?.());
          threeScene = null;
        },
      };
    });

    await page.goto(`/hunt/${mockHuntId}/play`);
    await expect(page.getByTestId('ar-join-screen')).toBeVisible();
    await page.getByTestId('ar-join-name').fill('Sleeper');
    await page.getByTestId('ar-join-phone').fill('5552223333');
    await page.getByTestId('ar-join-live-btn').click();
    await expect(page.getByTestId('ar-active-stage')).toBeVisible();
    await expect(page.getByTestId('ar-provider-badge')).toContainText('6DoF SLAM');

    // Save session token and initial canvas reference to prove zero page reload + fresh WebGL canvas
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__noReloadToken = 'camera-recovery-session';
      w.__initialCanvas = document.querySelector('canvas.ar-canvas');
    });

    // Scenario 1: Screen turns off -> OS kills camera stream track -> Screen turns back on
    await page.evaluate(() => {
      const driver = (
        window as unknown as Record<string, Record<string, () => void>>
      ).__cameraRecoveryDriver;
      driver.simulateScreenOffWithEndedTrack();
      driver.simulateScreenOn();
    });

    // Front-and-center "Camera Feed Paused" prompt appears automatically
    await expect(page.getByTestId('ar-camera-frozen-banner')).toBeVisible({ timeout: 3000 });
    await page.getByTestId('ar-reload-camera-btn').click();

    // Banner clears, XR8 stopped & restarted cleanly on a fresh <canvas>, zero page reload
    await expect(page.getByTestId('ar-camera-frozen-banner')).toBeHidden({ timeout: 4000 });
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const w = window as unknown as Record<string, unknown>;
            const driver = w.__cameraRecoveryDriver as {
              getStats: () => { runCount: number; stopCount: number };
            };
            const currentCanvas = document.querySelector('canvas.ar-canvas');
            return {
              ...driver.getStats(),
              canvasReplaced: currentCanvas !== null && currentCanvas !== w.__initialCanvas,
              token: w.__noReloadToken,
            };
          }),
        { timeout: 5000 }
      )
      .toEqual({
        runCount: 2,
        stopCount: 1,
        canvasReplaced: true,
        token: 'camera-recovery-session',
      });

    // Scenario 2: Screen turns off -> render loop freezes completely -> Screen turns back on
    await page.evaluate(() => {
      const driver = (
        window as unknown as Record<string, Record<string, () => void>>
      ).__cameraRecoveryDriver;
      driver.simulateScreenOffWithFrozenLoop();
      driver.simulateScreenOn();
    });

    // Resume watchdog detects stalled frames within ~1.2s and shows front-and-center reload prompt
    await expect(page.getByTestId('ar-camera-frozen-banner')).toBeVisible({ timeout: 4000 });
    await page.getByTestId('ar-reload-camera-btn').click();
    await expect(page.getByTestId('ar-camera-frozen-banner')).toBeHidden({ timeout: 4000 });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const driver = (
              window as unknown as Record<
                string,
                { getStats: () => { runCount: number; stopCount: number } }
              >
            ).__cameraRecoveryDriver;
            return driver.getStats();
          }),
        { timeout: 5000 }
      )
      .toEqual({ runCount: 3, stopCount: 2 });

    await context.close();
  });
});
