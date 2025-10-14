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
        const response = await fetch(`/api/hunts/${huntId}`, {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
          },
        });
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
      const response = await fetch(`/api/hunts/${huntId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
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
        const huntResponse = await fetch(`/api/hunts/${huntId}`, {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
          },
        });
        
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
      const response = await fetch(`/api/hunts/${huntId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
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
        const huntResponse = await fetch(`/api/hunts/${huntId}`, {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
          },
        });
        
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

  const renderHuntManagementCard = () => {
    if (!isHuntCreator) return null;

    return (
      <div className="card">
        <div className="p-6 border-b border-slate-200 dark:border-dark-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Refresh className="text-amber-300" size={20} />
            Hunt Management
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
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
          <p className="text-xs text-slate-400 mt-3">
            Reset collected pins or clear participants independently
          </p>
        </div>
      </div>
    );
  };

  const renderProximityCard = () => (
    <div className="card p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Icons.Proximity className="text-accent-cyan" size={22} />
        Proximity Hunt
      </h3>
      <div
        className="map-container-modern map-container-proximity"
        style={{ minHeight: '560px' }}
      >
        <ProximityContainer initialPins={proximityPins} />
      </div>
    </div>
  );

  return (
    <div className="main-layout">
      {/* Modern Header */}
      <header className="nav-header">
        <div className="container-modern">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Icons.Adventure className="text-accent-cyan" size={28} />
              <h1 className="text-2xl md:text-3xl font-bold">Hunt Viewer</h1>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-300">
              <Icons.Magic className="text-violet-300" size={20} />
              <span>AR Loota Hunt</span>
            </div>
          </div>
        </div>
      </header>

      {/* Two-Panel Layout */}
      <main className="flex-1 flex">
        <div className="container-modern flex-1 py-4 px-6 overflow-y-auto max-h-full flex flex-col min-h-0">
          {allLootCollected && (
            <div className="card card-glow p-6 mb-8 border border-emerald-400/30 bg-emerald-500/10 animate-slide-up">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-emerald-200 mb-2 flex items-center justify-center gap-3">
                  <Icons.Celebration className="text-emerald-200" size={30} />
                  Everything&apos;s Looted!
                </h2>
                <p className="text-lg text-emerald-100 mb-6">
                  The hunt is complete
                </p>
              
                <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-4 max-w-2xl mx-auto">
                  <h3 className="text-xl font-semibold text-emerald-100 mb-4 flex items-center justify-center gap-2">
                    <Icons.Trophy className="text-amber-200" size={22} />
                    Winners & Their Loot
                  </h3>
                
                  {Object.values(collectors).map((collector, index) => (
                    <div key={collector.user.id} className={`bg-black/20 border border-emerald-400/30 rounded-lg p-3 text-left ${index < Object.values(collectors).length - 1 ? 'mb-2' : ''}`}>
                      <div className="text-lg font-semibold text-emerald-100 mb-2 flex items-center gap-2">
                        <Icons.User className="text-emerald-200" size={18} />
                        {collector.user.name}
                      </div>
                      <div className="text-sm text-emerald-100/80 mb-2">
                        Collected {collector.pins.length} pin{collector.pins.length === 1 ? '' : 's'}:
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {collector.pins.map((pin, pinIndex) => (
                          <span key={pin.id} className="bg-yellow-300/80 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
                            <Icons.Target className="text-yellow-900" size={14} />
                            Pin #{pinIndex + 1}
                          </span>
                        ))}
                      </div>
                      {collector.pins[0]?.collectedAt && (
                        <div className="text-xs text-slate-200/80">
                          Last collected: {new Date(collector.pins[collector.pins.length - 1].collectedAt!).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hunt Header */}
          <div className="card mb-6 p-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-slate-100 mb-2">
                  {hunt.name || 'Untitled Hunt'}
                </h3>
                <div className="flex gap-4 text-sm text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1">
                    {hunt.type === 'geolocation' ? (
                      <Icons.Map className="text-slate-200" size={18} />
                    ) : (
                      <Icons.Proximity className="text-slate-200" size={18} />
                    )}
                    {hunt.type === 'geolocation' ? 'Map-based' : 'Proximity'}
                  </span>
                  {hunt.creator && (
                    <span className="flex items-center gap-1">
                      <Icons.User className="text-slate-200" size={16} />
                      by {hunt.creator.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono">
                    🆔 {hunt.id.substring(0, 8)}...
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {!hasUserJoined && !isHuntCreator && (
                  <JoinHuntButton
                    huntId={hunt.id}
                    currentUserId={currentUserId}
                    onJoinSuccess={() => {
                      // Refresh hunt data to show updated participants list
                      window.location.reload();
                    }}
                    onJoinError={(error) => {
                      alert(`Failed to join hunt: ${error}`);
                    }}
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

            {!hasUserJoined && !isHuntCreator && (
              <div className="mt-4 p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                <p className="text-sm text-slate-100 flex items-center gap-2">
                  <Icons.Lightbulb className="text-yellow-200" size={18} />
                  <span><span className="font-medium">Join this hunt</span> to start collecting loot and compete with other players!</span>
                </p>
              </div>
            )}

            {hasUserJoined && !isHuntCreator && (
              <div className="mt-4 p-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10">
                <p className="text-sm text-emerald-100 flex items-center gap-2">
                  <Icons.Check className="text-emerald-200" size={18} />
                  <span><span className="font-medium">You&apos;re in the hunt!</span> The AR view below shows all available loot locations.</span>
                </p>
              </div>
            )}
          </div>

          {shareExpanded && (
            <div className="card p-4 mb-6">
              <UniversalLinkGenerator huntId={hunt.id} />
            </div>
          )}

          {/* Hunt Interface - Map and Loot Locations */}
          <div className="mb-6 flex-1 flex flex-col min-h-0">
            {hunt.type === 'proximity' ? (
              <>
                <div className="block lg:hidden space-y-4">
                  {renderProximityCard()}
                </div>
                <div className="hidden lg:block">
                  {renderProximityCard()}
                </div>
                {isHuntCreator && (
                  <div className="mt-4">
                    {renderHuntManagementCard()}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="block lg:hidden space-y-4">
                  <LootLocationsList pins={hunt.pins} onPinClick={handlePinClick} />
                  <div className="card p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Icons.Map className="text-slate-200" size={20} />
                      Hunt Map
                    </h3>
                    <div className="map-container-modern" style={{ height: 'min(400px, 40vh)' }}>
                      <MapContainer
                        initialPins={geolocationPins}
                        focusOnMarkers={true}
                      />
                    </div>
                  </div>
                  {isHuntCreator && renderHuntManagementCard()}
                </div>
                <div className="hidden lg:flex gap-6 min-h-0 flex-1">
                  <div className="w-2/3">
                    <div className="card p-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Icons.Map className="text-slate-200" size={20} />
                        Hunt Map
                      </h3>
                      <div className="map-container-modern" style={{ height: 'min(400px, 40vh)' }}>
                        <MapContainer
                          initialPins={geolocationPins}
                          focusOnMarkers={true}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-1/3 flex flex-col space-y-4 min-h-0">
                    <LootLocationsList pins={hunt.pins} onPinClick={handlePinClick} fixedHeight={true} />
                    {renderHuntManagementCard()}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Participants - Below main interface */}
          <div className="mb-6">
            <div className="card">
              <div className="p-6 border-b border-slate-200 dark:border-dark-700">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Icons.Users className="text-slate-200" size={20} />
                  Participants ({hunt.participants.length})
                </h3>
              </div>
              <div className="p-6">
                {hunt.participants.length > 0 ? (
                  <div className="space-y-3">
                    {hunt.participants.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
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
      </main>
    </div>
  );
}
