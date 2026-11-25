'use client';

/**
 * Trailhead Arcade AR Overlay HUD.
 * Mirrors loota-mobile's AR HUD (Progress Card, 3D-tilted Compass, Screen-Edge Summon Glow,
 * Hold-to-Summon button, Debug Drawer) styled with the sunlit Trailhead Arcade design system.
 */

import React, { useState } from 'react';
import { Icons } from '@/components/Icons';
import { AR_GAMEPLAY_CONFIG, DESIGN_TOKENS, type CoinStyle } from '@/lib/ar/experienceConfig';
import { formatDistanceFeet } from '@/lib/ar/geoMath';
import type {
  ARPinAnchorState,
  ARTelemetry,
  ARTrackingMode,
  SimulatorInput,
} from '@/lib/ar/types';

interface TrailheadARHudProps {
  huntName: string;
  collectedCount: number;
  remainingCount: number;
  bounceScore: boolean;
  telemetry: ARTelemetry | null;
  anchors: ARPinAnchorState[];
  activeMode: ARTrackingMode;
  coinStyle: CoinStyle;
  showHorizon: boolean;
  isSummoning: boolean;
  muted: boolean;
  onSummonStart: () => void;
  onSummonEnd: () => void;
  onModeChange: (mode: ARTrackingMode) => void;
  onCoinStyleChange: (style: CoinStyle) => void;
  onToggleHorizon: () => void;
  onToggleMute: () => void;
  onRecenter: () => void;
  onExit: () => void;
  simulatorInputRef?: React.MutableRefObject<SimulatorInput>;
}

const PROVIDER_LABELS: Record<ARTrackingMode, string> = {
  '8thwall': '6DoF SLAM',
  webxr: 'WebXR 6DoF',
  'sensor-fusion': 'Gyro Fusion',
  simulator: '3D Simulator',
};

export const TrailheadARHud: React.FC<TrailheadARHudProps> = ({
  huntName,
  collectedCount,
  remainingCount,
  bounceScore,
  telemetry,
  anchors,
  activeMode,
  coinStyle,
  showHorizon,
  isSummoning,
  muted,
  onSummonStart,
  onSummonEnd,
  onModeChange,
  onCoinStyleChange,
  onToggleHorizon,
  onToggleMute,
  onRecenter,
  onExit,
  simulatorInputRef,
}) => {
  const [debugOpen, setDebugOpen] = useState(false);
  const [radarOpen, setRadarOpen] = useState(true);

  const focusedAnchor = telemetry?.focusedPinId
    ? anchors.find((a) => a.pinId === telemetry.focusedPinId) ?? null
    : null;
  const isEpicFocus = focusedAnchor?.objectType === 'giftCard';
  const isFocused = Boolean(telemetry?.focusedPinId);

  const compassDeg = telemetry ? (telemetry.nearestBearingRad * 180) / Math.PI : 0;
  const ringCircumference = 2 * Math.PI * 58;
  const summonDashOffset =
    ringCircumference * (1 - (telemetry?.summonProgress ?? 0));

  const setSimKey = (patch: Partial<SimulatorInput>) => {
    if (!simulatorInputRef) return;
    simulatorInputRef.current = {
      ...simulatorInputRef.current,
      ...patch,
    };
  };

  return (
    <>
      {/* Pulsing screen-edge aura when loot is locked in the 5m summon hotspot */}
      {isFocused && (
        <div
          className={`ar-edge-glow ${isEpicFocus ? 'ar-edge-glow--epic' : ''}`}
          data-testid="ar-edge-glow"
        />
      )}

      {/* Center screen aiming hotspot brackets */}
      <div className={`ar-reticle ${isFocused ? 'ar-reticle--locked' : ''}`}>
        <span className="ar-reticle__corner ar-reticle__corner--tl" />
        <span className="ar-reticle__corner ar-reticle__corner--tr" />
        <span className="ar-reticle__corner ar-reticle__corner--bl" />
        <span className="ar-reticle__corner ar-reticle__corner--br" />
      </div>

      {/* Collapsible Mini Sonar Radar (great for long-range geolocation walks) */}
      {radarOpen && telemetry && (
        <div className="ar-miniradar" aria-label="Mini Loot Sonar">
          <div className="ar-miniradar__dish">
            {/* Concentric rings */}
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(220,247,231,0.22)" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(220,247,231,0.24)" />
              <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(220,247,231,0.16)" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(220,247,231,0.16)" />

              {/* Pin dots relative to player camera */}
              {anchors
                .filter((a) => !a.collected)
                .map((a) => {
                  const dx = a.worldPos.x - telemetry.cameraPosition.x;
                  const dz = a.worldPos.z - telemetry.cameraPosition.z;
                  const maxRange = 25;
                  const nx = Math.max(-1, Math.min(1, dx / maxRange));
                  const ny = Math.max(-1, Math.min(1, dz / maxRange));
                  const cx = 50 + nx * 42;
                  const cy = 50 + ny * 42;
                  const fill =
                    a.objectType === 'giftCard'
                      ? DESIGN_TOKENS.colors.epicBright
                      : DESIGN_TOKENS.colors.gold;
                  return (
                    <circle
                      key={a.pinId}
                      cx={cx}
                      cy={cy}
                      r={a.pinId === telemetry.focusedPinId ? 5.5 : 4.2}
                      fill={fill}
                      stroke={DESIGN_TOKENS.colors.ink}
                      strokeWidth="1.5"
                    />
                  );
                })}

              {/* Center player beacon */}
              <circle
                cx="50"
                cy="50"
                r="4.8"
                fill={DESIGN_TOKENS.colors.blaze}
                stroke={DESIGN_TOKENS.colors.surface}
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Main HUD Overlay */}
      <div id="loota-ar-hud-overlay" className="ar-hud">
        {/* TOP ROW */}
        <div className="ar-hud-top">
          {/* Loot Progress Card (matches loota-mobile top-left card) */}
          <div
            className={`ar-card ar-progress-pill ar-hud__interactive ${
              bounceScore ? 'ar-progress-pill--bounce' : ''
            }`}
            data-testid="ar-progress-card"
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: DESIGN_TOKENS.colors.goldSoft,
                border: `2px solid ${DESIGN_TOKENS.colors.ink}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: DESIGN_TOKENS.colors.goldText,
              }}
            >
              <Icons.Coin size={20} weight="fill" />
            </div>

            <div className="ar-progress-stat">
              <span className="ar-progress-stat__label">Looted</span>
              <span className="ar-progress-stat__val" data-testid="ar-collected-count">
                {collectedCount}
              </span>
            </div>

            <div className="ar-progress-divider" />

            <div className="ar-progress-stat">
              <span className="ar-progress-stat__label">Left</span>
              <span className="ar-progress-stat__val" data-testid="ar-remaining-count">
                {remainingCount}
              </span>
            </div>
          </div>

          {/* Right controls & live tracking badge */}
          <div className="ar-status-stack ar-hud__interactive">
            <div className="ar-status-row">
              <span
                className={`ar-pill-btn ${
                  telemetry?.status === 'tracking' ? 'ar-pill-btn--live' : 'ar-pill-btn--warn'
                }`}
                style={{ cursor: 'default' }}
                data-testid="ar-provider-badge"
              >
                <span className="ar-live-dot" />
                <span>{PROVIDER_LABELS[activeMode]}</span>
              </span>

              <button
                type="button"
                className="ar-pill-btn"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                title={muted ? 'Unmute audio' : 'Mute audio'}
              >
                {muted ? <Icons.Close size={14} /> : <Icons.Sparkle size={14} weight="fill" />}
              </button>

              <button
                type="button"
                className="ar-pill-btn"
                onClick={() => setRadarOpen((v) => !v)}
                aria-label="Toggle mini radar"
                title="Toggle mini radar"
              >
                <Icons.Proximity size={15} weight="duotone" />
              </button>

              <button
                type="button"
                className="ar-pill-btn"
                onClick={onExit}
                aria-label="Exit AR"
                title="Exit AR"
              >
                <Icons.Close size={15} weight="bold" />
              </button>
            </div>

            {telemetry?.gpsFix && (
              <div
                style={{
                  fontSize: 10.5,
                  fontFamily: 'var(--font-jetbrains-mono, monospace)',
                  fontWeight: 800,
                  background: 'rgba(255, 253, 248, 0.9)',
                  color: DESIGN_TOKENS.colors.ink,
                  border: `1.5px solid ${DESIGN_TOKENS.colors.ink}`,
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                GPS ±{Math.round(telemetry.gpsFix.accuracy)}m ·{' '}
                {telemetry.walkCalibrated ? 'North Locked' : 'Compass'}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="ar-hud-bottom">
          {/* Bottom-Left Debug / Mode Toggle */}
          <div className="ar-hud__interactive">
            <button
              type="button"
              className="ar-pill-btn"
              onClick={() => setDebugOpen((v) => !v)}
              data-testid="ar-debug-toggle"
            >
              <Icons.Sliders size={15} />
              <span>{debugOpen ? 'Hide' : 'AR Tools'}</span>
            </button>
          </div>

          {/* Bottom-Center: Hold-to-Summon (when focused) OR 3D-Tilted Compass */}
          <div className="ar-hud-center ar-hud__interactive">
            {isFocused ? (
              <div className="ar-summon-wrap">
                <div className="ar-distance-badge" data-testid="ar-focus-badge">
                  <Icons.Target size={14} weight="fill" color={DESIGN_TOKENS.colors.blaze} />
                  <span>
                    {focusedAnchor?.objectType === 'giftCard' ? 'Epic Card' : 'Gold Coin'} ·{' '}
                    {telemetry?.focusedDistanceMeters !== null &&
                    telemetry?.focusedDistanceMeters !== undefined
                      ? formatDistanceFeet(telemetry.focusedDistanceMeters)
                      : 'Near'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`ar-summon-btn ${isSummoning ? 'ar-summon-btn--active' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onSummonStart();
                  }}
                  onPointerUp={onSummonEnd}
                  onPointerLeave={onSummonEnd}
                  onPointerCancel={onSummonEnd}
                  data-testid="ar-summon-button"
                >
                  <svg className="ar-summon-btn__ring" viewBox="0 0 128 128">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      fill="none"
                      stroke="rgba(255,253,248,0.28)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      fill="none"
                      stroke={DESIGN_TOKENS.colors.goldBright}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={summonDashOffset}
                    />
                  </svg>
                  <Icons.Lightning size={26} weight="fill" />
                  <span className="ar-summon-btn__label">
                    {isSummoning
                      ? AR_GAMEPLAY_CONFIG.copy.summoningLabel
                      : AR_GAMEPLAY_CONFIG.copy.summonButtonLabel}
                  </span>
                </button>
              </div>
            ) : (
              <div className="ar-compass-wrap" data-testid="ar-compass">
                <div className="ar-distance-badge">
                  <Icons.Adventure size={14} weight="fill" color={DESIGN_TOKENS.colors.sky} />
                  <span>
                    {telemetry?.nearestDistanceMeters !== null &&
                    telemetry?.nearestDistanceMeters !== undefined
                      ? `${AR_GAMEPLAY_CONFIG.copy.nearestLootLabel}: ${formatDistanceFeet(
                          telemetry.nearestDistanceMeters
                        )}`
                      : 'Scanning for loot…'}
                  </span>
                </div>

                <div className="ar-compass-3d-stage">
                  <div className="ar-compass-disc">
                    <svg
                      viewBox="0 0 64 64"
                      className="ar-compass-needle"
                      style={{ transform: `rotate(${compassDeg.toFixed(1)}deg)` }}
                    >
                      {/* Two-tone 3D Trailhead Arrow matching loota-mobile's Arrow3DShape */}
                      <polygon
                        points="32,4 50,54 32,42"
                        fill={DESIGN_TOKENS.colors.blaze}
                        stroke={DESIGN_TOKENS.colors.ink}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                      <polygon
                        points="32,4 14,54 32,42"
                        fill={DESIGN_TOKENS.colors.gold}
                        stroke={DESIGN_TOKENS.colors.ink}
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right spacer / quick recenter */}
          <div className="ar-hud__interactive">
            <button
              type="button"
              className="ar-pill-btn"
              onClick={onRecenter}
              title="Re-align North & World Origin"
              data-testid="ar-recenter-btn"
            >
              <Icons.Locate size={15} />
              <span>Align</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Virtual D-Pad Controls (when in Simulator mode) */}
      {activeMode === 'simulator' && simulatorInputRef && (
        <div className="ar-sim-controls" aria-label="Simulator Movement Controls">
          <button
            type="button"
            className="ar-sim-key"
            onPointerDown={() => setSimKey({ lookYawDelta: -1.6 })}
            onPointerUp={() => setSimKey({ lookYawDelta: 0 })}
            onPointerLeave={() => setSimKey({ lookYawDelta: 0 })}
            title="Turn Left"
          >
            ↺
          </button>
          <button
            type="button"
            className="ar-sim-key"
            onPointerDown={() => setSimKey({ moveForward: 1 })}
            onPointerUp={() => setSimKey({ moveForward: 0 })}
            onPointerLeave={() => setSimKey({ moveForward: 0 })}
            data-testid="sim-move-forward"
            title="Walk Forward (W)"
          >
            ↑
          </button>
          <button
            type="button"
            className="ar-sim-key"
            onPointerDown={() => setSimKey({ lookYawDelta: 1.6 })}
            onPointerUp={() => setSimKey({ lookYawDelta: 0 })}
            onPointerLeave={() => setSimKey({ lookYawDelta: 0 })}
            title="Turn Right"
          >
            ↻
          </button>
          <button
            type="button"
            className="ar-sim-key"
            onPointerDown={() => setSimKey({ moveRight: -1 })}
            onPointerUp={() => setSimKey({ moveRight: 0 })}
            onPointerLeave={() => setSimKey({ moveRight: 0 })}
            title="Strafe Left (A)"
          >
            ←
          </button>
          <button
            type="button"
            className="ar-sim-key"
            onPointerDown={() => setSimKey({ moveForward: -1 })}
            onPointerUp={() => setSimKey({ moveForward: 0 })}
            onPointerLeave={() => setSimKey({ moveForward: 0 })}
            title="Walk Back (S)"
          >
            ↓
          </button>
          <button
            type="button"
            className="ar-sim-key"
            onPointerDown={() => setSimKey({ moveRight: 1 })}
            onPointerUp={() => setSimKey({ moveRight: 0 })}
            onPointerLeave={() => setSimKey({ moveRight: 0 })}
            title="Strafe Right (D)"
          >
            →
          </button>
        </div>
      )}

      {/* Debug & AR Tools Drawer */}
      {debugOpen && (
        <div className="ar-card ar-debug-panel" data-testid="ar-debug-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>{huntName || 'AR Tools & Telemetry'}</strong>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono, monospace)',
                fontSize: 11,
                fontWeight: 800,
                color: DESIGN_TOKENS.colors.meadowDark,
              }}
            >
              {telemetry?.fps ?? 0} FPS
            </span>
          </div>

          <div className="ar-debug-grid">
            <div className="ar-debug-chip">
              <strong>Engine</strong>
              {PROVIDER_LABELS[activeMode]}
            </div>
            <div className="ar-debug-chip">
              <strong>Locked Pins</strong>
              {telemetry?.lockedPinCount ?? 0} / {telemetry?.totalActivePins ?? 0}
            </div>
            <div className="ar-debug-chip">
              <strong>Compass / Yaw</strong>
              {telemetry?.headingDeg !== null && telemetry?.headingDeg !== undefined
                ? `${Math.round(telemetry.headingDeg)}°`
                : '—'}{' '}
              / {Math.round(telemetry?.yawOffsetDeg ?? 0)}°
            </div>
            <div className="ar-debug-chip">
              <strong>Focus Range</strong>
              {telemetry?.effectiveFocusRangeMeters.toFixed(1) ?? '5.0'}m
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}>Tracking Provider</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(['8thwall', 'webxr', 'sensor-fusion', 'simulator'] as ARTrackingMode[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    className={`ar-pill-btn ${activeMode === m ? 'ar-pill-btn--live' : ''}`}
                    style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={() => onModeChange(m)}
                  >
                    {PROVIDER_LABELS[m]}
                  </button>
                )
              )}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}>Coin Style</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(['classic', 'thickRim', 'detailed', 'beveled'] as CoinStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`ar-pill-btn ${coinStyle === style ? 'ar-pill-btn--warn' : ''}`}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onCoinStyleChange(style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`ar-pill-btn ${showHorizon ? 'ar-pill-btn--live' : ''}`}
              style={{ flex: 1, fontSize: 11 }}
              onClick={onToggleHorizon}
            >
              Horizon Ring: {showHorizon ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className="ar-pill-btn"
              style={{ flex: 1, fontSize: 11 }}
              onClick={onRecenter}
            >
              Recenter World
            </button>
          </div>

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 10,
              color: DESIGN_TOKENS.colors.ink3,
              lineHeight: 1.35,
            }}
          >
            6DoF Web SLAM powered by 8th Wall Engine Binary (Niantic Spatial, Inc.) with automatic
            Gyro Sensor Fusion &amp; 3D Simulator fallbacks.
          </p>
        </div>
      )}
    </>
  );
};
