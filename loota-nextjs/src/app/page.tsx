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

    // Validate required fields
    if (!huntName.trim()) {
      alert("Please provide a hunt name.");
      setIsLoading(false);
      return;
    }

    if (!userName.trim()) {
      alert("Please provide your name.");
      setIsLoading(false);
      return;
    }

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
        alert("Please drop at least one loota pin on the map first!");
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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold">
                  Loota
                </h1>
                <div className="text-reel">
                  <div className="text-reel-content">
                    <span className="text-2xl md:text-3xl font-bold text-yellow-400">&nbsp;</span>
                    <span className="text-2xl md:text-3xl font-bold text-yellow-400">dollar</span>
                    <span className="text-2xl md:text-3xl font-bold text-yellow-400">dubloon</span>
                    <span className="text-2xl md:text-3xl font-bold text-yellow-400">dream</span>
                    <span className="text-2xl md:text-3xl font-bold text-yellow-400">&nbsp;</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Tue, 07 June 2022
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                  🔔
                </button>
                <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                  👤
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Two-Panel Layout */}
      <main className="flex-1 flex">
        {/* Left Sidebar - Hunt Configuration */}
        <div className="w-80 filter-sidebar flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6">
              <ModernIcons.Target />
              <h2 className="text-lg font-semibold text-white">Hunt Configuration</h2>
            </div>

            {/* Hunt Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hunt Type
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="huntType"
                    value="geolocation"
                    checked={currentHuntType === 'geolocation'}
                    onChange={(e) => handleHuntTypeChange(e.target.value as 'geolocation' | 'proximity')}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="ml-3 text-slate-300">🗺️ Location-based Hunt</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="huntType"
                    value="proximity"
                    checked={currentHuntType === 'proximity'}
                    onChange={(e) => handleHuntTypeChange(e.target.value as 'geolocation' | 'proximity')}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="ml-3 text-slate-300">📡 Proximity Hunt</span>
                </label>
              </div>
            </div>

            {/* Hunt Details */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hunt Name *
              </label>
              <input
                type="text"
                value={huntName}
                onChange={(e) => setHuntName(e.target.value)}
                placeholder="Enter hunt name..."
                className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                maxLength={100}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name..."
                className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                maxLength={100}
                required
              />
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <ModernIcons.User />
                Contact Information
              </h4>

              {/* Existing Contact Information Toggle */}
              {existingUserData && (existingUserData.phone || existingUserData.email) && (
                <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h5 className="font-medium text-blue-100 mb-2 text-sm">
                    Found your saved contact info
                  </h5>
                  <div className="text-xs text-blue-200 mb-2">
                    {existingUserData.phone && <div>Phone: {existingUserData.phone}</div>}
                    {existingUserData.email && <div>Email: {existingUserData.email}</div>}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleContactMethodToggle(true)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        useExistingContact
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-blue-300 border border-blue-600'
                      }`}
                    >
                      Use Saved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContactMethodToggle(false)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        !useExistingContact
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-blue-300 border border-blue-600'
                      }`}
                    >
                      Enter New
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={creatorPhone}
                    onChange={(e) => setCreatorPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                    disabled={useExistingContact && Boolean(existingUserData?.phone)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                    disabled={useExistingContact && Boolean(existingUserData?.email)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2">Preferred Contact</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="preferredContactMethod"
                        value="phone"
                        checked={preferredContactMethod === 'phone'}
                        onChange={(e) => setPreferredContactMethod(e.target.value as 'phone')}
                        className="w-3 h-3 text-green-600"
                      />
                      <span className="ml-2 text-xs text-slate-300">📱 Phone</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="preferredContactMethod"
                        value="email"
                        checked={preferredContactMethod === 'email'}
                        onChange={(e) => setPreferredContactMethod(e.target.value as 'email')}
                        className="w-3 h-3 text-green-600"
                      />
                      <span className="ml-2 text-xs text-slate-300">📧 Email</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Button - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 border-t border-slate-600">
            <button 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
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

            {/* Result Area */}
            {generatedUrl && (
              <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <ModernIcons.Check />
                  Hunt Ready!
                </h4>
                
                <div className="bg-slate-800 rounded p-2 mb-2">
                  <div className="text-xs text-slate-400 mb-1">Share this link:</div>
                  <div className="flex items-center gap-2">
                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-yellow-300 font-mono text-xs break-all flex-1 underline"
                    >
                      {generatedUrl}
                    </a>
                    <button
                      onClick={() => copyToClipboard(generatedUrl)}
                      className={`px-2 py-1 rounded text-xs ${copyStatus === 'copied' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'}`}
                      disabled={copyStatus === 'copied'}
                    >
                      {copyStatus === 'copied' ? '✓' : <ModernIcons.Copy />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Share with friends to join your hunt!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Hunt Interface and Locations */}
        <div className="flex-1 flex flex-col">
          {/* Hunt Interface and Locations */}
          <div className="flex-1 flex">
            {/* Locations List */}
            <div className="w-80 results-list overflow-y-auto">
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ModernIcons.Treasure />
                  {currentHuntType === 'geolocation' ? 'Loot Locations' : 'Proximity Markers'}
                  {currentHuntType === 'geolocation' && (
                    <span className="text-sm text-gray-500">({mapMarkers.length})</span>
                  )}
                </h4>

                {currentHuntType === 'geolocation' ? (
                  mapMarkers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ModernIcons.Target />
                      <p className="mt-2 text-sm">Click on the map to place your first treasure location!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mapMarkers.map((marker, index) => (
                        <div key={index} className="result-card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-slate-100 flex items-center gap-2">
                              📍 Location #{index + 1}
                            </div>
                            <span className="status-badge text-xs px-2 py-1 rounded">Available</span>
                          </div>
                          <div className="text-xs text-slate-300 font-mono">
                            {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-3 rounded flex items-center justify-center gap-1"
                            onClick={() => mapComponentRef.current?.deleteLastPin()}
                          >
                            <ModernIcons.Trash />
                            Delete Last
                          </button>
                          <button 
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm py-2 px-3 rounded flex items-center justify-center gap-1"
                            onClick={() => mapComponentRef.current?.clearAllPins()}
                          >
                            <ModernIcons.X />
                            Clear All
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4 text-gray-500">
                      <ModernIcons.Radio />
                      <p className="mt-2 text-sm">Use the proximity interface to place markers</p>
                    </div>
                    <div className="space-y-3">
                      <button 
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded flex items-center justify-center gap-2"
                        onClick={() => proximityComponentRef.current?.deleteLastProximityMarker()}
                      >
                        <ModernIcons.Trash />
                        Delete Last Marker
                      </button>
                      <button 
                        className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded flex items-center justify-center gap-2"
                        onClick={() => proximityComponentRef.current?.clearAllProximityMarkers()}
                      >
                        <ModernIcons.X />
                        Clear All Markers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hunt Interface */}
            <div className="flex-1 map-panel relative">
              {currentHuntType === 'geolocation' ? (
                <div className="absolute inset-0">
                  <MapComponent ref={mapComponentRef} onMarkersChange={setMapMarkers} />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <div className="w-full h-full relative">
                    <ProximityComponent ref={proximityComponentRef} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Original Hunt Configuration (Hidden for now) */}
      <div className="hidden">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hunt Configuration Panel */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ModernIcons.Target />
              Hunt Configuration
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}