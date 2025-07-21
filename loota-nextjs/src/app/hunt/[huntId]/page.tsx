'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapContainer } from '@/components/MapContainer';
import { ProximityContainer } from '@/components/ProximityContainer';
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
    <>
      <header>
        <h1>Loota Hunt Viewer</h1>
      </header>

      <main>
        {allLootCollected && (
          <div style={{
            backgroundColor: '#d4edda',
            borderLeft: '4px solid #155724',
            color: '#155724',
            padding: '20px',
            margin: '0 0 20px 0',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 10
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, rgba(255,215,0,0.1) 0%, rgba(255,193,7,0.1) 100%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                margin: '0 0 8px 0',
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
              }}>
                🎉 Everything&apos;s Looted!!! 🎉
              </h2>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '500', 
                margin: '0 0 20px 0',
                opacity: 0.9
              }}>
                The hunt is complete
              </p>
              
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '8px',
                padding: '16px',
                margin: '0 auto',
                maxWidth: '600px'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  margin: '0 0 12px 0',
                  color: '#0f5132'
                }}>
                  🏆 Winners & Their Loot
                </h3>
                
                {Object.values(collectors).map((collector, index) => (
                  <div key={collector.user.id} style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #b3d3c6',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: index < Object.values(collectors).length - 1 ? '8px' : '0',
                    textAlign: 'left'
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#0f5132',
                      marginBottom: '6px'
                    }}>
                      👤 {collector.user.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Collected {collector.pins.length} pin{collector.pins.length === 1 ? '' : 's'}:
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '4px', 
                      marginTop: '4px' 
                    }}>
                      {collector.pins.map((pin, pinIndex) => (
                        <span key={pin.id} style={{
                          backgroundColor: '#ffd700',
                          color: '#856404',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          🎯 Pin #{pinIndex + 1}
                        </span>
                      ))}
                    </div>
                    {collector.pins[0]?.collectedAt && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6c757d', 
                        marginTop: '6px' 
                      }}>
                        Last collected: {new Date(collector.pins[collector.pins.length - 1].collectedAt!).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="hunt-header" style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div className="hunt-info" style={{ flex: '1', minWidth: '200px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#212529' }}>
              {hunt.name || 'Untitled Hunt'}
            </h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6c757d', flexWrap: 'wrap' }}>
              <span>{hunt.type === 'geolocation' ? 'Map-based' : 'Proximity'}</span>
              {hunt.creator && <span>by {hunt.creator.name}</span>}
              <span>ID: {hunt.id.substring(0, 8)}...</span>
            </div>
          </div>
          
          <div className="hunt-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={() => setShareExpanded(!shareExpanded)}
              style={{
                backgroundColor: shareExpanded ? '#0d6efd' : '#ffffff',
                color: shareExpanded ? '#ffffff' : '#0d6efd',
                border: '1px solid #0d6efd',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500'
              }}
            >
              📤 Share {shareExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {shareExpanded && (
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #dee2e6', 
            borderRadius: '6px', 
            padding: '16px', 
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <UniversalLinkGenerator huntId={hunt.id} />
          </div>
        )}

        {hunt.type === 'geolocation' && (
          <MapContainer
            initialPins={hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'lat' | 'lng'>> => p.lat !== undefined && p.lng !== undefined)}
          />
        )}
        {hunt.type === 'proximity' && (
          <ProximityContainer
            initialPins={hunt.pins.filter((p): p is Required<Pick<PinData, 'id' | 'distanceFt' | 'directionStr' | 'x' | 'y'>> =>
              p.distanceFt !== undefined && p.directionStr !== undefined && p.x !== undefined && p.y !== undefined
            )}
          />
        )}

        <div className="hunt-stats-container">
          {isHuntCreator && (
            <div className="stats-card">
              <h3>🔄 Hunt Management</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  className="btn btn-warning" 
                  onClick={handleResetLoot}
                  disabled={resetting}
                  style={{
                    backgroundColor: resetting ? '#ccc' : '#ffc107',
                    color: '#000',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: resetting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  {resetting ? 'Processing...' : '🎯 Reset Loot'}
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleClearLooters}
                  disabled={resetting}
                  style={{
                    backgroundColor: resetting ? '#ccc' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: resetting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                >
                  {resetting ? 'Processing...' : '👥 Clear Looters'}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                Reset collected pins or clear participants independently
              </p>
            </div>
          )}
          
          <div className="stats-card">
            <h3>👥 Participants ({hunt.participants.length})</h3>
            {hunt.participants.length > 0 ? (
              <div className="participants-list">
                {hunt.participants.map(p => (
                  <div key={p.id} className="participant-item">
                    <span className="participant-name">{p.user.name}</span>
                    <span className="participant-joined">Joined: {new Date(p.joinedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No participants yet.</p>
            )}
          </div>

        </div>
      </main>

      <footer>&copy; 2025 Loota</footer>
    </>
  );
}
