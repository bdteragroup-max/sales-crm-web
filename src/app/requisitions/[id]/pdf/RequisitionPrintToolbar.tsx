"use client"

import React from "react"
import Link from "next/link"
import { Printer, ArrowLeft, FileText } from "lucide-react"

interface RequisitionPrintToolbarProps {
  requisitionId: string
  requisitionNumber: string
  statusText: string
  statusColorClass: string
  orientation: "portrait" | "landscape"
  onOrientationChange: (orientation: "portrait" | "landscape") => void
  isBorrow?: boolean
}

export default function RequisitionPrintToolbar({
  requisitionId,
  requisitionNumber,
  statusText,
  statusColorClass,
  orientation,
  onOrientationChange,
  isBorrow = false,
}: RequisitionPrintToolbarProps) {
  return (
    <div className="print:hidden w-full bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back Link & Document Number */}
        <div className="flex items-center gap-3">
          <Link
            href={`/requisitions/${requisitionId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700/60 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>กลับหน้ารายละเอียด</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-700/70 text-xs">
            <span className="text-slate-400">
              {isBorrow ? "ใบยืม:" : "ใบเบิก:"}
            </span>
            <span className="font-mono font-bold text-red-400 text-sm">{requisitionNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusColorClass}`}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Center: Orientation Switcher */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => onOrientationChange("portrait")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orientation === "portrait"
                ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <FileText size={13} />
            <span>แนวตั้ง (Portrait)</span>
          </button>
          <button
            type="button"
            onClick={() => onOrientationChange("landscape")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orientation === "landscape"
                ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <FileText size={13} className="rotate-90" />
            <span>แนวนอน (Landscape)</span>
          </button>
        </div>

        {/* Right: Print Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-900/30 hover:shadow-red-700/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Printer size={15} />
            <span>{isBorrow ? "พิมพ์ใบยืมอุปกรณ์ (Print PDF)" : "พิมพ์ใบเบิกพัสดุ (Print PDF)"}</span>
          </button>
        </div>
      </div>

      {/* Helpful Hint Bar */}
      <div className="bg-slate-950/80 px-4 py-1 border-t border-slate-800 text-[11px] text-slate-400 text-center">
        💡 แนะนำการพิมพ์: เลือกกระดาษ <strong>{orientation === "portrait" ? "A4 แนวตั้ง (Portrait)" : "A4 แนวนอน (Landscape)"}</strong> • เปิดตัวเลือก <strong>&quot;กราฟิกพื้นหลัง (Background graphics)&quot;</strong> ในกล่องพิมพ์
      </div>
    </div>
  )
}
