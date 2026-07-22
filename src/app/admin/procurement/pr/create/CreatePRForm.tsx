'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPurchaseRequest } from '@/app/actions/procurement';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreatePRForm({
  defaultOrderId = '',
  defaultNote = '',
  defaultProject = ''
}: {
  defaultOrderId?: string;
  defaultNote?: string;
  defaultProject?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    prNumber: '',
    projectName: defaultProject,
    itemList: '',
    note: defaultNote,
    orderId: defaultOrderId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await createPurchaseRequest(formData);
      if (res.success) {
        router.push('/admin/procurement/pr');
      } else {
        setError(res.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/procurement/pr" className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft size={16} /> กลับสู่หน้ารายการ
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4">
          {error}
        </div>
      )}

      {defaultOrderId && (
        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm font-bold mb-4 flex items-center gap-2">
          <span>⚠️</span>
          PR นี้ถูกสร้างมาจากความต้องการของกระบวนการผลิต (Order ID Linked)
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">เลขที่ PR (PR Number) *</label>
          <input 
            type="text" 
            required
            value={formData.prNumber}
            onChange={e => setFormData({ ...formData, prNumber: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="เช่น PR-2026-07-001"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">โครงการ / ออเดอร์ (Project / Order) *</label>
          <input 
            type="text" 
            required
            value={formData.projectName}
            onChange={e => setFormData({ ...formData, projectName: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="ชื่อโปรเจกต์"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">รายการสินค้า (Item List) *</label>
          <textarea 
            required
            rows={3}
            value={formData.itemList}
            onChange={e => setFormData({ ...formData, itemList: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="รายการสินค้าที่จะสั่งซื้อ"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุ (Note)</label>
          <textarea 
            rows={2}
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="ข้อความเพิ่มเติม..."
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? 'กำลังบันทึก...' : 'บันทึก PR (Save)'}
        </button>
      </form>
    </div>
  );
}
