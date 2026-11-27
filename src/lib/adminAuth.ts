import { NextRequest } from 'next/server';

/**
 * Optional server-side admin key gate.
 * If ADMIN_ACCESS_KEY is set in the environment, requests must pass a matching
 * X-Admin-Key header. If unset (e.g. local dev), admin routes remain open and
 * report authMode: 'open' so the UI reminds the owner to configure a key.
 */
export function verifyAdminAccess(request: NextRequest): {
  authorized: boolean;
  protectedMode: boolean;
} {
  const configuredKey = process.env.ADMIN_ACCESS_KEY?.trim();
  if (!configuredKey) {
    return { authorized: true, protectedMode: false };
  }

  const providedKey = request.headers.get('x-admin-key')?.trim() ?? '';
  return {
    authorized: providedKey.length > 0 && providedKey === configuredKey,
    protectedMode: true,
  };
}
