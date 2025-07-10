'use client';

import React, { useState, useRef, useCallback } from 'react';
import MapComponent, { MapComponentRef, MapMarker } from '../components/MapComponent';
import ProximityComponent, { ProximityComponentRef, ProximityMarkerData } from '../components/ProximityComponent';

export default function Home() {
  const [currentHuntType, setCurrentHuntType] = useState<'geolocation' | 'proximity'>('geolocation');
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [huntName, setHuntName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const resultUrlRef = useRef<HTMLSpanElement | null>(null);
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isLoading, setIsLoading] = useState(false); // New loading state

  const mapComponentRef = useRef<MapComponentRef>(null);
  const proximityComponentRef = useRef<ProximityComponentRef>(null);

  const handleHuntTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentHuntType(event.target.value as 'geolocation' | 'proximity');
  };

  const copyToClipboard = useCallback((text: string, buttonElement: HTMLButtonElement) => {
    if (!navigator.clipboard) {
      alert("Clipboard API not available. Please copy the link manually.");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      buttonElement.textContent = 'Copied!';
      setTimeout(() => {
        buttonElement.textContent = 'Copy Link';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert("Failed to copy the link. Please copy it manually.");
    });
  }, []);

  const generateLootLink = useCallback(async () => {
    setIsLoading(true); // Start loading

    let huntData: MapMarker[] | ProximityMarkerData[] | null = null;

    if (currentHuntType === 'geolocation') {
      huntData = mapComponentRef.current?.getMarkers() || [];
      if (huntData.length === 0) {
        alert("Please drop at least one treasure pin on the map first!");
        setIsLoading(false); // Stop loading on error
        return;
      }
    } else if (currentHuntType === 'proximity') {
      huntData = proximityComponentRef.current?.getMarkers() || [];
      if (huntData.length === 0) {
        alert("Please place at least one proximity marker first!");
        setIsLoading(false); // Stop loading on error
        return;
      }
    }

    // Ensure huntData is not null before proceeding with the API call
    if (huntData === null) {
      alert("No hunt data available to create a link.");
      setIsLoading(false); // Stop loading on error
      return;
    }

    // For demonstration, using a placeholder creatorId.
    // In a real application, this would come from user authentication/session.
    const creatorId = "a1b2c3d4-e5f6-7890-1234-000000000001"; // Placeholder UUID for creator

    try {
      const response = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: huntName.trim() || null,
          type: currentHuntType,
          creatorId: creatorId, // Include the creatorId
          creatorName: userName.trim() || 'Anonymous Creator',
          pins: huntData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create hunt');
      }

      const { huntId } = await response.json();
      const fullUrl = `${window.location.origin}/hunt/${huntId}`;
      
      if (resultUrlRef.current) {
        resultUrlRef.current.textContent = fullUrl;
        resultUrlRef.current.setAttribute('href', fullUrl);
        resultUrlRef.current.setAttribute('target', "_blank");
      }

      if (copyButtonRef.current) {
        copyButtonRef.current.style.display = 'inline-block';
        copyButtonRef.current.textContent = 'Copy Link';
        copyButtonRef.current.onclick = () => copyToClipboard(fullUrl, copyButtonRef.current!);
      }
      console.log("Generated Loota URL:", fullUrl);
    } catch (error) {
      console.error("Error generating loot link:", error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false); // Stop loading regardless of success or failure
    }
  }, [currentHuntType, huntName, userName, copyToClipboard]);

  return (
    <>
      <header style={{ padding: '10px 0', textAlign: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '700' }}>Loota</h1>
      </header>

      <main style={{ padding: '10px 20px' }}>
        <div className="intro-text" style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', fontWeight: '600' }}>
            Run Your Own AR Treasure Hunt
          </h2>
          <p style={{ fontSize: '14px', margin: '0', color: '#666', lineHeight: '1.4' }}>
            Place virtual treasures anywhere in the real world. Drop pins, generate a link, and let the hunt begin!
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          maxWidth: '600px', 
          margin: '0 auto 15px auto',
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Hunt Type:</div>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="radio"
                name="huntType"
                value="geolocation"
                checked={currentHuntType === 'geolocation'}
                onChange={handleHuntTypeChange}
              />
              Map-based
            </label>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="radio"
                name="huntType"
                value="proximity"
                checked={currentHuntType === 'proximity'}
                onChange={handleHuntTypeChange}
              />
              Proximity
            </label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: '600' }}>Hunt Name:</label>
            <input
              type="text"
              value={huntName}
              onChange={(e) => setHuntName(e.target.value)}
              placeholder="Enter hunt name..."
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '180px'
              }}
              maxLength={100}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: '600' }}>Your Name:</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name..."
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '180px'
              }}
              maxLength={100}
            />
          </div>
        </div>

        {currentHuntType === 'geolocation' && (
          <div className="map-and-list-container" style={{ marginBottom: '15px' }}>
            <div style={{ flex: '2', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                Place Pins on Map
              </h3>
              <MapComponent ref={mapComponentRef} onMarkersChange={setMapMarkers} />
            </div>
            <div className="list-wrapper">
              <h3 className="list-header" style={{ fontSize: '16px', margin: '0 0 10px 0', fontWeight: '600' }}>
                Treasure Locations
              </h3>
              <div id="coordinates-display" style={{ minHeight: '120px' }}>
                {mapMarkers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px 15px', fontSize: '13px' }}>
                    Click on the map to place your first treasure pin!
                  </div>
                ) : (
                  mapMarkers.map((marker, index) => (
                    <div key={index} className="pin-item" style={{ marginBottom: '8px', fontSize: '12px' }}>
                      <div className="pin-number" style={{ fontSize: '13px', fontWeight: '600' }}>Pin #{index + 1}</div>
                      <div className="pin-coordinates" style={{ fontSize: '11px', color: '#666' }}>
                        <span>Lat: <span className="coordinate-value">{marker.lat.toFixed(4)}</span></span>
                        <span> Lng: <span className="coordinate-value">{marker.lng.toFixed(4)}</span></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="list-controls" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => mapComponentRef.current?.deleteLastPin()}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Delete Last
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => mapComponentRef.current?.clearAllPins()}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
        
        {currentHuntType === 'proximity' && (
          <div style={{ marginBottom: '15px' }}>
            <ProximityComponent ref={proximityComponentRef} />
            <div className="list-controls" style={{ justifyContent: 'center', marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => proximityComponentRef.current?.deleteLastProximityMarker()}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Delete Last
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => proximityComponentRef.current?.clearAllProximityMarkers()}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        <div className="controls" style={{ textAlign: 'center', marginBottom: '15px' }}>
          <button 
            id="encourage-button" 
            className="btn btn-primary" 
            onClick={generateLootLink} 
            disabled={isLoading}
            style={{ fontSize: '16px', padding: '10px 20px', fontWeight: '600' }}
          >
            {isLoading ? 'Generating...' : 'Encourage Looting'}
            {isLoading && <span className="spinner"></span>}
          </button>
        </div>

        <div id="result-area" style={{ textAlign: 'center', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
          <div style={{ marginBottom: '8px' }}>Your treasure hunt link will appear here:</div>
          <div>
            <span id="result-url" ref={resultUrlRef} style={{ fontSize: '13px', color: '#0066cc' }}></span>
            <button 
              id="copy-button" 
              className="btn btn-primary" 
              style={{ display: 'none', marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }} 
              ref={copyButtonRef}
            >
              Copy Link
            </button>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#888' }}>
        &copy; 2025 Loota
      </footer>
    </>
  );
}
