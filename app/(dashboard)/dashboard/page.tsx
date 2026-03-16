"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/StatusBadge";
import {
  Calendar,
  DollarSign,
  Users,
  Wrench,
  ArrowUpRight,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useJobs } from "@/components/providers/JobsProvider";
import { getCustomers, getTechnicians, formatDate } from "@/lib/data";

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseJobDate(scheduledDate: string | undefined | null): Date | null {
  if (scheduledDate == null) return null;
  const s = String(scheduledDate).trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

export default function DashboardPage() {
  const { jobs, loading: jobsLoading } = useJobs();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [technicians, setTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);

  useEffect(() => {
    Promise.all([getCustomers(), getTechnicians()])
      .then(([c, t]) => {
        setCustomers(Array.isArray(c) ? c : []);
        setTechnicians(Array.isArray(t) ? t : []);
      })
      .catch(() => {
        setCustomers([]);
        setTechnicians([]);
      });
  }, []);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const todayYmd = useMemo(() => toLocalYmd(new Date()), []);
  const now = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`, []);

  const topStats = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.status === "scheduled" || j.status === "in_progress").length;
    const revenueMtd = jobs
      .filter((j) => {
        const d = parseJobDate(j.scheduledDate);
        if (!d) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}` === currentMonthStart && j.status !== "cancelled";
      })
      .reduce((sum, j) => sum + j.price, 0);
    const scheduledToday = jobs.filter((j) => {
      const d = parseJobDate(j.scheduledDate);
      return d != null && (j.scheduledDate || "").slice(0, 10) === todayYmd;
    }).length;
    return {
      activeJobs,
      revenueMtd,
      customers: customers.length,
      scheduledToday,
    };
  }, [jobs, customers.length, currentMonthStart, todayYmd]);

  const recentJobsList = useMemo(() => {
    const sorted = [...jobs]
      .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || "") || b.id.localeCompare(a.id))
      .slice(0, 5);
    return sorted.map((j) => ({
      ...j,
      customerName: customerById.get(j.customerId)?.name ?? "—",
    }));
  }, [jobs, customerById]);

  const quickStats = useMemo(() => {
    const thisMonthJobs = jobs.filter((j) => {
      const d = parseJobDate(j.scheduledDate);
      if (!d) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}` === currentMonthStart;
    });
    const completedThisMonth = thisMonthJobs.filter((j) => j.status === "completed").length;
    const nonCancelled = jobs.filter((j) => j.status !== "cancelled");
    const avgJobValue =
      nonCancelled.length > 0
        ? nonCancelled.reduce((s, j) => s + j.price, 0) / nonCancelled.length
        : 0;
    const activeTechnicians = technicians.filter((t) => t.active).length;
    const unassigned = jobs.filter((j) => !j.technicianId || String(j.technicianId).trim() === "").length;
    return {
      jobsCompletedThisMonth: completedThisMonth,
      avgJobValue,
      activeTechnicians,
      unassigned,
    };
  }, [jobs, technicians, currentMonthStart]);

  const loading = jobsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Welcome back. Here’s what’s happening with your service business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/jobs">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Jobs</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {loading ? "—" : topStats.activeJobs}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">scheduled or in progress</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-white">
                  <Wrench className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Revenue (MTD)</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {loading ? "—" : `$${topStats.revenueMtd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">current month</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customers">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Customers</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {loading ? "—" : topStats.customers.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">total</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/schedule">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Scheduled Today</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {loading ? "—" : topStats.scheduledToday}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">jobs today</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Jobs"
            subtitle="Latest activity across your team"
            action={
              <Link
                href="/jobs"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all
                <ArrowUpRight className="ml-0.5 inline h-4 w-4" />
              </Link>
            }
          />
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">Loading jobs...</div>
            ) : recentJobsList.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">No jobs yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentJobsList.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/50"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600">
                          {job.id.slice(-4)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{job.customerName}</p>
                          <p className="text-sm text-slate-500">{job.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500">
                          {formatDate(job.scheduledDate)}
                        </span>
                        <JobStatusBadge status={job.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Quick Stats"
            subtitle="This month"
          />
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Jobs completed</span>
              <span className="font-semibold text-slate-900">
                {loading ? "—" : quickStats.jobsCompletedThisMonth}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Avg. job value</span>
              <span className="font-semibold text-slate-900">
                {loading ? "—" : `$${Math.round(quickStats.avgJobValue).toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-600">Technicians active</span>
              <span className="font-semibold text-slate-900">
                {loading ? "—" : quickStats.activeTechnicians}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
              <span className="text-sm text-amber-700">
                <UserX className="mr-1 inline h-4 w-4" />
                Unassigned jobs
              </span>
              <span className="font-semibold text-amber-700">
                {loading ? "—" : quickStats.unassigned}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
