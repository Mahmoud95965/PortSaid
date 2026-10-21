import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { SEED_LINES } from '@/lib/seed-data';

export async function GET() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('transport_lines').select('*').eq('is_active', true).order('sort_order');
      if (!error && data && data.length > 0) {
        return NextResponse.json({ ok: true, data });
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, data: SEED_LINES });
}
