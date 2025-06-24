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
    <MapComponent ref={mapComponentRef} initialMarkers={initialPins.filter(pin => pin.lat !== undefined && pin.lng !== undefined).map(pin => ({ lat: pin.lat!, lng: pin.lng! }))} />
  );
};

export { MapContainer };
