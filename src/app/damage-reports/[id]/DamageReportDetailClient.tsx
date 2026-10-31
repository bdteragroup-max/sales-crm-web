"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, ArrowLeft, Building2, MapPin, Calendar, User, Clock,
  CheckCircle2, AlertTriangle, FileText, Package, DollarSign, Printer,
  Eye, Edit, Save, Plus, Trash2, ExternalLink, ShieldCheck, ChevronDown,
  ChevronUp, Lock, Send, HelpCircle, FileCheck, Upload, Camera
} from "lucide-react";
import Swal from "sweetalert2";
import {
  updateSupervisorInvestigation,
  approveDamageReport,
  updateWarehouseAction,
  updateHrAction,
  updateAccountingAction,
  closeDamageReport,
  deleteDamageReport,
  appendDamageReportPhotos,
} from "@/app/actions/damageReports";
import { getBangkokDateString, getBangkokDatetimeString, formatThaiDateTime, formatThaiDate } from "@/app/lib/thaiDate";

type Props = {
  report: any;
  currentUser: any;
};

export default function DamageReportDetailClient({ report, currentUser }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active section toggles
  const [openSections, setOpenSections] = useState({
    details: true,
    investigation: true,
    approval: true,
    warehouse: true,
    hr: true,
    accounting: true,
    closure: true,
    timeline: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Supervisor Investigation Form State ──
  const [investigationData, setInvestigationData] = useState({
    provenFacts: report.provenFacts || "",
    rootCause: report.rootCause || "",
    unresolvedIssues: report.unresolvedIssues || "",
    involvedPartiesAssessment: report.involvedPartiesAssessment || "",
    preventiveAction: report.preventiveAction || "",
    preventiveOwner: report.preventiveOwner || "",
    preventiveFollowUpDate: report.preventiveFollowUpDate
      ? getBangkokDateString(report.preventiveFollowUpDate)
      : "",
    statements: (Array.isArray(report.statements) ? report.statements : []) as any[],
  });

  const [newStatement, setNewStatement] = useState({ personName: "", role: "", statement: "" });

  const handleAddStatement = () => {
    if (!newStatement.personName.trim() || !newStatement.statement.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุชื่อและคำชี้แจง" });
      return;
    }
    setInvestigationData((prev) => ({
      ...prev,
      statements: [...prev.statements, { ...newStatement, date: getBangkokDatetimeString() }],
    }));
    setNewStatement({ personName: "", role: "", statement: "" });
  };

  const handleSupervisorAction = async (action: "NEED_MORE_INFO" | "IN_PROGRESS" | "SUBMITTED" | "RETURNED") => {
    let reason = "";
    if (action === "NEED_MORE_INFO" || action === "RETURNED") {
      const { value: text } = await Swal.fire({
        title: action === "NEED_MORE_INFO" ? "ระบุข้อมูลที่ต้องการเพิ่ม" : "ระบุเหตุผลที่ส่งกลับแก้ไข",
        input: "textarea",
        inputPlaceholder: "พิมพ์รายละเอียด...",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
      });
      if (text === undefined) return;
      reason = text;
    }

    try {
      const res = await updateSupervisorInvestigation(report.id, {
        action,
        ...investigationData,
        actionReason: reason,
      });
      if (res.success) {
        await Swal.fire({ icon: "success", title: "บันทึกผลการสืบสวนสำเร็จ", timer: 1200, showConfirmButton: false });
        startTransition(() => router.refresh());
      } else {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };



  // ── Executive Approval State ──
  const [approvalData, setApprovalData] = useState({
    decision: (report.approvalDecision || "APPROVED") as "APPROVED" | "REQUEST_CHANGE" | "REJECTED",
    productResolution: report.productResolution || "โอนแยกสินค้าชำรุด",
    personnelResolution: report.personnelResolution || "บริษัทรับผิดชอบ",
    sendToWarehouse: report.sentToWarehouse !== undefined ? Boolean(report.sentToWarehouse) : true,
    sendToHr: report.sentToHr !== undefined ? Boolean(report.sentToHr) : false,
    comments: report.approvalComments || "",
    estimatedCost: report.estimatedCost || "",
  });

  const handleExecutiveApproval = async () => {
    try {
      const res = await approveDamageReport(report.id, {
        ...approvalData,
        estimatedCost: approvalData.estimatedCost ? parseFloat(String(approvalData.estimatedCost)) : null,
      });
      if (res.success) {
        await Swal.fire({ icon: "success", title: "บันทึกผลการอนุมัติสำเร็จ", timer: 1200, showConfirmButton: false });
        startTransition(() => router.refresh());
      } else {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };



  // ── Warehouse Action State ──
  const [warehouseData, setWarehouseData] = useState({
    warehouseStatus: (report.warehouseStatus || "PENDING") as "PENDING" | "INSPECTING" | "NEED_INFO" | "COMPLETED" | "RETURNED",
    stockActionType: report.stockActionType || report.productResolution || "โอนแยกสินค้าชำรุด",
    stockActionDate: report.stockActionDate ? getBangkokDateString(report.stockActionDate) : getBangkokDateString(),
    stockQuantity: report.stockQuantity || report.damagedQuantity || 1,
    stockSystemUsed: report.stockSystemUsed || "Express",
    stockDocNumber: report.stockDocNumber || "",
    stockDestination: report.stockDestination || "โกดัง 62 (โซนสินค้าชำรุด)",
    stockSenderName: report.stockSenderName || "",
    stockReceiverName: report.stockReceiverName || "",
    stockHandoverDate: report.stockHandoverDate ? getBangkokDateString(report.stockHandoverDate) : "",
    stockNotes: report.stockNotes || "",
  });

  const handleWarehouseSave = async () => {
    try {
      const res = await updateWarehouseAction(report.id, {
        ...warehouseData,
      });
      if (res.success) {
        await Swal.fire({ icon: "success", title: "บันทึกงานคลังสำเร็จ", timer: 1200, showConfirmButton: false });
        startTransition(() => router.refresh());
      } else {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };



  // ── HR Action State ──
  const [hrData, setHrData] = useState({
    hrStatus: (report.hrStatus || "PENDING_REVIEW") as any,
    hrApprovedAmount: report.hrApprovedAmount || report.actualCost || report.estimatedCost || "",
    hrCompensationMethod: report.hrCompensationMethod || "SALARY_DEDUCTION",
    hrInstallments: report.hrInstallments || 1,
    hrDueDate: report.hrDueDate ? getBangkokDateString(report.hrDueDate) : "",
    hrSigneeName: report.hrSigneeName || report.operatorName || "",
    hrAckDocUrl: report.hrAckDocUrl || "",
    hrConsentDocUrl: report.hrConsentDocUrl || "",
    hrWaiveReason: report.hrWaiveReason || "",
    hrNotes: report.hrNotes || "",
  });

  const [paymentEntry, setPaymentEntry] = useState({
    date: getBangkokDateString(),
    amount: "",
    installment: (Array.isArray(report.hrPaymentHistory) ? report.hrPaymentHistory.length : 0) + 1,
  });

  const handleHrSave = async (includePayment = false) => {
    try {
      const res = await updateHrAction(report.id, {
        ...hrData,
        hrApprovedAmount: hrData.hrApprovedAmount ? parseFloat(String(hrData.hrApprovedAmount)) : null,
        newPayment: includePayment && paymentEntry.amount ? {
          date: paymentEntry.date,
          amount: parseFloat(paymentEntry.amount),
          installment: Number(paymentEntry.installment),
        } : undefined,
      });
      if (res.success) {
        await Swal.fire({ icon: "success", title: "บันทึกข้อมูล HR สำเร็จ", timer: 1200, showConfirmButton: false });
        setPaymentEntry({ date: getBangkokDateString(), amount: "", installment: (Array.isArray(report.hrPaymentHistory) ? report.hrPaymentHistory.length : 0) + 2 });
        startTransition(() => router.refresh());
      } else {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };



  // ── Accounting Action State ──
  const [acctData, setAcctData] = useState({
    accountingStatus: (report.accountingStatus || "PENDING") as any,
    actualCost: report.actualCost || report.estimatedCost || "",
    accountingCostVerified: Boolean(report.accountingCostVerified),
    accountingExpressDocNo: report.accountingExpressDocNo || "",
    accountingInvoiceNo: report.accountingInvoiceNo || "",
    accountingNotes: report.accountingNotes || "",
    pendingTaskDescription: report.pendingTaskDescription || "",
    pendingTaskAssignee: report.pendingTaskAssignee || "",
  });

  const handleAcctSave = async (certify = false) => {
    try {
      const res = await updateAccountingAction(report.id, {
        ...acctData,
        accountingStatus: certify ? "CERTIFIED" : acctData.accountingStatus,
        actualCost: acctData.actualCost ? parseFloat(String(acctData.actualCost)) : null,
        accountingCostVerified: certify ? true : acctData.accountingCostVerified,
      });
      if (res.success) {
        await Swal.fire({ icon: "success", title: certify ? "รับรองผลการตรวจบัญชีเรียบร้อย" : "บันทึกข้อมูลบัญชีสำเร็จ", timer: 1200, showConfirmButton: false });
        startTransition(() => router.refresh());
      } else {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };



  // ── Closure Checklist State ──
  const [checklist, setChecklist] = useState({
    checkReportAndPhotos: report.checkReportAndPhotos || false,
    checkInvestigationApproved: report.checkInvestigationApproved || false,
    checkHandoverEvidence: report.checkHandoverEvidence || false,
    checkStockResult: report.checkStockResult || false,
    checkAccountingResult: report.checkAccountingResult || false,
    checkHrResult: report.checkHrResult || false,
    checkPreventiveMeasure: report.checkPreventiveMeasure || false,
    checkFinalApproval: report.checkFinalApproval || false,
  });
  const [closeReason, setCloseReason] = useState(report.closeReason || "ดำเนินการครบถ้วนทุกขั้นตอนตามระเบียบบริษัท");

  const handleCloseCase = async () => {
    const allChecked = Object.values(checklist).every(Boolean);
    if (!allChecked) {
      Swal.fire({
        icon: "warning",
        title: "เกณฑ์ตรวจสอบยังไม่ครบถ้วน",
        text: "ต้องตรวจสอบและยืนยันความครบถ้วนทั้ง 8 ข้อบังคับก่อน จึงจะสามารถปิดเคสได้ (หากข้อใดไม่เกี่ยวข้อง ให้ติ๊กยืนยันว่าได้ตรวจสอบแล้วว่าไม่เกี่ยวข้อง)",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "ยืนยันการปิดเคส?",
      text: `ต้องการปิดเคส ${report.caseNumber} อย่างเป็นทางการหรือไม่?`,
      showCancelButton: true,
      confirmButtonColor: "#15803d",
      confirmButtonText: "อนุมัติปิดเคส",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await closeDamageReport(report.id, { checklist, closeReason });
      if (res.success) {
        await Swal.fire({ icon: "success", title: "ปิดเคสเรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
        startTransition(() => router.refresh());
      } else {
        Swal.fire({ icon: "error", title: "ไม่สามารถปิดเคสได้", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };

  const handleDeleteCase = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบเคส?",
      text: `ต้องการลบเคส ${report.caseNumber} ออกจากระบบอย่างถาวรหรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยันลบเคส",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteDamageReport(report.id);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "ลบเคสสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        router.push("/damage-reports");
      } else {
        Swal.fire({ icon: "error", title: "ไม่สามารถลบได้", text: res.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };

  // Status mapping
  const statusColor: Record<string, string> = {
    REPORTED: "bg-blue-100 text-blue-800 border-blue-300",
    INVESTIGATING: "bg-amber-100 text-amber-800 border-amber-300",
    PENDING_APPROVAL: "bg-purple-100 text-purple-800 border-purple-300",
    ACTION_REQUIRED: "bg-rose-100 text-rose-800 border-rose-300",
    ACCOUNTING_REVIEW: "bg-indigo-100 text-indigo-800 border-indigo-300",
    CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    CANCELLED: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const statusLabel: Record<string, string> = {
    REPORTED: "แจ้งเหตุแล้ว (รอหัวหน้าตรวจ)",
    INVESTIGATING: "อยู่ระหว่างสืบสวน",
    PENDING_APPROVAL: "ส่งผลตรวจเพื่ออนุมัติ",
    ACTION_REQUIRED: "อนุมัติแล้ว (รอดำเนินการคลัง/HR)",
    ACCOUNTING_REVIEW: "บัญชีตรวจติดตาม",
    CLOSED: "ปิดเคสแล้ว (Closed)",
    CANCELLED: "ยกเลิก / ไม่อนุมัติ",
  };

  const inputClass =
    "w-full px-3 py-2 bg-white text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all text-gray-900";
  const labelClass = "block text-xs font-bold text-gray-700 mb-1";

  const [uploadingCategoryDetail, setUploadingCategoryDetail] = useState<string | null>(null);

  const handleAppendPhotos = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "photosFull" | "photosDamage" | "photosSerial" | "photosScene" | "photosToolPackaging" | "attachedDocs"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingCategoryDetail(category);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = new FormData();
        data.append("file", file);
        data.append("bucket", "uploadsService");

        const res = await fetch("/api/upload", { method: "POST", body: data });
        const json = await res.json();
        if (json.success && json.url) {
          uploadedUrls.push(json.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const res = await appendDamageReportPhotos(report.id, category, uploadedUrls);
        if (res.success) {
          await Swal.fire({
            icon: "success",
            title: `แนบรูปเพิ่มสำเร็จ (${uploadedUrls.length} รูป)`,
            timer: 1200,
            showConfirmButton: false,
          });
          startTransition(() => router.refresh());
        } else {
          Swal.fire({ icon: "error", title: "ไม่สามารถบันทึกรูปได้", text: res.error });
        }
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการอัปโหลด", text: err.message });
    } finally {
      setUploadingCategoryDetail(null);
      e.target.value = "";
    }
  };

  // Compute total photos (5 categories + documents)
  const allPhotoCategories: Array<{
    key: "photosFull" | "photosDamage" | "photosSerial" | "photosScene" | "photosToolPackaging" | "attachedDocs";
    title: string;
    items: string[];
  }> = [
    { key: "photosFull", title: "1. ภาพเต็มชิ้นสินค้า / ทรัพย์สิน (Full View)", items: Array.isArray(report.photosFull) ? report.photosFull : [] },
    { key: "photosDamage", title: "2. จุดเสียหายชัดเจน (Defect Close-up)", items: Array.isArray(report.photosDamage) ? report.photosDamage : [] },
    { key: "photosSerial", title: "3. Serial No. / Nameplate / Lot", items: Array.isArray(report.photosSerial) ? report.photosSerial : [] },
    { key: "photosScene", title: "4. สถานที่และจุดเกิดเหตุ (Scene View)", items: Array.isArray(report.photosScene) ? report.photosScene : [] },
    { key: "photosToolPackaging", title: "5. เครื่องมือ / บรรจุภัณฑ์ / กล่อง", items: Array.isArray(report.photosToolPackaging) ? report.photosToolPackaging : [] },
    { key: "attachedDocs", title: "6. เอกสารที่เกี่ยวข้อง (PO / บิล / ใบส่ง)", items: Array.isArray(report.attachedDocs) ? report.attachedDocs : [] },
  ];

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Top Banner & Case Identity */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/damage-reports"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับหน้ารายการเคส</span>
              </Link>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-bold text-red-600">DAMAGE &amp; DEFECT TRACKING</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-gray-900">
                {report.caseNumber}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                {report.company}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor[report.status] || "bg-gray-100 text-gray-800"}`}>
                {statusLabel[report.status] || report.status}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-700 mt-1">
              {report.itemName} {report.itemCode ? `(${report.itemCode})` : ""} • จำนวน {report.damagedQuantity} {report.unit}
            </p>
          </div>

          {/* Quick Action Links */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/damage-reports/${report.id}/documents/acknowledgement`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all shadow-sm"
              title="เปิดหนังสือรับทราบผลการตรวจสอบ"
            >
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>หนังสือรับทราบผล</span>
            </Link>

            <Link
              href={`/damage-reports/${report.id}/documents/agreement`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all shadow-sm"
              title="เปิดหนังสือยินยอมและข้อตกลงชดใช้"
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>หนังสือยินยอมชดใช้</span>
            </Link>

            <Link
              href="/damage-reports/accounting"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>หน้าติดตามของบัญชี</span>
            </Link>

            <button
              onClick={handleDeleteCase}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all shadow-sm"
              title="ลบเคสนี้ออกจากระบบ"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>ลบเคส</span>
            </button>
          </div>
        </div>

        {/* 6-Step Visual Workflow Progress Bar */}
        <div className="pt-2">
          <div className="text-xs font-bold text-gray-500 mb-2">ขั้นตอนการดำเนินงาน 6 ลำดับ (Workflow Progress)</div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
            <div className={`p-2 rounded-xl border font-bold ${
              ["REPORTED", "INVESTIGATING", "PENDING_APPROVAL", "ACTION_REQUIRED", "ACCOUNTING_REVIEW", "CLOSED"].includes(report.status)
                ? "bg-blue-50 border-blue-300 text-blue-800"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
              1. แจ้งและถ่ายรูป
            </div>
            <div className={`p-2 rounded-xl border font-bold ${
              ["INVESTIGATING", "PENDING_APPROVAL", "ACTION_REQUIRED", "ACCOUNTING_REVIEW", "CLOSED"].includes(report.status)
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
              2. หัวหน้าสืบสวน
            </div>
            <div className={`p-2 rounded-xl border font-bold ${
              ["PENDING_APPROVAL", "ACTION_REQUIRED", "ACCOUNTING_REVIEW", "CLOSED"].includes(report.status)
                ? "bg-purple-50 border-purple-300 text-purple-800"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
              3. อนุมัติแนวทาง
            </div>
            <div className={`p-2 rounded-xl border font-bold ${
              ["ACTION_REQUIRED", "ACCOUNTING_REVIEW", "CLOSED"].includes(report.status)
                ? "bg-rose-50 border-rose-300 text-rose-800"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
              4. สต็อก / HR ชดใช้
            </div>
            <div className={`p-2 rounded-xl border font-bold ${
              ["ACCOUNTING_REVIEW", "CLOSED"].includes(report.status)
                ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
              5. บัญชีตรวจติดตาม
            </div>
            <div className={`p-2 rounded-xl border font-bold ${
              report.status === "CLOSED"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}>
              6. ตรวจครบปิดเคส
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 1: รายละเอียดการแจ้งเหตุ & เล่าเหตุการณ์ 3 คำถาม & แกลเลอรีรูป ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("details")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-50 text-red-600 font-bold text-sm">1</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">ข้อมูลการแจ้งเหตุและภาพถ่ายหลักฐาน</h2>
              <p className="text-xs text-gray-500">
                แจ้งโดย: {report.reporterName} • ณ วันที่ {new Date(report.createdAt).toLocaleDateString("th-TH")}
              </p>
            </div>
          </div>
          {openSections.details ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.details && (
          <div className="p-5 sm:p-6 space-y-6 text-xs sm:text-sm">
            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50/80 border border-gray-200/80">
              <div>
                <span className="text-gray-500 block text-xs">สินค้า/ทรัพย์สิน:</span>
                <span className="font-bold text-gray-900">{report.itemName}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">รุ่น / Serial:</span>
                <span className="font-bold text-gray-900">{report.itemModel || "-"} / {report.serialOrLot || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">จำนวนที่เสียหาย:</span>
                <span className="font-bold text-red-600">{report.damagedQuantity} {report.unit} (จาก {report.quantity})</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">ลักษณะความเสียหาย:</span>
                <span className="font-bold text-gray-900">{report.damageType} {report.damagePosition ? `(${report.damagePosition})` : ""}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">วันเวลาที่เกิดเหตุ:</span>
                <span className="font-bold text-gray-900">{formatThaiDateTime(report.incidentDate)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">วันเวลาที่ตรวจพบ:</span>
                <span className="font-bold text-gray-900">{formatThaiDateTime(report.discoveredDate)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">สถานที่เกิดเหตุ:</span>
                <span className="font-bold text-gray-900">{report.siteLocation || "รอตรวจสอบ"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">สถานที่เก็บปัจจุบัน (อยู่ที่ไหน):</span>
                <span className="font-bold text-blue-700">{report.currentLocation || "รอตรวจสอบ"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">ผู้ปฏิบัติงาน / ผู้ทำชำรุด:</span>
                <span className="font-bold text-gray-900">
                  {report.operatorName || "-"} ({report.operatorType === "CONTRACTOR" ? `ผู้รับเหมา: ${report.contractorName || "-"}` : "พนักงาน"})
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">หัวหน้างานโดยตรง:</span>
                <span className="font-bold text-gray-900">{report.supervisorName || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">ผู้แจ้งเหตุการณ์:</span>
                <span className="font-bold text-gray-900">{report.reporterName || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">แผนก/สังกัดผู้แจ้ง:</span>
                <span className="font-bold text-purple-700">{report.reporterDepartment || "-"}</span>
              </div>
            </div>

            {/* 3 Incident Questions */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-bold text-gray-900 text-sm">การเล่าเหตุการณ์ตามข้อเท็จจริง (3 คำถาม)</h3>
              <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100">
                <div className="font-bold text-blue-900 text-xs mb-1">1) ก่อนเกิดเหตุทำอะไรอยู่ และใครมอบหมาย?</div>
                <p className="text-gray-800">{report.beforeIncident || "-"}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100">
                <div className="font-bold text-amber-900 text-xs mb-1">2) ขณะเกิดเหตุเกิดอะไรขึ้น ใครอยู่ และใช้อุปกรณ์อะไร?</div>
                <p className="text-gray-800">{report.duringIncident || "-"}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100">
                <div className="font-bold text-emerald-900 text-xs mb-1">3) หลังเกิดเหตุใครพบ แจ้งใคร และสินค้าเก็บไว้ที่ใด?</div>
                <p className="text-gray-800">{report.afterIncident || "-"}</p>
              </div>
              {report.suspectedCause && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="font-bold text-gray-700 text-xs mb-1">ข้อสังเกตเพิ่มเติม / เรื่องที่ยังสงสัย:</div>
                  <p className="text-gray-600">{report.suspectedCause}</p>
                </div>
              )}
            </div>

            {/* Photos Gallery (5 Categories + Attached Docs - Unlimited) */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-red-600" />
                    <span>รูปภาพหลักฐานและเอกสาร (5 หมวด)</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ใส่กี่รูปก็ได้ ไม่จำกัดจำนวน
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    คลิกรูปเพื่อดูภาพขนาดเต็ม หรือสามารถกดปุ่มแนบรูปเพิ่มเติมในแต่ละหมวดได้ตลอดเวลา
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {allPhotoCategories.map((cat, idx) => {
                  const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf") || url.includes(".pdf?");
                  const isUploadingThis = uploadingCategoryDetail === cat.key;

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl border border-gray-200/90 bg-gray-50/60 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-2">
                          <span className="line-clamp-1">{cat.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1 border ${
                              cat.items.length > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-white text-gray-400 border-gray-200"
                            }`}
                          >
                            {cat.items.length} รูป
                          </span>
                        </div>

                        {cat.items.length === 0 ? (
                          <div className="h-24 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-xs text-gray-400 bg-white">
                            <span>ยังไม่มีรูปภาพในหมวดนี้</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {cat.items.map((url: string, pIdx: number) => {
                              const pdf = isPdf(url);
                              return (
                                <a
                                  key={pIdx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="aspect-square rounded-xl border border-gray-200 overflow-hidden relative group block bg-white shadow-xs"
                                  title={pdf ? "เปิดดูไฟล์ PDF" : "คลิกดูรูปขนาดเต็ม"}
                                >
                                  {pdf ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center hover:bg-red-50/50 transition-colors">
                                      <FileText className="w-6 h-6 text-red-600 mb-0.5" />
                                      <span className="text-[8px] font-bold text-gray-600">PDF</span>
                                    </div>
                                  ) : (
                                    <>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt={`Evidence #${pIdx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                                        ดูรูปใหญ่
                                      </div>
                                    </>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Add more photos button */}
                      <div className="pt-2 border-t border-gray-200/80">
                        <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 hover:border-red-400 bg-white hover:bg-red-50/20 text-gray-700 text-xs font-bold cursor-pointer transition-colors text-center">
                          <Upload className="w-3.5 h-3.5 text-gray-400" />
                          <span>{isUploadingThis ? "กำลังอัปโหลด..." : "+ แนบรูปเพิ่ม (ใส่กี่รูปก็ได้)"}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            disabled={isUploadingThis}
                            onChange={(e) => handleAppendPhotos(e, cat.key)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 2: ส่วนการตรวจสอบและสืบสวนของหัวหน้างาน ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("investigation")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">2</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">การสืบสวนและเสนอผลของหัวหน้างาน</h2>
              <p className="text-xs text-gray-500">
                สถานะสืบสวน: <span className="font-bold text-amber-700">{report.investigationStatus}</span>
                {report.investigatedBy ? ` • โดย ${report.investigatedBy}` : ""}
              </p>
            </div>
          </div>
          {openSections.investigation ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.investigation && (
          <div className="p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
            {/* Interview Statements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800">คำชี้แจงรายบุคคล (Statements from Involved Persons)</label>
                <span className="text-xs text-gray-400">{investigationData.statements.length} รายการ</span>
              </div>

              {investigationData.statements.map((s: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-xs text-gray-700">
                    <span>{s.personName} ({s.role || "ผู้เกี่ยวข้อง"})</span>
                    <span className="text-gray-400">{s.date ? new Date(s.date).toLocaleDateString("th-TH") : ""}</span>
                  </div>
                  <p className="text-gray-800 text-xs">{s.statement}</p>
                </div>
              ))}

              {/* Add Statement Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="ชื่อผู้ให้คำชี้แจง"
                  value={newStatement.personName}
                  onChange={(e) => setNewStatement((prev) => ({ ...prev, personName: e.target.value }))}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="หน้าที่/บทบาทในเหตุการณ์"
                  value={newStatement.role}
                  onChange={(e) => setNewStatement((prev) => ({ ...prev, role: e.target.value }))}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="คำชี้แจง..."
                    value={newStatement.statement}
                    onChange={(e) => setNewStatement((prev) => ({ ...prev, statement: e.target.value }))}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddStatement}
                    className="px-3 py-1.5 rounded-xl bg-gray-800 text-white font-bold text-xs shrink-0 hover:bg-gray-700"
                  >
                    + เพิ่ม
                  </button>
                </div>
              </div>
            </div>

            {/* Investigation Findings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className={labelClass}>ข้อเท็จจริงที่มีหลักฐานรับรอง (Proven Facts) *</label>
                <textarea
                  rows={3}
                  value={investigationData.provenFacts}
                  onChange={(e) => setInvestigationData((prev) => ({ ...prev, provenFacts: e.target.value }))}
                  placeholder="สรุปข้อเท็จจริงที่ตรวจสอบแล้วว่าเกิดขึ้นจริง..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>สาเหตุและปัจจัยร่วม (Root Cause &amp; Factors) *</label>
                <textarea
                  rows={3}
                  value={investigationData.rootCause}
                  onChange={(e) => setInvestigationData((prev) => ({ ...prev, rootCause: e.target.value }))}
                  placeholder="ระบุสาเหตุที่แท้จริงของการชำรุดเสียหาย..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>เรื่องที่ยังตรวจไม่เสร็จ / ข้อสงวนสิทธิ์</label>
                <textarea
                  rows={2}
                  value={investigationData.unresolvedIssues}
                  onChange={(e) => setInvestigationData((prev) => ({ ...prev, unresolvedIssues: e.target.value }))}
                  placeholder="กรณีมีข้อที่ยังรอผลตรวจทางเทคนิคหรือกล้องวงจรปิด..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>ผู้เกี่ยวข้องและหน้าที่ความรับผิดชอบ</label>
                <textarea
                  rows={2}
                  value={investigationData.involvedPartiesAssessment}
                  onChange={(e) => setInvestigationData((prev) => ({ ...prev, involvedPartiesAssessment: e.target.value }))}
                  placeholder="สรุปบทบาทและหน้าที่ของผู้เกี่ยวข้อง..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Preventive Action */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>แนวทางและมาตรการป้องกันความเสียหายในอนาคต *</label>
                <textarea
                  rows={2}
                  value={investigationData.preventiveAction}
                  onChange={(e) => setInvestigationData((prev) => ({ ...prev, preventiveAction: e.target.value }))}
                  placeholder="เช่น กำหนดให้ใช้สายรัด 2 เส้น และติดป้ายเตือนการยก..."
                  className={inputClass}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>ผู้รับผิดชอบมาตรการ</label>
                  <input
                    type="text"
                    value={investigationData.preventiveOwner}
                    onChange={(e) => setInvestigationData((prev) => ({ ...prev, preventiveOwner: e.target.value }))}
                    placeholder="เช่น หัวหน้าแผนกสโตร์"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>กำหนดติดตามผล</label>
                  <input
                    type="date"
                    value={investigationData.preventiveFollowUpDate}
                    onChange={(e) => setInvestigationData((prev) => ({ ...prev, preventiveFollowUpDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Supervisor Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t">
              <button
                type="button"
                onClick={() => handleSupervisorAction("RETURNED")}
                className="px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                ส่งกลับแก้ไข
              </button>
              <button
                type="button"
                onClick={() => handleSupervisorAction("NEED_MORE_INFO")}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                ขอข้อมูลเพิ่ม
              </button>
              <button
                type="button"
                onClick={() => handleSupervisorAction("IN_PROGRESS")}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-bold hover:bg-gray-700"
              >
                บันทึกอยู่ระหว่างสืบสวน
              </button>
              <button
                type="button"
                onClick={() => handleSupervisorAction("SUBMITTED")}
                className="px-5 py-2 rounded-xl bg-[#ff2301] text-white text-xs font-bold shadow-md hover:bg-red-600 active:scale-95"
              >
                ส่งผลตรวจเพื่ออนุมัติ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 3: ส่วนการพิจารณาอนุมัติของผู้มีอำนาจ (Executive Approval) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("approval")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-sm">3</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">การพิจารณาอนุมัติของผู้มีอำนาจ (Executive Approval)</h2>
              <p className="text-xs text-gray-500">
                ผลการอนุมัติ: <span className="font-bold text-purple-700">{report.approvalDecision || "รอการพิจารณา"}</span>
                {report.approvedBy ? ` • ผู้อนุมัติ: ${report.approvedBy}` : ""}
              </p>
            </div>
          </div>
          {openSections.approval ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.approval && (
          <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Resolution */}
              <div>
                <label className={labelClass}>แนวทางจัดการสินค้า / สต็อก *</label>
                <select
                  value={approvalData.productResolution}
                  onChange={(e) => setApprovalData((prev) => ({ ...prev, productResolution: e.target.value }))}
                  className={inputClass}
                >
                  <option value="โอนแยกสินค้าชำรุด">โอนแยกสินค้าชำรุด (ไม่ตัดสต็อกทันที เพื่อรอจัดการ)</option>
                  <option value="ตัดออกจากสต็อก">ตัดออกจากสต็อก (Write-off)</option>
                  <option value="ขายมือสอง">ขายเป็นสินค้ามือสอง / เศษซาก</option>
                  <option value="ส่งซ่อม">ส่งซ่อมภายใน / ภายนอก</option>
                  <option value="เคลมประกัน/ซัพพลายเออร์">เคลมประกัน / เคลมผู้ผลิต (Supplier Claim)</option>
                  <option value="ไม่กระทบสต็อก">ไม่กระทบสต็อก (สินค้าฝาก/ทรัพย์สิน)</option>
                </select>
              </div>

              {/* Personnel Resolution */}
              <div>
                <label className={labelClass}>การพิจารณาด้านบุคคล / ค่าเสียหาย *</label>
                <select
                  value={approvalData.personnelResolution}
                  onChange={(e) => setApprovalData((prev) => ({ ...prev, personnelResolution: e.target.value }))}
                  className={inputClass}
                >
                  <option value="บริษัทรับผิดชอบ">บริษัทรับผิดชอบค่าใช้จ่ายทั้งหมด (ไม่มีการหักพนักงาน)</option>
                  <option value="พนักงานชดใช้">พนักงานชดใช้ค่าเสียหาย (ส่งเรื่องให้ HR ดำเนินการยินยอม)</option>
                  <option value="ผู้รับเหมาจ่าย">หักจากผู้รับเหมา / เปิดบิลเรียกเก็บผู้รับเหมา</option>
                  <option value="ไม่เรียกชดใช้">ไม่เรียกชดใช้ / ยกเว้นค่าเสียหาย</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>มูลค่าที่อนุมัติให้คิดเป็นค่าเสียหาย (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  value={approvalData.estimatedCost}
                  onChange={(e) => setApprovalData((prev) => ({ ...prev, estimatedCost: e.target.value }))}
                  placeholder="เช่น 3500 (ต้นทุนประเมิน)"
                  className={inputClass}
                />
              </div>

              <div className="flex items-center gap-4 pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={approvalData.sendToWarehouse}
                    onChange={(e) => setApprovalData((prev) => ({ ...prev, sendToWarehouse: e.target.checked }))}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>ส่งงานให้คลังดำเนินการสต็อก</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={approvalData.sendToHr}
                    onChange={(e) => setApprovalData((prev) => ({ ...prev, sendToHr: e.target.checked }))}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>ส่งเรื่องให้ HR พิจารณาการชดใช้</span>
                </label>
              </div>
            </div>

            <div>
              <label className={labelClass}>ความเห็นหรือเงื่อนไขของผู้มีอำนาจอนุมัติ</label>
              <textarea
                rows={2}
                value={approvalData.comments}
                onChange={(e) => setApprovalData((prev) => ({ ...prev, comments: e.target.value }))}
                placeholder="ระบุข้อกำหนดเพิ่มเติม..."
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setApprovalData((prev) => ({ ...prev, decision: "REQUEST_CHANGE" }));
                  handleExecutiveApproval();
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                ขอให้สืบสวนเพิ่ม
              </button>
              <button
                type="button"
                onClick={() => {
                  setApprovalData((prev) => ({ ...prev, decision: "APPROVED" }));
                  handleExecutiveApproval();
                }}
                className="px-6 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold shadow-md hover:bg-purple-800 active:scale-95"
              >
                อนุมัติและส่งงานต่อ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 4: ส่วนงานคลังสินค้าและสต็อก ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("warehouse")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">4</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">งานคลังสินค้าและการดำเนินการสต็อก</h2>
              <p className="text-xs text-gray-500">
                สถานะคลัง: <span className="font-bold text-indigo-700">{report.warehouseStatus}</span>
                {report.stockRecordedBy ? ` • บันทึกโดย: ${report.stockRecordedBy}` : ""}
              </p>
            </div>
          </div>
          {openSections.warehouse ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.warehouse && (
          <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
            {/* Caution banner */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>แนวปฏิบัติคลัง:</strong> กรุณาตรวจสอบรายการสต็อกเดิมก่อนทำ เพื่อป้องกันการตัดซ้ำ และระบบจะไม่ตัดสต็อกอัตโนมัติจากการแจ้งเหตุเพียงอย่างเดียว
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>สถานะงานคลัง</label>
                <select
                  value={warehouseData.warehouseStatus}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, warehouseStatus: e.target.value as any }))}
                  className={inputClass}
                >
                  <option value="PENDING">รอรับงาน (PENDING)</option>
                  <option value="INSPECTING">กำลังตรวจสินค้าจริง (INSPECTING)</option>
                  <option value="NEED_INFO">รอข้อมูลเพิ่ม (NEED_INFO)</option>
                  <option value="COMPLETED">ดำเนินการสต็อกแล้ว (COMPLETED)</option>
                  <option value="RETURNED">ส่งกลับแก้ไข (RETURNED)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>ประเภทการจัดการสต็อก</label>
                <select
                  value={warehouseData.stockActionType}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockActionType: e.target.value }))}
                  className={inputClass}
                >
                  <option value="โอนแยกสินค้าชำรุด">โอนแยกสินค้าชำรุด</option>
                  <option value="ตัดออกจากสต็อก">ตัดออกจากสต็อก</option>
                  <option value="ขาย">ขายมือสอง</option>
                  <option value="ส่งซ่อม">ส่งซ่อม</option>
                  <option value="ไม่เกี่ยวข้อง">ไม่เกี่ยวข้องกับสต็อก</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>ระบบที่ใช้บันทึก</label>
                <select
                  value={warehouseData.stockSystemUsed}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockSystemUsed: e.target.value }))}
                  className={inputClass}
                >
                  <option value="Express">โปรแกรม Express</option>
                  <option value="CRM">Sales CRM</option>
                  <option value="Manual">ทะเบียนเอกสาร Manual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>เลขที่เอกสารสต็อก (Doc No.)</label>
                <input
                  type="text"
                  value={warehouseData.stockDocNumber}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockDocNumber: e.target.value }))}
                  placeholder="เช่น ใบตัดสต็อก / ใบโอนย้าย"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>สถานที่ / ปลายทางเก็บสินค้าจริง</label>
                <input
                  type="text"
                  value={warehouseData.stockDestination}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockDestination: e.target.value }))}
                  placeholder="เช่น โกดัง 62 (โซนสินค้าชำรุด)"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>จำนวนที่ดำเนินการจริง</label>
                <input
                  type="number"
                  value={warehouseData.stockQuantity}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockQuantity: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>ผู้ส่งมอบสินค้า</label>
                <input
                  type="text"
                  value={warehouseData.stockSenderName}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockSenderName: e.target.value }))}
                  placeholder="ชื่อผู้ส่ง"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>ผู้รับมอบสินค้า (ฝ่ายคลัง)</label>
                <input
                  type="text"
                  value={warehouseData.stockReceiverName}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockReceiverName: e.target.value }))}
                  placeholder="ชื่อผู้รับ"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>วันที่ส่งมอบ / ดำเนินการ</label>
                <input
                  type="date"
                  value={warehouseData.stockActionDate}
                  onChange={(e) => setWarehouseData((prev) => ({ ...prev, stockActionDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t">
              <button
                type="button"
                onClick={handleWarehouseSave}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                บันทึกการดำเนินการคลัง
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 5: ส่วนงาน HR และการชดใช้ ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("hr")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm">5</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">งานฝ่ายบุคคล (HR) และการชดใช้ค่าเสียหาย</h2>
              <p className="text-xs text-gray-500">
                สถานะ HR: <span className="font-bold text-rose-700">{report.hrStatus}</span>
                {report.hrApprovedAmount ? ` • ยอดชดใช้: ${report.hrApprovedAmount.toLocaleString()} บ.` : ""}
                {report.hrActualPaidTotal ? ` • รับแล้ว: ${report.hrActualPaidTotal.toLocaleString()} บ.` : ""}
              </p>
            </div>
          </div>
          {openSections.hr ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.hr && (
          <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>สถานะการชดใช้ (HR Status)</label>
                <select
                  value={hrData.hrStatus}
                  onChange={(e) => setHrData((prev) => ({ ...prev, hrStatus: e.target.value }))}
                  className={inputClass}
                >
                  <option value="NOT_STARTED">ยังไม่เริ่ม (NOT_STARTED)</option>
                  <option value="PENDING_REVIEW">รอตรวจสอบ (PENDING_REVIEW)</option>
                  <option value="IN_REVIEW">อยู่ระหว่างพิจารณา (IN_REVIEW)</option>
                  <option value="AWAITING_SIGNATURE">รอลงนามหนังสือยินยอม (AWAITING_SIGNATURE)</option>
                  <option value="AWAITING_PAYMENT">รอดำเนินการชำระ (AWAITING_PAYMENT)</option>
                  <option value="PARTIAL_PAID">รับชำระบางส่วน (PARTIAL_PAID)</option>
                  <option value="FULL_PAID">รับชำระครบถ้วนแล้ว (FULL_PAID)</option>
                  <option value="WAIVED">ยกเว้น / ไม่เรียกชดใช้ (WAIVED)</option>
                  <option value="NOT_APPLICABLE">ไม่เกี่ยวข้อง (NOT_APPLICABLE)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>ยอดเงินชดใช้ที่อนุมัติ (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  value={hrData.hrApprovedAmount}
                  onChange={(e) => setHrData((prev) => ({ ...prev, hrApprovedAmount: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>วิธีการชำระเงิน</label>
                <select
                  value={hrData.hrCompensationMethod}
                  onChange={(e) => setHrData((prev) => ({ ...prev, hrCompensationMethod: e.target.value }))}
                  className={inputClass}
                >
                  <option value="SALARY_DEDUCTION">หักจากค่าจ้าง/เงินเดือน (มีหนังสือยินยอม)</option>
                  <option value="CASH_TRANSFER">โอนเงินสดเข้าบัญชีบริษัท</option>
                  <option value="CONTRACTOR_INVOICE">หักจากบิลค่าจ้างผู้รับเหมา</option>
                  <option value="OTHER">อื่นๆ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>จำนวนงวดชำระ</label>
                <input
                  type="number"
                  min="1"
                  value={hrData.hrInstallments}
                  onChange={(e) => setHrData((prev) => ({ ...prev, hrInstallments: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>ชื่อผู้ลงนามยินยอม / ผู้ชดใช้</label>
                <input
                  type="text"
                  value={hrData.hrSigneeName}
                  onChange={(e) => setHrData((prev) => ({ ...prev, hrSigneeName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>วันครบกำหนดชำระ</label>
                <input
                  type="date"
                  value={hrData.hrDueDate}
                  onChange={(e) => setHrData((prev) => ({ ...prev, hrDueDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Payment history */}
            <div className="border-t pt-3 space-y-2">
              <h3 className="font-bold text-gray-800 text-xs">ประวัติการรับชำระเงินจริงแต่ละงวด</h3>
              {Array.isArray(report.hrPaymentHistory) && report.hrPaymentHistory.length > 0 ? (
                <div className="space-y-1.5">
                  {report.hrPaymentHistory.map((p: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-800">งวดที่ {p.installment || idx + 1}: </span>
                        <span className="font-bold text-gray-900">{Number(p.amount).toLocaleString()} บาท</span>
                        <span className="text-gray-500 ml-2">วันที่ {new Date(p.date).toLocaleDateString("th-TH")}</span>
                      </div>
                      <span className="text-[11px] text-gray-500">บันทึกโดย: {p.recordedBy || "HR"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded-lg">ยังไม่มีรายการรับชำระเงิน</div>
              )}

              {/* Add payment installment */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">จำนวนเงินรับจริงงวดนี้ (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="เช่น 1500"
                    value={paymentEntry.amount}
                    onChange={(e) => setPaymentEntry((prev) => ({ ...prev, amount: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">วันที่รับเงิน</label>
                  <input
                    type="date"
                    value={paymentEntry.date}
                    onChange={(e) => setPaymentEntry((prev) => ({ ...prev, date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleHrSave(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  + บันทึกรับเงินงวดนี้
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => handleHrSave(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                บันทึกข้อมูล HR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 6: ส่วนงานบัญชีและการเงิน ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("accounting")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">6</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">งานบัญชีและการเงิน (Accounting Follow-up)</h2>
              <p className="text-xs text-gray-500">
                สถานะบัญชี: <span className="font-bold text-indigo-700">{report.accountingStatus}</span>
                {report.accountingExpressDocNo ? ` • Express: ${report.accountingExpressDocNo}` : ""}
              </p>
            </div>
          </div>
          {openSections.accounting ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.accounting && (
          <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>ต้นทุนจริงตามหลักฐาน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  value={acctData.actualCost}
                  onChange={(e) => setAcctData((prev) => ({ ...prev, actualCost: e.target.value }))}
                  placeholder="ระบุต้นทุนจริง"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>เลขที่เอกสาร Express (ตัดสต็อก/โอน/JV)</label>
                <input
                  type="text"
                  value={acctData.accountingExpressDocNo}
                  onChange={(e) => setAcctData((prev) => ({ ...prev, accountingExpressDocNo: e.target.value }))}
                  placeholder="เช่น JV67-0091"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>เลขที่ใบกำกับภาษี / บิลชดใช้</label>
                <input
                  type="text"
                  value={acctData.accountingInvoiceNo}
                  onChange={(e) => setAcctData((prev) => ({ ...prev, accountingInvoiceNo: e.target.value }))}
                  placeholder="เช่น IV67-1044"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>งานที่ค้าง (Pending Task สำหรับหน้าติดตามของบัญชี)</label>
                <input
                  type="text"
                  value={acctData.pendingTaskDescription}
                  onChange={(e) => setAcctData((prev) => ({ ...prev, pendingTaskDescription: e.target.value }))}
                  placeholder="เช่น หัวหน้าส่งผลสอบสวน, รอใบแจ้งค่าซ่อม"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>ผู้รับผิดชอบงานที่ค้าง (Assignee)</label>
                <input
                  type="text"
                  value={acctData.pendingTaskAssignee}
                  onChange={(e) => setAcctData((prev) => ({ ...prev, pendingTaskAssignee: e.target.value }))}
                  placeholder="เช่น หัวหน้างาน, ฝ่ายคลัง, HR"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>บันทึกเพิ่มเติมจากบัญชี</label>
              <textarea
                rows={2}
                value={acctData.accountingNotes}
                onChange={(e) => setAcctData((prev) => ({ ...prev, accountingNotes: e.target.value }))}
                placeholder="บันทึกรายละเอียดการตรวจนับ หรือการลงบัญชี..."
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={acctData.accountingCostVerified}
                  onChange={(e) => setAcctData((prev) => ({ ...prev, accountingCostVerified: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>ยืนยันตรวจต้นทุนตามหลักฐานแล้ว</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAcctSave(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  บันทึกข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => handleAcctSave(true)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  ตรวจรับรองผล (Certify)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 7: Checklist ปิดเคส (Case Closure Criteria) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("closure")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm">7</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">หลักเกณฑ์การปิดเคส (Case Closure Criteria)</h2>
              <p className="text-xs text-gray-500">
                {report.status === "CLOSED"
                  ? `ปิดเคสแล้วโดย: ${report.closedBy || "ผู้มีอำนาจ"} เมื่อ ${new Date(report.closedAt).toLocaleDateString("th-TH")}`
                  : "ต้องผ่านเกณฑ์ตรวจสอบความครบถ้วนทั้ง 8 ข้อบังคับ"}
              </p>
            </div>
          </div>
          {openSections.closure ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.closure && (
          <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
              <strong>หลักเกณฑ์:</strong> ระบบจะไม่ปิดเคสเพียงเพราะเซ็นรับรายงานแล้ว แต่ต้องตรวจครบถ้วนทุกจุด
              หากขั้นตอนใดไม่เกี่ยวข้อง ให้ผู้มีสิทธิ์ติ๊กรับรองว่าไม่เกี่ยวข้องพร้อมระบุเหตุผล
            </div>

            <div className="space-y-2.5">
              {[
                { key: "checkReportAndPhotos", label: "1. มีใบแจ้งเหตุครบถ้วน พร้อมรูปถ่ายหลักฐานชัดเจน" },
                { key: "checkInvestigationApproved", label: "2. มีผลการสืบสวนของหัวหน้างาน และการพิจารณาอนุมัติของผู้มีอำนาจ" },
                { key: "checkHandoverEvidence", label: "3. ทราบสถานที่หรือปลายทางสินค้า พร้อมหลักฐานการรับ–ส่งมอบ" },
                { key: "checkStockResult", label: "4. มีผลการดำเนินการสต็อก (เลขที่เอกสารตัด/โอน หรือระบุรับรองว่าไม่กระทบสต็อก)" },
                { key: "checkAccountingResult", label: "5. มีผลการตรวจบัญชี (ตรวจสอบต้นทุน / บันทึกเลข Express หรือระบุไม่เกี่ยวข้อง)" },
                { key: "checkHrResult", label: "6. มีผลการดำเนินการฝ่ายบุคคล HR และหลักฐานการชดใช้ (หรือระบุว่าบริษัทรับผิดชอบ/ไม่เรียกชดใช้)" },
                { key: "checkPreventiveMeasure", label: "7. มีการกำหนดมาตรการป้องกันความเสียหายซ้ำและผู้ติดตามผล" },
                { key: "checkFinalApproval", label: "8. ผู้มีอำนาจตรวจสอบครบถ้วนและอนุมัติปิดเคส" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[item.key as keyof typeof checklist]}
                    disabled={report.status === "CLOSED"}
                    onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={`text-xs font-semibold ${checklist[item.key as keyof typeof checklist] ? "text-emerald-900 font-bold" : "text-gray-700"}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-2 border-t">
              <label className={labelClass}>เหตุผลหรือบันทึกการปิดเคส</label>
              <input
                type="text"
                disabled={report.status === "CLOSED"}
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                className={inputClass}
              />
            </div>

            {report.status !== "CLOSED" && (
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCloseCase}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>อนุมัติปิดเคสอย่างสมบูรณ์ (Close Case)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CARD 8: บันทึกประวัติการดำเนินงาน (Timeline) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection("timeline")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors border-b"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">ประวัติการดำเนินงานและไทม์ไลน์ (Activity Log)</h2>
              <p className="text-xs text-gray-500">
                บันทึกการกระทำ วันเวลา และผู้ดำเนินการทั้งหมด ({Array.isArray(report.timeline) ? report.timeline.length : 0} รายการ)
              </p>
            </div>
          </div>
          {openSections.timeline ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {openSections.timeline && (
          <div className="p-5 sm:p-6 space-y-3">
            {Array.isArray(report.timeline) && report.timeline.length > 0 ? (
              <div className="space-y-3 border-l-2 border-red-500 ml-3 pl-4">
                {report.timeline.map((item: any, idx: number) => (
                  <div key={idx} className="relative text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 absolute -left-[21px] top-1 border-2 border-white"></div>
                    <div className="font-bold text-gray-900">{item.action}</div>
                    <div className="text-gray-500 text-[11px]">
                      โดย: <span className="font-semibold text-gray-700">{item.actorName}</span> •{" "}
                      {new Date(item.timestamp).toLocaleString("th-TH")}
                    </div>
                    {item.notes && <div className="text-gray-600 mt-0.5 bg-gray-50 p-2 rounded-lg">{item.notes}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">ยังไม่มีบันทึกประวัติการดำเนินงาน</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

