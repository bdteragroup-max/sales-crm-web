'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreReceiveClient({ initialPos, initialReceivedPos, userName }: { initialPos: any[], initialReceivedPos: any[], userName: string }) {
  const [pos, setPos] = useState(initialPos);
  const [receivedPos, setReceivedPos] = useState(initialReceivedPos);
  const [activeTab, setActiveTab] = useState<'pending' | 'received'>('pending');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Extract unique years from the data (using deliveryDate for store view)
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    const allPos = [...pos, ...receivedPos];
    allPos.forEach(po => {
      if (po.deliveryDate) {
        years.add(new Date(po.deliveryDate).getFullYear().toString());
      }
      if (po.receivedAt) {
        years.add(new Date(po.receivedAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [pos, receivedPos]);

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
        const receivedPo = pos.find(p => p.poNumber === poNumber);
        if (receivedPo) {
          setReceivedPos(prev => [{...receivedPo, receiveStatus: 'Received', receivedBy: userName, receivedAt: new Date().toISOString()}, ...prev]);
        }
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
      
    let matchesCompany = true;
    if (companyFilter && po.poNumber) {
      const match = po.poNumber.match(/[A-Za-z0-9]+-([EPG])/i);
      if (match) {
        const code = match[1].toUpperCase();
        if (companyFilter === 'TE' && code !== 'E') matchesCompany = false;
        if (companyFilter === 'TP' && code !== 'P') matchesCompany = false;
        if (companyFilter === 'TG' && code !== 'G') matchesCompany = false;
      } else {
        matchesCompany = false; // No valid company code found
      }
    }
    
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

    return matchesSearch && matchesCompany && matchesDate && matchesMonth && matchesYear;
  });

  const filteredReceivedPos = receivedPos.filter(po => {
    const matchesSearch = 
      po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.itemList?.toLowerCase().includes(searchTerm.toLowerCase());
      
    let matchesCompany = true;
    if (companyFilter && po.poNumber) {
      const match = po.poNumber.match(/[A-Za-z0-9]+-([EPG])/i);
      if (match) {
        const code = match[1].toUpperCase();
        if (companyFilter === 'TE' && code !== 'E') matchesCompany = false;
        if (companyFilter === 'TP' && code !== 'P') matchesCompany = false;
        if (companyFilter === 'TG' && code !== 'G') matchesCompany = false;
      } else {
        matchesCompany = false;
      }
    }
    
    // For received items, we typically filter by receivedAt rather than deliveryDate
    const poDate = po.receivedAt ? new Date(po.receivedAt) : null;
    
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

    return matchesSearch && matchesCompany && matchesDate && matchesMonth && matchesYear;
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-4 font-medium text-sm transition-colors ${
            activeTab === 'pending'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/30'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          รอรับสินค้า ({pos.length})
        </button>
        <button
          className={`px-6 py-4 font-medium text-sm transition-colors ${
            activeTab === 'received'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/30'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('received')}
        >
          รับสินค้าแล้ว ({receivedPos.length})
        </button>
      </div>

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

          {/* Row 2: Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <select
              className="w-full md:w-1/4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">ทุกบริษัท</option>
              <option value="TE">Tera Electric (TE)</option>
              <option value="TP">Tera Power (TP)</option>
              <option value="TG">Tera Group (TG)</option>
            </select>

            <input
              type="date"
              className="w-full md:w-1/4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            <select
              className="w-full md:w-1/4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">ทุกเดือน (วันส่งมอบ)</option>
              {thaiMonths.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select
              className="w-full md:w-1/4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

      <div className="p-6 pt-0 mt-4">
        {/* Mobile View (Cards) */}
        <div className="block md:hidden space-y-4">
          {activeTab === 'pending' && filteredPos.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border">ไม่มีรายการสั่งซื้อที่รอรับสินค้า</div>
          ) : activeTab === 'received' && filteredReceivedPos.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border">ไม่มีประวัติการรับสินค้า</div>
          ) : activeTab === 'pending' ? (
            filteredPos.map((po) => (
              <div key={po.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-900">{po.poNumber}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">ผู้ขาย:</span> {po.vendorName || '-'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">โครงการ:</span> {po.projectName || '-'}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {po.itemList || '-'}
                </div>
                <div className="mt-2 pt-2 border-t">
                  <button
                    onClick={() => handleReceive(po.poNumber)}
                    disabled={loadingMap[po.poNumber]}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors disabled:opacity-50"
                  >
                    {loadingMap[po.poNumber] ? 'กำลังดำเนินการ...' : 'ยืนยันรับสินค้า'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            filteredReceivedPos.map((po) => (
              <div key={po.id} className="bg-gray-50 border rounded-lg p-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-900">{po.poNumber}</span>
                  <span className="text-sm text-gray-500">
                    {po.receivedAt ? new Date(po.receivedAt).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">ผู้ขาย:</span> {po.vendorName || '-'}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">โครงการ:</span> {po.projectName || '-'}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {po.itemList || '-'}
                </div>
                <div className="text-sm text-green-700 font-medium mt-1 pt-2 border-t">
                  รับโดย: {po.receivedBy || '-'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เลขที่ PO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ขาย</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โครงการ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการสินค้า</th>
                {activeTab === 'pending' ? (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันส่งมอบ</th>
                ) : (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่รับของ</th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'pending' ? 'การจัดการ' : 'ผู้รับของ'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === 'pending' && filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    ไม่มีรายการสั่งซื้อที่รอรับสินค้า
                  </td>
                </tr>
              ) : activeTab === 'received' && filteredReceivedPos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    ไม่มีประวัติการรับสินค้า
                  </td>
                </tr>
              ) : activeTab === 'pending' ? (
                filteredPos.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{po.poNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.vendorName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.projectName || '-'}</td>
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
              ) : (
                filteredReceivedPos.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{po.poNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.vendorName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{po.projectName || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{po.itemList || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {po.receivedAt ? new Date(po.receivedAt).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {po.receivedBy || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
