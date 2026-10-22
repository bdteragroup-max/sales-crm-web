"use client";

import React from "react";

interface PhotosPaperProps {
  report: any;
  lang?: "TH" | "EN";
  className?: string;
}

export default function PhotosPaper({ report, lang = "TH", className = "" }: PhotosPaperProps) {
  const isEn = lang === "EN";
  const photos = report?.photos || {};
  const eqType = report?.equipmentType || "INVERTER";
  const isCabinet = eqType === "CONTROL_CABINET";
  const photoSlots = [
    { key: "front", label: isEn ? "Front View" : "ด้านหน้า", url: photos.front?.[0] },
    { key: "left", label: isEn ? "Left Side View" : "ด้านซ้าย", url: photos.left?.[0] || photos.side?.[0] },
    { key: "right", label: isEn ? "Right Side View" : "ด้านขวา", url: photos.right?.[0] },
    { key: "top", label: isEn ? "Top View" : "ด้านบน", url: photos.top?.[0] },
    { key: "fan", label: isEn ? "Cooling Fan" : "พัดลม", url: photos.fan?.[0] },
    { key: "inside", label: isEn ? "Internal View / Damage" : "ด้านใน", url: photos.inside?.[0] || photos.damage?.[0] },
    { key: "terminal", label: isEn ? (isCabinet ? "Terminal Screws" : "Terminal Block") : (isCabinet ? "น็อตเทอร์มินอล" : "บล็อคเทอร์มินอล"), url: photos.terminal?.[0] },
    { key: "nameplate", label: isEn ? "Nameplate" : "เนมเพลท", url: photos.nameplate?.[0] },
  ];

  const compCode = (report?.companyCode || "TG").toUpperCase();
  const logoSrc =
    compCode === "TE"
      ? "/6.png"
      : compCode === "TP"
      ? "/7.png"
      : "/4.png";

  const companyTitle = isEn
    ? compCode === "TP"
      ? "TERA POWER CO., LTD."
      : compCode === "TE"
      ? "TERA ELECTRIC CO., LTD."
      : "TERA GROUP CO., LTD."
    : compCode === "TP"
      ? "บริษัท เทอรา พาวเวอร์ จำกัด"
      : compCode === "TE"
      ? "บริษัท เทอรา อิเล็คทริค จำกัด"
      : "บริษัท เทอรา กรุ๊ป จำกัด";

  return (
    <div
      className={`photos-paper bg-white border-2 border-black w-full max-w-[1020px] p-6 text-black text-[12px] leading-snug font-['Sarabun',sans-serif] flex flex-col justify-between box-border mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div>
        {/* Header Row: Company Title & Document Number (Identical across all forms) */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 flex items-center justify-start shrink-0">
              <img
                src={logoSrc}
                alt={compCode}
                className="max-h-10 max-w-full object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-[13px]">{companyTitle}</div>
              <div className="text-[10px] text-gray-600">
                {isEn
                  ? "Inverter & Drive System Division — Product & Fault Photos"
                  : "ฝ่ายบริการและตรวจเช็คอินเวอร์เตอร์ — รูปถ่ายสินค้าและความเสียหาย (Fault Photos)"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-[12px] text-black">
              CR: {report?.crNumber || "-"}
            </div>
            {report?.convertedJobNumber && (
              <div className="text-[10px] font-bold text-gray-700 font-mono">
                Ref RO: {report.convertedJobNumber}
              </div>
            )}
          </div>
        </div>

        {/* Section Header matching Image 2 */}
        <div className="font-bold text-[13px] bg-[#d9e1f2] border border-black text-center py-1 mb-4">
          {isEn ? "PRODUCT PHOTOS" : "รูปสินค้า"}
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
                      <span className="text-[10px] text-gray-400 font-mono">
                        {isEn ? "(No photo available)" : "(ไม่มีรูปภาพ)"}
                      </span>
                    )}
                  </div>
                  {/* Boxed label matching template */}
                  <div className="border border-black text-center py-0.5 px-6 font-bold text-[11px] bg-white mt-1.5 min-w-[130px] max-w-[220px]">
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
