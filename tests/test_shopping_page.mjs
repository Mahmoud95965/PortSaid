import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testShoppingPage() {
  console.log('=== Testing Shopping ("تسوّق في بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /shop بـ HTTP 200
  console.log('--- 1. Testing /shop Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/shop`);
  assert.strictEqual(res.status, 200, '/shop route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /shop route returned HTTP 200 successfully');

  // 2. التحقق من مسار /shopping التوجيهي
  console.log('\n--- 2. Testing /shopping Route Redirect ---');
  const redirectRes = await fetch(`${BASE_URL}/shopping`, { redirect: 'manual' });
  assert.ok(
    redirectRes.status === 307 || redirectRes.status === 308 || redirectRes.status === 200,
    '/shopping route must redirect to /shop or return HTTP 200'
  );
  console.log(`✓ /shopping route status: ${redirectRes.status}`);

  // 3. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 3. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('تسوّق في بورسعيد'),
    'Must include main title: "تسوّق في بورسعيد"'
  );
  assert.ok(
    html.includes('دليل المراكز والأسواق التجارية'),
    'Must include header badge: "دليل المراكز والأسواق التجارية"'
  );
  console.log('✓ Section 1 verified: Title and header badge present');

  // 4. التحقق من وجود شريط البحث والتصنيفات المعتمدة
  console.log('\n--- 4. Verifying Search and Real Shopping Categories ---');
  assert.ok(
    html.includes('ابحث باسم المحل، السوق، المركز التجاري، أو الحي'),
    'Must include shopping search bar'
  );
  assert.ok(
    html.includes('المراكز التجارية والمولات') &&
    html.includes('الأسواق التراثية والبازارات') &&
    html.includes('الملابس والأزياء والاستوكات') &&
    html.includes('الإلكترونيات والكمبيوتر') &&
    html.includes('السوبرماركت والهايبرماركت'),
    'Must include supported real shopping categories'
  );
  assert.ok(
    html.includes('الترتيب:') || html.includes('الأعلى خصماً'),
    'Must include sorting options'
  );
  console.log('✓ Section 2 verified: Search input and categories present');

  // 5. التحقق من عرض أماكن التسوق الحقيقية ببيانات وصور واقعية
  console.log('\n--- 5. Verifying Real Shopping Places & Photos ---');
  assert.ok(
    html.includes('جراند بورسعيد') || html.includes('سوق الحميدي') || html.includes('محلات الاستوك') || html.includes('أراكان'),
    'Must display real Port Said shopping destinations'
  );
  assert.ok(
    html.includes('balconies-street.webp') || html.includes('martyrs-square.webp') || html.includes('hero-01.webp'),
    'Must use authentic local imagery for shopping'
  );
  assert.ok(
    html.includes('نقطة') || html.includes('مركز تجاري') || html.includes('سوق'),
    'Must display activity badges and visit points'
  );
  console.log('✓ Section 3 verified: Real shops, photos, and badges present');

  // 6. التحقق من بطاقات الإجراءات (التفاصيل، الخريطة، تخطيط جولة تسوق بالـ AI، خرائط جوجل)
  console.log('\n--- 6. Verifying Card Action Integrations ---');
  assert.ok(
    html.includes('التفاصيل'),
    'Must include shop detail action'
  );
  assert.ok(
    html.includes('الخريطة'),
    'Must include map link'
  );
  assert.ok(
    html.includes('جولة تسوق بالـ AI'),
    'Must include AI shopping tour planning action'
  );
  assert.ok(
    html.includes('Google Maps'),
    'Must include Google Maps link'
  );
  console.log('✓ Section 4 verified: Card actions (Detail, Map, AI Plan, Google Maps) present');

  // 7. التحقق من وجود زر التحميل التدريجي (عرض المزيد من المتاجر)
  console.log('\n--- 7. Verifying Progressive Pagination ---');
  assert.ok(
    html.includes('عرض المزيد من المتاجر والأسواق'),
    'Must include progressive load-more button'
  );
  console.log('✓ Section 5 verified: Load more button present');

  // 8. التحقق من بوابات الخريطة التفاعلية والذكاء الاصطناعي أسفل الصفحة
  console.log('\n--- 8. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('خريطة أسواق ومتاجر بورسعيد التفاعلية'),
    'Must include interactive shopping map gateway'
  );
  assert.ok(
    html.includes('مساعد بورسعيد الذكي لجولات التسوق'),
    'Must include AI shopping tour advisor gateway'
  );
  console.log('✓ Section 6 verified: Bottom interactive map and AI planner gateways present');

  // 9. التحقق من تكامل الصفحة الرئيسية
  console.log('\n--- 9. Verifying Integration with PlaceList and Home ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL SHOPPING ("تسوّق في بورسعيد") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testShoppingPage().catch((err) => {
  console.error('❌ Shopping page test failed:', err);
  process.exit(1);
});
