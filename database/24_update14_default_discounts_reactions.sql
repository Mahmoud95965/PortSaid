-- =====================================================================
-- Port Said Hub | تحديث 14 — شغّله مرة واحدة من phpMyAdmin > Import
--   1) خصم افتراضي 10% بتكلفة 50 نقطة على كل (مطاعم / كافيهات / حلويات / تسوق / رياضة)
--      اللي لسه ما عليهاش خصم. تقدر تغيّر القيم دي بعدين من تبويب الأماكن في الأدمن.
--   2) تفاعلات الصور (إيموشنات) في "ذكرياتك".
-- =====================================================================
SET NAMES utf8mb4;

INSERT INTO settings (k, v) VALUES ('default_discount_percent', '10') ON DUPLICATE KEY UPDATE k = k;
INSERT INTO settings (k, v) VALUES ('default_coupon_cost', '50') ON DUPLICATE KEY UPDATE k = k;

UPDATE places p JOIN categories c ON c.id = p.category_id
   SET p.discount_percent = 10, p.coupon_cost_points = IF(p.coupon_cost_points = 0, 50, p.coupon_cost_points)
 WHERE c.code IN ('food','cafe','sweets','shop','sport') AND p.discount_percent = 0 AND p.deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS explore_reactions (
  upload_id  INT UNSIGNED    NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  reaction   VARCHAR(10)     NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (upload_id, user_id),
  KEY ix_react_upload (upload_id, reaction),
  CONSTRAINT fk_react_upload FOREIGN KEY (upload_id) REFERENCES explore_uploads (id) ON DELETE CASCADE,
  CONSTRAINT fk_react_user   FOREIGN KEY (user_id)   REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
