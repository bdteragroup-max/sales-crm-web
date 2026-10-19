export const DEFAULT_PANEL_COMPONENTS = [
  { key: "breaker_ac", name: "Breaker AC", status: "NORMAL" as const, remark: "" },
  { key: "breaker_dc", name: "Breaker DC", status: "NORMAL" as const, remark: "" },
  { key: "inverter", name: "INVERTER", status: "NORMAL" as const, remark: "" },
  { key: "fuse", name: "FUSE", status: "NORMAL" as const, remark: "" },
  { key: "terminal", name: "TERMINAL", status: "NORMAL" as const, remark: "" },
  { key: "surge_ac", name: "Surge AC", status: "NORMAL" as const, remark: "" },
  { key: "surge_dc", name: "Surge DC", status: "NORMAL" as const, remark: "" },
  { key: "contactor", name: "Magnetic contactor", status: "NORMAL" as const, remark: "" },
  { key: "lamp_button", name: "หลอดไฟ, ปุ่มกดหน้าตู้", status: "NORMAL" as const, remark: "" },
  { key: "keypad", name: "Key pad", status: "NORMAL" as const, remark: "" },
  { key: "fan", name: "พัดลมระบายอากาศ", status: "NORMAL" as const, remark: "" },
  { key: "wiring", name: "สภาพสายไฟ", status: "NORMAL" as const, remark: "" },
  { key: "cabinet", name: "ตู้เหล็ก", status: "NORMAL" as const, remark: "" },
];

export const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; group: "pending" | "converted" | "claim" | "closed" }
> = {
  PENDING: {
    label: "รอซ่อม / รอดำเนินการ",
    badge: "bg-red-50 text-[#ff2301] border-red-200/80 hover:bg-red-100/70",
    dot: "bg-[#ff2301]",
    group: "pending",
  },
  CONVERTED_TO_RO: {
    label: "แปลงเป็นใบรับซ่อมแล้ว (RO)",
    badge: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/70",
    dot: "bg-gray-700",
    group: "converted",
  },
  WARRANTY_CLAIM: {
    label: "ส่งเคลมโรงงาน (Claim)",
    badge: "bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200/70",
    dot: "bg-zinc-800",
    group: "claim",
  },
  CLOSED_NO_REPAIR: {
    label: "ปิดงาน / ไม่ต้องซ่อม",
    badge: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100/60",
    dot: "bg-slate-400",
    group: "closed",
  },
};

export const WARRANTY_STATUS_OPTIONS = [
  { value: "IN_WARRANTY", label: "อยู่ในประกัน (In Warranty)" },
  { value: "OUT_OF_WARRANTY", label: "นอกประกัน (Out of Warranty)" },
  { value: "PENDING", label: "รอตรวจสอบระยะประกัน" },
];

export const COMPANY_OPTIONS = [
  { value: "TG", label: "TERA GROUP (TG)", full: "บริษัท เทอรา กรุ๊ป จำกัด" },
  { value: "TP", label: "TERA POWER (TP)", full: "บริษัท เทอรา พาวเวอร์ จำกัด" },
  { value: "TE", label: "TERA ELECTRIC (TE)", full: "บริษัท เทอรา อิเล็คทริค แอนด์ เอ็นเนอร์ยี่ จำกัด" },
];

export type EquipmentType = "INVERTER" | "CONTROL_CABINET" | "MOTOR" | "PUMP";

export const EQUIPMENT_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    labelEn: string;
    shortLabel: string;
    faultReportTitleEn: string;
    faultReportTitleTh: string;
    inspectionTitleTh: string;
    badge: string;
    color: string;
    powerUnitLabel: string;
    description: string;
  }
> = {
  INVERTER: {
    label: "อินเวอร์เตอร์ / Soft Starter",
    labelEn: "Inverter & Soft Starter",
    shortLabel: "อินเวอร์เตอร์",
    faultReportTitleEn: "INVERTER & SOFTSTATER FAULT REPORT",
    faultReportTitleTh: "รายงานการตรวจเช็คความเสียหาย อินเวอร์เตอร์ & ซอฟท์สตาร์ทเตอร์",
    inspectionTitleTh: "Check List Repair (รายงานการตรวจเช็คอินเวอร์เตอร์)",
    badge: "bg-red-50 text-red-600 border-red-200/80",
    color: "text-red-600",
    powerUnitLabel: "ขนาดมอเตอร์ / โหลด (kW)",
    description: "ตรวจวัดไดโอด Module IGBT, บอร์ดคอนโทรล 24V/10V, คาปาซิเตอร์, ค่าพารามิเตอร์",
  },
  CONTROL_CABINET: {
    label: "ตู้คอนโทรลระบบไฟฟ้า",
    labelEn: "Control Cabinet",
    shortLabel: "ตู้คอนโทรล",
    faultReportTitleEn: "CONTROL CABINET FAULT & INSPECTION REPORT",
    faultReportTitleTh: "รายงานการตรวจเช็คตู้ควบคุมระบบไฟฟ้า",
    inspectionTitleTh: "Report การตรวจเช็คตู้ควบคุมระบบไฟฟ้า",
    badge: "bg-blue-50 text-blue-600 border-blue-200/80",
    color: "text-blue-600",
    powerUnitLabel: "ขนาดพิกัดตู้ / มอเตอร์ (kW)",
    description: "ตรวจวัดแรงดันไฟ Power Input/Output และตรวจสภาพอุปกรณ์ในตู้ 13 รายการ",
  },
  MOTOR: {
    label: "มอเตอร์ไฟฟ้า (Motor)",
    labelEn: "Electric Motor",
    shortLabel: "มอเตอร์",
    faultReportTitleEn: "MOTOR FAULTY REPORT",
    faultReportTitleTh: "รายงานการตรวจเช็คความเสียหาย มอเตอร์ไฟฟ้า",
    inspectionTitleTh: "รายงานการตรวจเช็คมอเตอร์ไฟฟ้า (Motor Inspection)",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    color: "text-amber-600",
    powerUnitLabel: "ขนาดของมอเตอร์ (kW of Motor / HP)",
    description: "ตรวจวัดสภาพมอเตอร์ ขนาด kW/HP โหลดการทำงาน และบันทึกสาเหตุความเสียหาย",
  },
  PUMP: {
    label: "ปั๊มน้ำ (Water Pump)",
    labelEn: "Water Pump",
    shortLabel: "ปั๊มน้ำ",
    faultReportTitleEn: "PUMP FAULTY REPORT",
    faultReportTitleTh: "รายงานการตรวจเช็คความเสียหาย ปั๊มน้ำ",
    inspectionTitleTh: "รายงานการตรวจเช็คปั๊มน้ำ (Pump Inspection)",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
    color: "text-cyan-600",
    powerUnitLabel: "ขนาดของปั๊ม (kW of Pump / HP)",
    description: "ตรวจวัดสภาพปั๊มน้ำ ขนาด kW/HP โหลดการทำงาน และบันทึกสาเหตุความเสียหาย",
  },
};

export const EQUIPMENT_TYPE_OPTIONS = [
  { value: "INVERTER", label: "อินเวอร์เตอร์ / Soft Starter" },
  { value: "CONTROL_CABINET", label: "ตู้คอนโทรลระบบไฟฟ้า" },
  { value: "MOTOR", label: "มอเตอร์ไฟฟ้า (Motor)" },
  { value: "PUMP", label: "ปั๊มน้ำ (Water Pump)" },
];

