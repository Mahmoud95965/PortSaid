/**
 * Local Persistent Database (SQLite via Node.js Built-in Engine)
 * File: src/lib/db/localDb.ts
 * 
 * Provides zero-configuration, rock-solid persistent storage on disk
 * whenever remote Supabase is offline or not configured.
 * Preserves all users, balances, ledger entries, visits, and applications.
 */

// @ts-ignore - node:sqlite is natively built into Node.js 22.5+
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { hashPasswordModern } from '@/lib/auth/password';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  gender: string;
  role_id: number;
  role: 'owner' | 'admin' | 'merchant' | 'user';
  user_type_id: number;
  user_type: string;
  governorate: string;
  institution: string | null;
  points_balance: number;
  avatar: string | null;
  status: 'active' | 'suspended';
  failed_logins: number;
  locked_until: string | null;
  must_change_password: number;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface DbLedgerEntry {
  id: number;
  user_id: string;
  delta: number;
  balance_after: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface DbVisit {
  id: number;
  user_id: string;
  place_id: string;
  points_awarded: number;
  latitude: number | null;
  longitude: number | null;
  distance_m: number | null;
  location_verified: number;
  visit_day: string;
  created_at: string;
}

let dbInstance: DatabaseSync | null = null;

export function getLocalDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'portsaid.db');
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for high concurrency
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      gender TEXT DEFAULT 'male',
      role_id INTEGER DEFAULT 4,
      role TEXT DEFAULT 'user',
      user_type_id INTEGER DEFAULT 1,
      user_type TEXT DEFAULT 'student',
      governorate TEXT DEFAULT 'بورسعيد',
      institution TEXT,
      points_balance INTEGER DEFAULT 0,
      avatar TEXT,
      status TEXT DEFAULT 'active',
      failed_logins INTEGER DEFAULT 0,
      locked_until TEXT,
      must_change_password INTEGER DEFAULT 0,
      email_verified_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref_type TEXT,
      ref_id TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      place_id TEXT NOT NULL,
      points_awarded INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      distance_m INTEGER,
      location_verified INTEGER DEFAULT 1,
      visit_day TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS partner_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      area_ar TEXT,
      phone TEXT,
      proposed_discount_percent INTEGER DEFAULT 10,
      proposed_commission_amount INTEGER DEFAULT 5,
      promo_notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS place_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating REAL NOT NULL,
      comment TEXT,
      status TEXT DEFAULT 'visible',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      name TEXT,
      phone TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_idemp ON points_ledger(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_visits_user_day ON visits(user_id, place_id, visit_day);
  `);

  // Seed baseline accounts if database is fresh
  const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (!userCountRow || userCountRow.cnt === 0) {
    seedBaselineUsers(db);
  }

  dbInstance = db;
  return dbInstance;
}

function seedBaselineUsers(db: DatabaseSync) {
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, phone, password_hash, gender, role_id, role,
      user_type_id, user_type, governorate, points_balance, status,
      email_verified_at, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const now = new Date().toISOString();

  // 1. Owner Admin
  insertUser.run(
    '00000000-0000-0000-0000-000000000001',
    'المالك الرئيسي',
    'admin@portsaidhub.com',
    '01000000001',
    hashPasswordModern('Admin@123456'),
    'male',
    1,
    'owner',
    3,
    'local',
    'بورسعيد',
    500,
    'active',
    now,
    now
  );

  // 2. Karim Admin
  insertUser.run(
    '00000000-0000-0000-0000-000000000002',
    'كريم محمود',
    'karim@portsaidhub.com',
    '01011223344',
    hashPasswordModern('Admin@123456'),
    'male',
    2,
    'admin',
    3,
    'local',
    'بورسعيد',
    220,
    'active',
    now,
    now
  );

  // 3. Merchant Kastan
  insertUser.run(
    '00000000-0000-0000-0000-000000000003',
    'صاحب مطعم كاستن',
    'merchant@portsaidhub.com',
    '01000000002',
    hashPasswordModern('Merchant@123456'),
    'male',
    3,
    'merchant',
    3,
    'local',
    'بورسعيد',
    100,
    'active',
    now,
    now
  );

  // 4. Ahmad Student
  insertUser.run(
    '00000000-0000-0000-0000-000000000004',
    'أحمد السيد',
    'ahmed@student.psu.edu.eg',
    '01234567890',
    hashPasswordModern('User@123456'),
    'male',
    4,
    'user',
    1,
    'student',
    'بورسعيد',
    60,
    'active',
    now,
    now
  );

  console.log('[LocalDb] Baseline users seeded into persistent SQLite database successfully.');
}

// ==========================================
// User Operations
// ==========================================

export function dbFindUserById(id: string): DbUser | null {
  const db = getLocalDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL').get(id) as DbUser | undefined;
  return row || null;
}

export function dbFindUserByIdentifier(identifier: string): DbUser | null {
  const db = getLocalDb();
  const trimmed = identifier.trim().toLowerCase();
  const isEmail = trimmed.includes('@');

  const query = isEmail
    ? 'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL'
    : 'SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL';

  const row = db.prepare(query).get(trimmed) as DbUser | undefined;
  return row || null;
}

export function dbCreateUser(userData: {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  gender?: string;
  role?: 'owner' | 'admin' | 'merchant' | 'user';
  userType?: string;
  governorate?: string;
  institution?: string;
  initialPoints?: number;
}): DbUser {
  const db = getLocalDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const role = userData.role || 'user';
  const roleId = role === 'owner' ? 1 : role === 'admin' ? 2 : role === 'merchant' ? 3 : 4;
  const initialPoints = userData.initialPoints ?? (role === 'merchant' ? 0 : 20);

  const stmt = db.prepare(`
    INSERT INTO users (
      id, name, email, phone, password_hash, gender, role_id, role,
      user_type, governorate, institution, points_balance, status, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'active', ?
    )
  `);

  stmt.run(
    id,
    userData.name.trim(),
    userData.email.trim().toLowerCase(),
    userData.phone.trim(),
    userData.passwordHash,
    userData.gender || 'male',
    roleId,
    role,
    userData.userType || 'student',
    userData.governorate || 'بورسعيد',
    userData.institution || null,
    initialPoints,
    now
  );

  // Insert Welcome Ledger Entry if points awarded
  if (initialPoints > 0) {
    db.prepare(`
      INSERT INTO points_ledger (
        user_id, delta, balance_after, reason, ref_type, ref_id, created_at
      ) VALUES (?, ?, ?, ?, 'welcome_gift', 'welcome_bonus', ?)
    `).run(id, initialPoints, initialPoints, 'هدية إنشاء الحساب الجديد والترحيب في بورسعيد', now);
  }

  return dbFindUserById(id)!;
}

export function dbUpdateUser(id: string, updates: Record<string, any>): void {
  const db = getLocalDb();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);
  values.push(id);

  db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values);
}

// ==========================================
// Rewards Operations (Atomic & Idempotent)
// ==========================================

export function dbClaimShareReward(userId: string): { ok: boolean; balance: number; pointsAwarded: number; message: string } {
  const db = getLocalDb();
  const user = dbFindUserById(userId);
  if (!user || user.status !== 'active') {
    return { ok: false, balance: 0, pointsAwarded: 0, message: 'الحساب غير موجود أو معطل.' };
  }

  // Check if share reward was already claimed
  const existing = db.prepare(
    "SELECT id FROM points_ledger WHERE user_id = ? AND reason = 'share'"
  ).get(userId);

  if (existing) {
    return {
      ok: false,
      balance: user.points_balance,
      pointsAwarded: 0,
      message: 'تم الحصول على مكافأة المشاركة مسبقاً.',
    };
  }

  const pts = 40;
  const newBal = user.points_balance + pts;
  const now = new Date().toISOString();
  const idempKey = `share_${userId}`;

  // Atomic Update
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE users SET points_balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, userId);
    db.prepare(`
      INSERT INTO points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, idempotency_key, created_at)
      VALUES (?, ?, ?, 'share', 'app_share', 'app_share_bonus', ?, ?)
    `).run(userId, pts, newBal, idempKey, now);
    db.exec('COMMIT;');

    return {
      ok: true,
      balance: newBal,
      pointsAwarded: pts,
      message: 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق بنجاح.',
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function dbRecordVisit(
  userId: string,
  placeId: string,
  lat: number,
  lon: number,
  distanceM?: number | null
): { ok: boolean; balance: number; pointsAwarded: number; message: string } {
  const db = getLocalDb();
  const user = dbFindUserById(userId);
  if (!user || user.status !== 'active') {
    return { ok: false, balance: 0, pointsAwarded: 0, message: 'الحساب غير موجود أو معطل.' };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Check daily visit constraint (1 visit per place per day)
  const existingVisit = db.prepare(
    'SELECT id FROM visits WHERE user_id = ? AND place_id = ? AND visit_day = ?'
  ).get(userId, placeId, today);

  if (existingVisit) {
    return {
      ok: false,
      balance: user.points_balance,
      pointsAwarded: 0,
      message: 'لقد سجلت زيارتك لهذا المكان اليوم بالفعل.',
    };
  }

  const pts = 20;
  const newBal = user.points_balance + pts;
  const now = new Date().toISOString();
  const idempKey = `visit_${userId}_${placeId}_${today}`;

  // Atomic Update
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO visits (user_id, place_id, points_awarded, latitude, longitude, distance_m, visit_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, placeId, pts, lat, lon, distanceM || null, today, now);

    db.prepare('UPDATE users SET points_balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, userId);

    db.prepare(`
      INSERT INTO points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, idempotency_key, created_at)
      VALUES (?, ?, ?, 'visit', 'place', ?, ?, ?)
    `).run(userId, pts, newBal, placeId, idempKey, now);

    db.exec('COMMIT;');

    return {
      ok: true,
      balance: newBal,
      pointsAwarded: pts,
      message: `مبروك! تم تسجيل حضورك بنجاح وحصلت على +${pts} نقطة 🎉`,
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function dbInsertPartnerApplication(app: {
  userId: string;
  businessName: string;
  areaAr: string;
  phone: string;
  discount: number;
  commission: number;
  notes?: string;
}): void {
  const db = getLocalDb();
  db.prepare(`
    INSERT INTO partner_applications (
      user_id, business_name, area_ar, phone, proposed_discount_percent, proposed_commission_amount, promo_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    app.userId,
    app.businessName,
    app.areaAr,
    app.phone,
    app.discount,
    app.commission,
    app.notes || '',
    new Date().toISOString()
  );
}
