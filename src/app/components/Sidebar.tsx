"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, PhoneCall,
  LogOut, TrendingUp, Settings, Bell, Loader2, Menu, X,
} from 'lucide-react';
import { logout } from '@/app/actions/auth';

type SidebarProps = {
  activeRoute?: string;
  userFullName?: string;
  userId?: string;
  userRole?: string;
};

const managerNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมทีม', href: '/dashboard' },
  { icon: TrendingUp, label: 'จัดการใบเสนอราคา', href: '/sales' },
  { icon: Users, label: 'จัดการทีม', href: '/team' },
  { icon: CalendarDays, label: 'จัดการตารางงาน', href: '/schedule' },
  { icon: PhoneCall, label: 'เทเลเซลล์', href: '/telesales' },
  { icon: Users, label: 'ลูกค้าและบริษัท', href: '/clients' },
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

const repNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมของฉัน', href: '/dashboard' },
  { icon: TrendingUp, label: 'บันทึกใบเสนอราคา', href: '/sales' },
  { icon: CalendarDays, label: 'ตารางงานของฉัน', href: '/schedule' },
  { icon: PhoneCall, label: 'เทเลเซลล์', href: '/telesales' },
  { icon: Users, label: 'ลูกค้าและบริษัท', href: '/clients' },
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

export default function Sidebar(props: SidebarProps) {
  const nav = props.userRole === 'ผู้จัดการ' ? managerNav : repNav;
  return <ResponsiveSidebar {...props} nav={nav} />;
}

type NavItem = { icon: React.ElementType; label: string; href: string };

function ResponsiveSidebar({
  activeRoute = '/dashboard',
  userFullName = 'User',
  userRole = 'ตัวแทนฝ่ายขาย',
  nav,
}: SidebarProps & { nav: NavItem[] }) {
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aggressively prefetch all route bundles and server component data on mount
  useEffect(() => {
    nav.forEach(({ href }) => {
      router.prefetch(href);
    });
    router.prefetch('/settings');
  }, [router, nav]);

  const showTooltip = useCallback((label: string, e: React.MouseEvent) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ label, y: rect.top + rect.height / 2 });
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  useEffect(() => () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
  }, []);

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (Inline, in-flow) ─── */}
      <aside
        className="hidden md:flex w-[76px] h-screen bg-white flex-col items-center py-6 shrink-0 justify-between border-r border-gray-100 relative z-40 select-none"
      >
        {/* Top brand logo and navigation */}
        <div className="flex flex-col items-center w-full">
          {/* Logo mark */}
          <Link href="/dashboard" className="w-12 h-12 bg-[#ff2301] rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 hover:scale-105 transition-all duration-300">
            <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
          </Link>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-100 my-5 shrink-0" />

          {/* Nav items */}
          <nav className="flex flex-col gap-2 w-full px-2">
            {nav.map(({ icon: Icon, label, href }) => {
              const active = activeRoute === href;
              const isLoading = loadingHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onMouseEnter={(e) => showTooltip(label, e)}
                  onMouseLeave={hideTooltip}
                  onClick={() => {
                    if (activeRoute !== href) {
                      setLoadingHref(href);
                    }
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative mx-auto group ${
                    active
                      ? 'bg-red-50 text-[#ff2301] shadow-sm border border-red-100'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin text-[#ff2301]" />
                  ) : (
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} className="transition-transform duration-200 group-hover:scale-105" />
                  )}
                  {active && !isLoading && (
                    <span
                      className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-[#ff2301] border border-white animate-pulse"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom items */}
        <div className="flex flex-col items-center gap-3 w-full px-2 shrink-0">
          <div className="w-8 h-px bg-gray-100 my-1 shrink-0" />

          <Link
            href="/dashboard"
            onMouseEnter={(e) => showTooltip('การแจ้งเตือน', e)}
            onMouseLeave={hideTooltip}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 relative group"
          >
            <Bell size={20} strokeWidth={2} className="transition-transform duration-200 group-hover:scale-105" />
            <span
              className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full bg-red-500 border border-white"
            />
          </Link>

          <Link
            href="/settings"
            prefetch={true}
            onMouseEnter={(e) => showTooltip(`${userFullName} (${userRole})`, e)}
            onMouseLeave={hideTooltip}
            onClick={() => {
              if (activeRoute !== '/settings') {
                setIsSettingsLoading(true);
              }
            }}
            className="w-10 h-10 rounded-2xl bg-red-50 text-[#ff2301] border border-red-100 font-black text-xs flex items-center justify-center transition-all duration-200 hover:bg-red-100 hover:scale-105 uppercase"
          >
            {isSettingsLoading ? (
              <Loader2 size={16} className="animate-spin text-[#ff2301]" />
            ) : (
              userFullName.charAt(0)
            )}
          </Link>

          <form action={logout} onSubmit={() => setIsLogoutLoading(true)} className="w-full flex justify-center">
            <button
              type="submit"
              onMouseEnter={(e) => showTooltip('ออกจากระบบ', e)}
              onMouseLeave={hideTooltip}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#ff2301] hover:bg-red-50 transition-all duration-200 group"
            >
              {isLogoutLoading ? (
                <Loader2 size={18} className="animate-spin text-[#ff2301]" />
              ) : (
                <LogOut
                  size={18}
                  strokeWidth={2}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              )}
            </button>
          </form>
        </div>
      </aside>

      {/* ─── MOBILE FLOATING TRIGGER BUTTON ─── */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed left-4 bottom-4 z-50 bg-[#ff2301] text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition-all outline-none"
      >
        {isMobileMenuOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} strokeWidth={2.5} />}
      </button>

      {/* ─── MOBILE SLIDER DRAWER OVERLAY ─── */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ─── MOBILE SLIDER DRAWER CONTENT ─── */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 w-[270px] bg-white border-r border-gray-100 flex flex-col justify-between py-8 px-5 z-50 transition-transform duration-300 ease-out transform shadow-2xl ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex flex-col w-full">
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff2301] rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-sans font-black text-lg text-gray-900 tracking-tight block">TeraSales</span>
              <span className="text-[9px] font-sans font-bold text-[#ff2301] tracking-wider block -mt-1 uppercase">CRM System</span>
            </div>
          </Link>

          {/* Divider */}
          <div className="w-full h-px bg-gray-100 my-6" />

          {/* Nav items list */}
          <nav className="flex flex-col gap-1.5 w-full">
            {nav.map(({ icon: Icon, label, href }) => {
              const active = activeRoute === href;
              const isLoading = loadingHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onClick={() => {
                    if (activeRoute !== href) {
                      setLoadingHref(href);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full h-12 rounded-xl flex items-center gap-3.5 px-4 transition-all duration-200 border ${
                    active
                      ? 'bg-red-50 text-[#ff2301] border-red-100 font-bold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="shrink-0">
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-[#ff2301]" />
                    ) : (
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                    )}
                  </div>
                  <span className="text-[14px] font-sans font-semibold tracking-wide">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Action buttons */}
        <div className="flex flex-col gap-4 w-full">
          <div className="h-px bg-gray-100 w-full" />

          {/* Profile Card / Settings Link */}
          <Link
            href="/settings"
            prefetch={true}
            onClick={() => {
              if (activeRoute !== '/settings') {
                setIsSettingsLoading(true);
              }
              setIsMobileMenuOpen(false);
            }}
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 border ${
              activeRoute === '/settings'
                ? 'bg-red-50 text-[#ff2301] border-red-100 font-bold'
                : 'bg-gray-50/50 hover:bg-gray-50 text-gray-700 border-gray-100'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-red-100 text-[#ff2301] border border-red-200 font-black text-sm flex items-center justify-center uppercase shrink-0">
              {isSettingsLoading ? (
                <Loader2 size={16} className="animate-spin text-[#ff2301]" />
              ) : (
                userFullName.charAt(0)
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-sans font-bold text-gray-900 truncate leading-none">{userFullName}</span>
              <span className="text-[9px] font-sans font-semibold text-gray-400 truncate uppercase mt-1 tracking-tight">{userRole}</span>
            </div>
          </Link>

          {/* Logout button */}
          <form action={logout} onSubmit={() => setIsLogoutLoading(true)} className="w-full">
            <button
              type="submit"
              className="w-full h-12 rounded-xl flex items-center gap-3.5 px-4 text-gray-500 hover:text-[#ff2301] hover:bg-red-50 transition-all duration-200 font-sans font-semibold text-sm outline-none"
            >
              <div className="shrink-0">
                {isLogoutLoading ? (
                  <Loader2 size={18} className="animate-spin text-[#ff2301]" />
                ) : (
                  <LogOut size={18} strokeWidth={2} />
                )}
              </div>
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ─── DESKTOP TOOLTIP ─── */}
      {tooltip && (
        <div
          className="fixed z-[60] pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ left: 88, top: tooltip.y, transform: 'translateY(-50%)' }}
        >
          <div
            className="text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-xl relative font-sans"
            style={{
              background: '#0f172a',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            }}
          >
            {tooltip.label}
            <span
              className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 rotate-45"
              style={{ background: '#0f172a' }}
            />
          </div>
        </div>
      )}
    </>
  );
}