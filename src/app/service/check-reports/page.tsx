import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import { getActiveUsersForCheckReport } from "@/app/actions/inverterCheckReports";
import CheckReportsClientPage from "./CheckReportsClientPage";

export const dynamic = "force-dynamic";

export default async function CheckReportsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const userRole = session.role || "";

  const [rawReports, rawUsers] = await Promise.all([
    prisma.inverterCheckReport.findMany({
      orderBy: { createdAt: "desc" },
    }),
    getActiveUsersForCheckReport(),
  ]);

  const reports = JSON.parse(JSON.stringify(rawReports));
  const users = JSON.parse(JSON.stringify(rawUsers));

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <CheckReportsClientPage
        initialReports={reports}
        users={users}
        companies={[]}
        currentUserName={session.fullName || ""}
        userRole={userRole}
      />
    </main>
  );
}

