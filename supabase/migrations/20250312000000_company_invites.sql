-- company_invites: allow owners/admins to invite employees into their company.
-- Accept flow uses accept_invite RPC (SECURITY DEFINER).

-- Table
create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  role text not null default 'technician' check (role in ('admin', 'member', 'technician')),
  invited_by_user_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  token text not null unique,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_invites_company_id on public.company_invites (company_id);
create index if not exists idx_company_invites_token on public.company_invites (token);
create index if not exists idx_company_invites_email on public.company_invites (company_id, email);

alter table public.company_invites enable row level security;

-- RLS: only owner or admin of the company can select/insert invites for that company
create policy "Owner or admin can manage company_invites"
  on public.company_invites
  for all
  to authenticated
  using (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Allow anyone with the token to read a single invite (for accept page). We use a permissive
-- policy that allows read when the row is visible; anon cannot see any (no policy for anon).
-- Authenticated users who are owner/admin already have access above. For the invitee we need
-- to allow reading invite by token. Easiest: RPC get_invite_by_token returns minimal public
-- info without RLS. So we don't need a separate "read by token" policy; the accept page will
-- call an RPC to get invite by token (read-only, returns company name + role + expires_at).

-- RPC: return public invite info by token (for accept page; no auth required to show "Join X as Y")
create or replace function public.get_invite_by_token(p_token text)
returns table (
  invite_id uuid,
  company_id uuid,
  company_name text,
  email text,
  role text,
  expires_at timestamptz,
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id,
    i.company_id,
    c.name,
    i.email,
    i.role,
    i.expires_at,
    i.status
  from public.company_invites i
  join public.companies c on c.id = i.company_id
  where i.token = p_token and i.status = 'pending';
$$;

-- RPC: accept an invite (signed-in user). Creates company_members row and marks invite accepted.
create or replace function public.accept_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user_id uuid;
  v_member_role text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select id, company_id, email, role, status, expires_at
  into v_invite
  from public.company_invites
  where token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invite not found');
  end if;
  if v_invite.status != 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Invite already used or cancelled');
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    update public.company_invites set status = 'expired' where id = v_invite.id;
    return jsonb_build_object('ok', false, 'error', 'Invite has expired');
  end if;

  -- Prevent duplicate membership
  if exists (
    select 1 from public.company_members
    where company_id = v_invite.company_id and user_id = v_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You are already a member of this company');
  end if;

  -- Map invite role to company_members role (company_members has owner, admin, member)
  v_member_role := case v_invite.role
    when 'technician' then 'member'
    else v_invite.role
  end;

  insert into public.company_members (company_id, user_id, role)
  values (v_invite.company_id, v_user_id, v_member_role);

  update public.company_invites
  set status = 'accepted', accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'company_id', v_invite.company_id);
end;
$$;

grant execute on function public.get_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- company_members SELECT: need BOTH policies so company detection and Team page work.
-- (1) Read own rows: non-circular; getCompanyIdForUser and auth provider rely on this.
-- (2) Read other members in my companies: uses (1) so subquery sees own rows; Team page can list members.
drop policy if exists "Authenticated read own company_members" on public.company_members;
drop policy if exists "Authenticated read company members" on public.company_members;
create policy "Authenticated read own company_members" on public.company_members
  for select to authenticated
  using (auth.uid() = user_id);
create policy "Authenticated read company members" on public.company_members
  for select to authenticated
  using (
    company_id in (
      select company_id from public.company_members cm2
      where cm2.user_id = auth.uid()
    )
  );

comment on table public.company_invites is 'Pending and accepted invites for company members (owner/admin only).';
