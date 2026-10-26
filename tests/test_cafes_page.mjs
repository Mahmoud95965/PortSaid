import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testCafesPage() {
  console.log('=== Testing Cafes ("كافيهات بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /cafe بـ HTTP 200
  console.log('--- 1. Testing /cafe Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/cafe`);
  assert.strictEqual(res.status, 200, '/cafe route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /cafe route returned HTTP 200 successfully');

  // 2. التحقق من مسار /cafes التوجيهي
  console.log('\n--- 2. Testing /cafes Route Redirect ---');
  const redirectRes = await fetch(`${BASE_URL}/cafes`, { redirect: 'manual' });
  assert.ok(
    redirectRes.status === 307 || redirectRes.status === 308 || redirectRes.status === 200,
    '/cafes route must redirect to /cafe or return HTTP 200'
  );
  console.log(`✓ /cafes route status: ${redirectRes.status}`);

  // 3. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 3. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('كافيهات بورسعيد'),
    'Must include main title: "كافيهات بورسعيد"'
  );
  assert.ok(
    html.includes('كافيهات ومقاهي بورسعيد المعتمدة'),
    'Must include header badge: "كافيهات ومقاهي بورسعيد المعتمدة"'
  );
  console.log('✓ Section 1 verified: Title and header badge present');

  // 4. التحقق من وجود شريط البحث وفلاتر الكافيهات
  console.log('\n--- 4. Verifying Search and Category Filters ---');
  assert.ok(
    html.includes('ابحث باسم الكافيه، القهوة، أو الحي'),
    'Must include cafes search bar'
  );
  assert.ok(
    html.includes('جميع الكافيهات') &&
    html.includes('إطلالة بحرية') &&
    html.includes('هدوء ومذاكرة') &&
    html.includes('عروض وخصومات'),
    'Must include mood and experience filters'
  );
  assert.ok(
    html.includes('الترتيب:') || html.includes('الأعلى خصماً'),
    'Must include sorting options'
  );
  console.log('✓ Section 2 verified: Search input and mood filters present');

  // 5. التحقق من عرض الكافيهات الحقيقية ببيانات وصور واقعية
  console.log('\n--- 5. Verifying Real Cafe Places & Photos ---');
  assert.ok(
    html.includes('كافيه المنارة') || html.includes('سيالنترو') || html.includes('جيانو') || html.includes('القبة'),
    'Must display real Port Said cafes'
  );
  assert.ok(
    html.includes('port-said-lighthouse.webp') || html.includes('hero-01.webp') || html.includes('hero-02.webp') || html.includes('balconies-street.webp'),
    'Must use authentic local imagery for cafes'
  );
  assert.ok(
    html.includes('نقطة') || html.includes('خصم'),
    'Must display real points and discounts for cafes'
  );
  console.log('✓ Section 3 verified: Real cafes, photos, and discounts present');

  // 6. التحقق من بطاقات الإجراءات (التفاصيل، الخريطة، تخطيط خروجة بالذكاء الاصطناعي، خرائط جوجل)
  console.log('\n--- 6. Verifying Card Action Integrations ---');
  assert.ok(
    html.includes('التفاصيل'),
    'Must include cafe detail action'
  );
  assert.ok(
    html.includes('الخريطة'),
    'Must include map link'
  );
  assert.ok(
    html.includes('خطط خروجة هنا'),
    'Must include AI outing planning action'
  );
  assert.ok(
    html.includes('Google Maps'),
    'Must include Google Maps link'
  );
  console.log('✓ Section 4 verified: Card actions (Detail, Map, AI Plan, Google Maps) present');

  // 7. التحقق من وجود زر التحميل التدريجي (عرض المزيد من الكافيهات)
  console.log('\n--- 7. Verifying Progressive Pagination ---');
  assert.ok(
    html.includes('عرض المزيد من الكافيهات'),
    'Must include progressive load-more button'
  );
  console.log('✓ Section 5 verified: Load more button present');

  // 8. التحقق من بوابات الخريطة التفاعلية والذكاء الاصطناعي أسفل الصفحة
  console.log('\n--- 8. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('خريطة كافيهات بورسعيد التفاعلية'),
    'Must include interactive cafes map gateway'
  );
  assert.ok(
    html.includes('مساعد بورسعيد الذكي لاختيار الكافيه'),
    'Must include AI cafe advisor gateway'
  );
  console.log('✓ Section 6 verified: Bottom interactive map and AI planner gateways present');

  // 9. التحقق من تكامل الصفحة الرئيسية
  console.log('\n--- 9. Verifying Integration with PlaceList and Home ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL CAFES ("كافيهات بورسعيد") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testCafesPage().catch((err) => {
  console.error('❌ Cafes page test failed:', err);
  process.exit(1);
});
