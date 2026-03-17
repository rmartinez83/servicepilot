"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { APP_NAME, SIDEBAR_NAV } from "@/lib/constants";
import { Menu, Wrench, X } from "lucide-react";

export function MobileNavTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <MobileNavDrawer open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Slide-in: start off-screen then animate to visible
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  const drawer = (
    <>
      {/* Backdrop: dark semi-transparent overlay; tap to close */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 lg:hidden"
        aria-hidden
        onClick={onClose}
      />
      {/* Drawer: solid background, above backdrop, slide from left */}
      <div
        className={`fixed inset-y-0 left-0 z-[110] w-[80vw] max-w-[320px] border-r border-[var(--border)] bg-card-bg shadow-2xl transition-transform duration-200 ease-out lg:hidden ${
          mounted ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="truncate text-lg font-semibold text-[var(--dark)]">
              {APP_NAME}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[var(--dark)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col space-y-0.5 p-3">
          {SIDEBAR_NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[var(--dark)]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );

  if (typeof document === "undefined") return drawer;
  return createPortal(drawer, document.body);
}
