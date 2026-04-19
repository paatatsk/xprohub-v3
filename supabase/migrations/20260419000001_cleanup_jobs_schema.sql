-- ============================================================
-- XProHub — Schema Cleanup v1
-- 1. Drop legacy skill_id column from jobs (pre-task-library)
-- 2. Drop legacy skills table (replaced by task_library)
-- 3. Enable RLS on job_post_tasks + add INSERT/SELECT policies
-- Note: jobs INSERT policy already exists ("Customers create jobs")
--       — included here as DO NOTHING guard for safety.
-- Run once in Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ── A. Drop legacy skill_id from jobs ────────────────────────
-- Index on skill_id drops automatically with the column.
-- FK constraint name is auto-generated; DROP COLUMN CASCADE
-- removes it cleanly.

ALTER TABLE public.jobs
  DROP COLUMN IF EXISTS skill_id;


-- ── B. Drop legacy skills + user_skills tables ───────────────
-- user_skills.skill_id FK must go first (CASCADE handles it,
-- but we drop user_skills explicitly since it's fully replaced
-- by worker_skills + task_library).

DROP TABLE IF EXISTS public.user_skills CASCADE;
DROP TABLE IF EXISTS public.skills      CASCADE;


-- ── C. jobs INSERT policy (guard — likely already exists) ────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'jobs'
      AND policyname = 'Customers create jobs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Customers create jobs"
        ON public.jobs
        FOR INSERT
        WITH CHECK (auth.uid() = customer_id)
    $policy$;
  END IF;
END
$$;


-- ── D. Enable RLS on job_post_tasks ──────────────────────────

ALTER TABLE public.job_post_tasks ENABLE ROW LEVEL SECURITY;


-- ── D1. INSERT policy — customer can insert tasks for their own job

CREATE POLICY "Customers insert job tasks"
  ON public.job_post_tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT customer_id FROM public.jobs WHERE id = job_post_id
    )
  );


-- ── E. SELECT policy — customer and matched worker can read

CREATE POLICY "Job parties read job tasks"
  ON public.job_post_tasks
  FOR SELECT
  USING (
    auth.uid() = (
      SELECT customer_id FROM public.jobs WHERE id = job_post_id
    )
    OR
    auth.uid() = (
      SELECT worker_id FROM public.jobs WHERE id = job_post_id
    )
  );


COMMIT;
