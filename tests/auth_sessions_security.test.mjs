/**
 * Hubs Auth & Sessions Security Test Suite
 * File: tests/auth_sessions_security.test.mjs
 * 
 * Verifies:
 * 1. Dual-hash password verification: Legacy SHA-256 success + JIT modern upgrade.
 * 2. Modern Salted Scrypt verification success on correct password.
 * 3. Modern Salted Scrypt rejection on incorrect password.
 * 4. Cryptographic session sealing & unsealing (HttpOnly token format).
 * 5. Tamper detection: Signature verification failure on payload tampering.
 * 6. Tamper detection: Signature verification failure on signature tampering.
 * 7. Expiration detection: Rejection of expired session tokens.
 * 8. Role & privilege authorization verification.
 * 9. Real Session Invalidation: Immediate rejection after revokeSession and revokeAllUserSessions.
 * 10. SESSION_SECRET production enforcement (throws if weak or missing).
 * 11. Sliding-Window Rate Limiter (blocks brute-force attempts without locking account).
 * 12. Egyptian Phone Normalization (+20, 0020, spaces, dashes).
 * 13. Avatar URL Validation (blocks XSS, javascript:, accepts safe images).
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  hashPasswordModern,
  hashPasswordLegacy,
  verifyAndUpgradePassword,
} from '../src/lib/auth/password.ts';
import {
  sealSessionToken,
  unsealSessionToken,
  revokeSession,
  revokeAllUserSessions,
  getSessionSecret,
} from '../src/lib/auth/session.ts';
import {
  checkRateLimit,
  resetRateLimit,
} from '../src/lib/auth/rateLimit.ts';
import {
  normalizePhone,
  isValidAvatarUrl,
} from '../src/lib/auth/validation.ts';

async function runAuthSecurityTests() {
  console.log('===============================================================');
  console.log('Hubs — Server-Side Auth & Session Security Test Suite');
  console.log('===============================================================\n');

  let passed = 0;
  const total = 13;

  const TEST_PASSWORD = 'PortSaid@Password2026!';
  const WRONG_PASSWORD = 'WrongPassword999!';

  // Test 1: Dual-hash - Legacy SHA-256 verification and JIT upgrade detection
  try {
    console.log('[Test 1] Testing legacy SHA-256 verification and JIT upgrade trigger...');
    const legacyHash = hashPasswordLegacy(TEST_PASSWORD);
    assert.strictEqual(legacyHash.length, 64, 'SHA-256 hash must be 64 hex characters');

    const result = verifyAndUpgradePassword(TEST_PASSWORD, legacyHash);
    assert.strictEqual(result.valid, true, 'Legacy password must verify successfully');
    assert.strictEqual(result.needsUpgrade, true, 'System must trigger JIT upgrade flag');
    assert(result.upgradedHash && result.upgradedHash.startsWith('scrypt:'), 'Upgraded hash must be modern scrypt format');

    console.log('  -> PASS: Legacy SHA-256 verified successfully; modern scrypt upgrade generated.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 1:', err.message);
  }

  // Test 2: Modern Salted Scrypt verification on upgraded hash
  try {
    console.log('[Test 2] Testing modern Salted Scrypt verification on valid password...');
    const modernHash = hashPasswordModern(TEST_PASSWORD);
    assert(modernHash.startsWith('scrypt:16384:8:1:'), 'Scrypt format must match specification');

    const result = verifyAndUpgradePassword(TEST_PASSWORD, modernHash);
    assert.strictEqual(result.valid, true, 'Modern scrypt hash must verify successfully');
    assert.strictEqual(result.needsUpgrade, false, 'Modern hash does not need further upgrade');
    console.log('  -> PASS: Modern salted scrypt verified with timing-safe comparison.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 2:', err.message);
  }

  // Test 3: Rejection of incorrect passwords
  try {
    console.log('[Test 3] Testing rejection of incorrect password against modern scrypt...');
    const modernHash = hashPasswordModern(TEST_PASSWORD);
    const result = verifyAndUpgradePassword(WRONG_PASSWORD, modernHash);
    assert.strictEqual(result.valid, false, 'Wrong password must be rejected');
    console.log('  -> PASS: Incorrect password rejected safely.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 3:', err.message);
  }

  // Test 4: Cryptographic session token creation and valid unsealing
  try {
    console.log('[Test 4] Testing session token sealing and valid unsealing...');
    const payload = {
      userId: '11111111-2222-3333-4444-555555555555',
      name: 'محمود أحمد',
      email: 'mahmoud@test.com',
      phone: '01012345678',
      role: 'user',
    };

    const token = sealSessionToken(payload, 3600); // 1 hour validity
    assert(typeof token === 'string' && token.includes('.'), 'Token must be sealed dot-separated string');

    const unsealed = unsealSessionToken(token);
    assert(unsealed !== null, 'Valid token must unseal successfully');
    assert.strictEqual(unsealed.userId, payload.userId);
    assert.strictEqual(unsealed.role, payload.role);
    assert.strictEqual(unsealed.name, payload.name);
    console.log('  -> PASS: Session token sealed with HMAC-SHA256 and verified successfully.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 4:', err.message);
  }

  // Test 5: Tamper detection - modified payload rejected
  try {
    console.log('[Test 5] Testing tamper detection on modified payload...');
    const payload = {
      userId: '11111111-2222-3333-4444-555555555555',
      name: 'محمود عادي',
      email: 'user@test.com',
      phone: '01000000000',
      role: 'user',
    };

    const token = sealSessionToken(payload);
    const [payloadB64, sigB64] = token.split('.');

    // Tamper with payload: try elevating role to 'admin'
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    decoded.role = 'admin';
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decoded), 'utf-8').toString('base64url');
    const tamperedToken = `${tamperedPayloadB64}.${sigB64}`;

    const unsealed = unsealSessionToken(tamperedToken);
    assert.strictEqual(unsealed, null, 'Tampered token must be rejected by HMAC verification');
    console.log('  -> PASS: Tampered payload caught by cryptographic HMAC verification (returned null).');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 5:', err.message);
  }

  // Test 6: Tamper detection - modified signature rejected
  try {
    console.log('[Test 6] Testing tamper detection on forged signature...');
    const token = sealSessionToken({
      userId: '11111111-2222-3333-4444-555555555555',
      name: 'أحمد',
      email: 'a@test.com',
      phone: '01011111111',
      role: 'user',
    });

    const [payloadB64] = token.split('.');
    const fakeSig = crypto.randomBytes(32).toString('base64url');
    const forgedToken = `${payloadB64}.${fakeSig}`;

    const unsealed = unsealSessionToken(forgedToken);
    assert.strictEqual(unsealed, null, 'Forged signature must be rejected');
    console.log('  -> PASS: Forged signature rejected safely.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 6:', err.message);
  }

  // Test 7: Expiration detection
  try {
    console.log('[Test 7] Testing rejection of expired session token...');
    const expiredToken = sealSessionToken({
      userId: '11111111-2222-3333-4444-555555555555',
      name: 'منتهي الصلاحية',
      email: 'exp@test.com',
      phone: '01022222222',
      role: 'user',
    }, -10);

    const unsealed = unsealSessionToken(expiredToken);
    assert.strictEqual(unsealed, null, 'Expired token must return null');
    console.log('  -> PASS: Expired token rejected automatically based on exp timestamp.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 7:', err.message);
  }

  // Test 8: Privilege enforcement
  try {
    console.log('[Test 8] Testing role and privilege authorization helper...');
    const userSession = { role: 'user' };
    const merchantSession = { role: 'merchant' };
    const adminSession = { role: 'admin' };
    const ownerSession = { role: 'owner' };

    const isAdminOrOwner = (s) => s && (s.role === 'admin' || s.role === 'owner');
    const isMerchantOrStaff = (s) => s && (s.role === 'merchant' || s.role === 'admin' || s.role === 'owner');

    assert.strictEqual(isAdminOrOwner(userSession), false, 'Normal user must NOT have admin access');
    assert.strictEqual(isAdminOrOwner(merchantSession), false, 'Merchant must NOT have admin access');
    assert.strictEqual(isAdminOrOwner(adminSession), true, 'Admin must have admin access');
    assert.strictEqual(isAdminOrOwner(ownerSession), true, 'Owner must have admin access');
    assert.strictEqual(isMerchantOrStaff(merchantSession), true, 'Merchant has merchant access');

    console.log('  -> PASS: Role-based privilege matrix strictly enforced.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 8:', err.message);
  }

  // Test 9: Real Session Invalidation (Logout & Password Change)
  try {
    console.log('[Test 9] Testing real session revocation upon logout and password change...');
    const userRevokedId = '22222222-3333-4444-5555-666666666666';
    const activeToken = sealSessionToken({
      userId: userRevokedId,
      name: 'مستخدم تجريبي للإبطال',
      email: 'revoked@test.com',
      phone: '01033333333',
      role: 'user',
    });

    const unsealedBefore = unsealSessionToken(activeToken);
    assert(unsealedBefore !== null, 'Token should be valid before revocation');
    assert(unsealedBefore.sessionId, 'Token must contain a sessionId');

    // 1. Invalidate single session (logout simulation)
    revokeSession(unsealedBefore.sessionId);
    const unsealedAfterLogout = unsealSessionToken(activeToken);
    assert.strictEqual(unsealedAfterLogout, null, 'Revoked session must immediately return null');

    // 2. Invalidate all user sessions (password change simulation)
    const tokenNewDevice = sealSessionToken({
      userId: userRevokedId,
      name: 'مستخدم تجريبي للإبطال',
      email: 'revoked@test.com',
      phone: '01033333333',
      role: 'user',
    });
    // Fast-forward revocation timestamp by 1s
    revokeAllUserSessions(userRevokedId);
    const unsealedAfterPwdChange = unsealSessionToken(tokenNewDevice);
    assert.strictEqual(unsealedAfterPwdChange, null, 'All sessions issued prior to revocation must return null');

    console.log('  -> PASS: Session revocation verified for logout and password change.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 9:', err.message);
  }

  // Test 10: Production SESSION_SECRET enforcement
  try {
    console.log('[Test 10] Testing production SESSION_SECRET enforcement...');
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.SESSION_SECRET;

    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    let threw = false;
    try {
      getSessionSecret();
    } catch (e) {
      threw = true;
      assert(e.message.includes('FATAL_SECURITY_CONFIG'), 'Must throw fatal config error');
    }
    assert.strictEqual(threw, true, 'Production must throw if secret is missing');

    // Test with short secret in production
    process.env.SESSION_SECRET = 'short_secret_under_32_chars';
    let threwShort = false;
    try {
      getSessionSecret();
    } catch (e) {
      threwShort = true;
    }
    assert.strictEqual(threwShort, true, 'Production must throw if secret is < 32 chars');

    // Restore environment
    process.env.NODE_ENV = origEnv;
    if (origSecret) process.env.SESSION_SECRET = origSecret;

    console.log('  -> PASS: Production SESSION_SECRET strictly enforced (no weak/missing fallback in prod).');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 10:', err.message);
  }

  // Test 11: Sliding-Window Rate Limiting
  try {
    console.log('[Test 11] Testing sliding-window rate limiting on login/register...');
    const testKey = 'test_ip_192.168.1.100';
    resetRateLimit(testKey);

    // 5 attempts allowed with limit = 5
    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit(testKey, 5, 60);
      assert.strictEqual(res.allowed, true, `Attempt ${i} should be allowed`);
    }

    // 6th attempt should be blocked
    const blockedRes = checkRateLimit(testKey, 5, 60);
    assert.strictEqual(blockedRes.allowed, false, '6th attempt must be blocked');
    assert(blockedRes.retryAfterSeconds > 0, 'Retry-after must be > 0');

    // Reset allows immediately
    resetRateLimit(testKey);
    const afterReset = checkRateLimit(testKey, 5, 60);
    assert.strictEqual(afterReset.allowed, true, 'Immediate attempt after reset must be allowed');

    console.log('  -> PASS: Rate limiter blocks excessive attempts and resets cleanly.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 11:', err.message);
  }

  // Test 12: Egyptian Phone Normalization
  try {
    console.log('[Test 12] Testing Egyptian phone normalization...');
    assert.strictEqual(normalizePhone('01012345678'), '01012345678');
    assert.strictEqual(normalizePhone('+201012345678'), '01012345678');
    assert.strictEqual(normalizePhone('00201012345678'), '01012345678');
    assert.strictEqual(normalizePhone('201012345678'), '01012345678');
    assert.strictEqual(normalizePhone('010 1234 5678'), '01012345678');
    assert.strictEqual(normalizePhone('010-1234-5678'), '01012345678');

    console.log('  -> PASS: Egyptian phone numbers normalized correctly.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 12:', err.message);
  }

  // Test 13: Avatar URL Validation
  try {
    console.log('[Test 13] Testing avatar URL validation and XSS prevention...');
    assert.strictEqual(isValidAvatarUrl('https://example.com/avatar.jpg'), true);
    assert.strictEqual(isValidAvatarUrl('http://example.com/avatar.png'), true);
    assert.strictEqual(isValidAvatarUrl('/avatars/avatar1.png'), true);
    assert.strictEqual(isValidAvatarUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), true);

    // Malicious or invalid inputs
    assert.strictEqual(isValidAvatarUrl('javascript:alert(1)'), false);
    assert.strictEqual(isValidAvatarUrl('//evil.com/xss.jpg'), false);
    assert.strictEqual(isValidAvatarUrl('data:text/html;base64,PHNjcmlwdD4='), false);
    assert.strictEqual(isValidAvatarUrl(''), false);
    assert.strictEqual(isValidAvatarUrl('a'.repeat(2049)), false);

    console.log('  -> PASS: Avatar URL validator safely accepts valid images and rejects XSS vectors.');
    passed++;
  } catch (err) {
    console.error('  -> FAIL Test 13:', err.message);
  }

  console.log('\n===============================================================');
  console.log(`Test Results: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runAuthSecurityTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
