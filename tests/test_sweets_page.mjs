import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testSweetsPage() {
  console.log('=== Testing Sweets ("حلويات بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /sweets بـ HTTP 200
  console.log('--- 1. Testing /sweets Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/sweets`);
  assert.strictEqual(res.status, 200, '/sweets route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /sweets route returned HTTP 200 successfully');

  // 2. التحقق من مسار /sweet التوجيهي
  console.log('\n--- 2. Testing /sweet Route Redirect ---');
  const redirectRes = await fetch(`${BASE_URL}/sweet`, { redirect: 'manual' });
  assert.ok(
    redirectRes.status === 307 || redirectRes.status === 308 || redirectRes.status === 200,
    '/sweet route must redirect to /sweets or return HTTP 200'
  );
  console.log(`✓ /sweet route status: ${redirectRes.status}`);

  // 3. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 3. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('حلويات بورسعيد'),
    'Must include main title: "حلويات بورسعيد"'
  );
  assert.ok(
    html.includes('دليل الحلويات والمخبوزات المعتمد'),
    'Must include header badge: "دليل الحلويات والمخبوزات المعتمد"'
  );
  console.log('✓ Section 1 verified: Title and header badge present');

  // 4. التحقق من وجود شريط البحث والتصنيفات الأربعة
  console.log('\n--- 4. Verifying Search and 4 Main Categories ---');
  assert.ok(
    html.includes('ابحث باسم المحل: سامي سالم، لورد، كاساتا، وافل'),
    'Must include sweets search bar'
  );
  assert.ok(
    html.includes('الحلويات الشرقية والكاساتا') &&
    html.includes('الحلويات الغربية والتورت') &&
    html.includes('الآيس كريم والمثلجات') &&
    html.includes('المخبوزات والكريب والمعجنات'),
    'Must include 4 requested categories'
  );
  assert.ok(
    html.includes('الترتيب:') || html.includes('الأعلى خصماً'),
    'Must include sorting options'
  );
  console.log('✓ Section 2 verified: Search input and 4 categories present');

  // 5. التحقق من عرض محلات الحلويات الحقيقية ببيانات وصور واقعية
  console.log('\n--- 5. Verifying Real Sweets Places & Photos ---');
  assert.ok(
    html.includes('سامي سالم') || html.includes('Lord Sweets') || html.includes('سلسبيل كريم') || html.includes('أبو يوسف'),
    'Must display real Port Said sweets places'
  );
  assert.ok(
    html.includes('hero-03.webp') || html.includes('hero-02.webp') || html.includes('balconies-street.webp'),
    'Must use authentic local imagery for sweets'
  );
  assert.ok(
    html.includes('نقطة') || html.includes('خصم'),
    'Must display real points and discounts for sweets'
  );
  console.log('✓ Section 3 verified: Real sweets shops, photos, and discounts present');

  // 6. التحقق من بطاقات الإجراءات (التفاصيل، الخريطة، تخطيط تحلية بالذكاء الاصطناعي، خرائط جوجل)
  console.log('\n--- 6. Verifying Card Action Integrations ---');
  assert.ok(
    html.includes('التفاصيل'),
    'Must include sweets detail action'
  );
  assert.ok(
    html.includes('الخريطة'),
    'Must include map link'
  );
  assert.ok(
    html.includes('تحلية بالذكاء الاصطناعي'),
    'Must include AI sweets outing planning action'
  );
  assert.ok(
    html.includes('Google Maps'),
    'Must include Google Maps link'
  );
  console.log('✓ Section 4 verified: Card actions (Detail, Map, AI Plan, Google Maps) present');

  // 7. التحقق من وجود زر التحميل التدريجي (عرض المزيد من محلات الحلويات)
  console.log('\n--- 7. Verifying Progressive Pagination ---');
  assert.ok(
    html.includes('عرض المزيد من محلات الحلويات'),
    'Must include progressive load-more button'
  );
  console.log('✓ Section 5 verified: Load more button present');

  // 8. التحقق من بوابات الخريطة التفاعلية والذكاء الاصطناعي أسفل الصفحة
  console.log('\n--- 8. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('خريطة محلات حلويات بورسعيد التفاعلية'),
    'Must include interactive sweets map gateway'
  );
  assert.ok(
    html.includes('مساعد بورسعيد الذكي لاختيار التحلية'),
    'Must include AI dessert advisor gateway'
  );
  console.log('✓ Section 6 verified: Bottom interactive map and AI planner gateways present');

  // 9. التحقق من تكامل الصفحة الرئيسية
  console.log('\n--- 9. Verifying Integration with PlaceList and Home ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL SWEETS ("حلويات بورسعيد") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testSweetsPage().catch((err) => {
  console.error('❌ Sweets page test failed:', err);
  process.exit(1);
});
