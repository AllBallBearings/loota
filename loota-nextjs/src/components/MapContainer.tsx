'use client';

import React, { useEffect, useRef } from 'react';
import MapComponent, { MapMarker, MapComponentRef } from './MapComponent';

interface MapContainerProps {
  initialPins: MapMarker[];
}

const MapContainer: React.FC<MapContainerProps> = ({ initialPins }) => {
  const mapComponentRef = useRef<MapComponentRef>(null);

  useEffect(() => {
    // This effect will run once when the component mounts
    // and populate the map with initial pins if provided.
    // Note: MapComponent's initMap handles initial map setup.
    // We need to ensure markers are added after the map is ready.
    // For simplicity, we'll assume MapComponent handles its own initial markers
    // if it were to receive them directly. For now, this component just renders MapComponent.
    // The current MapComponent doesn't directly accept initial pins,
    // so this is a placeholder for future integration if needed.
    console.log("MapContainer received initial pins:", initialPins);
  }, [initialPins]);

  return (
    <MapComponent ref={mapComponentRef} />
  );
};

export { MapContainer };
