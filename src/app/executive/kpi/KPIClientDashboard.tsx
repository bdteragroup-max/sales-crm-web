'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

// Format currency smartly based on value
const formatSmart = (val: number) => {
  if (val === 0) return '0.0M฿';
  if (val < 100000) return formatCurrency(val);
  if (val < 1000000) return (val / 1000).toFixed(1) + 'k฿';
  return (val / 1000000).toFixed(1) + 'M฿';
};

// Format exact currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

export default function KPIClientDashboard({ data }: { data: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const filterPeriod = searchParams.get('period') || 'รายเดือน';
  const filterScope = searchParams.get('branch') || 'ทีมทั้งหมด';

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const {
    currentMonthSales,
    prevMonthSales,
    targetSales,
    pipelineAmount,
    pipelineCount,
    winRate,
    prevWinRate,
    funnel,
    salesTeam,
    branches,
    staleDeals,
    topCustomers
  } = data;

  const salesTrend = prevMonthSales > 0 ? ((currentMonthSales - prevMonthSales) / prevMonthSales) * 100 : 0;
  const winRateTrend = winRate - prevWinRate;
  
  const targetAttainment = targetSales > 0 ? (currentMonthSales / targetSales) * 100 : 0;
  const quarterlyForecast = pipelineAmount * (winRate / 100);

  return (
    <div className="p-8 w-full min-h-full overflow-y-auto bg-[#F9FAFB]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI ทีมขาย</h1>
          <p className="text-sm text-gray-500 mt-1">อัปเดตล่าสุด: วันนี้ 09:00 น.</p>
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
          <div className="relative w-40">
            <select
              value={filterScope}
              onChange={(e) => handleFilterChange('branch', e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 w-full"
            >
              <option>ทีมทั้งหมด</option>
              {branches?.map((b: string) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* 5 Metric Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">ยอดขายปัจจุบัน</p>
            <h2 className="text-2xl font-bold text-gray-900">{formatSmart(currentMonthSales)}</h2>
          </div>
          <div className={`text-xs font-medium mt-3 flex items-center ${salesTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {salesTrend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {salesTrend >= 0 ? '+' : ''}{salesTrend.toFixed(0)}% vs ช่วงก่อนหน้า
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">vs เป้าหมาย</p>
            <h2 className="text-2xl font-bold text-gray-900">{targetAttainment.toFixed(0)}%</h2>
          </div>
          <div className="text-xs font-medium mt-3 flex items-center text-amber-700">
            <div className="w-3 h-3 rounded-full border border-amber-700 flex items-center justify-center mr-1 text-[8px]">🎯</div>
            เป้า {formatSmart(targetSales)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Pipeline รวม</p>
            <h2 className="text-2xl font-bold text-gray-900">{formatSmart(pipelineAmount)}</h2>
          </div>
          <div className="text-xs font-medium mt-3 flex items-center text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            {pipelineCount} deals
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Win rate</p>
            <h2 className="text-2xl font-bold text-gray-900">{winRate.toFixed(0)}%</h2>
          </div>
          <div className={`text-xs font-medium mt-3 flex items-center ${winRateTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {winRateTrend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {winRateTrend >= 0 ? '+' : ''}{winRateTrend.toFixed(0)}% vs ช่วงก่อนหน้า
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">คาดการณ์ยอด</p>
            <h2 className="text-2xl font-bold text-blue-600">{formatSmart(quarterlyForecast)}</h2>
          </div>
          <div className="text-xs font-medium mt-3 flex items-center text-gray-500">
            <div className="w-3 h-3 border border-gray-400 rounded-sm mr-1 flex items-center justify-center text-[8px]">=</div>
            Pipeline × win rate
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <h3 className="text-md font-bold mb-6 text-gray-900">Conversion funnel</h3>
        <div className="flex justify-between items-end h-32 mb-2 gap-2">
          {/* Lead */}
          <div className="flex flex-col items-center justify-end h-full w-full">
            <span className="text-xs text-gray-500 mb-2">Lead</span>
            <div 
              className="w-full bg-[#D3E2F8] rounded-md flex items-center justify-center text-blue-800 font-bold text-xl transition-all"
              style={{ height: '100%' }}
            >
              {funnel.lead}
            </div>
            <span className="text-xs text-gray-500 mt-2">100%</span>
          </div>

          {/* Telesale */}
          <div className="flex flex-col items-center justify-end h-full w-full">
            <span className="text-xs text-gray-500 mb-2">Telesale</span>
            <div 
              className="w-full bg-[#C7DCFC] rounded-md flex items-center justify-center text-blue-800 font-bold text-xl transition-all"
              style={{ height: `${funnel.lead ? Math.max(10, Math.round((funnel.telesale / funnel.lead) * 100)) : 0}%` }}
            >
              {funnel.telesale}
            </div>
            <span className="text-xs text-gray-500 mt-2">{funnel.lead ? Math.round((funnel.telesale / funnel.lead) * 100) : 0}%</span>
          </div>

          {/* Quotation */}
          <div className="flex flex-col items-center justify-end h-full w-full">
            <span className="text-xs text-gray-500 mb-2">Quotation</span>
            <div 
              className="w-full bg-[#C6E8C3] rounded-md flex items-center justify-center text-green-800 font-bold text-xl transition-all"
              style={{ height: `${funnel.lead ? Math.max(10, Math.round((funnel.quotation / funnel.lead) * 100)) : 0}%` }}
            >
              {funnel.quotation}
            </div>
            <span className="text-xs text-gray-500 mt-2">{funnel.lead ? Math.round((funnel.quotation / funnel.lead) * 100) : 0}%</span>
          </div>

          {/* PO */}
          <div className="flex flex-col items-center justify-end h-full w-full">
            <span className="text-xs text-gray-500 mb-2">PO</span>
            <div 
              className="w-full bg-[#C6ECC7] rounded-md flex items-center justify-center text-green-800 font-bold text-xl transition-all"
              style={{ height: `${funnel.lead ? Math.max(10, Math.round((funnel.po / funnel.lead) * 100)) : 0}%` }}
            >
              {funnel.po}
            </div>
            <span className="text-xs text-gray-500 mt-2">{funnel.lead ? Math.round((funnel.po / funnel.lead) * 100) : 0}%</span>
          </div>

          {/* Invoice */}
          <div className="flex flex-col items-center justify-end h-full w-full">
            <span className="text-xs text-gray-500 mb-2">Invoice</span>
            <div 
              className="w-full bg-[#F3D69F] rounded-md flex items-center justify-center text-amber-900 font-bold text-xl transition-all"
              style={{ height: `${funnel.lead ? Math.max(10, Math.round((funnel.invoice / funnel.lead) * 100)) : 0}%` }}
            >
              {funnel.invoice}
            </div>
            <span className="text-xs text-gray-500 mt-2">{funnel.lead ? Math.round((funnel.invoice / funnel.lead) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Individual Performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <h3 className="text-md font-bold mb-4 text-gray-900">ประสิทธิภาพรายคน</h3>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="font-normal py-3 px-2">พนักงาน</th>
                <th className="font-normal py-3 px-2 text-right">ยอดขาย</th>
                <th className="font-normal py-3 px-2 text-right">vs เป้า</th>
                <th className="font-normal py-3 px-2 text-right">โทร</th>
                <th className="font-normal py-3 px-2 text-right">Win rate</th>
                <th className="font-normal py-3 px-2 text-right">ปิด (วัน)</th>
                <th className="font-normal py-3 px-2 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {salesTeam.map((rep: any) => {
                const attainment = rep.target > 0 ? (rep.sales / rep.target) * 100 : 0;
                
                let badgeClass = "bg-red-100 text-red-700";
                let badgeText = "ต้องปรับปรุง";
                if (attainment >= 100) {
                  badgeClass = "bg-green-100 text-green-700";
                  badgeText = "เกินเป้า";
                } else if (attainment >= 70) {
                  badgeClass = "bg-amber-100 text-amber-700";
                  badgeText = "ใกล้เป้า";
                }

                return (
                  <tr key={rep.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{rep.name}</td>
                    <td className="py-3 px-2 text-right font-medium">{formatCurrency(rep.sales)}</td>
                    <td className={`py-3 px-2 text-right font-bold ${attainment >= 100 ? 'text-green-600' : attainment >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                      {attainment.toFixed(0)}%
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">{rep.calls}</td>
                    <td className="py-3 px-2 text-right text-gray-600">{rep.winRate.toFixed(0)}%</td>
                    <td className="py-3 px-2 text-right text-gray-600">{rep.daysToClose > 0 ? `${rep.daysToClose} วัน` : '-'}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {salesTeam.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    ไม่พบข้อมูลพนักงานสำหรับสาขานี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Widgets */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-[280px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-gray-900">deals ค้างนาน <span className="text-red-500 text-sm ml-1">{staleDeals.length} รายการ</span></h3>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto">
            {staleDeals.slice(0, 5).map((deal: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-1">
                <span className="text-sm font-medium text-gray-800">{deal.quotationNumber || 'N/A'} — {deal.companyName}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">{deal.days} วัน</span>
              </div>
            ))}
            {staleDeals.length === 0 && (
              <div className="text-sm text-gray-500 py-4 text-center">ไม่มี deals ค้างนานเกิน 30 วัน</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-[280px]">
          <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center">
            ลูกค้าสูงสุด <span className="text-gray-500 font-normal ml-1">(ยอดขาย)</span>
          </h3>
          <div className="flex flex-col gap-3 overflow-y-auto">
            {topCustomers.slice(0, 5).map((cust: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-1">
                <span className="text-sm font-medium text-gray-800">{cust.companyName}</span>
                <span className="text-sm font-bold text-blue-600">{formatSmart(cust.sales)}</span>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <div className="text-sm text-gray-500 py-4 text-center">ยังไม่มียอดขายในช่วงเวลานี้</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
