'use client';

import React, { useState } from 'react';
import { Icons } from './Icons';

interface JoinHuntButtonProps {
  huntId: string;
  currentUserId: string;
  onJoinSuccess?: () => void;
  onJoinError?: (error: string) => void;
}

export const JoinHuntButton: React.FC<JoinHuntButtonProps> = ({
  huntId,
  currentUserId,
  onJoinSuccess,
  onJoinError
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

        // If user is already participating, treat as success
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

  if (hasJoined) {
    return (
      <button
        className="btn btn-success flex items-center gap-2 cursor-default"
        disabled
      >
        <Icons.Check className="text-emerald-900" size={18} />
        <span>Joined Hunt</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleJoinHunt}
      disabled={isJoining}
      className={`btn btn-primary flex items-center gap-2 ${isJoining ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {isJoining ? (
        <>
          <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
          <span>Joining Hunt...</span>
        </>
      ) : (
        <>
          <Icons.Target className="text-slate-100" size={18} />
          <span>Join Hunt</span>
        </>
      )}
    </button>
  );
};
