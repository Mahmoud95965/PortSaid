-- جدول صور الزوار في "استكشف بورسعيد" (لو قاعدتك مستوردة قبل التحديث ده؛ لو استوردت 01_schema.sql الجديد مش محتاجه).
-- لقبول الصور تلقائي من غير مراجعة (مش مفضّل): INSERT INTO settings (k,v) VALUES ('explore_auto_approve','1') ON DUPLICATE KEY UPDATE v='1';
SET NAMES utf8mb4;
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
