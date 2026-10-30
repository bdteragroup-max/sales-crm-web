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
import CheckReportClaimPaper from "../../components/CheckReportClaimPaper";
import CheckListRepairPaper from "../../components/CheckListRepairPaper";
import PumpFaultReportPaper from "../../components/PumpFaultReportPaper";
import MotorFaultReportPaper from "../../components/MotorFaultReportPaper";
import InverterFaultReportPaper from "../../components/InverterFaultReportPaper";
import CrInspectionPaper from "../../components/CrInspectionPaper";
import FaultReportPaper from "../../components/FaultReportPaper";
import PhotosPaper from "../../components/PhotosPaper";
import { EQUIPMENT_TYPE_CONFIG } from "../../lib/crConstants";

interface PrintClientPageProps {
  report: any;
  initialTab?: string;
}

export type ViewTab = "claim" | "fault" | "checklist" | "photos" | "all";

export default function PrintClientPage({ report, initialTab }: PrintClientPageProps) {
  const searchParams = useSearchParams();
  const requestedTab = initialTab || searchParams?.get("tab") || "";

  const eqType = report?.equipmentType || "INVERTER";
  const eqConfig = EQUIPMENT_TYPE_CONFIG[eqType] || EQUIPMENT_TYPE_CONFIG.INVERTER;
  const isInverter = eqType === "INVERTER";
  const isPump = eqType === "PUMP";
  const isMotor = eqType === "MOTOR";
  const isCabinet = eqType === "CONTROL_CABINET";

  // Check if inverter checklist should be shown:
  // ONLY for INVERTER, or CONTROL_CABINET that has an Inverter inside.
  // PUMP and MOTOR should NEVER show Inverter checklists!
  const hasInverterInCabinet = Boolean(
    report?.hasInverterInCabinet ??
    report?.diodeMeasurement?.hasInverter ??
    (report?.diodeMeasurement?.inverterModel ||
      report?.diodeMeasurement?.inverterBrand ||
      report?.diodeMeasurement?.pos_to_r_black ||
      report?.diodeMeasurement?.neg_to_r_red ||
      report?.diodeMeasurement?.igbtStatus ||
      report?.diodeMeasurement?.phaseShortCheck ||
      report?.inverterModel ||
      report?.inverterBrand)
  );

  const shouldShowInverterChecklist =
    isInverter || (isCabinet && hasInverterInCabinet);

  // Determine initial language:
  const isInitiallyEn =
    requestedTab === "en" ||
    requestedTab.includes("_en");

  // Determine initial tab:
  // If specific tab in query:
  // - "claim": claim
  // - "fault", "pump", "motor", "inverter": fault
  // Defaults when no tab specified:
  // - PUMP or MOTOR: default to dedicated fault report ("fault")
  // - INVERTER or CONTROL_CABINET: default to "claim"
  const getInitialTab = (): ViewTab => {
    if (requestedTab.includes("claim")) return "claim";
    if (
      requestedTab.includes("fault") ||
      requestedTab.includes("pump") ||
      requestedTab.includes("motor") ||
      requestedTab.includes("inverter") ||
      requestedTab.includes("cabinet")
    ) {
      return "fault";
    }
    if (requestedTab.includes("checklist")) return "checklist";
    if (requestedTab.includes("photos")) return "photos";
    if (requestedTab.includes("all")) return "all";

    if (isPump || isMotor || isCabinet) return "fault";
    return "claim";
  };

  const [activeTab, setActiveTab] = useState<ViewTab>(getInitialTab);
  const [lang, setLang] = useState<"TH" | "EN">(isInitiallyEn ? "EN" : "TH");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(() => {
    if (isInverter && getInitialTab() === "fault") return "landscape";
    return "portrait";
  });

  const isEn = lang === "EN";

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
      {/* ───────────────────────────────────────────────────────────
          SCREEN NAVIGATION BAR (Hidden when printing)
      ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[1020px] mb-4 flex flex-col gap-2.5 print:hidden">
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
            <span className="text-[11px] font-bold text-gray-600 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200">
              อุปกรณ์: <b className="text-gray-900">{eqConfig.label}</b>
            </span>

            {orientation === "landscape" ? (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 hidden sm:inline-flex items-center gap-1.5">
                <RectangleHorizontal size={14} className="text-amber-700" />
                <span>โหมดการพิมพ์: <b>แนวนอน (Landscape)</b></span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 hidden sm:inline-flex items-center gap-1.5">
                <RectangleVertical size={14} className="text-emerald-700" />
                <span>โหมดการพิมพ์: <b>แนวตั้ง A4 (Portrait)</b></span>
              </span>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] rounded-xl shadow-md shadow-red-500/25 transition cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>พิมพ์เอกสารนี้ (Print)</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            CONTROLS: Format, Language & Orientation Switchers
        ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-2xs text-xs font-bold">
          {/* Format / Layout Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-500 font-semibold px-1">รูปแบบเอกสาร:</span>
            {isCabinet ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("fault");
                    setOrientation("portrait");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                    activeTab === "fault"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>ใบตรวจเช็คตู้ควบคุม (Control Cabinet Inspection)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("claim");
                    setOrientation("portrait");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                    activeTab === "claim"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>แบบใบแจ้งเคลม (Claim Style - A4 แนวตั้ง)</span>
                </button>

                {shouldShowInverterChecklist && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("checklist");
                      setOrientation("portrait");
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                      activeTab === "checklist"
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <span>ตารางวัดไดโอด & ซ่อม (Checklist & Diode)</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("fault");
                    if (isInverter) setOrientation("landscape");
                    else setOrientation("portrait");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                    activeTab === "fault"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>
                    {isPump
                      ? "แบบฟอร์มปั๊มน้ำ (Pump Fault Report)"
                      : isMotor
                      ? "แบบฟอร์มมอเตอร์ (Motor Fault Report)"
                      : isInverter
                      ? "รายงาน Inverter (Fault Report - แนวนอน)"
                      : "รายงานตรวจเช็ค (Fault Report)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("claim");
                    setOrientation("portrait");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                    activeTab === "claim"
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>แบบใบแจ้งเคลม (Claim Style - A4 แนวตั้ง)</span>
                </button>

                {isInverter && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("checklist");
                      setOrientation("portrait");
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                      activeTab === "checklist"
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <span>ตารางวัดไดโอด & ซ่อม (Checklist & Diode)</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-semibold px-1">ภาษา:</span>
              <button
                type="button"
                onClick={() => setLang("TH")}
                className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs ${
                  lang === "TH"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Languages size={13} />
                <span>ไทย</span>
              </button>

              <button
                type="button"
                onClick={() => setLang("EN")}
                className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs ${
                  lang === "EN"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Globe size={13} />
                <span>EN</span>
              </button>
            </div>

            {/* Orientation Selector */}
            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[11px] text-gray-500 font-semibold px-1">ทิศทาง:</span>
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs ${
                  orientation === "portrait"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <RectangleVertical size={13} />
                <span>แนวตั้ง</span>
              </button>

              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs ${
                  orientation === "landscape"
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <RectangleHorizontal size={13} />
                <span>แนวนอน</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          PRINTABLE SHEET VIEW (All Document Pages in Continuous Flow)
      ─────────────────────────────────────────────────────────── */}
      <div
        className={`w-full ${
          orientation === "landscape" ? "max-w-[1020px]" : "max-w-[800px]"
        } mx-auto flex flex-col items-center gap-6 print:gap-0 print:block print:max-w-none transition-all duration-200`}
      >
        {activeTab === "fault" ? (
          <>
            {/* Page 1: Fault Report (Landscape Table or Portrait for Pump/Motor/Cabinet) */}
            <div className="w-full print:block">
              {isInverter && (
                <InverterFaultReportPaper report={report} lang={lang} />
              )}
              {isPump && !isInverter && (
                <PumpFaultReportPaper report={report} lang={lang} />
              )}
              {isMotor && !isInverter && (
                <MotorFaultReportPaper report={report} lang={lang} />
              )}
              {isCabinet && (
                <CrInspectionPaper report={report} />
              )}
              {!isInverter && !isPump && !isMotor && !isCabinet && (
                <FaultReportPaper report={report} lang={lang} />
              )}
            </div>

            {/* Check List Repair (เฉพาะอินเวอร์เตอร์ / ตู้คอนโทรลที่มีอินเวอร์เตอร์เท่านั้น) */}
            {shouldShowInverterChecklist && (
              <div className="w-full print:block">
                <CheckListRepairPaper report={report} lang={lang} />
              </div>
            )}

            {/* รูปถ่าย */}
            {!isCabinet && (
              <div className="w-full print:block">
                <PhotosPaper report={report} lang={lang} />
              </div>
            )}
          </>
        ) : activeTab === "checklist" ? (
          <>
            {/* เฉพาะหน้า Check List Repair */}
            {shouldShowInverterChecklist ? (
              <div className="w-full print:block">
                <CheckListRepairPaper report={report} lang={lang} />
              </div>
            ) : (
              <div className="w-full print:block">
                <CheckReportClaimPaper report={report} lang={lang} />
              </div>
            )}
            <div className="w-full print:block">
              <PhotosPaper report={report} lang={lang} />
            </div>
          </>
        ) : activeTab === "photos" ? (
          <div className="w-full print:block">
            <PhotosPaper report={report} lang={lang} />
          </div>
        ) : (
          <>
            {/* Page 1: แบบฟอร์มใบแจ้งเคลมและรายงานตรวจเช็ค (A4 แนวตั้ง) */}
            <div className="w-full print:block">
              <CheckReportClaimPaper report={report} lang={lang} />
            </div>

            {/* Check List Repair (เฉพาะอินเวอร์เตอร์ / ตู้คอนโทรลที่มีอินเวอร์เตอร์เท่านั้น) */}
            {shouldShowInverterChecklist && (
              <div className="w-full print:block">
                <CheckListRepairPaper report={report} lang={lang} />
              </div>
            )}

            {/* รูปถ่าย */}
            <div className="w-full print:block">
              <PhotosPaper report={report} lang={lang} />
            </div>
          </>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 ${orientation};
          margin: ${orientation === "landscape" ? "5mm 6mm" : "6mm 8mm"};
        }
        @media print {
          @page {
            size: A4 ${orientation};
            margin: ${orientation === "landscape" ? "5mm 6mm" : "6mm 8mm"};
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
