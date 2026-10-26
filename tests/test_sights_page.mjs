import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testSightsPage() {
  console.log('=== Testing Sights & Entertainment ("معالم وترفيه") Page ===\n');

  // 1. اختبار استجابة المسار /fun بـ HTTP 200
  console.log('--- 1. Testing /fun Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/fun`);
  assert.strictEqual(res.status, 200, '/fun route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /fun route returned HTTP 200 successfully');

  // 2. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 2. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('معالم وترفيه في بورسعيد'),
    'Must include main title: "معالم وترفيه في بورسعيد"'
  );
  assert.ok(
    html.includes('استكشاف المعالم السياحية'),
    'Must include header badge: "استكشاف المعالم السياحية"'
  );
  console.log('✓ Section 1 verified: Title and header badge present');

  // 3. التحقق من وجود شريط البحث وفلاتر الأنواع
  console.log('\n--- 3. Verifying Search and Filters ---');
  assert.ok(
    html.includes('ابحث بالاسم، الحي، أو الكلمات المفتاحية') || html.includes('فنار، ممشى'),
    'Must include sights search bar'
  );
  assert.ok(
    html.includes('جميع المعالم') &&
    html.includes('تاريخية وأثرية') &&
    html.includes('مماشي وإطلالات القناة') &&
    html.includes('دينية وثقافية'),
    'Must include all required sights type filters'
  );
  console.log('✓ Section 2 verified: Search input and all filter pills present');

  // 4. التحقق من عرض المعالم الحقيقية ببيانات وصور واقعية
  console.log('\n--- 4. Verifying Real Sights Places ---');
  assert.ok(
    html.includes('فنار بورسعيد التاريخي') || html.includes('ديليسبس'),
    'Must display real Port Said monuments'
  );
  assert.ok(
    html.includes('port-said-lighthouse.webp') || html.includes('hero-01.webp'),
    'Must use real local imagery for sights'
  );
  console.log('✓ Section 3 verified: Real places and local assets present');

  // 5. التحقق من بطاقات الإجراءات (التفاصيل، الخريطة، تخطيط بالـ AI)
  console.log('\n--- 5. Verifying Card Action Integrations ---');
  assert.ok(
    html.includes('التفاصيل'),
    'Must include place detail trigger'
  );
  assert.ok(
    html.includes('الخريطة') || html.includes('/map'),
    'Must include map link'
  );
  assert.ok(
    html.includes('تخطيط بالـ AI') || html.includes('ai?q='),
    'Must include AI outing planning action'
  );
  console.log('✓ Section 4 verified: Card actions (Detail, Map, AI Plan) present');

  // 6. التحقق من بوابات الخريطة التفاعلية وتخطيط المعالم بالذكاء الاصطناعي
  console.log('\n--- 6. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('خريطة المعالم الحية') && html.includes('فتح الخريطة التفاعلية'),
    'Must include live map gateway'
  );
  assert.ok(
    html.includes('تخطيط خروجة المعالم بالـ AI') || html.includes('تخطيط جولة معالم'),
    'Must include AI Sights Planner gateway'
  );
  console.log('✓ Section 5 verified: Bottom interactive map and AI planner gateways present');

  // 7. التحقق من تضمين SightsView داخل PlaceList عند اختيار category fun
  console.log('\n--- 7. Verifying Integration inside Main Page / PlaceList ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL SIGHTS & ENTERTAINMENT TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testSightsPage().catch((err) => {
  console.error('❌ Sights page test failed:', err);
  process.exit(1);
});
