import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً للحصول على النقاط.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة أو منتهية.' }, { status: 401 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local dev mock response
      return NextResponse.json({
        ok: true,
        message: 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق بنجاح.',
        pointsAwarded: 40,
        balance: 160,
      });
    }

    // 1. Verify user exists and is active
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

    // 2. Invoke RPC using verified session user ID and deterministic idempotency key
    const idempKey = `share_${session.userId}`;
    const { data, error } = await supabase.rpc('rpc_claim_share_reward', {
      p_user_id: session.userId,
      p_idempotency_key: idempKey,
    });

    if (error) {
      console.error('RPC rpc_claim_share_reward error:', error);
      return NextResponse.json({ ok: false, message: error.message || 'فشل معالجة طلب المكافأة.' }, { status: 500 });
    }

    if (!data || !data.ok) {
      return NextResponse.json({
        ok: false,
        message: data?.message || 'تم الحصول على مكافأة المشاركة مسبقاً.',
      });
    }

    return NextResponse.json({
      ok: true,
      message: data.message || 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق.',
      pointsAwarded: data.points_awarded || 40,
      balance: data.balance,
    });
  } catch (err: any) {
    console.error('Share reward route error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في الخادم أثناء تسجيل مكافأة المشاركة.' }, { status: 500 });
  }
}
