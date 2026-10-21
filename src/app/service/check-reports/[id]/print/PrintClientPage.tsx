"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  FileText,
  Globe,
  Wrench,
  Image as ImageIcon,
  CheckSquare,
  Droplets,
  Zap,
} from "lucide-react";
import CrInspectionPaper from "../../components/CrInspectionPaper";
import CheckListRepairPaper from "../../components/CheckListRepairPaper";
import PumpFaultReportPaper from "../../components/PumpFaultReportPaper";
import MotorFaultReportPaper from "../../components/MotorFaultReportPaper";
import InverterFaultReportPaper from "../../components/InverterFaultReportPaper";
import FaultReportPaper from "../../components/FaultReportPaper";
import PhotosPaper from "../../components/PhotosPaper";
import { EQUIPMENT_TYPE_CONFIG } from "../../lib/crConstants";

interface PrintClientPageProps {
  report: any;
  initialTab?: string;
}

export type PrintTabKey =
  | "pump_th"
  | "pump_en"
  | "motor_th"
  | "motor_en"
  | "inverter_th"
  | "inverter_en"
  | "check_list"
  | "cr"
  | "fault_th"
  | "fault_en"
  | "photos";

export default function PrintClientPage({ report, initialTab }: PrintClientPageProps) {
  const searchParams = useSearchParams();
  const requestedTab = initialTab || searchParams?.get("tab");

  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;
  const isInverter = eqType === "INVERTER";
  const isPump = eqType === "PUMP";
  const isMotor = eqType === "MOTOR";
  const diode = report?.diodeMeasurement || {};
  const hasInverter = Boolean(
    diode?.hasInverter ??
      (diode?.inverterModel ||
        diode?.igbtStatus ||
        diode?.meterPhotoDiode ||
        diode?.pos_to_r_black ||
        diode?.phaseShortCheck)
  );

  // Initial tab: check query param first, then fallback by equipment type
  const getInitialTab = (): PrintTabKey => {
    if (requestedTab) {
      if (requestedTab === "motor_en") return "motor_en";
      if (requestedTab === "motor_th") return "motor_th";
      if (requestedTab === "inverter_en") return "inverter_en";
      if (requestedTab === "inverter_th") return "inverter_th";
      if (isMotor && (requestedTab === "pump_en" || requestedTab === "fault_en")) {
        return "motor_en";
      }
      if (
        isMotor &&
        (requestedTab === "pump_th" || requestedTab === "fault_th" || requestedTab === "pump_report")
      ) {
        return "motor_th";
      }
      if (isInverter && requestedTab === "fault_en") {
        return "inverter_en";
      }
      if (isInverter && (requestedTab === "fault_th" || requestedTab === "pump_report" || requestedTab === "pump_th")) {
        return "inverter_th";
      }
      if (requestedTab === "pump_en" || requestedTab === "fault_en") {
        return isPump ? "pump_en" : "fault_en";
      }
      if (requestedTab === "pump_th" || requestedTab === "fault_th" || requestedTab === "pump_report") {
        return isPump ? "pump_th" : "fault_th";
      }
      if (requestedTab === "photos") return "photos";
      if (requestedTab === "check_list") return "check_list";
      if (requestedTab === "cr") return "cr";
    }
    if (isMotor) return "motor_th";
    if (isPump) return "pump_th";
    if (isInverter) return "inverter_th";
    return "cr";
  };

  const [activeTab, setActiveTab] = useState<PrintTabKey>(getInitialTab);

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
      <div className="w-full max-w-[840px] mb-4 flex flex-col gap-2 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/service/check-reports"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>กลับหน้ารายการ CR</span>
            </Link>

            <Link
              href={`/service/check-reports/${report?.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer"
            >
              <Wrench size={13} />
              <span>แก้ไขข้อมูล CR</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200">
              ประเภทอุปกรณ์: <b className="text-gray-900">{eqConfig.label}</b>
            </span>

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
        </div>

        {/* Tab Switcher - Specific to Equipment Type so user only chooses language/relevant tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-gray-200 shadow-2xs text-xs font-bold">
          {isPump ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-semibold px-1">เลือกภาษาเอกสาร:</span>
              {/* Pump Report - Thai */}
              <button
                type="button"
                onClick={() => setActiveTab("pump_th")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "pump_th" || activeTab === "pump_report" as any
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base">🇹🇭</span>
                <span>ภาษาไทย (TH)</span>
              </button>

              {/* Pump Report - English */}
              <button
                type="button"
                onClick={() => setActiveTab("pump_en")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "pump_en"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base">🇬🇧</span>
                <span>ภาษาอังกฤษ (EN)</span>
              </button>
            </div>
          ) : isMotor ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-semibold px-1">เลือกภาษาเอกสาร:</span>
              <button
                type="button"
                onClick={() => setActiveTab("motor_th")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "motor_th" || activeTab === "pump_th" || activeTab === ("pump_report" as any)
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base">🇹🇭</span>
                <span>ภาษาไทย (TH)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("motor_en")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "motor_en" || activeTab === "pump_en"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base">🇬🇧</span>
                <span>ภาษาอังกฤษ (EN)</span>
              </button>
            </div>
          ) : isInverter ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-gray-500 font-semibold px-1">เลือกแบบฟอร์มเอกสาร:</span>
              {/* Inverter Fault Report TH */}
              <button
                type="button"
                onClick={() => setActiveTab("inverter_th")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "inverter_th" || activeTab === "fault_th"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base">🇹🇭</span>
                <span>ภาษาไทย (TH)</span>
              </button>

              {/* Inverter Fault Report EN */}
              <button
                type="button"
                onClick={() => setActiveTab("inverter_en")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "inverter_en" || activeTab === "fault_en"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base">🇬🇧</span>
                <span>ภาษาอังกฤษ (EN)</span>
              </button>

              {/* Inverter Check list */}
              <button
                type="button"
                onClick={() => setActiveTab("check_list")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "check_list"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Zap size={14} className={activeTab === "check_list" ? "text-amber-300" : "text-amber-500"} />
                <span>Check list repair</span>
              </button>

              {/* Photos */}
              <button
                type="button"
                onClick={() => setActiveTab("photos")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "photos"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <ImageIcon size={14} />
                <span>รูปภาพสินค้า (8 ด้าน)</span>
              </button>
            </div>
          ) : (
            <>
              {/* Standard CR Inspection */}
              <button
                type="button"
                onClick={() => setActiveTab("cr")}
                className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "cr"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-600 hover:text-black hover:bg-gray-100"
                }`}
              >
                <FileText size={14} />
                <span>ใบตรวจเช็ค {eqConfig.shortLabel} {hasInverter ? "(รวม Inverter)" : ""}</span>
              </button>

              {/* If cabinet has Inverter, show Check list repair tab as well */}
              {hasInverter && (
                <button
                  type="button"
                  onClick={() => setActiveTab("check_list")}
                  className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "check_list"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <Zap size={14} className={activeTab === "check_list" ? "text-amber-300" : "text-amber-500"} />
                  <span>Check list Inverter (ตรวจเช็คอินเวอร์เตอร์)</span>
                </button>
              )}

              {/* Fault Report TH */}
              <button
                type="button"
                onClick={() => setActiveTab("fault_th")}
                className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "fault_th"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-gray-600 hover:text-black hover:bg-gray-100"
                }`}
              >
                <span className="text-sm">🇹🇭</span>
                <span>Fault Report (TH)</span>
              </button>

              {/* Fault Report EN */}
              <button
                type="button"
                onClick={() => setActiveTab("fault_en")}
                className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "fault_en"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-gray-600 hover:text-black hover:bg-gray-100"
                }`}
              >
                <span className="text-sm">🇬🇧</span>
                <span>Fault Report (EN)</span>
              </button>

              {/* Photos */}
              <button
                type="button"
                onClick={() => setActiveTab("photos")}
                className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "photos"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-gray-600 hover:text-black hover:bg-gray-100"
                }`}
              >
                <ImageIcon size={14} />
                <span>รูปภาพสินค้า (8 ด้าน)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Printable Sheet View */}
      <div className="w-full flex justify-center">
        {/* Motor Fault Report (Thai) */}
        {(activeTab === "motor_th" ||
          (isMotor && (activeTab === "pump_th" || activeTab === ("pump_report" as any)))) && (
          <MotorFaultReportPaper report={report} lang="TH" />
        )}

        {/* Motor Fault Report (English) */}
        {(activeTab === "motor_en" || (isMotor && activeTab === "pump_en")) && (
          <MotorFaultReportPaper report={report} lang="EN" />
        )}

        {/* Pump Fault Report (Thai) */}
        {!isMotor &&
          (activeTab === "pump_th" || activeTab === ("pump_report" as any)) && (
            <PumpFaultReportPaper report={report} lang="TH" />
          )}

        {/* Pump Fault Report (English) */}
        {!isMotor && activeTab === "pump_en" && (
          <PumpFaultReportPaper report={report} lang="EN" />
        )}

        {/* Inverter Fault Report (Thai) */}
        {isInverter && (activeTab === "inverter_th" || activeTab === "fault_th") && (
          <InverterFaultReportPaper report={report} lang="TH" />
        )}

        {/* Inverter Fault Report (English) */}
        {isInverter && (activeTab === "inverter_en" || activeTab === "fault_en") && (
          <InverterFaultReportPaper report={report} lang="EN" />
        )}

        {activeTab === "check_list" && <CheckListRepairPaper report={report} />}
        {activeTab === "cr" && <CrInspectionPaper report={report} />}
        {!isInverter && activeTab === "fault_th" && <FaultReportPaper report={report} lang="TH" />}
        {!isInverter && activeTab === "fault_en" && <FaultReportPaper report={report} lang="EN" />}
        {activeTab === "photos" && <PhotosPaper report={report} />}
      </div>
    </div>
  );
}
