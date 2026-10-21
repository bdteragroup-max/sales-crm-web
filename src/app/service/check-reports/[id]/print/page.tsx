import React from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { getInverterCheckReportById } from "@/app/actions/inverterCheckReports";
import PrintClientPage from "./PrintClientPage";

export const dynamic = "force-dynamic";

export default async function CheckReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp?.tab === "string" ? sp.tab : undefined;

  const res = await getInverterCheckReportById(id);
  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">กำลังเตรียมหน้าพิมพ์เอกสาร...</div>}>
      <PrintClientPage
        report={JSON.parse(JSON.stringify(res.data))}
        initialTab={tab}
      />
    </React.Suspense>
  );
}
