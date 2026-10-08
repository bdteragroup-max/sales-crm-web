"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface InverterQcPrintClientProps {
  order: any;
}

export default function InverterQcPrintClient({ order }: InverterQcPrintClientProps) {
  // Clear title during print so browser print headers/footers do not show title
  useEffect(() => {
    const originalTitle = document.title;
    const onBeforePrint = () => {
      document.title = "";
    };
    const onAfterPrint = () => {
      document.title = originalTitle;
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Parse items safely
  let itemsList: any[] = [];
  if (Array.isArray(order?.items)) {
    itemsList = order.items;
  } else if (typeof order?.items === "string") {
    try {
      itemsList = JSON.parse(order.items);
    } catch {
      itemsList = [];
    }
  }
  const firstItem = itemsList[0] || {};
  const qc: any = order?.inverterQc || {};

  // Thai Date Formatter
  const formatThaiDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "....................";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return String(dateStr);
    }
  };

  const receiveDate =
    qc.receiveDate ||
    (order?.receivedDate
      ? formatThaiDate(order.receivedDate)
      : order?.createdAt
      ? formatThaiDate(order.createdAt)
      : "....................");

  const inverterBrand = qc.inverterBrand || firstItem.brand || "....................";
  const inverterModel = qc.inverterModel || firstItem.model || "....................";
  const serialNumber = qc.serialNumber || firstItem.serial || "....................";
  const workType = qc.workType || order?.workType || order?.job?.jobType || "งานซ่อม INVERTER";
  const customerName = qc.customerName || order?.customerCompany || order?.job?.customerName || "....................";

  const parameterRows = Array.isArray(qc.parameterRows) && qc.parameterRows.length >= 6
    ? qc.parameterRows
    : [
        qc.parameterRows?.[0] || "",
        qc.parameterRows?.[1] || "",
        qc.parameterRows?.[2] || "",
        qc.parameterRows?.[3] || "",
        qc.parameterRows?.[4] || "",
        qc.parameterRows?.[5] || "",
      ];

  return (
    <div className="qc-screen-container min-h-screen bg-neutral-100 p-4 sm:p-8 flex flex-col items-center print:p-0 print:bg-white text-black font-['Sarabun',sans-serif]">
      {/* Screen Navigation Bar (Hidden when printing) */}
      <div className="w-full max-w-[794px] mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/repair-orders"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-xs transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>กลับหน้ารายการใบรับซ่อม</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#ff2301] hover:bg-[#e01f01] rounded-xl shadow-sm transition cursor-pointer"
          >
            <Printer size={14} />
            <span>พิมพ์เอกสาร (A4)</span>
          </button>
        </div>
      </div>

      {/* ── Official A4 Document Wrapper ── */}
      <div className="qc-print-wrapper w-full flex justify-center">
        <div
          id="official-qc-paper"
          className="bg-white border-2 border-black w-full max-w-[794px] p-4 sm:p-5 text-black shadow-lg print:shadow-none print:border-2 print:border-black text-[11.5px] leading-snug box-border flex flex-col justify-between"
        >
          {/* Header Row: Logos (4, 6, 7) + Address on Left, Date Box on Right */}
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b-2 border-black">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <img src="/4.png" alt="Tera Group" className="h-8 object-contain" />
                <img src="/6.png" alt="Tera Electric" className="h-8 object-contain" />
                <img src="/7.png" alt="Tera Power" className="h-8 object-contain" />
              </div>
              <div className="text-[11px] leading-tight text-gray-800">
                39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250
              </div>
            </div>

            {/* Top Right: วันที่รับซ่อม Box */}
            <div className="border border-black rounded-xl px-3 py-1 text-center min-w-[170px] bg-white shrink-0">
              <span className="text-[11px] font-bold mr-2">วันที่รับซ่อม</span>
              <span className="font-bold border-b border-black inline-block min-w-[80px] text-center text-xs">
                {receiveDate}
              </span>
            </div>
          </div>

          {/* Form Title in Framed Box */}
          <div className="my-1.5 border-2 border-black py-1 px-3 text-center bg-gray-50/50">
            <h1 className="text-xs sm:text-[13px] font-bold text-red-700 tracking-wide">
              ใบตรวจสอบค่าต่างๆและบันทึกค่าพารามิเตอร์ของ INVERTER หลัง ทำการซ่อมเสร็จ
            </h1>
          </div>

          {/* Equipment & Customer Meta Row */}
          <div className="border border-black p-2 space-y-1 text-[11.5px] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold">INVERTER ยี่ห้อ : </span>
                <span className="font-bold">{inverterBrand}</span>
              </div>
              <div>
                <span className="font-bold">INVERTER รุ่น : </span>
                <span className="font-bold">{inverterModel}</span>
              </div>
              <div>
                <span className="font-bold">SERIAL NUMBER : </span>
                <span className="font-mono font-bold">{serialNumber}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-dotted border-gray-300">
              <div>
                <span className="font-bold">ใช้กับงานประเภท : </span>
                <span>{workType}</span>
              </div>
              <div>
                <span className="font-bold">ลูกค้า : </span>
                <span className="font-bold">{customerName}</span>
              </div>
            </div>
          </div>

          {/* Section 1: POWER INPUT VOLTAGE */}
          <div className="mt-1.5">
            <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
              POWER INPUT VOLTAGE หลังซ่อมเสร็จ
            </div>
            <div className="space-y-0.5 text-[11px] pl-1">
              {/* DC */}
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.inputVoltage?.dcSinglePhase?.checked ? "☑" : "☐"}
                </span>
                <span>1 เฟส DC (+) , (-) .</span>
                <span className="border-b border-dotted border-black px-2 min-w-[65px] text-center font-bold inline-block mx-1">
                  {qc.inputVoltage?.dcSinglePhase?.value || "......."}
                </span>
                <span>Vdc</span>
              </div>
              {/* AC 1-Phase */}
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.inputVoltage?.acSinglePhase?.checked ? "☑" : "☐"}
                </span>
                <span>1 เฟส (220-230Vac) L-N .</span>
                <span className="border-b border-dotted border-black px-2 min-w-[65px] text-center font-bold inline-block mx-1">
                  {qc.inputVoltage?.acSinglePhase?.value || "......."}
                </span>
                <span>Vac</span>
              </div>
              {/* AC 3-Phase */}
              <div className="flex items-center flex-wrap">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.inputVoltage?.acThreePhase?.checked ? "☑" : "☐"}
                </span>
                <span>3 เฟส (380-400Vac) R-S</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.inputVoltage?.acThreePhase?.rs || "......."}
                </span>
                <span>Vac , R-T</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.inputVoltage?.acThreePhase?.rt || "......."}
                </span>
                <span>Vac , S-T</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.inputVoltage?.acThreePhase?.st || "......."}
                </span>
                <span>Vac</span>
              </div>
            </div>
          </div>

          {/* Section 2: POWER OUTPUT VOLTAGE */}
          <div className="mt-1.5">
            <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
              POWER OUTPUT VOLTAGE หลังซ่อมเสร็จ
            </div>
            <div className="space-y-0.5 text-[11px] pl-1">
              {/* 1-Phase */}
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.outputVoltage?.singlePhaseLN?.checked ? "☑" : "☐"}
                </span>
                <span>1 เฟส L-N (220-230Vac)</span>
                <span className="border-b border-dotted border-black px-2 min-w-[65px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.singlePhaseLN?.value || "......."}
                </span>
                <span>Vac</span>
              </div>
              {/* 3-Phase 220 */}
              <div className="flex items-center flex-wrap">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.outputVoltage?.threePhase220?.checked ? "☑" : "☐"}
                </span>
                <span>3 เฟส (220-230Vac) U-V .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.threePhase220?.uv || "......."}
                </span>
                <span>Vac , U-W .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.threePhase220?.uw || "......."}
                </span>
                <span>Vac , V-W .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.threePhase220?.vw || "......."}
                </span>
                <span>Vac</span>
              </div>
              {/* 3-Phase 380 */}
              <div className="flex items-center flex-wrap">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.outputVoltage?.threePhase380?.checked ? "☑" : "☐"}
                </span>
                <span>3 เฟส (380-400Vac) U-V</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.threePhase380?.uv || "......."}
                </span>
                <span>Vac , U-W</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.threePhase380?.uw || "......."}
                </span>
                <span>Vac , V-W</span>
                <span className="border-b border-dotted border-black px-1 min-w-[40px] text-center font-bold inline-block mx-1">
                  {qc.outputVoltage?.threePhase380?.vw || "......."}
                </span>
                <span>Vac</span>
              </div>
            </div>
          </div>

          {/* Section 3: CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ */}
          <div className="mt-1.5">
            <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
              CONTROL CIRCUIT และเทสระยะเวลาในการจ่ายไฟ
            </div>
            <div className="space-y-0.5 text-[11px] pl-1">
              {/* 24Vdc */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1">
                  {qc.controlCircuit?.control24Vdc?.checked ? "☑" : "☐"}
                </span>
                <span>24 Vdc , X1 .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                  {qc.controlCircuit?.control24Vdc?.x1 || "..."}
                </span>
                <span>Vdc , X2 .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                  {qc.controlCircuit?.control24Vdc?.x2 || "..."}
                </span>
                <span>Vdc , X3 .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                  {qc.controlCircuit?.control24Vdc?.x3 || "..."}
                </span>
                <span>Vdc , X4 .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                  {qc.controlCircuit?.control24Vdc?.x4 || "..."}
                </span>
                <span>Vdc , X5 .</span>
                <span className="border-b border-dotted border-black px-1 min-w-[28px] text-center font-bold inline-block mx-0.5">
                  {qc.controlCircuit?.control24Vdc?.x5 || "..."}
                </span>
                <span>Vdc</span>
              </div>

              {/* AC Timing */}
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.controlCircuit?.testAcDuration?.checked ? "☑" : "☐"}
                </span>
                <span>เทสเฉพาะการจ่ายไฟ AC ระยะเวลา .</span>
                <span className="border-b border-dotted border-black px-1.5 min-w-[45px] text-center font-bold inline-block mx-1">
                  {qc.controlCircuit?.testAcDuration?.minutes || "......."}
                </span>
                <span>นาที</span>
              </div>

              {/* DC Timing */}
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.controlCircuit?.testDcDuration?.checked ? "☑" : "☐"}
                </span>
                <span>เทสเฉพาะการจ่ายไฟ DC ระยะเวลา .</span>
                <span className="border-b border-dotted border-black px-1.5 min-w-[45px] text-center font-bold inline-block mx-1">
                  {qc.controlCircuit?.testDcDuration?.minutes || "......."}
                </span>
                <span>นาที</span>
              </div>

              {/* AC + DC Timing */}
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.controlCircuit?.testAcDcDuration?.checked ? "☑" : "☐"}
                </span>
                <span>เทสการจ่ายไฟ AC และ DC พร้อมกัน ระยะเวลา .</span>
                <span className="border-b border-dotted border-black px-1.5 min-w-[45px] text-center font-bold inline-block mx-1">
                  {qc.controlCircuit?.testAcDcDuration?.minutes || "......."}
                </span>
                <span>นาที</span>
              </div>
            </div>
          </div>

          {/* Section 4: การ Set ค่า Parameter */}
          <div className="mt-1.5">
            <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
              การ Set ค่า Parameter
            </div>
            <div className="space-y-0.5 text-[11px] pl-1">
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.parameterSetting?.keepCustomerOriginal ? "☑" : "☐"}
                </span>
                <span>Set ค่า Parameter เดิมให้ลูกค้า (โปรดบันทึกค่าลงในตารางด้านล่าง)</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.parameterSetting?.setNewForCustomer ? "☑" : "☐"}
                </span>
                <span>Set ค่า Parameter ใหม่ให้ลูกค้า (โปรดบันทึกค่าลงในตารางด้านล่าง)</span>
              </div>
            </div>
          </div>

          {/* Section 5: ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า */}
          <div className="mt-1.5">
            <div className="text-[11.5px] font-bold text-red-700 pb-0.5">
              ตรวจเชคอะไหล่และความเรียบร้อยภายในก่อนส่งคืนลูกค้า
            </div>
            <div className="space-y-0.5 text-[11px] pl-1">
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.visualChecks?.screwsAndPartsComplete ? "☑" : "☐"}
                </span>
                <span>น็อตและอะไหล่ภายใน INVERTER ติดตั้งครบถ้วน</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.visualChecks?.fanExhaustDirectionCorrect ? "☑" : "☐"}
                </span>
                <span>ตรวจเช็คพัดลมต้องดูดลมออก (ไม่ติดตั้งสลับทาง)</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.visualChecks?.controlWiringNormal ? "☑" : "☐"}
                </span>
                <span>สายไฟ Control ภายใน Board Electronics อยู่ในตำแหน่งที่ถูกต้องและมีสภาพปกติ</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-14 sm:w-16 border-b border-black mr-2 shrink-0"></span>
                <span className="font-mono text-sm mr-1.5">
                  {qc.visualChecks?.diodeConversionCorrect ? "☑" : "☐"}
                </span>
                <span>
                  ตรวจสอบการแปลงไดโอดของ INVERTER อยู่ในสภาพที่ถูกต้อง (หากมีการแปลง) * โปรดดูคู่มือการแปลงก่อนทุกครั้ง
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ */}
          <div className="mt-1.5">
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead>
                <tr className="border-b border-black bg-gray-50/30">
                  <th className="py-0.5 px-2 text-center text-red-700 font-bold">
                    บันทึกค่า Parameter ที่ตั้งไว้ / รายละเอียดเพิ่มเติมหรือปัญหาที่พบ
                  </th>
                </tr>
              </thead>
              <tbody>
                {parameterRows.map((r: string, i: number) => (
                  <tr key={i} className="border-b border-black h-5">
                    <td className="px-2 py-0.5 align-middle text-black">
                      {r || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 7: หมายเหตุ */}
          <div className="mt-1.5 text-[11px]">
            <div className="font-bold mb-0.5">หมายเหตุ:</div>
            <div className="border-b border-dotted border-black min-h-[18px] px-1 font-medium">
              {qc.notes || ""}
            </div>
            <div className="border-b border-dotted border-black min-h-[18px] mt-0.5"></div>
          </div>

          {/* Section 8: Signatures & Form Code */}
          <div className="mt-2.5 pt-1">
            <div className="grid grid-cols-2 gap-8 text-center text-[11px]">
              {/* ผู้ตรวจเช็ค */}
              <div className="flex flex-col items-center justify-end min-h-[65px]">
                {qc.inspectorSignatureUrl ? (
                  <img
                    src={qc.inspectorSignatureUrl}
                    alt="Inspector Signature"
                    className="h-8 object-contain mb-0.5"
                  />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="border-t border-black w-44 mx-auto pt-0.5 font-bold">
                  ( {qc.inspectorName || order?.technicianName || "......................................."} )
                </div>
                <div className="text-[10px] text-gray-700 mt-0.5">ผู้ตรวจเช็ค</div>
              </div>

              {/* ผู้ตรวจสอบ */}
              <div className="flex flex-col items-center justify-end min-h-[65px]">
                {qc.reviewerSignatureUrl ? (
                  <img
                    src={qc.reviewerSignatureUrl}
                    alt="Reviewer Signature"
                    className="h-8 object-contain mb-0.5"
                  />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="border-t border-black w-44 mx-auto pt-0.5 font-bold">
                  ( {qc.reviewerName || "......................................."} )
                </div>
                <div className="text-[10px] text-gray-700 mt-0.5">ผู้ตรวจสอบ</div>
              </div>
            </div>

            {/* Form Footer Revision Code */}
            <div className="text-right text-[9.5px] font-bold text-gray-800 mt-1">
              QC-EN-01/Rev.00
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, header, footer {
            display: none !important;
          }
          .qc-screen-container {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            min-height: 0 !important;
          }
          .qc-print-wrapper {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 7mm 9mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #official-qc-paper {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            border: 2px solid black !important;
            box-shadow: none !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            padding: 4.5mm 5.5mm !important;
          }
        }
      `}} />
    </div>
  );
}
