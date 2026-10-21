import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

let inMemoryPartners: any[] = [];

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك' } }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    let query = supabase.from('partner_applications').select('*, users(name)');
    if (user.role !== 'owner' && user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    const { data } = await query.order('created_at', { ascending: false });
    if (data) return NextResponse.json({ ok: true, data });
  }

  if (user.role === 'owner' || user.role === 'admin') {
    return NextResponse.json({ ok: true, data: inMemoryPartners });
  }

  return NextResponse.json({ ok: true, data: inMemoryPartners.filter(p => p.user_id === user.id) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك أولاً لتقديم طلب الانضمام كشريك' } }, { status: 401 });
  }

  const body = await req.json();
  const { business_name, area_ar, phone, proposed_discount_percent, promo_notes, commercial_registry_img, category_id } = body;

  if (!business_name || !area_ar || !phone) {
    return NextResponse.json({ ok: false, error: { message: 'اسم النشاط والمنطقة ورقم الهاتف حقول مطلوبة' } }, { status: 422 });
  }

  const newApp = {
    id: crypto.randomUUID(),
    user_id: user.id,
    user_name: user.name,
    business_name: String(business_name).trim(),
    category_id: category_id ? Number(category_id) : 3,
    area_ar: String(area_ar).trim(),
    phone: String(phone).trim(),
    proposed_discount_percent: Number(proposed_discount_percent) || 10,
    proposed_commission_amount: 5,
    promo_notes: promo_notes || null,
    commercial_registry_img: commercial_registry_img || null,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('partner_applications').insert([newApp]);
  }

  inMemoryPartners.unshift(newApp);
  return NextResponse.json({
    ok: true,
    data: {
      applied: true,
      message: 'تم تقديم طلب انضمام نشاطك التجاري بنجاح! سيتواصل معك فريق المنصة بعد المراجعة.'
    }
  });
}
