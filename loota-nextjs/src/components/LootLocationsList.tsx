'use client';

import React from 'react';
import { Icons } from '@/components/Icons';
import { PinData } from '../types/hunt';

interface LootLocationsListProps {
  pins: PinData[];
  onPinClick?: (pinId: string) => void;
  modalMode?: boolean;
  fixedHeight?: boolean;
}

const LootLocationsList: React.FC<LootLocationsListProps> = ({ pins, onPinClick, modalMode = false, fixedHeight = false }) => {
  const formatCoordinate = (value?: number) =>
    typeof value === 'number' ? value.toFixed(4) : 'N/A';

  const listContent = (
    <>
      {pins.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          No loot locations found in this hunt.
        </div>
      ) : (
        <div className="space-y-3">
          {pins.map((pin, index) => (
            <div 
              key={pin.id} 
              className={[
                'loot-location-card',
                modalMode ? 'loot-location-card--compact' : '',
                pin.collectedByUserId ? 'loot-location-card--collected' : 'loot-location-card--available'
              ].join(' ')}
              onClick={() => onPinClick && onPinClick(pin.id)}
            >
              <div className="loot-location-card__row">
                <div className="loot-location-card__title text-base">
                  <span className="text-slate-200">Loot #{index + 1}</span>
                </div>
                <span className={`loot-pill ${pin.collectedByUserId ? 'loot-pill--collected' : 'loot-pill--available'}`}>
                  {pin.collectedByUserId ? (
                    <>
                      <Icons.Check size={14} className="text-amber-200" />
                      Collected
                    </>
                  ) : (
                    <>
                      <Icons.Target size={14} className="text-emerald-200" />
                      Available
                    </>
                  )}
                </span>
              </div>
              
              <div className="loot-location-card__coords">
                <Icons.Pin size={16} className="inline text-rose-200 mr-1 align-middle" />
                <span className="align-middle">
                  {formatCoordinate(pin.lat)}, {formatCoordinate(pin.lng)}
                </span>
              </div>
              
              {pin.collectedByUserId && (
                <div className="loot-location-card__meta space-y-1">
                  <p className="text-amber-200 font-medium">
                    Collected by {pin.collectedByUser?.name || 'Unknown'}
                  </p>
                  <p className="loot-meta-muted">
                    {pin.collectedAt ? new Date(pin.collectedAt).toLocaleString() : 'Time unknown'}
                  </p>
                </div>
              )}

              {!pin.collectedByUserId && (
                <div className="loot-meta-muted">
                  Waiting to be claimed
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (modalMode) {
    return <div className="space-y-3 p-4">{listContent}</div>;
  }

  return (
    <div className={`card card-panel ${fixedHeight ? 'loot-list-card loot-list-card--fixed' : ''}`}>
      <div className="card-section card-section--divider card-section--header">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icons.Target className="text-emerald-200" size={20} />
          Loot Locations ({pins.length})
        </h3>
      </div>
      <div className={`card-section ${fixedHeight ? 'loot-list-scroll loot-list-scroll--sync' : ''}`}>{listContent}</div>
    </div>
  );
};

export { LootLocationsList };
