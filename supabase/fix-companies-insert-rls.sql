-- Fix: Allow authenticated users to INSERT into public.companies during signup.
-- Run this in Supabase Dashboard → SQL Editor if signup fails with:
--   "new row violates row-level security policy for table \"companies\""
--
-- Removes the conflicting policy "Authenticated can insert companies" (if present),
-- which often has a WITH CHECK that blocks new companies (e.g. membership check).
-- Restricts SELECT to members only by dropping anon read.

-- Remove duplicate/conflicting INSERT policy (likely has restrictive WITH CHECK)
drop policy if exists "Authenticated can insert companies" on public.companies;

-- Restrict SELECT to members only (remove anon read-all)
drop policy if exists "Allow anon read companies" on public.companies;

-- Ensure authenticated users can read only companies they belong to
drop policy if exists "Authenticated read own companies" on public.companies;
create policy "Authenticated read own companies" on public.companies
  for select to authenticated
  using (
    id in (select company_id from public.company_members where user_id = auth.uid())
  );

-- Allow any authenticated user to insert a company (signup creates company before membership).
-- Must use WITH CHECK (true); any other condition (e.g. membership check) blocks new companies.
drop policy if exists "Authenticated insert companies" on public.companies;
create policy "Authenticated insert companies" on public.companies
  for insert
  to authenticated
  with check (true);
