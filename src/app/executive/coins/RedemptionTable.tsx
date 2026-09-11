"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Gift, Search, Calendar, User } from 'lucide-react';

interface Redemption {
  id: number;
  emp_id: string;
  points_spent: number;
  redeemed_at: Date | string;
  employeeName: string;
  departmentName?: string;
  rewardName: string;
  coinTypeId?: string;
  coinTypeName?: string;
}

interface RedemptionTableProps {
  redemptions: Redemption[];
}

export default function RedemptionTable({ redemptions }: RedemptionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getCoinImagePath = (code?: string, name?: string) => {
    const c = (code || '').toLowerCase() + ' ' + (name || '').toLowerCase();
    if (c.includes('bronze') || c.includes('ทองแดง') || c.includes('copper')) return { front: '/coins/bronze.png' };
    if (c.includes('silver') || c.includes('เงิน')) return { front: '/coins/silver.png' };
    if (c.includes('task') || c.includes('ภารกิจ') || c.includes('kpi')) return { front: '/coins/task.png' };
    if (c.includes('gold') || c.includes('ทอง')) return { front: '/coins/gold.png' };
    return { front: '/coins/gold.png' };
  };

  const translateCoinName = (name?: string) => {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('gold')) return 'เหรียญทอง';
    if (n.includes('silver')) return 'เหรียญเงิน';
    if (n.includes('bronze')) return 'เหรียญทองแดง';
    if (n.includes('copper')) return 'เหรียญทองแดง (Copper)';
    if (n.includes('task')) return 'เหรียญภารกิจ';
    return name;
  };

  const filteredRedemptions = useMemo(() => {
    if (!searchTerm.trim()) return redemptions;
    const term = searchTerm.toLowerCase();
    return redemptions.filter(r => 
      r.employeeName?.toLowerCase().includes(term) ||
      r.emp_id?.toLowerCase().includes(term) ||
      r.rewardName?.toLowerCase().includes(term) ||
      r.departmentName?.toLowerCase().includes(term)
    );
  }, [redemptions, searchTerm]);

  const totalPointsSpent = useMemo(() => {
    return filteredRedemptions.reduce((sum, r) => sum + r.points_spent, 0);
  }, [filteredRedemptions]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-md shadow-amber-200 shrink-0">
            <Gift size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              ข้อมูลการแลกของรางวัล
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredRedemptions.length} รายการ
              </span>
            </h2>
            <p className="text-xs text-slate-500">ประวัติการใช้เหรียญแลกสิทธิประโยชน์และของรางวัล</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, แผนก, หรือรางวัล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-400 transition-all"
            />
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-bold shrink-0">
            <span>รวมใช้:</span>
            <span className="font-mono text-amber-900">{totalPointsSpent.toLocaleString()}</span>
            <span className="text-[10px] text-amber-700">เหรียญ</span>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar max-h-[480px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-10">
            <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <th className="py-3.5 px-6">พนักงาน</th>
              <th className="py-3.5 px-6">ของรางวัล</th>
              <th className="py-3.5 px-6 text-right">เหรียญที่ใช้</th>
              <th className="py-3.5 px-6 text-right">วันที่แลก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRedemptions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Gift size={36} strokeWidth={1.5} className="text-slate-300" />
                    <p className="text-xs font-medium">
                      {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่พบข้อมูลการแลกของรางวัลในช่วงเวลานี้'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRedemptions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Employee */}
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                        {item.employeeName?.slice(0, 1) || <User size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate">{item.employeeName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{item.emp_id}</span>
                          {item.departmentName && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium truncate max-w-[120px]">
                              {item.departmentName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Reward */}
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-50 text-brand-red flex items-center justify-center shrink-0 border border-red-100">
                        <Gift size={13} />
                      </div>
                      <span className="font-medium text-slate-800 text-xs">{item.rewardName}</span>
                    </div>
                  </td>

                  {/* Points Spent */}
                  <td className="py-3.5 px-6 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5 font-bold text-amber-700 font-mono text-xs">
                      <div className="w-4 h-4 relative shrink-0">
                        <Image 
                          src={getCoinImagePath(item.coinTypeId, item.coinTypeName).front} 
                          alt="coin" 
                          fill 
                          unoptimized 
                          className="object-contain" 
                        />
                      </div>
                      <span>{item.points_spent.toLocaleString()}</span>
                      <span className="text-[10px] font-sans text-slate-500 font-normal">
                        {translateCoinName(item.coinTypeName)}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-6 text-right text-xs text-slate-500 font-medium" suppressHydrationWarning>
                    <div className="inline-flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span>
                        {new Intl.DateTimeFormat('th-TH', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }).format(new Date(item.redeemed_at))}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
