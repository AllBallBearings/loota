'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/AppShell';
import { Icons } from '@/components/Icons';
import { LootToken3D } from '@/components/LootToken3D';
import { ToastStack, ToastItem, ConfirmModal } from '@/components/ToastStack';
import { AdminWidgets } from '@/components/admin/AdminWidgets';
import { AdminActivityFeed, formatRelativeTime } from '@/components/admin/AdminActivityFeed';
import { AdminHuntInspector } from '@/components/admin/AdminHuntInspector';
import type {
  AdminOverviewResponse,
  AdminHuntSummary,
  AdminHuntStatus,
} from '@/app/api/admin/overview/route';

type StatusFilter = 'all' | 'active' | AdminHuntStatus;
type FormatFilter = 'all' | 'geolocation' | 'proximity';
type LootFilter = 'all' | 'coin' | 'giftCard';
type SortOption = 'newest' | 'active' | 'progress' | 'crew' | 'pins';
type RailTab = 'widgets' | 'feed' | 'inspect';

const ADMIN_KEY_STORAGE = 'loota_admin_access_key';

export default function PlatformAdminPage() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional ADMIN_ACCESS_KEY unlock state
  const [authRequired, setAuthRequired] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [adminKey, setAdminKey] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Filters, search, sort
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [lootFilter, setLootFilter] = useState<LootFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Layout & inspector state
  const [selectedHuntId, setSelectedHuntId] = useState<string | null>(null);
  const [railTab, setRailTab] = useState<RailTab>('widgets');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobilePane, setMobilePane] = useState<'hunts' | 'panel'>('hunts');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [origin, setOrigin] = useState('https://www.loota.fun');

  // Confirm modal & admin mutation state
  const [pendingAction, setPendingAction] = useState<{
    action: 'resetLoot' | 'clearLooters' | 'deleteHunt';
    hunt: AdminHuntSummary;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const saved = window.sessionStorage.getItem(ADMIN_KEY_STORAGE);
      if (saved) setAdminKey(saved);
    }
  }, []);

  const fetchOverview = useCallback(
    async (keyOverride?: string, silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const activeKey = keyOverride !== undefined ? keyOverride : adminKey;
        const headers: Record<string, string> = {};
        if (activeKey) headers['X-Admin-Key'] = activeKey;

        const res = await fetch('/api/admin/overview', { headers, cache: 'no-store' });
        if (res.status === 401) {
          setAuthRequired(true);
          if (activeKey) {
            setAuthError('Invalid admin access key. Please try again.');
          }
          setLoading(false);
          setRefreshing(false);
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to load admin dashboard');
        }

        const payload: AdminOverviewResponse = await res.json();
        setData(payload);
        setAuthRequired(false);
        setAuthError(null);
        setError(null);
      } catch (err) {
        console.error('Admin overview fetch error:', err);
        setError((err as Error).message || 'Could not reach database');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminKey]
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!autoRefresh || authRequired) return;
    const id = setInterval(() => fetchOverview(undefined, true), 15000);
    return () => clearInterval(id);
  }, [autoRefresh, authRequired, fetchOverview]);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = adminKeyInput.trim();
    if (!trimmed) return;
    setAdminKey(trimmed);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    }
    await fetchOverview(trimmed);
  };

  const selectedHunt = useMemo(() => {
    if (!data || !selectedHuntId) return null;
    return data.hunts.find((h) => h.id === selectedHuntId) ?? null;
  }, [data, selectedHuntId]);

  const selectHuntForInspect = useCallback((huntId: string) => {
    setSelectedHuntId(huntId);
    setRailCollapsed(false);
    setRailTab('inspect');
    setMobilePane('panel');
  }, []);

  const filteredHunts = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();

    const list = data.hunts.filter((h) => {
      if (statusFilter === 'active') {
        if (h.status === 'completed') return false;
      } else if (statusFilter !== 'all' && h.status !== statusFilter) {
        return false;
      }

      if (formatFilter !== 'all' && h.type !== formatFilter) return false;

      if (lootFilter === 'coin' && h.coinPins === 0) return false;
      if (lootFilter === 'giftCard' && h.giftCardPins === 0) return false;

      if (q) {
        const hay = [
          h.name,
          h.id,
          h.creator?.name ?? '',
          h.creatorEmail ?? '',
          h.creatorPhone ?? '',
          h.winner?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'active':
          return (
            new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
          );
        case 'progress':
          return b.completionPct - a.completionPct || b.collectedPins - a.collectedPins;
        case 'crew':
          return b.participantCount - a.participantCount || b.collectedPins - a.collectedPins;
        case 'pins':
          return b.totalPins - a.totalPins;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [data, statusFilter, formatFilter, lootFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    formatFilter !== 'all' ||
    lootFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter('all');
    setFormatFilter('all');
    setLootFilter('all');
    setSearchQuery('');
  };

  const handleCopyUrl = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        pushToast('Hunt URL copied to clipboard!', 'ok');
      } catch {
        pushToast('Could not copy URL automatically.', 'warn');
      }
    },
    [pushToast]
  );

  const executeAdminAction = async () => {
    if (!pendingAction) return;
    const { action, hunt } = pendingAction;
    setActionBusy(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminKey) headers['X-Admin-Key'] = adminKey;

      let res: Response;
      if (action === 'deleteHunt') {
        res = await fetch(`/api/admin/hunts/${hunt.id}`, {
          method: 'DELETE',
          headers,
        });
      } else {
        res = await fetch(`/api/admin/hunts/${hunt.id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            resetPins: action === 'resetLoot',
            clearParticipants: action === 'clearLooters',
          }),
        });
      }

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || 'Admin action failed');
      }

      if (action === 'deleteHunt' && selectedHuntId === hunt.id) {
        setSelectedHuntId(null);
        setRailTab('widgets');
      }

      setPendingAction(null);
      pushToast(body.message || 'Hunt updated.', 'ok');
      await fetchOverview(undefined, true);
    } catch (err) {
      console.error('Admin mutation failed:', err);
      pushToast((err as Error).message || 'Could not update hunt.', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  // Optional Admin Key Gate UI
  if (authRequired) {
    return (
      <div className="app">
        <TopBar current="/admin" />
        <div className="fullstate" style={{ minHeight: 'calc(100dvh - var(--topbar-h))' }}>
          <form className="fullstate__inner" onSubmit={handleUnlockSubmit}>
            <span className="empty__icon" style={{ background: 'var(--gold-soft)' }}>
              <Icons.Lock size={22} weight="fill" />
            </span>
            <h1 style={{ fontSize: '1.35rem' }}>Platform Admin</h1>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Enter your <code>ADMIN_ACCESS_KEY</code> to unlock platform oversight.
            </p>
            <input
              type="password"
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              placeholder="Admin access key"
              className={`input ${authError ? 'input--invalid' : ''}`}
              autoFocus
            />
            {authError && <p className="field__error">{authError}</p>}
            <button type="submit" className="btn btn--primary btn--block">
              <Icons.Shield size={16} weight="fill" />
              Unlock Command Center
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <TopBar current="/admin" />
        <div className="fullstate" style={{ minHeight: 'calc(100dvh - var(--topbar-h))' }}>
          <div className="fullstate__inner">
            <LootToken3D type="coin" size="md" />
            <h2 style={{ fontSize: '1.2rem' }}>Loading Platform Oversight…</h2>
            <p style={{ margin: 0, fontSize: '0.84rem' }}>
              Aggregating all hunts, claims, and crew activity from Postgres.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app">
        <TopBar current="/admin" />
        <div className="fullstate" style={{ minHeight: 'calc(100dvh - var(--topbar-h))' }}>
          <div className="fullstate__inner">
            <span
              className="empty__icon"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
            >
              <Icons.Warning size={22} weight="fill" />
            </span>
            <h2 style={{ fontSize: '1.2rem' }}>Could not load admin dashboard</h2>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {error || 'Database returned an unexpected response.'}
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => fetchOverview()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { kpis } = data;
  const activeCount = kpis.inProgressHunts + kpis.waitingHunts;

  return (
    <div className="app app--locked">
      <TopBar
        current="/admin"
        centerSlot={
          <span className={`badge ${data.authProtected ? 'badge--meadow' : 'badge--gold'}`}>
            <Icons.Shield size={13} weight="fill" />
            Platform Owner · {data.authProtected ? 'Key Locked' : 'Open Dev Mode'}
          </span>
        }
        actions={
          <>
            <button
              type="button"
              className={`btn btn--xs ${autoRefresh ? 'btn--subtle' : 'btn--ghost'}`}
              onClick={() => setAutoRefresh((v) => !v)}
              title="Toggle 15-second live polling"
            >
              {autoRefresh && <span className="live-dot" />}
              {autoRefresh ? 'Live 15s' : 'Paused'}
            </button>
            <button
              type="button"
              className="btn btn--subtle btn--xs"
              onClick={() => fetchOverview()}
              disabled={refreshing}
              title="Refresh data now"
            >
              <Icons.Sync size={14} className={refreshing ? 'animate-spin' : ''} />
              Sync
            </button>
            <Link href="/" className="btn btn--gold btn--xs">
              <Icons.Sparkle size={13} weight="fill" />
              New Drop
            </Link>
          </>
        }
      />

      {/* ---------------- Top Platform KPI Strip (5 Clickable Cards) ---------------- */}
      <section className="admin-kpis" aria-label="Platform KPIs">
        <button
          type="button"
          className="kpi-card kpi-card--clickable"
          onClick={() => {
            setStatusFilter('all');
            setMobilePane('hunts');
          }}
        >
          <div className="kpi-card__top">
            <span className="kpi-card__label">Total Hunts</span>
            <Icons.Map size={16} style={{ color: 'var(--blaze)' }} />
          </div>
          <div className="kpi-card__val-row">
            <span className="kpi-card__val">{kpis.totalHunts}</span>
            <span className="kpi-card__sub">+{kpis.huntsLast7Days} last 7d</span>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card kpi-card--clickable kpi-card--live"
          onClick={() => {
            setStatusFilter('in_progress');
            setMobilePane('hunts');
          }}
        >
          <div className="kpi-card__top">
            <span className="kpi-card__label">In Progress</span>
            <span className="live-dot" />
          </div>
          <div className="kpi-card__val-row">
            <span className="kpi-card__val">{kpis.inProgressHunts}</span>
            <span className="kpi-card__sub">{kpis.waitingHunts} waiting</span>
          </div>
        </button>

        <div className="kpi-card kpi-card--gold">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Loot Claimed</span>
            <Icons.Coin size={16} weight="fill" style={{ color: 'var(--gold-dark)' }} />
          </div>
          <div className="kpi-card__val-row">
            <span className="kpi-card__val">
              {kpis.collectedPins}/{kpis.totalPins}
            </span>
            <span className="kpi-card__sub">{kpis.claimRatePct}% rate</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Users &amp; Crew</span>
            <Icons.Users size={16} weight="fill" style={{ color: 'var(--sky)' }} />
          </div>
          <div className="kpi-card__val-row">
            <span className="kpi-card__val">{kpis.totalUsers}</span>
            <span className="kpi-card__sub">
              {kpis.uniqueCreators} hosts · {kpis.totalParticipations} joins
            </span>
          </div>
        </div>

        <button
          type="button"
          className="kpi-card kpi-card--clickable"
          onClick={() => {
            setStatusFilter('completed');
            setMobilePane('hunts');
          }}
        >
          <div className="kpi-card__top">
            <span className="kpi-card__label">Completed</span>
            <Icons.Trophy size={16} weight="fill" style={{ color: 'var(--meadow)' }} />
          </div>
          <div className="kpi-card__val-row">
            <span className="kpi-card__val">{kpis.completedHunts}</span>
            <span className="kpi-card__sub">{kpis.completionRatePct}% finish rate</span>
          </div>
        </button>
      </section>

      {/* Mobile View Switcher (< 1024px) */}
      <div className="mobile-view-switch" role="tablist" aria-label="Admin mobile view">
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'hunts'}
          className={`btn btn--sm ${mobilePane === 'hunts' ? 'btn--gold' : 'btn--ghost'}`}
          onClick={() => setMobilePane('hunts')}
        >
          <Icons.Map size={15} />
          Hunts ({filteredHunts.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'panel'}
          className={`btn btn--sm ${mobilePane === 'panel' ? 'btn--gold' : 'btn--ghost'}`}
          onClick={() => setMobilePane('panel')}
        >
          <Icons.Chart size={15} />
          Widgets &amp; Inspect
        </button>
      </div>

      {/* ---------------- 2-Column Zero-Scroll Operations Deck ---------------- */}
      <main className={`admin-deck ${railCollapsed ? 'admin-deck--collapsed' : ''}`}>
        {/* LEFT: Filterable Hunts Oversight Directory */}
        <section
          className={`admin-main ${mobilePane === 'panel' ? 'mobile-hidden' : ''}`}
          aria-label="Hunts directory"
        >
          <div className="admin-toolbar">
            {/* Row 1: Lifecycle Status Filter Pills */}
            <div className="admin-toolbar__row">
              <div className="filter-pills" role="group" aria-label="Filter by hunt status">
                <button
                  type="button"
                  className="filter-pill"
                  aria-pressed={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                  <span className="filter-pill__count">{kpis.totalHunts}</span>
                </button>
                <button
                  type="button"
                  className="filter-pill filter-pill--live"
                  aria-pressed={statusFilter === 'in_progress'}
                  onClick={() => setStatusFilter('in_progress')}
                >
                  <span className="live-dot" style={{ width: 7, height: 7 }} />
                  In Progress
                  <span className="filter-pill__count">{kpis.inProgressHunts}</span>
                </button>
                <button
                  type="button"
                  className="filter-pill"
                  aria-pressed={statusFilter === 'active'}
                  onClick={() => setStatusFilter('active')}
                >
                  All Active
                  <span className="filter-pill__count">{activeCount}</span>
                </button>
                <button
                  type="button"
                  className="filter-pill"
                  aria-pressed={statusFilter === 'waiting'}
                  onClick={() => setStatusFilter('waiting')}
                >
                  Waiting
                  <span className="filter-pill__count">{kpis.waitingHunts}</span>
                </button>
                <button
                  type="button"
                  className="filter-pill"
                  aria-pressed={statusFilter === 'completed'}
                  onClick={() => setStatusFilter('completed')}
                >
                  Completed
                  <span className="filter-pill__count">{kpis.completedHunts}</span>
                </button>
              </div>

              <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.4rem' }}>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--xs desktop-only"
                  onClick={() => setRailCollapsed((c) => !c)}
                  title={railCollapsed ? 'Show insights rail' : 'Expand table full width'}
                >
                  {railCollapsed ? <Icons.Collapse size={14} /> : <Icons.Expand size={14} />}
                  {railCollapsed ? 'Show Panel' : 'Expand'}
                </button>
              </div>
            </div>

            {/* Row 2: Search + Format + Loot + Sort */}
            <div className="admin-toolbar__row">
              <div className="admin-search">
                <Icons.Search size={15} className="admin-search__icon" />
                <input
                  type="search"
                  className="admin-search__input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hunt name, host, winner, email, or #ID…"
                  aria-label="Search hunts"
                />
              </div>

              <select
                className="admin-select"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
                aria-label="Filter by format"
              >
                <option value="all">All Formats</option>
                <option value="geolocation">GPS Map</option>
                <option value="proximity">Proximity Radar</option>
              </select>

              <select
                className="admin-select"
                value={lootFilter}
                onChange={(e) => setLootFilter(e.target.value as LootFilter)}
                aria-label="Filter by loot type"
              >
                <option value="all">Any Loot</option>
                <option value="coin">Has Gold Coins</option>
                <option value="giftCard">Has Gift Cards</option>
              </select>

              <select
                className="admin-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort hunts"
              >
                <option value="newest">Sort: Newest</option>
                <option value="active">Sort: Recently Active</option>
                <option value="progress">Sort: Highest Progress</option>
                <option value="crew">Sort: Most Crew</option>
                <option value="pins">Sort: Most Stashes</option>
              </select>
            </div>
          </div>

          {/* Scrollable Hunts Rows */}
          <div className="admin-list">
            {filteredHunts.length === 0 ? (
              <div className="empty" style={{ padding: '3rem 1rem' }}>
                <span className="empty__icon">
                  <Icons.Filter size={20} />
                </span>
                <span className="empty__title">No hunts match your filters</span>
                <span className="empty__text">
                  Try switching status pills or clearing your search query to see all {kpis.totalHunts}{' '}
                  hunts in the database.
                </span>
                {hasActiveFilters && (
                  <button type="button" className="btn btn--gold btn--sm" onClick={clearFilters}>
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              filteredHunts.map((hunt) => {
                const isSelected = selectedHuntId === hunt.id;
                const isProximity = hunt.type === 'proximity';

                return (
                  <div
                    key={hunt.id}
                    className={`hunt-row ${isSelected ? 'hunt-row--selected' : ''}`}
                    onClick={() => selectHuntForInspect(hunt.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectHuntForInspect(hunt.id);
                      }
                    }}
                  >
                    {/* Identity */}
                    <div className="hunt-row__main">
                      <div className="hunt-row__title-line">
                        {hunt.status === 'in_progress' && (
                          <span className="badge badge--meadow">
                            <span className="live-dot" style={{ width: 6, height: 6 }} />
                            Live
                          </span>
                        )}
                        {hunt.status === 'waiting' && (
                          <span className="badge badge--gold">Open</span>
                        )}
                        {hunt.status === 'completed' && (
                          <span className="badge badge--sky">
                            <Icons.Check size={11} weight="fill" />
                            Done
                          </span>
                        )}
                        <span className="hunt-row__name">{hunt.name}</span>
                      </div>

                      <div className="hunt-row__meta">
                        <span>
                          Host: <strong style={{ color: 'var(--ink)' }}>{hunt.creator?.name || 'Unknown'}</strong>
                        </span>
                        <span style={{ fontFamily: 'var(--font-data)' }}>#{hunt.id.slice(0, 8)}</span>
                        <span>· {formatRelativeTime(hunt.createdAt)}</span>
                        {hunt.winner && (
                          <span style={{ color: 'var(--meadow-dark)', fontWeight: 800 }}>
                            · Winner: {hunt.winner.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Format & Loot badges */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${isProximity ? 'badge--sky' : 'badge--muted'}`}>
                        {isProximity ? <Icons.Proximity size={11} /> : <Icons.Map size={11} />}
                        {isProximity ? `${hunt.proximityRadiusFt ?? 100}ft` : 'Map'}
                      </span>
                      {hunt.coinPins > 0 && (
                        <span className="badge badge--gold">
                          <Icons.Coin size={11} weight="fill" />
                          {hunt.coinPins}
                        </span>
                      )}
                      {hunt.giftCardPins > 0 && (
                        <span className="badge badge--epic">
                          <Icons.Gift size={11} weight="fill" />
                          {hunt.giftCardPins}
                        </span>
                      )}
                    </div>

                    {/* Claim Progress */}
                    <div className="hunt-row__prog">
                      <div className="hunt-row__prog-top">
                        <span>
                          {hunt.collectedPins}/{hunt.totalPins} claimed
                        </span>
                        <span>{hunt.completionPct}%</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress__fill"
                          style={{ width: `${hunt.completionPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Crew Count */}
                    <span className="hunt-row__crew" title="Joined participants">
                      <Icons.Users size={13} style={{ color: 'var(--sky)' }} />
                      {hunt.participantCount}
                    </span>

                    {/* Direct Oversight Actions */}
                    <div
                      className="hunt-row__actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn btn--subtle btn--xs"
                        onClick={() => selectHuntForInspect(hunt.id)}
                        title="Inspect hunt details in side panel"
                      >
                        <Icons.Eye size={13} />
                        Inspect
                      </button>
                      <Link
                        href={`/hunt/${hunt.id}`}
                        className="btn btn--primary btn--xs"
                        title="Open live hunt command center"
                      >
                        Open
                        <Icons.External size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT: Tabbed Widgets / Live Feed / Hunt Inspector */}
        {!railCollapsed && (
          <aside
            className={`command-rail ${mobilePane === 'hunts' ? 'mobile-hidden' : ''}`}
            aria-label="Platform widgets and hunt inspector"
          >
            <div className="rail-tabs" role="tablist" aria-label="Admin panel tabs">
              <button
                type="button"
                role="tab"
                className="rail-tab"
                aria-selected={railTab === 'widgets'}
                onClick={() => setRailTab('widgets')}
              >
                <Icons.Chart size={14} weight="fill" />
                Widgets
              </button>

              <button
                type="button"
                role="tab"
                className="rail-tab"
                aria-selected={railTab === 'feed'}
                onClick={() => setRailTab('feed')}
              >
                <Icons.Activity size={14} weight="fill" />
                Feed
                <span className="rail-tab__count">{data.recentActivity.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                className="rail-tab"
                aria-selected={railTab === 'inspect'}
                onClick={() => setRailTab('inspect')}
              >
                <Icons.Eye size={14} weight="fill" />
                Inspect
                {selectedHunt && <span className="rail-tab__count">1</span>}
              </button>
            </div>

            <div className="rail-pane">
              {railTab === 'widgets' && (
                <AdminWidgets
                  data={data}
                  onQuickFilter={({ type, loot }) => {
                    if (type) setFormatFilter(type);
                    if (loot) setLootFilter(loot);
                    setMobilePane('hunts');
                    pushToast('Applied quick filter to Hunts directory.', 'info');
                  }}
                />
              )}

              {railTab === 'feed' && (
                <AdminActivityFeed
                  events={data.recentActivity}
                  onSelectHunt={selectHuntForInspect}
                />
              )}

              {railTab === 'inspect' && (
                <AdminHuntInspector
                  hunt={selectedHunt}
                  origin={origin}
                  onCopyUrl={handleCopyUrl}
                  onAction={(action, hunt) => setPendingAction({ action, hunt })}
                  busy={actionBusy}
                />
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Platform Admin Confirmation Modal */}
      <ConfirmModal
        open={pendingAction !== null}
        title={
          pendingAction?.action === 'deleteHunt'
            ? `Delete "${pendingAction.hunt.name}"?`
            : pendingAction?.action === 'resetLoot'
              ? `Reset loot for "${pendingAction.hunt.name}"?`
              : `Clear crew for "${pendingAction?.hunt.name ?? ''}"?`
        }
        description={
          pendingAction?.action === 'deleteHunt'
            ? 'This permanently removes the hunt, all its pins, and all participation records from PostgreSQL.'
            : pendingAction?.action === 'resetLoot'
              ? 'All collected pins in this hunt will return to Open and completion status will be cleared.'
              : 'All joined looters will be removed from this hunt roster.'
        }
        bullets={
          pendingAction?.action === 'deleteHunt'
            ? [
                `Deletes ${pendingAction.hunt.totalPins} pins and ${pendingAction.hunt.participantCount} participations`,
                'Any shared QR codes or links for this hunt will return 404',
                'This action cannot be undone',
              ]
            : pendingAction?.action === 'resetLoot'
              ? [
                  'Resets every collected stash back to uncollected',
                  'Clears winner and completion timestamp',
                  'Keeps current crew members in the hunt',
                ]
              : [
                  'Removes all participants from the hunt',
                  'Preserves pin collection states as-is',
                  'Players can rejoin using the hunt link or QR code',
                ]
        }
        confirmLabel={
          pendingAction?.action === 'deleteHunt'
            ? 'Delete Permanently'
            : pendingAction?.action === 'resetLoot'
              ? 'Reset Loot'
              : 'Clear Crew'
        }
        danger={pendingAction?.action !== 'resetLoot'}
        busy={actionBusy}
        onConfirm={executeAdminAction}
        onCancel={() => setPendingAction(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
