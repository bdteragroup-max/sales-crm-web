"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Building2,
  User,
  Phone,
  Cpu,
  AlertCircle,
  RotateCcw,
  UserCheck,
  Plus,
  PhoneCall,
  CheckCircle2,
  MapPin,
  Hash,
  Search,
  Clock,
  Wrench,
  Eye,
  Printer,
  X,
  ClipboardList,
  Camera,
  FileText,
} from "lucide-react";
import Swal from "sweetalert2";
import { createServiceCallLog, getServiceCallLogs } from "@/app/actions/service-calls";
import MobileSafeSelect from "@/app/components/MobileSafeSelect";
import { getCallStatusMeta } from "../ServiceCallsClientPage";

interface UserOption {
  id: string;
  fullName: string;
  role: string;
}

interface NewServiceCallClientProps {
  users?: UserOption[];
  currentUser?: any;
  canViewAll?: boolean;
  initialMyLogs?: any[];
  initialTab?: "form" | "my-cases";
  initialCaseId?: string | null;
}

const COMMON_INVERTER_MODELS = [
  "SI21",
  "SI22",
  "SI23",
  "SI30",
  "AC300",
  "AC310",
  "AC10",
];

const COMMON_ISSUES = [
  "มอเตอร์ไม่หมุน",
  "ไฟเตือน Overload (OL)",
  "หน้าจอดับ / เปิดไม่ติด",
  "น้ำในบ่อน้อย / ปั๊มตัดการทำงาน",
  "แรงดันน้ำไม่สม่ำเสมอ",
  "มีเสียงผิดปกติขณะทำงาน",
  "ไฟเตือน Under Voltage",
  "เครื่องร้อนจัด / Overheat (OH)",
];

export default function NewServiceCallClient({
  users = [],
  currentUser,
  canViewAll = true,
  initialMyLogs = [],
  initialTab = "form",
  initialCaseId = null,
}: NewServiceCallClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"form" | "my-cases">(initialTab);
  const [myLogs, setMyLogs] = useState<any[]>(initialMyLogs);
  const [isRefreshingMyLogs, setIsRefreshingMyLogs] = useState(false);
  const [myStatusFilter, setMyStatusFilter] = useState<
    "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED"
  >("ALL");
  const [mySearchTerm, setMySearchTerm] = useState("");
  const [selectedMyCase, setSelectedMyCase] = useState<any | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setMyLogs(initialMyLogs);
  }, [initialMyLogs]);

  useEffect(() => {
    if (initialCaseId && myLogs.length > 0) {
      const found = myLogs.find((c) => c.id === initialCaseId);
      if (found) {
        setActiveView("my-cases");
        setSelectedMyCase(found);
      }
    }
  }, [initialCaseId, myLogs]);

  const initialFormState = {
    receivedDate: new Date().toISOString().split("T")[0],
    internalCompany: "TG",
    companyName: "",
    contactName: "",
    contactPhone: "",
    siteAddress: "",
    inverterModel: "",
    serialNumber: "",
    reportedIssue: "",
    responsibleId: "",
    notes: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Field progress counter
  const requiredFields = [
    Boolean(formData.companyName.trim()),
    Boolean(formData.contactName.trim()),
    Boolean(formData.inverterModel.trim()),
    Boolean(formData.reportedIssue.trim()),
    Boolean(formData.receivedDate),
  ];
  const completedCount = requiredFields.filter(Boolean).length;
  const totalRequired = requiredFields.length;
  const isFormValid = completedCount === totalRequired;

  // My Submitted Cases KPI & Filtering
  const myPendingCount = useMemo(
    () => myLogs.filter((l) => getCallStatusMeta(l.status).group === "pending").length,
    [myLogs]
  );
  const myInProgressCount = useMemo(
    () => myLogs.filter((l) => getCallStatusMeta(l.status).group === "in_progress").length,
    [myLogs]
  );
  const myCompletedCount = useMemo(
    () => myLogs.filter((l) => getCallStatusMeta(l.status).group === "completed").length,
    [myLogs]
  );

  const filteredMyLogs = useMemo(() => {
    const q = mySearchTerm.trim().toLowerCase();
    return myLogs.filter((item) => {
      const statusMeta = getCallStatusMeta(item.status);
      if (myStatusFilter === "PENDING" && statusMeta.group !== "pending") return false;
      if (myStatusFilter === "IN_PROGRESS" && statusMeta.group !== "in_progress") return false;
      if (myStatusFilter === "COMPLETED" && statusMeta.group !== "completed") return false;

      if (!q) return true;
      const fields = [
        item.caseNumber,
        item.companyName,
        item.contactName,
        item.contactPhone,
        item.inverterModel,
        item.serialNumber,
        item.reportedIssue,
        item.responsible?.fullName,
        item.responsibleName,
        item.assignedSalesName,
        item.linkedQuotationNo,
        item.linkedDeliveryNo,
      ];
      return fields.some((f) => String(f || "").toLowerCase().includes(q));
    });
  }, [myLogs, myStatusFilter, mySearchTerm]);

  const formatThaiDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleRefreshMyLogs = async () => {
    setIsRefreshingMyLogs(true);
    try {
      const fresh = await getServiceCallLogs({ onlyMine: true });
      setMyLogs(fresh || []);
    } catch (err) {
      console.warn("Failed to refresh my submitted cases:", err);
    } finally {
      setIsRefreshingMyLogs(false);
    }
  };

  // Handle Input Changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Quick preset select for Inverter model
  const handleModelSelect = (model: string) => {
    setFormData((prev) => ({ ...prev, inverterModel: model }));
  };

  // Quick append for issue
  const handleIssueSelect = (issue: string) => {
    setFormData((prev) => {
      const current = prev.reportedIssue.trim();
      const newIssue = current ? `${current}, ${issue}` : issue;
      return { ...prev, reportedIssue: newIssue };
    });
  };

  // Reset form
  const handleReset = () => {
    setFormData(initialFormState);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบถ้วน",
        text: "กรุณากรอกข้อมูลในช่องที่มีเครื่องหมายดอกจัน (*) ให้ครบทุกช่อง",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        receivedDate: formData.receivedDate,
        internalCompany: formData.internalCompany || "TG",
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.trim() || null,
        siteAddress: formData.siteAddress.trim() || null,
        inverterModel: formData.inverterModel.trim(),
        serialNumber: formData.serialNumber.trim() || null,
        reportedIssue: formData.reportedIssue.trim(),
        responsibleId: formData.responsibleId || null,
        notes: formData.notes.trim() || null,
      };

      await createServiceCallLog(payload);

      Swal.fire({
        icon: "success",
        title: "บันทึกและส่งข้อมูลให้เซลล์ & เซอร์วิสสำเร็จ",
        text: "เปิดเคสแจ้งปัญหาลูกค้าและส่งแจ้งเตือนไปยังทีมเซลล์และทีมเซอร์วิสเพื่อตรวจสอบเรียบร้อยแล้ว",
        timer: 1800,
        showConfirmButton: false,
      });

      if (canViewAll) {
        router.push("/service/calls");
      } else {
        setFormData(initialFormState);
        const fresh = await getServiceCallLogs({ onlyMine: true }).catch(() => null);
        if (fresh) setMyLogs(fresh);
        setActiveView("my-cases");
        router.refresh();
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizePhotos = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val))
      return val.map((v: any) => (typeof v === "string" ? v : v?.url || "")).filter(Boolean);
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed))
          return parsed.map((v: any) => (typeof v === "string" ? v : v?.url || "")).filter(Boolean);
      } catch {
        return [val];
      }
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-28 sm:pb-32">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* ── Top Header Card (Symmetrical Single-Row Controls + Aligned Footer Strip) ── */}
        <div className="bg-white border border-gray-200/80 rounded-2xl sm:rounded-3xl p-4 sm:px-7 sm:py-6 shadow-sm transition-all relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5">
            {/* Left: Red Squircle Badge + Title + Single-Line Subtitle */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 shrink-0">
                <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                    บันทึกแจ้งปัญหาลูกค้า
                  </h1>
                  <span className="h-6 px-2.5 inline-flex items-center bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-[11px] font-bold tracking-wide shrink-0">
                    {activeView === "form" ? "เปิดเคสใหม่" : "เคสที่ฉันส่งแจ้ง"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 mt-0.5 min-w-0">
                  <span className="font-bold uppercase tracking-wider text-gray-500 shrink-0">
                    SERVICE CALL LOG
                  </span>
                  <span className="hidden sm:inline text-gray-300 shrink-0">•</span>
                  <span className="hidden sm:inline text-gray-500 truncate">
                    ส่งแจ้งทีมเซลล์และเซอร์วิสอัตโนมัติ
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Symmetrical Single-Line Toolbar (50/50 Tabs + Uniform Action Pair) */}
            <div className="flex flex-col sm:flex-row sm:flex-nowrap items-stretch sm:items-center lg:justify-end gap-2.5 shrink-0">
              {/* Equal-Width 2-Tab Mode Switcher */}
              <div className="w-full sm:w-[296px] grid grid-cols-2 gap-1 p-1 h-11 bg-gray-100/90 border border-gray-200/90 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView("form")}
                  className={`h-full px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                    activeView === "form"
                      ? "bg-white text-[#ff2301] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>ฟอร์มส่งข้อมูล</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("my-cases")}
                  className={`h-full px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                    activeView === "my-cases"
                      ? "bg-white text-[#ff2301] shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                  <span>เคสที่ฉันส่งแจ้ง</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      activeView === "my-cases"
                        ? "bg-red-50 text-[#ff2301]"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {myLogs.length}
                  </span>
                </button>
              </div>

              {/* Uniform Action Pair (Identical Width & Height Across Both Views) */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={activeView === "form" ? handleReset : handleRefreshMyLogs}
                  disabled={activeView === "form" ? loading : isRefreshingMyLogs}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-xs disabled:opacity-40 shrink-0"
                  title={activeView === "form" ? "ล้างข้อมูลฟอร์ม" : "รีเฟรชสถานะ"}
                >
                  <RotateCcw
                    className={`w-4 h-4 ${
                      activeView === "my-cases" && isRefreshingMyLogs
                        ? "animate-spin text-[#ff2301]"
                        : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={activeView === "form" ? handleSubmit : () => setActiveView("form")}
                  disabled={activeView === "form" ? loading || !isFormValid : false}
                  className="min-w-[132px] inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs shadow-lg shadow-red-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  {activeView === "form" && loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>เปิดเคสใหม่</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Symmetrical Mini Progress / Notice Strip */}
          <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-gray-100 min-h-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            {activeView === "form" ? (
              <div className="flex items-start sm:items-center gap-2 text-[11px] sm:text-xs text-gray-500 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] mt-1 sm:mt-0 shrink-0" />
                <span className="truncate">
                  เลขเคสจะถูกสร้างอัตโนมัติในรูปแบบ{" "}
                  <strong className="font-mono text-gray-800">SV-YYYYMMDD-NNN</strong>{" "}
                  และส่งแจ้งทีมเซลล์และเซอร์วิสทันทีเมื่อบันทึกสำเร็จ
                </span>
              </div>
            ) : (
              <div className="flex items-start sm:items-center gap-2 text-[11px] sm:text-xs text-gray-500 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 sm:mt-0 shrink-0" />
                <span className="truncate">
                  แสดงเฉพาะเคสที่คุณเป็นผู้ส่งแจ้ง ({currentUser?.fullName || "ผู้ใช้งานปัจจุบัน"}) พร้อมสถานะล่าสุดจากทีมเซอร์วิสและฝ่ายขาย
                </span>
              </div>
            )}

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              {canViewAll && (
                <>
                  <Link
                    href="/service/calls"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#ff2301] transition-colors whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>กลับหน้ารายการรวม</span>
                  </Link>
                  <span className="text-gray-200 hidden sm:inline">|</span>
                </>
              )}

              {activeView === "form" ? (
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    ความสมบูรณ์ของข้อมูล:
                  </span>
                  <div className="w-24 sm:w-28 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff2301] to-red-500 transition-all duration-300"
                      style={{ width: `${(completedCount / totalRequired) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-gray-800">
                    {completedCount}/{totalRequired}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="font-medium text-gray-500">เคสที่ฉันส่งแจ้งทั้งหมด:</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 font-mono font-bold text-gray-800">
                    {myLogs.length} เคส
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            VIEW 1: FORM SECTION (True 2x2 Symmetrical Grid)
           ═══════════════════════════════════════════════════════════════ */}
        {activeView === "form" ? (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-7 items-stretch">
              {/* ROW 1 - LEFT (Mobile #1, Desktop #1): ข้อมูลลูกค้าและผู้ติดต่อ */}
              <div className="order-1 lg:order-1 h-full flex flex-col bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-gray-900">
                        ข้อมูลลูกค้าและผู้ติดต่อ
                      </h2>
                      <p className="text-[11px] sm:text-xs text-gray-400">
                        CUSTOMER & CONTACT DETAILS
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200 shrink-0">
                    จำเป็น *
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  {/* วันที่รับแจ้ง & บริษัทภายใน (สำหรับหัวกระดาษใบรายงาน) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        วันที่รับแจ้ง <span className="text-[#ff2301]">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="date"
                          name="receivedDate"
                          required
                          value={formData.receivedDate}
                          onChange={handleChange}
                          className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        บริษัทในเครือ (หัวกระดาษใบรายงาน)
                      </label>
                      <MobileSafeSelect
                        value={formData.internalCompany}
                        onChange={(val) =>
                          setFormData((prev) => ({ ...prev, internalCompany: val }))
                        }
                        options={[
                          {
                            value: "TG",
                            badge: "TG",
                            label: "บจก. เทอรา กรุ้ป",
                            subLabel: "TERA GROUP CO., LTD.",
                          },
                          {
                            value: "TE",
                            badge: "TE",
                            label: "บจก. เทอรา อิเล็คทริค",
                            subLabel: "TERA ELECTRIC CO., LTD.",
                          },
                          {
                            value: "TP",
                            badge: "TP",
                            label: "บจก. เทอรา พาวเวอร์",
                            subLabel: "TERA POWER CO., LTD.",
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* ชื่อบริษัท / ลูกค้า */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      ชื่อบริษัท / ลูกค้า <span className="text-[#ff2301]">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="companyName"
                        required
                        placeholder="เช่น บจก. เกษตรก้าวหน้า หรือ คุณสมศักดิ์"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                      />
                    </div>
                  </div>

                  {/* ชื่อผู้ติดต่อ & เบอร์โทร */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        ชื่อผู้ติดต่อ <span className="text-[#ff2301]">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          name="contactName"
                          required
                          placeholder="ชื่อ-นามสกุล ผู้แจ้ง"
                          value={formData.contactName}
                          onChange={handleChange}
                          className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        เบอร์โทรศัพท์ / LINE ID
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="tel"
                          inputMode="tel"
                          name="contactPhone"
                          placeholder="เช่น 081-234-5678"
                          value={formData.contactPhone}
                          onChange={handleChange}
                          className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* สถานที่เข้าหน้างาน / ที่อยู่ */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      สถานที่ตั้งเครื่อง / ที่อยู่หน้างาน (ถ้ามี)
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        name="siteAddress"
                        placeholder="เช่น อ.เมือง จ.ขอนแก่น หรือพิกัด/สถานที่ติดตั้งเครื่อง"
                        value={formData.siteAddress}
                        onChange={handleChange}
                        className="w-full h-12 text-base sm:text-sm border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 1 - RIGHT (Mobile #3, Desktop #2): อาการและปัญหาที่พบ */}
              <div className="order-3 lg:order-2 h-full flex flex-col bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-gray-900">
                        อาการและปัญหาที่พบ
                      </h2>
                      <p className="text-[11px] sm:text-xs text-gray-400">
                        REPORTED SYMPTOMS & DIAGNOSIS
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200 shrink-0">
                    จำเป็น *
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      ปัญหาที่พบ (อาการที่ลูกค้าแจ้ง) <span className="text-[#ff2301]">*</span>
                    </label>
                    <textarea
                      name="reportedIssue"
                      required
                      rows={4}
                      placeholder="อธิบายอาการอย่างละเอียด เช่น หน้าจอดับ ไฟสถานะไม่ขึ้น มีเสียงเตือน หรือมอเตอร์ไม่หมุน..."
                      value={formData.reportedIssue}
                      onChange={handleChange}
                      className="w-full flex-1 min-h-[124px] text-base sm:text-sm border border-gray-300 rounded-xl p-3.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all resize-y"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-2">
                      กดเพื่อเพิ่มข้อความอาการทั่วไป:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COMMON_ISSUES.map((issue) => (
                        <button
                          key={issue}
                          type="button"
                          onClick={() => handleIssueSelect(issue)}
                          className="h-9 px-3 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-[#ff2301] transition-all active:scale-95 flex items-center gap-1.5 text-left min-w-0"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#ff2301] shrink-0" />
                          <span className="truncate">{issue}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 2 - LEFT (Mobile #2, Desktop #3): ข้อมูลอุปกรณ์และโมเดล */}
              <div className="order-2 lg:order-3 h-full flex flex-col bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-gray-900">
                        ข้อมูลอุปกรณ์และโมเดล
                      </h2>
                      <p className="text-[11px] sm:text-xs text-gray-400">
                        INVERTER HARDWARE & MODEL
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200 shrink-0">
                    จำเป็น *
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        โมเดล / รุ่น Inverter <span className="text-[#ff2301]">*</span>
                      </label>
                      <div className="relative">
                        <Cpu className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          name="inverterModel"
                          required
                          placeholder="เช่น SI23, AC300 หรือเลือกรุ่นด้านล่าง"
                          value={formData.inverterModel}
                          onChange={handleChange}
                          className="w-full h-12 text-base sm:text-sm font-mono border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        Serial Number (S/N) (ถ้าทราบ)
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          name="serialNumber"
                          placeholder="หมายเลขเครื่อง S/N"
                          value={formData.serialNumber}
                          onChange={handleChange}
                          className="w-full h-12 text-base sm:text-sm font-mono border border-gray-300 rounded-xl px-3.5 pl-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-2">
                      เลือกรุ่นยอดนิยมด่วน:
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      {COMMON_INVERTER_MODELS.map((model, idx) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => handleModelSelect(model)}
                          className={`${
                            idx < 4 ? "col-span-3" : "col-span-4"
                          } h-9 text-xs font-mono font-semibold px-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                            formData.inverterModel === model
                              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-[#ff2301]"
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 2 - RIGHT (Mobile #4, Desktop #4): การมอบหมายงานและหมายเหตุ */}
              <div className="order-4 lg:order-4 h-full flex flex-col bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301] shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-gray-900">
                        การมอบหมายงานและหมายเหตุ
                      </h2>
                      <p className="text-[11px] sm:text-xs text-gray-400">
                        TECHNICIAN ASSIGNMENT & NOTES
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 shrink-0">
                    ข้อมูลเพิ่มเติม
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      ช่างผู้รับผิดชอบงานตรวจเช็ค (สามารถระบุภายหลังได้)
                    </label>
                    <MobileSafeSelect
                      value={formData.responsibleId}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, responsibleId: val }))
                      }
                      searchable={users.length > 5}
                      searchPlaceholder="พิมพ์ค้นหาชื่อช่าง / ตำแหน่ง..."
                      placeholder="-- ยังไม่ระบุช่างผู้รับผิดชอบ --"
                      options={[
                        { value: "", label: "-- ยังไม่ระบุช่างผู้รับผิดชอบ --" },
                        ...users.map((u) => ({
                          value: u.id,
                          label: u.fullName,
                          subLabel: u.role,
                        })),
                      ]}
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      หมายเหตุเพิ่มเติม (สำหรับสื่อสารภายในทีมบริการ)
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="ระบุเงื่อนไขพิเศษ เช่น นัดเข้าตรวจช่วงบ่าย, เตรียมอะไหล่รุ่นพิเศษ..."
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full flex-1 min-h-[86px] text-base sm:text-sm border border-gray-300 rounded-xl p-3.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sticky Symmetrical Bottom Action Bar ── */}
            <div className="fixed bottom-0 left-0 right-0 z-30 md:sticky md:bottom-4 md:mt-8 bg-white/95 backdrop-blur-md border-t md:border border-gray-200/90 md:rounded-2xl shadow-2xl min-h-[84px] md:min-h-0 flex items-center pl-[80px] pr-4 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:py-3.5">
              <div className="w-full flex items-center justify-between gap-2 md:gap-4">
                <div className="hidden md:flex items-center gap-3 text-xs text-gray-600">
                  {canViewAll ? (
                    <Link
                      href="/service/calls"
                      className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#ff2301] transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>ยกเลิกและกลับหน้ารายการรวม</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveView("my-cases")}
                      className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#ff2301] transition-colors"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>ดูเคสที่ฉันส่งแจ้ง ({myLogs.length})</span>
                    </button>
                  )}

                  <span className="text-gray-300">|</span>

                  {isFormValid ? (
                    <span className="inline-flex items-center gap-1.5 text-gray-900 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-[#ff2301]" />
                      ข้อมูลจำเป็นครบถ้วน พร้อมส่งแจ้งเซลล์ &amp; เซอร์วิส
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-gray-500 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
                      กรอกข้อมูลจำเป็นแล้ว {completedCount}/{totalRequired} ช่อง
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 md:px-4 h-11 md:h-10 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl transition-all shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างฟอร์ม</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 md:px-6 h-11 md:h-10 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-red-500/25 transition-all transform active:scale-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>
                          เปิดเคสใหม่ {!isFormValid ? `(${completedCount}/${totalRequired})` : ""}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
              VIEW 2: MY SUBMITTED CASES TRACKER (Symmetrical 4-KPI + 50/50 Filter + 9:3 Cards)
             ═══════════════════════════════════════════════════════════════ */
          <div className="space-y-4 sm:space-y-5">
            {/* Symmetrical 4-Card Equal-Height KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 items-stretch">
              <div
                onClick={() => setMyStatusFilter("ALL")}
                className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
                  myStatusFilter === "ALL"
                    ? "border-gray-400 ring-2 ring-gray-500/15"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-black text-gray-600 tracking-tight truncate">
                    เคสที่ฉันส่งแจ้งทั้งหมด
                  </p>
                  <p className="text-xl xl:text-2xl font-black text-gray-900 font-mono leading-tight">
                    {myLogs.length.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                    My Submitted Cases
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ff2301] border border-red-200/70 flex items-center justify-center shrink-0">
                  <PhoneCall size={20} />
                </div>
              </div>

              <div
                onClick={() => setMyStatusFilter("PENDING")}
                className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
                  myStatusFilter === "PENDING"
                    ? "border-amber-400 ring-2 ring-amber-500/15"
                    : "border-amber-200 hover:border-amber-300"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-black text-amber-700 tracking-tight truncate">
                    รับแจ้งแล้ว / รอนัดหมาย
                  </p>
                  <p className="text-xl xl:text-2xl font-black text-gray-900 font-mono leading-tight">
                    {myPendingCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                    Pending Inspection
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
              </div>

              <div
                onClick={() => setMyStatusFilter("IN_PROGRESS")}
                className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
                  myStatusFilter === "IN_PROGRESS"
                    ? "border-blue-400 ring-2 ring-blue-500/15"
                    : "border-blue-200 hover:border-blue-300"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-black text-blue-700 tracking-tight truncate">
                    กำลังดำเนินการแก้ไข
                  </p>
                  <p className="text-xl xl:text-2xl font-black text-gray-900 font-mono leading-tight">
                    {myInProgressCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                    In Progress
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0">
                  <Wrench size={20} />
                </div>
              </div>

              <div
                onClick={() => setMyStatusFilter("COMPLETED")}
                className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
                  myStatusFilter === "COMPLETED"
                    ? "border-emerald-400 ring-2 ring-emerald-500/15"
                    : "border-emerald-200 hover:border-emerald-300"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-black text-emerald-700 tracking-tight truncate">
                    ปิดเคสเรียบร้อยแล้ว
                  </p>
                  <p className="text-xl xl:text-2xl font-black text-gray-900 font-mono leading-tight">
                    {myCompletedCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                    Completed / Closed
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>

            {/* Symmetrical 50/50 Filter Tabs & Search Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 sm:px-5 sm:py-3.5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-3.5 md:gap-4 items-center">
              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 sm:h-11 bg-gray-100/90 border border-gray-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMyStatusFilter("ALL")}
                  className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    myStatusFilter === "ALL"
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                  }`}
                >
                  <span className="truncate">ทั้งหมด</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      myStatusFilter === "ALL"
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {myLogs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMyStatusFilter("PENDING")}
                  className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    myStatusFilter === "PENDING"
                      ? "bg-[#ff2301] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                  }`}
                >
                  <span className="truncate">รอนัดหมาย</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      myStatusFilter === "PENDING"
                        ? "bg-white/20 text-white"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {myPendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMyStatusFilter("IN_PROGRESS")}
                  className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    myStatusFilter === "IN_PROGRESS"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                  }`}
                >
                  <span className="truncate">กำลังแก้ไข</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      myStatusFilter === "IN_PROGRESS"
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {myInProgressCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMyStatusFilter("COMPLETED")}
                  className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                    myStatusFilter === "COMPLETED"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                  }`}
                >
                  <span className="truncate">ปิดเคสแล้ว</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      myStatusFilter === "COMPLETED"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {myCompletedCount}
                  </span>
                </button>
              </div>

              <div className="lg:col-span-6 relative w-full">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={mySearchTerm}
                  onChange={(e) => setMySearchTerm(e.target.value)}
                  placeholder="ค้นหาเลขเคส SV, ชื่อลูกค้า, รุ่น Inverter, อาการ..."
                  className="w-full h-11 pl-10 pr-9 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10 transition-all"
                />
                {mySearchTerm && (
                  <button
                    type="button"
                    onClick={() => setMySearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* My Submitted Case Cards */}
            {filteredMyLogs.length === 0 ? (
              <div className="min-h-[260px] bg-white rounded-2xl border border-gray-200/80 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                  <PhoneCall size={26} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-gray-800">
                    {myLogs.length === 0
                      ? "คุณยังไม่มีรายการเคสที่ส่งแจ้ง"
                      : "ไม่พบรายการเคสตามเงื่อนไขที่ค้นหา"}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    เมื่อคุณกดส่งข้อมูลแจ้งปัญหาลูกค้า ข้อมูลจะถูกส่งให้ทีมเซลล์และเซอร์วิสทันที และสามารถติดตามความคืบหน้าของเคสได้ที่หน้านี้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView("form")}
                  className="mt-1 h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
                >
                  <Plus size={15} />
                  <span>เปิดเคสแจ้งปัญหาใหม่</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredMyLogs.map((item) => {
                  const statusMeta = getCallStatusMeta(item.status);
                  const techName =
                    item.responsible?.fullName || item.responsibleName || "";

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-200/90 hover:border-red-300 transition-all shadow-xs hover:shadow-md p-4 sm:p-5 space-y-3.5"
                    >
                      {/* Symmetrical Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                            {item.caseNumber}
                          </span>

                          {item.internalCompany && (
                            <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-[11px] font-black bg-gray-100 text-gray-700 border border-gray-200">
                              {item.internalCompany}
                            </span>
                          )}

                          <span
                            className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold border ${statusMeta.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            <span>{statusMeta.label}</span>
                          </span>

                          {item.linkedQuotationNo && (
                            <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              QT: {item.linkedQuotationNo}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-400 font-medium inline-flex items-center gap-1 shrink-0">
                          <Calendar size={12} className="shrink-0" />
                          <span>วันที่รับแจ้ง: {formatThaiDate(item.receivedDate)}</span>
                        </span>
                      </div>

                      {/* Symmetrical 12-Column Body (9 Cols Details + 3 Cols Actions) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                        <div className="lg:col-span-9 h-full flex flex-col justify-between gap-3.5 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                                <Building2 size={18} className="text-[#ff2301] shrink-0" />
                                <span className="truncate">{item.companyName || "-"}</span>
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1 font-semibold">
                                  <User size={13} className="text-gray-400 shrink-0" />
                                  <span>ผู้ติดต่อ: {item.contactName || "-"}</span>
                                </span>
                                {item.contactPhone && (
                                  <span className="inline-flex items-center gap-1 font-mono text-gray-500">
                                    <Phone size={12} className="text-gray-400 shrink-0" />
                                    <span>{item.contactPhone}</span>
                                  </span>
                                )}
                                {item.siteAddress && (
                                  <span className="inline-flex items-center gap-1 text-gray-500">
                                    <MapPin size={12} className="text-gray-400 shrink-0" />
                                    <span className="truncate max-w-[260px]">
                                      {item.siteAddress}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="min-w-[180px] h-14 px-3.5 rounded-xl border bg-gray-50 border-gray-200/80 flex flex-col justify-center sm:text-right shrink-0">
                              <div className="text-[10px] font-bold text-gray-400 uppercase">
                                รุ่น Inverter / S/N
                              </div>
                              <div className="text-sm font-black font-mono text-gray-900 truncate leading-tight">
                                {item.inverterModel || "-"}
                                {item.serialNumber ? ` • ${item.serialNumber}` : ""}
                              </div>
                            </div>
                          </div>

                          {/* 2 Equal-Height Sub-Cards */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch text-xs">
                            <div className="h-full bg-gray-50/90 rounded-xl p-3.5 border border-gray-200/80 flex flex-col justify-between gap-1.5">
                              <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                <AlertCircle size={14} className="text-[#ff2301] shrink-0" />
                                <span>อาการและรายละเอียดที่แจ้ง</span>
                              </div>
                              <div className="text-gray-600 space-y-1 flex-1">
                                <p className="text-gray-800 font-medium whitespace-pre-wrap">
                                  {item.reportedIssue || "-"}
                                </p>
                                {item.notes && (
                                  <p className="text-gray-500 pt-1">
                                    หมายเหตุ: {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="h-full bg-gray-50/90 rounded-xl p-3.5 border border-gray-200/80 flex flex-col justify-between gap-1.5">
                              <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                <Wrench size={14} className="text-[#ff2301] shrink-0" />
                                <span>ความคืบหน้าจากทีมเซอร์วิส &amp; เซลล์</span>
                              </div>
                              <div className="text-gray-600 space-y-1 flex-1">
                                <div>
                                  ช่างผู้รับผิดชอบ:{" "}
                                  <b className="text-gray-900">
                                    {techName || "รอจัดสรรช่างผู้รับผิดชอบ"}
                                  </b>
                                </div>
                                {item.analyzedCause && (
                                  <div>
                                    สาเหตุที่พบ:{" "}
                                    <b className="text-gray-800">{item.analyzedCause}</b>
                                  </div>
                                )}
                                {item.recommendedSolution && (
                                  <div>
                                    การแก้ไข:{" "}
                                    <b className="text-emerald-700">
                                      {item.recommendedSolution}
                                    </b>
                                  </div>
                                )}
                                {item.assignedSalesName && (
                                  <div>
                                    เซลล์ผู้รับเรื่องต่อ:{" "}
                                    <b className="text-[#ff2301]">{item.assignedSalesName}</b>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right 3 Cols: Uniform Action Stack */}
                        <div className="lg:col-span-3 h-full bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/80 flex flex-col justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMyCase(item)}
                            className="w-full h-10 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
                          >
                            <Eye size={15} className="text-[#ff2301] shrink-0" />
                            <span>ดูรายละเอียดสถานะเคส</span>
                          </button>

                          <Link
                            href={`/service/calls/${item.id}/pdf`}
                            target="_blank"
                            className="w-full h-10 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all whitespace-nowrap"
                          >
                            <Printer size={14} className="text-[#ff2301] shrink-0" />
                            <span>ดูใบรายงานเคส (PDF)</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Read-Only Case Progress Modal (For Tracking Own Submitted Cases) ── */}
      {selectedMyCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs"
            onClick={() => setSelectedMyCase(null)}
          />

          <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-gray-900">
                      สถานะเคสแจ้งปัญหาลูกค้า
                    </h2>
                    <span className="h-6 inline-flex items-center px-2.5 rounded-full text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                      {selectedMyCase.caseNumber}
                    </span>
                    <span
                      className={`h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-bold border ${
                        getCallStatusMeta(selectedMyCase.status).badge
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          getCallStatusMeta(selectedMyCase.status).dot
                        }`}
                      />
                      <span>{getCallStatusMeta(selectedMyCase.status).label}</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    วันที่รับแจ้ง: <b>{formatThaiDate(selectedMyCase.receivedDate)}</b> • แจ้งโดย:{" "}
                    <b>{currentUser?.fullName || "-"}</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMyCase(null)}
                className="w-9 h-9 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-gray-50/50">
              {/* Customer & Hardware Equal-Height Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-gray-200 p-4 space-y-2 text-xs">
                  <div className="font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} className="text-[#ff2301] shrink-0" />
                    <span>ข้อมูลลูกค้า &amp; สถานที่</span>
                  </div>
                  <div className="space-y-1.5 text-gray-700">
                    <div>
                      <span className="text-gray-400">บริษัท/ลูกค้า:</span>{" "}
                      <b className="text-gray-900">{selectedMyCase.companyName || "-"}</b>
                    </div>
                    <div>
                      <span className="text-gray-400">ผู้ติดต่อ:</span>{" "}
                      <b>{selectedMyCase.contactName || "-"}</b>
                    </div>
                    <div>
                      <span className="text-gray-400">เบอร์โทร:</span>{" "}
                      <b className="font-mono">{selectedMyCase.contactPhone || "-"}</b>
                    </div>
                    {selectedMyCase.siteAddress && (
                      <div>
                        <span className="text-gray-400">ที่อยู่หน้างาน:</span>{" "}
                        <span>{selectedMyCase.siteAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-full bg-white rounded-2xl border border-gray-200 p-4 space-y-2 text-xs">
                  <div className="font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={15} className="text-[#ff2301] shrink-0" />
                    <span>อุปกรณ์ &amp; ผู้รับผิดชอบ</span>
                  </div>
                  <div className="space-y-1.5 text-gray-700">
                    <div>
                      <span className="text-gray-400">รุ่น Inverter:</span>{" "}
                      <b className="font-mono text-gray-900">
                        {selectedMyCase.inverterModel || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-gray-400">Serial Number:</span>{" "}
                      <b className="font-mono">{selectedMyCase.serialNumber || "-"}</b>
                    </div>
                    <div>
                      <span className="text-gray-400">ช่างผู้รับผิดชอบ:</span>{" "}
                      <b className="text-gray-900">
                        {selectedMyCase.responsible?.fullName ||
                          selectedMyCase.responsibleName ||
                          "รอจัดสรรช่าง"}
                      </b>
                    </div>
                    {selectedMyCase.assignedSalesName && (
                      <div>
                        <span className="text-gray-400">เซลล์ผู้รับเรื่องต่อ:</span>{" "}
                        <b className="text-[#ff2301]">{selectedMyCase.assignedSalesName}</b>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Issue & Diagnosis Equal-Height Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-gray-200 p-4 space-y-2 text-xs">
                  <div className="font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={15} className="text-[#ff2301] shrink-0" />
                    <span>ปัญหาที่แจ้งเข้าระบบ</span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {selectedMyCase.reportedIssue || "-"}
                  </p>
                  {selectedMyCase.notes && (
                    <p className="text-gray-500 pt-1 border-t border-gray-100">
                      หมายเหตุเพิ่มเติม: {selectedMyCase.notes}
                    </p>
                  )}
                </div>

                <div className="h-full bg-white rounded-2xl border border-gray-200 p-4 space-y-2 text-xs">
                  <div className="font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench size={15} className="text-emerald-600 shrink-0" />
                    <span>ผลการตรวจสอบและแก้ไข</span>
                  </div>
                  <div className="space-y-1.5 text-gray-700">
                    <div>
                      <span className="text-gray-400">สาเหตุที่วิเคราะห์:</span>{" "}
                      <b>{selectedMyCase.analyzedCause || "อยู่ระหว่างรอตรวจสอบ"}</b>
                    </div>
                    <div>
                      <span className="text-gray-400">แนวทางแก้ไข:</span>{" "}
                      <b>{selectedMyCase.recommendedSolution || "-"}</b>
                    </div>
                    {selectedMyCase.linkedQuotationNo && (
                      <div>
                        <span className="text-gray-400">เลขใบเสนอราคา:</span>{" "}
                        <b className="font-mono text-blue-700">
                          {selectedMyCase.linkedQuotationNo}
                        </b>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Before / After Photos if uploaded by Technician */}
              {(normalizePhotos(selectedMyCase.photosBefore).length > 0 ||
                normalizePhotos(selectedMyCase.photosAfter).length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <div className="h-full bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5">
                    <div className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <Camera size={15} className="text-amber-600 shrink-0" />
                      <span>
                        รูปภาพก่อนแก้ไข ({normalizePhotos(selectedMyCase.photosBefore).length} รูป)
                      </span>
                    </div>
                    {normalizePhotos(selectedMyCase.photosBefore).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {normalizePhotos(selectedMyCase.photosBefore).map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="aspect-4/3 rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                          >
                            <img
                              src={url}
                              alt={`Before ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="min-h-[96px] flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        ไม่มีรูปภาพก่อนแก้ไข
                      </div>
                    )}
                  </div>

                  <div className="h-full bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5">
                    <div className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <Camera size={15} className="text-emerald-600 shrink-0" />
                      <span>
                        รูปภาพหลังแก้ไข ({normalizePhotos(selectedMyCase.photosAfter).length} รูป)
                      </span>
                    </div>
                    {normalizePhotos(selectedMyCase.photosAfter).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {normalizePhotos(selectedMyCase.photosAfter).map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="aspect-4/3 rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                          >
                            <img
                              src={url}
                              alt={`After ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="min-h-[96px] flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        ไม่มีรูปภาพหลังแก้ไข
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between gap-3">
              <Link
                href={`/service/calls/${selectedMyCase.id}/pdf`}
                target="_blank"
                className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all"
              >
                <Printer size={15} className="text-[#ff2301] shrink-0" />
                <span>พิมพ์ใบรายงานเคส (PDF)</span>
              </Link>

              <div className="flex items-center gap-2.5">
                {canViewAll && (
                  <Link
                    href={`/service/calls/${selectedMyCase.id}`}
                    className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-xs font-bold text-white transition-all"
                  >
                    <FileText size={14} className="shrink-0" />
                    <span>เปิดหน้าจัดการเคสเต็ม</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMyCase(null)}
                  className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Full preview"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
