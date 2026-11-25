'use client';

import React from 'react';
import Link from 'next/link';
import { LootaLogoMark } from './LootaLogo';

const NAV = [
  { href: '/', label: 'Drop Studio' },
  { href: '/ar-lab', label: 'AR Lab' },
  { href: '/swagger', label: 'API' },
  { href: '/support', label: 'Support' },
];

interface TopBarProps {
  /** Show the animated word reel next to the brand mark. */
  reel?: boolean;
  /** Slot rendered in the middle or right of the bar. */
  centerSlot?: React.ReactNode;
  /** Slot rendered at the far right of the bar, after the nav. */
  actions?: React.ReactNode;
  current?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  reel = false,
  centerSlot,
  actions,
  current,
}) => (
  <header className="topbar">
    <Link href="/" className="brand" aria-label="Loota home">
      <LootaLogoMark size={34} />
      <span className="brand__stack">
        <span className="brand__row">
          <span className="brand__word">Loota</span>
          {reel && (
            <span className="brand__reel" aria-hidden="true">
              <span className="brand__reel-track">
                <span>coin drop</span>
                <span>park quest</span>
                <span>gift stash</span>
                <span>crew hunt</span>
                <span>coin drop</span>
              </span>
            </span>
          )}
        </span>
      </span>
    </Link>

    {centerSlot && <div className="topbar__center">{centerSlot}</div>}

    <nav className="topnav" aria-label="Primary">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={current === item.href ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
      {actions && (
        <>
          <span className="topbar__divider" aria-hidden="true" />
          <div className="topbar__actions">{actions}</div>
        </>
      )}
    </nav>
  </header>
);

export const Footer: React.FC = () => (
  <footer className="footer">
    <div className="footer__inner">
      <span className="footer__copy">
        <LootaLogoMark size={20} />
        © {new Date().getFullYear()} Loota · Real-World AR Hunts
      </span>
      <nav className="footer__links">
        <Link href="/support">Support</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/swagger">API Docs</Link>
      </nav>
    </div>
  </footer>
);
