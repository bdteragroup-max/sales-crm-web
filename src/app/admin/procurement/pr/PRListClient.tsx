'use client';
import React, { useState, useMemo } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { updatePurchaseRequest } from '@/app/actions/procurement';

export default function PRListClient({ initialPrs, pendingPrOrders = [] }: { initialPrs: any[], pendingPrOrders?: any[] }) {
  const router = useRouter();
  const [prsList, setPrsList] = useState(initialPrs);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [poFilter, setPoFilter] = useState('all'); // all, with-po, without-po
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all'); // all, TE, TP, TG

  const [editingPR, setEditingPR] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    prNumber: '',
    projectName: '',
    itemList: '',
    requestedBy: '',
    recordedAt: '',
    note: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (pr: any) => {
    setEditingPR(pr);
    let dateStr = '';
    if (pr.recordedAt) {
      try {
        const d = new Date(pr.recordedAt);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    setEditForm({
      prNumber: pr.prNumber || '',
      projectName: pr.projectName || '',
      itemList: pr.itemList || '',
      requestedBy: pr.requestedBy || '',
      recordedAt: dateStr,
      note: pr.note || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPR) return;

    if (!editForm.prNumber.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกเลขที่ PR' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        prNumber: editForm.prNumber.trim(),
        projectName: editForm.projectName.trim(),
        itemList: editForm.itemList.trim(),
        requestedBy: editForm.requestedBy.trim(),
        recordedAt: editForm.recordedAt ? editForm.recordedAt : null,
        note: editForm.note.trim()
      };

      const res = await updatePurchaseRequest(editingPR.id, payload);
      if (res.success && res.data) {
        setPrsList(prev => prev.map(p => p.id === editingPR.id ? { ...p, ...res.data } : p));
        setEditingPR(null);
        Swal.fire({
          icon: 'success',
          title: 'อัพเดตสำเร็จ',
          text: `บันทึกเขียนทับข้อมูล PR ${res.data.prNumber} เรียบร้อยแล้ว`,
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกได้',
          text: res.error || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล PR',
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

  const filteredPrs = prsList.filter(pr => {
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
    <>
      {pendingPrOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-red-200 overflow-hidden mb-6">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
            <h2 className="text-red-800 font-bold flex items-center gap-2">
              <AlertCircle size={20} className="text-brand-red" />
              รอฝ่ายจัดซื้อเปิด PR จากกระบวนการผลิต ({pendingPrOrders.length} รายการ)
            </h2>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-600 bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-bold">ออเดอร์ (Order)</th>
                    <th className="px-6 py-3 font-bold">ลูกค้า (Customer)</th>
                    <th className="px-6 py-3 font-bold">กำหนดส่ง (Delivery)</th>
                    <th className="px-6 py-3 font-bold">หมายเหตุถึงจัดซื้อ (Note)</th>
                    <th className="px-6 py-3 font-bold text-right">จัดการ (Action)</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPrOrders.map((order: any) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-bold text-brand-red">{order.orderNumber}</td>
                      <td className="px-6 py-3">{order.company?.name || '-'}</td>
                      <td className="px-6 py-3">
                        {order.targetDeliveryDate ? new Date(order.targetDeliveryDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-6 py-3 text-red-600">{order.prNote || '-'}</td>
                      <td className="px-6 py-3 text-right">
                        <Link 
                          href={`/admin/procurement/pr/create?orderId=${order.id}&note=${encodeURIComponent(order.prNote || '')}&project=${encodeURIComponent(order.orderNumber)}`}
                          className="inline-flex items-center gap-1 bg-brand-red text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                          <Plus size={14} /> สร้าง PR
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
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
                {pr.purchaseOrders?.length > 0 ? pr.purchaseOrders.map((po: any) => {
                  const isCancelled = po.receiveStatus === 'Cancelled';
                  const isReceived = po.receiveStatus === 'Received';
                  const badgeClass = isCancelled 
                    ? "bg-red-50 text-red-700 border border-red-200 line-through" 
                    : isReceived 
                    ? "bg-green-100 text-green-800" 
                    : "bg-blue-100 text-blue-800";
                  const statusLabel = isCancelled ? 'ยกเลิกแล้ว' : (isReceived ? 'รับแล้ว' : 'รอรับสินค้า');
                  return (
                    <span key={po.poNumber} className={`inline-block text-xs px-2 py-1 rounded-full mr-1 mb-1 ${badgeClass}`}>
                      {po.poNumber} ({statusLabel})
                    </span>
                  );
                }) : <span className="text-sm text-gray-500">-</span>}
              </div>
              <div className="mt-2 pt-2 border-t flex justify-end">
                <button
                  onClick={() => openEditModal(pr)}
                  className="w-full text-xs px-3 py-1.5 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded transition-colors font-medium text-center inline-flex items-center justify-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  แก้ไข PR
                </button>
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredPrs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-gray-500">ไม่พบข้อมูล</td></tr>
            ) : (
              filteredPrs.map(pr => (
                <tr key={pr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{pr.prNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.recordedAt ? new Date(pr.recordedAt).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{normalizeProjectName(pr.projectName) || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{pr.itemList || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{pr.requestedBy || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {pr.purchaseOrders?.length > 0 ? pr.purchaseOrders.map((po: any) => {
                      const isCancelled = po.receiveStatus === 'Cancelled';
                      const isReceived = po.receiveStatus === 'Received';
                      const badgeClass = isCancelled 
                        ? "bg-red-50 text-red-700 border border-red-200 line-through" 
                        : isReceived 
                        ? "bg-green-100 text-green-800" 
                        : "bg-blue-100 text-blue-800";
                      const statusLabel = isCancelled ? 'ยกเลิกแล้ว' : (isReceived ? 'รับแล้ว' : 'รอรับสินค้า');
                      return (
                        <span key={po.poNumber} className={`inline-block text-xs px-2 py-1 rounded-full mr-1 ${badgeClass}`}>
                          {po.poNumber} ({statusLabel})
                        </span>
                      );
                    }) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(pr)}
                      className="text-xs px-2.5 py-1 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded transition-colors inline-flex items-center gap-1 font-medium"
                      title="แก้ไขข้อมูลและเขียนทับ PR เดิม"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Edit PR Modal */}
      {editingPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-gray-100">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/80 sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>แก้ไขข้อมูล PR</span>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {editingPR.prNumber}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบบจะบันทึกเขียนทับข้อมูลเดิมในระบบทันที (ไม่สร้างรายการใหม่)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPR(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    เลขที่ PR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.prNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, prNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="เช่น PR69-E010101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    วันที่ขอซื้อ (Date)
                  </label>
                  <input
                    type="date"
                    value={editForm.recordedAt}
                    onChange={(e) => setEditForm(prev => ({ ...prev, recordedAt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ผู้ขอจัดซื้อ
                  </label>
                  <input
                    type="text"
                    value={editForm.requestedBy}
                    onChange={(e) => setEditForm(prev => ({ ...prev, requestedBy: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ชื่อผู้ขอจัดซื้อ"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อโครงการ / โปรเจกต์
                </label>
                <input
                  type="text"
                  value={editForm.projectName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, projectName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น งานกรมการข้าว, งานโซลาร์ตรอน"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  รายการสินค้า / สินค้าที่ขอซื้อ
                </label>
                <textarea
                  rows={3}
                  value={editForm.itemList}
                  onChange={(e) => setEditForm(prev => ({ ...prev, itemList: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ระบุรายการสินค้า"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span>
                  การบันทึกจะเป็นการ<b>เขียนทับข้อมูลเดิมโดยตรง</b>ในฐานข้อมูล โดยหากมีการแก้ไขเลข PR ระบบจะอัพเดต PO ที่เกี่ยวข้องให้ด้วยอัตโนมัติ
                </span>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPR(null)}
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
    </>
  );
}
