"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText, Globe, Wrench } from "lucide-react";
import CrInspectionPaper from "../../components/CrInspectionPaper";
import FaultReportPaper from "../../components/FaultReportPaper";
import { EQUIPMENT_TYPE_CONFIG } from "../../lib/crConstants";

interface PrintClientPageProps {
  report: any;
}

export default function PrintClientPage({ report }: PrintClientPageProps) {
  const [activeTab, setActiveTab] = useState<"cr" | "fault_th" | "fault_en">("cr");
  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;

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

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 flex flex-col items-center print:p-0 print:bg-white text-black font-['Sarabun',sans-serif]">
      {/* Screen Navigation Bar (Hidden when printing) */}
      <div className="w-full max-w-[794px] mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/service/check-reports"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-2xs transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>กลับหน้ารายการ CR</span>
        </Link>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("cr")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "cr"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <FileText size={13} />
            <span>ใบตรวจเช็ค {eqConfig.shortLabel} (CR)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fault_th")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "fault_th"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <Wrench size={13} />
            <span>Fault Report (TH)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fault_en")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "fault_en"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-gray-600 hover:text-black"
            }`}
          >
            <Globe size={13} />
            <span>Fault Report (EN)</span>
          </button>
        </div>

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] rounded-xl shadow-md shadow-red-500/25 transition cursor-pointer active:scale-95"
        >
          <Printer size={15} />
          <span>พิมพ์เอกสารนี้</span>
        </button>
      </div>

      {/* Printable Sheet View */}
      <div className="w-full flex justify-center">
        {activeTab === "cr" && <CrInspectionPaper report={report} />}
        {activeTab === "fault_th" && <FaultReportPaper report={report} lang="TH" />}
        {activeTab === "fault_en" && <FaultReportPaper report={report} lang="EN" />}
      </div>
    </div>
  );
}
