"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getJobById, getCustomerById, addInvoice } from "@/lib/data";
import { ArrowLeft, Briefcase, DollarSign, FileText, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [job, setJob] = useState<Awaited<ReturnType<typeof getJobById>>>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [amountText, setAmountText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setJob(undefined);
      return;
    }
    getJobById(jobId)
      .then((j) => {
        setJob(j);
        if (j) {
          return getCustomerById(j.customerId).then((c) => setCustomerName(c?.name ?? "—"));
        }
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  const amountValue = useMemo(() => {
    const n = Number(amountText);
    return Number.isFinite(n) ? n : NaN;
  }, [amountText]);

  const canSubmit =
    job &&
    jobId &&
    job.customerId &&
    Number.isFinite(amountValue) &&
    amountValue > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Link>
        <div className="py-12 text-center text-slate-500">Loading job...</div>
      </div>
    );
  }

  if (!jobId || !job) {
    return (
      <div className="space-y-6">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Select a job to create an invoice. Use &quot;Create Invoice&quot; from a job detail page.</p>
            <Link href="/jobs" className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                View jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Create Invoice</h1>
          <p className="mt-1 text-slate-500">
            Create an invoice from this job. Invoice number will be assigned on save.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          title="Invoice details"
          subtitle="Pre-filled from the selected job"
        />
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSaving(true);
              try {
                const inv = await addInvoice({
                  jobId: job.id,
                  customerId: job.customerId,
                  subtotal: amountValue,
                  total: amountValue,
                  status: "draft",
                });
                router.push(`/invoices/${inv.id}`);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field label="Job / Service" icon={<Briefcase className="h-4 w-4" />}>
              <p className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900">
                {job.title}
              </p>
            </Field>

            <Field label="Customer" icon={<User className="h-4 w-4" />}>
              <p className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900">
                {customerName}
              </p>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice Amount" icon={<DollarSign className="h-4 w-4" />}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountText}
                  placeholder="0.00"
                  onChange={(e) => setAmountText(e.target.value)}
                  onBlur={() => {
                    const n = Number(amountText);
                    if (!Number.isFinite(n)) return;
                    if (amountText.trim() === "") return;
                    setAmountText(n.toFixed(2));
                  }}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-invalid={amountText.trim().length > 0 && (!Number.isFinite(amountValue) || amountValue <= 0)}
                  required
                />
              </Field>
            </div>

            <p className="text-xs text-slate-500">
              <FileText className="mr-1 inline h-3.5 w-3.5" />
              Invoice will be created as Draft. You can mark it as Sent or Paid from the invoice detail page.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link href="/invoices" className="sm:mr-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!canSubmit || saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-4 text-slate-500">Loading...</div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}
