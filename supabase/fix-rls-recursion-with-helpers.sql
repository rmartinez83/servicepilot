-- =============================================================================
-- Fix: "infinite recursion detected in policy for relation company_members"
-- =============================================================================
-- Run this in Supabase SQL Editor once. Does not change app logic or get_current_user_primary_company RPC.
--
-- CAUSE: Policies that use a subquery like
--   (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
-- trigger RLS on company_members when that subquery runs. The policy on
-- company_members itself ("Authenticated read company members") also contains
-- a subquery on company_members, so Postgres re-enters RLS → infinite recursion.
--
-- FIX: Replace those subqueries with SECURITY DEFINER helper functions that
-- read company_members directly. Helpers run as definer and bypass RLS, so
-- no recursion when used inside policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper: is the current user a member of the given company?
-- -----------------------------------------------------------------------------
create or replace function public.is_member_of_company(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_member_of_company(uuid) to authenticated;

comment on function public.is_member_of_company(uuid) is
  'For RLS: true if current user has a row in company_members for the company. SECURITY DEFINER to avoid recursion.';

-- -----------------------------------------------------------------------------
-- 2. Helper: is the current user owner or admin of the given company?
-- -----------------------------------------------------------------------------
create or replace function public.is_owner_or_admin_of_company(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_owner_or_admin_of_company(uuid) to authenticated;

comment on function public.is_owner_or_admin_of_company(uuid) is
  'For RLS: true if current user is owner or admin of the company. SECURITY DEFINER to avoid recursion.';

-- -----------------------------------------------------------------------------
-- 3. company_members: remove recursive policy, keep non-recursive ones
-- -----------------------------------------------------------------------------
-- "Authenticated read own company_members" (auth.uid() = user_id) is fine — no subquery.
-- "Authenticated read company members" was: company_id IN (SELECT ... FROM company_members) → recursion.
drop policy if exists "Authenticated read company members" on public.company_members;
create policy "Authenticated read company members"
  on public.company_members
  for select to authenticated
  using (public.is_member_of_company(company_id));

-- Do not touch: "Authenticated read own company_members", "Authenticated insert own company_members", "Deny anon company_members"

-- -----------------------------------------------------------------------------
-- 4. companies: read own — was id IN (SELECT company_id FROM company_members ...) → recursion
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated read own companies" on public.companies;
create policy "Authenticated read own companies"
  on public.companies
  for select to authenticated
  using (public.is_member_of_company(id));

-- -----------------------------------------------------------------------------
-- 5. customers: company scope — subquery on company_members caused recursion
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated company scope customers" on public.customers;
create policy "Authenticated company scope customers"
  on public.customers
  for all to authenticated
  using (public.is_member_of_company(company_id))
  with check (public.is_member_of_company(company_id));

-- -----------------------------------------------------------------------------
-- 6. technicians: company scope
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated company scope technicians" on public.technicians;
create policy "Authenticated company scope technicians"
  on public.technicians
  for all to authenticated
  using (public.is_member_of_company(company_id))
  with check (public.is_member_of_company(company_id));

-- -----------------------------------------------------------------------------
-- 7. jobs: company scope
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated company scope jobs" on public.jobs;
create policy "Authenticated company scope jobs"
  on public.jobs
  for all to authenticated
  using (public.is_member_of_company(company_id))
  with check (public.is_member_of_company(company_id));

-- -----------------------------------------------------------------------------
-- 8. invoices: company scope (if you don't have public.invoices, comment out this block)
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated company scope invoices" on public.invoices;
create policy "Authenticated company scope invoices"
  on public.invoices
  for all to authenticated
  using (public.is_member_of_company(company_id))
  with check (public.is_member_of_company(company_id));

-- -----------------------------------------------------------------------------
-- 9. company_invites: owner/admin only — subquery on company_members caused recursion
-- -----------------------------------------------------------------------------
drop policy if exists "Owner or admin can manage company_invites" on public.company_invites;
create policy "Owner or admin can manage company_invites"
  on public.company_invites
  for all to authenticated
  using (public.is_owner_or_admin_of_company(company_id))
  with check (public.is_owner_or_admin_of_company(company_id));

-- -----------------------------------------------------------------------------
-- Done. Summary:
-- - is_member_of_company(company_id) and is_owner_or_admin_of_company(company_id)
--   are used in RLS instead of inline SELECTs on company_members.
-- - company_members: own row (unchanged) + read same-company via helper.
-- - companies, customers, technicians, jobs, invoices: member check via helper.
-- - company_invites: owner/admin check via helper.
-- =============================================================================
