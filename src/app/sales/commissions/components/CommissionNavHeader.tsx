'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, ClipboardCheck, History, FileSpreadsheet, ShieldCheck } from 'lucide-react';

type Props = {
  isSuperAdmin: boolean;
  pendingApprovalCount?: number;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export default function CommissionNavHeader({
  isSuperAdmin,
  pendingApprovalCount,
  subtitle,
  rightSlot,
}: Props) {
  const pathname = usePathname();

  const tabs = isSuperAdmin
    ? [
        {
          href: '/sales/commissions',
          label: '1. รายการจาก CRM & ยื่นคำขอ',
          icon: FileSpreadsheet,
          active: pathname === '/sales/commissions',
        },
        {
          href: '/sales/commissions/approvals',
          label: '2. ตรวจสอบกำไร & อนุมัติ / จ่ายเงิน',
          icon: ClipboardCheck,
          active: pathname === '/sales/commissions/approvals',
          badge: pendingApprovalCount,
        },
        {
          href: '/sales/commissions/history',
          label: '3. ประวัติ & รายงาน / Export',
          icon: History,
          active: pathname === '/sales/commissions/history',
        },
      ]
    : [];

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-5 pb-4">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#ff2301] shrink-0 shadow-2xs">
              <Coins size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  ระบบขอค่าคอมมิชชั่น (Commission Request)
                </h1>
                {isSuperAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white">
                    SUPER_ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {subtitle ||
                  'ดึงข้อมูลงานขายจาก CRM / Job Online เพื่อยื่นขอค่าคอมมิชชั่น (ชำระครบ 100% + บัญชีปิดขั้นตอน)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {rightSlot ? (
              rightSlot
            ) : isSuperAdmin ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <ShieldCheck size={15} className="text-slate-600 shrink-0" />
                <span>สิทธิ์ผู้ดูแลระบบสูงสุด</span>
                {typeof pendingApprovalCount === 'number' && pendingApprovalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-700 tabular-nums">
                    ค้าง {pendingApprovalCount}
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
                <FileSpreadsheet size={15} className="text-[#ff2301] shrink-0" />
                <span>เฉพาะงานขายที่คุณรับผิดชอบ</span>
              </div>
            )}
          </div>
        </div>

        {isSuperAdmin ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-xs font-bold border transition-all ${
                    tab.active
                      ? 'bg-[#ff2301] text-white border-[#ff2301] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums shrink-0 ${
                        tab.active ? 'bg-white text-[#ff2301]' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>เงื่อนไข 1: ชำระเงินครบ 100%</span>
            </div>
            <div className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>เงื่อนไข 2: ฝ่ายบัญชีปิดขั้นตอน</span>
            </div>
            <div className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>เงื่อนไข 3: ไม่ขอซ้ำใน Job เดิม</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
