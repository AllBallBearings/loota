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

  // Filter uncollected pins for the map display (gameplay)
  const uncollectedPins = initialPins.filter(pin => !pin.collectedByUserId);

  return (
    <div className="map-and-list-container">
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#333', fontSize: '1.4em' }}>Hunt Map</h3>
        <MapComponent ref={mapComponentRef} initialMarkers={uncollectedPins.filter(pin => pin.lat !== undefined && pin.lng !== undefined).map(pin => ({ lat: pin.lat!, lng: pin.lng! }))} />
      </div>
      <div className="list-wrapper">
        <h3 className="list-header" style={{ fontSize: '16px', margin: '0 0 10px 0', fontWeight: '600' }}>
          🎯 Loot Locations
        </h3>
        <div id="coordinates-display">
          {initialPins.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '40px 20px' }}>
              No loot locations found in this hunt.
            </div>
          ) : (
            initialPins.map((pin, index) => (
              <div 
                key={pin.id} 
                className="loot-item"
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: pin.collectedByUserId ? '#f8fff8' : '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div className="loot-number" style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                    📍 Loot #{index + 1}
                  </div>
                  <div className="loot-status">
                    {pin.collectedByUserId ? (
                      <span style={{ 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        ✓ COLLECTED
                      </span>
                    ) : (
                      <span style={{ 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        🎯 AVAILABLE
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="loot-coordinates" style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                  <span>📍 Lat: {pin.lat?.toFixed(4) || 'N/A'}, Lng: {pin.lng?.toFixed(4) || 'N/A'}</span>
                </div>
                
                {pin.collectedByUserId && (
                  <div className="loot-collection-info" style={{ fontSize: '11px', color: '#666', marginTop: '6px', borderTop: '1px solid #e8e8e8', paddingTop: '6px' }}>
                    <div style={{ fontWeight: '600', color: '#28a745' }}>
                      Collected by {pin.collectedByUser?.name || 'Unknown'}
                    </div>
                    <div style={{ color: '#888' }}>
                      {pin.collectedAt ? new Date(pin.collectedAt).toLocaleString() : 'Time unknown'}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export { MapContainer };
