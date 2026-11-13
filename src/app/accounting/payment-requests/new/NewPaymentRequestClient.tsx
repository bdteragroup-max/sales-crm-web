"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createPaymentRequest,
  updateFullPaymentRequest,
  checkDuplicates,
  checkAttachmentDuplicates,
  getPaymentRequests,
  PaymentRequestRecord,
  RequisitionItem,
  ItemAttachment,
  SupervisorOption,
} from '@/app/actions/paymentRequests';
import { isSupervisorOrManager, normalizePersonName } from '@/app/lib/roleHelper';
import { calculateItemTaxes, truncate2Decimals } from '../utils/itemTaxes';
import {
  ExtractedLineItem,
  formatDateToISO,
  escapeHtml,
  formatAttachmentDuplicateReason,
  findInFormDuplicateAttachment,
} from '@/lib/attachmentUtils';
import {
  detectSlipQrAndBarcode,
  computeVisualHashes,
  isImageAttachmentFile,
  scanImageWithOcrApi,
} from '@/lib/slipDetector';
import PrintablePaymentVoucher from '../components/PrintablePaymentVoucher';
import SubstituteReceiptModal from '../components/SubstituteReceiptModal';
import {
  SubstituteReceiptData,
  SubstituteReceiptLineItem,
  uploadSubstituteReceiptPdf,
} from '../components/SubstituteReceiptCertificate';
import { thaiBahtText } from '@/app/lib/thaiBahtText';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Paperclip,
  Upload,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  User,
  Info,
  ExternalLink,
  Trash2,
  Sparkles,
  Zap,
  CreditCard,
  Send,
  Layers,
  Check,
  ShieldCheck,
  Clock,
  RefreshCw,
  RotateCcw,
  Lightbulb,
  Printer,
  Copy,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  ListPlus,
  Scan,
  QrCode,
  Eye,
  Calculator,
  MessageSquare,
  Edit2,
  Edit3,
  Save,
  Loader2,
  PenLine,
  LayoutList,
} from 'lucide-react';
import Swal from 'sweetalert2';

type Props = {
  currentUser?: {
    id: string;
    fullName: string;
    role?: string;
    employeeId?: string | null;
  } | null;
  branches?: { id: string; name: string }[];
  initialBranch?: string;
  initialDept?: string;
  initialPhone?: string;
  initialSupervisor?: string;
  initialSupervisorId?: string;
  supervisorOptions?: SupervisorOption[];
  initialMyRequests?: PaymentRequestRecord[];
  isEditMode?: boolean;
  initialData?: (PaymentRequestRecord & { logs?: any[] }) | null;
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

const DEFAULT_BRANCHES = [
  { id: 'BKK-HQ', name: 'สำนักงานใหญ่' },
  { id: 'BKK-WH', name: 'Tera Warehouse 62' },
  { id: 'CMI01', name: 'เชียงใหม่' },
  { id: 'KK01', name: 'ขอนแก่น' },
  { id: 'KRI01', name: 'กาญจนบุรี' },
  { id: 'NRT', name: 'นครศรีธรรมราช' },
  { id: 'PSNL01', name: 'พิษณุโลก' },
  { id: 'ROI01', name: 'ร้อยเอ็ด' },
  { id: 'SMK', name: 'สมุทรสาคร' },
  { id: 'SN01', name: 'สกลนคร' },
  { id: 'SRN01', name: 'สุรินทร์' },
  { id: 'SRT01', name: 'สุราษฎร์ธานี' },
  { id: 'UB01', name: 'อุบลราชธานี' },
  { id: 'UDN01', name: 'อุดรธานี' },
];

export const THAI_BANKS = [
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย (KBANK)', shortName: 'กสิกรไทย', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-800', dotColor: 'bg-emerald-600', ringColor: 'ring-emerald-500' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์ (SCB)', shortName: 'ไทยพาณิชย์', badgeBg: 'bg-purple-50', badgeText: 'text-purple-800', dotColor: 'bg-purple-700', ringColor: 'ring-purple-500' },
  { code: 'BBL', name: 'ธนาคารกรุงเทพ (BBL)', shortName: 'กรุงเทพ', badgeBg: 'bg-blue-50', badgeText: 'text-blue-800', dotColor: 'bg-blue-800', ringColor: 'ring-blue-600' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย (KTB)', shortName: 'กรุงไทย', badgeBg: 'bg-sky-50', badgeText: 'text-sky-800', dotColor: 'bg-sky-500', ringColor: 'ring-sky-500' },
  { code: 'TTB', name: 'ธนาคารทหารไทยธนชาต (ttb)', shortName: 'ทีทีบี (ttb)', badgeBg: 'bg-blue-50', badgeText: 'text-blue-900', dotColor: 'bg-blue-600', ringColor: 'ring-blue-500' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา (BAY)', shortName: 'กรุงศรี', badgeBg: 'bg-amber-50', badgeText: 'text-amber-800', dotColor: 'bg-amber-500', ringColor: 'ring-amber-500' },
  { code: 'GSB', name: 'ธนาคารออมสิน (GSB)', shortName: 'ออมสิน', badgeBg: 'bg-pink-50', badgeText: 'text-pink-800', dotColor: 'bg-pink-600', ringColor: 'ring-pink-500' },
  { code: 'BAAC', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)', shortName: 'ธ.ก.ส.', badgeBg: 'bg-green-50', badgeText: 'text-green-800', dotColor: 'bg-green-700', ringColor: 'ring-green-600' },
  { code: 'UOB', name: 'ธนาคารยูโอบี (UOB)', shortName: 'ยูโอบี', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-800', dotColor: 'bg-indigo-800', ringColor: 'ring-indigo-600' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบีไทย (CIMB)', shortName: 'ซีไอเอ็มบี', badgeBg: 'bg-red-50', badgeText: 'text-red-800', dotColor: 'bg-red-700', ringColor: 'ring-red-600' },
  { code: 'KKP', name: 'ธนาคารเกียรตินาคินภัทร (KKP)', shortName: 'เกียรตินาคิน', badgeBg: 'bg-purple-50', badgeText: 'text-purple-900', dotColor: 'bg-purple-900', ringColor: 'ring-purple-600' },
  { code: 'TISCO', name: 'ธนาคารทิสโก้ (TISCO)', shortName: 'ทิสโก้', badgeBg: 'bg-blue-50', badgeText: 'text-blue-800', dotColor: 'bg-blue-700', ringColor: 'ring-blue-500' },
  { code: 'LHBANK', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)', shortName: 'แลนด์ แอนด์ เฮ้าส์', badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-800', dotColor: 'bg-cyan-700', ringColor: 'ring-cyan-600' },
  { code: 'OTHER', name: 'ธนาคารอื่นๆ (ระบุเอง)', shortName: 'อื่นๆ', badgeBg: 'bg-gray-100', badgeText: 'text-gray-800', dotColor: 'bg-gray-500', ringColor: 'ring-gray-400' },
];

export const TOP_BANKS = THAI_BANKS.slice(0, 7);

export const PROMPTPAY_TYPES = [
  {
    id: 'PHONE',
    label: 'เบอร์โทรศัพท์ (Mobile)',
    title: 'เบอร์โทรศัพท์',
    subtitle: '(Mobile)',
    shortLabel: 'เบอร์มือถือ',
    placeholder: '08X-XXX-XXXX (10 หลัก)',
    hint: 'ระบุเบอร์โทรศัพท์มือถือ 10 หลักที่ลงทะเบียนพร้อมเพย์',
  },
  {
    id: 'CITIZEN_ID',
    label: 'เลขบัตรประชาชน (Citizen ID)',
    title: 'เลขบัตรประชาชน',
    subtitle: '(Citizen ID)',
    shortLabel: 'บัตรประชาชน',
    placeholder: 'X-XXXX-XXXXX-XX-X (13 หลัก)',
    hint: 'ระบุเลขประจำตัวประชาชน 13 หลักของผู้รับเงิน',
  },
  {
    id: 'TAX_ID',
    label: 'เลขประจำตัวผู้เสียภาษี (Tax ID)',
    title: 'เลขนิติบุคคล/ภาษี',
    subtitle: '(Tax ID)',
    shortLabel: 'เลขนิติบุคคล/ภาษี',
    placeholder: '0-XXXXXXXXXX-XX (13 หลัก)',
    hint: 'ระบุเลขประจำตัวผู้เสียภาษี 13 หลักของนิติบุคคลหรือร้านค้า',
  },
  {
    id: 'E_WALLET',
    label: 'e-Wallet ID (กระเป๋าเงินดิจิทัล)',
    title: 'e-Wallet ID',
    subtitle: '(Digital Wallet)',
    shortLabel: 'e-Wallet',
    placeholder: '15 หลัก',
    hint: 'ระบุรหัส e-Wallet ID 15 หลัก',
  },
];

const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowStr = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDefaultRequisitionItem = (overrides: Partial<RequisitionItem> = {}): RequisitionItem => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  billDate: getTodayStr(),
  supplierName: '',
  supplierTaxId: '',
  invoiceNumber: '',
  description: '',
  amount: 0,
  vatType: 'NO_VAT',
  vatAmount: 0,
  whtType: 'NONE',
  whtPercent: 0,
  whtAmount: 0,
  netAmount: 0,
  remarks: '',
  paidByCreditCard: false,
  isIrregularBill: false,
  attachments: [],
  ...overrides,
});

export default function NewPaymentRequestClient({
  currentUser,
  branches,
  initialBranch,
  initialDept,
  initialPhone,
  initialSupervisor,
  initialSupervisorId = '',
  supervisorOptions = [],
  initialMyRequests,
  isEditMode = false,
  initialData = null,
}: Props) {
  const router = useRouter();

  const branchList = branches && branches.length > 0 ? branches : DEFAULT_BRANCHES;

  // Tab State: 'create' for new form, 'my_requests' to view own request statuses
  const [activeTab, setActiveTab] = useState<'create' | 'my_requests'>('create');
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [showAllSections, setShowAllSections] = useState<boolean>(Boolean(isEditMode));
  const [showRequesterEditor, setShowRequesterEditor] = useState<boolean>(false);

  const goToFormStep = (step: 1 | 2 | 3 | 4) => {
    setFormStep(step);
    requestAnimationFrame(() => {
      document.getElementById('payment-request-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const [myRequests, setMyRequests] = useState<PaymentRequestRecord[]>(initialMyRequests || []);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedVoucherRequest, setSelectedVoucherRequest] = useState<PaymentRequestRecord | null>(null);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');
  const [copiedPayNo, setCopiedPayNo] = useState<string | null>(null);

  const refreshMyRequests = async () => {
    if (!currentUser) return;
    setIsLoadingRequests(true);
    try {
      const res = await getPaymentRequests({
        requesterId: currentUser.id,
        requesterName: currentUser.fullName,
      });
      setMyRequests(res || []);
    } catch (e) {
      console.error('Failed to refresh my requests', e);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleCopyPayNo = (payNo: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payNo);
    }
    setCopiedPayNo(payNo);
    setTimeout(() => setCopiedPayNo(null), 2000);
  };

  // Status Metrics
  const pendingCount = useMemo(() => {
    return myRequests.filter((r) =>
      ['PENDING_SUPERVISOR', 'SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK', 'ACCOUNTING_CHECKED'].includes(r.status)
    ).length;
  }, [myRequests]);

  const approvedCount = useMemo(() => {
    return myRequests.filter((r) =>
      ['APPROVED', 'READY_TO_PAY'].includes(r.status)
    ).length;
  }, [myRequests]);

  const paidCount = useMemo(() => {
    return myRequests.filter((r) =>
      ['PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED'].includes(r.status)
    ).length;
  }, [myRequests]);

  const attentionCount = useMemo(() => {
    return myRequests.filter((r) =>
      ['HOLD_DUPLICATE', 'RETURN_DOCUMENT'].includes(r.status)
    ).length;
  }, [myRequests]);

  const filteredMyRequests = useMemo(() => {
    return myRequests.filter((r) => {
      if (requestStatusFilter === 'PENDING') {
        if (!['PENDING_SUPERVISOR', 'SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK', 'ACCOUNTING_CHECKED'].includes(r.status)) return false;
      } else if (requestStatusFilter === 'READY') {
        if (!['APPROVED', 'READY_TO_PAY'].includes(r.status)) return false;
      } else if (requestStatusFilter === 'PAID') {
        if (!['PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED'].includes(r.status)) return false;
      } else if (requestStatusFilter === 'ATTENTION') {
        if (!['HOLD_DUPLICATE', 'RETURN_DOCUMENT'].includes(r.status)) return false;
      }

      if (requestSearchQuery.trim()) {
        const q = requestSearchQuery.toLowerCase().trim();
        const matchPay = r.pay_number?.toLowerCase().includes(q);
        const matchSupplier = r.supplier_name?.toLowerCase().includes(q);
        const matchPurpose = r.purpose?.toLowerCase().includes(q);
        const matchBranch = r.branch?.toLowerCase().includes(q);
        const matchInv = r.invoice_number?.toLowerCase().includes(q);
        if (!matchPay && !matchSupplier && !matchPurpose && !matchBranch && !matchInv) {
          return false;
        }
      }
      return true;
    });
  }, [myRequests, requestStatusFilter, requestSearchQuery]);

  // Form States
  const [company, setCompany] = useState<'TG' | 'TE' | 'TP'>(initialData?.company || 'TG');
  const [branch, setBranch] = useState(() => {
    if (initialData?.branch) {
      const found = branchList.find((b) => b.name === initialData.branch || b.id === initialData.branch);
      return found ? found.name : 'อื่นๆ (ระบุ)';
    }
    return initialBranch || (branchList[0] ? branchList[0].name : 'สำนักงานใหญ่');
  });
  const [customBranch, setCustomBranch] = useState(() => {
    if (initialData?.branch) {
      const found = branchList.find((b) => b.name === initialData.branch || b.id === initialData.branch);
      return found ? '' : initialData.branch;
    }
    return '';
  });
  const [classification, setClassification] = useState<
    'VENDOR_BILL' | 'REIMBURSEMENT' | 'BRANCH_SITE' | 'PETTY_CASH' | 'CASH_ADVANCE'
  >(initialData?.classification || 'VENDOR_BILL');
  const [urgency, setUrgency] = useState<'NORMAL' | 'EMERGENCY'>(initialData?.urgency || 'NORMAL');

  // Requisition Form Entry Mode: Fixed to MULTI_ITEMS (Multiple items & multiple suppliers)
  const entryMode = 'MULTI_ITEMS' as const;

  // Multi-Item Requisition Table State (matching "รายการเบิกเงิน")
  const [requisitionItems, setRequisitionItems] = useState<RequisitionItem[]>(() => {
    if (initialData?.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
      return initialData.items.map((it: any, idx: number) => ({
        id: it.id || `item_${Date.now()}_${idx}`,
        billDate: it.billDate || (initialData?.document_date ? formatDisplayDate(initialData.document_date) : getTodayStr()),
        supplierName: it.supplierName || '',
        supplierTaxId: it.supplierTaxId || '',
        invoiceNumber: it.invoiceNumber || '',
        description: it.description || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: Number(it.amount) || 0,
        vatType: it.vatType || 'NO_VAT',
        vatAmount: Number(it.vatAmount) || 0,
        whtType: it.whtType || 'NONE',
        whtPercent: Number(it.whtPercent) || 0,
        whtAmount: Number(it.whtAmount) || 0,
        netAmount: Number(it.netAmount) || 0,
        remarks: it.remarks || '',
        paidByCreditCard: Boolean(it.paidByCreditCard),
        isIrregularBill: Boolean(it.isIrregularBill),
        substituteCertificateUrl: it.substituteCertificateUrl,
        substituteCertificateFileName: it.substituteCertificateFileName,
        substituteGroupKey: it.substituteGroupKey,
        requesterSignatureUrl: it.requesterSignatureUrl,
        approverName: it.approverName,
        approverPosition: it.approverPosition,
        approverSignatureUrl: it.approverSignatureUrl,
        attachments: Array.isArray(it.attachments) ? it.attachments : [],
      }));
    }
    if (initialData) {
      const vatT = initialData.vat_type === '7%' ? '7%' : (initialData.vat_type === 'INCLUDED_7%' ? 'INCLUDED_7%' : 'NO_VAT');
      return [{
        id: 'item_1',
        billDate: initialData.document_date ? formatDisplayDate(initialData.document_date) : getTodayStr(),
        supplierName: initialData.supplier_name || '',
        supplierTaxId: initialData.supplier_tax_id || '',
        invoiceNumber: initialData.invoice_number || '',
        description: initialData.purpose || '',
        amount: Number(initialData.subtotal_amount) || 0,
        vatType: vatT,
        vatAmount: Number(initialData.vat_amount) || 0,
        whtType: initialData.wht_type || 'NONE',
        whtPercent: Number(initialData.wht_percent) || 0,
        whtAmount: Number(initialData.wht_amount) || 0,
        netAmount: Number(initialData.net_amount) || 0,
        remarks: '',
        paidByCreditCard: false,
        isIrregularBill: false,
        attachments: [],
      }];
    }
    return [
      {
        id: 'item_1',
        billDate: getTodayStr(),
        supplierName: '',
        supplierTaxId: '',
        invoiceNumber: '',
        description: '',
        amount: 0,
        vatType: 'NO_VAT',
        vatAmount: 0,
        whtType: 'NONE',
        whtPercent: 0,
        whtAmount: 0,
        netAmount: 0,
        remarks: '',
        paidByCreditCard: false,
        isIrregularBill: false,
        attachments: [],
      },
    ];
  });
  const [creditCardDeduction, setCreditCardDeduction] = useState<string>(
    initialData?.credit_card_deduction !== undefined && initialData?.credit_card_deduction !== null
      ? String(initialData.credit_card_deduction)
      : '0'
  );

  const [itemUploadingIdx, setItemUploadingIdx] = useState<number | null>(null);
  const [showPreSubmitReviewModal, setShowPreSubmitReviewModal] = useState(false);
  const [pendingShouldResubmit, setPendingShouldResubmit] = useState(true);


  const handleRemoveItemAttachment = (itemIndex: number, attIndex: number) => {
    setRequisitionItems((prev) => {
      return prev.map((it, idx) => {
        if (idx !== itemIndex) return it;
        const currentAtts = Array.isArray(it.attachments) ? it.attachments : [];
        return {
          ...it,
          attachments: currentAtts.filter((_, aIdx) => aIdx !== attIndex),
        };
      });
    });
  };

  const handleAddItem = (copyFromLast = false) => {
    setRequisitionItems((prev) => {
      const last = prev[prev.length - 1];
      const newItem = buildDefaultRequisitionItem({
        billDate: copyFromLast && last?.billDate ? last.billDate : (documentDate || getTodayStr()),
        supplierName: copyFromLast && last?.supplierName ? last.supplierName : '',
        supplierTaxId: copyFromLast && last?.supplierTaxId ? last.supplierTaxId : '',
        invoiceNumber: copyFromLast && last?.invoiceNumber ? last.invoiceNumber : '',
        vatType: copyFromLast && last?.vatType ? last.vatType : 'NO_VAT',
        whtType: copyFromLast && last?.whtType ? last.whtType : 'NONE',
      });
      return [...prev, newItem];
    });
  };

  const handleRemoveItem = (index: number) => {
    const targetItem = requisitionItems[index];
    const groupKey = targetItem?.substituteGroupKey || (targetItem ? getSubstituteGroupKey(targetItem.supplierName, targetItem.billDate) : '');

    setRequisitionItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        return [buildDefaultRequisitionItem({ billDate: documentDate || getTodayStr() })];
      }
      return next;
    });

    if (targetItem?.isIrregularBill) {
      const remainingItems = requisitionItems.filter((_, i) => i !== index);
      if (groupKey) {
        const remainingInGroup = remainingItems.filter(
          (it) => it.isIrregularBill && getSubstituteGroupKey(it.supplierName, it.billDate) === groupKey
        );
        if (remainingInGroup.length > 0) {
          syncGroupSubstituteCertificate(groupKey, remainingItems, true);
        } else {
          setAttachments((attPrev) =>
            attPrev.filter(
              (a: any) =>
                a.substituteGroupKey !== groupKey &&
                a.relatedItemId !== (targetItem?.id || `item_${index}`)
            )
          );
        }
      } else if (targetItem.id) {
        setAttachments((attPrev) => attPrev.filter((a: any) => a.relatedItemId !== targetItem.id));
      }
    } else if (targetItem?.id) {
      setAttachments((attPrev) => attPrev.filter((a: any) => a.relatedItemId !== targetItem.id));
    }
  };

  const handleUpdateItem = (index: number, field: keyof RequisitionItem, value: any) => {
    setRequisitionItems((prev) => {
      const next = [...prev];
      const itemToUpdate = { ...next[index], [field]: value };
      if (field === 'amount' || field === 'vatType' || field === 'whtType' || field === 'whtPercent') {
        const taxes = calculateItemTaxes(itemToUpdate);
        itemToUpdate.vatAmount = taxes.vatAmount;
        itemToUpdate.whtPercent = taxes.whtPercent;
        itemToUpdate.whtAmount = taxes.whtAmount;
        itemToUpdate.netAmount = taxes.netAmount;
      }
      next[index] = itemToUpdate;
      return next;
    });
  };

  const handleApplyVatToAll = (newVatType: string) => {
    setRequisitionItems((prev) =>
      prev.map((it) => {
        const itemToUpdate = { ...it, vatType: newVatType };
        const taxes = calculateItemTaxes(itemToUpdate);
        return {
          ...itemToUpdate,
          vatAmount: taxes.vatAmount,
          whtPercent: taxes.whtPercent,
          whtAmount: taxes.whtAmount,
          netAmount: taxes.netAmount,
        };
      })
    );
  };

  const handleApplyWhtToAll = (newWhtType: string) => {
    setRequisitionItems((prev) =>
      prev.map((it) => {
        const itemToUpdate = { ...it, whtType: newWhtType };
        const taxes = calculateItemTaxes(itemToUpdate);
        return {
          ...itemToUpdate,
          vatAmount: taxes.vatAmount,
          whtPercent: taxes.whtPercent,
          whtAmount: taxes.whtAmount,
          netAmount: taxes.netAmount,
        };
      })
    );
  };

  const handleToggleCreditCard = (index: number) => {
    setRequisitionItems((prev) => {
      const next = [...prev];
      const newStatus = !next[index].paidByCreditCard;
      next[index] = { ...next[index], paidByCreditCard: newStatus };
      const totalCc = next
        .filter((it) => it.paidByCreditCard)
        .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      setCreditCardDeduction(totalCc > 0 ? String(totalCc) : '0');
      return next;
    });
  };

  // Substitute Receipt Certificate state & helpers
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  const [activeSubstituteItemIdx, setActiveSubstituteItemIdx] = useState<number | null>(null);
  const [substituteModalData, setSubstituteModalData] = useState<SubstituteReceiptData | null>(null);
  const [isGeneratingCertMap, setIsGeneratingCertMap] = useState<Record<number, boolean>>({});
  const [formRequesterSig, setFormRequesterSig] = useState<string | null>(initialData?.requester_signature_url || null);
  const [formSupervisorSig, setFormSupervisorSig] = useState<string | null>(initialData?.supervisor_signature_url || null);

  const COMPANY_SHORT_MAP: Record<string, string> = {
    TG: 'บจก.เทอรา กรุ้ป',
    TE: 'บจก.เทอรา อิเล็กทริค',
    TP: 'บจก.เทอรา พาวเวอร์',
  };

  const COMPANY_LOGO_MAP: Record<string, string> = {
    TG: '/4.png',
    TE: '/6.png',
    TP: '/7.png',
  };

  // Date & Supplier Normalizers for grouping
  const normalizeDateForGroup = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      let y = parseInt(dmyMatch[3], 10);
      if (y > 2400) y -= 543;
      const m = dmyMatch[2].padStart(2, '0');
      const d = dmyMatch[1].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymdMatch) {
      let y = parseInt(ymdMatch[1], 10);
      if (y > 2400) y -= 543;
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return s.split('T')[0];
  };

  const normalizeSupplierForGroup = (supplierName?: string | null): string => {
    if (!supplierName) return '';
    return supplierName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  };

  const getSubstituteGroupKey = (supplierName?: string | null, billDate?: string | null): string => {
    const normSupplier = normalizeSupplierForGroup(supplierName);
    const normDate = normalizeDateForGroup(billDate);
    if (!normSupplier || !normDate) return '';
    return `${normSupplier}:::${normDate}`;
  };

  /**
   * Sync and generate a single merged PDF certificate for all items sharing a supplier and billDate
   */
  const syncGroupSubstituteCertificate = async (
    targetGroupKey: string,
    currentItems: RequisitionItem[],
    silent = false,
    overrideCompany?: 'TG' | 'TE' | 'TP',
    overrideApproverName?: string,
    overrideApproverId?: string
  ) => {
    const activeCompany = overrideCompany || company;
    const effectiveSupName =
      overrideApproverName !== undefined
        ? overrideApproverName
        : supervisorId === '__NONE__'
        ? ''
        : supervisorName;
    const effectiveSupId =
      overrideApproverId !== undefined
        ? overrideApproverId
        : supervisorId === '__NONE__'
        ? ''
        : supervisorId;
    if (!targetGroupKey) return;

    const groupMatches = currentItems
      .map((it, idx) => ({ it, idx }))
      .filter(
        ({ it }) =>
          it.isIrregularBill &&
          getSubstituteGroupKey(it.supplierName, it.billDate) === targetGroupKey
      );

    if (groupMatches.length === 0) {
      setAttachments((prev) =>
        prev.filter((a: any) => a.substituteGroupKey !== targetGroupKey)
      );
      return;
    }

    // Set generating status for each item in this group
    setIsGeneratingCertMap((prev) => {
      const next = { ...prev };
      groupMatches.forEach(({ idx }) => {
        next[idx] = true;
      });
      return next;
    });

    try {
      const lineItems: SubstituteReceiptLineItem[] = groupMatches.map(({ it, idx }) => ({
        id: it.id || `item_${idx}`,
        billDate: it.billDate,
        description: it.description || 'ค่าใช้จ่ายทั่วไป',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: Number(it.amount) || 0,
      }));

      const firstItem = groupMatches[0].it;
      const totalAmount = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
      const allDescriptions = lineItems.map((li) => li.description).filter(Boolean).join(', ');

      const certData: SubstituteReceiptData = {
        groupKey: targetGroupKey,
        itemIds: lineItems.map((li) => li.id || ''),
        itemId: lineItems[0]?.id || `item_${groupMatches[0].idx}`,
        billDate: firstItem.billDate || documentDate || getTodayStr(),
        supplierName: firstItem.supplierName || 'ร้านค้า/ผู้รับเงิน',
        description: allDescriptions || 'ค่าใช้จ่ายทั่วไป',
        amount: totalAmount,
        items: lineItems,
        requesterName: requesterName || currentUser?.fullName || '',
        requesterPosition: requesterDept || 'พนักงาน',
        requesterSignatureUrl: firstItem.requesterSignatureUrl || formRequesterSig || undefined,
        approverId: overrideApproverName !== undefined ? effectiveSupId : effectiveSupId || undefined,
        approverName:
          overrideApproverName !== undefined
            ? overrideApproverName
            : firstItem.approverName || effectiveSupName || '',
        approverPosition: firstItem.approverPosition || 'หัวหน้างาน',
        approverSignatureUrl: firstItem.approverSignatureUrl || formSupervisorSig || undefined,
        companyName: COMPANY_SHORT_MAP[activeCompany] || 'บจก.เทอรา กรุ้ป',
        companyCode: activeCompany,
        logoUrl: COMPANY_LOGO_MAP[activeCompany] || '/4.png',
        startDate: firstItem.billDate || documentDate,
        endDate: firstItem.billDate || documentDate,
        documentDate: documentDate || firstItem.billDate,
      };

      const uploadRes = await uploadSubstituteReceiptPdf(certData);

      setRequisitionItems((prev) => {
        const next = [...prev];
        groupMatches.forEach(({ idx }) => {
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              isIrregularBill: true,
              substituteCertificateUrl: uploadRes.url,
              substituteCertificateFileName: uploadRes.fileName,
              substituteGroupKey: targetGroupKey,
              requesterSignatureUrl: certData.requesterSignatureUrl,
              approverName: certData.approverName,
              approverPosition: certData.approverPosition,
              approverSignatureUrl: certData.approverSignatureUrl,
            };
          }
        });
        return next;
      });

      setAttachments((prev) => {
        const filtered = prev.filter((a: any) => {
          if (a.substituteGroupKey === targetGroupKey) return false;
          if (groupMatches.some(({ it, idx }) => a.relatedItemId === (it.id || `item_${idx}`))) return false;
          return true;
        });
        return [
          ...filtered,
          {
            url: uploadRes.url,
            fileName: uploadRes.fileName,
            fileType: 'application/pdf',
            fileSize: uploadRes.fileSize,
            extractedSupplier: certData.supplierName,
            extractedDescription: `ใบรับรองแทนใบเสร็จรับเงิน${groupMatches.length > 1 ? ` (รวม ${groupMatches.length} รายการ)` : ''}: ${allDescriptions}`,
            extractedAmount: totalAmount,
            extractedDate: certData.billDate,
            isSubstituteCertificate: true,
            substituteGroupKey: targetGroupKey,
            relatedItemIds: lineItems.map((li) => li.id || ''),
            relatedItemId: lineItems[0]?.id || `item_${groupMatches[0].idx}`,
          },
        ];
      });

      if (!silent) {
        if (groupMatches.length > 1) {
          Swal.fire({
            title: `รวมใบรับรองแทนใบเสร็จ (${groupMatches.length} รายการ) สำเร็จ!`,
            text: `เนื่องจากเป็นผู้จำหน่ายเดียวกัน ("${certData.supplierName}") และวันที่เดียวกัน ระบบรวมเอกสารเป็น PDF ฉบับเดียว (${uploadRes.fileName}) เรียบร้อยแล้ว`,
            icon: 'success',
            timer: 2600,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            title: 'สร้างใบรับรองแทนใบเสร็จรับเงินสำเร็จ!',
            text: `ระบบสร้างเอกสาร PDF และแนบไฟล์ "${uploadRes.fileName}" เรียบร้อยแล้ว`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        }
      }
    } catch (err: any) {
      console.error('Error syncing certificate:', err);
      if (!silent) {
        Swal.fire({
          title: 'เกิดข้อผิดพลาดในการสร้างเอกสาร',
          text: err.message || 'ไม่สามารถสร้างไฟล์ PDF ได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } finally {
      setIsGeneratingCertMap((prev) => {
        const next = { ...prev };
        groupMatches.forEach(({ idx }) => {
          delete next[idx];
        });
        return next;
      });
    }
  };

  const handleOpenSubstituteModal = (index: number) => {
    const item = requisitionItems[index];
    if (!item) return;

    const groupKey = getSubstituteGroupKey(item.supplierName, item.billDate);
    // Find all items sharing this supplier and date that have isIrregularBill (or the current item)
    const groupMatches = requisitionItems
      .map((it, idx) => ({ it, idx }))
      .filter(
        ({ it, idx }) =>
          it.isIrregularBill &&
          (groupKey ? getSubstituteGroupKey(it.supplierName, it.billDate) === groupKey : idx === index)
      );

    if (!groupMatches.some(({ idx }) => idx === index)) {
      groupMatches.push({ it: item, idx: index });
    }

    const lineItems: SubstituteReceiptLineItem[] = groupMatches.map(({ it, idx }) => ({
      id: it.id || `item_${idx}`,
      billDate: it.billDate,
      description: it.description || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: Number(it.amount) || 0,
    }));

    const totalAmount = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
    const allDescriptions = lineItems.map((li) => li.description).filter(Boolean).join(', ');

    setActiveSubstituteItemIdx(index);
    setSubstituteModalData({
      groupKey: groupKey || undefined,
      itemIds: lineItems.map((li) => li.id || ''),
      itemId: item.id || `item_${index}`,
      billDate: item.billDate || documentDate || getTodayStr(),
      supplierName: item.supplierName || '',
      description: allDescriptions || item.description || '',
      amount: totalAmount > 0 ? totalAmount : (Number(item.amount) || 0),
      quantity: groupMatches.length === 1 ? item.quantity : undefined,
      unitPrice: groupMatches.length === 1 ? item.unitPrice : undefined,
      items: lineItems,
      requesterName: requesterName || currentUser?.fullName || '',
      requesterPosition: requesterDept || 'พนักงาน',
      requesterSignatureUrl: item.requesterSignatureUrl || formRequesterSig || undefined,
      approverId: supervisorId !== '__NONE__' ? supervisorId : '',
      approverName: item.approverName || (supervisorId !== '__NONE__' ? supervisorName : '') || '',
      approverPosition: item.approverPosition || 'หัวหน้างาน',
      approverSignatureUrl: item.approverSignatureUrl || formSupervisorSig || undefined,
      companyName: COMPANY_SHORT_MAP[company] || 'บจก.เทอรา กรุ้ป',
      companyCode: company,
      logoUrl: COMPANY_LOGO_MAP[company] || '/4.png',
      startDate: item.billDate || documentDate,
      endDate: item.billDate || documentDate,
      documentDate: documentDate || item.billDate,
    });
    setSubstituteModalOpen(true);
  };

  const handleToggleIrregularBill = async (index: number) => {
    const item = requisitionItems[index];
    if (!item) return;

    const currentStatus = Boolean(item.isIrregularBill);
    const newStatus = !currentStatus;

    if (newStatus) {
      const updatedItems = requisitionItems.map((it, idx) =>
        idx === index ? { ...it, isIrregularBill: true } : it
      );
      setRequisitionItems(updatedItems);

      const groupKey = getSubstituteGroupKey(item.supplierName, item.billDate);
      const hasDetails = (item.description && item.description.trim().length > 0) || Number(item.amount) > 0;

      if (groupKey) {
        const groupMatches = updatedItems.filter(
          (it) => it.isIrregularBill && getSubstituteGroupKey(it.supplierName, it.billDate) === groupKey
        );
        if (groupMatches.length > 1) {
          // Multiple items with same supplier & date! Combine them automatically!
          await syncGroupSubstituteCertificate(groupKey, updatedItems);
          return;
        }
      }

      if (hasDetails) {
        if (groupKey) {
          await syncGroupSubstituteCertificate(groupKey, updatedItems);
        } else {
          setIsGeneratingCertMap((prev) => ({ ...prev, [index]: true }));
          try {
            const certData: SubstituteReceiptData = {
              itemId: item.id || `item_${index}`,
              billDate: item.billDate || documentDate || getTodayStr(),
              supplierName: item.supplierName || 'ร้านค้า/ผู้รับเงิน',
              description: item.description || 'ค่าใช้จ่ายทั่วไป',
              amount: Number(item.amount) || 0,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              requesterName: requesterName || currentUser?.fullName || '',
              requesterPosition: requesterDept || 'พนักงาน',
              requesterSignatureUrl: item.requesterSignatureUrl || formRequesterSig || undefined,
              approverId: supervisorId !== '__NONE__' ? supervisorId : '',
              approverName: item.approverName || (supervisorId !== '__NONE__' ? supervisorName : '') || '',
              approverPosition: item.approverPosition || 'หัวหน้างาน',
              approverSignatureUrl: item.approverSignatureUrl || formSupervisorSig || undefined,
              companyName: COMPANY_SHORT_MAP[company] || 'บจก.เทอรา กรุ้ป',
              companyCode: company,
              logoUrl: COMPANY_LOGO_MAP[company] || '/4.png',
              startDate: item.billDate || documentDate,
              endDate: item.billDate || documentDate,
              documentDate: documentDate || item.billDate,
            };

            const uploadRes = await uploadSubstituteReceiptPdf(certData);

            setRequisitionItems((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = {
                  ...next[index],
                  isIrregularBill: true,
                  substituteCertificateUrl: uploadRes.url,
                  substituteCertificateFileName: uploadRes.fileName,
                  requesterSignatureUrl: certData.requesterSignatureUrl,
                  approverName: certData.approverName,
                  approverPosition: certData.approverPosition,
                  approverSignatureUrl: certData.approverSignatureUrl,
                };
              }
              return next;
            });

            setAttachments((prev) => {
              const filtered = prev.filter((a: any) => a.relatedItemId !== (item.id || `item_${index}`));
              return [
                ...filtered,
                {
                  url: uploadRes.url,
                  fileName: uploadRes.fileName,
                  fileType: 'application/pdf',
                  fileSize: uploadRes.fileSize,
                  extractedSupplier: item.supplierName,
                  extractedDescription: `ใบรับรองแทนใบเสร็จรับเงิน: ${item.description}`,
                  extractedAmount: Number(item.amount) || 0,
                  extractedDate: item.billDate,
                  isSubstituteCertificate: true,
                  relatedItemId: item.id || `item_${index}`,
                },
              ];
            });

            Swal.fire({
              title: 'สร้างใบรับรองแทนใบเสร็จรับเงินสำเร็จ!',
              text: `ระบบสร้างเอกสาร PDF และแนบไฟล์ "${uploadRes.fileName}" เรียบร้อยแล้ว`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
          } catch (err: any) {
            console.error(err);
            Swal.fire({
              title: 'เกิดข้อผิดพลาดในการสร้างเอกสาร',
              text: err.message || 'ไม่สามารถสร้างไฟล์ PDF ได้',
              icon: 'error',
              confirmButtonColor: '#dc2626',
            });
          } finally {
            setIsGeneratingCertMap((prev) => ({ ...prev, [index]: false }));
          }
        }
      } else {
        handleOpenSubstituteModal(index);
      }
    } else {
      // Turn off irregular bill
      const updatedItems = requisitionItems.map((it, idx) =>
        idx === index
          ? {
              ...it,
              isIrregularBill: false,
              substituteCertificateUrl: undefined,
              substituteCertificateFileName: undefined,
              substituteGroupKey: undefined,
            }
          : it
      );
      setRequisitionItems(updatedItems);

      const groupKey = item.substituteGroupKey || getSubstituteGroupKey(item.supplierName, item.billDate);
      if (groupKey) {
        const remainingInGroup = updatedItems.filter(
          (it) => it.isIrregularBill && getSubstituteGroupKey(it.supplierName, it.billDate) === groupKey
        );
        if (remainingInGroup.length > 0) {
          await syncGroupSubstituteCertificate(groupKey, updatedItems);
          Swal.fire({
            title: 'อัปเดตใบรับรองสำเร็จ',
            text: `นำรายการออกแล้ว คงเหลือ ${remainingInGroup.length} รายการในใบรับรอง`,
            icon: 'info',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          setAttachments((prev) =>
            prev.filter(
              (a: any) =>
                a.substituteGroupKey !== groupKey &&
                a.relatedItemId !== (item.id || `item_${index}`)
            )
          );
          Swal.fire({
            title: 'ยกเลิกสถานะบิลไม่สมบูรณ์',
            text: 'นำใบรับรองแทนใบเสร็จออกจากเอกสารแนบแล้ว',
            icon: 'info',
            timer: 1800,
            showConfirmButton: false,
          });
        }
      } else {
        setAttachments((prev) =>
          prev.filter((a: any) => a.relatedItemId !== (item.id || `item_${index}`))
        );
        Swal.fire({
          title: 'ยกเลิกสถานะบิลไม่สมบูรณ์',
          text: 'นำใบรับรองแทนใบเสร็จออกจากเอกสารแนบแล้ว',
          icon: 'info',
          timer: 1800,
          showConfirmButton: false,
        });
      }
    }
  };

  const handleModalSaveAndAttach = (
    updatedData: SubstituteReceiptData,
    result: { url: string; fileName: string; fileSize: number; dataUrl?: string }
  ) => {
    const groupKey = updatedData.groupKey;
    const targetItemIds = updatedData.itemIds || (updatedData.itemId ? [updatedData.itemId] : []);

    setRequisitionItems((prev) => {
      return prev.map((it, idx) => {
        const currentItemId = it.id || `item_${idx}`;
        const isMatched =
          (groupKey && it.isIrregularBill && getSubstituteGroupKey(it.supplierName, it.billDate) === groupKey) ||
          targetItemIds.includes(currentItemId) ||
          (activeSubstituteItemIdx !== null && idx === activeSubstituteItemIdx);

        if (isMatched) {
          const matchedLine = updatedData.items?.find((li) => li.id === currentItemId);
          return {
            ...it,
            isIrregularBill: true,
            supplierName: updatedData.supplierName || it.supplierName,
            billDate: updatedData.billDate || it.billDate,
            description: matchedLine?.description || (updatedData.items && updatedData.items.length > 1 ? it.description : (updatedData.description || it.description)),
            amount: matchedLine?.amount !== undefined ? matchedLine.amount : (updatedData.items && updatedData.items.length > 1 ? it.amount : (updatedData.amount || it.amount)),
            quantity: matchedLine?.quantity !== undefined ? matchedLine.quantity : it.quantity,
            unitPrice: matchedLine?.unitPrice !== undefined ? matchedLine.unitPrice : it.unitPrice,
            substituteCertificateUrl: result.url,
            substituteCertificateFileName: result.fileName,
            substituteGroupKey: groupKey || undefined,
            requesterSignatureUrl: updatedData.requesterSignatureUrl,
            approverName: updatedData.approverName,
            approverPosition: updatedData.approverPosition,
            approverSignatureUrl: updatedData.approverSignatureUrl,
          };
        }
        return it;
      });
    });

    if (updatedData.approverName) {
      setSupervisorName(updatedData.approverName);
      if (updatedData.approverId) {
        setSupervisorId(updatedData.approverId);
      } else {
        const cleanNorm = normalizePersonName(updatedData.approverName);
        const matchedOpt = supervisorOptions.find(
          (o) => normalizePersonName(o.fullName) === cleanNorm
        );
        setSupervisorId(matchedOpt ? matchedOpt.id : '');
      }
    }
    if (updatedData.requesterSignatureUrl) {
      setFormRequesterSig(updatedData.requesterSignatureUrl);
    }
    if (updatedData.approverSignatureUrl) {
      setFormSupervisorSig(updatedData.approverSignatureUrl);
    }

    setAttachments((prev) => {
      const filtered = prev.filter((a: any) => {
        if (groupKey && a.substituteGroupKey === groupKey) return false;
        if (targetItemIds.includes(a.relatedItemId)) return false;
        if (activeSubstituteItemIdx !== null && a.relatedItemId === (requisitionItems[activeSubstituteItemIdx]?.id || `item_${activeSubstituteItemIdx}`)) return false;
        return true;
      });
      return [
        ...filtered,
        {
          url: result.url,
          fileName: result.fileName,
          fileType: 'application/pdf',
          fileSize: result.fileSize,
          extractedSupplier: updatedData.supplierName,
          extractedDescription: `ใบรับรองแทนใบเสร็จรับเงิน${(updatedData.items?.length || 0) > 1 ? ` (รวม ${updatedData.items?.length} รายการ)` : ''}: ${updatedData.description}`,
          extractedAmount: updatedData.amount,
          extractedDate: updatedData.billDate,
          isSubstituteCertificate: true,
          substituteGroupKey: groupKey || undefined,
          relatedItemIds: targetItemIds,
          relatedItemId: targetItemIds[0] || (activeSubstituteItemIdx !== null ? `item_${activeSubstituteItemIdx}` : ''),
        },
      ];
    });
  };

  // Searchable Branch Combobox State
  const [branchSearchQuery, setBranchSearchQuery] = useState(() => {
    if (initialData?.branch) {
      const found = branchList.find((b) => b.name === initialData.branch || b.id === initialData.branch);
      return found ? found.name : 'อื่นๆ (ระบุสาขา / ไซต์งานโครงการ)';
    }
    return initialBranch || (branchList[0] ? branchList[0].name : 'สำนักงานใหญ่');
  });
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Filtered branches based on query (searches both name and id)
  const filteredBranches = useMemo(() => {
    if (!branchSearchQuery.trim()) return branchList;
    const q = branchSearchQuery.toLowerCase().trim();
    return branchList.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
    );
  }, [branchList, branchSearchQuery]);

  // Click outside to close branch dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
        if (branch && branch !== 'อื่นๆ (ระบุ)') {
          setBranchSearchQuery(branch);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [branch]);

  const handleSelectBranch = (selectedBranchName: string) => {
    setBranch(selectedBranchName);
    if (selectedBranchName === 'อื่นๆ (ระบุ)') {
      setBranchSearchQuery('อื่นๆ (ระบุสาขา / ไซต์งานโครงการ)');
    } else {
      setBranchSearchQuery(selectedBranchName);
      setCustomBranch('');
    }
    setIsBranchDropdownOpen(false);
  };

  // Requester & Supervisor Selection
  const [requesterName, setRequesterName] = useState(initialData?.requester_name || currentUser?.fullName || '');
  const [requesterDept, setRequesterDept] = useState(initialData?.requester_department || initialDept || '');
  const [requesterPhone, setRequesterPhone] = useState(initialData?.requester_phone || initialPhone || '');
  const [supervisorName, setSupervisorName] = useState(initialData?.assigned_supervisor_name || initialSupervisor || '');
  const [supervisorId, setSupervisorId] = useState<string>(() => {
    const rawId = initialData?.assigned_supervisor_id || initialSupervisorId || '';
    if (rawId) return rawId;
    const rawName = initialData?.assigned_supervisor_name || initialSupervisor || '';
    if (rawName && supervisorOptions.length > 0) {
      const norm = normalizePersonName(rawName);
      const matched = supervisorOptions.find((o) => normalizePersonName(o.fullName) === norm);
      if (matched) return matched.id;
    }
    return '';
  });
  const [isSupDropdownOpen, setIsSupDropdownOpen] = useState(false);
  const [supSearchQuery, setSupSearchQuery] = useState('');
  const supDropdownRef = useRef<HTMLDivElement>(null);

  const isCurrentUserManagerial = isSupervisorOrManager(currentUser?.role);

  useEffect(() => {
    if (!isSupDropdownOpen) return;
    const handleClickOutsideSup = (e: MouseEvent) => {
      if (supDropdownRef.current && !supDropdownRef.current.contains(e.target as Node)) {
        setIsSupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideSup);
    return () => document.removeEventListener('mousedown', handleClickOutsideSup);
  }, [isSupDropdownOpen]);

  const currentUserIdVal = currentUser?.id || '';
  const currentUserEmpVal = currentUser?.employeeId || '';
  const cleanReqNormForSup = normalizePersonName(requesterName);
  const cleanSupSearchQ = supSearchQuery.trim().toLowerCase();

  const selectableSupervisors = supervisorOptions.filter((opt) => {
    if (currentUserIdVal && opt.userId === currentUserIdVal) return false;
    if (
      currentUserEmpVal &&
      opt.empId &&
      opt.empId.trim().toUpperCase() === currentUserEmpVal.trim().toUpperCase()
    ) {
      return false;
    }
    if (cleanReqNormForSup && normalizePersonName(opt.fullName) === cleanReqNormForSup) return false;
    if (!cleanSupSearchQ) return true;
    return (
      opt.fullName.toLowerCase().includes(cleanSupSearchQ) ||
      (opt.nickname && opt.nickname.toLowerCase().includes(cleanSupSearchQ)) ||
      (opt.department && opt.department.toLowerCase().includes(cleanSupSearchQ)) ||
      (opt.branch && opt.branch.toLowerCase().includes(cleanSupSearchQ)) ||
      (opt.jobTitle && opt.jobTitle.toLowerCase().includes(cleanSupSearchQ)) ||
      (opt.empId && opt.empId.toLowerCase().includes(cleanSupSearchQ))
    );
  });

  const handleSelectSupervisor = (opt: SupervisorOption | null, directBypass = false) => {
    const nextSupId = directBypass ? '__NONE__' : opt ? opt.id : '';
    const nextSupName = directBypass ? '' : opt ? opt.fullName : '';
    const nextSupPos = opt?.jobTitle || 'หัวหน้างาน';

    setSupervisorId(nextSupId);
    setSupervisorName(nextSupName);
    setIsSupDropdownOpen(false);
    setSupSearchQuery('');

    // Sync updated supervisor name onto unsigned irregular bills & regenerate existing PDFs silently
    const updatedItems = requisitionItems.map((it) => {
      if (!it.isIrregularBill || it.approverSignatureUrl) return it;
      return {
        ...it,
        approverName: nextSupName,
        approverPosition: nextSupPos,
      };
    });
    setRequisitionItems(updatedItems);

    const groupKeys = Array.from(
      new Set(
        updatedItems
          .filter((it) => it.isIrregularBill && it.substituteCertificateUrl && !it.approverSignatureUrl)
          .map((it) => it.substituteGroupKey || getSubstituteGroupKey(it.supplierName, it.billDate))
          .filter(Boolean)
      )
    );
    if (groupKeys.length > 0) {
      Promise.all(
        groupKeys.map((gk) =>
          syncGroupSubstituteCertificate(gk, updatedItems, true, company, nextSupName, nextSupId)
        )
      ).catch((err) => console.warn('Failed to re-sync บก.111 certificates on supervisor change:', err));
    }
  };

  // Auto-load remembered digital signatures
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('crm_supervisor_signature');
      } catch {}

      if (!initialData?.requester_signature_url) {
        const uSig = requesterName ? localStorage.getItem(`crm_saved_signature_${requesterName}`) : null;
        if (uSig && !formRequesterSig) setFormRequesterSig(uSig);
      }
    }
  }, [requesterName, initialData]);

  // Supplier / Payee
  const [supplierName, setSupplierName] = useState(initialData?.supplier_name || '');
  const [supplierTaxId, setSupplierTaxId] = useState(initialData?.supplier_tax_id || '');
  const [payeePhone, setPayeePhone] = useState(initialData?.payee_phone || '');

  // Payment Destination & Bank / PromptPay Details (for AR / AP Team)
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'PROMPTPAY' | 'CASH_CHEQUE'>(() => {
    if (initialData?.payment_method) {
      return initialData.payment_method as any;
    }
    if (initialData?.bank_name?.includes('พร้อมเพย์')) return 'PROMPTPAY';
    if (initialData?.bank_name === 'เงินสด / เช็ค') return 'CASH_CHEQUE';
    return 'BANK_TRANSFER';
  });

  const initialBankResolved = useMemo(() => {
    if (!initialData?.bank_name) return { code: 'KBANK', name: 'ธนาคารกสิกรไทย (KBANK)', custom: '' };
    const bName = initialData.bank_name;
    const found = THAI_BANKS.find(
      (b) => b.name === bName || b.code === bName || bName.includes(b.shortName) || bName.includes(b.code)
    );
    if (found) return { code: found.code, name: found.name, custom: '' };
    return { code: 'OTHER', name: bName, custom: bName };
  }, [initialData?.bank_name]);

  const [selectedBankCode, setSelectedBankCode] = useState<string>(initialBankResolved.code);
  const [bankName, setBankName] = useState(initialBankResolved.name);
  const [customBankName, setCustomBankName] = useState(initialBankResolved.custom);
  const [bankAccountNo, setBankAccountNo] = useState(initialData?.bank_account_no || '');
  const [bankAccountName, setBankAccountName] = useState(initialData?.bank_account_name || '');
  const [hasCustomAccountName, setHasCustomAccountName] = useState(Boolean(initialData?.bank_account_name));

  // PromptPay specifics
  const [promptPayType, setPromptPayType] = useState<'PHONE' | 'CITIZEN_ID' | 'TAX_ID' | 'E_WALLET'>(() => {
    const bName = (initialData?.bank_name || '').toLowerCase();
    if (bName.includes('โทรศัพท์') || bName.includes('มือถือ')) return 'PHONE';
    if (bName.includes('บัตรประชาชน')) return 'CITIZEN_ID';
    if (bName.includes('นิติบุคคล') || bName.includes('ผู้เสียภาษี') || bName.includes('tax id')) return 'TAX_ID';
    if (bName.includes('e-wallet') || bName.includes('กระเป๋าเงิน')) return 'E_WALLET';
    return 'PHONE';
  });
  const [promptPayNumber, setPromptPayNumber] = useState(
    initialData?.payment_method === 'PROMPTPAY' || initialData?.bank_name?.includes('พร้อมเพย์')
      ? (initialData?.bank_account_no || '')
      : ''
  );
  const [promptPayAccountName, setPromptPayAccountName] = useState(
    initialData?.payment_method === 'PROMPTPAY' || initialData?.bank_name?.includes('พร้อมเพย์')
      ? (initialData?.bank_account_name || '')
      : ''
  );

  // Cash / Cheque specifics
  const [cashChequeNote, setCashChequeNote] = useState(
    initialData?.payment_method === 'CASH_CHEQUE' || initialData?.bank_name === 'เงินสด / เช็ค'
      ? (initialData?.bank_account_no || '')
      : ''
  );

  // Document details
  const [documentDate, setDocumentDate] = useState(
    initialData?.document_date ? formatDisplayDate(initialData.document_date) : getTodayStr()
  );
  const [hasNoDocNumber, setHasNoDocNumber] = useState(Boolean(initialData?.has_no_doc_number));
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || '');
  const [subtotalAmount, setSubtotalAmount] = useState<string>(
    initialData?.subtotal_amount ? String(initialData.subtotal_amount) : ''
  );
  const [vatType, setVatType] = useState<'NONE' | 'INCLUDED_7%' | '7%' | 'CUSTOM'>(
    (initialData?.vat_type as any) || 'NONE'
  );
  const [customVatAmount, setCustomVatAmount] = useState<string>(
    initialData?.vat_amount ? String(initialData.vat_amount) : ''
  );
  const [whtType, setWhtType] = useState<'NONE' | '1%' | '2%' | '3%' | '5%' | 'CUSTOM'>(
    (initialData?.wht_type as any) || 'NONE'
  );
  const [customWhtPercent, setCustomWhtPercent] = useState<string>(
    initialData?.wht_percent ? String(initialData.wht_percent) : ''
  );
  const [customWhtAmount, setCustomWhtAmount] = useState<string>(
    initialData?.wht_amount ? String(initialData.wht_amount) : ''
  );

  const [purpose, setPurpose] = useState(initialData?.purpose || '');
  const [costCenter, setCostCenter] = useState(initialData?.cost_center || '');
  const [poPrNumber, setPoPrNumber] = useState(initialData?.po_pr_number || '');
  const [requestedPaymentDate, setRequestedPaymentDate] = useState(
    initialData?.requested_payment_date ? formatDisplayDate(initialData.requested_payment_date) : ''
  );
  const [submissionChannel, setSubmissionChannel] = useState<'WEB' | 'LINE' | 'EMAIL' | 'PHYSICAL'>(
    (initialData?.submission_channel as any) || 'WEB'
  );

  // Attachments with QR & OCR metadata
  const [attachments, setAttachments] = useState<any[]>(
    Array.isArray(initialData?.attachments) ? initialData.attachments : []
  );
  const [resubmitExplanation, setResubmitExplanation] = useState('');

  // Return revision resolution helpers
  const returnLog = useMemo(() => {
    if (!initialData?.logs) return null;
    return initialData.logs.find(
      (l: any) =>
        l.to_status === 'RETURN_DOCUMENT' ||
        l.action === 'SUPERVISOR_RETURNED' ||
        (l.action === 'AP_CHECKED' && l.to_status === 'RETURN_DOCUMENT')
    );
  }, [initialData?.logs]);

  const returnReason = useMemo(() => {
    if (!initialData) return '';
    return (
      initialData.ap_notes ||
      initialData.supervisor_notes ||
      (returnLog?.notes && !returnLog.notes.startsWith('AP ดำเนินการ') ? returnLog.notes : '') ||
      initialData.cancelled_reason ||
      'เอกสารแนบหรือข้อมูลไม่ครบถ้วน กรุณาตรวจสอบเอกสารแนบ รายละเอียดใบเสร็จ หรือแก้ไขตามที่ได้รับแจ้ง'
    );
  }, [initialData, returnLog]);

  const returnedBy = useMemo(() => {
    if (!initialData) return '';
    return (
      returnLog?.performed_by ||
      initialData.ap_checked_by ||
      initialData.supervisor_checked_by ||
      'เจ้าหน้าที่ฝ่ายบัญชี (AP)'
    );
  }, [initialData, returnLog]);

  const returnedAt = useMemo(() => {
    if (!returnLog?.created_at) return '';
    return new Date(returnLog.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  }, [returnLog]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadScanStatus, setUploadScanStatus] = useState<string | null>(null);
  const [ocrAutoScanEnabled, setOcrAutoScanEnabled] = useState(true);

  // Sync OCR Auto-Scan toggle preference with localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pr_ocr_autoscan_enabled');
      if (saved !== null) {
        setOcrAutoScanEnabled(saved === 'true');
      }
    } catch {}
  }, []);

  // Duplicate Check Feedback State
  const [dupResult, setDupResult] = useState<{
    isExactDuplicate: boolean;
    isPossibleDuplicate: boolean;
    exactMatches: any[];
    possibleMatches: any[];
  } | null>(null);
  const [isCheckingDup, setIsCheckingDup] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate Items Sum and Credit Card Deduction for Multi-Item Requisitions
  const itemsTotal = useMemo(() => {
    return requisitionItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  }, [requisitionItems]);

  const effectiveCcDeduction = useMemo(() => {
    const manualVal = parseFloat(creditCardDeduction);
    if (!isNaN(manualVal) && manualVal >= 0 && creditCardDeduction.trim() !== '') {
      return manualVal;
    }
    return requisitionItems
      .filter((it) => it.paidByCreditCard)
      .reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  }, [creditCardDeduction, requisitionItems]);

  // Multi-Items Tax & Net Summary (Itemized VAT & WHT per row)
  const multiItemsSummary = useMemo(() => {
    let totalGrossAmount = 0;
    let totalVatAmount = 0;
    let totalWhtAmount = 0;
    let totalNetAmount = 0;
    let totalPreVatAmount = 0;
    let totalRawAmount = 0;

    requisitionItems.forEach((it) => {
      const taxes = calculateItemTaxes(it);
      totalRawAmount += Number(it.amount) || 0;
      totalGrossAmount += taxes.totalGross;
      totalVatAmount += taxes.vatAmount;
      totalWhtAmount += taxes.whtAmount;
      totalNetAmount += taxes.netAmount;
      totalPreVatAmount += taxes.preVatAmount;
    });

    const netPayable = Math.max(0, truncate2Decimals(totalNetAmount - effectiveCcDeduction));

    return {
      totalRawAmount: truncate2Decimals(totalRawAmount),
      totalGrossAmount: truncate2Decimals(totalGrossAmount),
      totalVatAmount: truncate2Decimals(totalVatAmount),
      totalWhtAmount: truncate2Decimals(totalWhtAmount),
      totalNetAmount: truncate2Decimals(totalNetAmount),
      totalPreVatAmount: truncate2Decimals(totalPreVatAmount),
      netPayable,
    };
  }, [requisitionItems, effectiveCcDeduction]);

  // Effective Subtotal: From table if in MULTI_ITEMS mode, otherwise from input field
  const effectiveSubtotal = entryMode === 'MULTI_ITEMS' ? multiItemsSummary.totalPreVatAmount : (parseFloat(subtotalAmount) || 0);

  let calculatedVat = 0;
  if (entryMode === 'MULTI_ITEMS') {
    calculatedVat = multiItemsSummary.totalVatAmount;
  } else if (vatType === '7%') {
    calculatedVat = truncate2Decimals(effectiveSubtotal * 0.07);
  } else if (vatType === 'INCLUDED_7%') {
    calculatedVat = truncate2Decimals((effectiveSubtotal * 7) / 107);
  } else if (vatType === 'CUSTOM') {
    calculatedVat = parseFloat(customVatAmount) || 0;
  }

  // Pre-VAT base amount: If VAT is included in bill, pre-VAT is (effectiveSubtotal - calculatedVat), otherwise it's effectiveSubtotal
  const preVatBase = entryMode === 'MULTI_ITEMS'
    ? multiItemsSummary.totalPreVatAmount
    : (vatType === 'INCLUDED_7%' ? Math.max(0, truncate2Decimals(effectiveSubtotal - calculatedVat)) : effectiveSubtotal);

  let calculatedWht = 0;
  let whtPercentValue = 0;
  if (entryMode === 'MULTI_ITEMS') {
    calculatedWht = multiItemsSummary.totalWhtAmount;
  } else if (whtType === '1%') {
    whtPercentValue = 1;
    calculatedWht = truncate2Decimals(preVatBase * 0.01);
  } else if (whtType === '2%') {
    whtPercentValue = 2;
    calculatedWht = truncate2Decimals(preVatBase * 0.02);
  } else if (whtType === '3%') {
    whtPercentValue = 3;
    calculatedWht = truncate2Decimals(preVatBase * 0.03);
  } else if (whtType === '5%') {
    whtPercentValue = 5;
    calculatedWht = truncate2Decimals(preVatBase * 0.05);
  } else if (whtType === 'CUSTOM') {
    whtPercentValue = parseFloat(customWhtPercent) || 0;
    calculatedWht = parseFloat(customWhtAmount) || truncate2Decimals((preVatBase * whtPercentValue) / 100);
  }

  const netPayable = entryMode === 'MULTI_ITEMS'
    ? multiItemsSummary.netPayable
    : Math.max(0, truncate2Decimals((vatType === 'INCLUDED_7%' ? effectiveSubtotal : effectiveSubtotal + calculatedVat) - calculatedWht));
  const bahtText = thaiBahtText(netPayable);

  // Approval matrix tier
  const approvalTier =
    netPayable <= 3000
      ? 'วงเงินไม่เกิน 3,000 บาท (เงินสดย่อย / หัวหน้างาน)'
      : netPayable <= 10000
      ? 'วงเงิน 3,001 - 10,000 บาท (หัวหน้าสาขา / แผนก)'
      : netPayable <= 30000
      ? 'วงเงิน 10,001 - 30,000 บาท (ผู้จัดการฝ่าย)'
      : 'วงเงินเกิน 30,000 บาท (ฝ่ายการเงินส่วนกลาง / ผู้บริหารระดับสูง)';

  // Real-time Debounced Duplicate Check
  useEffect(() => {
    const hasSupplier = supplierName.trim().length >= 2 || supplierTaxId.trim().length >= 10;
    const hasInvoice = !hasNoDocNumber && invoiceNumber.trim().length >= 2;
    const hasPoPr = poPrNumber.trim().length >= 3;
    const hasFileHashes = attachments.some((a) => a.fileHash);
    const hasMultiItems =
      entryMode === 'MULTI_ITEMS' &&
      requisitionItems.some(
        (it) =>
          (it.supplierName && it.supplierName.trim().length >= 2) ||
          (it.invoiceNumber && it.invoiceNumber.trim().length >= 2) ||
          (it.description && it.description.trim().length >= 2) ||
          Number(it.amount) > 0
      );

    if (!hasSupplier && !hasInvoice && !hasPoPr && !hasFileHashes && !hasMultiItems) {
      setDupResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDup(true);
      try {
        const finalBranch = branch === 'อื่นๆ (ระบุ)' ? customBranch : branch;
        const validItems =
          entryMode === 'MULTI_ITEMS'
            ? requisitionItems.filter((it) => it.description?.trim() || Number(it.amount) > 0)
            : undefined;

        const effectiveSupplier =
          supplierName.trim() ||
          (entryMode === 'MULTI_ITEMS' && requisitionItems[0]?.supplierName?.trim()
            ? requisitionItems[0].supplierName.trim()
            : '');

        const res = await checkDuplicates({
          company,
          supplierName: effectiveSupplier,
          supplierTaxId: supplierTaxId.trim() || undefined,
          invoiceNumber: entryMode === 'MULTI_ITEMS' || hasNoDocNumber ? null : invoiceNumber.trim(),
          poPrNumber: poPrNumber.trim() || undefined,
          hasNoDocNumber: entryMode === 'MULTI_ITEMS' ? true : hasNoDocNumber,
          netAmount: netPayable,
          documentDate,
          branch: finalBranch,
          attachments,
          fileHashes: attachments.map((a) => a.fileHash).filter(Boolean) as string[],
          items: validItems,
          excludeId: initialData?.id,
        });
        setDupResult(res);
      } catch (err) {
        console.error('Error checking duplicates:', err);
      } finally {
        setIsCheckingDup(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    company,
    supplierName,
    supplierTaxId,
    invoiceNumber,
    poPrNumber,
    hasNoDocNumber,
    netPayable,
    documentDate,
    branch,
    customBranch,
    attachments,
    entryMode,
    requisitionItems,
  ]);

  // Helper to compute SHA-256 hash using native Web Crypto API
  const computeFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper to compute 64-bit visual difference hash (dHash) using HTML5 Canvas (perceptually detects same receipt across devices)
  const computeVisualHash = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return null;
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 9;
            canvas.height = 8;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0, 9, 8);
            const imgData = ctx.getImageData(0, 0, 9, 8);
            const data = imgData.data;
            const gray: number[][] = [];
            for (let y = 0; y < 8; y++) {
              const row: number[] = [];
              for (let x = 0; x < 9; x++) {
                const idx = (y * 9 + x) * 4;
                const val = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                row.push(val);
              }
              gray.push(row);
            }
            let hashHex = '';
            for (let y = 0; y < 8; y++) {
              let byte = 0;
              for (let x = 0; x < 8; x++) {
                const bit = gray[y][x] > gray[y][x + 1] ? 1 : 0;
                byte = (byte << 1) | bit;
              }
              hashHex += byte.toString(16).padStart(2, '0');
            }
            resolve(hashHex);
          } catch (err) {
            console.warn('Canvas dHash failed:', err);
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch {
        resolve(null);
      }
    });
  };

  // File Upload Handler with Instant Multi-Signal QR & OCR Pre-Scan (Separate Cameras / Separate Shots Support)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Calculate Multi-Signal Fingerprints (SHA-256 + Full dHash + Core Center dHash)
        setUploadScanStatus(`กำลังตรวจจับ QR/สลิป และคำนวณลายนิ้วมือ (${file.name})...`);
        const fileHash = await computeFileHash(file);
        const visualHashes = await computeVisualHashes(file);
        const visualHash = visualHashes?.visualHash;
        const coreVisualHash = visualHashes?.coreVisualHash;

        // 2. Client-Side Instant QR/Barcode Slip Detection (<50ms)
        let qrPayload: string | undefined = undefined;
        let barcode: string | undefined = undefined;
        if (isImageAttachmentFile(file)) {
          try {
            const slipRes = await detectSlipQrAndBarcode(file);
            if (slipRes.detected) {
              qrPayload = slipRes.qrPayload;
              barcode = slipRes.barcode;
            }
          } catch (e) {
            console.debug('Client slip detection skipped:', e);
          }
        }

        // 3. OCR Auto-Scan (extract Tax ID, Invoice No, Net Amount, Date, Supplier, Stamp Phone, Tokens, Line Items)
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

        // Run OCR Auto-Scan to extract text, amounts, dates, supplier, and line items
        if (ocrAutoScanEnabled && isImageAttachmentFile(file)) {
          setUploadScanStatus(`กำลังสแกนอ่านข้อมูลเอกสารด้วย OCR Auto-Scan (${file.name})...`);
          const scanData = await scanImageWithOcrApi(file, { skipQr: true, timeoutMs: 30000 });
          if (scanData) {
            if (scanData.qrPayload && !qrPayload) qrPayload = scanData.qrPayload;
            if (scanData.barcode && !barcode) barcode = scanData.barcode;
            extractedTaxId = scanData.extractedTaxId;
            extractedInvoiceNo = scanData.extractedInvoiceNo;
            extractedAmount = scanData.extractedAmount;
            extractedDate = scanData.extractedDate;
            extractedSupplier = scanData.extractedSupplier;
            extractedPhone = scanData.extractedPhone;
            extractedDescription = scanData.extractedDescription;
            extractedLineItems = scanData.extractedLineItems;
            rawTextSnippet = scanData.rawTextSnippet;
            distinctiveTokens = scanData.distinctiveTokens;
          }
        }

        // Check if file is already in current form's attachments list (supports separate cameras/angles)
        const itemLevelAttachments = requisitionItems.flatMap((it) => it.attachments || []);
        const isAlreadyAttached = Boolean(
          findInFormDuplicateAttachment(
            {
              fileName: file.name,
              fileHash,
              visualHash: visualHash || undefined,
              coreVisualHash: coreVisualHash || undefined,
              fileSize: file.size,
              qrPayload,
              barcode,
              extractedTaxId,
              extractedInvoiceNo,
              extractedAmount,
              extractedSupplier,
              extractedPhone,
              distinctiveTokens,
              currentAmount: netPayable > 0 ? netPayable : (extractedAmount || undefined),
              currentSupplier: supplierName.trim() || extractedSupplier || undefined,
            },
            [...attachments, ...newItems, ...itemLevelAttachments]
          )
        );

        if (isAlreadyAttached) {
          await Swal.fire({
            title: 'ไฟล์นี้ถูกแนบอยู่แล้ว',
            text: `ไฟล์ "${file.name}" มีอยู่ในรายการเอกสารแนบแล้ว`,
            icon: 'info',
            confirmButtonColor: '#dc2626',
          });
          continue;
        }

        // 4. Pre-scan: Check if this file exists in any active payment request across ANY device / separate cameras
        setUploadScanStatus(`กำลังตรวจสอบประวัติการใช้เอกสารในระบบกลาง...`);
        const dupCheck = await checkAttachmentDuplicates({
          items: [
            {
              fileName: file.name,
              fileHash,
              visualHash: visualHash || undefined,
              coreVisualHash: coreVisualHash || undefined,
              fileSize: file.size,
              qrPayload,
              barcode,
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
              currentAmount: netPayable > 0 ? netPayable : (extractedAmount || undefined),
              currentSupplier: (supplierName.trim() || extractedSupplier || undefined),
            },
          ],
          fileHashes: [fileHash],
          excludeId: initialData?.id,
        });

        if (dupCheck.isDuplicate && dupCheck.matches.length > 0) {
          const match = dupCheck.matches[0];
          const explanationText = formatAttachmentDuplicateReason(match, {
            barcode,
            invoiceNo: extractedInvoiceNo,
          });

          await Swal.fire({
            title: 'ตรวจพบเอกสารซ้ำซ้อนในระบบ!',
            html: `
              <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
                <p class="font-bold text-red-900 text-sm">ไฟล์ "${escapeHtml(file.name)}" เคยถูกใช้งานแล้ว</p>
                <p class="text-gray-700">${escapeHtml(explanationText)}:</p>
                <div class="bg-white p-3 rounded-lg border border-red-100 font-mono text-[11px] space-y-1">
                  <p><span class="text-gray-500 font-sans">เลขที่คำขอ:</span> <b class="text-red-700 font-bold">${escapeHtml(match.pay_number)}</b></p>
                  <p><span class="text-gray-500 font-sans">ผู้ขาย:</span> <b>${escapeHtml(match.supplier_name)}</b></p>
                  ${match.invoice_number ? `<p><span class="text-gray-500 font-sans">เลขที่บิล:</span> <b>${escapeHtml(match.invoice_number)}</b></p>` : ''}
                  <p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b>${Number(match.net_amount).toLocaleString()} ฿</b></p>
                  <p><span class="text-gray-500 font-sans">เอกสารที่ตรวจพบ:</span> <b class="text-gray-800">${escapeHtml(match.matchedFileName || file.name)}</b></p>
                  <p><span class="text-gray-500 font-sans">ผู้ขอเบิกเดิม:</span> <b>${escapeHtml(match.requester_name || '-')}</b></p>
                  <p><span class="text-gray-500 font-sans">สถานะคำขอเดิม:</span> <span class="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded font-semibold">${escapeHtml(match.status)}</span></p>
                </div>
                <p class="text-red-700 font-medium text-[11px]">
                  * ระบบไม่อนุญาตให้อัปโหลดเอกสารซ้ำ กรุณาเปิดดูที่ใบขอจ่ายเดิมหรือตรวจสอบเอกสารใหม่อีกครั้ง
                </p>
              </div>
            `,
            icon: 'error',
            confirmButtonText: 'ปิดหน้าต่าง',
            confirmButtonColor: '#64748b',
          });

          // Do not upload this duplicate file!
          continue;
        }

        // 5. Upload file to Supabase if verification passed
        setUploadScanStatus(`กำลังอัปโหลดไฟล์ ${file.name}...`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'uploadsService');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
        if (res.ok && data.success && data.url) {
          newItems.push({
            url: data.url,
            fileName: file.name,
            fileType: file.type,
            fileHash,
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

          // Smart Auto-Fill prompt if invoice number / amount / tax ID / description / supplier detected
          if (extractedInvoiceNo || (extractedAmount && extractedAmount > 0) || extractedDescription || extractedSupplier) {
            const confirmFill = await Swal.fire({
              title: 'พบข้อมูลในเอกสาร (OCR Auto-Scan)',
              html: `
                <div class="text-left text-xs bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-2">
                  <p class="text-blue-900 font-bold text-sm">ระบบอ่านข้อมูลจากบิล/ใบเสร็จได้สำเร็จ:</p>
                  <div class="bg-white p-3 rounded-lg border border-blue-100 font-mono text-[11px] space-y-1">
                    ${extractedInvoiceNo ? `<p><span class="text-gray-500 font-sans">เลขที่บิล:</span> <b class="text-blue-700">${extractedInvoiceNo}</b></p>` : ''}
                    ${extractedTaxId ? `<p><span class="text-gray-500 font-sans">เลขผู้เสียภาษี:</span> <b>${extractedTaxId}</b></p>` : ''}
                    ${extractedAmount ? `<p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b class="text-emerald-700">${Number(extractedAmount).toLocaleString()} ฿</b></p>` : ''}
                    ${extractedSupplier ? `<p><span class="text-gray-500 font-sans">ผู้ขาย:</span> <b>${extractedSupplier}</b></p>` : ''}
                    ${extractedDate ? `<p><span class="text-gray-500 font-sans">วันที่บิล:</span> <b>${extractedDate}</b></p>` : ''}
                    ${extractedDescription ? `<p><span class="text-gray-500 font-sans">รายการสินค้า/บริการ:</span> <b class="text-indigo-700">${extractedDescription}</b></p>` : ''}
                    ${extractedLineItems && extractedLineItems.length > 1 ? `
                      <div class="pt-1.5 border-t border-dashed border-gray-200 text-left">
                        <p class="text-gray-600 font-sans text-[10px] font-semibold mb-1">รายการสินค้าที่ตรวจพบ (${extractedLineItems.length} รายการ):</p>
                        <ul class="list-disc list-inside text-[10px] text-gray-700 space-y-0.5">
                          ${extractedLineItems.map((li) => `<li>${li.description} ${li.amount ? `(${Number(li.amount).toLocaleString()} ฿)` : ''}</li>`).join('')}
                        </ul>
                      </div>
                    ` : ''}
                  </div>
                  <p class="text-blue-800 text-[11px]">ต้องการให้นำข้อมูลเหล่านี้กรอกลงในฟอร์มคำขอเบิกจ่ายอัตโนมัติหรือไม่?</p>
                </div>
              `,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'กรอกข้อมูลลงฟอร์มอัตโนมัติ',
              confirmButtonColor: '#2563eb',
              cancelButtonText: 'ไม่กรอก (กรอกเอง)',
            });

            if (confirmFill.isConfirmed) {
              if (extractedInvoiceNo && !invoiceNumber) {
                setInvoiceNumber(extractedInvoiceNo);
              }
              if (extractedTaxId && !supplierTaxId) {
                setSupplierTaxId(extractedTaxId);
              }
              if (extractedSupplier && !supplierName) {
                setSupplierName(extractedSupplier);
              }
              if (extractedDate && (!documentDate || documentDate === getTodayStr())) {
                const isoDate = formatDateToISO(extractedDate) || extractedDate;
                setDocumentDate(isoDate);
              }
              if (extractedAmount && extractedAmount > 0) {
                if (!subtotalAmount || Number(subtotalAmount) === 0) {
                  setSubtotalAmount(String(extractedAmount));
                }
              }
              if (extractedDescription && !purpose) {
                setPurpose(extractedDescription);
              }

              // Auto-fill into Requisition Items Table
              const effectiveDate = (extractedDate ? formatDateToISO(extractedDate) : null) || extractedDate || documentDate || getTodayStr();
              if (extractedLineItems && extractedLineItems.length > 0) {
                const newRows: RequisitionItem[] = extractedLineItems.map((li) =>
                  buildDefaultRequisitionItem({
                    billDate: effectiveDate,
                    supplierName: extractedSupplier || supplierName || '',
                    supplierTaxId: extractedTaxId || supplierTaxId || '',
                    invoiceNumber: extractedInvoiceNo || invoiceNumber || '',
                    description: li.description,
                    amount: li.amount || (extractedLineItems!.length === 1 && extractedAmount ? extractedAmount : 0),
                  })
                );

                setRequisitionItems((prev) => {
                  const isFirstEmpty = prev.length === 1 && !prev[0].description && (!prev[0].amount || prev[0].amount === 0);
                  if (isFirstEmpty) return newRows;
                  return [...prev, ...newRows];
                });
              } else if (extractedDescription || (extractedAmount && extractedAmount > 0) || extractedSupplier) {
                const cleanDesc = extractedDescription && !/(?:ต้นฉบับ|สำเนา|ด้นฉบับ)?\s*(?:ใบกำกับภาษี|ใบเสร็จรับเงิน|ใบเสร็จ|ใบส่งของ|ใบแจ้งหนี้|บิลเงินสด|TAX\s*INVOICE|RECEIPT)/i.test(extractedDescription)
                  ? extractedDescription
                  : (extractedDescription || '');

                setRequisitionItems((prev) => {
                  const first = prev[0];
                  const isFirstEmpty = prev.length === 1 && !first.description && (!first.amount || first.amount === 0);
                  const rowData = buildDefaultRequisitionItem({
                    id: isFirstEmpty ? (first.id || `item_${Date.now()}`) : undefined,
                    billDate: effectiveDate,
                    supplierName: extractedSupplier || first?.supplierName || supplierName || '',
                    supplierTaxId: extractedTaxId || first?.supplierTaxId || supplierTaxId || '',
                    invoiceNumber: extractedInvoiceNo || first?.invoiceNumber || invoiceNumber || '',
                    description: cleanDesc || first?.description || '',
                    amount: extractedAmount || first?.amount || 0,
                  });
                  if (isFirstEmpty) {
                    return [rowData];
                  }
                  return [...prev, rowData];
                });
              }
            }
          }
        } else {
          Swal.fire({
            title: 'อัปโหลดไม่สำเร็จ',
            text: data.error || 'เกิดข้อผิดพลาดในการบันทึกไฟล์',
            icon: 'error',
            confirmButtonColor: '#dc2626',
          });
        }
      }

      if (newItems.length > 0) {
        setAttachments((prev) => [...prev, ...newItems]);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      Swal.fire({
        title: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        text: err?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์อัปโหลดได้',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsUploading(false);
      setUploadScanStatus(null);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Line-Item Attachment Upload Handler with Complete Multi-Signal Duplicate Detection
  const handleItemAttachmentUpload = async (itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const targetItem = requisitionItems[itemIndex];
    if (!targetItem) return;

    setItemUploadingIdx(itemIndex);
    try {
      const newAtts: ItemAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Calculate digital fingerprints (SHA-256 + Visual Hashes)
        setUploadScanStatus(`กำลังตรวจจับ QR/สลิป และคำนวณลายนิ้วมือ (${file.name})...`);
        const fileHash = await computeFileHash(file);
        const visualHashes = await computeVisualHashes(file);
        const visualHash = visualHashes?.visualHash;
        const coreVisualHash = visualHashes?.coreVisualHash;

        // 2. Client-side QR / Barcode detection for slips
        let qrPayload: string | undefined = undefined;
        let barcode: string | undefined = undefined;
        if (isImageAttachmentFile(file)) {
          try {
            const slipRes = await detectSlipQrAndBarcode(file);
            if (slipRes.detected) {
              qrPayload = slipRes.qrPayload;
              barcode = slipRes.barcode;
            }
          } catch (err) {
            console.debug('Slip detection skipped for item file:', err);
          }
        }

        // 3. OCR Auto-Scan (extract Tax ID, Invoice No, Net Amount, Date, Supplier, Stamp Phone, Tokens, Line Items)
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

        if (ocrAutoScanEnabled && isImageAttachmentFile(file)) {
          setUploadScanStatus(`กำลังสแกนอ่านข้อมูลเอกสารด้วย OCR Auto-Scan (${file.name})...`);
          const scanData = await scanImageWithOcrApi(file, { skipQr: true, timeoutMs: 30000 });
          if (scanData) {
            if (scanData.qrPayload && !qrPayload) qrPayload = scanData.qrPayload;
            if (scanData.barcode && !barcode) barcode = scanData.barcode;
            extractedTaxId = scanData.extractedTaxId;
            extractedInvoiceNo = scanData.extractedInvoiceNo;
            extractedAmount = scanData.extractedAmount;
            extractedDate = scanData.extractedDate;
            extractedSupplier = scanData.extractedSupplier;
            extractedPhone = scanData.extractedPhone;
            extractedDescription = scanData.extractedDescription;
            extractedLineItems = scanData.extractedLineItems;
            rawTextSnippet = scanData.rawTextSnippet;
            distinctiveTokens = scanData.distinctiveTokens;
          }
        }

        // 4. Duplicate check against current form files (both main attachments and all line items across cameras)
        const allCurrentFormAtts = [
          ...attachments,
          ...requisitionItems.flatMap((it) => it.attachments || []),
          ...newAtts,
        ];
        const isAlreadyAttached = Boolean(
          findInFormDuplicateAttachment(
            {
              fileName: file.name,
              fileHash,
              visualHash: visualHash || undefined,
              coreVisualHash: coreVisualHash || undefined,
              fileSize: file.size,
              qrPayload,
              barcode,
              extractedTaxId,
              extractedInvoiceNo,
              extractedAmount,
              extractedSupplier,
              extractedPhone,
              distinctiveTokens,
              currentAmount: Number(targetItem.amount) || (extractedAmount || undefined),
              currentSupplier: targetItem.supplierName?.trim() || supplierName.trim() || extractedSupplier || undefined,
            },
            allCurrentFormAtts
          )
        );

        if (isAlreadyAttached) {
          await Swal.fire({
            title: 'ไฟล์นี้ถูกแนบอยู่แล้วในแบบฟอร์มนี้',
            text: `ไฟล์ "${file.name}" มีอยู่ในรายการเอกสารแนบของแบบฟอร์มนี้แล้ว (อาจแนบในรายการนี้หรือรายการอื่น)`,
            icon: 'info',
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'ตกลง',
          });
          continue;
        }

        // 5. Check duplicate against database active payment requests
        setUploadScanStatus(`กำลังตรวจสอบประวัติการใช้เอกสารในระบบกลาง...`);
        const dupCheck = await checkAttachmentDuplicates({
          items: [
            {
              fileName: file.name,
              fileHash,
              visualHash: visualHash || undefined,
              coreVisualHash: coreVisualHash || undefined,
              fileSize: file.size,
              qrPayload,
              barcode,
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
              currentAmount: Number(targetItem.amount) || (extractedAmount || undefined),
              currentSupplier: (targetItem.supplierName?.trim() || supplierName.trim() || extractedSupplier || undefined),
            },
          ],
          fileHashes: [fileHash],
          excludeId: initialData?.id,
        });

        if (dupCheck.isDuplicate && dupCheck.matches.length > 0) {
          const match = dupCheck.matches[0];
          const explanationText = formatAttachmentDuplicateReason(match, {
            barcode,
            invoiceNo: extractedInvoiceNo,
          });

          await Swal.fire({
            title: 'ตรวจพบเอกสารแนบซ้ำซ้อนในระบบ!',
            html: `
              <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
                <p class="font-bold text-red-900 text-sm">ไฟล์ "${escapeHtml(file.name)}" เคยถูกใช้งานในระบบแล้ว</p>
                <p class="text-gray-700">${escapeHtml(explanationText)}:</p>
                <div class="bg-white p-3 rounded-lg border border-red-100 font-mono text-[11px] space-y-1">
                  <p><span class="text-gray-500 font-sans">เลขที่คำขอเดิม:</span> <b class="text-red-700 font-bold">${escapeHtml(match.pay_number)}</b></p>
                  <p><span class="text-gray-500 font-sans">ผู้ขาย:</span> <b>${escapeHtml(match.supplier_name || '-')}</b></p>
                  <p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b>${Number(match.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</b></p>
                  <p><span class="text-gray-500 font-sans">สถานะปัจจุบัน:</span> <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-bold">${escapeHtml(match.status)}</span></p>
                  <p><span class="text-gray-500 font-sans">ผู้เบิกเดิม:</span> <b>${escapeHtml(match.requester_name || '-')}</b></p>
                  ${match.matchedFileName ? `<p><span class="text-gray-500 font-sans">ชื่อไฟล์เดิม:</span> <b class="text-slate-800">${escapeHtml(match.matchedFileName)}</b></p>` : ''}
                </div>
                <p class="text-red-600 font-medium flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>ระบบไม่อนุญาตให้ใช้เอกสารซ้ำซ้อนเพื่อป้องกันการเบิกจ่ายซ้ำ</span></p>
              </div>
            `,
            icon: 'error',
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'รับทราบและเปลี่ยนไฟล์',
          });
          continue; // Skip uploading this duplicate file
        }

        // 6. Upload via API
        setUploadScanStatus(`กำลังอัปโหลดไฟล์ ${file.name}...`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'uploadsService');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
        if (res.ok && data.success && data.url) {
          newAtts.push({
            id: `item_att_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            url: data.url,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileHash,
            visualHash: visualHash || data.visualHash || undefined,
            coreVisualHash: coreVisualHash || data.coreVisualHash || undefined,
            qrPayload: qrPayload || data.qrPayload || undefined,
            barcode: barcode || undefined,
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
        } else {
          await Swal.fire({
            title: 'อัปโหลดไฟล์ไม่สำเร็จ',
            text: data.error || `ไม่สามารถบันทึกไฟล์ "${file.name}" ได้`,
            icon: 'error',
            confirmButtonColor: '#dc2626',
          });
        }
      }

      if (newAtts.length > 0) {
        const firstOcr = newAtts.find(
          (a) => a.extractedSupplier || a.extractedTaxId || a.extractedInvoiceNo || a.extractedAmount || a.extractedDescription
        );
        setRequisitionItems((prev) => {
          return prev.map((it, idx) => {
            if (idx !== itemIndex) return it;
            const currentAtts = Array.isArray(it.attachments) ? it.attachments : [];
            const nextItem: RequisitionItem = {
              ...it,
              billDate: !it.billDate && firstOcr?.extractedDate ? firstOcr.extractedDate : it.billDate,
              supplierName: !it.supplierName?.trim() && firstOcr?.extractedSupplier ? firstOcr.extractedSupplier : it.supplierName,
              supplierTaxId: !it.supplierTaxId?.trim() && firstOcr?.extractedTaxId ? firstOcr.extractedTaxId : it.supplierTaxId,
              invoiceNumber: !it.invoiceNumber?.trim() && firstOcr?.extractedInvoiceNo ? firstOcr.extractedInvoiceNo : it.invoiceNumber,
              description: !it.description?.trim() && firstOcr?.extractedDescription ? firstOcr.extractedDescription : it.description,
              amount: !(Number(it.amount) > 0) && firstOcr?.extractedAmount ? firstOcr.extractedAmount : it.amount,
              attachments: [...currentAtts, ...newAtts],
            };
            if (!(Number(it.amount) > 0) && firstOcr?.extractedAmount) {
              const taxes = calculateItemTaxes(nextItem);
              nextItem.vatAmount = taxes.vatAmount;
              nextItem.whtPercent = taxes.whtPercent;
              nextItem.whtAmount = taxes.whtAmount;
              nextItem.netAmount = taxes.netAmount;
            }
            return nextItem;
          });
        });
      }
    } catch (err) {
      console.error('Error uploading item attachment:', err);
      Swal.fire({ title: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', icon: 'error' });
    } finally {
      setItemUploadingIdx(null);
      setUploadScanStatus(null);
      e.target.value = '';
    }
  };

  const handleOcrAutoScanToggle = (enabled: boolean) => {
    setOcrAutoScanEnabled(enabled);
    try {
      localStorage.setItem('pr_ocr_autoscan_enabled', String(enabled));
    } catch {}
  };

  const openOcrRawTextModal = (rawTextSnippet?: string) => {
    if (!rawTextSnippet) return;
    Swal.fire({
      title: 'ข้อความที่ OCR สแกนได้จากเอกสาร',
      html: `
        <div class="text-left text-xs space-y-2">
          <div class="bg-gray-100 p-2.5 rounded-lg border font-mono text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap text-gray-800">
            ${escapeHtml(rawTextSnippet)}
          </div>
          <p class="text-gray-500 text-[11px]">* ระบบใช้ข้อความนี้ในการตรวจจับความซ้ำซ้อนและการกรอกข้อมูลอัตโนมัติ</p>
        </div>
      `,
      confirmButtonText: 'ปิดหน้าต่าง',
      confirmButtonColor: '#4b5563',
    });
  };

  const renderOcrAutoScanControls = () => (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          <QrCode className="w-3.5 h-3.5 text-purple-600" /> ตรวจจับ QR/สลิป โอนเงินอัตโนมัติ (ข้ามกล้อง/ข้ามมุม 100%)
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ตรวจจับเอกสารซ้ำอัตโนมัติทุกไฟล์
        </span>
      </div>
      <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs hover:bg-gray-50 transition">
        <input
          type="checkbox"
          checked={ocrAutoScanEnabled}
          onChange={(e) => handleOcrAutoScanToggle(e.target.checked)}
          className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
        />
        <span className="flex items-center gap-1 text-[11px] text-gray-700 font-medium">
          <Scan className="w-3 h-3 text-blue-600" /> เปิดระบบ OCR Auto-Scan (อ่านบิลและตรวจจับข้ามกล้อง)
        </span>
      </label>
    </div>
  );

  const renderItemAttachmentBadges = (att: ItemAttachment) => {
    if (!att.fileHash && !att.visualHash && !att.qrPayload && !att.extractedInvoiceNo && !att.rawTextSnippet) {
      return null;
    }
    return (
      <div className="flex flex-wrap items-center gap-1 mt-0.5 pl-4">
        {(att.fileHash || att.visualHash) && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> ไม่ซ้ำ
          </span>
        )}
        {att.qrPayload && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200" title={att.qrPayload}>
            <QrCode className="w-2.5 h-2.5 text-purple-600" /> QR
          </span>
        )}
        {att.extractedInvoiceNo && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-700 bg-white px-1 py-0.2 rounded border border-blue-200 truncate max-w-[100px]" title={`เลขบิลจาก OCR: ${att.extractedInvoiceNo}`}>
            <Scan className="w-2.5 h-2.5 text-blue-600 shrink-0" /> {att.extractedInvoiceNo}
          </span>
        )}
        {att.rawTextSnippet && (
          <button
            type="button"
            onClick={() => openOcrRawTextModal(att.rawTextSnippet)}
            className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-gray-600 bg-white hover:bg-gray-100 px-1 py-0.2 rounded border border-gray-300 transition cursor-pointer"
            title="ดูข้อความ OCR ที่สแกนได้"
          >
            <Eye className="w-2.5 h-2.5 text-gray-500" /> OCR
          </button>
        )}
      </div>
    );
  };

  // Shared Form Validation before Opening Review Modal or Submitting
  const validateBeforeSubmit = async (): Promise<boolean> => {
    if (!requesterName.trim()) {
      setShowRequesterEditor(true);
      setFormStep(1);
      await Swal.fire({ title: 'กรุณาระบุชื่อผู้ขอเบิก', icon: 'warning', confirmButtonColor: '#dc2626' });
      return false;
    }

    if (!isCurrentUserManagerial && !supervisorName.trim()) {
      setFormStep(1);
      await Swal.fire({
        title: 'กรุณาเลือกหัวหน้างานผู้อนุมัติ',
        text: 'กรุณาเลือกหัวหน้างาน/ผู้จัดการที่จะอนุมัติคำขอเบิกจ่ายในขั้นตอนที่ 1 ก่อนส่งคำขอ',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return false;
    }

    const resolvedBranch = branch === 'อื่นๆ (ระบุ)' ? customBranch.trim() : branch.trim();
    if (!resolvedBranch) {
      setFormStep(1);
      await Swal.fire({ title: 'กรุณาระบุสาขา/หน้างาน', icon: 'warning', confirmButtonColor: '#dc2626' });
      return false;
    }

    if (!documentDate.trim()) {
      setFormStep(3);
      await Swal.fire({ title: 'กรุณาระบุวันที่เอกสาร/วันที่จ่ายจริง', icon: 'warning', confirmButtonColor: '#dc2626' });
      return false;
    }

    if (requisitionItems.some((it) => Number(it.amount) < 0)) {
      setFormStep(2);
      await Swal.fire({
        title: 'จำนวนเงินไม่ถูกต้อง',
        text: 'จำนวนเงินในรายการเบิกจ่ายต้องไม่ติดลบ',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return false;
    }

    const parsedManualCc = creditCardDeduction.trim() === '' ? 0 : parseFloat(creditCardDeduction);
    if (isNaN(parsedManualCc) || parsedManualCc < 0) {
      setFormStep(2);
      await Swal.fire({
        title: 'ยอดหักบัตรเครดิตไม่ถูกต้อง',
        text: 'ยอดหักค่าบัตรเครดิตต้องไม่ติดลบ',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return false;
    }

    const validItems = requisitionItems.filter((it) => it.description.trim() || Number(it.amount) > 0);
    if (validItems.length === 0) {
      setFormStep(2);
      await Swal.fire({
        title: 'กรุณาระบุรายการเบิกเงิน',
        text: 'ต้องมีอย่างน้อย 1 รายการพร้อมระบุชื่อรายการและจำนวนเงิน',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return false;
    }

    const invalidRow = validItems.find((it) => !it.description.trim() || Number(it.amount) <= 0);
    if (invalidRow) {
      setFormStep(2);
      await Swal.fire({
        title: 'ข้อมูลรายการไม่ครบถ้วน',
        text: 'กรุณาระบุชื่อรายการสินค้า/บริการ และจำนวนเงินที่มากกว่า 0 ให้ถูกต้องทุกแถว',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return false;
    }

    if (effectiveSubtotal <= 0) {
      setFormStep(2);
      await Swal.fire({ title: 'กรุณาระบุยอดเงินที่ถูกต้อง', icon: 'warning', confirmButtonColor: '#dc2626' });
      return false;
    }
    if (!purpose.trim()) {
      setFormStep(3);
      await Swal.fire({ title: 'กรุณาระบุรายละเอียดวัตถุประสงค์การจ่ายเงิน (ชื่องาน)', icon: 'warning', confirmButtonColor: '#dc2626' });
      return false;
    }

    if (urgency === 'EMERGENCY' && !requestedPaymentDate.trim()) {
      setFormStep(1);
      await Swal.fire({
        title: 'กรุณาระบุวันที่ต้องการให้จ่ายเงิน',
        text: 'สำหรับรายการที่เลือก "ด่วนที่สุด" จำเป็นต้องระบุวันที่ต้องการให้การเงินโอนจ่ายเงิน',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return false;
    }

    if (paymentMethod === 'BANK_TRANSFER' && selectedBankCode === 'OTHER' && !customBankName.trim()) {
      setFormStep(1);
      await Swal.fire({ title: 'กรุณาระบุชื่อธนาคาร', icon: 'warning', confirmButtonColor: '#dc2626' });
      return false;
    }

    // Exact Duplicate Hard Block (Zero Manual Verification Required)
    if (dupResult?.isExactDuplicate && dupResult.exactMatches && dupResult.exactMatches.length > 0) {
      const match = dupResult.exactMatches[0];
      const matchLabel =
        match.matchType === 'ITEM_DUPLICATE'
          ? `รายการที่ ${match.matchedItemIndex || 1} "${match.matchedItemDesc || ''}" ของ ${match.matchedItemSupplier || ''} ยอดเงิน ${Number(match.matchedItemAmount || 0).toLocaleString()} ฿ ตรงกับใบขอจ่าย ${match.pay_number}`
          : match.matchType === 'ATTACHMENT_HASH'
          ? 'ไฟล์แนบตรงกับเอกสารเดิมในระบบ'
          : match.matchType === 'PO_PR_NUMBER'
          ? `เลขที่ PO/PR ${match.po_pr_number || ''} เคยถูกบันทึกแล้ว`
          : `เลขที่บิล ${match.invoice_number || invoiceNumber} ของ ${match.supplier_name} เคยถูกบันทึกแล้ว`;

      await Swal.fire({
        title: 'ไม่อนุญาตให้สร้างรายการซ้ำซ้อน',
        html: `
          <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
            <p class="font-bold text-red-900 text-sm">ตรวจพบข้อมูลในระบบแล้ว (${escapeHtml(match.pay_number)})</p>
            <p class="text-gray-700">ระบบตรวจสอบพบว่า: <b>${escapeHtml(matchLabel)}</b></p>
            <div class="bg-white p-3 rounded-lg border border-red-100 font-mono text-[11px] space-y-1">
              <p><span class="text-gray-500 font-sans">เลขที่คำขอ:</span> <b class="text-red-700 font-bold">${escapeHtml(match.pay_number)}</b></p>
              <p><span class="text-gray-500 font-sans">ผู้ขาย/ผู้เบิก:</span> <b>${escapeHtml(match.supplier_name)}</b></p>
              ${match.invoice_number ? `<p><span class="text-gray-500 font-sans">เลขที่บิล:</span> <b>${escapeHtml(match.invoice_number)}</b></p>` : ''}
              <p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b>${Number(match.net_amount).toLocaleString()} ฿</b></p>
              <p><span class="text-gray-500 font-sans">สถานะ:</span> <b>${escapeHtml(match.status)}</b></p>
            </div>
            <p class="text-red-700 font-medium text-[11px] pt-1">
              * ระบบไม่อนุญาตให้ส่งคำขอซ้ำ เพื่อป้องกันการจ่ายเงินซ้ำซ้อนและลดขั้นตอนการตรวจสอบด้วยมือ กรุณาใช้ใบขอจ่ายเดิม
            </p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'ปิดหน้าต่าง',
        confirmButtonColor: '#64748b',
      });
      return false;
    }

    return true;
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent, shouldResubmit = true) => {
    e.preventDefault();

    if (!showAllSections && formStep < 4) {
      goToFormStep((formStep + 1) as 1 | 2 | 3 | 4);
      return;
    }

    const isValid = await validateBeforeSubmit();
    if (!isValid) return;

    // If save only (not resubmitting for approval), proceed directly
    if (isEditMode && !shouldResubmit) {
      await executeActualSubmit(false);
      return;
    }

    // For submitting for approval, open review modal to allow user to review attached documents
    setPendingShouldResubmit(shouldResubmit);
    setShowPreSubmitReviewModal(true);
  };

  // Actually execute payment request create or update
  const executeActualSubmit = async (shouldResubmit = true) => {
    const isValid = await validateBeforeSubmit();
    if (!isValid) return;

    setIsSubmitting(true);
    setShowPreSubmitReviewModal(false);

    try {
      const validItems = requisitionItems.filter((it) => it.description.trim() || Number(it.amount) > 0);
      let finalSupplierName = supplierName.trim();
      if (!finalSupplierName) {
        const uniqueSuppliers = Array.from(new Set(validItems.map((it) => it.supplierName?.trim()).filter(Boolean)));
        if (uniqueSuppliers.length === 1) {
          finalSupplierName = uniqueSuppliers[0] as string;
        } else if (uniqueSuppliers.length > 1) {
          finalSupplierName = `${uniqueSuppliers[0]} และอื่นๆ (รวม ${uniqueSuppliers.length} ร้านค้า)`;
        } else {
          finalSupplierName = `${requesterName.trim()} (สำรองจ่าย / Reimbursement)`;
        }
      }

      const finalBranch = branch === 'อื่นๆ (ระบุ)' ? (customBranch || 'สำนักงานใหญ่') : branch;

      let finalBankName = bankName;
      let finalAccountNo = bankAccountNo;
      let finalAccountName = bankAccountName;

      if (paymentMethod === 'BANK_TRANSFER') {
        const found = THAI_BANKS.find((b) => b.code === selectedBankCode);
        finalBankName = selectedBankCode === 'OTHER' ? (customBankName.trim() || 'ธนาคารอื่นๆ') : (found ? found.name : selectedBankCode);
        finalAccountNo = bankAccountNo.trim();
        finalAccountName = bankAccountName.trim() || finalSupplierName;
      } else if (paymentMethod === 'PROMPTPAY') {
        const pt = PROMPTPAY_TYPES.find((t) => t.id === promptPayType);
        finalBankName = `พร้อมเพย์ (${pt?.label || 'PromptPay'})`;
        finalAccountNo = promptPayNumber.trim();
        finalAccountName = promptPayAccountName.trim() || finalSupplierName;
      } else if (paymentMethod === 'CASH_CHEQUE') {
        finalBankName = 'เงินสด / เช็ค';
        finalAccountNo = cashChequeNote.trim() || 'ชำระเงินสดหรือเช็ค';
        finalAccountName = finalSupplierName;
      }

      if (isEditMode && initialData?.id) {
        const res = await updateFullPaymentRequest(initialData.id, {
          company,
          branch: finalBranch,
          classification,
          urgency,
          supplier_name: finalSupplierName,
          supplier_tax_id: supplierTaxId.trim() || undefined,
          payment_method: paymentMethod,
          bank_name: finalBankName.trim() || undefined,
          bank_account_no: finalAccountNo.trim() || undefined,
          bank_account_name: finalAccountName.trim() || undefined,
          payee_phone: payeePhone.trim() || undefined,
          document_date: documentDate,
          has_no_doc_number: entryMode === 'MULTI_ITEMS' ? true : hasNoDocNumber,
          invoice_number: entryMode === 'MULTI_ITEMS' ? undefined : (hasNoDocNumber ? undefined : invoiceNumber.trim()),
          subtotal_amount: entryMode === 'MULTI_ITEMS' ? multiItemsSummary.totalPreVatAmount : (vatType === 'INCLUDED_7%' ? preVatBase : effectiveSubtotal),
          vat_type: entryMode === 'MULTI_ITEMS' ? (multiItemsSummary.totalVatAmount > 0 ? 'ITEMIZED' : 'NONE') : vatType,
          vat_amount: calculatedVat,
          wht_type: entryMode === 'MULTI_ITEMS' ? (multiItemsSummary.totalWhtAmount > 0 ? 'ITEMIZED' : 'NONE') : whtType,
          wht_percent: entryMode === 'MULTI_ITEMS' ? 0 : whtPercentValue,
          wht_amount: calculatedWht,
          net_amount: netPayable,
          purpose: purpose.trim(),
          cost_center: costCenter.trim() || undefined,
          po_pr_number: poPrNumber.trim() || undefined,
          requested_payment_date: requestedPaymentDate || undefined,
          submission_channel: submissionChannel,
          attachments,
          items: entryMode === 'MULTI_ITEMS'
            ? validItems.map((it) => {
                const taxes = calculateItemTaxes(it);
                return {
                  ...it,
                  vatType: it.vatType || 'NO_VAT',
                  vatAmount: taxes.vatAmount,
                  whtType: it.whtType || 'NONE',
                  whtPercent: taxes.whtPercent,
                  whtAmount: taxes.whtAmount,
                  netAmount: taxes.netAmount,
                  attachments: Array.isArray(it.attachments) ? it.attachments : [],
                };
              })
            : undefined,
          credit_card_deduction: entryMode === 'MULTI_ITEMS' ? effectiveCcDeduction : undefined,
          requester_signature_url: formRequesterSig || undefined,
          supervisor_signature_url: formSupervisorSig || undefined,
          assigned_supervisor_id: supervisorId || undefined,
          assigned_supervisor_name: supervisorId === '__NONE__' ? '' : (supervisorName.trim() || undefined),
          resubmit: shouldResubmit,
          resubmitNote: resubmitExplanation.trim() || undefined,
        });

        if (res.success) {
          await Swal.fire({
            title: shouldResubmit ? 'บันทึกและส่งตรวจอีกครั้งสำเร็จ!' : 'บันทึกการแก้ไขเรียบร้อยแล้ว!',
            html: `<div class="text-left text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p>เลขที่คำขอ: <b class="font-mono text-red-600 text-sm">${res.payNumber || initialData.pay_number}</b></p>
              <p>สถานะ: <b>${res.status}</b></p>
              <p class="text-emerald-700 mt-1 font-medium">${shouldResubmit ? 'ระบบส่งข้อมูลที่แก้ไขกลับไปเพื่อดำเนินการตามขั้นตอนเรียบร้อยแล้ว' : 'บันทึกข้อมูลการแก้ไขเรียบร้อยแล้ว'}</p>
            </div>`,
            icon: 'success',
            confirmButtonColor: '#16a34a',
          });
          router.push(`/accounting/payment-requests/${initialData.id}`);
        } else {
          Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: res.error || 'ไม่สามารถบันทึกข้อมูลได้',
            icon: 'error',
            confirmButtonColor: '#dc2626',
          });
        }
        return;
      }

      const res = await createPaymentRequest({
        company,
        branch: finalBranch,
        classification,
        urgency,
        requester_id: currentUser?.id,
        requester_name: requesterName.trim(),
        requester_department: requesterDept.trim() || undefined,
        requester_phone: requesterPhone.trim() || undefined,
        assigned_supervisor_id: supervisorId || undefined,
        assigned_supervisor_name: supervisorId === '__NONE__' ? '' : (supervisorName.trim() || undefined),
        supplier_name: finalSupplierName,
        supplier_tax_id: supplierTaxId.trim() || undefined,
        payment_method: paymentMethod,
        bank_name: finalBankName.trim() || undefined,
        bank_account_no: finalAccountNo.trim() || undefined,
        bank_account_name: finalAccountName.trim() || undefined,
        payee_phone: payeePhone.trim() || undefined,
        document_date: documentDate,
        has_no_doc_number: entryMode === 'MULTI_ITEMS' ? true : hasNoDocNumber,
        invoice_number: entryMode === 'MULTI_ITEMS' ? undefined : (hasNoDocNumber ? undefined : invoiceNumber.trim()),
        subtotal_amount: entryMode === 'MULTI_ITEMS' ? multiItemsSummary.totalPreVatAmount : (vatType === 'INCLUDED_7%' ? preVatBase : effectiveSubtotal),
        vat_type: entryMode === 'MULTI_ITEMS' ? (multiItemsSummary.totalVatAmount > 0 ? 'ITEMIZED' : 'NONE') : vatType,
        vat_amount: calculatedVat,
        wht_type: entryMode === 'MULTI_ITEMS' ? (multiItemsSummary.totalWhtAmount > 0 ? 'ITEMIZED' : 'NONE') : whtType,
        wht_percent: entryMode === 'MULTI_ITEMS' ? 0 : whtPercentValue,
        wht_amount: calculatedWht,
        net_amount: netPayable,
        purpose: purpose.trim(),
        cost_center: costCenter.trim() || undefined,
        po_pr_number: poPrNumber.trim() || undefined,
        requested_payment_date: requestedPaymentDate || undefined,
        submission_channel: submissionChannel,
        attachments,
        items: entryMode === 'MULTI_ITEMS'
          ? validItems.map((it) => {
              const taxes = calculateItemTaxes(it);
              return {
                ...it,
                vatType: it.vatType || 'NO_VAT',
                vatAmount: taxes.vatAmount,
                whtType: it.whtType || 'NONE',
                whtPercent: taxes.whtPercent,
                whtAmount: taxes.whtAmount,
                netAmount: taxes.netAmount,
                attachments: Array.isArray(it.attachments) ? it.attachments : [],
              };
            })
          : undefined,
        credit_card_deduction: entryMode === 'MULTI_ITEMS' ? effectiveCcDeduction : undefined,
        requester_signature_url: formRequesterSig || undefined,
        supervisor_signature_url: formSupervisorSig || undefined,
      });

      if (res.success && res.id) {
        await Swal.fire({
          title: 'สร้างใบขออนุมัติจ่ายเงินสำเร็จ!',
          html: `<div class="text-left text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p>เลขที่คำขอ: <b class="font-mono text-red-600 text-sm">${res.payNumber}</b></p>
            <p>สถานะ: <b>${res.status}</b></p>
            ${res.isPossibleDuplicate ? `<p class="text-red-700 mt-1 font-medium">[แจ้งเตือน] ระบบส่งสัญญาณตรวจสอบความซ้ำซ้อน</p>` : ''}
          </div>`,
          icon: 'success',
          confirmButtonColor: '#dc2626',
        });
        router.push(`/accounting/payment-requests/${res.id}`);
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถสร้างคำขอได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ระบบขัดข้อง',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'PENDING_SUPERVISOR':
        return {
          label: 'รอหัวหน้างานอนุมัติ',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-300',
          dot: 'bg-amber-500',
          step: 0,
        };
      case 'SUBMITTED':
      case 'DUPLICATE_CHECK':
      case 'DOCUMENT_CHECK':
        return {
          label: 'รอตรวจสอบบัญชี',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
          dot: 'bg-blue-500',
          step: 1,
        };
      case 'ACCOUNTING_CHECKED':
        return {
          label: 'บัญชีตรวจสอบแล้ว (รออนุมัติ)',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
          dot: 'bg-blue-500',
          step: 2,
        };
      case 'APPROVED':
      case 'READY_TO_PAY':
        return {
          label: 'อนุมัติจ่ายแล้ว (พร้อมโอน)',
          bg: 'bg-indigo-50',
          text: 'text-indigo-800',
          border: 'border-indigo-200',
          dot: 'bg-indigo-500',
          step: 3,
        };
      case 'PAID':
      case 'POSTED_TO_GL':
      case 'ORIGINAL_RECEIVED':
        return {
          label: 'โอนเงินสำเร็จแล้ว',
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
          step: 4,
        };
      case 'HOLD_DUPLICATE':
        return {
          label: 'ระงับตรวจสอบซ้ำซ้อน',
          bg: 'bg-red-50',
          text: 'text-red-800',
          border: 'border-red-200',
          dot: 'bg-red-500',
          step: -1,
        };
      case 'RETURN_DOCUMENT':
        return {
          label: 'ส่งคืนแก้ไขเอกสาร',
          bg: 'bg-orange-50',
          text: 'text-orange-800',
          border: 'border-orange-200',
          dot: 'bg-orange-500',
          step: -2,
        };
      case 'CANCELLED':
      case 'REJECTED':
        return {
          label: 'ยกเลิก / ไม่อนุมัติ',
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200',
          dot: 'bg-gray-400',
          step: -3,
        };
      default:
        return {
          label: status,
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          dot: 'bg-gray-400',
          step: 1,
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 sm:pb-8 space-y-4 sm:space-y-6">
      {/* Symmetrical Top Header: Red, White & Gray */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <Link
            href={isEditMode && initialData ? `/accounting/payment-requests/${initialData.id}` : "/accounting/payment-requests"}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition mb-2 font-medium"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" /> <span className="truncate">{isEditMode && initialData ? `กลับไปหน้ารายละเอียดคำขอ (${initialData.pay_number})` : 'กลับสู่ทะเบียนขอจ่ายเงิน (Payment Register)'}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 tracking-wide uppercase">
              TERA GROUP • PAYMENT SYSTEM
            </span>
            {isEditMode && initialData && (
              <span className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border tracking-wide uppercase ${
                initialData.status === 'RETURN_DOCUMENT' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {initialData.status === 'RETURN_DOCUMENT' ? 'เอกสารถูกส่งคืนให้แก้ไข' : `โหมดแก้ไข: ${initialData.status}`}
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2 sm:gap-2.5 mt-1.5">
            {isEditMode ? <Edit3 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 shrink-0" /> : <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 shrink-0" />}
            <span className="leading-snug">{isEditMode && initialData ? `แก้ไขคำขอเบิกจ่ายเงิน (${initialData.pay_number})` : 'สร้างใบขออนุมัติจ่ายเงิน (New Payment Request)'}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isEditMode && initialData
              ? 'ปรับปรุงรายละเอียดคำขอ รายการสินค้า/บริการ ยอดเงิน และเอกสารแนบตามที่ได้รับแจ้ง'
              : 'ระบบศูนย์กลางการขอเบิกจ่ายและควบคุมป้องกันการจ่ายเงินซ้ำซ้อน เครือ Tera Group (TG, TE, TP)'}
          </p>
        </div>

        {/* Right Policy Badge Card */}
        <div className="bg-gray-50 border border-red-200/80 rounded-xl p-3 sm:p-3.5 text-xs text-gray-800 w-full md:max-w-sm">
          <p className="font-bold flex items-center gap-1.5 text-red-700">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            {isEditMode ? 'ตรวจสอบความถูกต้องก่อนส่งตรวจใหม่' : 'กฎเหล็ก: No PAY No. = No Payment'}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
            {isEditMode
              ? 'เมื่อแก้ไขข้อมูลและแนบเอกสารครบถ้วนแล้ว ให้กดปุ่ม "บันทึกและส่งตรวจอีกครั้ง" เพื่อส่งให้ฝ่ายบัญชีตรวจสอบทันที'
              : 'เอกสารทุกช่องทาง (LINE / Email / ตัวจริง) ต้องอ้างอิงเลข PAY No. เสมอ ฝ่ายการเงินจ่ายเฉพาะรายการใน Approved List'}
          </p>
        </div>
      </div>

      {/* Return for Revision Banner in Edit Mode */}
      {isEditMode && initialData && (
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/60 border-2 border-orange-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl shrink-0 mt-0.5 border border-orange-200 shadow-2xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-sm sm:text-base text-orange-950">
                    {initialData.status === 'RETURN_DOCUMENT'
                      ? 'แก้ไขคำขอเบิกเงินที่ถูกส่งคืน (Returned Document Revision)'
                      : `แก้ไขคำขอเบิกเงิน (${initialData.pay_number})`}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-200 text-orange-900 border border-orange-300">
                    {initialData.status === 'RETURN_DOCUMENT' ? 'ส่งคืนแก้ไขเอกสาร' : initialData.status}
                  </span>
                </div>
                <p className="text-xs text-orange-900/80">
                  เลขที่คำขอ: <b className="font-mono text-orange-950">{initialData.pay_number}</b>
                  {returnedBy && (
                    <> • ผู้ส่งคืน: <b className="text-orange-950">{returnedBy}</b></>
                  )}
                  {returnedAt && (
                    <> • วันที่ส่งคืน: <b className="text-orange-950">{returnedAt}</b></>
                  )}
                </p>
              </div>
            </div>
            <Link
              href={`/accounting/payment-requests/${initialData.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-900 hover:bg-orange-50 border border-orange-300 rounded-xl text-xs font-semibold shadow-2xs transition self-start"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              ดูหน้ารายละเอียดเดิม
            </Link>
          </div>

          {initialData.status === 'RETURN_DOCUMENT' && returnReason && (
            <div className="bg-white/95 rounded-xl p-3.5 border border-orange-200 text-xs space-y-1">
              <span className="font-bold text-orange-950 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                เหตุผลที่ฝ่ายบัญชีส่งกลับแก้ไข:
              </span>
              <p className="text-slate-800 font-medium pl-5 whitespace-pre-wrap leading-relaxed">
                {returnReason}
              </p>
            </div>
          )}

          <p className="text-[11px] text-orange-900/90 leading-relaxed flex items-start gap-1.5">
            <Lightbulb size={13} className="text-orange-600 shrink-0 mt-0.5" />
            <span>ข้อมูลเดิมที่เคยกรอกไว้ทั้งหมดถูกโหลดขึ้นมาแล้ว ท่านสามารถแก้ไขรายการสินค้า/บริการ, ยอดเงิน, ปรับเปลี่ยนหรือแนบเอกสารใบเสร็จเพิ่มเติม จากนั้นกดปุ่ม <b>&ldquo;บันทึกและส่งตรวจอีกครั้ง&rdquo;</b> ด้านล่าง</span>
          </p>
        </div>
      )}

      {/* Tab Switcher: Create Request vs My Requests Status (Hidden in Edit Mode) */}
      {!isEditMode && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-1 p-1 bg-gray-100/90 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition ${
                activeTab === 'create'
                  ? 'bg-white text-red-600 shadow-2xs border border-gray-200/80'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>สร้างคำขอใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('my_requests');
                refreshMyRequests();
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition relative ${
                activeTab === 'my_requests'
                  ? 'bg-white text-red-600 shadow-2xs border border-gray-200/80'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">สถานะคำขอของฉัน</span>
              {myRequests.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'my_requests'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {myRequests.length}
                </span>
              )}
              {attentionCount > 0 && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5"
                  title="มีรายการต้องตรวจสอบหรือแก้ไขเอกสาร"
                />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 px-1 sm:px-2">
            {activeTab === 'my_requests' ? (
              <button
                type="button"
                onClick={refreshMyRequests}
                disabled={isLoadingRequests}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin text-red-600' : ''}`} />
                รีเฟรชข้อมูล
              </button>
            ) : (
              myRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('my_requests')}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium inline-flex items-center gap-1.5 transition ml-auto"
                >
                  <span>คำขอของฉัน ({myRequests.length} รายการ)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' ? (
        <>
          {/* Quick link banner if user has requests */}
          {!isEditMode && myRequests.length > 0 && (
            <div className="bg-gradient-to-r from-red-50/90 via-amber-50/40 to-white border border-red-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    คุณมีประวัติคำขอเบิกเงินในระบบทั้งหมด <span className="font-bold text-red-600 font-mono">{myRequests.length}</span> รายการ
                    {pendingCount > 0 && (
                      <span className="ml-1 text-gray-700 font-normal">
                        (อยู่ระหว่างตรวจสอบ/รออนุมัติ <b className="text-amber-800 font-mono font-bold">{pendingCount}</b> รายการ)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    คุณสามารถสลับไปที่แท็บ <b className="text-red-700 font-semibold">"ติดตามสถานะคำขอเบิกของฉัน"</b> เพื่อเช็คขั้นตอนการอนุมัติ โอนเงิน หรือพิมพ์ใบสำคัญจ่ายได้ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('my_requests')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-red-600 border border-red-200 hover:border-red-400 font-bold rounded-xl shadow-2xs hover:bg-red-50/50 transition shrink-0"
              >
                ดูสถานะคำขอของฉัน <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Duplicate Check Warning Banners */}
          {dupResult?.isExactDuplicate && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-5 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 text-xs text-red-950">
              <h3 className="font-bold text-sm text-red-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>ตรวจพบเอกสารซ้ำซ้อน (Exact Duplicate Detected)</span>
                <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-mono">
                  BLOCKED
                </span>
              </h3>
              <p className="mt-1 leading-relaxed">
                {dupResult.exactMatches[0]?.matchType === 'ITEM_DUPLICATE' ? (
                  <>
                    <b className="text-red-900 font-bold">[รายการสินค้าซ้ำซ้อน]</b> รายการที่{' '}
                    <b className="text-red-900 font-bold">{dupResult.exactMatches[0]?.matchedItemIndex || 1}</b>{' '}
                    &ldquo;<b className="text-red-900">{dupResult.exactMatches[0]?.matchedItemDesc}</b>&rdquo; ของร้าน{' '}
                    <b className="text-red-900">{dupResult.exactMatches[0]?.matchedItemSupplier}</b> (ยอดเงิน{' '}
                    {Number(dupResult.exactMatches[0]?.matchedItemAmount || 0).toLocaleString()} ฿) เคยถูกบันทึกในระบบแล้ว:
                  </>
                ) : dupResult.exactMatches[0]?.matchType === 'ATTACHMENT_HASH' ? (
                  <>
                    <b className="text-red-900 font-bold">[ไฟล์แนบซ้ำซ้อน]</b> ตรวจพบไฟล์แนบที่มีเนื้อหาตรงกับเอกสารในระบบกลาง:
                  </>
                ) : dupResult.exactMatches[0]?.matchType === 'PO_PR_NUMBER' ? (
                  <>
                    <b className="text-red-900 font-bold">[PO/PR ซ้ำซ้อน]</b> เลขที่ PO/PR <b className="font-mono text-red-900">{poPrNumber}</b> เคยถูกบันทึกในระบบแล้ว:
                  </>
                ) : (
                  <>
                    เลขที่บิล <b className="font-mono text-red-900">{invoiceNumber || '-'}</b> ของผู้ขาย{' '}
                    <b className="text-red-900">{supplierName || '-'}</b> เคยถูกบันทึกในระบบแล้ว:
                  </>
                )}
              </p>
              <div className="mt-2.5 space-y-1.5 bg-white p-3 rounded-xl border border-red-200">
                {dupResult.exactMatches.map((m: any, idx: number) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between font-mono text-[11px] gap-2">
                    <span className="font-bold text-red-700">{m.pay_number}</span>
                    {m.matchType && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-100 text-red-800 font-semibold font-sans">
                        {m.matchType === 'ITEM_DUPLICATE'
                          ? `รายการที่ ${m.matchedItemIndex || 1} ซ้ำ`
                          : m.matchType === 'ATTACHMENT_HASH'
                          ? 'ไฟล์แนบตรงกัน'
                          : m.matchType === 'PO_PR_NUMBER'
                          ? 'เลข PO/PR ตรงกัน'
                          : 'เลขที่บิลตรงกัน'}
                      </span>
                    )}
                    <span>{m.company}</span>
                    <span>ยอด: {Number(m.net_amount).toLocaleString()} ฿</span>
                    <span>วันที่: {formatDisplayDate(m.document_date)}</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-sans">{m.status}</span>
                    <Link
                      href={`/accounting/payment-requests/${m.id}`}
                      target="_blank"
                      className="text-red-600 hover:text-red-700 font-bold hover:underline inline-flex items-center gap-1 font-sans"
                    >
                      ดูรายการเดิม <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-red-700 font-medium">
                * หากเป็นการส่งเอกสารเพิ่มเติม กรุณานำเอกสารไปแนบที่ใบขอจ่ายเดิม ห้ามสร้างคำขอใหม่
              </p>
            </div>
          </div>
        </div>
      )}

      {dupResult?.isPossibleDuplicate && !dupResult.isExactDuplicate && (
        <div className="bg-gray-50 border-2 border-red-200 rounded-2xl p-5 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs text-gray-900">
              <h3 className="font-bold text-sm text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>แจ้งเตือน: พบรายการที่อาจซ้ำซ้อน (Possible Duplicate Alert)</span>
              </h3>
              <p className="mt-1 leading-relaxed text-gray-600">
                ตรวจพบยอดเงิน <b className="text-gray-900 font-mono">{netPayable.toLocaleString()} บาท</b> วันที่{' '}
                <b className="text-gray-900">{formatDisplayDate(documentDate)}</b> ของ <b className="text-gray-900">{supplierName}</b>{' '}
                ใกล้เคียงกับคำขอที่มีอยู่แล้ว:
              </p>
              <div className="mt-2 space-y-1 bg-white p-2.5 rounded-xl border border-gray-200">
                {dupResult.possibleMatches.map((m: any, idx: number) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between font-mono text-[11px] gap-2">
                    <span className="font-bold text-red-600">{m.pay_number}</span>
                    <span>{m.branch}</span>
                    <span>{Number(m.net_amount).toLocaleString()} ฿</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-sans">{m.status}</span>
                    <Link
                      href={`/accounting/payment-requests/${m.id}`}
                      target="_blank"
                      className="text-red-600 hover:underline inline-flex items-center gap-1 font-sans"
                    >
                      ตรวจสอบ <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Symmetrical Form */}
      <div id="payment-request-form-top" className="scroll-mt-4" />
      <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
        {/* Intuitive 4-Step Guided Progress Bar + Single-Page View Toggle */}
        {(() => {
          const resolvedBranchVal = branch === 'อื่นๆ (ระบุ)' ? customBranch.trim() : branch.trim();
          const step1Ready = Boolean(requesterName.trim() && resolvedBranchVal);
          const validItemCount = requisitionItems.filter(
            (it) => it.description.trim() && Number(it.amount) > 0
          ).length;
          const step2Ready = validItemCount > 0;
          const step3Ready = Boolean(documentDate.trim() && purpose.trim());
          const irregularCount = requisitionItems.filter((it) => it.isIrregularBill).length;
          const unsignedIrregularCount = requisitionItems.filter(
            (it) => it.isIrregularBill && (!it.substituteCertificateUrl || (!it.requesterSignatureUrl && !formRequesterSig))
          ).length;
          const totalFilesCount =
            attachments.length + requisitionItems.reduce((acc, it) => acc + (it.attachments?.length || 0), 0);

          const steps = [
            { id: 1 as const, title: 'บริษัท & ผู้รับเงิน', sub: `${company} • ${supplierName.trim() || 'ระบุผู้รับ'}`, done: step1Ready },
            { id: 2 as const, title: 'รายการ & บก.111', sub: `${requisitionItems.length} รายการ • ${netPayable.toLocaleString()} ฿`, done: step2Ready, badge: unsignedIrregularCount > 0 ? `บก.111 (${unsignedIrregularCount})` : irregularCount > 0 ? 'บก.111 ครบ' : undefined, badgeDone: unsignedIrregularCount === 0 && irregularCount > 0, badgeWarn: unsignedIrregularCount > 0 },
            { id: 3 as const, title: 'วัตถุประสงค์ & แนบไฟล์', sub: `${totalFilesCount} ไฟล์แนบ / OCR`, done: step3Ready },
            { id: 4 as const, title: 'ตรวจทาน & ส่งคำขอ', sub: 'สรุปยอดพร้อมส่ง', done: step1Ready && step2Ready && step3Ready },
          ];

          return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-3 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
                    {showAllSections ? 'แสดงทั้งหมดหน้าเดียว' : `ขั้นตอนที่ ${formStep} / 4`}
                  </span>
                  <span className="text-gray-600 font-medium hidden sm:inline">
                    {showAllSections
                      ? 'เลื่อนกรอกข้อมูลครบทุกส่วนในหน้าเดียว'
                      : steps[formStep - 1]?.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!showAllSections && formStep === 1 && (
                    <button
                      type="button"
                      onClick={() => goToFormStep(3)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition cursor-pointer"
                      title="ข้ามไปอัปโหลดรูปบิลให้ AI อ่านข้อมูลอัตโนมัติ"
                    >
                      <Scan className="w-3 h-3" />
                      <span>สแกนบิลด้วย OCR ก่อน</span>
                    </button>
                  )}

                  <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setShowAllSections(false)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        !showAllSections ? 'bg-white text-red-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      ทีละขั้น (แนะนำ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAllSections(true)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        showAllSections ? 'bg-white text-red-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <LayoutList className="w-3 h-3" />
                      <span>หน้าเดียวยาว</span>
                    </button>
                  </div>
                </div>
              </div>

              {!showAllSections && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {steps.map((s) => {
                    const isCurrent = formStep === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goToFormStep(s.id)}
                        className={`text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                          isCurrent
                            ? 'bg-red-50/70 border-red-400 ring-2 ring-red-100 shadow-2xs'
                            : s.done
                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                            : 'bg-gray-50/70 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isCurrent
                              ? 'bg-red-600 text-white'
                              : s.done
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-gray-500 border border-gray-300'
                          }`}
                        >
                          {s.done && !isCurrent ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${isCurrent ? 'text-red-900' : 'text-gray-900'}`}>
                              {s.title}
                            </span>
                            {s.badge && (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                  s.badgeWarn
                                    ? 'bg-amber-200 text-amber-950'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {s.badge}
                                {'badgeDone' in s && s.badgeDone && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 truncate block mt-0.5">{s.sub}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* STEP 1: Organization, Branch & Payee Details */}
        {(showAllSections || formStep === 1) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: สังกัดบริษัท & ข้อมูลการส่ง */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <h2 className="text-sm font-bold text-gray-900">
                  สังกัดบริษัทและประเภทรายการ (Organization & Classification)
                </h2>
              </div>

              <div className="space-y-4">
                {/* Company Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    บริษัทผู้จ่ายเงิน <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['TG', 'TE', 'TP'] as const).map((c) => {
                      const isSelected = company === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            if (c === company) return;
                            setCompany(c);
                            // Regenerate any existing substitute receipt certificates for the newly selected company
                            const irregularGroupKeys = Array.from(
                              new Set(
                                requisitionItems
                                  .filter((it) => it.isIrregularBill && it.substituteCertificateUrl)
                                  .map((it) => it.substituteGroupKey || getSubstituteGroupKey(it.supplierName, it.billDate))
                                  .filter(Boolean)
                              )
                            );
                            if (irregularGroupKeys.length > 0) {
                              Promise.all(
                                irregularGroupKeys.map((gk) =>
                                  syncGroupSubstituteCertificate(gk, requisitionItems, true, c)
                                )
                              ).catch((err) => console.warn('Failed to re-sync certificates on company change:', err));
                            }
                          }}
                          className={`py-2 px-2 sm:px-3 text-xs font-bold rounded-xl border transition text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center p-0.5 ${isSelected ? 'bg-white' : 'bg-gray-50 border border-gray-100'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c === 'TG' ? '/4.png' : c === 'TE' ? '/6.png' : '/7.png'}
                              alt={c}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="block text-sm">{c}</span>
                            <span className={`block text-[10px] font-normal ${isSelected ? 'text-red-100' : 'text-gray-400'}`}>
                              {c === 'TG' ? 'Tera Group' : c === 'TE' ? 'Tera Electric' : 'Tera Power'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Branch Selection (Searchable Combobox) */}
                <div className="relative" ref={branchDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      สาขาที่เกิดค่าใช้จ่าย <span className="text-red-600">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <Search size={10} className="text-red-500" />
                      พิมพ์ค้นหาชื่อหรือรหัสสาขาได้
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={branchSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBranchSearchQuery(val);
                        if (branch === 'อื่นๆ (ระบุ)') {
                          setBranch('');
                        }
                        setIsBranchDropdownOpen(true);
                      }}
                      onFocus={() => setIsBranchDropdownOpen(true)}
                      placeholder="-- พิมพ์ชื่อสาขา หรือรหัส เช่น BKK, เชียงใหม่, ขอนแก่น --"
                      className="w-full text-xs rounded-xl border border-gray-300 py-2.5 pl-3 pr-16 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 font-medium shadow-xs transition"
                      autoComplete="off"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      {branchSearchQuery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBranchSearchQuery('');
                            setBranch('');
                            setCustomBranch('');
                            setIsBranchDropdownOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 transition"
                          title="ล้างคำค้นหา"
                        >
                          <X size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition"
                        title="เปิด/ปิด รายการสาขา"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-150 ${
                            isBranchDropdownOpen ? 'rotate-180 text-red-600' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {isBranchDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                      <div className="p-1.5 space-y-0.5">
                        {filteredBranches.map((b) => {
                          const isSelected = branch === b.name;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleSelectBranch(b.name)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-red-50 text-red-800 font-semibold'
                                  : 'hover:bg-gray-50 text-gray-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {b.id === 'BKK-HQ' ? 'สำนักงานใหญ่ (Head Office)' : b.name}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {b.id}
                                </span>
                              </div>
                              {isSelected && <Check size={14} className="text-red-600 shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Option to specify custom / other */}
                        <button
                          type="button"
                          onClick={() => handleSelectBranch('อื่นๆ (ระบุ)')}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between border-t border-gray-100 mt-1 transition-colors ${
                            branch === 'อื่นๆ (ระบุ)'
                              ? 'bg-red-50 text-red-800 font-semibold'
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <span className="font-medium text-gray-700">
                            + อื่นๆ (ระบุสาขา / ไซต์งานโครงการ)
                          </span>
                          {branch === 'อื่นๆ (ระบุ)' && (
                            <Check size={14} className="text-red-600 shrink-0" />
                          )}
                        </button>

                        {/* When no match found */}
                        {filteredBranches.length === 0 && (
                          <div className="p-3 text-center">
                            <p className="text-xs text-gray-500">
                              ไม่พบสาขาที่ตรงกับ &ldquo;{branchSearchQuery}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setBranch('อื่นๆ (ระบุ)');
                                setCustomBranch(branchSearchQuery);
                                setIsBranchDropdownOpen(false);
                              }}
                              className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-lg transition inline-flex items-center gap-1"
                            >
                              + ใช้ &ldquo;{branchSearchQuery}&rdquo; เป็นสาขา/ไซต์งานพิเศษ
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Branch text input */}
                  {branch === 'อื่นๆ (ระบุ)' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="ระบุชื่อสาขา / ไซต์งาน / โครงการพิเศษ *"
                        value={customBranch}
                        onChange={(e) => setCustomBranch(e.target.value)}
                        className="w-full text-xs rounded-xl border border-red-300 bg-red-50/20 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-medium"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Classification & Channel (Symmetrical 2 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      หมวดหมู่การเบิกจ่าย <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={classification}
                      onChange={(e: any) => {
                        setClassification(e.target.value);
                      }}
                      className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
                    >
                      <option value="VENDOR_BILL">ชำระเจ้าหนี้การค้า</option>
                      <option value="REIMBURSEMENT">เบิกจ่ายพนักงาน/สำรองจ่าย</option>
                      <option value="BRANCH_SITE">ขอเบิกสาขา/ไซต์งาน</option>
                      <option value="PETTY_CASH">เงินสดย่อย</option>
                      <option value="CASH_ADVANCE">เงินทดรองจ่าย</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ช่องทางต้นทางของเอกสาร
                    </label>
                    <select
                      value={submissionChannel}
                      onChange={(e: any) => setSubmissionChannel(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
                    >
                      <option value="WEB">ระบบศูนย์กลางเว็บไซต์ (Web Direct)</option>
                      <option value="LINE">ส่งรูปผ่าน LINE (ต้องระบุ PAY No.)</option>
                      <option value="EMAIL">ส่งทางอีเมล (Email)</option>
                      <option value="PHYSICAL">ส่งเอกสารตัวจริงมาแผนกบัญชี</option>
                    </select>
                  </div>
                </div>

                {/* Urgency Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    ระดับความเร่งด่วน <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUrgency('NORMAL')}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                        urgency === 'NORMAL'
                          ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      ปกติ (Normal Workflow)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUrgency('EMERGENCY');
                        if (!requestedPaymentDate) {
                          setRequestedPaymentDate(getTodayStr());
                        }
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                        urgency === 'EMERGENCY'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-200'
                          : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      ด่วนที่สุด (Emergency)
                    </button>
                  </div>

                  {/* Emergency Date Picker Panel */}
                  {urgency === 'EMERGENCY' && (
                    <div className="mt-3 p-3.5 bg-red-50/90 border border-red-200 rounded-xl space-y-2.5 animate-in fade-in duration-200 shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>วันที่ต้องการให้จ่ายเงินด่วน (Desired Payment Date)</span>
                          <span className="text-red-600">*</span>
                        </label>
                        <span className="text-[10px] font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded-full border border-red-200 inline-flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-red-600" /> ด่วนพิเศษ
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRequestedPaymentDate(getTodayStr())}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                            requestedPaymentDate === getTodayStr()
                              ? 'bg-red-600 text-white border-red-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-red-100/50 hover:text-red-700'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>วันนี้ (Today)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedPaymentDate(getTomorrowStr())}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                            requestedPaymentDate === getTomorrowStr()
                              ? 'bg-red-600 text-white border-red-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-red-100/50 hover:text-red-700'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>พรุ่งนี้ (Tomorrow)</span>
                        </button>
                      </div>

                      {/* Explicit Date Picker Input */}
                      <div>
                        <div className="text-[11px] text-gray-600 font-medium mb-1">
                          หรือเลือกวันที่ต้องการจากปฏิทิน:
                        </div>
                        <input
                          type="date"
                          required={urgency === 'EMERGENCY'}
                          value={requestedPaymentDate}
                          onChange={(e) => setRequestedPaymentDate(e.target.value)}
                          className="w-full text-xs font-bold rounded-lg border border-red-300 py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
                        />
                      </div>

                      <div className="p-2 bg-white/80 rounded-lg border border-red-100 flex items-start gap-1.5 text-[11px] text-red-800">
                        <Info className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          ระบบจะส่งแจ้งเตือนพิเศษไปยังทีมการเงิน/ผู้อนุมัติเพื่อเร่งดำเนินการโอนเงินให้ทันภายในวันที่ระบุนี้
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ผู้ขอเบิก & ผู้รับเงิน */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <h2 className="text-sm font-bold text-gray-900">
                  ข้อมูลผู้ขอเบิกและผู้รับเงิน (Requester & Payee)
                </h2>
              </div>

              <div className="space-y-4">
                {/* Requester Group (Compact 1-line summary when pre-filled) */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          ผู้ขอเบิก (ดึงจากระบบอัตโนมัติ)
                        </span>
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {requesterName || 'กรุณาระบุชื่อผู้ขอเบิก'}
                          {requesterDept ? ` • ${requesterDept}` : ''}
                          {requesterPhone ? ` • ${requesterPhone}` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRequesterEditor((prev) => !prev)}
                      className="text-[11px] font-semibold text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{showRequesterEditor || !requesterName.trim() ? 'ซ่อน' : 'แก้ไขข้อมูลผู้ขอ'}</span>
                    </button>
                  </div>

                  {(showRequesterEditor || !requesterName.trim()) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-200/80">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                          ชื่อ-นามสกุล <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={requesterName}
                          onChange={(e) => setRequesterName(e.target.value)}
                          placeholder="ชื่อผู้ขอเบิก"
                          className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">แผนก/ฝ่าย</label>
                        <input
                          type="text"
                          value={requesterDept}
                          onChange={(e) => setRequesterDept(e.target.value)}
                          placeholder="เช่น จัดซื้อ, ช่าง"
                          className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">เบอร์โทรศัพท์</label>
                        <input
                          type="text"
                          value={requesterPhone}
                          onChange={(e) => setRequesterPhone(e.target.value)}
                          placeholder="08X-XXX-XXXX"
                          className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Selectable Supervisor / Approver Row */}
                  <div className="pt-2.5 border-t border-gray-200/80 relative" ref={supDropdownRef}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        <span>หัวหน้างานผู้อนุมัติ (Approver) {!isCurrentUserManagerial && <span className="text-red-600">*</span>}</span>
                        {supervisorId === '__NONE__' ? (
                          <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-semibold">
                            ส่งบัญชีโดยตรง (ไม่ผ่านหัวหน้า)
                          </span>
                        ) : initialSupervisor &&
                          supervisorName &&
                          normalizePersonName(supervisorName) !== normalizePersonName(initialSupervisor) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                            เลือกหัวหน้าเองแล้ว <Check size={10} />
                          </span>
                        ) : supervisorName ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                            จับคู่จากระบบ
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                            กรุณาเลือกหัวหน้างาน
                          </span>
                        )}
                      </span>

                      {initialSupervisor &&
                        (supervisorId === '__NONE__' ||
                          normalizePersonName(supervisorName) !== normalizePersonName(initialSupervisor)) && (
                          <button
                            type="button"
                            onClick={() => {
                              const matchedOrig = supervisorOptions.find(
                                (o) =>
                                  (initialSupervisorId && o.id === initialSupervisorId) ||
                                  normalizePersonName(o.fullName) === normalizePersonName(initialSupervisor)
                              );
                              if (matchedOrig) {
                                handleSelectSupervisor(matchedOrig);
                              } else {
                                handleSelectSupervisor({
                                  id: initialSupervisorId || '',
                                  fullName: initialSupervisor,
                                  role: '',
                                  isManagerial: true,
                                  hasCrmAccount: true,
                                });
                              }
                            }}
                            className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer underline"
                          >
                            <RotateCcw className="w-3 h-3" /> คืนค่าเดิม ({initialSupervisor})
                          </button>
                        )}
                    </div>

                    {supervisorOptions.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsSupDropdownOpen((prev) => !prev)}
                          className="w-full text-left text-xs rounded-xl border border-gray-300 hover:border-sky-500 bg-white py-2 px-3 flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-bold text-gray-900 truncate">
                              {supervisorId === '__NONE__'
                                ? 'ส่งเข้าฝ่ายบัญชีโดยตรง (ไม่ผ่านหัวหน้างาน — เฉพาะระดับผู้จัดการ)'
                                : supervisorName || 'คลิกค้นหาและเลือกหัวหน้างานผู้อนุมัติ...'}
                            </span>
                            {supervisorId !== '__NONE__' && supervisorName && (
                              <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 shrink-0 hidden sm:inline">
                                คลิกเปลี่ยนได้
                              </span>
                            )}
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        </button>

                        {isSupDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                            <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <input
                                type="text"
                                autoFocus
                                value={supSearchQuery}
                                onChange={(e) => setSupSearchQuery(e.target.value)}
                                placeholder="ค้นหาชื่อหัวหน้า, ชื่อเล่น, แผนก หรือสาขา..."
                                className="w-full text-xs bg-transparent focus:outline-none text-gray-800"
                              />
                            </div>

                            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                              {isCurrentUserManagerial && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectSupervisor(null, true)}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer ${
                                    supervisorId === '__NONE__' ? 'bg-slate-100 font-bold' : ''
                                  }`}
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 block">
                                      ส่งเข้าฝ่ายบัญชีโดยตรง (ไม่ต้องผ่านหัวหน้างาน)
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      ใช้สิทธิ์ระดับหัวหน้างาน/ผู้จัดการในการยื่นเบิกโดยตรง
                                    </span>
                                  </div>
                                  {supervisorId === '__NONE__' && <Check className="w-4 h-4 text-slate-700 shrink-0" />}
                                </button>
                              )}

                              {selectableSupervisors.length === 0 ? (
                                <div className="p-3 text-center text-[11px] text-gray-500">
                                  ไม่พบรายชื่อที่ตรงกับ &quot;{supSearchQuery}&quot;
                                </div>
                              ) : (
                                selectableSupervisors.map((opt) => {
                                  const isSelected =
                                    supervisorId !== '__NONE__' &&
                                    ((supervisorId && supervisorId === opt.id) ||
                                      (supervisorName &&
                                        normalizePersonName(supervisorName) === normalizePersonName(opt.fullName)));
                                  return (
                                    <button
                                      key={`${opt.id}_${opt.fullName}`}
                                      type="button"
                                      onClick={() => handleSelectSupervisor(opt)}
                                      className={`w-full text-left px-3 py-2 text-xs hover:bg-sky-50 transition flex items-start justify-between gap-2 cursor-pointer ${
                                        isSelected ? 'bg-sky-50/90' : ''
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                                          <span>{opt.fullName}</span>
                                          {opt.nickname && (
                                            <span className="text-[10px] text-gray-500 font-normal">({opt.nickname})</span>
                                          )}
                                          {opt.isManagerial && (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold shrink-0">
                                              หัวหน้า/ผู้จัดการ
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                          {[opt.jobTitle || opt.role, opt.department, opt.branch].filter(Boolean).join(' • ')}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => {
                          setSupervisorName(e.target.value);
                          setSupervisorId('');
                        }}
                        placeholder="ระบุชื่อหัวหน้างานผู้อนุมัติ"
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      />
                    )}

                    <p className="text-[10px] text-gray-500 mt-1">
                      หากระบบจับคู่หัวหน้าผิด สามารถเลือกเปลี่ยนหัวหน้าได้ทันที (ชื่อในใบ บก.111 และสิทธิ์อนุมัติจะอัปเดตตาม)
                    </p>
                  </div>
                </div>

                {/* Unified Payee & Payment Transfer Section */}
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-4 shadow-2xs">
                  {/* Unified Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block leading-tight">
                          ข้อมูลผู้รับเงิน & ช่องทางการโอนเงิน (Payee & Payment Details)
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ระบุข้อมูลผู้รับเงิน/เจ้าหนี้ และช่องทางโอนเงินสำหรับฝ่ายการเงินและบัญชี (AR / AP Team)
                        </span>
                      </div>
                    </div>
                    {requesterName.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = requesterName.trim();
                          setSupplierName(name);
                          setBankAccountName(name);
                          setPromptPayAccountName(name);
                          setHasCustomAccountName(false);
                          if (requesterPhone.trim()) {
                            setPayeePhone(requesterPhone.trim());
                            setPromptPayNumber(requesterPhone.trim());
                          }
                        }}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs transition-colors"
                      >
                        + ใช้ชื่อผู้ขอเบิกเป็นผู้รับเงิน (สำรองจ่าย / Reimbursement)
                      </button>
                    )}
                  </div>

                  {/* 1. Payee / Supplier Profile Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between min-h-[22px] mb-1">
                        <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1 truncate">
                          <span>ชื่อผู้รับเงิน / บริษัทคู่ค้า (Payee)</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSupplierName(val);
                          if (!hasCustomAccountName) {
                            setBankAccountName(val);
                            setPromptPayAccountName(val);
                          }
                        }}
                        placeholder={`เช่น ${requesterName || 'ชื่อผู้ขอเบิก'} (สำรองจ่าย)`}
                        className="w-full h-10 text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium shadow-2xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between min-h-[22px] mb-1">
                        <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1 truncate">
                          <span>เลขประจำตัวผู้เสียภาษี</span>
                          <span className="text-gray-400 font-normal text-[10px]">(Tax ID)</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={supplierTaxId}
                        onChange={(e) => setSupplierTaxId(e.target.value)}
                        placeholder="13 หลัก (ถ้ามี)"
                        className="w-full h-10 text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono shadow-2xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between min-h-[22px] mb-1">
                        <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1 truncate">
                          <span>เบอร์โทรศัพท์ผู้รับเงิน</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={payeePhone}
                        onChange={(e) => setPayeePhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full h-10 text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* 2. Payment Channel (Integrated in the same card) */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                        ช่องทางโอนเงิน / ชำระเงิน (Payment Channel)
                      </span>
                      <span className="text-[10px] text-gray-400">เลือกรูปแบบที่ต้องการให้ฝ่ายการเงินโอนจ่าย</span>
                    </div>

                    {/* Payment Method Switcher */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/70 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('BANK_TRANSFER');
                          const found = THAI_BANKS.find(b => b.code === selectedBankCode);
                          if (found) setBankName(found.name);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          paymentMethod === 'BANK_TRANSFER'
                            ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>บัญชีธนาคาร</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PROMPTPAY')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          paymentMethod === 'PROMPTPAY'
                            ? 'bg-white text-blue-700 shadow-xs border border-gray-200/60'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>พร้อมเพย์</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH_CHEQUE')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          paymentMethod === 'CASH_CHEQUE'
                            ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เงินสด / เช็ค</span>
                      </button>
                    </div>

                    {/* BANK TRANSFER TAB */}
                    {paymentMethod === 'BANK_TRANSFER' && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                        {/* Top Banks Quick Selector Chips */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-semibold text-gray-700">
                              เลือกธนาคารผู้รับเงิน <span className="text-red-600">*</span>
                            </label>
                            <span className="text-[10px] text-gray-400">เลือกจากยอดนิยม หรือค้นหาจากรายการ</span>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2">
                            {TOP_BANKS.map((b) => {
                              const isSelected = selectedBankCode === b.code;
                              return (
                                <button
                                  key={b.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBankCode(b.code);
                                    setBankName(b.name);
                                  }}
                                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition text-center flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected
                                      ? `${b.badgeBg} ${b.badgeText} ring-2 ${b.ringColor} border-transparent shadow-xs`
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className={`w-2.5 h-2.5 rounded-full ${b.dotColor}`} />
                                  <span className="truncate w-full text-[10px]">{b.shortName}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Full Bank Selection Dropdown */}
                          <select
                            value={selectedBankCode}
                            onChange={(e) => {
                              const code = e.target.value;
                              setSelectedBankCode(code);
                              const found = THAI_BANKS.find((b) => b.code === code);
                              if (found && code !== 'OTHER') {
                                setBankName(found.name);
                              } else if (code === 'OTHER') {
                                setBankName(customBankName);
                              }
                            }}
                            className="w-full text-xs rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 font-medium"
                          >
                            {THAI_BANKS.map((b) => (
                              <option key={b.code} value={b.code}>
                                {b.name}
                              </option>
                            ))}
                          </select>

                          {selectedBankCode === 'OTHER' && (
                            <input
                              type="text"
                              required
                              placeholder="ระบุชื่อธนาคาร เช่น ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร"
                              value={customBankName}
                              onChange={(e) => {
                                setCustomBankName(e.target.value);
                                setBankName(e.target.value);
                              }}
                              className="mt-2 w-full text-xs rounded-xl border border-red-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            />
                          )}
                        </div>

                        {/* Bank Account Number & Account Name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between min-h-[22px] mb-1">
                              <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                                <span>เลขที่บัญชีธนาคาร</span>
                                <span className="text-red-600 font-bold">*</span>
                              </label>
                              <span className="text-[10px] text-transparent select-none">&nbsp;</span>
                            </div>
                            <input
                              type="text"
                              value={bankAccountNo}
                              onChange={(e) => setBankAccountNo(e.target.value)}
                              placeholder="เช่น 045-2-99881-2 (10-12 หลัก)"
                              className="w-full h-10 text-xs font-mono font-bold rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 placeholder:text-gray-400 placeholder:font-normal shadow-2xs"
                            />
                            <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                              ระบุเลขที่บัญชีธนาคาร 10-12 หลัก
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center justify-between min-h-[22px] mb-1">
                              <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                                <span>ชื่อบัญชีผู้รับเงิน</span>
                                <span className="text-gray-400 font-normal text-[10px]">(Account Name)</span>
                              </label>
                              {hasCustomAccountName ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHasCustomAccountName(false);
                                    setBankAccountName(supplierName.trim());
                                  }}
                                  className="text-[10px] text-red-600 hover:text-red-700 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <RotateCcw size={11} />
                                  <span>รีเซ็ตตามชื่อผู้รับเงิน</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                                  <Check size={11} /> ดึงจากชื่อผู้รับเงินอัตโนมัติ
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={bankAccountName || (hasCustomAccountName ? '' : supplierName)}
                              onChange={(e) => {
                                setHasCustomAccountName(true);
                                setBankAccountName(e.target.value);
                              }}
                              placeholder={supplierName ? `ตรงกับ "${supplierName}" อัตโนมัติ` : 'ชื่อบัญชีที่ระบุในสมุดบัญชี'}
                              className="w-full h-10 text-xs font-medium rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 placeholder:text-gray-400 shadow-2xs"
                            />
                            <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                              {hasCustomAccountName
                                ? 'ระบุชื่อบัญชีเฉพาะ (กรณีต่างจากชื่อผู้รับเงิน)'
                                : 'ระบบดึงชื่อผู้รับเงินด้านบนมาใช้ให้อัตโนมัติ (ไม่ต้องพิมพ์ซ้ำ)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PROMPTPAY TAB */}
                    {paymentMethod === 'PROMPTPAY' && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                            ประเภทพร้อมเพย์ (PromptPay Type) <span className="text-red-600">*</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PROMPTPAY_TYPES.map((pt) => {
                              const isSelected = promptPayType === pt.id;
                              return (
                                <button
                                  key={pt.id}
                                  type="button"
                                  onClick={() => setPromptPayType(pt.id as any)}
                                  className={`py-2 px-2 rounded-xl text-center flex flex-col items-center justify-center min-h-[54px] border transition shadow-xs ${
                                    isSelected
                                      ? 'bg-blue-50 text-blue-900 border-blue-400 ring-2 ring-blue-100'
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  <span className="text-[11px] font-bold leading-tight text-center">{pt.title}</span>
                                  <span className={`text-[10px] leading-tight mt-0.5 ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                                    {pt.subtitle}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between min-h-[22px] mb-1">
                              <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                                <span>หมายเลขพร้อมเพย์</span>
                                <span className="text-red-600 font-bold">*</span>
                              </label>
                              {promptPayType === 'PHONE' && payeePhone.trim() ? (
                                <button
                                  type="button"
                                  onClick={() => setPromptPayNumber(payeePhone.trim())}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-0.5"
                                >
                                  <span>+ ใช้เบอร์โทร</span>
                                </button>
                              ) : promptPayType === 'TAX_ID' && supplierTaxId.trim() ? (
                                <button
                                  type="button"
                                  onClick={() => setPromptPayNumber(supplierTaxId.trim())}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-0.5"
                                >
                                  <span>+ ใช้เลขผู้เสียภาษี</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-transparent select-none">&nbsp;</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={promptPayNumber}
                              onChange={(e) => setPromptPayNumber(e.target.value)}
                              placeholder={
                                promptPayType === 'PHONE'
                                  ? '08X-XXX-XXXX'
                                  : promptPayType === 'CITIZEN_ID'
                                  ? 'X-XXXX-XXXXX-XX-X'
                                  : promptPayType === 'TAX_ID'
                                  ? '0-XXXXXXXXXX-XX'
                                  : 'ระบุรหัส e-Wallet 15 หลัก'
                              }
                              className="w-full h-10 text-xs font-mono font-bold rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400 placeholder:font-normal shadow-2xs"
                            />
                            <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                              {PROMPTPAY_TYPES.find((t) => t.id === promptPayType)?.hint}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center justify-between min-h-[22px] mb-1">
                              <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                                <span>ชื่อบัญชีพร้อมเพย์</span>
                                <span className="text-gray-400 font-normal text-[10px]">(Account Name)</span>
                              </label>
                              {hasCustomAccountName ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHasCustomAccountName(false);
                                    setPromptPayAccountName(supplierName.trim());
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <RotateCcw size={11} />
                                  <span>รีเซ็ตตามชื่อผู้รับเงิน</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                                  <Check size={11} /> ดึงจากชื่อผู้รับเงินอัตโนมัติ
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={promptPayAccountName || (hasCustomAccountName ? '' : supplierName)}
                              onChange={(e) => {
                                setHasCustomAccountName(true);
                                setPromptPayAccountName(e.target.value);
                              }}
                              placeholder={supplierName ? `ตรงกับ "${supplierName}" อัตโนมัติ` : 'ระบุชื่อเจ้าของบัญชีพร้อมเพย์'}
                              className="w-full h-10 text-xs font-medium rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400 shadow-2xs"
                            />
                            <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                              {hasCustomAccountName
                                ? 'ระบุชื่อบัญชีเฉพาะ'
                                : 'ระบบดึงชื่อผู้รับเงินด้านบนมาใช้ให้อัตโนมัติ (ไม่ต้องพิมพ์ซ้ำ)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASH / CHEQUE TAB */}
                    {paymentMethod === 'CASH_CHEQUE' && (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between min-h-[22px] mb-1">
                          <label className="text-[11px] font-semibold text-gray-700">
                            รายละเอียดการจ่ายเงินสด / สั่งจ่ายเช็ค <span className="text-red-600">*</span>
                          </label>
                          <span className="text-[10px] text-gray-400">เงินสด / เช็คขีดคร่อม</span>
                        </div>
                        <input
                          type="text"
                          value={cashChequeNote}
                          onChange={(e) => setCashChequeNote(e.target.value)}
                          placeholder="เช่น เบิกเงินสดจากฝ่ายการเงินสำนักงานใหญ่ หรือ สั่งจ่ายเช็คขีดคร่อม A/C Payee Only"
                          className="w-full h-10 text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 shadow-2xs"
                        />
                        <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                          ระบุเงื่อนไขการรับเงินสดหน้างาน หรือชื่อผู้ถือเช็คสั่งจ่าย
                        </span>
                      </div>
                    )}

                    {/* Live AR / AP Preview Summary Card */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] flex items-center justify-between text-gray-700 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-gray-900">สรุปข้อมูลโอนเงินสำหรับฝ่ายบัญชี (AR/AP): </span>
                          <span className="text-gray-600">
                            {paymentMethod === 'BANK_TRANSFER' ? (
                              bankAccountNo.trim() ? (
                                <>
                                  <b className="text-gray-900">{selectedBankCode === 'OTHER' ? (customBankName || 'ธนาคารอื่นๆ') : THAI_BANKS.find(b => b.code === selectedBankCode)?.shortName}</b> • เลขที่ <b className="font-mono text-red-600">{bankAccountNo}</b> {bankAccountName || supplierName ? `(${bankAccountName || supplierName})` : ''}
                                </>
                              ) : <span className="text-amber-600 font-medium">ยังไม่ได้ระบุเลขที่บัญชี</span>
                            ) : paymentMethod === 'PROMPTPAY' ? (
                              promptPayNumber.trim() ? (
                                <>
                                  <b className="text-blue-700">พร้อมเพย์ ({PROMPTPAY_TYPES.find(t => t.id === promptPayType)?.shortLabel || 'พร้อมเพย์'})</b> • หมายเลข <b className="font-mono text-blue-700">{promptPayNumber}</b> {promptPayAccountName || supplierName ? `(${promptPayAccountName || supplierName})` : ''}
                                </>
                              ) : <span className="text-amber-600 font-medium">ยังไม่ได้ระบุหมายเลขพร้อมเพย์</span>
                            ) : (
                              cashChequeNote ? `เงินสด/เช็ค: ${cashChequeNote}` : 'เงินสด / เช็ค'
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider shrink-0 ml-2">
                        {paymentMethod === 'BANK_TRANSFER' ? 'BANK' : paymentMethod === 'PROMPTPAY' ? 'PROMPTPAY' : 'CASH'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* STEP 2: Requisition Items & บก.111 Management */}
        {(showAllSections || formStep === 2) && entryMode === 'MULTI_ITEMS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    ตารางรายการเบิกเงิน (Requisition Items & Multiple Suppliers)
                  </h2>
                  <p className="text-xs text-gray-500">
                    ระบุรายการสินค้า/บริการ พร้อมชื่อผู้จำหน่ายและวันที่ของแต่ละบิล (ระบบตรวจสอบความซ้ำซ้อนระดับแถวอัตโนมัติ)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">
                  {requisitionItems.length} รายการ
                </span>
                <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg font-medium">
                  รวม {Array.from(new Set(requisitionItems.map((i) => i.supplierName?.trim()).filter(Boolean))).length} ร้านค้า
                </span>
              </div>
            </div>

            {/* Quick Tax Batch Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50/90 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
                  กำหนดภาษีพร้อมกันทุกแถว:
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 font-medium">VAT:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyVatToAll('NO_VAT')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 transition shadow-2xs cursor-pointer"
                  >
                    ไม่มี VAT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyVatToAll('INCLUDED_7%')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 transition shadow-2xs cursor-pointer"
                  >
                    รวม VAT 7%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyVatToAll('7%')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 transition shadow-2xs cursor-pointer"
                  >
                    บวก VAT 7%
                  </button>
                </div>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 font-medium">WHT:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyWhtToAll('NONE')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 transition shadow-2xs cursor-pointer"
                  >
                    ไม่หัก (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWhtToAll('1%')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 transition shadow-2xs cursor-pointer"
                  >
                    1% ขนส่ง
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWhtToAll('3%')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 transition shadow-2xs cursor-pointer"
                  >
                    3% บริการ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWhtToAll('5%')}
                    className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 transition shadow-2xs cursor-pointer"
                  >
                    5% ค่าเช่า
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                * แต่ละรายการสามารถปรับเปลี่ยนแยกต่างหากได้
              </div>
            </div>

            {/* OCR Auto-Scan & Cross-Camera Duplicate Controls for Item Attachments */}
            <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-200/80 space-y-2">
              {renderOcrAutoScanControls()}
              {itemUploadingIdx !== null && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2 text-xs text-sky-800 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                  <span className="font-medium">
                    {uploadScanStatus || `กำลังสแกน OCR และตรวจสอบความซ้ำซ้อนรายการที่ ${itemUploadingIdx + 1}...`}
                  </span>
                </div>
              )}
            </div>

            {/* Interactive Items Table (Desktop / Tablet view >= md) */}
            <div className="hidden md:block border border-gray-200 rounded-xl overflow-x-auto text-xs shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200 text-center">
                    <th className="py-2.5 px-2 w-10 border-r border-gray-200">#</th>
                    <th className="py-2.5 px-2.5 w-32 border-r border-gray-200">วันที่บิล *</th>
                    <th className="py-2.5 px-3 w-44 text-left border-r border-gray-200">ผู้จำหน่าย / ร้านค้า *</th>
                    <th className="py-2.5 px-2.5 w-28 text-left border-r border-gray-200">เลขที่บิล (ถ้ามี)</th>
                    <th className="py-2.5 px-3 min-w-[180px] text-left border-r border-gray-200">รายการสินค้า / บริการ *</th>
                    <th className="py-2.5 px-3 w-32 text-right border-r border-gray-200">จำนวนเงิน (฿) *</th>
                    <th className="py-2.5 px-2 w-32 text-center border-r border-gray-200">ภาษี VAT</th>
                    <th className="py-2.5 px-2 w-32 text-center border-r border-gray-200">หัก ณ ที่จ่าย WHT</th>
                    <th className="py-2.5 px-3 w-32 text-right border-r border-gray-200">ยอดสุทธิ (฿)</th>
                    <th className="py-2.5 px-2 w-24 text-center border-r border-gray-200">จ่ายบัตรเครดิต</th>
                    <th className="py-2.5 px-2 w-32 text-center border-r border-gray-200" title="ติ๊กเลือกเมื่อไม่มีใบเสร็จรับเงิน เพื่อสร้างใบรับรองแทนใบเสร็จรับเงิน (บก.111 / Certification of Payment) แนบอัตโนมัติ">
                      บิลไม่สมบูรณ์ / ใบรับรองแทน
                    </th>
                    <th className="py-2.5 px-2.5 min-w-[155px] text-center border-r border-gray-200">
                      <div className="flex items-center justify-center gap-1 text-blue-700 font-bold">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>เอกสารแนบประจำบิล</span>
                      </div>
                      <span className="block text-[9px] font-medium text-blue-600/90 mt-0.5">
                        {ocrAutoScanEnabled ? 'ตรวจซ้ำ + OCR อัตโนมัติ' : 'ตรวจซ้ำอัตโนมัติ'}
                      </span>
                    </th>
                    <th className="py-2.5 px-2.5 min-w-[110px] text-left border-r border-gray-200">หมายเหตุ</th>
                    <th className="py-2.5 px-2 w-10 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requisitionItems.map((item, idx) => {
                    const itemTaxes = calculateItemTaxes(item);
                    // Check if this row is flagged as a duplicate
                    const isDupRow = dupResult?.exactMatches?.some(
                      (m: { matchType?: string; matchedItemIndex?: number }) => m.matchType === 'ITEM_DUPLICATE' && m.matchedItemIndex === idx + 1
                    );
                    const dupMatch = isDupRow
                      ? dupResult?.exactMatches?.find(
                          (m: { matchType?: string; matchedItemIndex?: number }) => m.matchType === 'ITEM_DUPLICATE' && m.matchedItemIndex === idx + 1
                        )
                      : null;

                    return (
                      <tr
                        key={item.id || idx}
                        className={`transition ${
                          isDupRow ? 'bg-red-50/70 border-l-4 border-l-red-600' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        {/* No. */}
                        <td className="py-2 px-2 text-center font-mono text-gray-500 border-r border-gray-100 align-top pt-3">
                          {idx + 1}
                        </td>

                        {/* Bill Date */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <input
                            type="date"
                            value={item.billDate}
                            onChange={(e) => handleUpdateItem(idx, 'billDate', e.target.value)}
                            className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                          />
                        </td>

                        {/* Supplier */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.supplierName}
                              onChange={(e) => handleUpdateItem(idx, 'supplierName', e.target.value)}
                              placeholder="เช่น บจก. มิสเตอร์.ดี.ไอ.วาย"
                              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white font-medium"
                            />
                            {idx > 0 && requisitionItems[idx - 1]?.supplierName && item.supplierName !== requisitionItems[idx - 1].supplierName && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateItem(idx, 'supplierName', requisitionItems[idx - 1].supplierName);
                                  if (requisitionItems[idx - 1].supplierTaxId) {
                                    handleUpdateItem(idx, 'supplierTaxId', requisitionItems[idx - 1].supplierTaxId);
                                  }
                                }}
                                className="text-[10px] text-red-600 hover:text-red-700 hover:underline block leading-none"
                              >
                                + ใช้ร้านเดียวกับแถวด้านบน
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Invoice Number */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <input
                            type="text"
                            value={item.invoiceNumber || ''}
                            onChange={(e) => handleUpdateItem(idx, 'invoiceNumber', e.target.value)}
                            placeholder="INV-XXXX"
                            className="w-full text-xs font-mono rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                          />
                        </td>

                        {/* Description */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <div className="space-y-1">
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                              placeholder="เช่น BK CLIPBOARD MIX 1s A4"
                              className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white"
                            />
                            {/* Smart OCR Item Suggestions */}
                            {!item.description &&
                              attachments.some(
                                (a) => (a.extractedLineItems && a.extractedLineItems.length > 0) || a.extractedDescription
                              ) && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {attachments
                                    .flatMap((a) => {
                                      if (a.extractedLineItems && a.extractedLineItems.length > 0) {
                                        return a.extractedLineItems;
                                      }
                                      if (a.extractedDescription) {
                                        return [{ description: a.extractedDescription, amount: a.extractedAmount }];
                                      }
                                      return [];
                                    })
                                    .slice(0, 4)
                                    .map((sug, sIdx) => (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateItem(idx, 'description', sug.description);
                                          if (sug.amount && (!item.amount || item.amount === 0)) {
                                            handleUpdateItem(idx, 'amount', sug.amount);
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition font-medium text-left"
                                        title="คลิกเพื่อเลือกรายการสินค้านี้"
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                        <span className="truncate max-w-[180px]">{sug.description}</span>
                                        {sug.amount ? (
                                          <span className="text-[9px] text-indigo-500 font-mono">
                                            ({Number(sug.amount).toLocaleString()}฿)
                                          </span>
                                        ) : null}
                                      </button>
                                    ))}
                                </div>
                              )}
                            {isDupRow && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                                <span>รายการนี้ตรงกับคำขอ {dupMatch?.pay_number}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.amount === 0 ? '' : item.amount}
                            onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full text-xs font-mono font-bold text-right rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white text-gray-900"
                          />
                        </td>

                        {/* VAT Selector */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <select
                            value={item.vatType || 'NO_VAT'}
                            onChange={(e) => handleUpdateItem(idx, 'vatType', e.target.value)}
                            className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-1.5 focus:ring-1 focus:ring-red-500 bg-white text-gray-800 font-medium"
                          >
                            <option value="NO_VAT">ไม่มี VAT (0%)</option>
                            <option value="INCLUDED_7%">รวม VAT 7%</option>
                            <option value="7%">บวก VAT 7%</option>
                          </select>
                          {itemTaxes.vatAmount > 0 ? (
                            <div className={`mt-1 text-[10px] font-mono font-semibold px-1 py-0.5 rounded text-center truncate ${
                              item.vatType === 'INCLUDED_7%'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                              {item.vatType === 'INCLUDED_7%' ? 'ในยอด ' : '+'}
                              {itemTaxes.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-gray-400 text-center font-mono">0.00 ฿</div>
                          )}
                        </td>

                        {/* WHT Selector */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <select
                            value={item.whtType || 'NONE'}
                            onChange={(e) => handleUpdateItem(idx, 'whtType', e.target.value)}
                            className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-1.5 focus:ring-1 focus:ring-red-500 bg-white text-gray-800 font-medium"
                          >
                            <option value="NONE">ไม่หัก (0%)</option>
                            <option value="1%">1% ขนส่ง</option>
                            <option value="2%">2% โฆษณา</option>
                            <option value="3%">3% บริการ</option>
                            <option value="5%">5% ค่าเช่า</option>
                          </select>
                          {itemTaxes.whtAmount > 0 ? (
                            <div className="mt-1 text-[10px] font-mono font-semibold px-1 py-0.5 rounded text-center bg-amber-50 text-amber-900 border border-amber-200 truncate">
                              -{itemTaxes.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-gray-400 text-center font-mono">0.00 ฿</div>
                          )}
                        </td>

                        {/* Row Net Amount */}
                        <td className="py-1.5 px-2 border-r border-gray-100 text-right align-top pt-2.5 font-mono font-bold text-gray-900">
                          <div>
                            {itemTaxes.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-[10px] text-gray-500 ml-1">฿</span>
                          </div>
                          {item.paidByCreditCard && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded block mt-0.5">
                              จ่ายบัตรเครดิต
                            </span>
                          )}
                        </td>

                        {/* Credit Card Checkbox */}
                        <td className="py-1.5 px-2 border-r border-gray-100 text-center align-top pt-2.5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(item.paidByCreditCard)}
                              onChange={() => handleToggleCreditCard(idx)}
                              className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                            />
                            <span className={item.paidByCreditCard ? 'font-bold text-amber-800' : 'text-gray-400'}>
                              {item.paidByCreditCard ? 'บัตรเครดิต' : 'เงินสด/โอน'}
                            </span>
                          </label>
                        </td>

                        {/* Irregular Bill / Substitute Receipt Checkbox & PDF Generator */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top text-center pt-2">
                          <div className="flex flex-col items-center gap-1">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-700">
                              <input
                                type="checkbox"
                                checked={Boolean(item.isIrregularBill)}
                                onChange={() => handleToggleIrregularBill(idx)}
                                disabled={Boolean(isGeneratingCertMap[idx])}
                                className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className={item.isIrregularBill ? 'font-bold text-amber-900' : 'text-gray-400'}>
                                {item.isIrregularBill ? 'ไม่มีใบเสร็จ' : 'บิลปกติ'}
                              </span>
                            </label>

                            {isGeneratingCertMap[idx] && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium animate-pulse mt-0.5">
                                <RefreshCw className="w-3 h-3 animate-spin" /> สร้าง PDF...
                              </span>
                            )}

                            {item.isIrregularBill && !isGeneratingCertMap[idx] && (() => {
                              const itemGroupKey = getSubstituteGroupKey(item.supplierName, item.billDate);
                              const groupMatches = itemGroupKey
                                ? requisitionItems.filter(
                                    (it) => it.isIrregularBill && getSubstituteGroupKey(it.supplierName, it.billDate) === itemGroupKey
                                  )
                                : [];
                              const groupCount = groupMatches.length;
                              const isMerged =
                                groupCount > 1 &&
                                groupMatches.every(
                                  (it) => it.substituteCertificateUrl && it.substituteCertificateUrl === groupMatches[0].substituteCertificateUrl
                                );

                              return (
                                <div className="flex flex-col items-center gap-1 mt-0.5">
                                  {groupCount > 1 && !isMerged && (
                                    <button
                                      type="button"
                                      onClick={() => syncGroupSubstituteCertificate(itemGroupKey, requisitionItems)}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-2xs cursor-pointer animate-pulse"
                                      title="คลิกเพื่อรวมรายการของร้านและวันนี้เข้าเป็น PDF ใบรับรองฉบับเดียว"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      รวม PDF ({groupCount} รายการ)
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenSubstituteModal(idx)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition shadow-2xs cursor-pointer"
                                    title={
                                      groupCount > 1
                                        ? `ดูตัวอย่าง แก้ไข หรือพิมพ์ใบรับรอง (รวม ${groupCount} รายการ ร้านค้าและวันที่เดียวกัน)`
                                        : 'ดูตัวอย่าง แก้ไข หรือพิมพ์ใบรับรองแทนใบเสร็จรับเงิน'
                                    }
                                  >
                                    <FileText className="w-3 h-3 text-amber-700" />
                                    {item.substituteCertificateUrl
                                      ? groupCount > 1
                                        ? `ดู/แก้ไข PDF (รวม ${groupCount} รายการ)`
                                        : 'ดู/แก้ไข PDF'
                                      : 'สร้างเอกสาร'}
                                  </button>

                                  {groupCount > 1 && (
                                    <span className="inline-block text-[9px] font-medium text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                      รวมร้านและวันที่เดียวกัน
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Item Attachments */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top min-w-[140px]">
                          <div className="space-y-1.5">
                            {/* Upload Button */}
                            <label className={`flex items-center justify-center gap-1 w-full py-1 px-1.5 rounded-lg border border-dashed text-[11px] font-medium transition cursor-pointer ${
                              itemUploadingIdx === idx
                                ? 'bg-blue-50 border-blue-300 text-blue-500 pointer-events-none'
                                : 'bg-gray-50/80 hover:bg-blue-50/70 border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-700'
                            }`}>
                              {itemUploadingIdx === idx ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                  <span>กำลังตรวจ/สแกน...</span>
                                </>
                              ) : (
                                <>
                                  <Paperclip className="w-3 h-3 text-blue-600" />
                                  <span>+ แนบไฟล์บิลนี้</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                multiple
                                className="hidden"
                                disabled={itemUploadingIdx === idx}
                                onChange={(e) => handleItemAttachmentUpload(idx, e)}
                              />
                            </label>

                            {/* Item Attachments List */}
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                                {item.attachments.map((att: ItemAttachment, aIdx: number) => (
                                  <div
                                    key={att.id || aIdx}
                                    className="p-1 px-1.5 rounded-md bg-blue-50/90 border border-blue-200 text-[10px] text-blue-900 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 min-w-0 flex-1 hover:underline text-blue-700 font-semibold truncate"
                                        title={att.fileName}
                                      >
                                        <FileText className="w-3 h-3 shrink-0 text-blue-600" />
                                        <span className="truncate">{att.fileName}</span>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItemAttachment(idx, aIdx)}
                                        className="text-gray-400 hover:text-red-600 p-0.5 rounded transition shrink-0 ml-1"
                                        title="ลบไฟล์นี้"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {renderItemAttachmentBadges(att)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Remarks */}
                        <td className="py-1.5 px-2 border-r border-gray-100 align-top">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => handleUpdateItem(idx, 'remarks', e.target.value)}
                            placeholder="หมายเหตุ (ถ้ามี)"
                            className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white text-gray-600"
                          />
                        </td>

                        {/* Delete Button */}
                        <td className="py-1.5 px-2 text-center align-top pt-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot className="bg-gray-50/90 border-t-2 border-gray-200 text-xs">
                  {/* Total Amount Row */}
                  <tr className="border-b border-gray-200 font-semibold bg-gray-50/90">
                    <td colSpan={5} className="py-2.5 px-3 text-right text-gray-700 border-r border-gray-200 font-bold">
                      ยอดรวมทั้งสิ้น (Total Subtotal):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 border-r border-gray-200">
                      {multiItemsSummary.totalRawAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700 border-r border-gray-200 text-xs">
                      {multiItemsSummary.totalVatAmount > 0
                        ? `+${multiItemsSummary.totalVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-800 border-r border-gray-200 text-xs">
                      {multiItemsSummary.totalWhtAmount > 0
                        ? `-${multiItemsSummary.totalWhtAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-gray-900 border-r border-gray-200">
                      {multiItemsSummary.totalNetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </td>
                    <td colSpan={5} className="px-3 text-gray-500 text-[11px]">
                      รวม {requisitionItems.length} รายการ (ก่อนหักบัตรเครดิต)
                    </td>
                  </tr>

                  {/* Credit Card Deduction Row */}
                  <tr className="border-b border-gray-200 text-red-700 bg-red-50/40">
                    <td colSpan={8} className="py-2 px-3 text-right font-medium border-r border-gray-200">
                      หักยอดที่จ่ายด้วยบัตรเครดิต:
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-gray-200 font-mono font-bold text-red-700">
                      {effectiveCcDeduction > 0 ? (
                        <span>-{effectiveCcDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                      ) : (
                        <span className="text-gray-400 font-normal">0.00 ฿</span>
                      )}
                    </td>
                    <td colSpan={5} className="px-3 text-red-700 text-[10px]">
                      หักยอดที่บริษัท/พนักงานรูดบัตรเครดิตออกจากการเบิกเงินสด
                    </td>
                  </tr>

                  {/* Net Requisition Amount Row */}
                  <tr className="bg-gray-100/90 font-bold">
                    <td colSpan={8} className="py-3 px-3 text-right text-gray-900 text-sm border-r border-gray-200">
                      จำนวนเงินที่เบิก (ยอดเบิกจ่ายสุทธิ Net Payable):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-600 font-extrabold text-base border-r border-gray-200">
                      {multiItemsSummary.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </td>
                    <td colSpan={5} className="px-3 text-gray-700 text-[11px] font-normal truncate">
                      ({bahtText})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Touch-Friendly Item Cards (Mobile phone view < md) */}
            <div className="block md:hidden space-y-3">
              {requisitionItems.map((item, idx) => {
                const itemTaxes = calculateItemTaxes(item);
                const isDupRow = dupResult?.exactMatches?.some(
                  (m: { matchType?: string; matchedItemIndex?: number }) => m.matchType === 'ITEM_DUPLICATE' && m.matchedItemIndex === idx + 1
                );
                const dupMatch = isDupRow
                  ? dupResult?.exactMatches?.find(
                      (m: { matchType?: string; matchedItemIndex?: number }) => m.matchType === 'ITEM_DUPLICATE' && m.matchedItemIndex === idx + 1
                    )
                  : null;

                const itemGroupKey = getSubstituteGroupKey(item.supplierName, item.billDate);
                const groupMatches = itemGroupKey
                  ? requisitionItems.filter(
                      (it) => it.isIrregularBill && getSubstituteGroupKey(it.supplierName, it.billDate) === itemGroupKey
                    )
                  : [];
                const groupCount = groupMatches.length;
                const isMerged =
                  groupCount > 1 &&
                  groupMatches.every(
                    (it) => it.substituteCertificateUrl && it.substituteCertificateUrl === groupMatches[0].substituteCertificateUrl
                  );

                return (
                  <div
                    key={item.id || idx}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-2xs space-y-3 ${
                      isDupRow
                        ? 'bg-red-50/80 border-red-300 ring-2 ring-red-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Card Header: Item No, Badges, Net Amount, Delete */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          รายการที่ {idx + 1}
                        </span>
                        {item.paidByCreditCard && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            บัตรเครดิต
                          </span>
                        )}
                        {item.isIrregularBill && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                            บิลไม่สมบูรณ์
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block leading-tight">ยอดสุทธิ</span>
                          <span className="text-xs font-mono font-extrabold text-red-600">
                            ฿{itemTaxes.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {requisitionItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Duplicate Alert if matched */}
                    {isDupRow && (
                      <div className="p-2 bg-red-100/90 text-red-800 rounded-xl border border-red-300 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>รายการนี้ตรงกับคำขอ <b>{dupMatch?.pay_number}</b></span>
                      </div>
                    )}

                    {/* Description (รายการสินค้า / บริการ) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-700">
                        รายการสินค้า / บริการ <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                        placeholder="เช่น ค่าอุปกรณ์สำนักงาน, สายไฟ VAF"
                        className="w-full text-xs rounded-xl border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-red-500 bg-white font-medium"
                      />
                      {/* Smart OCR Item Suggestions */}
                      {!item.description &&
                        attachments.some(
                          (a) => (a.extractedLineItems && a.extractedLineItems.length > 0) || a.extractedDescription
                        ) && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {attachments
                              .flatMap((a) => {
                                if (a.extractedLineItems && a.extractedLineItems.length > 0) {
                                  return a.extractedLineItems;
                                }
                                if (a.extractedDescription) {
                                  return [{ description: a.extractedDescription, amount: a.extractedAmount }];
                                }
                                return [];
                              })
                              .slice(0, 3)
                              .map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateItem(idx, 'description', sug.description);
                                    if (sug.amount && (!item.amount || item.amount === 0)) {
                                      handleUpdateItem(idx, 'amount', sug.amount);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition font-medium"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  <span className="truncate max-w-[160px]">{sug.description}</span>
                                  {sug.amount ? <span className="font-mono text-indigo-600">({Number(sug.amount).toLocaleString()}฿)</span> : null}
                                </button>
                              ))}
                          </div>
                        )}
                    </div>

                    {/* Amount & Date in 2 columns */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          จำนวนเงิน (฿) <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.amount === 0 ? '' : item.amount}
                          onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full text-xs font-mono font-bold text-right rounded-xl border border-gray-300 py-2 px-2.5 focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          วันที่บิล <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="date"
                          value={item.billDate}
                          onChange={(e) => handleUpdateItem(idx, 'billDate', e.target.value)}
                          className="w-full text-xs rounded-xl border border-gray-300 py-2 px-2 focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* Supplier & Invoice Number in 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-gray-700">
                            ผู้จำหน่าย / ร้านค้า <span className="text-red-600">*</span>
                          </label>
                          {idx > 0 && requisitionItems[idx - 1]?.supplierName && item.supplierName !== requisitionItems[idx - 1].supplierName && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateItem(idx, 'supplierName', requisitionItems[idx - 1].supplierName);
                                if (requisitionItems[idx - 1].supplierTaxId) {
                                  handleUpdateItem(idx, 'supplierTaxId', requisitionItems[idx - 1].supplierTaxId);
                                }
                              }}
                              className="text-[10px] text-red-600 hover:underline"
                            >
                              + ใช้ร้านเดิม
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.supplierName}
                          onChange={(e) => handleUpdateItem(idx, 'supplierName', e.target.value)}
                          placeholder="เช่น บจก. มิสเตอร์.ดี.ไอ.วาย"
                          className="w-full text-xs rounded-xl border border-gray-300 py-2 px-2.5 focus:ring-2 focus:ring-red-500 bg-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                          เลขที่บิล (ถ้ามี)
                        </label>
                        <input
                          type="text"
                          value={item.invoiceNumber || ''}
                          onChange={(e) => handleUpdateItem(idx, 'invoiceNumber', e.target.value)}
                          placeholder="INV-XXXX"
                          className="w-full text-xs font-mono rounded-xl border border-gray-300 py-2 px-2.5 focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* VAT & WHT Selectors Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">
                          ภาษี VAT
                        </label>
                        <select
                          value={item.vatType || 'NO_VAT'}
                          onChange={(e) => handleUpdateItem(idx, 'vatType', e.target.value)}
                          className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-1.5 focus:ring-1 focus:ring-red-500 bg-white text-gray-800 font-medium"
                        >
                          <option value="NO_VAT">ไม่มี VAT</option>
                          <option value="INCLUDED_7%">รวม VAT 7%</option>
                          <option value="7%">บวก VAT 7%</option>
                        </select>
                        <div className="mt-1 text-[10px] font-mono font-semibold text-center text-blue-700">
                          {itemTaxes.vatAmount > 0 ? (
                            item.vatType === 'INCLUDED_7%'
                              ? `ในยอด ${itemTaxes.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿`
                              : `+${itemTaxes.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿`
                          ) : '0.00 ฿'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-1">
                          หัก ณ ที่จ่าย WHT
                        </label>
                        <select
                          value={item.whtType || 'NONE'}
                          onChange={(e) => handleUpdateItem(idx, 'whtType', e.target.value)}
                          className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-1.5 focus:ring-1 focus:ring-red-500 bg-white text-gray-800 font-medium"
                        >
                          <option value="NONE">ไม่หัก (0%)</option>
                          <option value="1%">1% ขนส่ง</option>
                          <option value="2%">2% โฆษณา</option>
                          <option value="3%">3% บริการ</option>
                          <option value="5%">5% ค่าเช่า</option>
                        </select>
                        <div className="mt-1 text-[10px] font-mono font-semibold text-center text-amber-800">
                          {itemTaxes.whtAmount > 0 ? `-${itemTaxes.whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿` : '0.00 ฿'}
                        </div>
                      </div>
                    </div>

                    {/* Toggles: Credit Card & Irregular Bill */}
                    <div className="space-y-2 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(item.paidByCreditCard)}
                            onChange={() => handleToggleCreditCard(idx)}
                            className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                          />
                          <span className={item.paidByCreditCard ? 'font-bold text-amber-900 text-[11px]' : 'text-gray-600 text-[11px]'}>
                            จ่ายบัตรเครดิต
                          </span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-700">
                          <input
                            type="checkbox"
                            checked={Boolean(item.isIrregularBill)}
                            onChange={() => handleToggleIrregularBill(idx)}
                            disabled={Boolean(isGeneratingCertMap[idx])}
                            className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                          />
                          <span className={item.isIrregularBill ? 'font-bold text-amber-900 text-[11px]' : 'text-gray-600 text-[11px]'}>
                            ไม่มีใบเสร็จ (บก.111)
                          </span>
                        </label>
                      </div>

                      {/* Irregular Bill PDF Actions on Mobile */}
                      {item.isIrregularBill && !isGeneratingCertMap[idx] && (
                        <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex flex-wrap items-center gap-1.5">
                          {groupCount > 1 && !isMerged && (
                            <button
                              type="button"
                              onClick={() => syncGroupSubstituteCertificate(itemGroupKey, requisitionItems)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-2xs cursor-pointer animate-pulse"
                            >
                              <Sparkles className="w-3 h-3" />
                              รวม PDF ({groupCount} รายการ)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenSubstituteModal(idx)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-800" />
                            <span>{item.substituteCertificateUrl ? (groupCount > 1 ? `ดู/แก้ไข PDF (${groupCount} รายการ)` : 'ดู/แก้ไข PDF') : 'สร้างเอกสารใบรับรอง'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Attachment Upload for this Bill */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-blue-600" />
                          <span>เอกสารแนบประจำบิลนี้ ({item.attachments?.length || 0})</span>
                        </label>
                        <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {ocrAutoScanEnabled ? 'ตรวจซ้ำ + OCR ข้ามกล้อง' : 'ตรวจซ้ำ'}
                        </span>
                      </div>

                      <label className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-dashed text-xs font-bold transition cursor-pointer ${
                        itemUploadingIdx === idx
                          ? 'bg-blue-50 border-blue-300 text-blue-500 pointer-events-none'
                          : 'bg-blue-50/60 hover:bg-blue-100/70 border-blue-300 text-blue-700'
                      }`}>
                        {itemUploadingIdx === idx ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>กำลังตรวจ/สแกน...</span>
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                            <span>+ แนบไฟล์ / ถ่ายรูปบิลนี้</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className="hidden"
                          disabled={itemUploadingIdx === idx}
                          onChange={(e) => handleItemAttachmentUpload(idx, e)}
                        />
                      </label>

                      {item.attachments && item.attachments.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {item.attachments.map((att: ItemAttachment, aIdx: number) => (
                            <div
                              key={att.id || aIdx}
                              className="p-1.5 px-2 rounded-lg bg-blue-50/90 border border-blue-200 text-[11px] text-blue-900"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 min-w-0 flex-1 hover:underline text-blue-700 font-semibold truncate"
                                  title={att.fileName}
                                >
                                  <FileText className="w-3 h-3 shrink-0 text-blue-600" />
                                  <span className="truncate">{att.fileName}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemAttachment(idx, aIdx)}
                                  className="text-gray-400 hover:text-red-600 p-0.5 rounded transition shrink-0 ml-1"
                                  title="ลบไฟล์นี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {renderItemAttachmentBadges(att)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Remarks */}
                    <div>
                      <input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => handleUpdateItem(idx, 'remarks', e.target.value)}
                        placeholder="หมายเหตุเพิ่มเติมของรายการนี้ (ถ้ามี)"
                        className="w-full text-xs rounded-xl border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white text-gray-700"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Mobile Table Summary Footer Card */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-600">
                  <span>ยอดรวมสินค้า/บริการ (Subtotal):</span>
                  <span className="font-mono font-bold text-gray-900">
                    {multiItemsSummary.totalRawAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                  </span>
                </div>
                {multiItemsSummary.totalVatAmount > 0 && (
                  <div className="flex justify-between items-center text-blue-800">
                    <span>รวม VAT 7%:</span>
                    <span className="font-mono font-bold">
                      +{multiItemsSummary.totalVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                )}
                {multiItemsSummary.totalWhtAmount > 0 && (
                  <div className="flex justify-between items-center text-amber-800">
                    <span>รวมหัก ณ ที่จ่าย (WHT):</span>
                    <span className="font-mono font-bold">
                      -{multiItemsSummary.totalWhtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                )}
                {effectiveCcDeduction > 0 && (
                  <div className="flex justify-between items-center text-red-700">
                    <span>หักยอดจ่ายบัตรเครดิต:</span>
                    <span className="font-mono font-bold">
                      -{effectiveCcDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-900">ยอดเบิกจ่ายสุทธิ:</span>
                  <span className="font-mono font-extrabold text-red-600 text-base">
                    {multiItemsSummary.netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 text-right truncate">
                  ({bahtText})
                </p>
              </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 shadow-2xs hover:border-gray-400 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-red-600" />
                  <span>+ เพิ่มรายการใหม่ (ร้านค้าใหม่)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 shadow-2xs transition"
                >
                  <ListPlus className="w-3.5 h-3.5 text-red-600" />
                  <span>+ เพิ่มรายการในบิลเดิม (คัดลอกร้านค้าและวันที่)</span>
                </button>
                {attachments.some(
                  (a) => (a.extractedLineItems && a.extractedLineItems.length > 0) || (a.extractedDescription && !/(?:ต้นฉบับ|สำเนา|ด้นฉบับ)?\s*(?:ใบกำกับภาษี|ใบเสร็จรับเงิน|ใบเสร็จ|ใบส่งของ|ใบแจ้งหนี้|บิลเงินสด|TAX\s*INVOICE|RECEIPT)/i.test(a.extractedDescription))
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      const allExtracted: RequisitionItem[] = [];
                      attachments.forEach((att) => {
                        const effectiveDate = (att.extractedDate ? formatDateToISO(att.extractedDate) : null) || att.extractedDate || documentDate || getTodayStr();
                        if (att.extractedLineItems && att.extractedLineItems.length > 0) {
                          att.extractedLineItems.forEach((li: any) => {
                            allExtracted.push(
                              buildDefaultRequisitionItem({
                                billDate: effectiveDate,
                                supplierName: att.extractedSupplier || supplierName || '',
                                supplierTaxId: att.extractedTaxId || supplierTaxId || '',
                                invoiceNumber: att.extractedInvoiceNo || invoiceNumber || '',
                                description: li.description,
                                amount: li.amount || 0,
                              })
                            );
                          });
                        } else if (att.extractedDescription && !/(?:ต้นฉบับ|สำเนา|ด้นฉบับ)?\s*(?:ใบกำกับภาษี|ใบเสร็จรับเงิน|ใบเสร็จ|ใบส่งของ|ใบแจ้งหนี้|บิลเงินสด|TAX\s*INVOICE|RECEIPT)/i.test(att.extractedDescription)) {
                          allExtracted.push(
                            buildDefaultRequisitionItem({
                              billDate: effectiveDate,
                              supplierName: att.extractedSupplier || supplierName || '',
                              supplierTaxId: att.extractedTaxId || supplierTaxId || '',
                              invoiceNumber: att.extractedInvoiceNo || invoiceNumber || '',
                              description: att.extractedDescription,
                              amount: att.extractedAmount || 0,
                            })
                          );
                        }
                      });

                      if (allExtracted.length > 0) {
                        if (requisitionItems.length === 1 && !requisitionItems[0].description) {
                          setRequisitionItems(allExtracted);
                        } else {
                          setRequisitionItems((prev) => [...prev, ...allExtracted]);
                        }
                        Swal.mixin({ toast: true, position: 'top-end', timer: 2500, showConfirmButton: false }).fire({
                          icon: 'success',
                          title: `นำเข้ารายการสินค้า ${allExtracted.length} รายการจากเอกสารแนบเรียบร้อย`,
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 shadow-2xs transition"
                    title="ดึงรายการสินค้าหรือบริการทั้งหมดที่ตรวจพบจากบิล/เอกสารแนบลงในตารางอัตโนมัติ"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      ดึงรายการสินค้าจากบิลแนบ (
                      {attachments.reduce(
                        (sum, a) => sum + (a.extractedLineItems?.length || (a.extractedDescription && !/(?:ต้นฉบับ|สำเนา|ด้นฉบับ)?\s*(?:ใบกำกับภาษี|ใบเสร็จรับเงิน|ใบเสร็จ|ใบส่งของ|ใบแจ้งหนี้|บิลเงินสด|TAX\s*INVOICE|RECEIPT)/i.test(a.extractedDescription) ? 1 : 0)),
                        0
                      )}{' '}
                      รายการ)
                    </span>
                  </button>
                )}
              </div>

              <span className="text-[11px] text-gray-500">
                * หากซื้อสินค้าจากร้านเดียวกันหลายรายการ สามารถกดปุ่ม &quot;เพิ่มรายการในบิลเดิม&quot; ได้ทันที
              </span>
            </div>

            {/* Unified บก.111 (Substitute Receipt) Hub */}
            {(() => {
              const irregularWithIdx = requisitionItems
                .map((it, idx) => ({ item: it, idx }))
                .filter(({ item }) => item.isIrregularBill);

              if (irregularWithIdx.length === 0) {
                return (
                  <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <b>ไม่มีใบเสร็จรับเงิน?</b> ติ๊กช่อง{' '}
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                          ไม่มีใบเสร็จ
                        </span>{' '}
                        ในรายการด้านบน เพื่อสร้างใบรับรองแทนใบเสร็จ (<b>บก.111</b>) อัตโนมัติ
                      </span>
                    </div>
                  </div>
                );
              }

              const groupsMap = new Map<
                string,
                {
                  groupKey: string;
                  firstIdx: number;
                  supplier: string;
                  billDate: string;
                  total: number;
                  count: number;
                  hasPdf: boolean;
                  hasMergedAll: boolean;
                  hasRequesterSig: boolean;
                  pdfUrl?: string;
                  isGenerating: boolean;
                }
              >();

              irregularWithIdx.forEach(({ item, idx }) => {
                const gk = getSubstituteGroupKey(item.supplierName, item.billDate);
                const mapKey = gk || `__single_${idx}`;
                const existing = groupsMap.get(mapKey);
                const amt = Number(item.amount) || 0;
                const isGen = Boolean(isGeneratingCertMap[idx]);
                if (!existing) {
                  groupsMap.set(mapKey, {
                    groupKey: gk,
                    firstIdx: idx,
                    supplier: item.supplierName?.trim() || `รายการ #${idx + 1} (ยังไม่ระบุชื่อร้านค้า)`,
                    billDate: item.billDate || '-',
                    total: amt,
                    count: 1,
                    hasPdf: Boolean(item.substituteCertificateUrl),
                    hasMergedAll: Boolean(item.substituteCertificateUrl),
                    hasRequesterSig: Boolean(item.requesterSignatureUrl || formRequesterSig),
                    pdfUrl: item.substituteCertificateUrl,
                    isGenerating: isGen,
                  });
                } else {
                  existing.total += amt;
                  existing.count += 1;
                  existing.hasMergedAll =
                    existing.hasMergedAll &&
                    Boolean(item.substituteCertificateUrl) &&
                    item.substituteCertificateUrl === existing.pdfUrl;
                  existing.hasPdf = existing.hasPdf && Boolean(item.substituteCertificateUrl);
                  existing.isGenerating = existing.isGenerating || isGen;
                }
              });

              const groups = Array.from(groupsMap.values());
              const readyCount = groups.filter((g) => g.hasPdf && g.hasMergedAll && g.hasRequesterSig).length;

              return (
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white border-2 border-amber-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                          ศูนย์จัดการใบรับรองแทนใบเสร็จ (บก.111) — {groups.length} ฉบับ
                        </h3>
                        <p className="text-[11px] text-amber-900/80">
                          ผู้เบิกลงนามเฉพาะช่อง <b>ผู้เบิกจ่าย</b> ให้เรียบร้อย (ช่องหัวหน้างานจะส่งให้หัวหน้าเซ็นตอนอนุมัติ)
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        readyCount === groups.length
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {readyCount === groups.length
                        ? (<>เตรียมเอกสารครบแล้ว <Check size={12} /></>)
                        : `พร้อมแล้ว ${readyCount}/${groups.length} ฉบับ`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {groups.map((g, gIdx) => (
                      <div
                        key={gIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-amber-200/80 text-xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-gray-900 truncate">{g.supplier}</span>
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              วันที่ {g.billDate}
                            </span>
                            <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                              {g.count} รายการ • {g.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                            </span>
                          </div>
                          <div>
                            {g.hasPdf && g.hasMergedAll && g.hasRequesterSig ? (
                              <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> สร้าง PDF และเซ็นชื่อผู้เบิกแล้ว
                              </span>
                            ) : g.hasPdf && g.hasMergedAll ? (
                              <span className="text-[11px] text-amber-700 font-semibold inline-flex items-center gap-1">
                                <PenLine className="w-3.5 h-3.5 text-amber-600" /> สร้าง PDF แล้ว (กดปุ่มขวาเพื่อตรวจสอบ/วาดลายเซ็นผู้เบิก)
                              </span>
                            ) : (
                              <span className="text-[11px] text-orange-700 font-semibold inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> ยังไม่รวม / ยังไม่ได้สร้างไฟล์ บก.111
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {g.count > 1 && g.groupKey && !g.hasMergedAll && (
                            <button
                              type="button"
                              disabled={g.isGenerating}
                              onClick={() => syncGroupSubstituteCertificate(g.groupKey, requisitionItems)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles className="w-3 h-3" /> รวม PDF ({g.count} รายการ)
                            </button>
                          )}
                          {g.pdfUrl && (
                            <a
                              href={g.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 transition"
                            >
                              <Eye className="w-3 h-3" /> ดู PDF
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenSubstituteModal(g.firstIdx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-2xs cursor-pointer"
                          >
                            <PenLine className="w-3 h-3" />
                            <span>{g.hasPdf ? 'แก้ไข / เซ็น บก.111' : 'สร้าง & เซ็น บก.111'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Integrated Financial Breakdown for Requisition Items */}
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      ข้อมูลจำนวนเงินและภาษี (Financial Breakdown & Tax Calculation)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      กำหนดภาษีมูลค่าเพิ่ม (VAT), ภาษีหัก ณ ที่จ่าย (WHT) และสรุปยอดเบิกจ่ายสุทธิของรายการในตาราง
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                    ยอดรวมบิล {itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                  </span>
                </div>
              </div>

              {/* 3 Symmetrical Cards: VAT Summary, WHT Summary, and Credit Card Deduction */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. VAT Breakdown Card */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between min-h-[22px] mb-1">
                      <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                        <span>ภาษีมูลค่าเพิ่มรวม (Total VAT)</span>
                      </label>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                        {multiItemsSummary.totalVatAmount > 0 ? `+${multiItemsSummary.totalVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿` : 'ไม่มี VAT'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-600 font-mono">
                      <div className="flex justify-between">
                        <span>มูลค่าสินค้าก่อน VAT:</span>
                        <span className="font-semibold text-slate-800">{multiItemsSummary.totalPreVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                      </div>
                      <div className="flex justify-between text-blue-800 font-bold">
                        <span>รวม VAT 7% ในตาราง:</span>
                        <span>+{multiItemsSummary.totalVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-200/60 text-[10px] text-blue-700">
                    * คำนวณอัตโนมัติตามอัตรา VAT ในแต่ละแถว
                  </div>
                </div>

                {/* 2. WHT Breakdown Card */}
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between min-h-[22px] mb-1">
                      <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                        <span>ภาษีหัก ณ ที่จ่ายรวม (Total WHT)</span>
                      </label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {multiItemsSummary.totalWhtAmount > 0 ? `-${multiItemsSummary.totalWhtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿` : 'ไม่หัก'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-600 font-mono">
                      <div className="flex justify-between">
                        <span>ยอดก่อนหักภาษี (Gross):</span>
                        <span className="font-semibold text-slate-800">{multiItemsSummary.totalGrossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                      </div>
                      <div className="flex justify-between text-amber-800 font-bold">
                        <span>รวมหัก ณ ที่จ่ายในตาราง:</span>
                        <span>-{multiItemsSummary.totalWhtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200/60 text-[10px] text-amber-700">
                    * คำนวณอัตโนมัติตามอัตรา WHT ในแต่ละแถว
                  </div>
                </div>

                {/* 3. Credit Card Deduction */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between min-h-[22px] mb-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                        <span>หักยอดจ่ายบัตรเครดิต</span>
                      </label>
                      {effectiveCcDeduction > 0 && (
                        <span className="text-[10px] text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          -{effectiveCcDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                        </span>
                      )}
                    </div>

                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={creditCardDeduction}
                        onChange={(e) => setCreditCardDeduction(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 text-xs font-mono font-bold text-gray-900 rounded-xl border border-gray-300 py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">฿</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-200/60 min-h-[32px] flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 truncate">
                      {effectiveCcDeduction > 0
                        ? 'หักยอดรูดบัตร (ไม่เบิกเงินสด)'
                        : 'ติ๊ก "บัตรเครดิต" ในตารางเพื่อหักอัตโนมัติ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Symmetrical Modern Red Net Payable Box */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-red-100">
                    ยอดชำระสุทธิ (NET PAYMENT AMOUNT)
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    THB (฿)
                  </span>
                </div>

                <div className="text-3xl font-mono font-extrabold tracking-tight">
                  {netPayable.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-base font-normal ml-1.5 text-red-100">บาท</span>
                </div>

                {/* Thai Baht text preview */}
                <div className="bg-black/15 backdrop-blur-xs p-2 rounded-xl text-xs text-white/95 font-medium flex items-center gap-1.5 truncate">
                  <span className="opacity-75 shrink-0">ตัวอักษร:</span>
                  <span className="truncate font-semibold">({bahtText})</span>
                </div>

                {/* Subtotal calculation note & Approval Tier */}
                <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-red-100/90 font-mono">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      ยอดก่อน VAT: {effectiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </span>
                    {calculatedVat > 0 && (
                      <span>VAT: +{calculatedVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                    )}
                    {calculatedWht > 0 && (
                      <span>WHT: -{calculatedWht.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                    )}
                    {effectiveCcDeduction > 0 && (
                      <span>หักบัตร: -{effectiveCcDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] bg-white/15 px-2 py-0.5 rounded-lg text-white font-sans">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>ระดับการอนุมัติ: {approvalTier}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Document Details, Purpose & Supporting Evidence */}
        {(showAllSections || formStep === 3) && (
        <div className="space-y-6">
        {/* Row 2: Card 3 (Document & Purpose) */}
        <div className="grid grid-cols-1 gap-6">
          {/* Card 3: รายละเอียดเอกสาร & วัตถุประสงค์ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <h2 className="text-sm font-bold text-gray-900">
                  ข้อมูลเอกสารและวัตถุประสงค์ (Document & Purpose)
                </h2>
              </div>

              <div className="space-y-4">
                {/* Symmetrical Date Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      วันที่ทำใบเบิกเงิน <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                      className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        วันที่ต้องการให้จ่าย (Due Date)
                        {urgency === 'EMERGENCY' && <span className="text-red-600 font-bold ml-1">* ด่วนที่สุด</span>}
                      </label>
                      {urgency === 'EMERGENCY' && (
                        <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          ซิงค์กับความเร่งด่วน Card 1
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      required={urgency === 'EMERGENCY'}
                      value={requestedPaymentDate}
                      onChange={(e) => setRequestedPaymentDate(e.target.value)}
                      className={`w-full text-xs rounded-xl border py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 ${
                        urgency === 'EMERGENCY' ? 'border-red-400 font-bold bg-red-50/20' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 text-xs text-red-950 flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <span className="font-bold text-red-900">รายการเบิกเงินหลายรายการ / หลายผู้จำหน่าย:</span>{' '}
                    <span className="text-gray-700">
                      เลขที่บิลและผู้จำหน่ายจะบันทึกแยกรายแถวในตารางรายการเบิกเงินด้านบน
                    </span>
                  </div>
                </div>

                {/* Purpose Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ชื่องาน / วัตถุประสงค์การขอเบิก (Job / Purpose) <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="เช่น เบิกซื้อวัสดุสนับสนุนงานขาย, ค่าใช้จ่ายประจำสาขา, ซื้ออุปกรณ์สำนักงาน"
                    className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 leading-relaxed"
                  />
                  {/* Suggestions from uploaded documents if purpose is empty */}
                  {!purpose &&
                    attachments.some(
                      (a) => (a.extractedLineItems && a.extractedLineItems.length > 0) || a.extractedDescription
                    ) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> จากเอกสารแนบ:
                        </span>
                        {attachments
                          .flatMap((a) => {
                            if (a.extractedLineItems && a.extractedLineItems.length > 0) {
                              return a.extractedLineItems;
                            }
                            if (a.extractedDescription) {
                              return [{ description: a.extractedDescription }];
                            }
                            return [];
                          })
                          .slice(0, 3)
                          .map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => setPurpose(sug.description)}
                              className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg transition font-medium text-left truncate max-w-[280px]"
                              title="คลิกเพื่อใช้วัตถุประสงค์นี้"
                            >
                              {sug.description}
                            </button>
                          ))}
                      </div>
                    )}
                </div>

                {/* Cost Center & PO/PR (Symmetrical 2 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      โครงการ / ศูนย์ต้นทุน (Cost Center)
                    </label>
                    <input
                      type="text"
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      placeholder="เช่น PRJ-CHONBURI-01"
                      className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      เลขที่ PO / PR อ้างอิง
                    </label>
                    <input
                      type="text"
                      value={poPrNumber}
                      onChange={(e) => setPoPrNumber(e.target.value)}
                      placeholder="ระบุเลขที่ หรือ เหตุผลที่ไม่มี"
                      className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Card 5 (Full Width Symmetrical Evidence Card) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                5
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  เอกสารหลักฐานแนบ (Supporting Evidence)
                </h2>
                <p className="text-xs text-gray-500">
                  แนบใบเสร็จ, ใบกำกับภาษี, ใบส่งของ, ภาพถ่ายสินค้า หรืองานบริการ (PDF, PNG, JPG ไม่เกิน 50MB)
                </p>
              </div>
            </div>

            <span className="text-xs text-gray-500 font-mono">
              แนบแล้ว {attachments.length} ไฟล์
            </span>
          </div>

          {/* Upload Area Controls */}
          <div className="mb-2">{renderOcrAutoScanControls()}</div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 hover:border-red-400 bg-gray-50/60 hover:bg-red-50/20 rounded-2xl p-6 text-center transition">
            <input
              type="file"
              multiple
              id="file-upload"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-red-500 hover:text-red-600 rounded-xl text-xs font-bold text-gray-700 cursor-pointer shadow-2xs transition"
            >
              <Upload className="w-4 h-4 text-red-600" />
              {isUploading ? (uploadScanStatus || 'กำลังตรวจสอบและอัปโหลดไฟล์...') : '+ คลิกเพื่อเลือกไฟล์เอกสารแนบ'}
            </label>
            <p className="text-[11px] text-gray-400 mt-2">
              สามารถเลือกหลายไฟล์พร้อมกันได้ (ระบบจะตรวจจับ QR สลิป, อ่านข้อมูล OCR และตรวจจับความซ้ำซ้อนจากคนละกล้องอัตโนมัติ)
            </p>

            {isUploading && (
              <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2.5 text-xs text-sky-800 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                <span className="font-medium">{uploadScanStatus || 'กำลังตรวจสอบและอัปโหลดเอกสาร...'}</span>
              </div>
            )}
          </div>

          {/* Uploaded File Grid */}
          {attachments.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs hover:border-gray-300 transition"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    {att.url && (att.url.match(/\.(jpg|jpeg|png|webp)/i) || att.fileType?.startsWith('image/')) ? (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100 block group relative hover:opacity-90 transition"
                        title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                      >
                        <img
                          src={att.url}
                          alt={att.fileName}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-red-600 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-gray-900 hover:text-red-600 truncate block underline"
                      >
                        {att.fileName}
                      </a>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-gray-400 font-mono">ไฟล์ #{idx + 1}</span>
                        {(att as any).isSubstituteCertificate && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            <FileText className="w-2.5 h-2.5 text-amber-700" /> ใบรับรองแทนใบเสร็จ (บก.111)
                          </span>
                        )}
                        {(att.fileHash || att.visualHash) && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> ตรวจสอบแล้ว ไม่ซ้ำ
                          </span>
                        )}
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
                            onClick={() => openOcrRawTextModal(att.rawTextSnippet)}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold text-gray-600 bg-white hover:bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 transition cursor-pointer shadow-2xs"
                            title="คลิกเพื่อดูข้อความที่ OCR อ่านได้ทั้งหมด"
                          >
                            <Eye className="w-2.5 h-2.5 text-gray-500" /> ดูข้อความ OCR
                          </button>
                        )}
                        {(att.extractedInvoiceNo ||
                          (att.extractedAmount && att.extractedAmount > 0) ||
                          att.extractedSupplier ||
                          att.extractedDescription) && (
                          <button
                            type="button"
                            onClick={() => {
                              const normalizedExtractedDate = att.extractedDate
                                ? (formatDateToISO(att.extractedDate) || att.extractedDate)
                                : '';
                              if (att.extractedInvoiceNo) setInvoiceNumber(att.extractedInvoiceNo);
                              if (att.extractedSupplier) setSupplierName(att.extractedSupplier);
                              if (att.extractedAmount) setSubtotalAmount(String(att.extractedAmount));
                              if (att.extractedTaxId) setSupplierTaxId(att.extractedTaxId);
                              if (normalizedExtractedDate) setDocumentDate(normalizedExtractedDate);
                              if (att.extractedDescription) setPurpose(att.extractedDescription);

                              const effectiveDate = normalizedExtractedDate || documentDate || getTodayStr();
                              // If in MULTI_ITEMS mode or table exists, populate requisition items
                              if (att.extractedLineItems && att.extractedLineItems.length > 0) {
                                const newRows: RequisitionItem[] = att.extractedLineItems.map((li: any) =>
                                  buildDefaultRequisitionItem({
                                    billDate: effectiveDate,
                                    supplierName: att.extractedSupplier || supplierName || '',
                                    supplierTaxId: att.extractedTaxId || supplierTaxId || '',
                                    invoiceNumber: att.extractedInvoiceNo || invoiceNumber || '',
                                    description: li.description,
                                    amount:
                                      li.amount ||
                                      (att.extractedLineItems!.length === 1 && att.extractedAmount
                                        ? att.extractedAmount
                                        : 0),
                                  })
                                );
                                if (requisitionItems.length === 1 && !requisitionItems[0].description) {
                                  setRequisitionItems(newRows);
                                } else {
                                  setRequisitionItems((prev) => [...prev, ...newRows]);
                                }
                              } else if (att.extractedDescription && !/(?:ต้นฉบับ|สำเนา|ด้นฉบับ)?\s*(?:ใบกำกับภาษี|ใบเสร็จรับเงิน|ใบเสร็จ|ใบส่งของ|ใบแจ้งหนี้|บิลเงินสด|TAX\s*INVOICE|RECEIPT)/i.test(att.extractedDescription)) {
                                setRequisitionItems((prev) => {
                                  const first = prev[0];
                                  if (prev.length === 1 && (!first.description || !first.amount)) {
                                    return [
                                      {
                                        ...first,
                                        billDate:
                                          normalizedExtractedDate ||
                                          first.billDate ||
                                          documentDate ||
                                          getTodayStr(),
                                        supplierName: att.extractedSupplier || first.supplierName || supplierName || '',
                                        supplierTaxId: att.extractedTaxId || first.supplierTaxId || supplierTaxId || '',
                                        invoiceNumber: att.extractedInvoiceNo || first.invoiceNumber || invoiceNumber || '',
                                        description: att.extractedDescription!,
                                        amount: att.extractedAmount || first.amount || 0,
                                      },
                                    ];
                                  }
                                  return [
                                    ...prev,
                                    buildDefaultRequisitionItem({
                                      billDate: effectiveDate,
                                      supplierName: att.extractedSupplier || supplierName || '',
                                      supplierTaxId: att.extractedTaxId || supplierTaxId || '',
                                      invoiceNumber: att.extractedInvoiceNo || invoiceNumber || '',
                                      description: att.extractedDescription!,
                                      amount: att.extractedAmount || 0,
                                    }),
                                  ];
                                });
                              }

                              Swal.mixin({ toast: true, position: 'top-end', timer: 2000, showConfirmButton: false }).fire({
                                icon: 'success',
                                title: 'นำข้อมูลและรายการสินค้าจาก OCR ลงฟอร์มเรียบร้อย',
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition cursor-pointer"
                            title="นำข้อมูลและรายการสินค้าจาก OCR ลงในฟอร์มคำขอ"
                          >
                            <ArrowRight className="w-2.5 h-2.5 text-blue-600" /> นำข้อมูลลงฟอร์ม
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="ลบไฟล์นี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        )}

        {/* STEP 4: Final Review Checklist & Submit */}
        {!showAllSections && formStep === 4 && (() => {
          const resolvedBranchVal = branch === 'อื่นๆ (ระบุ)' ? customBranch.trim() : branch.trim();
          const validRows = requisitionItems.filter((it) => it.description.trim() && Number(it.amount) > 0);
          const irregularRows = requisitionItems.filter((it) => it.isIrregularBill);
          const pendingSubCertRows = irregularRows.filter(
            (it) => !it.substituteCertificateUrl || (!it.requesterSignatureUrl && !formRequesterSig)
          );
          const totalFilesCount =
            attachments.length + requisitionItems.reduce((acc, it) => acc + (it.attachments?.length || 0), 0);

          const payeeAccountSummary =
            paymentMethod === 'PROMPTPAY'
              ? `พร้อมเพย์: ${promptPayNumber || 'ยังไม่ระบุ'}`
              : paymentMethod === 'CASH_CHEQUE'
              ? `เงินสด/เช็ค${cashChequeNote ? `: ${cashChequeNote}` : ''}`
              : `${bankName} ${bankAccountNo ? `(${bankAccountNo})` : '(ยังไม่ระบุเลขบัญชี)'}`;

          const checks = [
            {
              step: 1 as const,
              title: '1. บริษัท ผู้รับเงิน & หัวหน้าผู้อนุมัติ',
              ok: Boolean(
                requesterName.trim() &&
                  resolvedBranchVal &&
                  (isCurrentUserManagerial || supervisorName.trim())
              ),
              detail: `${company} • ${resolvedBranchVal || 'ยังไม่เลือกสาขา'} • โอนให้: ${supplierName.trim() || requesterName || '-'} (${payeeAccountSummary}) • หัวหน้างาน: ${
                supervisorId === '__NONE__'
                  ? 'ส่งบัญชีโดยตรง'
                  : supervisorName.trim() || 'ยังไม่เลือกหัวหน้างาน'
              }`,
            },
            {
              step: 2 as const,
              title: '2. รายการเบิกจ่าย',
              ok: validRows.length > 0 && effectiveSubtotal > 0,
              detail:
                validRows.length > 0
                  ? `${validRows.length} รายการ • ยอดสุทธิ ${netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿`
                  : 'กรุณาระบุชื่อรายการและจำนวนเงินอย่างน้อย 1 รายการ',
            },
            {
              step: 3 as const,
              title: '3. วัตถุประสงค์ & เอกสารแนบ',
              ok: Boolean(documentDate.trim() && purpose.trim()),
              detail: purpose.trim()
                ? `"${purpose.trim()}" • เอกสารแนบ ${totalFilesCount} ไฟล์`
                : 'กรุณาระบุวัตถุประสงค์การขอเบิก',
            },
            ...(irregularRows.length > 0
              ? [
                  {
                    step: 2 as const,
                    title: 'ใบรับรองแทนใบเสร็จ (บก.111)',
                    ok: pendingSubCertRows.length === 0,
                    detail:
                      pendingSubCertRows.length === 0
                        ? `สร้างและเซ็นผู้เบิกครบ ${irregularRows.length} รายการแล้ว (พร้อมส่งให้หัวหน้าเซ็นตอนอนุมัติ)`
                        : `ยังมี ${pendingSubCertRows.length} รายการที่รอสร้าง PDF หรือเซ็นผู้เบิก`,
                  },
                ]
              : []),
          ];

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    4
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      ตรวจทานความครบถ้วนก่อนส่งคำขอ (Final Checklist)
                    </h2>
                    <p className="text-xs text-gray-500">
                      ตรวจสอบยอดเงินปลายทาง เอกสารแนบ และ บก.111 ให้เรียบร้อยก่อนกดส่งอนุมัติ
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                  {checks.filter((c) => c.ok).length}/{checks.length} รายการพร้อม
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Checklist Cards */}
                <div className="lg:col-span-7 space-y-2.5">
                  {checks.map((c, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        c.ok ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/70 border-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {c.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-900 block">{c.title}</span>
                          <span className="text-[11px] text-gray-600 block break-words">{c.detail}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToFormStep(c.step)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-white border border-gray-200 hover:border-red-300 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
                      >
                        {c.ok ? 'แก้ไข' : 'ไปกรอก'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Right Net Summary Box */}
                <div className="lg:col-span-5 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] text-red-100 font-bold uppercase">
                    <span>ยอดชำระสุทธิทั้งหมด</span>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">{company}</span>
                  </div>
                  <div className="text-3xl font-mono font-extrabold">
                    {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-sm font-normal text-red-100">บาท</span>
                  </div>
                  <p className="text-xs bg-black/15 p-2 rounded-xl text-white/95 font-medium truncate">
                    ({bahtText})
                  </p>
                  <div className="pt-2 border-t border-white/20 text-[11px] text-red-100 space-y-1">
                    <div className="flex justify-between">
                      <span>ความเร่งด่วน:</span>
                      <span className="font-bold text-white">
                        {urgency === 'EMERGENCY' ? `ด่วนที่สุด (${requestedPaymentDate || '-'})` : 'ปกติ'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ระดับอนุมัติ:</span>
                      <span className="font-bold text-white truncate max-w-[190px]">{approvalTier}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quick Prev / Next Step Bar for Steps 1–3 */}
        {!showAllSections && formStep < 4 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-3 text-xs">
              {formStep > 1 && (
                <button
                  type="button"
                  onClick={() => goToFormStep((formStep - 1) as 1 | 2 | 3 | 4)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
              )}
              <div className="text-gray-600">
                <span className="text-[11px] text-gray-400 block">ยอดรวมปัจจุบัน</span>
                <span className="font-mono font-bold text-red-600 text-sm">
                  {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                </span>
                <span className="text-[11px] text-gray-400 ml-1.5">({requisitionItems.length} รายการ)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => goToFormStep((formStep + 1) as 1 | 2 | 3 | 4)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <span>
                {formStep === 1
                  ? 'ถัดไป: กรอกรายการเบิก & บก.111'
                  : formStep === 2
                  ? 'ถัดไป: วัตถุประสงค์ & แนบไฟล์'
                  : 'ถัดไป: ตรวจทานก่อนส่ง'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {(showAllSections || formStep === 4) && (
        <>
        {/* Resubmission Note / Explanation in Edit Mode */}
        {isEditMode && initialData?.status === 'RETURN_DOCUMENT' && (
          <div className="bg-orange-50/90 border border-orange-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-orange-950">
              <MessageSquare className="w-4 h-4 text-orange-600" />
              <span>ชี้แจงการแก้ไข / ตอบกลับฝ่ายบัญชี (Resubmission Note)</span>
              <span className="text-[11px] font-normal text-orange-700">(ระบุหรือไม่ก็ได้)</span>
            </div>
            <textarea
              value={resubmitExplanation}
              onChange={(e) => setResubmitExplanation(e.target.value)}
              placeholder="ระบุข้อความชี้แจงการแก้ไข เช่น แนบใบเสร็จตัวจริงฉบับใหม่แล้ว, แก้ไขยอดเงินตามบิลเรียบร้อยแล้ว, ฯลฯ"
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-orange-300 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white text-gray-800 placeholder-gray-400"
            />
          </div>
        )}

        {/* Bottom Symmetrical Action Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-gray-500">
            {isEditMode && initialData ? (
              <>
                <span className={`px-2.5 py-1 rounded-full font-bold border inline-block text-center sm:text-left ${
                  initialData.status === 'RETURN_DOCUMENT'
                    ? 'bg-orange-100 text-orange-900 border-orange-300'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  สถานะ: {getStatusMeta(initialData.status).label}
                </span>
                <span className="text-center sm:text-left">
                  กำลังแก้ไขเอกสารเลขที่ <b className="font-mono text-gray-900">{initialData.pay_number}</b>
                </span>
              </>
            ) : (
              <>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 inline-block text-center sm:text-left">
                  {supervisorId === '__NONE__' || (isCurrentUserManagerial && !supervisorName.trim())
                    ? 'สถานะเริ่มต้น: ส่งตรงฝ่ายบัญชีตรวจสอบ (SUBMITTED)'
                    : `สถานะเริ่มต้น: รอหัวหน้างานอนุมัติ${supervisorName ? ` (${supervisorName})` : ''}`}
                </span>
                <span className="text-center sm:text-left">
                  ระบบจะสร้างเลขที่ <b className="font-mono text-gray-900">PAY-{company}-YYMM-XXXXX</b> อัตโนมัติ
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end">
            <Link
              href={isEditMode && initialData ? `/accounting/payment-requests/${initialData.id}` : "/accounting/payment-requests"}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-center transition"
            >
              ยกเลิก
            </Link>

            <button
              type="button"
              onClick={() => {
                setPendingShouldResubmit(isEditMode ? true : false);
                setShowPreSubmitReviewModal(true);
              }}
              className="w-full sm:w-auto px-3.5 py-3 sm:py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
              title="ตรวจสอบเอกสารแนบทั้งหมดก่อนส่ง"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>ตรวจสอบเอกสารแนบ ({attachments.length + requisitionItems.reduce((acc, it) => acc + (it.attachments?.length || 0), 0)} ไฟล์)</span>
            </button>

            {isEditMode && initialData ? (
              <>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={isSubmitting || Boolean(dupResult?.isExactDuplicate)}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="บันทึกข้อมูลที่แก้ไขไว้ชั่วคราว ยังไม่ส่งฝ่ายบัญชีตรวจ"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>บันทึกการแก้ไข (Save Only)</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSubmitting || Boolean(dupResult?.isExactDuplicate)}
                  className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center justify-center gap-2 ${
                    dupResult?.isExactDuplicate
                      ? 'bg-gray-400 cursor-not-allowed opacity-75'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50'
                  }`}
                  title="บันทึกข้อมูลและส่งกลับไปให้ฝ่ายบัญชีตรวจสอบทันที"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> กำลังส่งข้อมูล...
                    </>
                  ) : dupResult?.isExactDuplicate ? (
                    <>
                      <ShieldAlert className="w-4 h-4" /> ระงับการส่ง (ตรวจพบข้อมูลซ้ำ)
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> บันทึกและส่งตรวจอีกครั้ง (Resubmit)
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || Boolean(dupResult?.isExactDuplicate)}
                className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center justify-center gap-2 ${
                  dupResult?.isExactDuplicate
                    ? 'bg-gray-400 cursor-not-allowed opacity-75'
                    : 'bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> กำลังส่งคำขอ...
                  </>
                ) : dupResult?.isExactDuplicate ? (
                  <>
                    <ShieldAlert className="w-4 h-4" /> ระงับการส่ง (ตรวจพบข้อมูลซ้ำ)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> ส่งคำขอเบิกจ่าย (Submit Request)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        </>
        )}
      </form>
        </>
      ) : (
        /* My Requests Status Dashboard */
        <div className="space-y-6 animate-in fade-in">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">คำขอทั้งหมดของฉัน</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono text-gray-900">{myRequests.length}</span>
                <span className="text-xs text-gray-400">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> รอตรวจสอบ / รออนุมัติ
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono text-amber-600">{pendingCount}</span>
                <span className="text-xs text-amber-600/70">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> อนุมัติแล้ว / พร้อมโอน
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono text-indigo-600">{approvedCount}</span>
                <span className="text-xs text-indigo-600/70">รายการ</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> โอนเงินสำเร็จแล้ว
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-600">{paidCount}</span>
                <span className="text-xs text-emerald-600/70">รายการ</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={requestSearchQuery}
                onChange={(e) => setRequestSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่ PAY No., ผู้รับเงิน/ผู้ขาย, วัตถุประสงค์, สาขา, เลขบิล..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-red-500 rounded-xl outline-none transition"
              />
              {requestSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRequestSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="bg-transparent text-gray-700 font-medium text-xs outline-none cursor-pointer"
                >
                  <option value="ALL">สถานะทั้งหมด ({myRequests.length})</option>
                  <option value="PENDING">รอตรวจสอบ/รออนุมัติ ({pendingCount})</option>
                  <option value="READY">อนุมัติแล้ว/พร้อมโอน ({approvedCount})</option>
                  <option value="PAID">โอนเงินสำเร็จ ({paidCount})</option>
                  {attentionCount > 0 && (
                    <option value="ATTENTION">ต้องตรวจสอบ / ส่งคืน ({attentionCount})</option>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={refreshMyRequests}
                disabled={isLoadingRequests}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition disabled:opacity-50"
                title="รีเฟรชข้อมูลสถานะล่าสุด"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin text-red-600' : ''}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-2xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>สร้างคำขอใหม่</span>
              </button>
            </div>
          </div>

          {/* List of Requests */}
          {filteredMyRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-2xs space-y-4">
              <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
                <FileText className="w-7 h-7" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-bold text-gray-800">
                  {requestSearchQuery || requestStatusFilter !== 'ALL'
                    ? 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'
                    : 'ยังไม่มีประวัติคำขอเบิกเงิน'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {requestSearchQuery || requestStatusFilter !== 'ALL'
                    ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองสถานะใหม่อีกครั้ง'
                    : 'เมื่อคุณส่งคำขอเบิกเงิน รายการทั้งหมดจะแสดงขั้นตอนและสถานะการอนุมัติที่นี่'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <Sparkles className="w-4 h-4" /> เริ่มสร้างคำขอเบิกเงินใหม่
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMyRequests.map((req) => {
                const meta = getStatusMeta(req.status);
                const isCopied = copiedPayNo === req.pay_number;
                const isAttention = meta.step < 0;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 shadow-2xs transition-all overflow-hidden"
                  >
                    {/* Top Row: PAY No, Branch, Company, Status */}
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                          <span className="font-mono text-xs font-bold text-gray-900 tracking-tight">
                            {req.pay_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPayNo(req.pay_number)}
                            className="text-gray-400 hover:text-red-600 transition"
                            title="คัดลอกเลขที่คำขอ"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            req.company === 'TG'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : req.company === 'TE'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {req.company === 'TG' ? 'Tera Group' : req.company === 'TE' ? 'Tera Electric' : 'Tera Power'}
                        </span>

                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {req.branch}
                        </span>

                        {req.urgency === 'EMERGENCY' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-rose-600 text-rose-600" /> ด่วนที่สุด
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 font-medium w-24 shrink-0">ผู้รับเงิน / ผู้ขาย:</span>
                            <span className="font-bold text-gray-900 text-sm">{req.supplier_name}</span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 font-medium w-24 shrink-0">วัตถุประสงค์:</span>
                            <span className="text-gray-700 leading-relaxed font-normal">{req.purpose}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-gray-500 pt-1">
                            {req.invoice_number && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400">เลขที่บิล:</span>
                                <span className="font-mono font-medium text-gray-800">{req.invoice_number}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400">วันที่เอกสาร:</span>
                              <span className="font-medium text-gray-800">{formatDisplayDate(req.document_date)}</span>
                            </div>
                            {(req.bank_name || req.bank_account_no) && (
                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200 text-[11px]">
                                {req.payment_method === 'PROMPTPAY' || req.bank_name?.includes('พร้อมเพย์') ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">พร้อมเพย์</span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-800">ธนาคาร</span>
                                )}
                                <span className="font-medium text-gray-800">{req.bank_name}</span>
                                {req.bank_account_no && (
                                  <span className="font-mono font-bold text-gray-900">{req.bank_account_no}</span>
                                )}
                                {req.bank_account_name && (
                                  <span className="text-gray-500 text-[10px]">({req.bank_account_name})</span>
                                )}
                                {req.bank_account_no && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyPayNo(req.bank_account_no || '');
                                    }}
                                    title="คัดลอกเลขบัญชี"
                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            ยอดขอเบิกสุทธิ
                          </span>
                          <div className="my-1">
                            <span className="text-xl sm:text-2xl font-bold font-mono text-red-600">
                              ฿{Number(req.net_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-200/60 pt-1 mt-1">
                            <span>ก่อนภาษี: {Number(req.subtotal_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                            {Number(req.vat_amount || 0) > 0 && <span>VAT: +{Number(req.vat_amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                            {Number(req.wht_amount || 0) > 0 && <span>WHT: -{Number(req.wht_amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Visual Stepper / Status Alert */}
                      <div className="border-t border-gray-100 pt-4">
                        {isAttention ? (
                          <div
                            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                              req.status === 'HOLD_DUPLICATE'
                                ? 'bg-red-50/90 border-red-200 text-red-950'
                                : 'bg-orange-50/90 border-orange-200 text-orange-950'
                            }`}
                          >
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                            <div className="text-xs leading-relaxed space-y-1">
                              <p className="font-bold text-sm flex items-center gap-1.5">
                                {req.status === 'HOLD_DUPLICATE' ? (
                                  <>
                                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 inline" />
                                    <span>รายการนี้ถูกระงับชั่วคราวเพื่อตรวจสอบความซ้ำซ้อน (Hold Duplicate)</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-4 h-4 text-orange-600 shrink-0 inline" />
                                    <span>ฝ่ายบัญชีส่งคืนเอกสารเพื่อแก้ไข (Document Returned)</span>
                                  </>
                                )}
                              </p>
                              {req.duplicate_reason && (
                                <p className="text-gray-700">สาเหตุ: {req.duplicate_reason}</p>
                              )}
                              {req.ap_notes && (
                                <p className="text-gray-700 font-medium">หมายเหตุฝ่ายบัญชี: {req.ap_notes}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="relative pt-1 pb-1">
                            <div className="grid grid-cols-4 gap-2 relative">
                              {[
                                {
                                  step: 1,
                                  name: 'ยื่นคำขอ',
                                  info: req.created_at ? new Date(req.created_at).toLocaleDateString('th-TH') : '',
                                },
                                {
                                  step: 2,
                                  name: 'บัญชีตรวจสอบ',
                                  info: req.ap_checked_by ? req.ap_checked_by : 'รอตรวจสอบ',
                                },
                                {
                                  step: 3,
                                  name: 'อนุมัติสั่งจ่าย',
                                  info: req.approved_by ? req.approved_by : 'รออนุมัติ',
                                },
                                {
                                  step: 4,
                                  name: 'โอนเงินแล้ว',
                                  info: req.paid_date ? formatDisplayDate(req.paid_date) : 'รอรอบจ่าย',
                                },
                              ].map((st) => {
                                const isDone = meta.step > st.step;
                                const isCurrent = meta.step === st.step;
                                return (
                                  <div key={st.step} className="flex flex-col items-center text-center">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                                        isDone
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : isCurrent
                                          ? 'bg-white border-red-600 text-red-600 shadow-sm ring-4 ring-red-50'
                                          : 'bg-white border-gray-200 text-gray-300'
                                      }`}
                                    >
                                      {isDone ? <Check className="w-3.5 h-3.5" /> : st.step}
                                    </div>
                                    <span
                                      className={`text-xs mt-1.5 font-medium ${
                                        isCurrent
                                          ? 'font-bold text-red-600'
                                          : isDone
                                          ? 'text-gray-800'
                                          : 'text-gray-400'
                                      }`}
                                    >
                                      {st.name}
                                    </span>
                                    <span className="text-[10px] text-gray-400 truncate max-w-full">
                                      {st.info}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                        <span>สร้างเมื่อ {req.created_at ? new Date(req.created_at).toLocaleString('th-TH') : '-'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.payment_slip_url && (
                          <a
                            href={req.payment_slip_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> สลิปโอนเงิน
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedVoucherRequest(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-semibold transition shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-red-600" />
                          พิมพ์ใบสำคัญจ่าย (PDF)
                        </button>

                        {req.status === 'RETURN_DOCUMENT' && (
                          <Link
                            href={`/accounting/payment-requests/${req.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-300 bg-orange-500 hover:bg-orange-600 text-white font-bold transition shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            แก้ไขเอกสารและส่งใหม่
                          </Link>
                        )}

                        <Link
                          href={`/accounting/payment-requests/${req.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-2xs"
                        >
                          ดูรายละเอียด <ExternalLink className="w-3.5 h-3.5" />
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

      {/* Modal: Printable Payment Voucher */}
      {selectedVoucherRequest && (
        <PrintablePaymentVoucher
          request={selectedVoucherRequest}
          onClose={() => setSelectedVoucherRequest(null)}
          onUpdate={(updated) => {
            setSelectedVoucherRequest(updated);
            setMyRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      )}

      {/* Modal: Substitute Receipt Certificate (ใบรับรองแทนใบเสร็จรับเงิน) */}
      {substituteModalOpen && substituteModalData && (
        <SubstituteReceiptModal
          isOpen={substituteModalOpen}
          initialData={substituteModalData}
          signingRole="requester"
          defaultSigTab="requester"
          defaultApproverName={supervisorId !== '__NONE__' ? supervisorName : ''}
          defaultApproverId={supervisorId !== '__NONE__' ? supervisorId : ''}
          supervisorOptions={supervisorOptions}
          currentUserId={currentUser?.id || ''}
          currentUserEmpId={currentUser?.employeeId || null}
          saveButtonLabel="บันทึกลายเซ็นผู้เบิกและแนบ PDF บก.111"
          onClose={() => {
            setSubstituteModalOpen(false);
            setActiveSubstituteItemIdx(null);
            setSubstituteModalData(null);
          }}
          onSaveAndAttach={handleModalSaveAndAttach}
        />
      )}

      {/* Modal: Pre-Submission Document Review (ตรวจสอบเอกสารแนบก่อนส่งคำขออนุมัติ) */}
      {showPreSubmitReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    ตรวจสอบเอกสารแนบก่อนส่งคำขอ (Pre-Submission Review)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    โปรดตรวจสอบเอกสารแนบประจำบิลและเอกสารทั่วไปให้ครบถ้วนก่อนส่งให้ผู้อนุมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreSubmitReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs text-gray-700 flex-1">
              {/* Summary Banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-blue-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">
                    เอกสารแนบรวมทั้งหมด {attachments.length + requisitionItems.reduce((acc, it) => acc + (it.attachments?.length || 0), 0)} ไฟล์
                  </span>
                </div>
                <div className="text-[11px] text-blue-700 space-x-2">
                  <span>บิลประจำรายการ: <b>{requisitionItems.reduce((acc, it) => acc + (it.attachments?.length || 0), 0)}</b></span>
                  <span>|</span>
                  <span>เอกสารทั่วไป: <b>{attachments.length}</b></span>
                </div>
              </div>

              {/* Section 1: Item-level Attachments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-red-600" />
                    เอกสารแนบประจำรายการเบิกเงิน ({requisitionItems.length} รายการ)
                  </h4>
                  <span className="text-[10px] text-gray-500">บิลและเอกสารเฉพาะของแต่ละรายการ</span>
                </div>

                <div className="space-y-2.5">
                  {requisitionItems.map((it, idx) => {
                    const itAtts = Array.isArray(it.attachments) ? it.attachments : [];
                    return (
                      <div key={it.id || idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-gray-900 text-xs">
                              รายการที่ {idx + 1}: {it.description || '(ยังไม่ระบุชื่อสินค้า/บริการ)'}
                            </span>
                            <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span>ร้านค้า: <b>{it.supplierName || 'ไม่ระบุ'}</b></span>
                              {it.invoiceNumber && <span>เลขที่บิล: <b>{it.invoiceNumber}</b></span>}
                              <span>วันที่: <b>{it.billDate || '-'}</b></span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-gray-900 text-xs shrink-0">
                            {Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </span>
                        </div>

                        {/* Attachments for this item */}
                        {itAtts.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {itAtts.map((att: ItemAttachment, aIdx: number) => {
                              const isImage = att.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.fileName || att.url);
                              return (
                                <a
                                  key={att.id || aIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:shadow-xs transition group"
                                >
                                  {isImage ? (
                                    <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                      <img src={att.url} alt={att.fileName} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-blue-600">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-800 text-[11px] truncate group-hover:text-blue-600">
                                      {att.fileName}
                                    </p>
                                    <p className="text-[10px] text-gray-400">คลิกเพื่อเปิดดูไฟล์</p>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        ) : it.isIrregularBill && it.substituteCertificateUrl ? (
                          <div className="pt-1">
                            <a
                              href={it.substituteCertificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 font-medium text-[11px] transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-700" />
                              <span>ใบรับรองแทนใบเสร็จรับเงิน (บก.111 / PDF)</span>
                              <ExternalLink className="w-3 h-3 text-amber-700" />
                            </a>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic pt-0.5">
                            * ไม่มีเอกสารแนบเฉพาะรายการนี้ (ใช้เอกสารแนบทั่วไป)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: General Attachments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    เอกสารแนบทั่วไป / ใบเสร็จหลัก ({attachments.length} ไฟล์)
                  </h4>
                  <span className="text-[10px] text-gray-500">เอกสารประกอบการขอเบิกภาพรวม</span>
                </div>

                {attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att, aIdx) => {
                      const isImage = att.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.fileName || att.url);
                      return (
                        <a
                          key={att.id || aIdx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:shadow-xs transition group"
                        >
                          {isImage ? (
                            <div className="w-9 h-9 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                              <img src={att.url} alt={att.fileName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200 text-gray-600">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 text-[11px] truncate group-hover:text-blue-600">
                              {att.fileName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'เอกสารแนบ'} • คลิกเพื่อดูตัวอย่าง
                            </p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-gray-300 text-center text-gray-400 text-xs">
                    ไม่มีเอกสารแนบทั่วไป
                  </div>
                )}
              </div>
            </div>

            {dupResult?.isExactDuplicate && (
              <div className="mx-4 sm:mx-6 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>ตรวจพบเอกสารซ้ำซ้อนในระบบ ({dupResult.exactMatches?.[0]?.pay_number || 'Duplicate'}) จึงปิดการส่งคำขอนี้ไว้</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPreSubmitReviewModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 text-center transition cursor-pointer"
              >
                ย้อนกลับไปแก้ไข
              </button>

              <button
                type="button"
                onClick={() => executeActualSubmit(pendingShouldResubmit)}
                disabled={isSubmitting || Boolean(dupResult?.isExactDuplicate)}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    กำลังส่งข้อมูล...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ยืนยันความถูกต้องและส่งคำขอ (Confirm & Submit)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
