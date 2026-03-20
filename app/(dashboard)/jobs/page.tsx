"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import {
  formatPhoneNumber,
  formatScheduledDateAndTime,
  getCustomers,
  getTechnicians,
} from "@/lib/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { Briefcase, Calendar, CheckCircle, Clock, Filter, Plus, Search, UserX } from "lucide-react";
import { useJobs } from "@/components/providers/JobsProvider";


type DateGroupFilter = "all" | "upcoming" | "in_progress" | "completed";

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function JobsPage() {
  const router = useRouter();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const { jobs, loading: jobsLoading, error: jobsError } = useJobs();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [technicians, setTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTechnician, setFilterTechnician] = useState<string>("all");
  const [filterDateGroup, setFilterDateGroup] = useState<DateGroupFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [filterOpen]);

  const customerById = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  const technicianById = useMemo(() => {
    return new Map(technicians.map((t) => [t.id, t]));
  }, [technicians]);

  const todayStr = useMemo(() => toLocalYmd(new Date()), []);

  const jobSummary = useMemo(() => {
    const total = jobs.length;
    const scheduled = jobs.filter((j) => j.status === "scheduled").length;
    const inProgress = jobs.filter((j) => j.status === "in_progress").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const unassigned = jobs.filter(
      (j) => !j.technicianId || String(j.technicianId).trim() === ""
    ).length;
    return { total, scheduled, inProgress, completed, unassigned };
  }, [jobs]);

  const jobsForTable = useMemo(() => {
    const rows = jobs.map((j) => {
      const customer = customerById.get(j.customerId);
      return {
        ...j,
        customerName: customer?.name ?? "—",
        customerPhone: customer?.phone ?? "",
        technicianName: j.technicianId
          ? technicianById.get(j.technicianId)?.name ?? "—"
          : "—",
      };
    });

    // Sort by actual scheduled datetime (scheduledDate + scheduledTime) descending.
    // Jobs missing date or time are forced to the bottom.
    const getScheduledDateTimeKey = (row: { scheduledDate?: string; scheduledTime?: string | null }) => {
      const dateStr = (row.scheduledDate ?? "").trim().slice(0, 10);
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);

      if (!dateMatch) return null;

      const timeStr = (row.scheduledTime ?? "").trim();
      const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
      if (!timeMatch) return null;

      const year = Number(dateMatch[1]);
      const monthIndex = Number(dateMatch[2]) - 1;
      const day = Number(dateMatch[3]);
      const hour = Math.min(23, Math.max(0, Number(timeMatch[1])));
      const minute = Math.min(59, Math.max(0, Number(timeMatch[2])));

      return new Date(year, monthIndex, day, hour, minute).getTime();
    };

    rows.sort((a, b) => {
      const keyA = getScheduledDateTimeKey(a);
      const keyB = getScheduledDateTimeKey(b);

      // Null keys go last.
      if (keyA == null && keyB == null) return b.id.localeCompare(a.id);
      if (keyA == null) return 1;
      if (keyB == null) return -1;

      if (keyA !== keyB) return keyB - keyA;

      // Deterministic tie-breaker for stable ordering.
      return b.id.localeCompare(a.id);
    });
    return rows;
  }, [jobs, customerById, technicianById]);

  const filteredJobs = useMemo(() => {
    let result = jobsForTable;

    const q = searchQuery.trim().toLowerCase();
    const qDigits = searchQuery.replace(/\D/g, "");
    if (q) {
      result = result.filter((row) => {
        const nameMatch = row.customerName && row.customerName.toLowerCase().includes(q);
        const titleMatch = row.title && row.title.toLowerCase().includes(q);
        const technicianMatch = row.technicianName && row.technicianName.toLowerCase().includes(q);
        const phoneMatch =
          qDigits.length > 0 &&
          row.customerPhone &&
          (row.customerPhone.replace(/\D/g, "")).includes(qDigits);
        return nameMatch || titleMatch || technicianMatch || phoneMatch;
      });
    }

    if (filterStatus !== "all") {
      result = result.filter((row) => row.status === filterStatus);
    }

    if (filterTechnician !== "all") {
      result = result.filter((row) => row.technicianId === filterTechnician);
    }

    if (filterDateGroup !== "all") {
      if (filterDateGroup === "upcoming") {
        result = result.filter((row) => {
          const d = (row.scheduledDate || "").slice(0, 10);
          return d >= todayStr && (row.status === "scheduled" || row.status === "in_progress");
        });
      } else if (filterDateGroup === "in_progress") {
        result = result.filter((row) => row.status === "in_progress");
      } else if (filterDateGroup === "completed") {
        result = result.filter((row) => row.status === "completed");
      }
    }

    return result;
  }, [
    jobsForTable,
    searchQuery,
    filterStatus,
    filterTechnician,
    filterDateGroup,
    todayStr,
  ]);

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (row: { customerName: string; customerPhone: string }) => (
        <div className="min-w-0">
          <span className="font-medium text-slate-900 block truncate">{row.customerName}</span>
          {row.customerPhone ? (
            <span className="text-xs text-slate-500 block truncate">{formatPhoneNumber(row.customerPhone)}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "title",
      header: "Service",
      render: (row: { title: string }) => (
        <span className="text-slate-700">{row.title}</span>
      ),
    },
    {
      key: "technicianName",
      header: "Technician",
      render: (row: { technicianName: string }) => (
        <span className="text-slate-700">{row.technicianName}</span>
      ),
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      render: (row: { scheduledDate: string; scheduledTime?: string | null }) => (
        <span className="text-slate-700">
          {formatScheduledDateAndTime(row.scheduledDate, row.scheduledTime)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: { status: string }) => <JobStatusBadge status={row.status} />,
    },
    {
      key: "price",
      header: "Price",
      render: (row: { price: number }) => (
        <span className="font-medium text-slate-900">
          ${row.price.toLocaleString()}
        </span>
      ),
    },
    {
      key: "id",
      header: "Job ID",
      render: (row: { id: string }) => (
        <span className="text-xs text-slate-500 font-mono truncate block max-w-[140px]" title={row.id}>
          {row.id}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
          <p className="mt-1 text-slate-500">
            Track and manage all service jobs and work orders.
          </p>
        </div>
        <Link href="/jobs/new" className="shrink-0">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      {jobsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {jobsError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{jobSummary.total}</p>
                <p className="text-sm text-slate-500">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{jobSummary.scheduled}</p>
                <p className="text-sm text-slate-500">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{jobSummary.inProgress}</p>
                <p className="text-sm text-slate-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{jobSummary.completed}</p>
                <p className="text-sm text-slate-500">Completed</p>
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
                <p className="text-2xl font-semibold text-slate-900">{jobSummary.unassigned}</p>
                <p className="text-sm text-slate-500">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="All jobs"
          subtitle={jobsLoading ? "Loading..." : `${filteredJobs.length} of ${jobsForTable.length} jobs`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search by customer, phone, service, technician..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="relative" ref={filterPanelRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                {filterOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-3 px-3 shadow-lg">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </p>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="mb-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All statuses</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Technician
                    </p>
                    <select
                      value={filterTechnician}
                      onChange={(e) => setFilterTechnician(e.target.value)}
                      className="mb-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All technicians</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Date group
                    </p>
                    <select
                      value={filterDateGroup}
                      onChange={(e) => setFilterDateGroup(e.target.value as DateGroupFilter)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">All</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <CardContent className="p-0">
          {jobsLoading ? (
            <div className="py-12 text-center text-slate-500">Loading jobs...</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredJobs}
              emptyMessage={
                jobsForTable.length === 0
                  ? "No jobs yet. Create a job to get started."
                  : "No jobs match your search and filters."
              }
              onRowClick={(row) => router.push(`/jobs/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
