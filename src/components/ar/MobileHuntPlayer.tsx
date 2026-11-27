'use client';

/**
 * MobileHuntPlayer — Complete Trailhead Arcade Mobile Web AR Hunt Experience.
 * Lifecycle parity with loota-mobile:
 *   1. Fast Trailhead Splash + silent GPS warmup
 *   2. Join Confirmation & Single-Tap Sensor/Audio Permission Sheet
 *   3. Full-Screen 6DoF AR Session (ARViewport + TrailheadARHud + 5s live multiplayer sync)
 *   4. Trailhead Victory Podium ("Everything's Looted!" / "Totally Looted!") + Winner Contact Card
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { HuntData } from '@/types/hunt';
import { Icons } from '@/components/Icons';
import { LootaLogoMark } from '@/components/LootaLogo';
import { LootToken3D } from '@/components/LootToken3D';
import { ToastStack, type ToastItem } from '@/components/ToastStack';
import { ARViewport } from './ARViewport';
import { TrailheadARHud } from './TrailheadARHud';
import { LootaAudioManager } from '@/lib/ar/audioAndHaptics';
import { AR_GAMEPLAY_CONFIG, DESIGN_TOKENS, type CoinStyle } from '@/lib/ar/experienceConfig';
import {
  detectEnvironmentCapabilities,
  SensorHub,
  type EnvironmentCapabilities,
} from '@/lib/ar/sensorHub';
import type {
  ARAlignmentController,
  ARPinAnchorState,
  ARTelemetry,
  ARTrackingMode,
  SimulatorInput,
} from '@/lib/ar/types';
import {
  cleanPhoneDigits,
  collectPinAsWebPlayer,
  formatUSPhone,
  getOrCreateWebPlayer,
  isValidUSPhone,
  joinHuntAsWebPlayer,
  syncWebPlayerWithBackend,
} from '@/lib/webIdentity';
import '@/styles/ar-player.css';

type PlayerStage = 'loading' | 'join' | 'playing' | 'victory';

interface MobileHuntPlayerProps {
  huntId: string;
}

export const MobileHuntPlayer: React.FC<MobileHuntPlayerProps> = ({ huntId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedModeParam = searchParams.get('mode') as ARTrackingMode | null;

  const sensorHubRef = useRef<SensorHub | null>(null);
  if (!sensorHubRef.current) {
    sensorHubRef.current = new SensorHub();
  }
  const audioRef = useRef<LootaAudioManager | null>(null);
  if (!audioRef.current) {
    audioRef.current = new LootaAudioManager();
  }
  const alignmentRef = useRef<ARAlignmentController | null>(null);

  const simulatorInputRef = useRef<SimulatorInput>({
    moveForward: 0,
    moveRight: 0,
    lookYawDelta: 0,
    lookPitchDelta: 0,
    heightDelta: 0,
  });

  const [stage, setStage] = useState<PlayerStage>('loading');
  const [hunt, setHunt] = useState<HuntData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [envCaps, setEnvCaps] = useState<EnvironmentCapabilities | null>(null);

  // Player join form state
  const [playerUserId, setPlayerUserId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Active AR state
  const [preferredMode, setPreferredMode] = useState<ARTrackingMode>('8thwall');
  const [resolvedMode, setResolvedMode] = useState<ARTrackingMode>('8thwall');
  const [coinStyle, setCoinStyle] = useState<CoinStyle>(
    AR_GAMEPLAY_CONFIG.coinStyle as CoinStyle
  );
  const [showHorizon, setShowHorizon] = useState(false);
  const [isSummoning, setIsSummoning] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [cameraRestartNonce, setCameraRestartNonce] = useState(0);
  const [cameraFrozen, setCameraFrozen] = useState(false);
  const [cameraFrozenReason, setCameraFrozenReason] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [bounceScore, setBounceScore] = useState(false);

  const [telemetry, setTelemetry] = useState<ARTelemetry | null>(null);
  const [anchors, setAnchors] = useState<ARPinAnchorState[]>([]);
  const [localCollectedIds, setLocalCollectedIds] = useState<Set<string>>(() => new Set());
  const [myCollectedCount, setMyCollectedCount] = useState(0);

  // Toasts
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

  const handleCameraFrozenChange = useCallback((frozen: boolean, reason?: string) => {
    setCameraFrozen(frozen);
    setCameraFrozenReason(frozen ? reason ?? null : null);
  }, []);

  const handleReloadCamera = useCallback(() => {
    setCameraFrozen(false);
    setCameraFrozenReason(null);
    void audioRef.current?.unlock();
    void sensorHubRef.current?.requestFreshGpsFix(1500);
    setCameraRestartNonce((n) => n + 1);
    pushToast('Reloading AR camera…', 'info');
  }, [pushToast]);

  // Cleanup sensors & audio on unmount
  useEffect(() => {
    const hub = sensorHubRef.current;
    const audio = audioRef.current;
    return () => {
      hub?.dispose();
      audio?.dispose();
    };
  }, []);

  // Load environment capabilities + cached player identity
  useEffect(() => {
    const stored = getOrCreateWebPlayer();
    if (stored.userId) setPlayerUserId(stored.userId);
    if (stored.name) setPlayerName(stored.name);
    if (stored.phone) setPlayerPhone(formatUSPhone(stored.phone));

    void detectEnvironmentCapabilities().then((caps) => {
      setEnvCaps(caps);
      if (requestedModeParam) {
        setPreferredMode(requestedModeParam);
        setResolvedMode(requestedModeParam);
      } else if (!caps.isMobile) {
        setPreferredMode('simulator');
        setResolvedMode('simulator');
      } else {
        setPreferredMode('8thwall');
        setResolvedMode('8thwall');
      }
    });
  }, [requestedModeParam]);

  const fetchHuntState = useCallback(
    async (uid?: string | null) => {
      const effectiveUid = uid ?? playerUserId;
      const query = effectiveUid ? `?userId=${encodeURIComponent(effectiveUid)}` : '';
      const res = await fetch(`/api/client/hunts/${huntId}${query}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Could not load hunt');
      }
      return data as HuntData;
    },
    [huntId, playerUserId]
  );

  // Initial hunt load + silent GPS warmup during join screen (runs once per huntId)
  useEffect(() => {
    let cancelled = false;
    const stored = getOrCreateWebPlayer();

    const init = async () => {
      try {
        const query = stored.userId
          ? `?userId=${encodeURIComponent(stored.userId)}`
          : '';
        const res = await fetch(`/api/client/hunts/${huntId}${query}`);
        const data = (await res.json()) as HuntData & { message?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Could not load hunt');
        }
        if (cancelled) return;
        setHunt(data);

        const alreadyCollected = new Set(
          data.pins.filter((p) => p.collectedByUserId).map((p) => p.id)
        );
        setLocalCollectedIds(alreadyCollected);

        if (stored.userId) {
          setMyCollectedCount(
            data.pins.filter((p) => p.collectedByUserId === stored.userId).length
          );
        }

        // Start warming up GPS silently for geolocation hunts while user reads Join card
        if (data.type === 'geolocation' && requestedModeParam !== 'simulator') {
          sensorHubRef.current?.startGpsWatch();
        }

        const allCollected =
          data.pins.length > 0 && data.pins.every((p) => Boolean(p.collectedByUserId));
        setStage((current) => {
          if (current === 'playing') return current;
          return data.isCompleted || allCollected ? 'victory' : 'join';
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError((err as Error).message || 'Unable to load hunt');
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [huntId, requestedModeParam]);

  // Live multiplayer sync & completion polling while playing
  useEffect(() => {
    if (stage !== 'playing') return;

    const interval = window.setInterval(async () => {
      try {
        const fresh = await fetchHuntState();
        setHunt(fresh);
        const serverCollected = new Set(
          fresh.pins.filter((p) => p.collectedByUserId).map((p) => p.id)
        );
        setLocalCollectedIds((prev) => {
          const merged = new Set(prev);
          serverCollected.forEach((id) => merged.add(id));
          return merged;
        });

        const allCollected =
          fresh.pins.length > 0 && fresh.pins.every((p) => Boolean(p.collectedByUserId));
        if (fresh.isCompleted || allCollected) {
          audioRef.current?.playVictoryFanfare();
          setStage('victory');
        }
      } catch {
        // Non-fatal transient poll error
      }
    }, AR_GAMEPLAY_CONFIG.gameplay.completionPollIntervalMs);

    return () => window.clearInterval(interval);
  }, [stage, fetchHuntState]);

  // Spacebar support for Hold-to-Summon in Desktop Simulator
  useEffect(() => {
    if (stage !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSummoning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSummoning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [stage]);

  const handleEnterHunt = async (launchMode: ARTrackingMode) => {
    if (!hunt) return;
    setJoinError(null);

    const cleanedDigits = cleanPhoneDigits(playerPhone);
    if (!isValidUSPhone(cleanedDigits)) {
      setJoinError('Please enter a valid 10-digit phone number so the host can send your prize if you win.');
      return;
    }

    setJoining(true);
    try {
      // 1. Unlock Web Audio + request iOS Safari motion/orientation/GPS permissions inside this user tap!
      await audioRef.current?.unlock();
      if (launchMode !== 'simulator') {
        await sensorHubRef.current?.requestPermissions();
      }

      // 2. Register or sync web player identity in backend
      const player = await syncWebPlayerWithBackend({
        name: playerName.trim() || 'Hunter',
        phone: cleanedDigits,
      });
      setPlayerUserId(player.userId);

      // 3. Join hunt via server-side proxy
      if (player.userId) {
        await joinHuntAsWebPlayer({
          huntId: hunt.id,
          userId: player.userId,
          phone: cleanedDigits,
        });
      }

      // Refresh hunt with userId context
      const freshHunt = await fetchHuntState(player.userId);
      setHunt(freshHunt);

      setPreferredMode(launchMode);
      setResolvedMode(launchMode);
      setStage('playing');
      pushToast(
        launchMode === 'simulator'
          ? '3D Simulator ready — WASD to walk, drag to look, hold Space to summon!'
          : 'AR active! Follow the compass to find the loot.',
        'ok'
      );
    } catch (err) {
      setJoinError((err as Error).message || 'Could not join hunt. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handlePinCollected = useCallback(
    async (pinId: string, method: 'walkup' | 'summon') => {
      if (!hunt || !playerUserId) return;

      audioRef.current?.playCollectSound();
      setIsSummoning(false);
      setBounceScore(true);
      setTimeout(() => setBounceScore(false), 320);

      setLocalCollectedIds((prev) => {
        const next = new Set(prev);
        next.add(pinId);
        return next;
      });

      const pin = hunt.pins.find((p) => p.id === pinId);
      const itemLabel = pin?.objectType === 'giftCard' ? 'Epic Gift Card' : 'Gold Coin';

      try {
        const result = await collectPinAsWebPlayer({
          huntId: hunt.id,
          pinId,
          userId: playerUserId,
        });

        if (result.alreadyCollected) {
          pushToast(`Someone just grabbed that ${itemLabel}!`, 'info');
        } else {
          setMyCollectedCount((c) => c + 1);
          pushToast(
            `${method === 'summon' ? 'Summoned' : 'Claimed'} +1 ${itemLabel}!`,
            'ok'
          );
        }

        // Refresh hunt state so leaderboard / winner contact info are immediately current
        const updated = await fetchHuntState(playerUserId);
        setHunt(updated);

        const allDone =
          result.huntCompleted ||
          updated.isCompleted ||
          (updated.pins.length > 0 && updated.pins.every((p) => Boolean(p.collectedByUserId)));

        if (allDone) {
          audioRef.current?.playVictoryFanfare();
          setStage('victory');
        }
      } catch (err) {
        console.error('[MobileHuntPlayer] Collect failed:', err);
        pushToast('Network hiccup saving loot — retrying sync.', 'danger');
      }
    },
    [hunt, playerUserId, fetchHuntState, pushToast]
  );

  const handleTelemetry = useCallback((t: ARTelemetry, nextAnchors: ARPinAnchorState[]) => {
    setTelemetry(t);
    setAnchors(nextAnchors);
  }, []);

  const handleFocusChange = useCallback((pinId: string | null) => {
    if (pinId) {
      audioRef.current?.playFocusTick();
    } else {
      setIsSummoning(false);
    }
  }, []);

  const handleProviderResolved = useCallback(
    (mode: ARTrackingMode, fallbackReason?: string) => {
      setResolvedMode(mode);
      if (fallbackReason) {
        pushToast(fallbackReason, 'info');
      }
    },
    [pushToast]
  );

  const remainingCount = useMemo(() => {
    if (!hunt) return 0;
    return hunt.pins.filter((p) => !p.collectedByUserId && !localCollectedIds.has(p.id)).length;
  }, [hunt, localCollectedIds]);

  const totalCollectedCount = useMemo(() => {
    if (!hunt) return 0;
    return hunt.pins.length - remainingCount;
  }, [hunt, remainingCount]);

  // Sorted leaderboard for Victory Podium
  const leaderboard = useMemo(() => {
    if (!hunt) return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const pin of hunt.pins) {
      if (!pin.collectedByUserId) continue;
      const uid = pin.collectedByUserId;
      const name =
        pin.collectedByUser?.name ||
        (uid === playerUserId ? playerName || 'You' : 'Hunter');
      const existing = map.get(uid);
      if (existing) existing.count += 1;
      else map.set(uid, { id: uid, name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [hunt, playerUserId, playerName]);

  const isCurrentUserWinner = Boolean(
    hunt && playerUserId && (hunt.winnerId === playerUserId || leaderboard[0]?.id === playerUserId)
  );

  // ---------------- STAGE 0: ERROR / LOADING SPLASH ----------------
  if (loadError) {
    return (
      <div className="ar-overlay-screen">
        <div className="ar-sheet" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icons.Warning size={36} weight="fill" color={DESIGN_TOKENS.colors.danger} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Hunt Unavailable</h1>
          <p style={{ margin: '0 0 18px', color: DESIGN_TOKENS.colors.ink2, fontSize: 14 }}>
            {loadError}
          </p>
          <Link href={`/hunt/${huntId}`} className="ar-cta ar-cta--blaze">
            Back to Hunt Overview
          </Link>
        </div>
      </div>
    );
  }

  if (stage === 'loading' || !hunt) {
    return (
      <div className="ar-overlay-screen" data-testid="ar-splash">
        <div className="ar-sheet" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <LootaLogoMark size={54} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <LootToken3D type="coin" size="md" />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800 }}>
            {AR_GAMEPLAY_CONFIG.copy.brandName} AR
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: DESIGN_TOKENS.colors.ink2 }}>
            Loading treasure drop &amp; warming up sensors…
          </p>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 1: JOIN CONFIRMATION & PERMISSION PRIMER ----------------
  if (stage === 'join') {
    const coinCount = hunt.pins.filter((p) => p.objectType !== 'giftCard').length;
    const cardCount = hunt.pins.filter((p) => p.objectType === 'giftCard').length;

    return (
      <div className="ar-overlay-screen" data-testid="ar-join-screen">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className="ar-sheet">
          {/* Header */}
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
                    letterSpacing: '0.08em',
                    color: DESIGN_TOKENS.colors.ink3,
                  }}
                >
                  {hunt.type === 'proximity'
                    ? `Proximity Drop · ${hunt.proximityRadiusFt ?? 100}ft`
                    : 'GPS Map Treasure Drop'}
                </div>
                <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, lineHeight: 1.15 }}>
                  {hunt.name || 'Loota Treasure Hunt'}
                </h1>
              </div>
            </div>
            <Link
              href={`/hunt/${hunt.id}`}
              className="ar-pill-btn"
              style={{ padding: '6px 9px' }}
              aria-label="Back to Hunt Overview"
            >
              <Icons.Back size={15} />
            </Link>
          </div>

          {/* In-app browser warning (Instagram / Facebook / TikTok) */}
          {envCaps?.inAppBrowserName && (
            <div
              style={{
                background: DESIGN_TOKENS.colors.goldSoft,
                border: `2px solid ${DESIGN_TOKENS.colors.ink}`,
                borderRadius: 14,
                padding: '10px 12px',
                marginBottom: 12,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              Opened inside {envCaps.inAppBrowserName}. For best 6DoF AR camera tracking, tap the
              menu button and choose <strong>Open in Safari / Chrome</strong>.
            </div>
          )}

          {/* Loot Summary Chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {coinCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: DESIGN_TOKENS.colors.goldSoft,
                  color: DESIGN_TOKENS.colors.goldText,
                  border: `1.5px solid ${DESIGN_TOKENS.colors.ink}`,
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <Icons.Coin size={14} weight="fill" />
                {coinCount} Gold {coinCount === 1 ? 'Coin' : 'Coins'}
              </span>
            )}
            {cardCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: DESIGN_TOKENS.colors.epicSoft,
                  color: DESIGN_TOKENS.colors.epicDark,
                  border: `1.5px solid ${DESIGN_TOKENS.colors.ink}`,
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <Icons.Gift size={14} weight="fill" />
                {cardCount} Epic {cardCount === 1 ? 'Gift Card' : 'Gift Cards'}
              </span>
            )}
            {hunt.creator?.name && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: DESIGN_TOKENS.colors.surfaceAlt,
                  color: DESIGN_TOKENS.colors.ink2,
                  border: `1.5px solid ${DESIGN_TOKENS.colors.ink}`,
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Host: {hunt.creator.name}
              </span>
            )}
          </div>

          {/* Player Name + Required 10-Digit Phone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: DESIGN_TOKENS.colors.ink2 }}>
                Hunter Name
              </span>
              <input
                type="text"
                className="ar-input"
                placeholder="Your name on the leaderboard"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                data-testid="ar-join-name"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: DESIGN_TOKENS.colors.ink2 }}>
                Mobile Phone (for prize delivery if you win)
              </span>
              <input
                type="tel"
                inputMode="tel"
                className="ar-input"
                placeholder="(555) 123-4567"
                value={playerPhone}
                onChange={(e) => setPlayerPhone(formatUSPhone(e.target.value))}
                data-testid="ar-join-phone"
              />
            </label>
          </div>

          {/* Prize Disclaimer */}
          <div
            style={{
              background: DESIGN_TOKENS.colors.goldSoft,
              border: `1.5px solid ${DESIGN_TOKENS.colors.ink}`,
              borderRadius: 12,
              padding: '9px 11px',
              marginBottom: 14,
              fontSize: 11.5,
              lineHeight: 1.4,
              color: DESIGN_TOKENS.colors.ink2,
            }}
          >
            {AR_GAMEPLAY_CONFIG.copy.prizeDisclaimer}
          </div>

          {joinError && (
            <div
              style={{
                background: DESIGN_TOKENS.colors.dangerSoft,
                color: DESIGN_TOKENS.colors.dangerDark,
                border: `1.5px solid ${DESIGN_TOKENS.colors.danger}`,
                borderRadius: 12,
                padding: '9px 11px',
                marginBottom: 12,
                fontSize: 12.5,
                fontWeight: 700,
              }}
              data-testid="ar-join-error"
            >
              {joinError}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="ar-cta ar-cta--blaze"
              disabled={joining}
              onClick={() =>
                handleEnterHunt(
                  requestedModeParam ?? (envCaps?.isMobile ? '8thwall' : '8thwall')
                )
              }
              data-testid="ar-join-live-btn"
            >
              <Icons.Lightning size={18} weight="fill" />
              <span>{joining ? 'Preparing AR Sensors…' : 'Enable AR Camera & Join Hunt'}</span>
            </button>

            <button
              type="button"
              className="ar-cta ar-cta--subtle"
              disabled={joining}
              onClick={() => handleEnterHunt('simulator')}
              data-testid="ar-join-sim-btn"
            >
              <Icons.Adventure size={17} weight="bold" />
              <span>Play in 3D Simulator (No Camera Needed)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 3: VICTORY PODIUM ----------------
  if (stage === 'victory') {
    const winnerName =
      hunt.winner?.name || leaderboard[0]?.name || (isCurrentUserWinner ? playerName || 'You' : 'Winner');

    return (
      <div className="ar-overlay-screen" data-testid="ar-victory-screen">
        <div className="ar-sheet ar-sheet--victory" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 18,
              background: DESIGN_TOKENS.colors.gold,
              border: `2.5px solid ${DESIGN_TOKENS.colors.ink}`,
              boxShadow: `0 4px 0 ${DESIGN_TOKENS.colors.ink}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Icons.Trophy size={32} weight="fill" color={DESIGN_TOKENS.colors.ink} />
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>
            {hunt.isCompleted
              ? AR_GAMEPLAY_CONFIG.copy.totallyLootedTitle
              : AR_GAMEPLAY_CONFIG.copy.everythingsLootedTitle}
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: DESIGN_TOKENS.colors.ink2 }}>
            {isCurrentUserWinner
              ? `Congratulations! You won ${hunt.name || 'this hunt'}!`
              : `${winnerName} claimed victory in ${hunt.name || 'this hunt'}.`}
          </p>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div
              style={{
                background: DESIGN_TOKENS.colors.surface,
                border: `2px solid ${DESIGN_TOKENS.colors.ink}`,
                borderRadius: 16,
                padding: 12,
                marginBottom: 14,
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-jetbrains-mono, monospace)',
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: DESIGN_TOKENS.colors.ink3,
                  marginBottom: 8,
                }}
              >
                Final Standings
              </div>
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 10,
                    background: idx === 0 ? DESIGN_TOKENS.colors.goldSoft : 'transparent',
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {idx === 0 ? (
                      <Icons.Crown size={16} weight="fill" color={DESIGN_TOKENS.colors.goldDark} />
                    ) : (
                      <span>#{idx + 1}</span>
                    )}
                    <span>
                      {entry.name} {entry.id === playerUserId ? '(You)' : ''}
                    </span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono, monospace)' }}>
                    {entry.count} loot
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Winner Contact Card (shown only when authorized by backend) */}
          {isCurrentUserWinner && hunt.creatorContact && (
            <div
              style={{
                background: DESIGN_TOKENS.colors.meadowSoft,
                border: `2px solid ${DESIGN_TOKENS.colors.ink}`,
                borderRadius: 16,
                padding: 14,
                marginBottom: 14,
                textAlign: 'left',
              }}
              data-testid="ar-winner-contact"
            >
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                Claim Your Prize from {hunt.creator?.name || 'the Host'}
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: DESIGN_TOKENS.colors.ink2 }}>
                Reach out to collect your payout or gift card:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hunt.creatorContact.phone && (
                  <>
                    <a
                      href={`sms:${hunt.creatorContact.phone}`}
                      className="ar-pill-btn ar-pill-btn--live"
                      style={{ textDecoration: 'none' }}
                    >
                      <Icons.Phone size={14} weight="fill" />
                      <span>Text Host</span>
                    </a>
                    <a
                      href={`tel:${hunt.creatorContact.phone}`}
                      className="ar-pill-btn"
                      style={{ textDecoration: 'none' }}
                    >
                      <Icons.Phone size={14} />
                      <span>Call</span>
                    </a>
                  </>
                )}
                {hunt.creatorContact.email && (
                  <a
                    href={`mailto:${hunt.creatorContact.email}?subject=${encodeURIComponent(
                      `Loota Winner — ${hunt.name || hunt.id}`
                    )}`}
                    className="ar-pill-btn"
                    style={{ textDecoration: 'none' }}
                  >
                    <Icons.Email size={14} />
                    <span>Email Host</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Link href={`/hunt/${hunt.id}`} className="ar-cta ar-cta--blaze">
              View Hunt Command Center
            </Link>
            <Link href="/" className="ar-cta ar-cta--subtle">
              Create Your Own Drop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- STAGE 2: ACTIVE AR SESSION ----------------
  return (
    <div className="ar-stage" data-testid="ar-active-stage">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ARViewport
        hunt={hunt}
        sensorHub={sensorHubRef.current!}
        preferredMode={preferredMode}
        coinStyle={coinStyle}
        showHorizon={showHorizon}
        isSummoning={isSummoning}
        recenterNonce={recenterNonce}
        cameraRestartNonce={cameraRestartNonce}
        externalCollectedPinIds={localCollectedIds}
        simulatorInputRef={simulatorInputRef}
        alignmentRef={alignmentRef}
        onTelemetry={handleTelemetry}
        onPinCollected={handlePinCollected}
        onFocusChange={handleFocusChange}
        onProviderResolved={handleProviderResolved}
        onCameraFrozenChange={handleCameraFrozenChange}
      />

      <TrailheadARHud
        huntName={hunt.name || 'Loota Hunt'}
        collectedCount={Math.max(myCollectedCount, totalCollectedCount)}
        remainingCount={remainingCount}
        bounceScore={bounceScore}
        telemetry={telemetry}
        anchors={anchors}
        activeMode={resolvedMode}
        coinStyle={coinStyle}
        showHorizon={showHorizon}
        isSummoning={isSummoning}
        muted={muted}
        cameraFrozen={cameraFrozen}
        cameraFrozenReason={cameraFrozenReason}
        onSummonStart={() => setIsSummoning(true)}
        onSummonEnd={() => setIsSummoning(false)}
        onModeChange={(nextMode) => {
          setPreferredMode(nextMode);
          setResolvedMode(nextMode);
        }}
        onCoinStyleChange={setCoinStyle}
        onToggleHorizon={() => setShowHorizon((v) => !v)}
        onToggleMute={() => {
          setMuted((prev) => {
            audioRef.current?.setMuted(!prev);
            return !prev;
          });
        }}
        onRecenter={async () => {
          if (alignmentRef.current) {
            const res = await alignmentRef.current.realignToMap();
            pushToast(
              res.accuracyMeters !== null
                ? `Re-aligned to map (GPS ±${res.accuracyMeters}m)`
                : 'Map alignment refreshed!',
              'ok'
            );
          } else {
            setRecenterNonce((n) => n + 1);
            pushToast('Map alignment refreshed!', 'info');
          }
        }}
        onReloadCamera={handleReloadCamera}
        onDismissCameraFrozen={() => {
          setCameraFrozen(false);
          setCameraFrozenReason(null);
        }}
        onNudgeYaw={(deltaDeg) => {
          alignmentRef.current?.nudgeYawDeg(deltaDeg);
        }}
        onSetManualYawOffset={(offsetDeg) => {
          alignmentRef.current?.setManualYawOffsetDeg(offsetDeg);
        }}
        onResetManualYawOffset={() => {
          alignmentRef.current?.resetManualYawOffset();
          pushToast('Manual alignment reset to compass', 'info');
        }}
        onExit={() => router.push(`/hunt/${hunt.id}`)}
        simulatorInputRef={simulatorInputRef}
      />
    </div>
  );
};
