"use server";

import type { SunwaysInspectionKey, SunwaysTextBundle } from "@/app/lib/sunwaysReportConfig";
import { SUNWAYS_INSPECTION_ITEMS } from "@/app/lib/sunwaysReportConfig";

/**
 * Bidirectional server-side text translation helper (Thai <-> English).
 * Uses Google Translate GTX API when reachable and falls back to offline
 * solar/inverter technical dictionaries so translation always degrades safely.
 */
export async function translateTextDirection(
  text: string,
  targetLang: "EN" | "TH"
): Promise<string> {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);
  const hasLatin = /[A-Za-z]/.test(trimmed);

  if (targetLang === "EN" && !hasThai) return trimmed;
  if (targetLang === "TH" && !hasLatin) return trimmed;

  const sourceLang = targetLang === "EN" ? "th" : "en";
  const destLang = targetLang === "EN" ? "en" : "th";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${destLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      console.warn("Translation API returned status:", res.status);
      return targetLang === "EN" ? fallbackThaiToEn(trimmed) : fallbackEnToThai(trimmed);
    }

    const json = await res.json();
    if (Array.isArray(json?.[0])) {
      const translated = json[0]
        .map((chunk: unknown) => (Array.isArray(chunk) ? String(chunk[0] ?? "") : ""))
        .join("");
      return translated || trimmed;
    }

    return targetLang === "EN" ? fallbackThaiToEn(trimmed) : fallbackEnToThai(trimmed);
  } catch (err) {
    console.error("Translation error:", err);
    return targetLang === "EN" ? fallbackThaiToEn(trimmed) : fallbackEnToThai(trimmed);
  }
}

/**
 * Translate a single Thai string to English (backward-compatible helper)
 */
export async function translateText(text: string): Promise<string> {
  return translateTextDirection(text, "EN");
}

/**
 * Translate a full Sunways report text bundle cleanly into TH or EN.
 * Technical codes (model, S/N, firmware, country code, datalogger SN/SW version, contact)
 * are preserved intact unless they contain Thai text when translating to English.
 */
export async function translateSunwaysBundle(
  bundle: SunwaysTextBundle,
  targetLang: "EN" | "TH"
): Promise<{ success: boolean; data?: SunwaysTextBundle; error?: string }> {
  try {
    const tr = (val: string) => translateTextDirection(val, targetLang);
    const trCodeOnlyIfThai = (val: string) =>
      targetLang === "EN" && /[\u0E00-\u0E7F]/.test(val || "")
        ? translateTextDirection(val, "EN")
        : Promise.resolve(val || "");

    const [
      companyName,
      communicationPerson,
      contactDetail,
      plantName,
      country,
      plantCapacity,
      inverterModel,
      serialNumber,
      firmwareVersion,
      countryCode,
      dataloggerSn,
      externalDataloggerDetails,
      faultObserved,
      dataloggerSoftwareVersion,
      portalFaultObserved,
      acCables,
      acCableType,
      dcCables,
      dcCableType,
      phaseA,
      phaseB,
      phaseC,
      frequency,
      pvModuleWp,
      fansWorkingNote,
      nothingStuckNote,
      fanNoiseNote,
      summaryResult,
      summarySuggestion,
      backupDataObservation,
      otherRemarks,
      inspectorName,
    ] = await Promise.all([
      tr(bundle.companyName),
      tr(bundle.communicationPerson),
      trCodeOnlyIfThai(bundle.contactDetail),
      tr(bundle.plantName),
      tr(bundle.country),
      trCodeOnlyIfThai(bundle.plantCapacity),
      trCodeOnlyIfThai(bundle.inverterModel),
      trCodeOnlyIfThai(bundle.serialNumber),
      trCodeOnlyIfThai(bundle.firmwareVersion),
      trCodeOnlyIfThai(bundle.countryCode),
      trCodeOnlyIfThai(bundle.dataloggerSn),
      tr(bundle.externalDataloggerDetails),
      tr(bundle.faultObserved),
      trCodeOnlyIfThai(bundle.dataloggerSoftwareVersion),
      tr(bundle.portalFaultObserved),
      tr(bundle.cablesSpec.acCables),
      tr(bundle.cablesSpec.acCableType),
      tr(bundle.cablesSpec.dcCables),
      tr(bundle.cablesSpec.dcCableType),
      trCodeOnlyIfThai(bundle.acMeasurement.phaseA),
      trCodeOnlyIfThai(bundle.acMeasurement.phaseB),
      trCodeOnlyIfThai(bundle.acMeasurement.phaseC),
      trCodeOnlyIfThai(bundle.acMeasurement.frequency),
      tr(bundle.pvModuleWp),
      tr(bundle.fanCheck.fansWorkingNote),
      tr(bundle.fanCheck.nothingStuckNote),
      tr(bundle.fanCheck.fanNoiseNote),
      tr(bundle.fanCheck.summaryResult),
      tr(bundle.fanCheck.summarySuggestion),
      tr(bundle.backupDataObservation),
      tr(bundle.otherRemarks),
      tr(bundle.inspectorName),
    ]);

    const translatedResults = { ...bundle.inspectionResults } as Record<
      SunwaysInspectionKey,
      { result: string; suggestion: string }
    >;

    const inspectionEntries = await Promise.all(
      SUNWAYS_INSPECTION_ITEMS.map(async (item) => {
        const cur = bundle.inspectionResults[item.key] || { result: "", suggestion: "" };
        const [result, suggestion] = await Promise.all([
          tr(cur.result || ""),
          tr(cur.suggestion || ""),
        ]);
        return [item.key, { result, suggestion }] as const;
      })
    );

    for (const [key, val] of inspectionEntries) {
      translatedResults[key] = val;
    }

    return {
      success: true,
      data: {
        companyName,
        communicationPerson,
        contactDetail,
        plantName,
        country,
        plantCapacity,
        inverterModel,
        serialNumber,
        firmwareVersion,
        countryCode,
        dataloggerSn,
        externalDataloggerDetails,
        faultObserved,
        dataloggerSoftwareVersion,
        portalFaultObserved,
        cablesSpec: {
          acCables,
          acCableType,
          dcCables,
          dcCableType,
        },
        acMeasurement: {
          phaseA,
          phaseB,
          phaseC,
          frequency,
        },
        pvModuleWp,
        inspectionResults: translatedResults,
        fanCheck: {
          ...bundle.fanCheck,
          fansWorkingNote,
          nothingStuckNote,
          fanNoiseNote,
          summaryResult,
          summarySuggestion,
        },
        backupDataObservation,
        otherRemarks,
        inspectorName,
      },
    };
  } catch (error: unknown) {
    console.error("Error translating Sunways report bundle:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ไม่สามารถแปลข้อความได้ในขณะนี้",
    };
  }
}

/**
 * Translate multiple report fields in a single call
 */
export async function translateReportData(data: {
  causeOfFault?: string;
  symptoms?: string;
  customerName?: string;
  customerCompany?: string;
  inspectorName?: string;
  approvedByName?: string;
  reportBy?: string;
  salesPerson?: string;
  recommendations?: string;
  applicationLoad?: string;
  parameterNotes?: string;
  capacitorValue?: string;
  requireParts?: { partName: string; qty: number }[];
}) {
  const [
    causeOfFault,
    symptoms,
    customerName,
    customerCompany,
    inspectorName,
    approvedByName,
    reportBy,
    salesPerson,
    recommendations,
    applicationLoad,
    parameterNotes,
    capacitorValue,
  ] = await Promise.all([
    translateText(data.causeOfFault || ""),
    translateText(data.symptoms || ""),
    translateText(data.customerName || ""),
    translateText(data.customerCompany || ""),
    translateText(data.inspectorName || ""),
    translateText(data.approvedByName || ""),
    translateText(data.reportBy || ""),
    translateText(data.salesPerson || ""),
    translateText(data.recommendations || ""),
    translateText(data.applicationLoad || ""),
    translateText(data.parameterNotes || ""),
    translateText(data.capacitorValue || ""),
  ]);

  let requireParts = data.requireParts;
  if (Array.isArray(data.requireParts) && data.requireParts.length > 0) {
    requireParts = await Promise.all(
      data.requireParts.map(async (part) => ({
        ...part,
        partName: await translateText(part.partName || ""),
      }))
    );
  }

  return {
    causeOfFault: causeOfFault || data.causeOfFault,
    symptoms: symptoms || data.symptoms,
    customerName: customerName || data.customerName,
    customerCompany: customerCompany || data.customerCompany,
    inspectorName: inspectorName || data.inspectorName,
    approvedByName: approvedByName || data.approvedByName,
    reportBy: reportBy || data.reportBy,
    salesPerson: salesPerson || data.salesPerson,
    recommendations: recommendations || data.recommendations,
    applicationLoad: applicationLoad || data.applicationLoad,
    parameterNotes: parameterNotes || data.parameterNotes,
    capacitorValue: capacitorValue || data.capacitorValue,
    requireParts,
  };
}

/**
 * Fallback dictionaries for common solar/inverter terms when network is unreachable
 */
function fallbackThaiToEn(text: string): string {
  let res = text;
  const dict: [RegExp, string][] = [
    [/นายชลประการ พลดงนอก/g, "Mr. Chonprakarn Phondonnok"],
    [/นางสาวผกามาศ จันทร์เมือง/g, "Ms. Phakamat Chanmueang"],
    [/คุณบรรพต ริพรม/g, "Mr. Banphot Riprom"],
    [/นาย/g, "Mr. "],
    [/นางสาว/g, "Ms. "],
    [/นาง/g, "Mrs. "],
    [/คุณ/g, "Mr./Khun "],
    [/บริษัท/g, "Company "],
    [/จำกัด/g, "Co., Ltd."],
    [/ประเทศไทย/g, "Thailand"],
    [/เคสตัวอินเวอร์เตอร์\s*แตก/g, "The inverter case is broken."],
    [/IGBT เฟส\s*U\s*V\s*W\s*เสีย/g, "The IGBT phases U V W are broken."],
    [/อินเวอร์เตอร์มีคราบฝุ่นจำนวนมาก/g, "The inverter has a lot of dust stains."],
    [/สภาพสมบูรณ์ ไม่พบคราบน้ำยาหรือรอยบวม/g, "Good condition, no electrolyte leakage or bulging"],
    [/สภาพปกติ ไม่พบความเสียหาย/g, "Normal condition, no damage found"],
    [/ไม่พบสิ่งผิดปกติ/g, "No abnormality found"],
    [/ใช้งานได้ปกติ/g, "Operating normally"],
    [/พัดลมทำงานปกติ/g, "Fans working normally"],
    [/ไม่มีสิ่งติดขัดในพัดลม/g, "Nothing stuck inside the fan"],
    [/มีเสียงดังผิดปกติ/g, "Abnormal fan noise observed"],
    [/ต่อสายดินตัวถังแล้ว/g, "Body earthing connected"],
    [/ยังไม่ได้ต่อสายดิน/g, "Earthing not connected"],
    [/ความต้านทานฉนวนปกติ/g, "Insulation resistance normal"],
    [/ความต้านทานฉนวนต่ำ/g, "Low insulation resistance"],
    [/หน้าจอแสดงผลชัดเจน/g, "LCD display is clear"],
    [/ปกติ/g, "Normal"],
    [/ผิดปกติ/g, "Abnormal"],
    [/ผ่าน/g, "Pass"],
    [/ไม่ผ่าน/g, "Fail"],
    [/ชำรุด/g, "Damaged"],
    [/เสียหาย/g, "Damaged"],
    [/อินเวอร์เตอร์/g, "Inverter"],
    [/สายดินตัวถัง/g, "Body Earthing"],
    [/สายดิน/g, "Grounding"],
    [/ฉนวน/g, "Insulation"],
    [/สายไฟ/g, "Cable"],
    [/พัดลม/g, "Fan"],
    [/หน้าจอ/g, "Display"],
    [/แรงดันไฟฟ้า/g, "Voltage"],
    [/กระแสไฟฟ้า/g, "Current"],
    [/ความถี่/g, "Frequency"],
    [/รับประกัน/g, "In Warranty"],
    [/หมดประกัน/g, "Out of Warranty"],
  ];

  for (const [pattern, replacement] of dict) {
    res = res.replace(pattern, replacement);
  }

  return res;
}

function fallbackEnToThai(text: string): string {
  let res = text;
  const dict: [RegExp, string][] = [
    [/\bThailand\b/gi, "ประเทศไทย"],
    [/\bNormal condition, no damage( found)?\b/gi, "สภาพปกติ ไม่พบความเสียหาย"],
    [/\bNo abnormalit(y|ies) found\b/gi, "ไม่พบสิ่งผิดปกติ"],
    [/\bWorking normally\b/gi, "ทำงานปกติ"],
    [/\bOperating normally\b/gi, "ใช้งานได้ปกติ"],
    [/\bAll fans are working\b/gi, "พัดลมทุกตัวทำงานปกติ"],
    [/\bNothing stuck inside the fan\b/gi, "ไม่มีสิ่งแปลกปลอมติดขัดในพัดลม"],
    [/\bInsulation resistance\b/gi, "ค่าความต้านทานฉนวน"],
    [/\bIsolation fault\b/gi, "ปัญหาความผิดพลาดของฉนวน (Isolation Fault)"],
    [/\bBody [Ee]arthing\b/g, "สายดินตัวถัง (Body Earthing)"],
    [/\bGrounding\b/gi, "ระบบกราวด์"],
    [/\bInverter\b/gi, "อินเวอร์เตอร์"],
    [/\bDatalogger\b/gi, "ดาต้าล็อกเกอร์"],
    [/\bAbnormal\b/gi, "ผิดปกติ"],
    [/\bNormal\b/gi, "ปกติ"],
    [/\bConnected\b/gi, "เชื่อมต่อแล้ว"],
    [/\bNot connected\b/gi, "ยังไม่ได้เชื่อมต่อ"],
    [/\bDamaged\b/gi, "ชำรุดเสียหาย"],
    [/\bPassed?\b/gi, "ผ่าน"],
    [/\bFailed?\b/gi, "ไม่ผ่าน"],
    [/\bReplace\b/gi, "แนะนำให้เปลี่ยน"],
    [/\bCheck\b/gi, "ตรวจสอบ"],
    [/\bRecommend(ation)?\b/gi, "ข้อเสนอแนะ"],
    [/\bFan\b/gi, "พัดลม"],
    [/\bCable\b/gi, "สายไฟ"],
    [/\bVoltage\b/gi, "แรงดันไฟฟ้า"],
    [/\bCurrent\b/gi, "กระแสไฟฟ้า"],
    [/\bFrequency\b/gi, "ความถี่"],
    [/\bCompany\b/gi, "บริษัท"],
  ];

  for (const [pattern, replacement] of dict) {
    res = res.replace(pattern, replacement);
  }

  return res;
}
