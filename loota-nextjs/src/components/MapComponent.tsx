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
  deleteLastPin: () => void;
  clearAllPins: () => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

const MapComponent = forwardRef<MapComponentRef, {}>((props, ref) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [markerData, setMarkerData] = useState<MapMarker[]>([]); // Stores only marker data
  const currentGoogleMarkers = useRef<google.maps.Marker[]>([]); // Stores actual Google Maps Marker objects
  const coordinatesDisplayRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null); // Ref for the map div
  const [mapInitialized, setMapInitialized] = useState(false); // New state to track map initialization

  console.log("MapComponent rendering...");

  const updateCoordinatesDisplay = useCallback(() => {
    if (coordinatesDisplayRef.current) {
      const coordText = markerData.map((marker, index) => {
        return `Pin ${index + 1}: Latitude: ${marker.lat.toFixed(6)}, Longitude: ${marker.lng.toFixed(6)}`;
      }).join('<br>');
      coordinatesDisplayRef.current.innerHTML = coordText;
    }
  }, [markerData]);

  const addMarker = useCallback((location: google.maps.LatLng) => {
    setMarkerData((prevData) => [
      ...prevData,
      { lat: location.lat(), lng: location.lng() }
    ]);
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

    const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York City as a fallback

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
      if (event.latLng) { // Ensure latLng is not null
        addMarker(event.latLng);
      }
    });
    setMapInitialized(true); // Mark map as initialized
    console.log("Map initialized successfully.");
  }, [addMarker, handleLocationError, mapInitialized]);

  // Effect to synchronize Google Maps markers with markerData state
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers from the map
    currentGoogleMarkers.current.forEach(marker => marker.setMap(null));
    currentGoogleMarkers.current = []; // Clear the ref array

    // Add new markers based on markerData
    markerData.forEach(data => {
      const marker = new window.google.maps.Marker({
        position: data,
        map: mapRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener('dragend', () => {
        // Update markerData when a marker is dragged
        setMarkerData(prevData => prevData.map(m => 
          m.lat === data.lat && m.lng === data.lng // Simple check, consider unique IDs for robust updates
            ? { lat: marker.getPosition()?.lat() || 0, lng: marker.getPosition()?.lng() || 0 }
            : m
        ));
      });
      currentGoogleMarkers.current.push(marker);
    });

    updateCoordinatesDisplay(); // Update display after markers are synchronized
  }, [markerData, updateCoordinatesDisplay]); // Re-run when markerData changes

  useEffect(() => {
    coordinatesDisplayRef.current = document.getElementById('coordinates-display') as HTMLDivElement;
  }, []);

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
    getMarkers: () => markerData, // Return the data, not the Google Maps objects
    deleteLastPin,
    clearAllPins,
  }));

  return (
    <>
      <div className="map-and-list-container">
        <div id="map-container" style={{ height: '500px', flex: '0 0 65%', marginRight: '20px' }}>
          <div id="map" ref={mapDivRef} style={{ width: '100%', height: '100%' }}></div>
        </div>
        <div className="list-wrapper">
          <div id="coordinates-display" ref={coordinatesDisplayRef}></div>
          {/* Buttons are now handled by parent component */}
        </div>
      </div>
      {/* Use next/script for optimized loading */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&mapId=LOOTA_MAP_ID`}
        strategy="afterInteractive" // Load after the page is interactive
        onLoad={() => {
          console.log('Google Maps Script loaded successfully!');
          // Trigger map initialization after script is loaded and window.google is available
          if (window.google && mapDivRef.current) { // Ensure mapDivRef.current is also available
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
