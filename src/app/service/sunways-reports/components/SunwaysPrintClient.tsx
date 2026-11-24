"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Globe, Languages, Loader2, Printer } from "lucide-react";
import Swal from "sweetalert2";
import { translateSavedSunwaysReport } from "@/app/actions/sunwaysReports";
import type {
  SunwaysPrintLang,
  SunwaysReportRecord,
  SunwaysTextBundle,
} from "@/app/lib/sunwaysReportConfig";
import SunwaysReportPaper from "./SunwaysReportPaper";

interface SunwaysPrintClientProps {
  report: SunwaysReportRecord;
  initialLang?: SunwaysPrintLang;
}

export default function SunwaysPrintClient({
  report,
  initialLang = "EN",
}: SunwaysPrintClientProps) {
  const [printLang, setPrintLang] = useState<SunwaysPrintLang>(initialLang);
  const [translating, setTranslating] = useState(false);
  const [thBundle, setThBundle] = useState<SunwaysTextBundle | null>(
    report?.bilingualData?.th || null
  );
  const [enBundle, setEnBundle] = useState<SunwaysTextBundle | null>(
    report?.bilingualData?.en || null
  );

  const handleAutoTranslate = async (target: "EN" | "TH") => {
    setTranslating(true);
    try {
      const res = await translateSavedSunwaysReport(report.id, target, true);
      if (!res.success || !res.bundle) {
        Swal.fire("แปลไม่สำเร็จ", res.error || "กรุณาลองใหม่", "error");
        return;
      }
      if (target === "EN") {
        setEnBundle(res.bundle);
        setPrintLang("EN");
      } else {
        setThBundle(res.bundle);
        setPrintLang("TH");
      }
      Swal.fire({
        icon: "success",
        title: target === "EN" ? "แปลเป็นภาษาอังกฤษแล้ว" : "แปลเป็นภาษาไทยแล้ว",
        timer: 1300,
        showConfirmButton: false,
      });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/80 print:bg-white py-6 print:py-0 px-4 print:px-0">
      {/* Control Toolbar - Hidden on print */}
      <div className="max-w-[210mm] mx-auto mb-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5">
          <Link
            href="/service/sunways-reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้ารายการ
          </Link>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {report?.reportNumber || "Sunways Report"}
            </div>
            <div className="text-[11px] text-slate-500">
              {report?.companyName || report?.plantName || "Inverter Check Points"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language View Switch */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setPrintLang("EN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                printLang === "EN"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              English (PDF เดิม)
            </button>
            <button
              type="button"
              onClick={() => setPrintLang("TH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                printLang === "TH"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              ภาษาไทย
            </button>
            <button
              type="button"
              onClick={() => setPrintLang("BILINGUAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                printLang === "BILINGUAL"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2 ภาษา (EN / TH)
            </button>
          </div>

          <button
            type="button"
            disabled={translating}
            onClick={() => handleAutoTranslate(printLang === "TH" ? "TH" : "EN")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold disabled:opacity-60"
            title="แปลข้อความที่กรอกไว้จากอีกภาษาและบันทึกลงรายงาน"
          >
            {translating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Languages className="w-3.5 h-3.5" />
            )}
            {printLang === "TH" ? "แปลเป็นไทย" : "แปลเป็นอังกฤษ"}
          </button>

          <Link
            href={`/service/sunways-reports/${report.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            <Edit3 className="w-3.5 h-3.5" />
            แก้ไข
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ / บันทึก PDF (4 หน้า)
          </button>
        </div>
      </div>

      {/* 4-Page A4 Sunways Paper */}
      <SunwaysReportPaper
        report={report}
        printLang={printLang}
        overrideTh={thBundle}
        overrideEn={enBundle}
      />
    </div>
  );
}
