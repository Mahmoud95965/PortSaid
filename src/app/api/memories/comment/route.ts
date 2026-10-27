import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbAddMemoryComment, dbGetMemoryComments } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('memoryId');
    if (!memoryId) {
      return NextResponse.json({ ok: false, message: 'معرف المنشور مطلوب.' }, { status: 400 });
    }

    const comments = dbGetMemoryComments(memoryId);
    return NextResponse.json({ ok: true, comments });
  } catch (err: any) {
    console.error('Error in GET /api/memories/comment:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في تحميل التعليقات.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول لإضافة تعليق.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const body = await req.json();
    const { memoryId, comment } = body;

    if (!memoryId || !comment || !String(comment).trim()) {
      return NextResponse.json({ ok: false, message: 'التعليق لا يمكن أن يكون فارغاً.' }, { status: 400 });
    }

    const newComment = dbAddMemoryComment({
      memoryId,
      userId: session.userId,
      userName: session.name,
      comment: String(comment).trim(),
    });

    return NextResponse.json({
      ok: true,
      comment: newComment,
    });
  } catch (err: any) {
    console.error('Error in POST /api/memories/comment:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء إضافة التعليق.' }, { status: 500 });
  }
}
