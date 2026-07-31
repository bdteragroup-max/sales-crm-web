"use client";

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Coins, History, ArrowDownLeft, ArrowUpRight, Award, Zap, Users, TrendingUp, Package, Search } from 'lucide-react';
import RedemptionTable from './RedemptionTable';

interface CoinsClientProps {
  totalCirculation: number;
  issuedThisPeriod: number;
  redeemedThisPeriod: number;
  totalRedemptionsCount: number;
  totalRedemptionsPoints: number;
  coinTypeSums: Record<string, { name: string; code: string; amount: number }>;
  leaderboard: { empId: string; name: string; totalBalance: number }[];
  recentTransactions: any[];
  redemptions: any[];
  reclaimedCoins: any[];
  departments: { id: number; name: string }[];
  coinTypes: { id: string; name: string }[];
  currentFilters: {
    from: string;
    to: string;
    coinType: string;
    department: string;
    transactionType: string;
  };
}

export default function CoinsClient({
  totalCirculation,
  issuedThisPeriod,
  redeemedThisPeriod,
  totalRedemptionsCount,
  totalRedemptionsPoints,
  coinTypeSums,
  leaderboard,
  recentTransactions,
  redemptions,
  reclaimedCoins,
  departments,
  coinTypes,
  currentFilters
}: CoinsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/executive/coins?${params.toString()}`);
    });
  };

  const getCoinStyle = (code?: string, name?: string) => {
    const c = (code || '').toLowerCase() + ' ' + (name || '').toLowerCase();
    if (c.includes('bronze') || c.includes('ทองแดง') || c.includes('copper')) return 'from-orange-300 to-orange-500 text-orange-800 shadow-orange-200 border-orange-300';
    if (c.includes('gold') || c.includes('ทอง')) return 'from-yellow-300 to-yellow-500 text-yellow-700 shadow-yellow-200 border-yellow-200';
    if (c.includes('silver') || c.includes('เงิน')) return 'from-slate-200 to-slate-400 text-slate-700 shadow-slate-200 border-slate-300';
    if (c.includes('task') || c.includes('ภารกิจ') || c.includes('kpi')) return 'from-amber-600 to-orange-800 text-amber-900 shadow-orange-900/20 border-orange-800/30';
    return 'from-gray-100 to-gray-200 text-gray-700 shadow-gray-100 border-gray-200';
  };

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

  const translateTxType = (type?: string) => {
    if (!type) return '-';
    const t = type.toLowerCase();
    if (t === 'earn') return 'แจกเหรียญ';
    if (t === 'spend') return 'ใช้เหรียญ/แลกรางวัล';
    if (t === 'deduct') return 'หักเหรียญ';
    if (t === 'refund') return 'คืนเหรียญ';
    if (t === 'adjustment') return 'ปรับปรุงยอด';
    return type;
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 pb-20 custom-scrollbar relative">
      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center transition-opacity">
          <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-red"></div>
            <span className="font-bold text-gray-700">กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-red to-[#d01c00] rounded-b-[40px] shadow-xl z-0 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-12">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Coins className="w-6 h-6 md:w-8 md:h-8" />
            ภาพรวมเหรียญรางวัลทั้งระบบ
          </h1>
          <p className="text-red-100 mt-1 md:mt-2 font-medium text-sm md:text-base">มุมมองสำหรับผู้บริหาร (Executive Overview)</p>
        </header>

        {/* Filter Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 mb-8">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Search size={16} className="text-gray-400" />
            ตัวกรองข้อมูล
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ตั้งแต่วันที่</label>
              <input 
                type="date" 
                value={currentFilters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ถึงวันที่</label>
              <input 
                type="date" 
                value={currentFilters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ประเภทเหรียญ</label>
              <select 
                value={currentFilters.coinType}
                onChange={(e) => handleFilterChange('coinType', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              >
                <option value="">ทั้งหมด</option>
                {coinTypes.map(c => (
                  <option key={c.id} value={c.id}>{translateCoinName(c.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">แผนก</label>
              <select 
                value={currentFilters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              >
                <option value="">ทั้งหมด</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
              <TrendingUp size={48} className="text-blue-200" />
            </div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 z-10">เหรียญที่แจก (ช่วงเวลานี้)</h3>
            <div className="text-4xl font-black text-blue-600 number z-10">{issuedThisPeriod.toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
              <ArrowDownLeft size={48} className="text-red-200" />
            </div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 z-10">เหรียญที่ใช้ (ช่วงเวลานี้)</h3>
            <div className="text-4xl font-black text-red-600 number z-10">{redeemedThisPeriod.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
              <Package size={48} className="text-amber-200" />
            </div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 z-10">การแลกของรางวัล (ครั้ง)</h3>
            <div className="flex items-end gap-3 z-10">
              <div className="text-4xl font-black text-amber-600 number">{totalRedemptionsCount.toLocaleString()}</div>
              <div className="text-sm font-bold text-gray-400 mb-1">
                ({totalRedemptionsPoints.toLocaleString()} เหรียญ)
              </div>
            </div>
          </div>
        </div>

        {/* Coins By Type */}
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={20} className="text-brand-red" /> 
          จำนวนเหรียญรวม (ยอดคงเหลือทั้งหมด)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Object.values(coinTypeSums).map((coin) => {
            const style = getCoinStyle(coin.code, coin.name);
            return (
              <div key={coin.code} className={`bg-white rounded-2xl p-5 shadow-lg border relative overflow-hidden ${style}`}>
                <div className="absolute -right-6 -bottom-6 opacity-20 pointer-events-none">
                  <div className="w-24 h-24 relative">
                    <Image src={getCoinImagePath(coin.code, coin.name).front} alt={coin.name} fill unoptimized className="object-contain" />
                  </div>
                </div>
                <h3 className="font-bold text-sm uppercase tracking-widest mb-1 z-10 relative">{translateCoinName(coin.name)}</h3>
                <div className="text-3xl font-black number z-10 relative">{coin.amount.toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Leaderboard */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
                <Users size={18} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">อันดับยอดคงเหลือสูงสุด (Top 10)</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <div className="divide-y divide-gray-50">
                {leaderboard.map((user, index) => (
                  <div key={user.empId} className="p-3 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-bold text-gray-900 truncate text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.empId}</p>
                    </div>
                    <div className="font-black text-brand-red number shrink-0">
                      {user.totalBalance.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Global Transactions */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-brand-red">
                  <History size={18} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">รายการเคลื่อนไหวเหรียญ</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3 border-b">เวลา</th>
                    <th className="px-5 py-3 border-b">พนักงาน</th>
                    <th className="px-5 py-3 border-b">ประเภท</th>
                    <th className="px-5 py-3 border-b">เหรียญ</th>
                    <th className="px-5 py-3 border-b text-right">จำนวน</th>
                    <th className="px-5 py-3 border-b">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTransactions.map((tx) => {
                    const isPositive = tx.transaction_type === 'EARN';
                    const userName = tx.employees?.name || tx.emp_id;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-xs text-gray-500" suppressHydrationWarning>
                          {new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.created_at))}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-900 max-w-[120px] truncate" title={userName}>
                          {userName}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {translateTxType(tx.transaction_type)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs font-bold text-gray-600 flex items-center gap-1">
                          <div className="w-4 h-4 relative">
                            <Image src={getCoinImagePath(tx.coin_types?.id, tx.coin_types?.name).front} alt="coin" fill unoptimized className="object-contain" />
                          </div>
                          {translateCoinName(tx.coin_types?.name)}
                        </td>
                        <td className={`px-5 py-3 text-right font-black number ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={tx.description || tx.source_key || ''}>
                          {tx.description || tx.source_key}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Redemption Table */}
        <RedemptionTable redemptions={redemptions} />

        {/* Reclaimed Coins Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col mt-8">
          <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center gap-3 justify-between shrink-0">
            <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
              <History size={20} className="text-gray-500 shrink-0" />
              <span className="truncate">เหรียญที่ถูกดึงกลับจากพนักงาน (พ้นสภาพ)</span>
            </h2>
            <div className="text-xs md:text-sm font-bold text-gray-500 bg-white px-3 py-1.5 rounded-lg border shadow-sm self-start md:self-auto">
              ยอดรวมดึงกลับ: <span className="text-gray-900 ml-1">{reclaimedCoins.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span> เหรียญ
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3 border-b">พนักงาน</th>
                  <th className="px-5 py-3 border-b">ประเภทเหรียญ</th>
                  <th className="px-5 py-3 border-b text-right">จำนวนเหรียญ</th>
                  <th className="px-5 py-3 border-b">วันที่ดึงกลับ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reclaimedCoins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                      ไม่พบข้อมูลการดึงเหรียญกลับในช่วงเวลานี้
                    </td>
                  </tr>
                ) : (
                  reclaimedCoins.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {item.employees?.name || item.emp_id}
                      </td>
                      <td className="px-5 py-3 font-bold text-gray-600 flex items-center gap-2">
                        <div className="w-5 h-5 relative">
                          <Image src={getCoinImagePath(item.coin_types?.id, item.coin_types?.name).front} alt="coin" fill unoptimized className="object-contain" />
                        </div>
                        {translateCoinName(item.coin_types?.name)}
                      </td>
                      <td className="px-5 py-3 font-black text-gray-700 text-right number">
                        {item.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500" suppressHydrationWarning>
                        {new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
