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
import { MemoryPost, MemoryComment, HistoricalStory } from '@/types';

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

    CREATE TABLE IF NOT EXISTS community_memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT,
      image_url TEXT NOT NULL,
      caption TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(memory_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS memory_comments (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historical_stories (
      id TEXT PRIMARY KEY,
      title_ar TEXT NOT NULL,
      era_year TEXT,
      summary_ar TEXT NOT NULL,
      content_ar TEXT NOT NULL,
      image_url TEXT NOT NULL,
      additional_images TEXT,
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_idemp ON points_ledger(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_visits_user_day ON visits(user_id, place_id, visit_day);
    CREATE INDEX IF NOT EXISTS idx_memories_status ON community_memories(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_mem_likes_post ON memory_likes(memory_id);
    CREATE INDEX IF NOT EXISTS idx_mem_comments_post ON memory_comments(memory_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_hist_stories_sort ON historical_stories(sort_order);
  `);

  // Seed baseline accounts if database is fresh
  const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (!userCountRow || userCountRow.cnt === 0) {
    seedBaselineUsers(db);
  }

  const storyCountRow = db.prepare('SELECT COUNT(*) as cnt FROM historical_stories').get() as { cnt: number };
  if (!storyCountRow || storyCountRow.cnt === 0) {
    seedBaselineHistoricalStories(db);
  }

  const memoryCountRow = db.prepare('SELECT COUNT(*) as cnt FROM community_memories').get() as { cnt: number };
  if (!memoryCountRow || memoryCountRow.cnt === 0) {
    seedBaselineMemories(db);
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

export function dbGetUserLedger(userId: string): DbLedgerEntry[] {
  const db = getLocalDb();
  return db.prepare(`
    SELECT * FROM points_ledger 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 100
  `).all(userId) as DbLedgerEntry[];
}

export function dbRedeemCoupon(
  userId: string,
  placeId: string,
  pointsCost: number,
  placeName: string
): { ok: boolean; balance: number; message: string; couponCode?: string } {
  const db = getLocalDb();
  const user = dbFindUserById(userId);

  if (!user || user.status !== 'active') {
    return { ok: false, balance: 0, message: 'الحساب غير موجود أو معطل.' };
  }

  if (user.points_balance < pointsCost) {
    return {
      ok: false,
      balance: user.points_balance,
      message: `رصيد نقاطك (${user.points_balance}) لا يكفي لاستبدال هذا الكوبون (${pointsCost} نقطة مطلوبة).`,
    };
  }

  const newBal = user.points_balance - pointsCost;
  const now = new Date().toISOString();
  const couponCode = `HUB-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const idempKey = `redeem_${userId}_${placeId}_${Date.now()}`;

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE users SET points_balance = ?, updated_at = ? WHERE id = ?').run(newBal, now, userId);

    db.prepare(`
      INSERT INTO points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, idempotency_key, created_at)
      VALUES (?, ?, ?, ?, 'coupon_redemption', ?, ?, ?)
    `).run(
      userId,
      -pointsCost,
      newBal,
      `استبدال كوبون خصم في ${placeName}`,
      couponCode,
      idempKey,
      now
    );

    db.exec('COMMIT;');

    return {
      ok: true,
      balance: newBal,
      couponCode,
      message: `تم استبدال ${pointsCost} نقطة بنجاح والحصول على كوبون خصم في ${placeName} 🎉`,
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

function seedBaselineHistoricalStories(db: DatabaseSync) {
  const insertStory = db.prepare(`
    INSERT INTO historical_stories (
      id, title_ar, era_year, summary_ar, content_ar, image_url, additional_images, sort_order, is_published, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  const stories = [
    {
      id: 'story-1',
      title: 'تأسيس بورسعيد وضربة الفأس الأولى',
      era: '1859 م',
      summary: 'في 25 أبريل 1859 أطلق فرديناند ديليسبس إشارة البدء بحفر قناة السويس عند النقطة التي تحولت إلى بورسعيد، تيمناً بوالي مصر محمد سعيد باشا.',
      content: 'بدأت قصة بورسعيد كشريط رملي ضيق يفصل البحر المتوسط عن بحيرة المنزلة. احتشد آلاف الفلاحين والعمال المصريين ليبدأوا أعظم ملحمة حفر في التاريخ الحديث؛ حفر قناة السويس بالجهد والعرق، لتولد مدينة عالمية ربطت بين الشرق والغرب وأصبحت بوابة الملاحة الدولية الأولى في العالم.',
      image: '/assets/port-said/hero-01.webp',
      additional: JSON.stringify(['/assets/port-said/port-said-port-night.webp']),
      order: 1,
    },
    {
      id: 'story-2',
      title: 'فنار بورسعيد التاريخي.. أول مبنى خرساني في العالم',
      era: '1869 م',
      summary: 'شُيّد عام 1869 وافتتح بالتزامن مع افتتاح قناة السويس، ويُعد أول مبنى شُيّد بالخرسانة المسلحة في العالم على يد المعماري فرانسوا كوانييه.',
      content: 'يعد فنار بورسعيد القديم معجزة هندسية وثقافية رائدة. يتميز بتصميمه الثماني الأضلاع وارتفاعه الشاهق الذي يبلغ حوالي 56 متراً، وكان مرشداً لكل سفن العالم العابرة لقناة السويس. يحمل الفنار قيمة معمارية فريدة جعلته مسجلاً ضمن الآثار الإسلامية والقبطية المصرية ومقصداً لعشاق التراث.',
      image: '/assets/port-said/port-said-lighthouse.webp',
      additional: JSON.stringify(['/assets/port-said/hero-01.webp']),
      order: 2,
    },
    {
      id: 'story-3',
      title: 'العمارة الكوزموبوليتانية وشرفات الخشب التاريخية',
      era: '1880 - 1930 م',
      summary: 'تميز حي الشرق (الحي الإفرنجي) بطراز معماري فريد يجمع بين النمط الفرنسي والإيطالي والشرفات الخشبية (Verandas) لمقاومة الرطوبة وتوفير الظل.',
      content: 'احتضنت بورسعيد في أواخر القرن التاسع عشر مجتمعاً متعدد الثقافات من فرنسيين وإيطاليين ويونانيين وبريطانيين عاشوا جنباً إلى جنب مع أهل المدينة في حي العرب. انعكس هذا التنوع على الهندسة المعمارية؛ مبانٍ متناسقة وأسقف خشبية وأروقة للمشاة تحمي من حرارة الصيف وأمطار الشتاء، مما جعل شوارع بورسعيد لوحة معمارية مفتوحة.',
      image: '/assets/port-said/gallery/balconies-street.webp',
      additional: JSON.stringify(['/assets/port-said/port-said-port-night.webp']),
      order: 3,
    },
    {
      id: 'story-4',
      title: 'ملحمة الصمود والعدوان الثلاثي.. المدينة الباسلة',
      era: '1956 م',
      summary: 'سطر أبناء بورسعيد وفدائيوها أعظم ملاحم المقاومة الشعبية ضد قوى العدوان الثلاثي، حتى أُجبرت القوات المعتدية على الجلاء في 23 ديسمبر 1956.',
      content: 'تحملت بورسعيد القصف والإنزال الجوي والبحري بشجاعة استثنائية. شكّل الأهالي والفدائيون مجموعات مقاومة سرية أربكت قيادات الغزاة وأسقطت ضباطهم وأسرت قادتهم، حتى أقر العالم ببسالة المدينة. أطلق عليها الرئيس جمال عبد الناصر لقب "المدينة الباسلة" وأصبح يوم 23 ديسمبر هو العيد القومي السنوي لمحافظة بورسعيد ومسلة النصر بميدان الشهداء تخليداً لهذه التضحيات.',
      image: '/assets/port-said/gallery/martyrs-square.webp',
      additional: JSON.stringify(['/assets/port-said/port-said-mosque.webp']),
      order: 4,
    },
    {
      id: 'story-5',
      title: 'بورسعيد المنطقة الحرة وعصر التجارة الذهبي',
      era: '1976 م',
      summary: 'أصدر الرئيس أنور السادات القانون رقم 12 لسنة 1976 بإعلان بورسعيد منطقة حرة تجارية، مما حولها إلى عاصمة التسوق والاستيراد لجميع المصريين.',
      content: 'تدفقت البضائع الأوروبية والماركات العالمية والملابس والمنسوجات على أسواق بورسعيد (الحميدي، البازار، والتجاري). أصبحت رحلة قطار بورسعيد أو السفر بالسيارة طقساً أساسياً لكل أسرة مصرية للتسوق وشراء مستلزمات العرائس والاستمتاع بأكلات السمك البورسعيدي الطازج.',
      image: '/assets/port-said/port-said-port-night.webp',
      additional: JSON.stringify(['/assets/port-said/hero-02.webp']),
      order: 5,
    },
    {
      id: 'story-6',
      title: 'حكاية المعدية التاريخية وقناة الاتصال وبورفؤاد',
      era: '1920 م - اليوم',
      summary: 'المعدية ليست مجرد وسيلة مواصلات بين قارتي إفريقيا وآسيا، بل هي روح بورسعيد الحية وصوت النوارس وطقوس إطعام الحمام والخبز في عرض القناة.',
      content: 'أنشئت مدينة بورفؤاد عام 1920 على الضفة الشرقية لقناة السويس لتكون مقراً لورش وفيلات هيئة قناة السويس. ارتبطت المدينتان برحلة المعدية المجانية التي تستغرق 10 دقائق تعبر خلالها بين قارتين وتلتقي بالسفن العالمية العملاقة، لتظل المعدية أيقونة وجدانية لكل من زار بورسعيد أو عاش فيها.',
      image: '/assets/port-said/gallery/ship.webp',
      additional: JSON.stringify(['/assets/port-said/hero-03.webp']),
      order: 6,
    },
  ];

  for (const s of stories) {
    try {
      insertStory.run(s.id, s.title, s.era, s.summary, s.content, s.image, s.additional, s.order, 1, now);
    } catch (e) {
      // ignore
    }
  }
}

function seedBaselineMemories(db: DatabaseSync) {
  const insertMemory = db.prepare(`
    INSERT INTO community_memories (
      id, user_id, user_name, user_avatar, image_url, caption, likes_count, comments_count, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  const memories = [
    {
      id: 'mem-1',
      userId: '00000000-0000-0000-0000-000000000002',
      userName: 'كريم محمود',
      userAvatar: null,
      imageUrl: '/assets/port-said/hero-01.webp',
      caption: 'غروب الشمس الساحر من ممشى ديليسبس السياحي.. ما فيش أجمل من هواء القناة في بورسعيد 🌅⚓',
      likes: 24,
      comments: 3,
    },
    {
      id: 'mem-2',
      userId: '00000000-0000-0000-0000-000000000001',
      userName: 'أحمد المصري',
      userAvatar: null,
      imageUrl: '/assets/port-said/gallery/ship.webp',
      caption: 'رحلة المعدية الصباحية وصوت النوارس.. عبور بين قارة إفريقيا وآسيا في دقائق 🕊️⛴️',
      likes: 42,
      comments: 5,
    },
    {
      id: 'mem-3',
      userId: '00000000-0000-0000-0000-000000000003',
      userName: 'سارة البورسعيدية',
      userAvatar: null,
      imageUrl: '/assets/port-said/gallery/balconies-street.webp',
      caption: 'جمال الشرفات الخشبية في حي الشرق، تاريخ لا ينتهي وتراث معماري أصيل في كل تفصيلة 🏛️✨',
      likes: 31,
      comments: 2,
    },
  ];

  for (const m of memories) {
    try {
      insertMemory.run(m.id, m.userId, m.userName, m.userAvatar, m.imageUrl, m.caption, m.likes, m.comments, 'approved', now);
    } catch (e) {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Community Memories API Helpers
// ---------------------------------------------------------------------------

export function dbGetMemories(currentUserId?: string): MemoryPost[] {
  const db = getLocalDb();
  const rows = db.prepare(`
    SELECT * FROM community_memories
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT 60
  `).all() as any[];

  return rows.map((r) => {
    let likedByMe = false;
    if (currentUserId) {
      const checkLike = db.prepare(`
        SELECT id FROM memory_likes WHERE memory_id = ? AND user_id = ?
      `).get(r.id, currentUserId);
      likedByMe = Boolean(checkLike);
    }

    return {
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name,
      user_avatar: r.user_avatar,
      image_url: r.image_url,
      caption: r.caption,
      likes_count: r.likes_count || 0,
      comments_count: r.comments_count || 0,
      liked_by_me: likedByMe,
      status: r.status,
      created_at: r.created_at,
    };
  });
}

export function dbGetAllMemoriesForAdmin(): MemoryPost[] {
  const db = getLocalDb();
  const rows = db.prepare(`
    SELECT * FROM community_memories
    ORDER BY created_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_name: r.user_name,
    user_avatar: r.user_avatar,
    image_url: r.image_url,
    caption: r.caption,
    likes_count: r.likes_count || 0,
    comments_count: r.comments_count || 0,
    status: r.status,
    created_at: r.created_at,
  }));
}

export function dbCreateMemory(post: {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  imageUrl: string;
  caption?: string | null;
}): MemoryPost {
  const db = getLocalDb();
  const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO community_memories (
      id, user_id, user_name, user_avatar, image_url, caption, likes_count, comments_count, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'approved', ?)
  `).run(id, post.userId, post.userName, post.userAvatar || null, post.imageUrl, post.caption || '', now);

  return {
    id,
    user_id: post.userId,
    user_name: post.userName,
    user_avatar: post.userAvatar || null,
    image_url: post.imageUrl,
    caption: post.caption || '',
    likes_count: 0,
    comments_count: 0,
    liked_by_me: false,
    status: 'approved',
    created_at: now,
  };
}

export function dbToggleMemoryLike(userId: string, memoryId: string): { liked: boolean; count: number } {
  const db = getLocalDb();
  const existing = db.prepare(`
    SELECT id FROM memory_likes WHERE memory_id = ? AND user_id = ?
  `).get(memoryId, userId) as any;

  db.exec('BEGIN TRANSACTION;');
  try {
    let liked = false;
    if (existing) {
      db.prepare(`DELETE FROM memory_likes WHERE id = ?`).run(existing.id);
      db.prepare(`UPDATE community_memories SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`).run(memoryId);
      liked = false;
    } else {
      db.prepare(`
        INSERT INTO memory_likes (memory_id, user_id, created_at) VALUES (?, ?, ?)
      `).run(memoryId, userId, new Date().toISOString());
      db.prepare(`UPDATE community_memories SET likes_count = likes_count + 1 WHERE id = ?`).run(memoryId);
      liked = true;
    }

    db.exec('COMMIT;');

    const row = db.prepare(`SELECT likes_count FROM community_memories WHERE id = ?`).get(memoryId) as any;
    return { liked, count: row?.likes_count || 0 };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function dbAddMemoryComment(comment: {
  memoryId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  comment: string;
}): MemoryComment {
  const db = getLocalDb();
  const id = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO memory_comments (id, memory_id, user_id, user_name, user_avatar, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, comment.memoryId, comment.userId, comment.userName, comment.userAvatar || null, comment.comment, now);

    db.prepare(`
      UPDATE community_memories SET comments_count = comments_count + 1 WHERE id = ?
    `).run(comment.memoryId);

    db.exec('COMMIT;');

    return {
      id,
      memory_id: comment.memoryId,
      user_id: comment.userId,
      user_name: comment.userName,
      user_avatar: comment.userAvatar || null,
      comment: comment.comment,
      created_at: now,
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function dbGetMemoryComments(memoryId: string): MemoryComment[] {
  const db = getLocalDb();
  return db.prepare(`
    SELECT * FROM memory_comments
    WHERE memory_id = ?
    ORDER BY created_at ASC
  `).all(memoryId) as MemoryComment[];
}

export function dbDeleteMemory(memoryId: string, requestingUserId: string, isStaff: boolean): boolean {
  const db = getLocalDb();
  const mem = db.prepare(`SELECT * FROM community_memories WHERE id = ?`).get(memoryId) as any;
  if (!mem) return false;

  if (mem.user_id !== requestingUserId && !isStaff) {
    return false;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`DELETE FROM memory_likes WHERE memory_id = ?`).run(memoryId);
    db.prepare(`DELETE FROM memory_comments WHERE memory_id = ?`).run(memoryId);
    db.prepare(`DELETE FROM community_memories WHERE id = ?`).run(memoryId);
    db.exec('COMMIT;');
    return true;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function dbUpdateMemoryStatus(memoryId: string, status: 'approved' | 'pending' | 'rejected'): boolean {
  const db = getLocalDb();
  const res = db.prepare(`
    UPDATE community_memories SET status = ? WHERE id = ?
  `).run(status, memoryId);
  return res.changes > 0;
}

// ---------------------------------------------------------------------------
// Historical Stories API Helpers
// ---------------------------------------------------------------------------

export function dbGetHistoricalStories(includeUnpublished = false): HistoricalStory[] {
  const db = getLocalDb();
  let query = 'SELECT * FROM historical_stories';
  if (!includeUnpublished) {
    query += ' WHERE is_published = 1';
  }
  query += ' ORDER BY sort_order ASC, created_at ASC';

  const rows = db.prepare(query).all() as any[];
  return rows.map((r) => {
    let addImgs: string[] = [];
    if (r.additional_images) {
      try {
        addImgs = JSON.parse(r.additional_images);
      } catch (e) {
        addImgs = [];
      }
    }
    return {
      id: r.id,
      title_ar: r.title_ar,
      era_year: r.era_year,
      summary_ar: r.summary_ar,
      content_ar: r.content_ar,
      image_url: r.image_url,
      additional_images: addImgs,
      sort_order: r.sort_order || 0,
      is_published: Boolean(r.is_published),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

export function dbSaveHistoricalStory(story: {
  id?: string;
  title_ar: string;
  era_year?: string | null;
  summary_ar: string;
  content_ar: string;
  image_url: string;
  additional_images?: string[];
  sort_order?: number;
  is_published?: boolean;
}): HistoricalStory {
  const db = getLocalDb();
  const now = new Date().toISOString();
  const addImgsJson = JSON.stringify(story.additional_images || []);
  const isPub = story.is_published !== false ? 1 : 0;
  const sortOrd = story.sort_order ?? 0;

  if (story.id) {
    db.prepare(`
      UPDATE historical_stories
      SET title_ar = ?, era_year = ?, summary_ar = ?, content_ar = ?, image_url = ?,
          additional_images = ?, sort_order = ?, is_published = ?, updated_at = ?
      WHERE id = ?
    `).run(
      story.title_ar,
      story.era_year || null,
      story.summary_ar,
      story.content_ar,
      story.image_url,
      addImgsJson,
      sortOrd,
      isPub,
      now,
      story.id
    );

    return {
      id: story.id,
      title_ar: story.title_ar,
      era_year: story.era_year || null,
      summary_ar: story.summary_ar,
      content_ar: story.content_ar,
      image_url: story.image_url,
      additional_images: story.additional_images || [],
      sort_order: sortOrd,
      is_published: Boolean(isPub),
      updated_at: now,
    };
  } else {
    const newId = `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO historical_stories (
        id, title_ar, era_year, summary_ar, content_ar, image_url, additional_images, sort_order, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      story.title_ar,
      story.era_year || null,
      story.summary_ar,
      story.content_ar,
      story.image_url,
      addImgsJson,
      sortOrd,
      isPub,
      now,
      now
    );

    return {
      id: newId,
      title_ar: story.title_ar,
      era_year: story.era_year || null,
      summary_ar: story.summary_ar,
      content_ar: story.content_ar,
      image_url: story.image_url,
      additional_images: story.additional_images || [],
      sort_order: sortOrd,
      is_published: Boolean(isPub),
      created_at: now,
      updated_at: now,
    };
  }
}

export function dbDeleteHistoricalStory(id: string): boolean {
  const db = getLocalDb();
  const res = db.prepare(`DELETE FROM historical_stories WHERE id = ?`).run(id);
  return res.changes > 0;
}

