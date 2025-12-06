'use client';

import React from 'react';
import { PinData } from '../types/hunt';
import { Icons } from '@/components/Icons';

interface LootLocationsListProps {
  pins: PinData[];
  onPinClick?: (pinId: string) => void;
  modalMode?: boolean;
  fixedHeight?: boolean;
  showTitle?: boolean;
}

const LootLocationsList: React.FC<LootLocationsListProps> = ({
  pins,
  onPinClick,
  modalMode = false,
  fixedHeight = false,
  showTitle = true,
}) => {
  const content = (
    <>
      {pins.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          No loot locations found in this hunt.
        </div>
      ) : (
        <div className={modalMode ? 'space-y-2' : 'space-y-3'}>
          {pins.map((pin, index) => (
            <div
              key={pin.id}
              className={`rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                modalMode ? 'p-3' : 'p-4'
              } ${
                pin.collectedByUserId
                  ? 'bg-amber-50/10 border-amber-300/20 hover:bg-amber-100/10 hover:border-amber-300/40'
                  : 'bg-emerald-50/10 border-emerald-300/20 hover:bg-emerald-100/10 hover:border-emerald-300/40'
              }`}
              onClick={() => onPinClick && onPinClick(pin.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div
                  className={`font-semibold text-slate-100 ${
                    modalMode ? 'text-sm' : ''
                  }`}
                >
                  <Icons.Target
                    className={
                      pin.collectedByUserId
                        ? 'inline-block mr-2 text-amber-300'
                        : 'inline-block mr-2 text-emerald-300'
                    }
                  />
                  Loot #{index + 1}
                </div>
                <div className="flex-shrink-0">
                  {pin.collectedByUserId ? (
                    <span
                      className={`inline-flex items-center rounded-full text-xs font-medium bg-amber-500/10 text-amber-200 ${
                        modalMode ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
                      }`}
                    >
                      ✓ COLLECTED
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-200 ${
                        modalMode ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
                      }`}
                    >
                      🎯 AVAILABLE
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`text-slate-400 mb-2 ${
                  modalMode ? 'text-xs' : 'text-sm'
                }`}
              >
                📍 {pin.lat?.toFixed(4) || 'N/A'},{' '}
                {pin.lng?.toFixed(4) || 'N/A'}
              </div>

              {pin.collectedByUserId && (
                <div
                  className={`text-slate-500 pt-2 border-t border-slate-700 ${
                    modalMode ? 'text-xs' : 'text-xs'
                  }`}
                >
                  <div className="font-medium text-amber-300/80">
                    Collected by {pin.collectedByUser?.name || 'Unknown'}
                  </div>
                  {!modalMode && (
                    <div className="text-slate-400">
                      {pin.collectedAt
                        ? new Date(pin.collectedAt).toLocaleString()
                        : 'Time unknown'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (modalMode) {
    return <div className="p-1">{content}</div>;
  }

  return (
    <div
      className={`card ${fixedHeight ? 'flex flex-col flex-1' : ''}`}
      style={fixedHeight ? { maxHeight: '30vh' } : {}}
    >
      {showTitle && (
        <div className="p-4 border-b border-slate-200 dark:border-dark-700 flex-shrink-0">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icons.Target className="text-slate-200" /> Loot Locations
          </h3>
        </div>
      )}
      <div
        className={`p-4 ${
          fixedHeight ? 'flex-1 overflow-y-auto min-h-0' : ''
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export { LootLocationsList };