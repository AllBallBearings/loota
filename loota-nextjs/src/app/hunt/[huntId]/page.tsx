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
      } catch (err) {
        console.error('Error fetching hunt:', err);
        setError((err as Error).message || 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchHunt();
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

      // Refresh hunt data after successful reset
      const huntResponse = await fetch(`/api/hunts/${huntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      
      if (huntResponse.ok) {
        const updatedHunt: HuntData = await huntResponse.json();
        setHunt(updatedHunt);
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

      // Refresh hunt data after successful reset
      const huntResponse = await fetch(`/api/hunts/${huntId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
      });
      
      if (huntResponse.ok) {
        const updatedHunt: HuntData = await huntResponse.json();
        setHunt(updatedHunt);
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

  const uncollectedPins = hunt.pins.filter(pin => !pin.collectedByUserId);
  const collectedPins = hunt.pins.filter(pin => pin.collectedByUserId);
  const isHuntCreator = hunt.creator?.id === currentUserId;

  return (
    <>
      <header>
        <h1>Loota Hunt Viewer</h1>
      </header>

      <main>
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
            initialPins={uncollectedPins.filter((p): p is Required<Pick<PinData, 'id' | 'lat' | 'lng'>> => p.lat !== undefined && p.lng !== undefined)}
          />
        )}
        {hunt.type === 'proximity' && (
          <ProximityContainer
            initialPins={uncollectedPins.filter((p): p is Required<Pick<PinData, 'id' | 'distanceFt' | 'directionStr' | 'x' | 'y'>> =>
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

          <div className="stats-card">
            <h3>✅ Collected Markers ({collectedPins.length})</h3>
            {collectedPins.length > 0 ? (
              <div className="collected-list">
                {collectedPins.map(pin => (
                  <div key={pin.id} className="collected-item">
                    <div className="collected-marker">
                      📍 {pin.lat && pin.lng ? `(${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)})` : 'Proximity Pin'}
                    </div>
                    <div className="collected-by">
                      Collected by <strong>{pin.collectedByUser?.name}</strong>
                    </div>
                    <div className="collected-time">
                      {pin.collectedAt ? new Date(pin.collectedAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No markers collected yet.</p>
            )}
          </div>
        </div>
      </main>

      <footer>&copy; 2025 Loota</footer>
    </>
  );
}
