-- إضافة جدول إحصائيات الدخول على الأقسام والأماكن (لو قاعدتك مستوردة قبل التحديث ده؛ لو استوردت 01_schema.sql الجديد مش محتاجه).
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS usage_hits (            -- عدّادات يومية: كام مرة دخل المستخدمين على كل قسم/مكان (بدون بيانات شخصية)
  day  DATE NOT NULL,                               -- يوم القاهرة
  kind ENUM('section','place') NOT NULL,
  ref  VARCHAR(40) NOT NULL,                        -- كود القسم (food, fun, housing...) أو uuid المكان
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind, ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
