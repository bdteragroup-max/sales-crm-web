import { getUser } from "@/app/lib/dal";
import { getAccountingTrackingDashboard } from "@/app/actions/damageReports";
import AccountingTrackingClient from "./AccountingTrackingClient";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

export const metadata = {
  title: "หน้าติดตามของบัญชี (Damage Tracking) | Sales CRM",
};

export default async function AccountingTrackingPage() {
  const session = await getUser();
  if (!session) redirect("/login");

  const res = await getAccountingTrackingDashboard();
  const reports = res.success && res.data ? res.data : [];
  const metrics = res.success && res.metrics ? res.metrics : {};

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar
        activeRoute="/damage-reports/accounting"
        userFullName={session.fullName}
        userRole={session.role}
        userId={session.id}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <AccountingTrackingClient
            initialReports={reports}
            initialMetrics={metrics}
            currentUser={session}
          />
        </main>
      </div>
    </div>
  );
}

