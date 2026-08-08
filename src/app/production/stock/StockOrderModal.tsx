"use client";

import React, { useState } from 'react';
import { X, Package, Loader2, Calendar, Trash2 } from 'lucide-react';

interface StockOrderModalProps {
  order?: any;
  onClose: () => void;
  onSuccess: (order: any, isDelete?: boolean) => void;
}

export default function StockOrderModal({ order, onClose, onSuccess }: StockOrderModalProps) {
  const isEdit = !!order;
  const [productName, setProductName] = useState(order?.stockItems?.productName || '');
  const [quantity, setQuantity] = useState(order?.stockItems?.quantity || 1);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    order?.targetDeliveryDate ? new Date(order.targetDeliveryDate).toISOString().split('T')[0] : ''
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/production/stock/${order.id}` : '/api/production/stock';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          quantity,
          expectedCompletionDate
        })
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess(data);
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} order`);
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setErrorMsg(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/production/stock/${order.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onSuccess(order, true);
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || 'Failed to delete order');
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative">
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">ยืนยันการลบรายการ?</h3>
            <p className="text-gray-500 font-medium text-sm mb-6">คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้ (Are you sure you want to delete this order?)</p>
            <div className="flex items-center gap-3 w-full justify-center">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md shadow-red-600/20"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                ยืนยันการลบ
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-[#ff2301]">
              <Package size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'แก้ไขงานผลิตเพื่อสต็อก' : 'สร้างงานผลิตเพื่อสต็อก'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">ชื่อสินค้า (Product Name) *</label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-colors"
              placeholder="เช่น ตู้เมนบอร์ด MDB"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">รหัสสินค้า (Product Code)</label>
              <input
                type="text"
                disabled
                value={order?.stockItems?.productCode || ''}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
                placeholder={isEdit ? 'ไม่มีรหัส' : 'สร้างอัตโนมัติ (Auto)'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">จำนวน (Quantity) *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">กำหนดเสร็จ (Expected Completion)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center gap-3">
            {isEdit ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                ลบรายการ
              </button>
            ) : (
              <div />
            )}
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || !productName}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#ff2301] hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                {isEdit ? 'บันทึก' : 'สร้างรายการผลิต'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
