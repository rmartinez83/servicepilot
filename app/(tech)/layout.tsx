import { DashboardGuard } from "@/components/auth/DashboardGuard";
import { JobsProvider } from "@/components/providers/JobsProvider";

export default function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <JobsProvider>
        <div className="min-h-screen bg-slate-50/80">
          {children}
        </div>
      </JobsProvider>
    </DashboardGuard>
  );
}
