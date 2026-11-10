'use client';

import React, { useMemo } from 'react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Globe,
  Download,
  Building2,
  Layers,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type {
  BranchContentItem,
  BranchMasterItem,
  BranchStatRow,
} from '@/app/lib/branchContentTypes';
import { matchBranch } from '@/app/lib/roleHelper';

interface BranchContentDashboardViewProps {
  contents: BranchContentItem[];
  branches: BranchMasterItem[];
}

export default function BranchContentDashboardView({
  contents,
  branches,
}: BranchContentDashboardViewProps) {
  // Compute real-time metrics from filtered `contents` (no mock numbers)
  const metrics = useMemo(() => {
    let backlog = 0;
    let inProgress = 0;
    let pendingReview = 0;
    let approve1 = 0;
    let endorsed = 0;
    let revise = 0;
    let approved = 0;
    let published = 0;
    let cancelled = 0;
    let overdue = 0;
    let totalRevisions = 0;
    let reviewedCount = 0;
    let totalReviewHours = 0;
    let reviewHoursSamples = 0;

    const branchMap = new Map<string, BranchStatRow>();
    branches.forEach(b => {
      branchMap.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        total: 0,
        backlog: 0,
        inProgress: 0,
        pendingReview: 0,
        approve1: 0,
        endorsed: 0,
        revise: 0,
        approved: 0,
        published: 0,
        cancelled: 0,
        overdue: 0,
        totalRevisions: 0,
        avgRevisionCount: 0,
      });
    });

    const channelMap = new Map<string, { total: number; published: number }>();
    const monthlyMap = new Map<string, { label: string; total: number; published: number }>();

    contents.forEach(item => {
      if (item.status === 'BACKLOG') backlog++;
      else if (item.status === 'IN_PROGRESS') inProgress++;
      else if (item.status === 'PENDING_REVIEW') {
        pendingReview++;
      } else if (item.status === 'APPROVE_1') {
        approve1++;
        if (item.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER') endorsed++;
      } else if (item.status === 'REVISE') revise++;
      else if (item.status === 'APPROVED') approved++;
      else if (item.status === 'PUBLISHED') published++;
      else if (item.status === 'CANCELLED') cancelled++;

      if (item.isOverdue) overdue++;

      totalRevisions += item.revisionCount || 0;
      if (['PENDING_REVIEW', 'APPROVE_1', 'REVISE', 'APPROVED', 'PUBLISHED'].includes(item.status)) {
        reviewedCount++;
      }

      if (item.submittedAt && (item.reviewedAt || item.approvedAt)) {
        const t1 = new Date(item.submittedAt).getTime();
        const t2 = new Date((item.reviewedAt || item.approvedAt)!).getTime();
        if (t2 > t1) {
          totalReviewHours += (t2 - t1) / (1000 * 60 * 60);
          reviewHoursSamples++;
        }
      }

      // Branch aggregation
      let bRow = branchMap.get(item.branchId);
      if (!bRow) {
        for (const [, r] of branchMap.entries()) {
          if (matchBranch(r.branchName, item.branchName) || matchBranch(r.branchId, item.branchId)) {
            bRow = r;
            break;
          }
        }
      }
      if (!bRow) {
        bRow = {
          branchId: item.branchId,
          branchName: item.branchName,
          total: 0,
          backlog: 0,
          inProgress: 0,
          pendingReview: 0,
          approve1: 0,
          endorsed: 0,
          revise: 0,
          approved: 0,
          published: 0,
          cancelled: 0,
          overdue: 0,
          totalRevisions: 0,
          avgRevisionCount: 0,
        };
        branchMap.set(item.branchId, bRow);
      }

      bRow.total++;
      if (item.status === 'BACKLOG') bRow.backlog++;
      else if (item.status === 'IN_PROGRESS') bRow.inProgress++;
      else if (item.status === 'PENDING_REVIEW') {
        bRow.pendingReview++;
      } else if (item.status === 'APPROVE_1') {
        bRow.approve1++;
        if (item.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER') bRow.endorsed++;
      } else if (item.status === 'REVISE') bRow.revise++;
      else if (item.status === 'APPROVED') bRow.approved++;
      else if (item.status === 'PUBLISHED') bRow.published++;
      else if (item.status === 'CANCELLED') bRow.cancelled++;
      if (item.isOverdue) bRow.overdue++;
      bRow.totalRevisions += item.revisionCount || 0;

      // Channel aggregation
      const chs =
        item.targetChannels && item.targetChannels.length > 0
          ? item.targetChannels
          : item.actualChannel
          ? [item.actualChannel]
          : ['ไม่ระบุช่องทาง'];
      chs.forEach(ch => {
        const curr = channelMap.get(ch) || { total: 0, published: 0 };
        curr.total++;
        if (item.status === 'PUBLISHED') curr.published++;
        channelMap.set(ch, curr);
      });

      // Monthly aggregation
      const refDate = new Date(
        item.actualPublishDate || item.plannedPublishDate || item.createdAt
      );
      if (!isNaN(refDate.getTime())) {
        const key = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
        const label = refDate.toLocaleDateString('th-TH', {
          month: 'short',
          year: 'numeric',
        });
        const mCurr = monthlyMap.get(key) || { label, total: 0, published: 0 };
        mCurr.total++;
        if (item.status === 'PUBLISHED') mCurr.published++;
        monthlyMap.set(key, mCurr);
      }
    });

    const branchRows = Array.from(branchMap.values()).map(r => ({
      ...r,
      avgRevisionCount:
        r.total > 0 ? Number((r.totalRevisions / r.total).toFixed(2)) : 0,
    }));

    const channelRows = Array.from(channelMap.entries())
      .map(([channel, stats]) => ({ channel, ...stats }))
      .sort((a, b) => b.total - a.total);

    const monthlyRows = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, stats]) => ({ monthKey, ...stats }));

    return {
      total: contents.length,
      backlog,
      inProgress,
      pendingReview,
      approve1,
      endorsed,
      revise,
      approved,
      published,
      cancelled,
      overdue,
      totalRevisions,
      avgRevisionCount:
        reviewedCount > 0 ? Number((totalRevisions / reviewedCount).toFixed(2)) : 0,
      avgReviewHours:
        reviewHoursSamples > 0
          ? Number((totalReviewHours / reviewHoursSamples).toFixed(1))
          : 0,
      branchRows,
      channelRows,
      monthlyRows,
    };
  }, [contents, branches]);

  // Export CSV (Excel compatible with UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = [
      'รหัสคอนเทนต์ (Content ID)',
      'สาขา (Branch)',
      'ชื่อคอนเทนต์ (Title)',
      'ประเภทงาน (Content Type)',
      'กลุ่มสินค้า (Product Group)',
      'ช่องทาง (Channels)',
      'ผู้รับผิดชอบ (Assignee)',
      'สถานะ (Status)',
      'เวอร์ชันปัจจุบัน (Version)',
      'จำนวนรอบแก้ไข (Revision Count)',
      'กำหนดส่งตรวจ (Submission Due)',
      'วันวางแผนเผยแพร่ (Planned Publish)',
      'ผู้ตรวจ (Reviewer)',
      'ผู้อนุมัติ (Approver)',
      'วันที่อนุมัติ (Approved At)',
      'วันที่เผยแพร่จริง (Actual Publish Date)',
      'ลิงก์โพสต์จริง (Published URL)',
      'สถานะเกินกำหนด (Overdue)',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = contents.map(c => [
      c.contentNo,
      c.branchName,
      c.title,
      c.contentType,
      c.productGroup,
      (c.targetChannels || []).join(', '),
      c.assigneeName || c.createdByName,
      c.status,
      `V${c.currentVersion}`,
      c.revisionCount,
      c.submissionDueDate ? c.submissionDueDate.split('T')[0] : '-',
      c.plannedPublishDate ? c.plannedPublishDate.split('T')[0] : '-',
      c.reviewerName || '-',
      c.approvedByName || '-',
      c.approvedAt ? new Date(c.approvedAt).toLocaleString('th-TH') : '-',
      c.actualPublishDate ? c.actualPublishDate.split('T')[0] : '-',
      c.publishedUrl || '-',
      c.isOverdue ? 'เกินกำหนด (Overdue)' : 'ปกติ',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join(
        '\r\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateTag = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `TERA_Branch_Content_Report_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar & Export */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-sm">
            <BarChart3 size={22} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              แดชบอร์ดและรายงานภาพรวมคอนเทนต์ 11 สาขา (Branch Content Analytics)
            </h3>
            <p className="text-xs text-slate-500">
              คำนวณจากข้อมูลจริงในฐานข้อมูล (Real-time Database Calculation) ตามตัวกรองที่เลือกด้านบน
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all"
        >
          <Download size={15} />
          ส่งออกรายงาน Excel / CSV ({contents.length} รายการ)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">คอนเทนต์ทั้งหมด</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {metrics.total.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            กำลังผลิต {metrics.inProgress} • ไอเดีย {metrics.backlog}
          </span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
            <Clock size={13} /> รอตรวจรวม (Pending + Approve-1)
          </span>
          <div className="text-2xl font-black text-amber-800 mt-1">
            {(metrics.pendingReview + metrics.approve1).toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-700 font-semibold">
            ผจก.สาขา {metrics.pendingReview} • Approve-1 ({metrics.approve1})
          </span>
        </div>

        <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200 shadow-2xs">
          <span className="text-xs font-bold text-orange-900 flex items-center gap-1">
            <RotateCcw size={13} /> ส่งกลับแก้ไข (Revise)
          </span>
          <div className="text-2xl font-black text-orange-800 mt-1">
            {metrics.revise.toLocaleString()}
          </div>
          <span className="text-[11px] text-orange-700">
            รวมส่งแก้สะสม {metrics.totalRevisions} ครั้ง
          </span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 size={13} /> อนุมัติแล้ว (Approved)
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {metrics.approved.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-700">พร้อมให้สาขานำไปโพสต์</span>
        </div>

        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 shadow-2xs">
          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
            <Globe size={13} /> เผยแพร่จริง (Published)
          </span>
          <div className="text-2xl font-black text-indigo-800 mt-1">
            {metrics.published.toLocaleString()}
          </div>
          <span className="text-[11px] text-indigo-700">แนบลิงก์โพสต์ครบถ้วน</span>
        </div>

        <div className="bg-red-50/80 p-4 rounded-2xl border border-red-200 shadow-2xs">
          <span className="text-xs font-bold text-red-900 flex items-center gap-1">
            <AlertTriangle size={13} /> เกินกำหนด (Overdue)
          </span>
          <div className="text-2xl font-black text-red-700 mt-1">
            {metrics.overdue.toLocaleString()}
          </div>
          <span className="text-[11px] text-red-600">
            เฉลี่ยรอตรวจ {metrics.avgReviewHours} ชม.
          </span>
        </div>
      </div>

      {/* 11-Branch Performance Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-red-600" />
            <h4 className="font-extrabold text-slate-900 text-sm">
              ตารางติดตามสถานะคอนเทนต์แยกตาม 11 สาขา (Branch Matrix)
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            อัตราการส่งแก้เฉลี่ยรวม: {metrics.avgRevisionCount} รอบ/งาน
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ลำดับ</th>
                <th className="px-4 py-3">สาขา (Branch)</th>
                <th className="px-4 py-3 text-center">ทั้งหมด</th>
                <th className="px-4 py-3 text-center">Backlog / Draft</th>
                <th className="px-4 py-3 text-center text-amber-800">รอ ผจก.สาขา</th>
                <th className="px-4 py-3 text-center text-purple-800">Approve - 1 (การตลาด)</th>
                <th className="px-4 py-3 text-center text-orange-800">ส่งแก้ไข (Revise)</th>
                <th className="px-4 py-3 text-center text-emerald-800">อนุมัติแล้ว (Approved)</th>
                <th className="px-4 py-3 text-center text-indigo-800">เผยแพร่แล้ว (Published)</th>
                <th className="px-4 py-3 text-center text-red-700">เกินกำหนด (Overdue)</th>
                <th className="px-4 py-3 text-center">จำนวนรอบแก้สะสม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.branchRows.map((row, index) => (
                <tr key={row.branchId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-400 font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">
                    สาขา{row.branchName}
                    <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                      ({row.branchId})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-slate-900">
                    {row.total}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                    {row.backlog + row.inProgress}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        row.pendingReview > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.pendingReview}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        row.approve1 > 0
                          ? 'bg-purple-100 text-purple-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.approve1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        row.revise > 0
                          ? 'bg-orange-100 text-orange-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.revise}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        row.approved > 0
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.approved}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        row.published > 0
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.published}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.overdue > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-extrabold">
                        {row.overdue}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">
                    {row.totalRevisions} ครั้ง ({row.avgRevisionCount} รอบ/งาน)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2 Columns: Channel Breakdown & Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Layers size={16} className="text-red-600" />
            สรุปจำนวนคอนเทนต์แยกตามช่องทาง (By Channel)
          </h4>
          {metrics.channelRows.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2.5">
              {metrics.channelRows.map(ch => (
                <div
                  key={ch.channel}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-800 text-xs">{ch.channel}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600">
                      สร้างทั้งหมด <strong>{ch.total}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      เผยแพร่แล้ว {ch.published}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <TrendingUp size={16} className="text-red-600" />
            สรุปการผลิตและเผยแพร่รายเดือน (Monthly Summary)
          </h4>
          {metrics.monthlyRows.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">ยังไม่มีข้อมูลรายเดือน</p>
          ) : (
            <div className="space-y-2.5">
              {metrics.monthlyRows.map(m => (
                <div
                  key={m.monthKey}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-800 text-xs">{m.label}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600">
                      แผนงานรวม <strong>{m.total}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      โพสต์สำเร็จ {m.published}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

