import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({
      ok: true,
      data: {
        points_awarded: 50,
        balance: 50,
      },
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: dbUser } = await supabase.from('users').select('points_balance').eq('id', user.id).single();
      const currentPoints = dbUser?.points_balance || 0;
      const newPoints = currentPoints + 50;
      await supabase.from('users').update({ points_balance: newPoints }).eq('id', user.id);
      return NextResponse.json({
        ok: true,
        data: {
          points_awarded: 50,
          balance: newPoints,
        },
      });
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    data: {
      points_awarded: 50,
      balance: (user.points || 0) + 50,
    },
  });
}
