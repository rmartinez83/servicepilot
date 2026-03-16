# Supabase setup (Phase 1)

## 1. Create `.env.local`

In the project root, create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

- **NEXT_PUBLIC_SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL  
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

Do not commit `.env.local`.

## 2. Run SQL in Supabase

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Run **schema.sql** first (creates tables, indexes, RLS).
3. Run **seed.sql** second (inserts customers, technicians, jobs).
4. If the `jobs` table was created before `scheduled_time` existed, run **migrations/20250309000000_add_jobs_scheduled_time.sql** to add the optional appointment time column.
5. For self-serve signup and free trial: run **migrations/20250310000000_companies_trial_and_signup_rls.sql** to add trial/billing columns to `companies` and RLS policies for signup. Then restart your dev server so the schema cache refreshes.

After that, the app will use Supabase for customers, technicians, and jobs; invoices remain mock.
