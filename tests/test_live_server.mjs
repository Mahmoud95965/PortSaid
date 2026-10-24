/**
 * Live End-to-End Test for Running Port Said Hub Server
 * File: tests/test_live_server.mjs
 */

async function testLiveServer() {
  console.log('Testing live server at http://localhost:3000 ...\n');

  // 1. Initial /api/auth/me without cookie
  const unauthRes = await fetch('http://localhost:3000/api/auth/me');
  const unauthData = await unauthRes.json();
  console.log('1. GET /api/auth/me (unauthenticated):', unauthData);
  if (unauthData.ok !== false) throw new Error('Expected unauthenticated user');

  // 2. Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: '01000000001',
      password: 'TestPassword123!',
    }),
  });
  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('2. POST /api/auth/login:', loginData);
  console.log('   Set-Cookie Header:', setCookie ? 'RECEIVED (HttpOnly)' : 'MISSING');
  if (!loginData.ok || !setCookie) throw new Error('Login failed or cookie missing');

  // Extract ps_session cookie
  const cookieMatch = setCookie.match(/ps_session=([^;]+)/);
  if (!cookieMatch) throw new Error('Could not parse ps_session cookie');
  const cookieHeader = `ps_session=${cookieMatch[1]}`;

  // 3. GET /api/auth/me with Cookie
  const authRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Cookie: cookieHeader },
  });
  const authData = await authRes.json();
  console.log('3. GET /api/auth/me (authenticated):', authData);
  if (!authData.ok || !authData.user) throw new Error('Failed to restore session from cookie');

  // 4. POST /api/rewards/share
  const shareRes = await fetch('http://localhost:3000/api/rewards/share', {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  const shareData = await shareRes.json();
  console.log('4. POST /api/rewards/share:', shareData);
  if (!shareData.ok) throw new Error('Share reward failed');

  // 5. POST /api/rewards/visit
  const visitRes = await fetch('http://localhost:3000/api/rewards/visit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      placeId: '00000000-0000-0000-0000-000000000001',
      lat: 31.265,
      lon: 32.302,
      distanceM: 50,
    }),
  });
  const visitData = await visitRes.json();
  console.log('5. POST /api/rewards/visit:', visitData);
  if (!visitData.ok) throw new Error('Visit reward failed');

  // 6. POST /api/auth/logout
  const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  const logoutData = await logoutRes.json();
  console.log('6. POST /api/auth/logout:', logoutData);
  if (!logoutData.ok) throw new Error('Logout failed');

  // 7. Verify session is revoked after logout
  const postLogoutRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Cookie: cookieHeader },
  });
  const postLogoutData = await postLogoutRes.json();
  console.log('7. GET /api/auth/me after logout (should be null):', postLogoutData);
  if (postLogoutData.ok !== false) throw new Error('Session should be invalid after logout');

  // 8. POST /api/auth/register (New User Registration Flow)
  const regPhone = '010' + Math.floor(10000000 + Math.random() * 90000000);
  const regEmail = `test_${Date.now()}@portsaidhub.com`;
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'مستخدم تجريبي جديد',
      email: regEmail,
      phone: regPhone,
      password: 'SecurePassword2026!',
      gender: 'male',
      user_type: 'student',
      governorate: 'بورسعيد',
      institution: 'كلية الهندسة',
    }),
  });
  const regData = await regRes.json();
  const regCookie = regRes.headers.get('set-cookie');
  console.log('8. POST /api/auth/register:', regData);
  console.log('   Set-Cookie Header:', regCookie ? 'RECEIVED (HttpOnly)' : 'MISSING');
  if (!regData.ok || !regCookie || regData.user.points !== 20) {
    throw new Error('Registration flow or welcome bonus failed');
  }

  console.log('\n>>> ALL LIVE SERVER ENDPOINTS VERIFIED 100% OPERATIONAL! <<<\n');
}

testLiveServer().catch((e) => {
  console.error('Live server test failed:', e);
  process.exit(1);
});
