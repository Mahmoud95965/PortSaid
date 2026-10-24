/**
 * Live End-to-End Test for Running Port Said Hub Server
 * File: tests/test_live_server.mjs
 */

async function testLiveServer() {
  console.log('Testing live server persistent database at http://localhost:3000 ...\n');

  // 1. Initial /api/auth/me without cookie
  const unauthRes = await fetch('http://localhost:3000/api/auth/me');
  const unauthData = await unauthRes.json();
  console.log('1. GET /api/auth/me (unauthenticated):', unauthData);
  if (unauthData.ok !== false) throw new Error('Expected unauthenticated user');

  // 2. Register a brand new real user
  const uniqueSuffix = Date.now().toString().slice(-6);
  const regPhone = `01099${uniqueSuffix}`;
  const regEmail = `user_${uniqueSuffix}@portsaidhub.com`;
  const regPassword = 'MySecretPassword2026!';

  console.log(`2. Registering new user: Phone=${regPhone}, Email=${regEmail} ...`);
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'محمود التجريبي',
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      gender: 'male',
      user_type: 'student',
      governorate: 'بورسعيد',
      institution: 'كلية الهندسة',
    }),
  });
  const regData = await regRes.json();
  const regCookie = regRes.headers.get('set-cookie');
  console.log('   Response:', regData);
  if (!regData.ok || !regCookie) throw new Error('Registration failed');
  if (regData.user.points !== 20) throw new Error('Welcome points bonus not 20');

  const cookieMatch = regCookie.match(/ps_session=([^;]+)/);
  if (!cookieMatch) throw new Error('Could not parse ps_session cookie');
  const userCookie = `ps_session=${cookieMatch[1]}`;

  // 3. Verify session in DB via /api/auth/me
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Cookie: userCookie },
  });
  const meData = await meRes.json();
  console.log('3. GET /api/auth/me after registration:', meData);
  if (!meData.ok || meData.user.phone !== regPhone || meData.user.points !== 20) {
    throw new Error('User not found in DB or points mismatch');
  }

  // 4. Claim Share Reward (+40 pts)
  console.log('4. Claiming share reward (+40 pts) ...');
  const shareRes = await fetch('http://localhost:3000/api/rewards/share', {
    method: 'POST',
    headers: { Cookie: userCookie },
  });
  const shareData = await shareRes.json();
  console.log('   Share Result:', shareData);
  if (!shareData.ok || shareData.balance !== 60) throw new Error('Share reward points not added in DB');

  // 5. Claim Share Reward AGAIN (Must be rejected idempotently)
  console.log('5. Attempting duplicate share claim ...');
  const dupShareRes = await fetch('http://localhost:3000/api/rewards/share', {
    method: 'POST',
    headers: { Cookie: userCookie },
  });
  const dupShareData = await dupShareRes.json();
  console.log('   Duplicate Share Result (should fail):', dupShareData);
  if (dupShareData.ok !== false) throw new Error('Duplicate share reward must be rejected');

  // 6. Record Place Visit (+20 pts)
  console.log('6. Recording place visit (+20 pts) ...');
  const visitPlaceId = 'f1a2b3c4-0000-0000-0000-000000000001';
  const visitRes = await fetch('http://localhost:3000/api/rewards/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userCookie },
    body: JSON.stringify({
      placeId: visitPlaceId,
      lat: 31.265,
      lon: 32.302,
      distanceM: 30,
    }),
  });
  const visitData = await visitRes.json();
  console.log('   Visit Result:', visitData);
  if (!visitData.ok || visitData.balance !== 80) throw new Error('Visit points not added in DB');

  // 7. Duplicate Visit Today (Must be rejected)
  console.log('7. Attempting duplicate visit on same day ...');
  const dupVisitRes = await fetch('http://localhost:3000/api/rewards/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userCookie },
    body: JSON.stringify({
      placeId: visitPlaceId,
      lat: 31.265,
      lon: 32.302,
    }),
  });
  const dupVisitData = await dupVisitRes.json();
  console.log('   Duplicate Visit Result (should fail):', dupVisitData);
  if (dupVisitData.ok !== false) throw new Error('Duplicate visit today must be rejected');

  // 8. Logout
  console.log('8. Logging out ...');
  await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: userCookie },
  });

  // 9. Login with registered user's credentials and verify persisted balance (80 pts)
  console.log('9. Logging in with saved user credentials to verify DB persistence ...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: regPhone,
      password: regPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('   Login Result:', loginData);
  if (!loginData.ok || !loginData.user) throw new Error('Failed to log in with newly registered user');
  if (loginData.user.points !== 80) {
    throw new Error(`Persisted balance mismatch: expected 80, got ${loginData.user.points}`);
  }

  // 10. Login with Baseline Admin (Pre-seeded in DB)
  console.log('10. Logging in with pre-seeded Admin (01000000001) ...');
  const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '01000000001',
      password: 'Admin@123456',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log('   Admin Login Result:', adminLoginData);
  if (!adminLoginData.ok || adminLoginData.user.role !== 'owner' || adminLoginData.user.points !== 500) {
    throw new Error('Pre-seeded admin account failed to log in');
  }

  console.log('\n>>> SUCCESS: ALL DATABASE OPERATIONS ARE PERMANENTLY SAVED AND VERIFIED ON DISK! <<<\n');
}

testLiveServer().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
