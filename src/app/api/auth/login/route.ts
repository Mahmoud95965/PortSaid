import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyPassword, createSessionToken, DEFAULT_ADMIN } from '@/lib/auth';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ ok: false, error: { message: 'رقم الهاتف/البريد وكلمة المرور مطلوبان' } }, { status: 400 });
    }

    const trimmed = String(identifier).trim().toLowerCase();

    // 1. فحص الدخول كأدمن افتراضي محلياً لو لم يتم الاتصال بقاعدة البيانات بعد
    if (
      (trimmed === 'admin@portsaidhub.com' || trimmed === '01000000001') && 
      password === 'Admin@123456'
    ) {
      const token = await createSessionToken(DEFAULT_ADMIN);
      const res = NextResponse.json({ ok: true, data: { user: DEFAULT_ADMIN } });
      res.cookies.set('psid_next', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      return res;
    }

    // 2. البحث في Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: userRow } = await supabase
        .from('users')
        .select('*, roles(code)')
        .or(`email.eq.${trimmed},phone.eq.${trimmed}`)
        .is('deleted_at', null)
        .maybeSingle();

      if (userRow) {
        const valid = await verifyPassword(password, userRow.password_hash);
        if (valid) {
          if (userRow.status !== 'active') {
            return NextResponse.json({ ok: false, error: { message: 'الحساب معطل، يرجى مراجعة الإدارة' } }, { status: 403 });
          }

          const userObj: User = {
            id: userRow.id,
            name: userRow.name,
            email: userRow.email,
            phone: userRow.phone,
            role: userRow.roles?.code || 'user',
            points: userRow.points_balance || 0,
            avatar: userRow.avatar,
            gender: userRow.gender,
            email_verified: Boolean(userRow.email_verified_at),
            staff: userRow.roles?.code === 'owner' || userRow.roles?.code === 'admin',
          };

          const token = await createSessionToken(userObj);
          const res = NextResponse.json({ ok: true, data: { user: userObj } });
          res.cookies.set('psid_next', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7
          });
          return res;
        }
      }
    }

    return NextResponse.json({ ok: false, error: { message: 'بيانات الدخول غير صحيحة' } }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { message: err.message || 'خطأ في السيرفر' } }, { status: 500 });
  }
}
