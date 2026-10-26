const fs = require('fs');

let schema = fs.readFileSync('supabase_schema.sql', 'utf8');

// 1. Add saved_itineraries and user_favorites tables if not present
if (!schema.includes('public.saved_itineraries')) {
  const tableMarker = '-- 17. تفعيل الفهارس لتسريع الاستعلامات';
  const newTables = `
-- 17. خطط الرحلات المحفوظة للمستخدمين (Saved Itineraries)
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

-- 18. الأماكن المفضلة للمستخدمين (User Favorites)
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id)
);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_place ON public.user_favorites(place_id);

`;
  schema = schema.replace(tableMarker, newTables + tableMarker);
}

// 2. Replace user seed section
const userSeedStart = '-- 8. حساب المالك الافتراضي (Admin / Owner)';
const userSeedEnd = '-- 9. أماكن ومعالم رسمية معتمدة في بورسعيد (252 مكاناً)';

const startIdx = schema.indexOf(userSeedStart);
const endIdx = schema.indexOf(userSeedEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const seed06 = fs.readFileSync('migrations/06_users_and_user_data_seed.sql', 'utf8');
  const usersSqlIdx = seed06.indexOf('-- 3. إدراج وتحديث حسابات المستخدمين');
  const usersSql = seed06.slice(usersSqlIdx);

  const replacement = `-- 8. حسابات المستخدمين المعتمدة وسجلات النقاط (5 حسابات رسمية)\n${usersSql}\n`;
  schema = schema.slice(0, startIdx) + replacement + schema.slice(endIdx);
  fs.writeFileSync('supabase_schema.sql', schema, 'utf8');
  console.log('Successfully updated supabase_schema.sql with users and user-related tables!');
} else {
  console.error('Could not find user seed markers in supabase_schema.sql');
}
