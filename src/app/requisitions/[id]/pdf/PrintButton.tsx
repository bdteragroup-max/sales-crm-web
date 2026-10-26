"use client"

import React from "react"
import { Printer } from "lucide-react"

export default function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-lg hover:shadow-red-600/30 font-bold text-xs sm:text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${className}`}
    >
      <Printer size={16} />
      <span>พิมพ์ใบเบิก/ยืมวัสดุ (Print PDF)</span>
    </button>
  )
}
