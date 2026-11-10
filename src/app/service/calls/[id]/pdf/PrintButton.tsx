"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function PrintButton({ backHref }: { backHref?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl shadow-sm font-bold text-xs tracking-wide transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
          <span>กลับหน้ารายละเอียดเคส</span>
        </Link>
      )}
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#ff2301] text-white rounded-xl shadow-lg hover:bg-[#d61e00] font-bold text-xs sm:text-sm tracking-wide transition-all"
      >
        <Printer className="w-4 h-4" />
        <span>พิมพ์ใบรายงานการบริการ (PDF)</span>
      </button>
    </div>
  );
}

