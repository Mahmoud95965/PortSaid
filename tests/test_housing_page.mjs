import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testHousingPage() {
  console.log('=== Testing Housing ("دور على سكنك في بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /housing بـ HTTP 200
  console.log('--- 1. Testing /housing Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/housing`);
  assert.strictEqual(res.status, 200, '/housing route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /housing route returned HTTP 200 successfully');

  // 2. التحقق من مسارات /hotels و /stay التوجيهية
  console.log('\n--- 2. Testing /hotels & /stay Route Redirects ---');
  const hotelsRes = await fetch(`${BASE_URL}/hotels`, { redirect: 'manual' });
  assert.ok(
    hotelsRes.status === 307 || hotelsRes.status === 308 || hotelsRes.status === 200,
    '/hotels route must redirect to /housing or return HTTP 200'
  );
  console.log(`✓ /hotels route status: ${hotelsRes.status}`);

  const stayRes = await fetch(`${BASE_URL}/stay`, { redirect: 'manual' });
  assert.ok(
    stayRes.status === 307 || stayRes.status === 308 || stayRes.status === 200,
    '/stay route must redirect to /housing or return HTTP 200'
  );
  console.log(`✓ /stay route status: ${stayRes.status}`);

  // 3. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 3. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('دور على سكنك في بورسعيد'),
    'Must include main title: "دور على سكنك في بورسعيد"'
  );
  assert.ok(
    html.includes('أماكن إقامة') || html.includes('أماكن إقامة وفنادق معتمدة'),
    'Must include header stats or badge'
  );
  console.log('✓ Section 1 verified: Title and header stats present');

  // 4. التحقق من وجود شريط البحث وفلاتر أنواع السكن المعتمدة
  console.log('\n--- 4. Verifying Search and Accommodation Types ---');
  assert.ok(
    html.includes('ابحث باسم الفندق') || html.includes('بورتو') || html.includes('المنطقة'),
    'Must include search input'
  );
  assert.ok(
    html.includes('جميع أماكن الإقامة') &&
    (html.includes('منتجعات') || html.includes('فنادق')) &&
    (html.includes('بيوت شباب') || html.includes('سكن اقتصادي')),
    'Must include accommodation category filters'
  );
  console.log('✓ Section 2 verified: Search input and accommodation types present');

  // 5. التحقق من فلاتر الأحياء الفعلية والترتيب
  console.log('\n--- 5. Verifying Area Filters and Sorting ---');
  assert.ok(
    html.includes('حي الشرق') &&
    html.includes('بورفؤاد') &&
    html.includes('طرح البحر'),
    'Must include real district filters'
  );
  assert.ok(
    html.includes('الترتيب:') || html.includes('الأكثر تميزاً') || html.includes('الأعلى نقاطاً'),
    'Must include sorting options'
  );
  console.log('✓ Section 3 verified: Real district filters and sorting present');

  // 6. التحقق من عرض أماكن الإقامة الحقيقية
  console.log('\n--- 6. Verifying Real Housing Places in Port Said ---');
  assert.ok(
    html.includes('Porto Said') || html.includes('Helnan') || html.includes('Marom') || html.includes('فندق بدر') || html.includes('Grand Albatros'),
    'Must include real accommodation places'
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

  // 8. التحقق من البوابات السفلية للخريطة ومخطط الرحلات
  console.log('\n--- 8. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('الخريطة التفاعلية') && html.includes('مخطط الإقامة'),
    'Must include interactive map and smart planner gateways'
  );
  console.log('✓ Section 6 verified: Bottom gateways present');

  // 9. التحقق من تكامل الصفحة الرئيسية
  console.log('\n--- 9. Verifying Home Page Integration ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL HOUSING ("دور على سكنك في بورسعيد") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testHousingPage().catch((err) => {
  console.error('❌ Housing page test failed:', err);
  process.exit(1);
});
