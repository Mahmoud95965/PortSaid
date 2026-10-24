-- ==============================================================================
-- Port Said Hub - Phase 1 Rollback Migration
-- File: migrations/01_rollback.sql
-- Description:
--   Safely reverts Phase 1 triggers, functions, and RLS changes without losing
--   any existing user balances or historical records.
-- ==============================================================================

-- 1. حذف محفزات ودوال حماية الرصيد وهدية الترحيب
DROP TRIGGER IF EXISTS trg_protect_users_points ON public.users;
DROP FUNCTION IF EXISTS public.trg_guard_points_balance();

DROP TRIGGER IF EXISTS trg_audit_welcome_gift_insert ON public.users;
DROP FUNCTION IF EXISTS public.trg_audit_welcome_gift();

-- 2. حذف الدوال الخادمية المستحدثة
DROP FUNCTION IF EXISTS public.rpc_claim_share_reward(UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR);

-- 3. استعادة سياسة الإدراج السابقة لجدول points_ledger (إذا تطلب الأمر)
DROP POLICY IF EXISTS "Users can insert points ledger" ON public.points_ledger;
CREATE POLICY "Users can insert points ledger" ON public.points_ledger FOR INSERT WITH CHECK (true);

-- ملاحظة: يتم الإبقاء على عمود idempotency_key وفهارسه حيث لا يسبب أي ضرر تشغيلي ولا يؤثر على البيانات القائمة.
