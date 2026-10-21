import { NextResponse } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'يجب تسجيل الدخول أولاً' } }, { status: 401 });
  }

  const { new_password } = await req.json();
  if (!new_password || new_password.length < 6) {
    return NextResponse.json({ ok: false, error: { message: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' } }, { status: 422 });
  }

  const hashed = await hashPassword(new_password);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('users').update({
      password_hash: hashed,
      must_change_password: false,
      updated_at: new Date().toISOString()
    }).eq('id', user.id);
  }

  return NextResponse.json({ ok: true, data: { changed: true } });
}
