"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getCompanyTrialStatus,
  getCurrentUserCompanyRole,
  getTrialStatusInfo,
  DEFAULT_COMPANY_ID,
} from "@/lib/auth";
import type { CompanyTrialStatus } from "@/lib/auth";
import { CreditCard } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return "—";
  }
}

function formatPlan(plan: string | null): string {
  if (!plan) return "—";
  const p = plan.toLowerCase();
  if (p === "trial") return "Trial";
  if (p === "starter") return "Starter";
  if (p === "pro") return "Pro";
  if (p === "enterprise") return "Enterprise";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatSubscriptionStatus(status: string | null): string {
  if (!status) return "—";
  const s = status.toLowerCase();
  if (s === "trialing") return "Trialing";
  if (s === "active") return "Active";
  if (s === "past_due") return "Past due";
  if (s === "canceled") return "Canceled";
  return status;
}

export default function BillingPage() {
  const { currentCompanyId, user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<CompanyTrialStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId || currentCompanyId === DEFAULT_COMPANY_ID) {
      setLoading(false);
      return;
    }
    Promise.all([
      user?.id ? getCurrentUserCompanyRole(currentCompanyId, user.id) : Promise.resolve(null),
      getCompanyTrialStatus(currentCompanyId),
    ])
      .then(([r, s]) => {
        setRole(r ?? null);
        setStatus(s ?? null);
      })
      .finally(() => setLoading(false));
  }, [currentCompanyId, user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading billing…</p>
      </div>
    );
  }

  // Non-owners: friendly access-limited message
  if (role !== "owner") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dark)]">Billing</h1>
          <p className="mt-1 text-slate-500">
            Subscription and billing are managed by your company owner.
          </p>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <CreditCard className="h-6 w-6" />
            </div>
            <p className="mt-4 text-slate-600">
              Only company owners can view and manage billing. If you need to change your plan or payment details, please ask your account owner or contact support.
            </p>
            <div className="mt-6">
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner: full billing view
  const trialInfo = getTrialStatusInfo(status);
  const plan = status?.plan ?? "—";
  const subscriptionStatus = status?.subscription_status ?? null;
  const trialEndsAt = status?.trial_ends_at ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--dark)]">Billing</h1>
        <p className="mt-1 text-slate-500">
          View your plan and manage your subscription.
        </p>
      </div>

      <Card>
      <CardHeader title="Current plan" />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Plan</p>
              <p className="mt-0.5 text-[var(--dark)]">{formatPlan(plan)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Subscription status</p>
              <p className="mt-0.5 text-[var(--dark)]">{formatSubscriptionStatus(subscriptionStatus)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Trial ends</p>
              <p className="mt-0.5 text-[var(--dark)]">{formatDate(trialEndsAt)}</p>
            </div>
            {trialInfo.isTrial && (
              <div>
                <p className="text-sm font-medium text-slate-500">Days left in trial</p>
                <p className="mt-0.5 text-[var(--dark)]">
                  {trialInfo.isExpired
                    ? "Trial ended"
                    : trialInfo.daysRemaining === 1
                      ? "1 day"
                      : `${trialInfo.daysRemaining} days`}
                </p>
              </div>
            )}
          </div>

          {trialInfo.isTrial && !trialInfo.isExpired && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-medium text-amber-900">After your trial</p>
              <p className="mt-1 text-sm text-amber-800">
                When your trial ends, you can start a paid subscription to keep using Sevoro. You’ll get full access to scheduling, technicians, and invoicing. No charge until you choose a plan.
              </p>
            </div>
          )}

          {trialInfo.isTrial && trialInfo.isExpired && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-[var(--dark)]">Trial ended</p>
              <p className="mt-1 text-sm text-slate-600">
                Start a subscription to continue using Sevoro.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button disabled title="Stripe integration coming soon">
              Start subscription
            </Button>
            <Button variant="outline" disabled title="Stripe integration coming soon">
              Manage billing
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
