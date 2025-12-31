'use client';

import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = "Loading...",
  subMessage
}) => {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 rounded-2xl overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.22), transparent 55%), radial-gradient(circle at 80% 10%, rgba(34, 211, 238, 0.18), transparent 50%), rgba(9, 14, 32, 0.92)',
          backdropFilter: 'blur(16px)',
        }}
      />
      <div className="relative flex flex-col items-center gap-5 p-8">
        <div
          className="spinner"
          style={{
            width: '46px',
            height: '46px',
            border: '4px solid rgba(148, 163, 184, 0.2)',
            borderTopColor: 'var(--accent-cyan)',
            borderRadius: '9999px',
            animation: 'spin 1s linear infinite',
            boxShadow: '0 0 25px rgba(34, 211, 238, 0.35)',
          }}
        ></div>
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {message}
          </p>
          {subMessage && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
