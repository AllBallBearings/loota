'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapContainer } from '@/components/MapContainer';
import { ProximityContainer } from '@/components/ProximityContainer';
import { LootLocationsList } from '@/components/LootLocationsList';
import { UniversalLinkGenerator } from '@/components/UniversalLinkGenerator';
import { JoinHuntButton } from '@/components/JoinHuntButton';
import { Icons } from '@/components/Icons';

import { PinData, HuntData } from '@/types/hunt';

// Re-export PinData for backward compatibility
export type { PinData };

export default function HuntViewerPage() {
  const params = useParams();
  const huntId = params.huntId as string;
  const [hunt, setHunt] = useState<HuntData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [shareExpanded, setShareExpanded] = useState(false);
  
  // For now, using a placeholder user ID - in a real app this would come from authentication
  const currentUserId = "a1b2c3d4-e5f6-7890-1234-000000000001";

  // Function to highlight a pin on the map
  const handlePinClick = (pinId: string) => {
    // Use the global function we set in MapContainer
    if ((window as unknown as { highlightMapPin?: (pinId: string) => void }).highlightMapPin) {
      (window as unknown as { highlightMapPin: (pinId: string) => void }).highlightMapPin(pinId);
    }
  };

  useEffect(() => {
    if (!huntId) {
      setLoading(false);
      setError('Hunt ID is missing.');
      return;
    }

    const fetchHunt = async () => {
      try {
        const response = await fetch(`/api/client/hunts/${huntId}?userId=${currentUserId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch hunt');
        }
        const data: HuntData = await response.json();
        setHunt(data);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching hunt:', err);
        setError((err as Error).message || 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchHunt();

    // Set up polling to refresh hunt data every 5 seconds
    const pollInterval = setInterval(() => {
      fetchHunt();
    }, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(pollInterval);
  }, [huntId]);

  const handleResetLoot = async () => {
    if (!hunt) return;

    const confirmed = window.confirm(
      'Are you sure you want to reset the loot? This will:\n\n' +
      '• Reset all collected pins back to uncollected state\n' +
      '• Keep all participants in the hunt\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setResetting(true);
    try {
      const response = await fetch(`/api/client/hunts/${huntId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          resetPins: true,
          clearParticipants: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset loot');
      }

      // Refresh hunt data immediately after successful reset
      try {
        const huntResponse = await fetch(`/api/client/hunts/${huntId}`);
        
        if (huntResponse.ok) {
          const updatedHunt: HuntData = await huntResponse.json();
          setHunt(updatedHunt);
        }
      } catch (refreshErr) {
        console.error('Error refreshing hunt data:', refreshErr);
        // Don't throw here, reset was successful even if refresh failed
      }

      alert('Loot has been successfully reset!');
    } catch (err) {
      console.error('Error resetting loot:', err);
      alert((err as Error).message || 'Failed to reset loot. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const handleClearLooters = async () => {
    if (!hunt) return;

    const confirmed = window.confirm(
      'Are you sure you want to clear all looters? This will:\n\n' +
      '• Remove all participants from the hunt\n' +
      '• Keep all collected pins as they are\n' +
      '• Players can rejoin with the same user ID\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setResetting(true);
    try {
      const response = await fetch(`/api/client/hunts/${huntId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          resetPins: false,
          clearParticipants: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear looters');
      }

      // Refresh hunt data immediately after successful reset
      try {
        const huntResponse = await fetch(`/api/client/hunts/${huntId}`);
        
        if (huntResponse.ok) {
          const updatedHunt: HuntData = await huntResponse.json();
          setHunt(updatedHunt);
        }
      } catch (refreshErr) {
        console.error('Error refreshing hunt data:', refreshErr);
        // Don't throw here, reset was successful even if refresh failed
      }

      alert('Looters have been successfully cleared!');
    } catch (err) {
      console.error('Error clearing looters:', err);
      alert((err as Error).message || 'Failed to clear looters. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }}></div>
        <p>Loading hunt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2 className="flex items-center gap-2 text-slate-100">
          <Icons.Close className="text-red-300" size={24} />
          Error
        </h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="error-container">
        <h2 className="flex items-center gap-2 text-slate-100">
          <Icons.Search className="text-slate-300" size={24} />
          Hunt Not Found
        </h2>
        <p>The hunt you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Go Home</button>
      </div>
    );
  }

  const isHuntCreator = hunt.creator?.id === currentUserId;

  // Check if current user has joined the hunt
  const hasUserJoined = hunt.participants.some(p => p.user.id === currentUserId);
  
  // Check if all loot has been collected
  const allLootCollected = hunt.pins.length > 0 && hunt.pins.every(pin => pin.collectedByUserId);
  
  // Get unique collectors with their collected pins
  const collectors = hunt.pins
    .filter(pin => pin.collectedByUserId && pin.collectedByUser)
    .reduce((acc, pin) => {
      const userId = pin.collectedByUserId!;
      if (!acc[userId]) {
        acc[userId] = {
          user: pin.collectedByUser!,
          pins: []
        };
      }
      acc[userId].pins.push(pin);
      return acc;
    }, {} as Record<string, { user: { id: string; name: string }, pins: PinData[] }>);

  const proximityPins = hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'distanceFt' | 'directionStr' | 'x' | 'y'>> =>
    p.distanceFt !== undefined && p.directionStr !== undefined && p.x !== undefined && p.y !== undefined
  );

  const geolocationPins = hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'lat' | 'lng'>> =>
    p.lat !== undefined && p.lng !== undefined
  );

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(segment => segment[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?';
  };

  const getLatestCollectionTime = (pins: PinData[]) =>
    pins.reduce((latest, pin) => {
      if (!pin.collectedAt) return latest;
      const timestamp = new Date(pin.collectedAt).getTime();
      return timestamp > latest ? timestamp : latest;
    }, 0);

  const sortedCollectors = Object.values(collectors).sort((a, b) => {
    const pinDifference = b.pins.length - a.pins.length;
    if (pinDifference !== 0) return pinDifference;
    return getLatestCollectionTime(a.pins) - getLatestCollectionTime(b.pins);
  });

  const totalPinsPlaced = hunt.pins.length;
  const completionTimestamp = allLootCollected ? getLatestCollectionTime(hunt.pins) : null;
  const completionDate = completionTimestamp ? new Date(completionTimestamp) : null;
  const leaderboardLeader = sortedCollectors[0];

  const renderHuntManagementCard = () => {
    if (!isHuntCreator) return null;

    return (
      <div className="card card-panel">
        <div className="card-section card-section--divider flex items-center gap-2">
          <Icons.Refresh className="text-amber-300" size={20} />
          <h3 className="text-lg font-semibold">Hunt Management</h3>
        </div>
        <div className="card-section space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button 
              className="btn btn-warning w-full flex items-center justify-center gap-2"
              onClick={handleResetLoot}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Icons.Refresh className="animate-spin text-slate-900/80" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <Icons.Target className="text-slate-900" size={18} />
                  Reset Loot
                </>
              )}
            </button>
            <button 
              className="btn btn-danger w-full flex items-center justify-center gap-2"
              onClick={handleClearLooters}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Icons.Refresh className="animate-spin text-slate-100" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <Icons.Users className="text-slate-100" size={18} />
                  Clear Looters
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Reset collected pins or clear participants independently.
          </p>
        </div>
      </div>
    );
  };

  const renderProximityCard = () => (
    <div className="card card-panel hunt-stage-card">
      <div className="card-section card-section--divider card-section--header">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icons.Proximity className="text-accent-cyan" size={22} />
          Proximity Hunt
        </h3>
        <span className="text-sm text-slate-400">{proximityPins.length} clue{proximityPins.length === 1 ? '' : 's'}</span>
      </div>
      <div className="card-section hunt-stage-card__body">
        <div className="map-container-modern map-container-proximity map-stage">
          <ProximityContainer initialPins={proximityPins} showLootPanel={false} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="main-layout">
      {/* Modern Header */}
      <header className="nav-header">
        <div className="container-modern">
          <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Icons.Adventure className="text-accent-cyan" size={28} />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Hunt Viewer</h1>
                <p className="text-sm text-slate-400 hidden md:block">AR Loota Hunt</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
              <div className="text-sm text-slate-200 flex flex-wrap gap-4">
                <span className="font-semibold">{hunt.name || 'Untitled Hunt'}</span>
                <span className="flex items-center gap-1 text-slate-300">
                  {hunt.type === 'geolocation' ? (
                    <Icons.Map className="text-slate-200" size={18} />
                  ) : (
                    <Icons.Proximity className="text-slate-200" size={18} />
                  )}
                  {hunt.type === 'geolocation' ? 'Map-based' : 'Proximity'}
                </span>
                {hunt.creator && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Icons.User className="text-slate-200" size={16} />
                    by {hunt.creator.name}
                    {hunt.creatorContact && (
                      <span className="ml-2 text-emerald-300 font-medium">
                        {hunt.creatorContact.phone && (
                          <>
                            <Icons.Phone className="inline" size={14} />
                            {' '}{hunt.creatorContact.phone}
                          </>
                        )}
                        {hunt.creatorContact.email && (
                          <>
                            {hunt.creatorContact.phone && ' • '}
                            <Icons.Email className="inline" size={14} />
                            {' '}{hunt.creatorContact.email}
                          </>
                        )}
                      </span>
                    )}
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono text-slate-400">
                  🆔 {hunt.id.substring(0, 8)}...
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!hasUserJoined && !isHuntCreator && (
                  <JoinHuntButton
                    huntId={hunt.id}
                    currentUserId={currentUserId}
                    onJoinSuccess={() => window.location.reload()}
                    onJoinError={(error) => alert(`Failed to join hunt: ${error}`)}
                  />
                )}
                <button
                  onClick={() => setShareExpanded(!shareExpanded)}
                  className={`btn ${shareExpanded ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
                >
                  <Icons.Share className="text-slate-100" size={18} />
                  Share {shareExpanded ? '▼' : '▶'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Two-Panel Layout */}
      <main className="hunt-shell">
        <div className="container-modern hunt-shell__inner py-4 px-4 md:px-6">
          {allLootCollected && (
            <section className="card card-glow looted-banner looted-banner--full animate-slide-up">
              <div className="looted-banner__background" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="looted-banner__content">
                <p className="looted-eyebrow">Hunt Complete</p>
                <h2 className="looted-title">
                  <Icons.Celebration className="text-emerald-200" size={18} />
                  Everything&apos;s Looted!
                </h2>
                <p className="looted-subtitle">
                  {leaderboardLeader
                    ? `${leaderboardLeader.user.name} led the charge while the crew secured every single pin.`
                    : 'Every pin has been claimed—time to celebrate the crew!'}
                </p>

                <div className="looted-stats-grid">
                  <div className="looted-stat">
                    <p className="looted-stat__label">Pins Collected</p>
                    <p className="looted-stat__value">{totalPinsPlaced}</p>
                  </div>
                  <div className="looted-stat">
                    <p className="looted-stat__label">Looters</p>
                    <p className="looted-stat__value">{sortedCollectors.length}</p>
                  </div>
                  <div className="looted-stat">
                    <p className="looted-stat__label">Finish Time</p>
                    <p className="looted-stat__value looted-stat__value--time">
                      {completionDate ? completionDate.toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                <div className="looted-winners">
                  <div className="looted-winners__header">
                    <Icons.Trophy className="text-amber-200" size={16} />
                    <h3>Winners & Their Loot</h3>
                  </div>

                  {sortedCollectors.length > 0 ? (
                    <div className="looted-winners-grid">
                      {sortedCollectors.map((collector, index) => {
                        const isWinner = index === 0;
                        const isThisUserWinner = collector.user.id === hunt.winnerId;
                        const showContact = isThisUserWinner && isHuntCreator && hunt.winnerContact;

                        return (
                          <article
                            key={collector.user.id}
                            className={`looted-winner-card ${isWinner ? 'looted-winner-card--leader' : ''}`}
                          >
                            <div className="looted-winner-card__rank">#{index + 1}</div>
                            <div className="looted-winner-card__identity">
                              <div className="looted-avatar">{getInitials(collector.user.name)}</div>
                              <div>
                                <p className="looted-winner-card__name">{collector.user.name}</p>
                                <p className="looted-winner-card__meta">
                                  {collector.pins.length} pin{collector.pins.length === 1 ? '' : 's'}
                                </p>
                                {showContact && (hunt.winnerContact?.phone || hunt.winnerContact?.email) && (
                                  <div className="flex flex-col gap-1 mt-1">
                                    {hunt.winnerContact.phone && (
                                      <p className="looted-winner-card__contact">
                                        <Icons.Phone className="inline text-emerald-300" size={14} />
                                        {' '}{hunt.winnerContact.phone}
                                      </p>
                                    )}
                                    {hunt.winnerContact.email && (
                                      <p className="looted-winner-card__contact">
                                        <Icons.Email className="inline text-emerald-300" size={14} />
                                        {' '}{hunt.winnerContact.email}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="looted-pin-chips">
                              {collector.pins.map((pin, pinIndex) => (
                                <span key={pin.id} className="looted-pin-chip">
                                  <Icons.Target className="text-yellow-300" size={12} />
                                  Pin #{pinIndex + 1}
                                </span>
                              ))}
                            </div>
                            {collector.pins[collector.pins.length - 1]?.collectedAt && (
                              <p className="looted-winner-card__timestamp">
                                Last pin ·{' '}
                                {new Date(
                                  collector.pins[collector.pins.length - 1].collectedAt!
                                ).toLocaleTimeString()}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-200/70 text-center">No collectors recorded.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="hunt-shell__grid">
            <div className="hunt-shell__primary">
              {/* Contextual callouts */}
              {!hasUserJoined && !isHuntCreator && (
                <div className="card card-panel">
                  <div className="card-section card-section--compact">
                    <div className="status-callout status-callout--info">
                      <Icons.Lightbulb className="text-yellow-200" size={18} />
                      <p className="text-sm">
                        <span className="font-medium text-slate-100">Join this hunt</span> to start collecting loot and compete with other players.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {hasUserJoined && !isHuntCreator && (
                <div className="card card-panel">
                  <div className="card-section card-section--compact">
                    <div className="status-callout status-callout--success">
                      <Icons.Check className="text-emerald-200" size={18} />
                      <p className="text-sm text-emerald-50">
                        <span className="font-semibold text-emerald-100">You&apos;re in!</span> The AR view below shows every active loot location.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hunt Interface - Map and Loot Locations */}
              <div className="flex-1 min-h-0">
                {hunt.type === 'proximity' ? (
                  renderProximityCard()
                ) : (
                  <div className="card card-panel hunt-stage-card">
                    <div className="card-section card-section--divider card-section--header">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Icons.Map className="text-slate-200" size={20} />
                        Hunt Map
                      </h3>
                      <span className="text-sm text-slate-400">
                        {geolocationPins.length} active pin{geolocationPins.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="card-section hunt-stage-card__body">
                      <div className="map-container-modern map-stage">
                        <MapContainer
                          initialPins={geolocationPins}
                          focusOnMarkers={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="hunt-shell__secondary">
              {shareExpanded && (
                <div className="card card-panel">
                  <div className="card-section">
                    <UniversalLinkGenerator huntId={hunt.id} />
                  </div>
                </div>
              )}

              <LootLocationsList pins={hunt.pins} onPinClick={handlePinClick} fixedHeight />

              {renderHuntManagementCard()}

              <div className="card card-panel">
                <div className="card-section card-section--divider card-section--header">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Icons.Users className="text-slate-200" size={20} />
                    Participants
                  </h3>
                  <span className="text-sm text-slate-400">
                    {hunt.participants.length} joined
                  </span>
                </div>
                <div className="card-section">
                  {hunt.participants.length > 0 ? (
                    <div className="space-y-3 participants-card__list">
                      {hunt.participants.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                          <span className="font-medium text-slate-100">{p.user.name}</span>
                          <span className="text-sm text-slate-300">
                            {new Date(p.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">No participants yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
