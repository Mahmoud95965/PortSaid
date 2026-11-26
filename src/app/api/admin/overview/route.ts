import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/admin/overview — admin-only data for the dashboard.
 *
 * Every number and row here comes from a real data source — nothing is
 * hardcoded or invented. All of it comes from Supabase (service-role
 * client, server-side only): users / places / visits / historical
 * stories / staff / activity log.
 *
 * The stories counts tolerate a missing historical_stories table (the
 * migration in migrations/07_historical_stories.sql not applied yet):
 * they fall back to 0 instead of failing the whole dashboard.
 *
 * Access: ONLY the single admin account (portsaidhub@gmail.com).
 * The browser never queries these tables directly with the anon key.
 */
export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, message: 'غير مصرح بالدخول. هذه المنطقة مخصصة للمسؤول فقط.' },
        { status: 403 }
      );
    }

    const emptyPayload = {
      ok: true,
      counts: {
        users: 0,
        placesActive: 0,
        placesTotal: 0,
        visits: 0,
        stories: 0,
        storiesPublished: 0,
        feedbackNew: 0,
      },
      users: [],
      places: [],
      staffList: [],
      activityLog: [],
    };

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(emptyPayload);
    }

    // Stories counts must not break the dashboard when the table does
    // not exist yet (migration 07 not applied): fall back to 0.
    const storiesCountPromise = supabase
      .from('historical_stories')
      .select('*', { count: 'exact', head: true })
      .then((r) => r.count ?? 0, () => 0);
    const storiesPublishedCountPromise = supabase
      .from('historical_stories')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .then((r) => r.count ?? 0, () => 0);

    const feedbackNewCountPromise = supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
      .then((r) => r.count ?? 0, () => 0);

    const [
      usersCountRes,
      placesActiveCountRes,
      placesTotalCountRes,
      visitsCountRes,
      storiesCount,
      storiesPublishedCount,
      feedbackNewCount,
      usersRes,
      placesRes,
      staffRes,
      logRes,
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase
        .from('places')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null),
      supabase.from('places').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('visits').select('*', { count: 'exact', head: true }),
      storiesCountPromise,
      storiesPublishedCountPromise,
      feedbackNewCountPromise,
      supabase
        .from('users')
        .select('id, name, email, phone, status, role_id, created_at, roles(code)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('places')
        .select('id, name_ar, area_ar, status, created_at, categories(code)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('users')
        .select('id, name, email, phone, status, role_id, roles(code)')
        .in('role_id', [1, 2])
        .is('deleted_at', null),
      supabase
        .from('activity_log')
        .select('id, actor_name, actor_role, tag, severity, description, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      ok: true,
      counts: {
        users: usersCountRes.count ?? 0,
        placesActive: placesActiveCountRes.count ?? 0,
        placesTotal: placesTotalCountRes.count ?? 0,
        visits: visitsCountRes.count ?? 0,
        stories: storiesCount,
        storiesPublished: storiesPublishedCount,
        feedbackNew: feedbackNewCount,
      },
      users: (usersRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status || 'active',
        role: u.roles?.code || 'user',
        created_at: u.created_at ? u.created_at.slice(0, 10) : '',
      })),
      places: (placesRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name_ar,
        area: p.area_ar,
        category: p.categories?.code || '',
        status: p.status || '',
        created_at: p.created_at ? p.created_at.slice(0, 10) : '',
      })),
      staffList: (staffRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.roles?.code || 'admin',
        status: u.status || 'active',
        perms: u.role_id === 1 ? ['all'] : ['users.view', 'places.view', 'places.edit', 'stats.view'],
      })),
      activityLog: (logRes.data || []).map((l: any) => ({
        id: l.id,
        actor_name: l.actor_name,
        actor_role: l.actor_role,
        tag: l.tag,
        severity: l.severity,
        description: l.description,
        created_at: l.created_at || '',
      })),
    });
  } catch (err) {
    console.error('Error in GET /api/admin/overview:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تحميل بيانات لوحة التحكم.' }, { status: 500 });
  }
}
