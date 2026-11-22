/**
 * Canonical site URLs for Port Said Hub.
 * File: src/lib/site.ts
 *
 * The production site is served from https://www.port-said-hub.site; the apex
 * https://port-said-hub.site 308-redirects to www (Vercel domain redirects
 * preserve the path and query string, so an OAuth `?code=` survives the hop).
 * Google OAuth therefore requests the apex callback URL below, and the
 * www variant is also allow-listed in Supabase as a safety net.
 */

/** Production origin (apex) — the final redirect target after Google login. */
export const PRODUCTION_SITE_URL = 'https://port-said-hub.site';

/** Production origin (www) — the host that actually serves the site. */
export const PRODUCTION_SITE_URL_WWW = 'https://www.port-said-hub.site';

/** Privacy policy and terms URLs (Google OAuth branding). The /privacy and
 *  /terms pages do not exist in the repo yet — see the PR body follow-up. */
export const PRIVACY_POLICY_URL = `${PRODUCTION_SITE_URL}/privacy`;
export const TERMS_OF_SERVICE_URL = `${PRODUCTION_SITE_URL}/terms`;

/**
 * The OAuth callback URL requested from Supabase Auth.
 * Production: always the apex callback — never a localhost or preview URL.
 * Development: the local dev origin, so localhost login keeps working.
 */
export function getOAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${origin}/auth/callback`;
    }
  }
  return `${PRODUCTION_SITE_URL}/auth/callback`;
}

/**
 * Validate a post-login destination (`next`).
 * Only an internal path is allowed: it must start with a single `/`
 * (no `//`, no backslash, no scheme, no `://`). Anything else falls back
 * to `/`. This prevents open redirects from a crafted callback URL.
 */
export function getSafeNextPath(raw: string | null | undefined): string {
  if (!raw) return '/';
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return '/';
  }
  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.startsWith('/\\') ||
    decoded.includes('\\') ||
    decoded.includes('://') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
  ) {
    return '/';
  }
  return decoded;
}
