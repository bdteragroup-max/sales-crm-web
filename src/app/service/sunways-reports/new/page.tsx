import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { getSunwaysCompanySuggestions } from "@/app/actions/sunwaysReports";
import SunwaysReportForm from "../components/SunwaysReportForm";

export const dynamic = "force-dynamic";

export default async function NewSunwaysReportPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const companiesRes = await getSunwaysCompanySuggestions();

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <SunwaysReportForm
        mode="create"
        currentUserName={session.fullName || ""}
        initialCompanies={companiesRes.data || []}
      />
    </main>
  );
}
