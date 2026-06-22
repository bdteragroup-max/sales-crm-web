'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Loader2 } from 'lucide-react';
import { getUserCoins } from '@/app/actions/coins';

type CoinMiniWidgetProps = {
  isMobile?: boolean;
  activeRoute?: string;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
};

// Formatter to short numbers (e.g., 1200 -> 1.2k)
function formatShortNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export default function CoinMiniWidget({ 
  isMobile = false, 
  activeRoute,
  onMouseEnter,
  onMouseLeave,
  onClick
}: CoinMiniWidgetProps) {
  const [goldBalance, setGoldBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoins() {
      try {
        const res = await getUserCoins();
        if (res.success && res.data) {
          // Find Gold coin (assuming code 'gold' or name 'Gold')
          const gold = res.data.find((c: any) => 
            c?.coin_types?.code?.toLowerCase() === 'gold' || 
            c?.coin_types?.name?.toLowerCase().includes('gold')
          );
          if (gold) {
            setGoldBalance(gold.balance);
          } else {
            setGoldBalance(0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch coins for widget', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCoins();
  }, []);

  const isActive = activeRoute === '/coins';

  if (isMobile) {
    return (
      <Link
        href="/coins"
        prefetch={true}
        onClick={onClick}
        className={`w-full p-3 rounded-xl flex items-center justify-between transition-all duration-200 border ${
          isActive
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 font-bold'
            : 'bg-gradient-to-r from-yellow-50/50 to-white hover:from-yellow-50 hover:to-yellow-50/20 border-yellow-100 text-yellow-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-inner flex items-center justify-center shrink-0">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Coins size={20} strokeWidth={2.5} />}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-sans font-bold text-gray-900 leading-tight">Gold Coin</span>
            <span className="text-[11px] font-sans font-semibold text-yellow-600 mt-0.5">คลิกเพื่อดูรายละเอียด</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-yellow-600 font-sans tracking-tight">
            {loading ? '...' : (goldBalance?.toLocaleString() || '0')}
          </span>
        </div>
      </Link>
    );
  }

  // Desktop (narrow sidebar)
  return (
    <Link
      href="/coins"
      prefetch={true}
      onMouseEnter={(e) => onMouseEnter?.(e)}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative group ${
        isActive
          ? 'bg-yellow-50 text-yellow-600 shadow-sm border border-yellow-200'
          : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
      }`}
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            <Coins size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200 group-hover:scale-105" />
            <span className="text-[9px] font-black tracking-tighter mt-0.5" style={{ lineHeight: '1' }}>
              {formatShortNumber(goldBalance || 0)}
            </span>
          </div>
        </>
      )}
    </Link>
  );
}
