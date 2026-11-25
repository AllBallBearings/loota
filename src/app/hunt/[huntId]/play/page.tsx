'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { MobileHuntPlayer } from '@/components/ar/MobileHuntPlayer';

function PlayPageInner() {
  const params = useParams();
  const huntId = params.huntId as string;

  return <MobileHuntPlayer huntId={huntId} />;
}

export default function HuntPlayPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F3EFE3',
            color: '#16261D',
            fontWeight: 800,
          }}
        >
          Loading Loota AR…
        </div>
      }
    >
      <PlayPageInner />
    </Suspense>
  );
}
