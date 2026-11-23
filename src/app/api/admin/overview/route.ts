import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/admin/overview — admin-only data for the dashboard:
 * partner applications + staff accounts (owner/admin roles).
 *
 * Access: ONLY the single admin account (portsaidhub@gmail.com).
 * Data is read server-side with the service-role client, so the browser
 * never queries these tables directly with the anon key.
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

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: true, partnerApps: [], staffList: [] });
    }

    const [{ data: apps }, { data: staffData }] = await Promise.all([
      supabase.from('partner_applications').select('*').order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('id, name, email, phone, status, role_id, roles(code)')
        .in('role_id', [1, 2])
        .is('deleted_at', null),
    ]);

    return NextResponse.json({
      ok: true,
      partnerApps: (apps || []).map((a: any) => ({
        id: a.id,
        business_name: a.business_name,
        owner_name: a.phone || 'تاجر مسجل',
        phone: a.phone || '',
        area: a.area_ar || 'بورسعيد',
        discount: a.proposed_discount_percent || 10,
        commission: a.proposed_commission_amount || 5,
        status: a.status || 'pending',
        created_at: a.created_at ? a.created_at.slice(0, 10) : '',
      })),
      staffList: (staffData || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.roles?.code || 'admin',
        status: u.status || 'active',
        perms: u.role_id === 1 ? ['all'] : ['users.view', 'places.view', 'places.edit', 'stats.view'],
      })),
    });
  } catch (err) {
    console.error('Error in GET /api/admin/overview:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء تحميل بيانات لوحة التحكم.' }, { status: 500 });
  }
}
