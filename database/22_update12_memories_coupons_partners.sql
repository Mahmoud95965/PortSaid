-- =====================================================================
-- Port Said Hub | تحديث 12 — شغّله مرة واحدة من phpMyAdmin > Import
-- بعد الملفات القديمة (01 ... 21).
--   1) ذكرياتك: إضافة حالة "مرفوضة" لصور الزوار.
--   2) موقع المتجر (خط عرض/طول) في طلب التاجر، عشان المكان يتضاف تلقائيًا في الموقع الصح.
-- لو أي ALTER طلّع "Duplicate column" يبقى اتعمل قبل كده، تجاهله.
-- =====================================================================
SET NAMES utf8mb4;

ALTER TABLE explore_uploads MODIFY status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE partner_applications ADD COLUMN latitude DECIMAL(9,6) NULL AFTER area_ar;
ALTER TABLE partner_applications ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude;
