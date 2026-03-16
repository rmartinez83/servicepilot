"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getTechnicians, getJobsThisWeekByTechnician, formatPhoneNumber } from "@/lib/data";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { withReturnTo } from "@/lib/returnTo";
import { useEffect, useMemo, useState } from "react";

type TechnicianWithJobs = Awaited<ReturnType<typeof getTechnicians>>[number] & { jobsThisWeek: number };

export default function TechniciansPage() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<TechnicianWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getTechnicians()
      .then((list) =>
        Promise.all(
          list.map((t) =>
            getJobsThisWeekByTechnician(t.id).then((jobsThisWeek) => ({ ...t, jobsThisWeek }))
          )
        )
      )
      .then((list) => setTechnicians(Array.isArray(list) ? list : []))
      .catch(() => setTechnicians([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTechnicians = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = searchQuery.replace(/\D/g, "");
    if (!q && !qDigits) return technicians;
    return technicians.filter((row) => {
      const nameMatch = row.name && row.name.toLowerCase().includes(q);
      const emailMatch = row.email && row.email.toLowerCase().includes(q);
      const specialtyMatch = row.specialty && row.specialty.toLowerCase().includes(q);
      const phoneMatch =
        qDigits.length > 0 &&
        row.phone &&
        (row.phone.replace(/\D/g, "")).includes(qDigits);
      return nameMatch || emailMatch || specialtyMatch || phoneMatch;
    });
  }, [technicians, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Technicians</h1>
          <p className="mt-1 text-slate-500">Manage your team and assign jobs.</p>
        </div>
        <div className="py-12 text-center text-slate-500">Loading technicians...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Technicians</h1>
          <p className="mt-1 text-slate-500">
            Manage your team and assign jobs.
          </p>
        </div>
        <Link href="/technicians/new" className="shrink-0">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add technician
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="All technicians"
          subtitle={loading ? "Loading..." : `${filteredTechnicians.length} of ${technicians.length} technicians`}
          action={
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search by name, email, phone, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          }
        />
        <CardContent className="p-0">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTechnicians.map((tech) => (
              <Card key={tech.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/technicians/${tech.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/technicians/${tech.id}`);
                      }
                    }}
                    className="flex cursor-pointer items-start gap-4 p-5 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                      {tech.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-semibold text-slate-900">
                          {tech.name}
                        </h3>
                        <Badge
                          variant={tech.active ? "success" : "default"}
                        >
                          {tech.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{tech.specialty}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {tech.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatPhoneNumber(tech.phone)}</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {tech.jobsThisWeek} jobs this week
                      </p>
                    </div>
                  </div>
                  <div className="flex border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/schedule?technicianId=${tech.id}`);
                      }}
                      className="flex-1 py-2.5 text-center text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                    >
                      View schedule
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(withReturnTo(`/jobs/new?technicianId=${tech.id}`, "/technicians"));
                      }}
                      className="flex-1 border-l border-slate-100 py-2.5 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Assign job
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredTechnicians.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              {technicians.length === 0
                ? "No technicians yet. Add your first technician to get started."
                : "No technicians match your search."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
