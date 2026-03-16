"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/ui/DataTable";
import {
  getCustomerById,
  getTechnicianById,
  formatDate,
  formatPhoneNumber,
  formatScheduledDateTime,
} from "@/lib/data";
import { useJobs } from "@/components/providers/JobsProvider";
import { ArrowLeft, Briefcase, Calendar, Mail, MapPin, Phone, Pencil, StickyNote, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getReturnTo, withReturnTo } from "@/lib/returnTo";
import type { Customer } from "@/lib/models";
import type { Technician } from "@/lib/models";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getReturnTo(searchParams);
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = returnTo ?? "/customers";
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [technicianMap, setTechnicianMap] = useState<Map<string, Technician>>(new Map());
  const { jobs } = useJobs();

  useEffect(() => {
    getCustomerById(id).then(setCustomer);
  }, [id]);

  useEffect(() => {
    const techIds = new Set<string>();
    jobs.forEach((j) => {
      if (j.technicianId) techIds.add(j.technicianId);
    });
    Promise.all([...techIds].map((tid) => getTechnicianById(tid))).then((list) => {
      const map = new Map<string, Technician>();
      list.forEach((t) => t && map.set(t.id, t));
      setTechnicianMap(map);
    });
  }, [jobs]);

  const customerJobs = useMemo(() => {
    return jobs
      .filter((j) => j.customerId === id)
      .map((j) => ({
        ...j,
        technicianName: j.technicianId ? technicianMap.get(j.technicianId)?.name ?? "—" : "—",
      }))
      .sort(
        (a, b) =>
          new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      );
  }, [jobs, id, technicianMap]);

  if (customer === undefined) {
    return (
      <div className="space-y-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> {returnTo ? "Back" : "Back to Customers"}
        </Link>
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {returnTo ? "Back" : "Back to Customers"}
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Customer not found.</p>
            <Link href={backHref} className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                View all customers
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobColumns = [
    { key: "title", header: "Service", render: (row: { title: string }) => <span className="font-medium text-slate-900">{row.title}</span> },
    {
      key: "technicianName",
      header: "Technician",
      render: (row: { technicianName: string }) => <span className="text-slate-700">{row.technicianName}</span>,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? "Back" : "Back to Customers"}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{customer.name}</h1>
          <p className="mt-1 text-slate-500">Customer profile</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={withReturnTo(`/customers/${customer.id}/edit`, returnTo)} className="shrink-0">
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Customer
            </Button>
          </Link>
          <Link href={`/jobs/new?customerId=${customer.id}`} className="shrink-0">
            <Button>
              <Briefcase className="mr-2 h-4 w-4" />
              Create Job for Customer
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader title="Profile" subtitle="Contact and address" />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Name</p>
                <p className="font-medium text-slate-900">{customer.name}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Phone</p>
                {customer.phone ? (
                  <a href={`tel:${customer.phone.replace(/\D/g, "")}`} className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                    {formatPhoneNumber(customer.phone)}
                  </a>
                ) : (
                  <p className="font-medium text-slate-900">—</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Email</p>
                <p className="font-medium text-slate-900 truncate">{customer.email}</p>
              </div>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Address</p>
                <p className="font-medium text-slate-900">{customer.address}</p>
              </div>
            </div>
            {customer.notes ? (
              <div className="flex gap-3 sm:col-span-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <StickyNote className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-slate-400">Notes</p>
                  <p className="text-slate-700">{customer.notes}</p>
                </div>
              </div>
            ) : null}
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Created</p>
                <p className="font-medium text-slate-900">{formatDate(customer.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Jobs"
          subtitle={`${customerJobs.length} job${customerJobs.length !== 1 ? "s" : ""} for this customer`}
          action={
            <Link href={`/jobs/new?customerId=${customer.id}`}>
              <Button variant="outline" size="sm">
                <Briefcase className="mr-2 h-4 w-4" />
                New job
              </Button>
            </Link>
          }
        />
        <CardContent className="p-0">
          <DataTable
            columns={jobColumns}
            data={customerJobs}
            emptyMessage="No jobs yet. Create a job for this customer to get started."
            onRowClick={(row) => router.push(withReturnTo(`/jobs/${row.id}`, returnTo))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
