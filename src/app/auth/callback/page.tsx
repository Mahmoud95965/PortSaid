'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getSafeNextPath } from '@/lib/site';

/**
 * Google OAuth callback page — /auth/callback
 *
 * Flow:
 *  1. Google redirects here with `?code=...` (PKCE authorization code).
 *  2. The code is exchanged for a Supabase session with the browser client
 *     (the PKCE code verifier lives in this origin's localStorage, stored by
 *     signInWithOAuth — the client is configured with detectSessionInUrl:
 *     false so this page is the single place the exchange happens).
 *  3. The Supabase access token is sent to our own /api/auth/google, which
 *     verifies it server-side and seals the app's own HttpOnly session
 *     cookie when the Google email already has a Port Said Hub account.
 *  4. On success the browser does a full reload to the validated `next`
 *     destination (default `/`) so AuthContext re-checks /api/auth/me with
 *     the fresh cookie. A first-time Google user has no app account yet, so
 *     the home page shows the AuthModal with the Google signup form
 *     pre-filled from the Google identity — nothing else is needed here.
 *
 * Errors render a plain Arabic screen (no error details, codes, or tokens
 * are ever put in a URL or log); the user can go back to the home page and
 * try again.
 */

const GENERIC_ERROR = 'تعذّر إكمال تسجيل الدخول بحساب Google. برجاء المحاولة مرة أخرى.';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        // Google refused / the user cancelled on the consent screen.
        if (params.get('error')) {
          setError(GENERIC_ERROR);
          return;
        }

        const code = params.get('code');
        if (!code || !supabase) {
          setError(GENERIC_ERROR);
          return;
        }

        // Exchange the PKCE code for a Supabase session. If the code was
        // already exchanged, getSession() below still picks the session up.
        await supabase.auth.exchangeCodeForSession(code);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError(GENERIC_ERROR);
          return;
        }

        // Bridge the verified Google identity to the app's server session.
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.access_token }),
        });
        const json: { ok?: boolean; message?: string } = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setError(json.message || GENERIC_ERROR);
          return;
        }

        // Success — full reload so the app boots with the new session cookie.
        window.location.assign(getSafeNextPath(params.get('next')));
      } catch {
        setError(GENERIC_ERROR);
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#07162b] text-white px-6 text-center" dir="rtl">
      <img src="/assets/logo/icon-192.png" alt="Port Said Hub" className="w-20 h-20 object-contain" />
      {error ? (
        <>
          <p className="font-black text-lg">تعذّر تسجيل الدخول</p>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="mt-2 px-6 py-3 rounded-2xl bg-[#ffb938] text-[#07162b] font-black text-sm"
          >
            العودة إلى الصفحة الرئيسية
          </button>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-full border-4 border-[#ffb938] border-t-transparent animate-spin" />
          <p className="font-black text-sm text-white/90">جارٍ إكمال تسجيل الدخول بحساب Google...</p>
        </>
      )}
    </div>
  );
}
