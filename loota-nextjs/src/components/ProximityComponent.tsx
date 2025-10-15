'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface ProximityMarkerData {
  distanceFt: number;
  directionStr: string;
  x: number;
  y: number;
  isCollected?: boolean;
}

export interface ProximityComponentRef {
  getMarkers: () => ProximityMarkerData[];
  addProximityMarkers: (markers: ProximityMarkerData[]) => void; // Add this line
  setProximityMarkers: (markers: ProximityMarkerData[]) => void;
  deleteLastProximityMarker: () => void;
  clearAllProximityMarkers: () => void;
}

interface ProximityComponentProps {
  initialMarkers?: ProximityMarkerData[]; // Add this prop
}

const radiusMapping = [10, 50, 100]; // Maps slider values (0,1,2) to ft

const normalizeMarkers = (markers: ProximityMarkerData[]): ProximityMarkerData[] =>
  markers.map(marker => ({
    ...marker,
    isCollected: marker.isCollected ?? false,
  }));

const ProximityComponent = forwardRef<ProximityComponentRef, ProximityComponentProps>((
  { initialMarkers = [] }, // Destructure initialMarkers with a default empty array
  ref
) => {
  const [proximityMarkersData, setProximityMarkersData] = useState<ProximityMarkerData[]>(() => normalizeMarkers(initialMarkers)); // Initialize with initialMarkers, normalizing collected state
  const [currentProximityRadiusFt, setCurrentProximityRadiusFt] = useState<number>(radiusMapping[0]);
  
  const proximityCircleElementRef = useRef<HTMLDivElement | null>(null);
  const proximityCoordinatesDisplayElementRef = useRef<HTMLDivElement | null>(null);
  const proximityRadiusSliderRef = useRef<HTMLInputElement | null>(null);
  const proximityRadiusDisplayElementRef = useRef<HTMLSpanElement | null>(null);

  const drawProximityCircle = useCallback(() => {
    const proximityCircleElement = proximityCircleElementRef.current;
    if (!proximityCircleElement) return;

    // Clear previous SVG elements (rings and labels)
    const existingSvgs = proximityCircleElement.querySelectorAll('svg.measurement-ring, div.measurement-label');
    existingSvgs.forEach(el => el.remove());

    const proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;

    if (proximityCircleRadiusPx <= 0) {
      console.warn("Proximity circle has no dimensions, cannot draw rings.");
      return;
    }
    
    const numIntervals = 10;

    for (let i = 1; i < numIntervals; i++) {
      const intervalRadiusFt = (currentProximityRadiusFt / numIntervals) * i;
      const intervalRadiusPx = (proximityCircleRadiusPx / numIntervals) * i;

      const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      ring.classList.add('measurement-ring');
      ring.style.position = 'absolute';
      ring.style.left = '0';
      ring.style.top = '0';
      ring.style.width = '100%';
      ring.style.height = '100%';
      ring.style.pointerEvents = 'none';

      const circleEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circleEl.setAttribute('cx', proximityCircleRadiusPx.toString());
      circleEl.setAttribute('cy', proximityCircleRadiusPx.toString());
      circleEl.setAttribute('r', intervalRadiusPx.toString());
      circleEl.setAttribute('stroke', 'rgba(34, 211, 238, 0.22)');
      circleEl.setAttribute('stroke-width', '1.25');
      circleEl.setAttribute('fill', 'none');
      ring.appendChild(circleEl);
      proximityCircleElement.appendChild(ring);

      const label = document.createElement('div');
      label.classList.add('measurement-label');
      label.style.position = 'absolute';
      label.style.left = `${proximityCircleRadiusPx + intervalRadiusPx - 10}px`;
      label.style.top = `${proximityCircleRadiusPx - 10}px`;
      label.style.fontSize = '10px';
      label.style.color = 'var(--text-primary)';
      label.style.background = 'rgba(15, 23, 42, 0.75)';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '9999px';
      label.style.pointerEvents = 'none';
      label.textContent = `${intervalRadiusFt.toFixed(0)}ft`;
      proximityCircleElement.appendChild(label);
    }
    console.log(`Drew ${numIntervals -1} concentric circles for ${currentProximityRadiusFt}ft radius.`);
  }, [currentProximityRadiusFt]);

  const updateProximityMarkerDisplay = useCallback(() => {
    if (!proximityCoordinatesDisplayElementRef.current) return;

    if (proximityMarkersData.length === 0) {
      proximityCoordinatesDisplayElementRef.current.innerHTML = '<p style="padding:10px; text-align:center;">No proximity markers placed yet.</p>';
      return;
    }

    const markerListHtml = proximityMarkersData.map((marker, index) => {
      const statusClass = marker.isCollected ? 'collected' : 'available';
      const statusLabel = marker.isCollected ? 'Collected' : 'Available';
      return `<div class="proximity-marker-entry ${statusClass}">
        <span>Marker ${index + 1}: ${marker.distanceFt}ft, ${marker.directionStr}</span>
        <span class="status-pill">${statusLabel}</span>
      </div>`;
    }).join('');
    proximityCoordinatesDisplayElementRef.current.innerHTML = markerListHtml;
  }, [proximityMarkersData]);

  const handleProximityRadiusChange = useCallback(() => {
    const slider = proximityRadiusSliderRef.current;
    const display = proximityRadiusDisplayElementRef.current;

    if (!slider || !display) {
      console.error("Slider or display element for radius not found.");
      return;
    }

    const sliderValue = parseInt(slider.value, 10);
    const newRadius = radiusMapping[sliderValue];
    
    setCurrentProximityRadiusFt(newRadius);
    display.textContent = `${newRadius} ft`;
    console.log("Proximity radius changed to:", newRadius, "ft (Slider value:", sliderValue + ")");

    if (proximityMarkersData.length > 0) {
      alert("Radius changed. Existing proximity markers have been cleared as their scale is now different.");
      setProximityMarkersData([]); // Clear existing markers
      // The dots will be removed by the useEffect that watches proximityMarkersData
    }
  }, [proximityMarkersData]);

  const handleAddProximityMarker = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const proximityCircleElement = proximityCircleElementRef.current;
    if (!proximityCircleElement) return;

    const proximityCircleRect = proximityCircleElement.getBoundingClientRect();
    const proximityCircleRadiusPx = proximityCircleElement.offsetWidth / 2;

    if (!proximityCircleRect || !proximityCircleRect.width || proximityCircleRect.width === 0) {
      console.error("Proximity circle not visible or has no dimensions. Width:", proximityCircleRect ? proximityCircleRect.width : 'undefined');
      return;
    }
    
    const clickX = event.clientX - proximityCircleRect.left;
    const clickY = event.clientY - proximityCircleRect.top;

    const relativeX = clickX - proximityCircleRadiusPx;
    const relativeY = clickY - proximityCircleRadiusPx;

    const distanceFromCenterPx = Math.sqrt(relativeX * relativeX + relativeY * relativeY);

    if (distanceFromCenterPx > proximityCircleRadiusPx) {
      alert(`Marker is outside the ${currentProximityRadiusFt}ft radius!`);
      return;
    }

    const distanceFt = (distanceFromCenterPx / proximityCircleRadiusPx) * currentProximityRadiusFt;

    const angleDeg = (Math.atan2(relativeX, -relativeY) * (180 / Math.PI) + 360) % 360;

    let directionStr;
    let angleFromCardinal = 0;

    if (angleDeg === 0 || angleDeg === 360) directionStr = "N";
    else if (angleDeg === 90) directionStr = "E";
    else if (angleDeg === 180) directionStr = "S";
    else if (angleDeg === 270) directionStr = "W";
    else if (angleDeg > 0 && angleDeg < 90) {
        angleFromCardinal = angleDeg;
        directionStr = `N${angleFromCardinal.toFixed(0)}E`;
    } else if (angleDeg > 90 && angleDeg < 180) {
        angleFromCardinal = angleDeg - 90;
        directionStr = `E${angleFromCardinal.toFixed(0)}S`;
    } else if (angleDeg > 180 && angleDeg < 270) {
        angleFromCardinal = angleDeg - 180;
        directionStr = `S${angleFromCardinal.toFixed(0)}W`;
    } else if (angleDeg > 270 && angleDeg < 360) {
        angleFromCardinal = angleDeg - 270;
        directionStr = `W${angleFromCardinal.toFixed(0)}N`;
    } else {
        directionStr = `Angle ${angleDeg.toFixed(1)}`; 
    }
    
    console.log(`Angle: ${angleDeg}, RelX: ${relativeX}, RelY: ${relativeY}, Dir: ${directionStr}`);

    setProximityMarkersData((prevData) => [
      ...prevData,
      {
        distanceFt: parseFloat(distanceFt.toFixed(1)),
        directionStr: directionStr,
        x: clickX,
        y: clickY,
        isCollected: false,
      }
    ]);
  }, [currentProximityRadiusFt]);

  const addProximityMarkers = useCallback((markers: ProximityMarkerData[]) => {
    setProximityMarkersData((prevData) => [
      ...prevData,
      ...normalizeMarkers(markers),
    ]);
  }, []);

  const setProximityMarkers = useCallback((markers: ProximityMarkerData[]) => {
    setProximityMarkersData(normalizeMarkers(markers));
  }, []);

  const deleteLastProximityMarker = useCallback(() => {
    setProximityMarkersData((prevData) => {
      if (prevData.length > 0) {
        console.log("Last proximity marker deleted.");
        return prevData.slice(0, -1);
      } else {
        console.log("No proximity markers to delete.");
        return prevData;
      }
    });
  }, []);

  const clearAllProximityMarkers = useCallback(() => {
    setProximityMarkersData([]);
    console.log("All proximity markers cleared.");
  }, []);

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    getMarkers: () => proximityMarkersData,
    addProximityMarkers, // Expose addProximityMarkers
    setProximityMarkers,
    deleteLastProximityMarker,
    clearAllProximityMarkers,
  }));

  // Effect to draw the circle when radius changes or component mounts
  useEffect(() => {
    drawProximityCircle();
  }, [currentProximityRadiusFt, drawProximityCircle]);

  // Effect to update display and dots when markers data changes
  useEffect(() => {
    updateProximityMarkerDisplay();
    const proximityCircleElement = proximityCircleElementRef.current;
    if (proximityCircleElement) {
      // Clear existing dots
      proximityCircleElement.querySelectorAll('.proximity-marker-dot').forEach(dot => dot.remove());
      // Add new dots
      proximityMarkersData.forEach(marker => {
        const dot = document.createElement('div');
        dot.className = `proximity-marker-dot${marker.isCollected ? ' collected' : ''}`;
        dot.style.left = `${marker.x}px`;
        dot.style.top = `${marker.y}px`;
        proximityCircleElement.appendChild(dot);
      });
    }
  }, [proximityMarkersData, updateProximityMarkerDisplay]);

  return (
    <div
      id="proximity-view-container"
      // className="hidden-view" // This will be controlled by the parent component
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 0 30px 0',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '28px',
      }}
    >
      <div
        id="proximity-interaction-area"
        style={{
          flex: '1 1 65%',
          marginRight: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <p style={{ textAlign: 'center', marginBottom: '14px', color: 'var(--text-secondary)', maxWidth: '420px' }}>
          Click within the circle to place markers. Adjust radius with the
          slider below.
        </p>
        <div
          id="proximity-radius-slider-container"
          style={{
            textAlign: 'center',
            marginBottom: '24px',
            width: '80%',
            maxWidth: '360px',
            marginLeft: 'auto',
            marginRight: 'auto',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '18px 20px',
            borderRadius: '20px',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            boxShadow: '0 25px 45px -30px rgba(14, 165, 233, 0.35)',
          }}
        >
          <label
            htmlFor="proximityRadiusSlider"
            style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            Radius: <span ref={proximityRadiusDisplayElementRef}>{currentProximityRadiusFt} ft</span>
          </label>
          <input
            type="range"
            id="proximityRadiusSlider"
            min="0"
            max="2"
            defaultValue="0"
            style={{ width: '100%' }}
            ref={proximityRadiusSliderRef}
            onChange={handleProximityRadiusChange}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75em',
              marginTop: '8px',
              color: 'var(--text-secondary)',
              letterSpacing: '0.08em',
            }}
          >
            <span>10ft</span>
            <span>50ft</span>
            <span>100ft</span>
          </div>
        </div>
        <div
          id="proximity-circle-wrapper"
          style={{
            position: 'relative',
            width: 'min(440px, 90vw)',
            height: 'min(440px, 90vw)',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(15,23,42,0.8), rgba(17,24,39,0.9))',
            boxShadow: '0 40px 60px -40px rgba(15,118,110,0.45)',
            padding: '24px',
            transition: 'transform 0.3s ease',
          }}
        >
          <div
            id="proximity-circle"
            style={{
              width: '100%',
              height: '100%',
              border: '3px solid var(--accent-cyan)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.12), rgba(8, 16, 37, 0.92))',
              position: 'relative',
              cursor: 'crosshair',
              boxShadow: 'inset 0 0 40px rgba(8, 47, 73, 0.55)',
            }}
            ref={proximityCircleElementRef}
            onClick={handleAddProximityMarker}
          >
            <span
              style={{
                position: 'absolute',
                top: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.12em',
              }}
            >
              N
            </span>
            <span
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.12em',
              }}
            >
              S
            </span>
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '14px',
                transform: 'translateY(-50%)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.12em',
              }}
            >
              W
            </span>
            <span
              style={{
                position: 'absolute',
                top: '50%',
                right: '14px',
                transform: 'translateY(-50%)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.12em',
              }}
            >
              E
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="url(#beaconGradient)"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                filter: 'drop-shadow(0 6px 18px rgba(99, 102, 241, 0.45))',
              }}
            >
              <defs>
                <linearGradient id="beaconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-cyan)" />
                  <stop offset="100%" stopColor="var(--accent-violet)" />
                </linearGradient>
              </defs>
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div style={{
        flex: '1 1 35%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '24px',
        padding: '1.25rem',
        boxShadow: '0 30px 60px -40px rgba(79, 70, 229, 0.35)',
        backdropFilter: 'blur(18px)'
      }}>
        <h4
          style={{
            margin: '0 0 1rem 0',
            color: 'var(--text-primary)',
            fontSize: '1.1rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          📍 Luda Locations
        </h4>
        <div
          id="proximity-coordinates-display"
          style={{
            flex: 1,
            overflowY: 'auto',
            fontSize: '0.95em',
            lineHeight: '1.6',
            paddingRight: '4px',
          }}
          ref={proximityCoordinatesDisplayElementRef}
        >
          {/* Proximity marker data will appear here */}
        </div>
      </div>
    </div>
  );
});

ProximityComponent.displayName = 'ProximityComponent'; // Add display name for forwardRef

export default ProximityComponent;
