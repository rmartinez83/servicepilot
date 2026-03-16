-- Run this in Supabase SQL Editor so signup can create companies and memberships.
-- Fixes: "Company creation failed" / "add customer doesn't let me" when user has no company.
-- The RPC runs with elevated rights so it is not blocked by RLS.

create or replace function public.create_company_for_current_user(
  p_name text,
  p_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_slug text;
  v_company_id uuid;
  v_trial_ends_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_slug := coalesce(
    nullif(trim(p_slug), ''),
    lower(regexp_replace(trim(p_name), '\s+', '-', 'g'))
  );
  v_slug := regexp_replace(v_slug, '[^a-z0-9-]', '', 'g');
  v_slug := left(v_slug, 40);
  if length(v_slug) = 0 then
    v_slug := 'company';
  end if;
  v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);

  v_trial_ends_at := now() + interval '14 days';

  insert into public.companies (name, slug, plan, subscription_status, trial_ends_at)
  values (trim(p_name), v_slug, 'trial', 'trialing', v_trial_ends_at)
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (v_company_id, v_user_id, 'owner');

  return v_company_id;
end;
$$;

grant execute on function public.create_company_for_current_user(text, text) to authenticated;
