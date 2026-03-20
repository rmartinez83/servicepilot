 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarChart3, TrendingUp, Download, Calendar, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { DEFAULT_COMPANY_ID, getCompanyTrialStatus, type CompanyTrialStatus } from "@/lib/auth";

const reportCards = [
  {
    title: "Revenue report",
    description: "Revenue by period, service type, and technician.",
    icon: BarChart3,
    lastRun: "Mar 8, 2025",
  },
  {
    title: "Job performance",
    description: "Completion rates, average duration, and bottlenecks.",
    icon: TrendingUp,
    lastRun: "Mar 8, 2025",
  },
  {
    title: "Technician utilization",
    description: "Hours worked, jobs per tech, and capacity.",
    icon: Calendar,
    lastRun: "Mar 7, 2025",
  },
];

const summaryData = [
  { label: "Total revenue (MTD)", value: "$42,580", change: "+12%" },
  { label: "Jobs completed", value: "89", change: "+8%" },
  { label: "Avg. job value", value: "$478", change: "+5%" },
  { label: "Customer retention", value: "94%", change: "+2%" },
];

export default function ReportsPage() {
  const { currentCompanyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState<CompanyTrialStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentCompanyId || currentCompanyId === DEFAULT_COMPANY_ID) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const status = await getCompanyTrialStatus(currentCompanyId);
        if (!cancelled) setTrialStatus(status);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentCompanyId]);

  const plan = trialStatus?.plan ?? null;
  const isPro = (plan ?? "").toLowerCase() === "pro";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            {!loading && !isPro ? (
              <Badge variant="info" className="gap-1">
                <Lock className="h-3.5 w-3.5" />
                Pro
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-slate-500">
            Analytics and insights for your service business.
          </p>
        </div>
        <Button variant="outline" disabled={!loading && !isPro} title={!loading && !isPro ? "Pro feature" : undefined}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(isPro ? summaryData : summaryData.slice(0, 2)).map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {item.value}
              </p>
              <p className="mt-0.5 text-sm text-emerald-600">{item.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.title}
              className={`flex flex-col ${!loading && !isPro ? "pointer-events-none opacity-60 blur-[1px]" : ""}`}
            >
              <CardHeader
                title={report.title}
                subtitle={report.description}
                action={
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                }
              />
              <CardContent className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">
                  Last run: {report.lastRun}
                </span>
                <Button variant="ghost" size="sm" disabled={!loading && !isPro} title={!loading && !isPro ? "Pro feature" : undefined}>
                  Run report
                </Button>
              </CardContent>
            </Card>
          );
          })}
        </div>

        {!loading && !isPro ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-white/70 p-6 text-center backdrop-blur"
            aria-hidden={false}
          >
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-slate-700" />
              <span className="text-sm font-medium text-slate-700">Pro required</span>
            </div>
            <p className="max-w-[420px] text-sm text-slate-700">
              Advanced reporting is available on the Pro plan.
            </p>
            <Link href="/billing" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
