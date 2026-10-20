"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  Save,
  ArrowLeft,
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
} from "lucide-react";
import Swal from "sweetalert2";
import {
  createInverterCheckReport,
  updateInverterCheckReport,
  generateCrNumber,
  searchCompaniesForCheckReport,
  InverterCheckReportFormData,
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Available contacts for selected company
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [selectedCompanyMeta, setSelectedCompanyMeta] = useState<{
    id?: string;
    companyName?: string;
    assignedSales?: string;
    contactsCount?: number;
  } | null>(null);

  // Equipment Type Selection
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(
    (initialData?.equipmentType as EquipmentType) || "INVERTER"
  );
  const [showDiodeDetails, setShowDiodeDetails] = useState<boolean>(
    initialData?.equipmentType ? initialData.equipmentType === "INVERTER" : true
  );
  const [showPanelDetails, setShowPanelDetails] = useState<boolean>(
    initialData?.equipmentType ? initialData.equipmentType === "CONTROL_CABINET" : false
  );
  const [showMotorDetails, setShowMotorDetails] = useState<boolean>(
    initialData?.equipmentType
      ? initialData.equipmentType === "MOTOR" || initialData.equipmentType === "PUMP"
      : false
  );

  const handleEquipmentTypeChange = (type: EquipmentType) => {
    setEquipmentType(type);
    if (type === "INVERTER") {
      setShowDiodeDetails(true);
      setShowPanelDetails(false);
      setShowMotorDetails(false);
      if (!inverterBrand || inverterBrand === "TERA GROUP") setInverterBrand("INVT");
    } else if (type === "CONTROL_CABINET") {
      setShowDiodeDetails(false);
      setShowPanelDetails(true);
      setShowMotorDetails(false);
      if (!inverterBrand || inverterBrand === "INVT") setInverterBrand("TERA GROUP");
    } else if (type === "MOTOR") {
      setShowDiodeDetails(false);
      setShowPanelDetails(false);
      setShowMotorDetails(true);
      if (inverterBrand === "INVT" || inverterBrand === "TERA GROUP") setInverterBrand("");
    } else {
      // PUMP
      setShowDiodeDetails(false);
      setShowPanelDetails(false);
      setShowMotorDetails(true);
      if (inverterBrand === "INVT" || inverterBrand === "TERA GROUP") setInverterBrand("");
    }
  };

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
    initialData?.saleDate ? new Date(initialData.saleDate).toISOString().split("T")[0] : ""
  );
  const [faultDate, setFaultDate] = useState(
    initialData?.faultDate ? new Date(initialData.faultDate).toISOString().split("T")[0] : ""
  );
  const [warrantyStatus, setWarrantyStatus] = useState(
    initialData?.warrantyStatus || "PENDING"
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

  // Photos State
  const [photos, setPhotos] = useState<{
    nameplate: string[];
    front: string[];
    side: string[];
    damage: string[];
    other: string[];
  }>({
    nameplate: initialData?.photos?.nameplate || [],
    front: initialData?.photos?.front || [],
    side: initialData?.photos?.side || [],
    damage: initialData?.photos?.damage || [],
    other: initialData?.photos?.other || [],
  });

  // Auto-generate CR number on mount if new
  useEffect(() => {
    if (!isEdit && !crNumber) {
      generateCrNumber(checkDate).then((num) => {
        setCrNumber(num);
      });
    }
  }, [checkDate, isEdit, crNumber]);

  // Click outside search & dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false);
      }
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(target)) {
        setIsSalesDropdownOpen(false);
      }
      if (inspectorDropdownRef.current && !inspectorDropdownRef.current.contains(target)) {
        setIsInspectorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Sales Reps list
  const filteredSalesUsers = useMemo(() => {
    const q = salesSearchQuery.toLowerCase().trim();
    if (!q) {
      return [...users].sort((a, b) => {
        const aIsSales =
          (a.role || "").toLowerCase().includes("sale") ||
          (a.role || "").includes("ขาย");
        const bIsSales =
          (b.role || "").toLowerCase().includes("sale") ||
          (b.role || "").includes("ขาย");
        if (aIsSales && !bIsSales) return -1;
        if (!aIsSales && bIsSales) return 1;
        return (a.fullName || "").localeCompare(b.fullName || "");
      });
    }
    return users.filter((u) => {
      const name = (u.fullName || "").toLowerCase();
      const nick = (u.employeeSale?.nickname || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      const dept = (u.employeeSale?.department || "").toLowerCase();
      return name.includes(q) || nick.includes(q) || role.includes(q) || dept.includes(q);
    });
  }, [users, salesSearchQuery]);

  const selectSalesRep = (u: any) => {
    const nick = u.employeeSale?.nickname;
    const nameToSet = nick ? `${u.fullName} (${nick})` : u.fullName;
    setSalesPerson(nameToSet);
    setSalesSearchQuery(nameToSet);
    setIsSalesDropdownOpen(false);
  };

  // Filtered Inspectors list
  const filteredInspectors = useMemo(() => {
    const q = (inspectorName || "").toLowerCase().trim();
    if (!q) {
      return [...users].sort((a, b) => {
        const aIsTech =
          (a.role || "").toLowerCase().includes("service") ||
          (a.role || "").toLowerCase().includes("engineer") ||
          (a.role || "").includes("ช่าง");
        const bIsTech =
          (b.role || "").toLowerCase().includes("service") ||
          (b.role || "").toLowerCase().includes("engineer") ||
          (b.role || "").includes("ช่าง");
        if (aIsTech && !bIsTech) return -1;
        if (!aIsTech && bIsTech) return 1;
        return (a.fullName || "").localeCompare(b.fullName || "");
      });
    }
    return users.filter((u) => {
      const name = (u.fullName || "").toLowerCase();
      const nick = (u.employeeSale?.nickname || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return name.includes(q) || nick.includes(q) || role.includes(q);
    });
  }, [users, inspectorName]);

  const selectInspector = (u: any) => {
    setInspectorName(u.fullName);
    setIsInspectorDropdownOpen(false);
  };

  // Search company debounce with searchCompaniesForCheckReport
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCompanySearchChange = (val: string) => {
    setCompanySearchQuery(val);
    setCustomerCompany(val);
    setIsCompanyDropdownOpen(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length >= 1) {
      setIsSearchingCompany(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await searchCompaniesForCheckReport(val.trim());
          setSearchResults(res || []);
        } catch (err) {
          console.error("Search company error:", err);
        } finally {
          setIsSearchingCompany(false);
        }
      }, 250);
    } else {
      setSearchResults([]);
      setIsSearchingCompany(false);
    }
  };

  const selectCompany = (comp: any) => {
    // 1. Company Name
    const name = comp.companyName || "";
    setCustomerCompany(name);
    setCompanySearchQuery(name);

    // 2. Full Formatted Address
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

    // 3. Contacts & Phone
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

    // 4. Sales Person Auto-fill
    if (comp.assignedUser?.fullName) {
      const repName = comp.assignedUser.employeeSale?.nickname
        ? `${comp.assignedUser.fullName} (${comp.assignedUser.employeeSale.nickname})`
        : comp.assignedUser.fullName;
      setSalesPerson(repName);
      setSalesSearchQuery(repName);
    }

    // 5. Store Selected Info
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

  // Image Upload handler to Supabase
  const handlePhotoUpload = async (category: keyof typeof photos, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 20 * 1024 * 1024) {
          Swal.fire({
            icon: "warning",
            title: "ไฟล์ขนาดใหญ่เกิน 20MB",
            text: file.name,
          });
          continue;
        }

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `cr-${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

        const { data, error } = await supabase.storage
          .from("uploadsService")
          .upload(filename, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          console.error("Upload error:", error);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("uploadsService").getPublicUrl(data.path);
        uploadedUrls.push(publicUrl);
      }

      setPhotos((prev) => ({
        ...prev,
        [category]: [...prev[category], ...uploadedUrls],
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

  const removePhoto = (category: keyof typeof photos, index: number) => {
    setPhotos((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!crNumber.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุเลขที่เอกสาร CR" });
      return;
    }

    if (!customerCompany.trim() && !customerName.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุชื่อลูกค้าหรือบริษัท" });
      return;
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
        diodeMeasurement,
        powerInputVoltage,
        powerOutputVoltage,
        panelComponentsCheck,
        motorMeasurement,
        photos,
        reportBy: currentUserName,
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
        return;
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "แก้ไขรายงานเรียบร้อยแล้ว" : "บันทึกรายงานตรวจเช็คเรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/service/check-reports");
      router.refresh();
    } catch (err: any) {
      console.error("Submit error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
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
              บันทึกผลการตรวจวัดทางเทคนิค แรงดันไฟ ไดโอด และสภาพตู้ควบคุมก่อนเปิดใบรับซ่อม
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEdit && initialData && (
            <>
              <Link
                href={`/service/check-reports/${initialData.id}/print`}
                target="_blank"
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                พิมพ์รายงาน (CR / Fault Report)
              </Link>

              {initialData.status !== "CONVERTED_TO_RO" && (
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/25 transition-all cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  แปลงเป็นใบรับซ่อม (Convert to RO)
                </button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={isSubmitting || isUploading}
            onClick={handleSubmit}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================= SECTION 1: HEADER & GENERAL INFO ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ข้อมูลเอกสารและผู้ตรวจสอบ (Document Header)
                </h3>
                <p className="text-xs text-slate-500">เลขที่ CR และข้อมูลทั่วไปของการตรวจเช็ค</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* CR Number */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                เลขที่เอกสาร CR <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  placeholder="เช่น CR69-1019 หรือ CR67-10012"
                  className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-red-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  สูตรอัตโนมัติ: CR[ปี พ.ศ.]-[เดือน][วันที่] (แก้ไขได้)
                </span>
              </div>
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

            {/* Inspector Name with Quick Select */}
            <div className="relative" ref={inspectorDropdownRef}>
              <label className="font-bold text-slate-700 block mb-1">ผู้ตรวจสอบ (Inspector)</label>
              <div className="relative">
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => {
                    setInspectorName(e.target.value);
                    setIsInspectorDropdownOpen(true);
                  }}
                  onFocus={() => setIsInspectorDropdownOpen(true)}
                  placeholder="ชื่อช่างผู้ตรวจเช็ค"
                  className="w-full text-xs px-3 py-2 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                />
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 transition-transform cursor-pointer ${
                    isInspectorDropdownOpen ? "rotate-180" : ""
                  }`}
                  onClick={() => setIsInspectorDropdownOpen(!isInspectorDropdownOpen)}
                />
              </div>

              {isInspectorDropdownOpen && filteredInspectors.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-30 custom-scrollbar p-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">
                    เลือกผู้ตรวจเช็คจากระบบ
                  </div>
                  {filteredInspectors.slice(0, 15).map((u) => (
                    <div
                      key={u.id}
                      onClick={() => selectInspector(u)}
                      className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800">{u.fullName}</span>
                      <span className="text-[10px] text-slate-400">{u.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sales Person with Searchable Dropdown */}
            <div className="relative" ref={salesDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-red-500" />
                  เซลล์ผู้ดูแล (Sales Rep)
                </label>
                {salesPerson && (
                  <button
                    type="button"
                    onClick={() => {
                      setSalesPerson("");
                      setSalesSearchQuery("");
                    }}
                    className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> ล้างค่า
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={salesPerson}
                  onChange={(e) => {
                    setSalesPerson(e.target.value);
                    setSalesSearchQuery(e.target.value);
                    setIsSalesDropdownOpen(true);
                  }}
                  onFocus={() => setIsSalesDropdownOpen(true)}
                  placeholder="พิมพ์ค้นหาหรือเลือกเซลล์จากฐานข้อมูล..."
                  className="w-full text-xs px-3 py-2 pr-8 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                />
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 transition-transform cursor-pointer ${
                    isSalesDropdownOpen ? "rotate-180" : ""
                  }`}
                  onClick={() => setIsSalesDropdownOpen(!isSalesDropdownOpen)}
                />
              </div>

              {/* Sales Rep Dropdown */}
              {isSalesDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-40 custom-scrollbar p-1">
                  {filteredSalesUsers.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400">
                      ไม่พบรายชื่อตรงกับ &quot;{salesSearchQuery}&quot;
                      <div className="text-[11px] text-slate-500 mt-1">
                        (คุณสามารถใช้ชื่อที่พิมพ์นี้ได้เลย)
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 rounded-md mb-1">
                        รายชื่อเซลล์ / เจ้าหน้าที่ในระบบ ({filteredSalesUsers.length})
                      </div>
                      {filteredSalesUsers.map((u) => {
                        const isSelected = salesPerson.includes(u.fullName);
                        const nickname = u.employeeSale?.nickname;
                        const isSalesRole =
                          (u.role || "").toLowerCase().includes("sale") ||
                          (u.role || "").includes("ขาย");

                        return (
                          <div
                            key={u.id}
                            onClick={() => selectSalesRep(u)}
                            className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected
                                ? "bg-red-50 text-red-700 font-bold"
                                : "hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSalesRole
                                    ? "bg-red-100 text-red-600"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {u.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 truncate">
                                  {u.fullName} {nickname ? `(${nickname})` : ""}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                                  <span>{u.role || "เจ้าหน้าที่"}</span>
                                  {u.phoneNumber && <span>• {u.phoneNumber}</span>}
                                </div>
                              </div>
                            </div>
                            {isSalesRole && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100/70 text-red-600 shrink-0">
                                Sales
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer & Company Details with Database Search & Auto-Fill */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              {/* Customer Company Search (Database Autocomplete) */}
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
                      if (searchResults.length > 0) setIsCompanyDropdownOpen(true);
                    }}
                    placeholder="พิมพ์ชื่อบริษัท, ชื่อผู้ติดต่อ, เลขผู้เสียภาษี หรือเบอร์โทร เพื่อดึงข้อมูลจากฐานข้อมูลอัตโนมัติ..."
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

                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-red-500 shrink-0" />
                  <span>พิมพ์เพื่อค้นหาบริษัทจากฐานข้อมูล เมื่อเลือกแล้วระบบจะดึงข้อมูลที่อยู่, ผู้ติดต่อ, เบอร์โทร และเซลล์ผู้ดูแลมาให้ทันที</span>
                </span>

                {/* Autocomplete Dropdown */}
                {isCompanyDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto z-40 custom-scrollbar p-1.5 divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 rounded-lg flex items-center justify-between mb-1">
                      <span>พบข้อมูลในระบบ ({searchResults.length})</span>
                      <span className="text-red-500 text-[10px] font-semibold">คลิกเพื่อเลือกและดึงข้อมูลอัตโนมัติ</span>
                    </div>

                    {searchResults.map((c) => {
                      const primaryContact = c.contacts?.[0];
                      const fullAddr = [c.address, c.subDistrict, c.district, c.province]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={c.id}
                          onClick={() => selectCompany(c)}
                          className="p-2.5 hover:bg-red-50/70 rounded-xl cursor-pointer transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-slate-800 group-hover:text-red-600 text-xs flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0" />
                              <span>{c.companyName}</span>
                            </div>
                            {c.taxId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                Tax: {c.taxId}
                              </span>
                            )}
                          </div>

                          {fullAddr && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{fullAddr}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-100/60 text-[10px] text-slate-500">
                            {primaryContact && (
                              <div className="flex items-center gap-1 text-slate-700">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="font-semibold">{primaryContact.contactName}</span>
                                {primaryContact.mobilePhone && (
                                  <span className="text-slate-500">({primaryContact.mobilePhone})</span>
                                )}
                                {c.contacts.length > 1 && (
                                  <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-600">
                                    +{c.contacts.length - 1} คน
                                  </span>
                                )}
                              </div>
                            )}

                            {c.assignedUser?.fullName && (
                              <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>เซลล์: {c.assignedUser.fullName}</span>
                                {c.assignedUser.employeeSale?.nickname && (
                                  <span>({c.assignedUser.employeeSale.nickname})</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Active Link Banner from DB */}
            {selectedCompanyMeta && (
              <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs shadow-2xs">
                <div className="flex items-center gap-2 font-medium truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ดึงข้อมูลจากฐานข้อมูล: <b className="font-bold">{selectedCompanyMeta.companyName}</b>
                  </span>
                  {selectedCompanyMeta.assignedSales && (
                    <span className="text-emerald-700/90 ml-1">
                      (เซลล์ผู้ดูแล: {selectedCompanyMeta.assignedSales})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCompanyMeta(null)}
                  className="text-emerald-600 hover:text-emerald-900 text-xs font-bold shrink-0 ml-2 cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            )}

            {/* Multiple Contacts Selection Chips */}
            {availableContacts.length > 1 && (
              <div className="p-3 bg-red-50/40 border border-red-200/60 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span>พบผู้ติดต่อในฐานข้อมูลของลูกค้ารายนี้ {availableContacts.length} ท่าน (คลิกเพื่อเลือก):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableContacts.map((c, idx) => {
                    const isSelected = customerName === c.contactName;
                    return (
                      <button
                        key={c.id || idx}
                        type="button"
                        onClick={() => {
                          setCustomerName(c.contactName);
                          setCustomerPhone(c.mobilePhone || "");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-red-500 text-white font-bold shadow-xs scale-102"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <User className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        <span>{c.contactName}</span>
                        {c.position && <span className="opacity-75 text-[11px]">({c.position})</span>}
                        {c.mobilePhone && <span className="text-[11px] opacity-90">• {c.mobilePhone}</span>}
                        {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contact Name & Phone & Address Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Customer Contact Name */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">ผู้ติดต่อ / ลูกค้า:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ชื่อบุคคลผู้ติดต่อ"
                    className="w-full text-xs px-3 py-2 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">เบอร์โทรศัพท์:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full text-xs px-3 py-2 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="font-semibold text-slate-700 block mb-1">ที่อยู่ / สถานที่ตรวจเช็ค:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="ที่อยู่ลูกค้า หรือ ไซต์งานติดตั้ง (ดึงอัตโนมัติจากฐานข้อมูล หรือระบุเองได้)"
                    className="w-full text-xs px-3 py-2 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION: EQUIPMENT TYPE SELECTION ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#ff2301] flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ประเภทอุปกรณ์ที่ตรวจเช็ค (Equipment Type) <span className="text-red-500">*</span>
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกระบบหรืออุปกรณ์ที่ทำการตรวจสอบเพื่อปรับแบบฟอร์มและการคำนวณอัตโนมัติ
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              ปัจจุบันเลือก: <b className="text-[#ff2301]">{EQUIPMENT_TYPE_CONFIG[equipmentType]?.shortLabel}</b>
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
                      ? "bg-red-50/50 border-[#ff2301] shadow-md shadow-red-500/10 ring-2 ring-red-500/20"
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
        </div>

        {/* ================= SECTION 2: MACHINE SPECIFICATIONS ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5 text-[#ff2301]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                ข้อมูลอุปกรณ์ & ข้อมูลการรับประกัน ({EQUIPMENT_TYPE_CONFIG[equipmentType]?.label})
              </h3>
              <p className="text-xs text-slate-500">
                ยี่ห้อ, รุ่น, หมายเลขเครื่อง (S/N), ขนาดกำลัง ({EQUIPMENT_TYPE_CONFIG[equipmentType]?.powerUnitLabel}) และประวัติการซื้อ-ขาย
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
                  : "ยี่ห้อ (Brand)"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={inverterBrand}
                onChange={(e) => setInverterBrand(e.target.value)}
                placeholder={
                  equipmentType === "CONTROL_CABINET"
                    ? "เช่น TERA GROUP, Schneider, สั่งประกอบ"
                    : equipmentType === "MOTOR"
                    ? "เช่น Mitsubishi, Toshiba, Siemens, ABB"
                    : equipmentType === "PUMP"
                    ? "เช่น Grundfos, Ebara, Calpeda, Franklin"
                    : "เช่น INVT, ABB, Delta, Schneider"
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
                  : "รุ่น (Model)"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={inverterModel}
                onChange={(e) => setInverterModel(e.target.value)}
                placeholder={
                  equipmentType === "CONTROL_CABINET"
                    ? "เช่น DB-01, MDB-Solar Pump 15kW, Control Panel"
                    : equipmentType === "MOTOR"
                    ? "เช่น 4-Pole 1450RPM, SF-JR, M2BAX"
                    : equipmentType === "PUMP"
                    ? "เช่น SP 30-5, 3M 50-160/7.5, หอยโข่ง 2 นิ้ว"
                    : "เช่น GD20-011G-4, GD200A"
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {equipmentType === "CONTROL_CABINET"
                  ? "รหัสระบุตู้ / Cabinet ID"
                  : equipmentType === "MOTOR"
                  ? "S/N มอเตอร์ (Motor S/N)"
                  : equipmentType === "PUMP"
                  ? "S/N ปั๊ม (Pump S/N)"
                  : "หมายเลขเครื่อง (Serial No.)"}
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="เช่น 010203040506 หรือ S/N จาก Nameplate"
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
                  equipmentType === "CONTROL_CABINET"
                    ? "เช่น 15, 30, 45 kW หรือ พิกัดเบรกเกอร์"
                    : equipmentType === "MOTOR"
                    ? "เช่น 7.5 kW, 10 HP, 15 kW"
                    : equipmentType === "PUMP"
                    ? "เช่น 5.5 kW, 7.5 HP"
                    : "เช่น 7.5, 11, 15, 30 kW"
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                {equipmentType === "CONTROL_CABINET"
                  ? "ลักษณะโหลดที่ควบคุม / ระบบที่ควบคุม (เช่น ปั๊ม 2 ตัวสลับการทำงาน):"
                  : equipmentType === "MOTOR"
                  ? "ลักษณะการใช้งาน / โหลดมอเตอร์ / รอบหมุน (RPM) / อายุการทำงาน:"
                  : equipmentType === "PUMP"
                  ? "ข้อมูลปั๊ม / Flow Rate / Head / บาดาลหรือหอยโข่ง / ชนิดของเหลว:"
                  : "ลักษณะการใช้งาน / โหลดของมอเตอร์ / อายุการทำงาน:"}
              </label>
              <input
                type="text"
                value={applicationLoad}
                onChange={(e) => setApplicationLoad(e.target.value)}
                placeholder={
                  equipmentType === "CONTROL_CABINET"
                    ? "เช่น ปั๊มน้ำบาดาล 2 ตัวสลับการทำงาน, ควบคุมพัดลมโรงเรือน"
                    : equipmentType === "MOTOR"
                    ? "เช่น ต่อเข้าเกียร์ทด 1:30, ขับสายพานลำเลียงหิน, ใช้งานมา 3 ปี"
                    : equipmentType === "PUMP"
                    ? "เช่น สูบน้ำบาดาลลึก 80m, Flow 25 m3/h, ส่งไกล 500m"
                    : "เช่น ปั๊มน้ำบาดาล, พัดลมระบายอากาศ, สายพานลำเลียง, ใช้งานมา 2 ปี"
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                สถานะการรับประกัน (Warranty):
              </label>
              <select
                value={warrantyStatus}
                onChange={(e) => setWarrantyStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301]"
              >
                {WARRANTY_STATUS_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates for Warranty Claim */}
            <div className="grid grid-cols-3 gap-2 md:col-span-2 lg:col-span-4 border-t border-slate-100 pt-3">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">วันที่ซื้อมา:</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">วันที่ขาย:</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">วันที่เสีย:</label>
                <input
                  type="date"
                  value={faultDate}
                  onChange={(e) => setFaultDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: POWER VOLTAGE MEASUREMENTS ================= */}
        <PowerVoltageCard
          inputVoltage={powerInputVoltage}
          outputVoltage={powerOutputVoltage}
          onInputChange={setPowerInputVoltage}
          onOutputChange={setPowerOutputVoltage}
        />

        {/* ================= SECTION 4: DIODE MEASUREMENT ================= */}
        {equipmentType === "INVERTER" ? (
          <DiodeMeasurementCard
            value={diodeMeasurement}
            onChange={setDiodeMeasurement}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
            <button
              type="button"
              onClick={() => setShowDiodeDetails(!showDiodeDetails)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-[#ff2301] transition-colors">
                    การวัดไดโอด & โมดูล IGBT (Diode Measurement) — ทางเลือกเพิ่มเติม
                  </div>
                  <p className="text-[11px] text-slate-400">
                    คลิกเพื่อบันทึกกรณีมี Inverter หรือ Soft Starter อยู่ภายในชุดอุปกรณ์
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#ff2301]">
                  {showDiodeDetails ? "ซ่อนแบบฟอร์ม" : "+ แสดงแบบฟอร์มตรวจวัดไดโอด"}
                </span>
                {showDiodeDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>
            {showDiodeDetails && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <DiodeMeasurementCard
                  value={diodeMeasurement}
                  onChange={setDiodeMeasurement}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 5: 13 PANEL COMPONENTS CHECK ================= */}
        {equipmentType === "CONTROL_CABINET" ? (
          <PanelComponentsCard
            items={panelComponentsCheck}
            onChange={setPanelComponentsCheck}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
            <button
              type="button"
              onClick={() => setShowPanelDetails(!showPanelDetails)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    การตรวจสภาพอุปกรณ์ในตู้ควบคุม 13 รายการ (Panel Components Check) — ทางเลือกเพิ่มเติม
                  </div>
                  <p className="text-[11px] text-slate-400">
                    คลิกเพื่อบันทึกสภาพอุปกรณ์เบรกเกอร์ ฟิวส์ เทอร์มินอล สายไฟ ฯลฯ หากติดตั้งในตู้
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600">
                  {showPanelDetails ? "ซ่อนแบบฟอร์ม" : "+ แสดงแบบฟอร์มตรวจเช็คตู้ 13 รายการ"}
                </span>
                {showPanelDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>
            {showPanelDetails && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <PanelComponentsCard
                  items={panelComponentsCheck}
                  onChange={setPanelComponentsCheck}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION: MOTOR ELECTRICAL MEASUREMENT ================= */}
        {equipmentType === "MOTOR" || equipmentType === "PUMP" ? (
          <MotorMeasurementCard
            value={motorMeasurement}
            onChange={setMotorMeasurement}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
            <button
              type="button"
              onClick={() => setShowMotorDetails(!showMotorDetails)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Cog className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">
                    การตรวจวัดมอเตอร์ไฟฟ้า: ความต้านทานขดลวด & ฉนวนลงกราวด์ (Motor Inspection) — ทางเลือกเพิ่มเติม
                  </div>
                  <p className="text-[11px] text-slate-400">
                    คลิกเพื่อบันทึกกรณีมีมอเตอร์ไฟฟ้าหรือชุดขับมอเตอร์ในระบบที่ตรวจเช็ค
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600">
                  {showMotorDetails ? "ซ่อนแบบฟอร์ม" : "+ แสดงแบบฟอร์มตรวจวัดมอเตอร์ไฟฟ้า"}
                </span>
                {showMotorDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>
            {showMotorDetails && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <MotorMeasurementCard
                  value={motorMeasurement}
                  onChange={setMotorMeasurement}
                />
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION 6: SYMPTOMS, CAUSE, PARTS & RECOMMENDATIONS ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                อาการเสีย สาเหตุ และรายการอะไหล่ที่ต้องใช้ (Fault & Diagnosis)
              </h3>
              <p className="text-xs text-slate-500">
                บันทึกรายละเอียดเพื่อวิเคราะห์และส่งต่อให้ฝ่ายซ่อมหรือโรงงาน
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                อาการเสีย (Symptoms / Fault Description) <span className="text-red-500">*</span>:
              </label>
              <textarea
                required
                rows={2}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="เช่น เปิดไม่ติด มีเสียงดังเปรี๊ยะ, ขึ้น Alarm OC (Overcurrent), ไฟตกแล้วตัดการทำงาน"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  อธิบายสาเหตุการเสีย / ช่วงการใช้งานที่เสีย:
                </label>
                <textarea
                  rows={2}
                  value={causeOfFault}
                  onChange={(e) => setCauseOfFault(e.target.value)}
                  placeholder="เช่น เสียขณะสตาร์ทมอเตอร์, ฟ้าลงใกล้เคียง, ฝุ่นละอองสะสมหนาแน่น"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ข้อเสนอแนะเพิ่มเติม:</label>
                <textarea
                  rows={2}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="เช่น แนะนำให้ติดตั้ง Surge Protection เพิ่มเติม, ควรทำความสะอาดพัดลมระบายอากาศ"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Required Parts List */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  ส่วนที่เสียและต้องการเปลี่ยน (Require Parts):
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
        </div>

        {/* ================= SECTION 7: PHOTOS ATTACHMENT ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  รูปถ่ายสินค้าและความเสียหาย (Fault Photos & Nameplate)
                </h3>
                <p className="text-xs text-slate-500">
                  รูปถ่ายหน้าตรง ด้านข้าง Nameplate และจุดที่ชำรุดเสียหายเพื่อเป็นหลักฐาน
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {[
              { key: "nameplate" as const, title: "1. ป้าย Nameplate" },
              { key: "front" as const, title: "2. รูปหน้าตรงเครื่อง/ตู้" },
              { key: "side" as const, title: "3. รูปด้านข้าง" },
              { key: "damage" as const, title: "4. จุดที่เสียหาย / ภายใน" },
            ].map((cat) => {
              const fileList = photos[cat.key] || [];

              return (
                <div
                  key={cat.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{cat.title}</span>
                    <label className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 bg-white border border-teal-200 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs">
                      + เพิ่มรูป
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(cat.key, e.target.files)}
                      />
                    </label>
                  </div>

                  {fileList.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-center p-2">
                      <Upload className="w-5 h-5 mb-1 text-slate-300" />
                      <span className="text-[10px]">ยังไม่มีรูปภาพ</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {fileList.map((url, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-square">
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(cat.key, i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-4 z-10">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-700">เลขที่ CR:</span>
            <span className="font-mono text-red-600 font-bold">{crNumber || "-"}</span>
            <span>•</span>
            <span>วันที่: {checkDate}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/service/check-reports"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              ยกเลิก
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs shadow-lg shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? "บันทึกการแก้ไข" : "บันทึกรายงานตรวจเช็ค"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Convert to RO Modal */}
      {isEdit && initialData && (
        <ConvertToRoModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          report={initialData}
          users={users}
          onConverted={() => {
            router.push("/service/check-reports");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
