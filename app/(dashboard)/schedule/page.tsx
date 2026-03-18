"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { JobStatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  formatPhoneNumber,
  formatScheduledDateTime,
  formatScheduledTime,
  getCustomers,
  getTechnicians,
} from "@/lib/data";
import { useJobs } from "@/components/providers/JobsProvider";
import { ensureDemoScheduleData } from "@/lib/demoScheduleSeed";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { withReturnTo } from "@/lib/returnTo";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Calendar, CalendarClock, CheckCircle, Clock, ExternalLink, Plus, Search, UserPlus, UserX, Wrench, CalendarPlus } from "lucide-react";
import type { Job } from "@/lib/models";
import type { Technician } from "@/lib/models";

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

/** Working hours: 8:00 AM–5:00 PM (minutes from midnight). */
const WORK_START_MIN = 8 * 60;
const WORK_END_MIN = 17 * 60;
const SLOT_DURATION_MIN = 120; // 2-hour default for HVAC-style scheduling

/** Parse "09:00" or "14:30" to minutes from midnight. Returns null if missing/invalid. */
function timeStrToMinutes(timeStr: string | undefined | null): number | null {
  if (!timeStr || !/^\d{1,2}:\d{2}/.test(timeStr.trim())) return null;
  const [h, m] = timeStr.trim().split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return Math.min(24 * 60 - 1, Math.max(0, h * 60 + m));
}

/** Minutes to "HH:mm" (e.g. 540 -> "09:00"). */
function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Compute open slot start times (as "HH:mm") for a technician on the selected day.
 * Assumes each job blocks 1 hour from its scheduled start. Working hours 8 AM–5 PM.
 */
function getOpenSlotsForDay(
  jobsOnDay: Job[],
  workStartMin: number = WORK_START_MIN,
  workEndMin: number = WORK_END_MIN,
  slotDurationMin: number = SLOT_DURATION_MIN
): string[] {
  const blocked: number[] = [];
  jobsOnDay.forEach((j) => {
    const start = timeStrToMinutes(j.scheduledTime ?? null);
    if (start != null) blocked.push(start);
  });
  blocked.sort((a, b) => a - b);

  const out: string[] = [];
  for (let s = workStartMin; s + slotDurationMin <= workEndMin; s += slotDurationMin) {
    const slotEnd = s + slotDurationMin;
    const overlaps = blocked.some((jobStart) => jobStart < slotEnd && jobStart + slotDurationMin > s);
    if (!overlaps) out.push(minutesToTimeStr(s));
  }
  return out;
}

export type ColumnItem =
  | { type: "job"; sortKey: string; job: Job }
  | { type: "slot"; sortKey: string; startTime: string };

/** Build sorted list of job cards + open slots for one technician on the selected day. */
function buildColumnItems(
  techJobs: Job[],
  openSlots: string[],
  timeSortKeyFn: (j: Job) => string
): ColumnItem[] {
  const items: ColumnItem[] = [];
  techJobs.forEach((j) => {
    items.push({ type: "job", sortKey: timeSortKeyFn(j), job: j });
  });
  openSlots.forEach((t) => {
    items.push({ type: "slot", sortKey: t, startTime: t });
  });
  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return items;
}

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterTechnicianId = searchParams.get("technicianId");
  const { jobs, loading: jobsLoading, updateJob, addJob } = useJobs();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [allTechnicians, setAllTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);
  const [filter, setFilter] = useState<DateFilter>("today");
  const [selectedYmd, setSelectedYmd] = useState<string>(() => toLocalYmd(new Date()));
  const [scheduleTechnicianId, setScheduleTechnicianId] = useState<string>(() => filterTechnicianId ?? "");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [scheduleSlotModal, setScheduleSlotModal] = useState<{
    technicianId: string;
    technicianName: string;
    date: string;
    startTime: string;
  } | null>(null);

  // Dev/demo only: lightly seed technicians, customers, and today's jobs when there is no data yet.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    ensureDemoScheduleData().catch(() => {
      // best-effort only; ignore failures in demo helper
    });
  }, []);

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

  /** Jobs on the selected date only (for availability board + open slots). */
  const jobsForSelectedDay = useMemo(() => {
    const ymd = referenceDateStr.slice(0, 10);
    return jobs.filter((j) => (j.scheduledDate || "").slice(0, 10) === ymd);
  }, [jobs, referenceDateStr]);

  /** Per-technician jobs on the selected day (for columns + open slot calc). */
  const jobsByTechnicianForSelectedDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    technicians.forEach((t) => map.set(t.id, []));
    jobsForSelectedDay.forEach((j) => {
      const tid = j.technicianId;
      if (tid != null && String(tid).trim() !== "" && map.has(tid)) {
        map.get(tid)!.push(j);
      }
    });
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          timeSortKey(a).localeCompare(timeSortKey(b)) ||
          (a.scheduledDate || "").localeCompare(b.scheduledDate || "") ||
          a.id.localeCompare(b.id)
      )
    );
    return map;
  }, [jobsForSelectedDay, technicians]);

  /** In-progress jobs in the current date range (for dedicated section). */
  const inProgressJobs = useMemo(() => {
    return filteredJobs
      .filter((j) => j.status === "in_progress")
      .sort(
        (a, b) =>
          (a.scheduledDate || "").localeCompare(b.scheduledDate || "") ||
          timeSortKey(a).localeCompare(timeSortKey(b)) ||
          a.id.localeCompare(b.id)
      );
  }, [filteredJobs]);

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
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* In progress — grouped section */}
      {inProgressJobs.length > 0 && (
        <Card>
          <CardHeader
            title="In progress"
            subtitle={`${inProgressJobs.length} job${inProgressJobs.length !== 1 ? "s" : ""} currently in progress`}
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inProgressJobs.map((job) => (
                <DispatchJobCard
                  key={job.id}
                  job={job}
                  customerName={job.customerName ?? customerById.get(job.customerId)?.name ?? "—"}
                  customerPhone={customerById.get(job.customerId)?.phone}
                  technicianName={job.technicianId ? technicianById.get(job.technicianId)?.name ?? null : null}
                  allTechnicians={allTechnicians}
                  onSelect={() => router.push(`/jobs/${job.id}?returnTo=/schedule`)}
                  onAssign={(jobId, technicianId) => handleDrop(jobId, technicianId)}
                  onDragStart={() => setDraggingJobId(job.id)}
                  onDragEnd={() => setDraggingJobId(null)}
                  isDragging={draggingJobId === job.id}
                  dragType={DRAG_TYPE}
                  showUnassignedBadge={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispatch Board — technician columns (selected day: jobs + open slots) */}
      <Card>
        <CardHeader
          title="Technician availability"
          subtitle={`${formatDate(referenceDateStr)} · Next available highlighted; open slots schedule on click`}
        />
        <CardContent className="p-0">
          <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:gap-4">
            {technicians.map((tech) => {
              const techJobs = jobsByTechnicianForSelectedDay.get(tech.id) ?? [];
              const openSlots = getOpenSlotsForDay(techJobs);
              const nextAvailableStart =
                openSlots.length > 0 ? openSlots[0] : null;
              const columnItems = buildColumnItems(techJobs, openSlots, timeSortKey);
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
                  className={`flex w-[min(72vw,320px)] shrink-0 flex-col rounded-[10px] border bg-card-bg p-3 shadow-sm transition-colors sm:w-72 sm:p-4 ${
                    isDropTarget
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="mb-3 border-b border-[var(--border)] pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--dark)]">{tech.name}</p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {techJobs.length} job{techJobs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{tech.specialty}</p>
                  </div>
                  <div className="flex min-h-[80px] flex-col gap-2">
                    {columnItems.map((item) =>
                      item.type === "job" ? (
                        <DispatchJobCard
                          key={item.job.id}
                          job={item.job}
                          customerName={item.job.customerName ?? customerById.get(item.job.customerId)?.name ?? "—"}
                          customerPhone={customerById.get(item.job.customerId)?.phone}
                          technicianName={tech.name}
                          allTechnicians={allTechnicians}
                          onSelect={() => router.push(`/jobs/${item.job.id}?returnTo=/schedule`)}
                          onAssign={(jobId, technicianId) => handleDrop(jobId, technicianId)}
                          onDragStart={() => setDraggingJobId(item.job.id)}
                          onDragEnd={() => setDraggingJobId(null)}
                          isDragging={draggingJobId === item.job.id}
                          dragType={DRAG_TYPE}
                          showUnassignedBadge={false}
                        />
                      ) : (
                        <button
                          key={`slot-${item.startTime}`}
                          type="button"
                          onClick={() =>
                            setScheduleSlotModal({
                              technicianId: tech.id,
                              technicianName: tech.name,
                              date: referenceDateStr.slice(0, 10),
                              startTime: item.startTime,
                            })
                          }
                          className={`flex w-full cursor-pointer flex-col items-stretch rounded-lg border py-2.5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99] ${
                            nextAvailableStart === item.startTime
                              ? "border-2 border-emerald-500 bg-emerald-100/90 text-emerald-950 hover:bg-emerald-200/90"
                              : "border border-dashed border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100/80 hover:text-emerald-900"
                          }`}
                        >
                          {nextAvailableStart === item.startTime ? (
                            <>
                              <span className="px-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                                ⭐ Next Available
                              </span>
                              <span className="mt-1 flex items-center gap-2 px-3 text-sm font-semibold">
                                <CalendarPlus className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                                {formatScheduledTime(item.startTime)}
                                <span className="font-medium text-emerald-700">· + Schedule</span>
                              </span>
                            </>
                          ) : (
                            <span className="flex flex-col gap-0.5 px-3">
                              <span className="flex items-center gap-2 text-sm font-medium">
                                <CalendarPlus className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                                Open · {formatScheduledTime(item.startTime)}
                              </span>
                              <span className="pl-6 text-xs font-medium text-emerald-700">
                                Click to schedule
                              </span>
                            </span>
                          )}
                        </button>
                      )
                    )}
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

      {/* Unassigned Jobs — visually distinct */}
      <Card>
        <CardHeader
          title="Unassigned"
          subtitle={
            unassignedJobs.length === 0
              ? "Jobs without a technician — drag from here or from a column to assign"
              : `${unassignedJobs.length} job${unassignedJobs.length !== 1 ? "s" : ""} need assignment`
          }
        />
        <CardContent className="pt-0">
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
              className={`min-h-[120px] rounded-[10px] border-2 border-dashed p-4 sm:p-6 transition-colors ${
                dropTarget === "unassigned"
                  ? "border-primary bg-primary/5"
                  : "border-amber-300 bg-amber-50/50"
              }`}
            >
              <p className="py-4 text-center text-sm text-slate-500">
                No unassigned jobs in this range. Drag jobs here to unassign, or schedule a new job.
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
              className={`grid gap-3 rounded-[10px] border-2 border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 ${
                dropTarget === "unassigned" ? "ring-2 ring-amber-400" : ""
              }`}
            >
              {unassignedJobs.map((job) => (
                <DispatchJobCard
                  key={job.id}
                  job={job}
                  customerName={job.customerName ?? customerById.get(job.customerId)?.name ?? "—"}
                  customerPhone={customerById.get(job.customerId)?.phone}
                  technicianName={null}
                  allTechnicians={allTechnicians}
                  onSelect={() => router.push(`/jobs/${job.id}?returnTo=/schedule`)}
                  onAssign={(jobId, technicianId) => handleDrop(jobId, technicianId)}
                  onDragStart={() => setDraggingJobId(job.id)}
                  onDragEnd={() => setDraggingJobId(null)}
                  isDragging={draggingJobId === job.id}
                  dragType={DRAG_TYPE}
                  showUnassignedBadge={true}
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

      {/* Quick schedule — open slot modal */}
      {scheduleSlotModal && (
        <ScheduleSlotModal
          technicianId={scheduleSlotModal.technicianId}
          technicianName={scheduleSlotModal.technicianName}
          date={scheduleSlotModal.date}
          startTime={scheduleSlotModal.startTime}
          customers={customers}
          onClose={() => setScheduleSlotModal(null)}
          onSave={async (payload) => {
            await addJob(payload);
            setScheduleSlotModal(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleSlotModal({
  technicianId,
  technicianName,
  date,
  startTime,
  customers,
  onClose,
  onSave,
}: {
  technicianId: string;
  technicianName: string;
  date: string;
  startTime: string;
  customers: Awaited<ReturnType<typeof getCustomers>>;
  onClose: () => void;
  onSave: (payload: {
    customerId: string;
    technicianId: string;
    title: string;
    description: string;
    scheduledDate: string;
    scheduledTime: string;
    status: "scheduled";
    price: number;
  }) => Promise<void>;
}) {
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(customerId?.trim() && title?.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        customerId: customerId.trim(),
        technicianId,
        title: title.trim(),
        description: "",
        scheduledDate: date,
        scheduledTime: startTime,
        status: "scheduled",
        price: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-slot-modal-title"
    >
      <div
        className="w-full max-w-md rounded-[10px] border border-[var(--border)] bg-card-bg p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="schedule-slot-modal-title" className="text-lg font-semibold text-[var(--dark)]">
          Schedule in open slot
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {technicianName} · {formatDate(date)} · {formatScheduledTime(startTime)}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="schedule-slot-customer" className="mb-1 block text-sm font-medium text-[var(--dark)]">
              Customer
            </label>
            <CustomerCombobox
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Search by name, phone, or email..."
            />
          </div>
          <div>
            <label htmlFor="schedule-slot-title" className="mb-1 block text-sm font-medium text-[var(--dark)]">
              Job title
            </label>
            <input
              id="schedule-slot-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HVAC tune-up"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? "Saving…" : "Schedule job"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DispatchJobCard({
  job,
  customerName,
  customerPhone,
  technicianName,
  allTechnicians,
  onSelect,
  onAssign,
  onDragStart,
  onDragEnd,
  isDragging,
  dragType,
  showUnassignedBadge,
}: {
  job: Job;
  customerName: string;
  customerPhone?: string | null;
  technicianName?: string | null;
  allTechnicians: Technician[];
  onSelect: () => void;
  onAssign: (jobId: string, technicianId: string | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragType: string;
  showUnassignedBadge: boolean;
}) {
  const justDragged = useRef(false);
  const phoneStr = customerPhone ? formatPhoneNumber(customerPhone) : null;
  const isUnassigned = showUnassignedBadge || !technicianName;

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
      className={`cursor-grab rounded-[10px] border-l-4 border-[var(--border)] bg-white p-3 text-left shadow-sm transition-colors active:cursor-grabbing hover:border-primary/40 hover:shadow sm:p-3.5 ${
        isUnassigned ? "border-l-amber-400 bg-amber-50/40" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Date/time — prominent */}
      <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--dark)]">
        <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
        {formatScheduledDateTime(job.scheduledDate, job.scheduledTime)}
      </p>

      <div className="mt-2 flex items-start justify-between gap-2">
        <span className="font-medium text-[var(--dark)]">{customerName}</span>
        <JobStatusBadge status={job.status} />
      </div>
      <p className="mt-0.5 text-sm text-slate-600">{job.title}</p>

      {/* Technician or Unassigned */}
      <div className="mt-2 flex items-center gap-1.5">
        {technicianName ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {technicianName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            <UserX className="h-3.5 w-3.5 shrink-0" />
            Unassigned
          </span>
        )}
      </div>

      {phoneStr && (
        <p className="mt-1 text-xs text-slate-500">{phoneStr}</p>
      )}

      {/* Quick actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onSelect(); }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </button>
        <select
          value={job.technicianId ?? ""}
          onChange={(e) => onAssign(job.id, e.target.value || null)}
          className="h-7 min-w-0 max-w-[140px] rounded border border-[var(--border)] bg-white px-2 text-xs text-[var(--dark)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Assign…</option>
          {allTechnicians.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Link
          href={`/jobs/${job.id}/edit?returnTo=/schedule`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-[var(--dark)]"
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar className="h-3.5 w-3.5" />
          Reschedule
        </Link>
      </div>
    </div>
  );
}
