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
        <p>The hunt you're looking for doesn't exist or has been removed.</p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Go Home</button>
      </div>
    );
  }

  const uncollectedPins = hunt.pins.filter(pin => !pin.collectedByUserId);
  const collectedPins = hunt.pins.filter(pin => pin.collectedByUserId);

  return (
    <>
      <header>
        <h1>Loota Hunt Viewer</h1>
      </header>

      <main>
        <div className="intro-text">
          <h2>Hunt ID: {hunt.id}</h2>
          <p>Type: {hunt.type === 'geolocation' ? 'Geolocation (Map-based)' : 'Proximity (Relative to Player)'}</p>
          {hunt.creator && <p>Created by: {hunt.creator.name}</p>}
        </div>

        <div className="hunt-stats-container">
          <div className="stats-card">
            <h3>📤 Share Hunt</h3>
            <UniversalLinkGenerator huntId={hunt.id} />
          </div>
          
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
      </main>

      <footer>&copy; 2025 Loota - Spreading Joy Through Discovery</footer>
    </>
  );
}
