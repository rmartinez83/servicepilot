-- Force-recreate the companies INSERT policy so it definitely uses WITH CHECK (true).
-- Run in Supabase SQL Editor when signup still fails with RLS on "companies".
--
-- First, inspect what the current policy actually uses (run this to verify):
--
--   select policyname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname = 'public' and tablename = 'companies';
--
-- Then run the block below to drop and recreate the INSERT policy.

drop policy if exists "Authenticated insert companies" on public.companies;

create policy "Authenticated insert companies"
  on public.companies
  for insert
  to authenticated
  with check (true);
