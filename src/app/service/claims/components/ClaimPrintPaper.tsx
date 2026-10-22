"use client";

import React from "react";

interface ClaimPrintPaperProps {
  claim: any;
  className?: string;
}

export default function ClaimPrintPaper({ claim, className = "" }: ClaimPrintPaperProps) {
  if (!claim) return null;

  const claimDateStr = claim?.claimDate
    ? new Date(claim.claimDate).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const claimTimeStr = claim?.claimDate
    ? new Date(claim.claimDate).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const handledDateStr = claim?.handledAt
    ? new Date(claim.handledAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const EQUIPMENT_TYPE_MAP: Record<string, string> = {
    INVERTER: "อินเวอร์เตอร์ / Drive / Soft Starter",
    CONTROL_CABINET: "ตู้คอนโทรลระบบไฟฟ้า (Control Cabinet & Panel)",
    MOTOR: "มอเตอร์ไฟฟ้า (Electric Motor)",
    PUMP: "ปั๊มน้ำ (Water Pump)",
    OTHER: "อุปกรณ์อื่นๆ (Other Equipment)",
  };

  const DEPARTMENT_MAP: Record<string, string> = {
    WAREHOUSE: "คลังสินค้า / สโตร์ (Warehouse)",
    QC: "ตรวจสอบคุณภาพ (QC / Quality Control)",
    STORE: "สโตร์สินค้า (Store)",
    PRODUCTION: "ฝ่ายผลิต / ประกอบตู้ (Production)",
    OTHER: "อื่นๆ (Other)",
  };

  const STATUS_MAP: Record<string, string> = {
    PENDING: "รอรับเรื่อง (Pending Intake)",
    UNDER_REVIEW: "กำลังตรวจสอบ (Under Review)",
    ACCEPTED: "รับเคลมแล้ว (Accepted)",
    CONVERTED_CR: "เปิดใบตรวจเช็ค CR แล้ว",
    CONVERTED_RO: "เปิดใบรับซ่อม RO แล้ว",
    REJECTED: "ปฏิเสธการเคลม (Rejected)",
    CLOSED: "ปิดงาน (Closed)",
  };

  const defectPhotos: string[] = Array.isArray(claim?.defectPhotos) ? claim.defectPhotos : [];

  return (
    <div
      className={`claim-print-paper bg-white text-black font-['Sarabun',sans-serif] text-[12px] leading-tight max-w-[794px] mx-auto p-6 box-border print:p-0 print:max-w-none print:w-full ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      {/* 1. Header with Company Logos & Address */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/4.png" alt="Tera Group" className="h-10 object-contain" />
          <img src="/6.png" alt="Tera Electric" className="h-10 object-contain" />
          <img src="/7.png" alt="Tera Power" className="h-10 object-contain" />
          <div className="border-l-2 border-slate-300 pl-3 ml-1">
            <div className="text-[13px] font-bold text-black tracking-tight leading-tight">
              บริษัท เทอรา กรุ๊ป จำกัด
            </div>
            <div className="text-[10px] text-slate-600 font-semibold tracking-tight">
              Tera Group Co.,Ltd.
            </div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">
              ฝ่ายบริการและซ่อมบำรุง (Customer Service & Technical Support)
            </div>
          </div>
        </div>

        {/* Document Number Box */}
        <div className="text-right">
          <table className="border-collapse border border-black text-[11px] ml-auto">
            <tbody>
              <tr>
                <td className="bg-neutral-100 font-bold px-2.5 py-1 border border-black text-right">
                  เลขที่แจ้งเคลม (Claim No.)
                </td>
                <td className="font-mono font-bold text-red-700 px-3 py-1 border border-black text-left">
                  {claim.claimNumber || "-"}
                </td>
              </tr>
              <tr>
                <td className="bg-neutral-100 font-bold px-2.5 py-1 border border-black text-right">
                  วันที่แจ้ง (Date)
                </td>
                <td className="px-3 py-1 border border-black text-left">
                  {claimDateStr} {claimTimeStr ? `(${claimTimeStr} น.)` : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Document Title Banner */}
      <div className="text-center my-3 py-1.5 bg-neutral-100 border border-black">
        <h1 className="text-[15px] font-bold tracking-wide uppercase text-black m-0">
          ใบแจ้งเคลมสินค้าและขอรับบริการ (Service Claim Intake Form)
        </h1>
        <div className="text-[10px] text-slate-600 font-medium">
          แบบฟอร์มส่งมอบสินค้ามีปัญหาจากคลังสินค้าและฝ่าย QC ให้ฝ่ายบริการตรวจสอบ
        </div>
      </div>

      {/* 3. Section 1: ข้อมูลแผนกผู้แจ้งเรื่อง & ระดับความเร่งด่วน */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>1. ข้อมูลแผนกผู้แจ้งเรื่อง (Reporter & Urgency Information)</span>
          <span className="text-[10px] font-normal opacity-90">ข้อมูลต้นทาง</span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                แผนกผู้แจ้งเรื่อง
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                {DEPARTMENT_MAP[claim.department] || claim.department || "-"}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                ระดับความเร่งด่วน
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold bg-white">
                      {claim.urgency === "NORMAL" ? "✓" : ""}
                    </span>
                    <span>ปกติ</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold bg-white">
                      {claim.urgency === "URGENT" ? "✓" : ""}
                    </span>
                    <span>ด่วน</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold bg-white">
                      {claim.urgency === "CRITICAL" ? "✓" : ""}
                    </span>
                    <span className="text-red-700 font-bold">ด่วนมาก</span>
                  </span>
                </span>
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                ชื่อผู้แจ้งเคลม
              </td>
              <td className="px-2.5 py-1.5 border border-black">
                {claim.reporterName || "-"}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                เบอร์โทรศัพท์ / ติดต่อ
              </td>
              <td className="px-2.5 py-1.5 border border-black font-mono">
                {claim.reporterPhone || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Section 2: ข้อมูลสินค้าและอุปกรณ์ (Equipment Specifications) */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>2. ข้อมูลสินค้าและหมายเลขเครื่อง (Product & Equipment Details)</span>
          <span className="text-[10px] font-normal opacity-90">ข้อมูลสเปกสินค้า</span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                ประเภทอุปกรณ์
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                {EQUIPMENT_TYPE_MAP[claim.equipmentType] || claim.equipmentType || "-"}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[18%]">
                ยี่ห้อ (Brand)
              </td>
              <td className="px-2.5 py-1.5 border border-black font-bold w-[32%]">
                {claim.brand || "-"}
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                รุ่นสินค้า (Model)
              </td>
              <td className="px-2.5 py-1.5 border border-black font-mono font-bold text-[12px] text-slate-900">
                {claim.model || "-"}
              </td>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                Serial Number (S/N)
              </td>
              <td className="px-2.5 py-1.5 border border-black font-mono font-bold text-red-700">
                {claim.serialNumber || "(ตามรูปถ่ายเนมเพลทข้างเครื่อง)"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Section 3: รายละเอียดอาการเสีย / ปัญหาที่พบ (Symptoms & Defects) */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>3. รายละเอียดอาการเสีย / ปัญหาที่ตรวจพบ (Symptom & Defect Description)</span>
          <span className="text-[10px] font-normal opacity-90">อาการความผิดปกติ</span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="p-3 border border-black min-h-[70px] align-top bg-white">
                <div className="text-[12px] font-medium leading-relaxed whitespace-pre-wrap text-slate-900">
                  {claim.symptoms || "ไม่ได้ระบุอาการเสีย"}
                </div>
              </td>
            </tr>
            <tr className="bg-neutral-50 text-[10px]">
              <td className="px-2.5 py-1 border border-black text-slate-600 flex items-center justify-between">
                <span>
                  <b>หลักฐานคลิปวีดีโอ:</b>{" "}
                  {claim.defectVideoUrl ? (
                    <span className="text-emerald-700 font-bold">
                      ✓ มีคลิปวีดีโออาการเสียแนบในระบบ CRM (ดูผ่านระบบออนไลน์)
                    </span>
                  ) : (
                    <span>ไม่มีคลิปวีดีโอ</span>
                  )}
                </span>
                <span>
                  <b>จำนวนรูปภาพแนบ:</b> {defectPhotos.length + (claim.nameplatePhotoUrl ? 1 : 0)} รูป
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6. Section 4: รูปถ่ายเนมเพลทและหลักฐานความเสียหาย (Photo Evidence) */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>4. รูปถ่ายเนมเพลทข้างเครื่องและหลักฐานความเสียหาย (Attached Photos)</span>
          <span className="text-[10px] font-normal opacity-90">รูปถ่ายประกอบ</span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              {/* Photo 1: Nameplate (Primary) */}
              <td className="p-2 border border-black text-center align-top w-1/2 bg-neutral-50/30">
                <div className="text-[10px] font-bold text-slate-700 mb-1">
                  [1] รูปถ่ายเนมเพลทข้างตัวเครื่อง (S/N Nameplate)
                </div>
                {claim.nameplatePhotoUrl ? (
                  <div className="h-44 flex items-center justify-center border border-slate-300 bg-white rounded p-1">
                    <img
                      src={claim.nameplatePhotoUrl}
                      alt="Nameplate"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs">
                    ไม่มีรูปถ่ายเนมเพลท
                  </div>
                )}
              </td>

              {/* Photo 2: Defect Photo 1 or Blank */}
              <td className="p-2 border border-black text-center align-top w-1/2 bg-neutral-50/30">
                <div className="text-[10px] font-bold text-slate-700 mb-1">
                  [2] รูปถ่ายจุดชำรุด / สภาพความเสียหาย (Defect Photo)
                </div>
                {defectPhotos.length > 0 ? (
                  <div className="h-44 flex items-center justify-center border border-slate-300 bg-white rounded p-1">
                    <img
                      src={defectPhotos[0]}
                      alt="Defect 1"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs">
                    ไม่มีรูปภาพจุดชำรุดเพิ่มเติม
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 7. Section 5: ส่วนของฝ่ายบริการ / ช่างตรวจเช็ค (Service Department Assessment) */}
      <div className="mb-3">
        <div className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-0.5 uppercase tracking-wide flex items-center justify-between">
          <span>5. ส่วนของฝ่ายบริการตรวจรับสินค้า (For Service Department Only)</span>
          <span className="text-[10px] font-normal opacity-90">ผลการตรวจเช็คเบื้องต้น</span>
        </div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black w-[20%]">
                สถานะการดำเนินการ
              </td>
              <td className="px-2.5 py-1.5 border border-black w-[80%] font-bold">
                <div className="flex items-center justify-between">
                  <span>{STATUS_MAP[claim.status] || claim.status || "-"}</span>
                  {claim.serviceHandledBy && (
                    <span className="text-[10.5px] font-normal text-slate-600">
                      ผู้รับเรื่อง / ตรวจสอบ: <b className="text-slate-900">{claim.serviceHandledBy}</b>
                      {handledDateStr ? ` (${handledDateStr})` : ""}
                    </span>
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black align-top">
                บันทึกฝ่ายบริการ
                <br />
                <span className="text-[9.5px] font-normal text-slate-500">(Service Notes)</span>
              </td>
              <td className="p-2 border border-black align-top min-h-[45px] leading-relaxed">
                {claim.serviceNotes ? (
                  <div className="whitespace-pre-wrap">{claim.serviceNotes}</div>
                ) : (
                  <div className="text-slate-400 italic">
                    (ยังไม่มีบันทึกเพิ่มเติมจากฝ่ายบริการ หรืออยู่ระหว่างการตรวจเช็ค)
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td className="bg-neutral-100 font-bold px-2.5 py-1.5 border border-black">
                การดำเนินการถัดไป
              </td>
              <td className="px-2.5 py-1.5 border border-black">
                <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3">
                      {claim.status === "CONVERTED_CR" ? "✓" : ""}
                    </span>
                    <span>เปิดใบตรวจเช็ค CR</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3">
                      {claim.status === "CONVERTED_RO" ? "✓" : ""}
                    </span>
                    <span>เปิดใบรับซ่อม RO</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-black inline-block text-center text-[10px] font-bold leading-3">
                      {claim.status === "REJECTED" ? "✓" : ""}
                    </span>
                    <span>ปฏิเสธการเคลม (Reject)</span>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 8. Section 6: ส่วนลงนามผู้เกี่ยวข้อง (Signatures) */}
      <div className="mt-4">
        <table className="w-full border-collapse border border-black text-[11px] text-center">
          <thead>
            <tr className="bg-neutral-100 font-bold">
              <th className="border border-black py-1.5 w-1/3">ผู้แจ้งเรื่อง / ส่งมอบสินค้า</th>
              <th className="border border-black py-1.5 w-1/3">ช่างบริการผู้รับเรื่อง / ตรวจสอบ</th>
              <th className="border border-black py-1.5 w-1/3">ผู้อนุมัติ / หัวหน้าฝ่ายบริการ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Reporter */}
              <td className="border border-black p-3 align-bottom h-24">
                <div className="text-slate-400 mb-1">ลงชื่อ ....................................................</div>
                <div className="font-bold text-slate-800">
                  ( {claim.reporterName || "...................................................."} )
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {claimDateStr && claimDateStr !== "-"
                    ? `วันที่ ${claimDateStr}`
                    : "วันที่ .......... / .......... / ................"}
                </div>
              </td>

              {/* Service Receiver */}
              <td className="border border-black p-3 align-bottom h-24">
                <div className="text-slate-400 mb-1">ลงชื่อ ....................................................</div>
                <div className="font-bold text-slate-800">
                  ( {claim.serviceHandledBy || "...................................................."} )
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {handledDateStr
                    ? `วันที่ ${handledDateStr}`
                    : "วันที่ .......... / .......... / ................"}
                </div>
              </td>

              {/* Service Manager */}
              <td className="border border-black p-3 align-bottom h-24">
                <div className="text-slate-400 mb-1">ลงชื่อ ....................................................</div>
                <div className="font-bold text-slate-800">
                  ( .................................................... )
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  วันที่ .......... / .......... / ................
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Info & CRM watermark */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-200">
        <div>
          เอกสารทางการ: ระบบบริหารจัดการงานบริการและรับแจ้งเคลมสินค้า (Tera Group Sales CRM)
        </div>
        <div>พิมพ์เมื่อ: {new Date().toLocaleString("th-TH")}</div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .claim-print-paper {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
