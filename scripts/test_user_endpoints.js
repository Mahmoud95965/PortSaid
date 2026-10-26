const assert = require('assert');

async function testEndpoints() {
  const BASE_URL = 'http://localhost:3000';
  
  // 1. Favorites GET when unauthenticated should return { ok: true, favorites: [] }
  const favRes = await fetch(`${BASE_URL}/api/user/favorites`);
  const favData = await favRes.json();
  assert.strictEqual(favData.ok, true);
  assert.ok(Array.isArray(favData.favorites));
  console.log('✓ /api/user/favorites GET works properly');

  // 2. Planner save POST when unauthenticated should return status 401
  const saveRes = await fetch(`${BASE_URL}/api/planner/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Plan', stops: [] })
  });
  assert.strictEqual(saveRes.status, 401);
  console.log('✓ /api/planner/save correctly enforces authentication (401)');

  console.log('All user endpoints verified!');
}

testEndpoints().catch(e => {
  console.error(e);
  process.exit(1);
});
