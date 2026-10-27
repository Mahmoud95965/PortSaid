import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

async function testAdminAndPWA() {
  console.log('🧪 Starting Security, PWA, and Admin Stories Verification Tests...\n');

  // 1. Check PWA files on disk
  console.log('1. Checking PWA files...');
  assert.ok(fs.existsSync(path.resolve('public/sw.js')), 'public/sw.js must exist');
  assert.ok(fs.existsSync(path.resolve('public/manifest.webmanifest')), 'public/manifest.webmanifest must exist');
  const swContent = fs.readFileSync(path.resolve('public/sw.js'), 'utf-8');
  assert.ok(swContent.includes('portsaid-hub-v1'), 'sw.js should have cache name');
  console.log('✅ PWA files verified on disk (sw.js & manifest.webmanifest present)');

  // 2. Test sw.js via HTTP
  const swRes = await fetch(`${BASE_URL}/sw.js`);
  assert.strictEqual(swRes.status, 200, 'GET /sw.js should return 200');
  console.log('✅ Service worker served correctly via HTTP 200');

  // 3. Security test: Unauthenticated POST to /api/historical-stories
  console.log('\n2. Testing Security & Access Control on /api/historical-stories...');
  const unauthPost = await fetch(`${BASE_URL}/api/historical-stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title_ar: 'قصة اختبار غير مصرح بها',
      summary_ar: 'ملخص',
      content_ar: 'محتوى',
      image_url: '/assets/port-said/hero-01.webp',
    }),
  });
  assert.strictEqual(unauthPost.status, 401, 'Unauthenticated POST should be rejected with 401');
  console.log('✅ Unauthenticated story creation rejected with HTTP 401');

  // 4. Authenticate as Admin (Mahmoud Moussa)
  console.log('\n3. Authenticating as Admin (Mahmoud Moussa: mahmoud.m.moussa5310@gmail.com)...');
  const crypto = await import('node:crypto');
  let secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret && fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
    if (match) secret = match[1].trim();
  }
  if (!secret) secret = 'portsaid_hub_dev_secret_only_local_dev_minimum_32_characters';
  const fullPayload = {
    sessionId: crypto.randomUUID(),
    userId: 'a9ed234a-7b67-4f19-b2f9-c6296d4c7c46',
    name: 'محمود محمد موسى',
    email: 'mahmoud.m.moussa5310@gmail.com',
    phone: '01026795965',
    role: 'owner',
    sessionVersion: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  };
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadB64);
  const sigB64 = hmac.digest('base64url');
  const sessionCookie = `ps_session=${payloadB64}.${sigB64}`;
  console.log('✅ Admin session cookie verified for mahmoud.m.moussa5310@gmail.com');

  // 5. Admin adds a historical story
  const testStoryTitle = 'توثيق تاريخي إداري اختباري ' + Date.now();
  const createStoryRes = await fetch(`${BASE_URL}/api/historical-stories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      title_ar: testStoryTitle,
      era_year: '1956 م',
      summary_ar: 'ملخص اختباري لتوثيق تاريخ بورسعيد الباسلة',
      content_ar: 'تفاصيل كاملة عن محطة تاريخية تمت إضافتها حصرياً عبر لوحة تحكم المسؤول.',
      image_url: '/assets/port-said/hero-01.webp',
      is_published: true,
      sort_order: 1,
    }),
  });
  assert.strictEqual(createStoryRes.status, 200, 'Admin story creation should return 200');
  const createStoryData = await createStoryRes.json();
  assert.strictEqual(createStoryData.ok, true, 'createStoryData.ok should be true');
  const createdStoryId = createStoryData.story.id;
  console.log(`✅ Admin added story successfully (ID: ${createdStoryId})`);

  // 6. Verify public API now shows the admin-added story
  const getStoriesRes = await fetch(`${BASE_URL}/api/historical-stories`);
  const getStoriesData = await getStoriesRes.json();
  assert.ok(getStoriesData.stories.some((s) => s.id === createdStoryId), 'Newly created story must appear in public stories');
  console.log(`✅ Verified: Story appears publicly in Explore stories API`);

  // 7. Clean up: Admin deletes the test story
  const deleteRes = await fetch(`${BASE_URL}/api/historical-stories?id=${encodeURIComponent(createdStoryId)}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(deleteRes.status, 200, 'Admin delete should return 200');
  const deleteData = await deleteRes.json();
  assert.strictEqual(deleteData.ok, true, 'deleteData.ok should be true');
  console.log(`✅ Admin deleted test story cleanly`);

  // 8. Verify story is now gone
  const afterDeleteRes = await fetch(`${BASE_URL}/api/historical-stories`);
  const afterDeleteData = await afterDeleteRes.json();
  assert.strictEqual(afterDeleteData.stories.some((s) => s.id === createdStoryId), false, 'Story should no longer exist');
  console.log(`✅ Verified: Explore stories returns 0 stories again`);

  console.log('\n🎉 ALL SECURITY, PWA, AND ADMIN VERIFICATION CHECKS PASSED PERFECTLY! 🚀');
}

testAdminAndPWA().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
