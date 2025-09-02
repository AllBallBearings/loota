'use client';

import React from 'react';
import { PinData } from '../app/hunt/[huntId]/page';

interface LootLocationsListProps {
  pins: PinData[];
  onPinClick?: (pinId: string) => void;
  modalMode?: boolean;
  fixedHeight?: boolean;
}

const LootLocationsList: React.FC<LootLocationsListProps> = ({ pins, onPinClick, modalMode = false, fixedHeight = false }) => {
  const content = (
    <>
      {pins.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          No loota locations found in this hunt.
        </div>
      ) : (
        <div className={modalMode ? "space-y-2" : "space-y-3"}>
          {pins.map((pin, index) => (
            <div 
              key={pin.id} 
              className={`${modalMode ? 'p-3' : 'p-4'} rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                pin.collectedByUserId 
                  ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' 
                  : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              }`}
              onClick={() => onPinClick && onPinClick(pin.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`font-semibold text-slate-900 ${modalMode ? 'text-sm' : ''}`}>
                  📍 Loota #{index + 1}
                </div>
                <div className="flex-shrink-0">
                  {pin.collectedByUserId ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ${modalMode ? 'px-1.5 text-xs' : 'px-2.5'}`}>
                      ✓ COLLECTED
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 ${modalMode ? 'px-1.5 text-xs' : 'px-2.5'}`}>
                      🎯 AVAILABLE
                    </span>
                  )}
                </div>
              </div>
              
              <div className={`text-slate-600 mb-2 ${modalMode ? 'text-xs' : 'text-sm'}`}>
                📍 {pin.lat?.toFixed(4) || 'N/A'}, {pin.lng?.toFixed(4) || 'N/A'}
              </div>
              
              {pin.collectedByUserId && (
                <div className={`text-slate-500 pt-2 border-t border-slate-200 ${modalMode ? 'text-xs' : 'text-xs'}`}>
                  <div className="font-medium text-amber-700">
                    Collected by {pin.collectedByUser?.name || 'Unknown'}
                  </div>
                  {!modalMode && (
                    <div className="text-slate-400">
                      {pin.collectedAt ? new Date(pin.collectedAt).toLocaleString() : 'Time unknown'}
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
    return <div className="p-4">{content}</div>;
  }

  return (
    <div className={`card ${fixedHeight ? 'h-[672px] flex flex-col' : ''}`}>
      <div className="p-6 border-b border-slate-200 dark:border-dark-700 flex-shrink-0">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🎯 Loota Locations
        </h3>
      </div>
      <div className={`p-6 ${fixedHeight ? 'flex-1 overflow-y-auto' : ''}`}>{content}</div>
    </div>
  );
};

export { LootLocationsList };