import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, unsealSessionToken, revokeSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const session = unsealSessionToken(token);
      if (session?.sessionId) {
        // Invalidate the session in server revocation store
        revokeSession(session.sessionId);
      }
    }

    // Clear the cookie in browser
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ ok: true, message: 'تم تسجيل الخروج بنجاح.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تسجيل الخروج.' }, { status: 500 });
  }
}
