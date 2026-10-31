"use client";

import React from "react";
import { Printer } from "lucide-react";

export default function PrintDocButton({ label = "พิมพ์เอกสาร / บันทึก PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff2301] text-white text-sm font-bold shadow-md hover:bg-red-600 active:scale-95 transition-all"
    >
      <Printer className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

