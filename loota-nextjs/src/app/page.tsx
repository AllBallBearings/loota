'use client';

import React, { useState, useRef, useCallback } from 'react';
import MapComponent, { MapComponentRef, MapMarker } from '../components/MapComponent';
import ProximityComponent, { ProximityComponentRef, ProximityMarkerData } from '../components/ProximityComponent';

export default function Home() {
  const [currentHuntType, setCurrentHuntType] = useState<'geolocation' | 'proximity'>('geolocation');
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
          type: currentHuntType,
          creatorId: creatorId, // Include the creatorId
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
  }, [currentHuntType, copyToClipboard]);

  return (
    <>
      <header>
        <h1>Loota</h1>
      </header>

      <main>
        <div className="intro-text">
          <h2>Run Your Own Augmented Reality Treasure Hunt</h2>
          <p>
            Welcome to Loota! Place virtual treasures anywhere in the real world
            for your friends, fans, or community to find. Drop pins on the map
            below to mark your treasure locations. When you&apos;re ready, click
            &quot;Encourage Looting&quot; to generate a unique link for your hunt!
          </p>
        </div>

        <div
          className="hunt-type-selector"
          style={{ textAlign: 'center', marginBottom: '20px' }}
        >
          <h3>Choose Your Hunt Type:</h3>
          <label>
            <input
              type="radio"
              name="huntType"
              value="geolocation"
              checked={currentHuntType === 'geolocation'}
              onChange={handleHuntTypeChange}
            />
            Geolocation (Map-based)
          </label>
          <label style={{ marginLeft: '20px' }}>
            <input
              type="radio"
              name="huntType"
              value="proximity"
              checked={currentHuntType === 'proximity'}
              onChange={handleHuntTypeChange}
            />
            Proximity (Relative to Player)
          </label>
        </div>

        {currentHuntType === 'geolocation' && <MapComponent ref={mapComponentRef} />}
        {currentHuntType === 'proximity' && <ProximityComponent ref={proximityComponentRef} />}

        {/* Common controls for both hunt types */}
        <div className="list-controls">
          {currentHuntType === 'geolocation' && (
            <>
              <button id="delete-last-button" className="btn btn-secondary" onClick={() => mapComponentRef.current?.deleteLastPin()}>
                Delete Last Pin
              </button>
              <button id="clear-all-button" className="btn btn-danger" onClick={() => mapComponentRef.current?.clearAllPins()}>
                Clear All Pins
              </button>
            </>
          )}
          {currentHuntType === 'proximity' && (
            <>
              <button id="delete-last-proximity-button" className="btn btn-secondary" onClick={() => proximityComponentRef.current?.deleteLastProximityMarker()}>
                Delete Last Marker
              </button>
              <button id="clear-all-proximity-button" className="btn btn-danger" onClick={() => proximityComponentRef.current?.clearAllProximityMarkers()}>
                Clear All Markers
              </button>
            </>
          )}
        </div>

        <div className="controls">
          <button id="encourage-button" className="btn btn-primary" onClick={generateLootLink} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Encourage Looting'}
            {isLoading && <span className="spinner"></span>}
          </button>
        </div>

        <div id="result-area">
          Your treasure hunt link will appear here:
          <span id="result-url" ref={resultUrlRef}></span>
          <button id="copy-button" className="btn btn-primary" style={{ display: 'none' }} ref={copyButtonRef}>
            Copy Link
          </button>
        </div>
      </main>

      <footer>&copy; 2025 Loota - Spreading Joy Through Discovery</footer>
    </>
  );
}
