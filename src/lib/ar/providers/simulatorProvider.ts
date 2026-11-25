/**
 * Trailhead Arcade 3D AR Simulator Provider (Desktop Dev & Playwright E2E).
 * Mirrors loota-mobile's SimulatedARViewContainer.swift:
 *  - Renders a sunlit outdoor Trailhead park environment with compass ground rings
 *  - Full 6DoF virtual camera controlled via WASD / Arrow keys, mouse/touch drag-to-look,
 *    or virtual joystick inputs
 *  - Emits synchronized virtual GPS updates as the player walks around so BOTH
 *    Geolocation and Proximity hunts can be tested end-to-end without leaving your desk!
 */

import * as THREE from 'three';
import { DESIGN_TOKENS } from '../experienceConfig';
import { offsetGpsByEastNorthMeters } from '../geoMath';
import type { SensorHub } from '../sensorHub';
import type {
  ARTrackingProvider,
  ARTrackingProviderCallbacks,
  SimulatorInput,
} from '../types';

export class SimulatorProvider implements ARTrackingProvider {
  public readonly mode = 'simulator' as const;

  private sensorHub: SensorHub;
  private originLatLng: { lat: number; lng: number };

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private keys = new Set<string>();
  private externalInput: SimulatorInput = {
    moveForward: 0,
    moveRight: 0,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    heightDelta: 0,
  };

  private yaw = 0; // 0 = looking North (-Z)
  private pitch = -0.04;
  private camPos = new THREE.Vector3(0, 1.6, 0);

  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private pointerDownHandler: ((e: PointerEvent) => void) | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private pointerUpHandler: (() => void) | null = null;
  private lastVirtualGpsEmit = 0;

  constructor(sensorHub: SensorHub, originLatLng?: { lat: number; lng: number }) {
    this.sensorHub = sensorHub;
    this.originLatLng = originLatLng ?? { lat: 35.6721, lng: -78.7517 };
  }

  public setSimulatorInput(input: SimulatorInput): void {
    this.externalInput = { ...input };
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
    callbacks.onStatusChange?.('initializing', 'Launching Trailhead AR Simulator…');

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdceeff); // Trailhead Compass Sky Soft
    scene.fog = new THREE.Fog(0xeef6e8, 35, 160);
    this.scene = scene;

    this.buildTrailheadParkBackdrop(scene);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.05, 400);
    camera.position.copy(this.camPos);
    camera.rotation.order = 'YXZ';
    this.camera = camera;

    // Seed initial virtual GPS right at origin so GeoAnchorEngine initializes immediately
    this.sensorHub.injectVirtualGpsFix({
      lat: this.originLatLng.lat,
      lng: this.originLatLng.lng,
      accuracy: 3.0,
      timestamp: Date.now(),
    });

    onSceneReady({ scene, camera, renderer });
    this.attachControls(canvas);

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    });
    this.resizeObserver.observe(container);

    callbacks.onStatusChange?.('tracking', 'Simulator 6DoF active (WASD + Drag to look)');

    let lastTime = performance.now();
    const tick = (now: number) => {
      this.rafId = window.requestAnimationFrame(tick);
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      this.updateCameraMotion(dt);

      // Emit virtual GPS every 350ms so Geolocation hunts behave realistically in Simulator
      if (now - this.lastVirtualGpsEmit > 350) {
        this.lastVirtualGpsEmit = now;
        const virtualGps = offsetGpsByEastNorthMeters(
          this.originLatLng,
          this.camPos.x,
          -this.camPos.z
        );
        this.sensorHub.injectVirtualGpsFix({
          lat: virtualGps.lat,
          lng: virtualGps.lng,
          accuracy: 3.0,
          timestamp: Date.now(),
        });
      }

      callbacks.onFrame(dt, camera, scene);
      renderer.render(scene, camera);
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  private buildTrailheadParkBackdrop(scene: THREE.Scene): void {
    // Sunlit park meadow ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(180, 64),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xcde8b8),
        roughness: 0.92,
        metalness: 0.0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // Subtle concentric distance rings (5m, 10m, 15m, 30m) + cardinal lines
    const ringRadii = [5, 10, 15, 30];
    ringRadii.forEach((r) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.04, r + 0.04, 64),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(DESIGN_TOKENS.colors.ink),
          transparent: true,
          opacity: r === 15 ? 0.25 : 0.12,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      scene.add(ring);
    });

    // Stylized Trailhead birch/pine trees around the perimeter for strong 6DoF parallax cues
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5c3e, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(DESIGN_TOKENS.colors.meadow),
      roughness: 0.8,
    });
    const treeAngles = [0.25, 0.9, 1.55, 2.2, 2.9, 3.6, 4.3, 5.1, 5.75];
    treeAngles.forEach((a, i) => {
      const dist = 20 + (i % 3) * 8;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.6, 8), trunkMat);
      trunk.position.y = 0.8;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.4, 8), leafMat);
      crown.position.y = 2.9;
      tree.add(trunk, crown);
      tree.position.set(Math.sin(a) * dist, 0, -Math.cos(a) * dist);
      scene.add(tree);
    });

    // North trail marker post (Blaze Orange) at 18m North so orientation is obvious
    const northPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.4, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(DESIGN_TOKENS.colors.blaze) })
    );
    northPost.position.set(0, 1.2, -18);
    scene.add(northPost);
  }

  private attachControls(canvas: HTMLCanvasElement): void {
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      this.keys.add(e.code);
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };

    this.pointerDownHandler = (e: PointerEvent) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };
    this.pointerMoveHandler = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.yaw -= dx * 0.0045;
      this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch - dy * 0.004));
    };
    this.pointerUpHandler = () => {
      this.isDragging = false;
    };

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    canvas.addEventListener('pointerdown', this.pointerDownHandler);
    window.addEventListener('pointermove', this.pointerMoveHandler);
    window.addEventListener('pointerup', this.pointerUpHandler);
  }

  private updateCameraMotion(dt: number): void {
    if (!this.camera) return;

    // Keyboard inputs
    let fwd = this.externalInput.moveForward;
    let right = this.externalInput.moveRight;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
    if (this.keys.has('KeyD')) right += 1;
    if (this.keys.has('KeyA')) right -= 1;

    if (this.keys.has('ArrowLeft')) this.yaw += 1.6 * dt;
    if (this.keys.has('ArrowRight')) this.yaw -= 1.6 * dt;

    this.yaw -= this.externalInput.lookYawDelta * dt;
    this.pitch = Math.max(
      -1.15,
      Math.min(1.15, this.pitch + this.externalInput.lookPitchDelta * dt)
    );

    const speedMps = 4.2;
    const forwardVec = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const rightVec = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    if (Math.abs(fwd) > 0.01) {
      this.camPos.addScaledVector(forwardVec, Math.max(-1, Math.min(1, fwd)) * speedMps * dt);
    }
    if (Math.abs(right) > 0.01) {
      this.camPos.addScaledVector(rightVec, Math.max(-1, Math.min(1, right)) * speedMps * dt);
    }
    if (Math.abs(this.externalInput.heightDelta) > 0.01) {
      this.camPos.y = Math.max(0.6, Math.min(3.5, this.camPos.y + this.externalInput.heightDelta * dt));
    }

    this.camera.position.copy(this.camPos);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  public recenter(): void {
    this.camPos.set(0, 1.6, 0);
    this.yaw = 0;
    this.pitch = -0.04;
  }

  public stop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.keyDownHandler) window.removeEventListener('keydown', this.keyDownHandler);
    if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler);
    if (this.pointerMoveHandler) window.removeEventListener('pointermove', this.pointerMoveHandler);
    if (this.pointerUpHandler) window.removeEventListener('pointerup', this.pointerUpHandler);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
