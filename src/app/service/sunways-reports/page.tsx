import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { getSunwaysReports } from "@/app/actions/sunwaysReports";
import SunwaysReportsClientPage from "./SunwaysReportsClientPage";

export const dynamic = "force-dynamic";

export default async function SunwaysReportsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getSunwaysReports();

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <SunwaysReportsClientPage
        initialReports={res.data || []}
        userRole={session.role || ""}
        currentUserId={session.id}
      />
    </main>
  );
}
