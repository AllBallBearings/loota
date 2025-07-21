'use client';

import React, { useState } from 'react';

interface UniversalLinkGeneratorProps {
  huntId: string;
  className?: string;
}

export const UniversalLinkGenerator: React.FC<UniversalLinkGeneratorProps> = ({ 
  huntId, 
  className = '' 
}) => {
  const [copied, setCopied] = useState(false);
  
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://loota-seven.vercel.app';
  
  const universalLink = `${baseUrl}/hunt/${huntId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(universalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = universalLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Loota Hunt!',
          text: 'Check out this treasure hunt I created',
          url: universalLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className={`universal-link-generator ${className}`}>
      <div className="link-display">
        <a 
          href={universalLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #007bff',
            borderRadius: '4px',
            backgroundColor: '#f8f9fa',
            fontSize: '14px',
            fontFamily: 'monospace',
            textDecoration: 'none',
            color: '#007bff',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            wordBreak: 'break-all'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e9ecef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
          }}
        >
          {universalLink}
        </a>
      </div>
      
      <div className="link-actions" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
        <button 
          onClick={copyToClipboard}
          style={{
            padding: '8px 16px',
            backgroundColor: copied ? '#4CAF50' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
        
        <button 
          onClick={shareLink}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Share Hunt
        </button>
      </div>
      
      <div className="link-info" style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        <p>🔗 Click the link above to open in a new tab, or use the buttons to copy/share</p>
        <p>📱 This link will open in the Loota app on iPhone when shared</p>
        <p>🌐 Or open in the browser if the app isn&apos;t installed</p>
      </div>
    </div>
  );
};

export default UniversalLinkGenerator;
