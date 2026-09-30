"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Building2,
  User,
  Phone,
  Cpu,
  AlertCircle,
  Clock,
  CheckCircle2,
  Wrench,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Printer,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
} from "lucide-react";
import Swal from "sweetalert2";
import { updateServiceCallLog } from "@/app/actions/service-calls";

interface UserOption {
  id: string;
  fullName: string;
  role: string;
}

interface ServiceCallDetailClientProps {
  initialData: any;
  currentUser: any;
  users?: UserOption[];
}

// ── Status Configuration ──
export const CALL_STATUS_OPTIONS = [
  {
    value: "Received notification",
    label: "เปิดเคส (รับแจ้งแล้ว)",
    step: 1,
    desc: "รับเรื่องเข้าระบบ รอจัดสรรช่างหรือนัดหมาย",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-[#ff2301]",
  },
  {
    value: "Waiting for on-site inspection",
    label: "รอนัดหมายเข้าตรวจ",
    step: 2,
    desc: "รอนัดหมายวันเข้าตรวจสอบหน้างาน",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-[#ff2301]",
  },
  {
    value: "System still has issues",
    label: "กำลังดำเนินการ (ระบบยังมีปัญหา)",
    step: 3,
    desc: "อยู่ระหว่างตรวจเช็คหรือแก้ไข แต่ยังไม่สมบูรณ์",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-600",
  },
  {
    value: "Machine broken",
    label: "ส่งซ่อม/เปลี่ยน (เครื่องเสีย)",
    step: 3,
    desc: "เครื่องมีปัญหา ส่งศูนย์บริการหรือเปลี่ยนอะไหล่",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-700",
  },
  {
    value: "Motor problem",
    label: "ปัญหามอเตอร์",
    step: 3,
    desc: "ตรวจพบว่าปัญหาเกิดจากมอเตอร์ภายนอก",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-600",
  },
  {
    value: "Low water level in the well",
    label: "ปัญหาสภาพแวดล้อม (น้ำในบ่อน้อย)",
    step: 3,
    desc: "ระดับน้ำไม่เพียงพอ ไม่ใช่ปัญหาจากตัวเครื่อง",
    badge: "bg-gray-100 text-gray-800 border-gray-300",
    dot: "bg-gray-500",
  },
  {
    value: "Customer has not yet made changes",
    label: "รอติดตาม (ลูกค้ายังไม่แก้ไข)",
    step: 3,
    desc: "แจ้งแนวทางแล้ว รอให้ลูกค้าปรับปรุงแก้ไข",
    badge: "bg-gray-100 text-gray-700 border-gray-300",
    dot: "bg-gray-500",
  },
  {
    value: "System running smoothly",
    label: "ปิดเคสแล้ว (ระบบทำงานปกติ)",
    step: 4,
    desc: "แก้ไขเรียบร้อย ระบบทำงานได้ตามปกติ",
    badge: "bg-gray-900 text-white border-gray-800",
    dot: "bg-white",
  },
];

export default function ServiceCallDetailClient({
  initialData,
  currentUser,
  users = [],
}: ServiceCallDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const initialFollowUp = initialData.followUpDate
    ? new Date(initialData.followUpDate).toISOString().split("T")[0]
    : "";

  const [formData, setFormData] = useState({
    status: initialData.status || "Received notification",
    analyzedCause: initialData.analyzedCause || "",
    recommendedSolution: initialData.recommendedSolution || "",
    followUpDate: initialFollowUp,
    responsibleId: initialData.responsibleId || "",
    notes: initialData.notes || "",
  });

  // Check if current user has edit permission
  const isManagerOrAdmin =
    currentUser?.role === "Service Engineer MGR" ||
    currentUser?.role === "Service Engineer MGR." ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "Executive";

  const isResponsible = initialData.responsibleId === currentUser?.id;
  const isCreator = initialData.createdBy === currentUser?.id;
  const canEdit = isManagerOrAdmin || isResponsible || isCreator;
  const canReassign = isManagerOrAdmin || isCreator;

  // Track if changes have been made
  const isDirty = useMemo(() => {
    return (
      formData.status !== (initialData.status || "Received notification") ||
      formData.analyzedCause !== (initialData.analyzedCause || "") ||
      formData.recommendedSolution !== (initialData.recommendedSolution || "") ||
      formData.followUpDate !== initialFollowUp ||
      formData.responsibleId !== (initialData.responsibleId || "") ||
      formData.notes !== (initialData.notes || "")
    );
  }, [formData, initialData, initialFollowUp]);

  // Current status metadata
  const currentStatusMeta = useMemo(() => {
    const found = CALL_STATUS_OPTIONS.find((s) => s.value === formData.status);
    if (found) return found;
    return {
      value: formData.status,
      label: formData.status || "เปิดเคส",
      step: 1,
      desc: "สถานะเดิมจากระบบ",
      badge: "bg-gray-100 text-gray-800 border-gray-300",
      dot: "bg-gray-500",
    };
  }, [formData.status]);

  // Lifecycle stage mapping (1 to 4)
  const currentLifecycleStep = useMemo(() => {
    const status = formData.status;
    if (!status || status === "Received notification" || status.includes("เปิดเคส")) return 1;
    if (status === "Waiting for on-site inspection" || status.includes("รอนัดหมาย")) return 2;
    if (status === "System running smoothly" || status.includes("ปิดเคส") || status.includes("ปกติ")) return 4;
    return 3;
  }, [formData.status]);

  // Follow-up date calculations
  const followUpMeta = useMemo(() => {
    if (!formData.followUpDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(formData.followUpDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `เกินกำหนดติดตาม ${Math.abs(diffDays)} วันแล้ว`,
        badge: "bg-red-50 text-red-700 border-red-200 font-medium",
        isPast: true,
      };
    } else if (diffDays === 0) {
      return {
        text: "ถึงกำหนดติดตามผลวันนี้",
        badge: "bg-red-600 text-white border-red-600 font-semibold",
        isToday: true,
      };
    } else if (diffDays === 1) {
      return {
        text: "ถึงกำหนดติดตามวันพรุ่งนี้",
        badge: "bg-gray-100 text-gray-800 border-gray-300 font-medium",
        isUpcoming: true,
      };
    } else {
      return {
        text: `อีก ${diffDays} วัน (${new Date(formData.followUpDate).toLocaleDateString("th-TH")})`,
        badge: "bg-gray-50 text-gray-700 border-gray-200",
        isUpcoming: true,
      };
    }
  }, [formData.followUpDate]);

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset changes
  const handleReset = () => {
    setFormData({
      status: initialData.status || "Received notification",
      analyzedCause: initialData.analyzedCause || "",
      recommendedSolution: initialData.recommendedSolution || "",
      followUpDate: initialFollowUp,
      responsibleId: initialData.responsibleId || "",
      notes: initialData.notes || "",
    });
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      Swal.fire({
        icon: "error",
        title: "ไม่มีสิทธิ์ดำเนินการ",
        text: "คุณสามารถแก้ไขได้เฉพาะรายการที่คุณรับผิดชอบหรือสร้างเองเท่านั้น",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        status: formData.status,
        analyzedCause: formData.analyzedCause || null,
        recommendedSolution: formData.recommendedSolution || null,
        followUpDate: formData.followUpDate || null,
        notes: formData.notes || null,
      };

      if (canReassign) {
        payload.responsibleId = formData.responsibleId || null;
      }

      await updateServiceCallLog(initialData.id, payload);

      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลเรียบร้อย",
        text: "อัปเดตข้อมูลบันทึกแจ้งปัญหาลูกค้าสำเร็จ",
        timer: 1600,
        showConfirmButton: false,
      });

      router.refresh();
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

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Formatted Dates
  const receivedDateFormatted = useMemo(() => {
    if (!initialData.receivedDate) return "-";
    return new Date(initialData.receivedDate).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [initialData.receivedDate]);

  const createdAtFormatted = useMemo(() => {
    if (!initialData.createdAt) return "-";
    return new Date(initialData.createdAt).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [initialData.createdAt]);

  const updatedAtFormatted = useMemo(() => {
    if (!initialData.updatedAt) return "-";
    return new Date(initialData.updatedAt).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [initialData.updatedAt]);

  return (
    <div className="min-h-screen bg-gray-50/60 pb-28 print:bg-white print:pb-0">
      {/* ── Top Navigation & Breadcrumb Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 print:static print:border-b-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Left: Back Link & Breadcrumb */}
            <div className="flex items-center gap-3">
              <Link
                href="/service/calls"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#ff2301] transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับหน้ารายการ</span>
              </Link>
              <div className="hidden sm:flex items-center text-xs text-gray-400 gap-1.5 font-medium">
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-500">งานบริการ</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-500">บันทึกแจ้งปัญหา</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-900 font-semibold">{initialData.caseNumber}</span>
              </div>
            </div>

            {/* Right: Quick Case Badge & Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleCopy(initialData.caseNumber, "caseNumber")}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-mono font-semibold transition-colors border border-gray-200"
                title="คลิกเพื่อคัดลอกเลขเคส"
              >
                <span>{initialData.caseNumber}</span>
                {copiedField === "caseNumber" ? (
                  <Check className="w-3.5 h-3.5 text-[#ff2301]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm ${currentStatusMeta.badge}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusMeta.dot}`} />
                {currentStatusMeta.label}
              </span>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors print:hidden shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span className="hidden sm:inline">พิมพ์เอกสาร</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ── Main Hero Card (Symmetrical Header) ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
          {/* Subtle Top Red Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-800" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Header Info */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 shadow-inner">
                <Wrench className="w-7 h-7 text-[#ff2301]" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-gray-900 text-white">
                    {initialData.caseNumber}
                  </span>
                  {initialData.legacyNo && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-600 border border-gray-200">
                      Legacy #{initialData.legacyNo}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    รับแจ้ง: {receivedDateFormatted}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  {initialData.companyName}
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span>ผู้ติดต่อ: {initialData.contactName}</span>
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs">
                    {initialData.inverterModel}
                  </span>
                </p>
              </div>
            </div>

            {/* Right Meta Info & Mode Chips */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-[#ff2301] text-xs font-medium rounded-full border border-red-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    โหมดแก้ไขข้อมูล
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                    <Lock className="w-3.5 h-3.5" />
                    มุมมองอ่านอย่างเดียว
                  </span>
                )}
                {isManagerOrAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900 text-white text-xs font-medium rounded-full">
                    ผู้จัดการ / Admin
                  </span>
                )}
              </div>

              {followUpMeta && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border ${followUpMeta.badge}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{followUpMeta.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Lifecycle Milestone Stepper (4 Symmetrical Steps) ── */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              ขั้นตอนการดำเนินงาน (Case Lifecycle Progression)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div
                className={`relative rounded-xl p-4 border transition-all ${
                  currentLifecycleStep >= 1
                    ? "bg-white border-red-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep > 1
                        ? "bg-gray-900 text-white"
                        : currentLifecycleStep === 1
                        ? "bg-[#ff2301] text-white shadow-md shadow-red-500/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentLifecycleStep > 1 ? <Check className="w-4 h-4" /> : "1"}
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 01
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-sm">รับแจ้งเปิดเคส</div>
                <div className="text-xs text-gray-500 mt-0.5">บันทึกข้อมูลและอาการที่พบ</div>
                {currentLifecycleStep === 1 && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#ff2301]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301] animate-pulse" />
                    สถานะปัจจุบัน
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div
                className={`relative rounded-xl p-4 border transition-all ${
                  currentLifecycleStep >= 2
                    ? "bg-white border-red-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep > 2
                        ? "bg-gray-900 text-white"
                        : currentLifecycleStep === 2
                        ? "bg-[#ff2301] text-white shadow-md shadow-red-500/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentLifecycleStep > 2 ? <Check className="w-4 h-4" /> : "2"}
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 02
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-sm">นัดหมายเข้าตรวจ</div>
                <div className="text-xs text-gray-500 mt-0.5">กำหนดการเข้าตรวจหน้างาน</div>
                {currentLifecycleStep === 2 && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#ff2301]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301] animate-pulse" />
                    สถานะปัจจุบัน
                  </div>
                )}
              </div>

              {/* Step 3 */}
              <div
                className={`relative rounded-xl p-4 border transition-all ${
                  currentLifecycleStep >= 3
                    ? "bg-white border-red-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep > 3
                        ? "bg-gray-900 text-white"
                        : currentLifecycleStep === 3
                        ? "bg-[#ff2301] text-white shadow-md shadow-red-500/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentLifecycleStep > 3 ? <Check className="w-4 h-4" /> : "3"}
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 03
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-sm">วิเคราะห์ & แก้ไข</div>
                <div className="text-xs text-gray-500 mt-0.5">ส่งซ่อม/เปลี่ยน/รอติดตาม</div>
                {currentLifecycleStep === 3 && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#ff2301]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301] animate-pulse" />
                    สถานะปัจจุบัน
                  </div>
                )}
              </div>

              {/* Step 4 */}
              <div
                className={`relative rounded-xl p-4 border transition-all ${
                  currentLifecycleStep === 4
                    ? "bg-white border-gray-900 shadow-sm"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentLifecycleStep === 4
                        ? "bg-gray-900 text-white shadow-md shadow-gray-900/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 uppercase">
                    Stage 04
                  </span>
                </div>
                <div className="font-bold text-gray-900 text-sm">ปิดเคสสมบูรณ์</div>
                <div className="text-xs text-gray-500 mt-0.5">ระบบทำงานได้ตามปกติ</div>
                {currentLifecycleStep === 4 && (
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-gray-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                    ปิดงานเรียบร้อย
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content Form / Symmetrical 2-Column Layout ── */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* ════════════════════════════════════════════════
                COLUMN 1 (LEFT): ข้อมูลลูกค้า อุปกรณ์ และบุคลากร
                ════════════════════════════════════════════════ */}
            <div className="space-y-8">
              {/* Card 1: ข้อมูลลูกค้าและผู้ติดต่อ */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        ข้อมูลลูกค้าและผู้ติดต่อ
                      </h2>
                      <p className="text-xs text-gray-500">Customer & Contact Information</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
                    ข้อมูลต้นเรื่อง
                  </span>
                </div>

                <div className="space-y-4">
                  {/* บริษัท / ลูกค้า */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      ชื่อบริษัท / ลูกค้า
                    </label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="font-semibold text-gray-900 text-sm">
                        {initialData.companyName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(initialData.companyName, "companyName")}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        title="คัดลอกชื่อบริษัท"
                      >
                        {copiedField === "companyName" ? (
                          <Check className="w-4 h-4 text-[#ff2301]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ชื่อผู้ติดต่อ & เบอร์โทร */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">
                        ชื่อผู้ติดต่อ
                      </label>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-800">
                          {initialData.contactName}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">
                        เบอร์โทรศัพท์ / LINE
                      </label>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-4 h-4 text-[#ff2301] shrink-0" />
                          {initialData.contactPhone ? (
                            <a
                              href={`tel:${initialData.contactPhone}`}
                              className="text-sm font-semibold text-gray-900 hover:text-[#ff2301] hover:underline truncate"
                            >
                              {initialData.contactPhone}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">ไม่ได้ระบุเบอร์โทร</span>
                          )}
                        </div>
                        {initialData.contactPhone && (
                          <button
                            type="button"
                            onClick={() => handleCopy(initialData.contactPhone, "phone")}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            title="คัดลอกเบอร์โทร"
                          >
                            {copiedField === "phone" ? (
                              <Check className="w-4 h-4 text-[#ff2301]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* วันที่รับแจ้ง */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      วันที่และเวลาที่รับแจ้ง
                    </label>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{receivedDateFormatted}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: ข้อมูลอุปกรณ์และอาการที่พบ */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        ข้อมูลอุปกรณ์และอาการที่พบ
                      </h2>
                      <p className="text-xs text-gray-500">Hardware & Reported Problem</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
                    ข้อมูลปัญหา
                  </span>
                </div>

                <div className="space-y-4">
                  {/* รุ่นอินเวอร์เตอร์ */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      โมเดล / รุ่น Inverter
                    </label>
                    <div className="p-3 bg-red-50/50 rounded-xl border border-red-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#ff2301]" />
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {initialData.inverterModel}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#ff2301] uppercase tracking-wide">
                        Inverter Model
                      </span>
                    </div>
                  </div>

                  {/* อาการที่พบ (ลูกค้าแจ้ง) */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      อาการที่พบ (ข้อมูลจากลูกค้าแจ้ง)
                    </label>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-[#ff2301] mt-0.5 shrink-0" />
                        <div className="text-sm text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                          {initialData.reportedIssue}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: บุคลากรผู้รับเรื่องและผู้รับผิดชอบ */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        เจ้าหน้าที่ผู้รับเรื่องและผู้รับผิดชอบ
                      </h2>
                      <p className="text-xs text-gray-500">Staff Assignment & Responsibility</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
                    บุคลากร
                  </span>
                </div>

                <div className="space-y-5">
                  {/* ผู้รับเรื่อง / เปิดเคส */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      ผู้รับเรื่อง (สร้างเอกสารเปิดเคส)
                    </label>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                          {initialData.creator?.fullName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {initialData.creator?.fullName || "ไม่ทราบผู้สร้าง"}
                          </div>
                          <div className="text-[11px] text-gray-400">เจ้าหน้าที่รับแจ้งเรื่อง</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 px-2.5 py-1 bg-white rounded-md border border-gray-200">
                        ผู้เปิดเคส
                      </span>
                    </div>
                  </div>

                  {/* ช่างผู้รับผิดชอบงานซ่อม/ตรวจเช็ค */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-700">
                        ช่างผู้รับผิดชอบงานซ่อม / ตรวจเช็ค
                      </label>
                      {canReassign && (
                        <span className="text-[11px] font-semibold text-[#ff2301]">
                          สามารถเปลี่ยนผู้รับผิดชอบได้
                        </span>
                      )}
                    </div>

                    {canReassign && users.length > 0 ? (
                      <select
                        name="responsibleId"
                        value={formData.responsibleId}
                        onChange={handleChange}
                        disabled={loading}
                        className="w-full text-sm font-medium border border-gray-300 rounded-xl p-3 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all"
                      >
                        <option value="">-- ยังไม่ระบุผู้รับผิดชอบ --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-xs font-bold text-[#ff2301]">
                            {initialData.responsible?.fullName?.charAt(0) || "S"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#ff2301]">
                              {initialData.responsible?.fullName ||
                                initialData.responsibleName ||
                                "ยังไม่ได้ระบุช่างผู้รับผิดชอบ"}
                            </div>
                            <div className="text-[11px] text-gray-400">ช่างเทคนิคประจำเคส</div>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-red-700 px-2.5 py-1 bg-red-50 rounded-md border border-red-200">
                          ผู้รับผิดชอบ
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════
                COLUMN 2 (RIGHT): อัปเดตสถานะ การวิเคราะห์ และวิธีแก้ไข
                ════════════════════════════════════════════════ */}
            <div className="space-y-8">
              {/* Card 4: สถานะปัจจุบันและกำหนดการติดตาม */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        สถานะงานและกำหนดการติดตาม
                      </h2>
                      <p className="text-xs text-gray-500">Workflow Status & Follow-up Schedule</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
                    ส่วนการอัปเดต
                  </span>
                </div>

                <div className="space-y-5">
                  {/* สถานะเคสปัจจุบัน */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      สถานะเคสปัจจุบัน <span className="text-[#ff2301]">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      disabled={!canEdit || loading}
                      className="w-full text-sm font-semibold border border-gray-300 rounded-xl p-3 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      {CALL_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {!CALL_STATUS_OPTIONS.some((o) => o.value === formData.status) && (
                        <option value={formData.status}>
                          {formData.status} (ข้อมูลเดิมจากระบบ)
                        </option>
                      )}
                    </select>

                    {/* Status Description pill */}
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${currentStatusMeta.dot}`} />
                      <span>{currentStatusMeta.desc}</span>
                    </div>
                  </div>

                  {/* วันที่ต้องการติดตามผล (Follow-up Date) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-700">
                        วันที่ต้องการติดตามผล (Follow-up Date)
                      </label>
                      {followUpMeta && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${followUpMeta.badge}`}
                        >
                          {followUpMeta.text}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        name="followUpDate"
                        value={formData.followUpDate}
                        onChange={handleChange}
                        disabled={!canEdit || loading}
                        className="w-full text-sm border border-gray-300 rounded-xl p-3 pl-10 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      ระบบจะแจ้งเตือนอัตโนมัติเมื่อถึงกำหนดเวลา และยังไม่ได้ปิดเคส
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 5: ผลการวิเคราะห์และวิธีแก้ไข */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        ผลการตรวจสอบและวิธีแก้ไข
                      </h2>
                      <p className="text-xs text-gray-500">Technical Analysis & Solution</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
                    ฝ่ายช่าง
                  </span>
                </div>

                <div className="space-y-5">
                  {/* สาเหตุที่วิเคราะห์พบ */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      สาเหตุที่วิเคราะห์พบ (Analyzed Cause)
                    </label>
                    <textarea
                      name="analyzedCause"
                      rows={3}
                      value={formData.analyzedCause}
                      onChange={handleChange}
                      disabled={!canEdit || loading}
                      placeholder="ระบุสาเหตุของปัญหาจากการตรวจเช็คหรือวิเคราะห์ทางเทคนิค..."
                      className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                    />
                  </div>

                  {/* วิธีแก้ไข / ข้อเสนอแนะให้ลูกค้า */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      วิธีแก้ไข / คำแนะนำให้ลูกค้า (Recommended Solution)
                    </label>
                    <textarea
                      name="recommendedSolution"
                      rows={3}
                      value={formData.recommendedSolution}
                      onChange={handleChange}
                      disabled={!canEdit || loading}
                      placeholder="ระบุแนวทางการแก้ไขที่ได้ทำ หรือสิ่งที่แนะนำให้ลูกค้าดำเนินการ..."
                      className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* Card 6: หมายเหตุภายในและประวัติระบบ */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        หมายเหตุภายในและข้อมูลระบบ
                      </h2>
                      <p className="text-xs text-gray-500">Internal Notes & System History</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
                    ประวัติ
                  </span>
                </div>

                <div className="space-y-4">
                  {/* หมายเหตุภายใน */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                      หมายเหตุภายใน (Internal Notes)
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      value={formData.notes}
                      onChange={handleChange}
                      disabled={!canEdit || loading}
                      placeholder="บันทึกข้อความภายใน เช่น เบอร์ติดต่อสำรอง, นัดหมายพิเศษ..."
                      className="w-full text-sm border border-gray-300 rounded-xl p-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                    />
                  </div>

                  {/* System Audit Timestamps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-[11px] font-semibold text-gray-400">สร้างเอกสารเมื่อ</div>
                      <div className="text-xs font-semibold text-gray-800 mt-0.5">
                        {createdAtFormatted}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-[11px] font-semibold text-gray-400">อัปเดตล่าสุดเมื่อ</div>
                      <div className="text-xs font-semibold text-gray-800 mt-0.5">
                        {updatedAtFormatted}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fixed Symmetrical Bottom Action Bar ── */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Left Side: Status / Dirty status */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <Link
                    href="/service/calls"
                    className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-[#ff2301] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>กลับหน้ารายการเคส</span>
                  </Link>

                  <span className="text-gray-300">|</span>

                  {isDirty ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      มีการแก้ไขข้อมูลที่ยังไม่ได้บันทึก
                    </span>
                  ) : (
                    <span className="text-gray-400">ข้อมูลเป็นปัจจุบันแล้ว</span>
                  )}
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={!isDirty || loading}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      คืนค่าเดิม
                    </button>
                  )}

                  {canEdit ? (
                    <button
                      type="submit"
                      disabled={loading || !isDirty}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-red-500/20 transition-all transform active:scale-95"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังบันทึกข้อมูล...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>บันทึกการแก้ไขเคส</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <span>โหมดอ่านอย่างเดียว (ไม่มีสิทธิ์แก้ไข)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
