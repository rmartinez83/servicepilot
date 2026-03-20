-- Team members management RPCs (roles + removal + listing with email/name)
-- These are SECURITY DEFINER so the app can manage company_members despite RLS.

-- List company members with user email + optional full name from auth.users
create or replace function public.list_company_members_with_user_info(p_company_id uuid)
returns table (
  id uuid,
  company_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Gate: only members of this company can list members.
  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id and cm.user_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    cm.id,
    cm.company_id,
    cm.user_id,
    cm.role,
    cm.created_at,
    u.email,
    coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(u.raw_user_meta_data->>'fullName', ''),
      nullif(u.raw_user_meta_data->>'name', '')
    ) as full_name
  from public.company_members cm
  join auth.users u on u.id = cm.user_id
  where cm.company_id = p_company_id
  order by cm.created_at asc;
end;
$$;

grant execute on function public.list_company_members_with_user_info(uuid) to authenticated;

-- Update a member's role (owner/admin/technician in UI; technician maps to company_members.role = 'member')
create or replace function public.update_company_member_role(
  p_company_id uuid,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_member_role text;
begin
  -- Gate: only owner/admin can update roles.
  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_role not in ('owner', 'admin', 'technician') then
    return jsonb_build_object('ok', false, 'error', 'Invalid role');
  end if;

  v_member_role := case
    when p_role = 'technician' then 'member'
    else p_role
  end;

  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Member not found');
  end if;

  update public.company_members
  set role = v_member_role
  where company_id = p_company_id and user_id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_company_member_role(uuid, uuid, text) to authenticated;

-- Remove a member from a company (delete their company_members row)
create or replace function public.remove_company_member(
  p_company_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Gate: only owner/admin can remove members.
  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Cannot remove yourself');
  end if;

  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Member not found');
  end if;

  delete from public.company_members
  where company_id = p_company_id and user_id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.remove_company_member(uuid, uuid) to authenticated;

