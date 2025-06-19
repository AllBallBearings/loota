'use client';

import React, { useEffect, useRef } from 'react';
import ProximityComponent, { ProximityMarkerData, ProximityComponentRef } from './ProximityComponent';

interface ProximityContainerProps {
  initialPins: ProximityMarkerData[];
}

const ProximityContainer: React.FC<ProximityContainerProps> = ({ initialPins }) => {
  const proximityComponentRef = useRef<ProximityComponentRef>(null);

  useEffect(() => {
    // This effect will run once when the component mounts
    // and populate the proximity circle with initial markers if provided.
    // For simplicity, we'll assume ProximityComponent handles its own initial markers
    // if it were to receive them directly. For now, this component just renders ProximityComponent.
    // The current ProximityComponent doesn't directly accept initial pins,
    // so this is a placeholder for future integration if needed.
    console.log("ProximityContainer received initial pins:", initialPins);
  }, [initialPins]);

  return (
    <ProximityComponent ref={proximityComponentRef} />
  );
};

export { ProximityContainer };
