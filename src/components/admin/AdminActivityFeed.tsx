'use client';

import React from 'react';
import { Icons } from '@/components/Icons';
import type { AdminActivityEvent } from '@/app/api/admin/overview/route';

interface AdminActivityFeedProps {
  events: AdminActivityEvent[];
  onSelectHunt: (huntId: string) => void;
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const AdminActivityFeed: React.FC<AdminActivityFeedProps> = ({
  events,
  onSelectHunt,
}) => {
  if (events.length === 0) {
    return (
      <div className="empty">
        <span className="empty__icon">
          <Icons.Activity size={20} />
        </span>
        <span className="empty__title">No activity yet</span>
        <span className="empty__text">
          New hunt drops, joins, and loot claims will stream here in real time.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      {events.map((ev) => (
        <button
          key={ev.id}
          type="button"
          className="feed-item"
          onClick={() => onSelectHunt(ev.huntId)}
        >
          <span className={`feed-item__icon feed-item__icon--${ev.kind}`}>
            {ev.kind === 'claim' && <Icons.Coin size={14} weight="fill" />}
            {ev.kind === 'join' && <Icons.Users size={14} weight="fill" />}
            {ev.kind === 'created' && <Icons.Lightning size={14} weight="fill" />}
            {ev.kind === 'completed' && <Icons.Trophy size={14} weight="fill" />}
          </span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.4rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {ev.actorName}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  flexShrink: 0,
                }}
              >
                {formatRelativeTime(ev.timestamp)}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)' }}>
              {ev.detail}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-data)',
                fontWeight: 700,
                color: 'var(--sky-dark)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ev.huntName} →
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
