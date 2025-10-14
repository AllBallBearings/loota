'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ProximityComponent, { ProximityMarkerData, ProximityComponentRef } from './ProximityComponent';
import { PinData } from '../app/hunt/[huntId]/page'; // Import PinData
import { LoadingOverlay } from './LoadingOverlay';

interface ProximityContainerProps {
  initialPins: PinData[];
}

const ProximityContainer: React.FC<ProximityContainerProps> = ({ initialPins }) => {
  const proximityComponentRef = useRef<ProximityComponentRef>(null);
  const [isProximityLoading, setIsProximityLoading] = useState(true);
  const [isMarkersLoading, setIsMarkersLoading] = useState(false);

  const validMarkers = useMemo<ProximityMarkerData[]>(() => {
    return initialPins
      .filter(pin => pin.distanceFt !== undefined && pin.directionStr !== undefined && pin.x !== undefined && pin.y !== undefined)
      .map(pin => ({
        distanceFt: pin.distanceFt!,
        directionStr: pin.directionStr!,
        x: pin.x!,
        y: pin.y!,
        isCollected: !!pin.collectedByUserId,
      }));
  }, [initialPins]);

  useEffect(() => {
    let isMounted = true;

    const loadProximityMarkers = async () => {
      const component = proximityComponentRef.current;
      if (!component) return;

      const existingMarkers = component.getMarkers();
      const markersChanged =
        existingMarkers.length !== validMarkers.length ||
        existingMarkers.some((marker, index) => {
          const next = validMarkers[index];
          if (!next) return true;
          return (
            marker.distanceFt !== next.distanceFt ||
            marker.directionStr !== next.directionStr ||
            marker.x !== next.x ||
            marker.y !== next.y ||
            (!!marker.isCollected) !== (!!next.isCollected)
          );
        });

      if (!markersChanged) {
        return;
      }

      setIsMarkersLoading(true);

      try {
        // Add a small delay to show loading state for loot
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!isMounted || !proximityComponentRef.current) {
          return;
        }

        proximityComponentRef.current.setProximityMarkers(validMarkers);
      } finally {
        if (isMounted) {
          setIsMarkersLoading(false);
        }
      }
    };

    loadProximityMarkers();

    return () => {
      isMounted = false;
    };
  }, [validMarkers]);

  // Simulate proximity radar loading completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProximityLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const getLoadingMessage = () => {
    if (isProximityLoading) return "Loading AR Proximity Radar...";
    if (isMarkersLoading) return "Scanning for Loot...";
    return "Loading...";
  };

  const getLoadingSubMessage = () => {
    if (isProximityLoading) return "Calibrating radar interface";
    if (isMarkersLoading) return "Detecting treasure signals";
    return "";
  };

  return (
    <div className="w-full h-full relative">
      <ProximityComponent
        ref={proximityComponentRef}
        initialMarkers={validMarkers}
      />
      <LoadingOverlay
        isLoading={isProximityLoading || isMarkersLoading}
        message={getLoadingMessage()}
        subMessage={getLoadingSubMessage()}
      />
    </div>
  );
};

export { ProximityContainer };
