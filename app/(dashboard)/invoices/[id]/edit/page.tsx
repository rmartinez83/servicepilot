"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getInvoiceById,
  getJobById,
  getCustomerById,
  updateInvoice,
} from "@/lib/data";
import type { InvoiceStatus } from "@/lib/models";
import { ArrowLeft, Briefcase, DollarSign, FileText, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
];

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

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const backHref = `/invoices/${id}`;

  const [invoice, setInvoice] = useState<Awaited<ReturnType<typeof getInvoiceById>>>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getInvoiceById(id)
      .then((inv) => {
        setInvoice(inv ?? undefined);
        if (inv) {
          setStatus(inv.status as InvoiceStatus);
          setSubtotal(inv.subtotal);
          setTotal(inv.total);
          return Promise.all([
            getCustomerById(inv.customerId).then((c) => setCustomerName(c?.name ?? "—")),
            getJobById(inv.jobId).then((j) => setJobTitle(j?.title ?? "—")),
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const canSubmit =
    invoice &&
    Number.isFinite(subtotal) &&
    subtotal >= 0 &&
    Number.isFinite(total) &&
    total >= 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Invoice not found.</p>
            <Link href="/invoices" className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                View all invoices
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const wasPaid = invoice.status === "paid";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoice
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Edit Invoice</h1>
          <p className="mt-1 text-slate-500">
            Update status, subtotal, and total. Customer and job are read-only.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          title={invoice.invoiceNumber}
          subtitle="Invoice details"
        />
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSubmit) return;
              setSaving(true);
              try {
                let paidAt: string | null = invoice.paidAt;
                if (status === "paid") {
                  paidAt = new Date().toISOString();
                } else if (wasPaid && (status === "draft" || status === "sent")) {
                  paidAt = null;
                }
                await updateInvoice(id, {
                  status,
                  subtotal,
                  total,
                  paidAt,
                });
                router.push(backHref);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field label="Customer" icon={<User className="h-4 w-4" />} hint="Read-only">
              <p className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900">
                {customerName}
              </p>
            </Field>

            <Field label="Job" icon={<Briefcase className="h-4 w-4" />} hint="Read-only">
              <p className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900">
                {jobTitle}
              </p>
            </Field>

            <Field label="Status" icon={<FileText className="h-4 w-4" />}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subtotal" icon={<DollarSign className="h-4 w-4" />}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={subtotal}
                  onChange={(e) => setSubtotal(Number(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
              <Field label="Total" icon={<DollarSign className="h-4 w-4" />}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </Field>
            </div>

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
