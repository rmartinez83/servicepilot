"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSession, signIn as authSignIn, signOut as authSignOut, getCurrentUserPrimaryCompany, DEFAULT_COMPANY_ID } from "@/lib/auth";
import { setCurrentCompanyId } from "@/lib/db";
import { getSupabase } from "@/lib/supabase/client";

const DEBUG = typeof process !== "undefined" && process.env.NODE_ENV === "development";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  currentCompanyId: string;
  companyIdFromMembership: string | null;
  hasCompanyMembership: boolean;
  /** Role in primary company from RPC (e.g. admin, technician, owner). */
  membershipRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshCompanyId: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string>(DEFAULT_COMPANY_ID);
  const [companyIdFromMembership, setCompanyIdFromMembership] = useState<string | null>(null);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);

  const resolveCompanyOnce = useCallback(async (): Promise<string | null> => {
    const { companyId, role } = await getCurrentUserPrimaryCompany();
    setCompanyIdFromMembership(companyId);
    setMembershipRole(role ?? null);
    const resolved = companyId ?? DEFAULT_COMPANY_ID;
    setCurrentCompanyId(resolved);
    setCurrentCompanyIdState(resolved);
    if (DEBUG) console.log("[AuthProvider] resolved company id:", companyId ?? "null");
    return companyId;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (DEBUG) console.log("[AuthProvider] init start");

    // Initial bootstrap: wait for BOTH auth session and primary company lookup
    // before clearing the global loading state. This prevents the "finish setup"
    // screen from flashing for fully registered users.
    (async () => {
      try {
        const { data } = await getSession();
        const sess = data.session;
        setSession(sess);
        setUser(sess?.user ?? null);

        if (!sess?.user?.id) {
          if (DEBUG) console.log("[AuthProvider] no session");
          setCompanyIdFromMembership(null);
          setMembershipRole(null);
          setCurrentCompanyId(null);
          setCurrentCompanyIdState(DEFAULT_COMPANY_ID);
          return;
        }
        if (DEBUG) console.log("[AuthProvider] session exists");
        await resolveCompanyOnce();
      } finally {
        setLoading(false);
      }
    })();

    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user?.id) {
        setCompanyIdFromMembership(null);
        setMembershipRole(null);
        setCurrentCompanyId(null);
        setCurrentCompanyIdState(DEFAULT_COMPANY_ID);
        return;
      }
      resolveCompanyOnce();
    });

    return () => subscription?.unsubscribe?.();
  }, [resolveCompanyOnce]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authSignIn(email, password);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setCompanyIdFromMembership(null);
    setMembershipRole(null);
    setCurrentCompanyId(null);
    setCurrentCompanyIdState(DEFAULT_COMPANY_ID);
  }, []);

  const refreshCompanyId = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    return resolveCompanyOnce();
  }, [user, resolveCompanyOnce]);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    currentCompanyId,
    companyIdFromMembership,
    hasCompanyMembership: companyIdFromMembership != null,
    membershipRole,
    signIn,
    signOut,
    refreshCompanyId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
