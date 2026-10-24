-- ==============================================================================
-- Port Said Hub - Phase 1 Migration: Rollback Rewards RPC & Table Permissions
-- File: migrations/03_rollback_rewards_rpc.sql
-- Description:
--   Rolls back migration 03 if client-direct execution needs to be restored.
-- ==============================================================================

-- استعادة صلاحيات التنفيذ المباشر لدوال المكافآت لـ anon و authenticated
GRANT EXECUTE ON FUNCTION public.rpc_claim_share_reward(UUID, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_record_visit(UUID, UUID, NUMERIC, NUMERIC, INT, VARCHAR) TO anon, authenticated;

-- استعادة صلاحية التعديل على رصيد النقاط (تظل محمية بموجب الزناد trg_guard_points_balance)
GRANT UPDATE (points_balance) ON public.users TO authenticated;
