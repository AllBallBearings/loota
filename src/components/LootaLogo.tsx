'use client';

import React from 'react';

interface LootaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Custom Loota emblem: tactile outdoor compass-pin meets faceted treasure coin.
 */
export const LootaLogoMark: React.FC<LootaLogoProps> = ({ size = 34, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`loota-logo-mark ${className}`}
    aria-hidden="true"
  >
    {/* Tactile drop-shadow base */}
    <rect x="3" y="5" width="38" height="38" rx="12" fill="#16261D" />
    {/* Main emerald-pine tile */}
    <rect
      x="3"
      y="2"
      width="38"
      height="38"
      rx="12"
      fill="url(#lootaTileGrad)"
      stroke="#16261D"
      strokeWidth="2.4"
    />
    {/* Subtle top bevel highlight */}
    <path
      d="M12 5.5H32C35.5 5.5 38 8 38 11.5"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Map pin body in Trail-Blazer Orange */}
    <path
      d="M22 8.5C15.65 8.5 10.5 13.55 10.5 19.75C10.5 26.7 19.3 33.4 21.18 34.75C21.67 35.1 22.33 35.1 22.82 34.75C24.7 33.4 33.5 26.7 33.5 19.75C33.5 13.55 28.35 8.5 22 8.5Z"
      fill="#FF5428"
      stroke="#16261D"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Faceted Treasure Coin center */}
    <circle
      cx="22"
      cy="19.5"
      r="7.4"
      fill="url(#lootaCoinGrad)"
      stroke="#16261D"
      strokeWidth="2"
    />
    {/* 4-point Compass Star / Sparkle inside coin */}
    <path
      d="M22 14.3L23.5 18L27.2 19.5L23.5 21L22 24.7L20.5 21L16.8 19.5L20.5 18L22 14.3Z"
      fill="#FFFDF8"
      stroke="#16261D"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="lootaTileGrad" x1="6" y1="3" x2="39" y2="39" gradientUnits="userSpaceOnUse">
        <stop stopColor="#26C26B" />
        <stop offset="1" stopColor="#128A48" />
      </linearGradient>
      <linearGradient id="lootaCoinGrad" x1="16" y1="13" x2="28" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE566" />
        <stop offset="0.55" stopColor="#FFC21A" />
        <stop offset="1" stopColor="#E59800" />
      </linearGradient>
    </defs>
  </svg>
);
