-- جلسات المستخدمين في MySQL (مطلوب لـ Vercel). الكود بينشئ الجدول تلقائيًا لو غير موجود، تشغيل الملف ده اختياري.
CREATE TABLE IF NOT EXISTS php_sessions (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  data MEDIUMBLOB NOT NULL,
  updated_at INT UNSIGNED NOT NULL,
  KEY idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
