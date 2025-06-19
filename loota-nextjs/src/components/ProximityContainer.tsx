'use client';

import React, { useEffect, useRef } from 'react';
import ProximityComponent, { ProximityMarkerData, ProximityComponentRef } from './ProximityComponent';
import { PinData } from '../app/hunt/[huntId]/page'; // Import PinData

interface ProximityContainerProps {
  initialPins: PinData[];
}

const ProximityContainer: React.FC<ProximityContainerProps> = ({ initialPins }) => {
  const proximityComponentRef = useRef<ProximityComponentRef>(null);

  useEffect(() => {
    if (proximityComponentRef.current && initialPins.length > 0) {
      const validMarkers: ProximityMarkerData[] = initialPins
        .filter(pin => pin.distanceFt !== undefined && pin.directionStr !== undefined && pin.x !== undefined && pin.y !== undefined)
        .map(pin => ({
          distanceFt: pin.distanceFt!,
          directionStr: pin.directionStr!,
          x: pin.x!,
          y: pin.y!
        }));
      proximityComponentRef.current.addProximityMarkers(validMarkers);
    }
  }, [initialPins]);

  return (
    <ProximityComponent ref={proximityComponentRef} initialMarkers={initialPins.filter(pin => pin.distanceFt !== undefined && pin.directionStr !== undefined && pin.x !== undefined && pin.y !== undefined).map(pin => ({ distanceFt: pin.distanceFt!, directionStr: pin.directionStr!, x: pin.x!, y: pin.y! }))} />
  );
};

export { ProximityContainer };
