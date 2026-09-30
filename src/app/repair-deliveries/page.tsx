export const dynamic = "force-dynamic";

import { getRepairDeliveries } from "@/app/actions/repairDeliveries";
import RepairDeliveriesClientPage from "./RepairDeliveriesClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "ใบส่งมอบงาน (Repair Deliveries) | Sales CRM",
};

export default async function RepairDeliveriesPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getRepairDeliveries();
  const deliveries = res.success ? res.data : [];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">
          กำลังโหลดข้อมูลใบส่งมอบงาน...
        </div>
      }
    >
      <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32">
          <RepairDeliveriesClientPage
            initialDeliveries={deliveries as any}
            currentUser={session}
          />
        </div>
      </main>
    </Suspense>
  );
}
