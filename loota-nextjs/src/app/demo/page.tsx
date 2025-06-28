'use client';

import React from 'react';
import { UniversalLinkGenerator } from '@/components/UniversalLinkGenerator';

export default function DemoPage() {
  return (
    <>
      <header style={{ padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <h1 style={{ margin: 0, color: '#007bff' }}>Loota Universal Links Demo</h1>
      </header>

      <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2>Universal Link Generator Demo</h2>
          <p>This demonstrates how Universal Links work for sharing Loota hunts. When shared on iPhone, these links will open directly in the Loota app if installed, or in Safari if not.</p>
        </div>

        <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Sample Hunt: "Treasure Hunt Downtown"</h3>
          <p><strong>Hunt ID:</strong> downtown-treasure-2025</p>
          <p><strong>Type:</strong> Geolocation (Map-based)</p>
          <p><strong>Description:</strong> Find hidden treasures around the downtown area!</p>
          
          <div style={{ marginTop: '20px' }}>
            <h4>Share this Hunt:</h4>
            <UniversalLinkGenerator huntId="downtown-treasure-2025" />
          </div>
        </div>

        <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <h3>Sample Hunt: "Campus Adventure"</h3>
          <p><strong>Hunt ID:</strong> campus-adventure-123</p>
          <p><strong>Type:</strong> Proximity (Relative to Player)</p>
          <p><strong>Description:</strong> Explore the university campus and discover hidden gems!</p>
          
          <div style={{ marginTop: '20px' }}>
            <h4>Share this Hunt:</h4>
            <UniversalLinkGenerator huntId="campus-adventure-123" />
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
          <h3>How Universal Links Work</h3>
          <ul>
            <li><strong>📱 On iPhone with Loota app:</strong> Links open directly in the app</li>
            <li><strong>🌐 On iPhone without app:</strong> Links open in Safari with option to download app</li>
            <li><strong>💻 On other devices:</strong> Links open in web browser</li>
            <li><strong>🔗 Link format:</strong> https://loota-seven.vercel.app/hunt/[huntId]</li>
          </ul>
        </div>
      </main>

      <footer style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6', marginTop: '40px' }}>
        <p>&copy; 2025 Loota - Spreading Joy Through Discovery</p>
      </footer>
    </>
  );
}
