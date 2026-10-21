import fs from 'fs';
import path from 'path';
import { User } from './types';
import { hashPassword, verifyPassword } from './auth';

const DB_PATH = path.join(process.cwd(), 'database', 'local_users.json');

export interface StoredUser extends User {
  password_hash: string;
  created_at: string;
}

// Initial seed users if file doesn't exist
const INITIAL_USERS: StoredUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'المالك الرئيسي (Alpha Admin)',
    email: 'admin@portsaidhub.com',
    phone: '01000000001',
    role: 'owner',
    type: 'local',
    gov: 'بورسعيد',
    points: 500,
    staff: true,
    gender: 'male',
    email_verified: true,
    password_hash: '$2b$10$wU05zG5m4fD62GqT2fR4eeg08Z9M2V1K5c7xN9b5u2X4y1A0z5w6q', // Admin@123456
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'صاحب متجر تجريبي',
    email: 'merchant@portsaidhub.com',
    phone: '01000000002',
    role: 'merchant',
    type: 'local',
    gov: 'بورسعيد',
    points: 100,
    staff: false,
    gender: 'male',
    email_verified: true,
    password_hash: '$2b$10$wU05zG5m4fD62GqT2fR4eeg08Z9M2V1K5c7xN9b5u2X4y1A0z5w6q', // Admin@123456
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'طالب جامعي (حساب تجريبي)',
    email: 'user@portsaidhub.com',
    phone: '01000000003',
    role: 'user',
    type: 'student',
    institution: 'كلية الهندسة — جامعة بورسعيد',
    gov: 'بورسعيد',
    points: 80,
    staff: false,
    gender: 'male',
    email_verified: true,
    password_hash: '$2b$10$wU05zG5m4fD62GqT2fR4eeg08Z9M2V1K5c7xN9b5u2X4y1A0z5w6q', // Admin@123456
    created_at: new Date().toISOString(),
  }
];

export function getLocalUsers(): StoredUser[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_USERS, null, 2), 'utf-8');
      return INITIAL_USERS;
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content) as StoredUser[];
  } catch (err) {
    console.error('Error reading local users:', err);
    return INITIAL_USERS;
  }
}

export function saveLocalUser(user: StoredUser): void {
  try {
    const users = getLocalUsers();
    const idx = users.findIndex(u => u.id === user.id || (user.email && u.email === user.email) || (user.phone && u.phone === user.phone));
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local user:', err);
  }
}

export function findLocalUser(identifier: string): StoredUser | null {
  const users = getLocalUsers();
  const trimmed = identifier.trim().toLowerCase();
  return users.find(u => 
    (u.email && u.email.toLowerCase() === trimmed) ||
    (u.phone && u.phone === trimmed) ||
    (trimmed === 'admin' && (u.role === 'owner' || u.role === 'admin'))
  ) || null;
}
