"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getJobById, getTechnicians } from "@/lib/data";
import type { JobStatus } from "@/lib/models";
import { JOB_STATUS_OPTIONS, useJobs } from "@/components/providers/JobsProvider";
import { ArrowLeft, Calendar, Clock, DollarSign, FileText, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getReturnTo } from "@/lib/returnTo";
import { useEffect, useMemo, useState } from "react";

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {icon && <span className="text-slate-400">{icon}</span>}
          {label}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getReturnTo(searchParams);
  const { updateJob } = useJobs();
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = returnTo ?? (id ? `/jobs/${id}` : "/jobs");

  const [job, setJob] = useState<Awaited<ReturnType<typeof getJobById>>>(undefined);
  const [technicians, setTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);
  const [loaded, setLoaded] = useState(false);

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [technicianId, setTechnicianId] = useState<string | "unassigned">("unassigned");
  const [status, setStatus] = useState<JobStatus>("scheduled");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getJobById(id), getTechnicians()]).then(([j, t]) => {
      setJob(j);
      setTechnicians(t ?? []);
      if (j) {
        setScheduledDate((j.scheduledDate || "").slice(0, 10));
        setScheduledTime((j.scheduledTime || "").trim().slice(0, 5) || "");
        setTechnicianId(j.technicianId ?? "unassigned");
        setStatus(j.status);
        setDescription(j.description ?? "");
        setPrice(j.price != null ? String(j.price) : "");
      }
      setLoaded(true);
    });
  }, [id]);

  const priceValue = useMemo(() => {
    const n = parseFloat(price || "0");
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  const canSubmit =
    loaded &&
    job &&
    scheduledDate &&
    Number.isFinite(priceValue) &&
    priceValue >= 0;

  if (!loaded || !job) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnTo ? "Back" : "Back to Job"}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Edit Job</h1>
          <p className="mt-1 text-slate-500">{job.title}</p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          title="Update job details"
          subtitle="Scheduled date, technician, status, notes, and price"
        />
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSaving(true);
              try {
                await updateJob(id, {
                  scheduledDate,
                  scheduledTime: scheduledTime.trim() || null,
                  technicianId: technicianId === "unassigned" ? null : technicianId,
                  status,
                  description: description.trim(),
                  price: priceValue,
                });
                router.push(returnTo ?? `/jobs/${id}`);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field label="Scheduled Date" icon={<Calendar className="h-4 w-4" />}>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <Field label="Appointment Time" icon={<Clock className="h-4 w-4" />} hint="Optional">
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <Field label="Technician" icon={<Wrench className="h-4 w-4" />}>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value as string | "unassigned")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="unassigned">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id} disabled={!t.active}>
                    {t.name} — {t.specialty}
                    {!t.active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" icon={<FileText className="h-4 w-4" />}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {JOB_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes" icon={<FileText className="h-4 w-4" />} hint="Job description and notes.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <Field label="Price" icon={<DollarSign className="h-4 w-4" />}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d*$/.test(value)) setPrice(value);
                }}
                onBlur={() => {
                  if (!price.trim()) return;
                  const n = parseFloat(price);
                  if (!Number.isFinite(n)) return;
                  setPrice(n.toFixed(2));
                }}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link href={backHref} className="sm:mr-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!canSubmit || saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
