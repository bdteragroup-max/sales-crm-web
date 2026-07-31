"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Wrench, Clock, Activity, DollarSign, Package, 
  AlertTriangle, Users, TrendingUp, TrendingDown, Search
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, Cell, PieChart, Pie
} from "recharts";
import Link from "next/link";

type Props = {
  timeframe: string;
  currentPeriodJobs: any[];
  previousPeriodJobs: any[];
  allPendingJobs: any[];
  currentInstallations: any[];
  previousInstallations: any[];
  allPendingInstallations: any[];
  currentOutsource: any[];
  currentUser: any;
};

const SLA_DAYS = 2; // Default SLA threshold

export default function ExecutiveServiceClient({
  timeframe,
  currentPeriodJobs,
  previousPeriodJobs,
  allPendingJobs,
  currentInstallations,
  previousInstallations,
  allPendingInstallations,
  currentOutsource,
  currentUser,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customStart, setCustomStart] = useState(searchParams.get("startDate") || "");
  const [customEnd, setCustomEnd] = useState(searchParams.get("endDate") || "");

  const now = new Date();

  // --- 1. Volume & Velocity ---
  const incomingRepairs = currentPeriodJobs.length;
  const incomingInstalls = currentInstallations.length;
  
  const completedRepairs = currentPeriodJobs.filter(j => j.currentStep === "closed").length;
  const completedInstalls = currentInstallations.filter(i => i.status === "Completed" || i.status === "ติดตั้งเสร็จสิ้น").length;

  // MTTR (Mean Time to Repair) for current period closed jobs
  let totalRepairDays = 0;
  let closedCount = 0;
  currentPeriodJobs.forEach(job => {
    if (job.currentStep === "closed" && job.dateClosed && job.createdAt) {
      const diffDays = (new Date(job.dateClosed).getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
      if (diffDays >= 0) {
        totalRepairDays += diffDays;
        closedCount++;
      }
    }
  });
  const mttr = closedCount > 0 ? (totalRepairDays / closedCount).toFixed(1) : "0.0";

  // --- 2. Revenue / Budget ---
  let billedRevenue = 0;
  let unbilledValue = 0; // Draft quotations or estimated warranty value

  currentPeriodJobs.forEach(job => {
    const q = job.quotation;
    if (q) {
      const amt = parseFloat(q.actualClosingAmount || q.totalAmountBeforeVat || q.salesBeforeVat || 0);
      if (amt > 0) {
        // Assuming quotation status dictates if it's billed/won
        if (q.status === "อนุมัติแล้ว" || q.status === "เปิดบิลแล้ว" || q.status === "PO แล้วรอสินค้า" || q.status === "จ่ายเงินแล้ว") {
          billedRevenue += amt;
        } else {
          unbilledValue += amt;
        }
      }
    }
  });
  // Also add Outsource cost if needed, but we focus on revenue

  // --- 3. SLA Breaches & Bottlenecks ---
  const slaBreachedJobs = allPendingJobs.filter(job => {
    if (!job.createdAt) return false;
    const days = (now.getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
    return days > SLA_DAYS;
  }).map(job => {
    const days = (now.getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
    // Find bottleneck reason (e.g. from current step or stepLogs)
    const bottleneck = job.currentStep; 
    let assignedTech = job.repairOrder?.technicianName || "-";
    if (job.installationOrders?.length > 0) {
      assignedTech = job.installationOrders[0].technician || assignedTech;
    }
    return { ...job, daysPending: days, bottleneck, assignedTech };
  }).sort((a, b) => b.daysPending - a.daysPending);

  const waitingForParts = slaBreachedJobs.filter(j => j.bottleneck?.includes("อะไหล่") || j.bottleneck?.includes("Parts"));
  
  // --- 4. Breakdown & Chart Data (Installation vs Repair) ---
  const repairChartData = [
    {
      name: "Repairs (งานซ่อม)",
      Quantity: incomingRepairs,
      Value: billedRevenue + unbilledValue
    },
    {
      name: "Installs (งานติดตั้ง)",
      Quantity: incomingInstalls,
      // Rough estimation if installs have standalone quotations, currently we don't have direct access here, just an example
      Value: incomingInstalls * 5000 
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#fafbfc] p-6 md:p-8 overflow-y-auto">
      
      {/* Real-time Status Alert Badges */}
      <div className="flex flex-wrap gap-4 mb-6">
        {slaBreachedJobs.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm animate-pulse">
            <AlertTriangle size={18} />
            งานล่าช้าเกิน SLA วันนี้ ({slaBreachedJobs.length} งาน)
          </div>
        )}
        {waitingForParts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm">
            <Package size={18} />
            รออะไหล่เกินกำหนด ({waitingForParts.length} งาน)
          </div>
        )}
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Wrench className="text-blue-600" size={32} /> ภาพรวมงานบริการ (Service Dashboard)
          </h1>
          <p className="text-md font-medium text-gray-500 mt-2">
            ข้อมูลเชิงวิเคราะห์สำหรับผู้บริหาร เพื่อติดตามประสิทธิภาพ รายได้ และคิวงานที่ล่าช้า
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
            {["month", "last_month", "year", "all", "custom"].map((val) => {
              const labels: any = { month: "เดือนนี้", last_month: "เดือนที่แล้ว", year: "ปีนี้", all: "ทั้งหมด", custom: "กำหนดเอง" };
              return (
                <button
                  key={val}
                  onClick={() => router.push(`/executive/service?timeframe=${val}`)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    timeframe === val ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {labels[val]}
                </button>
              );
            })}
          </div>
          
          {timeframe === "custom" && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <span className="text-gray-500 font-bold">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <button 
                onClick={() => router.push(`/executive/service?timeframe=custom&startDate=${customStart}&endDate=${customEnd}`)} 
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                ค้นหา
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Activity size={24} /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">{incomingRepairs + incomingInstalls} งาน</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Volume (รับเข้าใหม่)</p>
            <p className="text-[11px] font-medium text-gray-500">ซ่อม {incomingRepairs} | ติดตั้ง {incomingInstalls}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-green-50 text-green-600"><Clock size={24} /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">{mttr} วัน</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Velocity (MTTR)</p>
            <p className="text-[11px] font-medium text-gray-500">เวลาเฉลี่ยในการซ่อมจนเสร็จ</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><DollarSign size={24} /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">฿{billedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Service Revenue (เปิดบิลแล้ว)</p>
            <p className="text-[11px] font-medium text-gray-500">มูลค่าจากใบเสนอราคางานซ่อมที่อนุมัติ</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600"><AlertTriangle size={24} /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">฿{unbilledValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Unbilled / Warranty (ต้นทุนแฝง)</p>
            <p className="text-[11px] font-medium text-gray-500">มูลค่าที่รอเสนอราคาหรืออยู่ในประกัน</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Chart: Installation vs Repair */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[450px]">
          <h2 className="text-lg font-black text-gray-800 mb-6 flex-shrink-0 flex items-center gap-2">
            <TrendingUp className="text-blue-500" /> สัดส่วนงานติดตั้ง vs งานซ่อม
          </h2>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairChartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={50} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={70} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: any) => {
                    if (name === "Quantity") return [`${value} งาน`, "จำนวนงาน"];
                    return [`฿${Number(value).toLocaleString()}`, "มูลค่าประเมิน"];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="Quantity" name="จำนวนงาน" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar yAxisId="right" dataKey="Value" name="มูลค่าประเมิน" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottlenecks Table */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[450px]">
          <h2 className="text-lg font-black text-gray-800 mb-6 flex-shrink-0 flex items-center gap-2">
            <Clock className="text-red-500" /> คิวงานล่าช้าและคอขวด (SLA Breaches)
          </h2>
          
          <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
            <table className="w-full text-sm text-left relative">
              <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold sticky top-0">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">เลขที่งาน</th>
                  <th className="px-4 py-3">คอขวด (สถานะ)</th>
                  <th className="px-4 py-3">ความล่าช้า</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">ติดตาม</th>
                </tr>
              </thead>
              <tbody>
                {slaBreachedJobs.length > 0 ? (
                  slaBreachedJobs.slice(0, 10).map((job, idx) => (
                    <tr key={job.id} className="border-b border-gray-50 hover:bg-red-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {job.jobNumber}
                        <div className="text-xs text-gray-500 font-normal mt-0.5">{job.customerName?.slice(0, 20)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                          {job.bottleneck || "กำลังดำเนินการ"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-black">{Math.floor(job.daysPending)} วัน</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Link 
                            href={job.repairOrder?.id ? `/repair-orders/${job.repairOrder.id}/edit` : `/jobs`} 
                            className="text-xs bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 font-semibold"
                          >
                            <Search size={12} /> ดูรายละเอียด
                          </Link>
                          <span className="text-[10px] text-gray-400 font-medium">ช่าง: {job.assignedTech}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-medium bg-gray-50/50 rounded-b-lg">
                      ไม่มีงานที่ล่าช้าเกิน SLA 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
