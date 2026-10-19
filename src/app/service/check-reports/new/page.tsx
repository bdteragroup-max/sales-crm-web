import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { getActiveUsersForCheckReport } from "@/app/actions/inverterCheckReports";
import CheckReportForm from "../components/CheckReportForm";

export const dynamic = "force-dynamic";

export default async function NewCheckReportPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const users = await getActiveUsersForCheckReport();

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <CheckReportForm
        users={users}
        currentUserName={session.fullName || ""}
        isEdit={false}
      />
    </main>
  );
}

