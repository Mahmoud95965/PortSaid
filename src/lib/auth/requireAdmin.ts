/**
 * Server-side admin session guard.
 * File: src/lib/auth/requireAdmin.ts
 *
 * SERVER ONLY (uses next/headers + the sealed session). Never import
 * this file from a client component — import isAdminEmail from
 * src/lib/auth/admin.ts instead.
 */
import { cookies } from 'next/headers';
import { unsealSessionTokenAsync, SESSION_COOKIE_NAME, type SessionPayload } from '@/lib/auth/session';
import { isAdminSession } from '@/lib/auth/admin';

/**
 * Returns the sealed session payload only when it belongs to the single
 * admin account (portsaidhub@gmail.com). Returns null for visitors,
 * logged-out users, expired/tampered sessions, and any non-admin account.
 */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await unsealSessionTokenAsync(token);
  if (!session || !isAdminSession(session)) return null;
  return session;
}
