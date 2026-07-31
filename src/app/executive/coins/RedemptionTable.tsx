import React from 'react';
import Image from 'next/image';
import { Gift } from 'lucide-react';

interface Redemption {
  id: number;
  emp_id: string;
  points_spent: number;
  redeemed_at: Date;
  employeeName: string;
  rewardName: string;
  coinTypeId?: string;
  coinTypeName?: string;
}

interface RedemptionTableProps {
  redemptions: Redemption[];
}

export default function RedemptionTable({ redemptions }: RedemptionTableProps) {
  const getCoinImagePath = (code?: string, name?: string) => {
    const c = (code || '').toLowerCase() + ' ' + (name || '').toLowerCase();
    if (c.includes('bronze') || c.includes('ทองแดง') || c.includes('copper')) return { front: '/coins/bronze.png' };
    if (c.includes('silver') || c.includes('เงิน')) return { front: '/coins/silver.png' };
    if (c.includes('task') || c.includes('ภารกิจ') || c.includes('kpi')) return { front: '/coins/task.png' };
    if (c.includes('gold') || c.includes('ทอง')) return { front: '/coins/gold.png' };
    return { front: '/coins/gold.png' }; // default fallback
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

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col mt-8">
      <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
        <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
          <Gift size={20} className="text-brand-red shrink-0" /> ข้อมูลการแลกของรางวัล
        </h2>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
            <tr className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="px-5 py-3 border-b">พนักงาน</th>
              <th className="px-5 py-3 border-b">ของรางวัล</th>
              <th className="px-5 py-3 border-b">เหรียญที่ใช้</th>
              <th className="px-5 py-3 border-b">วันที่แลก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {redemptions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                  ไม่พบข้อมูลการแลกของรางวัลในช่วงเวลานี้
                </td>
              </tr>
            ) : (
              redemptions.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    {item.employeeName}
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {item.rewardName}
                  </td>
                  <td className="px-5 py-3 font-bold text-brand-red flex items-center gap-1">
                    <div className="w-4 h-4 relative">
                      <Image src={getCoinImagePath(item.coinTypeId, item.coinTypeName).front} alt="coin" fill unoptimized className="object-contain" />
                    </div>
                    {item.points_spent.toLocaleString()} {translateCoinName(item.coinTypeName)}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500" suppressHydrationWarning>
                    {new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.redeemed_at))}
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
