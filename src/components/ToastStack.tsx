'use client';

import React from 'react';
import { Icons } from './Icons';

export interface ToastItem {
  id: number;
  message: string;
  tone?: 'info' | 'ok' | 'warn' | 'danger';
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.tone ? `toast--${toast.tone}` : ''}`}
        >
          {toast.tone === 'ok' && <Icons.Check size={18} weight="fill" style={{ color: 'var(--meadow-dark)', flexShrink: 0 }} />}
          {toast.tone === 'warn' && <Icons.Warning size={18} weight="fill" style={{ color: '#9A6500', flexShrink: 0 }} />}
          {toast.tone === 'danger' && <Icons.Close size={18} weight="fill" style={{ color: 'var(--danger)', flexShrink: 0 }} />}
          {(!toast.tone || toast.tone === 'info') && <Icons.Sparkle size={18} weight="fill" style={{ color: 'var(--blaze)', flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: 'inherit',
              opacity: 0.7,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icons.Close size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  bullets?: string[];
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  bullets = [],
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div style={{ padding: '1.25rem 1.35rem 1rem', borderBottom: '1.5px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                border: '2px solid var(--outline)',
                background: danger ? 'var(--danger-soft)' : 'var(--gold-soft)',
                color: danger ? 'var(--danger-dark)' : '#7C5200',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icons.Warning size={18} weight="fill" />
            </span>
            <h2 style={{ fontSize: '1.15rem' }}>{title}</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink-2)' }}>{description}</p>
        </div>

        <div style={{ padding: '1rem 1.35rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bullets.length > 0 && (
            <ul
              style={{
                margin: 0,
                padding: '0.7rem 0.9rem 0.7rem 1.6rem',
                borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--line-strong)',
                background: 'var(--bg)',
                fontSize: '0.8rem',
                color: 'var(--ink-2)',
                display: 'grid',
                gap: '0.3rem',
              }}
            >
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
            <button type="button" className="btn btn--subtle" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" style={{ width: 15, height: 15 }} />
                  Working…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
