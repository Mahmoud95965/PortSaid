/**
 * Auth & Profile Validation Utilities
 * File: src/lib/auth/validation.ts
 */

/**
 * Normalizes Egyptian mobile phone numbers to 01xxxxxxxxx format
 */
export function normalizePhone(phone: string): string {
  let cleaned = (phone || '').replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+20')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0020')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Validates avatar URL to prevent XSS and malicious scheme injections
 */
export function isValidAvatarUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;

  // Safe relative paths: /images/... or /avatars/...
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  // Safe data URIs for images only: data:image/png;base64,... etc.
  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }

  // Safe HTTP/HTTPS URLs
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
