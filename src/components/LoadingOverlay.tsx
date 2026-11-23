'use client';

import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading…',
  subMessage,
}) => {
  if (!isLoading) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(243, 239, 227, 0.86)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="flex flex-col items-center gap-2.5 text-center"
        style={{
          padding: '1.1rem 1.4rem',
          borderRadius: 'var(--r-lg)',
          border: '2px solid var(--outline)',
          background: 'var(--surface)',
          boxShadow: '0 4px 0 var(--outline)',
        }}
      >
        <div className="spinner" style={{ width: 26, height: 26 }} />
        <div>
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--ink)' }}>
            {message}
          </p>
          {subMessage && (
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-3)' }}>
              {subMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
