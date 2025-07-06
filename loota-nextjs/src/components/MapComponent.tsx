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
}

export interface MapComponentRef {
  getMarkers: () => MapMarker[];
  addMarkers: (markers: MapMarker[]) => void; // Add this line
  deleteLastPin: () => void;
  clearAllPins: () => void;
}

interface MapComponentProps {
  initialMarkers?: MapMarker[]; // Add this prop
  onMarkersChange?: (markers: MapMarker[]) => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>((
  { initialMarkers = [], onMarkersChange }, // Destructure initialMarkers with a default empty array
  ref
) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [markerData, setMarkerData] = useState<MapMarker[]>(initialMarkers); // Initialize with initialMarkers
  const currentGoogleMarkers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  console.log("MapComponent rendering...");

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
    if (mapInitialized) {
      console.log("Map already initialized, skipping.");
      return;
    }

    if (!mapDivRef.current || !window.google) {
      console.warn("Map div ref or Google Maps API not ready for initialization.");
      return;
    }

    const defaultCenter = { lat: 40.7128, lng: -74.0060 };

    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      zoom: 19,
      center: defaultCenter,
      mapId: 'LOOTA_MAP_ID'
    });

    infoWindowRef.current = new window.google.maps.InfoWindow();

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

    mapRef.current?.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        addMarker(event.latLng);
      }
    });
    setMapInitialized(true);
    console.log("Map initialized successfully.");
  }, [addMarker, handleLocationError, mapInitialized]);

  useEffect(() => {
    if (!mapRef.current || !window.google.maps.marker) return;

    // Clear existing markers from the map
    currentGoogleMarkers.current.forEach(marker => marker.map = null);
    currentGoogleMarkers.current = []; // Clear the ref array

    // Add new markers based on markerData
    markerData.forEach(data => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: data,
        map: mapRef.current,
        gmpDraggable: true,
      });

      // Update markerData when a marker is dragged
      marker.addListener('dragend', () => {
        const newPosition = marker.position as google.maps.LatLng;
        if (newPosition) {
          setMarkerData(prevData => prevData.map(m =>
            m.lat === data.lat && m.lng === data.lng // Simple check, consider unique IDs for robust updates
              ? { lat: newPosition.lat(), lng: newPosition.lng() }
              : m
          ));
        }
      });
      currentGoogleMarkers.current.push(marker);
    });

    if (onMarkersChange) {
      onMarkersChange(markerData);
    }
  }, [markerData, onMarkersChange]);

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

  useImperativeHandle(ref, () => ({
    getMarkers: () => markerData,
    addMarkers, // Expose addMarkers
    deleteLastPin,
    clearAllPins,
  }));

  return (
    <>
      <div className="map-container">
        <div id="map" ref={mapDivRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&mapId=LOOTA_MAP_ID&libraries=marker`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Maps Script loaded successfully!');
          if (window.google && mapDivRef.current) {
            initializeMap();
          } else {
            console.warn("Map div ref or window.google not ready on script load.");
          }
        }}
        onError={(e) => {
          console.error("Failed to load Google Maps script:", e);
          const mapContainer = document.getElementById('map-container');
          if (mapContainer) {
            mapContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error: Failed to load Google Maps. Check the console for details.</p>';
          }
        }}
      />
    </>
  );
});

MapComponent.displayName = 'MapComponent'; // Add display name for forwardRef

export default MapComponent;
