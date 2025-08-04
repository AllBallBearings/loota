'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapContainer } from '@/components/MapContainer';
import { ProximityContainer } from '@/components/ProximityContainer';
import { LootLocationsList } from '@/components/LootLocationsList';
import { UniversalLinkGenerator } from '@/components/UniversalLinkGenerator';

export interface PinData {
  id: string;
  lat?: number;
  lng?: number;
  distanceFt?: number;
  directionStr?: string;
  x?: number;
  y?: number;
  collectedByUserId?: string;
  collectedByUser?: {
    id: string;
    name: string;
  };
  collectedAt?: string;
}

interface HuntParticipationData {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
  joinedAt: string;
}

interface HuntData {
  id: string;
  name?: string;
  type: 'geolocation' | 'proximity';
  creator?: {
    id: string;
    name: string;
  };
  pins: PinData[];
  participants: HuntParticipationData[];
}

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
        <h2>🚫 Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="error-container">
        <h2>🔍 Hunt Not Found</h2>
        <p>The hunt you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Go Home</button>
      </div>
    );
  }

  const isHuntCreator = hunt.creator?.id === currentUserId;
  
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

  return (
    <div className="main-layout bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800">
      {/* Modern Header */}
      <header className="nav-header">
        <div className="container-modern">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🧭</span>
              <h1 className="text-2xl md:text-3xl font-bold">Hunt Viewer</h1>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="text-xl">🔮</span>
              <span>AR Treasure Hunt</span>
            </div>
          </div>
        </div>
      </header>

      <main className="content-area">
        <div className="container-modern">
          {allLootCollected && (
            <div className="card card-glow p-6 mb-8 bg-green-50 border-l-4 border-l-green-500 animate-slide-up">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-green-700 mb-2">
                  🎉 Everything&apos;s Looted!!! 🎉
                </h2>
                <p className="text-lg text-green-600 mb-6">
                  The hunt is complete
                </p>
              
                <div className="bg-white bg-opacity-80 rounded-lg p-4 max-w-2xl mx-auto">
                  <h3 className="text-xl font-semibold text-green-800 mb-4">
                    🏆 Winners & Their Loot
                  </h3>
                
                  {Object.values(collectors).map((collector, index) => (
                    <div key={collector.user.id} className={`bg-white border border-green-200 rounded-lg p-3 text-left ${index < Object.values(collectors).length - 1 ? 'mb-2' : ''}`}>
                      <div className="text-lg font-semibold text-green-800 mb-2">
                        👤 {collector.user.name}
                      </div>
                      <div className="text-sm text-slate-600 mb-2">
                        Collected {collector.pins.length} pin{collector.pins.length === 1 ? '' : 's'}:
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {collector.pins.map((pin, pinIndex) => (
                          <span key={pin.id} className="bg-yellow-300 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            🎯 Pin #{pinIndex + 1}
                          </span>
                        ))}
                      </div>
                      {collector.pins[0]?.collectedAt && (
                        <div className="text-xs text-slate-500">
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
          <div className="card mb-8 p-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {hunt.name || 'Untitled Hunt'}
                </h3>
                <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    {hunt.type === 'geolocation' ? '🗺️' : '📡'} 
                    {hunt.type === 'geolocation' ? 'Map-based' : 'Proximity'}
                  </span>
                  {hunt.creator && (
                    <span className="flex items-center gap-1">
                      👤 by {hunt.creator.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono">
                    🆔 {hunt.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setShareExpanded(!shareExpanded)}
                className={`btn ${shareExpanded ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
              >
                📤 Share {shareExpanded ? '▼' : '▶'}
              </button>
            </div>
          </div>

          {shareExpanded && (
            <div className="card p-6 mb-8">
              <UniversalLinkGenerator huntId={hunt.id} />
            </div>
          )}

          {/* Hunt Interface - Map and Loot Locations */}
          <div className="mb-8">
            {/* Mobile Layout: List above map */}
            <div className="block lg:hidden space-y-6">
              <LootLocationsList pins={hunt.pins} onPinClick={handlePinClick} />
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {hunt.type === 'geolocation' ? '🗺️' : '📡'}
                  {hunt.type === 'geolocation' ? 'Hunt Map' : 'Proximity Hunt'}
                </h3>
                <div className="map-container-modern" style={{ height: '600px' }}>
                  {hunt.type === 'geolocation' && (
                    <MapContainer
                      initialPins={hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'lat' | 'lng'>> => p.lat !== undefined && p.lng !== undefined)}
                      focusOnMarkers={true}
                    />
                  )}
                  {hunt.type === 'proximity' && (
                    <ProximityContainer
                      initialPins={hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'distanceFt' | 'directionStr' | 'x' | 'y'>> =>
                        p.distanceFt !== undefined && p.directionStr !== undefined && p.x !== undefined && p.y !== undefined
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Layout: Side by side */}
            <div className="hidden lg:flex gap-8">
              {/* Map - 2/3 width */}
              <div className="w-2/3">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {hunt.type === 'geolocation' ? '🗺️' : '📡'}
                    {hunt.type === 'geolocation' ? 'Hunt Map' : 'Proximity Hunt'}
                  </h3>
                  <div className="map-container-modern" style={{ height: '600px' }}>
                    {hunt.type === 'geolocation' && (
                      <MapContainer
                        initialPins={hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'lat' | 'lng'>> => p.lat !== undefined && p.lng !== undefined)}
                        focusOnMarkers={true}
                      />
                    )}
                    {hunt.type === 'proximity' && (
                      <ProximityContainer
                        initialPins={hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'distanceFt' | 'directionStr' | 'x' | 'y'>> =>
                          p.distanceFt !== undefined && p.directionStr !== undefined && p.x !== undefined && p.y !== undefined
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Loot Locations - 1/3 width */}
              <div className="w-1/3">
                <LootLocationsList pins={hunt.pins} onPinClick={handlePinClick} />
              </div>
            </div>
          </div>

          {/* Hunt Management and Participants - Below main interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Hunt Management */}
            {isHuntCreator && (
              <div className="card">
                <div className="p-6 border-b border-slate-200 dark:border-dark-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    🔄 Hunt Management
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button 
                      className="btn btn-warning w-full"
                      onClick={handleResetLoot}
                      disabled={resetting}
                    >
                      {resetting ? 'Processing...' : '🎯 Reset Loot'}
                    </button>
                    <button 
                      className="btn btn-danger w-full"
                      onClick={handleClearLooters}
                      disabled={resetting}
                    >
                      {resetting ? 'Processing...' : '👥 Clear Looters'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Reset collected pins or clear participants independently
                  </p>
                </div>
              </div>
            )}
            
            {/* Participants */}
            <div className="card">
              <div className="p-6 border-b border-slate-200 dark:border-dark-700">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  👥 Participants ({hunt.participants.length})
                </h3>
              </div>
              <div className="p-6">
                {hunt.participants.length > 0 ? (
                  <div className="space-y-3">
                    {hunt.participants.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-dark-800 rounded-lg">
                        <span className="font-medium">{p.user.name}</span>
                        <span className="text-sm text-slate-500">
                          {new Date(p.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No participants yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 dark:border-dark-700">
        <div className="container-modern py-8">
          <div className="text-center text-slate-600 dark:text-slate-400">
            <p>&copy; 2025 Loota - Adventure Awaits</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
