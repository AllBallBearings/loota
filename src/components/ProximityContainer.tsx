'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProximityComponent, { ProximityMarkerData, ProximityComponentRef } from './ProximityComponent';
import { PinData } from '../types/hunt';
import { LoadingOverlay } from './LoadingOverlay';

interface ProximityContainerProps {
  initialPins: PinData[];
  showLootPanel?: boolean;
  proximityRadiusFt?: number;
  highlightedPinId?: string | null;
  onPinClick?: (pinId: string) => void;
}

const ProximityContainer: React.FC<ProximityContainerProps> = ({
  initialPins,
  proximityRadiusFt = 100,
  highlightedPinId = null,
  onPinClick,
}) => {
  const proximityComponentRef = useRef<ProximityComponentRef>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const validMarkers = useMemo<ProximityMarkerData[]>(() => {
    return initialPins
      .filter(
        (pin) =>
          pin.distanceFt !== undefined &&
          pin.directionStr !== undefined &&
          pin.x !== undefined &&
          pin.y !== undefined
      )
      .map((pin) => ({
        id: pin.id,
        distanceFt: pin.distanceFt!,
        directionStr: pin.directionStr!,
        x: pin.x!,
        y: pin.y!,
        isCollected: Boolean(pin.collectedByUserId),
        objectType: pin.objectType || 'coin',
      }));
  }, [initialPins]);

  useEffect(() => {
    proximityComponentRef.current?.setProximityMarkers(validMarkers);
  }, [validMarkers]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full relative" style={{ display: 'grid', placeItems: 'center', padding: '3.6rem 1rem 1rem' }}>
      <ProximityComponent
        ref={proximityComponentRef}
        initialMarkers={validMarkers}
        clueCount={initialPins.length}
        showLootPanel={false}
        proximityRadiusFt={proximityRadiusFt}
        readOnly={true}
        highlightedPinId={highlightedPinId}
        onMarkerClick={onPinClick}
      />
      <LoadingOverlay
        isLoading={isInitialLoading}
        message="Calibrating Sonar Radar…"
        subMessage="Detecting nearby loot signals"
      />
    </div>
  );
};

export { ProximityContainer };
