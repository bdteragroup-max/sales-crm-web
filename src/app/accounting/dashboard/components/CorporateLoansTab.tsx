"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  ChevronRight,
  Search,
  Filter,
  Layers,
  Banknote,
  Send,
  Eye,
  Percent,
  FileText,
  FileWarning,
  RefreshCw,
  Archive,
  Scale,
  BarChart3,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { DrilldownItem } from './FinancialDrilldownModal';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined || isNaN(amount)) return '฿0.00';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
}

function formatMillions(amount: number | null | undefined) {
  const val = amount ?? 0;
  return (val / 1000000).toFixed(2);
}

interface CorporateLoansTabProps {
  data: any;
  onOpenDrilldown: (item: DrilldownItem) => void;
}

export default function CorporateLoansTab({ data, onOpenDrilldown }: CorporateLoansTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [exposureSearch, setExposureSearch] = useState('');
  const [exposureFilter, setExposureFilter] = useState<'ALL' | 'CONFIGURED' | 'UNCONFIGURED'>('ALL');
  const { corporateLoans, crossEntityCustomers } = data;

  const filteredContracts = (corporateLoans?.riskContracts || []).filter((c: any) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(q) ||
      c.contractNumber?.toLowerCase().includes(q) ||
      c.statusLabel?.toLowerCase().includes(q)
    );
  });

  const filteredExposureCustomers = (crossEntityCustomers || []).filter((c: any) => {
    // Exposure filter
    if (exposureFilter === 'CONFIGURED' && !c.isConfigured) return false;
    if (exposureFilter === 'UNCONFIGURED' && c.isConfigured) return false;

    if (!exposureSearch.trim()) return true;
    const q = exposureSearch.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(q) ||
      c.taxId?.toLowerCase().includes(q)
    );
  });

  // Calculate dynamic percentages for Risk Structure
  const normalAmt = corporateLoans?.riskStructure?.normal ?? 0;
  const overdue1Amt = corporateLoans?.riskStructure?.overdue1 ?? 0;
  const overdue2Amt = corporateLoans?.riskStructure?.overdue2 ?? 0;
  const overdue3Amt = corporateLoans?.riskStructure?.overdue3Plus ?? 0;
  const totalRisk = normalAmt + overdue1Amt + overdue2Amt + overdue3Amt;
  const normalPct = totalRisk > 0 ? ((normalAmt / totalRisk) * 100).toFixed(1) : '0';
  const overdue1Pct = totalRisk > 0 ? ((overdue1Amt / totalRisk) * 100).toFixed(1) : '0';
  const overdue2Pct = totalRisk > 0 ? ((overdue2Amt / totalRisk) * 100).toFixed(1) : '0';
  const overdue3Pct = totalRisk > 0 ? ((overdue3Amt / totalRisk) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Trade Debtors & Credit Risk KPI Cards Grid (8 Cards - Unified Symmetrical Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: งานที่มีหนี้ค้างชำระ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">งานที่มีหนี้ค้างชำระ</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {corporateLoans?.activeContracts ?? 0} งาน
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ปกติ {corporateLoans?.normalContracts ?? 0} • เฝ้าระวัง {corporateLoans?.watchlistContracts ?? 0}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>สถานะสัญญา</span>
            <span className="font-semibold text-slate-700">ทั้งหมดในระบบ</span>
          </div>
        </div>

        {/* Card 2: ยอดลูกหนี้คงค้างรวม */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ยอดลูกหนี้คงเหลือรวม</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-700 tracking-tight">
              ฿{formatMillions(corporateLoans?.totalPrincipalOutstanding)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1">ยอดรวมภาระหนี้ลูกหนี้การค้า</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>ความเสี่ยงลูกหนี้</span>
            <span className="font-semibold text-blue-600">กลุ่ม TG • TE • TP</span>
          </div>
        </div>

        {/* Card 3: ยอดครบกำหนดรอบนี้ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ยอดครบกำหนดรอบนี้</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ฿{formatMillions(corporateLoans?.principalDueThisMonth)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1">
              รับชำระแล้ว {(corporateLoans?.principalDueCollectedRate ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>รอบชำระประจำเดือน</span>
            <span className="font-semibold text-amber-600">ครบกำหนดแล้ว</span>
          </div>
        </div>

        {/* Card 4: ยอดรับชำระจริงสะสม */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">เงินรับชำระจริงสะสม</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              ฿{formatMillions(corporateLoans?.principalCollectedActual)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1">เงินเข้าบัญชีและบันทึกในระบบ</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>ผลการจัดเก็บ</span>
            <span className="font-semibold text-emerald-600">ตรวจสอบแล้ว</span>
          </div>
        </div>

        {/* Card 5: ยอดหนี้เกินกำหนดชำระ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">หนี้เกินกำหนดชำระ</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              ฿{formatMillions(corporateLoans?.principalOverdue)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {corporateLoans?.principalOverdueContracts ?? 0} รายการที่เกินวันครบกำหนด
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>สัดส่วนของยอดหนี้</span>
            <span className="font-semibold text-amber-600">ต้องติดตาม</span>
          </div>
        </div>

        {/* Card 6: หนี้ค้างเกิน 60 วัน */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">หนี้ค้างเกิน 60 วัน</span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-orange-600 tracking-tight">
              ฿{formatMillions(corporateLoans?.defaultOver3InstallmentsPrincipal)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {corporateLoans?.defaultOver3InstallmentsContracts ?? 0} ลูกหนี้ (เฝ้าระวังพิเศษ)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>มาตรการ</span>
            <span className="font-semibold text-orange-700">เจรจาปรับแผน</span>
          </div>
        </div>

        {/* Card 7: หนี้ค้างเกิน 90 วัน */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">หนี้ค้าง &gt; 90 วัน</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileWarning className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              ฿{formatMillions(corporateLoans?.overdueGte3InstallmentsPrincipal)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {corporateLoans?.overdueGte3InstallmentsContracts ?? 0} ลูกหนี้ (เสนอฝ่ายกฎหมาย)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>ความเสี่ยงหนี้สูญ</span>
            <span className="font-bold text-rose-600">ระดับวิกฤต</span>
          </div>
        </div>

        {/* Card 8: งานส่งมอบแล้วรอรับชำระ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ส่งมอบแล้วรอรับชำระ</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700 tracking-tight">
              ฿{formatMillions(corporateLoans?.debtRestructuringAmount)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {corporateLoans?.debtRestructuringContracts ?? 0} งานส่งมอบของแล้ว
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>ความเสี่ยงหน้างาน</span>
            <span className="font-semibold text-purple-700">เร่งเก็บเงิน</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Section: High Risk Contracts Table (รายงานสัญญาเสี่ยง) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-rose-500" />
              รายงานลูกหนี้ที่มีความเสี่ยง & ยอดค้างชำระ (High-Risk Debtors & Exposure Report)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              เรียงตามยอดหนี้คงค้างและระยะเวลาเกินกำหนดชำระจริงจากระบบ
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาลูกหนี้, รหัสงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-3.5">ลูกค้า</th>
                <th className="py-3 px-3.5">งาน/โครงการ</th>
                <th className="py-3 px-3.5 text-right">ยอดหนี้คงค้าง</th>
                <th className="py-3 px-3.5 text-center">งวดค้าง</th>
                <th className="py-3 px-3.5 text-center">วันเกิน</th>
                <th className="py-3 px-3.5">รายละเอียดกลุ่มงาน</th>
                <th className="py-3 px-3.5">งวดล่าสุด</th>
                <th className="py-3 px-3.5 text-center">สถานะ</th>
                <th className="py-3 px-3.5 text-center">ตรวจสอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <FileCheck2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-500">ไม่พบลูกหนี้ที่มียอดค้างชำระในระบบ</p>
                    <p className="text-[11px] text-gray-400 mt-1">ไม่มีรายการที่เข้าข่ายความเสี่ยงหรือผิดนัดชำระ</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-gray-900">{c.customerName}</td>
                    <td className="py-3 px-3.5 font-mono text-gray-700 font-medium">{c.contractNumber}</td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-600">
                      ฿{formatMillions(c.principalOutstanding)} ลบ.
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-gray-800">{c.overdueInstallments} งวด</td>
                    <td className="py-3 px-3.5 text-center text-gray-600">{c.overdueDays}</td>
                    <td className="py-3 px-3.5 text-gray-700 font-medium">{c.collateral}</td>
                    <td className="py-3 px-3.5 text-gray-500">{c.lastClosedDate}</td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.statusBadgeClass}`}>
                        {c.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => onOpenDrilldown({
                          id: c.id,
                          jobId: c.jobId,
                          title: `ลูกหนี้ค้างชำระ: ${c.customerName}`,
                          contractOrJobNo: c.contractNumber.split(' ')[0],
                          customerName: c.customerName,
                          companyCode: c.contractNumber.includes('TG') ? 'TG' : c.contractNumber.includes('TE') ? 'TE' : 'TP',
                          amount: c.principalOutstanding,
                          outstandingAmount: c.principalOutstanding,
                          overdueDays: c.overdueDays,
                          status: c.statusLabel,
                          statusBadgeClass: c.statusBadgeClass,
                          collateral: c.collateral,
                          reason: `ยอดหนี้ค้างชำระ ${c.overdueInstallments} งวด เกินกำหนด ${c.overdueDays} วัน`
                        })}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="เปิดดูรายละเอียดลูกหนี้"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Lower Symmetrical 2-Column Section: Risk Structure & Executive Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Risk Structure */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                โครงสร้างความเสี่ยงอายุหนี้ (Risk & Aging Structure)
              </h3>
              <span className="text-xs text-slate-400 font-medium">สัดส่วนยอดหนี้</span>
            </div>

            <div className="space-y-3.5 pt-3">
              {/* Normal */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">ยังไม่เกินกำหนด</span>
                  <span className="text-slate-900">฿{formatMillions(normalAmt)} ลบ. ({normalPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${normalPct}%` }} />
                </div>
              </div>

              {/* Overdue 1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">เกินกำหนด 1-30 วัน</span>
                  <span className="text-slate-900">฿{formatMillions(overdue1Amt)} ลบ. ({overdue1Pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${overdue1Pct}%` }} />
                </div>
              </div>

              {/* Overdue 2 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">เกินกำหนด 31-60 วัน</span>
                  <span className="text-slate-900">฿{formatMillions(overdue2Amt)} ลบ. ({overdue2Pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-orange-600 h-full rounded-full transition-all duration-500" style={{ width: `${overdue2Pct}%` }} />
                </div>
              </div>

              {/* Overdue 3+ */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">เกินกำหนด &gt; 60 วันขึ้นไป</span>
                  <span className="text-slate-900">฿{formatMillions(overdue3Amt)} ลบ. ({overdue3Pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${overdue3Pct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>เกณฑ์ประเมินความเสี่ยง</span>
            <span className="font-semibold text-slate-700">มาตรฐานฝ่ายการเงิน เทอรา กรุ๊ป</span>
          </div>
        </div>

        {/* Right: Executive Insights Callout */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                ประเด็นผู้บริหาร (Executive Decision Point)
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                Action Required
              </span>
            </div>

            <div className="mt-3 p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80">
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                {corporateLoans?.executiveInsights || "ยังไม่มีข้อมูลลูกหนี้ค้างชำระในระบบฐานข้อมูล"}
              </p>
            </div>

            {(corporateLoans?.activeContracts ?? 0) > 0 && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span><strong>การดำเนินการแนะนำ:</strong> เร่งรัดติดตามหนี้เกินกำหนด และชะลอการให้เครดิตลูกหนี้ที่ค้างเกิน 60 วัน</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>ทีมติดตามหนี้:</strong> ให้รายงานความคืบหน้าการเจรจาวันนัดชำระใหม่ของลูกหนี้รายใหญ่</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>การทบทวนวงเงิน</span>
            <span className="font-semibold text-slate-700">ประจำสัปดาห์</span>
          </div>
        </div>
      </div>

      {/* 4. Cross-Entity Group Customer Exposure (Key Control Principle TG, TE, TP) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                ระบบรวมวงเงินและภาระหนี้ข้ามบริษัท (Cross-Entity Credit Exposure: TG, TE, TP)
              </h3>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                Key Control Principle
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              รวมภาระหนี้ของลูกหนี้รายเดียวกันข้ามทั้ง 3 นิติบุคคล ควบคุมวงเงินจริงตามที่ฝ่ายบัญชีกำหนด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/accounting/credit-settings"
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              ตั้งค่าวงเงินเครดิต
            </Link>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อลูกค้า หรือ Tax ID..."
                value={exposureSearch}
                onChange={(e) => setExposureSearch(e.target.value)}
                className="text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-100">
          <span className="text-slate-400 text-[11px] font-semibold">แสดง:</span>
          <button
            onClick={() => setExposureFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              exposureFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({crossEntityCustomers?.length || 0})
          </button>
          <button
            onClick={() => setExposureFilter('CONFIGURED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              exposureFilter === 'CONFIGURED'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            ตั้งค่าแล้ว ({crossEntityCustomers?.filter((c: any) => c.isConfigured).length || 0})
          </button>
          <button
            onClick={() => setExposureFilter('UNCONFIGURED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              exposureFilter === 'UNCONFIGURED'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            ยังไม่ตั้งค่า ({crossEntityCustomers?.filter((c: any) => !c.isConfigured).length || 0})
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-3.5">ลูกค้า / เลขประจำตัวผู้เสียภาษี</th>
                <th className="py-3 px-3.5 text-right">ยอดหนี้ TG</th>
                <th className="py-3 px-3.5 text-right">ยอดหนี้ TE</th>
                <th className="py-3 px-3.5 text-right">ยอดหนี้ TP</th>
                <th className="py-3 px-3.5 text-right">ภาระหนี้รวมกลุ่ม</th>
                <th className="py-3 px-3.5 text-right">วงเงินที่ได้รับอนุมัติ</th>
                <th className="py-3 px-3.5 text-right">วงเงินคงเหลือ</th>
                <th className="py-3 px-3.5 text-center">สถานะความเสี่ยง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredExposureCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-500">ไม่พบรายการลูกหนี้ตามเงื่อนไขที่เลือก</p>
                    <p className="text-[11px] text-gray-400 mt-1">ลองเปลี่ยนตัวกรอง หรือค้นหาใหม่อีกครั้ง</p>
                  </td>
                </tr>
              ) : (
                filteredExposureCustomers.map((cust: any) => (
                  <tr
                    key={cust.id}
                    className={`hover:bg-gray-50/70 transition-colors ${
                      !cust.isConfigured ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-gray-900">{cust.customerName}</div>
                      <div className="text-[11px] font-mono text-gray-500">Tax ID: {cust.taxId}</div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-medium">฿{cust.tgExposure.toLocaleString('th-TH')}</td>
                    <td className="py-3 px-3.5 text-right font-medium">฿{cust.teExposure.toLocaleString('th-TH')}</td>
                    <td className="py-3 px-3.5 text-right font-medium">฿{cust.tpExposure.toLocaleString('th-TH')}</td>
                    <td className="py-3 px-3.5 text-right font-bold text-gray-900">
                      ฿{cust.totalExposure.toLocaleString('th-TH')}
                    </td>
                    <td className="py-3 px-3.5 text-right font-medium">
                      {cust.isConfigured ? (
                        <div>
                          <span className="font-bold text-slate-800">฿{cust.approvedLimit.toLocaleString('th-TH')}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">เทอม {cust.creditTermsDays} วัน</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-medium">ยังไม่กำหนด</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold">
                      {cust.isConfigured ? (
                        <span className={cust.remainingLimit < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {cust.remainingLimit < 0
                            ? `(เกิน ฿${Math.abs(cust.remainingLimit).toLocaleString('th-TH')})`
                            : `฿${cust.remainingLimit.toLocaleString('th-TH')}`}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {cust.isConfigured ? (
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${cust.statusBadgeClass}`}>
                          {cust.statusLabel}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            ยังไม่ตั้งค่า
                          </span>
                          <Link
                            href={`/accounting/credit-settings?customer=${encodeURIComponent(cust.customerName)}`}
                            className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                          >
                            ตั้งค่าเลย <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
