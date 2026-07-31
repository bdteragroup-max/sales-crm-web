'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, TrendingUp, AlertCircle, Clock, Target, DollarSign, ArrowRight } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

const formatMB = (val: number) => {
  return (val / 1000000).toFixed(2) + 'M';
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PipelineDashboardClient({ data }: { data: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const filterPeriod = searchParams.get('period') || 'รายเดือน';

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const {
    executiveSummary,
    weightedForecast,
    pipelineHealth,
    conversionRates,
    pipelineMovement
  } = data;

  // Waterfall Chart Data preparation
  const waterfallData = [
    { name: 'ยอดยกมา', start: 0, end: pipelineMovement.startAmount, isTotal: true },
    { name: 'Deal ใหม่', start: pipelineMovement.startAmount, end: pipelineMovement.startAmount + pipelineMovement.newAdded },
    { name: 'ชนะ (Won)', start: pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won, end: pipelineMovement.startAmount + pipelineMovement.newAdded },
    { name: 'แพ้ (Lost)', start: pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won - pipelineMovement.lost, end: pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won },
    { name: 'ยอดปัจจุบัน', start: 0, end: pipelineMovement.currentAmount, isTotal: true }
  ];

  // Prepare data for stacked waterfall (Recharts workaround)
  const renderWaterfall = [
    { name: 'ยอดยกมา', transparent: 0, ยอดคงเหลือ: pipelineMovement.startAmount, เพิ่มขึ้น: 0, ลดลง: 0 },
    { name: 'Deal ใหม่', transparent: pipelineMovement.startAmount, ยอดคงเหลือ: 0, เพิ่มขึ้น: pipelineMovement.newAdded, ลดลง: 0 },
    { name: 'ชนะ (Won)', transparent: pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won, ยอดคงเหลือ: 0, เพิ่มขึ้น: 0, ลดลง: pipelineMovement.won },
    { name: 'แพ้ (Lost)', transparent: pipelineMovement.startAmount + pipelineMovement.newAdded - pipelineMovement.won - pipelineMovement.lost, ยอดคงเหลือ: 0, เพิ่มขึ้น: 0, ลดลง: pipelineMovement.lost },
    { name: 'ยอดปัจจุบัน', transparent: 0, ยอดคงเหลือ: pipelineMovement.currentAmount, เพิ่มขึ้น: 0, ลดลง: 0 }
  ];

  return (
    <div className="p-8 w-full min-h-full overflow-y-auto bg-[#F9FAFB]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ดคาดการณ์ไปป์ไลน์</h1>
          <p className="text-sm text-gray-500 mt-1">วิเคราะห์โอกาสการขายและคาดการณ์รายได้ (Executive Pipeline Forecast)</p>
        </div>
        <div className="flex flex-row gap-4">
          <div className="relative w-40">
            <select
              value={filterPeriod}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 w-full"
            >
              <option>รายเดือน</option>
              <option>รายไตรมาส</option>
              <option>รายปี</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">1. บทสรุปผู้บริหาร (Executive Summary)</h2>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">เป้าหมาย (Target)</p>
            <h2 className="text-2xl font-bold text-gray-900">{formatCurrency(executiveSummary.target)}</h2>
          </div>
          <div className="text-xs font-medium mt-3 text-gray-500">
            ยอดขายปิดแล้ว: {formatCurrency(executiveSummary.closedSales)}
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Gap to Target (ส่วนขาด)</p>
            <h2 className="text-2xl font-bold text-red-600">{formatCurrency(executiveSummary.gapToTarget)}</h2>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (executiveSummary.gapToTarget / executiveSummary.target) * 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">ยอดที่คาดว่าจะปิดได้ (Weighted Forecast)</p>
            <h2 className="text-2xl font-bold text-blue-600">{formatCurrency(executiveSummary.weightedForecast)}</h2>
          </div>
          <div className="text-xs font-medium mt-3 text-gray-500">
            รวมกับยอดขายแล้ว: {formatCurrency(executiveSummary.weightedForecast + executiveSummary.closedSales)}
          </div>
        </div>

        <div className={`rounded-xl p-5 shadow-sm border flex flex-col justify-between ${executiveSummary.coverageRatio >= 3 ? 'bg-green-50 border-green-200' : executiveSummary.coverageRatio >= 2 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div>
            <p className="text-xs text-gray-600 font-medium mb-1">สัดส่วนครอบคลุมเป้าหมาย (Coverage Ratio)</p>
            <h2 className={`text-3xl font-bold ${executiveSummary.coverageRatio >= 3 ? 'text-green-700' : executiveSummary.coverageRatio >= 2 ? 'text-amber-700' : 'text-red-700'}`}>
              {executiveSummary.coverageRatio.toFixed(1)}x
            </h2>
          </div>
          <div className="text-xs font-medium mt-3 text-gray-600">
            {executiveSummary.coverageRatio >= 3 ? 'ครอบคลุมเป้าหมาย (Safe)' : executiveSummary.coverageRatio >= 2 ? 'มีความเสี่ยง (Warning)' : 'ความเสี่ยงสูง (Critical)'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* 2. Weighted Forecast Categories */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">2. Forecast Categories (มูลค่าตามความน่าจะเป็น)</h2>
          <div className="space-y-4">
            {weightedForecast.categories.map((cat: any, idx: number) => (
              <div key={idx} className="flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{cat.name} ({cat.probability}%)</span>
                  <span className="text-sm font-bold">{formatCurrency(cat.amount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  <span>{cat.dealCount} ดีล</span>
                  <span>ยอดเฉลี่ยตามความน่าจะเป็น: {formatCurrency(cat.amount * (cat.probability / 100))}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${cat.probability === 100 ? 'bg-green-500' : cat.probability === 80 ? 'bg-blue-500' : cat.probability === 60 ? 'bg-indigo-400' : cat.probability === 30 ? 'bg-amber-400' : 'bg-gray-400'}`} 
                    style={{ width: `${Math.max(2, (cat.amount / Math.max(1, executiveSummary.totalPipeline)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Pipeline Waterfall (Trend) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">5. Pipeline Movement (การเปลี่ยนแปลง)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={renderWaterfall} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tickFormatter={(val) => formatMB(val)} tick={{fontSize: 12}} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="transparent" stackId="a" fill="transparent" />
                <Bar dataKey="ยอดคงเหลือ" stackId="a" fill="#9CA3AF" />
                <Bar dataKey="เพิ่มขึ้น" stackId="a" fill="#3B82F6" />
                <Bar dataKey="ลดลง" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Pipeline Health & Velocity */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">3. สุขภาพไปป์ไลน์และความเสี่ยง (Health & Risk)</h2>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col justify-center items-center text-center">
          <Clock className="w-8 h-8 text-blue-500 mb-3" />
          <h3 className="text-sm font-medium text-gray-500 mb-1">Pipeline Velocity (ความเร็วในการปิดดีล)</h3>
          <div className="text-4xl font-bold text-gray-900">{pipelineHealth.velocityDays} <span className="text-lg text-gray-500 font-normal">วัน</span></div>
          <p className="text-xs text-gray-400 mt-2">ค่าเฉลี่ยเวลาตั้งแต่สร้างจนปิดการขาย (Won)</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-gray-900 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              Stalled Deals (ดีลที่ไม่มีความเคลื่อนไหว &gt; 30 วัน)
            </h3>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">{pipelineHealth.stalledDealsCount} ดีล</span>
          </div>
          <div className="overflow-y-auto max-h-48 pr-2">
            {pipelineHealth.stalledDealsList.map((deal: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="font-medium text-sm text-gray-900">{deal.company} <span className="text-gray-400 font-normal text-xs ml-1">({deal.salesperson})</span></div>
                  <div className="text-xs text-gray-500">{deal.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900">{formatCurrency(deal.amount)}</div>
                  <div className="text-xs font-semibold text-red-500">นิ่งมา {deal.daysStalled} วัน</div>
                </div>
              </div>
            ))}
            {pipelineHealth.stalledDealsList.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">ไม่มีดีลที่ค้างนานเกิน 30 วัน</div>
            )}
          </div>
        </div>

        {/* Unassigned Leads List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-gray-900 flex items-center">
              <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
              ลูกค้าเป้าหมายที่ยังไม่มีผู้ดูแล (Unassigned Leads)
            </h3>
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{pipelineHealth.unassignedLeadsCount} รายการ</span>
          </div>
          <div className="overflow-y-auto max-h-48 pr-2">
            {pipelineHealth.unassignedLeadsList.map((lead: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div className="font-medium text-sm text-gray-900">{lead.company}</div>
                <div className="text-xs font-semibold text-gray-500">สร้างเมื่อ {lead.daysSinceCreated === 0 ? 'วันนี้' : `${lead.daysSinceCreated} วันที่แล้ว`}</div>
              </div>
            ))}
            {pipelineHealth.unassignedLeadsList.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">ไม่มีลูกค้าที่รอการมอบหมาย</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Conversion Rates */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">4. อัตราการเปลี่ยนสถานะแต่ละขั้นตอน (Stage-by-Stage Conversion)</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between">
          <ConversionStep 
            label="รายชื่อลูกค้า (Leads)" 
            count={conversionRates.leads} 
            total={conversionRates.leads} 
            color="bg-blue-100 text-blue-800" 
          />
          <ConversionArrow 
            percentage={conversionRates.leads ? (conversionRates.telesales / conversionRates.leads) * 100 : 0} 
          />
          <ConversionStep 
            label="โทรติดต่อ (Telesales)" 
            count={conversionRates.telesales} 
            total={conversionRates.leads} 
            color="bg-indigo-100 text-indigo-800" 
          />
          <ConversionArrow 
            percentage={conversionRates.telesales ? (conversionRates.quotes / conversionRates.telesales) * 100 : 0} 
          />
          <ConversionStep 
            label="ใบเสนอราคา (Quotations)" 
            count={conversionRates.quotes} 
            total={conversionRates.leads} 
            color="bg-purple-100 text-purple-800" 
          />
          <ConversionArrow 
            percentage={conversionRates.quotes ? (conversionRates.po / conversionRates.quotes) * 100 : 0} 
          />
          <ConversionStep 
            label="สั่งซื้อ/ชนะ (PO / Won)" 
            count={conversionRates.po} 
            total={conversionRates.leads} 
            color="bg-green-100 text-green-800" 
          />
        </div>
      </div>
    </div>
  );
}

function ConversionStep({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-lg border border-transparent w-40 h-32 ${color.replace('text-', 'bg-opacity-50 border-')}`}>
      <span className="text-sm font-medium text-center mb-2">{label}</span>
      <span className="text-3xl font-bold">{count}</span>
      <span className="text-xs mt-2 opacity-75">{total > 0 ? ((count / total) * 100).toFixed(1) : 0}% ของทั้งหมด</span>
    </div>
  );
}

function ConversionArrow({ percentage }: { percentage: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-bold text-gray-500 mb-1">{percentage.toFixed(1)}%</span>
      <div className="w-16 h-0.5 bg-gray-300 relative">
        <ArrowRight className="absolute -right-2 -top-2 w-4 h-4 text-gray-400" />
      </div>
      <span className="text-[10px] text-gray-400 mt-1">อัตราเปลี่ยนผ่าน</span>
    </div>
  );
}
