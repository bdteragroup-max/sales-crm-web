import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { isSuperUser, isSalesOrMarketingManager } from "@/app/lib/roleHelper";
import { getServiceHandoversForSales } from "@/app/actions/service-calls";
import ServiceHandoversClient from "./ServiceHandoversClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    caseId?: string;
    tab?: string;
  }>;
}

export default async function ServiceHandoversPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  const roleStr = (user.role || "").toLowerCase();
  const isSuperAdmin = isSuperUser(user.role);
  const isManager =
    isSalesOrMarketingManager(user.role) ||
    user.role === "ผู้จัดการ" ||
    roleStr.includes("manager") ||
    roleStr.includes("ผู้จัดการ") ||
    roleStr.includes("mgr");

  const handovers = await getServiceHandoversForSales(
    user.id,
    isSuperAdmin || isManager
  );

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-slate-50/70 pb-24 md:pb-6">
      <ServiceHandoversClient
        initialHandovers={JSON.parse(JSON.stringify(handovers || []))}
        currentUser={user}
        initialCaseId={params.caseId || null}
        initialTab={
          params.tab === "completed" || params.tab === "all"
            ? params.tab
            : "pending"
        }
      />
    </main>
  );
}

