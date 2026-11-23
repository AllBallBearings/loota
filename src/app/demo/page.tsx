'use client';

import React from 'react';
import { UniversalLinkGenerator } from '@/components/UniversalLinkGenerator';
import { TopBar, Footer } from '@/components/AppShell';
import { Icons } from '@/components/Icons';

const SAMPLES = [
  {
    id: 'downtown-treasure-2025',
    name: 'Treasure Hunt Downtown',
    type: 'Geolocation (map-based)',
    description: 'Find hidden treasures around the downtown area.',
  },
  {
    id: 'campus-adventure-123',
    name: 'Campus Adventure',
    type: 'Proximity (relative to player)',
    description: 'Explore the university campus and discover hidden gems.',
  },
];

export default function DemoPage() {
  return (
    <div className="app">
      <TopBar />
      <main className="doc">
        <p className="doc__eyebrow">Developers</p>
        <h1 className="doc__title">Universal Links</h1>
        <p className="doc__lede">
          How hunt links behave across devices. Shared on iPhone, these open directly in the
          Loota app when installed — otherwise they fall back to the browser.
        </p>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {SAMPLES.map(sample => (
            <div key={sample.id} className="panel">
              <div className="panel__head">
                <Icons.Treasure size={15} className="text-[var(--volt)]" />
                <span className="panel__title">{sample.name}</span>
                <span className="panel__meta">{sample.id}</span>
              </div>
              <div className="panel__body">
                <p style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>{sample.description}</p>
                <p style={{ marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--ink-400)' }}>
                  {sample.type}
                </p>
                <UniversalLinkGenerator huntId={sample.id} />
              </div>
            </div>
          ))}
        </div>

        <div className="doc__body">
          <h2>How universal links resolve</h2>
          <ul>
            <li><strong>iPhone with the app installed</strong> — opens directly in Loota</li>
            <li><strong>iPhone without the app</strong> — opens in Safari with a download prompt</li>
            <li><strong>Any other device</strong> — opens in the web browser</li>
          </ul>
          <p>
            Link format: <code style={{ fontFamily: 'var(--font-data)', color: 'var(--volt-bright)' }}>
              https://www.loota.fun/hunt/[huntId]
            </code>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
