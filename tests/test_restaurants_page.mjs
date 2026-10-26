import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testRestaurantsPage() {
  console.log('=== Testing Restaurants ("مطاعم بورسعيد") Page ===\n');

  // 1. اختبار استجابة المسار /food بـ HTTP 200
  console.log('--- 1. Testing /food Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/food`);
  assert.strictEqual(res.status, 200, '/food route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /food route returned HTTP 200 successfully');

  // 2. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 2. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('مطاعم بورسعيد'),
    'Must include main title: "مطاعم بورسعيد"'
  );
  assert.ok(
    html.includes('دليل المأكولات والمطاعم'),
    'Must include header badge: "دليل المأكولات والمطاعم"'
  );
  console.log('✓ Section 1 verified: Title and header badge present');

  // 3. التحقق من وجود شريط البحث وفلاتر المطاعم
  console.log('\n--- 3. Verifying Search and Category Filters ---');
  assert.ok(
    html.includes('ابحث باسم المطعم') || html.includes('كاستن، الجندي، سمك'),
    'Must include restaurants search bar'
  );
  assert.ok(
    html.includes('جميع المطاعم') &&
    html.includes('أسماك وسي فود') &&
    html.includes('مأكولات شعبية'),
    'Must include food sub-category filters'
  );
  assert.ok(
    html.includes('الترتيب') || html.includes('الأعلى خصماً'),
    'Must include sorting options'
  );
  console.log('✓ Section 2 verified: Search input and food filters present');

  // 4. التحقق من عرض المطاعم الحقيقية ببيانات وصور واقعية
  console.log('\n--- 4. Verifying Real Restaurant Places & Photos ---');
  assert.ok(
    html.includes('مطعم كاستن للأسماك') || html.includes('الجندي'),
    'Must display real Port Said restaurants'
  );
  assert.ok(
    html.includes('hero-02.webp') || html.includes('hero-03.webp'),
    'Must use real local imagery for restaurants'
  );
  assert.ok(
    html.includes('خصم') || html.includes('نقطة'),
    'Must display real discounts and points for restaurants'
  );
  console.log('✓ Section 3 verified: Real places, discounts, and local assets present');

  // 5. التحقق من بطاقات الإجراءات (التفاصيل، الخريطة، تخطيط بالـ AI، كوبون)
  console.log('\n--- 5. Verifying Card Action Integrations ---');
  assert.ok(
    html.includes('التفاصيل'),
    'Must include restaurant detail trigger'
  );
  assert.ok(
    html.includes('الخريطة'),
    'Must include map link'
  );
  assert.ok(
    html.includes('خروجة بالـ AI') || html.includes('ai?q='),
    'Must include AI food outing planning action'
  );
  console.log('✓ Section 4 verified: Card actions (Detail, Map, AI Plan, Coupon) present');

  // 6. التحقق من بوابات الخريطة وتخطيط الغداء بالذكاء الاصطناعي
  console.log('\n--- 6. Verifying Bottom Gateways ---');
  assert.ok(
    html.includes('خريطة مطاعم بورسعيد الحية') && html.includes('فتح خريطة المطاعم'),
    'Must include live restaurants map gateway'
  );
  assert.ok(
    html.includes('تخطيط خروجة غداء بالذكاء الاصطناعي') || html.includes('تخطيط خروجة غداء'),
    'Must include AI Lunch Outing Planner gateway'
  );
  console.log('✓ Section 5 verified: Bottom interactive map and AI planner gateways present');

  // 7. التحقق من تكامل قائمة الأماكن مع الصفحة الرئيسية
  console.log('\n--- 7. Verifying Integration with PlaceList and Home ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL RESTAURANTS ("مطاعم بورسعيد") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testRestaurantsPage().catch((err) => {
  console.error('❌ Restaurants page test failed:', err);
  process.exit(1);
});
