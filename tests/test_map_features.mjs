const PORT_SAID_BOUNDS = {
  north: 31.33,
  south: 31.18,
  east: 32.42,
  west: 32.18,
};

function isCoordinateInPortSaid(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return (
    lat >= PORT_SAID_BOUNDS.south &&
    lat <= PORT_SAID_BOUNDS.north &&
    lng >= PORT_SAID_BOUNDS.west &&
    lng <= PORT_SAID_BOUNDS.east
  );
}

async function testMap() {
  console.log('--- 1. Testing Port Said Geographic Boundaries ---');
  console.log('Bounds:', PORT_SAID_BOUNDS);

  // In-bounds tests
  const lighthouse = { lat: 31.265288, lon: 32.302302 }; // فنار بورسعيد
  const deLesseps = { lat: 31.2585, lon: 32.3087 }; // ممشى ديليسبس
  const portFouadSalt = { lat: 31.2400, lon: 32.3200 }; // بورفؤاد جبال الملح
  const zohour = { lat: 31.248, lon: 32.278 }; // حي الزهور

  if (!isCoordinateInPortSaid(lighthouse.lat, lighthouse.lon)) throw new Error('Lighthouse should be in bounds');
  if (!isCoordinateInPortSaid(deLesseps.lat, deLesseps.lon)) throw new Error('De Lesseps should be in bounds');
  if (!isCoordinateInPortSaid(portFouadSalt.lat, portFouadSalt.lon)) throw new Error('Port Fouad should be in bounds');
  if (!isCoordinateInPortSaid(zohour.lat, zohour.lon)) throw new Error('Zohour should be in bounds');
  console.log('✓ All Port Said & Port Fouad locations verified IN-BOUNDS');

  // Out-of-bounds tests
  const cairo = { lat: 30.0444, lon: 31.2357 };
  const alex = { lat: 31.2001, lon: 29.9187 };
  const ismailia = { lat: 30.5965, lon: 32.2715 };
  const mansoura = { lat: 31.0409, lon: 31.3785 };

  if (isCoordinateInPortSaid(cairo.lat, cairo.lon)) throw new Error('Cairo must be OUT of bounds');
  if (isCoordinateInPortSaid(alex.lat, alex.lon)) throw new Error('Alexandria must be OUT of bounds');
  if (isCoordinateInPortSaid(ismailia.lat, ismailia.lon)) throw new Error('Ismailia must be OUT of bounds');
  if (isCoordinateInPortSaid(mansoura.lat, mansoura.lon)) throw new Error('Mansoura must be OUT of bounds');
  console.log('✓ Cairo, Alexandria, Ismailia, Mansoura verified OUT-OF-BOUNDS');

  console.log('\n--- 2. Testing Map Page Route (/map) on Live Server ---');
  const res = await fetch('http://localhost:3000/map');
  console.log('HTTP Status:', res.status);
  if (res.status !== 200) throw new Error(`Map page returned status ${res.status}`);
  const html = await res.text();
  if (!html.includes('Port Said Hub')) {
    throw new Error('Map page HTML does not contain expected title');
  }
  console.log('✓ /map route renders with 200 OK');

  console.log('\n>>> SUCCESS: All Map and Boundary Verifications Passed 100%! <<<');
}

testMap().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
