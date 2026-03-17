"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import {
  getInvoiceById,
  getJobById,
  getCustomerById,
  formatDate,
  formatScheduledDateTime,
} from "@/lib/data";
import { getSupabase } from "@/lib/supabase/client";
import { ArrowLeft, Briefcase, Calendar, CheckCircle, DollarSign, FileDown, FileText, Pencil, Send, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Invoice } from "@/lib/models";
import type { Customer } from "@/lib/models";
import type { Job } from "@/lib/models";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setInvoice(null);
      return;
    }
    getInvoiceById(id).then((inv) => {
      setInvoice(inv);
      if (!inv) return;
      return Promise.all([
        getJobById(inv.jobId).then((j) => setJob(j ?? null)),
        getCustomerById(inv.customerId).then((c) => setCustomer(c ?? null)),
      ]);
    });
  }, [id]);

  async function handleMarkAsPaid() {
    if (!id || !invoice || actionLoading) return;
    if (invoice.status === "paid") return;
    setActionLoading(true);
    try {
      const { updateInvoice } = await import("@/lib/data");
      const now = new Date().toISOString();
      await updateInvoice(id, { status: "paid", paidAt: now });
      const updated = await getInvoiceById(id);
      setInvoice(updated ?? invoice);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendInvoice() {
    if (!id || !invoice || sendLoading) return;
    if (invoice.status !== "draft") return;
    setSendError(null);
    setSendLoading(true);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token || !session?.refresh_token) {
        setSendError("Please sign in to send the invoice.");
        return;
      }
      const res = await fetch("/api/invoice/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: id,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(json.error ?? "Failed to send invoice");
        return;
      }
      const updated = await getInvoiceById(id);
      setInvoice(updated ?? invoice);
    } finally {
      setSendLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!id || !invoice || pdfLoading) return;
    setPdfLoading(true);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.access_token || !session?.refresh_token) {
        setSendError("Please sign in to download the PDF.");
        return;
      }
      const res = await fetch(`/api/invoice/pdf/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSendError(json.error ?? "Failed to download PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9\-_.]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  if (invoice === undefined) {
    return (
      <div className="space-y-6">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Link>
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
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

  const canMarkPaid = invoice.status !== "paid";
  const canSendInvoice = invoice.status === "draft";

  return (
    <div className="space-y-6">
      {sendError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {sendError}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
          <p className="mt-1 text-slate-500">Invoice details</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSendInvoice && (
            <Button
              onClick={handleSendInvoice}
              disabled={sendLoading}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendLoading ? "Sending..." : "Send Invoice"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {pdfLoading ? "Downloading..." : "Download PDF"}
          </Button>
          <Link href={`/invoices/${invoice.id}/edit`} className="shrink-0">
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Invoice
            </Button>
          </Link>
          {canMarkPaid && (
            <Button
              onClick={handleMarkAsPaid}
              disabled={actionLoading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {actionLoading ? "Saving..." : "Mark as paid"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Invoice" subtitle="Details and status" />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Invoice #</p>
                <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Status</p>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Created</p>
                <p className="font-medium text-slate-900">{formatDate(invoice.createdAt)}</p>
              </div>
            </div>
            {invoice.paidAt && (
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">Paid at</p>
                  <p className="font-medium text-slate-900">{formatDate(invoice.paidAt)}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3 sm:col-span-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <DollarSign className="h-5 w-5" />
              </span>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">Subtotal</p>
                  <p className="font-medium text-slate-900">${invoice.subtotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">Total</p>
                  <p className="text-lg font-semibold text-slate-900">${invoice.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Related" subtitle="Customer and job" />
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <User className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Customer</p>
              {customer ? (
                <Link href={`/customers/${customer.id}`} className="font-medium text-indigo-600 hover:underline">
                  {customer.name}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">—</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Job</p>
              {job ? (
                <>
                  <Link href={`/jobs/${job.id}`} className="font-medium text-indigo-600 hover:underline">
                    {job.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {formatScheduledDateTime(job.scheduledDate, job.scheduledTime)}
                  </p>
                </>
              ) : (
                <span className="font-medium text-slate-900">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
