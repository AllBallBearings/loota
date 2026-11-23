'use client';

import React from 'react';
import { Icons } from '@/components/Icons';
import { PinData } from '../types/hunt';

interface LootLocationsListProps {
  pins: PinData[];
  onPinClick?: (pinId: string) => void;
  selectedPinId?: string | null;
  bare?: boolean;
  modalMode?: boolean;
  fixedHeight?: boolean;
}

const LootLocationsList: React.FC<LootLocationsListProps> = ({
  pins,
  onPinClick,
  selectedPinId = null,
  bare = false,
  modalMode = false,
}) => {
  const formatCoordinate = (value?: number) =>
    typeof value === 'number' ? value.toFixed(4) : '—';

  const formatProximity = (pin: PinData) => {
    if (typeof pin.distanceFt !== 'number' || !pin.directionStr) return null;
    return `${pin.distanceFt.toFixed(1)}ft ${pin.directionStr}`;
  };

  const collectedCount = pins.filter((p) => p.collectedByUserId).length;

  const content =
    pins.length === 0 ? (
      <div className="empty">
        <span className="empty__icon">
          <Icons.Treasure size={20} weight="fill" />
        </span>
        <span className="empty__title">No loot stashed yet</span>
        <span className="empty__text">This hunt doesn&apos;t have any active loot drops.</span>
      </div>
    ) : (
      <div style={{ display: 'grid', gap: '0.45rem' }}>
        {pins.map((pin, index) => {
          const collected = Boolean(pin.collectedByUserId);
          const isGift = pin.objectType === 'giftCard';
          const isSelected = selectedPinId === pin.id;
          const proximity = formatProximity(pin);

          return (
            <button
              key={pin.id}
              type="button"
              className={`loot-row ${collected ? 'loot-row--collected' : ''} ${
                isGift ? 'loot-row--gift' : ''
              } ${isSelected ? 'loot-row--selected' : ''}`}
              onClick={() => onPinClick?.(pin.id)}
            >
              <span className="loot-row__marker">
                {collected ? (
                  <Icons.Check size={15} weight="fill" />
                ) : (
                  index + 1
                )}
              </span>

              <span className="loot-row__body">
                <span className="loot-row__top">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', minWidth: 0 }}>
                    {isGift ? (
                      <Icons.Gift size={14} weight="fill" style={{ color: 'var(--epic-dark)', flexShrink: 0 }} />
                    ) : (
                      <Icons.Coin size={14} weight="fill" style={{ color: 'var(--gold-dark)', flexShrink: 0 }} />
                    )}
                    <span className="loot-row__coord">
                      {proximity ?? `${formatCoordinate(pin.lat)}, ${formatCoordinate(pin.lng)}`}
                    </span>
                  </span>
                  <span className="loot-row__status">{collected ? 'Claimed' : 'Open'}</span>
                </span>
                <span className="loot-row__sub">
                  {collected
                    ? `Claimed by ${pin.collectedByUser?.name || 'Hunter'}${
                        pin.collectedAt
                          ? ` · ${new Date(pin.collectedAt).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}`
                          : ''
                      }`
                    : `${isGift ? 'Rare Gift Card' : 'Gold Coin'} · Tap to locate`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );

  if (bare || modalMode) {
    return content;
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <Icons.Treasure size={16} weight="fill" style={{ color: 'var(--gold-dark)' }} />
        <span className="panel__title">Loot Stashes</span>
        <span className="panel__meta">
          {collectedCount}/{pins.length}
        </span>
      </div>
      <div className="panel__body panel__body--flush">{content}</div>
    </div>
  );
};

export { LootLocationsList };
