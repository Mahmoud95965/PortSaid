-- =====================================================================
-- Port Said Hub | تحديث 9 — شغّله مرة واحدة بس من phpMyAdmin > Import
-- بعد كل الملفات القديمة (01 ... 19).
-- بيعمل:
--   1) إشعار شخصي لمستخدم واحد بس (للترحيب بعد التوثيق) بجانب الإشعار العام.
--   2) توثيق الطلاب: رفع صورة الكارنيه + مراجعة الأدمن.
--   3) توثيق التجار: السجل التجاري + الرقم الضريبي + نشاط "أخرى".
--   4) علامة "تم التحقق" عامة على حساب المستخدم.
--   5) استكشف بورسعيد: رفع صورة حقيقي من الأدمن (مش لازم FTP) + وصف أطول.
-- =====================================================================
SET NAMES utf8mb4;

-- 1) إشعار شخصي (NULL = للكل زي الأول، رقم = للمستخدم ده بس)
ALTER TABLE notifications
  ADD COLUMN target_user_id BIGINT UNSIGNED NULL AFTER place_id,
  ADD KEY ix_notif_target (target_user_id, deleted_at, id);

-- 2) علامة "تم التحقق" على الحساب (طالب موثّق أو تاجر موثّق)
ALTER TABLE users
  ADD COLUMN verified_at DATETIME NULL AFTER status;

-- 3) توثيق الطلاب (صورة الكارنيه)
CREATE TABLE IF NOT EXISTS id_verifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid        CHAR(36)        NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  img_b64     MEDIUMTEXT      NOT NULL,                 -- صورة الكارنيه
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_note  VARCHAR(500)    NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_idver_uuid (uuid),
  UNIQUE KEY uq_idver_user (user_id),
  KEY ix_idver_status (status, id),
  CONSTRAINT fk_idver_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) توثيق التجار: مستندات إضافية على نفس طلب الانضمام
ALTER TABLE partner_applications
  ADD COLUMN commercial_registry_img MEDIUMTEXT NULL AFTER promo_notes,
  ADD COLUMN tax_number VARCHAR(30) NULL AFTER commercial_registry_img,
  ADD COLUMN business_type_other VARCHAR(100) NULL AFTER category_id,
  MODIFY COLUMN category_id TINYINT UNSIGNED NULL;   -- NULL لما النشاط "أخرى" (business_type_other بيوصفه)

-- 5) استكشف بورسعيد: رفع حقيقي للصور (مخزّنة في القاعدة) + وصف أطول لمقالات التاريخ والمعالم
ALTER TABLE explore_items
  MODIFY COLUMN file_name VARCHAR(160) NULL,
  MODIFY COLUMN description_ar VARCHAR(4000) NULL,
  ADD COLUMN img_b64 MEDIUMTEXT NULL AFTER file_name;
