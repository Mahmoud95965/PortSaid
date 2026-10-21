import { NextResponse } from 'next/server';
import { getSessionUser, DEFAULT_ADMIN } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: { message: 'غير مصرح' } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  const supabase = getSupabaseAdmin();
  if (supabase) {
    let query = supabase.from('users').select('*, roles(code, name_ar)').is('deleted_at', null).order('created_at', { ascending: false }).limit(50);
    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data } = await query;
    if (data) {
      return NextResponse.json({
        ok: true,
        data: data.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.roles?.code || 'user',
          role_name: u.roles?.name_ar || 'مستخدم',
          points: u.points_balance || 0,
          status: u.status,
          created_at: u.created_at
        }))
      });
    }
  }

  return NextResponse.json({ ok: true, data: [DEFAULT_ADMIN] });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: { message: 'غير مصرح' } }, { status: 403 });
  }

  const { user_id, action, delta, status } = await req.json();
  if (!user_id) return NextResponse.json({ ok: false, error: { message: 'المعرف مطلوب' } }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    if (action === 'points' && delta !== undefined) {
      const { data: u } = await supabase.from('users').select('points_balance').eq('id', user_id).single();
      const newPts = Math.max(0, (u?.points_balance || 0) + Number(delta));
      await supabase.from('users').update({ points_balance: newPts }).eq('id', user_id);
      await supabase.from('points_ledger').insert([{
        user_id,
        delta: Number(delta),
        balance_after: newPts,
        reason: 'admin_adjust',
        ref_type: 'admin'
      }]);
      return NextResponse.json({ ok: true, data: { new_points: newPts } });
    }

    if (action === 'status' && status) {
      await supabase.from('users').update({ status }).eq('id', user_id);
      return NextResponse.json({ ok: true, data: { status } });
    }
  }

  return NextResponse.json({ ok: true, data: { updated: true } });
}
