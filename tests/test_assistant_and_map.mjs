import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testAssistantRoute() {
  console.log('Testing /api/assistant route...');

  // Test 1: General question
  const res1 = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'إيه أحسن مطعم سمك وسي فود في بورسعيد؟' }),
  });

  assert.strictEqual(res1.status, 200, 'Status should be 200');
  const data1 = await res1.json();
  assert.strictEqual(data1.ok, true, 'Response should be ok');
  assert.ok(data1.reply, 'Reply must exist');
  assert.ok(Array.isArray(data1.suggestedPlaces), 'suggestedPlaces must be an array');
  assert.ok(data1.suggestedPlaces.length > 0, 'Should suggest places for fish food query');
  console.log('✓ Test 1 passed: Fish query returned places:', data1.suggestedPlaces.map(p => p.n));

  // Test 2: Location sharing inside Port Said
  const res2 = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'إيه أقرب مكان مسجل ليا؟',
      userLocation: { lat: 31.262, lng: 32.302 }, // In Hayy El-Sharq
    }),
  });

  assert.strictEqual(res2.status, 200, 'Status should be 200');
  const data2 = await res2.json();
  assert.strictEqual(data2.ok, true, 'Response should be ok');
  assert.ok(data2.userDistrict, 'userDistrict should be identified');
  console.log('✓ Test 2 passed: District identified as:', data2.userDistrict);
  console.log('  Reply excerpt:', data2.reply.substring(0, 80));
  assert.ok(data2.suggestedPlaces.length > 0, 'Should return nearest places');
  assert.ok(typeof data2.suggestedPlaces[0].distanceKm === 'number', 'distanceKm should be calculated');
  console.log('  Top nearest place:', data2.suggestedPlaces[0].n, 'distance:', data2.suggestedPlaces[0].distanceKm, 'km');

  // Test 3: Static web worker file
  const workerRes = await fetch(`${BASE_URL}/maplibre-gl-worker.mjs`);
  assert.strictEqual(workerRes.status, 200, 'MapLibre worker should return 200');
  const contentType = workerRes.headers.get('content-type') || '';
  assert.ok(
    contentType.includes('javascript'),
    `Worker content-type must be javascript, got: ${contentType}`
  );
  console.log('✓ Test 3 passed: MapLibre web worker served correctly with Content-Type:', contentType);

  // Test 4: Map page HTML loads
  const mapPageRes = await fetch(`${BASE_URL}/map`);
  assert.strictEqual(mapPageRes.status, 200, 'Map page should return 200');
  const mapHtml = await mapPageRes.text();
  assert.ok(mapHtml.includes('خريطة بورسعيد'), 'Map page should include title');
  console.log('✓ Test 4 passed: /map page renders HTML successfully');

  console.log('\nALL ASSISTANT & MAP INTEGRATION TESTS PASSED 100%! 🎉');
}

testAssistantRoute().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
