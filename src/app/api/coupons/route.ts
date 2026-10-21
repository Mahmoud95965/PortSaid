import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SEED_PLACES } from '@/lib/seed-data';

let inMemoryCoupons: any[] = [];

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك' } }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('coupons')
      .select('*, places(name_ar)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map(c => ({
        ...c,
        place_name: c.places?.name_ar || 'مكان الشريك'
      }));
      return NextResponse.json({ ok: true, data: formatted });
    }
  }

  const userCoupons = inMemoryCoupons.filter(c => c.user_id === user.id);
  return NextResponse.json({ ok: true, data: userCoupons });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك لطلب الكوبون' } }, { status: 401 });
  }

  const { place_id } = await req.json();
  if (!place_id) return NextResponse.json({ ok: false, error: { message: 'معرف المكان مطلوب' } }, { status: 400 });

  let place = SEED_PLACES.find(p => p.id === place_id);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase.from('places').select('*').eq('id', place_id).maybeSingle();
    if (data) place = data;
  }

  if (!place) return NextResponse.json({ ok: false, error: { message: 'المكان غير موجود' } }, { status: 404 });

  const cost = place.coupon_cost_points || 40;
  if ((user.points || 0) < cost) {
    return NextResponse.json({ ok: false, error: { message: `نقاطك الحالية (${user.points || 0}) لا تكفي لاستبدال هذا الكوبون (مطلوب ${cost} نقطة)` } }, { status: 400 });
  }

  const newBalance = (user.points || 0) - cost;
  const couponId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

  const newCoupon = {
    id: couponId,
    uuid: couponId,
    user_id: user.id,
    place_id: place.id,
    place_name: place.name_ar,
    points_cost: cost,
    discount_percent: place.discount_percent || 10,
    status: 'active',
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    await supabase.from('coupons').insert([newCoupon]);
    await supabase.from('users').update({ points_balance: newBalance }).eq('id', user.id);
    await supabase.from('points_ledger').insert([{
      user_id: user.id,
      delta: -cost,
      balance_after: newBalance,
      reason: 'coupon',
      ref_type: 'coupon',
      ref_id: couponId
    }]);
  }

  user.points = newBalance;
  inMemoryCoupons.unshift(newCoupon);

  return NextResponse.json({
    ok: true,
    data: {
      coupon: newCoupon,
      new_points: newBalance,
      message: `تم إصدار كوبون خصم ${place.discount_percent}% بنجاح!`
    }
  });
}
