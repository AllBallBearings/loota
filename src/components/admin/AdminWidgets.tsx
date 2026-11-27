'use client';

import React, { useState } from 'react';
import { Icons } from '@/components/Icons';
import type { AdminOverviewResponse } from '@/app/api/admin/overview/route';

interface AdminWidgetsProps {
  data: AdminOverviewResponse;
  onQuickFilter: (opts: { type?: 'all' | 'geolocation' | 'proximity'; loot?: 'all' | 'coin' | 'giftCard' }) => void;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || '?';

export const AdminWidgets: React.FC<AdminWidgetsProps> = ({ data, onQuickFilter }) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [leaderMode, setLeaderMode] = useState<'creators' | 'looters'>('creators');

  const { kpis, dailyActivity, topCreators, topLooters } = data;

  const maxDailyVal = Math.max(
    1,
    ...dailyActivity.map((d) => Math.max(d.huntsCreated, d.pinsClaimed))
  );

  const activeDay = hoveredDay !== null ? dailyActivity[hoveredDay] : null;
  const total14dHunts = dailyActivity.reduce((acc, d) => acc + d.huntsCreated, 0);
  const total14dClaims = dailyActivity.reduce((acc, d) => acc + d.pinsClaimed, 0);

  const mapPct =
    kpis.totalHunts > 0 ? Math.round((kpis.geolocationHunts / kpis.totalHunts) * 100) : 50;
  const proxPct = 100 - mapPct;

  const coinPct =
    kpis.totalPins > 0 ? Math.round((kpis.coinPins / kpis.totalPins) * 100) : 50;
  const giftPct = 100 - coinPct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Widget 1: 14-Day Activity Pulse */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Chart size={16} weight="fill" style={{ color: 'var(--blaze)' }} />
          <span className="panel__title">14-Day Pulse</span>
          <span className="panel__meta">
            {activeDay
              ? `${activeDay.label}: ${activeDay.huntsCreated}H · ${activeDay.pinsClaimed}C`
              : `${total14dHunts} hunts · ${total14dClaims} claims`}
          </span>
        </div>
        <div className="panel__body">
          <div className="chart-bars" onMouseLeave={() => setHoveredDay(null)}>
            {dailyActivity.map((day, idx) => {
              const hPct = Math.round((day.huntsCreated / maxDailyVal) * 100);
              const cPct = Math.round((day.pinsClaimed / maxDailyVal) * 100);
              return (
                <div
                  key={day.date}
                  className="chart-col"
                  onMouseEnter={() => setHoveredDay(idx)}
                  title={`${day.label}: ${day.huntsCreated} hunts created, ${day.pinsClaimed} pins claimed`}
                >
                  <div className="chart-col__pair">
                    <div
                      className={`chart-bar chart-bar--hunts ${
                        day.huntsCreated === 0 ? 'chart-bar--zero' : ''
                      }`}
                      style={{ height: `${Math.max(4, hPct)}%` }}
                    />
                    <div
                      className={`chart-bar chart-bar--claims ${
                        day.pinsClaimed === 0 ? 'chart-bar--zero' : ''
                      }`}
                      style={{ height: `${Math.max(4, cPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.45rem',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-data)',
              fontWeight: 700,
              color: 'var(--ink-3)',
            }}
          >
            <span>{dailyActivity[0]?.label}</span>
            <span style={{ display: 'inline-flex', gap: '0.7rem', color: 'var(--ink-2)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: 'var(--blaze)',
                    border: '1px solid var(--outline)',
                  }}
                />
                Hunts
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: 'var(--meadow)',
                    border: '1px solid var(--outline)',
                  }}
                />
                Claims
              </span>
            </span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Widget 2: Format & Loot Economy Breakdown */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Treasure size={16} weight="fill" style={{ color: 'var(--gold-dark)' }} />
          <span className="panel__title">Format &amp; Loot Mix</span>
          <span className="panel__meta">{kpis.claimRatePct}% claimed</span>
        </div>
        <div className="panel__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Hunt Format Split */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.74rem',
                fontWeight: 800,
                marginBottom: '0.3rem',
              }}
            >
              <button
                type="button"
                onClick={() => onQuickFilter({ type: 'geolocation' })}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: 'var(--ink)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Filter by GPS Map hunts"
              >
                <Icons.Map size={13} style={{ color: 'var(--gold-dark)' }} />
                GPS Map ({kpis.geolocationHunts})
              </button>
              <button
                type="button"
                onClick={() => onQuickFilter({ type: 'proximity' })}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: 'var(--sky-dark)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Filter by Proximity hunts"
              >
                Proximity ({kpis.proximityHunts})
                <Icons.Proximity size={13} />
              </button>
            </div>
            <div className="split-meter">
              <div
                className="split-meter__seg"
                style={{ width: `${mapPct}%`, background: 'var(--gold)' }}
              />
              <div
                className="split-meter__seg"
                style={{ width: `${proxPct}%`, background: 'var(--sky)' }}
              />
            </div>
          </div>

          {/* Loot Type Split */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.74rem',
                fontWeight: 800,
                marginBottom: '0.3rem',
              }}
            >
              <button
                type="button"
                onClick={() => onQuickFilter({ loot: 'coin' })}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: '#7C5200',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Filter hunts with Gold Coins"
              >
                <Icons.Coin size={13} weight="fill" />
                Coins ({kpis.coinPins})
              </button>
              <button
                type="button"
                onClick={() => onQuickFilter({ loot: 'giftCard' })}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: 'var(--epic-dark)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Filter hunts with Gift Cards"
              >
                Gift Cards ({kpis.giftCardPins})
                <Icons.Gift size={13} weight="fill" />
              </button>
            </div>
            <div className="split-meter">
              <div
                className="split-meter__seg"
                style={{ width: `${coinPct}%`, background: 'var(--gold-bright)' }}
              />
              <div
                className="split-meter__seg"
                style={{ width: `${giftPct}%`, background: 'var(--epic)' }}
              />
            </div>
          </div>

          {/* Global Claim Funnel */}
          <div className="inspector-kv">
            <div className="inspector-kv__box">
              <span className="inspector-kv__k">Open Stashes</span>
              <span className="inspector-kv__v">
                {Math.max(0, kpis.totalPins - kpis.collectedPins)} waiting
              </span>
            </div>
            <div className="inspector-kv__box">
              <span className="inspector-kv__k">Avg Drops / Hunt</span>
              <span className="inspector-kv__v">
                {kpis.totalHunts > 0 ? (kpis.totalPins / kpis.totalHunts).toFixed(1) : '0.0'} pins
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Widget 3: Top Hosts & Top Looters Leaderboard */}
      <div className="panel">
        <div className="panel__head">
          <Icons.Trophy size={16} weight="fill" style={{ color: 'var(--gold-dark)' }} />
          <span className="panel__title">Platform Leaders</span>
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
            <button
              type="button"
              className={`btn btn--xs ${leaderMode === 'creators' ? 'btn--gold' : 'btn--ghost'}`}
              onClick={() => setLeaderMode('creators')}
            >
              Hosts
            </button>
            <button
              type="button"
              className={`btn btn--xs ${leaderMode === 'looters' ? 'btn--gold' : 'btn--ghost'}`}
              onClick={() => setLeaderMode('looters')}
            >
              Looters
            </button>
          </div>
        </div>

        <div className="panel__body panel__body--flush" style={{ display: 'grid', gap: '0.35rem' }}>
          {leaderMode === 'creators' ? (
            topCreators.length > 0 ? (
              topCreators.map((creator, idx) => (
                <div
                  key={creator.id}
                  className={`podium-row ${idx === 0 ? 'podium-row--lead' : ''}`}
                >
                  <span className="podium-row__rank">
                    {idx === 0 ? <Icons.Crown size={15} weight="fill" /> : `#${idx + 1}`}
                  </span>
                  <span className={`avatar ${idx === 0 ? 'avatar--lead' : ''}`}>
                    {getInitials(creator.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="podium-row__name">{creator.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontWeight: 600 }}>
                      {creator.totalParticipants} crew · {creator.totalPinsPlaced} pins
                    </div>
                  </div>
                  <div className="podium-row__score">
                    <div className="podium-row__score-val">{creator.huntsCreated}</div>
                    <div className="podium-row__score-lbl">
                      {creator.huntsCreated === 1 ? 'hunt' : 'hunts'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '1rem' }}>
                <span className="empty__text">No hosts recorded yet.</span>
              </div>
            )
          ) : topLooters.length > 0 ? (
            topLooters.map((looter, idx) => (
              <div
                key={looter.id}
                className={`podium-row ${idx === 0 ? 'podium-row--lead' : ''}`}
              >
                <span className="podium-row__rank">
                  {idx === 0 ? <Icons.Crown size={15} weight="fill" /> : `#${idx + 1}`}
                </span>
                <span className={`avatar ${idx === 0 ? 'avatar--lead' : ''}`}>
                  {getInitials(looter.name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="podium-row__name">{looter.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontWeight: 600 }}>
                    {looter.huntsJoined} joined · {looter.huntsWon} won
                  </div>
                </div>
                <div className="podium-row__score">
                  <div className="podium-row__score-val">{looter.pinsCollected}</div>
                  <div className="podium-row__score-lbl">claims</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: '1rem' }}>
              <span className="empty__text">No looters recorded yet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
