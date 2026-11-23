'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TopBar, Footer } from '@/components/AppShell';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
});

function Docs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    async function fetchSpec() {
      const response = await fetch('/api/swagger.json');
      const data = await response.json();
      setSpec(data);
    }

    fetchSpec();
  }, []);

  return (
    <div className="app">
      <TopBar current="/swagger" />
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <p className="doc__eyebrow">Reference</p>
        <h1 className="doc__title">API</h1>
        <p className="doc__lede">
          Every Loota endpoint, with request and response schemas. Try calls directly from this page.
        </p>

        {!spec ? (
          <div className="empty">
            <div className="spinner" style={{ width: 24, height: 24 }} />
            <span className="empty__text">Loading specification…</span>
          </div>
        ) : (
          <div className="swagger-shell">
            <SwaggerUI spec={spec} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default Docs;
