-- Invoices table and RLS (company-scoped, consistent with customers/technicians/jobs)
-- Run after schema.sql and phase1-multitenant.sql (and rls-authenticated-company-policies.sql if using auth).

-- Invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  invoice_number text not null,
  status text not null check (status in ('draft', 'sent', 'paid')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_invoices_company_id on public.invoices (company_id);
create index if not exists idx_invoices_job_id on public.invoices (job_id);
create index if not exists idx_invoices_customer_id on public.invoices (customer_id);
create index if not exists idx_invoices_created_at on public.invoices (created_at desc);
create unique index if not exists idx_invoices_company_number on public.invoices (company_id, invoice_number);

-- RLS
alter table public.invoices enable row level security;

-- Anon fallback (Phase 1 style; remove if auth-only)
create policy "Allow anon read write invoices" on public.invoices for all to anon using (true) with check (true);

-- Authenticated: company-scoped (same pattern as rls-authenticated-company-policies.sql)
drop policy if exists "Authenticated company scope invoices" on public.invoices;
create policy "Authenticated company scope invoices"
  on public.invoices
  for all
  to authenticated
  using (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  )
  with check (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  );
