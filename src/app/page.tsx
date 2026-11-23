'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import MapComponent, { MapComponentRef, MapMarker } from '../components/MapComponent';
import ProximityComponent, { ProximityComponentRef, ProximityMarkerData } from '../components/ProximityComponent';
import { Icons } from '../components/Icons';
import { TopBar } from '../components/AppShell';
import { LootToken3D } from '../components/LootToken3D';
import { QRCodeSvg } from '../components/QRCodeSvg';
import { ToastStack, ToastItem } from '../components/ToastStack';

const PROXIMITY_RADIUS_OPTIONS = [
  { ft: 10, label: 'Tight', sub: 'Room / Patio' },
  { ft: 50, label: 'Medium', sub: 'Yard / Plaza' },
  { ft: 100, label: 'Wide', sub: 'Park / Field' },
] as const;

const CONFETTI_PIECES = [
  { left: '8%', color: '#FFC21A', delay: '0s' },
  { left: '18%', color: '#FF5428', delay: '0.15s' },
  { left: '31%', color: '#18A957', delay: '0.08s' },
  { left: '44%', color: '#1E88E5', delay: '0.22s' },
  { left: '58%', color: '#8B5CF6', delay: '0.05s' },
  { left: '70%', color: '#FFC21A', delay: '0.18s' },
  { left: '82%', color: '#FF5428', delay: '0.1s' },
  { left: '91%', color: '#18A957', delay: '0.25s' },
];

type AccordionKey = 'mode' | 'details' | 'contact';

export default function HuntCreatorStudio() {
  const [currentHuntType, setCurrentHuntType] = useState<'geolocation' | 'proximity'>('geolocation');
  const [currentLootType, setCurrentLootType] = useState<string>('coin');
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [proximityMarkers, setProximityMarkers] = useState<ProximityMarkerData[]>([]);
  const [huntName, setHuntName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [creatorPhone, setCreatorPhone] = useState<string>('');
  const [creatorEmail, setCreatorEmail] = useState<string>('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<'phone' | 'email'>('phone');
  const [existingUserData, setExistingUserData] = useState<{ phone?: string; email?: string } | null>(null);
  const [useExistingContact, setUseExistingContact] = useState<boolean>(true);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [proximityRadiusFt, setProximityRadiusFt] = useState(100);
  const [dockOpen, setDockOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<'canvas' | 'setup'>('canvas');

  // Smart collapsible accordion state: Mode + Details open, Contact auto-collapses once saved
  const [openSteps, setOpenSteps] = useState<Record<AccordionKey, boolean>>({
    mode: true,
    details: true,
    contact: false,
  });

  // Only show validation errors after a field is touched or the user attempts to launch
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // In-app toast stack (replaces window.alert)
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mapComponentRef = useRef<MapComponentRef>(null);
  const proximityComponentRef = useRef<ProximityComponentRef>(null);

  const activePinCount = currentHuntType === 'geolocation' ? mapMarkers.length : proximityMarkers.length;
  const isPhoneMissing = !creatorPhone.trim();
  const isEmailMissing = !creatorEmail.trim();
  const isHuntNameMissing = !huntName.trim();
  const isUserNameMissing = !userName.trim();
  const isContactIncomplete = isPhoneMissing || isEmailMissing;

  const detailsDone = !isHuntNameMissing && !isUserNameMissing;
  const contactDone = !isContactIncomplete;
  const pinsDone = activePinCount > 0;

  const readyStepsCount = [true, detailsDone, contactDone, pinsDone].filter(Boolean).length;
  const readinessPct = Math.round((readyStepsCount / 4) * 100);

  const showError = (field: string, missing: boolean) =>
    missing && (attemptedSubmit || Boolean(touched[field]));

  const toggleStep = (key: AccordionKey) => {
    setOpenSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const focusStep = (key: AccordionKey, inputId?: string) => {
    setMobilePane('setup');
    setOpenSteps((prev) => ({ ...prev, [key]: true }));
    if (inputId) {
      setTimeout(() => {
        document.getElementById(inputId)?.focus();
      }, 60);
    }
  };

  // Load saved creator contact on mount
  useEffect(() => {
    const checkExistingUser = async () => {
      const creatorId = 'a1b2c3d4-e5f6-7890-1234-000000000001';
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
            if (userData.phone) setCreatorPhone(userData.phone);
            if (userData.email) setCreatorEmail(userData.email);
            if (userData.name && userData.name !== 'Anonymous Creator') {
              setUserName((prev) => prev || userData.name);
            }
            // Keep Contact neatly collapsed when saved contact info is loaded
            setOpenSteps((prev) => ({ ...prev, contact: false }));
          }
        }
      } catch (error) {
        console.log('No existing user data found:', error);
      }
    };
    checkExistingUser();
  }, []);

  const handleContactMethodToggle = (useExisting: boolean) => {
    setUseExistingContact(useExisting);
    if (useExisting && existingUserData) {
      if (existingUserData.phone) setCreatorPhone(existingUserData.phone);
      if (existingUserData.email) setCreatorEmail(existingUserData.email);
    } else {
      setCreatorPhone('');
      setCreatorEmail('');
    }
  };

  const handleHuntTypeChange = (type: 'geolocation' | 'proximity') => {
    setCurrentHuntType(type);
    setGeneratedUrl('');
    setCopyStatus('idle');
  };

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopyStatus('copied');
        pushToast('Hunt link copied to clipboard!', 'ok');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
        setCopyStatus('error');
        pushToast('Could not copy automatically — select the link manually.', 'warn');
        setTimeout(() => setCopyStatus('idle'), 2000);
      }
    },
    [pushToast]
  );

  const generateLootLink = useCallback(async () => {
    setAttemptedSubmit(true);

    if (isHuntNameMissing || isUserNameMissing) {
      focusStep('details', isHuntNameMissing ? 'hunt-name' : 'user-name');
      pushToast(
        isHuntNameMissing ? 'Give your hunt a name first.' : 'Add your host name so players know who dropped it.',
        'warn'
      );
      return;
    }

    if (isContactIncomplete) {
      focusStep('contact', isPhoneMissing ? 'creator-phone' : 'creator-email');
      pushToast('Add both phone and email so winners can claim their prize.', 'warn');
      return;
    }

    let huntData: MapMarker[] | ProximityMarkerData[] = [];
    if (currentHuntType === 'geolocation') {
      huntData = mapComponentRef.current?.getMarkers() || [];
      if (huntData.length === 0) {
        setMobilePane('canvas');
        pushToast('Tap anywhere on the map to drop your first loot pin!', 'warn');
        return;
      }
    } else {
      huntData = proximityComponentRef.current?.getMarkers() || [];
      if (huntData.length === 0) {
        setMobilePane('canvas');
        pushToast('Tap inside the sonar ring to place your first proximity drop!', 'warn');
        return;
      }
    }

    setIsLoading(true);
    setGeneratedUrl('');

    const creatorId = 'a1b2c3d4-e5f6-7890-1234-000000000001';

    try {
      const response = await fetch('/api/hunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: huntName.trim() || null,
          type: currentHuntType,
          creatorId,
          creatorName: userName.trim() || 'Anonymous Creator',
          creatorPhone: creatorPhone.trim(),
          creatorEmail: creatorEmail.trim(),
          preferredContactMethod,
          pins: huntData,
          proximityRadiusFt: currentHuntType === 'proximity' ? proximityRadiusFt : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create hunt');
      }

      const { huntId } = await response.json();
      const fullUrl = `${window.location.origin}/hunt/${huntId}`;
      setGeneratedUrl(fullUrl);
      pushToast('Supply drop is LIVE! Share the link or QR code.', 'ok');
    } catch (error) {
      console.error('Error generating loot link:', error);
      pushToast((error as Error).message || 'Could not publish hunt.', 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [
    isHuntNameMissing,
    isUserNameMissing,
    isContactIncomplete,
    isPhoneMissing,
    currentHuntType,
    huntName,
    userName,
    creatorPhone,
    creatorEmail,
    preferredContactMethod,
    proximityRadiusFt,
    pushToast,
  ]);

  const shareHunt = useCallback(async () => {
    if (!generatedUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: huntName ? `Join "${huntName}" on Loota!` : 'Join my Loota Hunt!',
          text: 'Jump into this real-world AR treasure hunt!',
          url: generatedUrl,
        });
        return;
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
    copyToClipboard(generatedUrl);
  }, [generatedUrl, huntName, copyToClipboard]);

  const undoLastPin = () => {
    if (currentHuntType === 'geolocation') {
      mapComponentRef.current?.deleteLastPin();
    } else {
      proximityComponentRef.current?.deleteLastProximityMarker();
    }
  };

  const clearPins = () => {
    if (currentHuntType === 'geolocation') {
      mapComponentRef.current?.clearAllPins();
    } else {
      proximityComponentRef.current?.clearAllProximityMarkers();
    }
    pushToast('Cleared all pins on canvas.', 'info');
  };

  const removePinAt = (idx: number) => {
    if (currentHuntType === 'geolocation') {
      mapComponentRef.current?.removePinAt(idx);
    } else {
      proximityComponentRef.current?.removeMarkerAt(idx);
    }
  };

  return (
    <div className="app app--locked">
      <TopBar
        reel
        current="/"
        centerSlot={
          <span className="badge badge--meadow">
            <span className="live-dot" />
            {currentHuntType === 'geolocation'
              ? 'GPS Field Mode'
              : `Sonar Radar · ${proximityRadiusFt}ft`}
          </span>
        }
      />

      {/* Mobile-only quick switcher between Map/Radar and Setup */}
      <div className="mobile-view-switch" role="tablist" aria-label="Studio view">
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'canvas'}
          className={`btn btn--sm ${mobilePane === 'canvas' ? 'btn--gold' : 'btn--ghost'}`}
          onClick={() => setMobilePane('canvas')}
        >
          {currentHuntType === 'geolocation' ? <Icons.Map size={15} /> : <Icons.Proximity size={15} />}
          {currentHuntType === 'geolocation' ? 'Map' : 'Radar'} ({activePinCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'setup'}
          className={`btn btn--sm ${mobilePane === 'setup' ? 'btn--gold' : 'btn--ghost'}`}
          onClick={() => setMobilePane('setup')}
        >
          <Icons.Sliders size={15} />
          Setup ({readyStepsCount}/4)
        </button>
      </div>

      <div className="studio">
        {/* ---------------- Left Inspector Rail (Collapsible Steps) ---------------- */}
        <aside
          className={`inspector ${mobilePane === 'canvas' ? 'mobile-hidden' : ''}`}
          aria-label="Hunt setup"
        >
          <div className="inspector__top">
            <div className="inspector__top-row">
              <div>
                <p className="inspector__eyebrow">Field Drop Studio</p>
                <h1 className="inspector__title">Hide the Loot</h1>
              </div>
              <LootToken3D type={currentLootType} size="sm" />
            </div>

            <div className="readiness" title={`${readyStepsCount} of 4 setup steps ready`}>
              <div className="readiness__track">
                <div className="readiness__fill" style={{ width: `${readinessPct}%` }} />
              </div>
              <span className="readiness__label">{readyStepsCount}/4 ready</span>
            </div>
          </div>

          <div className="inspector__scroll">
            {/* STEP 1 — Mode & Loot */}
            <section className={`step-card ${openSteps.mode ? 'step-card--active' : ''}`}>
              <button
                type="button"
                className="step-card__head"
                onClick={() => toggleStep('mode')}
                aria-expanded={openSteps.mode}
              >
                <span className="step-card__num step-card__num--done">1</span>
                <span className="step-card__title-wrap">
                  <span className="step-card__title">Mode &amp; Loot</span>
                  <span className="step-card__summary">
                    {currentHuntType === 'geolocation' ? 'GPS Map' : `Proximity (${proximityRadiusFt}ft)`} ·{' '}
                    {currentLootType === 'giftCard' ? 'Gift Card' : 'Gold Coin'}
                  </span>
                </span>
                <Icons.Caret
                  size={16}
                  className={`step-card__chevron ${openSteps.mode ? 'step-card__chevron--open' : ''}`}
                />
              </button>

              {openSteps.mode && (
                <div className="step-card__body">
                  <div className="segmented" role="group" aria-label="Hunt format" style={{ marginTop: '0.55rem' }}>
                    <button
                      type="button"
                      className="segmented__opt"
                      aria-pressed={currentHuntType === 'geolocation'}
                      onClick={() => handleHuntTypeChange('geolocation')}
                    >
                      <Icons.Map size={16} />
                      GPS Map
                    </button>
                    <button
                      type="button"
                      className="segmented__opt"
                      aria-pressed={currentHuntType === 'proximity'}
                      onClick={() => handleHuntTypeChange('proximity')}
                    >
                      <Icons.Proximity size={16} />
                      Proximity
                    </button>
                  </div>

                  {currentHuntType === 'proximity' && (
                    <div className="radius-grid" role="group" aria-label="Proximity radius">
                      {PROXIMITY_RADIUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.ft}
                          type="button"
                          className="radius-pill"
                          aria-pressed={proximityRadiusFt === opt.ft}
                          onClick={() => setProximityRadiusFt(opt.ft)}
                        >
                          <span className="radius-pill__ft">{opt.ft}ft</span>
                          <span className="radius-pill__tag">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="loot-picker" role="group" aria-label="Loot brush type">
                    <button
                      type="button"
                      className="loot-tile"
                      aria-pressed={currentLootType === 'coin'}
                      onClick={() => setCurrentLootType('coin')}
                    >
                      <span className="loot-tile__badge">CASH</span>
                      <LootToken3D type="coin" size="md" />
                      <span className="loot-tile__name">Gold Coin</span>
                      <span className="loot-tile__desc">Cash &amp; bounty drops</span>
                    </button>

                    <button
                      type="button"
                      className="loot-tile loot-tile--epic"
                      aria-pressed={currentLootType === 'giftCard'}
                      onClick={() => setCurrentLootType('giftCard')}
                    >
                      <span className="loot-tile__badge">EPIC</span>
                      <LootToken3D type="giftCard" size="md" />
                      <span className="loot-tile__name">Gift Card</span>
                      <span className="loot-tile__desc">Tickets, swag &amp; perks</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* STEP 2 — Hunt Details */}
            <section className={`step-card ${openSteps.details ? 'step-card--active' : ''}`}>
              <button
                type="button"
                className="step-card__head"
                onClick={() => toggleStep('details')}
                aria-expanded={openSteps.details}
              >
                <span className={`step-card__num ${detailsDone ? 'step-card__num--done' : ''}`}>
                  {detailsDone ? <Icons.Check size={14} weight="fill" /> : '2'}
                </span>
                <span className="step-card__title-wrap">
                  <span className="step-card__title">Hunt Identity</span>
                  <span className="step-card__summary">
                    {detailsDone ? `${huntName} · by ${userName}` : 'Name your quest & host tag'}
                  </span>
                </span>
                <Icons.Caret
                  size={16}
                  className={`step-card__chevron ${openSteps.details ? 'step-card__chevron--open' : ''}`}
                />
              </button>

              {openSteps.details && (
                <div className="step-card__body">
                  <div className="field">
                    <label className="field__label" htmlFor="hunt-name">
                      <span>
                        Hunt name <span className="field__req">*</span>
                      </span>
                    </label>
                    <input
                      id="hunt-name"
                      type="text"
                      value={huntName}
                      onChange={(e) => setHuntName(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, huntName: true }))}
                      placeholder="Central Park Sunset Cash Run"
                      className={`input ${showError('huntName', isHuntNameMissing) ? 'input--invalid' : ''}`}
                      maxLength={100}
                    />
                    {showError('huntName', isHuntNameMissing) && (
                      <p className="field__error">Give your treasure hunt an exciting name.</p>
                    )}
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="user-name">
                      <span>
                        Host name <span className="field__req">*</span>
                      </span>
                    </label>
                    <input
                      id="user-name"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, userName: true }))}
                      placeholder="Your player tag"
                      className={`input ${showError('userName', isUserNameMissing) ? 'input--invalid' : ''}`}
                      maxLength={100}
                    />
                    {showError('userName', isUserNameMissing) && (
                      <p className="field__error">Shown to players joining your hunt.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* STEP 3 — Winner Contact (Smart Auto-Collapse) */}
            <section className={`step-card ${openSteps.contact ? 'step-card--active' : ''}`}>
              <button
                type="button"
                className="step-card__head"
                onClick={() => toggleStep('contact')}
                aria-expanded={openSteps.contact}
              >
                <span className={`step-card__num ${contactDone ? 'step-card__num--done' : ''}`}>
                  {contactDone ? <Icons.Check size={14} weight="fill" /> : '3'}
                </span>
                <span className="step-card__title-wrap">
                  <span className="step-card__title">Winner Contact</span>
                  <span className="step-card__summary">
                    {contactDone
                      ? `${preferredContactMethod === 'phone' ? creatorPhone : creatorEmail}`
                      : 'How winners reach you for prizes'}
                  </span>
                </span>
                <span className="step-card__status">
                  {contactDone ? (
                    <span className="badge badge--meadow">Saved</span>
                  ) : (
                    <span className="badge badge--gold">Required</span>
                  )}
                  <Icons.Caret
                    size={16}
                    className={`step-card__chevron ${openSteps.contact ? 'step-card__chevron--open' : ''}`}
                  />
                </span>
              </button>

              {openSteps.contact && (
                <div className="step-card__body">
                  {existingUserData && (existingUserData.phone || existingUserData.email) && (
                    <div
                      className="segmented"
                      role="group"
                      aria-label="Contact source"
                      style={{ marginTop: '0.6rem' }}
                    >
                      <button
                        type="button"
                        className="segmented__opt"
                        aria-pressed={useExistingContact}
                        onClick={() => handleContactMethodToggle(true)}
                      >
                        Saved profile
                      </button>
                      <button
                        type="button"
                        className="segmented__opt"
                        aria-pressed={!useExistingContact}
                        onClick={() => handleContactMethodToggle(false)}
                      >
                        Custom
                      </button>
                    </div>
                  )}

                  <div className="field">
                    <label className="field__label" htmlFor="creator-phone">
                      <span>
                        Phone <span className="field__req">*</span>
                      </span>
                    </label>
                    <input
                      id="creator-phone"
                      type="tel"
                      value={creatorPhone}
                      onChange={(e) => setCreatorPhone(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                      placeholder="(555) 123-4567"
                      className={`input ${showError('phone', isPhoneMissing) ? 'input--invalid' : ''}`}
                      readOnly={useExistingContact && Boolean(existingUserData?.phone)}
                    />
                    {showError('phone', isPhoneMissing) && (
                      <p className="field__error">Required for SMS hunt &amp; winner alerts.</p>
                    )}
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="creator-email">
                      <span>
                        Email <span className="field__req">*</span>
                      </span>
                    </label>
                    <input
                      id="creator-email"
                      type="email"
                      value={creatorEmail}
                      onChange={(e) => setCreatorEmail(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                      placeholder="you@example.com"
                      className={`input ${showError('email', isEmailMissing) ? 'input--invalid' : ''}`}
                      readOnly={useExistingContact && Boolean(existingUserData?.email)}
                    />
                    {showError('email', isEmailMissing) && (
                      <p className="field__error">Required to receive your hunt link.</p>
                    )}
                  </div>

                  <div className="field">
                    <span className="field__label">Preferred winner contact</span>
                    <div className="radio-row">
                      <button
                        type="button"
                        className="radio-chip"
                        aria-pressed={preferredContactMethod === 'phone'}
                        onClick={() => setPreferredContactMethod('phone')}
                      >
                        <Icons.Phone size={14} />
                        Phone
                      </button>
                      <button
                        type="button"
                        className="radio-chip"
                        aria-pressed={preferredContactMethod === 'email'}
                        onClick={() => setPreferredContactMethod('email')}
                      >
                        <Icons.Email size={14} />
                        Email
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sticky Publish Footer */}
          <div className="actionbar">
            {readyStepsCount < 4 && (
              <div className="todo-chips" aria-label="Remaining steps">
                {!pinsDone && (
                  <button
                    type="button"
                    className="todo-chip"
                    onClick={() => {
                      setMobilePane('canvas');
                      pushToast(
                        currentHuntType === 'geolocation'
                          ? 'Click anywhere on the map to drop loot!'
                          : 'Click inside the green sonar ring to drop loot!',
                        'info'
                      );
                    }}
                  >
                    <Icons.Pin size={12} weight="fill" />
                    Drop 1+ pin
                  </button>
                )}
                {!detailsDone && (
                  <button
                    type="button"
                    className="todo-chip"
                    onClick={() => focusStep('details', isHuntNameMissing ? 'hunt-name' : 'user-name')}
                  >
                    <Icons.Sparkle size={12} weight="fill" />
                    {isHuntNameMissing ? 'Name hunt' : 'Add host name'}
                  </button>
                )}
                {!contactDone && (
                  <button
                    type="button"
                    className="todo-chip"
                    onClick={() => focusStep('contact', isPhoneMissing ? 'creator-phone' : 'creator-email')}
                  >
                    <Icons.Phone size={12} weight="fill" />
                    Add contact
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={generateLootLink}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#FFFDF8' }} />
                  Launching Drop…
                </>
              ) : (
                <>
                  <Icons.Lightning size={19} weight="fill" />
                  Drop Hunt Live
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ---------------- Full-Bleed Interactive Field Canvas ---------------- */}
        <section
          className={`canvas ${mobilePane === 'setup' ? 'mobile-hidden' : ''}`}
          aria-label="Loot placement canvas"
        >
          {/* Floating Top HUD */}
          <div className="canvas__bar">
            <div className="hud">
              <Icons.Pin size={16} weight="fill" style={{ color: 'var(--blaze)' }} />
              <span className="hud__count">{activePinCount}</span>
              <span>{activePinCount === 1 ? 'drop' : 'drops'}</span>
              <span className="hud__sep" />
              <span className="hud__hint">
                {currentHuntType === 'geolocation'
                  ? 'Click map to drop · Drag pins to fine-tune'
                  : `Click inside the ${proximityRadiusFt}ft sonar ring`}
              </span>
            </div>

            {/* Instant Canvas Loot Brush Toggle */}
            <div className="brush-pill" role="group" aria-label="Active loot brush">
              <button
                type="button"
                className="brush-pill__btn brush-pill__btn--coin"
                aria-pressed={currentLootType === 'coin'}
                onClick={() => setCurrentLootType('coin')}
              >
                <Icons.Coin size={15} weight="fill" style={{ color: 'var(--gold-dark)' }} />
                Coin
              </button>
              <button
                type="button"
                className="brush-pill__btn brush-pill__btn--gift"
                aria-pressed={currentLootType === 'giftCard'}
                onClick={() => setCurrentLootType('giftCard')}
              >
                <Icons.Gift size={15} weight="fill" style={{ color: 'var(--epic-dark)' }} />
                Gift Card
              </button>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
              {currentHuntType === 'geolocation' && (
                <button
                  type="button"
                  className="btn btn--subtle btn--sm"
                  onClick={() => mapComponentRef.current?.recenterToUser()}
                  title="Jump to my current GPS location"
                >
                  <Icons.Locate size={15} weight="fill" style={{ color: 'var(--sky)' }} />
                  My GPS
                </button>
              )}
              {activePinCount > 0 && (
                <button
                  type="button"
                  className="btn btn--subtle btn--sm"
                  onClick={undoLastPin}
                  title="Undo last placed pin"
                >
                  <Icons.Refresh size={15} />
                  Undo
                </button>
              )}
            </div>
          </div>

          {/* Interactive Stage */}
          {currentHuntType === 'geolocation' ? (
            <div className="canvas__stage">
              <MapComponent
                ref={mapComponentRef}
                onMarkersChange={setMapMarkers}
                currentLootType={currentLootType}
                onLocationError={(msg) => pushToast(msg, 'warn')}
              />
            </div>
          ) : (
            <div className="canvas__stage">
              <div className="canvas__proximity-frame">
                <ProximityComponent
                  ref={proximityComponentRef}
                  currentLootType={currentLootType}
                  proximityRadiusFt={proximityRadiusFt}
                  onMarkersChange={setProximityMarkers}
                  onOutOfBounds={(r) =>
                    pushToast(`Tap inside the ${r}ft sonar ring to drop loot.`, 'warn')
                  }
                />
              </div>
            </div>
          )}

          {/* Collapsible Floating Loot Manifest Drawer (Works for BOTH Map & Proximity!) */}
          <div className="dock">
            <div
              className="dock__head"
              onClick={() => setDockOpen((o) => !o)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDockOpen((o) => !o);
                }
              }}
              aria-expanded={dockOpen}
            >
              <Icons.Treasure size={16} weight="fill" style={{ color: 'var(--gold-dark)' }} />
              <span className="dock__title">Loot Stash</span>
              <span className="dock__badge">{activePinCount}</span>
              <span className="dock__toggle" aria-hidden="true">
                <Icons.Caret
                  size={15}
                  style={{
                    transform: dockOpen ? 'none' : 'rotate(180deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </span>
            </div>

            {dockOpen && (
              <>
                <div className="dock__body">
                  {activePinCount === 0 ? (
                    <div className="empty" style={{ padding: '1.1rem 0.75rem' }}>
                      <span className="empty__icon" style={{ width: 36, height: 36 }}>
                        <Icons.Target size={18} />
                      </span>
                      <span className="empty__title" style={{ fontSize: '0.86rem' }}>
                        No loot placed yet
                      </span>
                      <span className="empty__text" style={{ fontSize: '0.73rem' }}>
                        {currentHuntType === 'geolocation'
                          ? 'Click anywhere on the map to hide your first coin or gift card.'
                          : 'Click inside the radar dish to place loot relative to players.'}
                      </span>
                    </div>
                  ) : currentHuntType === 'geolocation' ? (
                    mapMarkers.map((marker, index) => {
                      const isGift = marker.objectType === 'giftCard';
                      return (
                        <div key={index} className="manifest-row">
                          <span
                            className={`manifest-row__idx ${isGift ? 'manifest-row__idx--gift' : ''}`}
                          >
                            {index + 1}
                          </span>
                          <span className="manifest-row__main">
                            <span className="manifest-row__coord">
                              {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                            </span>
                            <span className="manifest-row__sub">
                              {isGift ? 'Rare Gift Card' : 'Gold Coin'}
                            </span>
                          </span>
                          {isGift ? (
                            <Icons.Gift size={15} weight="fill" style={{ color: 'var(--epic-dark)' }} />
                          ) : (
                            <Icons.Coin size={15} weight="fill" style={{ color: 'var(--gold-dark)' }} />
                          )}
                          <button
                            type="button"
                            className="manifest-row__del"
                            onClick={() => removePinAt(index)}
                            aria-label={`Remove pin ${index + 1}`}
                            title="Remove pin"
                          >
                            <Icons.Trash size={14} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    proximityMarkers.map((marker, index) => {
                      const isGift = marker.objectType === 'giftCard';
                      return (
                        <div key={index} className="manifest-row">
                          <span
                            className={`manifest-row__idx ${isGift ? 'manifest-row__idx--gift' : ''}`}
                          >
                            {index + 1}
                          </span>
                          <span className="manifest-row__main">
                            <span className="manifest-row__coord">
                              {marker.distanceFt.toFixed(1)}ft · {marker.directionStr}
                            </span>
                            <span className="manifest-row__sub">
                              {isGift ? 'Rare Gift Card' : 'Gold Coin'}
                            </span>
                          </span>
                          {isGift ? (
                            <Icons.Gift size={15} weight="fill" style={{ color: 'var(--epic-dark)' }} />
                          ) : (
                            <Icons.Coin size={15} weight="fill" style={{ color: 'var(--gold-dark)' }} />
                          )}
                          <button
                            type="button"
                            className="manifest-row__del"
                            onClick={() => removePinAt(index)}
                            aria-label={`Remove marker ${index + 1}`}
                            title="Remove marker"
                          >
                            <Icons.Trash size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {activePinCount > 0 && (
                  <div className="dock__foot">
                    <button type="button" className="btn btn--subtle btn--xs btn--block" onClick={undoLastPin}>
                      <Icons.Refresh size={13} />
                      Undo last
                    </button>
                    <button type="button" className="btn btn--danger btn--xs btn--block" onClick={clearPins}>
                      <Icons.Trash size={13} />
                      Clear all
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ---------------- Celebratory Hunt Launch Modal with Scannable QR ---------------- */}
      {generatedUrl && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Hunt published"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setGeneratedUrl('');
              setCopyStatus('idle');
            }
          }}
        >
          <div className="modal-card">
            <div className="launch__hero">
              <div className="confetti-burst" aria-hidden="true">
                {CONFETTI_PIECES.map((c, i) => (
                  <span
                    key={i}
                    className="confetti-piece"
                    style={{ left: c.left, background: c.color, animationDelay: c.delay }}
                  />
                ))}
              </div>
              <LootToken3D type={currentLootType} size="lg" />
              <h2 className="launch__title">Your Drop is Live!</h2>
              <p className="launch__sub">
                {huntName ? `"${huntName}"` : 'Your hunt'} has {activePinCount}{' '}
                {activePinCount === 1 ? 'hidden stash' : 'hidden stashes'} waiting to be claimed.
              </p>
            </div>

            <div className="launch__body">
              <div className="launch__grid">
                <div className="qr-pass__frame">
                  <QRCodeSvg value={generatedUrl} size={132} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                  <span className="badge badge--meadow" style={{ alignSelf: 'flex-start' }}>
                    <Icons.Qr size={13} />
                    Scan on iPhone
                  </span>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-2)' }}>
                    Point an iPhone camera at this code to jump straight into the Loota AR app, or share the link below.
                  </p>
                </div>
              </div>

              <div className="linkbox">
                <Icons.Share size={15} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linkbox__url"
                >
                  {generatedUrl}
                </a>
                <button
                  type="button"
                  className="btn btn--subtle btn--xs"
                  onClick={() => copyToClipboard(generatedUrl)}
                >
                  {copyStatus === 'copied' ? (
                    <>
                      <Icons.Check size={13} weight="fill" style={{ color: 'var(--meadow-dark)' }} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Icons.Copy size={13} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="launch__actions">
                <button type="button" className="btn btn--primary" onClick={shareHunt}>
                  <Icons.Share size={16} />
                  Share with Crew
                </button>
                <a
                  className="btn btn--gold"
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icons.External size={16} />
                  Open Command Center
                </a>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={() => {
                    setGeneratedUrl('');
                    setCopyStatus('idle');
                  }}
                >
                  Keep editing in studio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
