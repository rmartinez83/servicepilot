"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import {
  getCustomers,
  getJobCountByCustomer,
  formatDate,
  formatPhoneNumber,
} from "@/lib/data";
import { Briefcase, Plus, Search, UserCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useJobs } from "@/components/providers/JobsProvider";

type CustomerWithJobCount = Awaited<ReturnType<typeof getCustomers>>[number] & { jobCount: number };

function isThisMonth(dateStr: string): boolean {
  const s = (dateStr || "").trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})/.exec(s);
  if (!match) return false;
  const now = new Date();
  return (
    Number(match[1]) === now.getFullYear() &&
    Number(match[2]) === now.getMonth() + 1
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const { jobs } = useJobs();
  const [customersWithJobCount, setCustomersWithJobCount] = useState<CustomerWithJobCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const customerSummary = useMemo(() => {
    const totalCustomers = customersWithJobCount.length;
    const openStatuses = new Set(["scheduled", "in_progress"]);
    const customersWithOpenJobs = new Set(
      jobs
        .filter((j) => openStatuses.has(j.status))
        .map((j) => j.customerId)
    ).size;
    const newThisMonth = customersWithJobCount.filter((c) =>
      isThisMonth(c.createdAt)
    ).length;
    const totalJobs = jobs.length;
    return {
      totalCustomers,
      customersWithOpenJobs,
      newThisMonth,
      totalJobs,
    };
  }, [customersWithJobCount, jobs]);

  useEffect(() => {
    getCustomers()
      .then((customers) => {
        return Promise.all(
          customers.map((c) =>
            getJobCountByCustomer(c.id).then((jobCount) => ({ ...c, jobCount }))
          )
        );
      })
      .then((list) => setCustomersWithJobCount(Array.isArray(list) ? list : []))
      .catch(() => setCustomersWithJobCount([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = searchQuery.replace(/\D/g, "");
    if (!q) return customersWithJobCount;
    return customersWithJobCount.filter((row) => {
      const nameMatch = row.name && row.name.toLowerCase().includes(q);
      const emailMatch = row.email && row.email.toLowerCase().includes(q);
      const addressMatch = row.address && row.address.toLowerCase().includes(q);
      const phoneMatch =
        qDigits.length > 0 &&
        row.phone &&
        (row.phone.replace(/\D/g, "")).includes(qDigits);
      return nameMatch || emailMatch || addressMatch || phoneMatch;
    });
  }, [customersWithJobCount, searchQuery]);

  const columns = [
    { key: "name", header: "Name", render: (row: { name: string }) => <span className="font-medium text-slate-900">{row.name}</span> },
    {
      key: "phone",
      header: "Phone",
      render: (row: { phone: string }) =>
        row.phone ? (
          <a href={`tel:${row.phone.replace(/\D/g, "")}`} className="text-slate-700 hover:text-indigo-600 hover:underline">
            {formatPhoneNumber(row.phone)}
          </a>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
    { key: "email", header: "Email", render: (row: { email: string }) => <span className="text-slate-700">{row.email}</span> },
    {
      key: "address",
      header: "Address",
      render: (row: { address: string }) => (
        <span className="max-w-[180px] truncate block text-slate-700" title={row.address}>
          {row.address || "—"}
        </span>
      ),
    },
    {
      key: "jobCount",
      header: "Jobs",
      render: (row: { jobCount: number }) => (
        <span className="font-medium text-slate-700">{row.jobCount}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: { createdAt: string }) => formatDate(row.createdAt),
    },
    {
      key: "id",
      header: "Customer ID",
      render: (row: { id: string }) => (
        <span className="text-xs text-slate-500 font-mono truncate block max-w-[140px]" title={row.id}>
          {row.id}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-slate-500">
            Manage your customer database and contact information.
          </p>
        </div>
        <Link href="/customers/new" className="shrink-0">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add customer
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{customerSummary.totalCustomers}</p>
                <p className="text-sm text-slate-500">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{customerSummary.customersWithOpenJobs}</p>
                <p className="text-sm text-slate-500">Customers with Open Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{customerSummary.newThisMonth}</p>
                <p className="text-sm text-slate-500">New Customers This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{customerSummary.totalJobs}</p>
                <p className="text-sm text-slate-500">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="All customers"
          subtitle={loading ? "Loading..." : `${filteredCustomers.length} of ${customersWithJobCount.length} customers`}
          action={
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name, phone, email, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          }
        />
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading customers...</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredCustomers}
              emptyMessage={
                customersWithJobCount.length === 0
                  ? "No customers found. Add your first customer to get started."
                  : "No customers match your search."
              }
              onRowClick={(row) => router.push(`/customers/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
