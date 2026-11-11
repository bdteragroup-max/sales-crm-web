import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import RepairOrdersClientPage from "./RepairOrdersClientPage";

export const dynamic = "force-dynamic";

export default async function RepairOrdersPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const userRole = session.role || "";


  const [rawRepairOrders, rawCompanies, rawUsers, rawCheckReports] = await Promise.all([
    prisma.repairOrder.findMany({
      include: {
        job: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.company.findMany({
      orderBy: { companyName: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.inverterCheckReport.findMany({
      select: {
        id: true,
        crNumber: true,
        equipmentType: true,
        inverterBrand: true,
        inverterModel: true,
        serialNumber: true,
        status: true,
        convertedRepairOrderId: true,
        convertedJobId: true,
        convertedJobNumber: true,
      },
      orderBy: { crNumber: "asc" },
    }),
  ]);

  const enrichedRepairOrders = rawRepairOrders.map((ro) => ({
    ...ro,
    checkReports: rawCheckReports.filter(
      (cr) =>
        (cr.convertedRepairOrderId && cr.convertedRepairOrderId === ro.id) ||
        (ro.jobId && cr.convertedJobId === ro.jobId) ||
        (ro.job?.jobNumber && cr.convertedJobNumber === ro.job.jobNumber)
    ),
  }));

  const repairOrders = JSON.parse(JSON.stringify(enrichedRepairOrders));
  const companies = JSON.parse(JSON.stringify(rawCompanies));
  const users = JSON.parse(JSON.stringify(rawUsers));

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <RepairOrdersClientPage
        initialRepairOrders={repairOrders}
        companies={companies}
        users={users}
        userRole={userRole}
        currentUserName={session.fullName || ""}
      />
    </main>
  );
}
