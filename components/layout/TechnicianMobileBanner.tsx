"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { isTechnicianMembershipRole } from "@/lib/roles";
import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * On the office dashboard, mobile technicians see a clear path to their job list
 * without auto-redirecting (so "Back" from /tech still works).
 */
export function TechnicianMobileBanner() {
  const pathname = usePathname();
  const { membershipRole, loading } = useAuth();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (loading || pathname !== "/dashboard") return null;
  if (!isTechnicianMembershipRole(membershipRole) || !mobile) return null;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 sm:px-4">
      <Smartphone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-[var(--dark)]">
        <span className="font-medium">Technician view:</span>{" "}
        <span className="text-slate-600">Your assigned jobs on mobile.</span>
      </p>
      <Link
        href="/tech"
        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Open
      </Link>
    </div>
  );
}
