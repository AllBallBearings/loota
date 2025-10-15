'use client';

import React, { useEffect, useRef, useState } from 'react';
import MapComponent, { MapMarker, MapComponentRef } from './MapComponent';
import { PinData } from '../types/hunt';
import { LoadingOverlay } from './LoadingOverlay';

interface MapContainerProps {
  initialPins: PinData[];
  onPinHighlight?: (pinId: string) => void;
  focusOnMarkers?: boolean;
}

const MapContainer: React.FC<MapContainerProps> = ({ initialPins, onPinHighlight, focusOnMarkers }) => {
  const mapComponentRef = useRef<MapComponentRef>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isMarkersLoading, setIsMarkersLoading] = useState(false);

  useEffect(() => {
    const loadMarkers = async () => {
      if (mapComponentRef.current && initialPins.length > 0) {
        setIsMarkersLoading(true);

        // Add a small delay to show loading state for loot
        await new Promise(resolve => setTimeout(resolve, 500));

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
        setIsMarkersLoading(false);
      }
    };

    loadMarkers();
  }, [initialPins]);

  // Simulate map loading completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMapLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

  const getLoadingMessage = () => {
    if (isMapLoading) return "Loading AR Hunt Map...";
    if (isMarkersLoading) return "Loading Loot Locations...";
    return "Loading...";
  };

  const getLoadingSubMessage = () => {
    if (isMapLoading) return "Initializing map interface";
    if (isMarkersLoading) return "Placing treasure markers";
    return "";
  };

  return (
    <div className="w-full h-full relative">
      <MapComponent
        ref={mapComponentRef}
        initialMarkers={allMarkers}
        focusOnMarkers={focusOnMarkers}
      />
      <LoadingOverlay
        isLoading={isMapLoading || isMarkersLoading}
        message={getLoadingMessage()}
        subMessage={getLoadingSubMessage()}
      />
    </div>
  );
};

export { MapContainer };
