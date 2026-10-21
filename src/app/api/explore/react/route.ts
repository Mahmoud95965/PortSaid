import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك لتتمكن من التفاعل' } }, { status: 401 });
  }

  const { id, reaction } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: { message: 'المعرف مفقود' } }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (supabase) {
    if (!reaction) {
      await supabase.from('explore_reactions').delete().eq('upload_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('explore_reactions').upsert({
        upload_id: id,
        user_id: user.id,
        reaction: reaction
      }, { onConflict: 'upload_id,user_id' });
    }
  }

  return NextResponse.json({ ok: true, data: { reacted: true, my: reaction || null } });
}
