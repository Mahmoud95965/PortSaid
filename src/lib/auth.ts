import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { User } from './types';
import crypto from 'crypto';

const SECRET_KEY = new TextEncoder().encode(
  process.env.APP_SECRET || 'psh-secret-default-port-said-hub-super-secure-key-2026'
);

const COOKIE_NAME = 'psid_next';

export function preHashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('base64');
}

export async function hashPassword(password: string): Promise<string> {
  const pre = preHashPassword(password);
  return bcrypt.hash(pre, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const pre = preHashPassword(password);
  try {
    return await bcrypt.compare(pre, hash);
  } catch {
    return false;
  }
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return (payload.user as User) || null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const DEFAULT_ADMIN: User = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'المالك الرئيسي',
  email: 'admin@portsaidhub.com',
  phone: '01000000001',
  role: 'owner',
  type: 'local',
  gov: 'بورسعيد',
  points: 500,
  staff: true,
  perms: ['places.edit', 'places.delete', 'users.manage', 'share.manage', 'partners.manage', 'uploads.review', 'logs.view']
};
