'use client';

import React, { useEffect, useRef } from 'react';
import MapComponent, { MapMarker, MapComponentRef } from './MapComponent';
import { PinData } from '../app/hunt/[huntId]/page'; // Import PinData

interface MapContainerProps {
  initialPins: PinData[];
}

const MapContainer: React.FC<MapContainerProps> = ({ initialPins }) => {
  const mapComponentRef = useRef<MapComponentRef>(null);

  useEffect(() => {
    if (mapComponentRef.current && initialPins.length > 0) {
      const validMarkers: MapMarker[] = initialPins
        .filter(pin => pin.lat !== undefined && pin.lng !== undefined)
        .map(pin => ({ lat: pin.lat!, lng: pin.lng! })); // Use non-null assertion after filter
      mapComponentRef.current.addMarkers(validMarkers);
    }
  }, [initialPins]);

  return (
    <div className="map-and-list-container">
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#333', fontSize: '1.4em' }}>Hunt Map</h3>
        <MapComponent ref={mapComponentRef} initialMarkers={initialPins.filter(pin => pin.lat !== undefined && pin.lng !== undefined).map(pin => ({ lat: pin.lat!, lng: pin.lng! }))} />
      </div>
      <div className="list-wrapper">
        <h3 className="list-header">Treasure Locations</h3>
        <div id="coordinates-display">
          {initialPins.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '40px 20px' }}>
              No treasure pins found in this hunt.
            </div>
          ) : (
            initialPins.map((pin, index) => (
              <div key={pin.id} className="pin-item">
                <div className="pin-number">Treasure Pin #{index + 1}</div>
                <div className="pin-coordinates">
                  <span>Lat: <span className="coordinate-value">{pin.lat?.toFixed(6) || 'N/A'}</span></span>
                  <span>Lng: <span className="coordinate-value">{pin.lng?.toFixed(6) || 'N/A'}</span></span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#28a745' }}>
                  {pin.collectedByUserId ? 
                    `✓ Collected by ${pin.collectedByUser?.name || 'Unknown'}` : 
                    '○ Not collected yet'
                  }
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export { MapContainer };
