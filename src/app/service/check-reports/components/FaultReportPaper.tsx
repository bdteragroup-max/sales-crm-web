"use client";

import React from "react";
import { EQUIPMENT_TYPE_CONFIG } from "../lib/crConstants";

interface FaultReportPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function FaultReportPaper({
  report,
  lang = "TH",
  className = "",
}: FaultReportPaperProps) {
  const isEn = lang === "EN";

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString(isEn ? "en-GB" : "th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;

  const diode = report?.diodeMeasurement || {};
  const hasDiodeValues = Boolean(
    diode.pos_to_r_black || diode.pos_to_s_black || diode.pos_to_t_black ||
    diode.neg_to_r_red || diode.neg_to_s_red || diode.neg_to_t_red
  );
  const showDiodeSection = eqType === "INVERTER" || hasDiodeValues;

  const parts: any[] = report?.requireParts || [];
  const photos = report?.photos || {};
  const allPhotoUrls: string[] = [
    ...(photos.nameplate || []),
    ...(photos.front || []),
    ...(photos.side || []),
    ...(photos.damage || []),
  ];

  return (
    <div
      className={`fault-report-paper bg-white border-2 border-black w-full max-w-[794px] p-6 text-black text-[11px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header with Logos */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
          <div className="flex items-center gap-2">
            <img src="/4.png" alt="Tera Group" className="h-8 object-contain" />
            <img src="/6.png" alt="Tera Electric" className="h-8 object-contain" />
            <img src="/7.png" alt="Tera Power" className="h-8 object-contain" />
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-gray-800">
              {report?.companyCode === "TP"
                ? "TERA POWER CO., LTD."
                : report?.companyCode === "TE"
                ? "TERA ELECTRIC AND ENERGY CO., LTD."
                : "TERA GROUP CO., LTD."}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              Ref CR: {report?.crNumber || "-"}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-2">
          <h2 className="text-base font-black tracking-wide text-black uppercase">
            {isEn ? eqConfig.faultReportTitleEn : eqConfig.faultReportTitleTh}
          </h2>
        </div>

        {/* Spec & Fault Details Table */}
        <table className="w-full border-collapse border border-black text-[10.5px] mb-3">
          <tbody>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-24">
                {isEn ? "Customer" : "ลูกค้า"}
              </td>
              <td className="border border-black p-1.5 w-1/3">
                {report?.customerCompany || report?.customerName || "-"}
              </td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold w-28">
                {isEn
                  ? "Model"
                  : eqType === "CONTROL_CABINET"
                  ? "รุ่นตู้คอนโทรล"
                  : eqType === "MOTOR"
                  ? "รุ่นมอเตอร์"
                  : eqType === "PUMP"
                  ? "รุ่นปั๊ม"
                  : "รุ่น"}
              </td>
              <td className="border border-black p-1.5 font-bold">
                {report?.inverterBrand} {report?.inverterModel}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn
                  ? "Serial Number"
                  : eqType === "CONTROL_CABINET"
                  ? "Cabinet ID / S/N"
                  : eqType === "MOTOR"
                  ? "S/N มอเตอร์"
                  : eqType === "PUMP"
                  ? "S/N ปั๊ม"
                  : "หมายเลขเครื่อง"}
              </td>
              <td className="border border-black p-1.5 font-mono font-bold">
                {report?.serialNumber || "-"}
              </td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn
                  ? eqType === "MOTOR"
                    ? "kW of Motor"
                    : eqType === "PUMP"
                    ? "kW of Pump"
                    : eqType === "CONTROL_CABINET"
                    ? "Rated Power (kW)"
                    : "kW of motor"
                  : eqType === "MOTOR"
                  ? "ขนาดมอเตอร์"
                  : eqType === "PUMP"
                  ? "ขนาดปั๊ม"
                  : eqType === "CONTROL_CABINET"
                  ? "พิกัดตู้"
                  : "ขนาดมอเตอร์"}
              </td>
              <td className="border border-black p-1.5">
                {report?.motorKw ? `${report.motorKw} kW` : "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Date of purchase" : "วันที่ซื้อมา"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.purchaseDate)}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Date of sale" : "วันที่ขาย"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.saleDate)}</td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Fault Date" : "วันที่เสีย"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.faultDate)}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Status" : "สถานะการรับประกัน"}
              </td>
              <td className="border border-black p-1.5 font-semibold">
                {report?.warrantyStatus === "IN_WARRANTY"
                  ? isEn
                    ? "In warranty"
                    : "อยู่ในประกัน"
                  : report?.warrantyStatus === "OUT_OF_WARRANTY"
                  ? isEn
                    ? "Out of warranty"
                    : "นอกประกัน"
                  : isEn
                  ? "Pending check"
                  : "รอตรวจสอบ"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">
                {isEn ? "Application & Load" : "ลักษณะการใช้งาน / โหลด"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                {report?.applicationLoad || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">
                {isEn ? "Fault Description" : "อธิบายสาเหตุการเสีย"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                <div className="font-semibold text-red-950">{report?.symptoms || "-"}</div>
                {report?.causeOfFault && (
                  <div className="text-gray-700 text-[10px] mt-0.5">
                    {isEn ? "Cause: " : "สาเหตุที่พบ: "} {report.causeOfFault}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold align-top">
                {isEn ? "Required parts" : "ส่วนที่ต้องการเปลี่ยน"}
              </td>
              <td className="border border-black p-1.5" colSpan={3}>
                {parts.length === 0
                  ? "-"
                  : parts.map((p, i) => `${p.partName || "-"} (${p.qty || 1} ${isEn ? "pcs" : "ชิ้น"})`).join(", ")}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Report By" : "ผู้ทำรายงาน"}
              </td>
              <td className="border border-black p-1.5">{report?.inspectorName || report?.reportBy || "-"}</td>
              <td className="border border-black bg-neutral-100 p-1.5 font-bold">
                {isEn ? "Check Date" : "วันที่ตรวจเช็ค"}
              </td>
              <td className="border border-black p-1.5">{formatDate(report?.checkDate)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section: DIODE MEASUREMENT TABLE (Shown for Inverter or when Diode is tested) */}
        {showDiodeSection && (
          <>
            <div className="font-bold text-[11px] bg-neutral-200 border border-black px-2 py-1 mb-1 flex items-center justify-between">
              <span>
                {isEn
                  ? "MEASUREMENT RESULT OF THE DIODE INSIDE THE INVERTER"
                  : "ผลการตรวจวัดไดโอดภายในตัวเครื่องอินเวอร์เตอร์"}
              </span>
              <span className="text-[9.5px] font-normal text-gray-700">
                {isEn ? "Unit: Voltage drop (V)" : "หน่วย: โวลต์ (V drop)"}
              </span>
            </div>

            <table className="w-full border-collapse border border-black text-center text-[10.5px] mb-3">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Black (-) to (+)" : "สายดำที่ (+) / สายแดงที่เฟส"}
                  </th>
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Red (+) to (+)" : "สายแดงที่ (+) / สายดำที่เฟส"}
                  </th>
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Red (+) to (-)" : "สายแดงที่ (-) / สายดำที่เฟส"}
                  </th>
                  <th className="border border-black p-1 w-1/4" colSpan={2}>
                    {isEn ? "Multimeter probe: Black (-) to (-)" : "สายดำที่ (-) / สายแดงที่เฟส"}
                  </th>
                </tr>
                <tr className="bg-neutral-50 text-[10px] font-bold">
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                  <th className="border border-black p-0.5">Terminal</th>
                  <th className="border border-black p-0.5">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ R</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_r_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ R</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_r_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- R</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_r_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- R</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_r_black || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ S</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_s_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ S</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_s_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- S</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_s_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- S</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_s_black || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ T</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_t_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ T</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_t_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- T</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_t_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- T</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_t_black || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ U</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_u_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ U</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_u_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- U</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_u_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- U</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_u_red || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ V</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_v_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ V</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_v_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- V</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_v_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- V</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_v_red || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ W</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_w_red || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">+ W</td>
                  <td className="border border-black p-1 font-mono">{diode.pos_to_w_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- W</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_w_black || "-"}</td>
                  <td className="border border-black p-1 font-bold bg-neutral-50">- W</td>
                  <td className="border border-black p-1 font-mono">{diode.neg_to_w_red || "-"}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Section: PHOTOS ATTACHMENT */}
        {allPhotoUrls.length > 0 && (
          <div className="mb-2">
            <div className="font-bold text-[11px] bg-neutral-200 border border-black px-2 py-0.5 mb-1">
              {isEn ? "FAULT PHOTOS & NAMEPLATE" : "รูปถ่ายหน้างาน / NAMEPLATE / จุดชำรุด"}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {allPhotoUrls.slice(0, 4).map((url, i) => (
                <div key={i} className="border border-black h-24 overflow-hidden bg-neutral-50 flex items-center justify-center">
                  <img src={url} alt="" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signature Section */}
      <div className="border border-black grid grid-cols-2 text-center text-[10.5px] mt-2">
        <div className="border-r border-black p-2.5 space-y-3">
          <div className="font-bold">{isEn ? "Reported By (Technician)" : "ผู้ทำรายงาน / ช่างผู้ตรวจเช็ค"}</div>
          <div className="h-8"></div>
          <div>( {report?.inspectorName || report?.reportBy || "......................................................"} )</div>
          <div>{isEn ? "Date: " : "วันที่ "} {formatDate(report?.checkDate)}</div>
        </div>
        <div className="p-2.5 space-y-3">
          <div className="font-bold">{isEn ? "Approved By (Manager / Engineer)" : "ผู้ตรวจสอบ / หัวหน้างาน"}</div>
          <div className="h-8"></div>
          <div>( ...................................................... )</div>
          <div>{isEn ? "Date: " : "วันที่ "} ........ / ........ / ................</div>
        </div>
      </div>
    </div>
  );
}
