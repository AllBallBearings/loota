'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    google: typeof google;
  }
}

export interface MapMarker {
  lat: number;
  lng: number;
  id?: string;
  isCollected?: boolean;
  title?: string;
  description?: string;
  objectType?: string;
}

export interface MapComponentRef {
  getMarkers: () => MapMarker[];
  addMarkers: (markers: MapMarker[]) => void;
  setMarkers: (markers: MapMarker[]) => void;
  removePinAt: (index: number) => void;
  deleteLastPin: () => void;
  clearAllPins: () => void;
  highlightPin: (pinId: string) => void;
  showInfoWindow: (pinId: string, title: string, description: string) => void;
  recenterToUser: () => void;
  fitAllPins: () => void;
}

interface MapComponentProps {
  initialMarkers?: MapMarker[];
  onMarkersChange?: (markers: MapMarker[]) => void;
  focusOnMarkers?: boolean;
  currentLootType?: string;
  onPinSelect?: (pinId: string | null) => void;
  onLocationError?: (message: string) => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Sunlit Outdoor Adventure basemap — Pokemon GO / National Park topo energy.
const ADVENTURE_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f2eee2' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fbf8f0' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#243b2e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#16261d' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#bde6a3' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#1d5e35' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e5efd9' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#ebe6d7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#ded6c1' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4c6356' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fffdf7' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffe082' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e0b443' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#6b4600' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#d7cfb8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#8ad2f5' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#135ca1' }] },
];

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>((
  {
    initialMarkers = [],
    onMarkersChange,
    focusOnMarkers = false,
    currentLootType = 'coin',
    onPinSelect,
    onLocationError,
  },
  ref
) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [markerData, setMarkerData] = useState<MapMarker[]>(initialMarkers);
  const currentGoogleMarkers = useRef<google.maps.Marker[]>([]);
  const markerPinMap = useRef<Map<string, google.maps.Marker>>(new Map());
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const containerResizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLootTypeRef = useRef<string>(currentLootType);
  const hasAutoFittedRef = useRef(false);

  useEffect(() => {
    currentLootTypeRef.current = currentLootType;
  }, [currentLootType]);

  const createPinIcon = useCallback((isCollected: boolean, isHighlighted: boolean, objectType?: string) => {
    const isGift = objectType === 'giftCard';
    const fillColor = isCollected
      ? '#18A957' // Meadow Emerald for claimed
      : isGift
        ? '#8B5CF6' // Epic Purple for gift cards
        : '#FFC21A'; // Treasure Gold for coins

    const strokeColor = isHighlighted ? '#FF5428' : '#16261D';
    const strokeWeight = isHighlighted ? 4 : 2.5;
    const mult = isHighlighted ? 1.25 : 1;

    if (isGift) {
      const w = 22 * mult;
      const h = 15 * mult;
      const r = 3.2 * mult;
      const path = `
        M ${-w / 2 + r} ${-h / 2}
        h ${w - 2 * r}
        a ${r} ${r} 0 0 1 ${r} ${r}
        v ${h - 2 * r}
        a ${r} ${r} 0 0 1 ${-r} ${r}
        h ${-(w - 2 * r)}
        a ${r} ${r} 0 0 1 ${-r} ${-r}
        v ${-(h - 2 * r)}
        a ${r} ${r} 0 0 1 ${r} ${-r}
        z
      `.replace(/\s+/g, ' ').trim();

      return {
        path,
        fillColor,
        fillOpacity: 1,
        strokeColor,
        strokeWeight,
        scale: 1,
        anchor: new google.maps.Point(0, 0),
      };
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor,
      fillOpacity: 1,
      strokeColor,
      strokeWeight,
      scale: 10.5 * mult,
      anchor: new google.maps.Point(0, 0),
    };
  }, []);

  const fitMapToMarkers = useCallback((markers: MapMarker[]) => {
    if (!mapRef.current || !window.google || markers.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach((marker) => {
      bounds.extend(new window.google.maps.LatLng(marker.lat, marker.lng));
    });

    mapRef.current.fitBounds(bounds, { top: 72, right: 48, bottom: 72, left: 48 });

    window.google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
      const zoom = mapRef.current?.getZoom();
      if (zoom && zoom > 18) {
        mapRef.current?.setZoom(18);
      }
    });
  }, []);

  const addMarker = useCallback((location: google.maps.LatLng) => {
    const lootType = currentLootTypeRef.current;
    setMarkerData((prevData) => [
      ...prevData,
      { lat: location.lat(), lng: location.lng(), objectType: lootType },
    ]);
  }, []);

  const addMarkers = useCallback((markers: MapMarker[]) => {
    setMarkerData((prevData) => [...prevData, ...markers]);
  }, []);

  const setMarkers = useCallback((markers: MapMarker[]) => {
    setMarkerData(markers);
    if (focusOnMarkers && markers.length > 0 && !hasAutoFittedRef.current && mapRef.current) {
      hasAutoFittedRef.current = true;
      fitMapToMarkers(markers);
    }
  }, [focusOnMarkers, fitMapToMarkers]);

  const removePinAt = useCallback((index: number) => {
    setMarkerData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const deleteLastPin = useCallback(() => {
    setMarkerData((prevData) => (prevData.length > 0 ? prevData.slice(0, -1) : prevData));
  }, []);

  const clearAllPins = useCallback(() => {
    setMarkerData([]);
  }, []);

  const recenterToUser = useCallback(() => {
    if (!navigator.geolocation) {
      onLocationError?.('Your browser does not support GPS geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        mapRef.current?.panTo(pos);
        mapRef.current?.setZoom(17);
      },
      () => {
        onLocationError?.('Could not get your current GPS location. Check browser location permissions.');
      }
    );
  }, [onLocationError]);

  const fitAllPins = useCallback(() => {
    if (markerData.length > 0) {
      fitMapToMarkers(markerData);
    }
  }, [markerData, fitMapToMarkers]);

  const initializeMap = useCallback(() => {
    if (!mapDivRef.current || !window.google || !window.google.maps) {
      return;
    }

    mapDivRef.current.innerHTML = '';

    if (mapRef.current) {
      mapRef.current = null;
      currentGoogleMarkers.current.forEach((marker) => marker.setMap(null));
      currentGoogleMarkers.current = [];
    }

    const defaultCenter = { lat: 40.7128, lng: -74.006 };

    try {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        zoom: 17,
        center: defaultCenter,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        backgroundColor: '#f2eee2',
        styles: ADVENTURE_MAP_STYLE,
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      window.google.maps.event.trigger(mapRef.current, 'resize');
    } catch (error) {
      console.error('Error initializing map:', error);
      return;
    }

    if (focusOnMarkers && initialMarkers.length > 0) {
      hasAutoFittedRef.current = true;
      setTimeout(() => fitMapToMarkers(initialMarkers), 100);
    } else if (!focusOnMarkers && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapRef.current?.setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Stay smoothly on default center without noisy popup
        }
      );
    }

    if (!focusOnMarkers) {
      mapRef.current?.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          addMarker(event.latLng);
        }
      });
    }
  }, [addMarker, focusOnMarkers, initialMarkers, fitMapToMarkers]);

  // Resize observer so Google Maps always paints cleanly on layout transitions
  useEffect(() => {
    if (typeof window === 'undefined' || !mapDivRef.current || !('ResizeObserver' in window)) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;

      if (containerResizeTimeout.current) {
        clearTimeout(containerResizeTimeout.current);
      }

      containerResizeTimeout.current = setTimeout(() => {
        if (mapRef.current && window.google?.maps) {
          window.google.maps.event.trigger(mapRef.current, 'resize');
        } else if (window.google?.maps) {
          initializeMap();
        }
      }, 100);
    });

    observer.observe(mapDivRef.current);

    return () => {
      if (containerResizeTimeout.current) {
        clearTimeout(containerResizeTimeout.current);
        containerResizeTimeout.current = null;
      }
      observer.disconnect();
    };
  }, [initializeMap]);

  const showInfoWindow = useCallback((pinId: string, title: string, description: string) => {
    const marker = markerPinMap.current.get(pinId);
    if (marker && infoWindowRef.current) {
      const data = marker.get('markerData') as MapMarker;
      const isCollected = Boolean(data?.isCollected);
      const isGift = data?.objectType === 'giftCard';

      const pillBg = isCollected ? '#DCF7E7' : isGift ? '#EDE7FE' : '#FFF4CC';
      const pillInk = isCollected ? '#0F7A3E' : isGift ? '#6232D6' : '#7C5200';
      const pillBorder = isCollected ? '#18A957' : isGift ? '#8B5CF6' : '#C48700';

      const content = `
        <div style="
          padding: 12px 2px 4px;
          font-family: var(--font-ui, system-ui, sans-serif);
          min-width: 230px;
          color: #16261D;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
          ">
            <h3 style="
              margin: 0;
              color: #16261D;
              font-family: var(--font-display, system-ui, sans-serif);
              font-size: 15px;
              font-weight: 800;
            ">${title}</h3>
            <span style="
              color: ${pillInk};
              border: 1.5px solid ${pillBorder};
              background: ${pillBg};
              padding: 2px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              white-space: nowrap;
            ">${isCollected ? 'Claimed' : isGift ? 'Gift Card' : 'Gold Coin'}</span>
          </div>

          <div style="
            color: #31493B;
            font-family: var(--font-data, monospace);
            font-size: 11.5px;
            font-weight: 600;
            line-height: 1.55;
            padding: 8px 10px;
            border-radius: 8px;
            background: #F3EFE3;
            border: 1.5px solid rgba(22, 38, 29, 0.14);
          ">
            ${description}
          </div>
        </div>
      `;

      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open(mapRef.current, marker);
    }
  }, []);

  const highlightPin = useCallback((pinId: string) => {
    const nextHighlighted = highlightedPinId === pinId ? null : pinId;
    setHighlightedPinId(nextHighlighted);
    onPinSelect?.(nextHighlighted);

    const marker = markerPinMap.current.get(pinId);
    if (marker) {
      const data = marker.get('markerData') as MapMarker;
      if (nextHighlighted) {
        mapRef.current?.panTo(marker.getPosition()!);
        const currentZoom = mapRef.current?.getZoom() || 17;
        if (currentZoom < 17) mapRef.current?.setZoom(17);

        if (data.title && data.description) {
          showInfoWindow(pinId, data.title, data.description);
        }
      } else {
        infoWindowRef.current?.close();
      }
    }
  }, [highlightedPinId, onPinSelect, showInfoWindow]);

  // Sync Google Map markers whenever markerData or highlight changes
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    currentGoogleMarkers.current.forEach((marker) => marker.setMap(null));
    currentGoogleMarkers.current = [];
    markerPinMap.current.clear();

    markerData.forEach((data, idx) => {
      const isHighlighted = Boolean(data.id && highlightedPinId === data.id);
      const marker = new window.google.maps.Marker({
        position: { lat: data.lat, lng: data.lng },
        map: mapRef.current,
        draggable: !focusOnMarkers,
        title: data.title || `Loot #${idx + 1}`,
        icon: createPinIcon(Boolean(data.isCollected), isHighlighted, data.objectType),
        zIndex: isHighlighted ? 999 : idx + 1,
      });

      marker.set('markerData', data);

      if (data.id) {
        markerPinMap.current.set(data.id, marker);
      }

      if (!focusOnMarkers) {
        marker.addListener('dragend', () => {
          const newPosition = marker.getPosition();
          if (newPosition) {
            setMarkerData((prevData) =>
              prevData.map((m, i) =>
                i === idx
                  ? { ...m, lat: newPosition.lat(), lng: newPosition.lng() }
                  : m
              )
            );
          }
        });
      } else if (data.id) {
        marker.addListener('click', () => {
          highlightPin(data.id!);
        });
      }

      currentGoogleMarkers.current.push(marker);
    });

    onMarkersChange?.(markerData);
  }, [markerData, onMarkersChange, highlightedPinId, createPinIcon, focusOnMarkers, highlightPin]);

  useImperativeHandle(ref, () => ({
    getMarkers: () => markerData,
    addMarkers,
    setMarkers,
    removePinAt,
    deleteLastPin,
    clearAllPins,
    highlightPin,
    showInfoWindow,
    recenterToUser,
    fitAllPins,
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.google && mapDivRef.current && !mapRef.current) {
        initializeMap();
      } else if (mapRef.current && window.google) {
        window.google.maps.event.trigger(mapRef.current, 'resize');
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [initializeMap]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        currentGoogleMarkers.current.forEach((marker) => marker.setMap(null));
        currentGoogleMarkers.current = [];
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div
        id="map"
        ref={mapDivRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f2eee2',
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: '#5B7365',
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          Loading field map…
        </div>
      </div>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`}
        strategy="afterInteractive"
        onLoad={() => {
          if (window.google && mapDivRef.current) {
            initializeMap();
          } else {
            setTimeout(() => {
              if (window.google && mapDivRef.current) {
                initializeMap();
              }
            }, 600);
          }
        }}
        onError={(e) => {
          console.error('Failed to load Google Maps script:', e);
        }}
      />
    </>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;
