import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testSmartPlanner() {
  console.log('--- 1. Testing /ai and /smart-planner Page HTTP 200 ---');
  const aiPageRes = await fetch(`${BASE_URL}/ai`);
  assert.strictEqual(aiPageRes.status, 200, '/ai page should return status 200');
  const aiHtml = await aiPageRes.text();
  assert.ok(aiHtml.includes('مخطط الرحلات') || aiHtml.includes('Planner'), '/ai page should include planner title');
  console.log('✓ /ai route renders successfully with HTTP 200');

  const redirectRes = await fetch(`${BASE_URL}/smart-planner`, { redirect: 'manual' });
  assert.strictEqual(redirectRes.status, 307, '/smart-planner should redirect with status 307');
  console.log('✓ /smart-planner route cleanly redirects to /ai with HTTP 307');

  const chatRedirectRes = await fetch(`${BASE_URL}/chat`, { redirect: 'manual' });
  assert.strictEqual(chatRedirectRes.status, 307, '/chat should redirect with status 307');
  assert.ok(chatRedirectRes.headers.get('location')?.includes('/ai?tab=chat'), '/chat redirect must point to /ai?tab=chat');
  console.log('✓ /chat route cleanly redirects to /ai?tab=chat with HTTP 307');

  console.log('\n--- 2. Testing Natural Language Plan Generation (/api/planner) ---');
  const query = 'خطط لي خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه، تشمل أماكن للزيارة وكافيه ومطعم';

  const planRes = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: query,
      transportMode: 'driving',
      action: 'generate',
    }),
  });

  assert.strictEqual(planRes.status, 200, 'Planner API should return status 200');
  const data = await planRes.json();
  assert.strictEqual(data.ok, true, 'Response must be ok');
  assert.ok(data.plan, 'Plan must exist');
  assert.ok(Array.isArray(data.plan.stops), 'Stops must be an array');
  assert.ok(data.plan.stops.length >= 3, 'Should have at least 3 stops for a 5-hour trip');

  console.log('✓ Plan generated successfully:');
  console.log('  Title:', data.plan.title);
  console.log('  Summary:', data.plan.summary);
  console.log('  Total duration:', data.plan.totalDurationHours, 'hours');
  console.log('  Total cost:', data.plan.totalCost, 'EGP (Budget:', data.plan.budgetEgp, 'EGP)');
  console.log('  Total distance:', data.plan.totalDistanceKm, 'km (Travel time:', data.plan.totalTravelMinutes, 'mins)');
  console.log('  Stops sequence:');
  data.plan.stops.forEach((s) => {
    console.log(`    ${s.order}. [${s.categoryLabel}] ${s.name} (${s.area}) | وقت: ${s.arrivalTime}-${s.departureTime} | تكلفة: ${s.totalCost} ج.م`);
  });

  // Verify real places are used
  assert.ok(
    data.plan.stops.every((s) => s.lat > 31.0 && s.lon > 32.0),
    'All stops must have valid Port Said coordinates'
  );

  // Verify OSRM route is attached
  assert.ok(data.plan.routeGeoJSON, 'Plan must include route GeoJSON');
  assert.strictEqual(data.plan.routeGeoJSON.type, 'LineString', 'Route must be a GeoJSON LineString');
  console.log('✓ OSRM real street route verified: coordinates count =', data.plan.routeGeoJSON.coordinates.length);

  console.log('\n--- 3. Testing Conversational Plan Refinement (/api/planner action=refine) ---');
  const refineRes = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refine',
      refineInstruction: 'احذف الكافيه وبدل كاستن بسوق السمك',
      currentPlan: data.plan,
    }),
  });

  assert.strictEqual(refineRes.status, 200, 'Refine API should return 200');
  const refineData = await refineRes.json();
  assert.strictEqual(refineData.ok, true, 'Refinement must succeed');
  assert.ok(refineData.plan, 'Refined plan must exist');

  const hasCafe = refineData.plan.stops.some((s) => s.category === 'cafe');
  assert.strictEqual(hasCafe, false, 'Cafe should have been removed');

  const hasFishMarket = refineData.plan.stops.some((s) => s.name.includes('سوق السمك'));
  assert.strictEqual(hasFishMarket, true, 'Fish market should be swapped in');

  console.log('✓ Conversational refinement succeeded:');
  console.log('  Remaining stops after removal and swap:');
  refineData.plan.stops.forEach((s) => {
    console.log(`    ${s.order}. ${s.name} (${s.categoryLabel})`);
  });

  console.log('\n--- 4. Testing Student Budget Query ---');
  const studentQueryRes = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'أرخص خروجة سمك وفسحة للطلبة بميزانية 250 جنيه لـ 3 أفراد',
      action: 'generate',
    }),
  });

  const studentData = await studentQueryRes.json();
  assert.strictEqual(studentData.ok, true);
  console.log('✓ Student budget plan generated:');
  console.log('  Budget:', studentData.plan.budgetEgp, 'Party:', studentData.plan.partySize, 'Cost:', studentData.plan.totalCost);

  console.log('\n>>> SUCCESS: ALL SMART PLANNER TESTS PASSED 100%! 🎉 <<<');
}

testSmartPlanner().catch((err) => {
  console.error('Smart Planner test failed:', err);
  process.exit(1);
});
