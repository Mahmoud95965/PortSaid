-- =====================================================================
-- Port Said Hub | Seed data v1.0 | شغّله بعد 01_schema.sql
-- =====================================================================
SET NAMES utf8mb4;

INSERT INTO roles (code, name_ar) VALUES ('user','مستخدم'),('merchant','محل'),('admin','أدمن');
INSERT INTO user_types (code, name_ar) VALUES ('student','طالب'),('visitor','سائح أو مغترب'),('local','من بورسعيد');
INSERT INTO categories (code, name_ar, icon, sort_order) VALUES
 ('fun','معالم وترفيه','fa-star',1),('food','مطاعم','fa-utensils',2),('cafe','كافيهات','fa-mug-hot',3),('sweets','حلويات','fa-ice-cream',4),('shop','تسوق','fa-bag-shopping',5),('sport','رياضة','fa-dumbbell',6),('housing','سكن (شقق)','fa-bed',7),('hotels','الأوتيلات والفنادق','fa-hotel',8);

-- الكليات والمدارس (القائمة مجمّعة من مصادر عامة وقابلة للتعديل: أضف/عطّل صفوفًا من phpMyAdmin)
INSERT INTO institutions (name_ar, kind, parent_ar, sort_order) VALUES
('كلية التجارة — جامعة بورسعيد','faculty','جامعة بورسعيد',1),
('كلية الآداب — جامعة بورسعيد','faculty','جامعة بورسعيد',2),
('كلية التربية — جامعة بورسعيد','faculty','جامعة بورسعيد',3),
('كلية العلوم — جامعة بورسعيد','faculty','جامعة بورسعيد',4),
('كلية الهندسة — جامعة بورسعيد','faculty','جامعة بورسعيد',5),
('كلية التربية الرياضية — جامعة بورسعيد','faculty','جامعة بورسعيد',6),
('كلية التربية النوعية — جامعة بورسعيد','faculty','جامعة بورسعيد',7),
('كلية الحقوق — جامعة بورسعيد','faculty','جامعة بورسعيد',8),
('كلية الطب البشري — جامعة بورسعيد','faculty','جامعة بورسعيد',9),
('كلية التمريض — جامعة بورسعيد','faculty','جامعة بورسعيد',10),
('كلية الصيدلة — جامعة بورسعيد','faculty','جامعة بورسعيد',11),
('كلية العلاج الطبيعي — جامعة بورسعيد','faculty','جامعة بورسعيد',12),
('كلية تكنولوجيا الإدارة ونظم المعلومات — جامعة بورسعيد','faculty','جامعة بورسعيد',13),
('كلية علوم الحاسب وتقنية المعلومات — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',14),
('كلية الطب البشري — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',15),
('كلية الهندسة — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',16),
('كلية الصيدلة — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',17),
('كلية العلوم الصحية التطبيقية — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',18),
('كلية علوم الأعمال — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',19),
('كلية طب الأسنان — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',20),
('كلية الآداب — جامعة شرق بورسعيد الأهلية','faculty','جامعة شرق بورسعيد الأهلية',21),
('مدرسة (مش في كلية)','school',NULL,22),
('كلية أخرى','other',NULL,23);

INSERT INTO governorates (name_ar, name_en) VALUES
('القاهرة','Cairo'),
('الجيزة','Giza'),
('الإسكندرية','Alexandria'),
('القليوبية','Qalyubia'),
('بورسعيد','Port Said'),
('السويس','Suez'),
('الدقهلية','Dakahlia'),
('الشرقية','Sharqia'),
('الغربية','Gharbia'),
('المنوفية','Monufia'),
('كفر الشيخ','Kafr El Sheikh'),
('البحيرة','Beheira'),
('دمياط','Damietta'),
('الإسماعيلية','Ismailia'),
('الفيوم','Faiyum'),
('بني سويف','Beni Suef'),
('المنيا','Minya'),
('أسيوط','Asyut'),
('سوهاج','Sohag'),
('قنا','Qena'),
('الأقصر','Luxor'),
('أسوان','Aswan'),
('البحر الأحمر','Red Sea'),
('الوادي الجديد','New Valley'),
('مطروح','Matrouh'),
('شمال سيناء','North Sinai'),
('جنوب سيناء','South Sinai');

INSERT INTO settings (k, v) VALUES
 ('visit_requires_location','0'),   -- 1 = لازم تكون جنب المكان لتسجيل الزيارة (فعّلها بعد ضبط الإحداثيات الحقيقية)
 ('coupon_validity_hours','3'),
 ('max_login_failures','5'),
 ('lockout_minutes','15');

-- الأدمن الافتراضي: بدون كلمة مرور ('!' = غير مفعّل). فعّله من /admin/ بكود الإعداد (app.setup_token).
INSERT INTO users (uuid, name, email, password_hash, role_id, must_change_password)
SELECT UUID(), 'Alpha Team Admin', 'admin@pscommunity.local', '!', id, 1 FROM roles WHERE code = 'admin';

-- أماكن تجريبية (أمثلة): عدّلها أو احذفها من لوحة الأدمن. الإحداثيات تقريبية.
INSERT INTO places (uuid, category_id, name_ar, area_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, is_demo)
SELECT UUID(), c.id, v.n, v.a, v.la, v.lo, v.p, 10, 50, 3.00, 1 FROM categories c JOIN (
 SELECT 'fun' AS cat, 'رحلة المعدية (مثال)' AS n, 'الكورنيش' AS a, 31.265300 AS la, 32.301900 AS lo, 80 AS p UNION ALL
 SELECT 'fun','منطقة الفنار (مثال)','الميناء',31.259800,32.302900,50 UNION ALL
 SELECT 'food','مطعم أسماك (مثال)','وسط البلد',31.261000,32.299000,40 UNION ALL
 SELECT 'food','مطعم أكل شعبي (مثال)','الشرق',31.270000,32.290000,40 UNION ALL
 SELECT 'cafe','كافيه الكورنيش (مثال)','الكورنيش',31.264000,32.300000,30 UNION ALL
 SELECT 'cafe','كافيه وسط البلد (مثال)','وسط البلد',31.257500,32.286000,30
) v ON v.cat COLLATE utf8mb4_unicode_ci = c.code;

INSERT INTO place_routes (place_id, step_no, instruction_ar)
SELECT id, 1, 'اركب خط [رقم] من [نقطة البداية] إلى [النزول]' FROM places WHERE is_demo = 1;
INSERT INTO place_routes (place_id, step_no, instruction_ar)
SELECT id, 2, 'ثم خط [رقم] لحد [المكان]' FROM places WHERE is_demo = 1;

INSERT INTO transport_lines (kind, name_ar, details_ar, sort_order) VALUES
 ('ferry','المعدية: بورسعيد ⇄ بورفؤاد','المواعيد والسعر هتتضاف',1),
 ('minibus','خطوط الميكروباص','خط [رقم] · من [نقطة البداية] إلى [النزول]',2),
 ('bus','خطوط الأتوبيس','خط [رقم] · من [نقطة البداية] إلى [النزول]',3);
