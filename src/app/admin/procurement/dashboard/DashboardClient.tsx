'use client';
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardClient({ pos, prs }: { pos: any[], prs: any[] }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  // Helper to extract year, month, and day from PO number (e.g. PO69-P070201)
  const extractDateFromPO = (po: any) => {
    let y = new Date(po.createdAt).getFullYear();
    let m = new Date(po.createdAt).getMonth();
    let d = new Date(po.createdAt).getDate();
    
    if (po.poNumber) {
      // Matches PO69-P070201 -> Year 69, Month 07, Day 02
      const match = po.poNumber.match(/^PO(\d{2})-[A-Z](\d{2})(\d{2})/i);
      if (match) {
        let extY = parseInt(match[1], 10);
        extY = extY < 50 ? extY + 2000 : extY + 2500 - 543; // Handle BE to CE
        const extM = parseInt(match[2], 10) - 1;
        const extD = parseInt(match[3], 10);
        
        if (extM >= 0 && extM <= 11) {
          y = extY;
          m = extM;
          d = extD;
        }
      }
    }
    return { year: y, month: m, day: d };
  };

  const filteredPos = useMemo(() => {
    return pos.filter(po => {
      const { year, month, day } = extractDateFromPO(po);
      if (selectedYear !== 'ALL' && year.toString() !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && month.toString() !== selectedMonth) return false;
      if (selectedDay !== 'ALL' && day.toString() !== selectedDay) return false;
      return true;
    });
  }, [pos, selectedYear, selectedMonth, selectedDay]);

  // Metrics
  const pendingPOsCount = filteredPos.filter(po => po.receiveStatus !== 'Received').length;
  const currentMonth = new Date().getMonth();
  const spendingCurrentMonth = filteredPos
    .filter(po => {
      const { year, month } = extractDateFromPO(po);
      return month === currentMonth && year === currentYear;
    })
    .reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
  
  const prsWithoutPOs = prs.filter(pr => pr.purchaseOrders.length === 0).length;

  // Chart Data: Spending by Month and Company
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => {
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return {
        name: monthNames[i],
        TE: 0,
        TP: 0,
        TG: 0
      };
    });

    filteredPos.forEach(po => {
      const { month } = extractDateFromPO(po);
      const amt = Number(po.totalAmount || 0);
      if (po.poNumber) {
        if (po.poNumber.includes('E')) data[month].TE += amt;
        else if (po.poNumber.includes('P')) data[month].TP += amt;
        else if (po.poNumber.includes('G')) data[month].TG += amt;
      }
    });

    return data;
  }, [filteredPos]);

  // Unique Years for Filter
  const availableYears = useMemo(() => {
    const years = new Set(pos.map(po => extractDateFromPO(po).year.toString()));
    years.add(currentYear.toString());
    return Array.from(years).sort().reverse();
  }, [pos, currentYear]);

  // Spending by Company
  const spendingByCompany = useMemo(() => {
    let TE = 0;
    let TP = 0;
    let TG = 0;

    filteredPos.forEach(po => {
      const amt = Number(po.totalAmount || 0);
      if (po.poNumber) {
        if (po.poNumber.includes('E')) TE += amt;
        else if (po.poNumber.includes('P')) TP += amt;
        else if (po.poNumber.includes('G')) TG += amt;
      }
    });

    return { TE, TP, TG };
  }, [filteredPos]);

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const exportData = filteredPos.map(po => ({
        'เลขที่ PO': po.poNumber,
        'อ้างอิง PR': po.prNumber || '-',
        'โปรเจกต์': po.jobName || po.purchaseRequest?.projectName || '-',
        'ผู้ขาย': po.vendorName || '-',
        'ยอดรวม (บาท)': Number(po.totalAmount) || 0,
        'วันส่งมอบ': po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-',
        'สถานะ': po.receiveStatus === 'Received' ? `รับโดย ${po.receivedBy}` : 'รอรับสินค้า',
      }));

      // Add summary row
      const totalAmount = filteredPos.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
      exportData.push({
        'เลขที่ PO': 'รวมทั้งหมด',
        'อ้างอิง PR': '',
        'โปรเจกต์': '',
        'ผู้ขาย': '',
        'ยอดรวม (บาท)': totalAmount,
        'วันส่งมอบ': '',
        'สถานะ': '',
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard POs');
      
      const fileName = `Procurement_Dashboard_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between items-center gap-4 mb-6">
        <h2 className="text-lg font-bold text-gray-800 w-full md:w-auto">ตัวกรองแดชบอร์ด</h2>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select 
            className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="ALL">วันที่ (All)</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d.toString()}>{d}</option>)}
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
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm w-full md:w-auto shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            ส่งออก Excel
          </button>
        </div>
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

      {/* Spending by Company Cards */}
      <h3 className="text-gray-800 font-semibold mb-4">ยอดใช้จ่ายแยกตามบริษัท (TE / TP / TG)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-indigo-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">TE (Tera Electric)</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {spendingByCompany.TE.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-teal-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">TP (Tera Power)</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {spendingByCompany.TP.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase">TG (Tera Group)</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {spendingByCompany.TG.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}
          </p>
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
              <Bar dataKey="TE" fill="#6366f1" name="TE (Electric)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="TP" fill="#14b8a6" name="TP (Power)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="TG" fill="#a855f7" name="TG (Group)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
