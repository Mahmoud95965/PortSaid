import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';
import { SEED_PLACES } from '@/lib/seed-data';
import { getSessionUser } from '@/lib/auth';

let inMemoryPlaces = [...SEED_PLACES];

export async function GET(req: Request) {
  const supabase = getSupabase();
  const url = new URL(req.url);
  const cat = url.searchParams.get('cat');
  const area = url.searchParams.get('area');
  const q = url.searchParams.get('q');

  let list = inMemoryPlaces;

  if (supabase) {
    try {
      let query = supabase.from('places').select('*').eq('status', 'active').is('deleted_at', null);
      if (cat) query = query.eq('category_id', cat);
      if (area) query = query.eq('area_ar', area);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch {
      // fallback to memory
    }
  }

  if (q) {
    const term = q.toLowerCase();
    list = list.filter(p => 
      p.name_ar.toLowerCase().includes(term) || 
      (p.description_ar && p.description_ar.toLowerCase().includes(term))
    );
  }

  return NextResponse.json({ ok: true, data: list });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: { message: 'غير مصرح بالعملية' } }, { status: 403 });
  }

  const body = await req.json();
  const newPlace = {
    id: body.id || crypto.randomUUID(),
    category_id: Number(body.category_id) || 2,
    name_ar: String(body.name_ar || '').trim(),
    area_ar: String(body.area_ar || 'حي الشرق').trim(),
    description_ar: String(body.description_ar || ''),
    latitude: Number(body.latitude) || 31.2653,
    longitude: Number(body.longitude) || 32.3019,
    visit_points: Number(body.visit_points) || 20,
    discount_percent: Number(body.discount_percent) || 0,
    coupon_cost_points: Number(body.coupon_cost_points) || 0,
    commission_amount: Number(body.commission_amount) || 0,
    checkin_radius_m: Number(body.checkin_radius_m) || 150,
    logo_b64: body.logo_b64 || null,
    status: body.status || 'active'
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('places').insert([newPlace]);
    } catch (err) {
      console.error('Supabase place insert error:', err);
    }
  }

  inMemoryPlaces.unshift(newPlace as any);
  return NextResponse.json({ ok: true, data: newPlace }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: { message: 'غير مصرح بالعملية' } }, { status: 403 });
  }

  const body = await req.json();
  const id = body.id;
  if (!id) return NextResponse.json({ ok: false, error: { message: 'معرف المكان مفقود' } }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('places').update({
        name_ar: body.name_ar,
        category_id: body.category_id,
        area_ar: body.area_ar,
        description_ar: body.description_ar,
        latitude: body.latitude,
        longitude: body.longitude,
        visit_points: body.visit_points,
        discount_percent: body.discount_percent,
        coupon_cost_points: body.coupon_cost_points,
        commission_amount: body.commission_amount,
        status: body.status,
        logo_b64: body.logo_b64,
        updated_at: new Date().toISOString()
      }).eq('id', id);
    } catch (err) {
      console.error('Supabase place update error:', err);
    }
  }

  const idx = inMemoryPlaces.findIndex(p => p.id === id);
  if (idx !== -1) {
    inMemoryPlaces[idx] = { ...inMemoryPlaces[idx], ...body };
  }

  return NextResponse.json({ ok: true, data: { updated: true } });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: { message: 'غير مصرح بالعملية' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: { message: 'المعرف مطلوب' } }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('places').update({ deleted_at: new Date().toISOString(), status: 'hidden' }).eq('id', id);
    } catch {}
  }

  inMemoryPlaces = inMemoryPlaces.filter(p => p.id !== id);
  return NextResponse.json({ ok: true, data: { deleted: true } });
}
