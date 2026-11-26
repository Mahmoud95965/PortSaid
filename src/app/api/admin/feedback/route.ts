import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VALID_KINDS = ['suggestion', 'complaint'] as const;
const VALID_STATUSES = ['new', 'in_progress', 'resolved'] as const;

type FeedbackStatus = (typeof VALID_STATUSES)[number];

/**
 * GET /api/admin/feedback — admin-only list of user suggestions & complaints.
 *
 * Rows come from the feedback table (written server-side only by
 * POST /api/feedback — the public INSERT policy was dropped in
 * migration 16). The browser never queries this table directly.
 * Query params: ?kind=suggestion|complaint|all (default all),
 * ?status=new|in_progress|resolved|all (default all).
 * Returns the latest 100 rows (newest first) with the sender's name and
 * email, plus total/new counts.
 *
 * PATCH /api/admin/feedback — admin-only status change.
 * Body: { id, status } with status in new | in_progress | resolved.
 *
 * Access: ONLY the single admin account (portsaidhub@gmail.com).
 */
export async function GET(req: Request) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, message: 'غير مصرح بالدخول. هذه المنطقة مخصصة للمسؤول فقط.' },
        { status: 403 }
      );
    }

    const empty = { ok: true, feedback: [], counts: { total: 0, new: 0 } };
    const supabase = getSupabaseServer();
    if (!supabase) return NextResponse.json(empty);

    const url = new URL(req.url);
    const kindParam = url.searchParams.get('kind');
    const statusParam = url.searchParams.get('status');
    const kind = kindParam === 'complaint' || kindParam === 'suggestion' ? kindParam : null;
    const status = (VALID_STATUSES as readonly string[]).includes(statusParam || '')
      ? (statusParam as FeedbackStatus)
      : null;

    try {
      let rowsQuery = supabase
        .from('feedback')
        .select('id, user_id, kind, message, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (kind) rowsQuery = rowsQuery.eq('kind', kind);
      if (status) rowsQuery = rowsQuery.eq('status', status);

      const [rowsRes, totalRes, newRes] = await Promise.all([
        rowsQuery,
        supabase.from('feedback').select('*', { count: 'exact', head: true }),
        supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      if (rowsRes.error) throw rowsRes.error;
      const rows = Array.isArray(rowsRes.data) ? rowsRes.data : [];

      // Sender names — separate lookup (no FK dependency).
      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      let usersById: Record<string, { name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const usersRes = await supabase.from('users').select('id, name, email').in('id', userIds);
        if (!usersRes.error && Array.isArray(usersRes.data)) {
          for (const u of usersRes.data) {
            usersById[u.id] = { name: u.name ?? null, email: u.email ?? null };
          }
        }
      }

      const feedback = rows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user_name: usersById[r.user_id]?.name ?? null,
        user_email: usersById[r.user_id]?.email ?? null,
        kind: r.kind,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
      }));

      return NextResponse.json({
        ok: true,
        feedback,
        counts: { total: totalRes.count ?? rows.length, new: newRes.count ?? 0 },
      });
    } catch {
      // Missing feedback table (or any read failure) — empty list, not a crash.
      return NextResponse.json(empty);
    }
  } catch (err) {
    console.error('Error in GET /api/admin/feedback:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء جلب المقترحات والشكاوى.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, message: 'غير مصرح بالدخول. هذه المنطقة مخصصة للمسؤول فقط.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const status = body?.status as string;
    if (!id) {
      return NextResponse.json({ ok: false, message: 'معرّف الرسالة مطلوب.' }, { status: 400 });
    }
    if (!(VALID_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { ok: false, message: 'الحالة غير صالحة (جديدة، قيد المعالجة، تمت المعالجة).' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: 'قاعدة البيانات غير متاحة.' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('feedback')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .maybeSingle();

    if (error) {
      console.error('Error updating feedback status:', error);
      return NextResponse.json({ ok: false, message: 'تعذر تحديث الحالة.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: 'الرسالة غير موجودة.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, feedback: data });
  } catch (err) {
    console.error('Error in PATCH /api/admin/feedback:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تحديث الحالة.' }, { status: 500 });
  }
}
