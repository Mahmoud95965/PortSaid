-- =====================================================================
-- Port Said Hub | تحديث 15 — اختياري: الموقع بيضيف العمود ده لوحده أول ما يتطلب.
-- ممكن تشغّله بنفسك من phpMyAdmin. لو طلّع "Duplicate column" يبقى موجود.
-- =====================================================================
ALTER TABLE explore_uploads ADD COLUMN visibility ENUM('public','private') NOT NULL DEFAULT 'public' AFTER status;
