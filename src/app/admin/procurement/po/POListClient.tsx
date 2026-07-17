'use client';
import React, { useState, useMemo } from 'react';

function getNormalizedProjectGroup(rawName: string | undefined | null): string {
  if (!rawName) return '';
  let n = rawName.trim();
  // Remove leading special chars and spaces (e.g. ": ", "- ")
  n = n.replace(/^[:\-\s]+/, '');
  // Remove leading "งาน"
  n = n.replace(/^งาน\s*/, '');
  n = n.trim();

  const lower = n.toLowerCase();
  if (lower.includes('water treatment')) return 'Water treatment-Egat';
  if (lower.includes('กรมการข้าว')) return 'กรมการข้าว';
  if (lower.includes('จำลอง')) return 'จำลองเจริญ';
  if (lower.includes('นิชชินโบ') || lower.includes('nisshinbo')) return 'นิชชินโบ';
  
  return n;
}

export default function POListClient({ initialPos, initialSearch = '' }: { initialPos: any[], initialSearch?: string }) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all'); // all, TE, TP, TG
  const [projectFilter, setProjectFilter] = useState('');

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

  // Extract unique normalized project groups
  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    initialPos.forEach(po => {
      const pName = po.jobName || po.purchaseRequest?.projectName;
      const normalized = getNormalizedProjectGroup(pName);
      if (normalized !== '') {
        projects.add(normalized);
      }
    });
    return Array.from(projects).sort();
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

    let matchesProject = true;
    if (projectFilter !== '') {
      const pName = po.jobName || po.purchaseRequest?.projectName || '';
      matchesProject = getNormalizedProjectGroup(pName) === projectFilter;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesMonth && matchesYear && matchesCompany && matchesProject;
  });

  const totalFilteredAmount = useMemo(() => {
    return filteredPos.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
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
      exportData.push({
        'เลขที่ PO': 'รวมทั้งหมด',
        'อ้างอิง PR': '',
        'โปรเจกต์': '',
        'ผู้ขาย': '',
        'ยอดรวม (บาท)': totalFilteredAmount,
        'วันส่งมอบ': '',
        'สถานะ': '',
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');
      
      const fileName = `PO_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
          <h2 className="text-lg font-bold text-gray-800">ตัวกรองข้อมูล</h2>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            ส่งออก Excel
          </button>
        </div>
        {/* Search Bar & Project Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" 
            placeholder="ค้นหาด้วยเลขที่ PO หรือชื่อผู้ขาย..." 
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">ทุกโปรเจกต์</option>
            {uniqueProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>
        </div>
        
        {/* Filters Grid - 2 cols on mobile, up to 5 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <select 
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
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
      <div className="block md:hidden space-y-4 pb-4">
        {filteredPos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border">ไม่พบข้อมูล</div>
        ) : (
          filteredPos.map(po => (
            <div key={po.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-gray-900">{po.poNumber}</span>
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  po.receiveStatus === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {po.receiveStatus === 'Received' ? `รับโดย ${po.receivedBy}` : 'รอรับสินค้า'}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">ผู้ขาย:</span> {po.vendorName || '-'}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">อ้างอิง PR:</span> {po.prNumber || '-'}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">โปรเจกต์:</span> {po.jobName || po.purchaseRequest?.projectName || '-'}
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">วันส่งมอบ:</span> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {po.totalAmount ? Number(po.totalAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                </div>
              </div>
            </div>
          ))
        )}
        {filteredPos.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex justify-between items-center shadow-sm">
            <span className="font-bold text-gray-700">ยอดรวมทั้งหมด:</span>
            <span className="font-bold text-gray-900 text-lg">{totalFilteredAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</span>
          </div>
        )}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่ PO</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อ้างอิง PR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">โปรเจกต์</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันส่งมอบ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredPos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              filteredPos.map(po => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{po.prNumber || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]" title={po.jobName || po.purchaseRequest?.projectName || ''}>{po.jobName || po.purchaseRequest?.projectName || '-'}</td>
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
          {filteredPos.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-700 text-sm">ยอดรวมทั้งหมด:</td>
                <td className="px-6 py-4 font-bold text-gray-900 text-sm">{totalFilteredAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
