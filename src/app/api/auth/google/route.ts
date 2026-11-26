import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { sealSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { logActivityServer } from '@/lib/activity';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { verifyGoogleAccessToken } from '@/lib/auth/google';

export const runtime = 'nodejs';

/**
 * POST /api/auth/google
 *
 * Bridges a Google (Supabase Auth) sign-in to the app's own sealed HttpOnly
 * session cookie. Called only by /auth/callback after it exchanges the PKCE
 * code for a Supabase session in the browser.
 *
 * Body: { accessToken: string } — the Supabase access token for the Google
 * account. The token is verified server-side against Supabase Auth; it is
 * never logged, stored, or accepted from a URL.
 *
 * - Returning Google user (email already has an active Port Said Hub
 *   account): seals the session cookie and returns the app user.
 * - First-time Google user (no app account yet): returns { ok: true,
 *   exists: false } — the home page then shows the AuthModal Google signup
 *   form, pre-filled from the Google identity, which creates the account
 *   via /api/auth/register.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // IP-level rate limiting: max 10 Google bridge attempts per 15 minutes.
    const ipRate = checkRateLimit(`google_auth_ip:${ip}`, 10, 15 * 60);
    if (!ipRate.allowed) {
      return NextResponse.json(
        { ok: false, message: 'تم تجاوز الحد المسموح به لمحاولات الدخول من هذا الجهاز. برجاء المحاولة بعد 15 دقيقة.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: 'بيانات تسجيل الدخول بحساب Google غير صالحة.' }, { status: 400 });
    }

    const google = await verifyGoogleAccessToken(accessToken);
    if (!google) {
      return NextResponse.json(
        { ok: false, message: 'تعذّر التحقق من حساب Google. برجاء المحاولة مرة أخرى.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: 'تسجيل الدخول بحساب Google غير مفعّل على الخادم بعد.' },
        { status: 503 }
      );
    }

    // Look up the Port Said Hub account for this Google-verified email.
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
      .eq('email', google.email)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Server /api/auth/google lookup error:', error.message);
      return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تسجيل الدخول.' }, { status: 500 });
    }

    if (!dbUser) {
      // No app account yet — the UI completes registration for this Google identity.
      return NextResponse.json({ ok: true, exists: false, google: { email: google.email, name: google.name } });
    }

    if (dbUser.locked_until && new Date(dbUser.locked_until) > new Date()) {
      return NextResponse.json(
        { ok: false, message: 'هذا الحساب موقوف إدارياً. برجاء التواصل مع إدارة المنصة.' },
        { status: 403 }
      );
    }

    const roleCode = (dbUser.roles?.code || 'user') as 'owner' | 'admin' | 'merchant' | 'user';
    const sessionToken = sealSessionToken({
      userId: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: roleCode,
      sessionVersion: (dbUser as { session_version?: number }).session_version ?? 1,
    });

    cookies().set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // سجّل الدخول في activity_log حتى يظهر نشاط الحساب في صفحة المسؤول.
    await logActivityServer(dbUser.id, dbUser.name, roleCode, 'تسجيل دخول', 'سجّل الدخول عبر Google');

    return NextResponse.json({
      ok: true,
      exists: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: roleCode,
        type: dbUser.user_types?.code,
        gov: dbUser.governorates?.name_ar,
        institution: dbUser.institutions?.name_ar,
        gender: dbUser.gender,
        points: dbUser.points_balance || 0,
        avatar: dbUser.avatar,
        email_verified: !!dbUser.email_verified_at,
        staff: roleCode === 'owner' || roleCode === 'admin',
        must_change_password: dbUser.must_change_password,
      },
    });
  } catch (err: unknown) {
    console.error('Server /api/auth/google error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في معالجة تسجيل الدخول على الخادم.' }, { status: 500 });
  }
}
