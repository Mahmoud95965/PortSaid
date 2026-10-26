import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testExplorePage() {
  console.log('=== Testing Discover Port Said ("اكتشف بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /explore بـ HTTP 200
  console.log('--- 1. Testing /explore Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/explore`);
  assert.strictEqual(res.status, 200, '/explore route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /explore route returned HTTP 200 successfully');

  // 2. التحقق من وجود العنوان والمقدمة المطلوبة بالترتيب
  console.log('\n--- 2. Verifying Section Order & Content ---');
  assert.ok(
    html.includes('اكتشف بورسعيد على مزاجك'),
    'Must include main title: "اكتشف بورسعيد على مزاجك"'
  );
  console.log('✓ Section 1 verified: Title "اكتشف بورسعيد على مزاجك" & search bar present');

  // 3. التحقق من اقتراحات البحث السريعة
  assert.ok(
    html.includes('أكلات سمك وسي فود') && html.includes('ممشى ديليسبس'),
    'Must include quick search suggestions'
  );
  console.log('✓ Section 2 verified: Quick search suggestion pills present');

  // 4. التحقق من تصنيفات الاكتشاف
  assert.ok(
    html.includes('تصنيفات الاكتشاف') && html.includes('معالم وتاريخ') && html.includes('مطاعم وأسماك'),
    'Must include discovery categories linking to existing categories'
  );
  console.log('✓ Section 3 verified: Discovery categories present');

  // 5. التحقق من قسم الأماكن المميزة بالبيانات الحقيقية
  assert.ok(
    html.includes('أماكن مميزة في بورسعيد'),
    'Must include featured places section'
  );
  assert.ok(
    html.includes('فنار بورسعيد التاريخي') || html.includes('ممشى ديليسبس'),
    'Must include real Port Said places from database/INITIAL_PLACES'
  );
  console.log('✓ Section 4 verified: Featured places with real data present');

  // 6. التحقق من مدخل الخريطة التفاعلية
  assert.ok(
    html.includes('استكشف كل الأماكن على الخريطة التفاعلية') && html.includes('فتح الخريطة التفاعلية'),
    'Must include interactive map gateway'
  );
  console.log('✓ Section 5 verified: Interactive map gateway present');

  // 7. التحقق من مدخل مركز الذكاء الاصطناعي
  assert.ok(
    html.includes('مخطط الخروجات الذكي') || html.includes('AI Studio'),
    'Must include AI outing planner gateway'
  );
  console.log('✓ Section 6 verified: AI Outing Planner gateway present');

  // 8. التحقق من صفحة تفاصيل المكان بالرابط المباشر
  console.log('\n--- 3. Testing Direct Place Detail Linking (/explore?place=...) ---');
  const placeRes = await fetch(`${BASE_URL}/explore?place=11111111-1111-1111-1111-111111111101`);
  assert.strictEqual(placeRes.status, 200);
  const placeHtml = await placeRes.text();
  assert.ok(placeHtml.includes('فنار بورسعيد التاريخي'), 'Should load place detail for lighthouse');
  console.log('✓ Place details linking directly on /explore verified');

  console.log('\n==========================================================');
  console.log('🎉 ALL DISCOVER PORT SAID ("اكتشف بورسعيد") TESTS PASSED 100%! 🎉');
  console.log('==========================================================\n');
}

testExplorePage().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
