"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { isTechnicianMembershipRole, isMobileTechViewport } from "@/lib/roles";
import {
  Briefcase,
  Play,
  Receipt,
  Smartphone,
  Wrench,
} from "lucide-react";

const buttonPrimary =
  "inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-base font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const buttonSecondary =
  "inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-card-bg px-5 text-base font-medium text-[var(--dark)] transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, membershipRole } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (isTechnicianMembershipRole(membershipRole) && isMobileTechViewport()) {
      router.replace("/tech");
    } else {
      router.replace("/dashboard");
    }
  }, [user, loading, membershipRole, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--page-bg)]">
      {/* Navigation */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-card-bg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--dark)] hover:text-primary transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Sevora</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[var(--dark)] sm:block">
              Features
            </a>
            <a href="#pricing" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[var(--dark)] sm:block">
              Pricing
            </a>
            <Link href="/login" className={`${buttonSecondary} h-9 px-4 text-sm`}>
              Login
            </Link>
            <Link href="/signup" className={`${buttonPrimary} h-9 px-4 text-sm`}>
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero - branded dark gradient */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          {/* Soft blue accent glow */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#2563EB]/20 blur-3xl" aria-hidden />
          <div className="absolute bottom-0 right-1/3 h-60 w-60 rounded-full bg-[#60A5FA]/10 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Sevora</span>
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-[#93C5FD]">
                  14-day free trial · No credit card required · Set up in minutes
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-tight">
                  Run Your Service Business From One Place
                </h1>
                <p className="mt-4 text-lg text-slate-300">
                  Manage customers, schedule jobs, assign technicians, and send invoices — all from one place.
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  A simple all-in-one CRM for HVAC and service businesses
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link
                    href="/signup"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#2563EB] px-5 text-base font-medium text-white shadow-lg shadow-[#2563EB]/30 transition-colors hover:bg-[#1D4ED8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
                  >
                    Start Free Trial
                  </Link>
                  {/* Demo temporarily disabled until flow is ready.
                  <a
                    href="#"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-500/50 bg-white/5 px-5 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
                  >
                    <Play className="h-5 w-5" aria-hidden />
                    Watch Demo
                  </a>
                  */}
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      ✓
                    </span>
                    <span>Schedule jobs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      ✓
                    </span>
                    <span>Manage customers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      ✓
                    </span>
                    <span>Assign technicians</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      ✓
                    </span>
                    <span>Track work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      ✓
                    </span>
                    <span>Send invoices</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-sm">
                  <img
                    src="/dashboard-hero.png"
                    alt="Sevora dashboard showing jobs, schedule, and business metrics"
                    className="w-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features - light blue */}
        <section id="features" className="bg-[#EEF2FF] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--dark)]">
                    Simple Job Scheduling
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create jobs, assign technicians, and schedule appointments in seconds.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--dark)]">
                    Technician Mobile View
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Technicians can view jobs, call customers, get directions, and update job status from their phone.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--dark)]">
                    Fast Invoicing
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Send professional invoices to customers immediately after a job is completed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works - white */}
        <section id="how-it-works" className="bg-card-bg px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-[var(--dark)] sm:text-3xl">
              How it works
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  1
                </div>
                <h3 className="mt-4 font-semibold text-[var(--dark)]">Create the job</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Add the customer and service details in one place.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  2
                </div>
                <h3 className="mt-4 font-semibold text-[var(--dark)]">Assign the technician</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Drag and drop on the schedule board or pick from the list.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  3
                </div>
                <h3 className="mt-4 font-semibold text-[var(--dark)]">Send the invoice</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Create and send the invoice as soon as the job is done.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof - light blue */}
        <section id="testimonial" className="bg-[#EEF2FF] px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-lg text-slate-700 italic">
                  &ldquo;Sevora simplified our dispatching and invoicing. Our techs love the mobile view.&rdquo;
                </p>
                <p className="mt-4 text-center text-sm font-medium text-[var(--dark)]">
                  — HVAC Contractor
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing - white */}
        <section id="pricing" className="bg-card-bg px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-md">
            <h2 className="text-center text-2xl font-bold text-[var(--dark)] sm:text-3xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-center text-slate-600">
              Everything you need to schedule jobs, manage technicians, and keep your business organized.
            </p>
            <Card className="mt-10">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-[var(--dark)]">
                  $49 <span className="text-base font-normal text-slate-500">/ month</span>
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Cancel anytime. No contracts.
                </p>
                <div className="mt-8">
                  <Link href="/signup" className={`${buttonPrimary} block w-full text-center`}>
                    Start Free Trial
                  </Link>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Founding customer discounts available.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA - light blue */}
        <section id="cta" className="bg-[#EEF2FF] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-[var(--dark)] sm:text-3xl">
                Start Running Your Service Business Smarter
              </h2>
            <p className="mt-3 text-slate-600">
              14-day free trial. No credit card required. Cancel anytime.
            </p>
            <div className="mt-8">
              <Link href="/signup" className={buttonPrimary}>
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Sevora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
