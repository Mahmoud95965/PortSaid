-- ==============================================================================
-- Port Said Hub - Migration 06: Users, Favorites & Saved Itineraries for Supabase / Vercel
-- ==============================================================================

-- 1. جدول خطط الرحلات المحفوظة للمستخدمين (Saved Itineraries)
CREATE TABLE IF NOT EXISTS public.saved_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    summary TEXT,
    budget_egp INT NOT NULL DEFAULT 500,
    total_cost INT NOT NULL DEFAULT 0,
    party_size INT DEFAULT 2,
    duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 4,
    transport_mode VARCHAR(20) DEFAULT 'driving',
    stops_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    route_geojson JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_itineraries_user ON public.saved_itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_itineraries_created ON public.saved_itineraries(created_at DESC);
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_itineraries' AND policyname = 'Users can view their own itineraries') THEN
        CREATE POLICY "Users can view their own itineraries" ON public.saved_itineraries FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_itineraries' AND policyname = 'Users can insert their own itineraries') THEN
        CREATE POLICY "Users can insert their own itineraries" ON public.saved_itineraries FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_itineraries' AND policyname = 'Users can delete their own itineraries') THEN
        CREATE POLICY "Users can delete their own itineraries" ON public.saved_itineraries FOR DELETE USING (auth.uid() = user_id OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'));
    END IF;
END $$;

-- 2. جدول الأماكن المفضلة للمستخدمين (User Favorites)
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_place ON public.user_favorites(place_id);
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favorites' AND policyname = 'Users can view their own favorites') THEN
        CREATE POLICY "Users can view their own favorites" ON public.user_favorites FOR SELECT USING (auth.uid() = user_id OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favorites' AND policyname = 'Users can manage their own favorites') THEN
        CREATE POLICY "Users can manage their own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id OR user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'));
    END IF;
END $$;

-- 3. إدراج وتحديث حسابات المستخدمين الرسمية والمعتمدة (Users)

INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'المالك الرئيسي',
    'admin@portsaidhub.com',
    '01000000001',
    'scrypt:16384:8:1:4103052d78ab5464223911afe5154204:4729f958f01c29795a039bd86a2b54fbf6c158cf5d887304451f5c2786c59c14128d8dc7b38f97115b780a1fb4b13eabba2870f3e23e027234de33048c02b914',
    1,
    3,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    500,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    user_type_id = EXCLUDED.user_type_id,
    governorate_id = EXCLUDED.governorate_id,
    institution_id = EXCLUDED.institution_id,
    points_balance = EXCLUDED.points_balance,
    status = 'active';

INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES (
    '00000000-0000-0000-0000-000000000004',
    'أحمد السيد',
    'ahmed@student.psu.edu.eg',
    '01234567890',
    'scrypt:16384:8:1:64fba198cb5b5e2b8b4df2b3093175e3:eca6446f351e086fff129f22e817d5091055f837bb20bcb0599f7e762e5f4eaa70ed227870d842ac3a694e6d7fd11c9b556f612d4bff5f5eefb8422cc324269f',
    4,
    1,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    60,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    user_type_id = EXCLUDED.user_type_id,
    governorate_id = EXCLUDED.governorate_id,
    institution_id = EXCLUDED.institution_id,
    points_balance = EXCLUDED.points_balance,
    status = 'active';

INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'كريم محمود',
    'karim@portsaidhub.com',
    '01011223344',
    'scrypt:16384:8:1:50953e3354557d0a28ea8a1ff5220094:143329a92df5a38175c5657b3ce2762c50498a4918d4e9d4e7d51ff2032b96aeb5788b76dcf7d921847bbccf534c68581c414854c5d5cbedbfbb06260117c519',
    2,
    3,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    220,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    user_type_id = EXCLUDED.user_type_id,
    governorate_id = EXCLUDED.governorate_id,
    institution_id = EXCLUDED.institution_id,
    points_balance = EXCLUDED.points_balance,
    status = 'active';

INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES (
    'a9ed234a-7b67-4f19-b2f9-c6296d4c7c46',
    'محمود محمد موسى',
    'mahmoud.m.moussa5310@gmail.com',
    '01026795965',
    'scrypt:16384:8:1:19c90a4da65044b70ee0c34f9ed1a665:0a95fe16e5f664adce71ef41e924b0c494158bd876567e7518a0a413cfc77c0c973fd38ae650a91cef4db903b16f9adce0d669f67266d994adc11f413a36e013',
    4,
    1,
    (SELECT id FROM public.governorates WHERE name_ar = 'قنا' LIMIT 1),
    (SELECT id FROM public.institutions WHERE name_ar = 'كلية أخرى' LIMIT 1),
    20,
    'active',
    NOW(),
    '2026-10-24T17:25:49.818Z'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    user_type_id = EXCLUDED.user_type_id,
    governorate_id = EXCLUDED.governorate_id,
    institution_id = EXCLUDED.institution_id,
    points_balance = EXCLUDED.points_balance,
    status = 'active';

INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'صاحب مطعم كاستن',
    'merchant@portsaidhub.com',
    '01000000002',
    'scrypt:16384:8:1:1f78e425e47d3fd05d8284633a081d13:5aabcc9d5b26527c1a60de0c61da1daf63bd3220805ebfde49b3d2bc1daf149c395783b907819c7739ee445587f9c2b2d2f3d7c98d56414e2fea48902fc57ceb',
    3,
    3,
    (SELECT id FROM public.governorates WHERE name_ar = 'بورسعيد' LIMIT 1),
    NULL,
    100,
    'active',
    NOW(),
    '2026-10-24T17:05:32.287Z'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    user_type_id = EXCLUDED.user_type_id,
    governorate_id = EXCLUDED.governorate_id,
    institution_id = EXCLUDED.institution_id,
    points_balance = EXCLUDED.points_balance,
    status = 'active';

-- 4. إدراج رصيد النقاط الافتتاحي في سجل الحركات (Points Ledger)

INSERT INTO public.points_ledger (
    user_id, delta, balance_after, reason, ref_type, created_at
) 
SELECT '00000000-0000-0000-0000-000000000001', 500, 500, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.points_ledger WHERE user_id = '00000000-0000-0000-0000-000000000001' AND ref_type = 'initial_bonus'
);

INSERT INTO public.points_ledger (
    user_id, delta, balance_after, reason, ref_type, created_at
) 
SELECT '00000000-0000-0000-0000-000000000004', 60, 60, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.points_ledger WHERE user_id = '00000000-0000-0000-0000-000000000004' AND ref_type = 'initial_bonus'
);

INSERT INTO public.points_ledger (
    user_id, delta, balance_after, reason, ref_type, created_at
) 
SELECT '00000000-0000-0000-0000-000000000002', 220, 220, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.points_ledger WHERE user_id = '00000000-0000-0000-0000-000000000002' AND ref_type = 'initial_bonus'
);

INSERT INTO public.points_ledger (
    user_id, delta, balance_after, reason, ref_type, created_at
) 
SELECT 'a9ed234a-7b67-4f19-b2f9-c6296d4c7c46', 20, 20, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.points_ledger WHERE user_id = 'a9ed234a-7b67-4f19-b2f9-c6296d4c7c46' AND ref_type = 'initial_bonus'
);

INSERT INTO public.points_ledger (
    user_id, delta, balance_after, reason, ref_type, created_at
) 
SELECT '00000000-0000-0000-0000-000000000003', 100, 100, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.points_ledger WHERE user_id = '00000000-0000-0000-0000-000000000003' AND ref_type = 'initial_bonus'
);
