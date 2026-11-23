'use client';

import React from 'react';
import { Icons } from './Icons';

interface LootToken3DProps {
  type: 'coin' | 'giftCard' | string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Tactile CSS 3D loot tokens: an extruded spinning Gold Coin and a tilting
 * holographic Rare Gift Card. GPU-accelerated, zero WebGL overhead.
 */
export const LootToken3D: React.FC<LootToken3DProps> = ({ type, size = 'md' }) => {
  if (type === 'giftCard') {
    const sizeClass = size === 'lg' ? 'card3d--lg' : '';
    return (
      <span className="token3d-stage" aria-hidden="true">
        <span className={`card3d ${sizeClass}`}>
          <span className="card3d__ribbon-h" />
          <span className="card3d__ribbon-v" />
          <span className="card3d__bow">
            <Icons.Sparkle size={size === 'lg' ? 13 : 10} weight="fill" />
          </span>
          <span className="card3d__sheen" />
        </span>
      </span>
    );
  }

  const sizeClass = size === 'sm' ? 'coin3d--sm' : size === 'lg' ? 'coin3d--lg' : '';

  return (
    <span className="token3d-stage" aria-hidden="true">
      <span className={`coin3d ${sizeClass}`}>
        <span className="coin3d__face coin3d__face--back">
          <svg viewBox="0 0 24 24" className="coin3d__star" fill="currentColor">
            <path d="M12 2.5L14.4 9.6L21.5 12L14.4 14.4L12 21.5L9.6 14.4L2.5 12L9.6 9.6L12 2.5Z" />
          </svg>
        </span>
        <span className="coin3d__face coin3d__face--mid" />
        <span className="coin3d__face coin3d__face--front">
          <svg viewBox="0 0 24 24" className="coin3d__star" fill="currentColor">
            <path d="M12 2.5L14.4 9.6L21.5 12L14.4 14.4L12 21.5L9.6 14.4L2.5 12L9.6 9.6L12 2.5Z" />
          </svg>
        </span>
      </span>
    </span>
  );
};
