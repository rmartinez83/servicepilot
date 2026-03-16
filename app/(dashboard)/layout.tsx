import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { JobsProvider } from "@/components/providers/JobsProvider";
import { DashboardGuard } from "@/components/auth/DashboardGuard";
import { TrialGuard } from "@/components/auth/TrialGuard";
import { DevAuthIndicator } from "@/components/auth/DevAuthIndicator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <TrialGuard>
        <JobsProvider>
          <div className="flex min-h-screen flex-col bg-page-bg lg:flex-row">
            <Sidebar />
            <div className="flex min-h-0 flex-1 flex-col gap-0 bg-page-bg lg:min-w-0">
              <TopNav />
              <main className="min-h-0 flex-1 px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-0">
                {children}
              </main>
            </div>
          </div>
        <DevAuthIndicator />
        </JobsProvider>
      </TrialGuard>
    </DashboardGuard>
  );
}
