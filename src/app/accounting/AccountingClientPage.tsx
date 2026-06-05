"use client";

import React, { useState, useTransition } from "react";
import { DollarSign, Search, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { updatePaymentTaskStatus } from "@/app/actions/accounting";

function formatDate(d: string | Date) {
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear() + 543}`;
}

export default function AccountingClientPage({ tasks: initialTasks }: { tasks: any[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");

  const handleUpdate = (id: string, status: string) => {
    const note = window.prompt("หมายเหตุ (ถ้ามี):");
    if (note === null) return; // cancelled

    startTransition(async () => {
      await updatePaymentTaskStatus(id, status, note);
      setTasks(prev => prev.map(t => t.id === id ? { 
        ...t, 
        status, 
        note: note || t.note,
        paidDate: status === 'ตรวจสอบและบันทึกแล้ว' ? new Date().toISOString() : t.paidDate
      } : t));
    });
  };

  const filtered = tasks.filter(t => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      t.job?.jobNumber?.toLowerCase().includes(q) ||
      t.job?.customerName?.toLowerCase().includes(q) ||
      t.job?.item?.toLowerCase().includes(q)
    );
  });

  const pendingTasks = filtered.filter(t => t.status !== 'ตรวจสอบและบันทึกแล้ว');
  const completedTasks = filtered.filter(t => t.status === 'ตรวจสอบและบันทึกแล้ว');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={28} />
            รายการตรวจสอบการชำระเงิน
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ตรวจสอบและอัปเดตสถานะการชำระเงินของงานต่างๆ
          </p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="ค้นหาเลขที่งาน, ชื่อลูกค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl w-64 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-700">รอดำเนินการ</p>
            <p className="text-3xl font-black text-amber-900">{pendingTasks.length}</p>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">ตรวจสอบแล้ว</p>
            <p className="text-3xl font-black text-emerald-900">{completedTasks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px]">เลขที่งาน</th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px]">ลูกค้า / รายการ</th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px]">รูปแบบการชำระเงิน</th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px]">วันครบกำหนด</th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px]">สถานะ</th>
              <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-widest text-[10px] text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {filtered.map(task => {
              const isCompleted = task.status === 'ตรวจสอบและบันทึกแล้ว';
              const isOverdue = !isCompleted && new Date(task.dueDate) < new Date();

              return (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-mono font-black text-brand-red">{task.job?.jobNumber}</span>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-900">{task.job?.customerName}</p>
                    <p className="text-xs text-gray-500">{task.job?.item}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {task.job?.paymentMethod || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      {isOverdue && <AlertCircle size={14} />}
                      {formatDate(task.dueDate)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      isCompleted 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700 animate-pulse'
                    }`}>
                      {task.status}
                    </span>
                    {task.note && (
                      <p className="text-[10px] text-gray-500 mt-1 italic max-w-[150px] truncate">
                        หมายเหตุ: {task.note}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    {!isCompleted && (
                      <button
                        disabled={isPending}
                        onClick={() => handleUpdate(task.id, 'ตรวจสอบและบันทึกแล้ว')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        ยืนยันการรับเงิน
                      </button>
                    )}
                    {isCompleted && task.paidDate && (
                      <span className="text-xs text-gray-400 font-medium">
                        อัปเดตเมื่อ: {formatDate(task.paidDate)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
