const fs = require('fs');

let schema = fs.readFileSync('supabase_schema.sql', 'utf8');

// 1. Add maps_url to places table definition
if (!schema.includes('maps_url TEXT,')) {
  schema = schema.replace(
    'is_demo BOOLEAN NOT NULL DEFAULT FALSE,',
    'maps_url TEXT,\n    is_demo BOOLEAN NOT NULL DEFAULT FALSE,'
  );
}

// 2. Replace lines 534 to 548 (the old 10 places)
const placesSeedMarker = '-- 9. أماكن ومعالم أولية في بورسعيد (Landmarks & Places)';
const nextSectionMarker = '-- محتويات أولية في استكشف بورسعيد';

const startIdx = schema.indexOf(placesSeedMarker);
const endIdx = schema.indexOf(nextSectionMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const seedSql = fs.readFileSync('migrations/05_official_places_seed.sql', 'utf8');
  // Extract just the INSERT INTO public.places ... ON CONFLICT part
  const insertIdx = seedSql.indexOf('INSERT INTO public.places');
  const insertSql = seedSql.slice(insertIdx);

  const replacement = `-- 9. أماكن ومعالم رسمية معتمدة في بورسعيد (252 مكاناً)\n${insertSql}\n`;
  schema = schema.slice(0, startIdx) + replacement + schema.slice(endIdx);
  fs.writeFileSync('supabase_schema.sql', schema, 'utf8');
  console.log('Successfully updated supabase_schema.sql with 252 official places and maps_url!');
} else {
  console.error('Could not find markers in supabase_schema.sql');
}
