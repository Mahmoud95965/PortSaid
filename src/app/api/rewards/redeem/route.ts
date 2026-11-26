import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionTokenAsync, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbRedeemCoupon } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً لاستبدال الكوبون.' }, { status: 401 });
    }

    const session = await unsealSessionTokenAsync(token);
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

    // Remote Supabase DB — الاستبدال بيتم ذرياً عبر RPC في قاعدة البيانات:
    // التكلفة بتتقرأ من المكان نفسه (مش من الطلب — كان المتصل يقدر يبعت
    // أي تكلفة)، والخصم والرصيد والدفتر بيتموا في معاملة واحدة بقفل الصف
    // (بيمنع الاستبدال المزدوج المتزامن)، والـ RPC هو اللي بيفعّل سياق
    // الثقة المطلوب لتحديث الرصيد.
    const couponCode = `HUB-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const { data, error } = await supabase.rpc('rpc_redeem_coupon', {
      p_user_id: session.userId,
      p_place_id: placeId,
      p_coupon_code: couponCode,
    });

    if (error) {
      console.error('Redeem RPC error:', error);
      return NextResponse.json(
        { ok: false, message: 'حدث خطأ في استبدال الكوبون.' },
        { status: 500 }
      );
    }
    if (!data?.ok) {
      const msg =
        data?.code === 'insufficient'
          ? 'رصيد نقاطك لا يكفي لاستبدال هذا الكوبون.'
          : data?.message || 'تعذّر استبدال الكوبون.';
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      balance: data.balance,
      couponCode,
      message: `تم استبدال ${data.points_cost} نقطة بنجاح!`,
    });
  } catch (err: any) {
    console.error('Redeem coupon error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في استبدال الكوبون.' }, { status: 500 });
  }
}
