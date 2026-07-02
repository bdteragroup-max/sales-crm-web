'use client';
import React, { useState, useMemo } from 'react';

export default function PRListClient({ initialPrs }: { initialPrs: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [poFilter, setPoFilter] = useState('all'); // all, with-po, without-po
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all'); // all, TE, TP, TG

  // Helper to normalize project names to detect duplicates
  const normalizeProjectName = (name: string | null | undefined) => {
    if (!name) return '';
    let normalized = name.trim();
    
    // Strip leading "งาน" prefix
    if (normalized.startsWith('งาน') && normalized.length > 3) {
      normalized = normalized.replace(/^งาน\s*/, '').trim();
    }
    
    // Manual aliases for known abbreviations
    if (normalized === 'พด.เลย') normalized = 'พัฒนาที่ดินเลย';
    if (normalized === 'พด.เชียงใหม่') normalized = 'พัฒนาที่ดินเชียงใหม่';
    
    return normalized;
  };

  // Extract unique projects for the dropdown
  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    initialPrs.forEach(pr => {
      if (pr.projectName) {
        projects.add(normalizeProjectName(pr.projectName));
      }
    });
    return Array.from(projects).sort();
  }, [initialPrs]);

  // Extract unique years from the data
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    initialPrs.forEach(pr => {
      if (pr.recordedAt) {
        years.add(new Date(pr.recordedAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [initialPrs]);

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

  const filteredPrs = initialPrs.filter(pr => {
    const matchesSearch = 
      pr.prNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.itemList?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesProject = projectFilter ? normalizeProjectName(pr.projectName) === projectFilter : true;
    
    let matchesPo = true;
    if (poFilter === 'with-po') {
      matchesPo = pr.purchaseOrders && pr.purchaseOrders.length > 0;
    } else if (poFilter === 'without-po') {
      matchesPo = !pr.purchaseOrders || pr.purchaseOrders.length === 0;
    }

    const prDate = pr.recordedAt ? new Date(pr.recordedAt) : null;
    
    let matchesDate = true;
    if (dateFilter && prDate) {
      const yyyy = prDate.getFullYear();
      const mm = String(prDate.getMonth() + 1).padStart(2, '0');
      const dd = String(prDate.getDate()).padStart(2, '0');
      const prDateString = `${yyyy}-${mm}-${dd}`;
      matchesDate = prDateString === dateFilter;
    } else if (dateFilter && !prDate) {
      matchesDate = false;
    }

    let matchesMonth = true;
    if (monthFilter && prDate) {
      matchesMonth = (prDate.getMonth() + 1).toString() === monthFilter;
    } else if (monthFilter && !prDate) {
      matchesMonth = false;
    }

    let matchesYear = true;
    if (yearFilter && prDate) {
      matchesYear = prDate.getFullYear().toString() === yearFilter;
    } else if (yearFilter && !prDate) {
      matchesYear = false;
    }

    let matchesCompany = true;
    if (companyFilter !== 'all') {
      if (pr.prNumber) {
        if (companyFilter === 'TE') matchesCompany = pr.prNumber.includes('E');
        else if (companyFilter === 'TP') matchesCompany = pr.prNumber.includes('P');
        else if (companyFilter === 'TG') matchesCompany = pr.prNumber.includes('G');
      } else {
        matchesCompany = false;
      }
    }

    return matchesSearch && matchesProject && matchesPo && matchesDate && matchesMonth && matchesYear && matchesCompany;
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden p-6">
      <div className="mb-4 flex flex-col gap-4">
        {/* Search Bar - Full Width */}
        <input 
          type="text" 
          placeholder="ค้นหาด้วยเลขที่ PR, โครงการ, สินค้า, หรือผู้ขอซื้อ..." 
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {/* Filters Grid - 2 cols on mobile, up to 6 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">ทุกโครงการ</option>
            {uniqueProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            value={poFilter}
            onChange={(e) => setPoFilter(e.target.value)}
          >
            <option value="all">สถานะ PO ทั้งหมด</option>
            <option value="with-po">มี PO แล้ว</option>
            <option value="without-po">ยังไม่มี PO</option>
          </select>

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          >
            <option value="all">ทุกบริษัท</option>
            <option value="TE">TE (Tera Electric)</option>
            <option value="TP">TP (Tera Power)</option>
            <option value="TG">TG (Tera Group)</option>
          </select>

          <input
            type="date"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 text-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="">ทุกเดือน</option>
            {thaiMonths.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
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

      {/* Mobile View (Cards) */}
      <div className="block md:hidden space-y-4">
        {filteredPrs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border">ไม่พบข้อมูล</div>
        ) : (
          filteredPrs.map(pr => (
            <div key={pr.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-gray-900">{pr.prNumber}</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {pr.recordedAt ? new Date(pr.recordedAt).toLocaleDateString('th-TH') : '-'}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">ผู้ขอซื้อ:</span> {pr.requestedBy || '-'}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">โครงการ:</span> {normalizeProjectName(pr.projectName) || '-'}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {pr.itemList || '-'}
              </div>
              <div className="mt-2 pt-2 border-t">
                <span className="font-medium text-sm text-gray-700 block mb-1">PO ที่เกี่ยวข้อง:</span>
                {pr.purchaseOrders?.length > 0 ? pr.purchaseOrders.map((po: any) => (
                  <span key={po.poNumber} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">
                    {po.poNumber} ({po.receiveStatus === 'PENDING' || po.receiveStatus === 'Pending' ? 'รอรับสินค้า' : po.receiveStatus || 'รอรับสินค้า'})
                  </span>
                )) : <span className="text-sm text-gray-500">-</span>}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่ PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">โครงการ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการสินค้า</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ขอซื้อ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO ที่เกี่ยวข้อง</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredPrs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              filteredPrs.map(pr => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{pr.prNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.recordedAt ? new Date(pr.recordedAt).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{normalizeProjectName(pr.projectName) || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{pr.itemList || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.requestedBy || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {pr.purchaseOrders?.length > 0 ? pr.purchaseOrders.map((po: any) => (
                      <span key={po.poNumber} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1">
                        {po.poNumber} ({po.receiveStatus === 'PENDING' || po.receiveStatus === 'Pending' ? 'รอรับสินค้า' : po.receiveStatus || 'รอรับสินค้า'})
                      </span>
                    )) : '-'}
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
