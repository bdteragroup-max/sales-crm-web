"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  Save,
  ArrowLeft,
  ArrowRight,
  Search,
  Building2,
  User,
  Phone,
  Calendar,
  Sparkles,
  Printer,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wrench,
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Users,
  Check,
  MapPin,
  Zap,
  Layers,
  Cog,
  Droplets,
  SlidersHorizontal,
  ExternalLink,
  Activity,
  ShieldCheck,
  LayoutList,
  ScrollText,
  Sliders,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  createInverterCheckReport,
  updateInverterCheckReport,
  generateCrNumber,
  searchCompaniesForCheckReport,
  getRecentCompaniesForCheckReport,
  searchRepairOrdersForCheckReport,
  getRepairOrderForCheckReport,
  InverterCheckReportFormData,
  CheckReportPhotos,
  PanelComponentItem,
  DiodeMeasurement,
  PowerVoltageCheck,
  MotorMeasurement,
} from "@/app/actions/inverterCheckReports";
import DiodeMeasurementCard from "./DiodeMeasurementCard";
import PowerVoltageCard from "./PowerVoltageCard";
import PanelComponentsCard from "./PanelComponentsCard";
import MotorMeasurementCard from "./MotorMeasurementCard";
import ConvertToRoModal from "./ConvertToRoModal";
import {
  DEFAULT_PANEL_COMPONENTS,
  COMPANY_OPTIONS,
  WARRANTY_STATUS_OPTIONS,
  STATUS_CONFIG,
  EquipmentType,
  EQUIPMENT_TYPE_CONFIG,
  EQUIPMENT_TYPE_OPTIONS,
} from "../lib/crConstants";

export type PhotoKey =
  | "front"
  | "left"
  | "right"
  | "top"
  | "fan"
  | "inside"
  | "terminal"
  | "nameplate";

export const PHOTO_SLOTS: {
  key: PhotoKey;
  title: string;
  enTitle: string;
  desc: string;
}[] = [
  { key: "front", title: "1. ด้านหน้า", enTitle: "Front", desc: "รูปถ่ายด้านหน้าเครื่องตรง" },
  { key: "left", title: "2. ด้านซ้าย", enTitle: "Left", desc: "รูปถ่ายฝั่งซ้ายของเครื่อง" },
  { key: "right", title: "3. ด้านขวา", enTitle: "Right", desc: "รูปถ่ายฝั่งขวาของเครื่อง" },
  { key: "top", title: "4. ด้านบน", enTitle: "Top", desc: "รูปถ่ายด้านบนตัวเครื่อง" },
  { key: "fan", title: "5. พัดลม", enTitle: "Fan", desc: "รูปถ่ายพัดลมระบายความร้อน" },
  { key: "inside", title: "6. ด้านใน", enTitle: "Inside", desc: "รูปถ่ายบอร์ด/อุปกรณ์ด้านใน" },
  { key: "terminal", title: "7. บล็อคเทอร์มินอล", enTitle: "Terminal Block", desc: "รูปถ่ายบล็อคต่อสายไฟ" },
  { key: "nameplate", title: "8. เนมเพลท", enTitle: "Nameplate", desc: "รูปถ่ายป้ายชื่อและสเปกเครื่อง" },
];

export const PUMP_PHOTO_SLOTS: {
  key: PhotoKey;
  title: string;
  enTitle: string;
  desc: string;
  badge?: string;
}[] = [
  {
    key: "nameplate",
    title: "1. ป้ายเนมเพลทปั๊มน้ำ",
    enTitle: "Pump Nameplate",
    desc: "แสดงหน้าแรก ใต้ตาราง 11 คอลัมน์ (PUMP FAULTY REPORT)",
    badge: "หน้า 1",
  },
  {
    key: "front",
    title: "2. ภาพรวมตัวปั๊มน้ำทั้งตัว",
    enTitle: "Pump Body / Full View",
    desc: "แสดงในเอกสารแนบ หน้า 2 ด้านซ้าย (Full Assembly)",
    badge: "หน้า 2 (ตัวปั๊ม)",
  },
  {
    key: "inside",
    title: "3. เสื้อปั๊ม / เบ้าใบพัด",
    enTitle: "Diffuser / Stage Bowl",
    desc: "ภาพชิ้นส่วนที่เสีย เช่น เสื้อปั๊ม, เบ้าใบพัด, แหวนกันสึก",
    badge: "จุดเสีย 1",
  },
  {
    key: "left",
    title: "4. ใบพัดปั๊มน้ำ",
    enTitle: "Pump Impeller",
    desc: "ภาพใบพัดที่แตกหัก หรือรอยสึกกร่อน",
    badge: "จุดเสีย 2",
  },
  {
    key: "right",
    title: "5. บูช / ปลอกเพลา / ซีล",
    enTitle: "Bushing / Sleeve / Shaft / Seal",
    desc: "ภาพบูช, ปลอกเพลา, แบริ่ง, หรือแมคคานิคอลซีล",
    badge: "จุดเสีย 3",
  },
  {
    key: "top",
    title: "6. เศษชิ้นส่วน / อื่นๆ",
    enTitle: "Broken Fragments / Others",
    desc: "ภาพเศษชิ้นส่วนที่แตกหัก หรือชิ้นส่วนอื่นๆ ที่ชำรุด",
    badge: "จุดเสีย 4",
  },
];

export const MOTOR_PHOTO_SLOTS: {
  key: PhotoKey;
  title: string;
  enTitle: string;
  desc: string;
  badge?: string;
}[] = [
  {
    key: "nameplate",
    title: "1. ป้ายเนมเพลทมอเตอร์",
    enTitle: "Motor Nameplate",
    desc: "แสดงใต้ตาราง 11 คอลัมน์ (MOTOR FAULTY REPORT)",
    badge: "เนมเพลท",
  },
  {
    key: "left",
    title: "2. ความเสียหายของมอเตอร์ (สายสี น้ำตาล กับ ดำ)",
    enTitle: "Motor Damage (Brown - Black)",
    desc: "ภาพถ่ายจุดชำรุดเสียหายขดลวด ระหว่างสายสีน้ำตาลกับดำ",
    badge: "น้ำตาล - ดำ",
  },
  {
    key: "front",
    title: "3. ความเสียหายของมอเตอร์ (สายสี ดำ กับ เทา)",
    enTitle: "Motor Damage (Black - Grey)",
    desc: "ภาพถ่ายจุดชำรุดเสียหายขดลวด ระหว่างสายสีดำกับเทา",
    badge: "ดำ - เทา",
  },
  {
    key: "right",
    title: "4. ความเสียหายของมอเตอร์ (สายสี น้ำตาล กับ เทา)",
    enTitle: "Motor Damage (Brown - Grey)",
    desc: "ภาพถ่ายจุดชำรุดเสียหายขดลวด ระหว่างสายสีน้ำตาลกับเทา",
    badge: "น้ำตาล - เทา",
  },
  {
    key: "inside",
    title: "5. ภาพรวมตัวมอเตอร์ / อื่นๆ",
    enTitle: "Motor Assembly / Others",
    desc: "ภาพถ่ายตัวมอเตอร์ทั้งตัว หรืออุปกรณ์ส่วนประกอบอื่นๆ",
    badge: "ตัวมอเตอร์",
  },
];

export const INVERTER_PHOTO_SLOTS: {
  key: PhotoKey;
  title: string;
  enTitle: string;
  desc: string;
  badge?: string;
}[] = [
  {
    key: "front",
    title: "1. ด้านหน้า (Front)",
    enTitle: "Front View",
    desc: "รูปถ่ายด้านหน้าเครื่องตรง แสดงใน INVERTER & SOFTSTATER FAULT REPORT",
    badge: "ด้านหน้า (หน้า 1)",
  },
  {
    key: "nameplate",
    title: "2. เนมเพลท (Nameplate)",
    enTitle: "Nameplate & S/N",
    desc: "รูปถ่ายป้ายชื่อและสเปกเครื่อง แสดงใน INVERTER & SOFTSTATER FAULT REPORT",
    badge: "เนมเพลท (หน้า 1)",
  },
  {
    key: "inside",
    title: "3. ความเสียหายของบอร์ด (Board Damage)",
    enTitle: "Board / IGBT Damage",
    desc: "รูปถ่ายจุดชำรุดเสียหาย บอร์ดไหม้ Module IGBT หรืออุปกรณ์ชำรุด",
    badge: "ความเสียหายบอร์ด (หน้า 1)",
  },
  {
    key: "left",
    title: "4. ด้านซ้าย",
    enTitle: "Left",
    desc: "รูปถ่ายฝั่งซ้ายของตัวเครื่องอินเวอร์เตอร์",
    badge: "ด้านซ้าย",
  },
  {
    key: "right",
    title: "5. ด้านขวา",
    enTitle: "Right",
    desc: "รูปถ่ายฝั่งขวาของตัวเครื่องอินเวอร์เตอร์",
    badge: "ด้านขวา",
  },
  {
    key: "top",
    title: "6. ด้านบน",
    enTitle: "Top",
    desc: "รูปถ่ายด้านบนตัวเครื่องอินเวอร์เตอร์",
    badge: "ด้านบน",
  },
  {
    key: "fan",
    title: "7. พัดลมระบายความร้อน",
    enTitle: "Cooling Fan",
    desc: "รูปถ่ายพัดลมระบายความร้อนตัวเครื่อง",
    badge: "พัดลม",
  },
  {
    key: "terminal",
    title: "8. บล็อคเทอร์มินอล",
    enTitle: "Terminal Block",
    desc: "รูปถ่ายบล็อคต่อสายไฟและสายคอนโทรล",
    badge: "บล็อคเทอร์มินอล",
  },
];

export const CABINET_PHOTO_SLOTS: {
  key: PhotoKey;
  title: string;
  enTitle: string;
  desc: string;
  badge?: string;
}[] = [
  {
    key: "front",
    title: "1. ด้านหน้า",
    enTitle: "Front",
    desc: "รูปถ่ายด้านหน้าตู้ควบคุมระบบไฟฟ้า",
    badge: "ด้านหน้า",
  },
  {
    key: "left",
    title: "2. ด้านซ้าย",
    enTitle: "Left",
    desc: "รูปถ่ายฝั่งซ้ายของตู้ควบคุม",
    badge: "ด้านซ้าย",
  },
  {
    key: "right",
    title: "3. ด้านขวา",
    enTitle: "Right",
    desc: "รูปถ่ายฝั่งขวาของตู้ควบคุม",
    badge: "ด้านขวา",
  },
  {
    key: "top",
    title: "4. ด้านบน",
    enTitle: "Top",
    desc: "รูปถ่ายด้านบนตัวตู้ควบคุม",
    badge: "ด้านบน",
  },
  {
    key: "fan",
    title: "5. พัดลม",
    enTitle: "Fan",
    desc: "รูปถ่ายพัดลมระบายความร้อนตู้ควบคุม",
    badge: "พัดลม",
  },
  {
    key: "inside",
    title: "6. ด้านใน",
    enTitle: "Inside",
    desc: "รูปถ่ายอุปกรณ์และแผงวงจรด้านในตู้ควบคุม",
    badge: "ด้านใน",
  },
  {
    key: "terminal",
    title: "7. น็อตเทอร์มินอล",
    enTitle: "Terminal Screws / Nuts",
    desc: "รูปถ่ายน็อตเทอร์มินอลและจุดต่อสายไฟ",
    badge: "น็อตเทอร์มินอล",
  },
  {
    key: "nameplate",
    title: "8. เนมเพลท",
    enTitle: "Nameplate",
    desc: "รูปถ่ายป้ายเนมเพลทตู้ควบคุมระบบไฟฟ้า",
    badge: "เนมเพลท",
  },
];

function generateUploadSuffix(): string {
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

interface CheckReportFormProps {
  initialData?: any;
  users?: any[];
  companies?: any[];
  currentUserName?: string;
  isEdit?: boolean;
}

export default function CheckReportForm({
  initialData,
  users = [],
  companies = [],
  currentUserName = "",
  isEdit = false,
}: CheckReportFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Equipment Type Selection
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(
    (initialData?.equipmentType as EquipmentType) || "INVERTER"
  );

  // Tabbed view mode to avoid overwhelming long scroll
  const [activeTab, setActiveTab] = useState<string>("customer");
  const [viewMode, setViewMode] = useState<"tabbed" | "all">("tabbed");

  // Linked Repair Order (RO) State
  const [convertedJobNumber, setConvertedJobNumber] = useState(
    initialData?.convertedJobNumber || ""
  );
  const [convertedJobId, setConvertedJobId] = useState(
    initialData?.convertedJobId || ""
  );
  const [convertedRepairOrderId, setConvertedRepairOrderId] = useState(
    initialData?.convertedRepairOrderId || ""
  );
  const [roSearchQuery, setRoSearchQuery] = useState("");
  const [roSearchResults, setRoSearchResults] = useState<any[]>([]);
  const [isSearchingRo, setIsSearchingRo] = useState(false);
  const [isRoDropdownOpen, setIsRoDropdownOpen] = useState(false);
  const roSearchRef = useRef<HTMLDivElement>(null);
  const roSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Approver / Reviewer (Typed name - no signature required)
  const [approvedByName, setApprovedByName] = useState(
    initialData?.approvedByName || initialData?.reportBy || ""
  );
  const [approvedDate, setApprovedDate] = useState(
    initialData?.approvedDate
      ? new Date(initialData.approvedDate).toISOString().split("T")[0]
      : ""
  );
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);
  const approverDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [crNumber, setCrNumber] = useState(initialData?.crNumber || "");
  const [checkDate, setCheckDate] = useState(
    initialData?.checkDate
      ? new Date(initialData.checkDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [companyCode, setCompanyCode] = useState(initialData?.companyCode || "TG");

  // Customer Info
  const [customerCompany, setCustomerCompany] = useState(initialData?.customerCompany || "");
  const [customerName, setCustomerName] = useState(initialData?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || "");
  const [customerAddress, setCustomerAddress] = useState(initialData?.customerAddress || "");

  // Sales Person Searchable Dropdown State
  const [salesPerson, setSalesPerson] = useState(initialData?.salesPerson || "");
  const [salesSearchQuery, setSalesSearchQuery] = useState(initialData?.salesPerson || "");
  const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);
  const salesDropdownRef = useRef<HTMLDivElement>(null);

  // Inspector Searchable Dropdown State
  const [inspectorName, setInspectorName] = useState(
    initialData?.inspectorName || currentUserName || ""
  );
  const [isInspectorDropdownOpen, setIsInspectorDropdownOpen] = useState(false);
  const inspectorDropdownRef = useRef<HTMLDivElement>(null);

  // Customer Autocomplete Search
  const [companySearchQuery, setCompanySearchQuery] = useState(initialData?.customerCompany || "");
  const [recentCompanies, setRecentCompanies] = useState<any[]>(companies || []);
  const [searchResults, setSearchResults] = useState<any[]>(companies || []);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (companies && companies.length > 0) {
      setRecentCompanies(companies);
      setSearchResults(companies);
    } else {
      getRecentCompaniesForCheckReport()
        .then((res) => {
          if (res && res.length > 0) {
            setRecentCompanies(res);
            setSearchResults(res);
          }
        })
        .catch((err) => console.error("Error loading recent companies:", err));
    }
  }, [companies]);

  // Available contacts for selected company
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [selectedCompanyMeta, setSelectedCompanyMeta] = useState<{
    id?: string;
    companyName?: string;
    assignedSales?: string;
    contactsCount?: number;
  } | null>(null);

  const handleEquipmentTypeChange = (type: EquipmentType) => {
    setEquipmentType(type);
    if (type === "INVERTER") {
      if (!inverterBrand || inverterBrand === "TERA GROUP") setInverterBrand("INVT");
    } else if (type === "CONTROL_CABINET") {
      if (!inverterBrand || inverterBrand === "INVT") setInverterBrand("TERA GROUP");
    } else if (type === "MOTOR" || type === "PUMP") {
      if (inverterBrand === "INVT" || inverterBrand === "TERA GROUP") setInverterBrand("");
    }
    // If on voltage tab but switched to MOTOR/PUMP which has no voltage tab, fallback
    if ((type === "MOTOR" || type === "PUMP") && activeTab === "voltage") {
      setActiveTab(type === "PUMP" ? "specs" : "inspection");
    }
    if (type === "PUMP" && (activeTab === "inspection" || activeTab === "inverter_check")) {
      setActiveTab("specs");
    }
    if (type !== "CONTROL_CABINET" && activeTab === "inverter_check") {
      setActiveTab("inspection");
    }
  };

  // Control Cabinet Inverter Configuration: Does this cabinet have an Inverter / Soft Starter?
  const [hasInverterInCabinet, setHasInverterInCabinet] = useState<boolean>(() => {
    if (initialData?.equipmentType === "CONTROL_CABINET") {
      if (initialData?.diodeMeasurement?.hasInverter !== undefined) {
        return Boolean(initialData.diodeMeasurement.hasInverter);
      }
      const dm = initialData?.diodeMeasurement || {};
      if (
        dm.igbtStatus ||
        dm.inverterModel ||
        dm.meterPhotoDiode ||
        dm.pos_to_r_black ||
        dm.phaseShortCheck
      ) {
        return true;
      }
      return true;
    }
    return true;
  });

  // Equipment Spec
  const [inverterBrand, setInverterBrand] = useState(
    initialData?.inverterBrand || (initialData?.equipmentType === "CONTROL_CABINET" ? "TERA GROUP" : "INVT")
  );
  const [inverterModel, setInverterModel] = useState(initialData?.inverterModel || "");
  const [serialNumber, setSerialNumber] = useState(initialData?.serialNumber || "");
  const [motorKw, setMotorKw] = useState(initialData?.motorKw || "");
  const [applicationLoad, setApplicationLoad] = useState(initialData?.applicationLoad || "");
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate
      ? new Date(initialData.purchaseDate).toISOString().split("T")[0]
      : ""
  );
  const [saleDate, setSaleDate] = useState(
    initialData?.saleDate
      ? new Date(initialData.saleDate).toISOString().split("T")[0]
      : ""
  );
  const [faultDate, setFaultDate] = useState(
    initialData?.faultDate
      ? new Date(initialData.faultDate).toISOString().split("T")[0]
      : ""
  );
  const [warrantyStatus, setWarrantyStatus] = useState(
    initialData?.warrantyStatus || "EXPIRED"
  );

  // Diagnosis & Symptoms
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "");
  const [causeOfFault, setCauseOfFault] = useState(initialData?.causeOfFault || "");
  const [recommendations, setRecommendations] = useState(initialData?.recommendations || "");

  // Required Parts
  const [requireParts, setRequireParts] = useState<{ partName: string; qty: number }[]>(
    initialData?.requireParts?.length ? initialData.requireParts : [{ partName: "", qty: 1 }]
  );

  // Technical Measurements
  const [diodeMeasurement, setDiodeMeasurement] = useState<DiodeMeasurement>(
    initialData?.diodeMeasurement || {}
  );
  const [powerInputVoltage, setPowerInputVoltage] = useState<Partial<PowerVoltageCheck>>(
    initialData?.powerInputVoltage || {}
  );
  const [powerOutputVoltage, setPowerOutputVoltage] = useState<Partial<PowerVoltageCheck>>(
    initialData?.powerOutputVoltage || {}
  );
  const [panelComponentsCheck, setPanelComponentsCheck] = useState<PanelComponentItem[]>(
    initialData?.panelComponentsCheck?.length
      ? initialData.panelComponentsCheck
      : DEFAULT_PANEL_COMPONENTS
  );
  const [motorMeasurement, setMotorMeasurement] = useState<MotorMeasurement>(
    initialData?.motorMeasurement || {}
  );

  // Photos: exactly 1 photo per side
  const [photos, setPhotos] = useState<CheckReportPhotos>(() => {
    const raw = initialData?.photos || {};
    const normalized: CheckReportPhotos = {};
    PHOTO_SLOTS.forEach((slot) => {
      const existing = raw[slot.key];
      if (Array.isArray(existing) && existing.length > 0) {
        normalized[slot.key] = [existing[0]];
      } else if (typeof existing === "string" && existing) {
        normalized[slot.key] = [existing];
      } else {
        normalized[slot.key] = [];
      }
    });
    return normalized;
  });

  // Dynamic Tabs based on Equipment Type
  const tabs = useMemo(() => {
    if (equipmentType === "INVERTER") {
      return [
        { id: "customer", label: "1. เอกสาร & ลูกค้า", icon: Building2 },
        { id: "specs", label: "2. ข้อมูล Inverter & อาการเสีย", icon: Zap },
        { id: "inspection", label: "3. ตรวจเช็ค 6 รายการ & พารามิเตอร์", icon: CheckCircle2 },
        { id: "voltage", label: "4. แรงดันไฟ (Power Voltage)", icon: Activity },
        { id: "diagnosis", label: "5. สาเหตุ & อะไหล่", icon: AlertCircle },
        { id: "photos", label: "6. รูปถ่ายสินค้า 8 ด้าน", icon: ImageIcon },
        { id: "signatures", label: "7. ผู้ตรวจสอบ & อนุมัติ", icon: UserCheck },
      ];
    } else if (equipmentType === "CONTROL_CABINET") {
      if (hasInverterInCabinet) {
        return [
          { id: "customer", label: "1. เอกสาร & ลูกค้า", icon: Building2 },
          { id: "specs", label: "2. ข้อมูลตู้ & อินเวอร์เตอร์", icon: Layers },
          { id: "inspection", label: "3. เช็คอุปกรณ์ในตู้ 13 รายการ", icon: CheckCircle2 },
          { id: "inverter_check", label: "4. ตรวจเช็ค Inverter (Diode / IGBT)", icon: Zap },
          { id: "voltage", label: "5. แรงดันไฟ (Power Voltage)", icon: Activity },
          { id: "diagnosis", label: "6. สาเหตุ & อะไหล่", icon: AlertCircle },
          { id: "photos", label: "7. รูปถ่ายตู้คอนโทรล 8 ด้าน", icon: ImageIcon },
          { id: "signatures", label: "8. ผู้ตรวจสอบ & อนุมัติ", icon: UserCheck },
        ];
      } else {
        return [
          { id: "customer", label: "1. เอกสาร & ลูกค้า", icon: Building2 },
          { id: "specs", label: "2. ข้อมูลตู้คอนโทรล & อาการเสีย", icon: Layers },
          { id: "inspection", label: "3. เช็คอุปกรณ์ในตู้ 13 รายการ", icon: CheckCircle2 },
          { id: "voltage", label: "4. แรงดันไฟ (Power Voltage)", icon: Activity },
          { id: "diagnosis", label: "5. สาเหตุ & อะไหล่", icon: AlertCircle },
          { id: "photos", label: "6. รูปถ่ายตู้คอนโทรล 8 ด้าน", icon: ImageIcon },
          { id: "signatures", label: "7. ผู้ตรวจสอบ & อนุมัติ", icon: UserCheck },
        ];
      }
    } else if (equipmentType === "MOTOR") {
      return [
        { id: "customer", label: "1. เอกสาร & ลูกค้า", icon: Building2 },
        { id: "specs", label: "2. ข้อมูลมอเตอร์ & สาเหตุเสีย (11 คอลัมน์)", icon: Cog },
        { id: "inspection", label: "3. วัดขดลวด (3 สายสี) & ฉนวน", icon: CheckCircle2 },
        { id: "diagnosis", label: "4. สาเหตุ & อะไหล่", icon: AlertCircle },
        { id: "photos", label: "5. รูปเนมเพลท & ความเสียหายขดลวด", icon: ImageIcon },
        { id: "signatures", label: "6. ผู้ทำรายงาน", icon: UserCheck },
      ];
    } else {
      return [
        { id: "customer", label: "1. เอกสาร & ลูกค้า", icon: Building2 },
        { id: "specs", label: "2. ข้อมูลปั๊มน้ำ & สาเหตุเสีย (11 คอลัมน์)", icon: Droplets },
        { id: "diagnosis", label: "3. ข้อเสนอแนะ & อะไหล่", icon: AlertCircle },
        { id: "photos", label: "4. รูปถ่ายปั๊มน้ำ & เนมเพลท", icon: ImageIcon },
        { id: "signatures", label: "5. ผู้ทำรายงาน & อนุมัติ", icon: UserCheck },
      ];
    }
  }, [equipmentType, hasInverterInCabinet]);

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);
  const prevTab = currentTabIndex > 0 ? tabs[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < tabs.length - 1 ? tabs[currentTabIndex + 1] : null;

  // Auto-generate CR Number for new records
  useEffect(() => {
    if (!isEdit && !crNumber) {
      generateCrNumber()
        .then((num) => setCrNumber(num))
        .catch((err) => console.error("Failed to generate CR number:", err));
    }
  }, [isEdit, crNumber]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsCompanyDropdownOpen(false);
      }
      if (
        salesDropdownRef.current &&
        !salesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSalesDropdownOpen(false);
      }
      if (
        inspectorDropdownRef.current &&
        !inspectorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsInspectorDropdownOpen(false);
      }
      if (
        approverDropdownRef.current &&
        !approverDropdownRef.current.contains(event.target as Node)
      ) {
        setIsApproverDropdownOpen(false);
      }
      if (
        roSearchRef.current &&
        !roSearchRef.current.contains(event.target as Node)
      ) {
        setIsRoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter Sales Users
  const filteredSalesUsers = useMemo(() => {
    const q = salesSearchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.fullName || "").toLowerCase();
      const nickname = (u.employeeSale?.nickname || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      const phone = (u.phoneNumber || "").toLowerCase();
      return (
        name.includes(q) ||
        nickname.includes(q) ||
        role.includes(q) ||
        phone.includes(q)
      );
    });
  }, [users, salesSearchQuery]);

  const selectSalesRep = (u: any) => {
    const repName = u.employeeSale?.nickname
      ? `${u.fullName} (${u.employeeSale.nickname})`
      : u.fullName;
    setSalesPerson(repName);
    setSalesSearchQuery(repName);
    setIsSalesDropdownOpen(false);
  };

  // Helper function to strip Thai prefixes
  const stripThaiPrefix = (name: string) => {
    return name
      .replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|mr\.|mrs\.|ms\.)\s*/i, "")
      .trim();
  };

  // Filter Inspector Users
  const filteredInspectors = useMemo(() => {
    const q = inspectorName.toLowerCase().trim();
    if (!q) return users;
    const cleanQ = stripThaiPrefix(q);
    return users.filter((u) => {
      const rawName = (u.fullName || "").toLowerCase();
      const cleanName = stripThaiPrefix(rawName).toLowerCase();
      const role = (u.role || "").toLowerCase();
      return (
        rawName.includes(q) ||
        cleanName.includes(cleanQ) ||
        role.includes(q)
      );
    });
  }, [users, inspectorName]);

  const selectInspector = (u: any) => {
    const nameWithRole = u.role ? `${u.fullName} (${u.role})` : u.fullName;
    setInspectorName(nameWithRole);
    setIsInspectorDropdownOpen(false);
  };

  // Filter Approver Users
  const filteredApprovers = useMemo(() => {
    const q = approvedByName.toLowerCase().trim();
    if (!q) return users;
    const cleanQ = stripThaiPrefix(q);
    return users.filter((u) => {
      const rawName = (u.fullName || "").toLowerCase();
      const cleanName = stripThaiPrefix(rawName).toLowerCase();
      const role = (u.role || "").toLowerCase();
      return (
        rawName.includes(q) ||
        cleanName.includes(cleanQ) ||
        role.includes(q)
      );
    });
  }, [users, approvedByName]);

  const selectApprover = (u: any) => {
    const nameWithRole = u.role ? `${u.fullName} (${u.role})` : u.fullName;
    setApprovedByName(nameWithRole);
    setIsApproverDropdownOpen(false);
  };

  // Debounced search for Repair Orders
  const handleRoSearchChange = (val: string) => {
    setRoSearchQuery(val);
    setIsRoDropdownOpen(true);

    if (roSearchTimeoutRef.current) {
      clearTimeout(roSearchTimeoutRef.current);
    }

    if (val.trim().length >= 1) {
      setIsSearchingRo(true);
      roSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchRepairOrdersForCheckReport(val.trim());
          setRoSearchResults(results || []);
        } catch (err) {
          console.error("Failed to search repair orders:", err);
        } finally {
          setIsSearchingRo(false);
        }
      }, 300);
    } else {
      setRoSearchResults([]);
      setIsSearchingRo(false);
    }
  };

  // Sync Voltage from QC Data
  const syncQcVoltage = (qcData: any) => {
    if (!qcData) return;
    const itemQc = Array.isArray(qcData.itemsQc) ? qcData.itemsQc[0] : qcData;
    if (itemQc?.inputVoltage) {
      setPowerInputVoltage({
        inputDc: itemQc.inputVoltage?.dcSinglePhase?.value || "",
        input1PhaseAc: itemQc.inputVoltage?.acSinglePhase?.value || "",
        input3PhaseRs: itemQc.inputVoltage?.acThreePhase?.rs || "",
        input3PhaseRt: itemQc.inputVoltage?.acThreePhase?.rt || "",
        input3PhaseSt: itemQc.inputVoltage?.acThreePhase?.st || "",
      });
    }
    if (itemQc?.outputVoltage) {
      setPowerOutputVoltage({
        output1PhaseLn: itemQc.outputVoltage?.singlePhase220?.ln || "",
        output3Phase220Uv: itemQc.outputVoltage?.threePhase220?.uv || "",
        output3Phase220Uw: itemQc.outputVoltage?.threePhase220?.uw || "",
        output3Phase220Vw: itemQc.outputVoltage?.threePhase220?.vw || "",
        output3Phase380Uv: itemQc.outputVoltage?.threePhase380?.uv || "",
        output3Phase380Uw: itemQc.outputVoltage?.threePhase380?.uw || "",
        output3Phase380Vw: itemQc.outputVoltage?.threePhase380?.vw || "",
      });
    }
  };

  const handleSyncQc = async () => {
    if (!convertedRepairOrderId) {
      Swal.fire({
        icon: "info",
        title: "ยังไม่ได้เชื่อมโยงกับใบรับซ่อม",
        text: "กรุณาเลือกค้นหาหรือเชื่อมโยงกับใบรับซ่อม (RO) ในแท็บเอกสารก่อนเพื่อดึงค่าแรงดันจากการตรวจ QC",
      });
      return;
    }
    try {
      const res = await getRepairOrderForCheckReport(convertedRepairOrderId);
      const ro: any = res?.data;
      if (!res?.success || !ro || !ro.inverterQc) {
        Swal.fire({
          icon: "warning",
          title: "ไม่พบข้อมูล QC ในใบรับซ่อมนี้",
          text: "ใบรับซ่อมนี้ยังไม่มีการบันทึกผลการทดสอบแรงดัน QC หลังซ่อม",
        });
        return;
      }
      syncQcVoltage(ro.inverterQc);
      Swal.fire({
        icon: "success",
        title: "ดึงข้อมูลแรงดัน QC สำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Failed to sync QC voltage:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถดึงข้อมูล QC ได้",
      });
    }
  };

  const selectRepairOrder = (order: any) => {
    setConvertedJobNumber(order.job?.jobNumber || "");
    setConvertedJobId(order.jobId || "");
    setConvertedRepairOrderId(order.id || "");

    if (order.customerCompany) {
      setCustomerCompany(order.customerCompany);
      setCompanySearchQuery(order.customerCompany);
    }
    if (order.customerAddress) setCustomerAddress(order.customerAddress);
    if (order.phoneNumber) setCustomerPhone(order.phoneNumber);
    if (order.senderName || order.receiverName) {
      setCustomerName(order.senderName || order.receiverName || "");
    }
    if (order.salesPerson) {
      setSalesPerson(order.salesPerson);
      setSalesSearchQuery(order.salesPerson);
    }
    if (order.symptoms) setSymptoms(order.symptoms);

    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    if (items.length > 0) {
      const firstItem = items[0] || {};
      if (firstItem.brand) setInverterBrand(firstItem.brand);
      if (firstItem.model) setInverterModel(firstItem.model);
      if (firstItem.serial) setSerialNumber(firstItem.serial);
      if (firstItem.size) setMotorKw(firstItem.size);

      const itemType = (firstItem.type || "").toUpperCase();
      if (itemType.includes("ตู้") || itemType.includes("CABINET") || itemType.includes("PANEL")) {
        setEquipmentType("CONTROL_CABINET");
      } else if (itemType.includes("มอเตอร์") || itemType.includes("MOTOR")) {
        setEquipmentType("MOTOR");
      } else if (itemType.includes("ปั๊ม") || itemType.includes("PUMP")) {
        setEquipmentType("PUMP");
      } else {
        setEquipmentType("INVERTER");
      }
    }

    const rawComp = (order.company || "").toUpperCase();
    if (rawComp === "TP" || rawComp.includes("POWER")) setCompanyCode("TP");
    else if (rawComp === "TE" || rawComp.includes("ELECTRIC") || rawComp.includes("ENERGY")) setCompanyCode("TE");
    else setCompanyCode("TG");

    if (order.inverterQc) {
      syncQcVoltage(order.inverterQc);
    }

    setIsRoDropdownOpen(false);
    setRoSearchQuery("");

    Swal.fire({
      icon: "success",
      title: "เชื่อมโยงใบรับซ่อมเรียบร้อย",
      text: `ดึงข้อมูลจากใบรับซ่อมเลขที่ ${order.job?.jobNumber || ""}`,
      timer: 1600,
      showConfirmButton: false,
    });
  };

  // Search company debounce with searchCompaniesForCheckReport & instant local cache
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestSearchRequestIdRef = useRef<number>(0);

  const handleCompanySearchChange = (val: string) => {
    setCompanySearchQuery(val);
    setCustomerCompany(val);
    setIsCompanyDropdownOpen(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setSearchResults(recentCompanies);
      setIsSearchingCompany(false);
      return;
    }

    // 1. Instant client-side match against preloaded recent companies (0ms response!)
    if (recentCompanies.length > 0) {
      const qLower = trimmed.toLowerCase();
      const localMatches = recentCompanies.filter((c: any) => {
        const name = (c.companyName || "").toLowerCase();
        const tax = (c.taxId || "").toLowerCase();
        const contact = c.contacts?.some(
          (ct: any) =>
            (ct.contactName || "").toLowerCase().includes(qLower) ||
            (ct.mobilePhone || "").includes(trimmed)
        );
        return name.includes(qLower) || tax.includes(qLower) || contact;
      });
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      }
    }

    // 2. Concurrently fetch fresh server results with request tracking
    const requestId = ++latestSearchRequestIdRef.current;
    setIsSearchingCompany(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchCompaniesForCheckReport(trimmed);
        if (requestId === latestSearchRequestIdRef.current) {
          setSearchResults(res || []);
        }
      } catch (err) {
        console.error("Search company error:", err);
      } finally {
        if (requestId === latestSearchRequestIdRef.current) {
          setIsSearchingCompany(false);
        }
      }
    }, 200);
  };

  const selectCompany = (comp: any) => {
    const name = comp.companyName || "";
    setCustomerCompany(name);
    setCompanySearchQuery(name);

    const addressParts = [
      comp.address,
      comp.subDistrict
        ? comp.subDistrict.startsWith("ต.") || comp.subDistrict.startsWith("แขวง")
          ? comp.subDistrict
          : `ต.${comp.subDistrict}`
        : "",
      comp.district
        ? comp.district.startsWith("อ.") || comp.district.startsWith("เขต")
          ? comp.district
          : `อ.${comp.district}`
        : "",
      comp.province
        ? comp.province.startsWith("จ.")
          ? comp.province
          : `จ.${comp.province}`
        : "",
      comp.postalCode || "",
    ].filter(Boolean);
    const fullAddr = addressParts.join(" ").trim();
    setCustomerAddress(fullAddr || comp.address || "");

    const contacts = (comp.contacts || []).map((c: any) => ({
      ...c,
      contactName: (c.contactName || "").replace(/[\t\r\n]+/g, " ").trim(),
      mobilePhone: (c.mobilePhone || "").trim(),
    }));
    setAvailableContacts(contacts);

    if (contacts.length > 0) {
      const first = contacts[0];
      setCustomerName(first.contactName);
      setCustomerPhone(first.mobilePhone || "");
    }

    if (comp.assignedUser?.fullName) {
      const repName = comp.assignedUser.employeeSale?.nickname
        ? `${comp.assignedUser.fullName} (${comp.assignedUser.employeeSale.nickname})`
        : comp.assignedUser.fullName;
      setSalesPerson(repName);
      setSalesSearchQuery(repName);
    }

    setSelectedCompanyMeta({
      id: comp.id,
      companyName: comp.companyName,
      assignedSales: comp.assignedUser?.fullName,
      contactsCount: contacts.length,
    });

    setSearchResults([]);
    setIsCompanyDropdownOpen(false);
  };

  // Add/Remove parts
  const addPartRow = () => {
    setRequireParts([...requireParts, { partName: "", qty: 1 }]);
  };

  const removePartRow = (idx: number) => {
    setRequireParts(requireParts.filter((_, i) => i !== idx));
  };

  const updatePartRow = (idx: number, field: "partName" | "qty", val: string | number) => {
    const next = [...requireParts];
    next[idx] = { ...next[idx], [field]: val };
    setRequireParts(next);
  };

  // Image Upload handler to Supabase (1 photo per side)
  const handlePhotoUpload = async (category: PhotoKey, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();

      const file = files[0];
      if (file.size > 20 * 1024 * 1024) {
        Swal.fire({
          icon: "warning",
          title: "ไฟล์ขนาดใหญ่เกิน 20MB",
          text: file.name,
        });
        return;
      }

      const uniqueSuffix = generateUploadSuffix();
      const filename = `cr-${category}-${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { data, error } = await supabase.storage
        .from("uploadsService")
        .upload(filename, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("uploadsService").getPublicUrl(data.path);

      setPhotos((prev) => ({
        ...prev,
        [category]: [publicUrl],
      }));
    } catch (err: any) {
      console.error("Upload failed:", err);
      Swal.fire({
        icon: "error",
        title: "อัปโหลดรูปไม่สำเร็จ",
        text: err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (category: PhotoKey) => {
    setPhotos((prev) => ({
      ...prev,
      [category]: [],
    }));
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent, skipRedirect = false): Promise<boolean> => {
    if (e) e.preventDefault();

    if (!crNumber.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุเลขที่เอกสาร CR",
        confirmButtonColor: "#ff2301",
      });
      setActiveTab("customer");
      return false;
    }

    if (!customerCompany.trim() && !customerName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อลูกค้าหรือบริษัท",
        confirmButtonColor: "#ff2301",
      });
      setActiveTab("customer");
      return false;
    }

    if (!symptoms.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุอาการเสีย",
        text: "กรุณาระบุอาการเสียของอุปกรณ์เพื่อประกอบการวินิจฉัย",
        confirmButtonColor: "#ff2301",
      });
      setActiveTab("specs");
      return false;
    }

    setIsSubmitting(true);
    try {
      const payload: InverterCheckReportFormData = {
        equipmentType,
        crNumber: crNumber.trim(),
        checkDate,
        companyCode,
        customerCompany: customerCompany.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        salesPerson: salesPerson.trim(),
        inspectorName: inspectorName.trim(),
        approvedByName: approvedByName.trim() || undefined,
        approvedDate: approvedDate || undefined,
        convertedJobId: convertedJobId || undefined,
        convertedJobNumber: convertedJobNumber || undefined,
        convertedRepairOrderId: convertedRepairOrderId || undefined,
        inverterBrand: inverterBrand.trim(),
        inverterModel: inverterModel.trim(),
        serialNumber: serialNumber.trim(),
        motorKw: motorKw.trim(),
        applicationLoad: applicationLoad.trim(),
        purchaseDate: purchaseDate || undefined,
        saleDate: saleDate || undefined,
        faultDate: faultDate || undefined,
        warrantyStatus,
        symptoms: symptoms.trim(),
        causeOfFault: causeOfFault.trim(),
        recommendations: recommendations.trim(),
        requireParts: requireParts.filter((p) => p.partName.trim()),
        hasInverterInCabinet,
        diodeMeasurement: {
          ...diodeMeasurement,
          hasInverter: equipmentType === "CONTROL_CABINET" ? hasInverterInCabinet : true,
        },
        powerInputVoltage,
        powerOutputVoltage,
        panelComponentsCheck,
        motorMeasurement,
        photos,
        reportBy: approvedByName.trim() || currentUserName,
      };

      let res;
      if (isEdit && initialData?.id) {
        res = await updateInverterCheckReport(initialData.id, payload);
      } else {
        res = await createInverterCheckReport(payload);
      }

      if (!res.success) {
        Swal.fire({
          icon: "error",
          title: "บันทึกไม่สำเร็จ",
          text: res.error || "เกิดข้อผิดพลาดในการบันทึก",
          confirmButtonColor: "#ff2301",
        });
        setIsSubmitting(false);
        return false;
      }

      if (!skipRedirect) {
        Swal.fire({
          icon: "success",
          title: isEdit ? "แก้ไขรายงานเรียบร้อยแล้ว" : "บันทึกรายงานตรวจเช็คเรียบร้อยแล้ว",
          timer: 1500,
          showConfirmButton: false,
        });

        router.push("/service/check-reports");
        router.refresh();
      }
      return true;
    } catch (err: any) {
      console.error("Submit error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message,
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!initialData?.id) return;
    const ok = await handleSubmit(undefined, true);
    if (ok) {
      const targetTab =
        equipmentType === "PUMP"
          ? "pump_th"
          : equipmentType === "MOTOR"
          ? "motor_th"
          : equipmentType === "INVERTER"
          ? "check_list"
          : "cr";
      window.open(
        `/service/check-reports/${initialData.id}/print?tab=${targetTab}`,
        "_blank"
      );
    }
  };

  // Helper renderer for Tab Footer
  const renderTabFooter = () => {
    if (viewMode === "all") return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 mt-6">
        <button
          type="button"
          disabled={!prevTab}
          onClick={() => prevTab && setActiveTab(prevTab.id)}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{prevTab ? `ย้อนกลับ: ${prevTab.label}` : "ย้อนกลับ"}</span>
        </button>

        <div className="text-xs text-slate-500 font-medium">
          หัวข้อ {currentTabIndex + 1} จาก {tabs.length}
        </div>

        <div className="flex items-center gap-2">
          {nextTab ? (
            <button
              type="button"
              onClick={() => setActiveTab(nextTab.id)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>ถัดไป: {nextTab.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
              <span>บันทึกรายงานตรวจเช็ค</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/service/check-reports"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isEdit ? `แก้ไขรายงานตรวจเช็ค (${crNumber})` : "สร้างรายงานตรวจเช็ค & Fault Report ใหม่ (CR)"}
              </h1>
              {initialData?.status && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    STATUS_CONFIG[initialData.status]?.badge || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {STATUS_CONFIG[initialData.status]?.label || initialData.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              บันทึกผลการตรวจวัดทางเทคนิคและวิเคราะห์สาเหตุชำรุด แยกตามประเภทอุปกรณ์อย่างชัดเจน
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEdit && initialData && (
            <>
              <button
                type="button"
                onClick={handleSaveAndPrint}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="บันทึกข้อมูลและเปิดหน้าพิมพ์รายงานทันที"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>พิมพ์รายงาน ({EQUIPMENT_TYPE_CONFIG[equipmentType]?.shortLabel || "CR"})</span>
              </button>

              {convertedJobNumber ? (
                <Link
                  href={`/repair-orders/${convertedRepairOrderId || convertedJobId}/edit`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#ff2301] font-bold text-xs flex items-center gap-1.5 border border-red-200 transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                  <span>ใบรับซ่อม: {convertedJobNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : initialData.status !== "CONVERTED_TO_RO" ? (
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/25 transition-all cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  แปลงเป็นใบรับซ่อม (Convert to RO)
                </button>
              ) : null}
            </>
          )}

          <button
            type="button"
            disabled={isSubmitting || isUploading}
            onClick={() => handleSubmit()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-emerald-400" />
                บันทึกข้อมูล
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ================= STEP 1: EQUIPMENT TYPE SELECTION (TOP PRIORITY) ================= */}
        <div className="bg-white rounded-2xl border-2 border-red-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#ff2301] flex items-center justify-center font-bold shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ขั้นตอนที่ 1: เลือกประเภทอุปกรณ์ที่ตรวจเช็ค (Equipment Type) <span className="text-red-500">*</span>
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกประเภทอุปกรณ์ก่อน เพื่อแยกหัวข้อและแสดงเฉพาะแบบฟอร์มของอุปกรณ์นั้นๆ ทันที
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-[#ff2301] border border-red-200">
              ปัจจุบันเลือก: <b>{EQUIPMENT_TYPE_CONFIG[equipmentType]?.label}</b>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                type: "INVERTER" as const,
                title: "อินเวอร์เตอร์ / Soft Starter",
                sub: "Inverter & Drive System",
                desc: "ตรวจวัดไดโอด Module IGBT, บอร์ดคอนโทรล 24V/10V, ค่าพารามิเตอร์",
                icon: <Zap className="w-5 h-5" />,
              },
              {
                type: "CONTROL_CABINET" as const,
                title: "ตู้คอนโทรลระบบไฟฟ้า",
                sub: "Control Cabinet & Panel",
                desc: "ตรวจวัดแรงดันไฟ Power In/Out และเช็คสภาพอุปกรณ์ในตู้ 13 รายการ",
                icon: <Layers className="w-5 h-5" />,
              },
              {
                type: "MOTOR" as const,
                title: "มอเตอร์ไฟฟ้า (Motor)",
                sub: "Electric Motor Inspection",
                desc: "ตรวจวัดความต้านทานขดลวด (Ω), ค่าฉนวน Megger (MΩ) และสาเหตุชำรุด",
                icon: <Cog className="w-5 h-5" />,
              },
              {
                type: "PUMP" as const,
                title: "ปั๊มน้ำ (Water Pump)",
                sub: "Water Pump Inspection",
                desc: "ตรวจวัดสภาพปั๊มน้ำ ขนาด kW/HP อัตราสูบส่ง Head และสาเหตุชำรุด",
                icon: <Droplets className="w-5 h-5" />,
              },
            ].map((item) => {
              const isSelected = equipmentType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleEquipmentTypeChange(item.type)}
                  className={`relative p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? "bg-red-50/60 border-[#ff2301] shadow-md shadow-red-500/10 ring-2 ring-red-500/30"
                      : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#ff2301] text-white shadow-xs"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}
                      >
                        {item.icon}
                      </div>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#ff2301] bg-white px-2 py-0.5 rounded-full border border-red-200 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          เลือกแล้ว
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-medium">
                          คลิกเพื่อเลือก
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 mb-0.5">
                      {item.title}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {item.sub}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Control Cabinet Configuration (Has Inverter / Soft Starter or Not) */}
          {equipmentType === "CONTROL_CABINET" && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2.5 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>โครงสร้างตู้คอนโทรล: ตู้นี้มี อินเวอร์เตอร์ / Soft Starter หรือไม่?</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          hasInverterInCabinet
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {hasInverterInCabinet
                          ? "✓ มี อินเวอร์เตอร์ / Soft Starter"
                          : "✗ ไม่มี อินเวอร์เตอร์"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ระบุว่าตู้ควบคุมนี้มี Inverter หรือ Soft Starter หรือไม่ เพื่อเปิดส่วนตรวจวัดไดโอด Module IGBT และบอร์ดคอนโทรล
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setHasInverterInCabinet(true)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    hasInverterInCabinet
                      ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      hasInverterInCabinet
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {hasInverterInCabinet && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <span>มี อินเวอร์เตอร์ / Soft Starter (With Inverter / Soft Starter)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      ตู้ควบคุมที่ขับเคลื่อนด้วย Inverter หรือ Soft Starter: จะมีแท็บตรวจเช็คไดโอด Module IGBT, บอร์ดคอนโทรล 24V/10V, สเปก Inverter เพิ่มเข้ามา
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasInverterInCabinet(false);
                    if (activeTab === "inverter_check") {
                      setActiveTab("inspection");
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    !hasInverterInCabinet
                      ? "bg-slate-50 border-slate-700 ring-2 ring-slate-700/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      !hasInverterInCabinet
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {!hasInverterInCabinet && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-700" />
                      <span>ไม่มี อินเวอร์เตอร์ / Soft Starter (Without Inverter / Soft Starter)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      ตู้ควบคุมทั่วไป เช่น ตู้สตาร์ทเตอร์ตรง (DOL), Star-Delta, หรือตู้รีเลย์คอนโทรล: ตรวจเช็คเฉพาะ 13 รายการและแรงดันไฟ
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= STEP 2: SECTION NAVIGATION TABS & VIEW MODE ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3 sticky top-2 z-20">
          {/* Section Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Tabbed vs All */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("tabbed")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "tabbed"
                  ? "bg-white text-slate-900 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="แสดงทีละหัวข้อเพื่อความสะดวก ไม่งง"
            >
              <LayoutList className="w-3.5 h-3.5 text-slate-700" />
              <span>ดูทีละหัวข้อ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "all"
                  ? "bg-white text-slate-900 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="แสดงทุกหัวข้อในหน้าเดียว"
            >
              <ScrollText className="w-3.5 h-3.5 text-slate-700" />
              <span>แสดงทั้งหมด</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: HEADER & CUSTOMER DETAILS ================= */}
        {(viewMode === "all" || activeTab === "customer") && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ข้อมูลเอกสารและลูกค้า (Document & Customer)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลขที่ CR และข้อมูลทั่วไปของการตรวจเช็ค (ออกรายงานหลังใบรับซ่อม)
                  </p>
                </div>
              </div>

              {/* Company Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">สังกัดบริษัท:</span>
                <select
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {COMPANY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linked Repair Order (RO) Block */}
            {convertedJobNumber ? (
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-[#ff2301] flex items-center justify-center font-bold shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      <span>อ้างอิงใบรับซ่อม (Repair Order):</span>
                      <span className="font-mono text-sm text-[#ff2301] font-bold">
                        {convertedJobNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      รายงานนี้ออกหลังจากรับซ่อมและเชื่อมโยงกับใบรับซ่อมเรียบร้อยแล้ว
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/repair-orders/${convertedRepairOrderId || convertedJobId}/edit`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#ff2301] bg-white border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <span>เปิดดูใบรับซ่อม</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setConvertedJobNumber("");
                      setConvertedJobId("");
                      setConvertedRepairOrderId("");
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                    title="เปลี่ยนการเชื่อมโยงใบรับซ่อม"
                  >
                    เปลี่ยน
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="bg-slate-50/80 border border-dashed border-slate-300 rounded-xl p-3.5 space-y-2 relative"
                ref={roSearchRef}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">
                      เลือกและอ้างอิงใบรับซ่อม (Select Repair Order)
                    </span>
                    <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      แนะนำ: รายงานออกหลังใบรับซ่อม
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={roSearchQuery}
                    onChange={(e) => handleRoSearchChange(e.target.value)}
                    onFocus={() => {
                      if (roSearchResults.length > 0) setIsRoDropdownOpen(true);
                    }}
                    placeholder="พิมพ์ค้นหาเลขที่ใบรับซ่อม (เช่น RO67-001) หรือชื่อลูกค้า..."
                    className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  {isSearchingRo && (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {isRoDropdownOpen && roSearchResults.length > 0 && (
                  <div className="absolute left-3.5 right-3.5 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-40 custom-scrollbar p-1.5">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">
                      พบใบรับซ่อม ({roSearchResults.length})
                    </div>
                    {roSearchResults.map((order) => {
                      const firstItem = Array.isArray(order.items) ? order.items[0] : null;
                      return (
                        <div
                          key={order.id}
                          onClick={() => selectRepairOrder(order)}
                          className="p-2 text-xs rounded-lg hover:bg-red-50/60 cursor-pointer border-b border-slate-100 last:border-none flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span className="text-[#ff2301] font-mono">{order.job?.jobNumber || "RO"}</span>
                              <span>•</span>
                              <span>{order.customerCompany || order.job?.customerName || "ไม่ระบุชื่อ"}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {firstItem
                                ? `${firstItem.brand || ""} ${firstItem.model || ""} (S/N: ${firstItem.serial || "-"})`
                                : "ไม่มีข้อมูลสินค้า"}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
                            เลือกใบนี้
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* CR Number */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  เลขที่เอกสาร CR <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  placeholder="เช่น CR69-1019"
                  className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-red-600"
                />
              </div>

              {/* Check Date */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">วันที่ตรวจเช็ค</label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Sales Person Searchable Dropdown */}
              <div className="relative" ref={salesDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">เซลล์ผู้ดูแล (Sales Rep)</label>
                  {salesPerson && (
                    <button
                      type="button"
                      onClick={() => {
                        setSalesPerson("");
                        setSalesSearchQuery("");
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> ล้างค่า
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={salesSearchQuery}
                    onChange={(e) => {
                      setSalesSearchQuery(e.target.value);
                      setIsSalesDropdownOpen(true);
                    }}
                    onFocus={() => setIsSalesDropdownOpen(true)}
                    placeholder="พิมพ์ชื่อเซลล์หรือค้นหา..."
                    className="w-full text-xs px-3 py-2 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 transition-transform cursor-pointer ${
                      isSalesDropdownOpen ? "rotate-180" : ""
                    }`}
                    onClick={() => setIsSalesDropdownOpen(!isSalesDropdownOpen)}
                  />
                </div>

                {isSalesDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-40 custom-scrollbar p-1">
                    {filteredSalesUsers.slice(0, 20).map((u) => (
                      <div
                        key={u.id}
                        onClick={() => selectSalesRep(u)}
                        className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-slate-800">{u.fullName}</span>
                        {u.employeeSale?.nickname && (
                          <span className="text-[10px] text-slate-500">({u.employeeSale.nickname})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer & Company Details with Database Search & Auto-Fill */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Customer Company Search */}
                <div className="relative md:col-span-2 lg:col-span-3" ref={searchContainerRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-red-500" />
                      ชื่อบริษัทลูกค้า / ลูกค้า <span className="text-red-500">*</span>
                    </label>
                    {customerCompany && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerCompany("");
                          setCompanySearchQuery("");
                          setSelectedCompanyMeta(null);
                          setAvailableContacts([]);
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> ล้างข้อมูล
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={companySearchQuery}
                      onChange={(e) => handleCompanySearchChange(e.target.value)}
                      onFocus={() => {
                        setIsCompanyDropdownOpen(true);
                        if (!companySearchQuery.trim() && searchResults.length === 0) {
                          setSearchResults(recentCompanies);
                        }
                      }}
                      placeholder="พิมพ์ชื่อบริษัท, ชื่อผู้ติดต่อ, เลขผู้เสียภาษี หรือเบอร์โทร เพื่อดึงข้อมูลอัตโนมัติ..."
                      className="w-full text-xs px-3 py-2 pr-9 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                    />
                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                      {isSearchingCompany ? (
                        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isCompanyDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto z-40 custom-scrollbar p-1.5 divide-y divide-slate-100">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>
                          {companySearchQuery.trim()
                            ? `ผลการค้นหา (${searchResults.length})`
                            : `ลูกค้าล่าสุด / แนะนำ (${searchResults.length})`}
                        </span>
                        {isSearchingCompany && (
                          <span className="text-red-500 flex items-center gap-1 font-normal text-[10px]">
                            <Loader2 className="w-3 h-3 animate-spin" /> ค้นหา...
                          </span>
                        )}
                      </div>
                      {searchResults.length > 0 ? (
                        searchResults.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => selectCompany(c)}
                            className="p-2.5 hover:bg-red-50/70 rounded-xl cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-slate-800 group-hover:text-red-600 text-xs">
                                {c.companyName}
                              </div>
                              {c.taxId && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Tax: {c.taxId}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {[c.address, c.subDistrict, c.district, c.province].filter(Boolean).join(" ")}
                            </div>
                            {Array.isArray(c.contacts) && c.contacts[0] && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ผู้ติดต่อ: {c.contacts[0].contactName || "-"}{" "}
                                {c.contacts[0].mobilePhone ? `(${c.contacts[0].mobilePhone})` : ""}
                              </div>
                            )}
                          </div>
                        ))
                      ) : isSearchingCompany ? (
                        <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          กำลังค้นหา...
                        </div>
                      ) : companySearchQuery.trim() ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          ไม่พบข้อมูลบริษัทที่ตรงกับ &quot;{companySearchQuery}&quot; (สามารถพิมพ์ชื่อนี้ต่อได้เลย)
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Contact Name */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ผู้ติดต่อ / ลูกค้า:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ชื่อบุคคลผู้ติดต่อ"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">เบอร์โทรศัพท์:</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">ที่อยู่ / สถานที่ตรวจเช็ค:</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="ที่อยู่ลูกค้า หรือ ไซต์งานติดตั้ง"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {renderTabFooter()}
          </div>
        )}

        {/* ================= TAB 2: EQUIPMENT SPECS & SYMPTOMS ================= */}
        {(viewMode === "all" || activeTab === "specs") && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5 text-[#ff2301]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ข้อมูลสเปกอุปกรณ์ & อาการเสีย ({EQUIPMENT_TYPE_CONFIG[equipmentType]?.label})
                </h3>
                <p className="text-xs text-slate-500">
                  ยี่ห้อ, รุ่น, หมายเลขเครื่อง (S/N), ขนาดกำลัง และรายละเอียดอาการเสีย
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {equipmentType === "CONTROL_CABINET"
                    ? "แบรนด์ / ผู้ประกอบตู้"
                    : equipmentType === "MOTOR"
                    ? "ยี่ห้อมอเตอร์ (Brand)"
                    : equipmentType === "PUMP"
                    ? "ยี่ห้อปั๊มน้ำ (Brand)"
                    : "Inverter ยี่ห้อ (Brand)"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inverterBrand}
                  onChange={(e) => setInverterBrand(e.target.value)}
                  placeholder={
                    equipmentType === "CONTROL_CABINET"
                      ? "เช่น TERA GROUP, Schneider"
                      : equipmentType === "MOTOR"
                      ? "เช่น Mitsubishi, Toshiba, Siemens"
                      : equipmentType === "PUMP"
                      ? "เช่น Grundfos, Ebara, Calpeda"
                      : "เช่น INVT, VEICHI, ABB"
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {equipmentType === "CONTROL_CABINET"
                    ? "รุ่นตู้ / รหัสตู้ (Model)"
                    : equipmentType === "MOTOR"
                    ? "รุ่นมอเตอร์ (Model)"
                    : equipmentType === "PUMP"
                    ? "รุ่นปั๊มน้ำ (Model)"
                    : "Model (รุ่น)"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inverterModel}
                  onChange={(e) => setInverterModel(e.target.value)}
                  placeholder={
                    equipmentType === "PUMP"
                      ? "เช่น CDX 120/12, CHL 4-30"
                      : "เช่น GD20-011G-4, SI23-D3-2R2G-A"
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Serial No. (หมายเลขเครื่อง)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="S/N จาก Nameplate"
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {EQUIPMENT_TYPE_CONFIG[equipmentType]?.powerUnitLabel || "ขนาดกำลัง (kW)"}:
                </label>
                <input
                  type="text"
                  value={motorKw}
                  onChange={(e) => setMotorKw(e.target.value)}
                  placeholder={
                    equipmentType === "PUMP"
                      ? "เช่น 3 HP / 2.2 kW, 5.5 kW"
                      : "เช่น 2.2 kW, 7.5 kW, 15 kW"
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                />
              </div>
            </div>

            {/* If Control Cabinet HAS Inverter / Soft Starter, show Inverter Specs inside Cabinet */}
            {equipmentType === "CONTROL_CABINET" && hasInverterInCabinet && (
              <div className="p-4 rounded-xl border border-blue-200/90 bg-blue-50/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      สเปก อินเวอร์เตอร์ / Soft Starter ที่ติดตั้งภายในตู้
                    </h4>
                  </div>
                  <span className="text-[10.5px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                    Internal Inverter / Soft Starter
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      ยี่ห้อ Inverter (Brand):
                    </label>
                    <input
                      type="text"
                      value={diodeMeasurement.inverterBrand || ""}
                      onChange={(e) =>
                        setDiodeMeasurement({
                          ...diodeMeasurement,
                          inverterBrand: e.target.value,
                        })
                      }
                      placeholder="เช่น INVT, Schneider, ABB, Danfoss"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      รุ่น Inverter (Model):
                    </label>
                    <input
                      type="text"
                      value={diodeMeasurement.inverterModel || ""}
                      onChange={(e) =>
                        setDiodeMeasurement({
                          ...diodeMeasurement,
                          inverterModel: e.target.value,
                        })
                      }
                      placeholder="เช่น GD20-011G-4, ATS48"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Serial No. Inverter:
                    </label>
                    <input
                      type="text"
                      value={diodeMeasurement.inverterSerial || ""}
                      onChange={(e) =>
                        setDiodeMeasurement({
                          ...diodeMeasurement,
                          inverterSerial: e.target.value,
                        })
                      }
                      placeholder="S/N จาก Nameplate อินเวอร์เตอร์"
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      ขนาดกำลัง Inverter (kW/HP):
                    </label>
                    <input
                      type="text"
                      value={diodeMeasurement.inverterKw || ""}
                      onChange={(e) =>
                        setDiodeMeasurement({
                          ...diodeMeasurement,
                          inverterKw: e.target.value,
                        })
                      }
                      placeholder="เช่น 11 kW / 15 HP"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dates & Warranty Row (Matching MOTOR FAULTY REPORT Excel table columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  วันที่ซื้อมา (Purchase Date)
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  วันที่ขาย (Sale Date)
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  วันที่เสีย (Fault Date)
                </label>
                <input
                  type="date"
                  value={faultDate}
                  onChange={(e) => setFaultDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  สถานะการรับประกัน (Warranty Status)
                </label>
                <select
                  value={warrantyStatus}
                  onChange={(e) => setWarrantyStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] font-semibold"
                >
                  <option value="รับประกัน">รับประกัน (In Warranty)</option>
                  <option value="หมดประกัน">หมดประกัน (Out of Warranty)</option>
                  <option value="ไม่อยู่ในเงื่อนไข">ไม่อยู่ในเงื่อนไขการรับประกัน</option>
                  <option value="IN_WARRANTY">อยู่ในประกัน</option>
                  <option value="OUT_OF_WARRANTY">นอกประกัน</option>
                </select>
              </div>
            </div>

            {/* If INVERTER, show 'อธิบายลักษณะการใช้งาน โหลดของมอเตอร์ อายุการทำงาน' and 'อธิบายสาเหตุการเสีย ช่วงการใช้งานที่เสีย' matching Excel columns 9 & 10 */}
            {equipmentType === "INVERTER" && (
              <div className="space-y-3 pt-2">
                <div className="text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                  <label className="font-bold text-slate-800 block flex items-center justify-between">
                    <span>
                      อธิบายลักษณะการใช้งาน โหลดของมอเตอร์ อายุการทำงาน (ตามคอลัมน์ใน Excel) :
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      INVERTER FAULT REPORT — คอลัมน์ที่ 9
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={applicationLoad}
                    onChange={(e) => setApplicationLoad(e.target.value)}
                    placeholder="เช่น ใช้งานขับพัดลมระบายอากาศในโรงงาน โหลดมอเตอร์ 11 kW ทำงานวันละ 12 ชม. ใช้งานมาประมาณ 2 ปี"
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] leading-relaxed font-medium"
                  />
                </div>

                <div className="text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                  <label className="font-bold text-slate-800 block flex items-center justify-between">
                    <span>
                      อธิบายสาเหตุการเสีย ช่วงการใช้งานที่เสีย (ตามคอลัมน์ใน Excel) :
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      INVERTER FAULT REPORT — คอลัมน์ที่ 10
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={causeOfFault}
                    onChange={(e) => {
                      setCauseOfFault(e.target.value);
                      if (!symptoms) setSymptoms(e.target.value);
                    }}
                    placeholder="เช่น เกิดฟ้าผ่าลงหม้อแปลงช่วงฝนตกหนัก ทำให้ Module IGBT ช็อตระเบิด, ไฟตกกระชากทำให้บอร์ดพาวเวอร์เสียหาย"
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] leading-relaxed font-medium"
                  />
                </div>
              </div>
            )}

            {/* If PUMP or MOTOR, also show 'อธิบายสาเหตุการเสีย ช่วงการใช้งานที่เสีย' directly here */}
            {(equipmentType === "PUMP" || equipmentType === "MOTOR") && (
              <div className="text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                <label className="font-bold text-slate-800 block flex items-center justify-between">
                  <span>
                    อธิบายสาเหตุการเสีย ช่วงการใช้งานที่เสีย (ตามคอลัมน์ใน Excel) <span className="text-red-500">*</span>:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {equipmentType === "MOTOR" ? "MOTOR FAULTY REPORT — คอลัมน์ที่ 9" : "PUMP FAULTY REPORT"}
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={causeOfFault}
                  onChange={(e) => {
                    setCauseOfFault(e.target.value);
                    if (!symptoms) setSymptoms(e.target.value);
                  }}
                  placeholder="เช่น มอเตอร์ปั๊มน้ำไหม้ ขดลวดช็อตรอบจากการใช้งานต่อเนื่องในบ่อพักน้ำ, ซีลน้ำรั่วเข้าห้องขดลวด, ลูกปืนแตกหมุนติดขัดระหว่างเดินระบบปั๊ม"
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] leading-relaxed font-medium"
                />
              </div>
            )}

            {/* Symptoms Field (matching Excel row) */}
            <div className="text-xs">
              <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                <span>อาการ : จากการตรวจเช็ค (Symptoms from Inspection) <span className="text-red-500">*</span>:</span>
                <span className="text-[11px] text-red-500 font-bold">
                  {equipmentType === "INVERTER" ? "INVERTER FAULT REPORT — แถวสีแดงใต้ตาราง" : "ระบุตามที่ลูกค้าแจ้งหรือช่างตรวจสอบพบ"}
                </span>
              </label>
              <textarea
                required
                rows={3}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="เช่น เปิดเครื่องไม่ติด ไฟแสดงสถานะไม่ขึ้น, หน้าจอขึ้นเตือน OC / SC, มอเตอร์ไม่หมุน"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] leading-relaxed font-medium"
              />
            </div>

            {/* Recommendations Field (matching Excel row 'ข้อเสนอแนะ : ') */}
            <div className="text-xs">
              <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                <span>ข้อเสนอแนะ : จากการตรวจเช็ค (Recommendations) :</span>
                <span className="text-[11px] text-slate-400">
                  ระบุแนวทางแก้ไข ข้อเสนอแนะ หรือการปรับปรุงตู้/อุปกรณ์
                </span>
              </label>
              <textarea
                rows={2}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="เช่น แนะนำให้เปลี่ยน Breaker AC, ตรวจเช็คจุดขันแน่นน็อตเทอร์มินอล, ปรับปรุงการระบายอากาศ"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] leading-relaxed font-medium"
              />
            </div>

            {renderTabFooter()}
          </div>
        )}

        {/* ================= TAB 3: SPECIFIC INSPECTION BY EQUIPMENT TYPE ================= */}
        {(viewMode === "all" || activeTab === "inspection") && (
          <div className="space-y-6">
            {equipmentType === "INVERTER" && (
              <DiodeMeasurementCard
                value={diodeMeasurement}
                onChange={setDiodeMeasurement}
              />
            )}

            {equipmentType === "CONTROL_CABINET" && (
              <PanelComponentsCard
                items={panelComponentsCheck}
                onChange={setPanelComponentsCheck}
                hasInverter={hasInverterInCabinet}
                onNavigateToInverter={() => setActiveTab("inverter_check")}
              />
            )}

            {equipmentType === "MOTOR" && (
              <MotorMeasurementCard
                value={motorMeasurement}
                onChange={setMotorMeasurement}
              />
            )}

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              {renderTabFooter()}
            </div>
          </div>
        )}

        {/* ================= TAB: INVERTER INSPECTION (FOR CONTROL CABINET WITH INVERTER) ================= */}
        {equipmentType === "CONTROL_CABINET" && hasInverterInCabinet &&
          (viewMode === "all" || activeTab === "inverter_check") && (
            <div className="space-y-6">
              <div className="bg-blue-50/90 border border-blue-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      ตรวจเช็ค อินเวอร์เตอร์ / Soft Starter ในตู้คอนโทรล (Inverter Inspection)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ตรวจวัดไดโอด Module IGBT, ไฟเลี้ยงบอร์ดคอนโทรล 24V/10V, คาปาซิเตอร์ และค่าพารามิเตอร์
                    </p>
                  </div>
                </div>
                {diodeMeasurement.inverterModel && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-blue-700 border border-blue-200 shadow-2xs">
                    รุ่น Inverter: {diodeMeasurement.inverterBrand || "INVT"} {diodeMeasurement.inverterModel}
                  </span>
                )}
              </div>

              <DiodeMeasurementCard
                value={diodeMeasurement}
                onChange={setDiodeMeasurement}
              />

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                {renderTabFooter()}
              </div>
            </div>
          )}

        {/* ================= TAB 4: POWER VOLTAGE MEASUREMENT (INVERTER & CABINET) ================= */}
        {(equipmentType === "INVERTER" || equipmentType === "CONTROL_CABINET") &&
          (viewMode === "all" || activeTab === "voltage") && (
            <div className="space-y-6">
              <PowerVoltageCard
                inputVoltage={powerInputVoltage}
                outputVoltage={powerOutputVoltage}
                onInputChange={setPowerInputVoltage}
                onOutputChange={setPowerOutputVoltage}
                onSyncQc={handleSyncQc}
                hasQcData={Boolean(convertedRepairOrderId)}
              />

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                {renderTabFooter()}
              </div>
            </div>
          )}

        {/* ================= TAB 5: DIAGNOSIS, CAUSE & PARTS ================= */}
        {(viewMode === "all" || activeTab === "diagnosis") && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  สาเหตุความเสียหายและรายการอะไหล่ที่ต้องใช้ (Diagnosis & Parts)
                </h3>
                <p className="text-xs text-slate-500">
                  ผลการวิเคราะห์สาเหตุ, ข้อเสนอแนะในการซ่อมแซม และรายการอะไหล่ที่ต้องเปลี่ยน
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    สาเหตุความเสียหาย / ข้อวินิจฉัย (Cause of Fault):
                  </label>
                  <textarea
                    rows={3}
                    value={causeOfFault}
                    onChange={(e) => setCauseOfFault(e.target.value)}
                    placeholder="เช่น Module IGBT ชำรุดเนื่องจากแรงดันกระชาก, คาปาซิเตอร์เสื่อมสภาพ, ความชื้นสะสม"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ข้อเสนอแนะในการซ่อมแซม (Recommendations):
                  </label>
                  <textarea
                    rows={3}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="เช่น เปลี่ยนโมดูล IGBT และ Drive Board, ตรวจเช็คระบบกราวด์, ติดตั้ง Surge Protection"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Required Parts List */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    อะไหล่ที่ต้องเปลี่ยน (Require Parts):
                  </span>
                  <button
                    type="button"
                    onClick={addPartRow}
                    className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มรายการอะไหล่
                  </button>
                </div>

                <div className="space-y-2">
                  {requireParts.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={part.partName}
                        onChange={(e) => updatePartRow(idx, "partName", e.target.value)}
                        placeholder={`ชื่อชิ้นส่วนอะไหล่ที่ ${idx + 1} เช่น IGBT Module, Main Board, Capacitor, Fan`}
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="w-24 flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={part.qty}
                          onChange={(e) =>
                            updatePartRow(idx, "qty", parseInt(e.target.value, 10) || 1)
                          }
                          className="w-16 text-center text-xs px-2 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-[11px] text-slate-400">ชิ้น</span>
                      </div>
                      {requireParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePartRow(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {renderTabFooter()}
          </div>
        )}

        {/* ================= TAB: PHOTOS ATTACHMENT ================= */}
        {(viewMode === "all" || activeTab === "photos") && (() => {
          const isInverter = equipmentType === "INVERTER";
          const isPump = equipmentType === "PUMP";
          const isMotor = equipmentType === "MOTOR";
          const isCabinet = equipmentType === "CONTROL_CABINET";
          const activeSlots = isInverter
            ? INVERTER_PHOTO_SLOTS
            : isPump
            ? PUMP_PHOTO_SLOTS
            : isMotor
            ? MOTOR_PHOTO_SLOTS
            : isCabinet
            ? CABINET_PHOTO_SLOTS
            : PHOTO_SLOTS;
          const uploadedCount = activeSlots.filter((s) => Boolean(photos[s.key]?.[0])).length;

          return (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isInverter
                        ? "bg-amber-500/10 text-amber-600"
                        : isPump
                        ? "bg-blue-500/10 text-blue-600"
                        : isMotor
                        ? "bg-amber-500/10 text-amber-600"
                        : isCabinet
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-teal-500/10 text-teal-600"
                    }`}
                  >
                    {isInverter ? (
                      <Zap className="w-5 h-5" />
                    ) : isPump ? (
                      <Droplets className="w-5 h-5" />
                    ) : isMotor ? (
                      <Cog className="w-5 h-5" />
                    ) : isCabinet ? (
                      <Layers className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-800">
                        {isInverter
                          ? "รูปถ่ายอินเวอร์เตอร์ & จุดชำรุดเสียหาย (INVERTER & SOFTSTATER FAULT REPORT)"
                          : isPump
                          ? "รูปถ่ายปั๊มน้ำ & แนบชิ้นส่วนที่เสียหาย (PUMP FAULTY REPORT & ATTACHMENT)"
                          : isMotor
                          ? "รูปถ่ายเนมเพลท & ความเสียหายขดลวดมอเตอร์ (MOTOR FAULTY REPORT)"
                          : isCabinet
                          ? "รูปถ่ายตู้คอนโทรลระบบไฟฟ้า 8 ด้าน (ด้านหน้า, ซ้าย, ขวา, บน, พัดลม, ด้านใน, น็อตเทอร์มินอล, เนมเพลท)"
                          : "รูปถ่ายสินค้าและความเสียหาย (Fault Photos & Nameplate)"}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isInverter
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isPump
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : isMotor
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isCabinet
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}
                      >
                        ถ่ายแล้ว {uploadedCount}/{activeSlots.length} รูป
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isInverter
                        ? "มาตรฐานรายงานอินเวอร์เตอร์: ด้านหน้า, เนมเพลท, ความเสียหายของบอร์ด (แสดงหน้า 1) และรูปประกอบ 8 ด้าน"
                        : isPump
                        ? "มาตรฐานรายงานปั๊มน้ำ: หน้า 1 ป้ายเนมเพลท | หน้า 2 ภาพรวมตัวปั๊มน้ำ (ซ้าย) และชิ้นส่วนที่เสียหาย (เสื้อปั๊ม, ใบพัด, บูช, เศษชิ้นส่วน)"
                        : isMotor
                        ? "มาตรฐานรายงานมอเตอร์ไฟฟ้า: ป้ายเนมเพลท และจุดชำรุดเสียหายขดลวด 3 สายสี (น้ำตาล-ดำ, ดำ-เทา, น้ำตาล-เทา)"
                        : isCabinet
                        ? "รูปถ่ายตู้คอนโทรล 8 ด้าน: ด้านหน้า, ด้านซ้าย, ด้านขวา, ด้านบน, พัดลม, ด้านใน, น็อตเทอร์มินอล และเนมเพลท"
                        : "มาตรฐานรูปถ่าย 8 ด้านตามชีต รูปภาพสินค้า ในไฟล์ Excel: หน้า, หลัง, ซ้าย, ขวา, บน, พัดลม, ด้านใน และเนมเพลท"}
                    </p>
                  </div>
                </div>
                {isUploading && (
                  <span className="text-xs font-semibold text-teal-600 flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    กำลังอัปโหลดรูปภาพ...
                  </span>
                )}
              </div>

              {/* Pump Special Callout Box Input */}
              {isPump && (
                <div className="bg-gradient-to-r from-blue-50/80 to-slate-50 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <span>หัวข้อปัญหาที่แนบในรายงาน (Page 2 Callout):</span>
                    </span>
                    <span className="text-[11px] text-blue-700 block">
                      ข้อความนี้จะแสดงในกรอบสี่เหลี่ยมด้านบนของรูปชิ้นส่วนที่เสียหายในหน้า 2 (เช่น &quot;ใบพัดปั๊มได้รับการเสียหาย&quot;)
                    </span>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <input
                      type="text"
                      value={causeOfFault}
                      onChange={(e) => {
                        setCauseOfFault(e.target.value);
                        if (!symptoms) setSymptoms(e.target.value);
                      }}
                      placeholder="เช่น ใบพัดปั๊มได้รับการเสียหาย, บูชแตกหักและเสื้อปั๊มสึกหรอ"
                      className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-xs">
                {activeSlots.map((slot) => {
                  const fileUrl = photos[slot.key]?.[0];
                  const hasPhoto = Boolean(fileUrl);
                  const badge = (slot as any).badge;

                  return (
                    <div
                      key={slot.key}
                      className={`rounded-2xl border transition-all p-3 flex flex-col justify-between ${
                        hasPhoto
                          ? isPump
                            ? "border-blue-300 bg-blue-50/20 shadow-xs"
                            : isMotor
                            ? "border-amber-300 bg-amber-50/20 shadow-xs"
                            : "border-teal-300 bg-teal-50/20 shadow-xs"
                          : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">
                            {slot.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {slot.enTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isPump
                                  ? "bg-blue-100 text-blue-700"
                                  : isMotor
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                          {hasPhoto ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              <Check className="w-3 h-3" /> ถ่ายแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200/70 text-slate-600">
                              1 รูป
                            </span>
                          )}
                        </div>
                      </div>

                      {hasPhoto ? (
                        <div className="space-y-2">
                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white h-48 flex items-center justify-center shadow-2xs">
                            <img
                              src={fileUrl}
                              alt={slot.title}
                              className="w-full h-full object-contain p-1"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <label className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 text-xs font-bold cursor-pointer transition-all shadow">
                                เปลี่ยนรูป
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => handlePhotoUpload(slot.key, e.target.files)}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removePhoto(slot.key)}
                                className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition-all shadow cursor-pointer"
                                title="ลบรูป"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="py-1 px-2 rounded-lg border border-slate-300 bg-white text-center">
                            <span className="font-semibold text-slate-700 text-xs">
                              {slot.title.replace(/^\d+\.\s*/, "")}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <label
                          className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-all group ${
                            isPump
                              ? "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-slate-400 hover:text-blue-600"
                              : "border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 text-slate-400 hover:text-teal-600"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                              isPump
                                ? "bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600"
                                : "bg-slate-100 group-hover:bg-teal-100 text-slate-400 group-hover:text-teal-600"
                            }`}
                          >
                            <Upload className="w-5 h-5" />
                          </div>
                          <span
                            className={`font-bold text-xs mb-0.5 ${
                              isPump
                                ? "text-slate-700 group-hover:text-blue-700"
                                : "text-slate-700 group-hover:text-teal-700"
                            }`}
                          >
                            + อัปโหลดรูปภาพ
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {slot.desc}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                            ( 1 รูป )
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => handlePhotoUpload(slot.key, e.target.files)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {renderTabFooter()}
            </div>
          );
        })()}

        {/* ================= TAB 7: SIGNATURES & REVIEW ================= */}
        {(viewMode === "all" || activeTab === "signatures") && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5 text-[#ff2301]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ผู้ลงนามและตรวจสอบ (Signatures & Review)
                </h3>
                <p className="text-xs text-slate-500">
                  ระบุชื่อช่างผู้ตรวจเช็คและหัวหน้างานผู้อนุมัติ (แบบพิมพ์ชื่อตัวบรรจง)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Technician / Inspector Box */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>ผู้ทำรายงาน / ช่างผู้ตรวจเช็ค (Inspector)</span>
                </div>

                <div className="relative" ref={inspectorDropdownRef}>
                  <label className="font-semibold text-slate-600 block mb-1">
                    พิมพ์ชื่อหรือเลือกจากรายชื่อ:
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => {
                      setInspectorName(e.target.value);
                      setIsInspectorDropdownOpen(true);
                    }}
                    onFocus={() => setIsInspectorDropdownOpen(true)}
                    placeholder="พิมพ์ชื่อช่างผู้ตรวจเช็ค..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold"
                  />

                  {isInspectorDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-52 overflow-y-auto z-40 custom-scrollbar p-1">
                      {filteredInspectors.slice(0, 20).map((u) => (
                        <div
                          key={u.id}
                          onClick={() => selectInspector(u)}
                          className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium text-slate-800">{u.fullName}</span>
                          <span className="text-[10px] text-slate-500">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">วันที่ตรวจเช็ค:</label>
                  <input
                    type="date"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Approver Box */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ผู้ตรวจสอบ / หัวหน้างาน (Approved By)</span>
                </div>

                <div className="relative" ref={approverDropdownRef}>
                  <label className="font-semibold text-slate-600 block mb-1">
                    พิมพ์ชื่อหรือเลือกหัวหน้างานผู้อนุมัติ:
                  </label>
                  <input
                    type="text"
                    value={approvedByName}
                    onChange={(e) => {
                      setApprovedByName(e.target.value);
                      setIsApproverDropdownOpen(true);
                    }}
                    onFocus={() => setIsApproverDropdownOpen(true)}
                    placeholder="พิมพ์ชื่อหัวหน้างาน เช่น นายบุญเลิศ เมฆลอย..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold"
                  />

                  {isApproverDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-52 overflow-y-auto z-40 custom-scrollbar p-1">
                      {filteredApprovers.slice(0, 20).map((u) => (
                        <div
                          key={u.id}
                          onClick={() => selectApprover(u)}
                          className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium text-slate-800">{u.fullName}</span>
                          <span className="text-[10px] text-slate-500">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">วันที่อนุมัติ:</label>
                  <input
                    type="date"
                    value={approvedDate}
                    onChange={(e) => setApprovedDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>

            {renderTabFooter()}
          </div>
        )}

        {/* Bottom Sticky Action Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-4 z-10">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-700">เลขที่ CR:</span>
            <span className="font-mono text-red-600 font-bold">{crNumber || "-"}</span>
            <span>•</span>
            <span className="font-bold text-slate-700">ประเภท:</span>
            <span className="font-bold text-slate-900">{EQUIPMENT_TYPE_CONFIG[equipmentType]?.shortLabel}</span>
            <span>•</span>
            <span className="font-bold text-slate-700">ลูกค้า:</span>
            <span className="text-slate-900 truncate max-w-xs">{customerCompany || customerName || "-"}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/service/check-reports")}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isSubmitting || isUploading}
              onClick={() => handleSubmit()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-500/25 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  บันทึกข้อมูล
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Convert to Repair Order Modal */}
      {isConvertModalOpen && initialData && (
        <ConvertToRoModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          report={initialData}
          users={users}
          onConverted={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
