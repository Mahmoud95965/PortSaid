import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';
import { SEED_EXPLORE } from '@/lib/seed-data';
import { getSessionUser } from '@/lib/auth';

let inMemoryCommunity: any[] = [];

export async function GET() {
  const supabase = getSupabase();
  let items = SEED_EXPLORE;
  let community = inMemoryCommunity;

  if (supabase) {
    try {
      const [itemsRes, uploadsRes] = await Promise.all([
        supabase.from('explore_items').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('explore_uploads').select('*, users(name)').eq('status', 'approved').eq('visibility', 'public').order('created_at', { ascending: false })
      ]);

      if (itemsRes.data && itemsRes.data.length > 0) items = itemsRes.data;
      if (uploadsRes.data && uploadsRes.data.length > 0) {
        community = uploadsRes.data.map(u => ({
          id: u.id,
          user_id: u.user_id,
          user_name: u.users?.name || 'مشارك',
          caption: u.caption,
          img_b64: u.img_b64,
          th_b64: u.th_b64,
          created_at: u.created_at,
          rc: 0
        }));
      }
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    data: {
      items,
      community
    }
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك لتتمكن من مشاركة اللقطة' } }, { status: 401 });
  }

  const body = await req.json();
  const { caption, img_b64, visibility } = body;

  if (!img_b64) {
    return NextResponse.json({ ok: false, error: { message: 'الصورة مطلوبة' } }, { status: 422 });
  }

  const uploadId = crypto.randomUUID();
  const newUpload = {
    id: uploadId,
    user_id: user.id,
    user_name: user.name,
    file_name: `upload_${Date.now()}.jpg`,
    caption: String(caption || '').trim(),
    img_b64,
    th_b64: img_b64,
    status: user.role === 'owner' || user.role === 'admin' ? 'approved' : 'pending',
    visibility: visibility || 'public',
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('explore_uploads').insert([{
      id: uploadId,
      uuid: uploadId,
      user_id: user.id,
      file_name: newUpload.file_name,
      caption: newUpload.caption,
      img_b64: newUpload.img_b64,
      th_b64: newUpload.th_b64,
      status: newUpload.status,
      visibility: newUpload.visibility
    }]);
  }

  inMemoryCommunity.unshift(newUpload);
  return NextResponse.json({
    ok: true,
    data: {
      saved: true,
      pending: newUpload.status === 'pending',
      message: newUpload.status === 'pending' ? 'تم استلام صورتك وستظهر بعد مراجعة الإدارة' : 'تم نشر صورتك بنجاح!'
    }
  });
}
