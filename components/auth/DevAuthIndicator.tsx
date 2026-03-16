"use client";

import { useAuth } from "@/components/providers/AuthProvider";

/** Temporary dev indicator: shows authenticated email and current company id. Remove later. */
export function DevAuthIndicator() {
  const { user, currentCompanyId } = useAuth();
  if (!user) return null;

  return (
    <div
      className="fixed bottom-2 right-2 z-50 max-w-[280px] rounded border border-slate-200 bg-white/95 px-2 py-1.5 font-mono text-[10px] text-slate-500 shadow-sm backdrop-blur"
      title="Dev: remove when done testing"
    >
      <div className="truncate" title={user.email ?? ""}>
        {user.email}
      </div>
      <div className="truncate text-slate-400" title={currentCompanyId}>
        company: {currentCompanyId.slice(0, 8)}…
      </div>
    </div>
  );
}
