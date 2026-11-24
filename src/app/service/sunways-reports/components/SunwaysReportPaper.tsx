"use client";

import React from "react";
import {
  SUNWAYS_FIELD_LABELS,
  SUNWAYS_INSPECTION_ITEMS,
  extractTextBundleFromRecord,
  type SunwaysBilingualData,
  type SunwaysLang,
  type SunwaysMpptRow,
  type SunwaysPrintLang,
  type SunwaysReportRecord,
  type SunwaysTextBundle,
} from "@/app/lib/sunwaysReportConfig";

interface SunwaysReportPaperProps {
  report: SunwaysReportRecord;
  printLang: SunwaysPrintLang;
  overrideTh?: SunwaysTextBundle | null;
  overrideEn?: SunwaysTextBundle | null;
}

function SunwaysHeader({ reportNumber }: { reportNumber?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-end justify-between pb-1.5 border-b-[2px] border-gray-900">
        <div className="text-[10px] text-gray-400 font-medium tracking-wide">
          {reportNumber ? `Doc No: ${reportNumber}` : ""}
        </div>
        <svg
          width="136"
          height="28"
          viewBox="0 0 136 28"
          aria-label="sunways"
          className="block"
        >
          <text
            x="134"
            y="22"
            textAnchor="end"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="24"
            fontWeight="700"
            fontStyle="italic"
            letterSpacing="-0.5"
          >
            <tspan fill="#E87722">sun</tspan>
            <tspan fill="#594D46">ways</tspan>
          </text>
        </svg>
      </div>
    </div>
  );
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <div className="pt-2 text-center text-[11px] font-medium text-[#3B6790]">
      {pageNum}
    </div>
  );
}

function pickLabel(
  item: { en: string; th: string },
  lang: SunwaysPrintLang
): React.ReactNode {
  if (lang === "EN") return item.en;
  if (lang === "TH") return item.th;
  return (
    <>
      <span>{item.en}</span>
      <span className="block text-[9.5px] font-normal text-slate-500 mt-0.5">
        {item.th}
      </span>
    </>
  );
}

function formatReportDate(val: unknown, lang: SunwaysPrintLang): string {
  if (!val) return "";
  const d = new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  if (lang === "TH") {
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function hasAnyBundleContent(bundle: SunwaysTextBundle | null | undefined): boolean {
  if (!bundle) return false;
  return Boolean(
    bundle.companyName?.trim() ||
      bundle.plantName?.trim() ||
      bundle.faultObserved?.trim() ||
      bundle.portalFaultObserved?.trim() ||
      bundle.backupDataObservation?.trim() ||
      bundle.otherRemarks?.trim() ||
      Object.values(bundle.inspectionResults || {}).some(
        (v) => v?.result?.trim() || v?.suggestion?.trim()
      )
  );
}

function renderVal(
  thVal: string | undefined,
  enVal: string | undefined,
  lang: SunwaysPrintLang,
  fallbackIfEmpty = ""
): React.ReactNode {
  const th = (thVal || "").trim();
  const en = (enVal || "").trim();

  if (lang === "EN") {
    return en || th || fallbackIfEmpty;
  }
  if (lang === "TH") {
    return th || en || fallbackIfEmpty;
  }
  if (!th && !en) return fallbackIfEmpty;
  if (th && en && th.toLowerCase() === en.toLowerCase()) return en;
  if (!en) return th;
  if (!th) return en;
  return (
    <div className="space-y-0.5">
      <div>{en}</div>
      <div className="text-[10.5px] text-slate-600">{th}</div>
    </div>
  );
}

export default function SunwaysReportPaper({
  report,
  printLang,
  overrideTh,
  overrideEn,
}: SunwaysReportPaperProps) {
  const bilingualMeta = (report?.bilingualData || {}) as Partial<SunwaysBilingualData>;
  const fallbackLang: SunwaysLang = report?.defaultLang === "EN" ? "EN" : "TH";

  const thBundle =
    overrideTh ||
    (hasAnyBundleContent(bilingualMeta.th)
      ? extractTextBundleFromRecord(report, "TH")
      : extractTextBundleFromRecord(report, fallbackLang));

  const enBundle =
    overrideEn ||
    (hasAnyBundleContent(bilingualMeta.en)
      ? extractTextBundleFromRecord(report, "EN")
      : extractTextBundleFromRecord(report, fallbackLang));

  const installationImages: string[] = Array.isArray(report?.installationImages)
    ? report.installationImages.filter(Boolean)
    : [];
  const portalImages: string[] = Array.isArray(bilingualMeta.portalImages)
    ? bilingualMeta.portalImages.filter(Boolean)
    : [];
  const backupImages: string[] = Array.isArray(bilingualMeta.backupImages)
    ? bilingualMeta.backupImages.filter(Boolean)
    : [];

  const mpptRows: SunwaysMpptRow[] = Array.isArray(report?.mpptRows) && report.mpptRows.length > 0
    ? report.mpptRows
    : Array.from({ length: 12 }, (_, idx) => ({
        mppt: `MPPT ${idx + 1}`,
        dcVoltage: "",
        dcCurrent: "",
        stringsPv: "",
      }));

  // Pair MPPT rows side-by-side into 2 columns (default 6 rows x 2 sides = 12)
  const halfLen = Math.max(6, Math.ceil(mpptRows.length / 2));
  const mpptPairs = Array.from({ length: halfLen }, (_, i) => ({
    left: mpptRows[i] || { mppt: "", dcVoltage: "", dcCurrent: "", stringsPv: "" },
    right: mpptRows[i + halfLen] || { mppt: "", dcVoltage: "", dcCurrent: "", stringsPv: "" },
  }));

  const activeFan = printLang === "TH" ? thBundle.fanCheck : enBundle.fanCheck;
  const checkMark = (val: "YES" | "NO" | "") => {
    if (val === "YES") return "☑ Yes / ใช่";
    if (val === "NO") return "☒ No / ไม่";
    return "☐";
  };

  const page2Items = SUNWAYS_INSPECTION_ITEMS.filter((it) => it.page === 2);
  const page3Items = SUNWAYS_INSPECTION_ITEMS.filter((it) => it.page === 3);

  const pageClass =
    "sunways-a4-page w-[210mm] min-h-[297mm] bg-white text-gray-900 mx-auto shadow-md print:shadow-none px-[15mm] py-[13mm] flex flex-col justify-between mb-6 print:mb-0 box-border text-[11px] leading-[1.35]";

  const renderInspectionContent = (key: (typeof SUNWAYS_INSPECTION_ITEMS)[number]["key"]) => {
    const def = SUNWAYS_INSPECTION_ITEMS.find((i) => i.key === key)!;

    if (key === "cables") {
      return (
        <div className="space-y-1 text-[10.5px]">
          <div className="flex gap-1.5">
            <span className="shrink-0 font-medium">
              {printLang === "TH" ? SUNWAYS_FIELD_LABELS.cableAc.th : SUNWAYS_FIELD_LABELS.cableAc.en}
            </span>
            <span className="border-b border-dotted border-gray-500 flex-1 min-w-[40px] px-1">
              {renderVal(thBundle.cablesSpec.acCables, enBundle.cablesSpec.acCables, printLang)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="shrink-0 font-medium">
              {printLang === "TH"
                ? SUNWAYS_FIELD_LABELS.cableAcType.th
                : SUNWAYS_FIELD_LABELS.cableAcType.en}
            </span>
            <span className="border-b border-dotted border-gray-500 flex-1 min-w-[40px] px-1">
              {renderVal(
                thBundle.cablesSpec.acCableType,
                enBundle.cablesSpec.acCableType,
                printLang
              )}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="shrink-0 font-medium">
              {printLang === "TH" ? SUNWAYS_FIELD_LABELS.cableDc.th : SUNWAYS_FIELD_LABELS.cableDc.en}
            </span>
            <span className="border-b border-dotted border-gray-500 flex-1 min-w-[40px] px-1">
              {renderVal(thBundle.cablesSpec.dcCables, enBundle.cablesSpec.dcCables, printLang)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="shrink-0 font-medium">
              {printLang === "TH"
                ? SUNWAYS_FIELD_LABELS.cableDcType.th
                : SUNWAYS_FIELD_LABELS.cableDcType.en}
            </span>
            <span className="border-b border-dotted border-gray-500 flex-1 min-w-[40px] px-1">
              {renderVal(
                thBundle.cablesSpec.dcCableType,
                enBundle.cablesSpec.dcCableType,
                printLang
              )}
            </span>
          </div>
        </div>
      );
    }

    if (key === "ac_measurement") {
      return (
        <div className="space-y-1 text-[10.5px]">
          <div className="flex gap-1.5">
            <span className="shrink-0">
              {printLang === "TH"
                ? SUNWAYS_FIELD_LABELS.acPhaseA.th
                : SUNWAYS_FIELD_LABELS.acPhaseA.en}
            </span>
            <span className="font-medium text-gray-900">
              {renderVal(thBundle.acMeasurement.phaseA, enBundle.acMeasurement.phaseA, printLang)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="shrink-0">
              {printLang === "TH"
                ? SUNWAYS_FIELD_LABELS.acPhaseB.th
                : SUNWAYS_FIELD_LABELS.acPhaseB.en}
            </span>
            <span className="font-medium text-gray-900">
              {renderVal(thBundle.acMeasurement.phaseB, enBundle.acMeasurement.phaseB, printLang)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="shrink-0">
              {printLang === "TH"
                ? SUNWAYS_FIELD_LABELS.acPhaseC.th
                : SUNWAYS_FIELD_LABELS.acPhaseC.en}
            </span>
            <span className="font-medium text-gray-900">
              {renderVal(thBundle.acMeasurement.phaseC, enBundle.acMeasurement.phaseC, printLang)}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="shrink-0">
              {printLang === "TH" ? SUNWAYS_FIELD_LABELS.acFreq.th : SUNWAYS_FIELD_LABELS.acFreq.en}
            </span>
            <span className="font-medium text-gray-900">
              {renderVal(
                thBundle.acMeasurement.frequency,
                enBundle.acMeasurement.frequency,
                printLang
              )}
            </span>
          </div>
        </div>
      );
    }

    if (key === "pv_module") {
      return (
        <div className="space-y-1">
          <div>{pickLabel({ en: def.contentEn, th: def.contentTh }, printLang)}</div>
          {(thBundle.pvModuleWp || enBundle.pvModuleWp) && (
            <div className="font-semibold text-gray-900">
              {renderVal(thBundle.pvModuleWp, enBundle.pvModuleWp, printLang)}
            </div>
          )}
        </div>
      );
    }

    return pickLabel({ en: def.contentEn, th: def.contentTh }, printLang);
  };

  return (
    <div className="sunways-paper-stack">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sunways-a4-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
          }
          .sunways-a4-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* ==================== PAGE 1 ==================== */}
      <section className={pageClass}>
        <div>
          <SunwaysHeader reportNumber={report?.reportNumber} />

          <h1 className="text-center text-[15px] font-bold underline underline-offset-4 text-gray-900 mt-1 mb-2">
            {pickLabel(SUNWAYS_FIELD_LABELS.title, printLang)}
          </h1>

          <div className="flex justify-end items-center gap-2 text-[11px] font-bold mb-2 pr-1">
            <span>{pickLabel(SUNWAYS_FIELD_LABELS.date, printLang)}</span>
            <span className="font-semibold text-gray-800 min-w-[88px] border-b border-dotted border-gray-400 text-right pb-0.5">
              {formatReportDate(report?.reportDate, printLang)}
            </span>
          </div>

          <table className="w-full border-collapse border border-gray-900 text-[10.5px]">
            <tbody>
              {[
                {
                  label: SUNWAYS_FIELD_LABELS.companyName,
                  th: thBundle.companyName,
                  en: enBundle.companyName,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.communicationPerson,
                  th: thBundle.communicationPerson,
                  en: enBundle.communicationPerson,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.contactDetail,
                  th: thBundle.contactDetail,
                  en: enBundle.contactDetail,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.plantName,
                  th: thBundle.plantName,
                  en: enBundle.plantName,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.country,
                  th: thBundle.country,
                  en: enBundle.country,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.plantCapacity,
                  th: thBundle.plantCapacity,
                  en: enBundle.plantCapacity,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.inverterModel,
                  th: thBundle.inverterModel,
                  en: enBundle.inverterModel,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.serialNumber,
                  th: thBundle.serialNumber,
                  en: enBundle.serialNumber,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.firmwareVersion,
                  th: thBundle.firmwareVersion,
                  en: enBundle.firmwareVersion,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.countryCode,
                  th: thBundle.countryCode,
                  en: enBundle.countryCode,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.dataloggerSn,
                  th: thBundle.dataloggerSn,
                  en: enBundle.dataloggerSn,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.externalDataloggerDetails,
                  th: thBundle.externalDataloggerDetails,
                  en: enBundle.externalDataloggerDetails,
                },
                {
                  label: SUNWAYS_FIELD_LABELS.faultObserved,
                  th: thBundle.faultObserved,
                  en: enBundle.faultObserved,
                },
              ].map((row, idx) => (
                <tr key={idx}>
                  <td className="w-[24%] border border-gray-900 px-2 py-1.5 font-bold align-top bg-white">
                    {pickLabel(row.label, printLang)}
                  </td>
                  <td className="w-[76%] border border-gray-900 px-2.5 py-1.5 align-top whitespace-pre-wrap">
                    {renderVal(row.th, row.en, printLang)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="w-[24%] border border-gray-900 px-2 py-2 font-bold align-top">
                  {pickLabel(SUNWAYS_FIELD_LABELS.installationImage, printLang)}
                </td>
                <td className="w-[76%] border border-gray-900 p-2 align-top h-[220px]">
                  {installationImages.length > 0 ? (
                    <div
                      className={`grid gap-2 h-full ${
                        installationImages.length === 1
                          ? "grid-cols-1"
                          : installationImages.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-2"
                      }`}
                    >
                      {installationImages.slice(0, 4).map((url, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded overflow-hidden flex items-center justify-center bg-gray-50 max-h-[205px]"
                        >
                          <img
                            src={url}
                            alt={`Installation ${idx + 1}`}
                            className="max-w-full max-h-[200px] object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px]" />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PageFooter pageNum={1} />
      </section>

      {/* ==================== PAGE 2 ==================== */}
      <section className={pageClass}>
        <div>
          <SunwaysHeader reportNumber={report?.reportNumber} />

          {/* Top 2 metadata continuation rows */}
          <table className="w-full border-collapse border border-gray-900 text-[10.5px]">
            <tbody>
              <tr>
                <td className="w-[24%] border border-gray-900 px-2 py-2 font-bold align-top">
                  {pickLabel(SUNWAYS_FIELD_LABELS.dataloggerSoftwareVersion, printLang)}
                </td>
                <td className="w-[76%] border border-gray-900 px-2.5 py-2 align-top">
                  {renderVal(
                    thBundle.dataloggerSoftwareVersion,
                    enBundle.dataloggerSoftwareVersion,
                    printLang
                  )}
                </td>
              </tr>
              <tr>
                <td className="w-[24%] border border-gray-900 px-2 py-2 font-bold align-top">
                  {pickLabel(SUNWAYS_FIELD_LABELS.portalFaultObserved, printLang)}
                </td>
                <td className="w-[76%] border border-gray-900 px-2.5 py-2 align-top h-[255px]">
                  <div className="whitespace-pre-wrap">
                    {renderVal(
                      thBundle.portalFaultObserved,
                      enBundle.portalFaultObserved,
                      printLang
                    )}
                  </div>
                  {portalImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {portalImages.slice(0, 2).map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Portal ${idx + 1}`}
                          className="max-h-[140px] object-contain border border-gray-200 rounded"
                        />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4-Column Inspection Table (Page 2 items 1-4) */}
          <table className="w-full border-collapse border-x border-b border-gray-900 text-[10.5px]">
            <thead>
              <tr className="bg-[#BDD7EE]">
                <th className="w-[24%] border border-gray-900 px-2 py-2 font-bold text-left align-middle">
                  {pickLabel(SUNWAYS_FIELD_LABELS.colItem, printLang)}
                </th>
                <th className="w-[37%] border border-gray-900 px-2 py-2 font-bold text-center align-middle">
                  {pickLabel(SUNWAYS_FIELD_LABELS.colCheck, printLang)}
                </th>
                <th className="w-[20%] border border-gray-900 px-2 py-2 font-bold text-center align-middle">
                  {pickLabel(SUNWAYS_FIELD_LABELS.colResult, printLang)}
                </th>
                <th className="w-[19%] border border-gray-900 px-2 py-2 font-bold text-center align-middle">
                  {pickLabel(SUNWAYS_FIELD_LABELS.colSuggestion, printLang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {page2Items.map((item) => {
                const thRes = thBundle.inspectionResults[item.key] || {
                  result: "",
                  suggestion: "",
                };
                const enRes = enBundle.inspectionResults[item.key] || {
                  result: "",
                  suggestion: "",
                };
                const isCables = item.key === "cables";
                return (
                  <tr key={item.key}>
                    <td className="border border-gray-900 px-2 py-2 font-bold align-top">
                      {pickLabel({ en: item.titleEn, th: item.titleTh }, printLang)}
                    </td>
                    <td
                      className={`border border-gray-900 px-2 py-2 align-top ${
                        isCables ? "min-h-[120px]" : ""
                      }`}
                    >
                      {renderInspectionContent(item.key)}
                    </td>
                    <td className="border border-gray-900 px-2 py-2 align-top whitespace-pre-wrap">
                      {renderVal(thRes.result, enRes.result, printLang)}
                    </td>
                    <td className="border border-gray-900 px-2 py-2 align-top whitespace-pre-wrap">
                      {renderVal(thRes.suggestion, enRes.suggestion, printLang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PageFooter pageNum={2} />
      </section>

      {/* ==================== PAGE 3 ==================== */}
      <section className={pageClass}>
        <div>
          <SunwaysHeader reportNumber={report?.reportNumber} />

          {/* Continuation Items 5-8 */}
          <table className="w-full border-collapse border border-gray-900 text-[10.5px]">
            <tbody>
              {page3Items.map((item) => {
                const thRes = thBundle.inspectionResults[item.key] || {
                  result: "",
                  suggestion: "",
                };
                const enRes = enBundle.inspectionResults[item.key] || {
                  result: "",
                  suggestion: "",
                };
                return (
                  <tr key={item.key}>
                    <td className="w-[24%] border border-gray-900 px-2 py-2 font-bold align-top">
                      {pickLabel({ en: item.titleEn, th: item.titleTh }, printLang)}
                    </td>
                    <td className="w-[37%] border border-gray-900 px-2 py-2 align-top">
                      {renderInspectionContent(item.key)}
                    </td>
                    <td className="w-[20%] border border-gray-900 px-2 py-2 align-top whitespace-pre-wrap">
                      {renderVal(thRes.result, enRes.result, printLang)}
                    </td>
                    <td className="w-[19%] border border-gray-900 px-2 py-2 align-top whitespace-pre-wrap">
                      {renderVal(thRes.suggestion, enRes.suggestion, printLang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* MPPT 8-Column Paired Measurement Table */}
          <table className="w-full border-collapse border-x border-b border-gray-900 text-[10.5px]">
            <thead>
              <tr className="bg-white">
                {[0, 1].map((side) => (
                  <React.Fragment key={side}>
                    <th className="w-[12%] border border-gray-900 px-1.5 py-2 font-bold text-center">
                      {SUNWAYS_FIELD_LABELS.mppt.en}
                    </th>
                    <th className="w-[13%] border border-gray-900 px-1.5 py-2 font-bold text-center">
                      {pickLabel(SUNWAYS_FIELD_LABELS.dcVoltage, printLang)}
                    </th>
                    <th className="w-[12.5%] border border-gray-900 px-1.5 py-2 font-bold text-center">
                      {pickLabel(SUNWAYS_FIELD_LABELS.dcCurrent, printLang)}
                    </th>
                    <th className="w-[12.5%] border border-gray-900 px-1.5 py-2 font-bold text-center">
                      {pickLabel(SUNWAYS_FIELD_LABELS.stringsPv, printLang)}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {mpptPairs.map((pair, idx) => (
                <tr key={idx} className="h-[34px]">
                  <td className="border border-gray-900 px-1.5 py-1 text-center font-medium">
                    {pair.left.mppt}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center">
                    {pair.left.dcVoltage}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center">
                    {pair.left.dcCurrent}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center">
                    {pair.left.stringsPv}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center font-medium">
                    {pair.right.mppt}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center">
                    {pair.right.dcVoltage}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center">
                    {pair.right.dcCurrent}
                  </td>
                  <td className="border border-gray-900 px-1.5 py-1 text-center">
                    {pair.right.stringsPv}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Check Fan Status Block */}
          <table className="w-full border-collapse border-x border-b border-gray-900 text-[10.5px]">
            <tbody>
              <tr>
                <td className="w-[24%] border border-gray-900 px-2 py-2.5 font-bold align-top">
                  {pickLabel(SUNWAYS_FIELD_LABELS.fanStatusTitle, printLang)}
                </td>
                <td className="w-[37%] border border-gray-900 px-2 py-2.5 align-top">
                  <div>{pickLabel(SUNWAYS_FIELD_LABELS.fanStatusDesc, printLang)}</div>
                  {(thBundle.fanCheck.summaryResult ||
                    enBundle.fanCheck.summaryResult ||
                    thBundle.fanCheck.summarySuggestion ||
                    enBundle.fanCheck.summarySuggestion) && (
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 text-[10px]">
                      {(thBundle.fanCheck.summaryResult || enBundle.fanCheck.summaryResult) && (
                        <div>
                          <span className="font-semibold">Result: </span>
                          {renderVal(
                            thBundle.fanCheck.summaryResult,
                            enBundle.fanCheck.summaryResult,
                            printLang
                          )}
                        </div>
                      )}
                      {(thBundle.fanCheck.summarySuggestion ||
                        enBundle.fanCheck.summarySuggestion) && (
                        <div>
                          <span className="font-semibold">Suggestion: </span>
                          {renderVal(
                            thBundle.fanCheck.summarySuggestion,
                            enBundle.fanCheck.summarySuggestion,
                            printLang
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="w-[39%] border border-gray-900 px-2.5 py-2.5 align-top space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span>{pickLabel(SUNWAYS_FIELD_LABELS.fanAllWorking, printLang)}</span>
                      <span className="font-semibold shrink-0">
                        {checkMark(activeFan.fansWorking)}
                      </span>
                    </div>
                    {(thBundle.fanCheck.fansWorkingNote || enBundle.fanCheck.fansWorkingNote) && (
                      <div className="text-[10px] text-gray-700 pl-2 mt-0.5">
                        - {renderVal(thBundle.fanCheck.fansWorkingNote, enBundle.fanCheck.fansWorkingNote, printLang)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span>{pickLabel(SUNWAYS_FIELD_LABELS.fanNothingStuck, printLang)}</span>
                      <span className="font-semibold shrink-0">
                        {checkMark(activeFan.nothingStuck)}
                      </span>
                    </div>
                    {(thBundle.fanCheck.nothingStuckNote || enBundle.fanCheck.nothingStuckNote) && (
                      <div className="text-[10px] text-gray-700 pl-2 mt-0.5">
                        - {renderVal(thBundle.fanCheck.nothingStuckNote, enBundle.fanCheck.nothingStuckNote, printLang)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span>{pickLabel(SUNWAYS_FIELD_LABELS.fanRestartNoise, printLang)}</span>
                      <span className="font-semibold shrink-0">
                        {checkMark(activeFan.restartNoiseCheck)}
                      </span>
                    </div>
                    {(thBundle.fanCheck.fanNoiseNote || enBundle.fanCheck.fanNoiseNote) && (
                      <div className="text-[10px] text-gray-700 pl-2 mt-0.5">
                        - {renderVal(thBundle.fanCheck.fanNoiseNote, enBundle.fanCheck.fanNoiseNote, printLang)}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PageFooter pageNum={3} />
      </section>

      {/* ==================== PAGE 4 ==================== */}
      <section className={pageClass}>
        <div className="space-y-6">
          <SunwaysHeader reportNumber={report?.reportNumber} />

          <div>
            <h2 className="text-[13px] font-bold underline underline-offset-4 text-gray-900 mb-3">
              {pickLabel(SUNWAYS_FIELD_LABELS.backupObservation, printLang)}
            </h2>
            <div className="min-h-[210px] rounded border border-gray-300 p-3 text-[11px] leading-relaxed whitespace-pre-wrap bg-white">
              {renderVal(
                thBundle.backupDataObservation,
                enBundle.backupDataObservation,
                printLang,
                "-"
              )}
              {backupImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {backupImages.slice(0, 4).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Backup observation ${idx + 1}`}
                      className="max-h-[160px] object-contain border border-gray-200 rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-[13px] font-bold underline underline-offset-4 text-gray-900 mb-3">
              {pickLabel(SUNWAYS_FIELD_LABELS.otherRemarks, printLang)}
            </h2>
            <div className="min-h-[210px] rounded border border-gray-300 p-3 text-[11px] leading-relaxed whitespace-pre-wrap bg-white">
              {renderVal(thBundle.otherRemarks, enBundle.otherRemarks, printLang, "-")}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-300 flex items-center justify-between text-[11px] text-gray-700">
            <div>
              <span className="font-bold">
                {printLang === "TH"
                  ? SUNWAYS_FIELD_LABELS.inspectorName.th
                  : SUNWAYS_FIELD_LABELS.inspectorName.en}
                :{" "}
              </span>
              <span>
                {renderVal(thBundle.inspectorName, enBundle.inspectorName, printLang, "-")}
              </span>
            </div>
            <div>
              <span className="font-bold">
                {printLang === "TH" ? "วันที่ตรวจสอบ:" : "Inspection Date:"}{" "}
              </span>
              <span>{formatReportDate(report?.reportDate, printLang)}</span>
            </div>
          </div>
        </div>

        <PageFooter pageNum={4} />
      </section>
    </div>
  );
}
