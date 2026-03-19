"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createCompanyAndMembership, getCurrentUserPrimaryCompany } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const DEBUG = typeof process !== "undefined" && process.env.NODE_ENV === "development";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, companyIdFromMembership, refreshCompanyId } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishLoading, setFinishLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  async function handleFinishSetup(e: React.FormEvent) {
    e.preventDefault();
    const name = companyName.trim();
    if (!name || !user?.id) return;
    setFinishError(null);
    setFinishLoading(true);
    try {
      const { companyId: existingId } = await getCurrentUserPrimaryCompany();
      if (existingId != null) {
        await refreshCompanyId();
        return;
      }
      const { companyId, error } = await createCompanyAndMembership(name, user.id);
      if (error || !companyId) {
        setFinishError(error?.message ?? "Could not create company. Please try again.");
        return;
      }
      await refreshCompanyId();
    } finally {
      setFinishLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/80">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/80">
        <p className="text-sm text-slate-500">Redirecting to sign in…</p>
      </div>
    );
  }

  if (companyIdFromMembership == null) {
    if (DEBUG) {
      console.log("[DashboardGuard] Finish Setup", { userId: user.id, email: user.email });
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/80 p-4">
        <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-card-bg p-6 shadow-md">
          <h2 className="text-lg font-semibold text-[var(--dark)]">Finish setup</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create your company to start using Sevoro.
          </p>
          <form onSubmit={handleFinishSetup} className="mt-4 space-y-4">
            <div>
              <label htmlFor="finish-company-name" className="block text-sm font-medium text-slate-700">
                Company name
              </label>
              <input
                id="finish-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
                placeholder="e.g. Acme HVAC"
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {finishError && <p className="text-sm text-danger">{finishError}</p>}
            <Button type="submit" disabled={finishLoading} className="w-full">
              {finishLoading ? "Creating…" : "Create company"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
