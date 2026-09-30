import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import OutsourceRepairsClientPage from "./ClientPage";
import { getOutsourceRepairs } from "@/app/actions/outsourceRepairs";

export const metadata = {
  title: "ใบส่งซ่อมภายนอก (Outsource Repairs) - CRM",
};

export const dynamic = "force-dynamic";

export default async function OutsourceRepairsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getOutsourceRepairs();
  const repairs = res.success ? res.data : [];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">
          กำลังโหลดข้อมูลใบส่งซ่อมภายนอก...
        </div>
      }
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32">
        <OutsourceRepairsClientPage
          initialData={repairs || []}
          currentUser={session}
        />
      </div>
    </Suspense>
  );
}
