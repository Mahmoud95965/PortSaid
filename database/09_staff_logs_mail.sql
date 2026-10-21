-- =====================================================================
-- Port Said Hub | ترقية 09: المالك + صلاحيات الأدمن + السجل الشامل + البريد + الصور الشخصية
-- شغّله مرة واحدة فقط من phpMyAdmin (تبويب SQL أو Import) بعد 01 و 02 (وبعد أي ملفات 03..08 لقاعدتك).
-- ملاحظة: كل أدمن موجود حاليًا بيتحوّل لـ "مالك" (لأن الأدمن القديم كان بيملك كل الصلاحيات).
-- =====================================================================
SET NAMES utf8mb4;

-- 1) دور المالك (owner). الأدمن (admin) بقى دور محدود الصلاحيات حسب ما يمنحه المالك.
INSERT IGNORE INTO roles (code, name_ar) VALUES ('owner', 'مالك');
UPDATE users SET role_id = (SELECT id FROM (SELECT id FROM roles WHERE code = 'owner') x)
 WHERE role_id = (SELECT id FROM (SELECT id FROM roles WHERE code = 'admin') y);

-- 2) أعمدة جديدة في users: الصورة الشخصية + سبب/وقت/صاحب تعطيل الحساب
ALTER TABLE users
  ADD COLUMN avatar          VARCHAR(60)  NULL AFTER institution_id,
  ADD COLUMN disabled_reason VARCHAR(255) NULL AFTER status,
  ADD COLUMN disabled_at     DATETIME     NULL AFTER disabled_reason,
  ADD COLUMN disabled_by     BIGINT UNSIGNED NULL AFTER disabled_at;

-- 3) صلاحيات الأدمن التفصيلية (المالك لا يحتاج صفوف: عنده كل شيء دائمًا)
CREATE TABLE IF NOT EXISTS admin_permissions (
  user_id    BIGINT UNSIGNED NOT NULL,
  perm       VARCHAR(40)     NOT NULL,
  granted_by BIGINT UNSIGNED NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, perm),
  CONSTRAINT fk_perm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) توكنات توثيق البريد (نخزّن SHA-256 للتوكن فقط، مش التوكن نفسه)
CREATE TABLE IF NOT EXISTS email_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  email      VARCHAR(190)    NOT NULL,
  token_hash CHAR(64)        NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_emailtok_hash (token_hash),
  KEY ix_emailtok_user (user_id),
  CONSTRAINT fk_emailtok_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) سجل الموقع الشامل (كاميرا المراقبة): مفيش FK ولا ON DELETE عشان يفضل حتى بعد حذف الحساب،
--    وبيحتفظ بلقطة من اسم ودور الفاعل وقت الحدث. كل صف مرتبط بسابقه بـ hash (سلسلة) لكشف أي تلاعب.
CREATE TABLE IF NOT EXISTS activity_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id    BIGINT UNSIGNED NULL,
  actor_name  VARCHAR(100)    NOT NULL DEFAULT 'زائر',
  actor_role  VARCHAR(20)     NULL,
  tag         VARCHAR(40)     NOT NULL,
  severity    ENUM('info','notice','warning','critical') NOT NULL DEFAULT 'info',
  description VARCHAR(600)    NOT NULL,
  meta        TEXT            NULL,
  ip          VARBINARY(16)   NULL,
  user_agent  VARCHAR(255)    NULL,
  created_at  DATETIME        NOT NULL,
  prev_hash   CHAR(64)        NOT NULL,
  row_hash    CHAR(64)        NOT NULL,
  PRIMARY KEY (id),
  KEY ix_act_tag (tag, id),
  KEY ix_act_sev (severity, id),
  KEY ix_act_actor (actor_id, id),
  KEY ix_act_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) إعدادات جديدة
INSERT IGNORE INTO settings (k, v) VALUES
 ('email_verify_required', '0'),   -- 1 = لازم توثّق البريد قبل أول دخول (فعّلها بعد ما تتأكد إن الإرسال شغال)
 ('notify_login_email',   '1');    -- 1 = إشعار بالبريد عند الدخول من جهاز/شبكة جديدة (للأعضاء بريدهم موثّق)
