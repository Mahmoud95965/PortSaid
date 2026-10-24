import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

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

    const supabase = getSupabaseServer();
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .update({ avatar: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', session.userId);

      if (error) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: 'حدث خطأ في معالجة تحديث الصورة.' }, { status: 500 });
  }
}
