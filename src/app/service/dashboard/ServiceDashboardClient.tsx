"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wrench, Clock, CheckCircle, TrendingUp, TrendingDown, Users, AlertTriangle, Package, Activity, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import * as XLSX from "xlsx";

type Props = {
  timeframe: string;
  currentPeriodJobs: any[];
  previousPeriodJobs: any[];
  allPendingRepairJobs: any[];
  activeOutsourceRepairs: any[];
  currentRepairDeliveries?: any[];
  currentInstallationOrders?: any[];
  currentOutsourceRepairs?: any[];
  currentUser: any;
};

const SLA_DAYS = 2;

export default function ServiceDashboardClient({
  timeframe,
  currentPeriodJobs,
  previousPeriodJobs,
  allPendingRepairJobs,
  activeOutsourceRepairs,
  currentRepairDeliveries = [],
  currentInstallationOrders = [],
  currentOutsourceRepairs = [],
  currentUser,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customStart, setCustomStart] = useState(searchParams.get("startDate") || "");
  const [customEnd, setCustomEnd] = useState(searchParams.get("endDate") || "");

  // --- KPI Calculations ---
  const pendingJobsCount = allPendingRepairJobs.length;
  const receivedThisPeriod = currentPeriodJobs.length;
  const receivedPreviousPeriod = previousPeriodJobs.length;
  
  const completedCurrent = currentPeriodJobs.filter(j => j.currentStep === "closed").length;
  const completionRate = receivedThisPeriod > 0 ? (completedCurrent / receivedThisPeriod) * 100 : 0;
  
  // Trend
  let trend = 0;
  if (receivedPreviousPeriod > 0) {
    trend = ((receivedThisPeriod - receivedPreviousPeriod) / receivedPreviousPeriod) * 100;
  }

  // --- SLA Calculations ---
  const now = new Date();
  
  // Calculate average repair time for completed jobs in current period
  let totalDaysTaken = 0;
  let closedCountWithDates = 0;
  currentPeriodJobs.forEach(job => {
    if (job.currentStep === "closed" && job.dateClosed && job.createdAt) {
      const days = (new Date(job.dateClosed).getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
      totalDaysTaken += days;
      closedCountWithDates++;
    }
  });
  const avgRepairTime = closedCountWithDates > 0 ? totalDaysTaken / closedCountWithDates : 0;

  // Find SLA exceeders and Longest Wait among ALL pending jobs
  const slaExceededJobs: any[] = [];
  let longestWaitJob: any = null;
  let longestWaitDays = -1;

  allPendingRepairJobs.forEach(job => {
    if (!job.createdAt) return;
    const daysPending = (now.getTime() - new Date(job.createdAt).getTime()) / (1000 * 3600 * 24);
    
    if (daysPending > SLA_DAYS) {
      slaExceededJobs.push({ ...job, daysPending });
    }

    if (daysPending > longestWaitDays) {
      longestWaitDays = daysPending;
      longestWaitJob = { ...job, daysPending };
    }
  });

  // Sort SLA exceeded jobs by oldest first
  slaExceededJobs.sort((a, b) => b.daysPending - a.daysPending);

  // --- Equipment Analytics ---
  const equipmentCounts: Record<string, number> = {};
  currentPeriodJobs.forEach(job => {
    let hasBrandOrModel = false;
    if (job.repairOrder && Array.isArray(job.repairOrder.items)) {
      job.repairOrder.items.forEach((item: any) => {
        const brandModel = `${item.brand || ''} ${item.model || ''}`.trim();
        if (brandModel) {
          equipmentCounts[brandModel] = (equipmentCounts[brandModel] || 0) + 1;
          hasBrandOrModel = true;
        }
      });
    }
    
    // Fallback to job.item if no brand/model found in repair items
    if (!hasBrandOrModel && job.item) {
      const item = job.item.trim();
      equipmentCounts[item] = (equipmentCounts[item] || 0) + 1;
    }
  });
  const topEquipment = Object.entries(equipmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // --- Customer / Department Analytics ---
  const customerCounts: Record<string, number> = {};
  currentPeriodJobs.forEach(job => {
    if (job.customerName) {
      const cust = job.customerName.trim();
      customerCounts[cust] = (customerCounts[cust] || 0) + 1;
    }
  });
  const topCustomers = Object.entries(customerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // --- Technician Workload Analytics ---
  const techWorkload: Record<string, { repair: number; install: number; total: number }> = {};
  const countedJobIds = new Set<string>();

  const initTech = (name: string) => {
    if (!techWorkload[name]) {
      techWorkload[name] = { repair: 0, install: 0, total: 0 };
    }
  };

  allPendingRepairJobs.forEach(job => {
    let counted = false;
    // If it has an installation order with a technician, count it as install
    if (job.installationOrders && job.installationOrders.length > 0) {
      const tech = job.installationOrders[0].technician;
      if (tech) {
        initTech(tech);
        techWorkload[tech].install += 1;
        techWorkload[tech].total += 1;
        counted = true;
        countedJobIds.add(job.id);
      }
    }
    
    // If not counted from installationOrder, check repairOrder's technicianName (count as repair)
    if (!counted && job.repairOrder?.technicianName) {
      const tech = job.repairOrder.technicianName;
      initTech(tech);
      techWorkload[tech].repair += 1;
      techWorkload[tech].total += 1;
      countedJobIds.add(job.id);
    }
  });
  
  // Add standalone or sales-related active installation orders to workload
  currentInstallationOrders.forEach(inst => {
    // Only count if not completed and not already counted via job
    if (inst.status !== "Completed" && inst.status !== "ติดตั้งเสร็จสิ้น" && inst.technician) {
      if (!inst.jobId || !countedJobIds.has(inst.jobId)) {
        initTech(inst.technician);
        techWorkload[inst.technician].install += 1;
        techWorkload[inst.technician].total += 1;
      }
    }
  });

  const techChartData = Object.entries(techWorkload)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({ name, ...data }));

  // --- Budget Analytics ---
  let totalBudget = 0;
  currentPeriodJobs.forEach(job => {
    if (job.quotation && job.quotation.totalAmount) {
      totalBudget += parseFloat(job.quotation.totalAmount);
    }
  });

  // --- Export Functions ---
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Data
    const summaryData = [
      { Metric: "Pending Jobs", Value: pendingJobsCount },
      { Metric: "Received This Period", Value: receivedThisPeriod },
      { Metric: "Completion Rate (%)", Value: completionRate.toFixed(1) },
      { Metric: "Average Repair Time (Days)", Value: (totalDaysTaken / (closedCountWithDates || 1)).toFixed(1) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Repair Jobs Raw Data
    const jobsData = currentPeriodJobs.map(job => ({
      JobNumber: job.jobNumber,
      Type: job.jobType,
      Customer: job.customerName,
      Status: job.currentStep,
      CreatedAt: new Date(job.createdAt).toLocaleString("th-TH"),
      ClosedAt: job.dateClosed ? new Date(job.dateClosed).toLocaleString("th-TH") : ""
    }));
    const wsJobs = XLSX.utils.json_to_sheet(jobsData);
    XLSX.utils.book_append_sheet(wb, wsJobs, "Repair Jobs");

    // Installations
    const instData = currentInstallationOrders.map(inst => ({
      InstNo: inst.installationNo,
      JobNo: inst.job?.jobNumber || "",
      Customer: inst.customer || inst.company,
      Status: inst.status,
      Technician: inst.technician,
      Date: inst.installationDate ? new Date(inst.installationDate).toLocaleString("th-TH") : ""
    }));
    const wsInst = XLSX.utils.json_to_sheet(instData);
    XLSX.utils.book_append_sheet(wb, wsInst, "Installations");

    // Outsource
    const outsourceData = currentOutsourceRepairs.map(os => ({
      OutsourceNo: os.outsourceNumber || "",
      JobNo: os.job?.jobNumber || "",
      Vendor: os.vendorName,
      Status: os.status,
      Cost: os.totalCost || 0,
      Date: os.createdAt ? new Date(os.createdAt).toLocaleString("th-TH") : ""
    }));
    const wsOutsource = XLSX.utils.json_to_sheet(outsourceData);
    XLSX.utils.book_append_sheet(wb, wsOutsource, "Outsource Repairs");

    XLSX.writeFile(wb, `Service_Dashboard_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportToPDF = () => {
    window.print();
  };

  // --- Extensions Analytics ---
  // Outsource
  const outsourceStatusCount = currentOutsourceRepairs.reduce((acc: any, curr: any) => {
    acc[curr.status || 'SENT'] = (acc[curr.status || 'SENT'] || 0) + 1;
    return acc;
  }, {});
  const outsourceChartData = Object.keys(outsourceStatusCount).map(k => ({ name: k, value: outsourceStatusCount[k] }));

  // Installation
  const instStatusCount = currentInstallationOrders.reduce((acc: any, curr: any) => {
    acc[curr.status || 'Draft'] = (acc[curr.status || 'Draft'] || 0) + 1;
    return acc;
  }, {});
  const instChartData = Object.keys(instStatusCount).map(k => ({ name: k, value: instStatusCount[k] }));

  // Delivery
  const delStatusCount = currentRepairDeliveries.reduce((acc: any, curr: any) => {
    acc[curr.status || 'Draft'] = (acc[curr.status || 'Draft'] || 0) + 1;
    return acc;
  }, {});
  const delChartData = Object.keys(delStatusCount).map(k => ({ name: k, value: delStatusCount[k] }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF'];

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6 md:p-8 overflow-y-auto custom-scrollbar">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          .custom-scrollbar { overflow: visible !important; height: auto !important; min-h-screen: auto !important; }
          .print\\:hidden { display: none !important; }
          .bg-white { box-shadow: none !important; border: 1px solid #e5e7eb !important; page-break-inside: avoid; break-inside: avoid; }
        }
      `}} />

      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-3xl font-black text-gray-900">รายงานภาพรวมงานซ่อมบำรุงและบริการ (Service Dashboard)</h1>
        <p className="text-md text-gray-500 mt-2">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Activity className="text-red-600" /> ภาพรวมงานซ่อมบำรุง
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            แดชบอร์ดสรุปข้อมูลฝ่ายบริการและการซ่อมบำรุง
          </p>
        </div>
        
        <div className="flex flex-col gap-3 print:hidden">
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm self-end">
            {["month", "last_month", "year", "all", "custom"].map((val) => {
              const labels: any = { month: "เดือนนี้", last_month: "เดือนที่แล้ว", year: "ปีนี้", all: "ทั้งหมด", custom: "กำหนดเอง" };
              return (
                <button
                  key={val}
                  onClick={() => router.push(`/service/dashboard?timeframe=${val}`)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    timeframe === val ? "bg-red-50 text-red-600 shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {labels[val]}
                </button>
              );
            })}
          </div>
          
          {timeframe === "custom" && (
            <div className="flex items-center gap-2 self-end bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              <span className="text-gray-500 font-bold">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              <button 
                onClick={() => router.push(`/service/dashboard?timeframe=custom&startDate=${customStart}&endDate=${customEnd}`)} 
                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
              >
                ค้นหา
              </button>
            </div>
          )}

          <div className="flex gap-2 self-end">
            <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export Excel
            </button>
            <button onClick={exportToPDF} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="งานซ่อมที่ค้างอยู่" 
          value={pendingJobsCount} 
          subtitle="งานซ่อมที่กำลังดำเนินการ" 
          icon={<Wrench size={24} className="text-orange-500" />} 
          bg="bg-orange-50"
        />
        <KPICard 
          title="รับเข้า (ตามช่วงเวลา)" 
          value={receivedThisPeriod} 
          subtitle="จำนวนงานซ่อมที่รับเข้ามา" 
          icon={<Package size={24} className="text-blue-500" />} 
          bg="bg-blue-50"
          trend={trend}
        />
        <KPICard 
          title="อัตราการสำเร็จ" 
          value={`${completionRate.toFixed(1)}%`} 
          subtitle={`เสร็จสิ้น ${completedCurrent} จาก ${receivedThisPeriod} งาน`} 
          icon={<CheckCircle size={24} className="text-green-500" />} 
          bg="bg-green-50"
        />
        <KPICard 
          title="มูลค่างานซ่อมรวม" 
          value={`฿${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          subtitle="มูลค่างานซ่อมประเมิน" 
          icon={<DollarSign size={24} className="text-indigo-500" />} 
          bg="bg-indigo-50"
        />
      </div>

      <div className="mb-8">
        {/* SLA & Time (Full Width) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Clock className="text-red-500" /> รายงานประสิทธิภาพและ SLA
              </h2>
              <div className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                SLA: {SLA_DAYS} วัน
              </div>
            </div>
            
            <div className="flex gap-6 mb-8">
              <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-1">เวลาเฉลี่ยในการซ่อม (งานที่เสร็จ)</p>
                <div className="text-2xl font-black text-gray-900">{avgRepairTime.toFixed(1)} วัน</div>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-xs font-bold text-red-600 mb-1">งานที่เกินกำหนด SLA</p>
                <div className="text-2xl font-black text-red-700">{slaExceededJobs.length} งาน</div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> งานซ่อมที่เกินกำหนด SLA ({SLA_DAYS} วัน)
            </h3>
            <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {slaExceededJobs.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400 font-medium bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-2">
                  <CheckCircle size={24} className="text-green-500" />
                  ไม่มีงานที่เกิน SLA
                </div>
              ) : (
                slaExceededJobs.map(job => (
                  <div key={job.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{job.jobNumber}</div>
                      <div className="text-xs text-gray-500">{job.customerName} - {job.item || "ไม่ระบุอุปกรณ์"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-red-600">{Math.floor(job.daysPending)} วัน</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">ระยะเวลารอ</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {longestWaitJob && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-orange-600 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <AlertTriangle size={14} /> งานที่รอนานที่สุด
                  </div>
                  <div className="font-bold text-sm text-gray-900">{longestWaitJob.jobNumber} - {longestWaitJob.customerName}</div>
                </div>
                <div className="text-2xl font-black text-orange-600">{Math.floor(longestWaitJob.daysPending)} วัน</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment & Customer Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-6">
            <Package className="text-purple-500" /> ยี่ห้อ/รุ่นที่เสียบ่อยที่สุด
          </h2>
          <div className="space-y-4">
            {topEquipment.length > 0 ? topEquipment.map((eq, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-black">{i + 1}</div>
                  <span className="font-bold text-sm text-gray-700 truncate max-w-[200px]">{eq.name}</span>
                </div>
                <span className="font-black text-sm bg-gray-100 px-2 py-1 rounded-lg text-gray-600">{eq.count} งาน</span>
              </div>
            )) : (
              <div className="text-center py-4 text-sm text-gray-400 font-medium">ไม่มีข้อมูลอุปกรณ์</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-6">
            <Users className="text-emerald-500" /> ลูกค้าที่แจ้งซ่อมบ่อยที่สุด
          </h2>
          <div className="space-y-4">
            {topCustomers.length > 0 ? topCustomers.map((cust, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">{i + 1}</div>
                  <span className="font-bold text-sm text-gray-700 truncate max-w-[200px]">{cust.name}</span>
                </div>
                <span className="font-black text-sm bg-gray-100 px-2 py-1 rounded-lg text-gray-600">{cust.count} ครั้ง</span>
              </div>
            )) : (
              <div className="text-center py-4 text-sm text-gray-400 font-medium">ไม่มีข้อมูลลูกค้า</div>
            )}
          </div>
        </div>
      </div>

      {/* Workload Row (Full Width at Bottom) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col mb-8">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-2">
          <Users className="text-blue-500" /> ภาระงานของช่าง
        </h2>
        <p className="text-xs font-medium text-gray-500 mb-6">ภาระงานซ่อมที่แต่ละคน/บริษัทถืออยู่ ณ ปัจจุบัน (Pending)</p>
        
        <div className="w-full h-[350px]">
          {techChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techChartData} layout="vertical" margin={{ top: 0, right: 40, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} width={180} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="repair" name="งานซ่อม" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="install" name="งานติดตั้ง" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 font-medium">ไม่มีข้อมูลภาระงาน</div>
          )}
        </div>
      </div>

      {/* --- EXTENSIONS SECTION --- */}
      <div className="mt-12 space-y-8">
        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 border-b border-gray-200 pb-3">
          <Activity className="text-blue-600" /> สรุปข้อมูลส่วนขยาย (งานส่งซ่อมภายนอก, งานติดตั้ง, ใบส่งมอบงาน)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Installation */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
            <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span>สถานะงานติดตั้ง ({currentInstallationOrders.length})</span>
            </h3>
            <div className="h-[200px] w-full">
              {instChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={instChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {instChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">ไม่มีข้อมูลงานติดตั้ง</div>
              )}
            </div>
            <div className="mt-4 flex-1">
              <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">งานติดตั้งล่าสุด</h4>
              <div className="space-y-2">
                {currentInstallationOrders.slice(0, 4).map((inst, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-xs">
                    <span className="font-bold text-gray-700">{inst.installationNo}</span>
                    <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{inst.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deliveries */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
            <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span>สถานะใบส่งมอบงาน ({currentRepairDeliveries.length})</span>
            </h3>
            <div className="h-[200px] w-full">
              {delChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={delChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {delChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">ไม่มีข้อมูลใบส่งมอบงาน</div>
              )}
            </div>
            <div className="mt-4 flex-1">
              <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">ใบส่งมอบงานล่าสุด</h4>
              <div className="space-y-2">
                {currentRepairDeliveries.slice(0, 4).map((del, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-xs">
                    <span className="font-bold text-gray-700">{del.deliveryNumber}</span>
                    <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{del.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Outsource */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
            <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span>ส่งซ่อมภายนอก ({currentOutsourceRepairs.length})</span>
            </h3>
            <div className="h-[200px] w-full">
              {outsourceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={outsourceChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {outsourceChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm font-medium text-gray-400">ไม่มีข้อมูลส่งซ่อมภายนอก</div>
              )}
            </div>
            <div className="mt-4 flex-1">
              <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">ส่งซ่อมภายนอกล่าสุด</h4>
              <div className="space-y-2">
                {currentOutsourceRepairs.slice(0, 4).map((os, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-xs">
                    <span className="font-bold text-gray-700">{os.outsourceNumber || "Draft"}</span>
                    <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{os.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function KPICard({ title, value, subtitle, icon, bg, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bg}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-black text-gray-900 mb-1">{value}</h3>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-[11px] font-medium text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
