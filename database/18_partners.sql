-- ========================================================================
-- 18_partners.sql — طلبات انضمام الشركاء (التجار): "سجل متجرك"
-- شغّل هذا الملف مرة واحدة من phpMyAdmin بعد كل ملفات المigration السابقة.
-- ========================================================================

CREATE TABLE IF NOT EXISTS partner_applications (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                        CHAR(36)     NOT NULL,
  user_id                     BIGINT UNSIGNED NOT NULL,            -- حساب التاجر (role = merchant)
  business_name               VARCHAR(150) NOT NULL,
  category_id                 TINYINT UNSIGNED NULL,
  area_ar                     VARCHAR(100) NOT NULL,
  phone                       CHAR(11)     NOT NULL,
  proposed_discount_percent   TINYINT UNSIGNED NOT NULL DEFAULT 10, -- الخصم اللي هيديه المحل للعميل
  proposed_commission_amount  DECIMAL(8,2) NOT NULL DEFAULT 0,      -- العمولة لكل عميل لفريق Alpha (جنيه)
  promo_notes                 VARCHAR(500) NULL,                    -- أكواد / ملاحظات العرض
  status                      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_note                  VARCHAR(500) NULL,
  place_id                    BIGINT UNSIGNED NULL,                 -- المكان المرتبط بعد الموافقة والربط
  reviewed_by                 BIGINT UNSIGNED NULL,
  reviewed_at                 DATETIME NULL,
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_partner_apps_uuid (uuid),
  UNIQUE KEY uq_partner_apps_user (user_id),
  KEY ix_partner_apps_status (status),
  CONSTRAINT fk_partner_apps_user     FOREIGN KEY (user_id)     REFERENCES users (id)      ON DELETE CASCADE,
  CONSTRAINT fk_partner_apps_cat      FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_partner_apps_place    FOREIGN KEY (place_id)    REFERENCES places (id),
  CONSTRAINT fk_partner_apps_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
  CONSTRAINT chk_partner_apps_discount CHECK (proposed_discount_percent <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
