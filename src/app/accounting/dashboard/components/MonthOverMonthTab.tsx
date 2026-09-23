"use client";

import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Layers,
  BarChart3,
  Scale,
  Clock,
  ShieldAlert
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface MonthOverMonthTabProps {
  data: any;
}

export default function MonthOverMonthTab({ data }: MonthOverMonthTabProps) {
  const { monthOverMonth } = data;

  const getSignalBadge = (signal: string, color: string) => {
    if (color === 'red') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (color === 'amber') {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (color === 'green') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top 4 MoM Summary KPI Cards (Unified Symmetrical Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: เงินรับจริง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">เงินรับจริงเดือนนี้</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                +{monthOverMonth?.cashReceived?.diffPercent || 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              ฿{(monthOverMonth?.cashReceived?.current / 1000000).toFixed(2)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>+฿{(monthOverMonth?.cashReceived?.diff / 1000000).toFixed(2)} ลบ. จากเดือนก่อน</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>เป้าหมายขั้นต่ำ</span>
            <span className="font-semibold text-slate-700">≥ ฿5.00 ลบ.</span>
          </div>
        </div>

        {/* Card 2: Collection Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Collection Rate</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-600 tracking-tight">
              {monthOverMonth?.collectionRate?.current || 0}%
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
              <span>+{monthOverMonth?.collectionRate?.diff || 1.5} จุด จากเดือนก่อน</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>เป้าหมายการจัดเก็บ</span>
            <span className="font-semibold text-slate-700">≥ 15.0%</span>
          </div>
        </div>

        {/* Card 3: ลูกหนี้คงเหลือ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ลูกหนี้คงเหลือรวม</span>
              <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ฿{(monthOverMonth?.outstandingDebt?.current / 1000000).toFixed(2)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <span>+฿{(monthOverMonth?.outstandingDebt?.diff / 1000000).toFixed(2)} ลบ. ({monthOverMonth?.outstandingDebt?.note || 'ตามเกณฑ์'})</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>เพดานควบคุม</span>
            <span className="font-semibold text-slate-700">≤ ฿160 ลบ.</span>
          </div>
        </div>

        {/* Card 4: หนี้เกินกำหนด */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-full flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">หนี้เกินกำหนดชำระ</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                +{monthOverMonth?.overdueDebt?.diffPercent || 5.0}%
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              ฿{(monthOverMonth?.overdueDebt?.current / 1000000).toFixed(2)} ลบ.
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>+฿{(monthOverMonth?.overdueDebt?.diff / 1000000).toFixed(2)} ลบ.</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>เป้าหมายเฝ้าระวัง</span>
            <span className="font-semibold text-rose-600">≤ ฿45 ลบ.</span>
          </div>
        </div>
      </div>

      {/* 2. 6-Month Trend Chart (แนวโน้ม 6 เดือน) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              แนวโน้ม 6 เดือน (6-Month Trend)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เปรียบเทียบลูกหนี้คงเหลือ หนี้เกินกำหนด และเงินรับจริงย้อนหลัง 6 เดือน
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-[#2563eb]"></span> ลูกหนี้คงเหลือ
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-[#dc2626]"></span> หนี้เกินกำหนด
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-[#16a34a]"></span> เงินรับจริง
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthOverMonth?.sixMonthTrend || []}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} ลบ.`} />
              <RechartsTooltip
                formatter={(val: any) => [`฿${Number(val).toFixed(2)} ลบ.`, '']}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
              />
              <Bar dataKey="outstandingDebt" name="ลูกหนี้คงเหลือ" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="overdueDebt" name="หนี้เกินกำหนด" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="cashReceived" name="เงินรับจริง" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. MoM KPI Comparison Table (KPI เปรียบเทียบเดือนต่อเดือน) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              KPI เปรียบเทียบเดือนต่อเดือน (MoM KPI Comparison)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ประเมินเทียบเป้าหมายและสัญญาณเตือนทางการเงิน
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3.5">KPI</th>
                <th className="py-3 px-3.5 text-right">เดือนนี้</th>
                <th className="py-3 px-3.5 text-right">เดือนก่อน</th>
                <th className="py-3 px-3.5 text-right">ผลต่าง</th>
                <th className="py-3 px-3.5 text-right">เป้าหมาย</th>
                <th className="py-3 px-3.5 text-center">สัญญาณ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(monthOverMonth?.kpiComparisonTable || []).map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3.5 font-bold text-slate-900">{row.kpi}</td>
                  <td className="py-3 px-3.5 text-right font-bold text-slate-900">{row.thisMonth}</td>
                  <td className="py-3 px-3.5 text-right text-slate-600">{row.lastMonth}</td>
                  <td className={`py-3 px-3.5 text-right font-bold ${row.variance.startsWith('+') && (row.kpi.includes('หนี้') || row.kpi.includes('วัน')) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {row.variance}
                  </td>
                  <td className="py-3 px-3.5 text-right text-slate-500 font-medium">{row.target}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getSignalBadge(row.signal, row.signalColor)}`}>
                      {row.signal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Symmetrical Lower 2-Column Section: Key Causes & Executive Commentary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Key Causes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                สาเหตุสำคัญของเดือนนี้ (Key Causes Requiring Attention)
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                ต้องติดตาม
              </span>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              {(monthOverMonth?.keyCauses || []).map((cause: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-slate-800 p-2.5 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                  <span className="font-medium">{cause}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>การทบทวนปัญหา</span>
            <span className="font-semibold text-slate-700">ฝ่ายบัญชี & การเงิน</span>
          </div>
        </div>

        {/* Right Column: Executive Commentary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                คำอธิบายสำหรับผู้บริหาร (Executive Commentary)
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                Strategic Guidance
              </span>
            </div>

            <div className="pt-3">
              <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                {monthOverMonth?.executiveCommentary}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>ระดับการรายงาน</span>
            <span className="font-semibold text-slate-700">คณะกรรมการบริหาร</span>
          </div>
        </div>
      </div>
    </div>
  );
}
