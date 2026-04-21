-- ============================================================
-- XProHub — Add trust_level to profiles
-- Explorer (default, browse-only) → Starter (2A, jobs <$50)
-- → Pro (2B, all jobs, full verification)
-- Real SMS + Stripe verification deferred; column tracks
-- user's self-selected path from the Level 2 Gate screen.
-- Existing rows back-filled to 'explorer' via DEFAULT.
-- Run once in Supabase SQL Editor.
-- ============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT 'explorer'
  CHECK (trust_level IN ('explorer', 'starter', 'pro'));

CREATE INDEX IF NOT EXISTS idx_profiles_trust_level
  ON public.profiles (trust_level);

COMMIT;
