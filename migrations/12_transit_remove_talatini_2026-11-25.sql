-- Migration: 12_transit_remove_talatini_2026-11-25.sql
-- Remove خط التلاتيني (al-talatini) from the transit network.
-- Mahmoud confirmed 25 Nov 2026 that the transport start-point choices must be
-- restricted to ONLY what he sent in his brief; التلاتيني was never in his list
-- (it was seeded with needs_review=true in migration 10, with the note asking
-- whether to keep or delete it). Its only unique stop, شارع الجمهورية
-- (gomhouria-st), goes with it — every other stop on the line (منطقة الـ 5000)
-- is also on خط الـ 5000 and stays.
-- Run in Supabase dashboard -> SQL Editor -> Run. Idempotent: safe to re-run.

DELETE FROM public.transit_line_stops WHERE line_id = 'al-talatini';
DELETE FROM public.transit_lines WHERE id = 'al-talatini';
DELETE FROM public.transit_stops WHERE id = 'gomhouria-st'
  AND NOT EXISTS (
    SELECT 1 FROM public.transit_line_stops WHERE stop_id = 'gomhouria-st'
  );

-- Expected after running: lines 5, stops 23, line-stops 29, bans 2, trips 7.
