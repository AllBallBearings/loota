'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Icons } from './Icons';

export interface ProximityMarkerData {
  id?: string;
  distanceFt: number;
  directionStr: string;
  x: number;
  y: number;
  isCollected?: boolean;
  objectType?: string;
}

export interface ProximityComponentRef {
  getMarkers: () => ProximityMarkerData[];
  addProximityMarkers: (markers: ProximityMarkerData[]) => void;
  setProximityMarkers: (markers: ProximityMarkerData[]) => void;
  removeMarkerAt: (index: number) => void;
  deleteLastProximityMarker: () => void;
  clearAllProximityMarkers: () => void;
}

interface ProximityComponentProps {
  initialMarkers?: ProximityMarkerData[];
  currentLootType?: string;
  clueCount?: number;
  showLootPanel?: boolean;
  proximityRadiusFt?: number;
  readOnly?: boolean;
  highlightedPinId?: string | null;
  onMarkersChange?: (markers: ProximityMarkerData[]) => void;
  onMarkerClick?: (pinId: string) => void;
  onOutOfBounds?: (radiusFt: number) => void;
}

const normalizeMarkers = (markers: ProximityMarkerData[]): ProximityMarkerData[] =>
  markers.map((marker) => ({
    ...marker,
    isCollected: marker.isCollected ?? false,
    objectType: marker.objectType ?? 'coin',
  }));

/**
 * Convert a Loota compass bearing (e.g. "N", "N45E", "E30S", "S15W", "W20N")
 * back into clockwise degrees from North so pins scale accurately on any screen size.
 */
function directionToDegrees(dir: string): number | null {
  const clean = dir.trim().toUpperCase();
  if (clean === 'N') return 0;
  if (clean === 'E') return 90;
  if (clean === 'S') return 180;
  if (clean === 'W') return 270;

  const match = /^([NESW])(\d+(?:\.\d+)?)([NESW])$/.exec(clean);
  if (!match) return null;
  const [, start, degStr, end] = match;
  const deg = parseFloat(degStr);
  if (Number.isNaN(deg)) return null;

  if (start === 'N' && end === 'E') return deg;
  if (start === 'E' && end === 'S') return 90 + deg;
  if (start === 'S' && end === 'W') return 180 + deg;
  if (start === 'W' && end === 'N') return 270 + deg;
  return null;
}

function formatBearing(angleDeg: number): string {
  if (angleDeg === 0 || angleDeg === 360) return 'N';
  if (angleDeg === 90) return 'E';
  if (angleDeg === 180) return 'S';
  if (angleDeg === 270) return 'W';
  if (angleDeg > 0 && angleDeg < 90) return `N${angleDeg.toFixed(0)}E`;
  if (angleDeg > 90 && angleDeg < 180) return `E${(angleDeg - 90).toFixed(0)}S`;
  if (angleDeg > 180 && angleDeg < 270) return `S${(angleDeg - 180).toFixed(0)}W`;
  if (angleDeg > 270 && angleDeg < 360) return `W${(angleDeg - 270).toFixed(0)}N`;
  return `N`;
}

const ProximityComponent = forwardRef<ProximityComponentRef, ProximityComponentProps>(
  (
    {
      initialMarkers = [],
      currentLootType = 'coin',
      proximityRadiusFt = 100,
      readOnly = false,
      highlightedPinId = null,
      onMarkersChange,
      onMarkerClick,
      onOutOfBounds,
    },
    ref
  ) => {
    const [markers, setMarkers] = useState<ProximityMarkerData[]>(() => normalizeMarkers(initialMarkers));
    const [hoverReadout, setHoverReadout] = useState<string | null>(null);
    const dishRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      onMarkersChange?.(markers);
    }, [markers, onMarkersChange]);

    const computePolarFromPointer = useCallback(
      (clientX: number, clientY: number) => {
        const el = dishRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (!rect.width) return null;

        const radiusPx = rect.width / 2;
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;
        const relX = clickX - radiusPx;
        const relY = clickY - radiusPx;
        const distPx = Math.sqrt(relX * relX + relY * relY);

        if (distPx > radiusPx) {
          return { outOfBounds: true as const };
        }

        const distanceFt = (distPx / radiusPx) * proximityRadiusFt;
        const angleDeg = (Math.atan2(relX, -relY) * (180 / Math.PI) + 360) % 360;
        const directionStr = formatBearing(angleDeg);

        return {
          outOfBounds: false as const,
          distanceFt: parseFloat(distanceFt.toFixed(1)),
          directionStr,
          x: parseFloat(clickX.toFixed(1)),
          y: parseFloat(clickY.toFixed(1)),
        };
      },
      [proximityRadiusFt]
    );

    const handleDishClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const result = computePolarFromPointer(event.clientX, event.clientY);
        if (!result) return;
        if (result.outOfBounds) {
          onOutOfBounds?.(proximityRadiusFt);
          return;
        }

        setMarkers((prev) => [
          ...prev,
          {
            distanceFt: result.distanceFt,
            directionStr: result.directionStr,
            x: result.x,
            y: result.y,
            isCollected: false,
            objectType: currentLootType,
          },
        ]);
      },
      [readOnly, computePolarFromPointer, onOutOfBounds, proximityRadiusFt, currentLootType]
    );

    const handleDishMove = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const result = computePolarFromPointer(event.clientX, event.clientY);
        if (!result || result.outOfBounds) {
          setHoverReadout(null);
          return;
        }
        setHoverReadout(`${result.distanceFt.toFixed(1)}ft · ${result.directionStr}`);
      },
      [readOnly, computePolarFromPointer]
    );

    const addProximityMarkers = useCallback((next: ProximityMarkerData[]) => {
      setMarkers((prev) => [...prev, ...normalizeMarkers(next)]);
    }, []);

    const setProximityMarkers = useCallback((next: ProximityMarkerData[]) => {
      setMarkers(normalizeMarkers(next));
    }, []);

    const removeMarkerAt = useCallback((index: number) => {
      setMarkers((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const deleteLastProximityMarker = useCallback(() => {
      setMarkers((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    }, []);

    const clearAllProximityMarkers = useCallback(() => {
      setMarkers([]);
    }, []);

    useImperativeHandle(ref, () => ({
      getMarkers: () => markers,
      addProximityMarkers,
      setProximityMarkers,
      removeMarkerAt,
      deleteLastProximityMarker,
      clearAllProximityMarkers,
    }));

    const ringFractions = [0.25, 0.5, 0.75];

    return (
      <div className="radar-shell">
        <div className="radar-frame">
          <span className="radar-frame__screw radar-frame__screw--tl" aria-hidden="true" />
          <span className="radar-frame__screw radar-frame__screw--tr" aria-hidden="true" />
          <span className="radar-frame__screw radar-frame__screw--bl" aria-hidden="true" />
          <span className="radar-frame__screw radar-frame__screw--br" aria-hidden="true" />

          <div
            id="proximity-circle"
            ref={dishRef}
            className={`radar-dish ${!readOnly ? 'radar-dish--interactive' : ''}`}
            onClick={handleDishClick}
            onMouseMove={handleDishMove}
            onMouseLeave={() => setHoverReadout(null)}
            role={!readOnly ? 'button' : undefined}
            aria-label={
              readOnly
                ? `Proximity radar showing ${markers.length} loot locations within ${proximityRadiusFt} feet`
                : `Click inside the ${proximityRadiusFt} foot radar circle to drop loot`
            }
          >
            {/* Rotating sonar sweep */}
            <div className="radar-sweep" aria-hidden="true" />

            {/* Crosshairs */}
            <div className="radar-crosshair-h" aria-hidden="true" />
            <div className="radar-crosshair-v" aria-hidden="true" />

            {/* Concentric SVG distance rings */}
            <svg
              viewBox="0 0 200 200"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              {ringFractions.map((frac) => (
                <circle
                  key={frac}
                  cx="100"
                  cy="100"
                  r={frac * 100}
                  fill="none"
                  stroke="rgba(220, 247, 231, 0.24)"
                  strokeWidth={frac === 0.5 ? '1.1' : '0.8'}
                  strokeDasharray={frac === 0.5 ? 'none' : '3 3'}
                />
              ))}
            </svg>

            {/* Range scale chips along NE diagonal */}
            <span
              style={{
                position: 'absolute',
                left: '68%',
                top: '32%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'var(--font-data)',
                fontSize: '0.64rem',
                fontWeight: 700,
                color: '#DCF7E7',
                background: 'rgba(14, 38, 26, 0.85)',
                padding: '1px 5px',
                borderRadius: 999,
                border: '1px solid rgba(220, 247, 231, 0.25)',
                pointerEvents: 'none',
              }}
            >
              {Math.round(proximityRadiusFt / 2)}ft
            </span>
            <span
              style={{
                position: 'absolute',
                left: '83%',
                top: '17%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'var(--font-data)',
                fontSize: '0.64rem',
                fontWeight: 800,
                color: 'var(--gold-bright)',
                background: 'rgba(14, 38, 26, 0.92)',
                padding: '1px 6px',
                borderRadius: 999,
                border: '1px solid rgba(255, 194, 26, 0.45)',
                pointerEvents: 'none',
              }}
            >
              {proximityRadiusFt}ft
            </span>

            {/* Cardinal compass labels */}
            <span className="radar-cardinal radar-cardinal--n">N</span>
            <span className="radar-cardinal radar-cardinal--s">S</span>
            <span className="radar-cardinal radar-cardinal--w">W</span>
            <span className="radar-cardinal radar-cardinal--e">E</span>

            {/* Player center beacon */}
            <div className="radar-beacon" title="Player start point">
              <Icons.User size={14} weight="fill" />
            </div>

            {/* Placed loot markers */}
            {markers.map((marker, idx) => {
              const deg = directionToDegrees(marker.directionStr);
              let leftPct = 50;
              let topPct = 50;

              if (deg !== null && proximityRadiusFt > 0) {
                const ratio = Math.min(1, Math.max(0, marker.distanceFt / proximityRadiusFt));
                const rad = (deg * Math.PI) / 180;
                leftPct = 50 + Math.sin(rad) * ratio * 48;
                topPct = 50 - Math.cos(rad) * ratio * 48;
              }

              const isGift = marker.objectType === 'giftCard';
              const isHighlighted = Boolean(marker.id && highlightedPinId === marker.id);

              return (
                <button
                  key={marker.id ?? idx}
                  type="button"
                  className={`radar-dot ${isGift ? 'radar-dot--gift' : 'radar-dot--coin'} ${
                    marker.isCollected ? 'radar-dot--collected' : ''
                  }`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    outline: isHighlighted ? '3px solid #FF5428' : undefined,
                    outlineOffset: isHighlighted ? 2 : undefined,
                    transform: isHighlighted
                      ? 'translate(-50%, -50%) scale(1.25)'
                      : undefined,
                    cursor: readOnly && onMarkerClick ? 'pointer' : 'default',
                  }}
                  title={`Loot #${idx + 1}: ${marker.distanceFt}ft ${marker.directionStr} (${
                    marker.isCollected ? 'Claimed' : isGift ? 'Gift Card' : 'Coin'
                  })`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (marker.id && onMarkerClick) {
                      onMarkerClick(marker.id);
                    }
                  }}
                >
                  {marker.isCollected ? '✓' : idx + 1}
                </button>
              );
            })}
          </div>

          {!readOnly && hoverReadout && (
            <div className="radar-readout">{hoverReadout}</div>
          )}
        </div>
      </div>
    );
  }
);

ProximityComponent.displayName = 'ProximityComponent';

export default ProximityComponent;
