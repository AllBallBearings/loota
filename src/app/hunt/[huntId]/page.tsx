'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapContainer } from '@/components/MapContainer';
import { MapComponentRef } from '@/components/MapComponent';
import { ProximityContainer } from '@/components/ProximityContainer';
import { LootLocationsList } from '@/components/LootLocationsList';
import { UniversalLinkGenerator } from '@/components/UniversalLinkGenerator';
import { JoinHuntButton } from '@/components/JoinHuntButton';
import { Icons } from '@/components/Icons';
import { TopBar } from '@/components/AppShell';
import { LootToken3D } from '@/components/LootToken3D';
import { ToastStack, ToastItem, ConfirmModal } from '@/components/ToastStack';
import { PinData, HuntData } from '@/types/hunt';

// Re-export PinData for backward compatibility
export type { PinData };

type DockTab = 'loot' | 'crew' | 'share' | 'host';

export default function HuntViewerPage() {
  const params = useParams();
  const huntId = params.huntId as string;

  const [hunt, setHunt] = useState<HuntData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<DockTab>('loot');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [podiumOpen, setPodiumOpen] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [idCopied, setIdCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'resetLoot' | 'clearLooters' | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const mapRef = useRef<MapComponentRef | null>(null);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Placeholder user ID (matches existing backend convention until full auth is added)
  const currentUserId = 'a1b2c3d4-e5f6-7890-1234-000000000001';

  const fetchHunt = useCallback(async () => {
    if (!huntId) return;
    try {
      const response = await fetch(`/api/client/hunts/${huntId}?userId=${currentUserId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch hunt');
      }
      const data: HuntData = await response.json();
      setHunt(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching hunt:', err);
      setError((err as Error).message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [huntId]);

  useEffect(() => {
    if (!huntId) {
      setLoading(false);
      setError('Hunt ID is missing.');
      return;
    }

    fetchHunt();
    const pollInterval = setInterval(fetchHunt, 5000);
    return () => clearInterval(pollInterval);
  }, [huntId, fetchHunt]);

  const handlePinClick = useCallback((pinId: string) => {
    setSelectedPinId((prev) => (prev === pinId ? null : pinId));
    if (mapRef.current) {
      mapRef.current.highlightPin(pinId);
    } else if ((window as unknown as { highlightMapPin?: (id: string) => void }).highlightMapPin) {
      (window as unknown as { highlightMapPin: (id: string) => void }).highlightMapPin(pinId);
    }
  }, []);

  const executeHostAction = async () => {
    if (!hunt || !confirmAction) return;

    const isResetLoot = confirmAction === 'resetLoot';
    setResetting(true);
    try {
      const response = await fetch(`/api/client/hunts/${huntId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          resetPins: isResetLoot,
          clearParticipants: !isResetLoot,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update hunt');
      }

      await fetchHunt();
      setConfirmAction(null);
      pushToast(
        isResetLoot
          ? 'All loot stashes have been reset to uncollected!'
          : 'All participants have been cleared from this hunt.',
        'ok'
      );
    } catch (err) {
      console.error('Error executing host action:', err);
      pushToast((err as Error).message || 'Action failed. Please try again.', 'danger');
    } finally {
      setResetting(false);
    }
  };

  const copyHuntId = async () => {
    if (!hunt) return;
    try {
      await navigator.clipboard.writeText(hunt.id);
      setIdCopied(true);
      pushToast('Hunt ID copied!', 'ok');
      setTimeout(() => setIdCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy hunt id:', err);
    }
  };

  if (loading) {
    return (
      <div className="fullstate">
        <div className="fullstate__inner">
          <LootToken3D type="coin" size="md" />
          <h2 style={{ fontSize: '1.2rem' }}>Tuning into hunt…</h2>
          <p style={{ margin: 0, fontSize: '0.84rem' }}>Loading live map pins and crew telemetry.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fullstate">
        <div className="fullstate__inner">
          <span className="empty__icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <Icons.Warning size={22} weight="fill" />
          </span>
          <h2 style={{ fontSize: '1.25rem' }}>Could not load hunt</h2>
          <p style={{ margin: 0, fontSize: '0.86rem' }}>{error}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Try again
            </button>
            <Link href="/" className="btn btn--subtle">
              Drop Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="fullstate">
        <div className="fullstate__inner">
          <span className="empty__icon">
            <Icons.Search size={22} />
          </span>
          <h2 style={{ fontSize: '1.25rem' }}>Hunt not found</h2>
          <p style={{ margin: 0, fontSize: '0.86rem' }}>
            This treasure hunt doesn&apos;t exist or has been removed.
          </p>
          <Link href="/" className="btn btn--primary">
            Create a New Drop
          </Link>
        </div>
      </div>
    );
  }

  const isHuntCreator = hunt.creator?.id === currentUserId;
  const hasUserJoined = hunt.participants.some((p) => p.user.id === currentUserId);
  const allLootCollected = hunt.pins.length > 0 && hunt.pins.every((pin) => pin.collectedByUserId);

  const collectors = hunt.pins
    .filter((pin) => pin.collectedByUserId && pin.collectedByUser)
    .reduce((acc, pin) => {
      const userId = pin.collectedByUserId!;
      if (!acc[userId]) {
        acc[userId] = { user: pin.collectedByUser!, pins: [] };
      }
      acc[userId].pins.push(pin);
      return acc;
    }, {} as Record<string, { user: { id: string; name: string }; pins: PinData[] }>);

  const proximityPins = hunt.pins.filter(
    (p): p is Required<Pick<PinData, 'id' | 'distanceFt' | 'directionStr' | 'x' | 'y'>> =>
      p.distanceFt !== undefined &&
      p.directionStr !== undefined &&
      p.x !== undefined &&
      p.y !== undefined
  );

  const geolocationPins = hunt.pins.filter(
    (p): p is Required<Pick<PinData, 'id' | 'lat' | 'lng'>> =>
      p.lat !== undefined && p.lng !== undefined
  );

  const getInitials = (name: string) => {
    if (!name) return '?';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 2) || '?'
    );
  };

  const getLatestCollectionTime = (pins: PinData[]) =>
    pins.reduce((latest, pin) => {
      if (!pin.collectedAt) return latest;
      const timestamp = new Date(pin.collectedAt).getTime();
      return timestamp > latest ? timestamp : latest;
    }, 0);

  const sortedCollectors = Object.values(collectors).sort((a, b) => {
    const diff = b.pins.length - a.pins.length;
    if (diff !== 0) return diff;
    return getLatestCollectionTime(a.pins) - getLatestCollectionTime(b.pins);
  });

  const totalPinsPlaced = hunt.pins.length;
  const collectedCount = hunt.pins.filter((p) => p.collectedByUserId).length;
  const completionPct =
    totalPinsPlaced > 0 ? Math.round((collectedCount / totalPinsPlaced) * 100) : 0;
  const completionTimestamp = allLootCollected ? getLatestCollectionTime(hunt.pins) : null;
  const completionDate = completionTimestamp ? new Date(completionTimestamp) : null;
  const isProximity = hunt.type === 'proximity';
  const hasGiftCards = hunt.pins.some((p) => p.objectType === 'giftCard');

  return (
    <div className="app app--locked">
      <TopBar
        centerSlot={
          allLootCollected ? (
            <span className="badge badge--gold">
              <Icons.Trophy size={13} weight="fill" />
              Hunt Complete
            </span>
          ) : (
            <span className="badge badge--meadow">
              <span className="live-dot" />
              Live · Auto-syncs 5s
            </span>
          )
        }
        actions={
          <Link href="/" className="btn btn--gold btn--xs">
            <Icons.Sparkle size={13} weight="fill" />
            New Drop
          </Link>
        }
      />

      {/* ---------------- Compact Command Strip ---------------- */}
      <section className="command-strip" aria-label="Hunt overview">
        <div className="command-strip__identity">
          <div className="command-strip__title-wrap">
            <div className="command-strip__title-row">
              <h1 className="command-strip__title">{hunt.name || 'Untitled Hunt'}</h1>
              <span className={`badge ${isProximity ? 'badge--sky' : 'badge--gold'}`}>
                {isProximity ? <Icons.Proximity size={12} /> : <Icons.Map size={12} />}
                {isProximity ? `Proximity ${hunt.proximityRadiusFt ?? 100}ft` : 'GPS Map'}
              </span>
            </div>

            <div className="command-strip__meta">
              {hunt.creator && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="avatar" style={{ width: 20, height: 20, fontSize: '0.6rem', borderRadius: 6 }}>
                    {getInitials(hunt.creator.name)}
                  </span>
                  Hosted by <strong style={{ color: 'var(--ink)' }}>{hunt.creator.name}</strong>
                </span>
              )}
              <button
                type="button"
                className="chip-copy"
                onClick={copyHuntId}
                title="Copy full hunt ID"
              >
                {idCopied ? <Icons.Check size={12} weight="fill" /> : <Icons.Copy size={12} />}
                #{hunt.id.substring(0, 8)}
              </button>
              {hunt.creatorContact?.phone && (
                <span className="badge badge--meadow">
                  <Icons.Phone size={12} />
                  {hunt.creatorContact.phone}
                </span>
              )}
              {hunt.creatorContact?.email && (
                <span className="badge badge--meadow">
                  <Icons.Email size={12} />
                  {hunt.creatorContact.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Stat Pills */}
        <div className="command-strip__stats">
          <div className="stat-pill">
            <Icons.Treasure size={17} weight="fill" style={{ color: 'var(--gold-dark)' }} />
            <div>
              <span className="stat-pill__label">Loot</span>
              <span className="stat-pill__val">{totalPinsPlaced}</span>
            </div>
          </div>

          <div className="stat-pill">
            <Icons.Check size={17} weight="fill" style={{ color: 'var(--meadow)' }} />
            <div>
              <span className="stat-pill__label">Claimed</span>
              <span className="stat-pill__val stat-pill__val--meadow">{collectedCount}</span>
            </div>
          </div>

          <div className="stat-pill">
            <Icons.Users size={17} weight="fill" style={{ color: 'var(--sky)' }} />
            <div>
              <span className="stat-pill__label">Crew</span>
              <span className="stat-pill__val">{hunt.participants.length}</span>
            </div>
          </div>

          <div className="stat-pill stat-pill--progress">
            <div className="stat-pill__prog-top">
              <span className="stat-pill__label">{allLootCollected ? 'Finished' : 'Progress'}</span>
              <span className="stat-pill__val" style={{ fontSize: '0.78rem' }}>
                {allLootCollected && completionDate
                  ? completionDate.toLocaleDateString()
                  : `${completionPct}%`}
              </span>
            </div>
            <div className="progress">
              <div className="progress__fill" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="command-strip__actions">
          {!hasUserJoined && !isHuntCreator && (
            <JoinHuntButton
              huntId={hunt.id}
              currentUserId={currentUserId}
              compact
              onJoinSuccess={() => {
                pushToast("You're in the hunt! Good luck!", 'ok');
                fetchHunt();
              }}
              onJoinError={(err) => pushToast(`Failed to join: ${err}`, 'danger')}
            />
          )}

          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'share' && !railCollapsed ? 'btn--gold' : 'btn--subtle'}`}
            onClick={() => {
              setRailCollapsed(false);
              setActiveTab('share');
            }}
          >
            <Icons.Qr size={15} />
            Share &amp; QR
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--sm desktop-only"
            onClick={() => setRailCollapsed((c) => !c)}
            title={railCollapsed ? 'Show command rail' : 'Expand full-screen stage'}
            aria-label={railCollapsed ? 'Expand side panel' : 'Collapse side panel'}
          >
            {railCollapsed ? <Icons.Collapse size={15} /> : <Icons.Expand size={15} />}
          </button>
        </div>
      </section>

      {/* ---------------- 2-Column Zero-Scroll Command Deck ---------------- */}
      <main className={`command-deck ${railCollapsed ? 'command-deck--collapsed' : ''}`}>
        {/* Left Interactive Field Stage */}
        <section className="command-stage" aria-label={isProximity ? 'Proximity radar' : 'Hunt map'}>
          <div className="stage-hud">
            <div className="hud">
              {isProximity ? (
                <Icons.Proximity size={15} weight="fill" style={{ color: 'var(--sky)' }} />
              ) : (
                <Icons.Map size={15} weight="fill" style={{ color: 'var(--blaze)' }} />
              )}
              <span>{isProximity ? 'Live Sonar Radar' : 'Live Field Map'}</span>
              <span className="hud__sep" />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.73rem' }}>
                <span className="legend-dot legend-dot--open" /> Coin
              </span>
              {hasGiftCards && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.73rem' }}>
                  <span className="legend-dot legend-dot--gift" /> Gift
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.73rem' }}>
                <span className="legend-dot legend-dot--claimed" /> Claimed
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
              {!isProximity && geolocationPins.length > 0 && (
                <button
                  type="button"
                  className="btn btn--subtle btn--xs"
                  onClick={() => mapRef.current?.fitAllPins()}
                >
                  <Icons.Target size={14} />
                  Fit all pins
                </button>
              )}
              {railCollapsed && (
                <button
                  type="button"
                  className="btn btn--gold btn--xs"
                  onClick={() => setRailCollapsed(false)}
                >
                  <Icons.Sidebar size={14} />
                  Open Dock
                </button>
              )}
            </div>
          </div>

          <div className="command-stage__canvas">
            <div className="map-container-modern">
              {isProximity ? (
                <ProximityContainer
                  initialPins={proximityPins}
                  showLootPanel={false}
                  proximityRadiusFt={hunt.proximityRadiusFt ?? 100}
                  highlightedPinId={selectedPinId}
                  onPinClick={handlePinClick}
                />
              ) : (
                <MapContainer
                  initialPins={geolocationPins}
                  focusOnMarkers={true}
                  onPinHighlight={setSelectedPinId}
                  mapRefExternal={mapRef}
                />
              )}
            </div>
          </div>

          {/* Floating Collapsible Victory Podium when All Loot is Collected */}
          {allLootCollected && (
            <div className="victory-banner">
              <div className="victory-banner__head">
                <div className="victory-banner__trophy">
                  <Icons.Trophy size={20} weight="fill" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-data)',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#7C5200',
                    }}
                  >
                    Hunt Complete
                  </p>
                  <h2 style={{ fontSize: '1.08rem' }}>Every Stash Claimed!</h2>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={() => setPodiumOpen((o) => !o)}
                  aria-expanded={podiumOpen}
                >
                  {podiumOpen ? 'Hide' : 'Results'}
                </button>
              </div>

              {podiumOpen && (
                <div className="victory-banner__list">
                  {sortedCollectors.length > 0 ? (
                    sortedCollectors.map((collector, index) => {
                      const isWinner = collector.user.id === hunt.winnerId;
                      const showContact = isWinner && isHuntCreator && hunt.winnerContact;
                      return (
                        <div
                          key={collector.user.id}
                          className={`podium-row ${index === 0 ? 'podium-row--lead' : ''}`}
                        >
                          <span className="podium-row__rank">
                            {index === 0 ? <Icons.Crown size={16} weight="fill" /> : `#${index + 1}`}
                          </span>
                          <span className={`avatar ${index === 0 ? 'avatar--lead' : ''}`}>
                            {getInitials(collector.user.name)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="podium-row__name">{collector.user.name}</div>
                            {showContact && (hunt.winnerContact?.phone || hunt.winnerContact?.email) && (
                              <div className="podium-row__contact">
                                {hunt.winnerContact.phone}
                                {hunt.winnerContact.phone && hunt.winnerContact.email && ' · '}
                                {hunt.winnerContact.email}
                              </div>
                            )}
                          </div>
                          <div className="podium-row__score">
                            <div className="podium-row__score-val">{collector.pins.length}</div>
                            <div className="podium-row__score-lbl">
                              {collector.pins.length === 1 ? 'drop' : 'drops'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ink-3)' }}>
                      No collectors recorded.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Tabbed Command Dock (Internal Scroll, Zero Page Scroll) */}
        {!railCollapsed && (
          <aside className="command-rail" aria-label="Hunt details and controls">
            <div className="rail-tabs" role="tablist" aria-label="Command dock tabs">
              <button
                type="button"
                role="tab"
                className="rail-tab"
                aria-selected={activeTab === 'loot'}
                onClick={() => setActiveTab('loot')}
              >
                <Icons.Treasure size={14} weight="fill" />
                Loot
                <span className="rail-tab__count">
                  {collectedCount}/{totalPinsPlaced}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                className="rail-tab"
                aria-selected={activeTab === 'crew'}
                onClick={() => setActiveTab('crew')}
              >
                <Icons.Users size={14} weight="fill" />
                Crew
                <span className="rail-tab__count">{hunt.participants.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                className="rail-tab"
                aria-selected={activeTab === 'share'}
                onClick={() => setActiveTab('share')}
              >
                <Icons.Qr size={14} weight="fill" />
                Share
              </button>

              {isHuntCreator && (
                <button
                  type="button"
                  role="tab"
                  className="rail-tab"
                  aria-selected={activeTab === 'host'}
                  onClick={() => setActiveTab('host')}
                >
                  <Icons.Sliders size={14} weight="fill" />
                  Host
                </button>
              )}
            </div>

            <div className="rail-pane">
              {/* TAB 1 — LOOT STASHES */}
              {activeTab === 'loot' && (
                <>
                  {!hasUserJoined && !isHuntCreator && (
                    <div className="notice notice--sky">
                      <Icons.Lightbulb size={18} weight="fill" style={{ color: 'var(--sky-dark)', flexShrink: 0 }} />
                      <span>
                        <strong>Join this hunt</strong> or scan the QR pass on iPhone to start collecting AR loot.
                      </span>
                    </div>
                  )}

                  {hasUserJoined && !isHuntCreator && (
                    <div className="notice notice--meadow">
                      <Icons.Check size={18} weight="fill" style={{ color: 'var(--meadow-dark)', flexShrink: 0 }} />
                      <span>
                        <strong>You&apos;re in the hunt!</strong> Tap any stash below to highlight it on the field.
                      </span>
                    </div>
                  )}

                  <LootLocationsList
                    pins={hunt.pins}
                    onPinClick={handlePinClick}
                    selectedPinId={selectedPinId}
                    bare
                  />
                </>
              )}

              {/* TAB 2 — CREW & LIVE LEADERBOARD */}
              {activeTab === 'crew' && (
                <>
                  {sortedCollectors.length > 0 && (
                    <div className="panel">
                      <div className="panel__head">
                        <Icons.Trophy size={16} weight="fill" style={{ color: 'var(--gold-dark)' }} />
                        <span className="panel__title">Live Standings</span>
                        <span className="panel__meta">{sortedCollectors.length} scoring</span>
                      </div>
                      <div className="panel__body panel__body--flush" style={{ display: 'grid', gap: '0.35rem' }}>
                        {sortedCollectors.map((collector, index) => {
                          const isWinner = collector.user.id === hunt.winnerId;
                          const showContact = isWinner && isHuntCreator && hunt.winnerContact;
                          return (
                            <div
                              key={collector.user.id}
                              className={`podium-row ${index === 0 ? 'podium-row--lead' : ''}`}
                            >
                              <span className="podium-row__rank">
                                {index === 0 ? <Icons.Crown size={15} weight="fill" /> : `#${index + 1}`}
                              </span>
                              <span className={`avatar ${index === 0 ? 'avatar--lead' : ''}`}>
                                {getInitials(collector.user.name)}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div className="podium-row__name">{collector.user.name}</div>
                                {showContact && (hunt.winnerContact?.phone || hunt.winnerContact?.email) && (
                                  <div className="podium-row__contact">
                                    {hunt.winnerContact.phone}
                                    {hunt.winnerContact.phone && hunt.winnerContact.email && ' · '}
                                    {hunt.winnerContact.email}
                                  </div>
                                )}
                              </div>
                              <div className="podium-row__score">
                                <div className="podium-row__score-val">{collector.pins.length}</div>
                                <div className="podium-row__score-lbl">
                                  {collector.pins.length === 1 ? 'pin' : 'pins'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="panel">
                    <div className="panel__head">
                      <Icons.Users size={16} weight="fill" style={{ color: 'var(--sky)' }} />
                      <span className="panel__title">Looters Roster</span>
                      <span className="panel__meta">{hunt.participants.length}</span>
                    </div>
                    <div className="panel__body panel__body--flush">
                      {hunt.participants.length > 0 ? (
                        hunt.participants.map((p) => (
                          <div key={p.id} className="person-row">
                            <span className="avatar">{getInitials(p.user.name)}</span>
                            <span className="person-row__name">{p.user.name}</span>
                            <span className="person-row__meta">
                              {new Date(p.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="empty">
                          <span className="empty__icon">
                            <Icons.Users size={20} />
                          </span>
                          <span className="empty__title">No looters yet</span>
                          <span className="empty__text">
                            Show the Share &amp; QR pass so friends can jump in on iPhone.
                          </span>
                          <button
                            type="button"
                            className="btn btn--gold btn--xs"
                            onClick={() => setActiveTab('share')}
                          >
                            <Icons.Qr size={14} />
                            Open QR Pass
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3 — SHARE & SCANNABLE IPHONE QR PASS */}
              {activeTab === 'share' && (
                <UniversalLinkGenerator huntId={hunt.id} showQr={true} />
              )}

              {/* TAB 4 — HOST CONTROLS */}
              {activeTab === 'host' && isHuntCreator && (
                <div className="panel">
                  <div className="panel__head">
                    <Icons.Sliders size={16} weight="fill" style={{ color: 'var(--blaze)' }} />
                    <span className="panel__title">Host Controls</span>
                  </div>
                  <div className="panel__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ink-2)' }}>
                      Run another round with the same drop locations, or clear the roster for a brand new crew.
                    </p>

                    <button
                      type="button"
                      className="btn btn--gold btn--block"
                      onClick={() => setConfirmAction('resetLoot')}
                      disabled={resetting}
                    >
                      <Icons.Refresh size={16} />
                      Reset All Loot Stashes
                    </button>

                    <button
                      type="button"
                      className="btn btn--danger btn--block"
                      onClick={() => setConfirmAction('clearLooters')}
                      disabled={resetting}
                    >
                      <Icons.Users size={16} />
                      Clear All Looters
                    </button>

                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.73rem', color: 'var(--ink-3)' }}>
                      Both controls act independently so you can replay without kicking players out.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Tactile In-App Confirmation Modal (replaces window.confirm) */}
      <ConfirmModal
        open={confirmAction !== null}
        title={confirmAction === 'resetLoot' ? 'Reset all loot?' : 'Clear all looters?'}
        description={
          confirmAction === 'resetLoot'
            ? 'Every stash in this hunt will become claimable again.'
            : 'All joined players will be removed from this hunt roster.'
        }
        bullets={
          confirmAction === 'resetLoot'
            ? [
                'Resets all collected pins back to Open',
                'Keeps all current participants in the hunt',
                'Cannot be undone',
              ]
            : [
                'Removes all participants from the hunt roster',
                'Keeps collected pins in their current state',
                'Players can rejoin anytime with the link or QR code',
              ]
        }
        confirmLabel={confirmAction === 'resetLoot' ? 'Reset Loot' : 'Clear Looters'}
        danger={confirmAction === 'clearLooters'}
        busy={resetting}
        onConfirm={executeHostAction}
        onCancel={() => setConfirmAction(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
