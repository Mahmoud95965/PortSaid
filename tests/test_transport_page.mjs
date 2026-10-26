import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testTransportPage() {
  console.log('=== Testing Transportation ("اتحرّك في بورسعيد بسهولة") Page ===\n');

  // 1. اختبار استجابة المسار /transport بـ HTTP 200
  console.log('--- 1. Testing /transport Route HTTP 200 ---');
  const res = await fetch(`${BASE_URL}/transport`);
  assert.strictEqual(res.status, 200, '/transport route must return HTTP 200');
  const html = await res.text();
  console.log('✓ /transport route returned HTTP 200 successfully');

  // 2. التحقق من مسارات /bus و /transit التوجيهية
  console.log('\n--- 2. Testing /bus & /transit Route Redirects ---');
  const busRes = await fetch(`${BASE_URL}/bus`, { redirect: 'manual' });
  assert.ok(
    busRes.status === 307 || busRes.status === 308 || busRes.status === 200,
    '/bus route must redirect to /transport or return HTTP 200'
  );
  console.log(`✓ /bus route status: ${busRes.status}`);

  const transitRes = await fetch(`${BASE_URL}/transit`, { redirect: 'manual' });
  assert.ok(
    transitRes.status === 307 || transitRes.status === 308 || transitRes.status === 200,
    '/transit route must redirect to /transport or return HTTP 200'
  );
  console.log(`✓ /transit route status: ${transitRes.status}`);

  // 3. التحقق من وجود العنوان والمقدمة البصرية
  console.log('\n--- 3. Verifying Visual Header & Title ---');
  assert.ok(
    html.includes('اتحرّك في بورسعيد بسهولة'),
    'Must include main title: "اتحرّك في بورسعيد بسهولة"'
  );
  assert.ok(
    html.includes('خطوط سرفيس') || html.includes('بيانات وخطوط معتمدة'),
    'Must include header badges or verified stats'
  );
  console.log('✓ Section 1 verified: Title and header stats present');

  // 4. التحقق من أدوات البحث عن رحلة وتحديد البداية والوجهة
  console.log('\n--- 4. Verifying Trip Search, GPS & Swap ---');
  assert.ok(
    html.includes('نقطة الانطلاق') && html.includes('الوجهة'),
    'Must include start and destination selectors'
  );
  assert.ok(
    html.includes('استخدم موقعي الحالي') || html.includes('موقعي الحالي'),
    'Must include current location GPS action'
  );
  assert.ok(
    html.includes('عرض المسار وطريقة الوصول') || html.includes('البحث عن رحلة'),
    'Must include route planning trigger'
  );
  console.log('✓ Section 2 verified: Start/destination inputs and GPS present');

  // 5. التحقق من حاوية الخريطة وأدوات التحكم
  console.log('\n--- 5. Verifying Map Container and Controls ---');
  assert.ok(
    html.includes('خريطة التحرك والمسار المعتمد') || html.includes('maplibre-gl'),
    'Must include interactive map section'
  );
  assert.ok(
    html.includes('ناصع') || html.includes('Positron') || html.includes('حيوي'),
    'Must include map style options'
  );
  console.log('✓ Section 3 verified: Interactive map container and styles present');

  // 6. التحقق من خطوط السرفيس الحقيقية ومسارات الطلبة الموثقة
  console.log('\n--- 6. Verifying Verified Microbus / Service Lines ---');
  assert.ok(
    html.includes('خطة خطوط السرفيس والميكروباص') || html.includes('خطوط السرفيس'),
    'Must include microbus plan section'
  );
  assert.ok(
    html.includes('كلية الطب والعلاج الطبيعي') || html.includes('قصر الثقافة') || html.includes('المعدية / السكن الجامعي'),
    'Must include real Port Said microbus stops'
  );
  console.log('✓ Section 4 verified: Real microbus lines and stops present');

  // 7. التحقق من محطات ومراكز النقل الحيوية (المعديات، الميناء البري، محطة القطار، التاكسي)
  console.log('\n--- 7. Verifying Real Transit Hubs in Port Said ---');
  assert.ok(
    html.includes('معدية بورسعيد – بورفؤاد'),
    'Must include Ferry hub: معدية بورسعيد – بورفؤاد'
  );
  assert.ok(
    html.includes('ميناء بورسعيد البري الجديد'),
    'Must include Landport hub: ميناء بورسعيد البري الجديد'
  );
  assert.ok(
    html.includes('محطة قطار بورسعيد'),
    'Must include Railway hub: محطة قطار بورسعيد'
  );
  assert.ok(
    html.includes('تاكسي بورسعيد الأبيض والأزرق'),
    'Must include White & Blue Taxi hub'
  );
  console.log('✓ Section 5 verified: All 4 major transit hubs present with authentic data');

  // 8. التحقق من رابط الملاحة في Google Maps والتعامل مع عدم توفر المسار المباشر
  console.log('\n--- 8. Verifying Google Maps Navigation Fallback ---');
  assert.ok(
    html.includes('Google Maps') || html.includes('خرائط جوجل'),
    'Must include Google Maps direct navigation option'
  );
  console.log('✓ Section 6 verified: Navigation fallback present');

  // 9. التحقق من تكامل الصفحة الرئيسية
  console.log('\n--- 9. Verifying Home Page Integration ---');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.strictEqual(homeRes.status, 200, 'Home page must return HTTP 200');
  console.log('✓ Home page HTTP 200 verified');

  console.log('\n🎉 ALL TRANSPORTATION ("اتحرّك في بورسعيد بسهولة") TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testTransportPage().catch((err) => {
  console.error('❌ Transport page test failed:', err);
  process.exit(1);
});
