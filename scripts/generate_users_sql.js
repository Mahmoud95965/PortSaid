const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.join(process.cwd(), 'data', 'portsaid.db');
const db = new DatabaseSync(dbPath);

// Fetch key users from local SQLite
const users = db.prepare(`
  SELECT id, name, email, phone, role_id, user_type_id, governorate, institution, points_balance, password_hash, created_at
  FROM users
  WHERE email IN (
    'admin@portsaidhub.com',
    'karim@portsaidhub.com',
    'merchant@portsaidhub.com',
    'ahmed@student.psu.edu.eg',
    'mahmoud.m.moussa5310@gmail.com'
  )
`).all();

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
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
`;

users.forEach(u => {
  const idSql = escapeSql(u.id);
  const nameSql = escapeSql(u.name);
  const emailSql = escapeSql(u.email);
  const phoneSql = escapeSql(u.phone);
  const passSql = escapeSql(u.password_hash);
  const roleId = u.role_id || 4;
  const userTypeId = u.user_type_id || 1;
  const govSql = u.governorate ? `(SELECT id FROM public.governorates WHERE name_ar = ${escapeSql(u.governorate)} LIMIT 1)` : 'NULL';
  const instSql = u.institution ? `(SELECT id FROM public.institutions WHERE name_ar = ${escapeSql(u.institution)} LIMIT 1)` : 'NULL';
  const points = u.points_balance || 20;

  sql += `
INSERT INTO public.users (
    id, name, email, phone, password_hash, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at
) VALUES (
    ${idSql},
    ${nameSql},
    ${emailSql},
    ${phoneSql},
    ${passSql},
    ${roleId},
    ${userTypeId},
    ${govSql},
    ${instSql},
    ${points},
    'active',
    NOW(),
    ${escapeSql(u.created_at || new Date().toISOString())}
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
`;
});

sql += `
-- 4. إدراج رصيد النقاط الافتتاحي في سجل الحركات (Points Ledger)
`;

users.forEach(u => {
  const idSql = escapeSql(u.id);
  const points = u.points_balance || 20;
  sql += `
INSERT INTO public.points_ledger (
    user_id, delta, balance_after, reason, ref_type, created_at
) 
SELECT ${idSql}, ${points}, ${points}, 'هدية الانضمام وتأكيد الحساب', 'initial_bonus', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.points_ledger WHERE user_id = ${idSql} AND ref_type = 'initial_bonus'
);
`;
});

fs.writeFileSync('migrations/06_users_and_user_data_seed.sql', sql, 'utf8');
console.log('Successfully generated migrations/06_users_and_user_data_seed.sql for', users.length, 'official users!');
