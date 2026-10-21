-- =====================================================================
-- Port Said Hub | تجهيز حساب الأدمن + تصفير محاولات الحظر
-- شغّله مرة واحدة من phpMyAdmin (Import أو تبويب SQL) بعد 01_schema.sql و 02_seed.sql
-- الدخول:  admin@pscommunity.local   (كلمة المرور اللي حددها المالك — غيّرها بعد أول دخول)
-- ملاحظة: بعد ترقية 09 الحساب ده بقى بدور "مالك" (owner). شغّل 09 قبل الملف ده.
-- =====================================================================
SET NAMES utf8mb4;

UPDATE users
   SET email = 'admin@pscommunity.local', password_hash = '$2b$12$Uv1X/.uUegszSLBZpoEg1uqPUvEjXCPq.l5N4IbppaminCInGihzG',
       must_change_password = 0, status = 'active', failed_logins = 0, locked_until = NULL, deleted_at = NULL
 WHERE role_id = (SELECT id FROM roles WHERE code = 'owner')
 ORDER BY id LIMIT 1;

-- لو مفيش صف أدمن أصلًا (القاعدة اتعملت بدون seed كامل) أنشئه:
INSERT INTO users (uuid, name, email, password_hash, role_id, must_change_password)
SELECT UUID(), 'Alpha Team Admin', 'admin@pscommunity.local', '$2b$12$Uv1X/.uUegszSLBZpoEg1uqPUvEjXCPq.l5N4IbppaminCInGihzG', r.id, 0 FROM roles r
 WHERE r.code = 'owner' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role_id = r.id);

-- تصفير عدّادات الحظر (حد التسجيل 5 مرات/ساعة لكل IP وحد الدخول)
DELETE FROM rate_limits;

SELECT id, name, email, status, must_change_password FROM users WHERE role_id = (SELECT id FROM roles WHERE code='owner');
