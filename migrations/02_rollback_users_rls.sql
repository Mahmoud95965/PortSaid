-- ==============================================================================
-- Port Said Hub - Phase 1 Auth Rollback Migration
-- File: migrations/02_rollback_users_rls.sql
-- Description:
--   Safely reverts RLS policies on public.users to previous state if needed.
--   Preserves all existing accounts, passwords, and balances.
-- ==============================================================================

-- 1. استعادة سياسة القراءة العامة
DROP POLICY IF EXISTS "Public read for active basic profiles" ON public.users;
CREATE POLICY "Users can view profiles" ON public.users FOR SELECT USING (true);

-- 2. استعادة سياسات الإدراج والتعديل السابقة
DROP POLICY IF EXISTS "Public registration for users" ON public.users;
CREATE POLICY "Public registration for users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their profile" ON public.users;
CREATE POLICY "Users can update their profile" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete profile" ON public.users;
CREATE POLICY "Users can delete profile" ON public.users FOR DELETE USING (true);
