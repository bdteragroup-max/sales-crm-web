import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import OutsourceRepairsClientPage from "./ClientPage";
import { getOutsourceRepairs } from "@/app/actions/outsourceRepairs";

export const metadata = {
  title: "ซ่อมภายนอก | Sales CRM",
};

export default async function OutsourceRepairsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getOutsourceRepairs();
  const repairs = res.success ? res.data : [];

  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <OutsourceRepairsClientPage initialData={repairs || []} currentUser={session} />
    </Suspense>
  );
}
