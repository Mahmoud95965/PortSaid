import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testSportsPage() {
  console.log('=== Testing Sports ("خليك نشيط في بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /sport بـ HTTP 200
  console.log('--- 1. Testing /sport Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/sport`);
  assert.strictEqual(res.status, 200, '/sport route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /sport route returned HTTP 200 successfully');

  // 2. التحقق من مسار /sports التوجيهي
  console.log('\n--- 2. Testing /sports Route Redirect ---');
  const sportsRes = await fetch(`${BASE_URL}/sports`, { redirect: 'manual' });
  assert.ok(
    sportsRes.status === 307 || sportsRes.status === 308 || sportsRes.status === 200,
    '/sports route must redirect to /sport or return HTTP 200'
  );
  console.log(`✓ /sports route status: ${sportsRes.status}`);

  // 3. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 3. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('خليك نشيط في بورسعيد'),
    'Must include main title: "خليك نشيط في بورسعيد"'
  );
  assert.ok(
    html.includes('منشأة رياضية') || html.includes('أنشطة وأندية معتمدة'),
    'Must include header stats or badge'
  );
  console.log('✓ Section 1 verified: Title and header stats present');

  // 4. التحقق من وجود شريط البحث وتصنيفات الأنشطة الرياضية
  console.log('\n--- 4. Verifying Search and Sport Categories ---');
  assert.ok(
    html.includes('ابحث باسم الجيم') || html.includes('مارفل') || html.includes('المنطقة'),
    'Must include search input'
  );
  assert.ok(
    html.includes('جميع الأنشطة') &&
    (html.includes('الجيم واللياقة البدنية') || html.includes('جيم')) &&
    (html.includes('الملاعب') || html.includes('الأندية')),
    'Must include sport category filters'
  );
  console.log('✓ Section 2 verified: Search input and categories present');

  // 5. التحقق من فلاتر الأحياء الفعلية والترتيب
  console.log('\n--- 5. Verifying Area Filters and Sorting ---');
  assert.ok(
    html.includes('حي الشرق') &&
    html.includes('بورفؤاد') &&
    html.includes('طرح البحر'),
    'Must include real district filters'
  );
  assert.ok(
    html.includes('الترتيب:') || html.includes('الأكثر تميزاً') || html.includes('الأعلى خصماً'),
    'Must include sorting options'
  );
  console.log('✓ Section 3 verified: Real district filters and sorting present');

  // 6. التحقق من عرض الأماكن الرياضية الحقيقية ببورسعيد
  console.log('\n--- 6. Verifying Real Sports Places in Port Said ---');
  assert.ok(
    html.includes('Marvel Gym') || html.includes('Maximum Gym') || html.includes('استاد بورسعيد') || html.includes('المدينة الرياضية الأوليمبية') || html.includes('CrossFit Proactive'),
    'Must include real sports places from dataset'
  );
  console.log('✓ Section 4 verified: Authentic database places present');

  // 7. التحقق من تكامل إجراءات البطاقات (التفاصيل، الخريطة، Google Maps، المفضلة)
  console.log('\n--- 7. Verifying Card Action Integrations ---');
  assert.ok(
    html.includes('عرض التفاصيل'),
    'Must include details button'
  );
  assert.ok(
    html.includes('الخريطة') || html.includes('الموقع'),
    'Must include map action button'
  );
  console.log('✓ Section 5 verified: Details and map actions present');

  // 8. التحقق من البوابات السفلية للخريطة ومخطط التدريب الذكي
  console.log('\n--- 8. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('الخريطة التفاعلية') && html.includes('مخطط الأنشطة'),
    'Must include interactive map and smart planner gateways'
  );
  console.log('✓ Section 6 verified: Bottom gateways present');

  // 9. التحقق من تكامل الصفحة الرئيسية
  console.log('\n--- 9. Verifying Home Page Integration ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL SPORTS ("خليك نشيط في بورسعيد") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testSportsPage().catch((err) => {
  console.error('❌ Sports page test failed:', err);
  process.exit(1);
});
