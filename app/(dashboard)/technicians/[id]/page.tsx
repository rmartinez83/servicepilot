"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JobStatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import {
  getTechnicianById,
  getJobsThisWeekByTechnician,
  getCustomers,
  formatDate,
  formatScheduledDateTime,
  formatPhoneNumber,
} from "@/lib/data";
import { useJobs } from "@/components/providers/JobsProvider";
import { ArrowLeft, Briefcase, Calendar, Mail, Phone, Pencil, User, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getReturnTo, withReturnTo } from "@/lib/returnTo";
import type { Technician } from "@/lib/models";
import type { Customer } from "@/lib/models";

export default function TechnicianDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getReturnTo(searchParams);
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = returnTo ?? "/technicians";
  const [technician, setTechnician] = useState<Technician | null | undefined>(undefined);
  const [jobsThisWeekCount, setJobsThisWeekCount] = useState<number>(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { jobs } = useJobs();

  useEffect(() => {
    if (!id) {
      setTechnician(null);
      return;
    }
    getTechnicianById(id).then(setTechnician);
    getJobsThisWeekByTechnician(id).then(setJobsThisWeekCount);
  }, [id]);

  useEffect(() => {
    getCustomers().then((list) => setCustomers(Array.isArray(list) ? list : []));
  }, []);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const technicianJobs = useMemo(() => {
    return jobs
      .filter((j) => j.technicianId === id)
      .map((j) => ({
        ...j,
        customerName: customerById.get(j.customerId)?.name ?? "—",
      }))
      .sort(
        (a, b) =>
          new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      );
  }, [jobs, id, customerById]);

  const jobColumns = [
    { key: "title", header: "Service", render: (row: { title: string }) => <span className="font-medium text-slate-900">{row.title}</span> },
    {
      key: "customerName",
      header: "Customer",
      render: (row: { customerName: string; customerId: string }) => (
        <button
          type="button"
          onClick={() => router.push(`/customers/${row.customerId}`)}
          className="text-slate-700 hover:text-indigo-600 hover:underline"
        >
          {row.customerName}
        </button>
      ),
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      render: (row: { scheduledDate: string; scheduledTime?: string | null }) =>
        formatScheduledDateTime(row.scheduledDate, row.scheduledTime),
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
      header: "Job",
      render: (row: { id: string }) => (
        <button
          type="button"
          onClick={() => router.push(withReturnTo(`/jobs/${row.id}`, returnTo))}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          View
        </button>
      ),
    },
  ];

  if (technician === undefined) {
    return (
      <div className="space-y-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> {returnTo ? "Back" : "Back to Technicians"}
        </Link>
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {returnTo ? "Back" : "Back to Technicians"}
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Technician not found.</p>
            <Link href={backHref} className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                View all technicians
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? "Back" : "Back to Technicians"}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{technician.name}</h1>
          <p className="mt-1 text-slate-500">Technician profile</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={withReturnTo(`/technicians/${technician.id}/edit`, returnTo)} className="shrink-0">
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Technician
            </Button>
          </Link>
          <Link href={`/schedule?technicianId=${technician.id}`} className="shrink-0">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              View schedule
            </Button>
          </Link>
          <Link href={withReturnTo(`/jobs/new?technicianId=${technician.id}`, `/technicians/${technician.id}`)} className="shrink-0">
            <Button>
              <Briefcase className="mr-2 h-4 w-4" />
              Assign job
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader title="Profile" subtitle="Contact and status" />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Name</p>
                <p className="font-medium text-slate-900">{technician.name}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Wrench className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Specialty</p>
                <p className="font-medium text-slate-900">{technician.specialty}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Email</p>
                <p className="font-medium text-slate-900 truncate">{technician.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Phone</p>
                {technician.phone ? (
                  <a href={`tel:${technician.phone.replace(/\D/g, "")}`} className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                    {formatPhoneNumber(technician.phone)}
                  </a>
                ) : (
                  <p className="font-medium text-slate-900">—</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Status</p>
                <Badge variant={technician.active ? "success" : "default"}>
                  {technician.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Jobs this week</p>
                <p className="font-medium text-slate-900">{jobsThisWeekCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Jobs assigned"
          subtitle={`${technicianJobs.length} job${technicianJobs.length !== 1 ? "s" : ""} assigned to this technician`}
          action={
            <Link href={withReturnTo(`/jobs/new?technicianId=${technician.id}`, `/technicians/${technician.id}`)}>
              <Button variant="outline" size="sm">
                <Briefcase className="mr-2 h-4 w-4" />
                Assign job
              </Button>
            </Link>
          }
        />
        <CardContent className="p-0">
          <DataTable
            columns={jobColumns}
            data={technicianJobs}
            emptyMessage="No jobs assigned yet. Assign a job from the Schedule or create a new job."
            onRowClick={(row) => router.push(withReturnTo(`/jobs/${row.id}`, returnTo))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
