import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

let inMemoryNotifications = [
  {
    id: 1,
    kind: 'admin',
    title: 'أهلاً بك في دليل بورسعيد Hub!',
    body: 'استكشف معالم المدينة، احصل على خصومات حصرية، وسجل زياراتك لتجميع النقاط!',
    created_at: new Date().toISOString()
  }
];

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      return NextResponse.json({ ok: true, data: { items: data, unread: data.length } });
    }
  }

  return NextResponse.json({ ok: true, data: { items: inMemoryNotifications, unread: inMemoryNotifications.length } });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: { message: 'غير مصرح' } }, { status: 403 });
  }

  const { title, body } = await req.json();
  if (!title || !body) return NextResponse.json({ ok: false, error: { message: 'العنوان والنص مطلوبان' } }, { status: 422 });

  const notif = {
    id: Date.now(),
    kind: 'admin',
    title: String(title).trim(),
    body: String(body).trim(),
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('notifications').insert([{
      kind: notif.kind,
      title: notif.title,
      body: notif.body,
      created_by: user.id
    }]);
  }

  inMemoryNotifications.unshift(notif);
  return NextResponse.json({ ok: true, data: notif }, { status: 201 });
}
