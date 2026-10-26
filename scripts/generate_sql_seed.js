const fs = require('fs');

const places = JSON.parse(fs.readFileSync('scripts/enriched_places.json', 'utf8'));

// Categories in supabase_schema.sql:
// 1: explore
// 2: fun
// 3: food
// 4: cafe
// 5: sweets
// 6: shop
// 7: sport
// 8: housing
// 9: bus

const CAT_ID_MAP = {
  explore: 1,
  fun: 2,
  food: 3,
  cafe: 4,
  sweets: 5,
  shop: 6,
  sport: 7,
  housing: 8,
  bus: 9
};

function escapeSql(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

let sql = `-- Migration: 05_official_places_seed.sql
-- Description: Adds maps_url column, deletes all old mock/trial data, and seeds the 252 verified official Port Said places.

-- 1. Ensure maps_url column exists
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- 2. Remove all old mock/trial places
DELETE FROM public.place_routes WHERE place_id::text LIKE '11111111%';
DELETE FROM public.coupons WHERE place_id::text LIKE '11111111%';
DELETE FROM public.visits WHERE place_id::text LIKE '11111111%';
DELETE FROM public.places WHERE id::text LIKE '11111111%' OR is_demo = TRUE;

-- 3. Seed 252 Official Verified Places
INSERT INTO public.places (
    id, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, maps_url, status, is_demo
) VALUES
`;

const valuesArr = places.map((p, idx) => {
  const catId = CAT_ID_MAP[p.cat] || 3;
  const nameSql = escapeSql(p.n);
  const areaSql = escapeSql(p.a);
  const descSql = escapeSql(p.ds);
  const mapsSql = escapeSql(p.maps_url);
  const comm = p.disc > 0 ? (p.disc * 0.5).toFixed(2) : '0.00';

  return `('${p.id}', ${catId}, ${nameSql}, ${areaSql}, ${descSql}, ${p.lat}, ${p.lon}, ${p.p}, ${p.disc}, ${p.cost}, ${comm}, ${mapsSql}, 'active', FALSE)`;
});

sql += valuesArr.join(',\n') + '\nON CONFLICT (id) DO UPDATE SET\n';
sql += `    name_ar = EXCLUDED.name_ar,
    area_ar = EXCLUDED.area_ar,
    description_ar = EXCLUDED.description_ar,
    category_id = EXCLUDED.category_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    visit_points = EXCLUDED.visit_points,
    discount_percent = EXCLUDED.discount_percent,
    coupon_cost_points = EXCLUDED.coupon_cost_points,
    maps_url = EXCLUDED.maps_url,
    status = 'active';\n`;

fs.writeFileSync('migrations/05_official_places_seed.sql', sql, 'utf8');
console.log('Successfully generated migrations/05_official_places_seed.sql for 252 places!');
