"use client";

import React from "react";

interface PhotosPaperProps {
  report: any;
  className?: string;
}

export default function PhotosPaper({ report, className = "" }: PhotosPaperProps) {
  const photos = report?.photos || {};
  const eqType = report?.equipmentType || "INVERTER";
  const isCabinet = eqType === "CONTROL_CABINET";
  const photoSlots = [
    { key: "front", label: "ด้านหน้า", url: photos.front?.[0] },
    { key: "left", label: "ด้านซ้าย", url: photos.left?.[0] || photos.side?.[0] },
    { key: "right", label: "ด้านขวา", url: photos.right?.[0] },
    { key: "top", label: "ด้านบน", url: photos.top?.[0] },
    { key: "fan", label: "พัดลม", url: photos.fan?.[0] },
    { key: "inside", label: "ด้านใน", url: photos.inside?.[0] || photos.damage?.[0] },
    { key: "terminal", label: isCabinet ? "น็อตเทอร์มินอล" : "บล็อคเทอร์มินอล", url: photos.terminal?.[0] },
    { key: "nameplate", label: "เนมเพลท", url: photos.nameplate?.[0] },
  ];

  const compCode = (report?.companyCode || "TG").toUpperCase();
  const logoSrc =
    compCode === "TE"
      ? "/6.png"
      : compCode === "TP"
      ? "/7.png"
      : "/4.png";

  const companyTitle =
    compCode === "TP"
      ? "บริษัท เทอรา พาวเวอร์ จำกัด"
      : compCode === "TE"
      ? "บริษัท เทอรา อิเล็คทริค แอนด์ เอ็นเนอร์ยี่ จำกัด"
      : "บริษัท เทอรา กรุ๊ป จำกัด";

  return (
    <div
      className={`photos-paper bg-white border-2 border-black w-full max-w-[794px] p-6 text-black text-[12px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
          <div className="flex items-center gap-2.5">
            <img src={logoSrc} alt={compCode} className="h-8 max-w-[100px] object-contain" />
            <div>
              <div className="font-bold text-[13px]">{companyTitle}</div>
              <div className="text-[10px] text-gray-500">รูปถ่ายสินค้าและความเสียหาย (Fault Photos)</div>
            </div>
          </div>
          <div className="font-mono text-[11px] font-bold text-red-600">
            CR: {report?.crNumber || "-"}
            {report?.serialNumber && ` (S/N: ${report.serialNumber})`}
          </div>
        </div>

        {/* Section Header matching Image 2 */}
        <div className="font-bold text-[13px] bg-[#d9e1f2] border border-black text-center py-1 mb-4">
          รูปสินค้า
        </div>

        {/* 2-Column 8-photo grid matching Image 2 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            [photoSlots[0], photoSlots[1]], // ด้านหน้า | ด้านซ้าย
            [photoSlots[2], photoSlots[3]], // ด้านขวา | ด้านบน
            [photoSlots[4], photoSlots[5]], // พัดลม | ด้านใน
            [photoSlots[6], photoSlots[7]], // บล็อคเทอร์มินอล | เนมเพลท
          ].map((row, rIdx) => (
            <React.Fragment key={rIdx}>
              {row.map((slot) => (
                <div key={slot.key} className="flex flex-col items-center">
                  <div className="w-full h-48 sm:h-52 border border-black bg-white flex items-center justify-center p-1.5 overflow-hidden">
                    {slot.url ? (
                      <img
                        src={slot.url}
                        alt={slot.label}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-mono">(ไม่มีรูปภาพ)</span>
                    )}
                  </div>
                  {/* Boxed label matching template */}
                  <div className="border border-black text-center py-0.5 px-6 font-bold text-[11px] bg-white mt-1.5 min-w-[130px] max-w-[200px]">
                    {slot.label}
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
