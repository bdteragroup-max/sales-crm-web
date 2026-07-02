'use client';
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function StoreDashboardClient({ pendingPOs, receivedPOs }: { pendingPOs: any[], receivedPOs: any[] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');

  // Helper to extract year, month from PO number or createdAt
  const extractDateFromPO = (po: any) => {
    let y = new Date(po.createdAt).getFullYear();
    let m = new Date(po.createdAt).getMonth();
    
    if (po.poNumber) {
      const match = po.poNumber.match(/^PO(\d{2})-[A-Z](\d{2})(\d{2})/i);
      if (match) {
        let extY = parseInt(match[1], 10);
        extY = extY < 50 ? extY + 2000 : extY + 2500 - 543;
        const extM = parseInt(match[2], 10) - 1;
        if (extM >= 0 && extM <= 11) {
          y = extY;
          m = extM;
        }
      }
    }
    return { year: y, month: m };
  };

  const getCompanyFromPO = (poNumber: string) => {
    if (!poNumber) return '';
    if (poNumber.includes('E')) return 'TE';
    if (poNumber.includes('P')) return 'TP';
    if (poNumber.includes('G')) return 'TG';
    return '';
  };

  // Filter Data
  const filterPO = (po: any) => {
    const { year, month } = extractDateFromPO(po);
    const company = getCompanyFromPO(po.poNumber);

    if (selectedYear !== 'ALL' && year.toString() !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && month.toString() !== selectedMonth) return false;
    if (selectedCompany !== 'ALL' && company !== selectedCompany) return false;
    return true;
  };

  const filteredPendingPOs = useMemo(() => pendingPOs.filter(filterPO), [pendingPOs, selectedYear, selectedMonth, selectedCompany]);
  const filteredReceivedPOs = useMemo(() => receivedPOs.filter(filterPO), [receivedPOs, selectedYear, selectedMonth, selectedCompany]);

  const availableYears = useMemo(() => {
    const years = new Set(pendingPOs.concat(receivedPOs).map(po => extractDateFromPO(po).year.toString()));
    years.add(currentYear.toString());
    return Array.from(years).sort().reverse();
  }, [pendingPOs, receivedPOs, currentYear]);

  const now = new Date();
  
  // Calculate Metrics based on filtered data
  const awaitingReceiptCount = filteredPendingPOs.length;
  
  const overduePOs = filteredPendingPOs.filter(po => {
    if (!po.deliveryDate) return false;
    const deliveryDate = new Date(po.deliveryDate);
    // Ignore time for comparison
    deliveryDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deliveryDate < today;
  });
  const overdueCount = overduePOs.length;

  const currentMonth = now.getMonth();
  const receivedThisMonthCount = filteredReceivedPOs.filter(po => {
    if (!po.receivedAt) return false;
    const date = new Date(po.receivedAt);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  // Upcoming POs (Next 7 days)
  const upcomingPOs = filteredPendingPOs.filter(po => {
    if (!po.deliveryDate) return false;
    const deliveryDate = new Date(po.deliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Chart Data (Last 14 days)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      
      const count = filteredReceivedPOs.filter(po => {
        if (!po.receivedAt) return false;
        const poDate = new Date(po.receivedAt);
        return poDate.getDate() === d.getDate() && poDate.getMonth() === d.getMonth() && poDate.getFullYear() === d.getFullYear();
      }).length;

      data.push({
        date: dateStr,
        count: count
      });
    }
    return data;
  }, [filteredReceivedPOs]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:justify-end gap-4 mb-6">
        <select 
          className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          <option value="ALL">บริษัท (All)</option>
          <option value="TE">TE (Electric)</option>
          <option value="TP">TP (Power)</option>
          <option value="TG">TG (Group)</option>
        </select>

        <select 
          className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="ALL">เดือน (All)</option>
          {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => (
            <option key={i} value={i.toString()}>{m}</option>
          ))}
        </select>

        <select 
          className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="ALL">ปี (All)</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium uppercase">PO รอรับสินค้า</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{awaitingReceiptCount}</p>
          </div>
          <Package className="text-yellow-500 opacity-20" size={48} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-500 flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium uppercase">เกินกำหนดส่ง (Overdue)</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{overdueCount}</p>
          </div>
          <AlertTriangle className="text-red-500 opacity-20" size={48} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500 flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium uppercase">รับเข้าเดือนนี้</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{receivedThisMonthCount}</p>
          </div>
          <CheckCircle className="text-green-500 opacity-20" size={48} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Overdue Table */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              รายการที่เกินกำหนด (เร่งด่วน)
            </h3>
            <Link href="/store/receive" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          
          {overduePOs.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg flex items-center justify-center gap-2">
              ไม่มีรายการเกินกำหนด <CheckCircle size={16} className="text-green-500" />
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2 font-medium">เลขที่ PO</th>
                    <th className="pb-2 font-medium">ผู้ขาย</th>
                    <th className="pb-2 font-medium">กำหนดส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {overduePOs.slice(0, 5).map(po => (
                    <tr key={po.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{po.poNumber}</td>
                      <td className="py-3 text-gray-600 truncate max-w-[150px]">{po.vendorName || '-'}</td>
                      <td className="py-3 text-red-600 font-medium">
                        {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Table */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-blue-500" size={20} />
              รายการที่จะเข้าเร็วๆนี้ (7 วัน)
            </h3>
            <Link href="/store/receive" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด</Link>
          </div>
          
          {upcomingPOs.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">ไม่มีรายการที่จะเข้าใน 7 วัน</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2 font-medium">เลขที่ PO</th>
                    <th className="pb-2 font-medium">ผู้ขาย</th>
                    <th className="pb-2 font-medium">กำหนดส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPOs.slice(0, 5).map(po => (
                    <tr key={po.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{po.poNumber}</td>
                      <td className="py-3 text-gray-600 truncate max-w-[150px]">{po.vendorName || '-'}</td>
                      <td className="py-3 text-gray-900">
                        {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-6">ปริมาณการรับสินค้า 14 วันย้อนหลัง</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis allowDecimals={false} />
              <Tooltip 
                cursor={{fill: '#f3f4f6'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${value} รายการ`, 'รับเข้า']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="จำนวนรายการรับเข้า" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
