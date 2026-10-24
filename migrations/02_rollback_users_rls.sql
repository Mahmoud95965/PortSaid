-- ==============================================================================
-- Port Said Hub - Phase 1 Auth Rollback Migration (Secured)
-- File: migrations/02_rollback_users_rls.sql
-- Description:
--   Safely reverts RLS policies on public.users to previous state if needed.
--   SECURITY AUDIT NOTE:
--   Never grants wide-open UPDATE USING (true) or DELETE USING (true) to public/anon.
--   Preserves all existing accounts, passwords, and balances with zero data loss.
-- ==============================================================================

-- 1. استعادة سياسة القراءة العامة للملفات الشخصية
DROP POLICY IF EXISTS "Public read for active basic profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
CREATE POLICY "Users can view profiles" ON public.users FOR SELECT USING (true);

-- 2. في حالة الرجوع الاضطراري للتسجيل من المتصفح: تقييد الإدراج بحدود أمان صارمة
DROP POLICY IF EXISTS "Public registration for users" ON public.users;
DROP POLICY IF EXISTS "Restricted registration for users" ON public.users;
CREATE POLICY "Restricted registration for users" ON public.users 
FOR INSERT 
WITH CHECK (
    -- منع إنشاء حسابات إدارية من المتصفح مباشرة (role_id 1=owner, 2=admin ممنوعة)
    role_id IN (3, 4) 
    -- منع التلاعب بالرصيد الأولي
    AND points_balance <= 20
    AND status = 'active'
);

-- 3. منع التعديل العشوائي أو الحذف العام من أطراف مجهولة
DROP POLICY IF EXISTS "Users can update their profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete profile" ON public.users;

-- التعديل والحذف يظلان محصورين في سياق الخادم المعتمد (service_role) أو عبر معرف جلسة Supabase إن وجد:
CREATE POLICY "Users can update own profile only" ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- تفعيل RLS على الجدول لضمان عدم فتح ثغرات غير مقصودة
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
