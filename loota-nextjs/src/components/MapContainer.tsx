'use client';

import React, { useEffect, useRef } from 'react';
import MapComponent, { MapMarker, MapComponentRef } from './MapComponent';
import { PinData } from '../app/hunt/[huntId]/page'; // Import PinData

interface MapContainerProps {
  initialPins: PinData[];
  onPinHighlight?: (pinId: string) => void;
  focusOnMarkers?: boolean;
}

const MapContainer: React.FC<MapContainerProps> = ({ initialPins, onPinHighlight, focusOnMarkers }) => {
  const mapComponentRef = useRef<MapComponentRef>(null);

  useEffect(() => {
    if (mapComponentRef.current && initialPins.length > 0) {
      const validMarkers: MapMarker[] = initialPins
        .filter(pin => pin.lat !== undefined && pin.lng !== undefined)
        .map((pin, index) => ({
          lat: pin.lat!, 
          lng: pin.lng!,
          id: pin.id,
          isCollected: !!pin.collectedByUserId,
          title: `Loot #${index + 1}`,
          description: `📍 Lat: ${pin.lat!.toFixed(4)}, Lng: ${pin.lng!.toFixed(4)}${pin.collectedByUserId ? `<br/>✓ Collected by ${pin.collectedByUser?.name || 'Unknown'}` : '<br/>🎯 Available for collection'}`
        }));
      mapComponentRef.current.addMarkers(validMarkers);
    }
  }, [initialPins]);

  // Create markers for all pins (both collected and uncollected)
  const allMarkers: MapMarker[] = initialPins
    .filter(pin => pin.lat !== undefined && pin.lng !== undefined)
    .map((pin, index) => ({
      lat: pin.lat!, 
      lng: pin.lng!,
      id: pin.id,
      isCollected: !!pin.collectedByUserId,
      title: `Loot #${index + 1}`,
      description: `📍 Lat: ${pin.lat!.toFixed(4)}, Lng: ${pin.lng!.toFixed(4)}${pin.collectedByUserId ? `<br/>✓ Collected by ${pin.collectedByUser?.name || 'Unknown'}` : '<br/>🎯 Available for collection'}`
    }));

  // Expose highlight function to parent
  const highlightPin = (pinId: string) => {
    if (mapComponentRef.current) {
      mapComponentRef.current.highlightPin(pinId);
    }
  };

  // Forward the highlight function to parent if callback provided
  useEffect(() => {
    if (onPinHighlight) {
      (window as unknown as { highlightMapPin: (pinId: string) => void }).highlightMapPin = highlightPin;
    }
  }, [onPinHighlight]);

  return (
    <div className="w-full h-full">
      <MapComponent 
        ref={mapComponentRef} 
        initialMarkers={allMarkers}
        focusOnMarkers={focusOnMarkers}
      />
    </div>
  );
};

export { MapContainer };
