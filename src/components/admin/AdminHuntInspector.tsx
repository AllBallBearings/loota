'use client';

import React from 'react';
import Link from 'next/link';
import { Icons } from '@/components/Icons';
import { QRCodeSvg } from '@/components/QRCodeSvg';
import type { AdminHuntSummary } from '@/app/api/admin/overview/route';
import { formatRelativeTime } from './AdminActivityFeed';

interface AdminHuntInspectorProps {
  hunt: AdminHuntSummary | null;
  origin: string;
  onCopyUrl: (url: string) => void;
  onAction: (action: 'resetLoot' | 'clearLooters' | 'deleteHunt', hunt: AdminHuntSummary) => void;
  busy: boolean;
}

export const AdminHuntInspector: React.FC<AdminHuntInspectorProps> = ({
  hunt,
  origin,
  onCopyUrl,
  onAction,
  busy,
}) => {
  if (!hunt) {
    return (
      <div className="empty" style={{ padding: '2.2rem 1rem' }}>
        <span className="empty__icon">
          <Icons.Eye size={20} />
        </span>
        <span className="empty__title">Select a hunt to inspect</span>
        <span className="empty__text">
          Click any hunt row on the left to view host contact info, pin statuses, crew roster, or take admin actions.
        </span>
      </div>
    );
  }

  const huntUrl = `${origin}/hunt/${hunt.id}`;
  const isProximity = hunt.type === 'proximity';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header & Direct Jump-In */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Eye size={16} weight="fill" style={{ color: 'var(--blaze)' }} />
          <span className="panel__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hunt.name}
          </span>
          <span className="panel__meta">#{hunt.id.slice(0, 8)}</span>
        </div>

        <div className="panel__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {hunt.status === 'in_progress' && (
              <span className="badge badge--meadow">
                <span className="live-dot" />
                In Progress
              </span>
            )}
            {hunt.status === 'waiting' && (
              <span className="badge badge--gold">Open / Waiting</span>
            )}
            {hunt.status === 'completed' && (
              <span className="badge badge--sky">
                <Icons.Trophy size={12} weight="fill" />
                Completed
              </span>
            )}
            <span className={`badge ${isProximity ? 'badge--sky' : 'badge--muted'}`}>
              {isProximity ? <Icons.Proximity size={12} /> : <Icons.Map size={12} />}
              {isProximity ? `Proximity ${hunt.proximityRadiusFt ?? 100}ft` : 'GPS Map'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.45rem' }}>
            <Link href={`/hunt/${hunt.id}`} className="btn btn--primary btn--sm">
              <Icons.Eye size={15} weight="fill" />
              Open Live Hunt Page
            </Link>
            <a
              href={`/hunt/${hunt.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--subtle btn--sm"
              title="Open hunt in new tab"
              aria-label="Open hunt in new tab"
            >
              <Icons.External size={15} />
            </a>
          </div>

          {/* Progress bar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-data)',
                fontSize: '0.73rem',
                fontWeight: 800,
                marginBottom: '0.25rem',
              }}
            >
              <span>
                {hunt.collectedPins}/{hunt.totalPins} stashes claimed
              </span>
              <span>{hunt.completionPct}%</span>
            </div>
            <div className="progress">
              <div className="progress__fill" style={{ width: `${hunt.completionPct}%` }} />
            </div>
          </div>

          <div className="inspector-kv">
            <div className="inspector-kv__box">
              <span className="inspector-kv__k">Host</span>
              <span className="inspector-kv__v">{hunt.creator?.name || 'Unknown'}</span>
            </div>
            <div className="inspector-kv__box">
              <span className="inspector-kv__k">Created</span>
              <span className="inspector-kv__v">{formatRelativeTime(hunt.createdAt)}</span>
            </div>
            <div className="inspector-kv__box">
              <span className="inspector-kv__k">Host Phone</span>
              <span className="inspector-kv__v" style={{ fontFamily: 'var(--font-data)', fontSize: '0.73rem' }}>
                {hunt.creatorPhone || hunt.creator?.phone || '—'}
              </span>
            </div>
            <div className="inspector-kv__box" style={{ gridColumn: '1 / -1' }}>
              <span className="inspector-kv__k">Host Email</span>
              <span className="inspector-kv__v" style={{ fontFamily: 'var(--font-data)', fontSize: '0.73rem' }}>
                {hunt.creatorEmail || hunt.creator?.email || '—'}
              </span>
            </div>
          </div>

          {hunt.winner && (
            <div className="notice notice--meadow">
              <Icons.Trophy size={17} weight="fill" style={{ color: 'var(--meadow-dark)', flexShrink: 0 }} />
              <span>
                Winner: <strong>{hunt.winner.name}</strong>
                {hunt.completedAt ? ` · ${new Date(hunt.completedAt).toLocaleDateString()}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pins & Crew Mini-Breakdown */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Treasure size={15} weight="fill" style={{ color: 'var(--gold-dark)' }} />
          <span className="panel__title">Stashes ({hunt.totalPins})</span>
          <span className="panel__meta">
            {hunt.coinPins}C · {hunt.giftCardPins}G
          </span>
        </div>
        <div
          className="panel__body panel__body--flush"
          style={{ maxHeight: 190, overflowY: 'auto', display: 'grid', gap: '0.32rem' }}
        >
          {hunt.pins.length > 0 ? (
            hunt.pins.map((pin, idx) => {
              const collected = Boolean(pin.collectedByUserId);
              const isGift = pin.objectType === 'giftCard';
              const loc =
                pin.distanceFt !== null && pin.directionStr
                  ? `${pin.distanceFt.toFixed(1)}ft ${pin.directionStr}`
                  : pin.lat !== null && pin.lng !== null
                    ? `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`
                    : 'No coords';
              return (
                <div
                  key={pin.id}
                  className="manifest-row"
                  style={{ cursor: 'default' }}
                >
                  <span
                    className={`manifest-row__idx ${isGift ? 'manifest-row__idx--gift' : ''}`}
                    style={
                      collected
                        ? { background: 'var(--meadow)', color: '#FFFDF8' }
                        : undefined
                    }
                  >
                    {collected ? '✓' : idx + 1}
                  </span>
                  <span className="manifest-row__main">
                    <span className="manifest-row__coord">{loc}</span>
                    <span className="manifest-row__sub">
                      {collected
                        ? `Claimed by ${pin.collectedByName || 'Hunter'}`
                        : isGift
                          ? 'Open · Gift Card'
                          : 'Open · Gold Coin'}
                    </span>
                  </span>
                </div>
              );
            })
          ) : (
            <div className="empty" style={{ padding: '0.8rem' }}>
              <span className="empty__text">No pins attached to this hunt.</span>
            </div>
          )}
        </div>
      </div>

      {/* Crew Roster */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Users size={15} weight="fill" style={{ color: 'var(--sky)' }} />
          <span className="panel__title">Crew Roster</span>
          <span className="panel__meta">{hunt.participantCount}</span>
        </div>
        <div
          className="panel__body panel__body--flush"
          style={{ maxHeight: 150, overflowY: 'auto' }}
        >
          {hunt.participants.length > 0 ? (
            hunt.participants.map((p) => (
              <div key={p.id} className="person-row">
                <span className="avatar" style={{ width: 24, height: 24, fontSize: '0.64rem' }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="person-row__name" style={{ fontSize: '0.8rem' }}>
                  {p.name}
                </span>
                <span className="person-row__meta">
                  {p.collectedCount} {p.collectedCount === 1 ? 'claim' : 'claims'}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '0.7rem', textAlign: 'center', fontSize: '0.76rem', color: 'var(--ink-3)' }}>
              No players have joined yet.
            </div>
          )}
        </div>
      </div>

      {/* Quick QR + Share Link */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Qr size={15} weight="fill" style={{ color: 'var(--ink)' }} />
          <span className="panel__title">Quick Access</span>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            style={{ marginLeft: 'auto' }}
            onClick={() => onCopyUrl(huntUrl)}
          >
            <Icons.Copy size={13} />
            Copy URL
          </button>
        </div>
        <div
          className="panel__body"
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div className="qr-pass__frame" style={{ padding: 6 }}>
            <QRCodeSvg value={huntUrl} size={78} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink)' }}>
              Test on iPhone
            </p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Scan to launch this exact hunt directly in the Loota iOS app or Safari AR player.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Admin Override Controls */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Shield size={15} weight="fill" style={{ color: 'var(--danger)' }} />
          <span className="panel__title">Platform Oversight Actions</span>
        </div>
        <div className="panel__body" style={{ display: 'grid', gap: '0.45rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
            <button
              type="button"
              className="btn btn--gold btn--xs"
              disabled={busy || hunt.collectedPins === 0}
              onClick={() => onAction('resetLoot', hunt)}
            >
              <Icons.Refresh size={13} />
              Reset Loot
            </button>
            <button
              type="button"
              className="btn btn--subtle btn--xs"
              disabled={busy || hunt.participantCount === 0}
              onClick={() => onAction('clearLooters', hunt)}
            >
              <Icons.Users size={13} />
              Clear Crew
            </button>
          </div>
          <button
            type="button"
            className="btn btn--danger btn--xs btn--block"
            disabled={busy}
            onClick={() => onAction('deleteHunt', hunt)}
          >
            <Icons.Trash size={13} />
            Delete Hunt Permanently
          </button>
        </div>
      </div>
    </div>
  );
};
