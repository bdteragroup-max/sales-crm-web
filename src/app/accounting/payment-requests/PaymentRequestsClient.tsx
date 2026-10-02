"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PaymentRequestRecord, deletePaymentRequest } from '@/app/actions/paymentRequests';
import PrintablePaymentVoucher from './components/PrintablePaymentVoucher';
import {
  Building2,
  Plus,
  Search,
  Filter,
  FileText,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
  Zap,
  Tag,
  Paperclip,
  Eye,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { canManageAllPaymentRequests, isAccountingManager, matchBranch } from '@/app/lib/roleHelper';

type Props = {
  initialRequests: PaymentRequestRecord[];
  initialStats: any;
  branches?: { id: string; name: string }[];
  userRole?: string;
  userFullName?: string;
};

const COMPANY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TG: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  TE: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  TP: { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-300' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'แบบร่าง', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  PENDING_SUPERVISOR: { label: 'รอหัวหน้างานอนุมัติ', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  SUBMITTED: { label: 'ส่งคำขอแล้ว (รอ AP ตรวจ)', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  DUPLICATE_CHECK: { label: 'AP ตรวจความซ้ำซ้อน', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  DOCUMENT_CHECK: { label: 'AP ตรวจเอกสาร/ภาษี', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  ACCOUNTING_CHECKED: { label: 'หัวหน้าบัญชีสอบทานแล้ว', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  APPROVED: { label: 'อนุมัติแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  READY_TO_PAY: { label: 'การเงินรอจ่าย (Approved List)', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  PAID: { label: 'จ่ายเงินแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  POSTED_TO_GL: { label: 'บันทึกบัญชีแล้ว (GL)', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  ORIGINAL_RECEIVED: { label: 'ได้รับเอกสารตัวจริงแล้ว', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  CLOSED: { label: 'ปิดรายการสมบูรณ์', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  HOLD_DUPLICATE: { label: 'ระงับเนื่องจากซ้ำซ้อน', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  RETURN_DOCUMENT: { label: 'ส่งคืนแก้ไขเอกสาร', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  CANCELLED: { label: 'ยกเลิกรายการ', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  VENDOR_BILL: 'ชำระเจ้าหนี้การค้า',
  REIMBURSEMENT: 'เบิกจ่ายพนักงาน/สำรองจ่าย',
  BRANCH_SITE: 'ขอเบิกสาขา/ไซต์งาน',
  PETTY_CASH: 'เงินสดย่อย',
  CASH_ADVANCE: 'เงินทดรองจ่าย',
};

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

export default function PaymentRequestsClient({
  initialRequests,
  initialStats,
  branches,
  userRole,
  userFullName,
}: Props) {
  const [requests, setRequests] = useState<PaymentRequestRecord[]>(initialRequests);
  const [stats, setStats] = useState<any>(initialStats);

  const isAccountingUser = canManageAllPaymentRequests(userRole);
  const isManager = isAccountingManager(userRole);

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const handleDelete = async (r: PaymentRequestRecord) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบรายการ?',
      html: `<div class="text-xs text-gray-600 text-left space-y-1">
        <p>คุณต้องการลบคำขอเลขที่ <b class="text-red-600 font-mono">${r.pay_number}</b> ใช่หรือไม่?</p>
        <p class="text-gray-500">ผู้ขาย: <b>${r.supplier_name}</b> | ยอดสุทธิ: <b>${Number(r.net_amount).toLocaleString()} ฿</b></p>
        <p class="text-red-500 font-medium mt-2">[คำเตือน] ข้อมูลรายการและประวัติการตรวจสอบจะถูกลบอย่างถาวร</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ใช่, ลบรายการนี้',
      cancelButtonText: 'ยกเลิก',
    });

    if (confirm.isConfirmed) {
      try {
        const res = await deletePaymentRequest(r.id);
        if (res.success) {
          setRequests((prev) => prev.filter((item) => item.id !== r.id));
          Swal.fire({
            title: 'ลบรายการสำเร็จ',
            text: `ลบคำขอ ${r.pay_number} เรียบร้อยแล้ว`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
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
      }
    }
  };

  // Available branches list from system branches + existing requests
  const availableBranches = useMemo(() => {
    const list: { name: string; label: string }[] = [
      { name: 'ALL', label: 'ทุกสาขา (All Branches)' },
    ];
    const seen = new Set<string>();

    const baseList = branches && branches.length > 0 ? branches : DEFAULT_BRANCHES;
    baseList.forEach((b) => {
      if (!seen.has(b.name)) {
        seen.add(b.name);
        const label =
          b.id === 'BKK-HQ'
            ? 'สำนักงานใหญ่ (Head Office - BKK-HQ)'
            : b.id
            ? `${b.name} (${b.id})`
            : b.name;
        list.push({ name: b.name, label });
      }
    });

    // Also include any branch present in initialRequests that isn't yet in the list
    initialRequests.forEach((r) => {
      if (r.branch && !seen.has(r.branch)) {
        seen.add(r.branch);
        list.push({ name: r.branch, label: r.branch });
      }
    });

    return list;
  }, [branches, initialRequests]);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Voucher Modal
  const [voucherModalItem, setVoucherModalItem] = useState<PaymentRequestRecord | null>(null);

  // Filtered requests computation
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Tab filter
      if (activeTab === 'PENDING_SUPERVISOR') {
        if (r.status !== 'PENDING_SUPERVISOR') return false;
      } else if (activeTab === 'PENDING_REVIEW') {
        if (!['SUBMITTED', 'DUPLICATE_CHECK', 'DOCUMENT_CHECK'].includes(r.status)) return false;
      } else if (activeTab === 'PENDING_APPROVAL') {
        if (r.status !== 'ACCOUNTING_CHECKED') return false;
      } else if (activeTab === 'APPROVED_PAYMENT_LIST') {
        if (!['APPROVED', 'READY_TO_PAY'].includes(r.status)) return false;
      } else if (activeTab === 'PAID') {
        if (!['PAID', 'POSTED_TO_GL', 'ORIGINAL_RECEIVED'].includes(r.status)) return false;
      } else if (activeTab === 'DUPLICATES') {
        if (r.status !== 'HOLD_DUPLICATE' && !r.is_possible_duplicate) return false;
      } else if (activeTab === 'CLOSED') {
        if (r.status !== 'CLOSED') return false;
      } else if (activeTab === 'CANCELLED') {
        if (r.status !== 'CANCELLED') return false;
      }

      // Company
      if (selectedCompany !== 'ALL' && r.company !== selectedCompany) return false;

      // Branch
      if (selectedBranch !== 'ALL') {
        if (!matchBranch(selectedBranch, r.branch)) return false;
      }

      // Classification
      if (selectedClassification !== 'ALL' && r.classification !== selectedClassification) return false;

      // Urgency
      if (selectedUrgency !== 'ALL' && r.urgency !== selectedUrgency) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.pay_number.toLowerCase().includes(q) ||
          r.supplier_name.toLowerCase().includes(q) ||
          (r.invoice_number && r.invoice_number.toLowerCase().includes(q)) ||
          r.requester_name.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q) ||
          (r.po_pr_number && r.po_pr_number.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [
    requests,
    activeTab,
    selectedCompany,
    selectedBranch,
    selectedClassification,
    selectedUrgency,
    searchQuery,
  ]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const dataToExport = filteredRequests.map((r, i) => ({
      ลำดับ: i + 1,
      เลขที่คำขอ: r.pay_number,
      บริษัท: r.company,
      สาขา: r.branch,
      ประเภท: CLASSIFICATION_LABELS[r.classification] || r.classification,
      ความเร่งด่วน: r.urgency === 'EMERGENCY' ? 'ด่วนที่สุด' : 'ปกติ',
      สถานะ: STATUS_CONFIG[r.status]?.label || r.status,
      ผู้ขอเบิก: r.requester_name,
      ผู้รับเงิน: r.supplier_name,
      วันที่เอกสาร: r.document_date,
      เลขที่บิล: r.has_no_doc_number ? 'ไม่มีเลขที่' : r.invoice_number || '-',
      ยอดก่อนVAT: Number(r.subtotal_amount),
      VAT: Number(r.vat_amount),
      หักณที่จ่าย: Number(r.wht_amount),
      ยอดสุทธิ: Number(r.net_amount),
      วัตถุประสงค์: r.purpose,
      เลขที่PO_PR: r.po_pr_number || '-',
      ช่องทางชำระ: r.payment_method === 'PROMPTPAY' ? 'พร้อมเพย์' : r.payment_method === 'CASH_CHEQUE' ? 'เงินสด/เช็ค' : 'โอนผ่านธนาคาร',
      ธนาคาร: r.bank_name || '-',
      เลขบัญชี: r.bank_account_no || '-',
      ชื่อบัญชี: r.bank_account_name || r.supplier_name,
      วันที่จ่าย: r.paid_date || '-',
      เลขที่โอน: r.bank_reference_no || '-',
      ใบสำคัญGL: r.gl_voucher_no || '-',
      รับตัวจริงแล้ว: r.original_received_at ? 'ใช่' : 'ยังไม่ได้รับ',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PaymentRequests');
    XLSX.writeFile(wb, `Payment_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          {isAccountingUser ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-red-50 text-red-700 border border-red-200 uppercase">
                  Central Payment Register
                </span>
                <span className="text-xs text-gray-400 font-mono">TG • TE • TP</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-red-600" />
                </div>
                <span>ทะเบียนคุมการเบิกจ่ายกลาง (Payment Request & Register)</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
                ระบบควบคุมการเบิกจ่าย ตรวจสอบเอกสาร และป้องกันการจ่ายเงินซ้ำซ้อน ทั้งสำนักงานใหญ่และสาขาต่างจังหวัด
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  My Requests Portal
                </span>
                <span className="text-xs text-gray-400 font-medium">คำขอเบิกจ่ายส่วนตัว</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <span>รายการขอเบิกจ่ายเงินของฉัน (My Payment Requests)</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
                ติดตามสถานะการตรวจสอบเอกสาร การอนุมัติ และความคืบหน้าการโอนเงินของคำขอที่คุณเป็นผู้เบิก
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Export Excel
          </button>
          <Link
            href="/accounting/payment-requests/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            + สร้างใบขอจ่ายเงินใหม่ (New Request)
          </Link>
        </div>
      </div>

      {/* KPI Statistic Cards (Symmetrical 7-column Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium text-gray-600">คำขอทั้งหมด</span>
            <div className="p-1 bg-gray-50 rounded-lg">
              <Layers className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
            {stats?.total_count || 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono truncate">
            {Number(stats?.total_amount || 0).toLocaleString()} ฿
          </div>
        </div>

        {/* Pending AP Review */}
        <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-2xs hover:shadow-xs transition bg-red-50/20">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-bold text-gray-800">รอ AP ตรวจสอบ</span>
            <div className="p-1 bg-red-100 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-700 font-mono">
            {stats?.pending_review_count || 0}
          </div>
          <div className="text-[11px] text-red-700/80 mt-1 font-mono truncate">
            {Number(stats?.pending_review_amount || 0).toLocaleString()} ฿
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold text-gray-800">รออนุมัติ</span>
            <div className="p-1 bg-gray-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
            {stats?.pending_approval_count || 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 font-mono truncate">
            {Number(stats?.pending_approval_amount || 0).toLocaleString()} ฿
          </div>
        </div>

        {/* Ready to Pay (Approved List) */}
        <div className="bg-white p-4 rounded-2xl border border-red-300 shadow-2xs hover:shadow-xs transition bg-red-50/30">
          <div className="flex items-center justify-between text-red-700 mb-2">
            <span className="text-xs font-bold text-red-900">Approved (รอจ่าย)</span>
            <div className="p-1 bg-red-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-700 font-mono">
            {stats?.ready_to_pay_count || 0}
          </div>
          <div className="text-[11px] text-red-700 font-mono font-medium truncate">
            {Number(stats?.ready_to_pay_amount || 0).toLocaleString()} ฿
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium text-gray-600">จ่ายแล้ว (Paid)</span>
            <div className="p-1 bg-gray-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-800 font-mono">
            {stats?.paid_count || 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono truncate">
            {Number(stats?.paid_amount || 0).toLocaleString()} ฿
          </div>
        </div>

        {/* Duplicate Alerts */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs transition ${
            (stats?.duplicate_alert_count || 0) > 0
              ? 'bg-red-50/80 border-red-300 text-red-900'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-900">ตรวจพบซ้ำ / ระงับ</span>
            <div className="p-1 bg-red-100 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-red-700">
            {stats?.duplicate_alert_count || 0}
          </div>
          <div className="text-[11px] text-red-600/90 mt-1 font-medium">HOLD-DUPLICATE</div>
        </div>

        {/* Missing Originals */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold text-gray-700">รอเอกสารตัวจริง</span>
            <div className="p-1 bg-gray-50 rounded-lg">
              <Paperclip className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-800 font-mono">
            {stats?.missing_originals_count || 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">ยังไม่ได้รับเอกสารจริง</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { key: 'ALL', label: 'ทั้งหมด (All)', count: requests.length },
          {
            key: 'PENDING_SUPERVISOR',
            label: 'รอหัวหน้างานอนุมัติ',
            count: stats?.pending_supervisor_count || 0,
            alert: (stats?.pending_supervisor_count || 0) > 0,
          },
          {
            key: 'PENDING_REVIEW',
            label: 'รอ AP ตรวจสอบ',
            count: stats?.pending_review_count || 0,
            alert: (stats?.pending_review_count || 0) > 0,
          },
          {
            key: 'PENDING_APPROVAL',
            label: 'รออนุมัติ',
            count: stats?.pending_approval_count || 0,
          },
          {
            key: 'APPROVED_PAYMENT_LIST',
            label: 'Approved Payment List (การเงินรอจ่าย)',
            count: stats?.ready_to_pay_count || 0,
            highlight: true,
          },
          {
            key: 'PAID',
            label: 'จ่ายแล้ว (Paid)',
            count: stats?.paid_count || 0,
          },
          {
            key: 'DUPLICATES',
            label: 'พบความซ้ำซ้อน (Duplicate Alerts)',
            count: stats?.duplicate_alert_count || 0,
            isWarning: (stats?.duplicate_alert_count || 0) > 0,
          },
          { key: 'CLOSED', label: 'ปิดรายการแล้ว' },
          { key: 'CANCELLED', label: 'ยกเลิก' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-red-700 hover:bg-red-50/30 border border-gray-200 hover:border-red-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : tab.isWarning
                      ? 'bg-red-100 text-red-700 font-bold'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar (Symmetrical 2-Row Layout) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Company Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-red-500" /> บริษัท:
            </span>
            {['ALL', 'TG', 'TE', 'TP'].map((comp) => (
              <button
                key={comp}
                onClick={() => setSelectedCompany(comp)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                  selectedCompany === comp
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {comp === 'ALL' ? 'ทุกบริษัท' : comp}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหา PAY No., ผู้ขาย, เลขที่บิล, ผู้ขอ, PO/PR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 placeholder:text-gray-400 shadow-2xs transition"
            />
          </div>
        </div>

        {/* Secondary Filter Row (Symmetrical 3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-gray-100 text-xs">
          {/* Branch */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium whitespace-nowrap">สาขา:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 font-medium shadow-2xs transition"
            >
              {availableBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Classification */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium whitespace-nowrap">ประเภท:</span>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 font-medium shadow-2xs transition"
            >
              <option value="ALL">ทุกประเภท (All Classifications)</option>
              <option value="VENDOR_BILL">ชำระเจ้าหนี้การค้า</option>
              <option value="REIMBURSEMENT">เบิกจ่ายพนักงาน/สำรองจ่าย</option>
              <option value="BRANCH_SITE">ขอเบิกสาขา/ไซต์งาน</option>
              <option value="PETTY_CASH">เงินสดย่อย</option>
              <option value="CASH_ADVANCE">เงินทดรองจ่าย</option>
            </select>
          </div>

          {/* Urgency */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium whitespace-nowrap">ความเร่งด่วน:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 font-medium shadow-2xs transition"
            >
              <option value="ALL">ทั้งหมด (All Urgency)</option>
              <option value="NORMAL">ปกติ (Normal)</option>
              <option value="EMERGENCY">ด่วนที่สุด (Emergency)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">เลขที่คำขอ / PAY No.</th>
                <th className="py-3.5 px-4">สถานะ (Status)</th>
                <th className="py-3.5 px-4">ผู้รับเงิน / เจ้าหนี้</th>
                <th className="py-3.5 px-4">เลขที่บิล / วันที่</th>
                <th className="py-3.5 px-4">สาขา / ผู้ขอเบิก</th>
                <th className="py-3.5 px-4 text-right">ยอดชำระสุทธิ (Net)</th>
                <th className="py-3.5 px-4 text-center">ครบกำหนด</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-sm text-gray-700">ไม่พบรายการขอเบิกจ่ายที่ตรงกับเงื่อนไข</p>
                    <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกด "สร้างใบขอจ่ายเงินใหม่"</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const companyStyle = COMPANY_COLORS[r.company] || COMPANY_COLORS.TG;
                  const statusStyle = STATUS_CONFIG[r.status] || STATUS_CONFIG.SUBMITTED;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-red-50/20 transition ${
                        r.status === 'HOLD_DUPLICATE'
                          ? 'bg-red-50/40 border-l-4 border-l-red-600'
                          : r.urgency === 'EMERGENCY'
                          ? 'bg-red-50/15'
                          : ''
                      }`}
                    >
                      {/* PAY No. & Company */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${companyStyle.bg} ${companyStyle.text} ${companyStyle.border}`}
                          >
                            {r.company}
                          </span>
                          <Link
                            href={`/accounting/payment-requests/${r.id}`}
                            className="font-bold text-gray-900 hover:text-red-600 hover:underline"
                          >
                            {r.pay_number}
                          </Link>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {CLASSIFICATION_LABELS[r.classification] || r.classification}
                        </div>
                        {r.urgency === 'EMERGENCY' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-red-600 bg-red-100/70 border border-red-200 px-1 rounded">
                            <Zap className="w-2.5 h-2.5" /> ด่วนที่สุด
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {statusStyle.label}
                        </span>
                        {r.is_possible_duplicate && r.status !== 'HOLD_DUPLICATE' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-700">
                            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                            <span>ตรวจสอบซ้ำซ้อน</span>
                          </span>
                        )}
                        {r.status === 'PAID' && !r.original_received_at && (
                          <span className="block mt-1 text-[9px] text-gray-600 bg-gray-100 px-1 rounded border border-gray-200">
                            รอเอกสารตัวจริง
                          </span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 truncate max-w-[220px]">
                          {r.supplier_name}
                        </p>
                        {r.bank_account_no && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                              r.payment_method === 'PROMPTPAY' || r.bank_name?.includes('พร้อมเพย์')
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {r.payment_method === 'PROMPTPAY' || r.bank_name?.includes('พร้อมเพย์') ? 'พร้อมเพย์' : 'ธนาคาร'}
                            </span>
                            <span className="font-mono font-medium text-gray-800 truncate max-w-[150px]" title={`${r.bank_name || ''} ${r.bank_account_no}`}>
                              {r.bank_account_no}
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 truncate max-w-[220px]">
                          {r.purpose}
                        </p>
                      </td>

                      {/* Invoice & Date */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-gray-800 font-medium">
                          {r.has_no_doc_number ? (
                            <span className="text-gray-400 italic font-sans text-[11px]">ไม่มีเลขที่บิล</span>
                          ) : (
                            r.invoice_number || '-'
                          )}
                        </span>
                        <div className="text-[10px] text-gray-400">{formatDisplayDate(r.document_date)}</div>
                      </td>

                      {/* Branch & Requester */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-800">{r.branch}</span>
                        <div className="text-[10px] text-gray-400">
                          ผู้ขอ: {r.requester_name}
                          {r.requester_department ? ` (${r.requester_department})` : ''}
                        </div>
                      </td>

                      {/* Net Amount */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-gray-900 text-sm">
                          {Number(r.net_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          (ก่อน VAT {Number(r.subtotal_amount).toLocaleString()})
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-gray-600">
                        {formatDisplayDate(r.requested_payment_date) || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setVoucherModalItem(r)}
                            title="พิมพ์ใบขออนุมัติจ่าย (Print Voucher)"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/accounting/payment-requests/${r.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-red-600 text-gray-700 hover:text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                          >
                            <span>ดูรายการ</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          {isManager && (
                            <button
                              onClick={() => handleDelete(r)}
                              title="ลบคำขอนี้"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info (Symmetrical Summary Bar) */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
          <span>
            แสดงทั้งหมด <b>{filteredRequests.length}</b> จาก <b>{requests.length}</b> รายการ
          </span>
          <span className="font-mono text-gray-600">
            ยอดรวมหน้านี้:{' '}
            <b className="text-red-700 font-bold text-sm">
              {filteredRequests
                .reduce((acc, curr) => acc + Number(curr.net_amount), 0)
                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              ฿
            </b>
          </span>
        </div>
      </div>

      {/* Printable Voucher Modal */}
      {voucherModalItem && (
        <PrintablePaymentVoucher
          request={voucherModalItem}
          onClose={() => setVoucherModalItem(null)}
          onUpdate={(updated) => {
            setVoucherModalItem(updated);
            setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          }}
        />
      )}
    </div>
  );
}
