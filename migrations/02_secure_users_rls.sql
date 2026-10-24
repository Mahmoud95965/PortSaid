-- ==============================================================================
-- Port Said Hub - Phase 1 Auth Hardening Migration
-- File: migrations/02_secure_users_rls.sql
-- Description:
--   Locks down the public.users table from direct anonymous REST access.
--   Now that login, registration, and profile changes are handled by Next.js
--   server routes via service_role, we revoke direct INSERT, UPDATE, and DELETE
--   from anon/authenticated public clients.
-- ==============================================================================

-- 1. إلغاء سياسة التسجيل المباشر من المتصفح (حماية من الروبوتات والحسابات الوهمية)
DROP POLICY IF EXISTS "Public registration for users" ON public.users;

-- 2. إلغاء سياسة التعديل المباشر على جدول المستخدمين من المتصفح
DROP POLICY IF EXISTS "Users can update their profile" ON public.users;

-- 3. إلغاء سياسة الحذف المباشر للمستخدمين
DROP POLICY IF EXISTS "Users can delete profile" ON public.users;

-- 4. تقييد استعلامات القراءة المباشرة لتشمل الحسابات النشطة فقط وتجنب كشف المحذوفين
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Public read for active basic profiles" ON public.users 
FOR SELECT 
USING (status = 'active' AND deleted_at IS NULL);

-- 5. ضمان تفعيل RLS على جدول المستخدمين
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
