'use client';

import React, { useState } from 'react';
import { Icons } from './Icons';

interface JoinHuntButtonProps {
  huntId: string;
  currentUserId: string;
  onJoinSuccess?: () => void;
  onJoinError?: (error: string) => void;
  compact?: boolean;
}

export const JoinHuntButton: React.FC<JoinHuntButtonProps> = ({
  huntId,
  currentUserId,
  onJoinSuccess,
  onJoinError,
  compact = false,
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoinHunt = async () => {
    if (isJoining || hasJoined) return;

    setIsJoining(true);

    try {
      const response = await fetch(`/api/hunts/${huntId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_SECRET || '',
        },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409) {
          setHasJoined(true);
          onJoinSuccess?.();
          return;
        }

        throw new Error(errorData.error || 'Failed to join hunt');
      }

      setHasJoined(true);
      onJoinSuccess?.();
    } catch (err) {
      console.error('Error joining hunt:', err);
      const errorMessage = (err as Error).message || 'An unknown error occurred';
      onJoinError?.(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const sizeClass = compact ? 'btn--sm' : '';

  if (hasJoined) {
    return (
      <button type="button" className={`btn btn--ok ${sizeClass}`} disabled>
        <Icons.Check size={16} weight="fill" />
        <span>In the Hunt</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleJoinHunt}
      disabled={isJoining}
      className={`btn btn--primary ${sizeClass}`}
    >
      {isJoining ? (
        <>
          <span className="spinner" style={{ width: 15, height: 15, borderTopColor: '#FFFDF8' }} />
          <span>Joining…</span>
        </>
      ) : (
        <>
          <Icons.Lightning size={16} weight="fill" />
          <span>Join Hunt</span>
        </>
      )}
    </button>
  );
};
