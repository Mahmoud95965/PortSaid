/**
 * Secure Server-Side Session Management
 * File: src/lib/auth/session.ts
 * 
 * Cryptographically seals and verifies session tokens in HttpOnly cookies.
 * Prevents tampering, client forgery, and replay of invalid sessions.
 */

import crypto from 'node:crypto';

export interface SessionPayload {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'admin' | 'merchant' | 'user';
  sessionVersion?: number;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'ps_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Server secret key fallback for development (production must set SESSION_SECRET)
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'portsaid_hub_dev_secret_key_change_in_prod_min32chars';
  return secret;
}

/**
 * Creates a cryptographically signed session token: base64(payload).base64(hmac)
 */
export function sealSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const payloadJson = JSON.stringify(fullPayload);
  const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url');

  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(payloadB64);
  const sigB64 = hmac.digest('base64url');

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies and unseals a signed session token. Returns null if invalid, tampered, or expired.
 */
export function unsealSessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;

  // 1. Verify cryptographic signature
  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(payloadB64);
  const expectedSigB64 = hmac.digest('base64url');

  const sigA = Buffer.from(sigB64, 'utf-8');
  const sigB = Buffer.from(expectedSigB64, 'utf-8');

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null; // Signature mismatch / tampered token
  }

  // 2. Decode payload
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as SessionPayload;

    // 3. Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return null; // Token expired
    }

    if (!payload.userId || !payload.role) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}
