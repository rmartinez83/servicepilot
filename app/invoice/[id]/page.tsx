"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  DollarSign,
  FileText,
  User,
} from "lucide-react";
import type { PublicInvoicePayload } from "@/app/api/public/invoice/[id]/route";


export default function PublicInvoicePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<PublicInvoicePayload | null | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    fetch(`/api/public/invoice/${id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(res.status === 500 ? "Server error" : "Failed to load");
        }
        return res.json();
      })
      .then(setData)
      .catch((e) => {
        setError(e.message ?? "Failed to load invoice");
        setData(null);
      });
  }, [id]);

  if (data === undefined && !error) {
    return (
      <div className="min-h-screen bg-slate-50/80 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm">
            <p className="text-center text-slate-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || data === null || data === undefined) {
    return (
      <div className="min-h-screen bg-slate-50/80 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-sm">
            <p className="text-center text-slate-600">
              {error ?? "Invoice not found."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const invoice = data;

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Invoice
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your invoice details below
          </p>
        </div>

        <Card>
          <CardHeader
            title={invoice.invoiceNumber}
            subtitle={
              invoice.companyName ? `From: ${invoice.companyName}` : undefined
            }
          />
          <CardContent className="space-y-4">
            {invoice.companyName && (
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    Company
                  </p>
                  <p className="font-medium text-slate-900">{invoice.companyName}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Invoice number
                </p>
                <p className="font-medium text-slate-900">
                  {invoice.invoiceNumber}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Job
                </p>
                <p className="font-medium text-slate-900">
                  {invoice.jobTitle || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Customer
                </p>
                <p className="font-medium text-slate-900">
                  {invoice.customerName || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Total
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  ${invoice.total.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Status
                </p>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
