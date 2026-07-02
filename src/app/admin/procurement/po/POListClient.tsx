'use client';
import React, { useState, useMemo } from 'react';

export default function POListClient({ initialPos }: { initialPos: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all'); // all, TE, TP, TG

  // Extract unique years from the data
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    initialPos.forEach(po => {
      if (po.recordedAt) {
        years.add(new Date(po.recordedAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [initialPos]);

  const thaiMonths = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ];

  const filteredPos = initialPos.filter(po => {
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'RECEIVED') {
      matchesStatus = po.receiveStatus === 'Received';
    } else if (statusFilter === 'PENDING') {
      matchesStatus = po.receiveStatus !== 'Received';
    }

    const poDate = po.recordedAt ? new Date(po.recordedAt) : null;
    
    let matchesDate = true;
    if (dateFilter && poDate) {
      const yyyy = poDate.getFullYear();
      const mm = String(poDate.getMonth() + 1).padStart(2, '0');
      const dd = String(poDate.getDate()).padStart(2, '0');
      const poDateString = `${yyyy}-${mm}-${dd}`;
      matchesDate = poDateString === dateFilter;
    } else if (dateFilter && !poDate) {
      matchesDate = false;
    }

    let matchesMonth = true;
    if (monthFilter && poDate) {
      matchesMonth = (poDate.getMonth() + 1).toString() === monthFilter;
    } else if (monthFilter && !poDate) {
      matchesMonth = false;
    }

    let matchesYear = true;
    if (yearFilter && poDate) {
      matchesYear = poDate.getFullYear().toString() === yearFilter;
    } else if (yearFilter && !poDate) {
      matchesYear = false;
    }

    let matchesCompany = true;
    if (companyFilter !== 'all') {
      if (po.poNumber) {
        if (companyFilter === 'TE') matchesCompany = po.poNumber.includes('E');
        else if (companyFilter === 'TP') matchesCompany = po.poNumber.includes('P');
        else if (companyFilter === 'TG') matchesCompany = po.poNumber.includes('G');
      } else {
        matchesCompany = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate && matchesMonth && matchesYear && matchesCompany;
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden p-6">
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: Search and Status */}
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="ค้นหาด้วยเลขที่ PO หรือชื่อผู้ขาย..." 
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="PENDING">รอรับสินค้า</option>
            <option value="RECEIVED">รับสินค้าแล้ว</option>
          </select>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">ทุกบริษัท</option>
            <option value="TE">TE (Tera Electric)</option>
            <option value="TP">TP (Tera Power)</option>
            <option value="TG">TG (Tera Group)</option>
          </select>
        </div>

        {/* Row 2: Date, Month, Year */}
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="date"
            className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          <select
            className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="">ทุกเดือน</option>
            {thaiMonths.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">ทุกปี</option>
            {uniqueYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่ PO</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อ้างอิง PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันส่งมอบ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredPos.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              filteredPos.map(po => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{po.prNumber || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{po.vendorName || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {po.totalAmount ? Number(po.totalAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      po.receiveStatus === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {po.receiveStatus === 'Received' ? `รับโดย ${po.receivedBy}` : 'รอรับสินค้า'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
