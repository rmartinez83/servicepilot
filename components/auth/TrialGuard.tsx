"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getCompanyTrialStatus } from "@/lib/auth";
import { DEFAULT_COMPANY_ID } from "@/lib/auth";

export function TrialGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentCompanyId } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === "/billing") {
      setChecking(false);
      return;
    }
    if (!currentCompanyId || currentCompanyId === DEFAULT_COMPANY_ID) {
      setChecking(false);
      return;
    }
    getCompanyTrialStatus(currentCompanyId)
      .then((status) => {
        if (!status) {
          setChecking(false);
          return;
        }
        const { subscription_status, trial_ends_at } = status;
        if (subscription_status === "active") {
          setChecking(false);
          return;
        }
        if (subscription_status === "trialing" && trial_ends_at) {
          const endsAt = new Date(trial_ends_at).getTime();
          if (Date.now() > endsAt) {
            router.replace("/billing");
            return;
          }
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [currentCompanyId, pathname, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }
  return <>{children}</>;
}
