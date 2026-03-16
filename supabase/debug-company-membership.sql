-- =============================================================================
-- Debug: company_members and RLS (run in Supabase SQL Editor)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Inspect company_members for a specific user (by email)
--    Replace 'your-user@example.com' with the affected user's email.
-- -----------------------------------------------------------------------------
SELECT
  u.id AS user_id,
  u.email,
  cm.id AS membership_id,
  cm.company_id,
  cm.role,
  cm.created_at AS member_since
FROM auth.users u
LEFT JOIN public.company_members cm ON cm.user_id = u.id
WHERE u.email = 'your-user@example.com';

-- If the query returns one row with membership_id and company_id filled: the row EXISTS.
-- If membership_id and company_id are NULL: the user has NO company_members row (that's the bug).


-- -----------------------------------------------------------------------------
-- 2. Inspect all RLS policies on public.company_members
-- -----------------------------------------------------------------------------
SELECT
  policyname,
  cmd,
  roles,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'company_members'
ORDER BY policyname;


-- -----------------------------------------------------------------------------
-- 3. Expected correct SELECT policies for public.company_members
--    You should see exactly TWO policies for cmd = 'SELECT' and roles = '{authenticated}':
--
--    (A) "Authenticated read own company_members"
--        using_expression: (auth.uid() = user_id)
--
--    (B) "Authenticated read company members"
--        using_expression: (company_id in (select company_id from ... where cm2.user_id = auth.uid()))
--
-- If you only have one policy, or (A) is missing, run fix-company-members-rls-circular.sql
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 4. Restore a missing company_members row (run only if step 1 showed no row)
--    Replace:
--    - 'your-user@example.com' with the user's email
--    - '00000000-0000-0000-0000-000000000000' with the actual company UUID
--    - 'owner' with 'owner' or 'member' as appropriate
-- -----------------------------------------------------------------------------
-- First, get the user_id and pick the company_id (e.g. from companies table):
-- SELECT id FROM auth.users WHERE email = 'your-user@example.com';
-- SELECT id, name FROM public.companies ORDER BY created_at DESC LIMIT 5;

INSERT INTO public.company_members (company_id, user_id, role)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid AS company_id,
  u.id AS user_id,
  'owner' AS role
FROM auth.users u
WHERE u.email = 'your-user@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = u.id AND cm.company_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
ON CONFLICT (company_id, user_id) DO NOTHING;

-- After running: have the user sign out and sign in again so the app refetches company.
