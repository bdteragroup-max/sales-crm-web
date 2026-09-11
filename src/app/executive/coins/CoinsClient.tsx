"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Coins, 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Award, 
  Users, 
  TrendingUp, 
  Package, 
  Search, 
  Filter, 
  Calendar, 
  Gift, 
  Sparkles, 
  ChevronRight, 
  RotateCcw,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import RedemptionTable from './RedemptionTable';

interface CoinsClientProps {
  totalCirculation: number;
  issuedThisPeriod: number;
  redeemedThisPeriod: number;
  totalRedemptionsCount: number;
  totalRedemptionsPoints: number;
  coinTypeSums: Record<string, { name: string; code: string; amount: number }>;
  leaderboard: { empId: string; name: string; departmentName?: string; totalBalance: number }[];
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

  // Active Tab for Activity Center
  const [activeTab, setActiveTab] = useState<'ledger' | 'redemptions' | 'reclaimed'>('ledger');
  const [activitySearch, setActivitySearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'earn' | 'spend' | 'deduct'>('all');

  const netDelta = issuedThisPeriod - redeemedThisPeriod;

  // Helpers for filtering and routing
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

  const applyPreset = (preset: 'today' | 'this_month' | 'this_quarter' | 'this_year') => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
    } else {
      // this_year
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const fromStr = start.toISOString().split('T')[0];
    const toStr = end.toISOString().split('T')[0];

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', fromStr);
      params.set('to', toStr);
      router.push(`/executive/coins?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push('/executive/coins');
    });
  };

  // Coin image mappings
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
    if (n.includes('gold')) return 'เหรียญทอง (Gold)';
    if (n.includes('silver')) return 'เหรียญเงิน (Silver)';
    if (n.includes('bronze')) return 'เหรียญทองแดง (Bronze)';
    if (n.includes('copper')) return 'เหรียญทองแดง (Copper)';
    if (n.includes('task')) return 'เหรียญภารกิจ (Task)';
    return name;
  };

  const translateTxType = (type?: string) => {
    if (!type) return '-';
    const t = type.toLowerCase();
    if (t === 'earn') return 'แจกเหรียญ';
    if (t === 'spend') return 'ใช้เหรียญ';
    if (t === 'deduct') return 'หักเหรียญ';
    if (t === 'refund') return 'คืนเหรียญ';
    if (t === 'adjustment') return 'ปรับยอด';
    if (t === 'reclaim_inactive') return 'ดึงกลับ (พ้นสภาพ)';
    return type;
  };

  // Filtered Transactions in Tab 1
  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter((tx) => {
      const matchesSearch = !activitySearch.trim() || 
        tx.employees?.name?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        tx.emp_id?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        tx.description?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        tx.source_key?.toLowerCase().includes(activitySearch.toLowerCase());

      const tLower = (tx.transaction_type || '').toLowerCase();
      let matchesType = true;
      if (txTypeFilter === 'earn') matchesType = tLower === 'earn';
      if (txTypeFilter === 'spend') matchesType = tLower === 'spend' || tLower === 'wheel_redeem' || tx.amount < 0;
      if (txTypeFilter === 'deduct') matchesType = tLower === 'deduct' || tLower === 'reclaim_inactive';

      return matchesSearch && matchesType;
    });
  }, [recentTransactions, activitySearch, txTypeFilter]);

  // Filtered Redemptions in Tab 2
  const filteredRedemptions = useMemo(() => {
    if (!activitySearch.trim()) return redemptions;
    const s = activitySearch.toLowerCase();
    return redemptions.filter((r) => 
      r.employeeName?.toLowerCase().includes(s) ||
      r.emp_id?.toLowerCase().includes(s) ||
      r.rewardName?.toLowerCase().includes(s) ||
      r.departmentName?.toLowerCase().includes(s)
    );
  }, [redemptions, activitySearch]);

  // Filtered Reclaimed Coins in Tab 3
  const filteredReclaimed = useMemo(() => {
    if (!activitySearch.trim()) return reclaimedCoins;
    const s = activitySearch.toLowerCase();
    return reclaimedCoins.filter((r) => 
      r.employees?.name?.toLowerCase().includes(s) ||
      r.emp_id?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.employees?.departmentName?.toLowerCase().includes(s)
    );
  }, [reclaimedCoins, activitySearch]);

  const hasActiveFilters = Boolean(
    currentFilters.coinType || 
    currentFilters.department || 
    searchParams.has('from') || 
    searchParams.has('to')
  );

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50/70 pb-20 custom-scrollbar relative">
      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center transition-opacity">
          <div className="bg-white p-5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span className="font-bold text-slate-800 text-sm">กำลังอัปเดตข้อมูล...</span>
          </div>
        </div>
      )}

      {/* ── Modern Executive Hero Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2.5">
                <Sparkles size={13} className="text-amber-400" />
                Executive Coin Analytics
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                ภาพรวมเหรียญรางวัลทั้งระบบ
              </h1>
              <p className="text-slate-400 text-sm mt-1.5 max-w-2xl font-normal">
                วิเคราะห์สภาพคล่องเศรษฐกิจเหรียญองค์กร การจัดสรรรางวัล การใช้งาน และพฤติกรรมขวัญกำลังใจพนักงาน
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-3.5 flex items-center gap-4 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coins size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">เหรียญหมุนเวียนรวม</p>
                  <p className="text-xl font-black text-white font-mono tracking-tight">
                    {totalCirculation.toLocaleString()} <span className="text-xs font-normal text-amber-400 font-sans">เหรียญ</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 space-y-6">

        {/* ── Executive Filter Bar ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar flex-nowrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <Calendar size={13} /> ช่วงเวลา:
              </span>
              {[
                { id: 'today' as const, label: 'วันนี้' },
                { id: 'this_month' as const, label: 'เดือนนี้' },
                { id: 'this_quarter' as const, label: 'ไตรมาสนี้' },
                { id: 'this_year' as const, label: 'ปีนี้' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Detailed Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Inputs */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-400 font-semibold text-[11px]">ตั้งแต่:</span>
                <input 
                  type="date" 
                  value={currentFilters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                  className="bg-transparent border-0 text-slate-800 font-medium text-xs focus:outline-none cursor-pointer"
                />
                <span className="text-slate-300">-</span>
                <input 
                  type="date" 
                  value={currentFilters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                  className="bg-transparent border-0 text-slate-800 font-medium text-xs focus:outline-none cursor-pointer"
                />
              </div>

              {/* Department Dropdown */}
              <div className="relative">
                <select 
                  value={currentFilters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
                >
                  <option value="">ทุกแผนก</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Coin Type Dropdown */}
              <div className="relative">
                <select 
                  value={currentFilters.coinType}
                  onChange={(e) => handleFilterChange('coinType', e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
                >
                  <option value="">ทุกประเภทเหรียญ</option>
                  {coinTypes.map((c) => (
                    <option key={c.id} value={c.id}>{translateCoinName(c.name)}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filter Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-all"
                  title="รีเซ็ตตัวกรองทั้งหมด"
                >
                  <RotateCcw size={13} />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 5 Executive KPI Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 1. Total Circulation */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เหรียญหมุนเวียน</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Coins size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {totalCirculation.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">ยอดคงเหลือในมือพนักงานทุกคน</p>
          </div>

          {/* 2. Total Issued */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เหรียญที่แจก</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
              +{issuedThisPeriod.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">แจกในช่วงเวลาที่เลือก</p>
          </div>

          {/* 3. Total Redeemed */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เหรียญที่ถูกใช้</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <ArrowDownLeft size={18} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono tracking-tight">
              -{redeemedThisPeriod.toLocaleString()}
            </div>
            <p className="text-[11px] text-rose-700 font-medium mt-1">แลกรางวัลและใช้งาน</p>
          </div>

          {/* 4. Net Flow Delta */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">สภาพคล่องสุทธิ</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                netDelta >= 0 
                  ? 'bg-blue-50 text-blue-600 border-blue-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              netDelta >= 0 ? 'text-blue-600' : 'text-amber-600'
            }`}>
              {netDelta > 0 ? `+${netDelta.toLocaleString()}` : netDelta.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {netDelta >= 0 ? 'เศรษฐกิจขยายตัว (+)' : 'เหรียญถูกเผาผลาญ/แลก (-)'}
            </p>
          </div>

          {/* 5. Total Redemptions */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">การแลกของรางวัล</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <Gift size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-black text-purple-600 font-mono tracking-tight">
                {totalRedemptionsCount.toLocaleString()}
              </div>
              <span className="text-xs font-bold text-slate-400">ครั้ง</span>
            </div>
            <p className="text-[11px] text-purple-700 font-medium mt-1 font-mono">
              ใช้ {totalRedemptionsPoints.toLocaleString()} เหรียญ
            </p>
          </div>

        </div>

        {/* ── Coin Portfolio Breakdown ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award size={18} className="text-red-600" />
              การกระจายตัวของประเภทเหรียญ (Coin Portfolio Breakdown)
            </h2>
            <span className="text-xs text-slate-400 font-medium">คลิกการ์ดเพื่อกรองเฉพาะเหรียญนั้น</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(coinTypeSums).map((coin) => {
              const imageInfo = getCoinImagePath(coin.code, coin.name);
              const percentage = totalCirculation > 0 ? (coin.amount / totalCirculation) * 100 : 0;
              const isSelected = currentFilters.coinType === coin.code;

              return (
                <div
                  key={coin.code}
                  onClick={() => handleFilterChange('coinType', isSelected ? '' : coin.code)}
                  className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer relative overflow-hidden group hover:shadow-lg ${
                    isSelected 
                      ? 'border-red-500 ring-2 ring-red-500/20 shadow-md bg-gradient-to-br from-white to-red-50/20' 
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Decorative Background Coin Art */}
                  <div className="absolute -right-4 -bottom-4 w-28 h-28 opacity-15 pointer-events-none group-hover:opacity-25 group-hover:scale-110 transition-all duration-300">
                    <Image 
                      src={imageInfo.front} 
                      alt={coin.name} 
                      fill 
                      unoptimized 
                      className="object-contain" 
                    />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 relative">
                        <Image 
                          src={imageInfo.front} 
                          alt={coin.name} 
                          fill 
                          unoptimized 
                          className="object-contain drop-shadow" 
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 truncate" title={coin.name}>
                      {translateCoinName(coin.name)}
                    </h3>

                    <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {coin.amount.toLocaleString()}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Leaderboard & Unified Activity Center Split ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Leaderboard (Top 10 Coin Holders) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col h-[640px]">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">อันดับยอดคงเหลือสูงสุด</h2>
                  <p className="text-[11px] text-slate-400">Top 10 Coin Holders</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 font-mono">
                Top 10
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
              {leaderboard.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  ไม่พบข้อมูลยอดเหรียญพนักงาน
                </div>
              ) : (
                leaderboard.map((user, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;

                  let rankBadge = (
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center font-mono">
                      {index + 1}
                    </div>
                  );

                  if (isTop1) {
                    rankBadge = (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black text-xs flex items-center justify-center shadow-md shadow-amber-200">
                        🥇
                      </div>
                    );
                  } else if (isTop2) {
                    rankBadge = (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shadow-sm">
                        🥈
                      </div>
                    );
                  } else if (isTop3) {
                    rankBadge = (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-orange-400 text-white font-black text-xs flex items-center justify-center shadow-sm">
                        🥉
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={user.empId} 
                      className={`p-3 rounded-2xl flex items-center gap-3 transition-colors border ${
                        isTop1 
                          ? 'bg-amber-50/40 border-amber-200/60 hover:bg-amber-50/70' 
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="shrink-0">{rankBadge}</div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-xs truncate">{user.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{user.empId}</span>
                          {user.departmentName && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium truncate max-w-[110px]">
                              {user.departmentName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-black text-slate-900 font-mono text-sm shrink-0 flex items-center gap-1">
                        <span>{user.totalBalance.toLocaleString()}</span>
                        <span className="text-[10px] font-sans font-normal text-slate-400">เหรียญ</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Unified Activity Center (Tabs + Search) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col h-[640px]">
            
            {/* Header & Tabs */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              
              {/* Tab Navigation */}
              <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveTab('ledger')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'ledger'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History size={14} />
                  <span>ความเคลื่อนไหว</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono">
                    {filteredTransactions.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('redemptions')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'redemptions'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Gift size={14} />
                  <span>แลกของรางวัล</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono">
                    {filteredRedemptions.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('reclaimed')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'reclaimed'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw size={14} />
                  <span>เหรียญที่ดึงกลับ</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono">
                    {filteredReclaimed.length}
                  </span>
                </button>
              </div>

              {/* Real-time Search Box */}
              <div className="relative w-full sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส, รายละเอียด..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Sub-Filters for Tab 1 (Transactions) */}
            {activeTab === 'ledger' && (
              <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">ประเภท:</span>
                {[
                  { id: 'all' as const, label: 'ทั้งหมด' },
                  { id: 'earn' as const, label: 'แจกเหรียญ (+)' },
                  { id: 'spend' as const, label: 'ใช้เหรียญ (-)' },
                  { id: 'deduct' as const, label: 'หัก/ดึงกลับ' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setTxTypeFilter(btn.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      txTypeFilter === btn.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-x-auto custom-scrollbar">

              {/* ── TAB 1: LEDGER ── */}
              {activeTab === 'ledger' && (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-5">เวลา</th>
                      <th className="py-3 px-5">พนักงาน</th>
                      <th className="py-3 px-5">ประเภท</th>
                      <th className="py-3 px-5">เหรียญ</th>
                      <th className="py-3 px-5 text-right">จำนวน</th>
                      <th className="py-3 px-5">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-400 text-xs">
                          ไม่พบรายการเคลื่อนไหวที่ตรงกับเงื่อนไข
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isPositive = tx.transaction_type === 'EARN';
                        const userName = tx.employees?.name || tx.emp_id;
                        const coinInfo = getCoinImagePath(tx.coin_types?.id, tx.coin_types?.name);

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Time */}
                            <td className="py-3 px-5 text-xs text-slate-400 font-mono" suppressHydrationWarning>
                              {new Intl.DateTimeFormat('th-TH', { 
                                day: '2-digit', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }).format(new Date(tx.created_at))}
                            </td>

                            {/* Employee */}
                            <td className="py-3 px-5">
                              <p className="font-semibold text-slate-900 text-xs truncate max-w-[140px]" title={userName}>
                                {userName}
                              </p>
                              {tx.employees?.departmentName && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  {tx.employees.departmentName}
                                </p>
                              )}
                            </td>

                            {/* Tx Type Badge */}
                            <td className="py-3 px-5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isPositive 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {translateTxType(tx.transaction_type)}
                              </span>
                            </td>

                            {/* Coin Type */}
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <div className="w-4 h-4 relative shrink-0">
                                  <Image src={coinInfo.front} alt="coin" fill unoptimized className="object-contain" />
                                </div>
                                <span className="truncate max-w-[120px]">
                                  {translateCoinName(tx.coin_types?.name)}
                                </span>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className={`py-3 px-5 text-right font-black font-mono text-xs ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                            </td>

                            {/* Description */}
                            <td className="py-3 px-5 text-xs text-slate-500 max-w-[200px] truncate" title={tx.description || tx.source_key || ''}>
                              {tx.description || tx.source_key || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* ── TAB 2: REDEMPTIONS ── */}
              {activeTab === 'redemptions' && (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-5">พนักงาน</th>
                      <th className="py-3 px-5">ของรางวัล</th>
                      <th className="py-3 px-5 text-right">เหรียญที่ใช้</th>
                      <th className="py-3 px-5 text-right">วันที่แลก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRedemptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 text-xs">
                          ไม่พบข้อมูลการแลกของรางวัลในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      filteredRedemptions.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5">
                            <p className="font-semibold text-slate-900 text-xs truncate max-w-[150px]">
                              {item.employeeName}
                            </p>
                            {item.departmentName && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.departmentName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5 font-medium text-slate-800 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Gift size={13} className="text-amber-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{item.rewardName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-amber-700 font-mono text-xs">
                            <div className="inline-flex items-center justify-end gap-1">
                              <div className="w-3.5 h-3.5 relative shrink-0">
                                <Image 
                                  src={getCoinImagePath(item.coinTypeId, item.coinTypeName).front} 
                                  alt="coin" 
                                  fill 
                                  unoptimized 
                                  className="object-contain" 
                                />
                              </div>
                              <span>{item.points_spent.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right text-xs text-slate-400 font-mono" suppressHydrationWarning>
                            {new Intl.DateTimeFormat('th-TH', { 
                              day: '2-digit', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }).format(new Date(item.redeemed_at))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* ── TAB 3: RECLAIMED COINS ── */}
              {activeTab === 'reclaimed' && (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-5">พนักงาน</th>
                      <th className="py-3 px-5">ประเภทเหรียญ</th>
                      <th className="py-3 px-5 text-right">จำนวนที่ดึงกลับ</th>
                      <th className="py-3 px-5 text-right">วันที่ดึงกลับ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReclaimed.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 text-xs">
                          ไม่พบข้อมูลเหรียญที่ถูกดึงกลับในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      filteredReclaimed.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5">
                            <p className="font-semibold text-slate-900 text-xs truncate max-w-[150px]">
                              {item.employees?.name || item.emp_id}
                            </p>
                            {item.employees?.departmentName && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.employees.departmentName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                              <div className="w-4 h-4 relative shrink-0">
                                <Image 
                                  src={getCoinImagePath(item.coin_types?.id, item.coin_types?.name).front} 
                                  alt="coin" 
                                  fill 
                                  unoptimized 
                                  className="object-contain" 
                                />
                              </div>
                              <span>{translateCoinName(item.coin_types?.name)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-black text-rose-600 font-mono text-xs">
                            -{item.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-5 text-right text-xs text-slate-400 font-mono" suppressHydrationWarning>
                            {new Intl.DateTimeFormat('th-TH', { 
                              day: '2-digit', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }).format(new Date(item.created_at))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
