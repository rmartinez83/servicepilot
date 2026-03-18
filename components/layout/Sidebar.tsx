"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, SIDEBAR_NAV } from "@/lib/constants";
import { useAuth } from "@/components/providers/AuthProvider";
import { Smartphone, Wrench } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-card-bg lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <Wrench className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-[var(--dark)]">{APP_NAME}</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {SIDEBAR_NAV.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[var(--dark)]"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-slate-400"}`}
              />
              {item.label}
            </Link>
          );
        })}
        {user ? (
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <Link
              href="/tech"
              className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
              Technician mobile view
            </Link>
            <p className="mt-1 px-3 text-xs text-slate-500">Same as /tech or /mobile</p>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
