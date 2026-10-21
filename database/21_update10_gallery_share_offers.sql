-- =====================================================================
-- Port Said Hub | تحديث 10 — شغّله مرة واحدة بس من phpMyAdmin > Import
-- بعد كل الملفات القديمة (01 ... 20). آمن لو اتشغّل أكتر من مرة.
-- بيعمل:
--   1) جدول "لمحات من بورسعيد" (الصور بتترفع من لوحة الأدمن).
--   2) نوع نقاط "share" (شير واكسب) + قيمة النقاط الافتراضية 40.
--   3) صورة اختيارية لكل عرض من عروض التاجر.
-- =====================================================================
SET NAMES utf8mb4;

-- 1) لمحات من بورسعيد
CREATE TABLE IF NOT EXISTS gallery_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid       CHAR(36)     NOT NULL,
  caption    VARCHAR(120) NULL,
  img_b64    MEDIUMTEXT   NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gallery_uuid (uuid),
  KEY ix_gallery_active (is_active, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) شير واكسب
ALTER TABLE points_ledger MODIFY reason ENUM('visit','coupon','admin_adjust','refund','share') NOT NULL;
INSERT INTO settings (k, v) VALUES ('share_points', '40') ON DUPLICATE KEY UPDATE k = k;

-- 3) صورة العرض (لو العمود موجود قبل كده هيطلع خطأ "Duplicate column" وده عادي، تجاهله)
ALTER TABLE place_offers ADD COLUMN img_b64 MEDIUMTEXT NULL AFTER body;
