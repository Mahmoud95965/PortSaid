-- Port Said Hub | تحديث 16 أكتوبر: تعديلات الأماكن من Port_Said_Community.md + تصحيح «الضواحي» + نطاق تسجيل الزيارة
-- آمن للتشغيل أكتر من مرة. شغّله من phpMyAdmin > Import بعد 12 و13.
SET NAMES utf8mb4;

-- 1) أماكن جديدة في الملف (بتتضاف لو مش موجودة)
INSERT INTO places (uuid, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, checkin_radius_m, is_demo, status)
SELECT UUID(), (SELECT id FROM categories WHERE code='food'), 'مطاعم سورية أخرى', 'بورسعيد', 'نتائج بحث · اختر الأعلى تقييمًا من نتائج الخريطة', 31.265300, 32.301900, 0, 0, 50, 3.00, 150, 0, 'active' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM places WHERE name_ar = 'مطاعم سورية أخرى' AND deleted_at IS NULL);
INSERT INTO places (uuid, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, checkin_radius_m, is_demo, status)
SELECT UUID(), (SELECT id FROM categories WHERE code='food'), 'Golden Zone', 'بورسعيد', 'مكان · تفاصيله على الخريطة', 31.265300, 32.301900, 0, 0, 50, 3.00, 150, 0, 'active' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM places WHERE name_ar = 'Golden Zone' AND deleted_at IS NULL);
INSERT INTO places (uuid, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, checkin_radius_m, is_demo, status)
SELECT UUID(), (SELECT id FROM categories WHERE code='food'), 'فول وفلافل – بورسعيد', 'بورسعيد', 'يعرض كل محلات الفول والفلافل القريبة على الخريطة', 31.265300, 32.301900, 0, 0, 50, 3.00, 150, 0, 'active' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM places WHERE name_ar = 'فول وفلافل – بورسعيد' AND deleted_at IS NULL);
INSERT INTO places (uuid, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, checkin_radius_m, is_demo, status)
SELECT UUID(), (SELECT id FROM categories WHERE code='sweets'), 'محلات الكساتة – بورسعيد', 'بورسعيد', 'اختر الأعلى تقييمًا من الخريطة', 31.265300, 32.301900, 0, 0, 50, 3.00, 150, 0, 'active' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM places WHERE name_ar = 'محلات الكساتة – بورسعيد' AND deleted_at IS NULL);
INSERT INTO places (uuid, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, checkin_radius_m, is_demo, status)
SELECT UUID(), (SELECT id FROM categories WHERE code='sweets'), 'محلات الكساتة – بورفؤاد', 'بورفؤاد', 'اختر الأعلى تقييمًا من الخريطة', 31.265300, 32.301900, 0, 0, 50, 3.00, 150, 0, 'active' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM places WHERE name_ar = 'محلات الكساتة – بورفؤاد' AND deleted_at IS NULL);

-- 2) تعديلات على أماكن موجودة
UPDATE places SET discount_percent = 10 WHERE name_ar = 'مجمع الجراج' AND discount_percent = 0;
UPDATE places SET latitude = 31.245417, longitude = 32.332740, checkin_radius_m = 150 WHERE name_ar = 'Rankers Espresso';  -- إحداثيات من رابط الخريطة في الملف
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', '75 الجمهورية') WHERE name_ar = 'Coffeeshop Company' AND (description_ar IS NULL OR description_ar NOT LIKE '%75 الجمهورية%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'داخل Grand Albatros') WHERE name_ar = 'Grand Gym' AND (description_ar IS NULL OR description_ar NOT LIKE '%داخل Grand Albatros%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'نادي رمسيس') WHERE name_ar = 'Station Gym' AND (description_ar IS NULL OR description_ar NOT LIKE '%نادي رمسيس%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'شارع أحمد خلاف') WHERE name_ar = 'CrossFit Proactive' AND (description_ar IS NULL OR description_ar NOT LIKE '%شارع أحمد خلاف%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', '2 شارع الجمهورية') WHERE name_ar = 'El Amrikeya Gym' AND (description_ar IS NULL OR description_ar NOT LIKE '%2 شارع الجمهورية%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'أبراج محمد علي') WHERE name_ar = 'Tabarak Gym' AND (description_ar IS NULL OR description_ar NOT LIKE '%أبراج محمد علي%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'الزهور') WHERE name_ar = 'مركز التنمية الشبابية بالزهور' AND (description_ar IS NULL OR description_ar NOT LIKE '%الزهور%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'بجوار مسجد أوطه') WHERE name_ar = 'فندق بدر' AND (description_ar IS NULL OR description_ar NOT LIKE '%بجوار مسجد أوطه%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'قرب الفنار') WHERE name_ar = 'De la Poste' AND (description_ar IS NULL OR description_ar NOT LIKE '%قرب الفنار%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'منتجع هلنان') WHERE name_ar = 'Carrefour بورفؤاد' AND (description_ar IS NULL OR description_ar NOT LIKE '%منتجع هلنان%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'مدخل القناة') WHERE name_ar = 'قاعدة تمثال ديليسبس' AND (description_ar IS NULL OR description_ar NOT LIKE '%مدخل القناة%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'مدخل القناة') WHERE name_ar = 'ساحة مصر' AND (description_ar IS NULL OR description_ar NOT LIKE '%مدخل القناة%');
UPDATE places SET description_ar = CONCAT(COALESCE(description_ar,''), ' · ', 'الشاطئ') WHERE name_ar = 'ستايل سكوير' AND (description_ar IS NULL OR description_ar NOT LIKE '%الشاطئ%');

-- 3) نطاق تسجيل الزيارة: بدل 30 كم (القيمة المؤقتة) نخليه نطاق منطقي. الأماكن الواسعة نطاقها أكبر.
UPDATE places SET checkin_radius_m = 150 WHERE checkin_radius_m > 500;
UPDATE places SET checkin_radius_m = 500 WHERE name_ar = 'كورنيش بورسعيد';
UPDATE places SET checkin_radius_m = 500 WHERE name_ar = 'شاطئ بورسعيد';
UPDATE places SET checkin_radius_m = 400 WHERE name_ar = 'شارع طرح البحر';
UPDATE places SET checkin_radius_m = 500 WHERE name_ar = 'مدينة بورفؤاد';
UPDATE places SET checkin_radius_m = 500 WHERE name_ar = 'جبال الملح';
UPDATE places SET checkin_radius_m = 500 WHERE name_ar = 'خط سير العائلة المقدسة';
UPDATE places SET checkin_radius_m = 300 WHERE name_ar = 'حديقة المنتزه';
UPDATE places SET checkin_radius_m = 250 WHERE name_ar = 'ستايل سكوير';

-- تنبيه مهم: أي مكان معلم/ترفيه إحداثياته لسه الافتراضية (31.2653, 32.3019) مش هيدّي نقاط لحد ما تحط إحداثياته الحقيقية من لوحة الأدمن > الأماكن.

-- 4) تصحيح الاسم: قسم الضواحي (مش النواحي)
UPDATE transport_lines SET details_ar = REPLACE(details_ar, 'قسم النواحي', 'قسم الضواحي') WHERE details_ar LIKE '%قسم النواحي%';
