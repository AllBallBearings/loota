import type * as THREE from 'three';
import type { PinData } from '@/types/hunt';

export type ARTrackingMode = '8thwall' | 'webxr' | 'sensor-fusion' | 'simulator';

export type ARTrackingStatus =
  | 'idle'
  | 'initializing'
  | 'tracking'
  | 'limited'
  | 'error';

export type LootObjectType = 'coin' | 'giftCard' | 'dollarSign';

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
}

export interface HeadingSample {
  headingDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  accuracyDeg: number;
  isTrueNorth: boolean;
  timestamp: number;
}

export interface WorldVec3 {
  x: number;
  y: number;
  z: number;
}

export interface ARPinAnchorState {
  pinId: string;
  order: number;
  objectType: LootObjectType;
  worldPos: WorldVec3;
  phase: 'far' | 'locked';
  realDistanceMeters: number;
  collected: boolean;
  label: string;
  rawPin: PinData;
}

export interface SimulatorInput {
  moveForward: number; // -1..1
  moveRight: number; // -1..1
  lookYawDelta: number; // radians
  lookPitchDelta: number; // radians
  heightDelta: number; // meters/sec
}

export interface ARTelemetry {
  provider: ARTrackingMode;
  status: ARTrackingStatus;
  statusDetail: string;
  fps: number;
  gpsFix: GpsFix | null;
  headingDeg: number | null;
  yawOffsetDeg: number;
  walkCalibrated: boolean;
  lockedPinCount: number;
  totalActivePins: number;
  nearestPinId: string | null;
  nearestDistanceMeters: number | null;
  nearestBearingRad: number; // relative to camera forward (-PI..PI, +right)
  focusedPinId: string | null;
  focusedDistanceMeters: number | null;
  isSummoning: boolean;
  summonProgress: number; // 0..1
  cameraPosition: WorldVec3;
  cameraSlamYawRad?: number;
  manualYawOffsetDeg?: number;
  effectiveFocusRangeMeters: number;
}

export interface ARTrackingProviderCallbacks {
  onFrame: (dtSec: number, camera: THREE.PerspectiveCamera, scene: THREE.Scene) => void;
  onStatusChange?: (status: ARTrackingStatus, detail: string) => void;
  onCameraInterrupted?: (reason: string) => void;
}

export interface ARTrackingProvider {
  readonly mode: ARTrackingMode;
  start(params: {
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    callbacks: ARTrackingProviderCallbacks;
    onSceneReady: (ctx: {
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      renderer: THREE.WebGLRenderer;
    }) => void;
  }): Promise<void>;
  stop(): void;
  recenter(): void;
  setSimulatorInput?(input: SimulatorInput): void;
  isCameraHealthy?(): boolean;
}

export interface ARAlignmentController {
  realignToMap(): Promise<{ usedFreshGps: boolean; accuracyMeters: number | null }>;
  nudgeYawDeg(deltaDeg: number): void;
  setManualYawOffsetDeg(offsetDeg: number): void;
  resetManualYawOffset(): void;
}
