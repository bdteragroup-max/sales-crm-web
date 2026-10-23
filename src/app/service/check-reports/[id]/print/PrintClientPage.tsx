"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Wrench,
  RectangleHorizontal,
  RectangleVertical,
  Languages,
  Globe,
} from "lucide-react";
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
  | "fault_th"
  | "fault_en";

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
        diode?.phaseShortCheck ||
        report?.inverterModel ||
        report?.inverterBrand)
  );

  // Initial tab: check query param first, then fallback by equipment type
  const getInitialTab = (): PrintTabKey => {
    const isEnParam =
      requestedTab === "en" ||
      requestedTab === "inverter_en" ||
      requestedTab === "fault_en" ||
      requestedTab === "pump_en" ||
      requestedTab === "motor_en";

    if (isMotor) return isEnParam ? "motor_en" : "motor_th";
    if (isPump) return isEnParam ? "pump_en" : "pump_th";
    if (isInverter) return isEnParam ? "inverter_en" : "inverter_th";
    return isEnParam ? "fault_en" : "fault_th";
  };

  const [activeTab, setActiveTab] = useState<PrintTabKey>(getInitialTab);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  const isEn =
    activeTab === "inverter_en" ||
    activeTab === "fault_en" ||
    activeTab === "pump_en" ||
    activeTab === "motor_en";

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
      <div className="w-full max-w-[1020px] mb-4 flex flex-col gap-2 print:hidden">
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

            {orientation === "landscape" ? (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 hidden sm:inline-flex items-center gap-1.5">
                <RectangleHorizontal size={14} className="text-amber-700" />
                <span>แนะนำ: การพิมพ์แบบ <b>แนวนอน (Landscape)</b></span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hidden sm:inline-flex items-center gap-1.5">
                <RectangleVertical size={14} className="text-blue-700" />
                <span>โหมดการพิมพ์: <b>แนวตั้ง (Portrait)</b></span>
              </span>
            )}

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

        {/* Tab Switcher - Language & Orientation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-2xs text-xs font-bold">
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-semibold px-1">ภาษาเอกสาร:</span>
            {/* Thai Version */}
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  isMotor
                    ? "motor_th"
                    : isPump
                    ? "pump_th"
                    : isInverter
                    ? "inverter_th"
                    : "fault_th"
                )
              }
              className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                !isEn
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Languages size={15} />
              <span>ภาษาไทย (TH)</span>
            </button>

            {/* English Version */}
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  isMotor
                    ? "motor_en"
                    : isPump
                    ? "pump_en"
                    : isInverter
                    ? "inverter_en"
                    : "fault_en"
                )
              }
              className={`px-4 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                isEn
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Globe size={15} />
              <span>ภาษาอังกฤษ (EN)</span>
            </button>
          </div>

          {/* Orientation Selector */}
          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[11px] text-gray-500 font-semibold px-1">ทิศทางการพิมพ์:</span>
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                orientation === "landscape"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <RectangleHorizontal size={15} />
              <span>แนวนอน (Landscape)</span>
              <span className="text-[10px] opacity-85 font-normal hidden lg:inline">(แนะนำ)</span>
            </button>

            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                orientation === "portrait"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <RectangleVertical size={15} />
              <span>แนวตั้ง (Portrait)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet View - Continuous Flow Downwards without page cuts */}
      <div
        className={`w-full ${
          orientation === "landscape" ? "max-w-[1020px]" : "max-w-[800px]"
        } mx-auto flex flex-col items-center gap-6 print:gap-0 print:block print:max-w-none transition-all duration-200`}
      >
        {/* Inverter Reports (Fault Report -> Check list repair -> Photos 8 sides) */}
        {isInverter && (
          <>
            <div className="w-full print:block">
              <InverterFaultReportPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
            <div className="w-full print:block">
              <CheckListRepairPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
            <div className="w-full print:block">
              <PhotosPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
          </>
        )}

        {/* Pump Reports */}
        {isPump && !isInverter && (
          <>
            <div className="w-full print:block">
              <PumpFaultReportPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
            {hasInverter && (
              <div className="w-full print:block">
                <CheckListRepairPaper report={report} lang={isEn ? "EN" : "TH"} />
              </div>
            )}
            <div className="w-full print:block">
              <PhotosPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
          </>
        )}

        {/* Motor Reports */}
        {isMotor && !isInverter && (
          <>
            <div className="w-full print:block">
              <MotorFaultReportPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
            <div className="w-full print:block">
              <PhotosPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
          </>
        )}

        {/* Control Cabinet & General Reports */}
        {!isInverter && !isPump && !isMotor && (
          <>
            <div className="w-full print:block">
              <FaultReportPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
            {hasInverter && (
              <div className="w-full print:block">
                <CheckListRepairPaper report={report} lang={isEn ? "EN" : "TH"} />
              </div>
            )}
            <div className="w-full print:block">
              <PhotosPaper report={report} lang={isEn ? "EN" : "TH"} />
            </div>
          </>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 ${orientation};
          margin: ${orientation === "landscape" ? "5mm 6mm" : "6mm 5mm"};
        }
        @media print {
          @page {
            size: A4 ${orientation};
            margin: ${orientation === "landscape" ? "5mm 6mm" : "6mm 5mm"};
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
