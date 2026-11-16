import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
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

  const handovers = await getServiceHandoversForSales();
  const requestedMissingCase = Boolean(
    params.caseId && !handovers.some((h) => h.id === params.caseId)
  );

  return (
    <main className="flex-1 md:overflow-hidden overflow-y-auto p-4 md:p-6 bg-slate-50/70 pb-24 md:pb-6">
      <ServiceHandoversClient
        initialHandovers={JSON.parse(JSON.stringify(handovers || []))}
        currentUser={user}
        initialCaseId={params.caseId || null}
        requestedMissingCase={requestedMissingCase}
        initialTab={
          params.tab === "completed" || params.tab === "all"
            ? params.tab
            : "pending"
        }
      />
    </main>
  );
}
