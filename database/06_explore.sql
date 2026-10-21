-- إضافة جدول "استكشف بورسعيد" (لو قاعدتك مستوردة قبل التحديث ده؛ لو استوردت 01_schema.sql الجديد مش محتاجه).
SET NAMES utf8mb4;
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
