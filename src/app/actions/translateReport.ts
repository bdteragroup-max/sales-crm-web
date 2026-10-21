"use server";

/**
 * Server action to translate Thai text to English for check reports
 */
export async function translateText(text: string): Promise<string> {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Check if text has Thai characters (Unicode range \u0E00-\u0E7F)
  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);
  if (!hasThai) return trimmed;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      console.warn("Translation API returned status:", res.status);
      return fallbackThaiToEn(trimmed);
    }

    const json = await res.json();
    if (Array.isArray(json?.[0])) {
      const translated = json[0].map((chunk: any) => chunk[0]).join("");
      return translated || trimmed;
    }

    return trimmed;
  } catch (err) {
    console.error("Translation error:", err);
    return fallbackThaiToEn(trimmed);
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
  recommendations?: string;
  applicationLoad?: string;
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
    recommendations,
    applicationLoad,
  ] = await Promise.all([
    translateText(data.causeOfFault || ""),
    translateText(data.symptoms || ""),
    translateText(data.customerName || ""),
    translateText(data.customerCompany || ""),
    translateText(data.inspectorName || ""),
    translateText(data.approvedByName || ""),
    translateText(data.reportBy || ""),
    translateText(data.recommendations || ""),
    translateText(data.applicationLoad || ""),
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
    recommendations: recommendations || data.recommendations,
    applicationLoad: applicationLoad || data.applicationLoad,
    requireParts,
  };
}

/**
 * Fallback dictionary for common pump and service terms if network fails
 */
function fallbackThaiToEn(text: string): string {
  let res = text;
  const dict: [RegExp, string][] = [
    [/นาย/g, "Mr. "],
    [/นางสาว/g, "Ms. "],
    [/นาง/g, "Mrs. "],
    [/คุณ/g, "Khun "],
    [/บริษัท/g, "Company "],
    [/จำกัด/g, "Co., Ltd."],
    [/ใบพัดปั๊มได้รับการเสียหาย/g, "The pump impeller is damaged."],
    [/ใบพัด/g, "Impeller"],
    [/เสื้อปั๊ม/g, "Pump casing"],
    [/เบ้าใบพัด/g, "Diffuser bowl"],
    [/ลูกปืนแตก/g, "Broken bearing"],
    [/ลูกปืน/g, "Bearing"],
    [/ซีลน้ำ/g, "Mechanical seal"],
    [/ขดลวดช็อตรอบ/g, "Turn-to-turn winding short circuit"],
    [/ขดลวดลัดวงจร/g, "Winding short circuit"],
    [/ขดลวดไหม้/g, "Winding burnt"],
    [/ขดลวดขาด/g, "Winding open circuit"],
    [/มอเตอร์ไหม้/g, "Motor burnt"],
    [/มอเตอร์ไฟฟ้า/g, "Electric motor"],
    [/มอเตอร์/g, "Motor"],
    [/หมุนติดขัด/g, "Rotor jammed / stuck"],
    [/ไฟกระชาก/g, "Power surge"],
    [/โหลดเกิน/g, "Overloaded"],
    [/โอเวอร์โหลด/g, "Overload"],
    [/ฉนวนเสื่อมสภาพ/g, "Insulation degraded"],
    [/เสื่อมสภาพตามอายุงาน/g, "Deteriorated with age"],
    [/รับประกัน/g, "In Warranty"],
    [/หมดประกัน/g, "Out of Warranty"],
  ];

  for (const [pattern, replacement] of dict) {
    res = res.replace(pattern, replacement);
  }

  return res;
}
