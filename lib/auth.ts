"use client";

import type { User, Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase/client";
import { CURRENT_COMPANY_ID } from "./db";

export type { User, Session };

/** Get current session (requires browser). */
export async function getSession(): Promise<{ data: { session: Session | null } }> {
  const supabase = getSupabase();
  return supabase.auth.getSession();
}

/** Sign in with email and password. Returns session so callers can use it without getSession(). */
export async function signIn(
  email: string,
  password: string
): Promise<{ data: { session: Session | null } | null; error: Error | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    data: data ? { session: data.session ?? null } : null,
    error: error ? new Error(error.message) : null,
  };
}

/** Sign up with email and password. Optional metadata for full_name. */
export async function signUp(
  email: string,
  password: string,
  options?: { fullName?: string }
): Promise<{
  data: { user: User | null; session: Session | null } | null;
  error: Error | null;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: options?.fullName ? { full_name: options.fullName } : undefined,
    },
  });
  return {
    data: data ? { user: data.user ?? null, session: data.session ?? null } : null,
    error: error ? new Error(error.message) : null,
  };
}

/** Sign out. */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

const DEBUG = typeof process !== "undefined" && process.env.NODE_ENV === "development";

/** Default company id when no auth or no membership. Re-export for auth provider. */
export const DEFAULT_COMPANY_ID = CURRENT_COMPANY_ID;

/**
 * Single source of truth for current user's primary company.
 * Calls SECURITY DEFINER RPC get_current_user_primary_company() which uses auth.uid()
 * server-side — no fragile client-side company_members query or JWT timing issues.
 * Returns oldest non-default company; null if none or only default company.
 */
export async function getCurrentUserPrimaryCompany(): Promise<{
  companyId: string | null;
  role: string | null;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_current_user_primary_company");
  if (error) return { companyId: null, role: null };
  const row = Array.isArray(data) ? data[0] : null;
  const companyId = row?.company_id ?? null;
  const role = row?.role ?? null;
  if (DEBUG) console.log("[getCurrentUserPrimaryCompany] resolved:", companyId ?? "null", role ?? "null");
  return { companyId, role };
}

/** Generate a URL-safe slug from company name; append short suffix for uniqueness. */
export function slugifyCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return (base || "company") + "-" + suffix;
}

/**
 * Create a new company and add the current user as owner via RPC.
 * Uses SECURITY DEFINER so it is not blocked by RLS. Call only when the client has a session.
 * Requires migration 20250311000000_create_company_rpc.sql to be applied in Supabase.
 */
export async function createCompanyAndMembership(
  companyName: string,
  _userId: string
): Promise<{ companyId: string | null; error: Error | null }> {
  const supabase = getSupabase();
  const slug = slugifyCompanyName(companyName);

  const { data: companyId, error } = await supabase.rpc("create_company_for_current_user", {
    p_name: companyName.trim(),
    p_slug: slug,
  });

  if (error) {
    return {
      companyId: null,
      error: new Error(
        error.code === "42883"
          ? "Company creation is not set up. Run the create_company_for_current_user migration in Supabase."
          : `Company creation failed: ${error.message}`
      ),
    };
  }
  if (companyId == null || typeof companyId !== "string") {
    return { companyId: null, error: new Error("Company creation failed: no company id returned.") };
  }
  return { companyId, error: null };
}

export type CompanyTrialStatus = {
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
};

export type TrialStatusInfo = {
  isTrial: boolean;
  daysRemaining: number;
  isExpired: boolean;
};

/**
 * Derive trial visibility info from company billing fields.
 * Use for UI only; does not fetch from DB.
 */
export function getTrialStatusInfo(status: CompanyTrialStatus | null): TrialStatusInfo {
  const result: TrialStatusInfo = { isTrial: false, daysRemaining: 0, isExpired: false };
  if (!status) return result;

  const trialing =
    status.subscription_status === "trialing" || status.plan === "trial";
  if (!trialing) return result;

  result.isTrial = true;
  const endsAt = status.trial_ends_at ? new Date(status.trial_ends_at).getTime() : 0;
  if (!endsAt) return result;

  const now = Date.now();
  if (now >= endsAt) {
    result.isExpired = true;
    return result;
  }
  result.daysRemaining = Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000));
  return result;
}

/**
 * Get the current user's role for the given company (owner, admin, member).
 * Pass userId so we return only that user's row (RLS allows reading all members of the company).
 */
export async function getCurrentUserCompanyRole(
  companyId: string,
  userId: string
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { role?: string }).role ?? null;
}

export type CompanyMemberRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

/** List all members of a company. Caller must be a member (RLS enforced). */
export async function listCompanyMembers(
  companyId: string
): Promise<{ members: CompanyMemberRow[]; error: Error | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, role, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) return { members: [], error: new Error(error.message) };
  return { members: (data ?? []) as CompanyMemberRow[], error: null };
}

/**
 * Fetch trial/billing fields for the current company. Used for trial expiration check.
 * Call from client only. RLS: user must be a member of the company.
 */
export async function getCompanyTrialStatus(companyId: string): Promise<CompanyTrialStatus | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select("plan, subscription_status, trial_ends_at")
    .eq("id", companyId)
    .single();
  if (error || !data) return null;
  return data as CompanyTrialStatus;
}
