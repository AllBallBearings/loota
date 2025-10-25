'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import MapComponent, { MapComponentRef, MapMarker } from '../components/MapComponent';
import ProximityComponent, { ProximityComponentRef, ProximityMarkerData } from '../components/ProximityComponent';
import { Icons } from '../components/Icons';

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
    <div className="main-layout">
      {/* Modern Header */}
      <header className="nav-header">
        <div className="container-modern">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Icons.Adventure className="text-accent-cyan" size={28} />
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
              <div className="text-sm text-slate-300">
                Tue, 07 June 2022
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-200">
                  <Icons.Bell size={20} className="text-slate-200" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-200">
                  <Icons.User size={20} className="text-slate-200" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Two-Panel Layout */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar - Hunt Configuration */}
        <div className="filter-sidebar flex flex-col overflow-hidden w-full lg:w-80">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6">
              <Icons.Target className="text-slate-200" size={22} />
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
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--accent-violet)' }}
                  />
                  <span className="ml-3 text-slate-300 flex items-center gap-2">
                    <Icons.Map className="text-slate-200" size={18} />
                    Location-based Hunt
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="huntType"
                    value="proximity"
                    checked={currentHuntType === 'proximity'}
                    onChange={(e) => handleHuntTypeChange(e.target.value as 'geolocation' | 'proximity')}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--accent-violet)' }}
                  />
                  <span className="ml-3 text-slate-300 flex items-center gap-2">
                    <Icons.Proximity className="text-slate-200" size={18} />
                    Proximity Hunt
                  </span>
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
                className="input text-sm"
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
                className="input text-sm"
                maxLength={100}
                required
              />
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Icons.User className="text-slate-200" size={20} />
                Contact Information
              </h4>

              {/* Existing Contact Information Toggle */}
              {existingUserData && (existingUserData.phone || existingUserData.email) && (
                <div className="mb-5">
                  <div className="contact-card">
                    <div className="contact-card__header">
                      <div className="contact-card__title">
                        <Icons.Users className="contact-card__icon text-accent-cyan" size={20} />
                        Saved contact info
                      </div>
                      <span className="contact-card__badge">Auto-fill ready</span>
                    </div>
                    <div className="contact-card__details">
                      {existingUserData.phone && (
                        <div>
                          <span>Phone</span>
                          <strong>{existingUserData.phone}</strong>
                        </div>
                      )}
                      {existingUserData.email && (
                        <div>
                          <span>Email</span>
                          <strong>{existingUserData.email}</strong>
                        </div>
                      )}
                    </div>
                    <div className="contact-card__actions">
                      <button
                        type="button"
                        onClick={() => handleContactMethodToggle(true)}
                        className={`contact-card__button ${useExistingContact ? 'is-active' : ''}`}
                      >
                        Use Saved
                      </button>
                      <button
                        type="button"
                        onClick={() => handleContactMethodToggle(false)}
                        className={`contact-card__button ${!useExistingContact ? 'is-active' : ''}`}
                      >
                        Enter New
                      </button>
                    </div>
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
                    className="input text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                    className="input text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                        className="w-3 h-3"
                        style={{ accentColor: 'var(--accent-violet)' }}
                      />
                      <span className="ml-2 text-xs text-slate-300 flex items-center gap-1">
                        <Icons.Phone className="text-slate-300" size={14} />
                        Phone
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="preferredContactMethod"
                        value="email"
                        checked={preferredContactMethod === 'email'}
                        onChange={(e) => setPreferredContactMethod(e.target.value as 'email')}
                        className="w-3 h-3"
                        style={{ accentColor: 'var(--accent-violet)' }}
                      />
                      <span className="ml-2 text-xs text-slate-300 flex items-center gap-1">
                        <Icons.Email className="text-slate-300" size={14} />
                        Email
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Button - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 border-t border-slate-600/40">
            <button
              className={`btn btn-primary w-full text-base py-3 justify-center gap-2 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={generateLootLink}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: '22px', height: '22px' }} />
                  Generating Hunt...
                </>
              ) : (
                <>
                  <Icons.Sparkle className="text-slate-100" size={20} />
                  Start the Adventure
                </>
              )}
            </button>

            {/* Result Area */}
            {generatedUrl && (
              <div className="mt-4 card p-4">
                <h4 className="text-sm font-medium text-slate-100 mb-3 flex items-center gap-2">
                  <Icons.Check className="text-emerald-300" size={18} />
                  Hunt Ready!
                </h4>
                
                <div className="bg-black/30 rounded-lg p-3 mb-3 border border-white/10">
                  <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Share this link:</div>
                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href={generatedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-100 hover:text-accent-cyan font-mono break-all flex-1 underline"
                    >
                      {generatedUrl}
                    </a>
                    <button
                      onClick={() => copyToClipboard(generatedUrl)}
                      className={`px-2 py-1 rounded text-xs transition-colors flex items-center justify-center ${copyStatus === 'copied' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40' : 'bg-white/10 text-slate-200 border border-white/10 hover:bg-white/20'}`}
                      disabled={copyStatus === 'copied'}
                    >
                      {copyStatus === 'copied' ? (
                        <Icons.Check className="text-emerald-200" size={16} />
                      ) : (
                        <Icons.Copy className="text-slate-200" size={16} />
                      )}
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
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Locations List */}
            <div className="results-list overflow-y-auto w-full lg:w-80 lg:max-h-full order-2 lg:order-1">
              <div className="p-4">
                <h4 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
                  <Icons.Treasure className="text-amber-300" size={22} />
                  {currentHuntType === 'geolocation' ? 'Loot Locations' : 'Proximity Markers'}
                  {currentHuntType === 'geolocation' && (
                    <span className="text-sm text-slate-400">({mapMarkers.length})</span>
                  )}
                </h4>

                {currentHuntType === 'geolocation' ? (
                  mapMarkers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
                      <Icons.Target className="text-slate-500" size={28} />
                      <p className="mt-2 text-sm">Click on the map to place your first treasure location!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mapMarkers.map((marker, index) => (
                        <div key={index} className="result-card p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-slate-100 flex items-center gap-2">
                              <Icons.Pin className="text-slate-300" size={16} />
                              Location #{index + 1}
                            </div>
                            <span className="status-badge text-xs px-2 py-1 rounded">Available</span>
                          </div>
                          <div className="text-xs text-slate-300 font-mono">
                            {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-secondary flex-1 text-sm py-2 justify-center gap-2"
                            onClick={() => mapComponentRef.current?.deleteLastPin()}
                          >
                            <Icons.Trash className="text-slate-200" size={18} />
                            Delete Last
                          </button>
                          <button 
                            className="btn btn-danger flex-1 text-sm py-2 justify-center gap-2"
                            onClick={() => mapComponentRef.current?.clearAllPins()}
                          >
                            <Icons.Close className="text-slate-100" size={18} />
                            Clear All
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4 text-slate-400 flex flex-col items-center gap-2">
                      <Icons.Proximity className="text-slate-500" size={26} />
                      <p className="mt-2 text-sm">Use the proximity interface to place markers</p>
                    </div>
                  <div className="space-y-3">
                    <button 
                      className="btn btn-secondary w-full justify-center gap-2"
                      onClick={() => proximityComponentRef.current?.deleteLastProximityMarker()}
                    >
                      <Icons.Trash className="text-slate-200" size={18} />
                      Delete Last Marker
                    </button>
                    <button 
                      className="btn btn-danger w-full justify-center gap-2"
                      onClick={() => proximityComponentRef.current?.clearAllProximityMarkers()}
                    >
                        <Icons.Close className="text-slate-100" size={18} />
                        Clear All Markers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hunt Interface */}
            <div className="flex-1 map-panel relative min-h-[500px] order-1 lg:order-2">
              {currentHuntType === 'geolocation' ? (
                <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
                  <MapComponent ref={mapComponentRef} onMarkersChange={setMapMarkers} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.18), transparent 60%), radial-gradient(circle at 80% 0%, rgba(34, 211, 238, 0.16), transparent 55%), rgba(9, 14, 32, 0.85)' }}>
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
              <Icons.Target className="text-slate-200" size={20} />
              Hunt Configuration
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
