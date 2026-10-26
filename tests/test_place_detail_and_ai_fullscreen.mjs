import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== Testing Place Details & AI Center Full-Screen Experience ===\n');

  // 1. اختبار مكون تفاصيل المكان PlaceDetail ومحتوياته الغنية
  console.log('--- 1. Testing Place Detail Component & Hero Photo ---');
  const placeDetailSource = fs.readFileSync(
    path.resolve('src/components/PlaceDetail.tsx'),
    'utf-8'
  );

  assert.ok(
    placeDetailSource.includes('getPlaceHeroPhoto'),
    'Should include hero photo resolver for places'
  );
  assert.ok(
    placeDetailSource.includes('port-said-lighthouse.webp') &&
    placeDetailSource.includes('hero-01.webp') &&
    placeDetailSource.includes('hero-02.webp'),
    'Should map authentic Port Said images to places'
  );
  assert.ok(
    placeDetailSource.includes('التكلفة التقديرية') &&
    placeDetailSource.includes('المدة المقترحة') &&
    placeDetailSource.includes('أفضل توقيت'),
    'Should include rich highlights (cost, duration, best time)'
  );
  assert.ok(
    placeDetailSource.includes('أروح إزاي بالمواصلات؟'),
    'Should include public transit route guide'
  );
  assert.ok(
    placeDetailSource.includes('تقييمات الزوار') && placeDetailSource.includes('شاركنا رأيك وتجربتك'),
    'Should include community reviews and star rating form'
  );

  const exploreRes = await fetch(`${BASE_URL}/explore?place=11111111-1111-1111-1111-111111111101`);
  assert.strictEqual(exploreRes.status, 200, 'Explore page should return HTTP 200');
  console.log('✓ Place Detail verified with hero image, rich metadata, and organized sections');

  // 2. اختبار مركز الذكاء الاصطناعي كشاشة محادثة كاملة
  console.log('\n--- 2. Testing AI Center Full-Screen Chat Layout ---');
  const aiRes = await fetch(`${BASE_URL}/ai`);
  assert.strictEqual(aiRes.status, 200, '/ai route should return HTTP 200');
  const aiHtml = await aiRes.text();

  assert.ok(
    aiHtml.includes('مساعد بورسعيد ومخطط الرحلات الذكي'),
    'Should contain AI Center header'
  );
  assert.ok(
    aiHtml.includes('عايز تكتشف إيه في بورسعيد اليوم؟'),
    'Should render welcoming chat prompts without taking screen with map'
  );
  console.log('✓ AI Center full-screen chat interface verified');

  // 3. اختبار ردود المساعد الغنية بالمعلومات والمنظمة
  console.log('\n--- 3. Testing Structured & Detailed AI Responses ---');
  const assistantRes = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'عايز كافيهات هادية قريبة من البحر' }),
  });
  assert.strictEqual(assistantRes.status, 200, 'Assistant API should return HTTP 200');
  const assistantData = await assistantRes.json();

  assert.ok(assistantData.ok, 'Assistant should return ok: true');
  assert.ok(
    assistantData.reply.includes('###') || assistantData.reply.includes('####'),
    'Reply should have structured markdown headers'
  );
  assert.ok(
    assistantData.reply.includes('نصائح بورسعيدية') || assistantData.reply.includes('المواصلات'),
    'Reply should have dedicated tips and transit sections'
  );
  assert.ok(
    assistantData.suggestedPlaces && assistantData.suggestedPlaces.length > 0,
    'Context should identify places for inline map'
  );
  console.log('✓ Assistant generated rich, well-organized response with headers, tips, and places');

  console.log('\n🎉 ALL PLACE DETAILS & AI FULL-SCREEN TESTS PASSED 100%! 🎉\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
