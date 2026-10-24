import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { verifyAndUpgradePassword } from '@/lib/auth/password';
import { sealSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    const trimmedId = (identifier || '').trim();
    if (!trimmedId || !password) {
      return NextResponse.json(
        { ok: false, message: 'برجاء كتابة البريد الإلكتروني أو رقم الهاتف وكلمة المرور.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Fallback dev mock when Supabase is not reachable
      const isOwner = trimmedId.toLowerCase().includes('admin') || trimmedId === '01000000001';
      const isMerchant = trimmedId.toLowerCase().includes('merchant') || trimmedId === '01000000002';
      const mockRole = isOwner ? 'owner' : isMerchant ? 'merchant' : 'user';
      const mockUserId = isOwner ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002';

      const token = sealSessionToken({
        userId: mockUserId,
        name: isOwner ? 'المالك الرئيسي' : isMerchant ? 'صاحب مطعم كاستن' : 'أحمد محمود',
        email: trimmedId.includes('@') ? trimmedId : 'user@portsaidhub.com',
        phone: trimmedId.startsWith('01') ? trimmedId : '01012345678',
        role: mockRole,
      });

      cookies().set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return NextResponse.json({
        ok: true,
        user: {
          id: mockUserId,
          name: isOwner ? 'المالك الرئيسي' : isMerchant ? 'صاحب مطعم كاستن' : 'أحمد محمود',
          email: trimmedId.includes('@') ? trimmedId : 'user@portsaidhub.com',
          phone: trimmedId.startsWith('01') ? trimmedId : '01012345678',
          role: mockRole,
          points: isOwner ? 500 : 120,
          email_verified: true,
          staff: isOwner,
        },
      });
    }

    const isEmail = trimmedId.includes('@');
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
      .eq(isEmail ? 'email' : 'phone', isEmail ? trimmedId.toLowerCase() : trimmedId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !dbUser) {
      return NextResponse.json(
        { ok: false, message: 'بيانات تسجيل الدخول أو كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    // 1. Check account lockout
    if (dbUser.locked_until && new Date(dbUser.locked_until) > new Date()) {
      return NextResponse.json(
        { ok: false, message: 'تم إيقاف الحساب مؤقتاً لكثرة المحاولات الخاطئة. برجاء المحاولة بعد 15 دقيقة.' },
        { status: 423 }
      );
    }

    // 2. Dual-Hash Password Verification & Upgrade Check
    const { valid, needsUpgrade, upgradedHash } = verifyAndUpgradePassword(password, dbUser.password_hash);

    if (!valid) {
      // Increment failed logins and lock if >= 5 attempts
      const newFailed = (dbUser.failed_logins || 0) + 1;
      const shouldLock = newFailed >= 5;
      await supabase
        .from('users')
        .update({
          failed_logins: newFailed,
          locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
        })
        .eq('id', dbUser.id);

      return NextResponse.json(
        { ok: false, message: 'كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    // 3. Password verified! Perform JIT upgrade if legacy hash
    const updatePayload: Record<string, any> = {
      failed_logins: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    };
    if (needsUpgrade && upgradedHash) {
      updatePayload.password_hash = upgradedHash;
    }

    await supabase.from('users').update(updatePayload).eq('id', dbUser.id);

    // 4. Issue Cryptographic HttpOnly Session Cookie
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
