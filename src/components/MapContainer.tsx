'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapComponent, { MapMarker, MapComponentRef } from './MapComponent';
import { PinData } from '../types/hunt';
import { LoadingOverlay } from './LoadingOverlay';

interface MapContainerProps {
  initialPins: PinData[];
  onPinHighlight?: (pinId: string | null) => void;
  focusOnMarkers?: boolean;
  mapRefExternal?: React.RefObject<MapComponentRef | null>;
}

const MapContainer: React.FC<MapContainerProps> = ({
  initialPins,
  onPinHighlight,
  focusOnMarkers = true,
  mapRefExternal,
}) => {
  const internalMapRef = useRef<MapComponentRef>(null);
  const activeRef = mapRefExternal ?? internalMapRef;
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const mappedMarkers = useMemo<MapMarker[]>(
    () =>
      initialPins
        .filter((pin) => pin.lat !== undefined && pin.lng !== undefined)
        .map((pin, index) => ({
          lat: pin.lat!,
          lng: pin.lng!,
          id: pin.id,
          isCollected: Boolean(pin.collectedByUserId),
          title: `Loot #${index + 1}`,
          description: `${pin.lat!.toFixed(5)}, ${pin.lng!.toFixed(5)}<br/>${
            pin.collectedByUserId
              ? `✓ Claimed by ${pin.collectedByUser?.name || 'Hunter'}`
              : '★ Waiting to be discovered in AR'
          }`,
          objectType: pin.objectType || 'coin',
        })),
    [initialPins]
  );

  // Sync markers cleanly on every live poll WITHOUT duplicating pins or flashing overlays
  useEffect(() => {
    activeRef.current?.setMarkers(mappedMarkers);
  }, [mappedMarkers, activeRef]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 550);
    return () => clearTimeout(timer);
  }, []);

  // Register global helper so HuntViewerPage can always highlight a pin reliably
  useEffect(() => {
    const highlightFn = (pinId: string) => {
      activeRef.current?.highlightPin(pinId);
    };
    (window as unknown as { highlightMapPin?: (pinId: string) => void }).highlightMapPin = highlightFn;

    return () => {
      delete (window as unknown as { highlightMapPin?: (pinId: string) => void }).highlightMapPin;
    };
  }, [activeRef]);

  return (
    <div className="w-full h-full relative">
      <MapComponent
        ref={activeRef}
        initialMarkers={mappedMarkers}
        focusOnMarkers={focusOnMarkers}
        onPinSelect={onPinHighlight}
      />
      <LoadingOverlay
        isLoading={isInitialLoading}
        message="Loading Field Map…"
        subMessage="Plotting live loot drops"
      />
    </div>
  );
};

export { MapContainer };
