import React from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import {
  getSunwaysCompanySuggestions,
  getSunwaysReportById,
} from "@/app/actions/sunwaysReports";
import SunwaysReportForm from "../../components/SunwaysReportForm";

export const dynamic = "force-dynamic";

export default async function EditSunwaysReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const [res, companiesRes] = await Promise.all([
    getSunwaysReportById(id),
    getSunwaysCompanySuggestions(),
  ]);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <SunwaysReportForm
        mode="edit"
        initialReport={res.data}
        currentUserName={session.fullName || ""}
        initialCompanies={companiesRes.data || []}
      />
    </main>
  );
}
