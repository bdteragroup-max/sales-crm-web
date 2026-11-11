import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import {
  getActiveUsersForCheckReport,
  getRecentCompaniesForCheckReport,
  getRepairOrderForCheckReport,
} from "@/app/actions/inverterCheckReports";
import CheckReportForm from "../components/CheckReportForm";
import {
  BatchCrItemDraft,
  buildBatchItemsFromRepairOrder,
} from "../lib/multiItemCrHelpers";

export const dynamic = "force-dynamic";

interface NewCheckReportPageProps {
  searchParams: Promise<{ roId?: string; jobId?: string }>;
}

export default async function NewCheckReportPage({ searchParams }: NewCheckReportPageProps) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { roId, jobId } = await searchParams;
  const targetId = roId || jobId;

  const [users, initialCompanies] = await Promise.all([
    getActiveUsersForCheckReport(),
    getRecentCompaniesForCheckReport(),
  ]);

  let initialData: any = null;
  let initialBatchItems: BatchCrItemDraft[] | undefined = undefined;
  let initialActiveBatchIdx = 0;

  if (targetId) {
    const res = await getRepairOrderForCheckReport(targetId);
    if (res.success && res.data) {
      const order: any = res.data;
      const batchItems = buildBatchItemsFromRepairOrder(
        order,
        order.existingReports || []
      );
      initialBatchItems = batchItems;

      const firstPendingIdx = batchItems.findIndex((it) => it.selectedForSave);
      initialActiveBatchIdx = firstPendingIdx >= 0 ? firstPendingIdx : 0;
      const activeItem = batchItems[initialActiveBatchIdx] || batchItems[0];

      let compCode = "TG";
      const rawComp = (order.company || "").toUpperCase();
      if (rawComp === "TP" || rawComp.includes("POWER")) compCode = "TP";
      else if (rawComp === "TE" || rawComp.includes("ELECTRIC") || rawComp.includes("ENERGY")) compCode = "TE";

      initialData = {
        convertedJobId: order.jobId,
        convertedJobNumber: order.job?.jobNumber,
        convertedRepairOrderId: order.id,
        customerCompany: order.customerCompany || order.job?.customerName || "",
        customerName: order.job?.customerName || order.senderName || "",
        customerPhone: order.phoneNumber || "",
        customerAddress: order.customerAddress || "",
        salesPerson: order.salesPerson || order.job?.sellerName || "",
        inspectorName: order.technicianName || session.fullName || "",
        companyCode: compCode,
        equipmentType: activeItem?.equipmentType || "INVERTER",
        hasInverterInCabinet: activeItem?.hasInverterInCabinet ?? true,
        inverterBrand: activeItem?.inverterBrand || "",
        inverterModel: activeItem?.inverterModel || "",
        serialNumber: activeItem?.serialNumber || "",
        motorKw: activeItem?.motorKw || "",
        warrantyStatus: activeItem?.warrantyStatus || "IN_WARRANTY",
        symptoms: activeItem?.symptoms || order.symptoms || "",
        powerInputVoltage: activeItem?.powerInputVoltage || {},
        powerOutputVoltage: activeItem?.powerOutputVoltage || {},
        photos: activeItem?.photos || {},
      };
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <CheckReportForm
        initialData={initialData}
        initialBatchItems={initialBatchItems}
        initialActiveBatchIdx={initialActiveBatchIdx}
        users={users}
        companies={initialCompanies}
        currentUserName={session.fullName || ""}
        isEdit={false}
      />
    </main>
  );
}


