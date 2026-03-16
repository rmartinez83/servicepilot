-- ServicePilot Phase 1 Multi-Tenant Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) after schema.sql.
-- Safe to run: uses IF NOT EXISTS / IF EXISTS and backfills before NOT NULL.

-- Step 1: Companies table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_companies_slug on public.companies (slug);

-- Step 2: Insert default company (fixed UUID for backfill and app constant)
insert into public.companies (id, name, slug) values
  ('00000000-0000-4000-8000-000000000001', 'Default Company', 'default')
on conflict (id) do nothing;

-- Step 3: Add nullable company_id to customers, technicians, jobs
alter table public.customers add column if not exists company_id uuid references public.companies (id) on delete restrict;
alter table public.technicians add column if not exists company_id uuid references public.companies (id) on delete restrict;
alter table public.jobs add column if not exists company_id uuid references public.companies (id) on delete restrict;

-- Step 4: Backfill existing rows to default company
update public.customers set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
update public.technicians set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
update public.jobs set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;

-- Step 5: Enforce NOT NULL (only after backfill)
alter table public.customers alter column company_id set not null;
alter table public.technicians alter column company_id set not null;
alter table public.jobs alter column company_id set not null;

-- Step 6: Indexes for tenant-scoped queries
create index if not exists idx_customers_company_id on public.customers (company_id);
create index if not exists idx_technicians_company_id on public.technicians (company_id);
create index if not exists idx_jobs_company_id on public.jobs (company_id);

-- Step 7a: RLS for companies (Phase 1: anon can read)
alter table public.companies enable row level security;
drop policy if exists "Allow anon read companies" on public.companies;
create policy "Allow anon read companies" on public.companies for select to anon using (true);

-- Step 7b: company_members table (for future auth; not used by app yet)
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index if not exists idx_company_members_company_id on public.company_members (company_id);
create index if not exists idx_company_members_user_id on public.company_members (user_id);
alter table public.company_members enable row level security;
drop policy if exists "Deny anon company_members" on public.company_members;
create policy "Deny anon company_members" on public.company_members for select to anon using (false);
