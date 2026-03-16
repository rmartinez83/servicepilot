-- Companies: add trial and billing-ready columns.
-- Run in Supabase SQL Editor. Safe: uses IF NOT EXISTS and nullable/defaults.

alter table public.companies add column if not exists plan text default 'trial';
alter table public.companies add column if not exists subscription_status text default 'trialing';
alter table public.companies add column if not exists trial_ends_at timestamptz;
alter table public.companies add column if not exists stripe_customer_id text;
alter table public.companies add column if not exists stripe_subscription_id text;

-- Optional: constrain plan/status to expected values (comment out if you prefer freeform for now)
-- alter table public.companies add constraint companies_plan_check check (plan in ('trial', 'starter', 'pro', 'enterprise'));
-- alter table public.companies add constraint companies_subscription_status_check check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));

-- RLS: allow authenticated users to read companies they belong to
drop policy if exists "Authenticated read own companies" on public.companies;
create policy "Authenticated read own companies" on public.companies
  for select to authenticated
  using (
    id in (select company_id from public.company_members where user_id = auth.uid())
  );

-- RLS: allow any authenticated user to insert a company (required for signup; no membership yet)
drop policy if exists "Authenticated insert companies" on public.companies;
create policy "Authenticated insert companies" on public.companies
  for insert to authenticated
  with check (true);

-- RLS: allow authenticated users to insert their own company_members row (user_id = auth.uid())
drop policy if exists "Authenticated insert own company_members" on public.company_members;
create policy "Authenticated insert own company_members" on public.company_members
  for insert to authenticated
  with check (user_id = auth.uid());
