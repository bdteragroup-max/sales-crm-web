'use client';

import React, { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { createStockCategory } from '@/app/actions/stock';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdCode: string) => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [ownerDepartment, setOwnerDepartment] = useState<'MARKETING' | 'STORE'>('MARKETING');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createStockCategory({
        name,
        code,
        description,
        ownerDepartment,
      });

      if (!res.success) {
        await Swal.fire({ icon: 'error', title: 'สร้างหมวดหมู่ไม่สำเร็จ', text: res.error });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'เพิ่มหมวดหมู่สินค้าใหม่เรียบร้อย',
        timer: 1600,
        showConfirmButton: false,
      });

      onSuccess(res.category.code);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <FolderPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">เพิ่มหมวดหมู่สต็อกใหม่</h2>
              <p className="text-xs text-slate-500">ขยายหมวดหมู่สินค้าเพิ่มเติมในอนาคตได้ทันที</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ชื่อหมวดหมู่ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สื่อสิ่งพิมพ์ / ป้ายออกบูธ / ชุดยูนิฟอร์ม"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-base sm:text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รหัสหมวดหมู่ (ภาษาอังกฤษ) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="เช่น EVENT_BOOTH"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-base sm:text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ฝ่ายที่ดูแลและเติมสต็อกหมวดนี้
            </label>
            <select
              value={ownerDepartment}
              onChange={(e) => setOwnerDepartment(e.target.value as 'MARKETING' | 'STORE')}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-500"
            >
              <option value="MARKETING">ฝ่ายการตลาด & ผู้จัดการฝ่ายการตลาด</option>
              <option value="STORE">ฝ่ายสโตร์ / คลังสินค้า</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">คำอธิบาย</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับหมวดสินค้า"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-base sm:text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-2"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              <span>สร้างหมวดหมู่</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

