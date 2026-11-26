"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Upload,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Link2,
  Trash2,
  X,
  FileSpreadsheet,
  Ban,
  RotateCcw,
  Loader2,
  Download,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  parseBankStatementFileBuffer,
  extractTransactionsFromMatrix,
  type BankStatementColumnMapping,
  type ParsedBankStatementResult,
  type SupportedBankCode,
} from '@/app/lib/bank-statement-parser';
import {
  deleteBankStatementBatch,
  getBankReconciliationData,
  ignoreBankTransaction,
  reconcileBankTransaction,
  searchReconcileTargets,
  unmatchBankTransaction,
  importBankStatement,
  type ReconcileCandidate,
} from '@/app/actions/bankReconciliation';
import type { DrilldownItem } from './FinancialDrilldownModal';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatThaiDateShort(isoDate: string | null | undefined) {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(d);
}

interface BankReconciliationTabProps {
  initialReconciliation: any;
  selectedEntity: string;
  currentStartDate: string;
  currentEndDate: string;
  onOpenDrilldown: (item: DrilldownItem) => void;
  onReconcileSuccess: () => void;
}

export default function BankReconciliationTab({
  initialReconciliation,
  selectedEntity,
  currentStartDate,
  currentEndDate,
  onOpenDrilldown,
  onReconcileSuccess,
}: BankReconciliationTabProps) {
  const [reconData, setReconData] = useState(initialReconciliation);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setReconData(initialReconciliation);
  }, [initialReconciliation]);

  // Filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUGGESTED' | 'UNMATCHED' | 'MATCHED' | 'IGNORED'>('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCompany, setImportCompany] = useState<string>(
    selectedEntity !== 'ALL' ? selectedEntity : 'TG'
  );
  const [importBank, setImportBank] = useState<SupportedBankCode>('KBANK');
  const [importAccountNo, setImportAccountNo] = useState('');
  const [importAccountName, setImportAccountName] = useState('');
  const [importNote, setImportNote] = useState('');
  const [autoMatchSettled, setAutoMatchSettled] = useState(true);
  const [parsedStatement, setParsedStatement] = useState<ParsedBankStatementResult | null>(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Manual Match Modal State
  const [matchTx, setMatchTx] = useState<any | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ReconcileCandidate[] | null>(null);
  const [isSearchingTargets, setIsSearchingTargets] = useState(false);
  const [reconcileMode, setReconcileMode] = useState<'LINK_AND_VERIFY' | 'LINK_AND_DEPOSIT' | 'LINK_ONLY'>('LINK_AND_VERIFY');
  const [reconcileInvoiceNo, setReconcileInvoiceNo] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [busyTxId, setBusyTxId] = useState<string | null>(null);

  const refreshReconciliation = async (batchOverride?: string) => {
    setIsRefreshing(true);
    try {
      const next = await getBankReconciliationData({
        entity: selectedEntity,
        startDate: currentStartDate || undefined,
        endDate: currentEndDate || undefined,
        batchId: (batchOverride ?? selectedBatchId) !== 'ALL' ? (batchOverride ?? selectedBatchId) : undefined,
      });
      setReconData(next);
      onReconcileSuccess();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'โหลดข้อมูล Bank Statement ไม่สำเร็จ',
        text: err?.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      '\uFEFF' +
      [
        'วันที่,เวลา,รายการ,ถอน,ฝาก,ยอดคงเหลือ,เลขอ้างอิง,รายละเอียด',
        '25/11/2569,09:15,รับโอนเงิน,,107000.00,1520400.00,REF2511001,รับโอนจาก บจก.ตัวอย่าง ค่างวด JB69-110001',
        '25/11/2569,14:30,โอนเงินออก,45000.00,,1475400.00,PAY2511002,ชำระค่าสินค้า PO-2026-001',
        '26/11/2569,10:05,ค่าธรรมเนียมโอน,15.00,,1475385.00,FEE001,ค่าธรรมเนียมการโอนเงินต่างธนาคาร',
      ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-bank-statement.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = parseBankStatementFileBuffer(buffer, file.name);
      setParsedStatement(result);
      if (result.detectedBankName !== 'OTHER') setImportBank(result.detectedBankName);
      if (result.detectedAccountNumber) setImportAccountNo(result.detectedAccountNumber);
      if (result.detectedAccountName) setImportAccountName(result.detectedAccountName);
      if (result.rows.length === 0) {
        setShowColumnMapper(true);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'อ่านไฟล์ Statement ไม่ได้',
        text: err?.message || 'รองรับไฟล์ .csv, .xlsx และ .xls',
      });
    }
  };

  const handleMappingChange = (patch: Partial<BankStatementColumnMapping>) => {
    if (!parsedStatement) return;
    const updated = extractTransactionsFromMatrix(
      parsedStatement.rawRows,
      parsedStatement.fileName,
      parsedStatement.sheetName,
      { ...parsedStatement.mapping, ...patch }
    );
    setParsedStatement(updated);
  };

  const handleConfirmImport = async () => {
    if (!parsedStatement || parsedStatement.rows.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      const res = await importBankStatement({
        companyCode: importCompany,
        bankName: importBank,
        accountNumber: importAccountNo || null,
        accountName: importAccountName || null,
        fileName: parsedStatement.fileName,
        periodStart: parsedStatement.periodStart,
        periodEnd: parsedStatement.periodEnd,
        note: importNote || null,
        autoMatchSettled,
        rows: parsedStatement.rows,
      });

      if (!res?.success) {
        Swal.fire({
          icon: 'warning',
          title: 'นำเข้าไม่สำเร็จ',
          text: res?.error || 'ไม่พบรายการใหม่ให้นำเข้า',
        });
        return;
      }

      setIsImportModalOpen(false);
      setParsedStatement(null);
      setImportNote('');
      await refreshReconciliation('ALL');
      setSelectedBatchId('ALL');

      await Swal.fire({
        icon: 'success',
        title: `นำเข้า Statement (${res.batchCode}) สำเร็จ`,
        html: `
          <div class="text-xs text-left space-y-1.5 mt-2">
            <div>• นำเข้าใหม่: <b>${res.insertedCount}</b> รายการ (ข้ามรายการซ้ำ ${res.duplicateSkippedCount} รายการ)</div>
            <div>• จับคู่บิลที่ปิดรับเงินแล้วอัตโนมัติ: <b class="text-emerald-600">${res.matchedCount}</b> รายการ</div>
            <div>• พบรายการแนะนำรอตรวจ: <b class="text-amber-600">${res.suggestedCount}</b> รายการ</div>
          </div>
        `,
        confirmButtonColor: '#059669',
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการนำเข้า',
        text: err?.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleQuickConfirmSuggested = async (tx: any, candidate: ReconcileCandidate, mode: 'LINK_AND_VERIFY' | 'LINK_ONLY') => {
    setBusyTxId(tx.id);
    try {
      const res = await reconcileBankTransaction({
        transactionId: tx.id,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        mode,
      });
      if (!res?.success) {
        Swal.fire({ icon: 'error', title: 'กระทบยอดไม่สำเร็จ', text: res?.error || 'เกิดข้อผิดพลาด' });
        return;
      }
      await refreshReconciliation();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: mode === 'LINK_AND_VERIFY' ? 'กระทบยอดและปิดบิลเรียบร้อย' : 'จับคู่กระทบยอดสำเร็จ',
        showConfirmButton: false,
        timer: 2000,
      });
    } finally {
      setBusyTxId(null);
    }
  };

  const handleManualReconcile = async (candidate: ReconcileCandidate) => {
    if (!matchTx) return;
    setBusyTxId(matchTx.id);
    try {
      const res = await reconcileBankTransaction({
        transactionId: matchTx.id,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        mode: reconcileMode,
        invoiceNumber: reconcileInvoiceNo || undefined,
        note: reconcileNote || undefined,
      });
      if (!res?.success) {
        Swal.fire({ icon: 'error', title: 'กระทบยอดไม่สำเร็จ', text: res?.error || 'เกิดข้อผิดพลาด' });
        return;
      }
      setMatchTx(null);
      setSearchResults(null);
      setCandidateSearch('');
      setReconcileInvoiceNo('');
      setReconcileNote('');
      await refreshReconciliation();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'กระทบยอดรายการธนาคารสำเร็จ',
        showConfirmButton: false,
        timer: 2000,
      });
    } finally {
      setBusyTxId(null);
    }
  };

  const handleSearchTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchTx) return;
    setIsSearchingTargets(true);
    try {
      const rows = await searchReconcileTargets({
        txType: matchTx.txType,
        query: candidateSearch,
        entity: selectedEntity,
      });
      setSearchResults(rows);
    } finally {
      setIsSearchingTargets(false);
    }
  };

  const handleIgnoreTx = async (tx: any) => {
    const confirm = await Swal.fire({
      title: 'ข้ามรายการนี้จากการกระทบยอด?',
      text: `${tx.description} (${formatCurrency(tx.amount)})`,
      input: 'text',
      inputPlaceholder: 'เหตุผล เช่น ค่าธรรมเนียมธนาคาร / โอนระหว่างบัญชีบริษัท',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันข้ามรายการ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#475569',
    });
    if (!confirm.isConfirmed) return;
    setBusyTxId(tx.id);
    try {
      await ignoreBankTransaction(tx.id, confirm.value || undefined);
      await refreshReconciliation();
    } finally {
      setBusyTxId(null);
    }
  };

  const handleUnmatchTx = async (tx: any) => {
    setBusyTxId(tx.id);
    try {
      await unmatchBankTransaction(tx.id);
      await refreshReconciliation();
    } finally {
      setBusyTxId(null);
    }
  };

  const handleDeleteBatch = async (batch: any) => {
    const confirm = await Swal.fire({
      title: `ลบไฟล์ Statement ${batch.batchCode}?`,
      text: `ไฟล์ ${batch.fileName} (${batch.totalRows} รายการ) จะถูกลบออกทั้งหมด (สถานะบิลที่ยืนยันไปแล้วในระบบ AR/AP จะไม่ถูกลบ)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'ลบชุดข้อมูล',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;
    await deleteBankStatementBatch(batch.id);
    if (selectedBatchId === batch.id) setSelectedBatchId('ALL');
    await refreshReconciliation('ALL');
  };

  const transactions = reconData?.transactions || [];
  const batches = reconData?.batches || [];
  const summary = reconData?.summary || {};

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: any) => {
      if (selectedBatchId !== 'ALL' && tx.batchId !== selectedBatchId) return false;
      if (statusFilter !== 'ALL' && tx.matchStatus !== statusFilter) return false;
      if (txTypeFilter !== 'ALL' && tx.txType !== txTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          tx.description?.toLowerCase().includes(q) ||
          tx.referenceNo?.toLowerCase().includes(q) ||
          tx.counterpartyName?.toLowerCase().includes(q) ||
          tx.matchedJobNumber?.toLowerCase().includes(q) ||
          tx.matchedCustomerName?.toLowerCase().includes(q) ||
          String(tx.amount).includes(q)
        );
      }
      return true;
    });
  }, [transactions, selectedBatchId, statusFilter, txTypeFilter, searchQuery]);

  const activeMatchCandidates: ReconcileCandidate[] = useMemo(() => {
    if (searchResults !== null) return searchResults;
    return matchTx?.candidates || [];
  }, [searchResults, matchTx]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>ยอดเงินเข้าจาก Statement</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(summary.totalCreditAmount)}</div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
            <span>{summary.totalCreditCount || 0} รายการเงินเข้า</span>
            <span className="font-semibold text-emerald-700">จับคู่แล้ว {formatCurrency(summary.matchedCreditAmount)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>รอตรวจ / แนะนำจับคู่</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{summary.suggestedCreditCount || 0} รายการ</div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            ระบบจับคู่เลขบิล/ยอดเงินให้อัตโนมัติ รอกดยืนยัน
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>เงินเข้ายังไม่ระบุผู้จ่าย</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{formatCurrency(summary.unmatchedCreditAmount)}</div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
            <span>ค้างกระทบยอดทั้งหมด</span>
            <span className="font-bold text-amber-700">{summary.unmatchedCreditCount || 0} ยอด</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>เงินโอนออก (Debit / AP)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(summary.totalDebitAmount)}</div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
            <span>{summary.totalDebitCount || 0} รายการจ่าย</span>
            <span>จับคู่แล้ว {summary.matchedDebitCount || 0} รายการ</span>
          </div>
        </div>
      </div>

      {/* 2. Workspace Header & Import Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              นำเข้า Bank Statement &amp; กระทบยอดบัญชีจริง (Bank Reconciliation)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              รองรับไฟล์ CSV / Excel จากธนาคาร KBANK, SCB, BBL, KTB, BAY, TTB จับคู่อ้างอิงใบกำกับภาษี / เลขที่งาน / หัก ณ ที่จ่าย 1–5%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ไฟล์ตัวอย่าง (.csv)
            </button>

            <button
              type="button"
              onClick={() => refreshReconciliation()}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>

            <button
              type="button"
              onClick={() => {
                setImportCompany(selectedEntity !== 'ALL' ? selectedEntity : 'TG');
                setIsImportModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Bank Statement
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { key: 'ALL', label: `ทั้งหมด (${transactions.length})` },
                { key: 'SUGGESTED', label: `แนะนำจับคู่ (${transactions.filter((t: any) => t.matchStatus === 'SUGGESTED').length})` },
                { key: 'UNMATCHED', label: `ยังไม่จับคู่ (${transactions.filter((t: any) => t.matchStatus === 'UNMATCHED').length})` },
                { key: 'MATCHED', label: `จับคู่แล้ว (${transactions.filter((t: any) => t.matchStatus === 'MATCHED').length})` },
                { key: 'IGNORED', label: `ข้าม (${transactions.filter((t: any) => t.matchStatus === 'IGNORED').length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value as any)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
            >
              <option value="ALL">ทั้งเงินเข้า &amp; เงินออก</option>
              <option value="CREDIT">เฉพาะเงินเข้า (Credit)</option>
              <option value="DEBIT">เฉพาะเงินออก (Debit)</option>
            </select>

            {batches.length > 0 && (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 max-w-[220px]"
              >
                <option value="ALL">ทุกไฟล์ Statement ({batches.length})</option>
                {batches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} • {b.bankName} ({b.fileName})
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหายอด, ชื่อผู้โอน, เลขงาน..."
                className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3.5">วันที่ / เวลา</th>
                <th className="py-3 px-3.5">ธนาคาร / บริษัท</th>
                <th className="py-3 px-3.5">รายละเอียดรายการ / อ้างอิง</th>
                <th className="py-3 px-3.5 text-right">จำนวนเงิน</th>
                <th className="py-3 px-3.5">สถานะ &amp; รายการที่จับคู่</th>
                <th className="py-3 px-3.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      {transactions.length === 0
                        ? 'ยังไม่มีข้อมูล Bank Statement ในช่วงเวลานี้'
                        : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      กดปุ่ม &quot;Import Bank Statement&quot; ด้านบนเพื่อนำเข้าไฟล์ .csv หรือ .xlsx จากธนาคาร
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx: any) => {
                  const topCandidate: ReconcileCandidate | undefined = tx.candidates?.[0];
                  const isBusy = busyTxId === tx.id;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors align-top">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatThaiDateShort(tx.transactionDate)}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tx.transactionTime || '-'}</div>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{tx.bankName}</div>
                        <div className="text-[11px] text-slate-500">
                          {tx.companyCode}
                          {tx.accountNumber ? ` • ${tx.accountNumber}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 max-w-[300px]">
                        <div className="font-medium text-slate-900 break-words">{tx.description}</div>
                        {(tx.counterpartyName || tx.referenceNo || tx.channel) && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                            {tx.counterpartyName && <span>คู่โอน: {tx.counterpartyName}</span>}
                            {tx.referenceNo && <span className="font-mono">Ref: {tx.referenceNo}</span>}
                            {tx.channel && <span>({tx.channel})</span>}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-sm tabular-nums ${
                            tx.txType === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {tx.txType === 'CREDIT' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                        {tx.balanceAfter !== null && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            เหลือ {formatCurrency(tx.balanceAfter)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 min-w-[230px]">
                        {tx.matchStatus === 'MATCHED' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              จับคู่แล้ว
                            </span>
                            <div className="font-bold text-slate-900 text-xs">
                              {tx.matchedJobNumber || '-'} • {tx.matchedCustomerName || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {tx.matchReason || ''} {tx.matchedBy ? `(${tx.matchedBy})` : ''}
                            </div>
                          </div>
                        ) : tx.matchStatus === 'SUGGESTED' && topCandidate ? (
                          <div className="space-y-1 p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                            <div className="flex items-center justify-between gap-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                แนะนำอัตโนมัติ ({topCandidate.score}%)
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-[11px]">
                              {topCandidate.referenceNumber} • {topCandidate.counterpartyName}
                            </div>
                            <div className="text-[10px] text-amber-800">
                              {topCandidate.matchReason} (บิล {formatCurrency(topCandidate.billedAmount)})
                            </div>
                          </div>
                        ) : tx.matchStatus === 'IGNORED' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <Ban className="w-3 h-3" />
                              ข้ามรายการ
                            </span>
                            <div className="text-[10px] text-slate-500">{tx.matchReason || '-'}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            ยังไม่จับคู่
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {tx.matchStatus === 'SUGGESTED' && topCandidate && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleQuickConfirmSuggested(tx, topCandidate, 'LINK_AND_VERIFY')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              ยืนยัน+ปิดบิล
                            </button>
                          )}

                          {(tx.matchStatus === 'UNMATCHED' || tx.matchStatus === 'SUGGESTED') && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setMatchTx(tx);
                                  setSearchResults(null);
                                  setCandidateSearch(tx.counterpartyName || tx.matchedJobNumber || '');
                                  setReconcileMode('LINK_AND_VERIFY');
                                  setReconcileInvoiceNo('');
                                  setReconcileNote('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <Link2 className="w-3 h-3" />
                                จับคู่
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleIgnoreTx(tx)}
                                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold disabled:opacity-50"
                              >
                                ข้าม
                              </button>
                            </>
                          )}

                          {tx.matchStatus === 'MATCHED' && (
                            <>
                              {tx.matchedJobId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenDrilldown({
                                      id: tx.matchedPaymentTaskId || tx.matchedJobId,
                                      jobId: tx.matchedJobId,
                                      title: `กระทบยอด: ${tx.matchedJobNumber}`,
                                      contractOrJobNo: tx.matchedJobNumber || '-',
                                      customerName: tx.matchedCustomerName || '-',
                                      companyCode: tx.companyCode,
                                      amount: tx.amount,
                                      status: 'กระทบยอดแล้ว',
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  ดูงาน
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUnmatchTx(tx)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold disabled:opacity-50"
                              >
                                ยกเลิกจับคู่
                              </button>
                            </>
                          )}

                          {tx.matchStatus === 'IGNORED' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUnmatchTx(tx)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold disabled:opacity-50"
                            >
                              นำกลับมากระทบยอด
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
      </div>

      {/* 3. Imported Batches History */}
      {batches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            ประวัติไฟล์ Bank Statement ที่นำเข้าแล้ว ({batches.length} ไฟล์ล่าสุด)
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Batch / ไฟล์</th>
                  <th className="py-2.5 px-3">บริษัท / ธนาคาร</th>
                  <th className="py-2.5 px-3">ช่วงวันที่</th>
                  <th className="py-2.5 px-3 text-right">ยอดเงินเข้า</th>
                  <th className="py-2.5 px-3 text-right">ยอดเงินออก</th>
                  <th className="py-2.5 px-3">ผู้นำเข้า</th>
                  <th className="py-2.5 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-900">{b.batchCode}</div>
                      <div className="text-[11px] text-slate-500">{b.fileName} ({b.totalRows} รายการ)</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800">{b.companyCode}</span> • {b.bankName}
                      {b.accountNumber && <div className="text-[11px] text-slate-400 font-mono">{b.accountNumber}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {b.periodStart || '-'} ถึง {b.periodEnd || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {formatCurrency(b.totalCreditAmount)} ({b.creditRows})
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                      {formatCurrency(b.totalDebitAmount)} ({b.debitRows})
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{b.importedByName}</div>
                      <div className="text-[10px] text-slate-400">{formatThaiDateShort(b.importedAt)}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteBatch(b)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบชุด Statement นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  นำเข้า Bank Statement เพื่อกระทบยอดจริง
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รองรับไฟล์ .csv, .xlsx, .xls จากทุกธนาคาร (ระบบแปลง พ.ศ./ค.ศ. และ TIS-620/UTF-8 ให้อัตโนมัติ)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">บริษัท / นิติบุคคล</label>
                <select
                  value={importCompany}
                  onChange={(e) => setImportCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="TG">TG: เทอรา กรุ้ป</option>
                  <option value="TE">TE: เทอรา อิเล็คทริค</option>
                  <option value="TP">TP: เทอรา พาวเวอร์</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ธนาคาร</label>
                <select
                  value={importBank}
                  onChange={(e) => setImportBank(e.target.value as SupportedBankCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="KBANK">กสิกรไทย (KBANK)</option>
                  <option value="SCB">ไทยพาณิชย์ (SCB)</option>
                  <option value="BBL">กรุงเทพ (BBL)</option>
                  <option value="KTB">กรุงไทย (KTB)</option>
                  <option value="BAY">กรุงศรี (BAY)</option>
                  <option value="TTB">ทหารไทยธนชาต (TTB)</option>
                  <option value="OTHER">ธนาคารอื่น / ทั่วไป</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">เลขที่บัญชี (ถ้ามี)</label>
                <input
                  type="text"
                  value={importAccountNo}
                  onChange={(e) => setImportAccountNo(e.target.value)}
                  placeholder="เช่น 123-4-56789-0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุไฟล์</label>
                <input
                  type="text"
                  value={importNote}
                  onChange={(e) => setImportNote(e.target.value)}
                  placeholder="เช่น บัญชีกระแสรายวัน พ.ย."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-center space-y-2">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                className="block mx-auto text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 pt-1">
                <input
                  type="checkbox"
                  checked={autoMatchSettled}
                  onChange={(e) => setAutoMatchSettled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>จับคู่อัตโนมัติทันทีเฉพาะรายการที่บิลปิดรับเงินแล้ว (ความมั่นใจ ≥ 88%)</span>
              </label>
            </div>

            {parsedStatement && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span>พบทั้งหมด <b>{parsedStatement.rows.length}</b> รายการ</span>
                    <span className="text-emerald-700 font-bold">
                      เงินเข้า {parsedStatement.creditCount} รายการ ({formatCurrency(parsedStatement.totalCreditAmount)})
                    </span>
                    <span className="text-rose-700 font-bold">
                      เงินออก {parsedStatement.debitCount} รายการ ({formatCurrency(parsedStatement.totalDebitAmount)})
                    </span>
                    {parsedStatement.periodStart && (
                      <span className="text-slate-500">
                        ช่วงวันที่: {parsedStatement.periodStart} ถึง {parsedStatement.periodEnd}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColumnMapper((v) => !v)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold inline-flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    ปรับคอลัมน์เอง
                  </button>
                </div>

                {showColumnMapper && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-[11px]">
                    {[
                      { label: 'คอลัมน์วันที่', key: 'dateCol' as const, required: true },
                      { label: 'คอลัมน์ฝาก/เงินเข้า', key: 'creditCol' as const, required: false },
                      { label: 'คอลัมน์ถอน/เงินออก', key: 'debitCol' as const, required: false },
                      { label: 'คอลัมน์ยอดเดี่ยว (บวก/ลบ)', key: 'amountCol' as const, required: false },
                      { label: 'คอลัมน์รายละเอียด', key: 'descriptionCol' as const, required: false },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block font-bold text-slate-700 mb-1">{field.label}</label>
                        <select
                          value={parsedStatement.mapping[field.key] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            handleMappingChange({
                              [field.key]: field.required ? val ?? 0 : val,
                            });
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {!field.required && <option value="">- ไม่ใช้ -</option>}
                          {parsedStatement.headers.map((h, idx) => (
                            <option key={idx} value={idx}>
                              [{idx + 1}] {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">วันที่</th>
                        <th className="py-2 px-2.5">เวลา</th>
                        <th className="py-2 px-2.5">ประเภท</th>
                        <th className="py-2 px-2.5 text-right">จำนวนเงิน</th>
                        <th className="py-2 px-2.5">รายละเอียด / Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedStatement.rows.slice(0, 20).map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="py-1.5 px-2.5 text-slate-400">{row.rowNumber}</td>
                          <td className="py-1.5 px-2.5 font-mono">{row.transactionDate}</td>
                          <td className="py-1.5 px-2.5 font-mono text-slate-500">{row.transactionTime || '-'}</td>
                          <td className="py-1.5 px-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                row.txType === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {row.txType === 'CREDIT' ? 'เงินเข้า' : 'เงินออก'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold tabular-nums">{formatCurrency(row.amount)}</td>
                          <td className="py-1.5 px-2.5 truncate max-w-[260px]">{row.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isImporting || !parsedStatement || parsedStatement.rows.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                นำเข้าและจับคู่อัตโนมัติ ({parsedStatement?.rows.length || 0} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Reconcile Picker Modal */}
      {matchTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  เลือกจับคู่รายการ {matchTx.txType === 'CREDIT' ? 'ลูกหนี้รับเงิน (AR)' : 'เจ้าหนี้จ่ายเงิน (AP)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatThaiDateShort(matchTx.transactionDate)} • <b className="text-slate-900">{formatCurrency(matchTx.amount)}</b> • {matchTx.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMatchTx(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">การอัปเดตสถานะหลังจับคู่</label>
                <select
                  value={reconcileMode}
                  onChange={(e) => setReconcileMode(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  <option value="LINK_AND_VERIFY">
                    {matchTx.txType === 'CREDIT'
                      ? 'จับคู่ + ยืนยันปิดรับเงินในระบบบัญชี'
                      : 'จับคู่ + ยืนยันจ่ายเจ้าหนี้แล้ว (PAID_VERIFIED)'}
                  </option>
                  {matchTx.txType === 'CREDIT' && (
                    <option value="LINK_AND_DEPOSIT">จับคู่ + บันทึกเป็นเงินมัดจำบางส่วน</option>
                  )}
                  <option value="LINK_ONLY">จับคู่กระทบยอดอย่างเดียว (คงสถานะบิลเดิม)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {matchTx.txType === 'CREDIT' ? 'เลขที่ใบกำกับภาษี / ใบเสร็จ (ถ้ามี)' : 'หมายเหตุเพิ่มเติม'}
                </label>
                <input
                  type="text"
                  value={matchTx.txType === 'CREDIT' ? reconcileInvoiceNo : reconcileNote}
                  onChange={(e) =>
                    matchTx.txType === 'CREDIT'
                      ? setReconcileInvoiceNo(e.target.value)
                      : setReconcileNote(e.target.value)
                  }
                  placeholder={matchTx.txType === 'CREDIT' ? 'เช่น RE6911...' : 'บันทึกหมายเหตุ...'}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <form onSubmit={handleSearchTargets} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder={
                    matchTx.txType === 'CREDIT'
                      ? 'พิมพ์ค้นหาเลขที่งาน JB..., ชื่อลูกค้า, หรือเลขใบกำกับ...'
                      : 'พิมพ์ค้นหาเลขที่ PO..., ชื่อซัพพลายเออร์...'
                  }
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingTargets}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
              >
                {isSearchingTargets ? 'กำลังค้น...' : 'ค้นหา'}
              </button>
            </form>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeMatchCandidates.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">
                  ไม่พบรายการตรงกัน ลองพิมพ์ค้นหาเลขที่งานหรือชื่อลูกค้าด้านบน
                </p>
              ) : (
                activeMatchCandidates.map((cand) => (
                  <div
                    key={cand.targetId}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{cand.referenceNumber}</span>
                        <span className="font-bold text-slate-800">{cand.counterpartyName}</span>
                        {cand.score > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            แนะนำ {cand.score}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ยอดบิล {formatCurrency(cand.billedAmount)} • ค้างรับ {formatCurrency(cand.remainingAmount)} • สถานะ: {cand.status}
                        {cand.invoiceNumbers.length > 0 ? ` • บิล: ${cand.invoiceNumbers.join(', ')}` : ''}
                      </div>
                      {cand.matchReason && <div className="text-[10px] text-blue-700">{cand.matchReason}</div>}
                    </div>
                    <button
                      type="button"
                      disabled={busyTxId === matchTx.id}
                      onClick={() => handleManualReconcile(cand)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 disabled:opacity-50"
                    >
                      เลือกจับคู่นี้
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
