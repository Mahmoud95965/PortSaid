import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// نشر/تعديل تقييم مكان. أمان: الجلسة هي اللي تحدد المستخدم (user_id من
// الجلسة مش من الطلب)، والتقييم 1–5، والمكان لازم يكون موجود ونشط.
// كان التقييم بيُكتب مباشرة من المتصفح بالمفتاح العام (سياسة ALL) — أي
// حد يقدر يكتب أو يمسح تقييم أي مستخدم؛ دلوقتي الكتابة من الخادم بس.
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? unsealSessionToken(token) : null;
    if (!session) {
      return NextResponse.json(
        { ok: false, message: 'سجّل الدخول أولاً لنشر تقييم.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const placeId = body?.placeId;
    const rating = Number(body?.rating);
    if (
      !placeId ||
      typeof placeId !== 'string' ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        { ok: false, message: 'تقييم غير صالح (من 1 إلى 5).' },
        { status: 400 }
      );
    }
    const comment =
      typeof body?.comment === 'string' && body.comment.trim()
        ? body.comment.trim().slice(0, 1000)
        : null;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: 'قاعدة البيانات غير متاحة حالياً.' },
        { status: 503 }
      );
    }

    const { data: place } = await supabase
      .from('places')
      .select('id')
      .eq('id', placeId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();
    if (!place) {
      return NextResponse.json(
        { ok: false, message: 'المكان غير موجود.' },
        { status: 404 }
      );
    }

    const { error } = await supabase.from('place_reviews').upsert(
      {
        place_id: placeId,
        user_id: session.userId,
        rating,
        comment,
        status: 'visible',
      },
      { onConflict: 'place_id,user_id' }
    );
    if (error) {
      console.error('Review save error:', error);
      return NextResponse.json(
        { ok: false, message: 'فشل حفظ التقييم، جرّب تاني.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Review route error:', error);
    return NextResponse.json(
      { ok: false, message: 'حدث خطأ غير متوقع.' },
      { status: 500 }
    );
  }
}
