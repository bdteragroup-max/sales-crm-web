"use client";

import React from "react";
import Link from "next/link";
import {
  Receipt,
  Package,
  BarChart3,
  RotateCcw,
  Loader2,
  Download,
} from "lucide-react";

interface PayablesHeaderProps {
  isSyncing: boolean;
  onSyncPOs: () => void;
  onExportExcel: () => void;
}

export default function PayablesHeader({
  isSyncing,
  onSyncPOs,
  onExportExcel,
}: PayablesHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Breadcrumbs & Page Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Link
              href="/accounting"
              className="hover:text-red-600 transition-colors flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>การเงินและบัญชี</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold flex items-center gap-1.5">
              <span>เจ้าหนี้การค้า & ค่าสั่งซื้อ</span>
              <span className="text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                AP
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3.5 pt-0.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>รายการตั้งเบิกและจ่ายเงินเจ้าหนี้</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 hidden sm:inline-block">
                  (Accounts Payable)
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ดึงข้อมูลอัตโนมัติจากใบสั่งซื้อ (PO) • ตรวจรับ 3-Way Match • หัก ณ ที่จ่าย 3%/1% • หนังสือ 50 ทวิ
              </p>
            </div>
          </div>
        </div>

        {/* Right: Symmetrical Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* Navigation Links */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            <Link
              href="/accounting"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white hover:shadow-xs transition-all"
              title="ไปหน้ารายการลูกหนี้การค้า"
            >
              <Receipt className="w-4 h-4 text-slate-500" />
              <span>ลูกหนี้การค้า (AR)</span>
            </Link>

            <Link
              href="/accounting/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white hover:shadow-xs transition-all"
              title="ภาพรวมแดชบอร์ดการเงิน"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>แดชบอร์ดการเงิน</span>
            </Link>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-0.5" />

          {/* Sync All POs Button */}
          <button
            type="button"
            onClick={onSyncPOs}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            title="ซิงค์และคำนวณตารางชำระเงินจาก PO ทั้งหมด"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            ) : (
              <RotateCcw className="w-4 h-4 text-red-400" />
            )}
            <span>{isSyncing ? "กำลังซิงค์ PO..." : "ซิงค์ PO ทั้งหมด"}</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-red-600/20 transition-all cursor-pointer active:scale-95"
            title="ดาวน์โหลดรายงานเป็นไฟล์ Excel"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
