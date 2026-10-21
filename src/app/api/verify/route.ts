import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

let inMemoryVerifications: any[] = [];

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك' } }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    let query = supabase.from('id_verifications').select('*, users(name)');
    if (user.role !== 'owner' && user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    const { data } = await query.order('created_at', { ascending: false });
    if (data) return NextResponse.json({ ok: true, data });
  }

  if (user.role === 'owner' || user.role === 'admin') {
    return NextResponse.json({ ok: true, data: inMemoryVerifications });
  }

  return NextResponse.json({ ok: true, data: inMemoryVerifications.filter(v => v.user_id === user.id) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك لتقديم طلب توثيق الكارنيه' } }, { status: 401 });
  }

  const { img_b64 } = await req.json();
  if (!img_b64) {
    return NextResponse.json({ ok: false, error: { message: 'صورة الكارنيه مطلوبة' } }, { status: 422 });
  }

  const newVer = {
    id: crypto.randomUUID(),
    user_id: user.id,
    user_name: user.name,
    img_b64,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('id_verifications').upsert({
      user_id: user.id,
      img_b64,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  inMemoryVerifications = inMemoryVerifications.filter(v => v.user_id !== user.id);
  inMemoryVerifications.unshift(newVer);

  return NextResponse.json({
    ok: true,
    data: {
      submitted: true,
      message: 'تم رفع صورة الكارنيه بنجاح، وطلبك قيد مراجعة الإدارة لمنحك شارة الطالب الموثق.'
    }
  });
}
