"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, PhoneCall,
  LogOut, TrendingUp, Settings, Bell, Loader2, Menu, X, GitCommit, Briefcase, Wrench, DollarSign, FileText, FileSignature, ExternalLink, ClipboardList, UserSquare, Calculator, FolderOpen, MapPin
} from 'lucide-react';
import { logout, getMyDepartment } from '@/app/actions/auth';
import { getPendingPaymentTaskCount } from '@/app/actions/accounting';
import { getPendingInstallationCount } from '@/app/actions/installationOrders';
import CoinMiniWidget from './CoinMiniWidget';
import NotificationBell from './NotificationBell';

type SidebarProps = {
  activeRoute?: string;
  userFullName?: string;
  userId?: string;
  userRole?: string;
};

const managerNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมทีม', href: '/dashboard' },
  { icon: GitCommit, label: 'ท่อดีลฝ่ายขาย', href: '/pipeline' },
  { icon: Bell, label: 'Leads จาก Marketing', href: '/sales/leads' },
  { icon: TrendingUp, label: 'จัดการใบเสนอราคา', href: '/sales' },
  { icon: DollarSign, label: 'บันทึกค่าใช้จ่าย', href: '/sales/expenses' },
  { icon: FileText, label: 'ใบรับความต้องการ', href: '/sales/requirements' },
  { icon: MapPin, label: 'สำรวจไซต์งาน', href: '/sales/surveys' },
  { icon: LayoutDashboard, label: 'Marketing', href: '/marketing' },
  { icon: Users, label: 'จัดการทีม', href: '/team' },
  { icon: CalendarDays, label: 'จัดการตารางงาน', href: '/schedule' },
  { icon: PhoneCall, label: 'เทเลเซลล์', href: '/telesales' },
  { icon: Users, label: 'ลูกค้าและบริษัท', href: '/clients' },
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

const repNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมของฉัน', href: '/dashboard' },
  { icon: GitCommit, label: 'ท่อดีลของฉัน', href: '/pipeline' },
  { icon: Bell, label: 'Leads จาก Marketing', href: '/sales/leads' },
  { icon: TrendingUp, label: 'บันทึกใบเสนอราคา', href: '/sales' },
  { icon: DollarSign, label: 'บันทึกค่าใช้จ่าย', href: '/sales/expenses' },
  { icon: FileText, label: 'ใบรับความต้องการ', href: '/sales/requirements' },
  { icon: MapPin, label: 'สำรวจไซต์งาน', href: '/sales/surveys' },
  { icon: CalendarDays, label: 'ตารางงานของฉัน', href: '/schedule' },
  { icon: PhoneCall, label: 'เทเลเซลล์', href: '/telesales' },
  { icon: Users, label: 'ลูกค้าและบริษัท', href: '/clients' },
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

const serviceNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมฝ่ายบริการ', href: '/service/dashboard' },
  { icon: Wrench, label: 'ใบรับซ่อม (ซ่อมใน)', href: '/repair-orders' },
  { icon: ExternalLink, label: 'ใบส่งซ่อม (ซ่อมภายนอก)', href: '/outsource-repairs' },
  { icon: FileSignature, label: 'ใบส่งมอบงาน', href: '/repair-deliveries' },
  { icon: ClipboardList, label: 'แดชบอร์ดงานติดตั้ง', href: '/service/installation' },
  { icon: Calculator, label: 'ประเมินราคางานซ่อม/ประกอบ', href: '/service/estimations' },
  { icon: UserSquare, label: 'งานของฉัน', href: '/service/my-tasks' },
];

const backofficeNav = [
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
];

const projectNav = [
  { icon: FolderOpen, label: 'โครงการของฉัน', href: '/projects' },
  { icon: MapPin, label: 'แบบสำรวจไซต์งาน', href: '/sales/surveys' },
];

const marketingNav = [
  { icon: LayoutDashboard, label: 'Marketing Dashboard', href: '/marketing/dashboard' },
  { icon: Users, label: 'Marketing Leads', href: '/marketing' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
];

const projectAdminNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมโครงการ', href: '/projects/dashboard' },
  { icon: FolderOpen, label: 'จัดการโครงการ', href: '/projects' },
  { icon: MapPin, label: 'แบบสำรวจไซต์งาน', href: '/sales/surveys' },
];

export default function SidebarClient(props: SidebarProps) {
  let nav = repNav;
  const roleStr = (props.userRole || '').toLowerCase();
  
  if (roleStr === 'ผู้จัดการ' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด' || roleStr === 'ผู้การจัดการตลาด') {
    nav = managerNav;
  } else if (roleStr.includes('admin project') || roleStr.includes('project admin')) {
    nav = projectAdminNav;
  } else if (roleStr === 'อื่นๆ' || roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ซ่อม') || roleStr.includes('ช่าง')) {
    nav = serviceNav; // Service / non-sales departments see repair orders
  } else if (['accounting', 'บัญชี', 'finance', 'การเงิน'].some(r => roleStr.includes(r))) {
    nav = [
      { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
      { icon: DollarSign, label: 'งานการเงิน/บัญชี', href: '/accounting' },
    ];
  } else if (['project', 'โปรเจค', 'โปรเจกต์'].some(r => roleStr.includes(r))) {
    nav = projectNav; // Project users see their projects
  } else if (['marketing', 'การตลาด'].some(r => roleStr.includes(r))) {
    nav = marketingNav; // Marketing role sees marketing dashboard
  } else if (['purchasing', 'จัดซื้อ', 'warehouse', 'คลังสินค้า', 'admin', 'ขนส่ง', 'shipping', 'logistics', 'โลจิสติกส์'].some(r => roleStr.includes(r))) {
    nav = backofficeNav; // Back-office non-sales see their own department queue
  }
  
  return <ResponsiveSidebar {...props} nav={nav} />;
}

type NavItem = { icon: React.ElementType; label: string; href: string };

function ResponsiveSidebar({
  activeRoute = '/dashboard',
  userFullName = 'User',
  userRole = 'ตัวแทนฝ่ายขาย',
  userId,
  nav,
}: SidebarProps & { nav: NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [unpaidCount, setUnpaidCount] = useState(0);
  const [pendingInstallationCount, setPendingInstallationCount] = useState(0);
  
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aggressively prefetch all route bundles and server component data on mount
  useEffect(() => {
    nav.forEach(({ href }) => {
      router.prefetch(href);
    });
    router.prefetch('/settings');
    router.prefetch('/repair-orders');

    const roleStr = (userRole || '').toLowerCase();
    const isAccounting = ['accounting', 'บัญชี', 'finance', 'การเงิน', 'ผู้จัดการ'].some(r => roleStr.includes(r));
    if (isAccounting) {
      getPendingPaymentTaskCount().then(setUnpaidCount).catch(() => {});
    }

    const isServiceUser = roleStr === 'อื่นๆ' || roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ซ่อม') || roleStr.includes('ช่าง') || roleStr === 'ผู้จัดการ' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด';
    if (isServiceUser) {
      getPendingInstallationCount().then(setPendingInstallationCount).catch(() => {});
    }
  }, [router, nav, userRole]);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setLoadingHref(null);
    setIsSettingsLoading(false);
  }

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

  // Find the most specific active route
  const currentFullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
  const sortedNav = [...nav].sort((a, b) => b.href.length - a.href.length);
  const bestMatchHref = sortedNav.find(n => currentFullPath === n.href || pathname === n.href || pathname.startsWith(n.href + '/'))?.href || activeRoute;

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (Inline, in-flow) ─── */}
      <aside
        className="hidden md:flex w-[76px] h-screen bg-white flex-col items-center py-6 shrink-0 justify-between border-r border-gray-100 relative z-40 select-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] print:hidden"
      >
        {/* Top brand logo and navigation */}
        <div className="flex flex-col items-center w-full shrink-0">
          {/* Logo mark */}
          <Link href={userRole === 'อื่นๆ' ? '/department' : (userRole || '').toLowerCase().includes('project') ? '/jobs' : '/dashboard'} className="w-12 h-12 bg-[#ff2301] rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 hover:scale-105 transition-all duration-300">
            <TrendingUp size={22} className="text-white" strokeWidth={2.5} />
          </Link>

          {/* Divider */}
          <div className="w-8 h-px bg-gray-100 my-5 shrink-0" />

          {/* Nav items */}
          <nav className="flex flex-col gap-2 w-full px-2">
            {nav.map(({ icon: Icon, label, href }) => {
              const isActive = href === bestMatchHref;
              const isLoading = loadingHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onMouseEnter={(e) => showTooltip(label, e)}
                  onMouseLeave={hideTooltip}
                  onClick={() => {
                    if (!isActive) {
                      setLoadingHref(href);
                    }
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative mx-auto group ${
                    isActive
                      ? 'bg-red-50 text-[#ff2301] shadow-sm border border-red-100'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin text-[#ff2301]" />
                  ) : (
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200 group-hover:scale-105" />
                  )}
                  {isActive && !isLoading && (
                    <span
                      className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-[#ff2301] border border-white animate-pulse"
                    />
                  )}
                  {href === '/accounting' && unpaidCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                      {unpaidCount > 99 ? '99+' : unpaidCount}
                    </span>
                  )}
                  {href === '/service/installation' && pendingInstallationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                      {pendingInstallationCount > 99 ? '99+' : pendingInstallationCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom items */}
        <div className="flex flex-col items-center gap-3 w-full px-2 shrink-0">
          <CoinMiniWidget 
            isMobile={false} 
            activeRoute={activeRoute} 
            onMouseEnter={(e) => showTooltip('Gold Coin', e)}
            onMouseLeave={hideTooltip}
          />

          <div className="w-8 h-px bg-gray-100 my-1 shrink-0" />



          <Link
            href={userRole === 'อื่นๆ' ? '/department' : '/jobs'}
            prefetch={true}
            onMouseEnter={(e) => showTooltip(userRole === 'อื่นๆ' ? 'ระบบจัดการคิวงาน (Department)' : 'ระบบลงทะเบียนงาน (Jobs)', e)}
            onMouseLeave={hideTooltip}
            onClick={() => {
              const target = userRole === 'อื่นๆ' ? '/department' : '/jobs';
              if (activeRoute !== target) {
                setLoadingHref(target);
              }
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative group ${
              (activeRoute === '/jobs' || activeRoute === '/department')
                ? 'bg-red-50 text-[#ff2301] shadow-sm border border-red-100'
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {loadingHref === (userRole === 'อื่นๆ' ? '/department' : '/jobs') ? (
              <Loader2 size={20} className="animate-spin text-[#ff2301]" />
            ) : (
              <Briefcase size={20} strokeWidth={(activeRoute === '/jobs' || activeRoute === '/department') ? 2.5 : 2} className="transition-transform duration-200 group-hover:scale-105" />
            )}
            {(activeRoute === '/jobs' || activeRoute === '/department') && loadingHref !== (userRole === 'อื่นๆ' ? '/department' : '/jobs') && (
              <span className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-[#ff2301] border border-white animate-pulse" />
            )}
          </Link>

          {userRole !== 'อื่นๆ' && (
            <NotificationBell userId={userId} />
          )}

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
        className="md:hidden fixed left-4 bottom-4 z-50 bg-[#ff2301] text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition-all outline-none print:hidden"
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
        className={`md:hidden fixed top-0 bottom-0 left-0 w-[270px] bg-white border-r border-gray-100 flex flex-col py-8 px-5 z-50 transition-transform duration-300 ease-out transform shadow-2xl overflow-y-auto custom-scrollbar ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex flex-col w-full">
          <Link href={userRole === 'อื่นๆ' ? '/department' : (userRole || '').toLowerCase().includes('project') ? '/jobs' : '/dashboard'} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
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
              const isActive = href === bestMatchHref;
              const isLoading = loadingHref === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onClick={() => {
                    if (!isActive) {
                      setLoadingHref(href);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full h-12 rounded-xl flex items-center gap-3.5 px-4 transition-all duration-200 border ${
                    isActive
                      ? 'bg-red-50 text-[#ff2301] border-red-100 font-bold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="shrink-0 relative">
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-[#ff2301]" />
                    ) : (
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    )}
                    {href === '/accounting' && unpaidCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {unpaidCount > 99 ? '99+' : unpaidCount}
                      </span>
                    )}
                    {href === '/service/installation' && pendingInstallationCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingInstallationCount > 99 ? '99+' : pendingInstallationCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[14px] font-sans font-semibold tracking-wide flex-1">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Action buttons */}
        <div className="flex flex-col gap-4 w-full mt-auto pt-8">
          <div className="h-px bg-gray-100 w-full" />

          <CoinMiniWidget 
            isMobile={true} 
            activeRoute={activeRoute} 
            onClick={() => setIsMobileMenuOpen(false)}
          />



          <Link
            href={userRole === 'อื่นๆ' ? '/department' : '/jobs'}
            prefetch={true}
            onClick={() => {
              const target = userRole === 'อื่นๆ' ? '/department' : '/jobs';
              if (activeRoute !== target) {
                setLoadingHref(target);
              }
              setIsMobileMenuOpen(false);
            }}
            className={`w-full h-12 rounded-xl flex items-center gap-3.5 px-4 transition-all duration-200 border ${
              (activeRoute === '/jobs' || activeRoute === '/department')
                ? 'bg-red-50 text-[#ff2301] border-red-100 font-bold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
            }`}
          >
            <div className="shrink-0">
              {loadingHref === (userRole === 'อื่นๆ' ? '/department' : '/jobs') ? (
                <Loader2 size={18} className="animate-spin text-[#ff2301]" />
              ) : (
                <Briefcase size={18} strokeWidth={(activeRoute === '/jobs' || activeRoute === '/department') ? 2.5 : 2} />
              )}
            </div>
            <span className="text-[14px] font-sans font-semibold tracking-wide">{userRole === 'อื่นๆ' ? 'ระบบจัดการคิวงาน (Department)' : 'ระบบลงทะเบียนงาน (Jobs)'}</span>
          </Link>

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