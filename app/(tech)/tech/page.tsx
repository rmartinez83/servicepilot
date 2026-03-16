"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/StatusBadge";
import {
  getTechnicians,
  getCustomers,
  formatPhoneNumber,
  formatScheduledDateAndTime,
} from "@/lib/data";
import { useAuth } from "@/components/providers/AuthProvider";
import { useJobs } from "@/components/providers/JobsProvider";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  MapPin,
  Phone,
  Play,
  FileText,
  Wrench,
  Navigation,
} from "lucide-react";
import type { Job } from "@/lib/models";
import type { Customer } from "@/lib/models";

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


type JobWithCustomer = Job & { customer: Customer | undefined };

function TechJobCard({
  job,
  isNextJob,
  onStart,
  onComplete,
  actionLoading,
}: {
  job: JobWithCustomer;
  isNextJob?: boolean;
  onStart: () => void;
  onComplete: () => void;
  actionLoading: boolean;
}) {
  const customer = job.customer;
  const returnTo = "/tech";
  const dateTimeLabel = formatScheduledDateAndTime(job.scheduledDate ?? "", job.scheduledTime);

  const telHref = customer?.phone ? `tel:${customer.phone.replace(/\D/g, "")}` : null;
  const mapsHref = customer?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isNextJob && (
                <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mb-1">
                  Next Job
                </span>
              )}
              <p className="font-semibold text-slate-900 truncate">
                {customer?.name ?? "—"}
              </p>
              <p className="text-sm text-slate-600 truncate">{job.title}</p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            {dateTimeLabel}
          </p>
          {customer?.phone ? (
            <p className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <a href={telHref ?? "#"} className="text-indigo-600 hover:underline">
                {formatPhoneNumber(customer.phone)}
              </a>
            </p>
          ) : null}
          {customer?.address ? (
            <p className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <span>{customer.address}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 p-3 pt-0 border-t border-slate-100">
          <Link href={`/jobs/${job.id}?returnTo=${encodeURIComponent(returnTo)}`} className="shrink-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <FileText className="mr-1.5 h-4 w-4" />
              View
            </Button>
          </Link>
          {telHref && (
            <a href={telHref} className="shrink-0 inline-flex">
              <Button variant="outline" size="sm">
                <Phone className="mr-1.5 h-4 w-4" />
                Call
              </Button>
            </a>
          )}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex"
            >
              <Button variant="outline" size="sm">
                <Navigation className="mr-1.5 h-4 w-4" />
                Directions
              </Button>
            </a>
          )}
          {job.status === "scheduled" && (
            <Button size="sm" disabled={actionLoading} onClick={onStart}>
              <Play className="mr-1.5 h-4 w-4" />
              Start Job
            </Button>
          )}
          {job.status === "in_progress" && (
            <Button size="sm" disabled={actionLoading} onClick={onComplete}>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Complete Job
            </Button>
          )}
          <Link href={`/jobs/${job.id}/edit?returnTo=${encodeURIComponent(returnTo)}`} className="shrink-0">
            <Button variant="outline" size="sm">
              <FileText className="mr-1.5 h-4 w-4" />
              Notes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TechPage() {
  const { user } = useAuth();
  const { jobs, loading: jobsLoading, updateJob } = useJobs();
  const [technicians, setTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const technician = useMemo(() => {
    const email = (user?.email ?? "").trim().toLowerCase();
    if (!email) return null;
    return technicians.find((t) => t.email.trim().toLowerCase() === email) ?? null;
  }, [user?.email, technicians]);

  useEffect(() => {
    getTechnicians().then((list) => setTechnicians(Array.isArray(list) ? list : []));
    getCustomers().then((list) => setCustomers(Array.isArray(list) ? list : []));
  }, []);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const myJobs = useMemo((): JobWithCustomer[] => {
    if (!technician) return [];
    return jobs
      .filter((j) => j.technicianId === technician.id)
      .map((j) => ({ ...j, customer: customerById.get(j.customerId) }));
  }, [jobs, technician, customerById]);

  const todayYmd = useMemo(() => toLocalYmd(new Date()), []);

  const { todayJobs, upcomingJobs, completedJobs } = useMemo(() => {
    const today: JobWithCustomer[] = [];
    const upcoming: JobWithCustomer[] = [];
    const completed: JobWithCustomer[] = [];
    for (const job of myJobs) {
      const date = parseJobDate(job.scheduledDate);
      const dateStr = (job.scheduledDate || "").slice(0, 10);
      if (job.status === "completed") {
        completed.push(job);
      } else if (dateStr === todayYmd) {
        today.push(job);
      } else if (date && dateStr > todayYmd && (job.status === "scheduled" || job.status === "in_progress")) {
        upcoming.push(job);
      }
    }
    today.sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || "") || (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
    upcoming.sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || "") || (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));
    completed.sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));
    return { todayJobs: today, upcomingJobs: upcoming, completedJobs: completed };
  }, [myJobs, todayYmd]);

  async function handleStart(jobId: string) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateJob(jobId, { status: "in_progress" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete(jobId: string) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateJob(jobId, { status: "completed" });
    } finally {
      setActionLoading(false);
    }
  }

  if (jobsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">My Jobs</h1>
        </header>
        <main className="flex-1 p-4">
          <p className="py-8 text-center text-slate-500">Loading jobs...</p>
        </main>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">My Jobs</h1>
        </header>
        <main className="flex-1 p-4">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-slate-600">
                No technician profile found for this account.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your email must match a technician record in the company.
              </p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">My Jobs</h1>
        <p className="text-sm text-slate-500">{technician.name} · {technician.specialty}</p>
      </header>

      <main className="flex-1 p-4 space-y-5 pb-8">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            Today: {todayJobs.length}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            Upcoming: {upcomingJobs.length}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            Completed: {completedJobs.length}
          </span>
        </div>

        {todayJobs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Jobs</h2>
            <p className="text-sm text-slate-500 mt-0.5">{todayJobs.length} job{todayJobs.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2 mt-2">
              {todayJobs.map((job, index) => (
                <TechJobCard
                  key={job.id}
                  job={job}
                  isNextJob={index === 0}
                  onStart={() => handleStart(job.id)}
                  onComplete={() => handleComplete(job.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </section>
        )}

        {upcomingJobs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Jobs</h2>
            <p className="text-sm text-slate-500 mt-0.5">{upcomingJobs.length} job{upcomingJobs.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2 mt-2">
              {upcomingJobs.map((job) => (
                <TechJobCard
                  key={job.id}
                  job={job}
                  onStart={() => handleStart(job.id)}
                  onComplete={() => handleComplete(job.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </section>
        )}

        {completedJobs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Completed Jobs</h2>
            <p className="text-sm text-slate-500 mt-0.5">{completedJobs.length} job{completedJobs.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2 mt-2">
              {completedJobs.map((job) => (
                <TechJobCard
                  key={job.id}
                  job={job}
                  onStart={() => handleStart(job.id)}
                  onComplete={() => handleComplete(job.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </section>
        )}

        {todayJobs.length === 0 && upcomingJobs.length === 0 && completedJobs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-slate-600">No jobs assigned to you yet.</p>
              <Link href="/dashboard" className="mt-3 inline-block">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
