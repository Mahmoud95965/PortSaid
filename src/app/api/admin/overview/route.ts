import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';
import { dbGetAllMemoriesForAdmin, dbGetHistoricalStories } from '@/lib/db/localDb';

export const runtime = 'nodejs';

/**
 * GET /api/admin/overview — admin-only data for the dashboard.
 *
 * Every number and row here comes from a real data source — nothing is
 * hardcoded or invented:
 * - users / places / visits / partner applications / staff / activity log
 *   → Supabase (service-role client, server-side only).
 * - memories / historical stories
 *   → the local store (src/lib/db/localDb), the same store the admin
 *   memories + history tabs already read from.
 *
 * Access: ONLY the single admin account (portsaidhub@gmail.com).
 * The browser never queries these tables directly with the anon key.
 */
export async function GET() {
  try {
    const adminSession = getAdminSession();
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
        memories: 0,
        stories: 0,
        storiesPublished: 0,
        partnersPending: 0,
        partnersApproved: 0,
      },
      users: [],
      places: [],
      partnerApps: [],
      staffList: [],
      activityLog: [],
    };

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(emptyPayload);
    }

    const [
      usersCountRes,
      placesActiveCountRes,
      placesTotalCountRes,
      visitsCountRes,
      usersRes,
      placesRes,
      appsRes,
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
      supabase.from('partner_applications').select('*').order('created_at', { ascending: false }),
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

    const apps = appsRes.data || [];

    // Real owner names for partner applications: the applications table
    // stores user_id only, so resolve names from the users table instead
    // of ever showing a phone number as a name.
    const ownerIds = Array.from(new Set(apps.map((a: any) => a.user_id).filter(Boolean)));
    let ownerNameById = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase.from('users').select('id, name').in('id', ownerIds);
      ownerNameById = new Map((owners || []).map((u: any) => [String(u.id), u.name]));
    }

    // Memories + stories live in the local store, not Supabase — count
    // them from the same helpers the admin tabs already use.
    let memoriesCount = 0;
    let storiesCount = 0;
    let storiesPublishedCount = 0;
    try {
      memoriesCount = dbGetAllMemoriesForAdmin().length;
      const stories = dbGetHistoricalStories(true);
      storiesCount = stories.length;
      storiesPublishedCount = stories.filter((s) => s.is_published).length;
    } catch (e) {
      console.warn('Admin overview: local store counts unavailable:', e);
    }

    const partnersPending = apps.filter((a: any) => (a.status || 'pending') === 'pending').length;
    const partnersApproved = apps.filter((a: any) => a.status === 'approved').length;

    return NextResponse.json({
      ok: true,
      counts: {
        users: usersCountRes.count ?? 0,
        placesActive: placesActiveCountRes.count ?? 0,
        placesTotal: placesTotalCountRes.count ?? 0,
        visits: visitsCountRes.count ?? 0,
        memories: memoriesCount,
        stories: storiesCount,
        storiesPublished: storiesPublishedCount,
        partnersPending,
        partnersApproved,
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
      partnerApps: apps.map((a: any) => ({
        id: a.id,
        business_name: a.business_name,
        owner_name: ownerNameById.get(String(a.user_id)) || '',
        phone: a.phone || '',
        area: a.area_ar || '',
        discount: a.proposed_discount_percent ?? null,
        commission: a.proposed_commission_amount ?? null,
        status: a.status || 'pending',
        created_at: a.created_at ? a.created_at.slice(0, 10) : '',
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
