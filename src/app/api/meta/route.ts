import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { SEED_CATEGORIES, SEED_GOVERNORATES, SEED_INSTITUTIONS } from '@/lib/seed-data';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      data: {
        categories: SEED_CATEGORIES,
        governorates: SEED_GOVERNORATES,
        institutions: SEED_INSTITUTIONS,
        user_types: [
          { id: 1, code: 'student', name_ar: 'طالب' },
          { id: 2, code: 'visitor', name_ar: 'سائح أو مغترب' },
          { id: 3, code: 'local', name_ar: 'من بورسعيد' },
        ]
      }
    });
  }

  try {
    const [catsRes, govsRes, instsRes, typesRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('governorates').select('*'),
      supabase.from('institutions').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_types').select('*'),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        categories: catsRes.data && catsRes.data.length > 0 ? catsRes.data : SEED_CATEGORIES,
        governorates: govsRes.data && govsRes.data.length > 0 ? govsRes.data.map(g => g.name_ar) : SEED_GOVERNORATES,
        institutions: instsRes.data && instsRes.data.length > 0 ? instsRes.data.map(i => i.name_ar) : SEED_INSTITUTIONS,
        user_types: typesRes.data || []
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      data: {
        categories: SEED_CATEGORIES,
        governorates: SEED_GOVERNORATES,
        institutions: SEED_INSTITUTIONS
      }
    });
  }
}
