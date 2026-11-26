import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Historical stories (الدليل التاريخي) are stored in Supabase now, NOT in
// the local SQLite file (src/lib/db/localDb.ts): on Vercel the filesystem
// is read-only outside /tmp, so that database could never be opened there
// and every read AND save failed with a 500. The table is created by
// migrations/07_historical_stories.sql — run it in the Supabase SQL Editor
// before using this route; until then the API answers with a clear message
// asking for that step instead of failing silently.

function toStory(r: any) {
  return {
    id: r.id,
    title_ar: r.title_ar,
    era_year: r.era_year ?? null,
    summary_ar: r.summary_ar,
    content_ar: r.content_ar,
    image_url: r.image_url,
    additional_images: Array.isArray(r.additional_images) ? r.additional_images : [],
    sort_order: r.sort_order ?? 0,
    is_published: Boolean(r.is_published),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// PostgREST reports a table that does not exist yet (migration not
// applied) as PGRST205 / a schema-cache miss mentioning the table name.
function tableMissingMessage(err: any): string | null {
  if (!err) return null;
  if (err.code === 'PGRST205' || String(err.message || '').includes('historical_stories')) {
    return 'جدول القصص التاريخية غير موجود بعد — نفّذ ملف migrations/07_historical_stories.sql في Supabase أولاً.';
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeUnpublished = searchParams.get('all') === 'true';

    // Unpublished stories are visible only to the single admin account.
    const isStaff = !!await getAdminSession();

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: 'تعذر الاتصال بقاعدة البيانات.' }, { status: 500 });
    }

    let query = supabase
      .from('historical_stories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!(includeUnpublished && isStaff)) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error in GET /api/historical-stories:', error);
      return NextResponse.json(
        { ok: false, message: tableMissingMessage(error) || 'فشل في تحميل القصص التاريخية.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, stories: (data || []).map(toStory) });
  } catch (err: any) {
    console.error('Error in GET /api/historical-stories:', err);
    return NextResponse.json({ ok: false, message: 'فشل في تحميل القصص التاريخية.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Creating/editing stories is an admin-only action, restricted to the
    // single admin account (portsaidhub@gmail.com).
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: 'هذه العملية تتطلب صلاحيات المسؤول.' }, { status: 403 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: 'تعذر الاتصال بقاعدة البيانات.' }, { status: 500 });
    }

    const body = await req.json();
    const { id, title_ar, era_year, summary_ar, content_ar, image_url, additional_images, sort_order, is_published } = body;

    if (!title_ar || !summary_ar || !content_ar || !image_url) {
      return NextResponse.json({ ok: false, message: 'يرجى إدخال العنوان، الملخص، المحتوى، والصورة الأساسية.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      title_ar: String(title_ar).trim(),
      era_year: era_year ? String(era_year).trim() : null,
      summary_ar: String(summary_ar).trim(),
      content_ar: String(content_ar).trim(),
      image_url: String(image_url).trim(),
      additional_images: Array.isArray(additional_images) ? additional_images : [],
      sort_order: typeof sort_order === 'number' ? sort_order : 0,
      is_published: is_published !== false,
      updated_at: now,
    };

    if (id) {
      const { data, error } = await supabase
        .from('historical_stories')
        .update(payload)
        .eq('id', String(id))
        .select()
        .single();
      if (error || !data) {
        console.error('Error updating historical story:', error);
        return NextResponse.json(
          { ok: false, message: tableMissingMessage(error) || 'حدث خطأ أثناء حفظ القصة التاريخية.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, story: toStory(data), message: 'تم حفظ القصة التاريخية بنجاح.' });
    }

    const newId = `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data, error } = await supabase
      .from('historical_stories')
      .insert({ ...payload, id: newId, created_at: now })
      .select()
      .single();
    if (error || !data) {
      console.error('Error inserting historical story:', error);
      return NextResponse.json(
        { ok: false, message: tableMissingMessage(error) || 'حدث خطأ أثناء حفظ القصة التاريخية.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      story: toStory(data),
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
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: 'هذه العملية تتطلب صلاحيات المسؤول.' }, { status: 403 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: 'تعذر الاتصال بقاعدة البيانات.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('id');
    if (!storyId) {
      return NextResponse.json({ ok: false, message: 'معرف القصة مطلوب.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('historical_stories')
      .delete()
      .eq('id', storyId)
      .select('id');
    if (error) {
      console.error('Error in DELETE /api/historical-stories:', error);
      return NextResponse.json(
        { ok: false, message: tableMissingMessage(error) || 'حدث خطأ أثناء الحذف.' },
        { status: 500 }
      );
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, message: 'القصة غير موجودة.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'تم حذف القصة التاريخية بنجاح.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/historical-stories:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء الحذف.' }, { status: 500 });
  }
}
