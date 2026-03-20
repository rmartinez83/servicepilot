"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { getCustomers, getTechnicians } from "@/lib/data";
import type { JobStatus } from "@/lib/models";
import { JOB_STATUS_OPTIONS, useJobs } from "@/components/providers/JobsProvider";
import { ArrowLeft, Calendar, Clock, DollarSign, FileText, User, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getReturnTo } from "@/lib/returnTo";

function NewJobForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addJob } = useJobs();

  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof getCustomers>>>([]);
  const [technicians, setTechnicians] = useState<Awaited<ReturnType<typeof getTechnicians>>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getCustomers(), getTechnicians()]).then(([c, t]) => {
      setCustomers(c);
      setTechnicians(t);
      setLoaded(true);
    });
  }, []);

  const returnTo = getReturnTo(searchParams);
  const presetCustomerId = searchParams.get("customerId");
  const presetTechnicianId = searchParams.get("technicianId");
  const [customerId, setCustomerId] = useState("");
  const [technicianId, setTechnicianId] = useState<string | "unassigned">("unassigned");

  useEffect(() => {
    if (!loaded) return;
    if (presetCustomerId && customers.some((c) => c.id === presetCustomerId)) {
      setCustomerId(presetCustomerId);
    } else if (customers.length) {
      setCustomerId(customers[0].id);
    }
    if (presetTechnicianId && technicians.some((t) => t.id === presetTechnicianId)) {
      setTechnicianId(presetTechnicianId);
    } else {
      const activeTech = technicians.find((t) => t.active);
      if (activeTech) setTechnicianId(activeTech.id);
    }
  }, [loaded, presetCustomerId, presetTechnicianId, customers, technicians]);
  const [title, setTitle] = useState("HVAC Service Call");
  const [description, setDescription] = useState(
    "Customer reports reduced airflow and inconsistent cooling. Inspect filters, coils, and thermostat calibration."
  );
  const [scheduledDate, setScheduledDate] = useState("2025-03-13");
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] = useState<JobStatus>("scheduled");
  const [price, setPrice] = useState<string>("295");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const priceValue = useMemo(() => {
    const n = parseFloat(price || "0");
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  const canSubmit =
    loaded &&
    customerId &&
    title.trim().length > 0 &&
    scheduledDate &&
    Number.isFinite(priceValue) &&
    priceValue >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={returnTo ?? "/jobs"}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {returnTo ? "Back" : "Back to Jobs"}
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">New Job</h1>
          <p className="mt-1 text-slate-500">
            Create a new work order and schedule a technician.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          title="Job details"
          subtitle="Customer, technician, schedule, and pricing"
        />
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSubmitError(null);
              setSaving(true);
              try {
                await addJob({
                  customerId,
                  technicianId: technicianId === "unassigned" ? null : technicianId,
                  title: title.trim(),
                  description: description.trim(),
                  scheduledDate,
                  scheduledTime: scheduledTime.trim() || undefined,
                  status,
                  price: priceValue,
                });
                router.push(returnTo ?? "/jobs");
              } catch (e) {
                const message =
                  e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
                setSubmitError(message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer" icon={<User className="h-4 w-4" />}>
                <CustomerCombobox
                  customers={customers}
                  value={customerId}
                  onChange={setCustomerId}
                  placeholder="Search by name, phone, or email..."
                />
              </Field>

              <Field label="Technician" icon={<Wrench className="h-4 w-4" />}>
                <select
                  value={technicianId}
                  onChange={(e) =>
                    setTechnicianId(e.target.value as string | "unassigned")
                  }
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Scheduled Date" icon={<Calendar className="h-4 w-4" />}>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>

              <Field label="Appointment Time" icon={<Clock className="h-4 w-4" />} hint="Optional (e.g. 9:00 AM)">
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
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
            </div>

            <Field label="Job Title" icon={<FileText className="h-4 w-4" />}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AC Unit Not Cooling"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            <Field
              label="Description"
              icon={<FileText className="h-4 w-4" />}
              hint="Add details for the technician and office staff."
            >
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
                  if (Number.isFinite(n)) setPrice(n.toFixed(2));
                }}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </Field>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {submitError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link href={returnTo ?? "/jobs"} className="sm:mr-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!canSubmit || saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-4 text-slate-500">Loading...</div>}>
      <NewJobForm />
    </Suspense>
  );
}

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

