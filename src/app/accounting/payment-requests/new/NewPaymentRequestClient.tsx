"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createPaymentRequest,
  checkDuplicates,
  checkAttachmentDuplicates,
  getPaymentRequests,
  PaymentRequestRecord,
  RequisitionItem,
} from '@/app/actions/paymentRequests';
import {
  normalizeAttachmentName,
  isDistinctiveAttachmentName,
  visualHammingDistance,
  normalizeInvoiceNo,
} from '@/lib/attachmentUtils';
import { detectSlipQrAndBarcode } from '@/lib/slipDetector';
import PrintablePaymentVoucher from '../components/PrintablePaymentVoucher';
import { thaiBahtText } from '@/app/lib/thaiBahtText';
import {
  ChevronLeft,
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
  Printer,
  Copy,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  ListPlus,
  Scan,
  QrCode,
} from 'lucide-react';
import Swal from 'sweetalert2';

type Props = {
  currentUser?: {
    id: string;
    fullName: string;
    role?: string;
  } | null;
  branches?: { id: string; name: string }[];
  initialBranch?: string;
  initialDept?: string;
  initialPhone?: string;
  initialMyRequests?: PaymentRequestRecord[];
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

export default function NewPaymentRequestClient({
  currentUser,
  branches,
  initialBranch,
  initialDept,
  initialPhone,
  initialMyRequests,
}: Props) {
  const router = useRouter();

  const branchList = branches && branches.length > 0 ? branches : DEFAULT_BRANCHES;

  // Tab State: 'create' for new form, 'my_requests' to view own request statuses
  const [activeTab, setActiveTab] = useState<'create' | 'my_requests'>('create');
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
  const [company, setCompany] = useState<'TG' | 'TE' | 'TP'>('TG');
  const [branch, setBranch] = useState(
    initialBranch || (branchList[0] ? branchList[0].name : 'สำนักงานใหญ่')
  );
  const [customBranch, setCustomBranch] = useState('');
  const [classification, setClassification] = useState<
    'VENDOR_BILL' | 'REIMBURSEMENT' | 'BRANCH_SITE' | 'PETTY_CASH' | 'CASH_ADVANCE'
  >('VENDOR_BILL');
  const [urgency, setUrgency] = useState<'NORMAL' | 'EMERGENCY'>('NORMAL');

  // Requisition Form Entry Mode: SINGLE (One bill/supplier) vs MULTI_ITEMS (Multiple items & multiple suppliers)
  const [entryMode, setEntryMode] = useState<'SINGLE' | 'MULTI_ITEMS'>('SINGLE');

  // Multi-Item Requisition Table State (matching "รายการเบิกเงิน")
  const [requisitionItems, setRequisitionItems] = useState<RequisitionItem[]>([
    {
      id: 'item_1',
      billDate: new Date().toISOString().split('T')[0],
      supplierName: '',
      supplierTaxId: '',
      invoiceNumber: '',
      description: '',
      amount: 0,
      remarks: '',
      paidByCreditCard: false,
    },
  ]);
  const [creditCardDeduction, setCreditCardDeduction] = useState<string>('0');

  const handleAddItem = (copyFromLast = false) => {
    setRequisitionItems((prev) => {
      const last = prev[prev.length - 1];
      const newItem: RequisitionItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        billDate: copyFromLast && last?.billDate ? last.billDate : (documentDate || new Date().toISOString().split('T')[0]),
        supplierName: copyFromLast && last?.supplierName ? last.supplierName : '',
        supplierTaxId: copyFromLast && last?.supplierTaxId ? last.supplierTaxId : '',
        invoiceNumber: copyFromLast && last?.invoiceNumber ? last.invoiceNumber : '',
        description: '',
        amount: 0,
        remarks: '',
        paidByCreditCard: false,
      };
      return [...prev, newItem];
    });
  };

  const handleRemoveItem = (index: number) => {
    setRequisitionItems((prev) => {
      if (prev.length <= 1) {
        return [{
          id: `item_${Date.now()}`,
          billDate: documentDate || new Date().toISOString().split('T')[0],
          supplierName: '',
          supplierTaxId: '',
          invoiceNumber: '',
          description: '',
          amount: 0,
          remarks: '',
          paidByCreditCard: false,
        }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpdateItem = (index: number, field: keyof RequisitionItem, value: any) => {
    setRequisitionItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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

  // Searchable Branch Combobox State
  const [branchSearchQuery, setBranchSearchQuery] = useState(
    initialBranch || (branchList[0] ? branchList[0].name : 'สำนักงานใหญ่')
  );
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

  // Requester
  const [requesterName, setRequesterName] = useState(currentUser?.fullName || '');
  const [requesterDept, setRequesterDept] = useState(initialDept || '');
  const [requesterPhone, setRequesterPhone] = useState(initialPhone || '');

  // Supplier / Payee
  const [supplierName, setSupplierName] = useState('');
  const [supplierTaxId, setSupplierTaxId] = useState('');
  const [payeePhone, setPayeePhone] = useState('');

  // Payment Destination & Bank / PromptPay Details (for AR / AP Team)
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'PROMPTPAY' | 'CASH_CHEQUE'>('BANK_TRANSFER');
  const [selectedBankCode, setSelectedBankCode] = useState<string>('KBANK');
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย (KBANK)');
  const [customBankName, setCustomBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // PromptPay specifics
  const [promptPayType, setPromptPayType] = useState<'PHONE' | 'CITIZEN_ID' | 'TAX_ID' | 'E_WALLET'>('PHONE');
  const [promptPayNumber, setPromptPayNumber] = useState('');
  const [promptPayAccountName, setPromptPayAccountName] = useState('');

  // Cash / Cheque specifics
  const [cashChequeNote, setCashChequeNote] = useState('');

  // Document details
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasNoDocNumber, setHasNoDocNumber] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [subtotalAmount, setSubtotalAmount] = useState<string>('');
  const [vatType, setVatType] = useState<'NONE' | '7%' | 'CUSTOM'>('NONE');
  const [customVatAmount, setCustomVatAmount] = useState<string>('');
  const [whtType, setWhtType] = useState<'NONE' | '1%' | '2%' | '3%' | '5%' | 'CUSTOM'>('NONE');
  const [customWhtPercent, setCustomWhtPercent] = useState<string>('');
  const [customWhtAmount, setCustomWhtAmount] = useState<string>('');

  const [purpose, setPurpose] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [poPrNumber, setPoPrNumber] = useState('');
  const [requestedPaymentDate, setRequestedPaymentDate] = useState('');
  const [submissionChannel, setSubmissionChannel] = useState<'WEB' | 'LINE' | 'EMAIL' | 'PHYSICAL'>('WEB');

  // Attachments with QR & OCR metadata
  const [attachments, setAttachments] = useState<
    {
      url: string;
      fileName: string;
      fileType?: string;
      fileHash?: string;
      visualHash?: string;
      fileSize?: number;
      qrPayload?: string;
      barcode?: string;
      extractedTaxId?: string;
      extractedInvoiceNo?: string;
      extractedAmount?: number;
      extractedDate?: string;
      extractedSupplier?: string;
    }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadScanStatus, setUploadScanStatus] = useState<string | null>(null);
  const [ocrAutoScanEnabled, setOcrAutoScanEnabled] = useState(true);

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

  // Effective Subtotal: From table if in MULTI_ITEMS mode, otherwise from input field
  const effectiveSubtotal = entryMode === 'MULTI_ITEMS' ? itemsTotal : (parseFloat(subtotalAmount) || 0);

  let calculatedVat = 0;
  if (vatType === '7%') {
    calculatedVat = Math.round(effectiveSubtotal * 0.07 * 100) / 100;
  } else if (vatType === 'CUSTOM') {
    calculatedVat = parseFloat(customVatAmount) || 0;
  }

  let calculatedWht = 0;
  let whtPercentValue = 0;
  if (whtType === '1%') {
    whtPercentValue = 1;
    calculatedWht = Math.round(effectiveSubtotal * 0.01 * 100) / 100;
  } else if (whtType === '2%') {
    whtPercentValue = 2;
    calculatedWht = Math.round(effectiveSubtotal * 0.02 * 100) / 100;
  } else if (whtType === '3%') {
    whtPercentValue = 3;
    calculatedWht = Math.round(effectiveSubtotal * 0.03 * 100) / 100;
  } else if (whtType === '5%') {
    whtPercentValue = 5;
    calculatedWht = Math.round(effectiveSubtotal * 0.05 * 100) / 100;
  } else if (whtType === 'CUSTOM') {
    whtPercentValue = parseFloat(customWhtPercent) || 0;
    calculatedWht = parseFloat(customWhtAmount) || Math.round((effectiveSubtotal * whtPercentValue) / 100 * 100) / 100;
  }

  const netPayable = entryMode === 'MULTI_ITEMS'
    ? Math.max(0, Math.round((effectiveSubtotal + calculatedVat - calculatedWht - effectiveCcDeduction) * 100) / 100)
    : Math.round((effectiveSubtotal + calculatedVat - calculatedWht) * 100) / 100;
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
      fileSize?: number;
      qrPayload?: string;
      barcode?: string;
      extractedTaxId?: string;
      extractedInvoiceNo?: string;
      extractedAmount?: number;
      extractedDate?: string;
      extractedSupplier?: string;
    }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Calculate Multi-Signal Fingerprints (SHA-256 + Visual dHash)
        setUploadScanStatus(`กำลังตรวจจับ QR/สลิป และคำนวณลายนิ้วมือ (${file.name})...`);
        const fileHash = await computeFileHash(file);
        const visualHash = await computeVisualHash(file);

        // 2. Client-Side Instant QR/Barcode Slip Detection (<50ms)
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
            console.debug('Client slip detection skipped:', e);
          }
        }

        // 3. OCR Auto-Scan (extract Tax ID, Invoice No, Net Amount, Date, Supplier)
        let extractedTaxId: string | undefined = undefined;
        let extractedInvoiceNo: string | undefined = undefined;
        let extractedAmount: number | undefined = undefined;
        let extractedDate: string | undefined = undefined;
        let extractedSupplier: string | undefined = undefined;

        if (ocrAutoScanEnabled && file.type.startsWith('image/')) {
          setUploadScanStatus(`กำลังสแกนอ่านข้อมูลเอกสารด้วย OCR Auto-Scan (${file.name})...`);
          try {
            const scanForm = new FormData();
            scanForm.append('file', file);
            const scanRes = await fetch('/api/scan-document', {
              method: 'POST',
              body: scanForm,
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
              }
            }
          } catch (ocrErr) {
            console.warn('OCR Auto-Scan request failed:', ocrErr);
          }
        }

        // Check if file is already in current form's attachments list
        const normName = normalizeAttachmentName(file.name);
        const isDistinct = isDistinctiveAttachmentName(normName);
        const isAlreadyAttached = [...attachments, ...newItems].some((a) => {
          if (a.fileHash && a.fileHash === fileHash) return true;
          if (qrPayload && a.qrPayload && (a.qrPayload === qrPayload || (qrPayload.length >= 15 && a.qrPayload.includes(qrPayload)))) return true;
          if (extractedInvoiceNo && a.extractedInvoiceNo && normalizeInvoiceNo(a.extractedInvoiceNo) === normalizeInvoiceNo(extractedInvoiceNo)) return true;
          if (visualHash && a.visualHash && visualHammingDistance(visualHash, a.visualHash) <= 4) return true;
          if (isDistinct && normalizeAttachmentName(a.fileName) === normName) return true;
          return false;
        });

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
              fileSize: file.size,
              qrPayload,
              barcode,
              extractedTaxId,
              extractedInvoiceNo,
              extractedAmount,
            },
          ],
          fileHashes: [fileHash],
        });

        if (dupCheck.isDuplicate && dupCheck.matches.length > 0) {
          const match = dupCheck.matches[0];
          let explanationText = '';
          if (match.matchType === 'ATTACHMENT_QR') {
            explanationText = `ระบบตรวจพบว่ารหัส QR Code บนสลิปโอนเงิน/บิลนี้ (PromptPay Slip Payload) ตรงกับเอกสารที่เคยแนบในระบบกลาง 100% แม้จะถ่ายจากต่างกล้อง ต่างโทรศัพท์ หรือคนละมุม (Separate Cameras)`;
          } else if (match.matchType === 'ATTACHMENT_BARCODE') {
            explanationText = `ระบบตรวจพบบาร์โค้ด (${match.barcode || barcode}) ตรงกับเอกสารเดิมในระบบกลาง`;
          } else if (match.matchType === 'ATTACHMENT_OCR') {
            explanationText = `ระบบตรวจพบข้อมูล OCR (เลขที่ใบกำกับภาษี "${match.invoice_number || extractedInvoiceNo}" และเลขผู้เสียภาษี) ตรงกับเอกสารเดิมในระบบ แม้จะถ่ายจากคนละกล้อง`;
          } else if (match.matchType === 'ATTACHMENT_OCR_RECORD') {
            explanationText = `ระบบตรวจพบเลขที่ใบกำกับภาษี "${extractedInvoiceNo}" จากภาพถ่าย ตรงกับคำขอเดิม (${match.pay_number}) ในระบบ`;
          } else if (match.matchType === 'ATTACHMENT_VISUAL') {
            explanationText = `ระบบตรวจพบว่าภาพเอกสารนี้ (Visual Fingerprint / ลายนิ้วมือภาพ) ตรงกับเอกสารที่เคยแนบในระบบกลาง แม้จะส่งจากคนละอุปกรณ์ (มือถือ/คอมฯ) หรือไฟล์ถูกบีบอัดใหม่`;
          } else if (match.matchType === 'ATTACHMENT_NAME_SIMILAR') {
            explanationText = `ระบบตรวจพบว่าชื่อเอกสารและขนาดไฟล์นี้ตรงกับเอกสารที่เคยแนบในระบบกลาง`;
          } else {
            explanationText = `ระบบตรวจพบว่าเนื้อหาของไฟล์นี้ (Digital Fingerprint) ตรงกับเอกสารที่เคยแนบในระบบกลาง`;
          }

          const result = await Swal.fire({
            title: 'ตรวจพบเอกสารซ้ำซ้อนในระบบ!',
            html: `
              <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
                <p class="font-bold text-red-900 text-sm">ไฟล์ "${file.name}" เคยถูกใช้งานแล้ว</p>
                <p class="text-gray-700">${explanationText}:</p>
                <div class="bg-white p-3 rounded-lg border border-red-100 font-mono text-[11px] space-y-1">
                  <p><span class="text-gray-500 font-sans">เลขที่คำขอ:</span> <b class="text-red-700 font-bold">${match.pay_number}</b></p>
                  <p><span class="text-gray-500 font-sans">ผู้ขาย:</span> <b>${match.supplier_name}</b></p>
                  ${match.invoice_number ? `<p><span class="text-gray-500 font-sans">เลขที่บิล:</span> <b>${match.invoice_number}</b></p>` : ''}
                  <p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b>${Number(match.net_amount).toLocaleString()} ฿</b></p>
                  <p><span class="text-gray-500 font-sans">เอกสารที่ตรวจพบ:</span> <b class="text-gray-800">${match.matchedFileName || file.name}</b></p>
                  <p><span class="text-gray-500 font-sans">ผู้ขอเบิกเดิม:</span> <b>${match.requester_name || '-'}</b></p>
                  <p><span class="text-gray-500 font-sans">สถานะคำขอเดิม:</span> <span class="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded font-semibold">${match.status}</span></p>
                </div>
                <p class="text-red-700 font-medium text-[11px]">
                  * ระบบไม่อนุญาตให้อัปโหลดเอกสารซ้ำ กรุณาเปิดดูที่ใบขอจ่ายเดิมหรือตรวจสอบเอกสารใหม่อีกครั้ง
                </p>
              </div>
            `,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'เปิดดูคำขอเดิม',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'ยกเลิกไฟล์นี้',
          });

          if (result.isConfirmed) {
            window.open(`/accounting/payment-requests/${match.id}`, '_blank');
          }
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
        const data = await res.json();
        if (data.success && data.url) {
          newItems.push({
            url: data.url,
            fileName: file.name,
            fileType: file.type,
            fileHash,
            visualHash: visualHash || data.visualHash || undefined,
            qrPayload: qrPayload || data.qrPayload || undefined,
            barcode: barcode || undefined,
            fileSize: file.size,
            extractedTaxId,
            extractedInvoiceNo,
            extractedAmount,
            extractedDate,
            extractedSupplier,
          });

          // Smart Auto-Fill prompt if invoice number / amount / tax ID detected and form is empty
          if (extractedInvoiceNo || (extractedAmount && extractedAmount > 0)) {
            const hasExistingInvoice = !!invoiceNumber;
            const hasExistingAmount = Number(subtotalAmount || 0) > 0;
            if (!hasExistingInvoice || !hasExistingAmount) {
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
                if (extractedAmount && (!subtotalAmount || Number(subtotalAmount) === 0)) {
                  setSubtotalAmount(String(extractedAmount));
                }
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
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      setUploadScanStatus(null);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim()) {
      Swal.fire({ title: 'กรุณาระบุชื่อผู้ขอเบิก', icon: 'warning', confirmButtonColor: '#dc2626' });
      return;
    }

    let finalSupplierName = supplierName.trim();
    const validItems =
      entryMode === 'MULTI_ITEMS'
        ? requisitionItems.filter((it) => it.description.trim() || Number(it.amount) > 0)
        : [];

    if (entryMode === 'MULTI_ITEMS') {
      if (validItems.length === 0) {
        Swal.fire({
          title: 'กรุณาระบุรายการเบิกเงิน',
          text: 'ต้องมีอย่างน้อย 1 รายการพร้อมระบุชื่อรายการและจำนวนเงิน',
          icon: 'warning',
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      const invalidRow = validItems.find((it) => !it.description.trim() || Number(it.amount) <= 0);
      if (invalidRow) {
        Swal.fire({
          title: 'ข้อมูลรายการไม่ครบถ้วน',
          text: 'กรุณาระบุชื่อรายการสินค้า/บริการ และจำนวนเงินที่มากกว่า 0 ให้ถูกต้องทุกแถว',
          icon: 'warning',
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      // Auto-assign supplier name if not manually typed
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
    } else {
      if (!finalSupplierName) {
        Swal.fire({ title: 'กรุณาระบุชื่อผู้รับเงิน / เจ้าหนี้', icon: 'warning', confirmButtonColor: '#dc2626' });
        return;
      }
      if (!hasNoDocNumber && !invoiceNumber.trim()) {
        Swal.fire({
          title: 'กรุณาระบุเลขที่ใบเสร็จ/ใบกำกับ',
          text: 'หากเป็นบิลไม่มีเลขที่ กรุณาติ๊กเลือก "ไม่มีเลขที่เอกสาร"',
          icon: 'warning',
          confirmButtonColor: '#dc2626',
        });
        return;
      }
    }

    if (effectiveSubtotal <= 0) {
      Swal.fire({ title: 'กรุณาระบุยอดเงินที่ถูกต้อง', icon: 'warning', confirmButtonColor: '#dc2626' });
      return;
    }
    if (!purpose.trim()) {
      Swal.fire({ title: 'กรุณาระบุรายละเอียดวัตถุประสงค์การจ่ายเงิน (ชื่องาน)', icon: 'warning', confirmButtonColor: '#dc2626' });
      return;
    }

    if (urgency === 'EMERGENCY' && !requestedPaymentDate.trim()) {
      Swal.fire({
        title: 'กรุณาระบุวันที่ต้องการให้จ่ายเงิน',
        text: 'สำหรับรายการที่เลือก "ด่วนที่สุด" จำเป็นต้องระบุวันที่ต้องการให้การเงินโอนจ่ายเงิน',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
      });
      return;
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

      const result = await Swal.fire({
        title: 'ไม่อนุญาตให้สร้างรายการซ้ำซ้อน',
        html: `
          <div class="text-left text-xs bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
            <p class="font-bold text-red-900 text-sm">ตรวจพบข้อมูลในระบบแล้ว (${match.pay_number})</p>
            <p class="text-gray-700">ระบบตรวจสอบพบว่า: <b>${matchLabel}</b></p>
            <div class="bg-white p-3 rounded-lg border border-red-100 font-mono text-[11px] space-y-1">
              <p><span class="text-gray-500 font-sans">เลขที่คำขอ:</span> <b class="text-red-700 font-bold">${match.pay_number}</b></p>
              <p><span class="text-gray-500 font-sans">ผู้ขาย/ผู้เบิก:</span> <b>${match.supplier_name}</b></p>
              ${match.invoice_number ? `<p><span class="text-gray-500 font-sans">เลขที่บิล:</span> <b>${match.invoice_number}</b></p>` : ''}
              <p><span class="text-gray-500 font-sans">ยอดเงิน:</span> <b>${Number(match.net_amount).toLocaleString()} ฿</b></p>
              <p><span class="text-gray-500 font-sans">สถานะ:</span> <b>${match.status}</b></p>
            </div>
            <p class="text-red-700 font-medium text-[11px] pt-1">
              * ระบบไม่อนุญาตให้ส่งคำขอซ้ำ เพื่อป้องกันการจ่ายเงินซ้ำซ้อนและลดขั้นตอนการตรวจสอบด้วยมือ กรุณาใช้ใบขอจ่ายเดิม
            </p>
          </div>
        `,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'เปิดดูคำขอเดิม',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'แก้ไขข้อมูล',
      });

      if (result.isConfirmed) {
        window.open(`/accounting/payment-requests/${match.id}`, '_blank');
      }
      return;
    }

    setIsSubmitting(true);
    try {
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

      const res = await createPaymentRequest({
        company,
        branch: finalBranch,
        classification,
        urgency,
        requester_id: currentUser?.id,
        requester_name: requesterName.trim(),
        requester_department: requesterDept.trim() || undefined,
        requester_phone: requesterPhone.trim() || undefined,
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
        subtotal_amount: effectiveSubtotal,
        vat_type: vatType,
        vat_amount: calculatedVat,
        wht_type: whtType,
        wht_percent: whtPercentValue,
        wht_amount: calculatedWht,
        net_amount: netPayable,
        purpose: purpose.trim(),
        cost_center: costCenter.trim() || undefined,
        po_pr_number: poPrNumber.trim() || undefined,
        requested_payment_date: requestedPaymentDate || undefined,
        submission_channel: submissionChannel,
        attachments,
        items: entryMode === 'MULTI_ITEMS' ? validItems : undefined,
        credit_card_deduction: entryMode === 'MULTI_ITEMS' ? effectiveCcDeduction : undefined,
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Symmetrical Top Header: Red, White & Gray */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <Link
            href="/accounting/payment-requests"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition mb-2 font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> กลับสู่ทะเบียนขอจ่ายเงิน (Payment Register)
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 tracking-wide uppercase">
              TERA GROUP • PAYMENT SYSTEM
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5 mt-1">
            <Building2 className="w-6 h-6 text-red-600" />
            สร้างใบขออนุมัติจ่ายเงิน (New Payment Request)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            ระบบศูนย์กลางการขอเบิกจ่ายและควบคุมป้องกันการจ่ายเงินซ้ำซ้อน เครือ Tera Group (TG, TE, TP)
          </p>
        </div>

        {/* Right Policy Badge Card */}
        <div className="bg-gray-50 border border-red-200/80 rounded-xl p-3.5 text-xs text-gray-800 max-w-sm">
          <p className="font-bold flex items-center gap-1.5 text-red-700">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            กฎเหล็ก: No PAY No. = No Payment
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
            เอกสารทุกช่องทาง (LINE / Email / ตัวจริง) ต้องอ้างอิงเลข PAY No. เสมอ ฝ่ายการเงินจ่ายเฉพาะรายการใน Approved List
          </p>
        </div>
      </div>

      {/* Tab Switcher: Create Request vs My Requests Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'create'
                ? 'bg-white text-red-600 shadow-2xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            สร้างคำขอเบิกเงินใหม่
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('my_requests');
              refreshMyRequests();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition relative ${
              activeTab === 'my_requests'
                ? 'bg-white text-red-600 shadow-2xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            ติดตามสถานะคำขอเบิกของฉัน
            {myRequests.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

        <div className="flex items-center gap-2 px-2">
          {activeTab === 'my_requests' ? (
            <button
              type="button"
              onClick={refreshMyRequests}
              disabled={isLoadingRequests}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin text-red-600' : ''}`} />
              รีเฟรชข้อมูล
            </button>
          ) : (
            myRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('my_requests')}
                className="text-xs text-gray-500 hover:text-red-600 font-medium inline-flex items-center gap-1.5 transition"
              >
                <span>คำขอของฉัน ({myRequests.length} รายการ)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {activeTab === 'create' ? (
        <>
          {/* Quick link banner if user has requests */}
          {myRequests.length > 0 && (
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Mode Selector: Single Bill vs Multi-Item Requisition */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  รูปแบบการขอเบิกจ่ายเงิน (Requisition Format)
                  <span className="text-[10px] font-normal text-gray-500 font-sans">
                    (เลือกตามประเภทบิลหรือเอกสารแนบ)
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  {entryMode === 'MULTI_ITEMS'
                    ? 'โหมดรายการเบิกเงิน: รองรับหลายรายการสินค้า/บริการ และหลายผู้จำหน่าย (เช่น ใบสำคัญเบิกเงิน, เงินสดย่อย, สำรองจ่าย)'
                    : 'โหมดบิลเดี่ยว: สำหรับการชำระหนี้การค้าใบกำกับภาษี/ใบเสร็จเดี่ยวจากคู่ค้ารายเดียว'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setEntryMode('SINGLE')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  entryMode === 'SINGLE'
                    ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>บิลเดี่ยว (Single Bill)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode('MULTI_ITEMS');
                  if (vatType === '7%') {
                    setVatType('NONE');
                  }
                  if (requisitionItems.length === 1 && !requisitionItems[0].description) {
                    setRequisitionItems([
                      {
                        id: `item_${Date.now()}`,
                        billDate: documentDate || new Date().toISOString().split('T')[0],
                        supplierName: supplierName || '',
                        supplierTaxId: supplierTaxId || '',
                        invoiceNumber: invoiceNumber || '',
                        description: purpose || '',
                        amount: parseFloat(subtotalAmount) || 0,
                        remarks: '',
                        paidByCreditCard: false,
                      }
                    ]);
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  entryMode === 'MULTI_ITEMS'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>รายการเบิกเงิน (หลายรายการ / หลายผู้จำหน่าย)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 1: Two Symmetrical Cards (Card 1: Organization & Channel | Card 2: Requester & Payee) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: สังกัดบริษัท & ข้อมูลการส่ง */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
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
                          onClick={() => setCompany(c)}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition text-center ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <span className="block text-sm">{c}</span>
                          <span className={`block text-[10px] font-normal ${isSelected ? 'text-red-100' : 'text-gray-400'}`}>
                            {c === 'TG' ? 'Tera Group' : c === 'TE' ? 'Tera Electric' : 'Tera Power'}
                          </span>
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
                        const val = e.target.value;
                        setClassification(val);
                        if (val === 'REIMBURSEMENT' || val === 'PETTY_CASH') {
                          setEntryMode('MULTI_ITEMS');
                        }
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
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
                {/* Requester Group */}
                <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                    ข้อมูลผู้ขอเบิก / ผู้รับผิดชอบ
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                </div>

                {/* Payee Group */}
                <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      ข้อมูลผู้รับเงิน / เจ้าหนี้ (Payee / Supplier)
                    </span>
                    {requesterName.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierName(requesterName.trim());
                          setBankAccountName(requesterName.trim());
                          setPromptPayAccountName(requesterName.trim());
                          if (requesterPhone.trim()) {
                            setPayeePhone(requesterPhone.trim());
                            setPromptPayNumber(requesterPhone.trim());
                          }
                        }}
                        className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        + ใช้ชื่อผู้ขอเบิกเป็นผู้รับเงิน (สำรองจ่าย / Reimbursement)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                        {entryMode === 'MULTI_ITEMS'
                          ? 'ชื่อผู้รับเงิน / บัญชีที่โอนเงินเข้า (สำหรับสำรองจ่ายระบุชื่อผู้ขอเบิก หรือระบบจะสรุปรวมชื่อร้านค้าให้อัตโนมัติ)'
                          : 'ชื่อผู้รับเงิน / บริษัทคู่ค้า'}
                        {entryMode === 'SINGLE' && <span className="text-red-600"> *</span>}
                      </label>
                      <input
                        type="text"
                        required={entryMode === 'SINGLE'}
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder={
                          entryMode === 'MULTI_ITEMS'
                            ? `เช่น ${requesterName || 'ชื่อผู้ขอเบิก'} (สำรองจ่าย) หรือปล่อยว่างเพื่อให้ระบบสรุปจากตารางร้านค้า`
                            : 'เช่น บจก. สยามคอมเพรสเซอร์ หรือ นายสมชาย'
                        }
                        className="w-full text-xs rounded-lg border border-gray-300 py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                        เลขประจำตัวผู้เสียภาษี (Tax ID)
                      </label>
                      <input
                        type="text"
                        value={supplierTaxId}
                        onChange={(e) => setSupplierTaxId(e.target.value)}
                        placeholder="13 หลัก (ถ้ามี)"
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">เบอร์โทรศัพท์ผู้รับเงิน</label>
                      <input
                        type="text"
                        value={payeePhone}
                        onChange={(e) => setPayeePhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Dedicated Payment Method & Bank / PromptPay Section for AR Team */}
                <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block leading-tight">
                          ข้อมูลการรับเงิน (ช่องทางโอนเงิน / พร้อมเพย์)
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ข้อมูลสำหรับฝ่ายการเงินและบัญชี (AR / AP Team) ใช้ในการโอนเงิน
                        </span>
                      </div>
                    </div>
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
                            {supplierName.trim() ? (
                              <button
                                type="button"
                                onClick={() => setBankAccountName(supplierName.trim())}
                                className="text-[10px] text-red-600 hover:text-red-700 font-semibold hover:underline flex items-center gap-0.5"
                              >
                                <span>+ ใช้ชื่อผู้รับเงิน</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-transparent select-none">&nbsp;</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={bankAccountName}
                            onChange={(e) => setBankAccountName(e.target.value)}
                            placeholder={supplierName ? `เช่น ${supplierName}` : 'ชื่อบัญชีที่ระบุในสมุดบัญชี'}
                            className="w-full h-10 text-xs font-medium rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 placeholder:text-gray-400 shadow-2xs"
                          />
                          <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                            ระบุชื่อบัญชีตรงตามสมุดบัญชีธนาคาร
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
                            {supplierName.trim() ? (
                              <button
                                type="button"
                                onClick={() => setPromptPayAccountName(supplierName.trim())}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold hover:underline flex items-center gap-0.5"
                              >
                                <span>+ ใช้ชื่อผู้รับเงิน</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-transparent select-none">&nbsp;</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={promptPayAccountName}
                            onChange={(e) => setPromptPayAccountName(e.target.value)}
                            placeholder={supplierName ? `เช่น ${supplierName}` : 'ระบุชื่อเจ้าของบัญชีพร้อมเพย์'}
                            className="w-full h-10 text-xs font-medium rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400 shadow-2xs"
                          />
                          <span className="text-[10px] text-gray-400 mt-1 block min-h-[16px] truncate">
                            ชื่อ-นามสกุล หรือชื่อนิติบุคคลที่ลงทะเบียนไว้กับพร้อมเพย์
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
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-[11px] flex items-center justify-between text-gray-700 shadow-2xs">
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

        {/* Multi-Item Requisition Table (Shown when in MULTI_ITEMS mode) */}
        {entryMode === 'MULTI_ITEMS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 animate-in fade-in duration-150">
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

            {/* Interactive Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-x-auto text-xs shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200 text-center">
                    <th className="py-2.5 px-2 w-10 border-r border-gray-200">#</th>
                    <th className="py-2.5 px-2.5 w-32 border-r border-gray-200">วันที่บิล *</th>
                    <th className="py-2.5 px-3 w-48 text-left border-r border-gray-200">ผู้จำหน่าย / ร้านค้า *</th>
                    <th className="py-2.5 px-2.5 w-32 text-left border-r border-gray-200">เลขที่บิล (ถ้ามี)</th>
                    <th className="py-2.5 px-3 min-w-[200px] text-left border-r border-gray-200">รายการสินค้า / บริการ *</th>
                    <th className="py-2.5 px-3 w-32 text-right border-r border-gray-200">จำนวนเงิน (฿) *</th>
                    <th className="py-2.5 px-2 w-28 text-center border-r border-gray-200">จ่ายบัตรเครดิต</th>
                    <th className="py-2.5 px-2.5 min-w-[120px] text-left border-r border-gray-200">หมายเหตุ</th>
                    <th className="py-2.5 px-2 w-12 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requisitionItems.map((item, idx) => {
                    // Check if this row is flagged as a duplicate
                    const isDupRow = dupResult?.exactMatches?.some(
                      (m: any) => m.matchType === 'ITEM_DUPLICATE' && m.matchedItemIndex === idx + 1
                    );
                    const dupMatch = isDupRow
                      ? dupResult?.exactMatches?.find(
                          (m: any) => m.matchType === 'ITEM_DUPLICATE' && m.matchedItemIndex === idx + 1
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
                            step="0.01"
                            required
                            value={item.amount === 0 ? '' : item.amount}
                            onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full text-xs font-mono font-bold text-right rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white text-gray-900"
                          />
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
                  <tr className="border-b border-gray-200 font-semibold">
                    <td colSpan={5} className="py-2.5 px-3 text-right text-gray-700 border-r border-gray-200">
                      จำนวนเงินรวม (Total Amount):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 border-r border-gray-200">
                      {itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </td>
                    <td colSpan={3} className="px-3 text-gray-400 text-[11px]">
                      รวมทั้งสิ้น {requisitionItems.length} รายการ
                    </td>
                  </tr>

                  {/* Optional VAT Row if calculatedVat > 0 */}
                  {calculatedVat > 0 && (
                    <tr className="border-b border-gray-200 text-blue-700 bg-blue-50/40">
                      <td colSpan={5} className="py-2 px-3 text-right font-medium border-r border-gray-200">
                        บวกภาษีมูลค่าเพิ่ม (VAT {vatType === '7%' ? '7%' : ''}):
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 border-r border-gray-200">
                        +{calculatedVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                      </td>
                      <td colSpan={3} className="px-3 text-blue-600 text-[10px]">
                        บวก VAT เพิ่มจาก Card 4 (หากยอดตามบิลรวม VAT แล้ว ให้เลือก &quot;ไม่มี VAT&quot; ใน Card 4)
                      </td>
                    </tr>
                  )}

                  {/* Optional WHT Row if calculatedWht > 0 */}
                  {calculatedWht > 0 && (
                    <tr className="border-b border-gray-200 text-amber-800 bg-amber-50/40">
                      <td colSpan={5} className="py-2 px-3 text-right font-medium border-r border-gray-200">
                        หักภาษี ณ ที่จ่าย (WHT {whtPercentValue ? `${whtPercentValue}%` : ''}):
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-800 border-r border-gray-200">
                        -{calculatedWht.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                      </td>
                      <td colSpan={3} className="px-3 text-amber-700 text-[10px]">
                        หักภาษี ณ ที่จ่ายตามที่ระบุใน Card 4
                      </td>
                    </tr>
                  )}

                  {/* Credit Card Deduction Row */}
                  <tr className="border-b border-gray-200 text-red-700 bg-red-50/40">
                    <td colSpan={5} className="py-2 px-3 text-right font-medium border-r border-gray-200">
                      หักยอดที่จ่ายด้วยบัตรเครดิต:
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-gray-200">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-bold">-</span>
                        <input
                          type="number"
                          step="0.01"
                          value={creditCardDeduction}
                          onChange={(e) => setCreditCardDeduction(e.target.value)}
                          placeholder="0.00"
                          className="w-24 text-right font-mono font-bold text-red-700 rounded border border-red-300 py-1 px-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        <span className="text-[11px] font-bold">฿</span>
                      </div>
                    </td>
                    <td colSpan={3} className="px-3 text-red-700 text-[10px]">
                      หักยอดที่บริษัท/พนักงานรูดบัตรเครดิตออกจากการเบิกเงินสด
                    </td>
                  </tr>

                  {/* Net Requisition Amount Row */}
                  <tr className="bg-gray-100/90 font-bold">
                    <td colSpan={5} className="py-3 px-3 text-right text-gray-900 text-sm border-r border-gray-200">
                      จำนวนเงินที่เบิก (ยอดเบิกจ่ายสุทธิ):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-600 font-extrabold text-base border-r border-gray-200">
                      {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </td>
                    <td colSpan={3} className="px-3 text-gray-700 text-[11px] font-normal truncate">
                      ({bahtText})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl border border-gray-300 shadow-2xs hover:border-gray-400 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-red-600" />
                  <span>+ เพิ่มรายการใหม่ (ร้านค้าใหม่)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 shadow-2xs transition"
                >
                  <ListPlus className="w-3.5 h-3.5 text-red-600" />
                  <span>+ เพิ่มรายการในบิลเดิม (คัดลอกร้านค้าและวันที่)</span>
                </button>
              </div>

              <span className="text-[11px] text-gray-500">
                * หากซื้อสินค้าจากร้านเดียวกันหลายรายการ สามารถกดปุ่ม &quot;เพิ่มรายการในบิลเดิม&quot; ได้ทันที
              </span>
            </div>
          </div>
        )}

        {/* Row 2: Two Symmetrical Cards (Card 3: Document & Purpose | Card 4: Financial Calculation & Net Payable) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 3: รายละเอียดเอกสาร & วัตถุประสงค์ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
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
                      {entryMode === 'MULTI_ITEMS' ? 'วันที่ทำใบเบิกเงิน' : 'วันที่ในเอกสาร / วันที่เกิดค่าใช้จ่าย'}{' '}
                      <span className="text-red-600">*</span>
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

                {/* Invoice No. & No Document Number Checkbox (Only for SINGLE mode) */}
                {entryMode === 'SINGLE' ? (
                  <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-800">
                        เลขที่ใบกำกับภาษี / ใบเสร็จ
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1.5 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={hasNoDocNumber}
                          onChange={(e) => {
                            setHasNoDocNumber(e.target.checked);
                            if (e.target.checked) setInvoiceNumber('');
                          }}
                          className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                        />
                        <span>ไม่มีเลขที่เอกสาร</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={hasNoDocNumber}
                      value={hasNoDocNumber ? '(ไม่มีเลขที่เอกสาร - ระบบจะใช้เลขที่ PAY No. อ้างอิง)' : invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder={hasNoDocNumber ? '' : 'เช่น INV-2026-0012'}
                      className={`w-full text-xs rounded-xl border py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono ${
                        hasNoDocNumber
                          ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed italic'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      * ระเบียบข้อ 8: ห้ามสร้างเลขที่บิลสมมติ (เช่น INV001) ขึ้นมาเองเด็ดขาด
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 text-xs text-red-950 flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <span className="font-bold text-red-900">โหมดรายการเบิกเงินหลายรายการ:</span>{' '}
                      <span className="text-gray-700">
                        เลขที่บิลและผู้จำหน่ายจะบันทึกแยกรายแถวในตารางรายการเบิกเงินด้านบน
                      </span>
                    </div>
                  </div>
                )}

                {/* Purpose Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {entryMode === 'MULTI_ITEMS'
                      ? 'ชื่องาน / วัตถุประสงค์การขอเบิก (Job / Purpose)'
                      : 'วัตถุประสงค์และรายละเอียดค่าใช้จ่าย (Purpose)'}{' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder={
                      entryMode === 'MULTI_ITEMS'
                        ? 'เช่น เบิกซื้อวัสดุสนับสนุนงานขาย, ค่าใช้จ่ายประจำสาขา, ซื้ออุปกรณ์สำนักงาน'
                        : 'ระบุลักษณะการจ่ายเงิน เช่น ค่าอะไหล่ซ่อมตู้ MDB, ค่าเช่าเครื่องจักร'
                    }
                    className="w-full text-xs rounded-xl border border-gray-300 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900 leading-relaxed"
                  />
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

          {/* Card 4: การคำนวณยอดเงิน & ภาษี + Red Net Amount Box */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  4
                </span>
                <h2 className="text-sm font-bold text-gray-900">
                  จำนวนเงินและภาษี (Financial Breakdown)
                </h2>
              </div>

              <div className="space-y-4">
                {/* Subtotal Input / Items Total Display */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    {entryMode === 'MULTI_ITEMS'
                      ? 'จำนวนเงินรวมก่อนหักบัตร/ภาษี (Items Subtotal)'
                      : 'จำนวนเงินก่อนภาษี (Pre-VAT Subtotal)'}{' '}
                    <span className="text-red-600">*</span>
                  </label>
                  {entryMode === 'MULTI_ITEMS' ? (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-gray-500 block">
                          คำนวณอัตโนมัติจาก {requisitionItems.length} แถวในตาราง:
                        </span>
                        <span className="text-lg font-bold font-mono text-gray-900">
                          {itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold font-mono">
                        TOTAL ITEMS
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={subtotalAmount}
                        onChange={(e) => setSubtotalAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-base font-bold text-gray-900 rounded-xl border border-gray-300 py-2.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono"
                      />
                      <span className="absolute right-3.5 top-3 text-xs text-gray-400 font-bold">฿</span>
                    </div>
                  )}
                </div>

                {/* Symmetrical VAT & WHT Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* VAT Selector */}
                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        ภาษีมูลค่าเพิ่ม (VAT)
                      </label>
                      {entryMode === 'MULTI_ITEMS' && (
                        <span className="text-[10px] text-gray-500 font-medium inline-flex items-center gap-1">
                          {vatType === 'NONE' ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600" /> รวม VAT ตามบิลแล้ว
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> บวก VAT เพิ่มจากยอด
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <select
                      value={vatType}
                      onChange={(e: any) => setVatType(e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="NONE">ไม่มี VAT / ราคารวม VAT ตามบิลแล้ว (0%)</option>
                      <option value="7%">บวก VAT 7% เพิ่มจากยอด (Pre-VAT)</option>
                      <option value="CUSTOM">ระบุจำนวนเงิน VAT เอง</option>
                    </select>
                    {vatType === 'CUSTOM' ? (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="จำนวนเงิน VAT"
                        value={customVatAmount}
                        onChange={(e) => setCustomVatAmount(e.target.value)}
                        className="mt-1.5 w-full text-xs rounded-lg border border-gray-300 py-1 px-2 font-mono bg-white"
                      />
                    ) : (
                      <span className="block text-[11px] text-gray-600 font-mono mt-1">
                        {calculatedVat > 0 ? `+${calculatedVat.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿` : '0.00 ฿ (ยอดเบิกเท่ากับยอดตามบิล)'}
                      </span>
                    )}
                  </div>

                  {/* WHT Selector */}
                  <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      หัก ณ ที่จ่าย (WHT)
                    </label>
                    <select
                      value={whtType}
                      onChange={(e: any) => setWhtType(e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="NONE">ไม่หัก (0%)</option>
                      <option value="1%">1% (ค่าขนส่ง/ระวาง)</option>
                      <option value="2%">2% (ค่าโฆษณา)</option>
                      <option value="3%">3% (บริการ/จ้างทำของ/รับเหมา)</option>
                      <option value="5%">5% (ค่าเช่า)</option>
                      <option value="CUSTOM">กำหนดเอง</option>
                    </select>
                    {whtType === 'CUSTOM' ? (
                      <div className="grid grid-cols-2 gap-1 mt-1.5">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="%"
                          value={customWhtPercent}
                          onChange={(e) => setCustomWhtPercent(e.target.value)}
                          className="w-full text-xs rounded border border-gray-300 py-1 px-1.5 font-mono bg-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="บาท"
                          value={customWhtAmount}
                          onChange={(e) => setCustomWhtAmount(e.target.value)}
                          className="w-full text-xs rounded border border-gray-300 py-1 px-1.5 font-mono bg-white"
                        />
                      </div>
                    ) : (
                      <span className="block text-[11px] text-red-600 font-mono font-medium mt-1">
                        -{calculatedWht.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                      </span>
                    )}
                  </div>
                </div>

                {/* Symmetrical Modern Red Net Payable Box */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-5 shadow-sm space-y-3">
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

                  {/* Subtotal calculation note */}
                  <div className="pt-2 border-t border-white/20 flex flex-wrap justify-between text-[11px] text-red-100/90 font-mono">
                    <span>ยอดรวม: {effectiveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    {entryMode === 'MULTI_ITEMS' && effectiveCcDeduction > 0 && (
                      <span>หักบัตร: -{effectiveCcDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    )}
                    <span>VAT: +{calculatedVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span>WHT: -{calculatedWht.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Approval Tier Notice */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <span className="font-bold text-gray-800">ระดับการอนุมัติ: </span>
                    <span>{approvalTier}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Card 5 (Full Width Symmetrical Evidence Card) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                <QrCode className="w-3.5 h-3.5 text-purple-600" /> ตรวจจับ QR/สลิป โอนเงินอัตโนมัติ (ข้ามกล้อง/ข้ามมุม 100%)
              </span>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs hover:bg-gray-50 transition">
              <input
                type="checkbox"
                checked={ocrAutoScanEnabled}
                onChange={(e) => setOcrAutoScanEnabled(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1 text-[11px] text-gray-700 font-medium">
                <Scan className="w-3 h-3 text-blue-600" /> เปิดระบบ OCR Auto-Scan (อ่านบิลและตรวจจับข้ามกล้อง)
              </span>
            </label>
          </div>

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
                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-red-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-gray-900 hover:text-red-600 truncate block underline"
                      >
                        {att.fileName}
                      </a>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono">ไฟล์ #{idx + 1}</span>
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

        {/* Bottom Symmetrical Action Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200">
              สถานะเริ่มต้น: SUBMITTED
            </span>
            <span>
              ระบบจะสร้างเลขที่ <b className="font-mono text-gray-900">PAY-{company}-YYMM-XXXXX</b> อัตโนมัติ
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/accounting/payment-requests"
              className="w-1/2 sm:w-auto px-5 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-center transition"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(dupResult?.isExactDuplicate)}
              className={`w-1/2 sm:w-auto px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center justify-center gap-2 ${
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
          </div>
        </div>
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
                            <span>ก่อนภาษี: {Number(req.subtotal_amount || 0).toLocaleString()} ฿</span>
                            {Number(req.vat_amount || 0) > 0 && <span>VAT: +{Number(req.vat_amount).toLocaleString()}</span>}
                            {Number(req.wht_amount || 0) > 0 && <span>WHT: -{Number(req.wht_amount).toLocaleString()}</span>}
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
    </div>
  );
}
