import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbToggleMemoryLike } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول للإعجاب بالمنشور.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const body = await req.json();
    const { memoryId } = body;

    if (!memoryId) {
      return NextResponse.json({ ok: false, message: 'معرف المنشور مطلوب.' }, { status: 400 });
    }

    const result = dbToggleMemoryLike(session.userId, memoryId);

    return NextResponse.json({
      ok: true,
      liked: result.liked,
      likesCount: result.count,
    });
  } catch (err: any) {
    console.error('Error in POST /api/memories/like:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في تسجيل الإعجاب.' }, { status: 500 });
  }
}
