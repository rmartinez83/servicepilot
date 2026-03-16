import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarChart3, TrendingUp, Download, Calendar } from "lucide-react";

const reportCards = [
  {
    title: "Revenue report",
    description: "Revenue by period, service type, and technician.",
    icon: BarChart3,
    lastRun: "Mar 8, 2025",
  },
  {
    title: "Job performance",
    description: "Completion rates, average duration, and bottlenecks.",
    icon: TrendingUp,
    lastRun: "Mar 8, 2025",
  },
  {
    title: "Technician utilization",
    description: "Hours worked, jobs per tech, and capacity.",
    icon: Calendar,
    lastRun: "Mar 7, 2025",
  },
];

const summaryData = [
  { label: "Total revenue (MTD)", value: "$42,580", change: "+12%" },
  { label: "Jobs completed", value: "89", change: "+8%" },
  { label: "Avg. job value", value: "$478", change: "+5%" },
  { label: "Customer retention", value: "94%", change: "+2%" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-slate-500">
            Analytics and insights for your service business.
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryData.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {item.value}
              </p>
              <p className="mt-0.5 text-sm text-emerald-600">{item.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="flex flex-col">
              <CardHeader
                title={report.title}
                subtitle={report.description}
                action={
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                }
              />
              <CardContent className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">
                  Last run: {report.lastRun}
                </span>
                <Button variant="ghost" size="sm">
                  Run report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
