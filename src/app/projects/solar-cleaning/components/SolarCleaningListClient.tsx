'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSignature,
  FileText,
  FolderKanban,
  PenTool,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  countReportPhotos,
  formatCleaningDateBkk,
  getSolarCleaningStatusMeta,
  normalizeReportData,
  resolveManagerSignConfig,
  type SolarCleaningRecord,
} from '@/app/lib/solarCleaningConfig';
import SolarCleaningPdfModal from './SolarCleaningPdfModal';

interface SolarCleaningListClientProps {
  records: SolarCleaningRecord[];
  canCreate: boolean;
  userRole: string;
}

export default function SolarCleaningListClient({
  records,
  canCreate,
}: SolarCleaningListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [pdfModal, setPdfModal] = useState<{
    id: string;
    docNumber: string;
    customerName: string;
    type: 'system-check' | 'inspection-report';
  } | null>(null);

  const stats = useMemo(() => {
    const total = records.length;
    const precheckStage = records.filter(
      (r) => r.status === 'Draft' || r.status === 'Precheck Ready' || r.status === 'Customer Signed'
    ).length;
    const pendingMgrSign = records.filter((r) => r.status === 'Pending Manager Sign').length;
    const completed = records.filter((r) => r.status === 'Completed').length;
    return { total, precheckStage, pendingMgrSign, completed };
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.docNumber.toLowerCase().includes(q) ||
        r.projectName.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.inspectorNames || '').toLowerCase().includes(q)
      );
    });
  }, [records, search, statusFilter]);

  return (
    <div className="p-3 sm:p-5 md:p-8 pb-20 max-w-[1600px] w-full mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
              ล้างแผง &amp; ตรวจเช็คระบบโซลาร์รูฟ (Inspection Report)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              สร้างใบตรวจเช็คระบบให้ลูกค้าเซ็นหน้างาน จัดทำ Report ภาพถ่าย และอนุมัติโดย Project Mgr &amp; Service Mgr
            </p>
          </div>
        </div>

        {canCreate && (
          <Link
            href="/projects/solar-cleaning/new"
            className="h-11 inline-flex items-center justify-center gap-2 px-5 bg-[#ff2301] hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition shrink-0"
          >
            <Plus size={16} />
            <span>สร้างใบตรวจเช็คใหม่</span>
          </Link>
        )}
      </div>

      {/* ── Symmetrical 4-Card KPI Summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500">
            <span>งานทั้งหมด</span>
            <FolderKanban size={15} className="text-gray-500" />
          </div>
          <div className="text-2xl font-black font-mono text-gray-900">{stats.total}</div>
          <div className="text-[11px] text-gray-400">ใบงานล้างแผงและ Inspection</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700">
            <span>เตรียมเข้างาน / ลูกค้าเซ็น</span>
            <ClipboardCheck size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">{stats.precheckStage}</div>
          <div className="text-[11px] text-gray-400">ขั้นตอนใบตรวจเช็คหน้างาน</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-xs space-y-1 bg-orange-50/20">
          <div className="flex items-center justify-between text-xs font-bold text-orange-700">
            <span>รอแมเนเจอร์เซ็น</span>
            <Clock size={15} className="text-orange-600" />
          </div>
          <div className="text-2xl font-black font-mono text-orange-700">{stats.pendingMgrSign}</div>
          <div className="text-[11px] text-orange-600/80">รอผู้จัดการลงนามอนุมัติ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>เสร็จสมบูรณ์</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">{stats.completed}</div>
          <div className="text-[11px] text-emerald-600/80">ผู้จัดการอนุมัติเรียบร้อย</div>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `ทั้งหมด (${stats.total})` },
            { id: 'Precheck Ready', label: 'พร้อมเข้าหน้างาน' },
            { id: 'Customer Signed', label: 'ลูกค้าเซ็นแล้ว' },
            { id: 'Report Drafting', label: 'กำลังทำ Report' },
            { id: 'Pending Manager Sign', label: `รอผู้จัดการเซ็น (${stats.pendingMgrSign})` },
            { id: 'Completed', label: 'เสร็จสมบูรณ์' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร, โครงการ, ลูกค้า..."
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs font-medium outline-none focus:bg-white focus:border-[#ff2301]"
          />
        </div>
      </div>

      {/* ── Records List ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
            <ClipboardCheck size={24} />
          </div>
          <div className="text-sm font-bold text-gray-700">ยังไม่มีรายการตรวจเช็คระบบล้างแผงโซลาร์</div>
          <p className="text-xs text-gray-400">
            กดปุ่ม &quot;สร้างใบตรวจเช็คใหม่&quot; เพื่อเตรียมแบบตรวจเช็คระบบให้ลูกค้าเซ็นและจัดทำ Inspection Report
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => {
            const stMeta = getSolarCleaningStatusMeta(rec.status);
            const photoCount = countReportPhotos(rec.reportData);
            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-gray-200 hover:border-red-200 shadow-xs p-4 sm:p-5 transition flex flex-col xl:flex-row xl:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-gray-900 text-white">
                      {rec.docNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                      {rec.companyCode}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stMeta.badgeClass}`}
                    >
                      {stMeta.label}
                    </span>
                    {rec.inspectionRound && (
                      <span className="text-[11px] font-bold text-gray-500">
                        • {rec.inspectionRound}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/projects/solar-cleaning/${rec.id}`}
                    className="block text-base sm:text-lg font-black text-gray-900 hover:text-[#ff2301] transition truncate"
                  >
                    {rec.projectName}
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span>
                      <strong>ลูกค้า:</strong> {rec.customerName}
                    </span>
                    {rec.systemSizeKwp && (
                      <span>
                        <strong>ขนาดระบบ:</strong> {rec.systemSizeKwp}
                      </span>
                    )}
                    <span>
                      <strong>วันที่ตรวจ:</strong> {formatCleaningDateBkk(rec.inspectionDate)}
                    </span>
                  </div>

                  {/* Mini Progress Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${
                        rec.checkOutCustomerSignUrl || rec.checkInCustomerSignUrl
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                    >
                      <FileSignature size={12} />
                      {rec.checkOutCustomerSignUrl
                        ? 'ลูกค้าเซ็นรับงานแล้ว'
                        : rec.checkInCustomerSignUrl
                        ? 'ลูกค้าเซ็นเข้างานแล้ว'
                        : 'รอลูกค้าเซ็นหน้างาน'}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                      <Camera size={12} />
                      {photoCount} รูปถ่าย
                    </span>

                    {(() => {
                      const signMode = resolveManagerSignConfig(
                        normalizeReportData(rec.reportData).managerSignMode
                      ).mode;
                      const hasPm = Boolean(rec.projectMgrSignUrl);
                      const hasSm = Boolean(rec.serviceMgrSignUrl);
                      const showPmBadge =
                        signMode === 'PM' ||
                        signMode === 'BOTH' ||
                        (signMode === 'ANY' && (hasPm || !hasSm));
                      const showSmBadge =
                        signMode === 'SM' ||
                        signMode === 'BOTH' ||
                        (signMode === 'ANY' && (hasSm || !hasPm));
                      return (
                        <>
                          {showPmBadge && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${
                                hasPm
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <PenTool size={11} />
                              PM: {hasPm ? 'เซ็นแล้ว' : 'รอเซ็น'}
                            </span>
                          )}

                          {showSmBadge && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${
                                hasSm
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <PenTool size={11} />
                              Service Mgr: {hasSm ? 'เซ็นแล้ว' : 'รอเซ็น'}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPdfModal({
                        id: rec.id,
                        docNumber: rec.docNumber,
                        customerName: rec.customerName,
                        type: 'system-check',
                      })
                    }
                    className="h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold cursor-pointer transition"
                  >
                    <FileText size={14} className="text-[#ff2301] shrink-0" />
                    <span className="truncate">ใบตรวจเช็ค</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPdfModal({
                        id: rec.id,
                        docNumber: rec.docNumber,
                        customerName: rec.customerName,
                        type: 'inspection-report',
                      })
                    }
                    className="h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold cursor-pointer transition"
                  >
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    <span className="truncate">Report</span>
                  </button>

                  <Link
                    href={`/projects/solar-cleaning/${rec.id}`}
                    className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition"
                  >
                    <span>เปิดจัดการ &rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pdfModal && (
        <SolarCleaningPdfModal
          recordId={pdfModal.id}
          docNumber={pdfModal.docNumber}
          customerName={pdfModal.customerName}
          pdfType={pdfModal.type}
          onClose={() => setPdfModal(null)}
        />
      )}
    </div>
  );
}

