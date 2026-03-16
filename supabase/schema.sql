-- ServicePilot Phase 1: customers, technicians, jobs
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_created_at on public.customers (created_at desc);

-- Technicians
create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  active boolean not null default true,
  specialty text not null check (specialty in ('HVAC', 'Plumbing', 'Electrical', 'Cleaning', 'Landscaping'))
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  technician_id uuid references public.technicians (id) on delete set null,
  title text not null,
  description text not null default '',
  scheduled_date date not null,
  scheduled_time time,
  status text not null check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  price numeric(10,2) not null check (price >= 0)
);

-- Add scheduled_time if the table already existed without it
alter table public.jobs add column if not exists scheduled_time time;

create index if not exists idx_jobs_customer_id on public.jobs (customer_id);
create index if not exists idx_jobs_technician_id on public.jobs (technician_id);
create index if not exists idx_jobs_scheduled_date on public.jobs (scheduled_date desc);

-- RLS: allow anon read/write for Phase 1 (no auth)
alter table public.customers enable row level security;
alter table public.technicians enable row level security;
alter table public.jobs enable row level security;

create policy "Allow anon read write customers" on public.customers for all to anon using (true) with check (true);
create policy "Allow anon read write technicians" on public.technicians for all to anon using (true) with check (true);
create policy "Allow anon read write jobs" on public.jobs for all to anon using (true) with check (true);
