-- ==============================================================================
-- Port Said Hub - Phase 1 Migration: Secure Rewards RPC & Table Permissions
-- File: migrations/03_secure_rewards_rpc.sql
-- Description:
--   1. Revokes direct EXECUTE permissions on rewards RPCs from anon and authenticated.
--   2. Grants EXECUTE on rewards RPCs strictly to service_role (invoked via Next.js server).
--   3. Eliminates user impersonation vulnerability (p_user_id cannot be supplied by browser).
--   4. Revokes direct column-level UPDATE on users(points_balance) for anon and authenticated.
--   5. Locks down points_ledger and visits against direct client REST insertions.
-- ==============================================================================

-- 1. سحب صلاحيات التنفيذ المباشر لدوال المكافآت من المتصفح والعملاء غير الموثوقين
REVOKE EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) FROM authenticated;

-- 2. حصر تنفيذ دوال النقاط والزيارات لخادم التطبيق المعتمد (Next.js عبر service_role)
GRANT EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) TO service_role;

-- 3. سحب صلاحية التعديل المباشر لعمود رصيد النقاط من المتصفح
REVOKE UPDATE (points_balance) ON public.users FROM PUBLIC;
REVOKE UPDATE (points_balance) ON public.users FROM anon;
REVOKE UPDATE (points_balance) ON public.users FROM authenticated;

-- 4. إحكام سياسات RLS على جدول الزيارات لمنع التزوير اليدوي
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert visits" ON public.visits;
DROP POLICY IF EXISTS "Users can insert visits" ON public.visits;
-- يمنع الإدراج المباشر من المتصفح عبر REST API
-- الإدراج يتم حصرياً عبر دالة rpc_record_visit من خلال service_role

DROP POLICY IF EXISTS "Users can view visits" ON public.visits;
CREATE POLICY "Users can view visits" ON public.visits FOR SELECT USING (true);

-- 5. إحكام سياسات RLS على جدول دفتر النقاط
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert points ledger" ON public.points_ledger;
DROP POLICY IF EXISTS "Public insert points ledger" ON public.points_ledger;

DROP POLICY IF EXISTS "Users can view points ledger" ON public.points_ledger;
CREATE POLICY "Users can view points ledger" ON public.points_ledger FOR SELECT USING (true);
