-- ============================================================
-- XProHub — Add INSERT policy on chats for Direct Hire flow
-- The base schema (xprohub_schema.sql) only added a SELECT policy
-- on chats. Direct Hire needs customers to INSERT chat rows.
-- Run once in Supabase SQL Editor.
-- ============================================================

BEGIN;

CREATE POLICY "Customers create chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

COMMIT;
