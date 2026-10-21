-- =====================================================================
-- Port Said Hub | Schema v1.0  (MySQL 5.7+ / MariaDB 10.3+)  | Alpha Team
-- طريقة التشغيل: phpMyAdmin > اختر قاعدة البيانات > Import > 01 ثم 02
-- ملاحظة: على InfinityFree لا تنفّذ CREATE DATABASE؛ أنشئ القاعدة من لوحة التحكم أولًا.
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- جداول مرجعية (Lookup): قابلة للتوسع بإضافة صفوف بدل تعديل الكود ----------
CREATE TABLE IF NOT EXISTS roles (
  id        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code      VARCHAR(20)  NOT NULL,
  name_ar   VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_types (
  id        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code      VARCHAR(20)  NOT NULL,
  name_ar   VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_types_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS governorates (
  id        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_ar   VARCHAR(50) NOT NULL,
  name_en   VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gov_name_ar (name_ar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS institutions (          -- كليات بورسعيد + خيار المدرسة (لمن نوعه "طالب")
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_ar     VARCHAR(120) NOT NULL,
  kind        ENUM('faculty','school','other') NOT NULL DEFAULT 'faculty',
  parent_ar   VARCHAR(80) NULL,                   -- اسم الجامعة
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inst_name (name_ar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20) NOT NULL,
  name_ar     VARCHAR(60) NOT NULL,
  icon        VARCHAR(40) NOT NULL DEFAULT 'fa-location-dot',
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- المستخدمون ----------
CREATE TABLE IF NOT EXISTS users (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                 CHAR(36)     NOT NULL,                 -- المعرّف الخارجي (لا نكشف id التسلسلي)
  name                 VARCHAR(100) NOT NULL,
  email                VARCHAR(190) NULL,                     -- اختياري، يُخزَّن lowercase (UNIQUE يسمح بتعدد NULL)
  phone                CHAR(11) NULL,                         -- موبايل مصري 11 رقم (01xxxxxxxxx)
  email_verified_at    DATETIME NULL,
  password_hash        VARCHAR(255) NOT NULL,                 -- Argon2id/bcrypt (أو '!' = غير مفعّل)
  gender               ENUM('male','female') NULL,
  user_type_id         TINYINT UNSIGNED NULL,
  governorate_id       TINYINT UNSIGNED NULL,
  institution_id       SMALLINT UNSIGNED NULL,                -- الكلية/المدرسة (للطلاب فقط)
  role_id              TINYINT UNSIGNED NOT NULL,
  points_balance       INT UNSIGNED NOT NULL DEFAULT 0,       -- رصيد مُجمَّع؛ المصدر الأصلي هو points_ledger
  status               ENUM('active','suspended') NOT NULL DEFAULT 'active',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  failed_logins        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until         DATETIME NULL,
  last_login_at        DATETIME NULL,
  last_login_ip        VARBINARY(16) NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           DATETIME NULL,                         -- Soft delete
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_uuid (uuid),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY ix_users_role (role_id),
  KEY ix_users_status (status),
  KEY ix_users_created (created_at),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id),
  CONSTRAINT fk_users_type FOREIGN KEY (user_type_id) REFERENCES user_types (id),
  CONSTRAINT fk_users_gov  FOREIGN KEY (governorate_id) REFERENCES governorates (id),
  CONSTRAINT fk_users_inst FOREIGN KEY (institution_id) REFERENCES institutions (id),
  CONSTRAINT chk_users_phone CHECK (phone IS NULL OR phone REGEXP '^01[0-9]{9}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- الأماكن والمواصلات ----------
CREATE TABLE IF NOT EXISTS places (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36)     NOT NULL,
  category_id         TINYINT UNSIGNED NOT NULL,
  name_ar             VARCHAR(150) NOT NULL,
  area_ar             VARCHAR(100) NOT NULL,
  description_ar      TEXT NULL,
  latitude            DECIMAL(9,6) NOT NULL,
  longitude           DECIMAL(9,6) NOT NULL,
  visit_points        SMALLINT UNSIGNED NOT NULL DEFAULT 30,   -- نقاط تسجيل الزيارة
  discount_percent    TINYINT UNSIGNED NOT NULL DEFAULT 10,
  coupon_cost_points  SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  commission_amount   DECIMAL(8,2) NOT NULL DEFAULT 3.00,      -- عمولة لكل عميل (جنيه)
  checkin_radius_m    SMALLINT UNSIGNED NOT NULL DEFAULT 300,
  is_demo             TINYINT(1) NOT NULL DEFAULT 0,           -- بيانات تجريبية
  status              ENUM('draft','active','hidden') NOT NULL DEFAULT 'active',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_places_uuid (uuid),
  KEY ix_places_cat_status (category_id, status),
  KEY ix_places_geo (latitude, longitude),
  CONSTRAINT fk_places_cat FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT chk_places_discount CHECK (discount_percent <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS place_routes (          -- خطوات "أروح إزاي؟"
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  place_id       BIGINT UNSIGNED NOT NULL,
  step_no        TINYINT UNSIGNED NOT NULL,
  instruction_ar VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_route_step (place_id, step_no),
  CONSTRAINT fk_routes_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transport_lines (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind        ENUM('ferry','minibus','bus','taxi','other') NOT NULL DEFAULT 'other',
  name_ar     VARCHAR(150) NOT NULL,
  details_ar  VARCHAR(255) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS place_staff (           -- ربط حسابات المحلات (merchant) بأماكنها
  user_id   BIGINT UNSIGNED NOT NULL,
  place_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, place_id),
  CONSTRAINT fk_staff_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE,
  CONSTRAINT fk_staff_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- الزيارات والنقاط (Ledger غير قابل للتعديل: يُضاف إليه فقط) ----------
CREATE TABLE IF NOT EXISTS visits (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  place_id          BIGINT UNSIGNED NOT NULL,
  points_awarded    SMALLINT UNSIGNED NOT NULL,
  latitude          DECIMAL(9,6) NULL,
  longitude         DECIMAL(9,6) NULL,
  distance_m        INT UNSIGNED NULL,
  location_verified TINYINT(1) NOT NULL DEFAULT 0,
  visit_day         DATE NOT NULL,                  -- يوم القاهرة؛ يمنع تكرار الزيارة في نفس اليوم
  visited_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_visit_day (user_id, place_id, visit_day),
  KEY ix_visits_place (place_id, visited_at),
  CONSTRAINT fk_visits_user  FOREIGN KEY (user_id)  REFERENCES users (id),
  CONSTRAINT fk_visits_place FOREIGN KEY (place_id) REFERENCES places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS points_ledger (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  delta         INT NOT NULL,                        -- موجب = كسب، سالب = صرف
  balance_after INT UNSIGNED NOT NULL,
  reason        ENUM('visit','coupon','admin_adjust','refund') NOT NULL,
  ref_type      VARCHAR(30) NULL,
  ref_id        BIGINT UNSIGNED NULL,
  note          VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_ledger_user (user_id, id),
  CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- الكوبونات (QR) والعمولات ----------
CREATE TABLE IF NOT EXISTS coupons (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid             CHAR(36) NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  place_id         BIGINT UNSIGNED NOT NULL,
  points_cost      SMALLINT UNSIGNED NOT NULL,       -- لقطة وقت الإصدار (Snapshot)
  discount_percent TINYINT UNSIGNED NOT NULL,
  status           ENUM('active','redeemed','expired','cancelled') NOT NULL DEFAULT 'active',
  expires_at       DATETIME NOT NULL,
  redeemed_at      DATETIME NULL,
  redeemed_by      BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_uuid (uuid),
  KEY ix_coupons_user_place (user_id, place_id, status),
  KEY ix_coupons_status_exp (status, expires_at),
  CONSTRAINT fk_coupons_user  FOREIGN KEY (user_id)     REFERENCES users (id),
  CONSTRAINT fk_coupons_place FOREIGN KEY (place_id)    REFERENCES places (id),
  CONSTRAINT fk_coupons_by    FOREIGN KEY (redeemed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  coupon_id  BIGINT UNSIGNED NOT NULL,
  place_id   BIGINT UNSIGNED NOT NULL,
  amount     DECIMAL(8,2) NOT NULL,
  status     ENUM('pending','invoiced','paid') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_commission_coupon (coupon_id),       -- عمولة واحدة فقط لكل كوبون
  KEY ix_commission_place (place_id, status),
  CONSTRAINT fk_comm_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id),
  CONSTRAINT fk_comm_place  FOREIGN KEY (place_id)  REFERENCES places (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- الأمان والتشغيل ----------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     CHAR(64) NOT NULL,                      -- SHA-256 للمفتاح (لا نخزّن IP/إيميل خام)
  hits       INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (bucket),
  KEY ix_rate_exp (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id    BIGINT UNSIGNED NULL,
  action      VARCHAR(60) NOT NULL,
  entity_type VARCHAR(40) NULL,
  entity_id   BIGINT UNSIGNED NULL,
  ip          VARBINARY(16) NULL,
  user_agent  VARCHAR(255) NULL,
  meta        TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_actor (actor_id, id),
  KEY ix_audit_action (action, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  k          VARCHAR(60) NOT NULL,
  v          VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (k)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------- استكشف بورسعيد ----------
CREATE TABLE IF NOT EXISTS explore_items (          -- "استكشف بورسعيد": صور وفيديوهات (الملفات نفسها في htdocs/assets/explore/)
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid           CHAR(36)     NOT NULL,
  kind           ENUM('image','video') NOT NULL,
  title_ar       VARCHAR(150) NOT NULL,
  description_ar VARCHAR(1000) NULL,
  file_name      VARCHAR(160) NOT NULL,
  sort_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_explore_uuid (uuid),
  KEY ix_explore_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- إحصائيات الاستخدام ----------
CREATE TABLE IF NOT EXISTS usage_hits (            -- عدّادات يومية: كام مرة دخل المستخدمين على كل قسم/مكان (بدون بيانات شخصية)
  day  DATE NOT NULL,                               -- يوم القاهرة
  kind ENUM('section','place') NOT NULL,
  ref  VARCHAR(40) NOT NULL,                        -- كود القسم (food, fun, housing...) أو uuid المكان
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind, ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- صور الزوار ----------
CREATE TABLE IF NOT EXISTS explore_uploads (          -- صور الزوار في "أهم اللقطات" (تظهر بعد موافقة الأدمن)
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid       CHAR(36)     NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  file_name  VARCHAR(80)  NOT NULL,                  -- u_xxxx.jpg داخل htdocs/assets/explore/users/
  caption    VARCHAR(100) NULL,
  status     ENUM('pending','approved') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_upl_uuid (uuid),
  KEY ix_upl_status (status, id),
  KEY ix_upl_user (user_id),
  CONSTRAINT fk_upl_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
