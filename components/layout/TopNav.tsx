"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { MobileNavTrigger } from "./MobileNav";
import { TrialStatusIndicator } from "@/components/auth/TrialStatusIndicator";
import { useAuth } from "@/components/providers/AuthProvider";

export function TopNav() {
  const { user, signOut } = useAuth();

  return (
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-card-bg/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNavTrigger />
        <div className="relative hidden w-72 sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search customers, jobs..."
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-slate-50/80 pl-9 pr-4 text-sm text-[var(--dark)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TrialStatusIndicator />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="hidden h-8 w-px bg-[var(--border)] sm:block" />
        <div className="hidden items-center gap-3 sm:flex">
          {user ? (
            <>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {(user.email ?? "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--dark)] truncate max-w-[140px]">{user.email}</p>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-slate-500 hover:text-primary hover:underline"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary-hover hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
