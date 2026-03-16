-- =============================================================================
-- Fix: "Finish setup" when companies already exist in Supabase (run in SQL Editor)
-- =============================================================================
-- Supabase has companies, but the app can't see your membership. This script:
-- 1. Ensures the Default Company exists.
-- 2. Fixes company_members RLS so each user can read their own row.
-- 3. Adds a company_members row for every auth user who has none (links to Default Company).
-- Run the whole script once, then sign out and sign in again in the app.
-- =============================================================================

-- Step 0: Ensure Default Company exists (app expects this ID)
-- -----------------------------------------------------------------------------
insert into public.companies (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Default Company', 'default')
on conflict (id) do nothing;

-- Step 1: Fix RLS on company_members (so getCompanyIdForUser() can see your row)
-- -----------------------------------------------------------------------------
-- Drop every SELECT policy for authenticated (in case an old/wrong one exists),
-- then create exactly the two correct ones.
do $$
declare r record;
begin
  for r in (select policyname from pg_policies where schemaname = 'public' and tablename = 'company_members' and cmd = 'SELECT' and 'authenticated' = any(roles))
  loop
    execute format('drop policy if exists %I on public.company_members', r.policyname);
  end loop;
end $$;

create policy "Authenticated read own company_members" on public.company_members
  for select to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated read company members" on public.company_members
  for select to authenticated
  using (
    company_id in (
      select company_id from public.company_members cm2
      where cm2.user_id = auth.uid()
    )
  );

-- Step 2: Give every auth user at least one membership (so no one hits Finish setup)
-- -----------------------------------------------------------------------------
-- Users with zero company_members rows get one row: Default Company, role 'member'.
insert into public.company_members (company_id, user_id, role)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  u.id,
  'member'
from auth.users u
where not exists (
  select 1 from public.company_members cm where cm.user_id = u.id
)
on conflict (company_id, user_id) do nothing;

-- Step 3: Verify (you should see rows and your email)
-- -----------------------------------------------------------------------------
select u.email, cm.role, c.name as company_name
from auth.users u
left join public.company_members cm on cm.user_id = u.id
left join public.companies c on c.id = cm.company_id
order by u.email;
