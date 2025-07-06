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
        const response = await fetch(`/api/hunts/${huntId}`);
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
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading hunt...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Error: {error}</div>;
  }

  if (!hunt) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Hunt not found.</div>;
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
        </div>

        <div className="share-section" style={{ margin: '20px 0', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Share this Hunt</h3>
          <UniversalLinkGenerator huntId={hunt.id} />
        </div>

        <div className="participants-section" style={{ margin: '20px 0', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
          <h3>Participants ({hunt.participants.length})</h3>
          {hunt.participants.length > 0 ? (
            <ul>
              {hunt.participants.map(p => (
                <li key={p.id}>{p.user.name} (Joined: {new Date(p.joinedAt).toLocaleString()})</li>
              ))}
            </ul>
          ) : (
            <p>No participants yet.</p>
          )}
        </div>

        <div className="collected-pins-section" style={{ margin: '20px 0', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
          <h3>Collected Markers ({collectedPins.length})</h3>
          {collectedPins.length > 0 ? (
            <ul>
              {collectedPins.map(pin => (
                <li key={pin.id}>
                  Marker {pin.lat && pin.lng ? `at (${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)})` : `(Proximity Pin)`} collected by {pin.collectedByUser?.name} at {pin.collectedAt ? new Date(pin.collectedAt).toLocaleString() : 'N/A'}
                </li>
              ))}
            </ul>
          ) : (
            <p>No markers collected yet.</p>
          )}
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
