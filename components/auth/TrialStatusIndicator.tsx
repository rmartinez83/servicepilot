"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getCompanyTrialStatus,
  getCurrentUserCompanyRole,
  getTrialStatusInfo,
  DEFAULT_COMPANY_ID,
} from "@/lib/auth";

/**
 * Shows trial status in the app header (e.g. "Trial • 12 days left").
 * Shown primarily to company owners. Updates automatically as time passes.
 */
export function TrialStatusIndicator() {
  const { currentCompanyId, user } = useAuth();
  const [label, setLabel] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentCompanyId || currentCompanyId === DEFAULT_COMPANY_ID) {
      setLabel(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const updateLabel = (status: Awaited<ReturnType<typeof getCompanyTrialStatus>>) => {
      const info = getTrialStatusInfo(status);
      if (!info.isTrial) {
        setLabel(null);
        return;
      }
      if (info.isExpired) {
        setLabel("Trial • Expired");
        return;
      }
      if (info.daysRemaining <= 0) {
        setLabel("Trial • Last day");
        return;
      }
      setLabel(
        info.daysRemaining === 1
          ? "Trial • 1 day left"
          : `Trial • ${info.daysRemaining} days left`
      );
    };

    Promise.all([
      getCompanyTrialStatus(currentCompanyId),
      user?.id ? getCurrentUserCompanyRole(currentCompanyId, user.id) : Promise.resolve(null),
    ]).then(([status, role]) => {
      if (cancelled) return;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (role !== "owner") {
        setLabel(null);
        return;
      }
      updateLabel(status);

      // Recompute label every minute so "X days left" updates as time passes
      intervalRef.current = setInterval(() => updateLabel(status), 60 * 1000);
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentCompanyId, user?.id]);

  if (!label) return null;

  return (
    <Link
      href="/billing"
      className="hidden items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 sm:flex"
      title="View billing and plan"
    >
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      {label}
    </Link>
  );
}
