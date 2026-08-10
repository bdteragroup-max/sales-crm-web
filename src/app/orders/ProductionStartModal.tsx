"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, Settings, AlertTriangle } from 'lucide-react';

export default function ProductionStartModal({
  order,
  technicians,
  onClose,
  onSubmit
}: {
  order: any,
  technicians: { id: string, fullName: string }[],
  onClose: () => void,
  onSubmit: (data: { 
    materialReady: boolean, 
    estimatedDays: number, 
    prNote?: string, 
    assignedTechnicianIds?: string[], 
    cabinetCount?: number, 
    technicianWorkload?: { technicianId: string, count: number }[],
    productionStaffCount?: number,
    contractorCount?: number,
    assignments?: { userId?: string, contractorName?: string, workerType: string }[]
  }) => void
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
  const [technicianCounts, setTechnicianCounts] = useState<Record<string, number>>({});
  const [selectedTechId, setSelectedTechId] = useState('');  
  const [contractors, setContractors] = useState<string[]>([]);
  const [newContractor, setNewContractor] = useState('');

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
    const assignedTechnicianIds = Object.keys(technicianCounts).filter(id => technicianCounts[id] > 0);
    const technicianWorkload = assignedTechnicianIds.map(id => ({ technicianId: id, count: technicianCounts[id] }));
    const totalCount = assignedTechnicianIds.reduce((sum, id) => sum + technicianCounts[id], 0);

    const assignments = [
      ...assignedTechnicianIds.map(id => ({ userId: id, workerType: 'EMPLOYEE' })),
      ...contractors.map(name => ({ contractorName: name, workerType: 'CONTRACTOR' }))
    ];

    onSubmit({
      materialReady,
      estimatedDays: Number(estimatedDays) || 0,
      prNote: materialReady ? undefined : prNote,
      assignedTechnicianIds: assignedTechnicianIds.length > 0 ? assignedTechnicianIds : undefined,
      cabinetCount: totalCount > 0 ? totalCount : 1,
      technicianWorkload: technicianWorkload.length > 0 ? technicianWorkload : undefined,
      productionStaffCount: assignedTechnicianIds.length,
      contractorCount: contractors.length,
      assignments: assignments.length > 0 ? assignments : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
            <Settings size={18} className="text-brand-red" />
            เริ่มการผลิต {order?.orderNumber}
          </h2>
          <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
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

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">ช่างเทคนิคที่รับผิดชอบและจำนวนตู้ (Technicians & Cabinets)</label>
            <div className="flex gap-2">
              <select 
                value={selectedTechId}
                onChange={e => setSelectedTechId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
              >
                <option value="">-- เลือกช่างเทคนิค --</option>
                {technicians.filter(t => !technicianCounts[t.id]).map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.fullName}</option>
                ))}
              </select>
              <button 
                type="button"
                onClick={() => {
                  if (selectedTechId) {
                    setTechnicianCounts(prev => ({ ...prev, [selectedTechId]: 1 }));
                    setSelectedTechId('');
                  }
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                เพิ่ม
              </button>
            </div>
            {Object.keys(technicianCounts).filter(id => technicianCounts[id] > 0).length > 0 && (
              <div className="flex flex-col gap-2 border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto mt-2">
                {Object.keys(technicianCounts)
                  .filter(id => technicianCounts[id] > 0)
                  .map(id => {
                    const tech = technicians.find(t => t.id === id);
                    if (!tech) return null;
                    const count = technicianCounts[id];
                    return (
                      <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-sm font-semibold text-gray-700">{tech.fullName}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button" 
                            onClick={() => {
                              if (count === 1) {
                                const newCounts = { ...technicianCounts };
                                delete newCounts[id];
                                setTechnicianCounts(newCounts);
                              } else {
                                setTechnicianCounts(prev => ({ ...prev, [id]: count - 1 }));
                              }
                            }}
                            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-brand-red">{count}</span>
                          <button 
                            type="button" 
                            onClick={() => setTechnicianCounts(prev => ({ ...prev, [id]: count + 1 }))}
                            className="w-7 h-7 rounded-full bg-brand-red flex items-center justify-center text-white hover:bg-red-700 shadow-sm shadow-red-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">ผู้รับเหมา (Contractors)</label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="ระบุชื่อผู้รับเหมา/ทีม..."
                value={newContractor}
                onChange={e => setNewContractor(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newContractor.trim()) {
                      setContractors([...contractors, newContractor.trim()]);
                      setNewContractor('');
                    }
                  }
                }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              />
              <button 
                type="button"
                onClick={() => {
                  if (newContractor.trim()) {
                    setContractors([...contractors, newContractor.trim()]);
                    setNewContractor('');
                  }
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                เพิ่ม
              </button>
            </div>
            {contractors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {contractors.map((contractor, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-100">
                    {contractor}
                    <button 
                      type="button" 
                      onClick={() => setContractors(contractors.filter((_, i) => i !== idx))}
                      className="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
