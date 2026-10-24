import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { isValidAvatarUrl } from '@/lib/auth/validation';

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
    const { avatarUrl } = body;

    // Validate avatar URL format and length
    if (!avatarUrl || !isValidAvatarUrl(avatarUrl)) {
      return NextResponse.json(
        { ok: false, message: 'رابط الصورة الرمزية غير صالح. يجب أن يكون رابطاً آمناً (HTTP/HTTPS أو مسار صورة).' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (supabase) {
      // Verify account active status and existence
      const { data: dbUser, error: fetchErr } = await supabase
        .from('users')
        .select('id, status, deleted_at')
        .eq('id', session.userId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .maybeSingle();

      if (fetchErr || !dbUser) {
        return NextResponse.json(
          { ok: false, message: 'الحساب غير موجود أو معطل.' },
          { status: 403 }
        );
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update({ avatar: avatarUrl.trim(), updated_at: new Date().toISOString() })
        .eq('id', session.userId);

      if (updateErr) {
        return NextResponse.json({ ok: false, message: updateErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, avatarUrl: avatarUrl.trim() });
  } catch (err: any) {
    console.error('Update avatar error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في معالجة تحديث الصورة.' }, { status: 500 });
  }
}
