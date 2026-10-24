import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { hashPasswordModern, verifyAndUpgradePassword } from '@/lib/auth/password';
import { unsealSessionToken, sealSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة أو منتهية.' }, { status: 401 });
    }

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, message: 'يرجى كتابة كلمة المرور الحالية والجديدة.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { ok: false, message: 'اختر كلمة مرور مختلفة عن الحالية.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local dev mock
      return NextResponse.json({ ok: true, message: 'تم تغيير كلمة المرور بنجاح.' });
    }

    // 1. Fetch current password hash from DB
    const { data: dbUser, error: fetchErr } = await supabase
      .from('users')
      .select('password_hash, status')
      .eq('id', session.userId)
      .maybeSingle();

    if (fetchErr || !dbUser || dbUser.status !== 'active') {
      return NextResponse.json({ ok: false, message: 'تعذر التحقق من بيانات الحساب.' }, { status: 404 });
    }

    // 2. Verify current password
    const { valid } = verifyAndUpgradePassword(oldPassword, dbUser.password_hash);
    if (!valid) {
      return NextResponse.json({ ok: false, message: 'كلمة المرور الحالية غير صحيحة.' }, { status: 401 });
    }

    // 3. Hash new password with modern Salted Scrypt
    const newHashed = hashPasswordModern(newPassword);

    // 4. Update in database
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        password_hash: newHashed,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId);

    if (updateErr) {
      return NextResponse.json({ ok: false, message: updateErr.message }, { status: 500 });
    }

    // 5. Re-issue fresh session cookie
    const freshToken = sealSessionToken({
      userId: session.userId,
      name: session.name,
      email: session.email,
      phone: session.phone,
      role: session.role,
    });

    cookies().set(SESSION_COOKIE_NAME, freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ ok: true, message: 'تم تغيير كلمة المرور وحفظها بنجاح.' });
  } catch (err: any) {
    console.error('Server change-password error:', err);
    return NextResponse.json(
      { ok: false, message: 'حدث خطأ في معالجة تغيير كلمة المرور.' },
      { status: 500 }
    );
  }
}
