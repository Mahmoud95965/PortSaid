/**
 * Google (Supabase Auth) identity verification for server routes.
 * File: src/lib/auth/google.ts
 *
 * A Google access token is proof that its owner controls the Google account
 * behind the email in it. Server routes accept such a token ONLY to:
 *  - bridge a returning Google user to the app's own sealed session cookie
 *    (/api/auth/google), and
 *  - allow a password-less registration for that Google-verified email
 *    (/api/auth/register).
 *
 * The token itself is never logged or stored, and is only ever sent to our
 * own same-origin API in a POST body — never in a URL.
 */

import { getSupabaseServer } from '@/lib/supabase/server';

export interface GoogleIdentity {
  /** Supabase Auth user id for this Google account. */
  id: string;
  /** Verified Google email (lowercase). */
  email: string;
  /** Display name from Google (user_metadata full_name / name). */
  name: string;
}

/**
 * Verify a Supabase access token obtained from a Google OAuth sign-in and
 * return the Google identity it belongs to, or null when the token is
 * missing, expired, or invalid.
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleIdentity | null> {
  if (!accessToken || typeof accessToken !== 'string') return null;

  const supabase = getSupabaseServer();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    const authUser = data?.user;
    if (error || !authUser || !authUser.email) return null;

    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    const name =
      (meta.full_name as string) || (meta.name as string) || authUser.email.split('@')[0] || '';

    return {
      id: authUser.id,
      email: authUser.email.toLowerCase(),
      name,
    };
  } catch {
    return null;
  }
}
