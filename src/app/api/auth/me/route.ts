import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, user: null });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, user: null });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      // In dev fallback mode when remote DB is offline, return session payload
      return NextResponse.json({
        ok: true,
        user: {
          id: session.userId,
          name: session.name,
          email: session.email,
          phone: session.phone,
          role: session.role,
          points: 120,
          staff: session.role === 'owner' || session.role === 'admin',
        },
      });
    }

    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
      .eq('id', session.userId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !dbUser) {
      // User deleted or suspended
      cookieStore.delete(SESSION_COOKIE_NAME);
      return NextResponse.json({ ok: false, user: null });
    }

    const roleCode = (dbUser.roles?.code || session.role || 'user') as 'owner' | 'admin' | 'merchant' | 'user';

    return NextResponse.json({
      ok: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: roleCode,
        type: dbUser.user_types?.code,
        gov: dbUser.governorates?.name_ar,
        institution: dbUser.institutions?.name_ar,
        gender: dbUser.gender,
        points: dbUser.points_balance || 0,
        avatar: dbUser.avatar,
        email_verified: !!dbUser.email_verified_at,
        staff: roleCode === 'owner' || roleCode === 'admin',
        must_change_password: dbUser.must_change_password,
      },
    });
  } catch (err: any) {
    console.error('Server /api/auth/me error:', err);
    return NextResponse.json({ ok: false, user: null }, { status: 500 });
  }
}
