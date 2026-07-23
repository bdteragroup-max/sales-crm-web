"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, Settings, AlertTriangle } from 'lucide-react';

export default function ProductionStartModal({
  order,
  onClose,
  onSubmit
}: {
  order: any,
  onClose: () => void,
  onSubmit: (data: { materialReady: boolean, estimatedDays: number, prNote?: string }) => void
}) {
  const [materialReady, setMaterialReady] = useState(true);
  const [estimatedDays, setEstimatedDays] = useState<number | ''>(() => {
    const requiredDateStr = order?.quotation?.jobs?.[0]?.requiredDeliveryDate;
    if (requiredDateStr) {
      const requiredDate = new Date(requiredDateStr);
      const today = new Date();
      const diffTime = requiredDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        let workingDays = 0;
        let d = new Date(today);
        for (let i = 0; i < diffDays; i++) {
          d.setDate(d.getDate() + 1);
          if (d.getDay() !== 0) workingDays++;
        }
        return workingDays > 0 ? workingDays : 4;
      }
    }
    return 4;
  });
  const [prNote, setPrNote] = useState('');
  const [estimatedDate, setEstimatedDate] = useState<Date | null>(null);

  // Quick client-side estimation (skipping Sundays only for preview)
  useEffect(() => {
    if (typeof estimatedDays === 'number' && estimatedDays > 0) {
      const d = new Date();
      let added = 0;
      while (added < estimatedDays) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) added++; // Skip Sunday
      }
      setEstimatedDate(d);
    } else {
      setEstimatedDate(null);
    }
  }, [estimatedDays]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      materialReady,
      estimatedDays: Number(estimatedDays) || 0,
      prNote: materialReady ? undefined : prNote
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
            <Settings size={18} className="text-brand-red" />
            เริ่มการผลิต {order?.orderNumber}
          </h2>
          <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">สถานะวัตถุดิบ (Raw Material Status)</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${materialReady ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <input type="radio" checked={materialReady} onChange={() => setMaterialReady(true)} className="accent-emerald-600 w-4 h-4" />
                <span className="text-sm font-semibold">มีครบในสต็อก</span>
              </label>
              <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${!materialReady ? 'border-brand-red bg-red-50 text-brand-red' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <input type="radio" checked={!materialReady} onChange={() => setMaterialReady(false)} className="accent-brand-red w-4 h-4" />
                <span className="text-sm font-semibold">ของขาด (แจ้งจัดซื้อ)</span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">ระยะเวลาผลิต (วันทำการ)</label>
            <div className="relative">
              <input 
                type="number" 
                min={1}
                required
                value={estimatedDays} 
                onChange={(e) => setEstimatedDays(parseInt(e.target.value) || '')} 
                className="w-full border border-gray-200 rounded-lg pl-3 pr-16 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-bold" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">วัน (Days)</span>
            </div>
            <p className="text-[10px] text-gray-500">(ไม่รวมวันอาทิตย์และวันหยุดนักขัตฤกษ์)</p>
          </div>

          {!materialReady && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" />
                หมายเหตุถึงฝ่ายจัดซื้อ (Purchasing Notes)
              </label>
              <textarea
                required
                placeholder="เช่น ต้องสั่งสายไฟเพิ่ม 20 เมตร..."
                value={prNote}
                onChange={e => setPrNote(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red min-h-[80px]"
              />
            </div>
          )}

          {estimatedDate && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                <Calendar size={12} />
                กำหนดเสร็จโดยประมาณ:
              </span>
              <span className="text-sm font-black text-gray-800">
                {estimatedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" className="flex-[2] py-2.5 rounded-xl font-bold text-xs bg-brand-red text-white hover:bg-red-700 transition-colors shadow-md shadow-red-200 flex items-center justify-center gap-1">
              เริ่มการผลิต (Start)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
