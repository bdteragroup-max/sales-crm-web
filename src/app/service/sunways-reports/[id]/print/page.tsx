import React from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import { getSunwaysReportById } from "@/app/actions/sunwaysReports";
import type { SunwaysPrintLang } from "@/app/lib/sunwaysReportConfig";
import SunwaysPrintClient from "../../components/SunwaysPrintClient";

export const dynamic = "force-dynamic";

export default async function PrintSunwaysReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const sp = await searchParams;
  const res = await getSunwaysReportById(id);
  if (!res.success || !res.data) {
    notFound();
  }

  const initialLang: SunwaysPrintLang =
    sp?.lang === "TH"
      ? "TH"
      : sp?.lang === "BILINGUAL"
      ? "BILINGUAL"
      : "EN";

  return <SunwaysPrintClient report={res.data} initialLang={initialLang} />;
}
