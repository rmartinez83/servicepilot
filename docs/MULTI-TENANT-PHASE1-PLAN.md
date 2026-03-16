# ServicePilot Multi-Tenant Phase 1 Plan

**Goal:** Convert the single-company app into a multi-company SaaS foundation without breaking the working app. No billing, no full auth yet; UI unchanged.

---

## 1. Step-by-Step Migration Plan (Safest Path)

| Step | Action | Purpose |
|------|--------|---------|
| **1** | Add `companies` table and optional `company_id` columns (nullable at first) | Introduce tenant dimension without breaking existing rows |
| **2** | Create one default company; backfill all existing `customers`, `technicians`, `jobs` with that `company_id` | Assign current demo data to a single tenant |
| **3** | Alter columns to `NOT NULL` and add FKs to `companies` | Enforce integrity after backfill |
| **4** | Add indexes and RLS policies for `company_id` | Performance and future tenant isolation |
| **5** | Add `company_members` table (no app usage yet) | Prepare for future auth |
| **6** | App: add “current company” (e.g. env or single default) and scope all reads/writes by `company_id` | Data layer only; UI unchanged |
| **7** | (Later) Add auth and use `company_members` to resolve current company from user | Out of Phase 1 scope |

---

## 2. Companies Table

```sql
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_slug on public.companies (slug);
```

- **name:** Display name (e.g. "Acme Services").
- **slug:** Stable, URL-friendly identifier for future subdomains or paths (e.g. `acme`). Unique.

---

## 3. Add `company_id` to customers, technicians, jobs

**Option A (recommended): add nullable, then backfill, then set NOT NULL.**

- Add `company_id uuid references public.companies (id) on delete restrict`.
- Leave it nullable so existing rows remain valid.
- After backfill, alter to `NOT NULL` and add indexes.

**Columns to add:**

| Table         | Column       | References   | After backfill |
|---------------|--------------|--------------|----------------|
| `customers`   | `company_id` | `companies.id` | NOT NULL       |
| `technicians` | `company_id` | `companies.id` | NOT NULL       |
| `jobs`        | `company_id` | `companies.id` | NOT NULL       |

**Indexes (for scoped queries and RLS):**

```sql
create index if not exists idx_customers_company_id on public.customers (company_id);
create index if not exists idx_technicians_company_id on public.technicians (company_id);
create index if not exists idx_jobs_company_id on public.jobs (company_id);
```

---

## 4. User-to-Company Membership Table (Future Auth)

Proposed table for “which users belong to which companies” (and optionally role). Not used by the app in Phase 1.

```sql
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null,  -- references auth.users (id) when Supabase Auth is enabled
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_members_company_id on public.company_members (company_id);
create index if not exists idx_company_members_user_id on public.company_members (user_id);
```

- **user_id:** Placeholder for `auth.users.id`; no FK until Auth is enabled.
- **role:** For future permission checks (owner/admin/member).
- One row per user per company; later, “current company” can be chosen from these rows.

---

## 5. Backfill: One Default Company for Existing Data

Strategy: create a single company, then set every existing row’s `company_id` to that company.

1. **Insert default company (fixed ID for reproducibility):**

```sql
insert into public.companies (id, name, slug) values
  ('00000000-0000-4000-8000-000000000001', 'Default Company', 'default')
on conflict do nothing;
```

(If you prefer `slug` as unique and no conflict on `id`, use a single `insert` and then use that id in the backfill.)

2. **Backfill (run after `company_id` columns exist and are nullable):**

```sql
update public.customers set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
update public.technicians set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
update public.jobs set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
```

3. **Then enforce NOT NULL and FKs** (see full SQL below).

---

## 6. Required SQL Schema Changes (Full Sequence)

Run in order in Supabase SQL Editor.

```sql
-- 6.1 Companies table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_companies_slug on public.companies (slug);

-- 6.2 Insert default company for backfill
insert into public.companies (id, name, slug) values
  ('00000000-0000-4000-8000-000000000001', 'Default Company', 'default')
on conflict (id) do nothing;

-- 6.3 Add nullable company_id columns
alter table public.customers add column if not exists company_id uuid references public.companies (id) on delete restrict;
alter table public.technicians add column if not exists company_id uuid references public.companies (id) on delete restrict;
alter table public.jobs add column if not exists company_id uuid references public.companies (id) on delete restrict;

-- 6.4 Backfill existing rows
update public.customers set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
update public.technicians set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;
update public.jobs set company_id = '00000000-0000-4000-8000-000000000001' where company_id is null;

-- 6.5 Enforce NOT NULL (only after backfill verified)
alter table public.customers alter column company_id set not null;
alter table public.technicians alter column company_id set not null;
alter table public.jobs alter column company_id set not null;

-- 6.6 Indexes for tenant scoping
create index if not exists idx_customers_company_id on public.customers (company_id);
create index if not exists idx_technicians_company_id on public.technicians (company_id);
create index if not exists idx_jobs_company_id on public.jobs (company_id);

-- 6.7 RLS for companies (Phase 1: anon can read for default company)
alter table public.companies enable row level security;
create policy "Allow anon read companies" on public.companies for select to anon using (true);

-- 6.8 Company members (for future auth; no policies that restrict yet)
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
-- Optional: allow anon to do nothing on company_members until auth is added
create policy "Allow anon read company_members" on public.company_members for select to anon using (false);
```

Keep existing RLS on `customers`, `technicians`, `jobs` as-is for Phase 1 so the app keeps working. When you add auth, you’ll add policies that restrict by `company_id` using the current user’s company (e.g. from `company_members`).

---

## 7. Required App / Data-Layer Changes

No UI changes. All changes are in **data layer and config**.

### 7.1 Current company context

- **Phase 1:** Use a single “current” company id everywhere. Options:
  - **A)** Hardcode default company id in code (e.g. constant `DEFAULT_COMPANY_ID = '00000000-0000-4000-8000-000000000001'`).
  - **B)** Env var, e.g. `NEXT_PUBLIC_DEFAULT_COMPANY_ID`, so you can point to different companies per environment without code change.
- Later (with auth): resolve current company from session (e.g. JWT claim or `company_members` lookup).

### 7.2 Models (`lib/models.ts`)

- Add optional `companyId?: string` to `Customer`, `Technician`, `Job` (or require it once you always have a company).
- No UI change; types just reflect DB.

### 7.3 DB layer (`lib/db.ts`)

- **Reads:** For every query that returns tenants (customers, technicians, jobs), add `.eq("company_id", currentCompanyId)`.
  - `fetchCustomers` → filter by `company_id`.
  - `fetchCustomerById` → keep by-id lookup but add `company_id` filter for safety (or ensure id is globally unique and still scope when listing).
  - `fetchTechnicians` → filter by `company_id`.
  - `fetchTechnicianById` → same as customer.
  - `fetchJobs` / `fetchJobById` → filter by `company_id`.
- **Writes:** On insert/update, always set or validate `company_id`:
  - `insertCustomer`, `insertJob`, `insertTechnician` (if you add it): set `company_id` to current company.
  - `updateCustomer`, `updateJob`, `updateTechnician`: ensure row’s `company_id` matches current company (or at least set `company_id` on insert).
- **Mappers:** In `mapCustomer`, `mapTechnician`, `mapJob`, map `company_id` → `companyId` so app can use it if needed.

### 7.4 Data layer (`lib/data.ts`)

- No new public API required for Phase 1; it can keep calling `db.fetch*` and `db.insert*` / `db.update*`. Any “current company” is passed inside `lib/db` (e.g. from a small context or config that provides `currentCompanyId`).

### 7.5 Where to get `currentCompanyId` in the app

- **Option 1:** Sync getter in `lib/db.ts` (e.g. `getCurrentCompanyId(): string` that reads from env or constant). All `db` functions use it.
- **Option 2:** Async context (e.g. React context or request-scoped value) and pass `companyId` into data layer. More flexible for future multi-company UI (e.g. company switcher).
- Phase 1: Option 1 is enough; single default company, no switcher.

### 7.6 Seed data

- Update `supabase/seed.sql` so new inserts include `company_id = '00000000-0000-4000-8000-000000000001'` for customers, technicians, and jobs. Existing seed rows can be re-run with `on conflict (id) do update set company_id = excluded.company_id` if needed, or run backfill once and keep seed for new DBs only.

---

## 8. What Stays Unchanged (Phase 1)

- **UI:** No new screens, no company switcher, no tenant selector. User sees the same list/detail/edit flows.
- **Billing:** Not in scope.
- **Auth:** No login/signup; anon or existing auth behavior unchanged. `company_members` is schema-only for future use.
- **URLs and navigation:** No `/companies` or tenant in the path.

---

## 9. Rollback (If Needed)

- If you must roll back before the app is updated:
  - Make `company_id` nullable again: `alter table ... alter column company_id drop not null`.
  - Do not drop the column yet if the app might still send it; otherwise you can drop the column and then the `companies` table.
- After the app is scoped by `company_id`, rollback is “revert app code and optionally relax NOT NULL again”; avoid dropping columns once backfill is done and app depends on them.

---

## 10. Summary Checklist

- [ ] Create `companies` table and default company row.
- [ ] Add nullable `company_id` to `customers`, `technicians`, `jobs`.
- [ ] Backfill all existing rows to default company.
- [ ] Set `company_id` NOT NULL and add indexes.
- [ ] Create `company_members` table (no app logic).
- [ ] App: introduce `currentCompanyId` (constant or env) and scope all DB reads/writes by it; map `company_id` in models and mappers.
- [ ] Update seed to include `company_id` for new installs.
- [ ] Keep UI, billing, and auth out of scope for Phase 1.
