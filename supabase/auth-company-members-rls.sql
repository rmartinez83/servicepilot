-- Allow authenticated users to read their own company_members rows.
-- Run in Supabase SQL Editor after phase1-multitenant.sql.
-- Required so the app can resolve current company from auth.uid().

drop policy if exists "Deny anon company_members" on public.company_members;
create policy "Deny anon company_members" on public.company_members for select to anon using (false);

create policy "Authenticated read own company_members" on public.company_members
  for select to authenticated using (auth.uid() = user_id);
