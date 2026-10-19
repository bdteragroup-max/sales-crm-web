"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { EQUIPMENT_TYPE_CONFIG } from "../lib/crConstants";

interface CrInspectionPaperProps {
  report: any;
  className?: string;
}

export default function CrInspectionPaper({ report, className = "" }: CrInspectionPaperProps) {
  const checkDateStr = report?.checkDate
    ? new Date(report.checkDate).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;

  const pInput = report?.powerInputVoltage || {};
  const pOutput = report?.powerOutputVoltage || {};
  const panelItems: any[] = report?.panelComponentsCheck || [];

  return (
    <div
      className={`cr-inspection-paper bg-white border-2 border-black w-full max-w-[794px] p-6 text-black text-[12px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header with Logos */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <img src="/4.png" alt="Tera Group" className="h-9 object-contain" />
            <img src="/6.png" alt="Tera Electric" className="h-9 object-contain" />
            <img src="/7.png" alt="Tera Power" className="h-9 object-contain" />
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-gray-800">
              {report?.companyCode === "TP"
                ? "บริษัท เทอรา พาวเวอร์ จำกัด"
                : report?.companyCode === "TE"
                ? "บริษัท เทอรา อิเล็คทริค แอนด์ เอ็นเนอร์ยี่ จำกัด"
                : "บริษัท เทอรา กรุ๊ป จำกัด"}
            </div>
            <div className="text-[10px] text-gray-600">
              ระบบบริหารจัดการงานบริการและตรวจเช็คอุปกรณ์ไฟฟ้า
            </div>
          </div>
        </div>

        {/* Title & Document Number */}
        <div className="flex items-center justify-between my-3">
          <h2 className="text-base font-bold text-black uppercase tracking-wide">
            {eqConfig.inspectionTitleTh}
          </h2>
          <div className="border border-black px-3 py-1 font-mono font-bold text-sm bg-neutral-50">
            เลขที่ CR: {report?.crNumber || "-"}
          </div>
        </div>

        {/* General Info Grid */}
        <table className="w-full border-collapse border border-black text-[11.5px] mb-3">
          <tbody>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-24">วันที่ตรวจเช็ค</td>
              <td className="border border-black p-1.5 w-1/4">{checkDateStr}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-28">ชื่อบริษัทลูกค้า</td>
              <td className="border border-black p-1.5" colSpan={3}>
                {report?.customerCompany || report?.customerName || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {eqType === "MOTOR"
                  ? "ยี่ห้อมอเตอร์"
                  : eqType === "PUMP"
                  ? "ยี่ห้อปั๊ม"
                  : eqType === "CONTROL_CABINET"
                  ? "แบรนด์ / ผู้ประกอบ"
                  : "ยี่ห้อ (Brand)"}
              </td>
              <td className="border border-black p-1.5 font-bold">{report?.inverterBrand || "-"}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {eqType === "MOTOR"
                  ? "รุ่นมอเตอร์"
                  : eqType === "PUMP"
                  ? "รุ่นปั๊ม"
                  : eqType === "CONTROL_CABINET"
                  ? "รุ่นตู้คอนโทรล"
                  : "Model"}
              </td>
              <td className="border border-black p-1.5 font-bold">{report?.inverterModel || "-"}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-24">
                {eqType === "CONTROL_CABINET" ? "Cabinet ID" : "Serial No."}
              </td>
              <td className="border border-black p-1.5 font-mono">{report?.serialNumber || "-"}</td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {eqConfig.powerUnitLabel}
              </td>
              <td className="border border-black p-1.5 font-bold">
                {report?.motorKw ? `${report.motorKw} kW` : "-"}
              </td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {eqType === "MOTOR"
                  ? "โหลด / รอบหมุน"
                  : eqType === "PUMP"
                  ? "Flow / Head"
                  : eqType === "CONTROL_CABINET"
                  ? "ระบบโหลดที่คุม"
                  : "โหลด / การใช้งาน"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                {report?.applicationLoad || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">ผู้ตรวจสอบ</td>
              <td className="border border-black p-1.5">{report?.inspectorName || "-"}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">เซลล์ผู้ดูแล</td>
              <td className="border border-black p-1.5" colSpan={3}>
                {report?.salesPerson || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">อาการ</td>
              <td className="border border-black p-1.5" colSpan={5}>
                {report?.symptoms || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">ข้อเสนอแนะ</td>
              <td className="border border-black p-1.5" colSpan={5}>
                {report?.recommendations || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 1: POWER VOLTAGE */}
        <div className="font-bold text-[12px] bg-neutral-200 border border-black px-2 py-1 mb-1">
          หัวข้อการตรวจเช็คระบบไฟฟ้า (POWER VOLTAGE)
        </div>

        <table className="w-full border-collapse border border-black text-[11px] mb-3">
          <tbody>
            <tr className="bg-neutral-100">
              <td className="border border-black p-1.5 font-bold" colSpan={2}>
                POWER INPUT VOLTAGE ระหว่างตรวจเช็ค
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 w-1/2">
                1 เฟส DC (+) , (-) : <b>{pInput.inputDc ? `${pInput.inputDc} Vdc` : "................ Vdc"}</b>
              </td>
              <td className="border border-black p-1.5 w-1/2">
                1 เฟส (220-230Vac) L-N : <b>{pInput.input1PhaseAc ? `${pInput.input1PhaseAc} Vac` : "................ Vac"}</b>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5" colSpan={2}>
                3 เฟส (380-400Vac) R-S : <b>{pInput.input3PhaseRs ? `${pInput.input3PhaseRs} Vac` : "........ Vac"}</b> , 
                R-T : <b>{pInput.input3PhaseRt ? `${pInput.input3PhaseRt} Vac` : "........ Vac"}</b> , 
                S-T : <b>{pInput.input3PhaseSt ? `${pInput.input3PhaseSt} Vac` : "........ Vac"}</b>
              </td>
            </tr>

            <tr className="bg-neutral-100">
              <td className="border border-black p-1.5 font-bold" colSpan={2}>
                POWER OUTPUT VOLTAGE ระหว่างตรวจเช็ค
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5">
                1 เฟส L-N (220-230Vac) : <b>{pOutput.output1PhaseLn ? `${pOutput.output1PhaseLn} Vac` : "................ Vac"}</b>
              </td>
              <td className="border border-black p-1.5">
                3 เฟส (220-230Vac) U-V : <b>{pOutput.output3Phase220Uv || "......"}</b> Vac, 
                U-W : <b>{pOutput.output3Phase220Uw || "......"}</b> Vac, 
                V-W : <b>{pOutput.output3Phase220Vw || "......"}</b> Vac
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5" colSpan={2}>
                3 เฟส (380-400Vac) U-V : <b>{pOutput.output3Phase380Uv ? `${pOutput.output3Phase380Uv} Vac` : "........ Vac"}</b> , 
                U-W : <b>{pOutput.output3Phase380Uw ? `${pOutput.output3Phase380Uw} Vac` : "........ Vac"}</b> , 
                V-W : <b>{pOutput.output3Phase380Vw ? `${pOutput.output3Phase380Vw} Vac` : "........ Vac"}</b>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 2: 13 PANEL COMPONENTS CHECK */}
        <div className="font-bold text-[12px] bg-neutral-200 border border-black px-2 py-1 mb-1">
          ตรวจสอบสภาพ อุปกรณ์ภายในตู้ควบคุม (PANEL INSPECTION)
        </div>

        <table className="w-full border-collapse border border-black text-[11px] mb-3">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-black p-1 text-center w-10">ลำดับ</th>
              <th className="border border-black p-1 text-left">รายการอุปกรณ์</th>
              <th className="border border-black p-1 text-center w-24">สภาพปกติ</th>
              <th className="border border-black p-1 text-center w-24">ชำรุด</th>
              <th className="border border-black p-1 text-left">โปรดระบุรายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {panelItems.map((item, idx) => {
              const isNormal = item.status === "NORMAL";
              const isDamaged = item.status === "DAMAGED";

              return (
                <tr key={idx} className={idx % 2 === 1 ? "bg-neutral-50/50" : ""}>
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 font-medium">{item.name}</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {isNormal ? (
                      <span className="inline-flex items-center gap-1 justify-center">
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span>ปกติ</span>
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-red-600">
                    {isDamaged ? (
                      <span className="inline-flex items-center gap-1 justify-center text-red-600">
                        <X className="w-3.5 h-3.5 text-red-600" />
                        <span>ชำรุด</span>
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="border border-black p-1 text-slate-700">{item.remark || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="border border-black grid grid-cols-2 text-center text-[11px] mt-2">
        <div className="border-r border-black p-3 space-y-4">
          <div className="font-bold">ลงชื่อผู้ตรวจสอบ (Inspector)</div>
          <div className="h-10"></div>
          <div>(......................................................)</div>
          <div>วันที่ ........ / ........ / ................</div>
        </div>
        <div className="p-3 space-y-4">
          <div className="font-bold">ลงชื่อลูกค้า / ผู้รับทราบ (Customer Representative)</div>
          <div className="h-10"></div>
          <div>(......................................................)</div>
          <div>วันที่ ........ / ........ / ................</div>
        </div>
      </div>
    </div>
  );
}
