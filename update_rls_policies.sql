-- ==============================================================================
-- تفعيل سياسات التسجيل وإدارة الحسابات والكوبونات في Supabase
-- قم بنسخ هذا الكود بالكامل ولصقه في SQL Editor في Supabase ثم اضغط Run
-- ==============================================================================

-- 1. السماح بالتسجيل وتعديل الحساب في جدول المستخدمين (users)
DROP POLICY IF EXISTS "Public registration for users" ON public.users;
CREATE POLICY "Public registration for users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their profile" ON public.users;
CREATE POLICY "Users can update their profile" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete profile" ON public.users;
CREATE POLICY "Users can delete profile" ON public.users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
CREATE POLICY "Users can view profiles" ON public.users FOR SELECT USING (true);

-- 2. تأمين وحفظ حركات النقاط (points_ledger)
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view points ledger" ON public.points_ledger;
CREATE POLICY "Users can view points ledger" ON public.points_ledger FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert points ledger" ON public.points_ledger;
CREATE POLICY "Users can insert points ledger" ON public.points_ledger FOR INSERT WITH CHECK (true);

-- 3. السماح بطلب الكوبونات واستخدامها (coupons)
DROP POLICY IF EXISTS "Users can view their own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can view and manage coupons" ON public.coupons;
CREATE POLICY "Users can manage coupons" ON public.coupons FOR ALL USING (true);

-- 4. سجل النشاط والأمان (activity_log)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert activity_log" ON public.activity_log;
CREATE POLICY "Public insert activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public select activity_log" ON public.activity_log;
CREATE POLICY "Public select activity_log" ON public.activity_log FOR SELECT USING (true);

-- 5. طلبات انضمام التجار والأنشطة (partner_applications)
DROP POLICY IF EXISTS "Partners can view and submit applications" ON public.partner_applications;
CREATE POLICY "Partners can view and submit applications" ON public.partner_applications FOR ALL USING (true);
