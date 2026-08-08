"use client";

import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, ShieldAlert, FileWarning, Search, ShieldCheck, Activity, Receipt, FileText, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ProductionDashboardClientProps {
  orders: any[];
  prs: any[];
  pos: any[];
  cabinetJobs?: any[];
}

export default function ProductionDashboardClient({ orders, prs, pos, cabinetJobs = [] }: ProductionDashboardClientProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'jobs' | 'prs'>('jobs');
  const [techChartTimeFilter, setTechChartTimeFilter] = useState<'all' | 'this_month' | 'this_week'>('all');
  
  const filteredOrders = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase();
      const matchId = o.id?.toLowerCase().includes(q);
      const matchQuotation = o.quotation?.quotationNumber?.toLowerCase().includes(q);
      const matchOrderNumber = o.orderNumber?.toLowerCase().includes(q);
      
      let matchJob = false;
      if (o.quotation?.jobs) {
         matchJob = o.quotation.jobs.some((j: any) => 
            j.jobNumber?.toLowerCase().includes(q) || 
            j.customerName?.toLowerCase().includes(q)
         );
      }

      // Also match PR/PO numbers within the order
      let matchPrPo = false;
      if (o.purchaseRequests) {
        matchPrPo = o.purchaseRequests.some((pr: any) =>
          pr.prNumber?.toLowerCase().includes(q) ||
          pr.projectName?.toLowerCase().includes(q) ||
          (pr.purchaseOrders || []).some((po: any) =>
            po.poNumber?.toLowerCase().includes(q) ||
            po.jobName?.toLowerCase().includes(q)
          )
        );
      }

      if (!matchId && !matchQuotation && !matchOrderNumber && !matchJob && !matchPrPo) {
        return false;
      }
    }
    return true;
  });

  // Count PRs from filtered orders for the tab badge
  const filteredPrs = filteredOrders.flatMap((o: any) => o.purchaseRequests || []);

  // KPIs
  const totalOrders = filteredOrders.length;
  
  const inProductionCount = filteredOrders.filter(o => o.status === 'กำลังผลิต').length;
  const qcCount = filteredOrders.filter(o => o.status === 'ตรวจสอบคุณภาพ').length;
  const completedCount = filteredOrders.filter(o => o.status === 'เสร็จสิ้น').length;
  
  const pendingQC = filteredOrders.filter(o => !o.qcStatus || o.qcStatus === 'PENDING').length;
  const failedQC = filteredOrders.filter(o => o.qcStatus === 'FAIL').length;
  const passedQC = filteredOrders.filter(o => o.qcStatus === 'PASS').length;

  const today = new Date();
  const overdueCount = filteredOrders.filter(o => {
    if (!o.productionDeadline) return false;
    if (o.status === 'เสร็จสิ้น') return false;
    return new Date(o.productionDeadline) < today;
  }).length;

  // Total Expenses (Sum of PO amounts)
  const totalExpense = pos.reduce((acc, po) => acc + (Number(po.totalAmount) || 0), 0);

  // Chart Data
  const statusData = [
    { name: 'รอเปิด PO', count: filteredOrders.filter(o => o.status === 'รอยืนยัน' || !o.status).length },
    { name: 'กำลังผลิต', count: inProductionCount },
    { name: 'QC', count: qcCount },
    { name: 'เสร็จสิ้น', count: completedCount },
  ];

  const qcData = [
    { name: 'Pass', value: passedQC },
    { name: 'Fail', value: failedQC },
    { name: 'Pending', value: pendingQC },
  ];
  const qcColors = ['#22c55e', '#ef4444', '#f59e0b'];

  // Technician Chart Logic
  const filteredTechJobs = cabinetJobs.filter(job => {
    if (techChartTimeFilter === 'all') return true;
    const jobDate = new Date(job.createdAt);
    const today = new Date();
    if (techChartTimeFilter === 'this_month') {
      return jobDate.getMonth() === today.getMonth() && jobDate.getFullYear() === today.getFullYear();
    }
    if (techChartTimeFilter === 'this_week') {
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      return jobDate >= firstDay;
    }
    return true;
  });

  const techStatsMap: Record<string, { name: string, completed: number, inProgress: number }> = {};
  filteredTechJobs.forEach(job => {
    const techName = job.technician?.fullName || 'Unknown';
    if (!techStatsMap[techName]) {
      techStatsMap[techName] = { name: techName, completed: 0, inProgress: 0 };
    }
    if (job.status === 'COMPLETED') {
      techStatsMap[techName].completed += 1;
    } else {
      techStatsMap[techName].inProgress += 1;
    }
  });
  const techChartData = Object.values(techStatsMap).sort((a, b) => (b.completed + b.inProgress) - (a.completed + a.inProgress));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="text-blue-600" size={28} />
            แดชบอร์ดฝ่ายผลิต (งานตู้)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            ภาพรวมงานประกอบตู้ทั้งหมดและการตรวจสอบคุณภาพ
          </p>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-gray-50/50 transform group-hover:scale-110 transition-transform">
            <Activity size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">งานประกอบทั้งหมด</p>
            <p className="text-3xl font-black text-gray-900">{totalOrders}</p>
          </div>
        </div>
        
        <div className="bg-blue-50/50 p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-blue-100/50 transform group-hover:scale-110 transition-transform">
            <Package size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">กำลังผลิต</p>
            <p className="text-3xl font-black text-blue-700">{inProductionCount}</p>
          </div>
        </div>

        <div className="bg-purple-50/50 p-5 rounded-2xl shadow-sm border border-purple-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-purple-100/50 transform group-hover:scale-110 transition-transform">
            <ShieldCheck size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">รอ QC</p>
            <p className="text-3xl font-black text-purple-700">{qcCount}</p>
            <div className="mt-2 text-[10px] font-bold text-purple-600 flex gap-2">
              <span className="bg-purple-100 px-1.5 py-0.5 rounded">รอ: {pendingQC}</span>
              <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">ตก: {failedQC}</span>
            </div>
          </div>
        </div>

        <div className="bg-red-50/50 p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-red-100/50 transform group-hover:scale-110 transition-transform">
            <ShieldAlert size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">เกินกำหนด</p>
            <p className="text-3xl font-black text-red-700">{overdueCount}</p>
          </div>
        </div>

        <div className="bg-emerald-50/50 p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-emerald-100/50 transform group-hover:scale-110 transition-transform">
            <TrendingDown size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">รวมค่าใช้จ่าย (PO)</p>
            <p className="text-2xl font-black text-emerald-700">฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="mt-2 text-[10px] font-bold text-emerald-600 flex gap-2">
              <span>PR: {prs.length}</span>
              <span>PO: {pos.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-700 mb-6 uppercase tracking-widest">การกระจายสถานะงานประกอบ</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">สถานะ Quality Control</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qcData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {qcData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={qcColors[index % qcColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Technician Performance Chart */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">ผลงานช่างประกอบ (Cumulative Output)</h3>
          <select 
            value={techChartTimeFilter}
            onChange={(e) => setTechChartTimeFilter(e.target.value as any)}
            className="text-xs font-bold text-gray-600 bg-gray-50 border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            <option value="all">ทั้งหมด (All Time)</option>
            <option value="this_month">เดือนนี้ (This Month)</option>
            <option value="this_week">สัปดาห์นี้ (This Week)</option>
          </select>
        </div>
        <div className="h-[300px] w-full">
          {techChartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Package size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">ไม่มีข้อมูลงานประกอบในช่วงเวลานี้</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="completed" name="ประกอบเสร็จ (Completed)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="inProgress" name="กำลังทำ (In Progress)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'jobs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            งานประกอบ ({filteredOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('prs')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'prs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText size={16} /> PR / PO ({filteredPrs.length})
          </button>
        </div>

        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อลูกค้า หรือโครงการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">รหัสใบสั่งผลิต</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">ใบเสนอราคา</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">ลูกค้า / งาน</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">PR / PO</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">สถานะคำสั่งซื้อ</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">สถานะ QC</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">กำหนดเสร็จ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => {
                    const job = order.quotation?.jobs?.[0]; // Usually one job per quotation
                    const orderPrs = order.purchaseRequests || [];
                    const orderPos = orderPrs.flatMap((pr: any) => pr.purchaseOrders || []);
                    const orderExpense = orderPos.reduce((acc: number, po: any) => acc + (Number(po.totalAmount) || 0), 0);
                    
                    return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-black text-gray-900">{order.orderNumber || order.id.substring(0, 8).toUpperCase()}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-gray-800">{order.quotation?.quotationNumber || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-gray-800">{job?.customerName || '-'}</div>
                        <div className="text-[11px] text-gray-500 line-clamp-1">{job?.project?.name || job?.jobNumber || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700">
                            <FileText size={12} /> PR: {orderPrs.length}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700">
                            <Receipt size={12} /> PO: {orderPos.length}
                          </span>
                        </div>
                        {orderExpense > 0 && (
                          <div className="text-[11px] font-bold text-emerald-600 mt-1">
                            ฿{orderExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-black tracking-wide ${
                            order.status === 'เสร็จสิ้น' ? 'bg-green-100 text-green-700' :
                            order.status === 'ตรวจสอบคุณภาพ' ? 'bg-purple-100 text-purple-700' :
                            order.status === 'กำลังผลิต' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status || 'รอเปิด PO'}
                          </span>
                      </td>
                      <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {order.qcStatus === 'PASS' && <CheckCircle2 size={14} className="text-green-500" />}
                            {order.qcStatus === 'FAIL' && <FileWarning size={14} className="text-red-500" />}
                            {(!order.qcStatus || order.qcStatus === 'PENDING') && <Clock size={14} className="text-amber-500" />}
                            <span className={`text-[11px] font-bold ${
                              order.qcStatus === 'PASS' ? 'text-green-700' :
                              order.qcStatus === 'FAIL' ? 'text-red-700' :
                              'text-amber-700'
                            }`}>
                              {order.qcStatus || 'PENDING'}
                            </span>
                          </div>
                      </td>
                      <td className="p-4">
                        {order.productionDeadline ? (
                          <div className={`text-sm font-bold ${
                            new Date(order.productionDeadline) < today && order.status !== 'เสร็จสิ้น'
                              ? 'text-red-600'
                              : 'text-gray-700'
                          }`}>
                            {new Date(order.productionDeadline).toLocaleDateString('th-TH')}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  )})
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm font-bold text-gray-400">
                      ไม่พบข้อมูลคำสั่งผลิตตู้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PR / PO Combined Tab */}
        {activeTab === 'prs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">รหัสใบสั่งผลิต</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">เลขที่ PR</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">ชื่อโครงการ / ผู้ขอ</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">สถานะ PO</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">PO ที่ออกแล้ว</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">ค่าใช้จ่าย (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.some((o: any) => (o.purchaseRequests || []).length > 0) ? (
                  filteredOrders.flatMap((order: any) => {
                    const orderPrs = order.purchaseRequests || [];
                    if (orderPrs.length === 0) return [];
                    
                    return orderPrs.map((pr: any, prIdx: number) => {
                      const prPos = pr.purchaseOrders || [];
                      const prExpense = prPos.reduce((acc: number, po: any) => acc + (Number(po.totalAmount) || 0), 0);
                      const hasPo = prPos.length > 0;
                      
                      return (
                        <tr key={`${order.id}-${pr.id}`} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            {prIdx === 0 && (
                              <div className="text-sm font-black text-gray-900">{order.orderNumber}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-black text-blue-700">{pr.prNumber}</div>
                            <div className="text-[10px] text-gray-400">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-bold text-gray-800">{pr.projectName || '-'}</div>
                            <div className="text-[11px] text-gray-500">{pr.requestedBy || '-'}</div>
                          </td>
                          <td className="p-4">
                            {hasPo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black bg-green-100 text-green-700">
                                <CheckCircle2 size={12} /> ออก PO แล้ว ({prPos.length})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black bg-amber-100 text-amber-700">
                                <Clock size={12} /> รอออก PO
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {hasPo ? (
                              <div className="space-y-1">
                                {prPos.map((po: any) => (
                                  <div key={po.id} className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-900">{po.poNumber}</span>
                                    {po.vendorName && <span className="text-[10px] text-gray-500">({po.vendorName})</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {prExpense > 0 ? (
                              <div className="text-sm font-black text-emerald-600">
                                ฿{prExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm font-bold text-gray-400">
                      ไม่พบข้อมูล PR / PO ที่เชื่อมกับงานประกอบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total expense summary */}
            {pos.length > 0 && (
              <div className="border-t border-gray-100 p-4 flex justify-end">
                <div className="bg-emerald-50 px-6 py-3 rounded-xl">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">รวมค่าใช้จ่ายทั้งหมด: </span>
                  <span className="text-lg font-black text-emerald-700 ml-2">
                    ฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
