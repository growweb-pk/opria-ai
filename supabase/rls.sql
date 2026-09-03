-- =============================================================
-- OPRIA — Supabase Row Level Security (RLS) Policies
-- =============================================================
-- Run this SQL in Supabase Dashboard → SQL Editor after
-- creating tables with `npx prisma db push`.
--
-- STRATEGY:
-- All tables in the public schema are accessible by the postgres
-- role (table owner), which Prisma uses for all database access.
-- Table owners bypass RLS by default, so our Next.js application
-- (via Prisma) is unaffected by these policies.
--
-- RLS blocks the Supabase auto-generated REST API (PostgREST)
-- from exposing tables to anon/authenticated roles. This closes
-- the security hole where anyone with the public anon key could
-- read/write all tables via the Supabase REST API.
--
-- For the MVP, all tables have RLS enabled with NO policies.
-- This means:
--   - Prisma (server-side, owner role) → FULL ACCESS ✓
--   - Supabase service_role → FULL ACCESS ✓
--   - Supabase anon role → NO ACCESS ✗
--   - Supabase authenticated role → NO ACCESS ✗
--
-- FUTURE: If you add direct Supabase client queries (not Prisma),
-- add per-table policies as documented in the comments below.
-- =============================================================

-- ─── Core Tables ─────────────────────────────────────────

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
-- Future: Users can read their own row
-- CREATE POLICY "users_select_own" ON "users" FOR SELECT USING (supabase_id = auth.uid()::text);

ALTER TABLE "business_profiles" ENABLE ROW LEVEL SECURITY;
-- Future: Business owners can read/update their own profile
-- CREATE POLICY "business_select_own" ON "business_profiles" FOR SELECT USING (user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text));
-- CREATE POLICY "business_update_own" ON "business_profiles" FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text));

ALTER TABLE "professional_profiles" ENABLE ROW LEVEL SECURITY;
-- Future: Professionals can read/update their own profile; businesses can read verified profiles
-- CREATE POLICY "professional_select_own" ON "professional_profiles" FOR SELECT USING (user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text));
-- CREATE POLICY "professional_select_verified" ON "professional_profiles" FOR SELECT USING (verification = 'VERIFIED');

-- ─── Assessment Tables ───────────────────────────────────

ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_responses" ENABLE ROW LEVEL SECURITY;

-- ─── AI Analysis Tables ──────────────────────────────────

ALTER TABLE "business_analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opportunities" ENABLE ROW LEVEL SECURITY;

-- ─── Conversation Tables ─────────────────────────────────

ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "requirements" ENABLE ROW LEVEL SECURITY;

-- ─── Matching Tables ─────────────────────────────────────

ALTER TABLE "match_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "match_results" ENABLE ROW LEVEL SECURITY;

-- ─── Audit Tables ────────────────────────────────────────

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
-- Audit logs should ONLY be accessible server-side (admin)

-- =============================================================
-- VERIFICATION:
-- After running this script, verify RLS is enabled:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- All tables should show rowsecurity = true.
-- =============================================================
