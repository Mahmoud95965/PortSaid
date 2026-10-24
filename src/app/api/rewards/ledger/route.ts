import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbGetUserLedger } from '@/lib/db/localDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local persistent DB
      const ledger = dbGetUserLedger(session.userId);
      return NextResponse.json({ ok: true, ledger });
    }

    // Remote Supabase DB
    const { data, error } = await supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ledger: data || [] });
  } catch (err: any) {
    console.error('Points ledger route error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في استرجاع سجل النقاط.' }, { status: 500 });
  }
}
