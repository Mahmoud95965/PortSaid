import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Transit network (lines, stops, one-way bans, curated trips) lives in
// Supabase now — tables created by migrations/10_transit_network_2026-11-25.sql.
// The frontend reads this route and falls back to the in-code constants
// (TRANSPORT_NET / CURATED_TRIPS in src/lib/constants.ts) when the tables
// are not there yet, so the transport page keeps working before the
// migration is run.

function tableMissingMessage(err: any): string | null {
  if (!err) return null;
  if (err.code === 'PGRST205' || String(err.message || '').includes('transit_')) {
    return 'جداول المواصلات غير موجودة بعد — نفّذ ملف migrations/10_transit_network_2026-11-25.sql في Supabase أولاً.';
  }
  return null;
}

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: 'تعذر الاتصال بقاعدة البيانات.' }, { status: 500 });
    }

    const [stopsRes, linesRes, lineStopsRes, bansRes, tripsRes] = await Promise.all([
      supabase.from('transit_stops').select('*').order('sort_order', { ascending: true }),
      supabase.from('transit_lines').select('*').order('sort_order', { ascending: true }),
      supabase.from('transit_line_stops').select('*').order('seq', { ascending: true }),
      supabase.from('transit_route_bans').select('*'),
      supabase.from('transit_trips').select('*').order('sort_order', { ascending: true }),
    ]);

    const err = stopsRes.error || linesRes.error || lineStopsRes.error || bansRes.error || tripsRes.error;
    if (err) {
      console.error('Error in GET /api/transit:', err);
      return NextResponse.json(
        { ok: false, message: tableMissingMessage(err) || 'فشل في تحميل بيانات المواصلات.' },
        { status: 500 },
      );
    }

    const stopsById: Record<string, any> = {};
    const stops = (stopsRes.data || []).map((r: any) => {
      const s = {
        id: r.id,
        name: r.name_ar,
        short_name: r.short_name_ar ?? null,
        district: r.district_ar ?? null,
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        aliases: Array.isArray(r.aliases_ar) ? r.aliases_ar : [],
        notes: r.notes_ar ?? null,
      };
      stopsById[r.id] = s;
      return s;
    });

    const lineStopsByLine: Record<string, any[]> = {};
    (lineStopsRes.data || []).forEach((r: any) => {
      const stop = stopsById[r.stop_id];
      if (!stop) return;
      (lineStopsByLine[r.line_id] = lineStopsByLine[r.line_id] || []).push({
        name: stop.name,
        seq: r.seq ?? 0,
        note: r.note_ar ?? null,
      });
    });

    const lines = (linesRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name_ar,
      description: r.description_ar ?? null,
      notes: r.notes_ar ?? null,
      outbound_path: r.outbound_path_ar ?? null,
      return_path: r.return_path_ar ?? null,
      needs_review: Boolean(r.needs_review),
      stops: (lineStopsByLine[r.id] || []).sort((a, b) => a.seq - b.seq),
    }));

    const linesById: Record<string, any> = {};
    lines.forEach((l: any) => {
      linesById[l.id] = l;
    });

    const bans = (bansRes.data || []).map((r: any) => {
      const line = linesById[r.line_id];
      const from = stopsById[r.from_stop_id];
      const to = stopsById[r.to_stop_id];
      return {
        line: line ? line.name : r.line_id,
        from: from ? from.name : r.from_stop_id,
        to: to ? to.name : r.to_stop_id,
      };
    });

    const trips = (tripsRes.data || []).map((r: any) => {
      const from = stopsById[r.from_stop_id];
      const to = stopsById[r.to_stop_id];
      const legs = (Array.isArray(r.legs) ? r.legs : []).map((leg: any) => {
        const line = leg.line_id ? linesById[leg.line_id] : null;
        const lf = leg.from_stop_id ? stopsById[leg.from_stop_id] : null;
        const lt = leg.to_stop_id ? stopsById[leg.to_stop_id] : null;
        return {
          line: line ? line.name : null,
          from: lf ? lf.name : leg.from_stop_id,
          to: lt ? lt.name : leg.to_stop_id,
          board_text: leg.board_text ?? undefined,
          alight_text: leg.alight_text ?? undefined,
          note: leg.note ?? undefined,
        };
      });
      return {
        id: r.id,
        from: from ? from.name : r.from_stop_id,
        to: to ? to.name : r.to_stop_id,
        title: r.title_ar,
        legs,
        is_confirmed: Boolean(r.is_confirmed),
      };
    });

    return NextResponse.json({ ok: true, stops, lines, bans, trips });
  } catch (err: any) {
    console.error('Error in GET /api/transit:', err);
    return NextResponse.json({ ok: false, message: 'فشل في تحميل بيانات المواصلات.' }, { status: 500 });
  }
}
