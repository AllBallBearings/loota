'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapContainer } from '../../components/MapContainer'; // Assuming you'll create this
import { ProximityContainer } from '../../components/ProximityContainer'; // Assuming you'll create this

interface PinData {
  lat?: number;
  lng?: number;
  distanceFt?: number;
  directionStr?: string;
  x?: number;
  y?: number;
}

interface HuntData {
  id: string;
  type: 'geolocation' | 'proximity';
  pins: PinData[];
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

        {hunt.type === 'geolocation' && (
          <MapContainer initialPins={hunt.pins.filter(p => p.lat !== undefined && p.lng !== undefined)} />
        )}
        {hunt.type === 'proximity' && (
          <ProximityContainer initialPins={hunt.pins.filter(p => p.distanceFt !== undefined && p.directionStr !== undefined)} />
        )}
      </main>

      <footer>&copy; 2025 Loota - Spreading Joy Through Discovery</footer>
    </>
  );
}
