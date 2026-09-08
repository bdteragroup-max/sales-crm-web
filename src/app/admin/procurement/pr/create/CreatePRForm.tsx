'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPurchaseRequest } from '@/app/actions/procurement';
import { 
  Save, 
  ArrowLeft, 
  Layers, 
  Calendar, 
  User, 
  FileText, 
  Sparkles, 
  Building2, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Plus,
  Tag,
  Zap,
  BatteryCharging
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

interface PendingOrder {
  id: string;
  orderNumber: string;
  prNote: string;
  targetDeliveryDate: string | null;
  status: string;
  companyName: string;
}

interface LinkedOrder {
  id: string;
  orderNumber: string;
  prNote: string;
  targetDeliveryDate: string | null;
  status: string;
  companyName: string;
}

interface CreatePRFormProps {
  defaultOrderId?: string;
  defaultNote?: string;
  defaultProject?: string;
  currentUser: {
    name: string;
    email: string;
  };
  projectSuggestions: string[];
  pendingOrders: PendingOrder[];
  linkedOrder: LinkedOrder | null;
  latestPrNumber: string | null;
}

export default function CreatePRForm({
  defaultOrderId = '',
  defaultNote = '',
  defaultProject = '',
  currentUser,
  projectSuggestions = [],
  pendingOrders = [],
  linkedOrder: initialLinkedOrder = null,
  latestPrNumber
}: CreatePRFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Active linked order state
  const [activeLinkedOrder, setActiveLinkedOrder] = useState<LinkedOrder | null>(initialLinkedOrder);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<'E' | 'P' | 'G'>('G');
  const [showOrderSelector, setShowOrderSelector] = useState(false);

  // Today formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    prNumber: '',
    projectName: defaultProject,
    itemList: '',
    requestedBy: currentUser.name || currentUser.email || '',
    recordedAt: todayStr,
    note: defaultNote,
    orderId: defaultOrderId
  });

  // Smart PR Number Generator
  const generateSuggestedPrNumber = (companyCode: 'E' | 'P' | 'G') => {
    const now = new Date();
    const bYear = (now.getFullYear() + 543).toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `PR${bYear}-${companyCode}${mm}${dd}`;

    // If latest PR matches today's prefix, increment sequence
    if (latestPrNumber && latestPrNumber.startsWith(prefix)) {
      const seqStr = latestPrNumber.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) {
        return `${prefix}${String(seq + 1).padStart(2, '0')}`;
      }
    }

    return `${prefix}01`;
  };

  // Pre-generate PR number on mount if empty
  useEffect(() => {
    if (!formData.prNumber) {
      const suggested = generateSuggestedPrNumber(selectedCompanyCode);
      setFormData(prev => ({ ...prev, prNumber: suggested }));
    }
  }, []);

  // Handle company prefix click
  const handleSelectCompany = (code: 'E' | 'P' | 'G') => {
    setSelectedCompanyCode(code);
    const suggested = generateSuggestedPrNumber(code);
    setFormData(prev => ({ ...prev, prNumber: suggested }));
  };

  // Handle linking a pending factory order
  const handleLinkOrder = (order: PendingOrder) => {
    setActiveLinkedOrder(order);
    setShowOrderSelector(false);
    setFormData(prev => {
      let updatedNote = prev.note;
      if (order.prNote && !updatedNote.includes(order.prNote)) {
        updatedNote = updatedNote ? `${updatedNote}\n[จากฝ่ายผลิต: ${order.prNote}]` : `[จากฝ่ายผลิต: ${order.prNote}]`;
      }
      return {
        ...prev,
        orderId: order.id,
        projectName: prev.projectName ? prev.projectName : `Order ${order.orderNumber} (${order.companyName})`,
        note: updatedNote
      };
    });
  };

  // Handle unlinking order
  const handleUnlinkOrder = () => {
    setActiveLinkedOrder(null);
    setFormData(prev => ({
      ...prev,
      orderId: ''
    }));
  };

  // Append template snippet into Item List
  const handleInsertTemplate = (snippet: string) => {
    setFormData(prev => ({
      ...prev,
      itemList: prev.itemList ? `${prev.itemList.trim()}\n${snippet}` : snippet
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.prNumber.trim()) {
      setError('กรุณาระบุเลขที่ PR');
      setLoading(false);
      return;
    }

    if (!formData.projectName.trim()) {
      setError('กรุณาระบุชื่อโครงการ / ออเดอร์');
      setLoading(false);
      return;
    }

    if (!formData.itemList.trim()) {
      setError('กรุณาระบุรายการสินค้าที่ต้องการขอซื้อ');
      setLoading(false);
      return;
    }

    try {
      const res = await createPurchaseRequest({
        prNumber: formData.prNumber.trim().toUpperCase(),
        projectName: formData.projectName.trim(),
        itemList: formData.itemList.trim(),
        requestedBy: formData.requestedBy.trim(),
        recordedAt: formData.recordedAt || null,
        note: formData.note.trim() || undefined,
        orderId: formData.orderId || undefined
      });

      if (res.success) {
        const result = await Swal.fire({
          icon: 'success',
          title: res.isOverwritten ? 'อัปเดตข้อมูล PR สำเร็จ!' : 'สร้างใบขอซื้อ (PR) สำเร็จ!',
          html: `
            <div class="text-left text-sm space-y-2 mt-2">
              <div class="p-3 bg-blue-50 text-blue-900 rounded-lg">
                <span class="font-bold">เลขที่ PR:</span> <span class="font-mono font-bold">${formData.prNumber.toUpperCase()}</span>
              </div>
              <div class="text-gray-600">
                <div><span class="font-semibold">โครงการ:</span> ${formData.projectName}</div>
                <div><span class="font-semibold">ผู้ขอซื้อ:</span> ${formData.requestedBy || '-'}</div>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'ดูรายการ PR ทั้งหมด',
          cancelButtonText: 'สร้าง PR ถัดไป'
        });

        if (result.isConfirmed) {
          router.push('/admin/procurement/pr');
        } else {
          // Reset for next PR
          const nextSuggested = generateSuggestedPrNumber(selectedCompanyCode);
          setFormData({
            prNumber: nextSuggested,
            projectName: '',
            itemList: '',
            requestedBy: currentUser.name || currentUser.email || '',
            recordedAt: todayStr,
            note: '',
            orderId: ''
          });
          setActiveLinkedOrder(null);
        }
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1.5">
              <Link href="/dashboard" className="hover:text-blue-600 transition-colors">หน้าหลัก</Link>
              <span>/</span>
              <Link href="/admin/procurement/dashboard" className="hover:text-blue-600 transition-colors">ฝ่ายจัดซื้อ</Link>
              <span>/</span>
              <Link href="/admin/procurement/pr" className="hover:text-blue-600 transition-colors">รายการขอซื้อ (PR)</Link>
              <span>/</span>
              <span className="text-blue-600">สร้าง PR ใหม่</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <FileText className="text-blue-600" size={26} />
              สร้างใบขอซื้อสินค้า (Create PR)
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              ออกเอกสารคำขอจัดซื้อวัตถุดิบและอุปกรณ์ เชื่อมโยงกับคำสั่งผลิตและโครงการ
            </p>
          </div>

          <Link 
            href="/admin/procurement/pr" 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-xl border border-gray-200/80 transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> กลับสู่หน้ารายการ PR
          </Link>
        </div>
      </div>

      {/* Linked Order Banner if present */}
      {activeLinkedOrder && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm mt-0.5">
                <Package size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    คำสั่งผลิตที่เชื่อมโยง
                  </span>
                  <span className="font-mono font-bold text-amber-950 text-base">
                    #{activeLinkedOrder.orderNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white/80 text-amber-800 border border-amber-200 font-medium">
                    {activeLinkedOrder.status}
                  </span>
                </div>
                
                <div className="mt-2 text-sm text-amber-900 space-y-1">
                  <div>
                    <span className="font-semibold text-amber-950">ลูกค้า/บริษัท:</span> {activeLinkedOrder.companyName}
                  </div>
                  {activeLinkedOrder.targetDeliveryDate && (
                    <div>
                      <span className="font-semibold text-amber-950">กำหนดส่งมอบของฝ่ายผลิต:</span>{' '}
                      {new Date(activeLinkedOrder.targetDeliveryDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  {activeLinkedOrder.prNote && (
                    <div className="bg-white/70 rounded-lg p-2.5 text-xs text-amber-900 border border-amber-200/60 mt-1.5">
                      <span className="font-bold text-amber-950">ข้อความจากฝ่ายผลิต:</span> {activeLinkedOrder.prNote}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUnlinkOrder}
              className="flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-red-600 bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
            >
              <X size={14} /> ยกเลิกการเชื่อมโยง
            </button>
          </div>
        </div>
      )}

      {/* Pending Orders quick selector if not linked */}
      {!activeLinkedOrder && pendingOrders.length > 0 && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-blue-950">
              <Layers size={18} className="text-blue-600 flex-shrink-0" />
              <span>
                มี <strong className="text-blue-700 font-bold">{pendingOrders.length} คำสั่งผลิต</strong> ที่ฝ่ายผลิตต้องการขอเปิด PR
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOrderSelector(!showOrderSelector)}
              className="text-xs font-bold text-blue-700 bg-white hover:bg-blue-600 hover:text-white px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-sm"
            >
              {showOrderSelector ? 'ปิดตัวเลือกออเดอร์' : 'เลือกเชื่อมโยงกับคำสั่งผลิต'}
            </button>
          </div>

          {showOrderSelector && (
            <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => handleLinkOrder(order)}
                  className="p-3 bg-white hover:bg-blue-50/80 rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer transition-all text-xs space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span className="font-mono text-blue-600">#{order.orderNumber}</span>
                    <span className="text-gray-500 font-normal truncate max-w-[150px]">{order.companyName}</span>
                  </div>
                  {order.prNote && (
                    <p className="text-gray-600 line-clamp-1 italic">
                      &quot;{order.prNote}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Error Notice */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-sm font-semibold flex items-center gap-2 shadow-sm">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main PR Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: PR & Document Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
                <Tag size={18} className="text-blue-600" />
                ข้อมูลเอกสาร & การระบุตัวตน
              </h2>

              {/* Company Selector for Prefix */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  เลือกบริษัทในเครือ (Company Prefix)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCompany('E')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      selectedCompanyCode === 'E'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-mono text-sm flex items-center gap-1">
                      <Zap size={15} className={selectedCompanyCode === 'E' ? 'text-blue-600' : 'text-gray-400'} />
                      <span>TE</span>
                    </span>
                    <span className="text-[10px] font-normal opacity-80">Electric</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCompany('P')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      selectedCompanyCode === 'P'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-mono text-sm flex items-center gap-1">
                      <BatteryCharging size={15} className={selectedCompanyCode === 'P' ? 'text-emerald-600' : 'text-gray-400'} />
                      <span>TP</span>
                    </span>
                    <span className="text-[10px] font-normal opacity-80">Power</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCompany('G')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      selectedCompanyCode === 'G'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm ring-2 ring-purple-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-mono text-sm flex items-center gap-1">
                      <Building2 size={15} className={selectedCompanyCode === 'G' ? 'text-purple-600' : 'text-gray-400'} />
                      <span>TG</span>
                    </span>
                    <span className="text-[10px] font-normal opacity-80">Group</span>
                  </button>
                </div>
              </div>

              {/* PR Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    เลขที่ PR (PR Number) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = generateSuggestedPrNumber(selectedCompanyCode);
                      setFormData(prev => ({ ...prev, prNumber: suggested }));
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Sparkles size={12} /> แนะนำเลข PR
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.prNumber}
                    onChange={e => setFormData({ ...formData, prNumber: e.target.value.toUpperCase() })}
                    className="w-full font-mono font-bold text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50/40"
                    placeholder="เช่น PR69-G090801"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  รูปแบบ: PR + ปี พ.ศ. (69) - รหัสบริษัท (E/P/G) + ดดวว + ลำดับ
                </p>
              </div>

              {/* Document Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  วันที่เอกสาร (Document Date) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="date" 
                    required
                    value={formData.recordedAt}
                    onChange={e => setFormData({ ...formData, recordedAt: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-800"
                  />
                  <Calendar size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Requester */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ผู้ขอซื้อ (Requested By) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.requestedBy}
                    onChange={e => setFormData({ ...formData, requestedBy: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-800"
                    placeholder="ชื่อผู้ขอซื้อ / แผนก"
                  />
                  <User size={16} className="absolute left-3.5 top-3 text-gray-400" />
                </div>
              </div>

              {/* Project / Job Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  โครงการ / ออเดอร์ (Project / Order) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  list="project-datalist"
                  value={formData.projectName}
                  onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-800"
                  placeholder="พิมพ์หรือเลือกชื่อโครงการ..."
                />
                <datalist id="project-datalist">
                  {projectSuggestions.map((proj, idx) => (
                    <option key={idx} value={proj} />
                  ))}
                </datalist>

                {/* Quick project badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-gray-400 self-center">ค่ายอดนิยม:</span>
                  {[
                    'Safety Stock / สต็อก',
                    'งานสำนักงาน / ส่วนกลาง',
                    'งานซ่อมบำรุง'
                  ].map((quick, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, projectName: quick }))}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Items & Specifications (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 mb-3">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Package size={18} className="text-blue-600" />
                    รายการสินค้า & สเปกที่ต้องการสั่งซื้อ
                  </h2>
                </div>

                {/* Template Chips for Quick Drafting */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[11px] font-semibold text-gray-400">แทรกหัวข้อด่วน:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('- สเปก / ยี่ห้อ: ')}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> สเปก/ยี่ห้อ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('- จำนวน: ... หน่วย')}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> จำนวน & หน่วย
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('- กำหนดต้องการใช้วันที่: ')}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> วันที่ต้องการใช้
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate('- สถานที่จัดส่ง: ')}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> สถานที่จัดส่ง
                  </button>
                </div>

                <label className="block text-xs font-bold text-gray-700 mb-1">
                  รายการสินค้าและรายละเอียด (Item List) <span className="text-red-500">*</span>
                </label>
                <textarea 
                  required
                  rows={6}
                  value={formData.itemList}
                  onChange={e => setFormData({ ...formData, itemList: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm leading-relaxed"
                  placeholder={`ระบุรายการสินค้า เช่น:\n1. เบรกเกอร์ Mitsubishi NF125-CV 80A 3P 10kA จำนวน 2 ตัว\n2. สายไฟ THW 1x2.5 sq.mm. สีดำ จำนวน 5 ม้วน\n3. ค่าขนส่ง / ค่าบริการ (ถ้ามี)`}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  ข้อความนี้จะถูกนำไปอ้างอิงตอนเปิดใบสั่งซื้อ (PO) ในระบบ Express
                </p>
              </div>

              {/* Note / Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  หมายเหตุเพิ่มเติม / ข้อตกลงจัดซื้อ (Note & Delivery Conditions)
                </label>
                <textarea 
                  rows={3}
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm leading-relaxed"
                  placeholder="เช่น ต้องการส่งด่วนภายในวันที่..., แนะนำร้านค้าหรือผู้ขาย, เงื่อนไขการชำระเงินมัดจำ..."
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
                <Link
                  href="/admin/procurement/pr"
                  className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                >
                  ยกเลิก
                </Link>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-w-[160px]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>บันทึกและสร้าง PR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

