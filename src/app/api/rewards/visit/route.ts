import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbRecordVisit } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً لتسجيل الحضور.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة أو منتهية.' }, { status: 401 });
    }

    const body = await req.json();
    const { placeId, lat, lon, distanceM } = body;

    if (!placeId || typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ ok: false, message: 'بيانات تسجيل الزيارة غير مكتملة أو غير صالحة.' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local persistent database execution
      const result = dbRecordVisit(session.userId, placeId, lat, lon, distanceM);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // Remote Supabase execution
    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, status, deleted_at')
      .eq('id', session.userId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ ok: false, message: 'الحساب غير موجود أو معطل.' }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const idempKey = `visit_${session.userId}_${placeId}_${today}`;

    const { data, error } = await supabase.rpc('rpc_record_visit', {
      p_user_id: session.userId,
      p_place_id: placeId,
      p_latitude: lat,
      p_longitude: lon,
      p_distance_m: typeof distanceM === 'number' ? Math.round(distanceM) : null,
      p_idempotency_key: idempKey,
    });

    if (error) {
      console.error('RPC rpc_record_visit error:', error);
      return NextResponse.json({ ok: false, message: error.message || 'فشل تسجيل الزيارة.' }, { status: 500 });
    }

    if (!data || !data.ok) {
      return NextResponse.json({
        ok: false,
        message: data?.message || 'تعذر تسجيل الزيارة.',
      });
    }

    return NextResponse.json({
      ok: true,
      message: data.message || `مبروك! تم تسجيل حضورك وحصلت على +${data.points_awarded || 20} نقطة 🎉`,
      pointsAwarded: data.points_awarded || 20,
      balance: data.balance,
      placeName: data.place_name,
    });
  } catch (err: any) {
    console.error('Record visit route error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في الخادم أثناء تسجيل الزيارة.' }, { status: 500 });
  }
}
