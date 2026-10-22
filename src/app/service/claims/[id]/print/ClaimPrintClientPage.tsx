"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import ClaimPrintPaper from "../../components/ClaimPrintPaper";

export default function ClaimPrintClientPage({ claim }: { claim: any }) {
  // Optional: Auto open print dialog if ?auto=true or on load if needed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auto") === "1" || urlParams.get("auto") === "true") {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col font-sans print:bg-white print:min-h-0">
      {/* Print Page Toolbar (Screen Only) */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md print:hidden px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/service/claims/${claim.id}`}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้ารายละเอียด</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">
                  {claim.claimNumber}
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-200 font-semibold">{claim.model}</span>
              </div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                <FileText className="w-4 h-4 text-red-500" />
                <span>ตัวอย่างเอกสารใบแจ้งเคลมสินค้า (Official Print Preview)</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสารนี้ (Print)</span>
            </button>
          </div>
        </div>
      </header>

      {/* A4 Paper Container */}
      <main className="flex-1 py-8 px-4 print:p-0 flex justify-center items-start">
        <div className="w-full max-w-[794px] bg-white shadow-2xl rounded-sm border border-slate-300 print:shadow-none print:border-none print:rounded-none">
          <ClaimPrintPaper claim={claim} />
        </div>
      </main>
    </div>
  );
}
