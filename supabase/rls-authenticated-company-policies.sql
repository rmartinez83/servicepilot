-- RLS: Allow authenticated users to read/write only rows for their company
-- Run in Supabase SQL Editor after auth-company-members-rls.sql.
-- Fixes: after sign-in, app showed 0 customers/jobs/technicians because only anon had policies.
--
-- ROOT CAUSE:
--   - customers, technicians, jobs have RLS enabled with policies only for role "anon"
--     (e.g. "Allow anon read write customers" for all to anon using (true) with check (true)).
--   - When a user signs in, the Supabase client sends the JWT; Supabase runs the request
--     as role "authenticated", not "anon".
--   - There were no policies for "authenticated" on these tables, so RLS denied all access
--     and the app saw 0 rows.
--
-- FIX:
--   Add policies for "authenticated" that allow access only when the row's company_id
--   is in (SELECT company_id FROM company_members WHERE user_id = auth.uid()).
--   Anon policies are left as-is for unauthenticated fallback.

-- Helper: true when the row's company_id is one the current user belongs to (via company_members).
-- We use a subquery per table so the policy is self-contained and uses auth.uid().

-- CUSTOMERS: authenticated can select/insert/update/delete only their company's rows
drop policy if exists "Authenticated company scope customers" on public.customers;
create policy "Authenticated company scope customers"
  on public.customers
  for all
  to authenticated
  using (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  )
  with check (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  );

-- TECHNICIANS: authenticated can select/insert/update/delete only their company's rows
drop policy if exists "Authenticated company scope technicians" on public.technicians;
create policy "Authenticated company scope technicians"
  on public.technicians
  for all
  to authenticated
  using (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  )
  with check (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  );

-- JOBS: authenticated can select/insert/update/delete only their company's rows
drop policy if exists "Authenticated company scope jobs" on public.jobs;
create policy "Authenticated company scope jobs"
  on public.jobs
  for all
  to authenticated
  using (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  )
  with check (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  );

-- Existing anon policies are unchanged: anon still has full read/write for fallback.
-- When the user is signed in, the authenticated policies above apply and restrict by company.
