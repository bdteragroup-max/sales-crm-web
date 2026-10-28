/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReturnItem {
  no: number;
  type: string;          // ประเภทสินค้า เช่น เช็ควาล์ว, อินเวอร์เตอร์
  brand: string;         // ยี่ห้อ เช่น ARITA, Huawei
  model: string;         // รุ่น / โมเดล เช่น เช็ควาล์ว 3", SUN2000-100KTL
  size: string;          // ขนาด เช่น 3", 1/2", 100kW
  serialNumber: string;  // Serial No.
  quantity: number;      // จำนวน
  unit: string;          // หน่วย เช่น ตัว, เครื่อง, ชิ้น
  remark: string;        // หมายเหตุ เช่น ผิดรุ่น, เปลี่ยนสเปค, คืนคลัง
  itemCode?: string;
  description?: string;
  totalAmount?: number;
}

export interface GoodsReturnMetadata {
  reason?: string;       // สาเหตุการส่งคืน / อาการเสีย เช่น "ผิดรุ่น / เปลี่ยนสเปคสินค้า"
  settings?: string;     // การตั้งค่า
  phoneNumber?: string;  // เบอร์โทรศัพท์
  subcontractor?: string;// ชื่อบริษัทซับคอนแทรคเตอร์
  notes?: string;        // หมายเหตุเพิ่มเติม
  internalCompany?: "TG" | "TP" | "TE";
}

export interface InternalCompany {
  code: "TG" | "TP" | "TE";
  label: string;
  name: string;
  fullName: string;
  address: string;
  phone: string;
  fax: string;
  logoUrl: string;
}

export const INTERNAL_COMPANIES: InternalCompany[] = [
  {
    code: "TG",
    label: "TG",
    name: "Tera Group",
    fullName: "บริษัท เทอรา กรุ๊ป จำกัด",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
    phone: "+66(0) 2328-0801-3, +66(0) 81-3152660",
    fax: "+66(0) 2328-0804",
    logoUrl: "/logos/tg.png",
  },
  {
    code: "TP",
    label: "TP",
    name: "Tera Power",
    fullName: "บริษัท เทอรา พาวเวอร์ จำกัด",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
    phone: "+66(0) 2328-0801-3, +66(0) 81-3152660",
    fax: "+66(0) 2328-0804",
    logoUrl: "/logos/tp.png",
  },
  {
    code: "TE",
    label: "TE",
    name: "Tera Electric",
    fullName: "บริษัท เทอรา อิเล็คทริค จำกัด",
    address: "39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม. 10250",
    phone: "+66(0) 2328-0801-3, +66(0) 81-3152660",
    fax: "+66(0) 2328-0804",
    logoUrl: "/logos/te.png",
  },
];

export function getInternalCompanyMeta(code?: string): InternalCompany {
  const found = INTERNAL_COMPANIES.find((c) => c.code === code);
  return found || INTERNAL_COMPANIES[0];
}

export const RETURN_TYPES = [
  {
    value: "CHANGE_SPEC",
    label: "เปลี่ยนสเปคสินค้า (ซับคอนแทรคเตอร์)",
    shortLabel: "เปลี่ยนสเปค",
    desc: "ทางซับส่งสินค้าแล้วเปลี่ยนสเปคสินค้าตามหน้างาน",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
    dotColor: "bg-blue-600",
  },
  {
    value: "WRONG_MODEL",
    label: "ผิดรุ่น / ไม่ตรงตามที่ระบุ",
    shortLabel: "ผิดรุ่น",
    desc: "สินค้าไม่ตรงตามสเปคหรือส่งผิดรุ่น",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 font-bold",
    dotColor: "bg-purple-600",
  },
  {
    value: "RETURN_TO_WAREHOUSE",
    label: "ส่งคืนคลังสินค้า (Return to Warehouse)",
    shortLabel: "ส่งคืนคลัง",
    desc: "ส่งคืนวัสดุอุปกรณ์เข้าสโตร์กลาง",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    dotColor: "bg-emerald-600",
  },
  {
    value: "DEFECT",
    label: "คืนของเสีย / สินค้าชำรุด",
    shortLabel: "ของเสียชำรุด",
    desc: "สินค้ามีตำหนิ ชำรุด เสียหาย ไม่สามารถใช้งานได้",
    badgeClass: "bg-red-50 text-[#ff2301] border-red-200/80 font-bold",
    dotColor: "bg-[#ff2301]",
  },
  {
    value: "SURPLUS",
    label: "คืนสินค้าส่วนเกิน / เหลือจากการใช้งาน",
    shortLabel: "คืนส่วนเกิน",
    desc: "วัสดุอุปกรณ์เหลือจากโครงการ ส่งคืนคลัง",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold",
    dotColor: "bg-cyan-600",
  },
  {
    value: "SUPPLIER",
    label: "คืนซัพพลายเออร์ (Return to Supplier)",
    shortLabel: "คืนซัพพลายเออร์",
    desc: "ส่งคืนบริษัทผู้ผลิต/ผู้ขายเพื่อเปลี่ยนสินค้า",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
    dotColor: "bg-amber-600",
  },
  {
    value: "REPAIR",
    label: "ส่งซ่อม (Repair Return)",
    shortLabel: "ส่งซ่อม",
    desc: "ส่งคืนเพื่อทำการซ่อมแซมหรือแก้ไข",
    badgeClass: "bg-gray-900 text-white border-gray-800 font-bold",
    dotColor: "bg-gray-900",
  },
  {
    value: "RETURN_TO_CUSTOMER",
    label: "คืนลูกค้า (Return to Customer)",
    shortLabel: "คืนลูกค้า",
    desc: "ส่งคืนสินค้าหรือเครื่องหลังซ่อมเสร็จ",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200 font-bold",
    dotColor: "bg-teal-600",
  },
  {
    value: "RETURN_WITHOUT_REPAIR",
    label: "คืนโดยไม่ซ่อม (Return Without Repair)",
    shortLabel: "คืนโดยไม่ซ่อม",
    desc: "ส่งคืนเครื่องโดยไม่ได้ซ่อม",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 font-semibold",
    dotColor: "bg-orange-600",
  },
];

export function getReturnTypeMeta(type: string) {
  const found = RETURN_TYPES.find((t) => t.value === type);
  if (found) return found;
  return {
    value: type,
    label: type || "ส่งคืนสินค้า",
    shortLabel: type || "ส่งคืน",
    desc: "เอกสารส่งคืนสินค้า",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200 font-medium",
    dotColor: "bg-gray-400",
  };
}

export function parseGoodsReturnData(doc: any): {
  items: ReturnItem[];
  reason: string;
  settings: string;
  phoneNumber: string;
  notes: string;
  subcontractor: string;
  internalCompany: "TG" | "TP" | "TE";
} {
  if (!doc) {
    return {
      items: [],
      reason: "",
      settings: "",
      phoneNumber: "",
      notes: "",
      subcontractor: "",
      internalCompany: "TG",
    };
  }

  const raw = doc.items;
  let parsed: any = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  }

  let list: any[] = [];
  let reason = "";
  let settings = "";
  let phoneNumber = "";
  let notes = "";
  let subcontractor = doc.customer || "";
  let internalCompany: "TG" | "TP" | "TE" = "TG";

  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === "object") {
    list = Array.isArray(parsed.list)
      ? parsed.list
      : Array.isArray(parsed.items)
      ? parsed.items
      : [];
    reason = parsed.reason || parsed.symptoms || "";
    settings = parsed.settings || "";
    phoneNumber = parsed.phoneNumber || parsed.phone || "";
    notes = parsed.notes || "";
    if (parsed.subcontractor) subcontractor = parsed.subcontractor;
    if (parsed.internalCompany && ["TG", "TP", "TE"].includes(parsed.internalCompany)) {
      internalCompany = parsed.internalCompany;
    }
  }

  // Also check if reference or doc has company indicator
  if (doc.internalCompany && ["TG", "TP", "TE"].includes(doc.internalCompany)) {
    internalCompany = doc.internalCompany;
  }

  const items: ReturnItem[] = list.map((it: any, idx: number) => ({
    no: it.no || idx + 1,
    type: it.type || it.category || it.itemCode || "",
    brand: it.brand || "",
    model: it.model || it.description || "",
    size: it.size || "",
    serialNumber: it.serialNumber || it.serial || "",
    quantity: Number(it.quantity) || 1,
    unit: it.unit || "ตัว",
    remark: it.remark || "",
    itemCode: it.itemCode || "",
    description: it.description || "",
    totalAmount: it.totalAmount,
  }));

  return { items, reason, settings, phoneNumber, notes, subcontractor, internalCompany };
}

