import { getUser } from "@/app/lib/dal";
import { getDamageReports } from "@/app/actions/damageReports";
import DamageReportsClient from "./DamageReportsClient";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

export const metadata = {
  title: "ระบบแจ้งและติดตามสินค้าและทรัพย์สินชำรุดเสียหาย | Sales CRM",
};

export default async function DamageReportsPage() {
  const session = await getUser();
  if (!session) redirect("/login");

  const res = await getDamageReports();
  const reports = res.success && res.data ? res.data : [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar
        activeRoute="/damage-reports"
        userFullName={session.fullName}
        userRole={session.role}
        userId={session.id}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <DamageReportsClient reports={reports} currentUser={session} />
        </main>
      </div>
    </div>
  );
}

