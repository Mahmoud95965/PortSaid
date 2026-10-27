import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dbGetMemories, dbCreateMemory, dbDeleteMemory, dbGetAllMemoriesForAdmin } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forAdmin = searchParams.get('admin') === 'true';

    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? unsealSessionToken(token) : null;

    if (forAdmin && session && (session.role === 'admin' || session.role === 'owner')) {
      const allMemories = dbGetAllMemoriesForAdmin();
      return NextResponse.json({ ok: true, memories: allMemories });
    }

    const memories = dbGetMemories(session?.userId);
    return NextResponse.json({ ok: true, memories });
  } catch (err: any) {
    console.error('Error in GET /api/memories:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تحميل الذكريات.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول أولاً لمشاركة ذكرياتك.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, caption } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ ok: false, message: 'يرجى اختيار صورة للمشاركة.' }, { status: 400 });
    }

    // Image size validation (base64 check max ~5MB)
    if (imageUrl.startsWith('data:')) {
      const approxBytes = (imageUrl.length * 3) / 4;
      if (approxBytes > 5 * 1024 * 1024) {
        return NextResponse.json({ ok: false, message: 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.' }, { status: 400 });
      }

      // Check format
      const validTypes = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/jpg'];
      const isValid = validTypes.some((t) => imageUrl.startsWith(t));
      if (!isValid) {
        return NextResponse.json({ ok: false, message: 'صيغة الصورة غير مدعومة. الصيغ المتاحة: JPEG, PNG, WEBP.' }, { status: 400 });
      }
    }

    const newMemory = dbCreateMemory({
      userId: session.userId,
      userName: session.name,
      imageUrl,
      caption: caption ? String(caption).trim() : '',
    });

    return NextResponse.json({
      ok: true,
      memory: newMemory,
      message: 'تمت مشاركة ذكراك بنجاح في مجتمع بورسعيد هب! 🎉',
    });
  } catch (err: any) {
    console.error('Error in POST /api/memories:', err);
    return NextResponse.json({ ok: false, message: 'فشل في حفظ الصورة، يرجى المحاولة لاحقاً.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, message: 'غير مصرح.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('id');
    if (!memoryId) {
      return NextResponse.json({ ok: false, message: 'معرف المنشور مطلوب.' }, { status: 400 });
    }

    const isStaff = session.role === 'admin' || session.role === 'owner';
    const deleted = dbDeleteMemory(memoryId, session.userId, isStaff);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: 'لا تملك صلاحية حذف هذا المنشور أو المنشور غير موجود.' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, message: 'تم حذف المنشور بنجاح.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/memories:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء الحذف.' }, { status: 500 });
  }
}
