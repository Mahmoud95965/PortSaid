import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testPhase1() {
  console.log('🚀 Starting Phase 1 Functional Verification Tests...');

  // 1. Verify Pages Return HTTP 200
  const pages = ['/', '/hotels', '/clothes', '/memories'];
  for (const p of pages) {
    const res = await fetch(`${BASE_URL}${p}`);
    assert.strictEqual(res.status, 200, `Page ${p} should return 200 OK`);
    const text = await res.text();
    assert.ok(text.length > 500, `Page ${p} should return non-trivial HTML`);
    console.log(`✅ Page ${p} loaded successfully (HTTP 200, size: ${text.length} bytes)`);
  }

  // 2. Test Historical Stories API (Starts empty until added by Admin as requested)
  console.log('\nTesting Historical Stories API...');
  const histRes = await fetch(`${BASE_URL}/api/historical-stories`);
  assert.strictEqual(histRes.status, 200, 'GET /api/historical-stories should return 200');
  const histData = await histRes.json();
  assert.strictEqual(histData.ok, true, 'histData.ok should be true');
  assert.ok(Array.isArray(histData.stories), 'stories should be an array');
  console.log(`✅ Historical Stories verified (${histData.stories.length} stories found - completely admin-driven)`);

  // 3. Test Memories API Public Feed
  console.log('\nTesting Memories Public Feed API...');
  const memRes = await fetch(`${BASE_URL}/api/memories`);
  assert.strictEqual(memRes.status, 200, 'GET /api/memories should return 200');
  const memData = await memRes.json();
  assert.strictEqual(memData.ok, true, 'memData.ok should be true');
  assert.ok(Array.isArray(memData.memories), 'memories should be an array');
  assert.ok(memData.memories.length >= 3, `Should have seeded memories, got ${memData.memories.length}`);
  console.log(`✅ Community Memories loaded (${memData.memories.length} posts found)`);
  console.log(`   Sample Post: "${memData.memories[0].caption}" by ${memData.memories[0].user_name}`);

  // 4. Test Comments API for first memory
  const targetMemId = memData.memories[0].id;
  const commRes = await fetch(`${BASE_URL}/api/memories/comment?memoryId=${encodeURIComponent(targetMemId)}`);
  assert.strictEqual(commRes.status, 200, 'GET /api/memories/comment should return 200');
  const commData = await commRes.json();
  assert.strictEqual(commData.ok, true, 'commData.ok should be true');
  console.log(`✅ Comments for memory ${targetMemId} loaded (${commData.comments.length} comments found)`);

  // 5. Test Auth Protection on Likes & Posts
  console.log('\nTesting Auth Protection on Memory Mutation Endpoints...');
  const unauthLike = await fetch(`${BASE_URL}/api/memories/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memoryId: targetMemId }),
  });
  assert.strictEqual(unauthLike.status, 401, 'Unauthenticated like should be rejected with 401');
  console.log('✅ Unauthenticated like correctly rejected (HTTP 401)');

  const unauthPost = await fetch(`${BASE_URL}/api/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg', caption: 'Test' }),
  });
  assert.strictEqual(unauthPost.status, 401, 'Unauthenticated post creation should be rejected with 401');
  console.log('✅ Unauthenticated memory creation correctly rejected (HTTP 401)');

  // 6. Test Login as Admin and Perform Authenticated Actions
  console.log('\nTesting Authenticated Flow as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@portsaidhub.com',
      password: 'Admin@123456',
    }),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login should succeed');
  const cookieHeader = loginRes.headers.get('set-cookie');
  assert.ok(cookieHeader, 'Set-Cookie header should be present upon login');
  const sessionCookie = cookieHeader.split(';')[0];
  console.log('✅ Admin login succeeded, session cookie obtained');

  // 7. Toggle Like as Authenticated User
  const authLikeRes = await fetch(`${BASE_URL}/api/memories/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ memoryId: targetMemId }),
  });
  assert.strictEqual(authLikeRes.status, 200, 'Authenticated like should return 200');
  const authLikeData = await authLikeRes.json();
  assert.strictEqual(authLikeData.ok, true, 'authLikeData.ok should be true');
  console.log(`✅ Authenticated like toggle succeeded (Liked: ${authLikeData.liked}, count: ${authLikeData.likesCount})`);

  // 8. Add Comment as Authenticated User
  const authCommRes = await fetch(`${BASE_URL}/api/memories/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      memoryId: targetMemId,
      comment: 'جمال بورسعيد وتاريخها العريق لا ينتهي! 🌊✨',
    }),
  });
  assert.strictEqual(authCommRes.status, 200, 'Authenticated comment should return 200');
  const authCommData = await authCommRes.json();
  assert.strictEqual(authCommData.ok, true, 'authCommData.ok should be true');
  console.log(`✅ Authenticated comment added: "${authCommData.comment.comment}"`);

  // 9. Post Memory as Authenticated User
  const newPostRes = await fetch(`${BASE_URL}/api/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      imageUrl: '/assets/port-said/port-said-mosque.webp',
      caption: 'المسجد العباسي التاريخي وقت صلاة الجمعة في حي العرب 🕌✨',
    }),
  });
  assert.strictEqual(newPostRes.status, 200, 'Authenticated memory creation should return 200');
  const newPostData = await newPostRes.json();
  assert.strictEqual(newPostData.ok, true, 'newPostData.ok should be true');
  console.log(`✅ Authenticated memory created with ID: ${newPostData.memory.id}`);

  // Clean up the created test memory
  const delRes = await fetch(`${BASE_URL}/api/memories?id=${encodeURIComponent(newPostData.memory.id)}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(delRes.status, 200, 'Admin should be able to delete memory');
  console.log('✅ Created test memory cleanly deleted');

  console.log('\n🎉 ALL PHASE 1 FUNCTIONAL VERIFICATION TESTS PASSED SUCCESSFULLY! 💯');
}

testPhase1().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
