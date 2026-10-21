-- =====================================================================
-- Port Said Hub | تحديث 8 (آمن للتشغيل أكتر من مرة)
-- شغّله من phpMyAdmin > Import بعد كل الملفات القديمة (01 ... 18).
-- بيعمل:
--   1) يشيل «الحي الإفرنجي» من الأماكن.
--   2) «السكن» بقى «سكن (شقق)» وفاضي (الواجهة بتعرض "المحتوى جاي قريب").
--   3) خانة جديدة «الأوتيلات والفنادق» وكل الفنادق اللي كانت تحت السكن اتنقلت لها.
--   4) جداول الإشعارات + منيو المحل + عروض التاجر.
-- =====================================================================
SET NAMES utf8mb4;

-- 1) الحي الإفرنجي: إزالة ناعمة (البيانات التاريخية تفضل)
UPDATE places SET status = 'hidden', deleted_at = UTC_TIMESTAMP()
 WHERE name_ar = 'الحي الإفرنجي' AND deleted_at IS NULL;

-- 2) السكن -> سكن (شقق)
UPDATE categories SET name_ar = 'سكن (شقق)' WHERE code = 'housing';

-- 3) خانة الأوتيلات والفنادق (تتعمل مرة واحدة) + نقل كل اللي كان تحت السكن ليها
INSERT INTO categories (code, name_ar, icon, sort_order)
SELECT 'hotels', 'الأوتيلات والفنادق', 'fa-hotel', 8 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE code = 'hotels');

UPDATE places
   SET category_id = (SELECT id FROM (SELECT id FROM categories WHERE code = 'hotels') h)
 WHERE category_id = (SELECT id FROM (SELECT id FROM categories WHERE code = 'housing') x)
   AND deleted_at IS NULL;

-- 3b) وصف خط الـ 5000 من غير «الإفرنج»
UPDATE transport_lines SET details_ar = REPLACE(details_ar, 'بيعدي على الإفرنج وحي العرب', 'بيعدي على حي العرب') WHERE details_ar LIKE '%الإفرنج%';

-- 4) الإشعارات: رسالة واحدة بتوصل لكل الحسابات، وحالة القراءة لكل مستخدم لوحده
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid       CHAR(36)        NOT NULL,
  kind       ENUM('admin','offer') NOT NULL DEFAULT 'admin',   -- admin = من الإدارة، offer = عرض من تاجر
  title      VARCHAR(120)    NOT NULL,
  body       VARCHAR(1000)   NOT NULL,
  place_id   BIGINT UNSIGNED NULL,                              -- للعروض: المكان صاحب العرض
  created_by BIGINT UNSIGNED NULL,
  expires_at DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notif_uuid (uuid),
  KEY ix_notif_list (deleted_at, id),
  KEY ix_notif_place (place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_reads (
  user_id         BIGINT UNSIGNED NOT NULL,
  notification_id BIGINT UNSIGNED NOT NULL,
  read_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notification_id),
  KEY ix_nr_notif (notification_id),
  CONSTRAINT fk_nr_user  FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE,
  CONSTRAINT fk_nr_notif FOREIGN KEY (notification_id) REFERENCES notifications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) منيو المحل (صور بتتخزن في القاعدة زي صور استكشف بورسعيد). المفتاح = حساب التاجر،
--    فيقدر يرفع قبل ما الإدارة تربطه بالمكان، والمنيو بيظهر للعميل أول ما المكان يتربط.
CREATE TABLE IF NOT EXISTS menu_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid       CHAR(36)        NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  caption    VARCHAR(80)     NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  img_b64    MEDIUMTEXT      NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_uuid (uuid),
  KEY ix_menu_user (user_id, sort_order, id),
  CONSTRAINT fk_menu_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) عروض التاجر (كل عرض بيتحوّل لإشعار بيوصل لكل العملاء)
CREATE TABLE IF NOT EXISTS place_offers (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid            CHAR(36)        NOT NULL,
  place_id        BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  notification_id BIGINT UNSIGNED NULL,
  title           VARCHAR(120)    NOT NULL,
  body            VARCHAR(500)    NOT NULL,
  expires_at      DATETIME        NOT NULL,
  status          ENUM('active','removed') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_offer_uuid (uuid),
  KEY ix_offer_place (place_id, status, expires_at),
  KEY ix_offer_user (user_id, id),
  CONSTRAINT fk_offer_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
  CONSTRAINT fk_offer_user  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
