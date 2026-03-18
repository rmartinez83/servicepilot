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
import { useMemo, useState, useEffect, useCallback } from "react";
const TECH_JOBS_SELECTED_ID_KEY = "servicepilot-tech-jobs-technician-id";
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
import type { Customer, Job, Technician } from "@/lib/models";

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar day (YYYY-MM-DD) for a job in the technician's local timezone. */
function jobScheduledLocalYmd(scheduledDate: string | undefined | null): string | null {
  if (scheduledDate == null || !String(scheduledDate).trim()) return null;
  const s = String(scheduledDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return toLocalYmd(d);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

type DayTab = "yesterday" | "today" | "tomorrow";

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
                <span className="mb-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Next Job
                </span>
              )}
              <p className="truncate font-semibold text-slate-900">{customer?.name ?? "—"}</p>
              <p className="truncate text-sm text-slate-600">{job.title}</p>
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
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{customer.address}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3 pt-0">
          <Link href={`/jobs/${job.id}?returnTo=${encodeURIComponent(returnTo)}`} className="shrink-0">
            <Button variant="outline" size="md" className="min-h-11 w-full min-w-[44px] sm:w-auto">
              <FileText className="mr-1.5 h-4 w-4" />
              View
            </Button>
          </Link>
          {telHref && (
            <a href={telHref} className="inline-flex shrink-0">
              <Button variant="outline" size="md" className="min-h-11 min-w-[44px]">
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
              className="inline-flex shrink-0"
            >
              <Button variant="outline" size="md" className="min-h-11 min-w-[44px]">
                <Navigation className="mr-1.5 h-4 w-4" />
                Directions
              </Button>
            </a>
          )}
          {job.status === "scheduled" && (
            <Button size="md" className="min-h-11 min-w-[44px]" disabled={actionLoading} onClick={onStart}>
              <Play className="mr-1.5 h-4 w-4" />
              Start Job
            </Button>
          )}
          {job.status === "in_progress" && (
            <Button size="md" className="min-h-11 min-w-[44px]" disabled={actionLoading} onClick={onComplete}>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Complete Job
            </Button>
          )}
          <Link href={`/jobs/${job.id}/edit?returnTo=${encodeURIComponent(returnTo)}`} className="shrink-0">
            <Button variant="outline" size="md" className="min-h-11 min-w-[44px]">
              <FileText className="mr-1.5 h-4 w-4" />
              Notes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toLocalYmd(dt);
}

export default function TechPage() {
  const { user } = useAuth();
  const { jobs, loading: jobsLoading, updateJob } = useJobs();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [dayTab, setDayTab] = useState<DayTab>("today");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTechnicians(), getCustomers()]).then(([t, c]) => {
      if (cancelled) return;
      const list: Technician[] = Array.isArray(t) ? t : [];
      if (list.length > 0) {
        let initialId = list[0].id;
        try {
          const s = localStorage.getItem(TECH_JOBS_SELECTED_ID_KEY);
          if (s && list.some((x) => x.id === s)) initialId = s;
        } catch {
          /* ignore */
        }
        setSelectedTechnicianId(initialId);
      }
      setTechnicians(list);
      setCustomers(Array.isArray(c) ? c : []);
      setRosterLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** If user did not pick a saved technician, prefer account email match when it maps to a technician. */
  useEffect(() => {
    if (!rosterLoaded || technicians.length === 0) return;
    let fromStorage = false;
    try {
      const s = localStorage.getItem(TECH_JOBS_SELECTED_ID_KEY);
      fromStorage = Boolean(s && technicians.some((x) => x.id === s));
    } catch {
      /* ignore */
    }
    if (fromStorage) return;
    const email = (user?.email ?? "").trim().toLowerCase();
    const linked = email
      ? technicians.find((x) => (x.email ?? "").trim().toLowerCase() === email)
      : undefined;
    if (linked) setSelectedTechnicianId(linked.id);
  }, [rosterLoaded, technicians, user?.email]);

  useEffect(() => {
    if (!rosterLoaded || technicians.length === 0 || !selectedTechnicianId) return;
    if (technicians.some((t) => t.id === selectedTechnicianId)) return;
    const next = technicians[0].id;
    setSelectedTechnicianId(next);
    try {
      localStorage.setItem(TECH_JOBS_SELECTED_ID_KEY, next);
    } catch {
      /* ignore */
    }
  }, [rosterLoaded, technicians, selectedTechnicianId]);

  const techniciansSorted = useMemo(
    () => [...technicians].sort((a, b) => a.name.localeCompare(b.name)),
    [technicians]
  );

  const selectedTechnician = useMemo(
    () => technicians.find((t) => t.id === selectedTechnicianId) ?? null,
    [technicians, selectedTechnicianId]
  );

  function handleTechnicianChange(techId: string) {
    setSelectedTechnicianId(techId);
    try {
      localStorage.setItem(TECH_JOBS_SELECTED_ID_KEY, techId);
    } catch {
      /* ignore */
    }
  }

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const myJobs = useMemo((): JobWithCustomer[] => {
    if (!selectedTechnicianId) return [];
    const tid = String(selectedTechnicianId);
    return jobs
      .filter((j) => String(j.technicianId ?? "") === tid)
      .map((j) => ({ ...j, customer: customerById.get(j.customerId) }));
  }, [jobs, selectedTechnicianId, customerById]);

  const todayYmd = useMemo(() => toLocalYmd(new Date()), []);
  const yesterdayYmd = useMemo(() => addDaysYmd(todayYmd, -1), [todayYmd]);
  const tomorrowYmd = useMemo(() => addDaysYmd(todayYmd, 1), [todayYmd]);

  const selectedYmd = dayTab === "yesterday" ? yesterdayYmd : dayTab === "tomorrow" ? tomorrowYmd : todayYmd;

  const jobsForSelectedDay = useMemo(() => {
    const list = myJobs.filter((j) => jobScheduledLocalYmd(j.scheduledDate) === selectedYmd);
    list.sort((a, b) => {
      const ta = (a.scheduledTime || "00:00").localeCompare(b.scheduledTime || "00:00");
      if (ta !== 0) return ta;
      return a.id.localeCompare(b.id);
    });
    return list;
  }, [myJobs, selectedYmd]);

  const countForYmd = useCallback(
    (ymd: string) => myJobs.filter((j) => jobScheduledLocalYmd(j.scheduledDate) === ymd).length,
    [myJobs]
  );

  const nextJobId = useMemo(() => {
    const scheduled = jobsForSelectedDay.find((j) => j.status === "scheduled");
    if (scheduled) return scheduled.id;
    const inProg = jobsForSelectedDay.find((j) => j.status === "in_progress");
    return inProg?.id ?? null;
  }, [jobsForSelectedDay]);

  const emptyMessage =
    dayTab === "today"
      ? "No jobs scheduled for today."
      : dayTab === "yesterday"
        ? "No jobs scheduled for yesterday."
        : "No jobs scheduled for tomorrow.";

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

  const pageLoading = jobsLoading || !rosterLoaded;

  if (pageLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">My Jobs</h1>
        </header>
        <main className="mx-auto w-full max-w-lg flex-1 p-4">
          <p className="py-8 text-center text-slate-500">Loading…</p>
        </main>
      </div>
    );
  }

  const tabBtn = (tab: DayTab, label: string) => (
    <button
      type="button"
      onClick={() => setDayTab(tab)}
      className={`min-h-11 flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors sm:px-3 ${
        dayTab === tab
          ? "border-primary bg-primary text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );

  if (rosterLoaded && technicians.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">My Jobs</h1>
        </header>
        <main className="mx-auto w-full max-w-lg flex-1 p-4">
          <Card>
            <CardContent className="py-10 text-center">
              <Wrench className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-slate-700">No technicians yet.</p>
              <p className="mt-2 text-sm text-slate-500">Add technicians in the office app to assign jobs.</p>
              <Link href="/dashboard" className="mt-5 inline-block">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">My Jobs</h1>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 p-4 pb-10">
        <div>
          <label htmlFor="tech-jobs-technician" className="mb-1.5 block text-sm font-medium text-slate-700">
            Technician
          </label>
          <select
            id="tech-jobs-technician"
            value={selectedTechnicianId ?? ""}
            onChange={(e) => handleTechnicianChange(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {techniciansSorted.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedTechnician ? (
            <p className="mt-1 text-xs text-slate-500">{selectedTechnician.specialty}</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {tabBtn("yesterday", "Yesterday")}
          {tabBtn("today", "Today")}
          {tabBtn("tomorrow", "Tomorrow")}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            Yesterday: {countForYmd(yesterdayYmd)}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            Today: {countForYmd(todayYmd)}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            Tomorrow: {countForYmd(tomorrowYmd)}
          </span>
        </div>

        {jobsForSelectedDay.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              {jobsForSelectedDay.length} job{jobsForSelectedDay.length !== 1 ? "s" : ""}
            </h2>
            <div className="mt-2 space-y-2">
              {jobsForSelectedDay.map((job) => (
                <TechJobCard
                  key={job.id}
                  job={job}
                  isNextJob={job.id === nextJobId}
                  onStart={() => handleStart(job.id)}
                  onComplete={() => handleComplete(job.id)}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </section>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-slate-600">{emptyMessage}</p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
