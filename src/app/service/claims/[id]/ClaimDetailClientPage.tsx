"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Warehouse,
  ShieldCheck,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Video,
  Image as ImageIcon,
  Edit,
  Trash2,
  Printer,
  Wrench,
  ExternalLink,
  MessageSquare,
  Zap,
  Loader2,
  Check,
  X,
  Maximize2,
  Flame,
  Download,
  Copy,
  Info,
} from "lucide-react";
import {
  updateServiceClaimStatus,
  convertClaimToCheckReport,
  deleteServiceClaim,
} from "@/app/actions/serviceClaims";
import Swal from "sweetalert2";
import ClaimPrintPaper from "../components/ClaimPrintPaper";

interface ClaimDetailClientPageProps {
  claim: any;
  currentUser?: any;
}

export default function ClaimDetailClientPage({
  claim,
  currentUser,
}: ClaimDetailClientPageProps) {
  const router = useRouter();
  const [currentClaim, setCurrentClaim] = useState(claim);
  const [serviceNotes, setServiceNotes] = useState(claim?.serviceNotes || "");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConvertingCr, setIsConvertingCr] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [isCopiedVideo, setIsCopiedVideo] = useState(false);

  const handleCopyVideoUrl = () => {
    if (currentClaim?.defectVideoUrl) {
      navigator.clipboard.writeText(currentClaim.defectVideoUrl);
      setIsCopiedVideo(true);
      setTimeout(() => setIsCopiedVideo(false), 2000);
    }
  };

  const claimDateStr = currentClaim?.claimDate
    ? new Date(currentClaim.claimDate).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  const handledDateStr = currentClaim?.handledAt
    ? new Date(currentClaim.handledAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Status configuration
  const STATUS_CONFIG: Record<
    string,
    { label: string; badge: string; border: string; desc: string }
  > = {
    PENDING: {
      label: "รอรับเรื่อง (Pending)",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      border: "border-amber-400",
      desc: "รอเจ้าหน้าที่ฝ่ายบริการเปิดตรวจสอบข้อมูล",
    },
    UNDER_REVIEW: {
      label: "กำลังตรวจสอบ (Under Review)",
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      border: "border-blue-400",
      desc: "ฝ่ายบริการกำลังตรวจสอบเนมเพลท อาการเสีย และคลิปวีดีโอ",
    },
    ACCEPTED: {
      label: "รับเคลมแล้ว (Accepted)",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      border: "border-emerald-500",
      desc: "ฝ่ายบริการอนุมัติรับเคลมสินค้า พร้อมดำเนินการในขั้นตอนต่อไป",
    },
    CONVERTED_CR: {
      label: "เปิดใบตรวจเช็ค CR แล้ว",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
      border: "border-purple-500",
      desc: "ส่งต่อไปตรวจเช็คละเอียดในระบบ Check Report (CR)",
    },
    CONVERTED_RO: {
      label: "เปิดใบรับซ่อม RO แล้ว",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      border: "border-indigo-500",
      desc: "เปิดใบรับซ่อมสินค้า (Repair Order) เรียบร้อยแล้ว",
    },
    REJECTED: {
      label: "ปฏิเสธการเคลม (Rejected)",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      border: "border-rose-400",
      desc: "ไม่อยู่ในเงื่อนไขการรับประกัน หรือข้อมูลไม่ถูกต้อง",
    },
    CLOSED: {
      label: "เสร็จสิ้น / ปิดงาน (Closed)",
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      border: "border-slate-300",
      desc: "ดำเนินการเคลมเสร็จสิ้นสมบูรณ์",
    },
  };

  const currentStatus = STATUS_CONFIG[currentClaim.status] || STATUS_CONFIG.PENDING;

  // Handle Status Update
  const handleUpdateStatus = async (
    newStatus:
      | "PENDING"
      | "UNDER_REVIEW"
      | "ACCEPTED"
      | "REJECTED"
      | "CONVERTED_CR"
      | "CONVERTED_RO"
      | "CLOSED"
  ) => {
    setIsUpdatingStatus(true);
    try {
      const res = await updateServiceClaimStatus(currentClaim.id, {
        status: newStatus,
        serviceNotes,
        serviceHandledBy: currentUser?.fullName || "Service Staff",
      });

      if (!res.success) throw new Error(res.error);

      setCurrentClaim(res.data);
      Swal.fire({
        icon: "success",
        title: "อัปเดตสถานะสำเร็จ",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถอัปเดตสถานะได้",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Convert to CR
  const handleConvertToCr = async () => {
    const confirm = await Swal.fire({
      title: "เปิดใบตรวจเช็ค CR ทันที?",
      text: `ระบบจะสร้างเอกสารตรวจเช็ค (InverterCheckReport) พร้อมโอน Model (${currentClaim.model}), S/N, อาการเสีย และรูปเนมเพลทให้อัตโนมัติ`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, เปิดใบ CR ทันที",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    setIsConvertingCr(true);
    try {
      const res = await convertClaimToCheckReport(currentClaim.id);
      if (!res.success) throw new Error(res.error);

      await Swal.fire({
        icon: "success",
        title: "เปิดใบตรวจเช็ค CR สำเร็จ!",
        text: `สร้างใบตรวจเช็คเลขที่ ${res.data?.crNumber} เรียบร้อยแล้ว`,
        confirmButtonColor: "#059669",
        confirmButtonText: "ไปยังใบตรวจเช็ค CR",
      });

      router.push(`/service/check-reports/${res.data?.crId}/edit`);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถเปิดใบ CR ได้",
      });
    } finally {
      setIsConvertingCr(false);
    }
  };

  // Delete claim
  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: "ยืนยันการลบรายการนี้?",
      text: "หากลบแล้วจะไม่สามารถกู้คืนข้อมูลได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    const res = await deleteServiceClaim(currentClaim.id);
    if (res.success) {
      router.push("/service/claims");
    } else {
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: res.error });
    }
  };

  const defectPhotos: string[] = Array.isArray(currentClaim?.defectPhotos)
    ? currentClaim.defectPhotos
    : [];

  return (
    <>
      {/* Screen Interactive UI */}
      <div className="space-y-6 print:hidden">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
          <Link
            href="/service/claims"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-extrabold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                {currentClaim.claimNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentStatus.badge}`}
              >
                {currentStatus.label}
              </span>
              {currentClaim.urgency === "CRITICAL" && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-200" />
                  <span>ด่วนมาก</span>
                </span>
              )}
              {currentClaim.urgency === "URGENT" && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ด่วน</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              ใบแจ้งเคลมสินค้า: {currentClaim.model}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/service/claims/${currentClaim.id}/edit`}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>แก้ไข</span>
          </Link>
          <Link
            href={`/service/claims/${currentClaim.id}/print`}
            target="_blank"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="พิมพ์เอกสารทางการ (A4)"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>พิมพ์เอกสาร</span>
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition cursor-pointer"
            title="ลบรายการ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Core Info, Nameplate, Video, Defect Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Equipment Specs & Reporter */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">แผนกผู้แจ้ง</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  {currentClaim.department === "WAREHOUSE" ? (
                    <>
                      <Warehouse className="w-4 h-4 text-red-600" />
                      <span>คลังสินค้า (Warehouse)</span>
                    </>
                  ) : currentClaim.department === "QC" ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>ตรวจสอบคุณภาพ (QC)</span>
                    </>
                  ) : (
                    <span>{currentClaim.department}</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">ผู้แจ้งเรื่อง</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{currentClaim.reporterName}</span>
                </div>
                {currentClaim.reporterPhone && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {currentClaim.reporterPhone}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">วันที่แจ้งเคลม</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{claimDateStr}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">ประเภทอุปกรณ์</span>
                <div className="font-bold text-slate-900">
                  {currentClaim.equipmentType === "INVERTER"
                    ? "อินเวอร์เตอร์ / Soft Starter"
                    : currentClaim.equipmentType === "CONTROL_CABINET"
                    ? "ตู้คอนโทรลระบบไฟฟ้า"
                    : currentClaim.equipmentType === "MOTOR"
                    ? "มอเตอร์ไฟฟ้า"
                    : currentClaim.equipmentType === "PUMP"
                    ? "ปั๊มน้ำ"
                    : currentClaim.equipmentType}
                </div>
              </div>
            </div>

            {/* Model & S/N Highlight Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Model (รุ่นสินค้า)
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 font-mono">
                  {currentClaim.brand ? `${currentClaim.brand} ` : ""}
                  {currentClaim.model}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Serial Number (S/N)
                </span>
                <div className="text-base sm:text-lg font-black text-red-600 mt-0.5 font-mono">
                  {currentClaim.serialNumber || (
                    <span className="text-slate-400 font-normal text-xs">
                      (ดูภาพเนมเพลทด้านล่าง)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Symptoms / Defect Description */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>อาการเสีย / ปัญหาที่ตรวจพบ:</span>
              </span>
              <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {currentClaim.symptoms}
              </div>
            </div>
          </div>

          {/* Card 2: KEY PHOTO - รูปเนมเพลทข้างตัวเครื่อง */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    รูปเนมเพลทข้างตัวเครื่อง (S/N & Nameplate Photo)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ภาพถ่ายป้ายสเปกเครื่องและ Serial Number
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                จุดตรวจสอบ S/N
              </span>
            </div>

            {currentClaim.nameplatePhotoUrl ? (
              <div className="relative border-2 border-black rounded-xl overflow-hidden bg-neutral-900 group">
                <img
                  src={currentClaim.nameplatePhotoUrl}
                  alt="Nameplate"
                  className="w-full max-h-96 object-contain mx-auto cursor-zoom-in"
                  onClick={() => setActivePhotoModal(currentClaim.nameplatePhotoUrl)}
                />
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(currentClaim.nameplatePhotoUrl)}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>ขยายดูเนมเพลทเต็มจอ</span>
                </button>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                ไม่มีภาพเนมเพลทแนบมา
              </div>
            )}
          </div>

          {/* Card 3: Defect Video Player */}
          {currentClaim.defectVideoUrl && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      วีดีโออาการเสีย (Defect Video)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      คลิปแสดงอาการผิดปกติขณะทดสอบหรือตรวจพบ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={currentClaim.defectVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition flex items-center gap-1 cursor-pointer"
                    title="เปิดไฟล์วีดีโอในแท็บใหม่"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>เปิดแท็บใหม่</span>
                  </a>
                  <a
                    href={currentClaim.defectVideoUrl}
                    download
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="ดาวน์โหลดไฟล์วิดีโอลงเครื่อง"
                  >
                    <Download className="w-3 h-3" />
                    <span>ดาวน์โหลด</span>
                  </a>
                </div>
              </div>

              {/* Video Player or Fallback View */}
              {videoError ? (
                <div className="rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3.5 bg-slate-900 text-white min-h-[260px] border border-slate-800 shadow-inner">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">
                      เบราว์เซอร์ไม่รองรับตัวถอดรหัสวิดีโอนี้โดยตรง (Unsupported Video Codec: MPEG-4 / MOV)
                    </div>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      ไฟล์วิดีโอบันทึกอยู่บนระบบคลาวด์อย่างสมบูรณ์แล้ว คุณสามารถกดปุ่มด้านล่างเพื่อเปิดดูในแท็บใหม่ หรือดาวน์โหลดไปเปิดดูด้วยโปรแกรมเล่นวิดีโอบนเครื่อง (เช่น Windows Media Player, ภาพยนตร์และทีวี, หรือ VLC)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <a
                      href={currentClaim.defectVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดดูในแท็บใหม่</span>
                    </a>
                    <a
                      href={currentClaim.defectVideoUrl}
                      download
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์คลิป</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyVideoUrl}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {isCopiedVideo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedVideo ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200 shadow-inner group">
                  <video
                    key={currentClaim.defectVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() => setVideoError(true)}
                    className="w-full h-full max-h-[380px] object-contain"
                  >
                    <source src={currentClaim.defectVideoUrl} type="video/mp4" />
                    <source src={currentClaim.defectVideoUrl} type="video/webm" />
                    <source src={currentClaim.defectVideoUrl} type="video/quicktime" />
                    เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ HTML5
                  </video>
                </div>
              )}

              {/* Bottom Quick Action Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    หากวิดีโอแสดงหน้าจอสีดำหรือไม่เล่นเนื่องจากรูปแบบ Codec ของไฟล์ ให้กด <b>"เปิดแท็บใหม่"</b> หรือ <b>"ดาวน์โหลด"</b>
                  </span>
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCopyVideoUrl}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    {isCopiedVideo ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">คัดลอกลิงก์แล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>คัดลอกลิงก์ไฟล์</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Additional Defect Photos */}
          {defectPhotos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      รูปภาพความเสียหายเพิ่มเติม ({defectPhotos.length} รูป)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      คลิกที่รูปภาพเพื่อดูขนาดใหญ่
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {defectPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoModal(url)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group cursor-pointer hover:shadow-md transition"
                  >
                    <img
                      src={url}
                      alt={`Defect photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Service Actions & Workflow Integration */}
        <div className="space-y-6">
          {/* Card 5: Service Intake & Workflow Panel */}
          <div className="bg-white rounded-2xl border-2 border-red-500/80 shadow-md p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
              <Wrench className="w-4 h-4 text-red-600" />
              <span>การดำเนินการของฝ่ายบริการ (Service Actions)</span>
            </div>

            {/* Current Status Box */}
            <div className={`p-4 rounded-xl border ${currentStatus.border} bg-slate-50 space-y-1`}>
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide">
                สถานะปัจจุบัน
              </span>
              <div className="text-sm font-extrabold text-slate-900">
                {currentStatus.label}
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                {currentStatus.desc}
              </p>
              {currentClaim.serviceHandledBy && (
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 mt-2">
                  ผู้รับเรื่อง: <b>{currentClaim.serviceHandledBy}</b>
                  {handledDateStr && ` (${handledDateStr})`}
                </div>
              )}
            </div>

            {/* Quick Actions: Convert to CR */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                ส่งต่อเข้ากระบวนการงานซ่อม:
              </span>

              {currentClaim.linkedCrId ? (
                <Link
                  href={`/service/check-reports/${currentClaim.linkedCrId}/edit`}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>ไปที่ใบตรวจเช็ค: {currentClaim.linkedCrNumber || "CR"}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={isConvertingCr}
                  onClick={handleConvertToCr}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isConvertingCr ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังสร้างใบตรวจเช็ค CR...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>+ เปิดใบตรวจเช็ค CR ทันที</span>
                    </>
                  )}
                </button>
              )}

              {/* Link to RO if linked */}
              {currentClaim.linkedRoId && (
                <Link
                  href={`/repair-orders/${currentClaim.linkedRoId}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span>ไปที่ใบรับซ่อม: {currentClaim.linkedRoNumber || "RO"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Service Notes & Response */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                ข้อเสนอแนะ / บันทึกตอบกลับจากฝ่ายบริการ:
              </label>
              <textarea
                rows={3}
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                placeholder="เช่น รับของเสียเข้าคลังเซอร์วิสแล้ว เตรียมถอดตรวจสอบบอร์ด, หรือปฏิเสธเนื่องจากหมดอายุประกัน"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            {/* Status Change Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">
                ปรับเปลี่ยนสถานะการเคลม:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus("UNDER_REVIEW")}
                  className="py-2 px-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer disabled:opacity-50"
                >
                  กำลังตรวจสอบ
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus("ACCEPTED")}
                  className="py-2 px-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer disabled:opacity-50"
                >
                  รับเคลมแล้ว
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus("REJECTED")}
                  className="py-2 px-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer disabled:opacity-50"
                >
                  ปฏิเสธการเคลม
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus("CLOSED")}
                  className="py-2 px-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  ปิดงานเคลม
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {activePhotoModal && (
        <div
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activePhotoModal}
              alt="Zoomed"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl mx-auto"
            />
            <button
              type="button"
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Official Print Paper (Active on Print) */}
      <div className="hidden print:block font-['Sarabun',sans-serif]">
        <ClaimPrintPaper claim={currentClaim} />
      </div>
    </>
  );
}
