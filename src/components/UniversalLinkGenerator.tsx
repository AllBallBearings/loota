'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { QRCodeSvg } from './QRCodeSvg';

interface UniversalLinkGeneratorProps {
  huntId: string;
  className?: string;
  showQr?: boolean;
}

export const UniversalLinkGenerator: React.FC<UniversalLinkGeneratorProps> = ({
  huntId,
  className = '',
  showQr = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://www.loota.fun');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const universalLink = `${origin}/hunt/${huntId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(universalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
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
          text: 'Jump into this real-world AR treasure hunt on Loota',
          url: universalLink,
        });
        return;
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
    copyToClipboard();
  };

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, width: '100%' }}
    >
      {showQr && (
        <div className="qr-pass">
          <div className="qr-pass__frame">
            <QRCodeSvg value={universalLink} size={154} />
          </div>
          <div>
            <p className="qr-pass__caption">Scan on iPhone to Play in AR</p>
            <p className="qr-pass__sub">
              Opens straight in the Loota app when installed, or in Safari as a live web hunt.
            </p>
          </div>
        </div>
      )}

      <div className="linkbox">
        <Icons.Qr size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
        <a
          href={universalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="linkbox__url"
        >
          {universalLink}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <button type="button" className="btn btn--subtle btn--sm" onClick={copyToClipboard}>
          {copied ? (
            <>
              <Icons.Check size={15} weight="fill" style={{ color: 'var(--meadow-dark)' }} />
              Copied!
            </>
          ) : (
            <>
              <Icons.Copy size={15} />
              Copy link
            </>
          )}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={shareLink}>
          <Icons.Share size={15} />
          Share drop
        </button>
      </div>
    </div>
  );
};

export default UniversalLinkGenerator;
