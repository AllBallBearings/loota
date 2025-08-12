'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Script from 'next/script'; // Import Script from next/script

declare global {
  interface Window {
    google: typeof google; // Use typeof google for better type inference
  }
}

export interface MapMarker {
  lat: number;
  lng: number;
  id?: string;
  isCollected?: boolean;
  title?: string; // e.g., "Loot #1"
  description?: string; // Additional info to show in bubble
}

export interface MapComponentRef {
  getMarkers: () => MapMarker[];
  addMarkers: (markers: MapMarker[]) => void;
  deleteLastPin: () => void;
  clearAllPins: () => void;
  highlightPin: (pinId: string) => void;
  showInfoWindow: (pinId: string, title: string, description: string) => void;
}

interface MapComponentProps {
  initialMarkers?: MapMarker[];
  onMarkersChange?: (markers: MapMarker[]) => void;
  focusOnMarkers?: boolean; // If true, zoom to fit all markers instead of user location
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>((
  { initialMarkers = [], onMarkersChange, focusOnMarkers = false },
  ref
) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [markerData, setMarkerData] = useState<MapMarker[]>(initialMarkers); // Initialize with initialMarkers
  const currentGoogleMarkers = useRef<google.maps.Marker[]>([]);
  const markerPinMap = useRef<Map<string, google.maps.Marker>>(new Map());
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  console.log("MapComponent rendering...");

  // Function to create custom coin-like pin icons
  const createPinIcon = useCallback((isCollected: boolean, isHighlighted: boolean) => {
    const baseColor = isCollected ? '#FFD700' : '#FFC107'; // Gold variations
    const strokeColor = isHighlighted ? '#FF4444' : '#B8860B'; // Red for highlighted, dark gold for normal
    const strokeWeight = isHighlighted ? 4 : 2;
    const scale = isHighlighted ? 14 : 12;
    
    // Create a circular coin-like symbol
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: baseColor,
      fillOpacity: 1,
      strokeColor: strokeColor,
      strokeWeight: strokeWeight,
      scale: scale,
      anchor: new google.maps.Point(0, 0)
    };
  }, []);

  // Function to fit map bounds to show all markers
  const fitMapToMarkers = useCallback((markers: MapMarker[]) => {
    if (!mapRef.current || !window.google || markers.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach(marker => {
      bounds.extend(new window.google.maps.LatLng(marker.lat, marker.lng));
    });

    // Fit the map to the bounds
    mapRef.current.fitBounds(bounds);
    
    // Set a reasonable zoom limit (don't zoom in too much for single points)
    window.google.maps.event.addListenerOnce(mapRef.current, 'bounds_changed', () => {
      const zoom = mapRef.current?.getZoom();
      if (zoom && zoom > 18) {
        mapRef.current?.setZoom(18);
      }
    });
  }, []);

  const addMarker = useCallback((location: google.maps.LatLng) => {
    setMarkerData((prevData) => [
      ...prevData,
      { lat: location.lat(), lng: location.lng() }
    ]);
  }, []);

  const addMarkers = useCallback((markers: MapMarker[]) => {
    setMarkerData((prevData) => [...prevData, ...markers]);
  }, []);

  const handleLocationError = useCallback((browserHasGeolocation: boolean, infoWindow: google.maps.InfoWindow, pos: google.maps.LatLngLiteral) => {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
      browserHasGeolocation
        ? 'Error: The Geolocation service failed.'
        : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(mapRef.current);
  }, []);

  const initializeMap = useCallback(() => {
    console.log("Attempting to initialize map...");
    console.log("mapDivRef.current:", mapDivRef.current);
    console.log("window.google:", window.google);
    console.log("window.google.maps:", window.google?.maps);
    
    if (!mapDivRef.current || !window.google || !window.google.maps) {
      console.warn("Map div ref or Google Maps API not ready for initialization.");
      return;
    }

    // Clear the loading message
    mapDivRef.current.innerHTML = '';

    // Always reinitialize to handle component remounting
    if (mapRef.current) {
      console.log("Cleaning up existing map instance...");
      mapRef.current = null;
      currentGoogleMarkers.current.forEach(marker => marker.setMap(null));
      currentGoogleMarkers.current = [];
    }

    const defaultCenter = { lat: 40.7128, lng: -74.0060 };

    try {
      mapRef.current = new window.google.maps.Map(mapDivRef.current, {
        zoom: 18,
        center: defaultCenter,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      console.log("Map initialized successfully!");
    } catch (error) {
      console.error("Error initializing map:", error);
      if (mapDivRef.current) {
        mapDivRef.current.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error initializing map: ' + error + '</p>';
      }
      return;
    }

    // Choose initialization strategy based on focusOnMarkers prop
    if (focusOnMarkers && initialMarkers.length > 0) {
      // Focus on markers (hunt viewing mode)
      console.log("Focusing map on markers...");
      setTimeout(() => fitMapToMarkers(initialMarkers), 100);
    } else {
      // Focus on user location (creation mode)
      console.log("Focusing map on user location...");
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            mapRef.current?.setCenter(pos);
          },
          () => {
            if (infoWindowRef.current) {
              handleLocationError(true, infoWindowRef.current, mapRef.current?.getCenter()?.toJSON() || defaultCenter);
            }
          }
        );
      } else {
        if (infoWindowRef.current) {
          handleLocationError(false, infoWindowRef.current, mapRef.current?.getCenter()?.toJSON() || defaultCenter);
        }
      }
    }

    // Only allow adding markers if not in "view only" mode (focusOnMarkers is a proxy for this)
    if (!focusOnMarkers) {
      mapRef.current?.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          addMarker(event.latLng);
        }
      });
    }
    console.log("Map setup completed with click listener.");
  }, [addMarker, handleLocationError, focusOnMarkers, initialMarkers, fitMapToMarkers]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers from the map
    currentGoogleMarkers.current.forEach(marker => marker.setMap(null));
    currentGoogleMarkers.current = []; // Clear the ref array
    markerPinMap.current.clear(); // Clear the pin map

    // Add new markers based on markerData
    markerData.forEach(data => {
      const isHighlighted = highlightedPinId === data.id;
      const marker = new window.google.maps.Marker({
        position: { lat: data.lat, lng: data.lng },
        map: mapRef.current,
        draggable: !focusOnMarkers, // Only allow dragging in creation mode
        title: '', // Remove default tooltip
        icon: createPinIcon(data.isCollected || false, isHighlighted)
      });

      // Store marker data on the marker for later reference
      marker.set('markerData', data);

      // Store marker in our pin map if it has an ID
      if (data.id) {
        markerPinMap.current.set(data.id, marker);
      }

      // Update markerData when a marker is dragged
      marker.addListener('dragend', () => {
        const newPosition = marker.getPosition();
        if (newPosition) {
          setMarkerData(prevData => prevData.map(m =>
            m.lat === data.lat && m.lng === data.lng // Simple check, consider unique IDs for robust updates
              ? { ...m, lat: newPosition.lat(), lng: newPosition.lng() }
              : m
          ));
        }
      });

      // Remove click listener from markers - info window should only show from loot list clicks
      // marker.addListener('click', () => {
      //   if (data.title && data.description && data.id) {
      //     showInfoWindow(data.id, data.title, data.description);
      //   }
      // });
      
      currentGoogleMarkers.current.push(marker);
    });

    if (onMarkersChange) {
      onMarkersChange(markerData);
    }
  }, [markerData, onMarkersChange, highlightedPinId, createPinIcon, focusOnMarkers]);

  const deleteLastPin = useCallback(() => {
    setMarkerData((prevData) => {
      if (prevData.length > 0) {
        console.log("Last pin deleted.");
        return prevData.slice(0, -1);
      } else {
        console.log("No pins to delete.");
        return prevData;
      }
    });
  }, []);

  const clearAllPins = useCallback(() => {
    setMarkerData([]);
    console.log("All pins cleared.");
  }, []);

  const showInfoWindow = useCallback((pinId: string, title: string, description: string) => {
    const marker = markerPinMap.current.get(pinId);
    if (marker && infoWindowRef.current) {
      const markerData = marker.get('markerData') as MapMarker;
      const isCollected = markerData?.isCollected;
      
      const content = `
        <div style="
          padding: 16px; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-width: 280px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
        ">
          <div style="
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            margin-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
          ">
            <h3 style="
              margin: 0; 
              color: #1e293b; 
              font-size: 18px; 
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              📍 ${title}
            </h3>
            <span style="
              background: ${isCollected ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)'};
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            ">
              ${isCollected ? '✓ COLLECTED' : '🎯 AVAILABLE'}
            </span>
          </div>
          
          <div style="
            color: #475569; 
            font-size: 14px; 
            line-height: 1.6;
            background: #f1f5f9;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid ${isCollected ? '#f59e0b' : '#10b981'};
          ">
            ${description}
          </div>
          
          <div style="
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            text-align: center;
            font-style: italic;
          ">
            ${isCollected ? '🏆 This treasure has been claimed!' : '🗺️ Navigate to this location to collect!'}
          </div>
        </div>
      `;
      
      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open(mapRef.current, marker);
    }
  }, []);

  const highlightPin = useCallback((pinId: string) => {
    setHighlightedPinId(prevId => prevId === pinId ? null : pinId);
    
    // Update the marker icon to show highlight
    const marker = markerPinMap.current.get(pinId);
    if (marker) {
      const markerData = marker.get('markerData') as MapMarker;
      const isHighlighted = highlightedPinId !== pinId; // Will be the new state
      marker.setIcon(createPinIcon(markerData.isCollected || false, isHighlighted));
      
      // Center the map on the highlighted pin and show info window
      if (isHighlighted) {
        mapRef.current?.panTo(marker.getPosition()!);
        mapRef.current?.setZoom(Math.max(mapRef.current.getZoom() || 18, 18));
        
        // Show info window with marker data
        if (markerData.title && markerData.description) {
          showInfoWindow(pinId, markerData.title, markerData.description);
        }
      } else if (infoWindowRef.current) {
        // Close info window when unhighlighting
        infoWindowRef.current.close();
      }
    }
  }, [highlightedPinId, createPinIcon, showInfoWindow]);

  useImperativeHandle(ref, () => ({
    getMarkers: () => markerData,
    addMarkers, // Expose addMarkers
    deleteLastPin,
    clearAllPins,
    highlightPin,
    showInfoWindow,
  }));

  // Effect to reinitialize map when component becomes visible again
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.google && mapDivRef.current && !mapRef.current) {
        console.log("Reinitializing map after component switch...");
        initializeMap();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeMap]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        console.log("Cleaning up map on unmount...");
        currentGoogleMarkers.current.forEach(marker => marker.setMap(null));
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
          minHeight: '400px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ddd'
        }}
      >
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Loading Google Maps...
        </div>
      </div>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Maps Script loaded successfully!');
          console.log('window.google available:', !!window.google);
          console.log('mapDivRef.current available:', !!mapDivRef.current);
          if (window.google && mapDivRef.current) {
            console.log('Initializing map...');
            initializeMap();
          } else {
            console.warn("Map div ref or window.google not ready on script load.");
            setTimeout(() => {
              console.log('Retrying map initialization...');
              if (window.google && mapDivRef.current) {
                initializeMap();
              }
            }, 1000);
          }
        }}
        onError={(e) => {
          console.error("Failed to load Google Maps script:", e);
          if (mapDivRef.current) {
            mapDivRef.current.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Failed to load Google Maps. Check the console for details.</p>';
          }
        }}
      />
    </>
  );
});

MapComponent.displayName = 'MapComponent'; // Add display name for forwardRef

export default MapComponent;
