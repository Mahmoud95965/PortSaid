-- =============================================================================
-- Port Said Hub - Users column grants (migration 15)
-- Date: 2026-11-26
-- PROBLEM: migration 14 did `REVOKE SELECT (password_hash) ...` — but in
-- Postgres a column-level REVOKE does NOT override a table-level SELECT
-- grant (privileges are additive). The anon key could STILL read
-- password_hash (verified live 2026-11-26 00:14 EET — full scrypt hash
-- returned) AND phone numbers. The correct fix: remove the table-level
-- grant entirely and re-grant ONLY the columns the public client needs.
--
-- What the anonymous client actually reads from users (verified in code):
--   - PlaceDetail review list embeds users(name, email_verified_at)
--     (join key users.id is needed for the embed)
--   - the RLS policy "Public read for active basic profiles" filters on
--     status + deleted_at (granted as belt-and-braces)
-- Everything else (password_hash, phone, email, points_balance, ...) is
-- readable ONLY via service_role — all server routes use getSupabaseServer()
-- (SUPABASE_SERVICE_ROLE_KEY is set and proven working on Vercel).
-- =============================================================================

REVOKE SELECT ON public.users FROM anon, authenticated;

GRANT SELECT (id, name, email_verified_at, status, deleted_at)
  ON public.users TO anon, authenticated;
