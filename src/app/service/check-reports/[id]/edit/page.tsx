import React from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import {
  getInverterCheckReportById,
  getActiveUsersForCheckReport,
  getRecentCompaniesForCheckReport,
} from "@/app/actions/inverterCheckReports";
import CheckReportForm from "../../components/CheckReportForm";

export const dynamic = "force-dynamic";

export default async function EditCheckReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const [res, users, companies] = await Promise.all([
    getInverterCheckReportById(id),
    getActiveUsersForCheckReport(),
    getRecentCompaniesForCheckReport(),
  ]);

  if (!res.success || !res.data) {
    notFound();
  }

  const report = JSON.parse(JSON.stringify(res.data));

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <CheckReportForm
        initialData={report}
        users={users}
        companies={companies}
        currentUserName={session.fullName || ""}
        isEdit={true}
      />
    </main>
  );
}

