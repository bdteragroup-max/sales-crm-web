'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreReceiveClient({ initialPos, userName }: { initialPos: any[], userName: string }) {
  const [pos, setPos] = useState(initialPos);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Extract unique years from the data (using deliveryDate for store view)
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    pos.forEach(po => {
      if (po.deliveryDate) {
        years.add(new Date(po.deliveryDate).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [pos]);

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

  const handleReceive = async (poNumber: string) => {
    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await fetch(`/api/store/receive/${encodeURIComponent(poNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedBy: userName })
      });
      if (res.ok) {
        setPos(prev => prev.filter(po => po.poNumber !== poNumber));
        router.refresh();
      } else {
        alert('อัปเดตข้อมูล PO ไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการอัปเดต PO');
    }
    setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
  };

  const filteredPos = pos.filter(po => {
    const matchesSearch = 
      po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.itemList?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // For store receiving, deliveryDate is often the most relevant date
    const poDate = po.deliveryDate ? new Date(po.deliveryDate) : null;
    
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

    return matchesSearch && matchesDate && matchesMonth && matchesYear;
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4 mb-2">
          {/* Row 1: Search */}
          <div className="flex w-full">
            <input 
              type="text" 
              placeholder="ค้นหาด้วยเลขที่ PO, ชื่อผู้ขาย หรือรายการสินค้า..." 
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
              <option value="">ทุกเดือน (วันส่งมอบ)</option>
              {thaiMonths.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select
              className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">ทุกปี (วันส่งมอบ)</option>
              {uniqueYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-6 pt-0 mt-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เลขที่ PO</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการสินค้า</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันส่งมอบ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  ไม่มีรายการสั่งซื้อที่รอรับสินค้า
                </td>
              </tr>
            ) : (
              filteredPos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.vendorName || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{po.itemList || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleReceive(po.poNumber)}
                      disabled={loadingMap[po.poNumber]}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors disabled:opacity-50"
                    >
                      {loadingMap[po.poNumber] ? 'กำลังดำเนินการ...' : 'ยืนยันรับสินค้า'}
                    </button>
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
