"use client";

import { getSupabase } from "./supabase/client";

export type InviteRole = "admin" | "member" | "technician";

export type CompanyInvite = {
  id: string;
  company_id: string;
  email: string;
  role: string;
  invited_by_user_id: string;
  status: string;
  token: string;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type InvitePublicInfo = {
  invite_id: string;
  company_id: string;
  company_name: string;
  email: string;
  role: string;
  expires_at: string | null;
  status: string;
};

/** Create an invite. Caller must be owner or admin (RLS enforced). */
export async function createInvite(
  companyId: string,
  email: string,
  role: InviteRole,
  invitedByUserId: string,
  options?: { expiresInDays?: number }
): Promise<{ invite: CompanyInvite | null; token: string | null; error: Error | null }> {
  const supabase = getSupabase();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const expiresAt = options?.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("company_invites")
    .insert({
      company_id: companyId,
      email: email.trim().toLowerCase(),
      role,
      invited_by_user_id: invitedByUserId,
      status: "pending",
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return { invite: null, token: null, error: new Error(error.message) };
  }
  return {
    invite: data as CompanyInvite,
    token,
    error: null,
  };
}

/** List invites for a company. Caller must be owner or admin (RLS enforced). */
export async function listInvitesForCompany(companyId: string): Promise<{
  invites: CompanyInvite[];
  error: Error | null;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("company_invites")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { invites: [], error: new Error(error.message) };
  }
  return { invites: (data ?? []) as CompanyInvite[], error: null };
}

/** Get public invite info by token (for accept page). No auth required. */
export async function getInviteByToken(
  token: string
): Promise<{ info: InvitePublicInfo | null; error: Error | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { info: null, error: error ? new Error(error.message) : null };
  }
  const row = data[0] as Record<string, unknown>;
  return {
    info: {
      invite_id: row.invite_id as string,
      company_id: row.company_id as string,
      company_name: row.company_name as string,
      email: row.email as string,
      role: row.role as string,
      expires_at: row.expires_at as string | null,
      status: row.status as string,
    },
    error: null,
  };
}

/** Accept an invite (signed-in user). Calls RPC. */
export async function acceptInvite(token: string): Promise<{
  ok: boolean;
  companyId?: string;
  error?: string;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });

  if (error) {
    return { ok: false, error: error.message };
  }
  const result = data as { ok?: boolean; error?: string; company_id?: string } | null;
  if (!result || !result.ok) {
    return { ok: false, error: result?.error ?? "Failed to accept invite" };
  }
  return { ok: true, companyId: result.company_id };
}

/** Cancel a pending invite (sets status to 'cancelled'). Owner/admin only (RLS enforced). */
export async function cancelInvite(
  companyId: string,
  inviteId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("company_invites")
    .update({ status: "cancelled" })
    .eq("company_id", companyId)
    .eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
