'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, Loader2 } from 'lucide-react';
import { getUserCoins } from '@/app/actions/coins';

const ENABLE_COIN_PREFETCH = process.env.NODE_ENV === 'production';
const COIN_CACHE_KEY = 'crm_gold_balance_v1';
const COIN_CACHE_TTL_MS = 30_000;
let inFlightCoinFetch: Promise<number | null> | null = null;

type CoinMiniWidgetProps = {
  isMobile?: boolean;
  isExpanded?: boolean;
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
  isExpanded = false,
  activeRoute,
  onMouseEnter,
  onMouseLeave,
  onClick
}: CoinMiniWidgetProps) {
  const [goldBalance, setGoldBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const readCachedBalance = (): number | null => {
      try {
        const raw = sessionStorage.getItem(COIN_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.balance === 'number' &&
          typeof parsed.ts === 'number' &&
          Date.now() - parsed.ts < COIN_CACHE_TTL_MS
        ) {
          return parsed.balance;
        }
      } catch {
        // Ignore storage errors
      }
      return null;
    };

    async function fetchCoins() {
      const cachedBalance = readCachedBalance();
      if (cachedBalance !== null) {
        await Promise.resolve();
        if (active) {
          setGoldBalance(cachedBalance);
          setLoading(false);
        }
        return;
      }

      try {
        if (!inFlightCoinFetch) {
          inFlightCoinFetch = getUserCoins()
            .then((res) => {
              if (res.success && res.data) {
                const gold = (
                  res.data as Array<{
                    coin_types?: { code?: string | null; name?: string | null } | null;
                    balance?: number | null;
                  }>
                ).find(
                  (c) =>
                    c?.coin_types?.code?.toLowerCase() === 'gold' ||
                    c?.coin_types?.name?.toLowerCase().includes('gold')
                );
                return gold ? Number(gold.balance || 0) : 0;
              }
              return null;
            })
            .finally(() => {
              inFlightCoinFetch = null;
            });
        }
        const nextBalance = await inFlightCoinFetch;
        if (active && nextBalance !== null) {
          setGoldBalance(nextBalance);
          try {
            sessionStorage.setItem(
              COIN_CACHE_KEY,
              JSON.stringify({ balance: nextBalance, ts: Date.now() })
            );
          } catch {
            // Ignore storage errors
          }
        }
      } catch (err) {
        console.error('Failed to fetch coins for widget', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchCoins();
    return () => {
      active = false;
    };
  }, []);

  const isActive = activeRoute === '/coins';

  if (isMobile || isExpanded) {
    return (
      <Link
        href="/coins"
        prefetch={ENABLE_COIN_PREFETCH}
        onClick={onClick}
        className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all duration-200 border ${
          isActive
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 font-bold'
            : 'bg-gradient-to-r from-yellow-50/50 to-white hover:from-yellow-50 hover:to-yellow-50/20 border-yellow-100 text-yellow-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-inner flex items-center justify-center shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={18} strokeWidth={2.5} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-sans font-bold text-gray-900 leading-tight truncate">Gold Coin</span>
            <span className="text-[10px] font-sans font-semibold text-yellow-600 mt-0.5 truncate">เหรียญสะสมของฉัน</span>
          </div>
        </div>
        <div className="text-right shrink-0 pl-2">
          <span className="text-base font-black text-yellow-600 font-sans tracking-tight">
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
      prefetch={ENABLE_COIN_PREFETCH}
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
