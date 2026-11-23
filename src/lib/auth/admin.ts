/**
 * Admin-only access control for Port Said Hub.
 * File: src/lib/auth/admin.ts
 *
 * Pure module (no node-only imports) so it can be imported from both
 * server code and client components.
 *
 * RULE: the admin area (/admin and every admin-only API operation) is
 * accessible ONLY to the single admin account below. No other account —
 * whatever its DB role — may enter. The check is enforced server-side;
 * client-side checks are cosmetic defense-in-depth only.
 */

export const ADMIN_EMAIL = 'portsaidhub@gmail.com';

export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export function isAdminSession(session: { email?: string | null } | null | undefined): boolean {
  if (!session) return false;
  return isAdminEmail(session.email);
}

/**
 * Strong-password policy (applies to registration and password changes).
 * Minimum 12 characters with upper + lower + digit + symbol.
 * Returns an Arabic error message, or null when the password is strong.
 */
export function validateStrongPassword(password: string): string | null {
  if (!password || password.length < 12) {
    return 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل.';
  }
  if (!/[a-z]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على حرف صغير (a-z) واحد على الأقل.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على حرف كبير (A-Z) واحد على الأقل.';
  }
  if (!/[0-9]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على رمز واحد على الأقل (مثل ! @ # $ %).';
  }
  return null;
}
