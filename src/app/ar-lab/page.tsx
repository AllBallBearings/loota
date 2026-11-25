'use client';

/**
 * /ar-lab — Phase 1 Real-Device AR Tracking Bench & Sandbox.
 * Test @8thwall/engine-binary (6DoF SLAM), WebXR, Gyro Sensor Fusion, and 3D Simulator
 * directly on an iPhone or Android without needing a database hunt!
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { HuntData } from '@/types/hunt';
import { Icons } from '@/components/Icons';
import { LootaLogoMark } from '@/components/LootaLogo';
import { ToastStack, type ToastItem } from '@/components/ToastStack';
import { ARViewport } from '@/components/ar/ARViewport';
import { TrailheadARHud } from '@/components/ar/TrailheadARHud';
import { LootaAudioManager } from '@/lib/ar/audioAndHaptics';
import { AR_GAMEPLAY_CONFIG, DESIGN_TOKENS, type CoinStyle } from '@/lib/ar/experienceConfig';
import { offsetGpsByEastNorthMeters } from '@/lib/ar/geoMath';
import {
  detectEnvironmentCapabilities,
  SensorHub,
  type EnvironmentCapabilities,
} from '@/lib/ar/sensorHub';
import type {
  ARPinAnchorState,
  ARTelemetry,
  ARTrackingMode,
  SimulatorInput,
} from '@/lib/ar/types';
import '@/styles/ar-player.css';

type LabScenario = 'proximity-ring' | 'geolocation-local';

function createProximityDemoHunt(): Pick<HuntData, 'id' | 'type' | 'pins'> {
  return {
    id: 'ar-lab-proximity',
    type: 'proximity',
    pins: [
      { id: 'lab-pin-1', order: 0, distanceFt: 12, directionStr: 'N', objectType: 'coin' },
      { id: 'lab-pin-2', order: 1, distanceFt: 16, directionStr: 'N55E', objectType: 'giftCard' },
      { id: 'lab-pin-3', order: 2, distanceFt: 18, directionStr: 'W35N', objectType: 'coin' },
      { id: 'lab-pin-4', order: 3, distanceFt: 24, directionStr: 'S20E', objectType: 'coin' },
    ],
  };
}

function createGeoDemoHuntAround(origin: { lat: number; lng: number }): Pick<HuntData, 'id' | 'type' | 'pins'> {
  const offsets = [
    { east: 0, north: 4.5, type: 'coin' },
    { east: 6.5, north: 5.5, type: 'giftCard' },
    { east: -8.0, north: 9.0, type: 'coin' },
    { east: 3.0, north: 22.0, type: 'coin' }, // Starts in FAR phase (>15m) to test Local Lock transition!
  ];

  return {
    id: 'ar-lab-geo',
    type: 'geolocation',
    pins: offsets.map((o, i) => {
      const coords = offsetGpsByEastNorthMeters(origin, o.east, o.north);
      return {
        id: `lab-geo-${i + 1}`,
        order: i,
        lat: coords.lat,
        lng: coords.lng,
        objectType: o.type,
      };
    }),
  };
}

export default function ARLabPage() {
  const sensorHubRef = useRef<SensorHub | null>(null);
  if (!sensorHubRef.current) {
    sensorHubRef.current = new SensorHub();
  }
  const audioRef = useRef<LootaAudioManager | null>(null);
  if (!audioRef.current) {
    audioRef.current = new LootaAudioManager();
  }
  const simulatorInputRef = useRef<SimulatorInput>({
    moveForward: 0,
    moveRight: 0,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    heightDelta: 0,
  });

  const [envCaps, setEnvCaps] = useState<EnvironmentCapabilities | null>(null);
  const [started, setStarted] = useState(false);
  const [scenario, setScenario] = useState<LabScenario>('proximity-ring');
  const [preferredMode, setPreferredMode] = useState<ARTrackingMode>('8thwall');
  const [resolvedMode, setResolvedMode] = useState<ARTrackingMode>('8thwall');
  const [coinStyle, setCoinStyle] = useState<CoinStyle>(
    AR_GAMEPLAY_CONFIG.coinStyle as CoinStyle
  );
  const [showHorizon, setShowHorizon] = useState(true);
  const [isSummoning, setIsSummoning] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [muted, setMuted] = useState(false);
  const [bounceScore, setBounceScore] = useState(false);

  const [collectedIds, setCollectedIds] = useState<Set<string>>(() => new Set());
  const [telemetry, setTelemetry] = useState<ARTelemetry | null>(null);
  const [anchors, setAnchors] = useState<ARPinAnchorState[]>([]);
  const [geoOrigin, setGeoOrigin] = useState<{ lat: number; lng: number }>({
    lat: 35.6721,
    lng: -78.7517,
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    void detectEnvironmentCapabilities().then((caps) => {
      setEnvCaps(caps);
      setPreferredMode(caps.isMobile ? '8thwall' : 'simulator');
      setResolvedMode(caps.isMobile ? '8thwall' : 'simulator');
    });

    const hub = sensorHubRef.current;
    const audio = audioRef.current;
    return () => {
      hub?.dispose();
      audio?.dispose();
    };
  }, []);

  // Spacebar summon shortcut
  useEffect(() => {
    if (!started) return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSummoning(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSummoning(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [started]);

  const activeHunt = useMemo(() => {
    return scenario === 'proximity-ring'
      ? createProximityDemoHunt()
      : createGeoDemoHuntAround(geoOrigin);
  }, [scenario, geoOrigin]);

  const handleLaunchLab = async (mode: ARTrackingMode) => {
    await audioRef.current?.unlock();
    if (mode !== 'simulator') {
      await sensorHubRef.current?.requestPermissions();
      const fix = sensorHubRef.current?.getWeightedGpsFix();
      if (fix) {
        setGeoOrigin({ lat: fix.lat, lng: fix.lng });
      }
    }
    setCollectedIds(new Set());
    setPreferredMode(mode);
    setResolvedMode(mode);
    setStarted(true);
  };

  const handlePinCollected = useCallback(
    (pinId: string, method: 'walkup' | 'summon') => {
      audioRef.current?.playCollectSound();
      setIsSummoning(false);
      setBounceScore(true);
      setTimeout(() => setBounceScore(false), 320);

      setCollectedIds((prev) => {
        const next = new Set(prev);
        next.add(pinId);
        if (next.size >= activeHunt.pins.length) {
          audioRef.current?.playVictoryFanfare();
          pushToast('All AR Lab test loot collected! Tap Align to reset.', 'ok');
        } else {
          pushToast(`Collected test loot (${method})!`, 'ok');
        }
        return next;
      });
    },
    [activeHunt.pins.length, pushToast]
  );

  if (!started) {
    return (
      <div className="ar-overlay-screen" data-testid="ar-lab-setup">
        <div className="ar-sheet">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LootaLogoMark size={38} />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono, monospace)',
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: DESIGN_TOKENS.colors.ink3,
                  }}
                >
                  Phase 1 Tracking Bench
                </div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Loota AR Lab</h1>
              </div>
            </div>
            <Link href="/" className="ar-pill-btn" style={{ textDecoration: 'none' }}>
              <Icons.Back size={14} />
              <span>Studio</span>
            </Link>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: DESIGN_TOKENS.colors.ink2, lineHeight: 1.45 }}>
            Benchmark <strong>8th Wall 6DoF SLAM</strong>, <strong>WebXR</strong>,{' '}
            <strong>Gyro Sensor Fusion</strong>, and the <strong>3D Simulator</strong> with live
            Trailhead Gold Coins &amp; Epic Gift Cards.
          </p>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Test Scenario</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className={`ar-pill-btn ${scenario === 'proximity-ring' ? 'ar-pill-btn--live' : ''}`}
                style={{ padding: '10px 8px' }}
                onClick={() => setScenario('proximity-ring')}
              >
                <Icons.Proximity size={15} />
                <span>Proximity Ring</span>
              </button>
              <button
                type="button"
                className={`ar-pill-btn ${scenario === 'geolocation-local' ? 'ar-pill-btn--live' : ''}`}
                style={{ padding: '10px 8px' }}
                onClick={() => setScenario('geolocation-local')}
              >
                <Icons.Map size={15} />
                <span>GPS Local Lock</span>
              </button>
            </div>
          </div>

          {envCaps && (
            <div className="ar-debug-grid" style={{ marginBottom: 16 }}>
              <div className="ar-debug-chip">
                <strong>Device</strong>
                {envCaps.isIOS ? 'iPhone / iOS' : envCaps.isAndroid ? 'Android' : 'Desktop'}
              </div>
              <div className="ar-debug-chip">
                <strong>WebXR AR</strong>
                {envCaps.hasWebXRAR ? 'Supported' : 'Use 8th Wall SLAM'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button
              type="button"
              className="ar-cta ar-cta--blaze"
              onClick={() => handleLaunchLab('8thwall')}
              data-testid="ar-lab-launch-8thwall"
            >
              <Icons.Lightning size={17} weight="fill" />
              <span>Launch 8th Wall 6DoF SLAM (Mobile)</span>
            </button>

            <button
              type="button"
              className="ar-cta ar-cta--gold"
              onClick={() => handleLaunchLab('sensor-fusion')}
              data-testid="ar-lab-launch-fusion"
            >
              <Icons.Adventure size={17} weight="bold" />
              <span>Launch Camera + Gyro Sensor Fusion</span>
            </button>

            <button
              type="button"
              className="ar-cta ar-cta--subtle"
              onClick={() => handleLaunchLab('simulator')}
              data-testid="ar-lab-launch-sim"
            >
              <Icons.Sparkle size={17} weight="fill" />
              <span>Launch 3D Park Simulator (Desktop / E2E)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-stage" data-testid="ar-lab-active">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ARViewport
        hunt={activeHunt}
        sensorHub={sensorHubRef.current!}
        preferredMode={preferredMode}
        coinStyle={coinStyle}
        showHorizon={showHorizon}
        isSummoning={isSummoning}
        recenterNonce={recenterNonce}
        externalCollectedPinIds={collectedIds}
        simulatorInputRef={simulatorInputRef}
        onTelemetry={(t, nextAnchors) => {
          setTelemetry(t);
          setAnchors(nextAnchors);
        }}
        onPinCollected={handlePinCollected}
        onFocusChange={(pinId) => {
          if (pinId) audioRef.current?.playFocusTick();
          else setIsSummoning(false);
        }}
        onProviderResolved={(mode, reason) => {
          setResolvedMode(mode);
          if (reason) pushToast(reason, 'info');
        }}
      />

      <TrailheadARHud
        huntName={scenario === 'proximity-ring' ? 'AR Lab · Proximity' : 'AR Lab · GPS Lock'}
        collectedCount={collectedIds.size}
        remainingCount={Math.max(0, activeHunt.pins.length - collectedIds.size)}
        bounceScore={bounceScore}
        telemetry={telemetry}
        anchors={anchors}
        activeMode={resolvedMode}
        coinStyle={coinStyle}
        showHorizon={showHorizon}
        isSummoning={isSummoning}
        muted={muted}
        onSummonStart={() => setIsSummoning(true)}
        onSummonEnd={() => setIsSummoning(false)}
        onModeChange={(next) => {
          setPreferredMode(next);
          setResolvedMode(next);
        }}
        onCoinStyleChange={setCoinStyle}
        onToggleHorizon={() => setShowHorizon((v) => !v)}
        onToggleMute={() => {
          setMuted((prev) => {
            audioRef.current?.setMuted(!prev);
            return !prev;
          });
        }}
        onRecenter={() => {
          setCollectedIds(new Set());
          setRecenterNonce((n) => n + 1);
          pushToast('Test pins reset & world recentered', 'info');
        }}
        onExit={() => setStarted(false)}
        simulatorInputRef={simulatorInputRef}
      />
    </div>
  );
}
