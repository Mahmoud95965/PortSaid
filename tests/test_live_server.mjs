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
  const regPhone = `01088${uniqueSuffix}`;
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

  // 4. Verify Share Points is properly CANCELLED (as requested)
  console.log('4. Verifying share points is properly cancelled ...');
  const shareRes = await fetch('http://localhost:3000/api/rewards/share', {
    method: 'POST',
    headers: { Cookie: userCookie },
  });
  const shareData = await shareRes.json();
  console.log('   Share Result (should be disabled):', shareData);
  if (shareData.ok !== false) throw new Error('Share reward must be disabled');

  // 5. Record Place Visit (+20 pts)
  console.log('5. Recording place visit (+20 pts) ...');
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
  if (!visitData.ok || visitData.balance !== 40) throw new Error('Visit points not added in DB (expected 20+20=40)');

  // 6. Record second Place Visit to another place (+20 pts -> 60 pts)
  console.log('6. Recording second place visit (+20 pts) ...');
  const visitPlaceId2 = 'f1a2b3c4-0000-0000-0000-000000000002';
  const visitRes2 = await fetch('http://localhost:3000/api/rewards/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userCookie },
    body: JSON.stringify({
      placeId: visitPlaceId2,
      lat: 31.258,
      lon: 32.308,
      distanceM: 40,
    }),
  });
  const visitData2 = await visitRes2.json();
  console.log('   Second Visit Result:', visitData2);
  if (!visitData2.ok || visitData2.balance !== 60) throw new Error('Second visit points not added in DB');

  // 7. Verify Points Ledger Endpoint (/api/rewards/ledger)
  console.log('7. Verifying /api/rewards/ledger ...');
  const ledgerRes = await fetch('http://localhost:3000/api/rewards/ledger', {
    headers: { Cookie: userCookie },
  });
  const ledgerData = await ledgerRes.json();
  console.log('   Ledger Transactions Count:', ledgerData.ledger?.length);
  if (!ledgerData.ok || !Array.isArray(ledgerData.ledger) || ledgerData.ledger.length < 3) {
    throw new Error('Ledger should contain welcome bonus + 2 visits');
  }

  // 8. Redeem Coupon for 40 points (60 - 40 = 20 pts remaining)
  console.log('8. Testing Coupon Redemption (/api/rewards/redeem) for 40 points ...');
  const redeemRes = await fetch('http://localhost:3000/api/rewards/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userCookie },
    body: JSON.stringify({
      placeId: visitPlaceId,
      pointsCost: 40,
      placeName: 'حلويات سيلفر',
    }),
  });
  const redeemData = await redeemRes.json();
  console.log('   Redeem Result:', redeemData);
  if (!redeemData.ok || redeemData.balance !== 20 || !redeemData.couponCode) {
    throw new Error('Coupon redemption failed or balance incorrect');
  }

  // 9. Test Enhanced Smart Assistant (/api/assistant)
  console.log('9. Testing Enhanced Smart Assistant (/api/assistant) ...');
  const botRes = await fetch('http://localhost:3000/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'ازاي استخدم النقط؟' }),
  });
  const botData = await botRes.json();
  console.log('   Bot Reply for Points:', botData.reply);
  if (!botData.ok || !botData.reply || !botData.reply.includes('نظام النقاط')) {
    throw new Error('Smart assistant reply invalid');
  }

  // Test Assistant on Fish/Dining
  const botFishRes = await fetch('http://localhost:3000/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'احسن مطعم سمك في بورسعيد فين؟' }),
  });
  const botFishData = await botFishRes.json();
  console.log('   Bot Reply for Fish:', botFishData.reply);
  if (!botFishData.ok || !botFishData.reply || !botFishData.reply.includes('كاستن')) {
    throw new Error('Smart assistant fish reply invalid');
  }

  // 10. Logout & Login again to ensure final balance (20 pts) is permanently persisted
  console.log('10. Logging out & verifying persistent DB storage ...');
  await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: userCookie },
  });

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: regPhone,
      password: regPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('    Login Result after coupon redemption:', loginData);
  if (!loginData.ok || loginData.user.points !== 20) {
    throw new Error(`Persisted balance mismatch: expected 20, got ${loginData.user?.points}`);
  }

  console.log('\n>>> SUCCESS: ALL NEW POINTS, LEDGER, REDEMPTION & CHATBOT FEATURES VERIFIED 100%! <<<\n');
}

testLiveServer().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
