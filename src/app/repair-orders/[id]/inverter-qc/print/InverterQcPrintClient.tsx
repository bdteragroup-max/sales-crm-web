"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Layers, FileCheck } from "lucide-react";
import OfficialQcPaper from "@/app/repair-orders/components/OfficialQcPaper";
import { buildMultiItemQcData } from "@/app/repair-orders/lib/qcHelpers";

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

  const { targetItems, common, itemsQc } = buildMultiItemQcData(order);
  const totalPages = targetItems.length;

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

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 shadow-2xs">
            <Layers size={14} className="text-[#ff2301]" />
            <span>
              เอกสาร QC: <b>{totalPages} รายการ</b> ({totalPages} หน้า A4)
            </span>
          </span>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#ff2301] hover:bg-[#e01f01] rounded-xl shadow-sm transition cursor-pointer"
          >
            <Printer size={14} />
            <span>พิมพ์เอกสาร A4 {totalPages > 1 ? `(ทั้งหมด ${totalPages} หน้า)` : ""}</span>
          </button>
        </div>
      </div>

      {/* ── Official A4 Document Pages ── */}
      <div className="w-full flex flex-col items-center space-y-8 print:space-y-0">
        {targetItems.map((target, idx) => (
          <div key={target.id || idx} className="w-full flex flex-col items-center">
            {/* Screen Page Header (Hidden when printing) */}
            <div className="w-full max-w-[794px] mb-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-xs flex items-center justify-between text-xs font-bold text-gray-700 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#ff2301] text-white flex items-center justify-center text-[11px] font-black">
                  {idx + 1}
                </span>
                <span>
                  หน้า {idx + 1} / {totalPages}: {target.displayTitle}
                </span>
              </div>
              <div className="text-gray-500 font-mono text-[11px]">
                S/N: {itemsQc[idx]?.serialNumber || target.serial || "—"}
              </div>
            </div>

            {/* A4 Paper Sheet Wrapper */}
            <div className="qc-print-wrapper w-full flex justify-center">
              <OfficialQcPaper
                id={`official-qc-paper-${idx}`}
                item={target}
                qcItem={itemsQc[idx]}
                common={common}
                pageIndex={idx}
                totalPages={totalPages}
                className="shadow-lg print:shadow-none"
              />
            </div>
          </div>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
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
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .qc-print-wrapper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .official-qc-paper {
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
      `,
        }}
      />
    </div>
  );
}
