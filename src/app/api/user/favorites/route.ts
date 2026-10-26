import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: true, favorites: [] });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: true, favorites: [] });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: true, favorites: [] });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('place_id')
      .eq('user_id', session.userId);

    if (error) {
      console.error('Fetch favorites error:', error);
      return NextResponse.json({ ok: true, favorites: [] });
    }

    const favorites = (data || []).map((row: any) => row.place_id);
    return NextResponse.json({ ok: true, favorites });
  } catch (err: any) {
    console.error('Favorites GET error:', err);
    return NextResponse.json({ ok: true, favorites: [] });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول لحفظ المفضلة.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const body = await req.json();
    const { placeId, action = 'toggle' } = body;

    if (!placeId) {
      return NextResponse.json({ ok: false, message: 'معرف المكان مطلوب.' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local fallback mode: client will retain in localStorage
      return NextResponse.json({ ok: true, localOnly: true });
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', session.userId)
      .eq('place_id', placeId)
      .maybeSingle();

    let isFavorited = false;

    if (action === 'remove' || (action === 'toggle' && existing)) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.userId)
        .eq('place_id', placeId);
      isFavorited = false;
    } else {
      await supabase
        .from('user_favorites')
        .insert({
          user_id: session.userId,
          place_id: placeId,
        })
        .select('id');
      isFavorited = true;
    }

    return NextResponse.json({ ok: true, isFavorited });
  } catch (err: any) {
    console.error('Favorites POST error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في حفظ المفضلة.' }, { status: 500 });
  }
}
