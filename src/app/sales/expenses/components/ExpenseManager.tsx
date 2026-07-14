'use client';

import React, { useState, useTransition } from 'react';
import { createExpense, deleteExpense } from '@/app/actions/expenseActions';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText, Loader2, User, MapPin } from 'lucide-react';

interface ExpenseManagerProps {
  initialExpenses: any[];
  currentUser: any;
  salesReps: any[]; // for managers to select
}

const EXPENSE_TYPES = [
  'ค่าเดินทาง (Travel)',
  'ค่าอาหาร (Meals)',
  'ค่าการตลาด (Marketing)',
  'ค่าดำเนินการ (Operations)',
  'ค่ารับรอง (Entertainment)',
  'ค่าอุปกรณ์ (Supplies)',
  'อื่นๆ (Other)'
];

export default function ExpenseManager({ initialExpenses, currentUser, salesReps }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';

  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    expenseType: 'ค่าเดินทาง (Travel)',
    notes: '',
    odometer: '',
    salespersonId: currentUser.id
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.append('amount', formData.amount);
      data.append('date', formData.date);
      data.append('expenseType', formData.expenseType);
      data.append('notes', formData.notes);
      if (formData.expenseType.includes('Travel') && formData.odometer) {
        data.append('odometer', formData.odometer);
      }
      if (isManager) {
        data.append('salespersonId', formData.salespersonId);
      }

      const res = await createExpense(data);
      if (res.success) {
        setFormData({ ...formData, amount: '', notes: '' });
        window.location.reload();
      } else {
        setError(res.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) return;
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res.success) {
        setExpenses(expenses.filter((ex) => ex.id !== id));
      } else {
        alert(res.error || 'ลบข้อมูลไม่สำเร็จ');
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">บันทึกค่าใช้จ่าย</h1>
        <p className="text-sm font-bold text-gray-400 mt-1">จดบันทึกค่าใช้จ่ายของคุณ ซึ่งข้อมูลนี้จะสะท้อนในผลการปฏิบัติงาน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* FORM SECTION */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 sticky top-8">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Plus size={20} className="text-[#ff2301]" />
              เพิ่มค่าใช้จ่ายใหม่
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-[#ff2301] text-xs font-bold rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {isManager && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={14} /> พนักงานขาย
                  </label>
                  <select
                    className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl focus:ring-[#ff2301]/20 focus:border-[#ff2301] block w-full p-3 outline-none transition-all"
                    value={formData.salespersonId}
                    onChange={(e) => setFormData({ ...formData, salespersonId: e.target.value })}
                  >
                    {salesReps.map(rep => (
                      <option key={rep.id} value={rep.id}>{rep.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign size={14} /> จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="เช่น 500"
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-black rounded-xl focus:ring-[#ff2301]/20 focus:border-[#ff2301] block w-full p-3 outline-none transition-all"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={14} /> วันที่
                </label>
                <input
                  type="date"
                  required
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl focus:ring-[#ff2301]/20 focus:border-[#ff2301] block w-full p-3 outline-none transition-all"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag size={14} /> ประเภท
                </label>
                <select
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl focus:ring-[#ff2301]/20 focus:border-[#ff2301] block w-full p-3 outline-none transition-all"
                  value={formData.expenseType}
                  onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                >
                  {EXPENSE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {formData.expenseType.includes('Travel') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={14} /> เลขไมล์ (Odometer)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="เลขไมล์รถหน้าปัด"
                    className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl focus:ring-[#ff2301]/20 focus:border-[#ff2301] block w-full p-3 outline-none transition-all"
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={14} /> รายละเอียด / หมายเหตุ
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="คุณใช้จ่ายไปกับอะไร? เช่น เลี้ยงอาหารลูกค้า"
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl focus:ring-[#ff2301]/20 focus:border-[#ff2301] block w-full p-3 outline-none transition-all resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-4 bg-[#ff2301] hover:bg-red-700 text-white font-black rounded-xl py-3 px-4 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {isPending ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่าย'}
              </button>
            </form>
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">ประวัติค่าใช้จ่ายล่าสุด</h2>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">วันที่</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">พนักงานขาย</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">ประเภทและรายละเอียด</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">จำนวนเงิน</th>
                    <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm font-bold text-gray-400">
                        ยังไม่มีประวัติค่าใช้จ่าย
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp: any) => {
                      const repName = salesReps.find(r => r.id === exp.salespersonId)?.fullName || 'ไม่ทราบชื่อ';
                      return (
                        <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                            {new Date(exp.date).toLocaleDateString('th-TH')}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                            {repName}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-black text-[#ff2301] uppercase tracking-wider">{exp.expenseType}</span>
                              <span className="text-sm font-bold text-gray-700">{exp.notes}</span>
                              {exp.odometer != null && (
                                <span className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1">
                                  <MapPin size={12} /> ไมล์: {Number(exp.odometer).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-red-500 text-right whitespace-nowrap">
                            ฿{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={isPending}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="ลบข้อมูล"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
