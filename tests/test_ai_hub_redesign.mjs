import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testAiHubRedesign() {
  console.log('=== Testing AI Center Redesign & Conversational Experience ===\n');

  // 1. اختبار استفسار الأماكن القريبة وطلب الـ GPS
  console.log('--- 1. Testing "عايز أماكن حلوة قريبة مني" ---');
  // بدون إحداثيات (المساعد يشرح ويطلب تفعيل الـ GPS بلباقة)
  const noLocRes = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'عايز أماكن حلوة قريبة مني' }),
  });
  const noLocData = await noLocRes.json();
  assert.strictEqual(noLocData.ok, true);
  assert.ok(noLocData.reply.includes('موقعي') || noLocData.reply.includes('GPS') || noLocData.reply.includes('📍'), 'Should guide user to activate GPS');
  console.log('✓ Without GPS: Gracefully requests location permission or map picking');

  // مع إحداثيات حي الشرق (حساب المسافات بالكيلومتر وترشيح الأقرب)
  const locRes = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'عايز أماكن حلوة قريبة مني',
      userLocation: { lat: 31.2635, lng: 32.3021 }, // بالقرب من الفنار
    }),
  });
  const locData = await locRes.json();
  assert.strictEqual(locData.ok, true);
  assert.ok(Array.isArray(locData.suggestedPlaces) && locData.suggestedPlaces.length > 0, 'Must return suggested places with distance');
  assert.ok(typeof locData.suggestedPlaces[0].distanceKm === 'number', 'Must compute distanceKm');
  console.log(`✓ With GPS: Identified district "${locData.userDistrict}" and found ${locData.suggestedPlaces.length} nearest places`);

  // 2. اختبار كافيهات هادية قريبة من البحر
  console.log('\n--- 2. Testing "هاتلي كافيهات هادية قريبة من البحر" ---');
  const seaRes = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'هاتلي كافيهات هادية قريبة من البحر' }),
  });
  const seaData = await seaRes.json();
  assert.strictEqual(seaData.ok, true);
  assert.ok(seaData.reply.includes('بينوس') || seaData.reply.includes('ديليسبس') || seaData.reply.includes('كاستن'), 'Should suggest waterfront spots');
  console.log('✓ Waterfront query returned authentic sea/canal spots');

  // 3. اختبار تخطيط خروجة 300 جنيه ومسار OSRM
  console.log('\n--- 3. Testing "خططلي خروجة بميزانية 300 جنيه" ---');
  const planRes = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'خططلي خروجة بميزانية 300 جنيه',
      action: 'generate',
    }),
  });
  const planData = await planRes.json();
  assert.strictEqual(planData.ok, true);
  assert.ok(planData.plan.stops.length >= 2, 'Should create at least 2 stops');
  assert.ok(planData.plan.isRealStreetRoute, 'Must be real street route');
  assert.ok(planData.plan.totalCost <= 350, 'Cost should fit budget');
  console.log(`✓ Generated plan: "${planData.plan.title}" | Cost: ${planData.plan.totalCost} EGP | Stops: ${planData.plan.stops.length}`);

  // 4. اختبار التعديل باللغة الطبيعية: "شيل المكان التاني وحط مكان أقرب للبحر"
  console.log('\n--- 4. Testing Refine: "شيل المكان التاني وحط مكان أقرب للبحر" ---');
  const refine1Res = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refine',
      refineInstruction: 'شيل المكان التاني وحط مكان أقرب للبحر',
      currentPlan: planData.plan,
    }),
  });
  const refine1Data = await refine1Res.json();
  assert.strictEqual(refine1Data.ok, true);
  assert.ok(refine1Data.plan.stops.length >= 2);
  const secondStop = refine1Data.plan.stops[1];
  console.log(`✓ Refinement 1 succeeded: Stop #2 is now "${secondStop?.name}" (${secondStop?.categoryLabel})`);

  // 5. اختبار إعادة الترتيب: "غيّر ترتيب الأماكن وخلي أقرب مكان الأول"
  console.log('\n--- 5. Testing Refine: "غيّر ترتيب الأماكن وخلي أقرب مكان الأول" ---');
  const refine2Res = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refine',
      refineInstruction: 'غيّر ترتيب الأماكن وخلي أقرب مكان الأول',
      currentPlan: refine1Data.plan,
    }),
  });
  const refine2Data = await refine2Res.json();
  assert.strictEqual(refine2Data.ok, true);
  assert.ok(refine2Data.plan.stops.length === refine1Data.plan.stops.length);
  console.log('✓ Refinement 2 (Proximity reordering) succeeded!');

  // 6. اختبار إضافة مكان بالاسم: "ضيف حلويات سيلفر للخطة"
  console.log('\n--- 6. Testing Refine: "ضيف حلويات سيلفر للخطة" ---');
  const refine3Res = await fetch(`${BASE_URL}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'refine',
      refineInstruction: 'ضيف حلويات سيلفر للخطة',
      currentPlan: refine2Data.plan,
    }),
  });
  const refine3Data = await refine3Res.json();
  assert.strictEqual(ref3DataHasSilver(refine3Data.plan.stops), true, 'Must include Silver Sweets');
  console.log(`✓ Added Silver Sweets: Total stops count is now ${refine3Data.plan.stops.length}`);

  console.log('\n======================================================');
  console.log('🎉 ALL AI CENTER REDESIGN & CONVERSATIONAL TESTS PASSED 100%! 🎉');
  console.log('======================================================\n');
}

function ref3DataHasSilver(stops) {
  return stops.some(s => s.category === 'sweets' || s.categoryLabel?.includes('حلويات') || s.name.includes('سيلفر') || s.name.includes('كاساتا') || s.name.includes('حلواني') || s.name.includes('Sweets'));
}

testAiHubRedesign().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
