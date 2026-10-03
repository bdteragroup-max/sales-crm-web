"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PaymentRequestRecord,
  PaymentRequestLog,
  supervisorApprovePaymentRequest,
  supervisorReturnPaymentRequest,
  apReviewPaymentRequest,
  supervisorReviewPaymentRequest,
  approvePaymentRequest,
  financeDisbursePayment,
  postPaymentRequestToGL,
  recordOriginalDocumentReceipt,
  cancelPaymentRequest,
  deletePaymentRequest,
  addPaymentRequestAttachments,
  checkAttachmentDuplicates,
  updatePaymentBankDetails,
  resubmitPaymentRequest,
  updatePaymentRequestRequisition,
  deletePaymentRequestAttachment,
} from '@/app/actions/paymentRequests';
import { ExtractedLineItem } from '@/lib/attachmentUtils';
import PrintablePaymentVoucher from '../components/PrintablePaymentVoucher';
import { THAI_BANKS, PROMPTPAY_TYPES } from '../new/NewPaymentRequestClient';
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
  AlertCircle,
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
  Edit2,
  X,
  Layers,
  RotateCcw,
  MessageSquare,
  Undo2,
  Scan,
  QrCode,
  Eye,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { detectSlipQrAndBarcode, downscaleImageForScan, computeVisualHashes } from '@/lib/slipDetector';
import {
  isAccountingManager,
  isAccountingStaff,
  isSupervisorOrManager,
  canSupervisorApproveRequest,
} from '@/app/lib/roleHelper';

type Props = {
  request: PaymentRequestRecord & { logs: PaymentRequestLog[] };
  currentUser?: {
    id: string;
    fullName: string;
    role?: string;
    employeeId?: string | null;
    department?: string | null;
    branch?: string | null;
  } | null;
};

const COMPANY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TG: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  TE: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  TP: { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-300' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'แบบร่าง', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  PENDING_SUPERVISOR: { label: 'รอหัวหน้างานอนุมัติ', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
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
  { key: 'PENDING_SUPERVISOR', label: '1. หัวหน้างานอนุมัติ' },
  { key: 'DOCUMENT_CHECK', label: '2. AP ตรวจเอกสาร/ภาษี' },
  { key: 'ACCOUNTING_CHECKED', label: '3. ผู้จัดการบัญชีสอบทาน' },
  { key: 'READY_TO_PAY', label: '4. อนุมัติ (Approved List)' },
  { key: 'PAID', label: '5. การเงินจ่ายแล้ว' },
  { key: 'POSTED_TO_GL', label: '6. ลงบัญชี Express/Odoo' },
  { key: 'CLOSED', label: '7. รับตัวจริง & ปิดรายการ' },
];

function getStepIndex(status: string, apCheckedBy?: string | null): number {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'PENDING_SUPERVISOR':
      return 1;
    case 'SUBMITTED':
    case 'DUPLICATE_CHECK':
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
    case 'RETURN_DOCUMENT':
      return apCheckedBy ? 2 : 1;
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
  const [deptSupervisorNotes, setDeptSupervisorNotes] = useState('');

  // Finance Disbursement form
  const [paidDate, setPaidDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  });
  const [paidFromBank, setPaidFromBank] = useState('ธนาคารกสิกรไทย (045-2-99881-2)');
  const [bankRefNo, setBankRefNo] = useState('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // GL Posting form
  const [glVoucherNo, setGlVoucherNo] = useState('');
  const [glNotes, setGlNotes] = useState('');

  // Original Document form
  const [originalReceiver, setOriginalReceiver] = useState(currentUser?.fullName || '');
  const [stampText, setStampText] = useState(
    `RECEIVED ORIGINAL/PAID - ${new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  );

  // Add Attachments State
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const userName = currentUser?.fullName || 'เจ้าหน้าที่';
  const isStaff = isAccountingStaff(currentUser?.role);
  const isManager = isAccountingManager(currentUser?.role);
  const isSupervisor = isSupervisorOrManager(currentUser?.role);
  const canSupervisorReview = isManager;
  const isOwner =
    (currentUser?.id && request.requester_id && currentUser.id === request.requester_id) ||
    (currentUser?.fullName && request.requester_name && currentUser.fullName.trim().toLowerCase() === request.requester_name.trim().toLowerCase());

  // Department & Branch-scoped supervisor approval guard
  const supervisorAuth = useMemo(() => {
    return canSupervisorApproveRequest({
      userRole: currentUser?.role,
      userDepartment: currentUser?.department,
      userBranch: currentUser?.branch,
      userId: currentUser?.id,
      userFullName: currentUser?.fullName,
      userEmployeeId: currentUser?.employeeId,
      requestRequesterId: request.requester_id,
      requestRequesterName: request.requester_name,
      requestDepartment: request.requester_department,
      requestBranch: request.branch,
      requestAssignedSupervisorId: request.assigned_supervisor_id,
      requestAssignedSupervisorName: request.assigned_supervisor_name,
    });
  }, [currentUser, request]);
  // Data-driven milestone checks for stepper
  const isStep1Done = !!request.supervisor_checked_by || !['PENDING_SUPERVISOR', 'DRAFT'].includes(request.status);
  const isStep2Done = !!request.ap_checked_by || ['ACCOUNTING_CHECKED', 'APPROVED', 'READY_TO_PAY', 'PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CLOSED'].includes(request.status);
  const isStep3Done = !!request.accounting_manager_checked_by || ['APPROVED', 'READY_TO_PAY', 'PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CLOSED'].includes(request.status);
  const isStep4Done = !!request.approved_by || ['APPROVED', 'READY_TO_PAY', 'PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CLOSED'].includes(request.status);
  const isStep5Done = !!request.paid_date || !!request.bank_reference_no || ['PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CLOSED'].includes(request.status);
  const isStep6Done = !!request.gl_voucher_no || !!request.gl_posted_at || request.status === 'CLOSED';
  const isStep7Done = !!request.original_received_at && (isStep6Done || request.status === 'CLOSED');

  const isFullyCompleted = (isStep6Done && isStep7Done) || request.status === 'CLOSED';
  const effectiveStatus = isFullyCompleted ? 'CLOSED' : request.status;

  const stepDoneMap: Record<number, boolean> = {
    1: isStep1Done,
    2: isStep2Done,
    3: isStep3Done,
    4: isStep4Done,
    5: isStep5Done,
    6: isStep6Done,
    7: isStep7Done,
  };

  const currentIncompleteStep = isFullyCompleted ? 8 : ([1, 2, 3, 4, 5, 6, 7].find((s) => !stepDoneMap[s]) || 8);

  const canApproveSupervisor = supervisorAuth.canApprove;
  const companyStyle = COMPANY_COLORS[request.company] || COMPANY_COLORS.TG;
  const statusStyle = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.SUBMITTED;
  const currentStep = currentIncompleteStep;

  // Return for Revision info
  const isReturned = request.status === 'RETURN_DOCUMENT';
  const returnLog = request.logs?.find(
    (l) => l.to_status === 'RETURN_DOCUMENT' || l.action === 'SUPERVISOR_RETURNED' || (l.action === 'AP_CHECKED' && l.to_status === 'RETURN_DOCUMENT')
  );
  const returnReason =
    request.ap_notes ||
    request.supervisor_notes ||
    (returnLog?.notes && !returnLog.notes.startsWith('AP ดำเนินการ') ? returnLog.notes : '') ||
    request.cancelled_reason ||
    'เอกสารแนบหรือข้อมูลไม่ครบถ้วน กรุณาตรวจสอบเอกสารแนบ รายละเอียดใบเสร็จ หรือติดต่อฝ่ายบัญชี';

  const returnedBy =
    returnLog?.performed_by ||
    request.ap_checked_by ||
    request.supervisor_checked_by ||
    'เจ้าหน้าที่ฝ่ายบัญชี (AP)';

  const returnedAt = returnLog?.created_at
    ? new Date(returnLog.created_at).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
      })
    : request.ap_checked_at
    ? new Date(request.ap_checked_at).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
      })
    : '';

  const returnedStepIndex = request.ap_checked_by ? 2 : 1;

  // Requisition Edit Modal State
  const [isEditingRequisition, setIsEditingRequisition] = useState(false);
  const [editPurpose, setEditPurpose] = useState(request.purpose || '');
  const [editSupplierName, setEditSupplierName] = useState(request.supplier_name || '');
  const [editSupplierTaxId, setEditSupplierTaxId] = useState(request.supplier_tax_id || '');
  const [editInvoiceNo, setEditInvoiceNo] = useState(request.invoice_number || '');
  const [editHasNoDocNo, setEditHasNoDocNo] = useState(!!request.has_no_doc_number);
  const [editDocDate, setEditDocDate] = useState(formatDisplayDate(request.document_date));
  const [editReqPaymentDate, setEditReqPaymentDate] = useState(formatDisplayDate(request.requested_payment_date));
  const [editUrgency, setEditUrgency] = useState<'NORMAL' | 'EMERGENCY'>(request.urgency || 'NORMAL');
  const [editSubtotal, setEditSubtotal] = useState<number>(Number(request.subtotal_amount) || 0);
  const [editVatType, setEditVatType] = useState<string>(request.vat_type || 'NO_VAT');
  const [editWhtPercent, setEditWhtPercent] = useState<number>(Number(request.wht_percent) || 0);
  const [editCostCenter, setEditCostCenter] = useState(request.cost_center || '');
  const [editPoPrNo, setEditPoPrNo] = useState(request.po_pr_number || '');
  const [isSavingRequisition, setIsSavingRequisition] = useState(false);

  // Resubmit state
  const [resubmitNote, setResubmitNote] = useState('');

  // Copy PAY Number
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(request.pay_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy Bank Number
  const [copiedBankNo, setCopiedBankNo] = useState(false);
  const handleCopyBankNumber = (val: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedBankNo(true);
      setTimeout(() => setCopiedBankNo(false), 2000);
    }
  };

  // Edit Bank Details State
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState(request.payment_method || (request.bank_name?.includes('พร้อมเพย์') ? 'PROMPTPAY' : 'BANK_TRANSFER'));
  const [editBankName, setEditBankName] = useState(request.bank_name || '');
  const [editBankAccountNo, setEditBankAccountNo] = useState(request.bank_account_no || '');
  const [editBankAccountName, setEditBankAccountName] = useState(request.bank_account_name || '');
  const [isSavingBank, setIsSavingBank] = useState(false);

  const handleSaveBankDetails = async () => {
    setIsSavingBank(true);
    try {
      const res = await updatePaymentBankDetails(request.id, {
        payment_method: editPaymentMethod,
        bank_name: editBankName.trim() || undefined,
        bank_account_no: editBankAccountNo.trim() || undefined,
        bank_account_name: editBankAccountName.trim() || undefined,
        updated_by: userName,
      });
      if (res.success) {
        request.payment_method = editPaymentMethod;
        request.bank_name = editBankName.trim();
        request.bank_account_no = editBankAccountNo.trim();
        request.bank_account_name = editBankAccountName.trim();
        setIsEditingBank(false);
        Swal.fire({ title: 'อัปเดตข้อมูลบัญชีสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsSavingBank(false);
    }
  };

  // Department Supervisor Approval Handlers
  const handleSupervisorApprove = async () => {
    const confirm = await Swal.fire({
      title: 'อนุมัติคำขอนี้ส่งต่อบัญชี?',
      text: `ยืนยันการอนุมัติเอกสารเบิกจ่ายยอดเงิน ${Number(request.net_amount).toLocaleString()} บาท ส่งให้ฝ่ายบัญชี (AP) ตรวจสอบ`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'อนุมัติ (Approve)',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await supervisorApprovePaymentRequest(request.id, {
        approvedBy: userName,
        notes: deptSupervisorNotes,
      });
      if (res.success) {
        Swal.fire({
          title: 'อนุมัติสำเร็จ!',
          text: 'ส่งคำขอให้ฝ่ายบัญชี (AP) ดำเนินการต่อเรียบร้อยแล้ว',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSupervisorReturn = async () => {
    const { value: reason } = await Swal.fire({
      title: 'ส่งเอกสารกลับแก้ไข',
      input: 'textarea',
      inputLabel: 'ระบุเหตุผลในการส่งกลับให้ผู้ขอเบิกแก้ไข',
      inputPlaceholder: 'กรอกเหตุผลที่ส่งกลับ...',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณาระบุเหตุผลการส่งกลับ!';
        }
      },
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'ส่งกลับแก้ไข',
      cancelButtonText: 'ยกเลิก',
    });

    if (!reason) return;

    setIsProcessing(true);
    try {
      const res = await supervisorReturnPaymentRequest(request.id, {
        returnedBy: userName,
        reason: reason.trim(),
      });
      if (res.success) {
        Swal.fire({
          title: 'ส่งเอกสารกลับเรียบร้อย',
          text: 'คำขอถูกส่งกลับให้ผู้ขอเบิกดำเนินการแก้ไข',
          icon: 'info',
        });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Requisition Save Handler
  const calcEditVat = editVatType === 'EXCLUDE' ? editSubtotal * 0.07 : 0;
  const calcEditWht = (editSubtotal * editWhtPercent) / 100;
  const calcEditNet = Math.max(0, editSubtotal + calcEditVat - calcEditWht);

  const handleSaveRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPurpose.trim()) {
      Swal.fire({ title: 'กรุณากรอกวัตถุประสงค์', icon: 'warning' });
      return;
    }
    if (!editSupplierName.trim()) {
      Swal.fire({ title: 'กรุณากรอกชื่อผู้รับเงิน/เจ้าหนี้', icon: 'warning' });
      return;
    }
    setIsSavingRequisition(true);
    try {
      const res = await updatePaymentRequestRequisition(request.id, {
        purpose: editPurpose.trim(),
        supplier_name: editSupplierName.trim(),
        supplier_tax_id: editSupplierTaxId.trim() || undefined,
        invoice_number: editHasNoDocNo ? undefined : editInvoiceNo.trim() || undefined,
        has_no_doc_number: editHasNoDocNo,
        document_date: editDocDate,
        requested_payment_date: editReqPaymentDate || undefined,
        subtotal_amount: editSubtotal,
        vat_type: editVatType,
        vat_amount: calcEditVat,
        wht_type: editWhtPercent > 0 ? `WHT_${editWhtPercent}%` : 'NO_WHT',
        wht_percent: editWhtPercent,
        wht_amount: calcEditWht,
        net_amount: calcEditNet,
        cost_center: editCostCenter.trim() || undefined,
        po_pr_number: editPoPrNo.trim() || undefined,
        urgency: editUrgency,
        updated_by: userName,
      });
      if (res.success) {
        request.purpose = editPurpose.trim();
        request.supplier_name = editSupplierName.trim();
        request.supplier_tax_id = editSupplierTaxId.trim() || null;
        request.invoice_number = editHasNoDocNo ? null : (editInvoiceNo.trim() || null);
        request.has_no_doc_number = editHasNoDocNo;
        request.document_date = editDocDate;
        request.requested_payment_date = editReqPaymentDate || null;
        request.subtotal_amount = editSubtotal;
        request.vat_type = editVatType;
        request.vat_amount = calcEditVat;
        request.wht_percent = editWhtPercent;
        request.wht_amount = calcEditWht;
        request.net_amount = calcEditNet;
        request.cost_center = editCostCenter.trim() || null;
        request.po_pr_number = editPoPrNo.trim() || null;
        request.urgency = editUrgency;
        setIsEditingRequisition(false);
        Swal.fire({ title: 'บันทึกการแก้ไขสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsSavingRequisition(false);
    }
  };

  // Resubmit Handler
  const handleResubmit = async () => {
    const confirm = await Swal.fire({
      title: 'ส่งคำขอให้ตรวจสอบอีกครั้ง?',
      text: 'ยืนยันว่าได้แก้ไขข้อมูลหรือแนบเอกสารตามที่เจ้าหน้าที่ระบุเรียบร้อยแล้ว และต้องการส่งตรวจใหม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'ส่งตรวจอีกครั้ง (Resubmit)',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await resubmitPaymentRequest(request.id, {
        notes: resubmitNote.trim() || undefined,
        resubmittedBy: userName,
      });
      if (res.success) {
        Swal.fire({
          title: 'ส่งคำขอตรวจใหม่สำเร็จ!',
          text: res.targetStatus === 'PENDING_SUPERVISOR'
            ? 'คำขอถูกส่งให้หัวหน้างานพิจารณาอนุมัติแล้ว'
            : 'คำขอถูกส่งเข้าคิวตรวจสอบของฝ่ายบัญชี (AP) เรียบร้อยแล้ว',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete single attachment handler
  const handleDeleteAttachment = async (idx: number) => {
    const target = attachmentsList[idx];
    const confirm = await Swal.fire({
      title: 'ยืนยันลบเอกสารแนบนี้?',
      text: `ต้องการลบไฟล์ "${target?.fileName || 'เอกสาร'}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ลบไฟล์',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    setIsProcessing(true);
    try {
      const res = await deletePaymentRequestAttachment(request.id, idx, userName);
      if (res.success) {
        attachmentsList.splice(idx, 1);
        Swal.fire({ title: 'ลบเอกสารแนบสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
        router.refresh();
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error, icon: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // AP Review Handler
  const handleAPReview = async (newStatus: 'DOCUMENT_CHECK' | 'ACCOUNTING_CHECKED' | 'HOLD_DUPLICATE' | 'RETURN_DOCUMENT') => {
    let finalNotes = apNotes;
    if (newStatus === 'RETURN_DOCUMENT') {
      const { value: reason } = await Swal.fire({
        title: 'ส่งคืนเอกสารให้ผู้ขอเบิกแก้ไข',
        input: 'textarea',
        inputValue: apNotes,
        inputLabel: 'ระบุเหตุผลในการส่งกลับให้แก้ไข (Reason for Return)',
        inputPlaceholder: 'เช่น เอกสารแนบไม่ครบถ้วน, ขาดใบเสร็จตัวจริง, ยอดเงินไม่ตรงกับใบแจ้งหนี้...',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'กรุณาระบุเหตุผลการส่งคืนเอกสารเพื่อให้ผู้ขอเบิกทราบสิ่งที่ต้องแก้ไข!';
          }
        },
        showCancelButton: true,
        confirmButtonColor: '#ea580c',
        confirmButtonText: 'ยืนยันส่งคืนแก้ไข',
        cancelButtonText: 'ยกเลิก',
      });
      if (!reason) return;
      finalNotes = reason.trim();
    }

    setIsProcessing(true);
    try {
      const res = await apReviewPaymentRequest(request.id, {
        status: newStatus,
        notes: finalNotes,
        checkedBy: userName,
      });
      if (res.success) {
        Swal.fire({
          title: newStatus === 'RETURN_DOCUMENT' ? 'ส่งคืนเอกสารเรียบร้อย' : 'บันทึกผลการตรวจสอบ AP เรียบร้อย',
          text: newStatus === 'RETURN_DOCUMENT' ? 'ระบบแจ้งเหตุผลและส่งเอกสารกลับให้ผู้ขอเบิกแก้ไขแล้ว' : undefined,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
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
    let finalNotes = supNotes;
    if (newStatus === 'RETURN_DOCUMENT') {
      const { value: reason } = await Swal.fire({
        title: 'ส่งคืนเอกสารให้ผู้ขอเบิกแก้ไข',
        input: 'textarea',
        inputValue: supNotes,
        inputLabel: 'ระบุเหตุผลในการส่งกลับให้แก้ไข (Reason for Return)',
        inputPlaceholder: 'เช่น เอกสารแนบไม่ครบถ้วน, ขาดใบเสร็จตัวจริง, ยอดเงินเกินงบประมาณ...',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'กรุณาระบุเหตุผลการส่งคืนเอกสาร!';
          }
        },
        showCancelButton: true,
        confirmButtonColor: '#ea580c',
        confirmButtonText: 'ยืนยันส่งคืนแก้ไข',
        cancelButtonText: 'ยกเลิก',
      });
      if (!reason) return;
      finalNotes = reason.trim();
    }

    setIsProcessing(true);
    try {
      const res = await supervisorReviewPaymentRequest(request.id, {
        status: newStatus,
        notes: finalNotes,
        reviewedBy: userName,
      });
      if (res.success) {
        Swal.fire({
          title: newStatus === 'RETURN_DOCUMENT' ? 'ส่งคืนเอกสารเรียบร้อย' : 'หัวหน้าฝ่ายบัญชีสอบทานเรียบร้อย',
          text: newStatus === 'RETURN_DOCUMENT' ? 'ระบบแจ้งเหตุผลและส่งเอกสารกลับให้ผู้ขอเบิกแก้ไขแล้ว' : undefined,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
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
    const newItems: {
      url: string;
      fileName: string;
      fileType?: string;
      fileHash?: string;
      visualHash?: string;
      coreVisualHash?: string;
      fileSize?: number;
      qrPayload?: string;
      barcode?: string;
      extractedTaxId?: string;
      extractedInvoiceNo?: string;
      extractedAmount?: number;
      extractedDate?: string;
      extractedSupplier?: string;
      extractedPhone?: string;
      extractedDescription?: string;
      extractedLineItems?: ExtractedLineItem[];
      rawTextSnippet?: string;
      distinctiveTokens?: string[];
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 1. Calculate fileHash (SHA-256)
      let fileHash = '';
      try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
        fileHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (err) {
        console.warn('Failed to compute fileHash:', err);
      }

      // 2. Visual hashes (Full dHash + Core Center 70% dHash invariant to camera angle & background clutter)
      let visualHash: string | undefined = undefined;
      let coreVisualHash: string | undefined = undefined;
      if (file.type.startsWith('image/')) {
        try {
          const hashes = await computeVisualHashes(file);
          if (hashes) {
            visualHash = hashes.visualHash;
            coreVisualHash = hashes.coreVisualHash;
          }
        } catch (err) {
          console.warn('Failed to compute visual hashes:', err);
        }
      }

      // 3. QR / Barcode detection (<50ms)
      let qrPayload: string | undefined = undefined;
      let barcode: string | undefined = undefined;
      if (file.type.startsWith('image/')) {
        try {
          const slipRes = await detectSlipQrAndBarcode(file);
          if (slipRes.detected) {
            qrPayload = slipRes.qrPayload;
            barcode = slipRes.barcode;
          }
        } catch (e) {
          console.debug('Slip detection skipped:', e);
        }
      }

      // 4. OCR Auto-Scan for invoice/receipt documents (skip if QR slip was already detected!)
      let extractedTaxId: string | undefined = undefined;
      let extractedInvoiceNo: string | undefined = undefined;
      let extractedAmount: number | undefined = undefined;
      let extractedDate: string | undefined = undefined;
      let extractedSupplier: string | undefined = undefined;
      let extractedPhone: string | undefined = undefined;
      let extractedDescription: string | undefined = undefined;
      let extractedLineItems: ExtractedLineItem[] | undefined = undefined;
      let rawTextSnippet: string | undefined = undefined;
      let distinctiveTokens: string[] | undefined = undefined;

      if (file.type.startsWith('image/') && !qrPayload) {
        try {
          const downscaledBlob = await downscaleImageForScan(file, 3200);
          const scanForm = new FormData();
          scanForm.append('file', downscaledBlob, file.name);
          scanForm.append('skipQr', 'true');
          const scanRes = await fetch('/api/scan-document', {
            method: 'POST',
            body: scanForm,
            signal: AbortSignal.timeout(30000),
          });
          if (scanRes.ok) {
            const scanData = await scanRes.json();
            if (scanData.success) {
              if (scanData.qrPayload && !qrPayload) qrPayload = scanData.qrPayload;
              if (scanData.barcode && !barcode) barcode = scanData.barcode;
              if (scanData.extractedTaxId) extractedTaxId = scanData.extractedTaxId;
              if (scanData.extractedInvoiceNo) extractedInvoiceNo = scanData.extractedInvoiceNo;
              if (scanData.extractedAmount) extractedAmount = scanData.extractedAmount;
              if (scanData.extractedDate) extractedDate = scanData.extractedDate;
              if (scanData.extractedSupplier) extractedSupplier = scanData.extractedSupplier;
              if (scanData.extractedPhone) extractedPhone = scanData.extractedPhone;
              if (scanData.extractedDescription) extractedDescription = scanData.extractedDescription;
              if (Array.isArray(scanData.extractedLineItems) && scanData.extractedLineItems.length > 0) {
                extractedLineItems = scanData.extractedLineItems;
              }
              if (scanData.rawTextSnippet) rawTextSnippet = scanData.rawTextSnippet;
              if (scanData.distinctiveTokens) distinctiveTokens = scanData.distinctiveTokens;
            }
          }
        } catch (ocrErr) {
          console.warn('OCR Auto-Scan request timed out or skipped:', ocrErr);
        }
      }

      // 5. Check duplicates against DB (invariant to separate cameras & angles)
      const dupCheck = await checkAttachmentDuplicates({
        items: [
          {
            fileName: file.name,
            fileHash,
            visualHash,
            coreVisualHash,
            fileSize: file.size,
            qrPayload,
            barcode,
            extractedTaxId,
            extractedInvoiceNo,
            extractedAmount,
            extractedSupplier,
            extractedPhone,
            extractedDescription,
            extractedLineItems,
            rawTextSnippet,
            distinctiveTokens,
            currentAmount: Number(request.net_amount || 0),
            currentSupplier: request.supplier_name || undefined,
          },
        ],
        fileHashes: fileHash ? [fileHash] : [],
        excludeId: request.id,
      });

      if (dupCheck.isDuplicate && dupCheck.matches.length > 0) {
        const match = dupCheck.matches[0];
        let explanationText = '';
        if (match.matchType === 'ATTACHMENT_QR') {
          explanationText = `รหัส QR Code บนสลิปหรือบิลนี้ (PromptPay Slip Payload) ตรงกับเอกสารที่เคยแนบในระบบกลาง 100% แม้จะถ่ายจากต่างกล้อง (Separate Cameras)`;
        } else if (match.matchType === 'ATTACHMENT_OCR') {
          explanationText = `ข้อมูล OCR (เลขที่บิล "${match.invoice_number || extractedInvoiceNo}") ตรงกับเอกสารในระบบกลาง`;
        } else if (match.matchType === 'ATTACHMENT_VISUAL_CONTEXT') {
          explanationText = `ตรวจพบเอกสารเดียวกันจากการจับคู่ภาพและบริบท (ความคล้ายคลึงของโครงร่างเอกสาร + ยอดเงิน/ผู้ขาย/เบอร์โทร ตรงกัน)`;
        } else {
          explanationText = `เนื้อหาหรือโครงสร้างภาพตรงกับเอกสารที่เคยแนบในระบบกลาง (ตรวจพบจากโครงสร้างภาพแม้ถ่ายต่างมุมหรือต่างกล้อง)`;
        }

        await Swal.fire({
          title: 'ตรวจพบเอกสารซ้ำซ้อนในระบบ!',
          html: `
            <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
              <p class="font-bold text-red-900 text-sm">ไฟล์ "${file.name}" เคยถูกใช้งานแล้ว</p>
              <p class="text-gray-700">${explanationText}:</p>
              <div class="bg-white p-3 rounded-lg border border-red-100 font-mono text-[11px] space-y-1">
                <p><span class="text-gray-500 font-sans">เลขที่คำขอเดิม:</span> <b class="text-red-700 font-bold">${match.pay_number}</b></p>
                <p><span class="text-gray-500 font-sans">ผู้ขาย:</span> <b>${match.supplier_name}</b></p>
                <p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b>${Number(match.net_amount).toLocaleString()} ฿</b></p>
                <p><span class="text-gray-500 font-sans">สถานะคำขอเดิม:</span> <b>${match.status}</b></p>
              </div>
              <p class="text-red-700 font-medium text-[11px]">* ระบบไม่อนุญาตให้แนบเอกสารซ้ำ</p>
            </div>
          `,
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
        continue;
      }

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
            fileHash: fileHash || undefined,
            visualHash: visualHash || data.visualHash || undefined,
            coreVisualHash: coreVisualHash || undefined,
            qrPayload: qrPayload || data.qrPayload || undefined,
            barcode: barcode || undefined,
            fileSize: file.size,
            extractedTaxId,
            extractedInvoiceNo,
            extractedAmount,
            extractedDate,
            extractedSupplier,
            extractedPhone,
            extractedDescription,
            extractedLineItems,
            rawTextSnippet,
            distinctiveTokens,
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
        <p class="text-red-500 font-medium mt-2">[คำเตือน] ข้อมูลรายการและประวัติการตรวจสอบทั้งหมดจะถูกลบอย่างถาวร</p>
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

  // Attachment verification states
  const [isScanningAtt, setIsScanningAtt] = useState(false);
  const [attScanStatus, setAttScanStatus] = useState<
    Record<number, { isDuplicate: boolean; matchedPayNumber?: string; reason?: string; verified?: boolean }>
  >({});

  const scanAttachmentsVerification = async (silent = false) => {
    if (!attachmentsList || attachmentsList.length === 0) return;
    setIsScanningAtt(true);

    try {
      const results: Record<number, { isDuplicate: boolean; matchedPayNumber?: string; reason?: string; verified?: boolean }> = {};
      let duplicateFoundCount = 0;
      const duplicateDetails: string[] = [];

      for (let i = 0; i < attachmentsList.length; i++) {
        const att = attachmentsList[i];
        const checkRes = await checkAttachmentDuplicates({
          items: [
            {
              fileName: att.fileName,
              fileHash: att.fileHash,
              visualHash: att.visualHash,
              coreVisualHash: att.coreVisualHash,
              fileSize: att.fileSize,
              qrPayload: att.qrPayload,
              barcode: att.barcode,
              extractedTaxId: att.extractedTaxId,
              extractedInvoiceNo: att.extractedInvoiceNo,
              extractedAmount: att.extractedAmount,
              extractedSupplier: att.extractedSupplier,
              extractedPhone: att.extractedPhone,
              rawTextSnippet: att.rawTextSnippet,
              distinctiveTokens: att.distinctiveTokens,
              currentAmount: Number(request.net_amount || 0),
              currentSupplier: request.supplier_name || undefined,
            },
          ],
          fileHashes: att.fileHash ? [att.fileHash] : [],
          excludeId: request.id,
        });

        if (checkRes.isDuplicate && checkRes.matches.length > 0) {
          duplicateFoundCount++;
          const match = checkRes.matches[0];
          results[i] = {
            isDuplicate: true,
            matchedPayNumber: match.pay_number,
            reason: match.reason,
            verified: true,
          };
          duplicateDetails.push(`• ไฟล์ <b>${att.fileName}</b>: ซ้ำกับคำขอ <b>${match.pay_number}</b> (${match.supplier_name})`);
        } else {
          results[i] = {
            isDuplicate: false,
            verified: true,
          };
        }
      }

      setAttScanStatus(results);

      if (!silent) {
        if (duplicateFoundCount > 0) {
          await Swal.fire({
            title: 'ตรวจพบเอกสารซ้ำซ้อน!',
            html: `
              <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
                <p class="font-bold text-red-900 text-sm">พบเอกสารซ้ำ ${duplicateFoundCount} ไฟล์จากทั้งหมด ${attachmentsList.length} ไฟล์</p>
                <div class="space-y-1 text-gray-700">
                  ${duplicateDetails.join('<br>')}
                </div>
                <p class="text-red-700 text-[11px] pt-1">* กรุณาตรวจสอบความถูกต้องของเอกสาร</p>
              </div>
            `,
            icon: 'warning',
            confirmButtonColor: '#dc2626',
          });
        } else {
          await Swal.fire({
            title: 'ผลการตรวจสอบเอกสารและหลักฐาน',
            html: `
              <div class="text-left text-xs bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2">
                <p class="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-emerald-600 shrink-0 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg> เอกสารแนบและหลักฐานถูกต้องสมบูรณ์
                </p>
                <p class="text-gray-700">
                  ระบบได้สแกนลายนิ้วมือดิจิทัล (Digital SHA-256) และลายนิ้วมือภาพ (Visual Fingerprint) ของเอกสารแนบทั้ง <b>${attachmentsList.length} ไฟล์</b> เรียบร้อยแล้ว:
                </p>
                <ul class="list-disc list-inside space-y-1 text-gray-600 font-mono text-[11px]">
                  ${attachmentsList.map((a: any) => `<li>${a.fileName} (${a.fileSize ? `${(a.fileSize / 1024).toFixed(1)} KB` : 'สมบูรณ์'})</li>`).join('')}
                </ul>
                <p class="text-emerald-800 font-medium text-[11px] pt-1">
                  * ยืนยันไม่พบประวัติการใช้งานซ้ำในใบขอจ่ายอื่นในระบบ
                </p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#059669',
          });
        }
      }
    } catch (err) {
      console.error('Error scanning attachments:', err);
    } finally {
      setIsScanningAtt(false);
    }
  };

  useEffect(() => {
    if (attachmentsList && attachmentsList.length > 0) {
      scanAttachmentsVerification(true);
    }
  }, [request.id, attachmentsList.length]);

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
            สาขา: <b className="text-gray-800">{request.branch}</b> | ฝ่าย:{' '}
            <b className="text-gray-800">{request.requester_department || '-'}</b> | ประเภท:{' '}
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
          {['PENDING_SUPERVISOR', 'SUBMITTED', 'DRAFT', 'HOLD_DUPLICATE', 'RETURN_DOCUMENT'].includes(request.status) && (isStaff || isOwner) && (
            <button
              onClick={handleCancel}
              className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-xl transition"
            >
              ยกเลิกคำขอ
            </button>
          )}
          {isManager && (
            <button
              onClick={handleDelete}
              title="ลบคำขอนี้ (เฉพาะผู้จัดการฝ่ายบัญชี/Admin)"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-gray-200 hover:border-red-300 text-xs font-semibold rounded-xl transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบคำขอ</span>
            </button>
          )}
        </div>
      </div>

      {/* Return for Revision Banner (Prominent Alert) */}
      {isReturned && (
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/50 border-2 border-orange-300 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-orange-100 text-orange-700 rounded-xl shrink-0 mt-0.5 border border-orange-200 shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-orange-950">
                    เอกสารนี้ถูกส่งคืนให้แก้ไข (Document Returned for Revision)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-200/90 text-orange-800 border border-orange-300">
                    ส่งคืนแก้ไข
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-orange-900/80">
                  <span>ผู้ส่งคืน: <b className="text-orange-950">{returnedBy}</b></span>
                  {returnedAt && <span>วันที่ส่งคืน: <b className="text-orange-950">{returnedAt}</b></span>}
                </div>
              </div>
            </div>

            {/* Quick Action buttons for Owner or Staff */}
            {(isOwner || isStaff) && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsEditingRequisition(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-orange-50 text-orange-800 border border-orange-300 text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-orange-600" />
                  แก้ไขข้อมูลคำขอ
                </button>
                <button
                  type="button"
                  onClick={handleResubmit}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs hover:shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  ส่งตรวจอีกครั้ง (Resubmit)
                </button>
              </div>
            )}
          </div>

          {/* Reason Callout Box */}
          <div className="bg-white/95 rounded-xl p-4 border border-orange-200 shadow-2xs text-xs space-y-1.5">
            <div className="font-bold text-orange-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <MessageSquare className="w-4 h-4 text-orange-600" />
              เหตุผลในการส่งกลับแก้ไข (Reason for Return):
            </div>
            <p className="text-slate-800 font-medium pl-5.5 whitespace-pre-wrap leading-relaxed text-sm">
              {returnReason}
            </p>
          </div>

          <div className="text-[11px] text-orange-900/90 flex items-center gap-2 bg-orange-100/60 p-2.5 rounded-xl border border-orange-200/60">
            <span className="font-bold shrink-0">คำแนะนำ:</span>
            <span>ท่านสามารถคลิกปุ่ม <b>"แก้ไขข้อมูลคำขอ"</b> หรือแนบเอกสารหลักฐานเพิ่มเติมที่กล่องด้านล่าง จากนั้นกดปุ่ม <b>"ส่งตรวจอีกครั้ง"</b> เพื่อให้ฝ่ายบัญชีดำเนินการตรวจสอบต่อ</span>
          </div>
        </div>
      )}

      {/* Visual Workflow Stepper */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs overflow-x-auto space-y-3">
        {isReturned && (
          <div className="flex items-center justify-between pb-1 border-b border-orange-100">
            <span className="text-[11px] font-semibold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 inline-flex items-center gap-1.5">
              <Undo2 className="w-3.5 h-3.5 text-orange-600" />
              กระบวนการชั่วคราว: เอกสารถูกส่งกลับแก้ไขที่ขั้นตอนที่ {returnedStepIndex} ({WORKFLOW_STEPS[returnedStepIndex - 1]?.label}) — อยู่ระหว่างรอผู้ขอเบิกแก้ไขและส่งตรวจใหม่
            </span>
          </div>
        )}
        <div className="min-w-[700px] flex items-center justify-between relative pt-1">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-0" />
          {WORKFLOW_STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = isReturned ? (stepNum < returnedStepIndex) : !!stepDoneMap[stepNum];
            const isCurrent = isReturned ? false : (currentIncompleteStep === stepNum);
            const isReturnedCurrent = isReturned && (stepNum === returnedStepIndex);

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 bg-white px-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                    isReturnedCurrent
                      ? 'bg-orange-500 text-white border-orange-500 ring-4 ring-orange-100 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isCurrent
                      ? 'bg-red-600 text-white border-red-600 ring-4 ring-red-100'
                      : 'bg-white text-gray-400 border-gray-300'
                  }`}
                >
                  {isReturnedCurrent ? (
                    <Undo2 className="w-4 h-4" />
                  ) : isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                    isReturnedCurrent
                      ? 'text-orange-950 font-bold'
                      : isCurrent
                      ? 'text-red-900 font-bold'
                      : isCompleted
                      ? 'text-gray-800'
                      : 'text-gray-400'
                  }`}
                >
                  {isReturnedCurrent ? `${step.label} (ส่งคืน)` : step.label}
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
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    ข้อมูลบัญชีสำหรับการโอนเงิน (Payment Destination):
                  </span>
                  {!['PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED', 'CANCELLED'].includes(request.status) && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBank(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>แก้ไขข้อมูลบัญชี</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    request.payment_method === 'PROMPTPAY' || request.bank_name?.includes('พร้อมเพย์')
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {request.payment_method === 'PROMPTPAY' || request.bank_name?.includes('พร้อมเพย์') ? 'พร้อมเพย์' : 'บัญชีธนาคาร'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {request.bank_name || 'ไม่ระบุธนาคาร'}
                  </span>
                </div>

                {request.bank_account_no ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-sm text-indigo-900 font-bold bg-white px-2.5 py-0.5 rounded border border-indigo-200 shadow-2xs">
                      {request.bank_account_no}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyBankNumber(request.bank_account_no || '')}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-indigo-700 bg-white hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition"
                      title="คัดลอกเลขบัญชี"
                    >
                      {copiedBankNo ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="block text-slate-400 text-xs italic mt-0.5">ยังไม่ได้ระบุเลขที่บัญชี</span>
                )}

                {request.bank_account_name && (
                  <div className="text-[11px] text-slate-600 mt-1">
                    ชื่อบัญชี: <span className="font-semibold text-slate-900">{request.bank_account_name}</span>
                  </div>
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

          {/* Multi-Item Requisition Table Card (รายการเบิกเงิน) */}
          {Array.isArray(request.items) && request.items.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-600" />
                  ตารางรายการเบิกเงิน (Requisition Items - {request.items.length} รายการ)
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  {Array.from(new Set(request.items.map((i: any) => i.supplierName).filter(Boolean))).length > 1
                    ? `รวม ${Array.from(new Set(request.items.map((i: any) => i.supplierName).filter(Boolean))).length} ผู้จำหน่าย`
                    : 'ผู้จำหน่ายรายเดียว'}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-center">
                      <th className="py-2.5 px-2 w-12 border-r border-slate-200">ลำดับ</th>
                      <th className="py-2.5 px-3 w-28 border-r border-slate-200">วันที่บิล</th>
                      <th className="py-2.5 px-3 w-48 text-left border-r border-slate-200">ผู้จำหน่าย (Supplier)</th>
                      <th className="py-2.5 px-3 text-left border-r border-slate-200">รายการ (Description)</th>
                      <th className="py-2.5 px-3 w-32 text-right border-r border-slate-200">จำนวนเงิน (฿)</th>
                      <th className="py-2.5 px-3 w-28">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {request.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-2 text-center font-mono text-slate-500 border-r border-slate-100 align-top">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700 text-[11px] border-r border-slate-100 align-top">
                          {item.billDate || '-'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 align-top">
                          <span className="font-semibold text-slate-900 block leading-tight">{item.supplierName || '-'}</span>
                          {item.invoiceNumber && (
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">บิล: {item.invoiceNumber}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 align-top">
                          <span className="font-medium text-slate-800 leading-relaxed block">{item.description}</span>
                          {item.paidByCreditCard && (
                            <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              จ่ายด้วยบัตรเครดิต
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100 align-top">
                          {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] align-top">
                          {item.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/90 font-semibold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700 border-r border-slate-200">
                        จำนวนเงินรวม (Total Amount):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold border-r border-slate-200">
                        {request.items.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                    {Number(request.credit_card_deduction || 0) > 0 && (
                      <tr className="text-red-700 bg-red-50/30">
                        <td colSpan={4} className="py-2 px-3 text-right font-medium border-r border-slate-200">
                          หักยอดที่จ่ายด้วยบัตรเครดิต:
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold border-r border-slate-200">
                          -{Number(request.credit_card_deduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-[10px] text-center text-slate-400">หักออกจากยอดเบิก</td>
                      </tr>
                    )}
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-900 border-r border-slate-200">
                        จำนวนเงินที่เบิก (ยอดรวมสุทธิ):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-700 font-extrabold text-sm border-r border-slate-200">
                        {Number(request.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

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
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  เอกสารแนบและหลักฐาน ({attachmentsList.length})
                </h2>
                {attachmentsList.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> ตรวจสอบลายนิ้วมือดิจิทัลแล้ว
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {attachmentsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => scanAttachmentsVerification(false)}
                    disabled={isScanningAtt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition shadow-2xs cursor-pointer"
                    title="คลิกเพื่อสแกนและตรวจสอบเอกสารแนบกับฐานข้อมูลกลาง"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {isScanningAtt ? 'กำลังตรวจสอบ...' : 'สแกนตรวจสอบเอกสาร'}
                  </button>
                )}

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
            </div>

            {attachmentsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">ยังไม่มีเอกสารแนบในคำขอนี้</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachmentsList.map((att: any, idx: number) => {
                  const status = attScanStatus[idx];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        {att.url && (att.url.match(/\.(jpg|jpeg|png|webp)/i) || att.fileType?.startsWith('image/')) ? (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100 block group relative hover:opacity-90 transition"
                            title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                          >
                            <img
                              src={att.url}
                              alt={att.fileName}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-slate-800 hover:text-indigo-600 truncate block underline"
                          >
                            {att.fileName}
                          </a>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'เอกสารแนบ'}
                            </span>
                            {status?.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> ซ้ำกับ {status.matchedPayNumber}
                              </span>
                            ) : status?.verified || att.fileHash || att.visualHash ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> ตรวจสอบแล้ว ไม่ซ้ำ
                              </span>
                            ) : null}
                            {att.qrPayload && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" title={att.qrPayload}>
                                <QrCode className="w-2.5 h-2.5 text-purple-600" /> QR Slip
                              </span>
                            )}
                            {att.extractedInvoiceNo && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title={`บิลเลขที่: ${att.extractedInvoiceNo}`}>
                                <Scan className="w-2.5 h-2.5 text-blue-600" /> {att.extractedInvoiceNo}
                              </span>
                            )}
                            {att.extractedAmount && att.extractedAmount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <DollarSign className="w-2.5 h-2.5 text-amber-600" /> {Number(att.extractedAmount).toLocaleString()} ฿
                              </span>
                            )}
                            {att.extractedSupplier && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title={`ร้านค้า/ผู้ขาย: ${att.extractedSupplier}`}>
                                <Building2 className="w-2.5 h-2.5 text-emerald-600" /> {att.extractedSupplier}
                              </span>
                            )}
                            {att.extractedDescription && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"
                                title={`รายการสินค้า/บริการ: ${att.extractedDescription}`}
                              >
                                <FileText className="w-2.5 h-2.5 text-indigo-600" />{' '}
                                {att.extractedDescription.length > 35
                                  ? att.extractedDescription.slice(0, 35) + '...'
                                  : att.extractedDescription}
                              </span>
                            )}
                            {att.rawTextSnippet && (
                              <button
                                type="button"
                                onClick={() => {
                                  Swal.fire({
                                    title: 'ข้อความที่ OCR สแกนได้จากเอกสาร',
                                    html: `
                                      <div class="text-left text-xs space-y-2">
                                        <div class="bg-gray-100 p-2.5 rounded-lg border font-mono text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap text-gray-800">
                                          ${att.rawTextSnippet}
                                        </div>
                                        <p class="text-gray-500 text-[11px]">* ระบบใช้ข้อความนี้ในการตรวจจับความซ้ำซ้อน</p>
                                      </div>
                                    `,
                                    confirmButtonText: 'ปิดหน้าต่าง',
                                    confirmButtonColor: '#4b5563',
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-600 bg-white hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 transition cursor-pointer shadow-2xs"
                                title="คลิกเพื่อดูข้อความที่ OCR อ่านได้ทั้งหมด"
                              >
                                <Eye className="w-2.5 h-2.5 text-slate-500" /> ดูข้อความ OCR
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="เปิดดูเอกสาร"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {(request.status === 'RETURN_DOCUMENT' || isStaff || isOwner) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(idx)}
                            disabled={isProcessing}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="ลบเอกสารแนบนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Role-based Action Panels & Audit Log */}
        <div className="space-y-6">
          {/* Action Panel: Return Document (Resubmission Action) */}
          {request.status === 'RETURN_DOCUMENT' && (
            <div className="bg-white p-5 rounded-2xl border-2 border-orange-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-950 font-bold text-xs uppercase tracking-wide">
                  <Undo2 className="w-4 h-4 text-orange-600" />
                  ส่งตรวจอีกครั้ง (Resubmit Request)
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  <AlertCircle className="w-3 h-3 text-orange-600" /> รอแก้ไขข้อมูล
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                เมื่อท่านได้แก้ไขข้อมูลหรือแนบเอกสารหลักฐานเพิ่มเติมตามที่เจ้าหน้าที่ระบุเรียบร้อยแล้ว กรุณาระบุคำชี้แจงและกดส่งตรวจอีกครั้ง
              </p>

              {(isOwner || isStaff) ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ข้อความชี้แจงการแก้ไข (Optional):
                    </label>
                    <textarea
                      rows={2}
                      value={resubmitNote}
                      onChange={(e) => setResubmitNote(e.target.value)}
                      placeholder="ระบุสิ่งที่แก้ไข เช่น แนบใบเสร็จตัวจริงเพิ่มเติมและแก้ไขยอดแล้วค่ะ"
                      className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingRequisition(true)}
                      className="py-2 px-3 bg-white hover:bg-orange-50 text-orange-800 border border-orange-300 text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-orange-600" /> แก้ไขข้อมูล
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleResubmit}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> ส่งตรวจใหม่
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200 text-xs text-orange-800">
                  อยู่ระหว่างรอผู้ขอเบิก (คุณ{request.requester_name}) ดำเนินการปรับปรุงแก้ไขเอกสาร
                </div>
              )}
            </div>
          )}

          {/* Action Panel: Department Supervisor Approval */}
          {request.status === 'PENDING_SUPERVISOR' && (
            canApproveSupervisor ? (
              <div className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    ส่วนสำหรับหัวหน้างาน (Supervisor Approval)
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <ShieldCheck className="w-3 h-3 text-amber-600" /> สิทธิ์: หัวหน้างานฝ่าย {request.requester_department || 'ที่เกี่ยวข้อง'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  โปรดตรวจสอบความจำเป็นและความถูกต้องของรายการขอเบิกจ่าย ก่อนส่งให้ฝ่ายบัญชี (AP) ดำเนินการตรวจสอบเอกสาร
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ความเห็น/หมายเหตุของหัวหน้างาน (บันทึกลงระบบ):
                  </label>
                  <textarea
                    rows={2}
                    value={deptSupervisorNotes}
                    onChange={(e) => setDeptSupervisorNotes(e.target.value)}
                    placeholder="ระบุความเห็น เช่น อนุมัติเบิกจ่ายตามจริง, ตรวจสอบแล้วตรงตามแผนงาน..."
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSupervisorReturn}
                    className="py-2.5 px-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> ส่งกลับให้แก้ไข
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSupervisorApprove}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติส่งต่อบัญชี
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-amber-600" />
                  อยู่ระหว่างรอหัวหน้างานอนุมัติ: {request.assigned_supervisor_name || `ฝ่าย ${request.requester_department || 'ที่เกี่ยวข้อง'}`}
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  คำขอนี้ส่งถึง {request.assigned_supervisor_name ? `คุณ${request.assigned_supervisor_name}` : 'หัวหน้างาน'} (ฝ่าย {request.requester_department || 'ที่เกี่ยวข้อง'} • สาขา {request.branch || 'สำนักงานใหญ่'}) แล้ว ระบบจะส่งเอกสารให้ฝ่ายบัญชี (AP) โดยอัตโนมัติเมื่อหัวหน้างานดำเนินการอนุมัติเรียบร้อย
                </p>
                <div className="text-[11px] text-amber-700 flex items-center gap-1.5 pt-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  {supervisorAuth.reason || `สิทธิ์การอนุมัตินี้สงวนไว้เฉพาะหัวหน้างานฝ่าย ${request.requester_department || ''} สาขา ${request.branch || ''}`}
                </div>
              </div>
            )
          )}

          {/* Action Panel: AP Verification */}
          {['SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK', 'HOLD_DUPLICATE'].includes(request.status) && (
            isStaff ? (
              <div className="bg-white p-5 rounded-2xl border-2 border-red-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    ส่วนสำหรับฝ่ายบัญชีเจ้าหนี้ (AP Verification)
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    <ShieldCheck className="w-3 h-3 text-red-600" /> สิทธิ์: ฝ่ายบัญชี
                  </span>
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
            ) : (
              <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    สถานะ: อยู่ระหว่างฝ่ายบัญชี (AP) ตรวจสอบเอกสาร
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                    กำลังดำเนินการ
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  คำขอเบิกจ่ายถูกส่งเข้าระบบเรียบร้อยแล้ว ขณะนี้เจ้าหน้าที่ฝ่ายบัญชีเจ้าหนี้ (AP) กำลังตรวจสอบความถูกต้องของบิล ใบกำกับภาษี และตรวจเช็คประวัติการเบิกจ่ายซ้ำซ้อน
                </p>
                <div className="text-[10px] text-slate-500 bg-white/70 rounded-lg p-2.5 border border-amber-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  เมื่อฝ่ายบัญชีตรวจสอบผ่าน รายการจะส่งต่อไปยังหัวหน้าฝ่ายบัญชีเพื่อสอบทานและอนุมัติจ่ายต่อไป
                </div>
              </div>
            )
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
            isStaff ? (
              <form
                onSubmit={handleFinancePay}
                className="bg-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wide">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    ฝ่ายการเงินบันทึกการจ่ายเงิน (Finance Disbursement)
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> สิทธิ์: ฝ่ายการเงิน/บัญชี
                  </span>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    รายการนี้อยู่ใน <b>Approved Payment List</b> เรียบร้อยแล้ว ยอดโอนสุทธิ:{' '}
                    <b className="font-mono text-emerald-800">{Number(request.net_amount).toLocaleString()} บาท</b>
                  </span>
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
            ) : (
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    สถานะ: คำขอได้รับอนุมัติแล้ว (Approved) - รอฝ่ายการเงินโอนเงิน
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                    Ready to Pay
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  รายการนี้ได้รับการอนุมัติอย่างถูกต้องและอยู่ใน <b>Approved Payment List</b> เรียบร้อยแล้ว ฝ่ายการเงินส่วนกลางจะดำเนินการโอนเงินเข้าบัญชีตามรอบจ่ายที่กำหนด
                </p>
                <div className="text-[10px] text-slate-500 bg-white/70 rounded-lg p-2.5 border border-emerald-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  ยอดโอนสุทธิ: <b className="font-mono text-emerald-700">{Number(request.net_amount).toLocaleString()} บาท</b>
                </div>
              </div>
            )
          )}

          {/* Action Panel: AP Post to GL (Express / Odoo) */}
          {request.status === 'PAID' && isStaff && (
            <form
              onSubmit={handlePostGL}
              className="bg-white p-5 rounded-2xl border-2 border-cyan-300 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-950 font-bold text-xs uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 text-cyan-700" />
                  บันทึกลงบัญชี Express / Odoo (GL Posting)
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                  <ShieldCheck className="w-3 h-3 text-cyan-600" /> สิทธิ์: ฝ่ายบัญชี
                </span>
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
          {(request.status === 'PAID' || request.status === 'POSTED_TO_GL') && !request.original_received_at && isStaff && (
            <div className="bg-white p-5 rounded-2xl border-2 border-violet-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-950 font-bold text-xs uppercase tracking-wide">
                  <Paperclip className="w-4 h-4 text-violet-700" />
                  รับเอกสารตัวจริง (Original Document Receipt)
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-800 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                  <ShieldCheck className="w-3 h-3 text-violet-600" /> สิทธิ์: ฝ่ายบัญชี
                </span>
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
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ผู้ขอเบิก:</span>
                <span className="font-semibold text-slate-800">{request.requester_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">หัวหน้างานอนุมัติ:</span>
                <span className="text-slate-800 font-medium">
                  {request.supervisor_checked_by ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {request.supervisor_checked_by}
                    </span>
                  ) : request.status === 'PENDING_SUPERVISOR' ? (
                    <span className="text-amber-600 font-semibold">
                      รอหัวหน้างานอนุมัติ {request.assigned_supervisor_name ? `(${request.assigned_supervisor_name})` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400">ผ่านการอนุมัติแล้ว</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">AP ผู้ตรวจสอบ:</span>
                <span className="text-slate-800">{request.ap_checked_by || 'ยังไม่ตรวจสอบ'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">หัวหน้าบัญชีสอบทาน:</span>
                <span className="text-slate-800 font-medium">
                  {request.accounting_manager_checked_by ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {request.accounting_manager_checked_by}
                    </span>
                  ) : ['ACCOUNTING_CHECKED', 'APPROVED', 'READY_TO_PAY', 'PAID', 'POSTED_TO_GL', 'CLOSED'].includes(request.status) ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      สอบทานแล้ว
                    </span>
                  ) : (
                    <span className="text-slate-400">ยังไม่สอบทาน</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ผู้อนุมัติ:</span>
                <span className="font-semibold text-emerald-700">{request.approved_by || 'ยังไม่อนุมัติ'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">การเงินผู้จ่าย:</span>
                <span className="font-semibold text-slate-800">{request.paid_by || 'ยังไม่จ่าย'}</span>
              </div>
              {request.bank_reference_no && (
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-500 font-sans">เลขที่โอน:</span>
                  <span className="text-indigo-700 font-bold">{request.bank_reference_no}</span>
                </div>
              )}
              {request.gl_voucher_no && (
                <div className="flex justify-between items-center font-mono">
                  <span className="text-slate-500 font-sans">เลขที่ GL:</span>
                  <span className="text-cyan-800 font-bold">{request.gl_voucher_no}</span>
                </div>
              )}
              {request.original_received_at && (
                <div className="p-2 bg-violet-50 rounded-lg text-violet-900 font-semibold text-[10px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span>ได้รับเอกสารตัวจริงแล้ว ({request.original_stamp_text})</span>
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
                          timeZone: 'Asia/Bangkok',
                        })}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${log.to_status === 'RETURN_DOCUMENT' ? 'text-orange-900 font-medium bg-orange-50 p-1.5 rounded-lg border border-orange-200' : 'text-slate-600'}`}>
                      {log.notes}
                    </p>
                    {log.to_status && (
                      <span className={`inline-flex items-center gap-1 mt-1 text-[9px] px-1.5 py-0.5 rounded font-mono ${log.to_status === 'RETURN_DOCUMENT' ? 'bg-orange-100 text-orange-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                        {log.from_status && (
                          <>
                            <span>{log.from_status}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400 inline" />
                          </>
                        )}
                        <span>{log.to_status}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Bank Details Modal for AR/Requester */}
      {isEditingBank && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">แก้ไขข้อมูลบัญชีสำหรับการโอนเงิน</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBank(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Method Switcher */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  รูปแบบการรับเงิน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod('BANK_TRANSFER');
                      if (editBankName.includes('พร้อมเพย์') || !editBankName) {
                        setEditBankName('ธนาคารกสิกรไทย (KBANK)');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center flex items-center justify-center gap-1.5 ${
                      editPaymentMethod === 'BANK_TRANSFER'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>บัญชีธนาคาร</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditPaymentMethod('PROMPTPAY');
                      if (!editBankName.includes('พร้อมเพย์')) {
                        setEditBankName('พร้อมเพย์ (เบอร์โทรศัพท์ (Mobile))');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center flex items-center justify-center gap-1.5 ${
                      editPaymentMethod === 'PROMPTPAY'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    <span>พร้อมเพย์</span>
                  </button>
                </div>
              </div>

              {/* Bank Name / Type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {editPaymentMethod === 'PROMPTPAY' ? 'ประเภทพร้อมเพย์' : 'ธนาคารผู้รับเงิน'}
                </label>
                {editPaymentMethod === 'BANK_TRANSFER' ? (
                  <select
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                  >
                    {THAI_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                  >
                    {PROMPTPAY_TYPES.map((pt) => (
                      <option key={pt.id} value={`พร้อมเพย์ (${pt.label})`}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {editPaymentMethod === 'PROMPTPAY' ? 'หมายเลขพร้อมเพย์' : 'เลขที่บัญชีธนาคาร'}
                </label>
                <input
                  type="text"
                  value={editBankAccountNo}
                  onChange={(e) => setEditBankAccountNo(e.target.value)}
                  placeholder="ระบุเลขที่บัญชี หรือ หมายเลขพร้อมเพย์"
                  className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 py-2 px-3 bg-white"
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ชื่อบัญชีผู้รับเงิน (Account Name)
                </label>
                <input
                  type="text"
                  value={editBankAccountName}
                  onChange={(e) => setEditBankAccountName(e.target.value)}
                  placeholder={request.supplier_name ? `เช่น ${request.supplier_name}` : 'ชื่อเจ้าของบัญชี'}
                  className="w-full text-xs rounded-xl border border-slate-300 py-2 px-3 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingBank(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSavingBank}
                onClick={handleSaveBankDetails}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {isSavingBank ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Requisition Modal (For RETURN_DOCUMENT and Editable statuses) */}
      {isEditingRequisition && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    แก้ไขข้อมูลคำขอเบิกจ่าย ({request.pay_number})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ปรับปรุงรายละเอียด ยอดเงิน ภาษี และข้อมูลเอกสารตามที่ได้รับแจ้ง
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingRequisition(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRequisition} className="space-y-4 text-xs">
              {/* Purpose */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  วัตถุประสงค์และรายละเอียดค่าใช้จ่าย (Purpose) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder="ระบุวัตถุประสงค์การเบิกจ่าย"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Supplier & Tax ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ผู้รับเงิน / เจ้าหนี้ (Supplier) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    placeholder="ชื่อบริษัท ร้านค้า หรือผู้รับเงิน"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เลขประจำตัวผู้เสียภาษี (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={editSupplierTaxId}
                    onChange={(e) => setEditSupplierTaxId(e.target.value)}
                    placeholder="13 หลัก (ถ้ามี)"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Invoice & Doc Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เลขที่ใบกำกับ/ใบเสร็จ (Invoice No.)
                  </label>
                  <input
                    type="text"
                    disabled={editHasNoDocNo}
                    value={editInvoiceNo}
                    onChange={(e) => setEditInvoiceNo(e.target.value)}
                    placeholder={editHasNoDocNo ? 'ไม่มีเลขที่เอกสาร' : 'เช่น INV-2026-001'}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <label className="inline-flex items-center gap-1.5 mt-1.5 cursor-pointer text-[10px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={editHasNoDocNo}
                      onChange={(e) => setEditHasNoDocNo(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600"
                    />
                    ไม่มีเลขที่เอกสาร (บิลเงินสด/ใบรับรอง)
                  </label>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    วันที่เอกสาร (Document Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDocDate}
                    onChange={(e) => setEditDocDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    วันที่ต้องการให้จ่าย (Due Date)
                  </label>
                  <input
                    type="date"
                    value={editReqPaymentDate}
                    onChange={(e) => setEditReqPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Amounts & Taxes Calculation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ยอดรวมก่อนภาษี (Subtotal) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={editSubtotal || ''}
                      onChange={(e) => setEditSubtotal(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ภาษีมูลค่าเพิ่ม (VAT)
                    </label>
                    <select
                      value={editVatType}
                      onChange={(e) => setEditVatType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="NO_VAT">ไม่มี VAT (0%)</option>
                      <option value="INCLUDE">รวม VAT ในยอดแล้ว (Include 7%)</option>
                      <option value="EXCLUDE">แยก VAT ต่างหาก (+7%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      หัก ณ ที่จ่าย (WHT)
                    </label>
                    <select
                      value={editWhtPercent}
                      onChange={(e) => setEditWhtPercent(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="0">ไม่หัก (0%)</option>
                      <option value="1">หัก 1% (ค่าขนส่ง)</option>
                      <option value="2">หัก 2% (ค่าโฆษณา)</option>
                      <option value="3">หัก 3% (บริการ/วิชาชีพ)</option>
                      <option value="5">หัก 5% (ค่าเช่า/รางวัล)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="text-slate-600">
                    VAT: <b className="font-mono text-slate-800">+{calcEditVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</b> |{' '}
                    WHT: <b className="font-mono text-red-600">-{calcEditWht.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</b>
                  </div>
                  <div className="text-sm font-bold text-red-700">
                    ยอดสุทธิ (Net Payable): <span className="font-mono">{calcEditNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                  </div>
                </div>
              </div>

              {/* Urgency, Cost Center, PO/PR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ระดับความเร่งด่วน
                  </label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="NORMAL">ปกติ (NORMAL)</option>
                    <option value="EMERGENCY">ด่วนที่สุด (EMERGENCY)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    โครงการ / Cost Center
                  </label>
                  <input
                    type="text"
                    value={editCostCenter}
                    onChange={(e) => setEditCostCenter(e.target.value)}
                    placeholder="เช่น โปรเจกต์ติดตั้ง..."
                    className="w-full rounded-xl border border-slate-300 py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เลขที่ PO / PR อ้างอิง
                  </label>
                  <input
                    type="text"
                    value={editPoPrNo}
                    onChange={(e) => setEditPoPrNo(e.target.value)}
                    placeholder="เช่น PO-6910-0012"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingRequisition(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingRequisition}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  {isSavingRequisition ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
