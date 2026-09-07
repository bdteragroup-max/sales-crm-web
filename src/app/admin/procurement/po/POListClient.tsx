'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { cancelPurchaseOrder, restorePurchaseOrder, updatePurchaseOrder } from '@/app/actions/procurement';

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
  const router = useRouter();
  const [posList, setPosList] = useState(initialPos);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const [editingPO, setEditingPO] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    poNumber: '',
    prNumber: '',
    vendorName: '',
    totalAmount: '',
    creditTerm: '',
    jobName: '',
    deliveryDate: '',
    note: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (po: any) => {
    setEditingPO(po);
    let dateStr = '';
    if (po.deliveryDate) {
      const d = new Date(po.deliveryDate);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
      }
    }
    setEditForm({
      poNumber: po.poNumber || '',
      prNumber: po.prNumber || '',
      vendorName: po.vendorName || '',
      totalAmount: po.totalAmount !== null && po.totalAmount !== undefined ? String(po.totalAmount) : '',
      creditTerm: po.creditTerm || '',
      jobName: po.jobName || po.purchaseRequest?.projectName || '',
      deliveryDate: dateStr,
      note: po.note || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;

    if (!editForm.poNumber.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกเลขที่ PO' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        poNumber: editForm.poNumber.trim(),
        prNumber: editForm.prNumber.trim(),
        vendorName: editForm.vendorName.trim(),
        totalAmount: editForm.totalAmount !== '' ? parseFloat(editForm.totalAmount.replace(/,/g, '')) : null,
        creditTerm: editForm.creditTerm.trim(),
        jobName: editForm.jobName.trim(),
        deliveryDate: editForm.deliveryDate || null,
        note: editForm.note.trim()
      };

      const res = await updatePurchaseOrder(editingPO.id, payload);
      if (res.success && res.data) {
        setPosList(prev => prev.map(p => p.id === editingPO.id ? { ...p, ...res.data } : p));
        setEditingPO(null);
        Swal.fire({
          icon: 'success',
          title: 'อัพเดตสำเร็จ',
          text: `บันทึกเขียนทับข้อมูล PO ${res.data.poNumber} เรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกได้',
          text: res.error || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล PO',
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถบันทึกได้',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all'); // all, TE, TP, TG
  const [projectFilter, setProjectFilter] = useState('');

  // Extract unique years from the data
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    posList.forEach(po => {
      if (po.recordedAt) {
        years.add(new Date(po.recordedAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [posList]);

  // Extract unique normalized project groups
  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    posList.forEach(po => {
      const pName = po.jobName || po.purchaseRequest?.projectName;
      const normalized = getNormalizedProjectGroup(pName);
      if (normalized !== '') {
        projects.add(normalized);
      }
    });
    return Array.from(projects).sort();
  }, [posList]);

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

  const handleCancel = async (poNumber: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการยกเลิก PO',
      html: `คุณต้องการยกเลิก PO เลขที่ <b>${poNumber}</b> ใช่หรือไม่?<br/><span class="text-xs text-gray-500">เมื่อยกเลิกแล้ว รายการนี้จะไม่แสดงในรายการค้างรับของสโตร์</span>`,
      input: 'text',
      inputLabel: 'เหตุผลการยกเลิก (ระบุได้ตามต้องการ)',
      inputValue: 'ยกเลิกใน Express',
      inputPlaceholder: 'เช่น ยกเลิกใน Express แล้ว, เปลี่ยนผู้ขาย ฯลฯ',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันยกเลิก PO',
      cancelButtonText: 'ปิด',
    });

    if (!result.isConfirmed) return;

    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await cancelPurchaseOrder(poNumber, result.value);
      if (res.success) {
        setPosList(prev => prev.map(p => p.poNumber === poNumber ? { ...p, receiveStatus: 'Cancelled' } : p));
        Swal.fire({
          icon: 'success',
          title: 'ยกเลิก PO สำเร็จ',
          text: `PO ${poNumber} ถูกยกเลิกและนำออกจากรายการค้างรับแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถยกเลิก PO ได้',
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถยกเลิก PO ได้',
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
    }
  };

  const handleRestore = async (poNumber: string) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันคืนสถานะ PO',
      text: `ต้องการคืนสถานะ PO ${poNumber} ให้กลับมาใช้งานตามปกติใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันคืนสถานะ',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    setLoadingMap(prev => ({ ...prev, [poNumber]: true }));
    try {
      const res = await restorePurchaseOrder(poNumber);
      if (res.success) {
        setPosList(prev => prev.map(p => p.poNumber === poNumber ? { ...p, receiveStatus: null } : p));
        Swal.fire({
          icon: 'success',
          title: 'คืนสถานะสำเร็จ',
          text: `PO ${poNumber} กลับสู่สถานะปกติแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถคืนสถานะ PO ได้',
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: e.message || 'ไม่สามารถคืนสถานะ PO ได้',
      });
    } finally {
      setLoadingMap(prev => ({ ...prev, [poNumber]: false }));
    }
  };

  const filteredPos = posList.filter(po => {
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'RECEIVED') {
      matchesStatus = po.receiveStatus === 'Received';
    } else if (statusFilter === 'PENDING') {
      matchesStatus = po.receiveStatus !== 'Received' && po.receiveStatus !== 'Cancelled';
    } else if (statusFilter === 'CANCELLED') {
      matchesStatus = po.receiveStatus === 'Cancelled';
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
    return filteredPos
      .filter(po => po.receiveStatus !== 'Cancelled')
      .reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
  }, [filteredPos]);

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const exportData = filteredPos.map(po => ({
        'เลขที่ PO': po.poNumber,
        'อ้างอิง PR': po.prNumber || '-',
        'โปรเจกต์': po.jobName || po.purchaseRequest?.projectName || '-',
        'ผู้ขาย': po.vendorName || '-',
        'เครดิต': po.creditTerm || '-',
        'ยอดรวม (บาท)': Number(po.totalAmount) || 0,
        'วันส่งมอบ': po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-',
        'สถานะ': po.receiveStatus === 'Cancelled' ? 'ยกเลิกแล้ว' : (po.receiveStatus === 'Received' ? `รับโดย ${po.receivedBy}` : 'รอรับสินค้า'),
      }));

      // Add summary row
      exportData.push({
        'เลขที่ PO': 'รวมทั้งหมด',
        'อ้างอิง PR': '',
        'โปรเจกต์': '',
        'ผู้ขาย': '',
        'เครดิต': '',
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
            <option value="CANCELLED">ยกเลิกแล้ว</option>
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
                  po.receiveStatus === 'Cancelled'
                    ? 'bg-red-100 text-red-800'
                    : po.receiveStatus === 'Received'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {po.receiveStatus === 'Cancelled'
                    ? 'ยกเลิกแล้ว'
                    : po.receiveStatus === 'Received'
                    ? `รับโดย ${po.receivedBy}`
                    : 'รอรับสินค้า'}
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
              <div className="text-sm text-gray-700">
                <span className="font-medium">เครดิต:</span> {po.creditTerm || '-'}
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">วันส่งมอบ:</span> {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {po.totalAmount ? Number(po.totalAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(po)}
                  className="flex-1 text-xs px-3 py-1.5 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded transition-colors font-medium text-center inline-flex items-center justify-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  แก้ไข
                </button>
                {po.receiveStatus === 'Cancelled' ? (
                  <button
                    onClick={() => handleRestore(po.poNumber)}
                    disabled={loadingMap[po.poNumber]}
                    className="flex-1 text-xs px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 text-center font-medium"
                  >
                    คืนสถานะ
                  </button>
                ) : (
                  <button
                    onClick={() => handleCancel(po.poNumber)}
                    disabled={loadingMap[po.poNumber]}
                    className="flex-1 text-xs px-3 py-1.5 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded transition-colors disabled:opacity-50 font-medium text-center"
                  >
                    ยกเลิก PO
                  </button>
                )}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">เครดิต</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันส่งมอบ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredPos.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-4 text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              filteredPos.map(po => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{po.prNumber || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]" title={po.jobName || po.purchaseRequest?.projectName || ''}>{po.jobName || po.purchaseRequest?.projectName || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{po.vendorName || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{po.creditTerm || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {po.totalAmount ? Number(po.totalAmount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      po.receiveStatus === 'Cancelled'
                        ? 'bg-red-100 text-red-800'
                        : po.receiveStatus === 'Received'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {po.receiveStatus === 'Cancelled'
                        ? 'ยกเลิกแล้ว'
                        : po.receiveStatus === 'Received'
                        ? `รับโดย ${po.receivedBy}`
                        : 'รอรับสินค้า'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(po)}
                        className="text-xs px-2.5 py-1 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded transition-colors inline-flex items-center gap-1 font-medium"
                        title="แก้ไขข้อมูลและเขียนทับ PO เดิม"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        แก้ไข
                      </button>
                      {po.receiveStatus === 'Cancelled' ? (
                        <button
                          onClick={() => handleRestore(po.poNumber)}
                          disabled={loadingMap[po.poNumber]}
                          className="text-xs px-2.5 py-1 text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1 font-medium"
                          title="คืนสถานะเป็นใช้งานตามปกติ"
                        >
                          คืนสถานะ
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancel(po.poNumber)}
                          disabled={loadingMap[po.poNumber]}
                          className="text-xs px-2.5 py-1 text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1 font-medium"
                          title="ยกเลิก PO ในระบบ CRM (เช่น มีการยกเลิกใน Express แล้ว)"
                        >
                          ยกเลิก PO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredPos.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right font-bold text-gray-700 text-sm">ยอดรวมทั้งหมด:</td>
                <td className="px-6 py-4 font-bold text-gray-900 text-sm">{totalFilteredAmount.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Edit PO Modal */}
      {editingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/80 sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>แก้ไขข้อมูล PO</span>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {editingPO.poNumber}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบบจะบันทึกเขียนทับข้อมูลเดิมในระบบทันที (ไม่สร้างรายการใหม่)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPO(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    เลขที่ PO <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.poNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, poNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น PO69-E010101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    อ้างอิง PR
                  </label>
                  <input
                    type="text"
                    value={editForm.prNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, prNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น PR69-E010101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ผู้ขาย (Vendor)
                  </label>
                  <input
                    type="text"
                    value={editForm.vendorName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vendorName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อผู้ขาย / บริษัท"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ยอดรวมจัดซื้อ (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.totalAmount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    เครดิตเทอม
                  </label>
                  <input
                    type="text"
                    value={editForm.creditTerm}
                    onChange={(e) => setEditForm(prev => ({ ...prev, creditTerm: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น เงินสด, 30 วัน"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    วันส่งมอบ
                  </label>
                  <input
                    type="date"
                    value={editForm.deliveryDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  โปรเจกต์ / ชื่องาน
                </label>
                <input
                  type="text"
                  value={editForm.jobName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, jobName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น งานกรมการข้าว, งานโซลาร์ตรอน"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  rows={3}
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span>
                  การบันทึกจะเป็นการ<b>เขียนทับข้อมูลเดิมโดยตรง</b>ในฐานข้อมูล โดยระบบจะบันทึกประวัติการแก้ไขไว้ที่หมายเหตุโดยอัตโนมัติ
                </span>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPO(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึกข้อมูล (เขียนทับเดิม)'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
