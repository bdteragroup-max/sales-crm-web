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
    { key: "inside", label: isEn ? "Internal View" : "ด้านใน", url: photos.inside?.[0] || photos.damage?.[0] },
    { key: "terminal", label: isEn ? (isCabinet ? "Terminal Screws" : "Terminal Block") : (isCabinet ? "น็อตเทอร์มินอล" : "บล็อคเทอร์มินอล"), url: photos.terminal?.[0] },
    { key: "nameplate", label: isEn ? "Nameplate" : "เนมเพลท", url: photos.nameplate?.[0] },
  ];

  // Collect additional photos (multi-photos > 1, damage photos, other photos)
  const additionalPhotos: { url: string; label: string }[] = [];

  // 1. Damage photos if not used as primary inside photo
  if (Array.isArray(photos.damage) && photos.damage.length > 0) {
    photos.damage.forEach((url: string, idx: number) => {
      if (url && (url !== photos.inside?.[0])) {
        additionalPhotos.push({
          url,
          label: isEn ? `Damage / Fault #${idx + 1}` : `จุดชำรุดเสียหาย #${idx + 1}`,
        });
      }
    });
  }

  // 2. Extra photos (> 1) from standard slots
  const slotLabels: Record<string, { th: string; en: string }> = {
    front: { th: "ด้านหน้า", en: "Front View" },
    left: { th: "ด้านซ้าย", en: "Left Side View" },
    right: { th: "ด้านขวา", en: "Right Side View" },
    top: { th: "ด้านบน", en: "Top View" },
    fan: { th: "พัดลม", en: "Cooling Fan" },
    inside: { th: "ด้านใน", en: "Internal View" },
    terminal: { th: isCabinet ? "น็อตเทอร์มินอล" : "บล็อคเทอร์มินอล", en: isCabinet ? "Terminal Screws" : "Terminal Block" },
    nameplate: { th: "เนมเพลท", en: "Nameplate" },
  };

  Object.entries(slotLabels).forEach(([key, lbl]) => {
    const list = photos[key];
    if (Array.isArray(list) && list.length > 1) {
      list.slice(1).forEach((url: string, idx: number) => {
        if (url) {
          additionalPhotos.push({
            url,
            label: isEn ? `${lbl.en} #${idx + 2}` : `${lbl.th} #${idx + 2}`,
          });
        }
      });
    }
  });

  // 3. Other photos
  if (Array.isArray(photos.other) && photos.other.length > 0) {
    photos.other.forEach((url: string, idx: number) => {
      if (url) {
        additionalPhotos.push({
          url,
          label: isEn ? `Additional Photo #${idx + 1}` : `รูปภาพเพิ่มเติม #${idx + 1}`,
        });
      }
    });
  }

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
      className={`photos-paper w-full max-w-[1020px] text-black text-[12px] leading-snug font-['Sarabun',sans-serif] mx-auto print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      {/* SHEET 1: 8 PRODUCT PHOTOS */}
      <div className="photos-sheet-1 print-page-sheet bg-white border-2 border-black p-6 flex flex-col justify-between box-border min-h-[960px] shadow-sm print:border-none print:p-0 print:shadow-none print:min-h-0 print:h-auto print:block">
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
        <div className="font-bold text-[12px] bg-[#d9e1f2] border border-black text-center py-1 mb-3 print:mb-2">
          {isEn ? "PRODUCT PHOTOS (8 SIDES)" : "รูปสินค้า (8 ด้าน)"}
        </div>

        {/* 4-Column x 2-Row 8-photo grid in Landscape */}
        <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2">
          {photoSlots.map((slot) => (
            <div key={slot.key} className="flex flex-col items-center print:break-inside-avoid">
              <div
                className="product-photo-frame w-full border border-black bg-white flex items-center justify-center p-1 overflow-hidden"
                style={{ height: "120px", maxHeight: "120px" }}
              >
                {slot.url ? (
                  <img
                    src={slot.url}
                    alt={slot.label}
                    className="max-h-full max-w-full object-contain"
                    style={{ maxHeight: "114px", maxWidth: "100%", width: "auto", height: "auto" }}
                  />
                ) : (
                  <span className="text-[9.5px] text-gray-400 font-mono text-center p-1">
                    {isEn ? "(No photo)" : "(ไม่มีรูปภาพ)"}
                  </span>
                )}
              </div>
              {/* Boxed label matching template */}
              <div className="border border-black text-center py-0.5 px-2 font-bold text-[10px] print:text-[9px] bg-white mt-1 w-full truncate">
                {slot.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer for Sheet 1 of Photos */}
        <div className="border-t border-gray-300 pt-1 text-[9px] print:text-[8px] text-gray-500 flex justify-between items-center mt-3">
          <span>{companyTitle} — Service & Quality Control</span>
          <span>
            {isEn
              ? "Product 8-Side Photos"
              : "เอกสารรูปถ่ายสินค้า 8 ด้าน"}
          </span>
        </div>
      </div>
    </div>
    {/* End of Sheet 1 */}

      {/* Attached Additional Photos (Sheet 2) */}
      {additionalPhotos.length > 0 && (
        <div className="photos-sheet-2 print-page-sheet bg-white border-2 border-black p-6 flex flex-col justify-between box-border min-h-[960px] shadow-sm mt-8 pt-6 print:border-none print:p-0 print:shadow-none print:min-h-0 print:h-auto print:mt-0 print:pt-0 print:block">
          <div>
            {/* Header Row for Additional Photos Page */}
            <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-20 flex items-center justify-start shrink-0">
                  <img
                    src={logoSrc}
                    alt={compCode}
                    className="max-h-8 max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-bold text-[12px]">{companyTitle}</div>
                  <div className="text-[9.5px] text-gray-600">
                    {isEn
                      ? "Inverter & Drive System Division — Additional & Fault Photos"
                      : "ฝ่ายบริการและตรวจเช็คอินเวอร์เตอร์ — รูปภาพแนบเพิ่มเติม"}
                  </div>
                </div>
              </div>
              <div className="text-right text-[10px]">
                <div className="font-mono font-bold text-[11px] text-black">
                  CR: {report?.crNumber || "-"}
                </div>
              </div>
            </div>

            <div className="font-bold text-[12px] bg-[#d9e1f2] border border-black text-center py-1 mb-3 print:mb-2">
              {isEn ? "ATTACHED & ADDITIONAL PHOTOS" : "รูปภาพแนบเพิ่มเติม"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2">
              {additionalPhotos.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center print:break-inside-avoid">
                  <div
                    className="product-photo-frame w-full border border-black bg-white flex items-center justify-center p-1 overflow-hidden"
                    style={{ height: "120px", maxHeight: "120px" }}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="max-h-full max-w-full object-contain"
                      style={{ maxHeight: "114px", maxWidth: "100%", width: "auto", height: "auto" }}
                    />
                  </div>
                  <div className="border border-black text-center py-0.5 px-2 font-bold text-[10px] print:text-[9px] bg-white mt-1 w-full truncate">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer for Additional Photos Page */}
            <div className="border-t border-gray-300 pt-1 text-[9px] print:text-[8px] text-gray-500 flex justify-between items-center mt-3">
              <span>{companyTitle} — Service & Quality Control</span>
              <span>
                {isEn
                  ? "Attached Additional Photos"
                  : "เอกสารรูปภาพแนบเพิ่มเติม"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scoped Print Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .photos-paper {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-sizing: border-box !important;
            display: block !important;
          }
          .photos-sheet-1,
          .photos-sheet-2 {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            display: block !important;
          }
          .product-photo-frame {
            height: 115px !important;
            max-height: 115px !important;
            overflow: hidden !important;
          }
          .product-photo-frame img {
            max-height: 108px !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
