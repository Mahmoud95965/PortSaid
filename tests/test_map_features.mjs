import fs from 'fs';
import path from 'path';

const boundaryData = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/lib/data/portSaidBoundary.json'), 'utf8')
);

const PORT_SAID_BOUNDS = {
  minLng: 32.0335783,
  maxLng: 32.6541734,
  minLat: 30.868452,
  maxLat: 31.507415,
};

const polygonCoords = boundaryData.geometry.coordinates[0];

function isPointInPortSaid(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return false;
  if (
    lat < PORT_SAID_BOUNDS.minLat ||
    lat > PORT_SAID_BOUNDS.maxLat ||
    lon < PORT_SAID_BOUNDS.minLng ||
    lon > PORT_SAID_BOUNDS.maxLng
  ) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0];
    const yi = polygonCoords[i][1];
    const xj = polygonCoords[j][0];
    const yj = polygonCoords[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function testMap() {
  console.log('--- 1. Testing Port Said Administrative Boundaries & Polygon ---');
  console.log('Admin Bounds:', PORT_SAID_BOUNDS);

  // In-bounds tests (Port Said City, Port Fouad, Al Zohour, Al Arab, Al Sharq)
  const lighthouse = { lat: 31.265288, lon: 32.302302 }; // فنار بورسعيد
  const deLesseps = { lat: 31.2585, lon: 32.3087 }; // ممشى ديليسبس
  const zohour = { lat: 31.248, lon: 32.278 }; // حي الزهور
  const arab = { lat: 31.2568, lon: 32.2954 }; // حي العرب

  if (!isPointInPortSaid(lighthouse.lat, lighthouse.lon)) throw new Error('Lighthouse should be in bounds');
  if (!isPointInPortSaid(deLesseps.lat, deLesseps.lon)) throw new Error('De Lesseps should be in bounds');
  if (!isPointInPortSaid(zohour.lat, zohour.lon)) throw new Error('Zohour should be in bounds');
  if (!isPointInPortSaid(arab.lat, arab.lon)) throw new Error('Al Arab should be in bounds');
  console.log('✓ All Port Said & Port Fouad locations verified IN-BOUNDS');

  // Out-of-bounds tests
  const cairo = { lat: 30.0444, lon: 31.2357 };
  const alex = { lat: 31.2001, lon: 29.9187 };
  const ismailia = { lat: 30.5965, lon: 32.2715 };
  const mansoura = { lat: 31.0409, lon: 31.3785 };

  if (isPointInPortSaid(cairo.lat, cairo.lon)) throw new Error('Cairo must be OUT of bounds');
  if (isPointInPortSaid(alex.lat, alex.lon)) throw new Error('Alexandria must be OUT of bounds');
  if (isPointInPortSaid(ismailia.lat, ismailia.lon)) throw new Error('Ismailia must be OUT of bounds');
  if (isPointInPortSaid(mansoura.lat, mansoura.lon)) throw new Error('Mansoura must be OUT of bounds');
  console.log('✓ Cairo, Alexandria, Ismailia, Mansoura verified OUT-OF-BOUNDS');

  console.log('\n--- 2. Testing OpenFreeMap Positron Style Reachability ---');
  const styleRes = await fetch('https://tiles.openfreemap.org/styles/positron');
  console.log('OpenFreeMap Style Status:', styleRes.status);
  if (styleRes.status !== 200) throw new Error('OpenFreeMap style unreachable');
  const styleData = await styleRes.json();
  if (styleData.version !== 8) throw new Error('Invalid OpenFreeMap style specification');
  console.log('✓ OpenFreeMap Positron style verified version 8');

  console.log('\n--- 3. Testing Map Page Route (/map) on Live Server ---');
  const res = await fetch('http://localhost:3000/map');
  console.log('HTTP Status:', res.status);
  if (res.status !== 200) throw new Error(`Map page returned status ${res.status}`);
  const html = await res.text();
  if (!html.includes('Port Said Hub') || !html.includes('OpenFreeMap')) {
    throw new Error('Map page HTML does not contain expected title or OpenFreeMap attribution');
  }
  console.log('✓ /map route renders with 200 OK and OpenFreeMap attribution');

  console.log('\n>>> SUCCESS: All OpenFreeMap and MapLibre verifications passed 100%! <<<');
}

testMap().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
