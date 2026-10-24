/**
 * Secure Server-Side Session Management
 * File: src/lib/auth/session.ts
 * 
 * Cryptographically seals and verifies session tokens in HttpOnly cookies.
 * Prevents tampering, client forgery, and replay of invalid sessions.
 */

import crypto from 'node:crypto';

export interface SessionPayload {
  sessionId: string;
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

const DEV_FALLBACK_SECRET = 'portsaid_hub_dev_secret_only_local_dev_minimum_32_characters';

// Server secret key validation: Enforced strictly in production without insecure fallback
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32 || secret === DEV_FALLBACK_SECRET) {
      throw new Error(
        'FATAL_SECURITY_CONFIG: In production, SESSION_SECRET must be set, unique, and contain at least 32 characters.'
      );
    }
    return secret;
  }

  // Development/Test fallback only
  return secret || DEV_FALLBACK_SECRET;
}

// In-Memory Revocation Store for instantaneous session invalidation
const revokedSessionIds = new Set<string>();
const userRevocationTimestamps = new Map<string, number>();

export function revokeSession(sessionId: string): void {
  if (sessionId) {
    revokedSessionIds.add(sessionId);
  }
}

export function revokeAllUserSessions(userId: string): void {
  if (userId) {
    userRevocationTimestamps.set(userId, Math.floor(Date.now() / 1000));
  }
}

export function isSessionRevoked(payload: SessionPayload): boolean {
  if (payload.sessionId && revokedSessionIds.has(payload.sessionId)) {
    return true;
  }
  const minIat = userRevocationTimestamps.get(payload.userId);
  if (minIat && payload.iat <= minIat) {
    return true;
  }
  return false;
}

/**
 * Creates a cryptographically signed session token: base64(payload).base64(hmac)
 */
export function sealSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp' | 'sessionId'> & { sessionId?: string },
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
): string {
  let now = Math.floor(Date.now() / 1000);
  const minIat = userRevocationTimestamps.get(payload.userId);
  if (minIat && now <= minIat) {
    now = minIat + 1;
  }

  const fullPayload: SessionPayload = {
    sessionId: payload.sessionId || crypto.randomUUID(),
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    sessionVersion: payload.sessionVersion || 1,
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
 * Verifies and unseals a signed session token. Returns null if invalid, tampered, expired, or revoked.
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

    // 4. Check revocation status
    if (isSessionRevoked(payload)) {
      return null; // Token revoked
    }

    return payload;
  } catch (err) {
    return null;
  }
}
