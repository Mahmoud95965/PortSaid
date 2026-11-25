-- =============================================================================
-- Port Said Hub - Security Hardening (migration 14)
-- Date: 2026-11-25
-- Audit: live pg_policies dump (34 policies, all roles {public}) + anon-key
--        verification. Every change below is safe ONLY because
--        SUPABASE_SERVICE_ROLE_KEY is set on Vercel (verified 2026-11-25:
--        Production, updated Nov 22) — all server routes read/write through
--        getSupabaseServer(), which uses the service role and bypasses RLS
--        and column grants. Do NOT run this before confirming that key.
-- =============================================================================

-- 1. كلمة سرّ المستخدمين: إخفاء عمود password_hash عن المفتاح العام.
--    RLS لا يخفي الأعمدة، فالحل إلغاء الصلاحية على مستوى العمود.
--    تسجيل الدخول يقرأ الـ hash من الخادم فقط (service_role).
REVOKE SELECT (password_hash) ON public.users FROM anon, authenticated;

-- 2. سجل النشاط: للخادم فقط (التسجيل من login/google/register + قراءة المسؤول).
DROP POLICY IF EXISTS "Public insert activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Public select activity_log" ON public.activity_log;

-- 3. الزيارات: إلغاء القراءة العامة (سجل تحركات فيه إحداثيات) — للخادم فقط.
DROP POLICY IF EXISTS "Users can view visits" ON public.visits;

-- 4. سجل النقاط: إلغاء القراءة العامة (سجل كل مستخدم) — للخادم فقط
--    (مسار /api/rewards/ledger يصفّي حسب الجلسة).
DROP POLICY IF EXISTS "Users can view points ledger" ON public.points_ledger;

-- 5. الكوبونات: لا كود يستخدم الجدول — إلغاء الصلاحية العامة الكاملة.
DROP POLICY IF EXISTS "Users can view and manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can manage coupons" ON public.coupons;

-- 6. طلبات التجار: لا مسار حيّ (التسجيل مؤجل وPartnerView غير معروضة) —
--    إلغاء الصلاحية العامة الكاملة؛ الكتابة والقراءة من مسارات الخادم فقط.
DROP POLICY IF EXISTS "Partners can view and submit applications" ON public.partner_applications;

-- 7. رفع صور الاستكشاف: ميزة الذكريات أُزيلت من الواجهة ولا كود يقرأ/يكتب
--    الجدول — إلغاء الكتابة العامة؛ قراءة المعتمد تبقى كما هي.
DROP POLICY IF EXISTS "Users can upload photos" ON public.explore_uploads;

-- 8. التقييمات: الكتابة انتقلت إلى POST /api/reviews (بجلسة مسجلة،
--    والـ user_id من الجلسة لا من الطلب) — إلغاء الكتابة العامة؛
--    قراءة التقييمات الظاهرة تبقى عامة.
DROP POLICY IF EXISTS "Users can write reviews" ON public.place_reviews;

-- 9. دلو تخزين صور الدليل (رفع صورة من الجهاز في /admin):
--    قراءة عامة، وكتابة عبر service_role فقط (مسار /api/admin/upload-image).
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read site-images" ON storage.objects;
CREATE POLICY "Public read site-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-images');
