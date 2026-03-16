-- =============================================================================
-- Fix "Finish setup" for one user (run in Supabase SQL Editor)
-- =============================================================================
-- Step 1: See who has memberships and what the "read own" policy actually says
-- Step 2: Add your user to the Default Company if they have no membership
-- =============================================================================

-- (A) List every auth user and their company_members row (or "NO ROW")
--    If your email shows NO ROW, run the INSERT in (B).
SELECT
  u.email,
  u.id AS user_id,
  cm.company_id,
  cm.role,
  CASE WHEN cm.user_id IS NULL THEN 'NO ROW - RUN INSERT BELOW' ELSE 'OK' END AS status
FROM auth.users u
LEFT JOIN public.company_members cm ON cm.user_id = u.id
ORDER BY u.email;


-- (B) Add ONE user to the Default Company (fixes "Finish setup" for that user)
--     Replace 'your-email@example.com' with the email you sign in with.
INSERT INTO public.company_members (company_id, user_id, role)
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  u.id,
  'member'
FROM auth.users u
WHERE u.email = 'your-email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.company_members cm WHERE cm.user_id = u.id
  )
ON CONFLICT (company_id, user_id) DO NOTHING;


-- (C) Confirm the "read own" policy allows each user to see their row
--     The qual should show: (auth.uid() = user_id)
SELECT policyname, cmd, qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'company_members' AND cmd = 'SELECT';
