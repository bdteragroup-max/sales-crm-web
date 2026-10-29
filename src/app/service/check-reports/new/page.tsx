import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import {
  getActiveUsersForCheckReport,
  getRecentCompaniesForCheckReport,
  getRepairOrderForCheckReport,
} from "@/app/actions/inverterCheckReports";
import CheckReportForm from "../components/CheckReportForm";

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
  if (targetId) {
    const res = await getRepairOrderForCheckReport(targetId);
    if (res.success && res.data) {
      const order = res.data;
      const items = Array.isArray(order.items) ? (order.items as any[]) : [];
      const firstItem = items[0] || {};

      let eqType = "INVERTER";
      const itemType = (firstItem.type || "").toUpperCase();
      if (itemType.includes("ตู้") || itemType.includes("CABINET") || itemType.includes("PANEL")) {
        eqType = "CONTROL_CABINET";
      } else if (itemType.includes("มอเตอร์") || itemType.includes("MOTOR")) {
        eqType = "MOTOR";
      } else if (itemType.includes("ปั๊ม") || itemType.includes("PUMP")) {
        eqType = "PUMP";
      }

      let compCode = "TG";
      const rawComp = (order.company || "").toUpperCase();
      if (rawComp === "TP" || rawComp.includes("POWER")) compCode = "TP";
      else if (rawComp === "TE" || rawComp.includes("ELECTRIC") || rawComp.includes("ENERGY")) compCode = "TE";

      // If Inverter QC exists, extract power voltage
      let pInput: any = {};
      let pOutput: any = {};
      if (order.inverterQc) {
        const qc = order.inverterQc as any;
        const itemQc = Array.isArray(qc.itemsQc) ? qc.itemsQc[0] : qc;
        if (itemQc?.inputVoltage) {
          pInput = {
            inputDc: itemQc.inputVoltage?.dcSinglePhase?.value || "",
            input1PhaseAc: itemQc.inputVoltage?.acSinglePhase?.value || "",
            input3PhaseRs: itemQc.inputVoltage?.acThreePhase?.rs || "",
            input3PhaseRt: itemQc.inputVoltage?.acThreePhase?.rt || "",
            input3PhaseSt: itemQc.inputVoltage?.acThreePhase?.st || "",
          };
        }
        if (itemQc?.outputVoltage) {
          pOutput = {
            output1PhaseLn: itemQc.outputVoltage?.singlePhaseLN?.value || "",
            output3Phase220Uv: itemQc.outputVoltage?.threePhase220?.uv || "",
            output3Phase220Uw: itemQc.outputVoltage?.threePhase220?.uw || "",
            output3Phase220Vw: itemQc.outputVoltage?.threePhase220?.vw || "",
            output3Phase380Uv: itemQc.outputVoltage?.threePhase380?.uv || "",
            output3Phase380Uw: itemQc.outputVoltage?.threePhase380?.uw || "",
            output3Phase380Vw: itemQc.outputVoltage?.threePhase380?.vw || "",
          };
        }
      }

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
        equipmentType: eqType,
        inverterBrand: firstItem.brand || "",
        inverterModel: firstItem.model || "",
        serialNumber: firstItem.serial || "",
        motorKw: firstItem.size || "",
        warrantyStatus: "IN_WARRANTY",
        symptoms: order.symptoms || "",
        powerInputVoltage: pInput,
        powerOutputVoltage: pOutput,
      };
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <CheckReportForm
        initialData={initialData}
        users={users}
        companies={initialCompanies}
        currentUserName={session.fullName || ""}
        isEdit={false}
      />
    </main>
  );
}


