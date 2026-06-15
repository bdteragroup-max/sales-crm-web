"use client";

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Wrench, Settings, AlertCircle } from 'lucide-react';
import { createProjectEquipment, updateProjectEquipment, deleteProjectEquipment } from '@/app/actions/projects';

export default function EquipmentTab({ project, isManager }: { project: any, isManager: boolean }) {
  const [equipments, setEquipments] = useState(project.equipment || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    quantity: 1,
    status: 'ใช้งาน',
    details: ''
  });

  const resetForm = () => {
    setFormData({ name: '', registrationNumber: '', quantity: 1, status: 'ใช้งาน', details: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (eq: any) => {
    setFormData({
      name: eq.name,
      registrationNumber: eq.registrationNumber || '',
      quantity: eq.quantity || 1,
      status: eq.status || 'ใช้งาน',
      details: eq.details || ''
    });
    setEditingId(eq.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบอุปกรณ์นี้ใช่หรือไม่?")) return;
    try {
      await deleteProjectEquipment(id);
      setEquipments(equipments.filter((e: any) => e.id !== id));
    } catch (err) {
      alert("ไม่สามารถลบอุปกรณ์ได้");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("กรุณาระบุชื่ออุปกรณ์");

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateProjectEquipment(editingId, {
          name: formData.name,
          registrationNumber: formData.registrationNumber || null,
          quantity: parseInt(formData.quantity.toString()) || 1,
          status: formData.status,
          details: formData.details || null
        });
        setEquipments(equipments.map((e: any) => e.id === editingId ? updated : e));
      } else {
        const created = await createProjectEquipment(project.id, {
          name: formData.name,
          registrationNumber: formData.registrationNumber || null,
          quantity: parseInt(formData.quantity.toString()) || 1,
          status: formData.status,
          details: formData.details || null
        });
        setEquipments([...equipments, created]);
      }
      resetForm();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ใช้งาน': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'ซ่อม': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'ชำรุด': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Wrench className="text-brand-red" size={24} />
          <div>
            <h2 className="text-lg font-black text-gray-900">รายการอุปกรณ์ (Equipment List)</h2>
            <p className="text-sm text-gray-500">จัดการข้อมูลรถและเครื่องมือที่ใช้ในโครงการ</p>
          </div>
        </div>
        {isManager && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm"
          >
            <Plus size={16} /> เพิ่มอุปกรณ์
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="font-bold text-gray-900">{editingId ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}</h3>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ชื่ออุปกรณ์/รถ (Name) *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" placeholder="เช่น รถกระบะตอนเดียว, เครื่องปั่นไฟ" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">ทะเบียน/รหัส (Registration No.)</label>
              <input type="text" value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">จำนวน (Quantity)</label>
              <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">สถานะ (Status)</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none">
                <option value="ใช้งาน">ใช้งาน</option>
                <option value="ซ่อม">ซ่อม</option>
                <option value="ชำรุด">ชำรุด</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">รายละเอียดเพิ่มเติม (Details)</label>
              <input type="text" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red/20 outline-none" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-brand-red text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
              <Save size={16} /> {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {equipments.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">รายการอุปกรณ์</th>
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">ทะเบียน/รหัส</th>
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">จำนวน</th>
                  <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">สถานะ</th>
                  {isManager && <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {equipments.map((eq: any) => (
                  <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{eq.name}</div>
                      {eq.details && <div className="text-[11px] text-gray-500 mt-0.5">{eq.details}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-600">{eq.registrationNumber || '-'}</td>
                    <td className="py-3 px-4 font-bold text-gray-900 text-center">{eq.quantity}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-[11px] font-bold rounded-md border ${getStatusColor(eq.status)}`}>
                        {eq.status}
                      </span>
                    </td>
                    {isManager && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(eq)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(eq.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Settings size={32} />
            </div>
            <p className="text-gray-500 font-medium">ยังไม่มีข้อมูลอุปกรณ์ในโครงการนี้</p>
          </div>
        )}
      </div>
    </div>
  );
}
