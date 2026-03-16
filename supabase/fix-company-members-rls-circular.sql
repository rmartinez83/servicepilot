-- Fix: company_members RLS was circular after invite migration, so getCompanyIdForUser returned null.
-- Run in Supabase SQL Editor. Restores "read own row" and keeps "read company members" for Team page.
--
-- Cause: A single policy "company_id in (select company_id from company_members where user_id = auth.uid())"
-- is circular: to see any row, Postgres must run the subquery, but the subquery is also subject to RLS,
-- so the user's own rows were not visible and the subquery returned nothing.
--
-- Fix: Two policies. (1) Read own rows: using (auth.uid() = user_id). (2) Read others in my companies:
-- using (company_id in (select ...)). With (1) in place, the subquery in (2) can see the user's rows.

drop policy if exists "Authenticated read own company_members" on public.company_members;
drop policy if exists "Authenticated read company members" on public.company_members;

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
