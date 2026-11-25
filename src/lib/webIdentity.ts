/**
 * Persistent browser-side player identity for Loota Mobile Web AR.
 * Mirrors loota-mobile's UIDevice.vendorId + @AppStorage identity lifecycle
 * so web players seamlessly share the same User / HuntParticipation / Pin models.
 */

export interface StoredWebPlayer {
  deviceId: string;
  userId: string | null;
  name: string;
  phone: string;
}

const STORAGE_KEYS = {
  deviceId: 'loota_web_device_id',
  userId: 'loota_web_user_id',
  name: 'loota_web_user_name',
  phone: 'loota_web_user_phone',
  collectedPins: 'loota_web_collected_pins',
} as const;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function cleanPhoneDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

export function isValidUSPhone(input: string): boolean {
  return cleanPhoneDigits(input).length === 10;
}

export function formatUSPhone(input: string): string {
  const digits = cleanPhoneDigits(input);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function getOrCreateWebPlayer(): StoredWebPlayer {
  if (typeof window === 'undefined') {
    return { deviceId: '', userId: null, name: '', phone: '' };
  }

  let deviceId = window.localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!deviceId) {
    deviceId = `web-${generateUUID()}`;
    window.localStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
  }

  return {
    deviceId,
    userId: window.localStorage.getItem(STORAGE_KEYS.userId),
    name: window.localStorage.getItem(STORAGE_KEYS.name) || '',
    phone: window.localStorage.getItem(STORAGE_KEYS.phone) || '',
  };
}

export function saveWebPlayer(update: Partial<StoredWebPlayer>): StoredWebPlayer {
  const current = getOrCreateWebPlayer();
  const next: StoredWebPlayer = {
    deviceId: update.deviceId ?? current.deviceId,
    userId: update.userId !== undefined ? update.userId : current.userId,
    name: update.name !== undefined ? update.name : current.name,
    phone: update.phone !== undefined ? update.phone : current.phone,
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEYS.deviceId, next.deviceId);
    if (next.userId) {
      window.localStorage.setItem(STORAGE_KEYS.userId, next.userId);
    }
    window.localStorage.setItem(STORAGE_KEYS.name, next.name);
    window.localStorage.setItem(STORAGE_KEYS.phone, next.phone);
  }
  return next;
}

/**
 * Looks up an existing backend user by browser deviceId, or registers / updates them.
 */
export async function syncWebPlayerWithBackend(params: {
  name: string;
  phone: string;
}): Promise<StoredWebPlayer> {
  const stored = getOrCreateWebPlayer();
  const trimmedName = params.name.trim() || 'Anonymous';
  const cleanedPhone = cleanPhoneDigits(params.phone);

  // 1. If we don't have a cached userId, check if deviceId already exists in DB
  let userId = stored.userId;
  if (!userId) {
    try {
      const lookupRes = await fetch(
        `/api/users?deviceId=${encodeURIComponent(stored.deviceId)}`
      );
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        const users = Array.isArray(lookupData) ? lookupData : lookupData?.users;
        if (Array.isArray(users) && users.length > 0 && users[0]?.id) {
          userId = users[0].id;
        }
      }
    } catch (err) {
      console.warn('[webIdentity] Device lookup failed, continuing to register:', err);
    }
  }

  // 2. Register if still no userId
  if (!userId) {
    const regRes = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        phone: cleanedPhone || undefined,
        deviceId: stored.deviceId,
      }),
    });

    const regData = await regRes.json();
    if (!regRes.ok) {
      // Handle phone uniqueness conflict gracefully by retrying without phone on user record
      // (phone is still stored on HuntParticipation.participantPhone)
      if (regRes.status === 409) {
        const fallbackRes = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            deviceId: stored.deviceId,
          }),
        });
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok) {
          throw new Error(fallbackData.error || fallbackData.message || 'Registration failed');
        }
        userId = fallbackData.userId || fallbackData.existingUser?.id;
      } else {
        throw new Error(regData.error || regData.message || 'Registration failed');
      }
    } else {
      userId = regData.userId || regData.existingUser?.id;
    }
  } else {
    // 3. Update name/phone on existing user record (best-effort)
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: stored.deviceId,
          name: trimmedName,
          phone: cleanedPhone || undefined,
        }),
      });
    } catch (err) {
      console.warn('[webIdentity] User update failed (non-fatal):', err);
    }
  }

  if (!userId) {
    throw new Error('Could not establish player user ID.');
  }

  return saveWebPlayer({
    userId,
    name: trimmedName,
    phone: cleanedPhone,
  });
}

export async function joinHuntAsWebPlayer(params: {
  huntId: string;
  userId: string;
  phone?: string;
}): Promise<{ joined: boolean; rejoined: boolean }> {
  const res = await fetch(`/api/client/hunts/${params.huntId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: params.userId,
      participantPhone: params.phone ? cleanPhoneDigits(params.phone) : undefined,
    }),
  });

  if (res.status === 409) {
    return { joined: true, rejoined: true };
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Failed to join hunt');
  }

  return { joined: true, rejoined: false };
}

export async function collectPinAsWebPlayer(params: {
  huntId: string;
  pinId: string;
  userId: string;
}): Promise<{
  collected: boolean;
  alreadyCollected: boolean;
  huntCompleted?: boolean;
  winnerId?: string | null;
  remainingPins?: number;
}> {
  const res = await fetch(
    `/api/client/hunts/${params.huntId}/pins/${params.pinId}/collect`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectedByUserId: params.userId }),
    }
  );

  if (res.status === 409) {
    return { collected: false, alreadyCollected: true };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to collect loot');
  }

  return {
    collected: true,
    alreadyCollected: false,
    huntCompleted: data.huntCompleted,
    winnerId: data.winnerId,
    remainingPins: data.remainingPins,
  };
}
