'use client';
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardClient({ pos, prs }: { pos: any[], prs: any[] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const filteredPos = useMemo(() => {
    if (selectedYear === 'ALL') return pos;
    return pos.filter(po => new Date(po.createdAt).getFullYear().toString() === selectedYear);
  }, [pos, selectedYear]);

  // Metrics
  const pendingPOsCount = filteredPos.filter(po => po.receiveStatus !== 'Received').length;
  const currentMonth = new Date().getMonth();
  const spendingCurrentMonth = filteredPos
    .filter(po => new Date(po.createdAt).getMonth() === currentMonth && new Date(po.createdAt).getFullYear() === currentYear)
    .reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
  
  const prsWithoutPOs = prs.filter(pr => pr.purchaseOrders.length === 0).length;

  // Chart Data: Spending by Month
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => {
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return {
        name: monthNames[i],
        spending: 0
      };
    });

    filteredPos.forEach(po => {
      const m = new Date(po.createdAt).getMonth();
      data[m].spending += Number(po.totalAmount || 0);
    });

    return data;
  }, [filteredPos]);

  // Unique Years for Filter
  const availableYears = useMemo(() => {
    const years = new Set(pos.map(po => new Date(po.createdAt).getFullYear().toString()));
    years.add(currentYear.toString());
    return Array.from(years).sort().reverse();
  }, [pos, currentYear]);

  return (
    <div>
      <div className="flex justify-end mb-6">
        <select 
          className="px-4 py-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="ALL">ทั้งหมด (All Time)</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">PO รอรับสินค้า</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{pendingPOsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">ยอดใช้จ่าย (เดือนนี้)</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {spendingCurrentMonth.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">PR ที่ยังไม่มี PO</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{prsWithoutPOs}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h3 className="text-gray-800 font-semibold mb-6">ยอดใช้จ่ายรายเดือน</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => Number(value).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })} />
              <Bar dataKey="spending" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
