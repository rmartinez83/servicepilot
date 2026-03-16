"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/StatusBadge";
import {
  getJobById,
  getCustomerById,
  getTechnicianById,
  formatDate,
  formatScheduledDateTime,
  formatPhoneNumber,
} from "@/lib/data";
import type { Customer } from "@/lib/models";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { getReturnTo, withReturnTo } from "@/lib/returnTo";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, DollarSign, FileText, User, Wrench, Pencil, Play, CheckCircle, XCircle, Receipt } from "lucide-react";
import { useJobs } from "@/components/providers/JobsProvider";


export default function JobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const returnTo = getReturnTo(searchParams);
  const id = typeof params.id === "string" ? params.id : "";
  const { updateJob } = useJobs();
  const backHref = returnTo ?? "/jobs";
  const [job, setJob] = useState<Awaited<ReturnType<typeof getJobById>>>(undefined);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [technicianName, setTechnicianName] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getJobById(id)
      .then((j) => {
        setJob(j);
        if (!j) return;
        return Promise.all([
          getCustomerById(j.customerId).then((c) => setCustomer(c ?? null)),
          j.technicianId
            ? getTechnicianById(j.technicianId).then((t) => setTechnicianName(t?.name ?? "—"))
            : Promise.resolve(),
        ]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusUpdate(newStatus: "in_progress" | "completed" | "cancelled") {
    if (!id || !job || actionLoading) return;
    setActionLoading(true);
    try {
      await updateJob(id, { status: newStatus });
      const updated = await getJobById(id);
      setJob(updated);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={backHref} className="inline-flex items-center gap-2 font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? "Back" : "Back to Jobs"}
          </Link>
        </div>
        <div className="py-12 text-center text-slate-500">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={backHref} className="inline-flex items-center gap-2 font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? "Back" : "Back to Jobs"}
          </Link>
        </div>
        <div className="py-12 text-center text-slate-500">Job not found.</div>
      </div>
    );
  }

  const canCancel = job.status !== "completed" && job.status !== "cancelled";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? "Back" : "Back to Jobs"}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{job.title}</h1>
          <p className="mt-1 text-slate-500">Job ID: {job.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {job.status === "scheduled" && (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("in_progress")}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Job
            </Button>
          )}
          {job.status === "in_progress" && (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("completed")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Complete
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate("cancelled")}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Job
            </Button>
          )}
          <Link href={`/invoices/new?jobId=${job.id}`} className="shrink-0">
            <Button variant="outline" size="sm">
              <Receipt className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
          <Link href={withReturnTo(`/jobs/${job.id}/edit`, returnTo)} className="shrink-0">
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Job
            </Button>
          </Link>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader title="Job details" subtitle="Customer, technician, schedule, and pricing" />
        <CardContent className="space-y-5">
          <DetailRow icon={<User className="h-4 w-4" />} label="Customer">
            <div className="min-w-0">
              <Link
                href={withReturnTo(`/customers/${job.customerId}`, returnTo)}
                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {customer?.name ?? "—"}
              </Link>
              {customer?.phone ? (
                <p className="mt-0.5">
                  <a
                    href={`tel:${customer.phone.replace(/\D/g, "")}`}
                    className="text-sm text-slate-600 hover:text-indigo-600 hover:underline"
                  >
                    {formatPhoneNumber(customer.phone)}
                  </a>
                </p>
              ) : null}
            </div>
          </DetailRow>
          <DetailRow icon={<Wrench className="h-4 w-4" />} label="Technician">
            <span className="text-slate-700">{technicianName}</span>
          </DetailRow>
          <DetailRow icon={<Calendar className="h-4 w-4" />} label="Scheduled">
            <span className="text-slate-700">
              {formatScheduledDateTime(job.scheduledDate, job.scheduledTime)}
            </span>
          </DetailRow>
          <DetailRow icon={<FileText className="h-4 w-4" />} label="Status">
            <JobStatusBadge status={job.status} />
          </DetailRow>
          <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Price">
            <span className="font-medium text-slate-900">
              ${Number(job.price).toLocaleString()}
            </span>
          </DetailRow>
          <DetailRow icon={<FileText className="h-4 w-4" />} label="Notes">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {job.description || "—"}
            </p>
          </DetailRow>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex items-center gap-2 text-slate-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
