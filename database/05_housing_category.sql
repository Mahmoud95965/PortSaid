-- إضافة خانة "السكن" (لو قاعدتك مستوردة قبل التحديث ده؛ لو استوردت 02_seed.sql الجديد مش محتاجه).
SET NAMES utf8mb4;
INSERT INTO categories (code, name_ar, icon, sort_order)
SELECT 'housing', 'السكن', 'fa-bed', 4 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE code = 'housing');

-- أمثلة تجريبية للسكن (احذفها أو عدّلها من لوحة الأدمن /admin/ ← الأماكن، تصنيف "سكن").
-- المنطقة (area_ar) هي اللي بتظهر في اختيار "عايز السكن فين؟": حي الشرق، حي العرب، حي الضواحي، حي المناخ، حي الزهور، حي الجنوب، حي غرب، بورفؤاد.
INSERT INTO places (uuid, category_id, name_ar, area_ar, description_ar, latitude, longitude, visit_points, discount_percent, coupon_cost_points, commission_amount, is_demo)
SELECT UUID(), c.id, v.n, v.a, v.d, v.la, v.lo, 0, 0, 0, 0.00, 1
FROM categories c JOIN (
  SELECT 'سكن طلاب (مثال)' AS n, 'حي الشرق' AS a, 'سكن مناسب للطلاب، تفاصيل السعر والتواصل بتتضاف من الأدمن.' AS d, 31.270000 AS la, 32.290000 AS lo UNION ALL
  SELECT 'سكن طالبات (مثال)', 'حي الضواحي', 'سكن مناسب للطالبات، تفاصيل السعر والتواصل بتتضاف من الأدمن.', 31.250000, 32.310000
) v ON c.code = 'housing'
WHERE NOT EXISTS (SELECT 1 FROM places WHERE name_ar = v.n COLLATE utf8mb4_unicode_ci);
