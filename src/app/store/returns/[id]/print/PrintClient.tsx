/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Pencil, SplitSquareVertical, Layers } from "lucide-react";
import GoodsReturnPrintPaper from "../../components/GoodsReturnPrintPaper";

interface Props {
  data: any;
  backHref?: string;
  editHref?: string;
}

export default function GoodsReturnPrintClient({
  data,
  backHref = "/store/returns",
  editHref,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"half" | "full">("half");

  const resolvedEditHref = editHref || `/store/returns/${data?.id}/edit`;

  return (
    <div className="min-h-screen bg-[#525659] print:bg-white text-black relative">
      {/* Floating Toolbar (Hidden on Print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-gray-200">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push(backHref);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ย้อนกลับ</span>
        </button>

        {/* Layout toggle */}
        <div className="flex items-center gap-1 border-x border-gray-200 px-2">
          <button
            onClick={() => setMode("half")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mode === "half"
                ? "bg-red-50 text-[#ff2301] border border-red-200"
                : "text-gray-500 hover:text-gray-800"
            }`}
            title="พิมพ์ 2 ส่วนใน 1 หน้า A4 (ส่วนของลูกค้า & ส่วนของบริษัท)"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>2 ส่วนใน 1 หน้า (ตามรูป)</span>
          </button>
          <button
            onClick={() => setMode("full")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mode === "full"
                ? "bg-red-50 text-[#ff2301] border border-red-200"
                : "text-gray-500 hover:text-gray-800"
            }`}
            title="พิมพ์ 2 หน้าเต็ม A4 (ลูกค้า 1 หน้า, บริษัท 1 หน้า)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2 หน้าเต็ม</span>
          </button>
        </div>

        <Link
          href={resolvedEditHref}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-700 text-xs font-bold transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>แก้ไข</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all active:scale-95"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>สั่งพิมพ์ (Print)</span>
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="pt-16 pb-12 print:p-0">
        <GoodsReturnPrintPaper data={data} mode={mode} />
      </div>
    </div>
  );
}

