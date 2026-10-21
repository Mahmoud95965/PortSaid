-- الشكاوى والاقتراحات — اختياري: الكود بيعمل الجدول تلقائيًا أول مرة حد يبعت شكوى
CREATE TABLE IF NOT EXISTS feedback (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid       CHAR(36) NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  kind       ENUM('complaint','suggestion') NOT NULL,
  message    VARCHAR(1000) NOT NULL,
  status     ENUM('new','read','done') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feedback_uuid (uuid),
  KEY ix_feedback_status (status, id),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
