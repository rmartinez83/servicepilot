"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import type { InvoiceWithRelations } from "@/lib/data";
import {
  getInvoicesWithRelations,
  getInvoiceStats,
  formatDate,
} from "@/lib/data";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type InvoiceStats = Awaited<ReturnType<typeof getInvoiceStats>>;

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([getInvoicesWithRelations(), getInvoiceStats()])
      .then(([list, s]) => {
        setInvoices(Array.isArray(list) ? list : []);
        setStats(s);
      })
      .catch(() => {
        setInvoices([]);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = invoices.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const cust = row.customer?.name ?? "";
    const jobTitle = row.job?.title ?? "";
    const num = (row.invoiceNumber ?? "").toLowerCase();
    return cust.toLowerCase().includes(q) || jobTitle.toLowerCase().includes(q) || num.includes(q);
  });

  const columns: Column<InvoiceWithRelations>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (row: { invoiceNumber: string }) => (
        <span className="font-medium text-slate-900">{row.invoiceNumber}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row: { customer: { name: string }; customerId: string }) => (
        <Link
          href={`/customers/${row.customerId}`}
          className="font-medium text-slate-900 hover:text-indigo-600 hover:underline"
        >
          {row.customer?.name ?? "—"}
        </Link>
      ),
    },
    {
      key: "job",
      header: "Job",
      render: (row: { job: { title: string }; jobId: string }) => (
        <Link
          href={`/jobs/${row.jobId}`}
          className="text-slate-600 hover:text-indigo-600 hover:underline"
        >
          {row.job?.title ?? "—"}
        </Link>
      ),
    },
    {
      key: "total",
      header: "Amount",
      render: (row: { total: number }) => (
        <span className="font-medium text-slate-900">
          ${row.total.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: { status: string }) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row: { createdAt: string }) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-slate-500">
            Create and track invoices and payments.
          </p>
        </div>
        <Link href="/invoices/new" className="shrink-0">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New invoice
          </Button>
        </Link>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Draft Invoices</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {stats.draftCount}
              </p>
              <p className="text-xs text-slate-500">status: draft</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Sent (unpaid)</p>
              <p className="mt-1 text-2xl font-semibold text-amber-600">
                {stats.sentCount}
              </p>
              <p className="text-xs text-slate-500">status: sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Outstanding (sent only)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                ${stats.outstandingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">total $ of sent invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Paid This Month</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">
                ${stats.paidThisMonthAmount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                {stats.paidThisMonthCount} invoice{stats.paidThisMonthCount !== 1 ? "s" : ""} paid this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader
          title="All invoices"
          subtitle={loading ? "Loading..." : `${filteredInvoices.length} of ${invoices.length} total`}
          action={
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading invoices...</div>
          ) : (
            <DataTable<InvoiceWithRelations>
              columns={columns}
              data={filteredInvoices}
              emptyMessage="No invoices yet. Create your first invoice from a job."
              onRowClick={(row) => router.push(`/invoices/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
