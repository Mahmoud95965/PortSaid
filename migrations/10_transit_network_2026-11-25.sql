-- Migration 10: Port Said transit network (lines, stops, trips) — Nov 2026
-- Source: Mahmoud's transport brief (WhatsApp, 25 Nov 2026, 12:32 EET).
-- Design: lines + stops + ordered line-stops + one-way bans + curated TRIPS.
-- A trip is data (from_stop -> to_stop -> ordered legs), so new trips can be
-- added with a plain INSERT — no code change. The site reads everything from
-- GET /api/transit and falls back to the in-code constants if the tables are missing.
-- Notes: 'معهد الحاسب الآلي' was merged into 'كلية التكنولوجيا والحقوق' (same place,
-- kept as an alias on the stop). 'خط التلاتيني' is seeded with needs_review=true —
-- it was in the old code but NOT in Mahmoud's list; confirm keep vs delete.
-- The صيدلة trips are seeded with is_confirmed=false (still needs confirmation).
-- Run in Supabase Dashboard -> SQL Editor -> Run, AFTER merging.

CREATE TABLE IF NOT EXISTS public.transit_stops (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  short_name_ar text,
  district_ar text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  aliases_ar text[] NOT NULL DEFAULT '{}',
  notes_ar text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transit_lines (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  description_ar text,
  notes_ar text,
  outbound_path_ar text,
  return_path_ar text,
  needs_review boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transit_line_stops (
  line_id text NOT NULL REFERENCES public.transit_lines(id) ON DELETE CASCADE,
  stop_id text NOT NULL REFERENCES public.transit_stops(id) ON DELETE CASCADE,
  seq int NOT NULL,
  note_ar text,
  PRIMARY KEY (line_id, stop_id)
);

CREATE TABLE IF NOT EXISTS public.transit_route_bans (
  line_id text NOT NULL REFERENCES public.transit_lines(id) ON DELETE CASCADE,
  from_stop_id text NOT NULL REFERENCES public.transit_stops(id) ON DELETE CASCADE,
  to_stop_id text NOT NULL REFERENCES public.transit_stops(id) ON DELETE CASCADE,
  reason_ar text,
  PRIMARY KEY (line_id, from_stop_id, to_stop_id)
);

CREATE TABLE IF NOT EXISTS public.transit_trips (
  id text PRIMARY KEY,
  from_stop_id text NOT NULL REFERENCES public.transit_stops(id) ON DELETE CASCADE,
  to_stop_id text NOT NULL REFERENCES public.transit_stops(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  legs jsonb NOT NULL DEFAULT '[]',
  is_confirmed boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transit_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for transit_stops" ON public.transit_stops;
CREATE POLICY "Public read for transit_stops" ON public.transit_stops FOR SELECT USING (true);

ALTER TABLE public.transit_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for transit_lines" ON public.transit_lines;
CREATE POLICY "Public read for transit_lines" ON public.transit_lines FOR SELECT USING (true);

ALTER TABLE public.transit_line_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for transit_line_stops" ON public.transit_line_stops;
CREATE POLICY "Public read for transit_line_stops" ON public.transit_line_stops FOR SELECT USING (true);

ALTER TABLE public.transit_route_bans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for transit_route_bans" ON public.transit_route_bans;
CREATE POLICY "Public read for transit_route_bans" ON public.transit_route_bans FOR SELECT USING (true);

ALTER TABLE public.transit_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for transit_trips" ON public.transit_trips;
CREATE POLICY "Public read for transit_trips" ON public.transit_trips FOR SELECT USING (true);

-- ---- Stops (24 — معهد الحاسب الآلي merged into كلية التكنولوجيا والحقوق) ----
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('maadeya', 'المعدية / السكن الجامعي', 'المعدية', 'بورفؤاد', 31.2447, 32.3202, '{}', NULL, 1) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('qasr-thaqafa', 'قصر الثقافة', NULL, 'حي المناخ', 31.2575, 32.293, '{}', NULL, 2) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('tech-law', 'كلية التكنولوجيا والحقوق', 'كلية التكنولوجيا', 'حي الضواحي', 31.2384, 32.2825, ARRAY['معهد الحاسب الآلي'], 'معهد الحاسب الآلي هو نفسه كلية التكنولوجيا — مكان واحد (كانا محطتين منفصلتين في الكود القديم).', 3) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('bank-housing', 'بنك الإسكان', NULL, 'حي الضواحي', 31.2395, 32.284, '{}', NULL, 4) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('salam-stop', 'السلام', NULL, 'حي المناخ', 31.2562, 32.289, '{}', NULL, 5) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('dawahi-police', 'قسم الضواحي', NULL, 'حي الضواحي', 31.238, 32.282, '{}', NULL, 6) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('hurreyat', 'الحريتين', NULL, 'حي المناخ', 31.252, 32.288, '{}', 'تشمل الحريتين الصغيرة والكبيرة.', 7) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('talatini-st', 'شارع التلاتيني', NULL, 'حي العرب', 31.2582, 32.2905, '{}', NULL, 8) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('manshiya', 'المنشية', NULL, 'حي العرب', 31.2607, 32.298, '{}', NULL, 9) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('medicine', 'كلية الطب والعلاج الطبيعي', 'كلية الطب', 'حي الزهور', 31.2465, 32.2745, '{}', NULL, 10) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('pharmacy', 'كلية الصيدلة', NULL, 'حي الزهور', 31.246, 32.274, '{}', NULL, 11) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('nasr-st', 'شارع النصر', NULL, 'حي المناخ', 31.259, 32.2915, '{}', NULL, 12) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('zohour-area', 'الزهور', NULL, 'حي الزهور', 31.246, 32.274, '{}', NULL, 13) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('omar-abdelaziz', 'عمر بن عبد العزيز', NULL, 'حي الزهور', 31.242, 32.272, '{}', NULL, 14) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('specific-edu', 'كلية التربية النوعية', NULL, 'حي الشرق', 31.264, 32.3025, '{}', NULL, 15) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('ifranj', 'الإفرنج', NULL, 'حي الشرق', 31.264, 32.3025, '{}', NULL, 16) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('arab-district', 'حي العرب', NULL, 'حي العرب', 31.258, 32.296, '{}', NULL, 17) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('manakh-district', 'حي المناخ', NULL, 'حي المناخ', 31.255, 32.285, '{}', NULL, 18) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('taawoneyat', 'التعاونيات', NULL, 'حي الزهور', 31.248, 32.281, '{}', NULL, 19) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('area-5000', 'منطقة الـ 5000', NULL, 'حي الزهور', 31.243, 32.279, '{}', NULL, 20) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('gomhouria-st', 'شارع الجمهورية', NULL, 'حي الشرق', 31.263, 32.305, '{}', NULL, 21) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('aswan-st', 'شارع أسوان', NULL, 'حي العرب', 31.254, 32.287, '{}', NULL, 22) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('fatima-zahra', 'فاطمة الزهراء', NULL, 'حي الضواحي', 31.236, 32.278, '{}', NULL, 23) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_stops (id, name_ar, short_name_ar, district_ar, latitude, longitude, aliases_ar, notes_ar, sort_order) VALUES ('nafisa', 'نفيسة', NULL, 'حي الضواحي', 31.233, 32.275, '{}', NULL, 24) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, short_name_ar=EXCLUDED.short_name_ar, district_ar=EXCLUDED.district_ar, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, aliases_ar=EXCLUDED.aliases_ar, notes_ar=EXCLUDED.notes_ar, sort_order=EXCLUDED.sort_order;

-- ---- Lines (6) ----
INSERT INTO public.transit_lines (id, name_ar, description_ar, notes_ar, outbound_path_ar, return_path_ar, needs_review, sort_order) VALUES ('al-amin', 'الأمين', 'من المعدية / السكن الجامعي عبر قصر الثقافة وكلية التكنولوجيا وبنك الإسكان والسلام وقسم الضواحي والحريتين وشارع الثلاثيني حتى المنشية.', NULL, NULL, NULL, false, 1) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar, notes_ar=EXCLUDED.notes_ar, outbound_path_ar=EXCLUDED.outbound_path_ar, return_path_ar=EXCLUDED.return_path_ar, needs_review=EXCLUDED.needs_review, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_lines (id, name_ar, description_ar, notes_ar, outbound_path_ar, return_path_ar, needs_review, sort_order) VALUES ('al-zohour', 'الزهور', 'يغطي كل مناطق الزهور حتى عمر بن عبد العزيز.', 'نقطة تجمع الخط: شارع النصر عند مطعم سرحان.', NULL, NULL, false, 2) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar, notes_ar=EXCLUDED.notes_ar, outbound_path_ar=EXCLUDED.outbound_path_ar, return_path_ar=EXCLUDED.return_path_ar, needs_review=EXCLUDED.needs_review, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_lines (id, name_ar, description_ar, notes_ar, outbound_path_ar, return_path_ar, needs_review, sort_order) VALUES ('al-5000', 'الـ 5000', 'من المعدية عبر التربية النوعية والأفرنج وحي العرب وحي المناخ والتعاونيات حتى منطقة الـ 5000.', NULL, 'منطقة الـ 5000 ← شارع النصر ← شارع عبد الهادي الحديدي ← شارع الثلاثيني بطوله ← ميدان المنشية', 'ميدان المنشية ← شارع رمسيس ← أوجينا ← شارع ممفيس ← شارع 23 يوليو بطوله ← شارع عبد الهادي الحديدي ← منطقة الـ 5000', false, 3) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar, notes_ar=EXCLUDED.notes_ar, outbound_path_ar=EXCLUDED.outbound_path_ar, return_path_ar=EXCLUDED.return_path_ar, needs_review=EXCLUDED.needs_review, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_lines (id, name_ar, description_ar, notes_ar, outbound_path_ar, return_path_ar, needs_review, sort_order) VALUES ('al-talatini', 'التلاتيني', 'من منطقة الـ 5000 إلى شارع الجمهورية.', 'هذا الخط لم يرد في قائمة محمود (25 نوفمبر 2026) — محتاج تأكيد: هل يفضل في الشبكة أم يُحذف؟', NULL, NULL, true, 4) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar, notes_ar=EXCLUDED.notes_ar, outbound_path_ar=EXCLUDED.outbound_path_ar, return_path_ar=EXCLUDED.return_path_ar, needs_review=EXCLUDED.needs_review, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_lines (id, name_ar, description_ar, notes_ar, outbound_path_ar, return_path_ar, needs_review, sort_order) VALUES ('al-salam', 'السلام', 'من حي العرب من شارع أسوان حتى فاطمة الزهراء ونفيسة.', NULL, NULL, NULL, false, 5) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar, notes_ar=EXCLUDED.notes_ar, outbound_path_ar=EXCLUDED.outbound_path_ar, return_path_ar=EXCLUDED.return_path_ar, needs_review=EXCLUDED.needs_review, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_lines (id, name_ar, description_ar, notes_ar, outbound_path_ar, return_path_ar, needs_review, sort_order) VALUES ('aswan', 'أسوان', 'يُستخدم للرجوع من كلية الطب والعلاج الطبيعي إلى قصر الثقافة.', NULL, NULL, NULL, false, 6) ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar, notes_ar=EXCLUDED.notes_ar, outbound_path_ar=EXCLUDED.outbound_path_ar, return_path_ar=EXCLUDED.return_path_ar, needs_review=EXCLUDED.needs_review, sort_order=EXCLUDED.sort_order;

-- ---- Ordered stops per line ----
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'maadeya', 1, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'qasr-thaqafa', 2, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'tech-law', 3, 'انزل قدام الكلية — ولو رايح صيدلة: انزل هنا وامشي لحد الكلية') ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'bank-housing', 4, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'salam-stop', 5, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'dawahi-police', 6, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'hurreyat', 7, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'talatini-st', 8, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-amin', 'manshiya', 9, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-zohour', 'qasr-thaqafa', 1, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-zohour', 'medicine', 2, 'انزل عند عجوة جنب الكلية على طول') ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-zohour', 'pharmacy', 3, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-zohour', 'nasr-st', 4, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-zohour', 'zohour-area', 5, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-zohour', 'omar-abdelaziz', 6, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'maadeya', 1, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'specific-edu', 2, 'انزل قدام الكلية بالظبط') ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'ifranj', 3, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'arab-district', 4, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'manakh-district', 5, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'taawoneyat', 6, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-5000', 'area-5000', 7, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-talatini', 'area-5000', 1, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-talatini', 'gomhouria-st', 2, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-salam', 'arab-district', 1, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-salam', 'aswan-st', 2, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-salam', 'fatima-zahra', 3, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('al-salam', 'nafisa', 4, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('aswan', 'medicine', 1, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('aswan', 'qasr-thaqafa', 2, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;
INSERT INTO public.transit_line_stops (line_id, stop_id, seq, note_ar) VALUES ('aswan', 'aswan-st', 3, NULL) ON CONFLICT (line_id, stop_id) DO UPDATE SET seq=EXCLUDED.seq, note_ar=EXCLUDED.note_ar;

-- ---- One-way bans ----
INSERT INTO public.transit_route_bans (line_id, from_stop_id, to_stop_id, reason_ar) VALUES ('al-zohour', 'medicine', 'qasr-thaqafa', 'خط الزهور يمشي من قصر الثقافة باتجاه الطب؛ الرجوع من الطب إلى قصر الثقافة بخط أسوان.') ON CONFLICT (line_id, from_stop_id, to_stop_id) DO UPDATE SET reason_ar=EXCLUDED.reason_ar;
INSERT INTO public.transit_route_bans (line_id, from_stop_id, to_stop_id, reason_ar) VALUES ('aswan', 'qasr-thaqafa', 'medicine', 'خط أسوان يُستخدم للرجوع من الطب إلى قصر الثقافة فقط.') ON CONFLICT (line_id, from_stop_id, to_stop_id) DO UPDATE SET reason_ar=EXCLUDED.reason_ar;

-- ---- Curated trips (7 rows — صيدلة has 2 routes, both unconfirmed) ----
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('housing-to-medicine', 'maadeya', 'medicine', 'السكن الجامعي ← كلية الطب والعلاج الطبيعي (ومستشفى الجامعة)', '[{"line_id": "al-amin", "from_stop_id": "maadeya", "to_stop_id": "qasr-thaqafa"}, {"line_id": "al-zohour", "from_stop_id": "qasr-thaqafa", "to_stop_id": "medicine", "alight_text": "عجوة جنب الكلية"}]'::jsonb, true, 1) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('medicine-to-housing', 'medicine', 'maadeya', 'كلية الطب والعلاج الطبيعي ← السكن الجامعي', '[{"line_id": "aswan", "from_stop_id": "medicine", "to_stop_id": "qasr-thaqafa"}, {"line_id": "al-amin", "from_stop_id": "qasr-thaqafa", "to_stop_id": "maadeya"}]'::jsonb, true, 2) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('housing-to-tech', 'maadeya', 'tech-law', 'السكن الجامعي ← كلية التكنولوجيا والحقوق', '[{"line_id": "al-amin", "from_stop_id": "maadeya", "to_stop_id": "tech-law", "alight_text": "قدام الكلية"}]'::jsonb, true, 3) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('tech-to-housing', 'tech-law', 'maadeya', 'كلية التكنولوجيا والحقوق ← السكن الجامعي', '[{"line_id": "al-amin", "from_stop_id": "tech-law", "to_stop_id": "maadeya", "alight_text": "المعدية"}]'::jsonb, true, 4) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('housing-to-specific', 'maadeya', 'specific-edu', 'السكن الجامعي ← كلية التربية النوعية', '[{"line_id": "al-5000", "from_stop_id": "maadeya", "to_stop_id": "specific-edu", "alight_text": "قدام الكلية بالظبط"}]'::jsonb, true, 5) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('housing-to-pharmacy-a', 'maadeya', 'pharmacy', 'السكن الجامعي ← كلية الصيدلة (الطريق الأول)', '[{"line_id": "al-amin", "from_stop_id": "maadeya", "to_stop_id": "qasr-thaqafa"}, {"line_id": "al-zohour", "from_stop_id": "qasr-thaqafa", "to_stop_id": "pharmacy"}]'::jsonb, false, 6) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;
INSERT INTO public.transit_trips (id, from_stop_id, to_stop_id, title_ar, legs, is_confirmed, sort_order) VALUES ('housing-to-pharmacy-b', 'maadeya', 'pharmacy', 'السكن الجامعي ← كلية الصيدلة (الطريق الثاني — مشي)', '[{"line_id": "al-amin", "from_stop_id": "maadeya", "to_stop_id": "tech-law", "alight_text": "قدام كلية التكنولوجيا"}, {"line_id": null, "from_stop_id": "tech-law", "to_stop_id": "pharmacy", "note": "تتمشى من كلية التكنولوجيا لصيدلة"}]'::jsonb, false, 7) ON CONFLICT (id) DO UPDATE SET from_stop_id=EXCLUDED.from_stop_id, to_stop_id=EXCLUDED.to_stop_id, title_ar=EXCLUDED.title_ar, legs=EXCLUDED.legs, is_confirmed=EXCLUDED.is_confirmed, sort_order=EXCLUDED.sort_order;

-- ---- Verification ----
SELECT 'transit_stops' AS t, count(*) AS n FROM public.transit_stops
UNION ALL SELECT 'transit_lines', count(*) FROM public.transit_lines
UNION ALL SELECT 'transit_line_stops', count(*) FROM public.transit_line_stops
UNION ALL SELECT 'transit_route_bans', count(*) FROM public.transit_route_bans
UNION ALL SELECT 'transit_trips', count(*) FROM public.transit_trips;
