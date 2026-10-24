import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return NextResponse.json({ ok: true, message: 'تم تسجيل الخروج بنجاح.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تسجيل الخروج.' }, { status: 500 });
  }
}
