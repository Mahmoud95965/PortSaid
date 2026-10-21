import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SEED_PLACES } from '@/lib/seed-data';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجّل دخولك لتسجيل الزيارة وكسب النقاط' } }, { status: 401 });
  }

  const { place_id, latitude, longitude } = await req.json();
  if (!place_id) {
    return NextResponse.json({ ok: false, error: { message: 'معرف المكان مطلوب' } }, { status: 400 });
  }

  let place = SEED_PLACES.find(p => p.id === place_id);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase.from('places').select('*').eq('id', place_id).maybeSingle();
    if (data) place = data;
  }

  if (!place) {
    return NextResponse.json({ ok: false, error: { message: 'المكان غير موجود' } }, { status: 404 });
  }

  // حساب المسافة لو الإحداثيات مرسلة
  let distanceM = 50;
  let verified = true;
  if (latitude && longitude) {
    distanceM = haversineDistance(latitude, longitude, place.latitude, place.longitude);
    if (distanceM > (place.checkin_radius_m || 200)) {
      verified = false;
    }
  }

  const pointsToAward = place.visit_points || 20;

  if (supabase) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existingVisit } = await supabase
      .from('visits')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', place_id)
      .eq('visit_day', today)
      .maybeSingle();

    if (existingVisit) {
      return NextResponse.json({ ok: false, error: { message: 'لقد سجلت زيارة لهذا المكان اليوم بالفعل! يمكنك الزيارة مرة أخرى غداً.' } }, { status: 400 });
    }

    await supabase.from('visits').insert([{
      user_id: user.id,
      place_id: place_id,
      points_awarded: pointsToAward,
      latitude: latitude || place.latitude,
      longitude: longitude || place.longitude,
      distance_m: distanceM,
      location_verified: verified,
      visit_day: today
    }]);

    // زيادة رصيد النقاط
    const newBal = (user.points || 0) + pointsToAward;
    await supabase.from('users').update({ points_balance: newBal }).eq('id', user.id);
    await supabase.from('points_ledger').insert([{
      user_id: user.id,
      delta: pointsToAward,
      balance_after: newBal,
      reason: 'visit',
      ref_type: 'place',
      ref_id: place_id
    }]);

    user.points = newBal;
  } else {
    user.points = (user.points || 0) + pointsToAward;
  }

  return NextResponse.json({
    ok: true,
    data: {
      awarded: pointsToAward,
      new_points: user.points,
      verified,
      distance_m: distanceM,
      message: `مبروك! تم تسجيل زيارتك لـ «${place.name_ar}» وإضافة ${pointsToAward} نقطة لرصيدك.`
    }
  });
}
