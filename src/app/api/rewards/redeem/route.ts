import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbRedeemCoupon } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً لاستبدال الكوبون.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const body = await req.json();
    const { placeId, pointsCost, placeName } = body;

    if (!placeId || typeof pointsCost !== 'number' || pointsCost <= 0) {
      return NextResponse.json({ ok: false, message: 'بيانات استبدال الكوبون غير صالحة.' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local persistent database execution
      const result = dbRedeemCoupon(session.userId, placeId, pointsCost, placeName || 'المكان المحدد');
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // Remote Supabase DB fallback
    const { data: dbUser } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', session.userId)
      .single();

    if (!dbUser || dbUser.points_balance < pointsCost) {
      return NextResponse.json({
        ok: false,
        message: 'رصيد نقاطك لا يكفي لاستبدال هذا الكوبون.',
      }, { status: 400 });
    }

    const newBal = dbUser.points_balance - pointsCost;
    const couponCode = `HUB-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    await supabase.from('users').update({ points_balance: newBal }).eq('id', session.userId);
    await supabase.from('points_ledger').insert({
      user_id: session.userId,
      delta: -pointsCost,
      balance_after: newBal,
      reason: `استبدال كوبون خصم في ${placeName || 'المكان'}`,
      ref_type: 'coupon_redemption',
      ref_id: couponCode,
    });

    return NextResponse.json({
      ok: true,
      balance: newBal,
      couponCode,
      message: `تم استبدال ${pointsCost} نقطة بنجاح!`,
    });
  } catch (err: any) {
    console.error('Redeem coupon error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في استبدال الكوبون.' }, { status: 500 });
  }
}
