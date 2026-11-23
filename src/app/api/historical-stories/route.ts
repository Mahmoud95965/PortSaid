import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { dbGetHistoricalStories, dbSaveHistoricalStory, dbDeleteHistoricalStory } from '@/lib/db/localDb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeUnpublished = searchParams.get('all') === 'true';

    // Unpublished stories are visible only to the single admin account.
    const isStaff = !!getAdminSession();

    const stories = dbGetHistoricalStories(includeUnpublished && isStaff ? true : false);
    return NextResponse.json({ ok: true, stories });
  } catch (err: any) {
    console.error('Error in GET /api/historical-stories:', err);
    return NextResponse.json({ ok: false, message: 'فشل في تحميل القصص التاريخية.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Creating/editing stories is an admin-only action, restricted to the
    // single admin account (portsaidhub@gmail.com).
    const adminSession = getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: 'هذه العملية تتطلب صلاحيات المسؤول.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, title_ar, era_year, summary_ar, content_ar, image_url, additional_images, sort_order, is_published } = body;

    if (!title_ar || !summary_ar || !content_ar || !image_url) {
      return NextResponse.json({ ok: false, message: 'يرجى إدخال العنوان، الملخص، المحتوى، والصورة الأساسية.' }, { status: 400 });
    }

    const savedStory = dbSaveHistoricalStory({
      id,
      title_ar: String(title_ar).trim(),
      era_year: era_year ? String(era_year).trim() : null,
      summary_ar: String(summary_ar).trim(),
      content_ar: String(content_ar).trim(),
      image_url: String(image_url).trim(),
      additional_images: Array.isArray(additional_images) ? additional_images : [],
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
      is_published: is_published !== false,
    });

    return NextResponse.json({
      ok: true,
      story: savedStory,
      message: 'تم حفظ القصة التاريخية بنجاح.',
    });
  } catch (err: any) {
    console.error('Error in POST /api/historical-stories:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء حفظ القصة التاريخية.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Deleting stories is an admin-only action, restricted to the single
    // admin account (portsaidhub@gmail.com).
    const adminSession = getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: 'هذه العملية تتطلب صلاحيات المسؤول.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('id');
    if (!storyId) {
      return NextResponse.json({ ok: false, message: 'معرف القصة مطلوب.' }, { status: 400 });
    }

    const deleted = dbDeleteHistoricalStory(storyId);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: 'القصة غير موجودة.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'تم حذف القصة التاريخية بنجاح.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/historical-stories:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء الحذف.' }, { status: 500 });
  }
}
