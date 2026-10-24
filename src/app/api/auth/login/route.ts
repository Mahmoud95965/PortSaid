import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { verifyAndUpgradePassword } from '@/lib/auth/password';
import { sealSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { normalizePhone } from '@/lib/auth/validation';
import { dbFindUserByIdentifier, dbUpdateUser } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // 1. IP-level rate limiting: max 30 login requests per 15 minutes per IP
    const ipRate = checkRateLimit(`login_ip:${ip}`, 30, 15 * 60);
    if (!ipRate.allowed) {
      return NextResponse.json(
        { ok: false, message: 'تم تجاوز الحد المسموح به لمحاولات الدخول من هذا الجهاز. برجاء المحاولة بعد 15 دقيقة.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, password } = body;

    const trimmedId = (identifier || '').trim();
    if (!trimmedId || !password) {
      return NextResponse.json(
        { ok: false, message: 'برجاء كتابة البريد الإلكتروني أو رقم الهاتف وكلمة المرور.' },
        { status: 400 }
      );
    }

    const isEmail = trimmedId.includes('@');
    const normalizedId = isEmail ? trimmedId.toLowerCase() : normalizePhone(trimmedId);

    // 2. Account/IP Rate Limiting: max 5 attempts per 15 minutes per account per IP
    const accountRateKey = `login_account:${ip}:${normalizedId}`;
    const accountRate = checkRateLimit(accountRateKey, 5, 15 * 60);
    if (!accountRate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: `تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. برجاء المحاولة بعد ${Math.ceil(accountRate.retryAfterSeconds / 60)} دقيقة.`,
        },
        { status: 429 }
      );
    }

    const UNIFIED_AUTH_ERROR = 'بيانات تسجيل الدخول أو كلمة المرور غير صحيحة.';

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local persistent database execution
      const dbUser = dbFindUserByIdentifier(normalizedId);
      if (!dbUser || dbUser.status !== 'active' || dbUser.deleted_at) {
        return NextResponse.json({ ok: false, message: UNIFIED_AUTH_ERROR }, { status: 401 });
      }

      if (dbUser.locked_until && new Date(dbUser.locked_until) > new Date()) {
        return NextResponse.json(
          { ok: false, message: 'هذا الحساب موقوف إدارياً. برجاء التواصل مع إدارة المنصة.' },
          { status: 403 }
        );
      }

      const { valid, needsUpgrade, upgradedHash } = verifyAndUpgradePassword(password, dbUser.password_hash);
      if (!valid) {
        return NextResponse.json({ ok: false, message: UNIFIED_AUTH_ERROR }, { status: 401 });
      }

      resetRateLimit(accountRateKey);
      resetRateLimit(`login_ip:${ip}`);

      const updatePayload: Record<string, any> = {
        last_login_at: new Date().toISOString(),
        failed_logins: 0,
      };
      if (needsUpgrade && upgradedHash) {
        updatePayload.password_hash = upgradedHash;
      }
      dbUpdateUser(dbUser.id, updatePayload);

      const sessionToken = sealSessionToken({
        userId: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role,
      });

      cookies().set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return NextResponse.json({
        ok: true,
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone,
          role: dbUser.role,
          type: dbUser.user_type,
          gov: dbUser.governorate,
          institution: dbUser.institution,
          gender: dbUser.gender,
          points: dbUser.points_balance,
          avatar: dbUser.avatar,
          email_verified: !!dbUser.email_verified_at,
          staff: dbUser.role === 'owner' || dbUser.role === 'admin',
          must_change_password: !!dbUser.must_change_password,
        },
      });
    }

    // 3. Remote Supabase Database execution
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
      .eq(isEmail ? 'email' : 'phone', normalizedId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !dbUser) {
      return NextResponse.json({ ok: false, message: UNIFIED_AUTH_ERROR }, { status: 401 });
    }

    if (dbUser.locked_until && new Date(dbUser.locked_until) > new Date()) {
      return NextResponse.json(
        { ok: false, message: 'هذا الحساب موقوف إدارياً. برجاء التواصل مع إدارة المنصة.' },
        { status: 403 }
      );
    }

    const { valid, needsUpgrade, upgradedHash } = verifyAndUpgradePassword(password, dbUser.password_hash);
    if (!valid) {
      return NextResponse.json({ ok: false, message: UNIFIED_AUTH_ERROR }, { status: 401 });
    }

    resetRateLimit(accountRateKey);
    resetRateLimit(`login_ip:${ip}`);

    const updatePayload: Record<string, any> = {
      last_login_at: new Date().toISOString(),
      failed_logins: 0,
    };
    if (needsUpgrade && upgradedHash) {
      updatePayload.password_hash = upgradedHash;
    }
    await supabase.from('users').update(updatePayload).eq('id', dbUser.id);

    const roleCode = (dbUser.roles?.code || 'user') as 'owner' | 'admin' | 'merchant' | 'user';
    const sessionToken = sealSessionToken({
      userId: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      role: roleCode,
    });

    cookies().set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({
      ok: true,
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
  } catch (err: any) {
    console.error('Server login error:', err);
    return NextResponse.json(
      { ok: false, message: 'حدث خطأ في معالجة تسجيل الدخول على الخادم.' },
      { status: 500 }
    );
  }
}
