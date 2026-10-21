import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const info: Record<string, any> = {
    runtime: 'Node.js ' + process.version,
    framework: 'Next.js 14',
    status: 'healthy',
    supabase_configured: isSupabaseConfigured,
    db_connect: false,
    timestamp: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('roles').select('id').limit(1);
      if (!error) {
        info.db_connect = true;
        const { count } = await supabase.from('places').select('*', { count: 'exact', head: true });
        info.places_count = count || 0;
      } else {
        info.db_error = error.message;
      }
    } catch (e: any) {
      info.db_error = e.message;
    }
  }

  return NextResponse.json(info);
}
