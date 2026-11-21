const fs = require('fs');

const places = JSON.parse(fs.readFileSync('scripts/compiled_places.json', 'utf8'));

const headers = [
  'id',
  'name',
  'category',
  'type_ar',
  'area',
  'address',
  'rating',
  'reviews_count',
  'phone',
  'hours',
  'latitude',
  'longitude',
  'maps_url',
  'place_id',
  'status',
  'status_note',
  'notes',
  'in_garage',
  'garage_relation',
];

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const lines = [headers.join(',')];

for (const p of places) {
  const row = [
    p.id,
    p.n,
    p.cat,
    p.type_ar,
    p.a,
    p.address,
    p.rating,
    p.reviews_count,
    p.phone,
    p.hours,
    p.lat,
    p.lon,
    p.maps_url,
    p.place_id,
    p.status,
    p.status_note,
    p.notes,
    p.in_garage,
    p.garage_relation,
  ];
  lines.push(row.map(escapeCsv).join(','));
}

fs.writeFileSync('official_places.csv', lines.join('\n'), 'utf8');
console.log('Successfully updated official_places.csv with 194 real places!');
