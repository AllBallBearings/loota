'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import MapComponent, { MapComponentRef, MapMarker } from '../components/MapComponent';
import ProximityComponent, { ProximityComponentRef, ProximityMarkerData } from '../components/ProximityComponent';

// Modern Icon Components (placeholder until Heroicons are installed)
const ModernIcons = {
  Map: () => <span className="text-xl">🗺️</span>,
  Radio: () => <span className="text-xl">📡</span>,
  Treasure: () => <span className="text-xl">💎</span>,
  Sparkles: () => <span className="text-xl">✨</span>,
  User: () => <span className="text-xl">👤</span>,
  Copy: () => <span className="text-xl">📋</span>,
  Check: () => <span className="text-xl">✅</span>,
  Trash: () => <span className="text-xl">🗑️</span>,
  X: () => <span className="text-xl">❌</span>,
  Pin: () => <span className="text-xl">📍</span>,
  Target: () => <span className="text-xl">🎯</span>,
  Adventure: () => <span className="text-xl">🧭</span>,
  Magic: () => <span className="text-xl">🔮</span>,
};

export default function ModernHome() {
  const [currentHuntType, setCurrentHuntType] = useState<'geolocation' | 'proximity'>('geolocation');
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [huntName, setHuntName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [creatorPhone, setCreatorPhone] = useState<string>('');
  const [creatorEmail, setCreatorEmail] = useState<string>('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<'phone' | 'email'>('phone');
  const [existingUserData, setExistingUserData] = useState<{phone?: string; email?: string} | null>(null);
  const [useExistingContact, setUseExistingContact] = useState<boolean>(true);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);

  const mapComponentRef = useRef<MapComponentRef>(null);
  const proximityComponentRef = useRef<ProximityComponentRef>(null);

  // Check for existing user data on component mount
  useEffect(() => {
    const checkExistingUser = async () => {
      const creatorId = "a1b2c3d4-e5f6-7890-1234-000000000001"; // Same ID used in generateLootLink
      
      try {
        const response = await fetch(`/api/users/${creatorId}`, {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.phone || userData.email) {
            setExistingUserData({
              phone: userData.phone,
              email: userData.email,
            });
            
            // Pre-populate form with existing data if user chooses to use it
            if (userData.phone) setCreatorPhone(userData.phone);
            if (userData.email) setCreatorEmail(userData.email);
          }
        }
      } catch (error) {
        console.log('No existing user data found or error fetching:', error);
      }
    };

    checkExistingUser();
  }, []);

  const handleContactMethodToggle = (useExisting: boolean) => {
    setUseExistingContact(useExisting);
    
    if (useExisting && existingUserData) {
      // Use existing contact information
      if (existingUserData.phone) setCreatorPhone(existingUserData.phone);
      if (existingUserData.email) setCreatorEmail(existingUserData.email);
    } else {
      // Clear form for new contact information
      setCreatorPhone('');
      setCreatorEmail('');
    }
  };

  const handleHuntTypeChange = (type: 'geolocation' | 'proximity') => {
    setCurrentHuntType(type);
    // Reset generated URL when switching hunt types
    setGeneratedUrl('');
    setCopyStatus('idle');
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, []);

  const generateLootLink = useCallback(async () => {
    setIsLoading(true);
    setGeneratedUrl('');

    // Validate required contact information
    if (!creatorPhone.trim() || !creatorEmail.trim()) {
      alert("Please provide both phone number and email address.");
      setIsLoading(false);
      return;
    }

    let huntData: MapMarker[] | ProximityMarkerData[] | null = null;

    if (currentHuntType === 'geolocation') {
      huntData = mapComponentRef.current?.getMarkers() || [];
      if (huntData.length === 0) {
        alert("Please drop at least one treasure pin on the map first!");
        setIsLoading(false);
        return;
      }
    } else if (currentHuntType === 'proximity') {
      huntData = proximityComponentRef.current?.getMarkers() || [];
      if (huntData.length === 0) {
        alert("Please place at least one proximity marker first!");
        setIsLoading(false);
        return;
      }
    }

    if (huntData === null) {
      alert("No hunt data available to create a link.");
      setIsLoading(false);
      return;
    }

    const creatorId = "a1b2c3d4-e5f6-7890-1234-000000000001";

    try {
      const response = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: huntName.trim() || null,
          type: currentHuntType,
          creatorId: creatorId,
          creatorName: userName.trim() || 'Anonymous Creator',
          creatorPhone: creatorPhone.trim(),
          creatorEmail: creatorEmail.trim(),
          preferredContactMethod: preferredContactMethod,
          pins: huntData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create hunt');
      }

      const { huntId } = await response.json();
      const fullUrl = `${window.location.origin}/hunt/${huntId}`;
      
      setGeneratedUrl(fullUrl);
      console.log("Generated Loota URL:", fullUrl);
    } catch (error) {
      console.error("Error generating loot link:", error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentHuntType, huntName, userName, creatorPhone, creatorEmail, preferredContactMethod]);

  return (
    <div className="main-layout bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800">
      {/* Modern Header */}
      <header className="nav-header">
        <div className="container-modern">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <ModernIcons.Adventure />
              <h1 className="text-3xl md:text-4xl font-bold">
                Loota
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <ModernIcons.Magic />
              <span>AR Treasure Hunts</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-area">
        <div className="container-tight">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
              Create Your Own AR Treasure Hunt
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-pretty">
              Place virtual treasures anywhere in the real world. Drop pins, generate a link, and let the adventure begin!
            </p>
          </div>

          {/* Configuration Card */}
          <div className="card card-hover mb-8 p-6 animate-slide-up">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ModernIcons.Target />
              Hunt Configuration
            </h3>
            
            {/* Hunt Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Hunt Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleHuntTypeChange('geolocation')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    currentHuntType === 'geolocation'
                      ? 'border-adventure-500 bg-adventure-50 dark:bg-adventure-900/20'
                      : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ModernIcons.Map />
                    <div className="text-left">
                      <div className="font-semibold">Map-based</div>
                      <div className="text-sm text-slate-500">GPS location hunt</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleHuntTypeChange('proximity')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    currentHuntType === 'proximity'
                      ? 'border-adventure-500 bg-adventure-50 dark:bg-adventure-900/20'
                      : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ModernIcons.Radio />
                    <div className="text-left">
                      <div className="font-semibold">Proximity</div>
                      <div className="text-sm text-slate-500">Relative positioning</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Hunt Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Hunt Name
                </label>
                <input
                  type="text"
                  value={huntName}
                  onChange={(e) => setHuntName(e.target.value)}
                  placeholder="Enter hunt name..."
                  className="input"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  className="input"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t border-slate-200 dark:border-dark-700 pt-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ModernIcons.User />
                Contact Information (Required)
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Your preferred contact method will be shared with winners so they can reach you to collect their prize.
              </p>

              {/* Existing Contact Information Toggle */}
              {existingUserData && (existingUserData.phone || existingUserData.email) && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    We found your saved contact information
                  </h5>
                  <div className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    {existingUserData.phone && <div>Phone: {existingUserData.phone}</div>}
                    {existingUserData.email && <div>Email: {existingUserData.email}</div>}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleContactMethodToggle(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        useExistingContact
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-dark-800 text-blue-600 border border-blue-300'
                      }`}
                    >
                      Use Saved Info
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContactMethodToggle(false)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !useExistingContact
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-dark-800 text-blue-600 border border-blue-300'
                      }`}
                    >
                      Enter New Info
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={creatorPhone}
                    onChange={(e) => setCreatorPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="input"
                    disabled={useExistingContact && Boolean(existingUserData?.phone)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input"
                    disabled={useExistingContact && Boolean(existingUserData?.email)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Preferred Contact Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPreferredContactMethod('phone')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      preferredContactMethod === 'phone'
                        ? 'border-adventure-500 bg-adventure-50 dark:bg-adventure-900/20'
                        : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg mb-1">📱</div>
                      <div className="font-medium">Phone</div>
                      <div className="text-xs text-slate-500">Text/Call</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPreferredContactMethod('email')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      preferredContactMethod === 'email'
                        ? 'border-adventure-500 bg-adventure-50 dark:bg-adventure-900/20'
                        : 'border-slate-200 dark:border-dark-700 hover:border-slate-300 dark:hover:border-dark-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg mb-1">📧</div>
                      <div className="font-medium">Email</div>
                      <div className="text-xs text-slate-500">Messages</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hunt Interface */}
          {currentHuntType === 'geolocation' && (
            <div className="grid grid-cols-1 lg-grid-cols-3 gap-8 mb-8">
              {/* Map Component */}
              <div className="lg-col-span-2">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ModernIcons.Pin />
                    Place Treasure Locations
                  </h3>
                  <div className="map-container-modern" style={{ height: '600px' }}>
                    <MapComponent ref={mapComponentRef} onMarkersChange={setMapMarkers} />
                  </div>
                </div>
              </div>

              {/* Treasure List */}
              <div className="card">
                <div className="p-6 border-b border-slate-200 dark:border-dark-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ModernIcons.Treasure />
                    Treasure Locations
                  </h3>
                </div>
                
                <div className="p-6">
                  {mapMarkers.length === 0 ? (
                    <div className="text-center py-8">
                      <ModernIcons.Target />
                      <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Click on the map to place your first treasure pin!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mapMarkers.map((marker, index) => (
                        <div key={index} className="card p-4 border-l-4 border-l-treasure-500">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              📍 Treasure #{index + 1}
                            </div>
                            <span className="status-indicator status-error">
                              <ModernIcons.Target />
                              Available
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                            {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-dark-700">
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-secondary flex-1"
                      onClick={() => mapComponentRef.current?.deleteLastPin()}
                    >
                      <ModernIcons.Trash />
                      Delete Last
                    </button>
                    <button 
                      className="btn btn-danger flex-1"
                      onClick={() => mapComponentRef.current?.clearAllPins()}
                    >
                      <ModernIcons.X />
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentHuntType === 'proximity' && (
            <div className="card mb-8">
              <div className="p-6 border-b border-slate-200 dark:border-dark-700">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ModernIcons.Radio />
                  Proximity Interface
                </h3>
              </div>
              
              <div className="p-6">
                <div style={{ width: '100%', minHeight: '600px', position: 'relative' }}>
                  <ProximityComponent ref={proximityComponentRef} />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-dark-700">
                <div className="flex justify-center gap-4">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => proximityComponentRef.current?.deleteLastProximityMarker()}
                  >
                    <ModernIcons.Trash />
                    Delete Last
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => proximityComponentRef.current?.clearAllProximityMarkers()}
                  >
                    <ModernIcons.X />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="text-center mb-8">
            <button 
              className="btn btn-treasure text-lg px-8 py-4 animate-pulse-glow"
              onClick={generateLootLink} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" />
                  Generating Hunt...
                </>
              ) : (
                <>
                  <ModernIcons.Sparkles />
                  Start the Adventure
                </>
              )}
            </button>
          </div>

          {/* Result Area */}
          {generatedUrl && (
            <div className="card card-glow p-6 animate-slide-up">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ModernIcons.Check />
                Your Treasure Hunt is Ready!
              </h3>
              
              <div className="bg-slate-50 dark:bg-dark-800 rounded-xl p-4 mb-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Share this link to start the hunt:
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-adventure-600 dark:text-adventure-400 hover:text-adventure-700 dark:hover:text-adventure-300 font-mono text-sm break-all flex-1"
                  >
                    {generatedUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(generatedUrl)}
                    className={`btn ${copyStatus === 'copied' ? 'btn-success' : 'btn-secondary'} px-4 py-2`}
                    disabled={copyStatus === 'copied'}
                  >
                    {copyStatus === 'copied' ? (
                      <>
                        <ModernIcons.Check />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ModernIcons.Copy />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400">
                Share this link with friends to let them join your treasure hunt adventure!
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 dark:border-dark-700">
        <div className="container-modern py-8">
          <div className="text-center text-slate-600 dark:text-slate-400">
            <p>&copy; 2025 Loota - Adventure Awaits</p>
          </div>
        </div>
      </footer>
    </div>
  );
}