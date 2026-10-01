"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PaymentRequestRecord,
  PaymentRequestLog,
  apReviewPaymentRequest,
  supervisorReviewPaymentRequest,
  approvePaymentRequest,
  financeDisbursePayment,
  postPaymentRequestToGL,
  recordOriginalDocumentReceipt,
  cancelPaymentRequest,
  deletePaymentRequest,
  addPaymentRequestAttachments,
} from '@/app/actions/paymentRequests';
import PrintablePaymentVoucher from '../components/PrintablePaymentVoucher';
import {
  ChevronLeft,
  Building2,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  DollarSign,
  FileText,
  User,
  Calendar,
  ExternalLink,
  Upload,
  Send,
  XCircle,
  HelpCircle,
  Tag,
  Paperclip,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  BookOpen,
  Lock,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { isAccountingManager } from '@/app/lib/roleHelper';

type Props = {
  request: PaymentRequestRecord & { logs: PaymentRequestLog[] };
  currentUser?: {
    id: string;
    fullName: string;
    role?: string;
  } | null;
};

const COMPANY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TG: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  TE: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  TP: { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-300' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'แบบร่าง', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  SUBMITTED: { label: 'ส่งคำขอแล้ว (รอ AP ตรวจ)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  DUPLICATE_CHECK: { label: 'AP ตรวจความซ้ำซ้อน', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  DOCUMENT_CHECK: { label: 'AP ตรวจเอกสาร/ภาษี', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ACCOUNTING_CHECKED: { label: 'หัวหน้าบัญชีสอบทานแล้ว (รออนุมัติ)', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
  APPROVED: { label: 'อนุมัติแล้ว', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  READY_TO_PAY: { label: 'Approved (การเงินรอจ่าย)', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  PAID: { label: 'จ่ายเงินแล้ว (รอลง GL)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  POSTED_TO_GL: { label: 'ลงบัญชี Express/Odoo แล้ว', bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300' },
  ORIGINAL_RECEIVED: { label: 'ได้รับเอกสารตัวจริงแล้ว', bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-300' },
  CLOSED: { label: 'ปิดรายการสมบูรณ์', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  HOLD_DUPLICATE: { label: 'ระงับเนื่องจากซ้ำซ้อน', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  RETURN_DOCUMENT: { label: 'ส่งคืนแก้ไขเอกสาร', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  CANCELLED: { label: 'ยกเลิกรายการ', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  VENDOR_BILL: 'ชำระเจ้าหนี้การค้า (Vendor Bill / AP)',
  REIMBURSEMENT: 'เบิกจ่ายพนักงาน / สำรองจ่าย (Reimbursement)',
  BRANCH_SITE: 'ขอเบิกจ่ายสาขา / ไซต์งาน (Site / Branch)',
  PETTY_CASH: 'เงินสดย่อย (Petty Cash)',
  CASH_ADVANCE: 'เงินทดรองจ่าย (Cash Advance)',
};

function formatDisplayDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val);
  return s.includes('T') ? s.split('T')[0] : s;
}

const WORKFLOW_STEPS = [
  { key: 'SUBMITTED', label: '1. จัดทำคำขอ' },
  { key: 'DOCUMENT_CHECK', label: '2. AP ตรวจเอกสาร/ภาษี' },
  { key: 'ACCOUNTING_CHECKED', label: '3. หัวหน้าบัญชีสอบทาน' },
  { key: 'READY_TO_PAY', label: '4. อนุมัติ (Approved List)' },
  { key: 'PAID', label: '5. การเงินจ่ายแล้ว' },
  { key: 'POSTED_TO_GL', label: '6. ลงบัญชี Express/Odoo' },
  { key: 'CLOSED', label: '7. รับตัวจริง & ปิดรายการ' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'SUBMITTED':
    case 'DUPLICATE_CHECK':
      return 1;
    case 'DOCUMENT_CHECK':
      return 2;
    case 'ACCOUNTING_CHECKED':
      return 3;
    case 'APPROVED':
    case 'READY_TO_PAY':
      return 4;
    case 'PAID':
      return 5;
    case 'POSTED_TO_GL':
      return 6;
    case 'ORIGINAL_RECEIVED':
    case 'CLOSED':
      return 7;
    default:
      return 1;
  }
}

export default function PaymentRequestDetailClient({ request, currentUser }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Action Panels States
  const [apNotes, setApNotes] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Finance Disbursement form
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidFromBank, setPaidFromBank] = useState('ธนาคารกสิกรไทย (045-2-99881-2)');
  const [bankRefNo, setBankRefNo] = useState('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // GL Posting form
  const [glVoucherNo, setGlVoucherNo] = useState('');
  const [glNotes, setGlNotes] = useState('');

  // Original Document form
  const [originalReceiver, setOriginalReceiver] = useState(currentUser?.fullName || '');
  const [stampText, setStampText] = useState(`RECEIVED ORIGINAL/PAID - ${new Date().toLocaleDateString('th-TH')}`);

  // Add Attachments State
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const userName = currentUser?.fullName || 'เจ้าหน้าที่';
  const canSupervisorReview = isAccountingManager(currentUser?.role);
  const companyStyle = COMPANY_COLORS[request.company] || COMPANY_COLORS.TG;
  const statusStyle = STATUS_CONFIG[request.status] || STATUS_CONFIG.SUBMITTED;
  const currentStep = getStepIndex(request.status);

  // Copy PAY Number
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(request.pay_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // AP Review Handler
  const handleAPReview = async (newStatus: 'DOCUMENT_CHECK' | 'ACCOUNTING_CHECKED' | 'HOLD_DUPLICATE' | 'RETURN_DOCUMENT') => {
    setIsProcessing(true);
    try {
      const res = await apReviewPaymentRequest(request.id, {
        status: newStatus,
        notes: apNotes,
        checkedBy: userName,
      });
      if (res.success) {
        Swal.fire({ title: 'บันทึกผลการตรวจสอบ AP เรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Supervisor Review Handler
  const handleSupervisorReview = async (newStatus: 'ACCOUNTING_CHECKED' | 'RETURN_DOCUMENT' | 'HOLD_DUPLICATE') => {
    setIsProcessing(true);
    try {
      const res = await supervisorReviewPaymentRequest(request.id, {
        status: newStatus,
        notes: supNotes,
        reviewedBy: userName,
      });
      if (res.success) {
        Swal.fire({ title: 'หัวหน้าฝ่ายบัญชีสอบทานเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Approval Handler
  const handleApprove = async () => {
    const confirm = await Swal.fire({
      title: 'ยืนยันอนุมัติการจ่ายเงิน?',
      text: `ยอดจ่ายสุทธิ ${Number(request.net_amount).toLocaleString()} บาท จะถูกส่งเข้าสู่ Approved Payment List ของฝ่ายการเงิน`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'อนุมัติ (Approve)',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await approvePaymentRequest(request.id, {
        approvedBy: userName,
        notes: approvalNotes,
      });
      if (res.success) {
        Swal.fire({
          title: 'อนุมัติการจ่ายเงินเรียบร้อย!',
          text: `รายการอยู่ใน Approved Payment List เรียบร้อยแล้ว (${res.limitTier})`,
          icon: 'success',
        });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Finance Disbursement Handler
  const handleFinancePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRefNo.trim()) {
      Swal.fire({ title: 'กรุณาระบุเลขที่อ้างอิงการโอนเงิน (Bank Ref)', icon: 'warning' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await financeDisbursePayment(request.id, {
        paidDate,
        paidBy: userName,
        paidFromBank,
        bankReferenceNo: bankRefNo.trim(),
        paymentSlipUrl,
        paymentNotes,
      });

      if (res.success) {
        Swal.fire({
          title: 'บันทึกการจ่ายเงินสำเร็จ!',
          text: 'สถานะเปลี่ยนเป็น PAID เรียบร้อยแล้ว (รอนำส่งลงบัญชี GL)',
          icon: 'success',
        });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // GL Posting Handler
  const handlePostGL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!glVoucherNo.trim()) {
      Swal.fire({ title: 'กรุณาระบุเลขที่ใบสำคัญบัญชี Express/Odoo (PV No.)', icon: 'warning' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await postPaymentRequestToGL(request.id, {
        glVoucherNo: glVoucherNo.trim(),
        glPostedBy: userName,
        glNotes,
      });
      if (res.success) {
        Swal.fire({ title: 'บันทึกบัญชี GL เรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Original Document Receipt Handler
  const handleOriginalReceipt = async () => {
    setIsProcessing(true);
    try {
      const res = await recordOriginalDocumentReceipt(request.id, {
        originalReceivedBy: originalReceiver || userName,
        stampText,
      });
      if (res.success) {
        Swal.fire({
          title: 'ประทับตราและบันทึกรับเอกสารตัวจริงเรียบร้อย!',
          text: 'ปั๊มตรา "RECEIVED ORIGINAL/PAID" แนบเข้าประวัติเรียบร้อย',
          icon: 'success',
        });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Attachments Handler
  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: { url: string; fileName: string; fileType?: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'uploadsService');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          newItems.push({
            url: data.url,
            fileName: file.name,
            fileType: file.type,
          });
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    if (newItems.length > 0) {
      const res = await addPaymentRequestAttachments(request.id, newItems, userName);
      if (res.success) {
        Swal.fire({ title: 'แนบเอกสารเพิ่มเติมสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      }
    }
    setIsUploading(false);
    e.target.value = '';
  };

  // Cancel Request Handler
  const handleCancel = async () => {
    const { value: reason } = await Swal.fire({
      title: 'ยกเลิกคำขอเบิกจ่ายนี้?',
      input: 'textarea',
      inputPlaceholder: 'ระบุเหตุผลในการยกเลิกคำขอ...',
      inputValidator: (value) => {
        if (!value) return 'กรุณาระบุเหตุผลการยกเลิก!';
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันการยกเลิก',
      cancelButtonText: 'ปิดหน้าต่าง',
    });

    if (reason) {
      setIsProcessing(true);
      try {
        const res = await cancelPaymentRequest(request.id, {
          reason,
          cancelledBy: userName,
        });
        if (res.success) {
          Swal.fire({ title: 'ยกเลิกคำขอเรียบร้อย', icon: 'info' });
          router.refresh();
        } else {
          Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Delete Request Handler
  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบรายการนี้?',
      html: `<div class="text-xs text-gray-600 text-left space-y-1">
        <p>คุณต้องการลบคำขอเลขที่ <b class="text-red-600 font-mono">${request.pay_number}</b> ใช่หรือไม่?</p>
        <p class="text-gray-500">ผู้ขาย: <b>${request.supplier_name}</b> | ยอดสุทธิ: <b>${Number(request.net_amount).toLocaleString()} ฿</b></p>
        <p class="text-red-500 font-medium mt-2">⚠️ ข้อมูลรายการและประวัติการตรวจสอบทั้งหมดจะถูกลบอย่างถาวร</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ใช่, ลบรายการนี้',
      cancelButtonText: 'ยกเลิก',
    });

    if (confirm.isConfirmed) {
      setIsProcessing(true);
      try {
        const res = await deletePaymentRequest(request.id);
        if (res.success) {
          await Swal.fire({
            title: 'ลบรายการสำเร็จ',
            text: `ลบคำขอ ${request.pay_number} เรียบร้อยแล้ว`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
          router.push('/accounting/payment-requests');
        } else {
          Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: res.error || 'ไม่สามารถลบรายการได้',
            icon: 'error',
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: err.message || 'ไม่สามารถลบรายการได้',
          icon: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const attachmentsList = Array.isArray(request.attachments) ? request.attachments : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <Link
            href="/accounting/payment-requests"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition mb-2 font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> กลับสู่ทะเบียนขอจ่ายเงิน (Payment Register)
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold border ${companyStyle.bg} ${companyStyle.text} ${companyStyle.border}`}
            >
              {request.company}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 tracking-tight">
              {request.pay_number}
            </h1>
            <button
              onClick={handleCopyNumber}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="คัดลอกเลขที่ PAY No."
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {statusStyle.label}
            </span>
            {request.urgency === 'EMERGENCY' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100/70 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
                <Zap className="w-3 h-3" /> ด่วนที่สุด (EMERGENCY)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            สาขา: <b className="text-gray-800">{request.branch}</b> | ประเภท:{' '}
            <b className="text-gray-800">{CLASSIFICATION_LABELS[request.classification] || request.classification}</b> |
            วันที่เอกสาร: <b className="text-gray-800">{formatDisplayDate(request.document_date)}</b>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowVoucherModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition active:scale-[0.99]"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ใบขออนุมัติจ่าย (Voucher)
          </button>
          {request.status !== 'CANCELLED' && request.status !== 'PAID' && request.status !== 'CLOSED' && (
            <button
              onClick={handleCancel}
              className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-xl transition"
            >
              ยกเลิกคำขอ
            </button>
          )}
          <button
            onClick={handleDelete}
            title="ลบคำขอนี้"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-gray-200 hover:border-red-300 text-xs font-semibold rounded-xl transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบคำขอ</span>
          </button>
        </div>
      </div>

      {/* Visual Workflow Stepper */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs overflow-x-auto">
        <div className="min-w-[700px] flex items-center justify-between relative">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-0" />
          {WORKFLOW_STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 bg-white px-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                    isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isCurrent
                      ? 'bg-red-600 text-white border-red-600 ring-4 ring-red-100'
                      : 'bg-white text-gray-400 border-gray-300'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                    isCurrent ? 'text-red-900 font-bold' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duplicate Check Warning Banner (If Any) */}
      {(request.is_possible_duplicate || request.status === 'HOLD_DUPLICATE') && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 text-xs text-red-950">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-800 flex items-center gap-2">
                ตรวจพบความเสี่ยงของการจ่ายเงินซ้ำซ้อน (Duplicate Risk Detected)
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-600 text-white font-mono">
                  {request.status === 'HOLD_DUPLICATE' ? 'HOLD - ระงับชั่วคราว' : 'WARNING'}
                </span>
              </h3>
              <p className="mt-1 text-red-900">{request.duplicate_reason}</p>
              <p className="mt-2 text-red-800 text-[11px]">
                * <b>ระเบียบข้อบังคับ</b>:
                ฝ่ายบัญชีและการเงินต้องทำการตรวจสอบประวัติการจ่ายเงินของคู่ค้ารายนี้ก่อนดำเนินการต่อ
                หากเป็นการส่งเอกสารซ้ำซ้อนจากช่องทางอื่น (เช่น LINE หรือส่งตัวจริงตามมา)
                ให้แนบเอกสารเข้ากับรายการเดิมและยกเลิกรายการนี้
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Request Details, Financials, Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier & Payee Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              ข้อมูลผู้รับเงิน / เจ้าหนี้ และการชำระเงิน (Payee & Payment Details)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">ผู้รับเงิน / เจ้าหนี้ (Supplier):</span>
                <span className="text-sm font-bold text-slate-900">{request.supplier_name}</span>
                {request.supplier_tax_id && (
                  <span className="block text-slate-500 text-[11px] font-mono mt-0.5">
                    เลขประจำตัวผู้เสียภาษี: {request.supplier_tax_id}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">ข้อมูลบัญชีธนาคาร:</span>
                <span className="font-semibold text-slate-800">
                  {request.bank_name || 'พร้อมเพย์ / ไม่ระบุ'}
                </span>
                {request.bank_account_no && (
                  <span className="block font-mono text-indigo-700 font-bold mt-0.5">
                    เลขที่: {request.bank_account_no}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">เลขที่ใบกำกับ/ใบเสร็จ (Invoice No.):</span>
                <span className="font-mono font-bold text-slate-900">
                  {request.has_no_doc_number ? (
                    <span className="text-slate-500 italic font-sans">(ไม่มีเลขที่เอกสาร - บิลเงินสด/ใบรับรอง)</span>
                  ) : (
                    request.invoice_number || '-'
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">วันที่ต้องการให้จ่าย (Requested Due Date):</span>
                <span className="font-medium text-slate-800">
                  {formatDisplayDate(request.requested_payment_date) || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">โครงการ / Cost Center:</span>
                <span className="font-medium text-slate-800">{request.cost_center || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">เลขที่ PO / PR อ้างอิง:</span>
                <span className="font-mono font-medium text-slate-800">{request.po_pr_number || '-'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] mb-1">
                วัตถุประสงค์และรายละเอียดค่าใช้จ่าย (Purpose):
              </span>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {request.purpose}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              แจกแจงยอดเงินและภาษี (Financial Breakdown)
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-600 font-medium">ยอดเงินก่อนภาษีมูลค่าเพิ่ม (Pre-VAT Subtotal)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {Number(request.subtotal_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ฿
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-600">
                      ภาษีมูลค่าเพิ่ม (VAT {request.vat_type})
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                      +{Number(request.vat_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ฿
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-600">
                      ภาษีหัก ณ ที่จ่าย (Withholding Tax {Number(request.wht_percent) > 0 ? `${request.wht_percent}%` : ''})
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-red-600">
                      {Number(request.wht_amount) > 0
                        ? `-${Number(request.wht_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ฿`
                        : '0.00 ฿'}
                    </td>
                  </tr>
                  <tr className="bg-red-50/50 font-bold text-sm border-t border-red-100">
                    <td className="py-3.5 px-4 text-red-950">ยอดชำระสุทธิ (Net Payment Amount)</td>
                    <td className="py-3.5 px-4 text-right font-mono text-red-700 text-base">
                      {Number(request.net_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ฿
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Approval Limits Notice */}
            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-200/80">
              <span className="font-bold text-slate-700">ลำดับขั้นการอนุมัติ (Approval Matrix):</span>{' '}
              {Number(request.net_amount) <= 3000
                ? 'วงเงินไม่เกิน 3,000 บาท (เงินสดย่อย / หัวหน้างาน)'
                : Number(request.net_amount) <= 10000
                ? 'วงเงิน 3,001 - 10,000 บาท (หัวหน้าสาขา/หัวหน้าแผนก + AP ตรวจสอบ)'
                : Number(request.net_amount) <= 30000
                ? 'วงเงิน 10,001 - 30,000 บาท (ผู้จัดการฝ่ายที่เกี่ยวข้อง)'
                : 'วงเงินเกิน 30,000 บาท (ฝ่ายการเงินส่วนกลาง / ผู้บริหารระดับสูง)'}
            </div>
          </div>

          {/* Supporting Attachments Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                เอกสารแนบและหลักฐาน ({attachmentsList.length})
              </h2>

              {/* Upload Extra Attachment */}
              <div>
                <input
                  type="file"
                  multiple
                  id="add-att-file"
                  onChange={handleAddAttachment}
                  disabled={isUploading}
                  className="hidden"
                />
                <label
                  htmlFor="add-att-file"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'กำลังอัปโหลด...' : '+ แนบเอกสารเพิ่ม'}
                </label>
              </div>
            </div>

            {attachmentsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">ยังไม่มีเอกสารแนบในคำขอนี้</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachmentsList.map((att: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-800 hover:text-indigo-600 truncate block underline"
                        >
                          {att.fileName}
                        </a>
                        <span className="text-[10px] text-slate-400">คลิกเพื่อเปิด / ดาวน์โหลด</span>
                      </div>
                    </div>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Role-based Action Panels & Audit Log */}
        <div className="space-y-6">
          {/* Action Panel: AP Verification */}
          {['SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK', 'HOLD_DUPLICATE'].includes(request.status) && (
            <div className="bg-white p-5 rounded-2xl border-2 border-red-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                ส่วนสำหรับฝ่ายบัญชีเจ้าหนี้ (AP Verification)
              </div>
              <p className="text-[11px] text-gray-500">
                ตรวจสอบความถูกต้อง: PO/PR, ใบเสร็จ, ความถูกต้องของ VAT/WHT และประวัติการจ่ายซ้ำ
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  บันทึกข้อความตรวจสอบ (AP Notes):
                </label>
                <textarea
                  rows={2}
                  value={apNotes}
                  onChange={(e) => setApNotes(e.target.value)}
                  placeholder="ระบุความเห็น เช่น เอกสารครบถ้วน ใบเสร็จถูกต้อง"
                  className="w-full text-xs rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAPReview('ACCOUNTING_CHECKED')}
                  className="col-span-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> ตรวจสอบผ่าน (ส่งต่อหัวหน้าบัญชี)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAPReview('HOLD_DUPLICATE')}
                  className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition"
                >
                  ระงับ (Hold Duplicate)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAPReview('RETURN_DOCUMENT')}
                  className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold rounded-lg transition"
                >
                  ส่งคืนแก้ไขเอกสาร
                </button>
              </div>
            </div>
          )}

          {/* Action Panel: Supervisor Review */}
          {request.status === 'ACCOUNTING_CHECKED' && (
            canSupervisorReview ? (
              <div className="bg-white p-5 rounded-2xl border-2 border-sky-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-950 font-bold text-xs uppercase tracking-wide">
                    <ShieldAlert className="w-4 h-4 text-sky-700" />
                    หัวหน้าฝ่ายบัญชีสอบทาน (Supervisor Review)
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> สิทธิ์: ผู้จัดการฝ่ายบัญชี
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  สอบทานรายการผิดปกติ ตรวจสอบกรณีไม่มีเลขที่บิล หรือความเสี่ยงการจ่ายซ้ำ
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ความเห็นหัวหน้าบัญชี:
                  </label>
                  <textarea
                    rows={2}
                    value={supNotes}
                    onChange={(e) => setSupNotes(e.target.value)}
                    placeholder="ระบุผลการสอบทาน..."
                    className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApprove}
                    className="flex-1 py-2 px-3 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> สอบทานและอนุมัติเข้า Approved List
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleSupervisorReview('RETURN_DOCUMENT')}
                    className="py-2 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold rounded-lg transition"
                  >
                    ส่งคืน
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-sky-50/70 p-5 rounded-2xl border border-sky-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-950 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-700" />
                    รอหัวหน้าฝ่ายบัญชีสอบทาน (Supervisor Review)
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded border border-sky-200">
                    <Lock className="w-3 h-3 text-sky-600" /> จำกัดสิทธิ์
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  รายการนี้ผ่านการตรวจจากเจ้าหน้าที่ AP แล้ว และกำลังอยู่ในขั้นตอนการสอบทานความถูกต้องและอนุมัติโดย <b>ผู้จัดการฝ่ายบัญชี (Accounting Manager)</b>
                </p>
                <div className="text-[10px] text-slate-500 bg-white/70 rounded-lg p-2.5 border border-sky-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  เฉพาะผู้ใช้ในตำแหน่ง <b>ผู้จัดการฝ่ายบัญชี</b> หรือ <b>Super Admin</b> เท่านั้นที่จะเห็นปุ่มอนุมัติหรือส่งคืนในขั้นตอนนี้
                </div>
              </div>
            )
          )}

          {/* Action Panel: Finance Disbursement */}
          {(request.status === 'APPROVED' || request.status === 'READY_TO_PAY') && (
            <form
              onSubmit={handleFinancePay}
              className="bg-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wide">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                ฝ่ายการเงินบันทึกการจ่ายเงิน (Finance Disbursement)
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-900">
                ✓ รายการนี้อยู่ใน <b>Approved Payment List</b> เรียบร้อยแล้ว ยอดโอนสุทธิ:{' '}
                <b className="font-mono text-emerald-800">{Number(request.net_amount).toLocaleString()} บาท</b>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  วันที่โอนเงินจริง <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  โอนจากบัญชีธนาคาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={paidFromBank}
                  onChange={(e) => setPaidFromBank(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  เลขที่อ้างอิงการโอน / Bank Ref <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น TRF-20261001-88991"
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">หมายเหตุการจ่าย</label>
                <input
                  type="text"
                  placeholder="เช่น โอนผ่าน K-Biz แล้ว"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> บันทึกจ่ายเงินแล้ว (Mark as PAID)
              </button>
            </form>
          )}

          {/* Action Panel: AP Post to GL (Express / Odoo) */}
          {request.status === 'PAID' && (
            <form
              onSubmit={handlePostGL}
              className="bg-white p-5 rounded-2xl border-2 border-cyan-300 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2 text-cyan-950 font-bold text-xs uppercase tracking-wide">
                <BookOpen className="w-4 h-4 text-cyan-700" />
                บันทึกลงบัญชี Express / Odoo (GL Posting)
              </div>
              <p className="text-[11px] text-slate-500">
                นำรายการที่จ่ายแล้วบันทึกเข้าสู่โปรแกรมบัญชี พร้อมอ้างอิงเลขที่ PAY No.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  เลขที่ใบสำคัญบัญชี / Voucher No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น PV-6910-0089 หรือ JV-0012"
                  value={glVoucherNo}
                  onChange={(e) => setGlVoucherNo(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2 px-3 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> บันทึกเลขที่ GL Voucher
              </button>
            </form>
          )}

          {/* Action Panel: Original Document Received Stamp */}
          {(request.status === 'PAID' || request.status === 'POSTED_TO_GL') && !request.original_received_at && (
            <div className="bg-white p-5 rounded-2xl border-2 border-violet-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-violet-950 font-bold text-xs uppercase tracking-wide">
                <Paperclip className="w-4 h-4 text-violet-700" />
                รับเอกสารตัวจริง (Original Document Receipt)
              </div>
              <p className="text-[11px] text-slate-500">
                เมื่อได้รับเอกสารตัวจริง ให้ค้นหาเลข PAY No. และประทับตรา "RECEIVED ORIGINAL/PAID"
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ข้อความประทับตรา (Stamp Text):
                </label>
                <input
                  type="text"
                  value={stampText}
                  onChange={(e) => setStampText(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 font-mono"
                />
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleOriginalReceipt}
                className="w-full py-2 px-3 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> บันทึกว่าได้รับเอกสารตัวจริงแล้ว
              </button>
            </div>
          )}

          {/* Complete Information Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
              สรุปข้อมูลการตรวจสอบและการชำระ
            </h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้ขอเบิก:</span>
                <span className="font-semibold text-slate-800">{request.requester_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AP ผู้ตรวจสอบ:</span>
                <span className="text-slate-800">{request.ap_checked_by || 'ยังไม่ตรวจสอบ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">หัวหน้าบัญชีสอบทาน:</span>
                <span className="text-slate-800">{request.supervisor_checked_by || 'ยังไม่สอบทาน'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้อนุมัติ:</span>
                <span className="font-semibold text-emerald-700">{request.approved_by || 'ยังไม่อนุมัติ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">การเงินผู้จ่าย:</span>
                <span className="font-semibold text-slate-800">{request.paid_by || 'ยังไม่จ่าย'}</span>
              </div>
              {request.bank_reference_no && (
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500 font-sans">เลขที่โอน:</span>
                  <span className="text-indigo-700 font-bold">{request.bank_reference_no}</span>
                </div>
              )}
              {request.gl_voucher_no && (
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500 font-sans">เลขที่ GL:</span>
                  <span className="text-cyan-800 font-bold">{request.gl_voucher_no}</span>
                </div>
              )}
              {request.original_received_at && (
                <div className="p-2 bg-violet-50 rounded-lg text-violet-900 font-semibold text-[10px]">
                  ✓ ได้รับเอกสารตัวจริงแล้ว ({request.original_stamp_text})
                </div>
              )}
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              ประวัติการดำเนินการ (Audit Trail)
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {request.logs?.map((log, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-800">{log.performed_by}</span>
                      <span className="text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{log.notes}</p>
                    {log.to_status && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                        {log.from_status ? `${log.from_status} → ` : ''}
                        {log.to_status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Payment Voucher Modal */}
      {showVoucherModal && (
        <PrintablePaymentVoucher
          request={request}
          onClose={() => setShowVoucherModal(false)}
          onUpdate={(updated) => {
            Object.assign(request, updated);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
