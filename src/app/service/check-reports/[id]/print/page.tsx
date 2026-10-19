import React from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { getInverterCheckReportById } from "@/app/actions/inverterCheckReports";
import PrintClientPage from "./PrintClientPage";

export const dynamic = "force-dynamic";

export default async function CheckReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const res = await getInverterCheckReportById(id);
  if (!res.success || !res.data) {
    notFound();
  }

  return <PrintClientPage report={JSON.parse(JSON.stringify(res.data))} />;
}
