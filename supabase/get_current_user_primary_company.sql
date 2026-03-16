-- =============================================================================
-- RPC: get_current_user_primary_company()
-- =============================================================================
-- Single source of truth for resolving the current user's primary company.
-- Run this in Supabase SQL Editor once. Does not change existing RLS.
--
-- Returns: company_id, role for the oldest non-default company membership.
-- Returns nothing (null) if: no membership, or only default company exists.
-- Uses auth.uid() and SECURITY DEFINER so it is reliable regardless of
-- client-side JWT timing; no fragile client-side company_members query.
-- =============================================================================

create or replace function public.get_current_user_primary_company()
returns table (company_id uuid, role text)
language sql
security definer
set search_path = public
stable
as $$
  select cm.company_id, cm.role
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.company_id <> '00000000-0000-4000-8000-000000000001'::uuid
  order by cm.created_at asc
  limit 1;
$$;

grant execute on function public.get_current_user_primary_company() to authenticated;

comment on function public.get_current_user_primary_company() is
  'Returns the current user''s primary (oldest non-default) company and role. Used for app company resolution.';
