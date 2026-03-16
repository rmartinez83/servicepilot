"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  formatPhoneNumber,
  formatScheduledDateTime,
  getCustomers,
  getTechnicians,
} from "@/lib/data";
import { useJobs } from "@/components/providers/JobsProvider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { withReturnTo } from "@/lib/returnTo";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Calendar, CheckCircle, Clock, Plus, Search, UserX, Wrench } from "lucide-react";
import type { Job } from "@/lib/models";

type DateFilter = "today" | "tomorrow" | "week";

/** Local date as YYYY-MM-DD. */
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD to a local Date (midnight local time) for safe calendar math. */
function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date();
  return new Date(y, m - 1, d);
}

/**
 * Parse job's scheduled_date (API string: "YYYY-MM-DD" or ISO) to a local Date.
 * Uses local calendar day only — no raw string comparison. Returns null if unparseable.
 */
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

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DateRangeResult = {
  start: string;
  end: string;
  startDate: Date;
  endDate: Date;
};

/**
 * Week definition: Sunday (getDay() === 0) through Saturday (getDay() === 6).
 * US convention. Start and end are inclusive.
 * All ranges are derived from referenceYmd only (no real-world "today").
 * Returns both string range (for display) and Date objects (for safe comparison).
 */
function getDateRange(filter: DateFilter, referenceYmd: string): DateRangeResult {
  const fallback = toLocalYmd(new Date());
  const fallbackDate = ymdToLocalDate(fallback);
  if (!referenceYmd || referenceYmd.length < 10) {
    return { start: fallback, end: fallback, startDate: fallbackDate, endDate: fallbackDate };
  }
  const ref = ymdToLocalDate(referenceYmd.slice(0, 10));
  if (filter === "today") {
    const s = toLocalYmd(ref);
    return { start: s, end: s, startDate: new Date(ref.getTime()), endDate: new Date(ref.getTime()) };
  }
  if (filter === "tomorrow") {
    const next = new Date(ref);
    next.setDate(ref.getDate() + 1);
    const s = toLocalYmd(next);
    return { start: s, end: s, startDate: next, endDate: new Date(next.getTime()) };
  }
  const dayOfWeek = ref.getDay();
  const startOfWeek = new Date(ref);
  startOfWeek.setDate(ref.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    start: toLocalYmd(startOfWeek),
    end: toLocalYmd(endOfWeek),
    startDate: startOfWeek,
    endDate: endOfWeek,
  };
}

/** Normalize to YYYY-MM-DD for display only (not used for filtering). */
function toYmdOnly(value: string | undefined | null): string {
  if (value == null) return "";
  const s = String(value).trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return s.slice(0, 10) || "";
}

const DRAG_TYPE = "application/x-servicepilot-job";

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterTechnicianId = searchParams.get("technicianId");
  const { jobs, loading: jobsLoading, updateJob } = useJobs();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [allTechnicians, setAllTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);
  const [filter, setFilter] = useState<DateFilter>("today");
  const [selectedYmd, setSelectedYmd] = useState<string>(() => toLocalYmd(new Date()));
  const [scheduleTechnicianId, setScheduleTechnicianId] = useState<string>(() => filterTechnicianId ?? "");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setScheduleTechnicianId((prev) => filterTechnicianId ?? prev ?? "");
  }, [filterTechnicianId]);

  useEffect(() => {
    Promise.all([getCustomers(), getTechnicians()])
      .then(([c, t]) => {
        setCustomers(Array.isArray(c) ? c : []);
        setAllTechnicians(Array.isArray(t) ? t : []);
      })
      .catch(() => {
        setCustomers([]);
        setAllTechnicians([]);
      });
  }, []);

  const technicians = useMemo(() => {
    const id = scheduleTechnicianId || filterTechnicianId;
    if (!id) return allTechnicians;
    const found = allTechnicians.find((t) => t.id === id);
    return found ? [found] : allTechnicians;
  }, [allTechnicians, scheduleTechnicianId, filterTechnicianId]);

  const dateRange = useMemo(() => getDateRange(filter, selectedYmd), [filter, selectedYmd]);
  const { start, end, startDate, endDate } = dateRange;
  /** Reference date for "today" in stats (Date for comparison). */
  const referenceDate = useMemo(
    () => ymdToLocalDate(selectedYmd.slice(0, 10) || toLocalYmd(new Date())),
    [selectedYmd]
  );
  /** Selected date as YYYY-MM-DD for the date picker value. */
  const referenceDateStr = selectedYmd.slice(0, 10) || toLocalYmd(new Date());

  /** Human-readable active range for Today / Tomorrow / This Week (e.g. "Mar 10, 2026" or "Mar 8, 2026 – Mar 14, 2026"). */
  const activeRangeLabel = useMemo(() => {
    if (filter === "today" || filter === "tomorrow") return formatDate(dateRange.start);
    return `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`;
  }, [filter, dateRange.start, dateRange.end]);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const technicianById = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const dateRangeFilteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const jobDate = parseJobDate(j.scheduledDate);
      if (!jobDate) return false;
      if (filter === "today") return isSameCalendarDay(jobDate, startDate);
      if (filter === "tomorrow") return isSameCalendarDay(jobDate, startDate);
      return jobDate.getTime() >= startDate.getTime() && jobDate.getTime() <= endDate.getTime();
    });
  }, [jobs, filter, startDate, endDate]);

  const technicianFilteredJobs = useMemo(() => {
    if (!scheduleTechnicianId) return dateRangeFilteredJobs;
    return dateRangeFilteredJobs.filter(
      (j) => !j.technicianId || String(j.technicianId).trim() === "" || j.technicianId === scheduleTechnicianId
    );
  }, [dateRangeFilteredJobs, scheduleTechnicianId]);

  const filteredJobs = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return technicianFilteredJobs;
    return technicianFilteredJobs.filter((j) => {
      const name = customerById.get(j.customerId)?.name ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [technicianFilteredJobs, customerSearchQuery, customerById]);

  /** Unassigned = technician_id is null, undefined, or empty string (no scheduled_time required). */
  const isUnassigned = useCallback((j: Job) => {
    const tid = j.technicianId;
    return tid == null || String(tid).trim() === "";
  }, []);

  const timeSortKey = (j: Job) => (j.scheduledTime?.trim() || "zzzz");

  const unassignedJobs = useMemo(() => {
    const list = filteredJobs.filter(isUnassigned);
    return [...list].sort(
      (a, b) =>
        (a.scheduledDate || "").localeCompare(b.scheduledDate || "") ||
        timeSortKey(a).localeCompare(timeSortKey(b)) ||
        a.id.localeCompare(b.id)
    );
  }, [filteredJobs]);

  const jobsByTechnician = useMemo(() => {
    const map = new Map<string, Job[]>();
    technicians.forEach((t) => map.set(t.id, []));
    filteredJobs.forEach((j) => {
      const tid = j.technicianId;
      if (tid != null && String(tid).trim() !== "" && map.has(tid)) {
        map.get(tid)!.push(j);
      }
    });
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          (a.scheduledDate || "").localeCompare(b.scheduledDate || "") ||
          timeSortKey(a).localeCompare(timeSortKey(b)) ||
          a.id.localeCompare(b.id)
      )
    );
    return map;
  }, [filteredJobs, technicians]);

  const summary = useMemo(() => {
    const refDateJobs = filteredJobs.filter((j) => {
      const d = parseJobDate(j.scheduledDate);
      return d != null && isSameCalendarDay(d, referenceDate);
    });
    return {
      jobsToday: refDateJobs.length,
      unassigned: filteredJobs.filter((j) => isUnassigned(j)).length,
      completedToday: refDateJobs.filter((j) => j.status === "completed").length,
      inProgress: filteredJobs.filter((j) => j.status === "in_progress").length,
    };
  }, [filteredJobs, referenceDate, isUnassigned]);

  const handleDrop = useCallback(
    async (jobId: string, targetTechnicianId: string | null) => {
      if (!jobId || updating) return;
      setDropTarget(null);
      setDraggingJobId(null);
      setUpdating(true);
      try {
        await updateJob(jobId, { technicianId: targetTechnicianId });
      } finally {
        setUpdating(false);
      }
    },
    [updateJob, updating]
  );

  if (jobsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="mt-1 text-slate-500">Daily dispatch board</p>
        </div>
        <div className="py-12 text-center text-slate-500">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="mt-1 text-slate-500">
            View and manage technician schedules and appointments.
          </p>
        </div>
        <Link
          href={withReturnTo(
            "/jobs/new",
            filterTechnicianId ? `/schedule?technicianId=${filterTechnicianId}` : "/schedule"
          )}
          className="shrink-0"
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule job
          </Button>
        </Link>
      </div>

      {/* Control bar: date + filters */}
      <div className="rounded-[10px] border border-[var(--border)] bg-card-bg p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label htmlFor="schedule-reference-date" className="text-sm font-medium text-[var(--dark)]">
                View date
              </label>
              <input
                id="schedule-reference-date"
                type="date"
                value={referenceDateStr}
                onChange={(e) => setSelectedYmd(e.target.value || toLocalYmd(new Date()))}
                className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filter === "today" ? "primary" : "outline"}
                size="sm"
                onClick={() => setFilter("today")}
              >
                Today
              </Button>
              <Button
                variant={filter === "tomorrow" ? "primary" : "outline"}
                size="sm"
                onClick={() => setFilter("tomorrow")}
              >
                Tomorrow
              </Button>
              <Button
                variant={filter === "week" ? "primary" : "outline"}
                size="sm"
                onClick={() => setFilter("week")}
              >
                This Week
              </Button>
            </div>
            <span className="text-sm text-slate-600" aria-live="polite">
              Showing <strong className="font-medium text-[var(--dark)]">{activeRangeLabel}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4 lg:border-t-0 lg:pt-0">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-400" aria-hidden />
              <label htmlFor="schedule-technician-filter" className="text-sm font-medium text-[var(--dark)]">
                Technician
              </label>
              <select
                id="schedule-technician-filter"
                value={scheduleTechnicianId}
                onChange={(e) => setScheduleTechnicianId(e.target.value)}
                className="h-9 min-w-[180px] rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Technicians</option>
                {allTechnicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.specialty}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <label htmlFor="schedule-customer-search" className="text-sm font-medium text-[var(--dark)]">
                Customer
              </label>
              <input
                id="schedule-customer-search"
                type="search"
                placeholder="Search by customer name..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="h-9 w-52 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-sm">
          <span className="text-slate-500">Quick dates:</span>
          {[
            { label: "Jan 2025", ymd: "2025-01-15" },
            { label: "Jun 2025", ymd: "2025-06-01" },
            { label: "Mar 2026", ymd: "2026-03-10" },
          ].map(({ label, ymd }) => (
            <button
              key={ymd}
              type="button"
              onClick={() => setSelectedYmd(ymd)}
              className="rounded-md border border-[var(--border)] bg-slate-50 px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-[var(--dark)]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] text-[#1D4ED8]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--dark)]">{summary.jobsToday}</p>
                <p className="text-sm text-slate-500">Jobs today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--dark)]">{summary.unassigned}</p>
                <p className="text-sm text-slate-500">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D1FAE5] text-[#065F46]">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--dark)]">{summary.completedToday}</p>
                <p className="text-sm text-slate-500">Completed today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#6D28D9]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--dark)]">{summary.inProgress}</p>
                <p className="text-sm text-slate-500">In progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Board — technician columns (above Unassigned) */}
      <Card>
        <CardHeader
          title="Dispatch Board"
          subtitle={`${activeRangeLabel} · Drag jobs between columns to assign or reassign technicians`}
        />
        <CardContent className="p-0">
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
            {technicians.map((tech) => {
              const techJobs = jobsByTechnician.get(tech.id) ?? [];
              const isDropTarget = dropTarget === tech.id;
              return (
                <div
                  key={tech.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTarget(tech.id);
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === tech.id ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const jobId = e.dataTransfer.getData(DRAG_TYPE);
                    if (jobId) handleDrop(jobId, tech.id);
                  }}
                  className={`flex w-72 shrink-0 flex-col rounded-[10px] border bg-white p-4 shadow-sm transition-colors ${
                    isDropTarget
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="mb-3 border-b border-[var(--border)] pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--dark)]">{tech.name}</p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {techJobs.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{tech.specialty}</p>
                  </div>
                  <div className="flex min-h-[100px] flex-col gap-2">
                    {techJobs.map((job) => (
                      <DispatchJobCard
                        key={job.id}
                        job={job}
                        customerName={job.customerName ?? customerById.get(job.customerId)?.name ?? "—"}
                        customerPhone={customerById.get(job.customerId)?.phone}
                        onSelect={() => router.push(`/jobs/${job.id}?returnTo=/schedule`)}
                        onDragStart={() => setDraggingJobId(job.id)}
                        onDragEnd={() => setDraggingJobId(null)}
                        isDragging={draggingJobId === job.id}
                        dragType={DRAG_TYPE}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {technicians.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">No technicians. Add technicians to see columns.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Jobs */}
      <Card>
        <CardHeader
          title="Unassigned Jobs"
          subtitle={
            unassignedJobs.length === 0
              ? "Jobs without a technician — drag from here or from a column to assign"
              : `${unassignedJobs.length} job${unassignedJobs.length !== 1 ? "s" : ""} need assignment — drag to a technician column`
          }
        />
        <CardContent>
          {unassignedJobs.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTarget("unassigned");
              }}
              onDragLeave={() => setDropTarget((t) => (t === "unassigned" ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                const jobId = e.dataTransfer.getData(DRAG_TYPE);
                if (jobId) handleDrop(jobId, null);
              }}
              className={`min-h-[120px] rounded-[10px] border-2 border-dashed p-6 transition-colors ${
                dropTarget === "unassigned"
                  ? "border-primary bg-primary/5"
                  : "border-[var(--border)] bg-slate-50/50"
              }`}
            >
              <p className="py-4 text-center text-sm text-slate-500">
                No unassigned jobs in this range. Assign new jobs by dragging them here from the board, or schedule a job and assign a technician.
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTarget("unassigned");
              }}
              onDragLeave={() => setDropTarget((t) => (t === "unassigned" ? null : t))}
              onDrop={(e) => {
                e.preventDefault();
                const jobId = e.dataTransfer.getData(DRAG_TYPE);
                if (jobId) handleDrop(jobId, null);
              }}
              className={`grid gap-3 rounded-[10px] border border-[var(--border)] bg-amber-50/30 p-4 sm:grid-cols-2 lg:grid-cols-3 ${
                dropTarget === "unassigned" ? "ring-2 ring-amber-200" : ""
              }`}
            >
              {unassignedJobs.map((job) => (
                <DispatchJobCard
                  key={job.id}
                  job={job}
                  customerName={job.customerName ?? customerById.get(job.customerId)?.name ?? "—"}
                  customerPhone={customerById.get(job.customerId)?.phone}
                  onSelect={() => router.push(`/jobs/${job.id}?returnTo=/schedule`)}
                  onDragStart={() => setDraggingJobId(job.id)}
                  onDragEnd={() => setDraggingJobId(null)}
                  isDragging={draggingJobId === job.id}
                  dragType={DRAG_TYPE}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-slate-600">
              No jobs in this date range.
            </p>
            <p className="text-sm text-slate-500">
              Schedule a new job to get started, or change the date or filters above.
            </p>
            <Link
              href="/jobs/new?returnTo=/schedule"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Schedule job
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DispatchJobCard({
  job,
  customerName,
  customerPhone,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
  dragType,
}: {
  job: Job;
  customerName: string;
  customerPhone?: string | null;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragType: string;
}) {
  const justDragged = useRef(false);
  const phoneStr = customerPhone ? formatPhoneNumber(customerPhone) : null;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(dragType, job.id);
        e.dataTransfer.effectAllowed = "move";
        justDragged.current = false;
        onDragStart();
      }}
      onDragEnd={() => {
        justDragged.current = true;
        onDragEnd();
        setTimeout(() => { justDragged.current = false; }, 100);
      }}
      onClick={() => {
        if (!justDragged.current) onSelect();
      }}
      className={`cursor-grab rounded-[10px] border border-[var(--border)] bg-white p-3 text-left shadow-sm transition-colors active:cursor-grabbing hover:border-primary/40 hover:shadow ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-[var(--dark)]">{customerName}</span>
        <JobStatusBadge status={job.status} />
      </div>
      <p className="mt-1 text-sm text-slate-600">{job.title}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {formatScheduledDateTime(job.scheduledDate, job.scheduledTime)}
      </p>
      {phoneStr && (
        <p className="mt-1 text-xs text-slate-500">{phoneStr}</p>
      )}
    </div>
  );
}
