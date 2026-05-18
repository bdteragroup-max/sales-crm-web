"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, PhoneCall,
  LogOut, TrendingUp, ChevronLeft, ChevronRight, Settings,
} from 'lucide-react';
import { logout } from '@/app/actions/auth';

type SidebarProps = {
  activeRoute?: string;
  userFullName?: string;
  userId?: string;
  userRole?: string;
};

export default function Sidebar(props: SidebarProps) {
  return props.userRole === 'ผู้จัดการ'
    ? <ManagerSidebar {...props} />
    : <RepSidebar {...props} />;
}

/* ─── Fade wrapper ────────────────────────────────────────────────────────────
   Renders children with a smooth opacity + translate animation.
   When `show` flips to false the element fades out, then unmounts after the
   CSS transition ends so it doesn't occupy space in collapsed mode.           */
function Fade({ show, children, className = '' }: { show: boolean; children: React.ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  if (!mounted) return null;

  return (
    <span
      onTransitionEnd={() => { if (!show) setMounted(false); }}
      className={`inline-block transition-all duration-300 ease-in-out origin-left ${show
        ? 'opacity-100 translate-x-0 scale-x-100'
        : 'opacity-0 -translate-x-2 scale-x-95 pointer-events-none'
        } ${className}`}
    >
      {children}
    </span>
  );
}

/* ─── Shared hook for hover / pin logic ──────────────────────────────────── */
function useSidebarState() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 500);
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const collapsed = !isHovered && !isPinned;

  return { collapsed, isPinned, setIsPinned, handleMouseEnter, handleMouseLeave };
}

// ─── Manager Sidebar (White / Red) ──────────────────────────────────────────
function ManagerSidebar({ activeRoute = '/dashboard', userFullName = 'User', userRole = 'ผู้จัดการ' }: SidebarProps) {
  const { collapsed, isPinned, setIsPinned, handleMouseEnter, handleMouseLeave } = useSidebarState();

  const nav = [
    { icon: <LayoutDashboard size={18} />, label: 'ภาพรวมทีม', href: '/dashboard' },
    { icon: <Users size={18} />, label: 'จัดการทีม', href: '/team' },
    { icon: <TrendingUp size={18} />, label: 'จัดการใบเสนอราคา', href: '/sales' },
    { icon: <CalendarDays size={18} />, label: 'จัดการตารางงาน', href: '/schedule' },
    { icon: <PhoneCall size={18} />, label: 'เทเลเซลล์', href: '/telesales' },
    { icon: <Users size={18} />, label: 'ลูกค้าและบริษัท', href: '/clients' },
    { icon: <Settings size={18} />, label: 'ตั้งค่าระบบ', href: '/settings' },
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${collapsed ? 'w-[80px]' : 'w-[260px]'} bg-white flex flex-col z-50 absolute md:relative shrink-0 h-screen transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-xl border-r border-gray-100`}
    >
      {/* Pin toggle */}
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`absolute -right-3 top-10 bg-white text-gray-400 p-1.5 rounded-full shadow-lg border border-gray-100 z-30 hover:text-brand-red transition-all duration-300 hover:scale-110 ${collapsed ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        {isPinned ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Logo */}
      <div className={`p-6 mb-2 transition-all duration-300 ${collapsed ? 'flex justify-center px-2' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-lg shadow-red-200 shrink-0 transition-transform duration-300">
            <TrendingUp size={22} className="text-white" />
          </div>
          <Fade show={!collapsed}>
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none italic">TeraSales</h1>
              <p className="text-[10px] font-bold text-brand-red uppercase tracking-[0.2em] mt-1.5">CRM System</p>
            </div>
          </Fade>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-hidden">
        {nav.map(({ icon, label, href }) => {
          const active = activeRoute === href;
          return (
            <a
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${active ? 'bg-red-50 text-brand-red border border-red-100' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}
                ${collapsed ? 'justify-center' : ''}`}
            >
              <div className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
              </div>
              <Fade show={!collapsed}>
                <span className="font-bold text-[14px] whitespace-nowrap">{label}</span>
              </Fade>
            </a>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="mt-auto p-4 bg-gray-50/50 border-t border-gray-100">
        <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-300 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-brand-red font-black text-lg shrink-0 border border-red-50">
            {userFullName.charAt(0)}
          </div>
          <Fade show={!collapsed}>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-gray-900 truncate">{userFullName}</p>
              <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-tighter">{userRole}</p>
            </div>
          </Fade>
        </div>
        <form action={logout}>
          <button
            className={`group w-full mt-3 flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 font-black text-[11px] uppercase tracking-widest ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            <Fade show={!collapsed}>
              <span>ออกจากระบบ</span>
            </Fade>
          </button>
        </form>
      </div>
    </aside>
  );
}

// ─── Rep Sidebar (White / Red) ───────────────────────────────────────────────
function RepSidebar({ activeRoute = '/dashboard', userFullName = 'User', userRole = 'ตัวแทนฝ่ายขาย' }: SidebarProps) {
  const { collapsed, isPinned, setIsPinned, handleMouseEnter, handleMouseLeave } = useSidebarState();

  const nav = [
    { icon: <LayoutDashboard size={18} />, label: 'ภาพรวมของฉัน', href: '/dashboard' },
    { icon: <TrendingUp size={18} />, label: 'บันทึกใบเสนอราคา', href: '/sales' },
    { icon: <CalendarDays size={18} />, label: 'ตารางงานของฉัน', href: '/schedule' },
    { icon: <PhoneCall size={18} />, label: 'เทเลเซลล์', href: '/telesales' },
    { icon: <Users size={18} />, label: 'ลูกค้าและบริษัท', href: '/clients' },
    { icon: <Settings size={18} />, label: 'ตั้งค่าระบบ', href: '/settings' },
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${collapsed ? 'w-[80px]' : 'w-[260px]'} bg-white flex flex-col z-50 absolute md:relative shrink-0 h-screen transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-xl border-r border-gray-100`}
    >
      <button
        onClick={() => setIsPinned(!isPinned)}
        className={`absolute -right-3 top-10 bg-white text-gray-400 p-1.5 rounded-full shadow-lg border border-gray-100 z-30 hover:text-red-600 transition-all duration-300 hover:scale-110 ${collapsed ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        {isPinned ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Logo */}
      <div className={`p-6 mb-2 transition-all duration-300 ${collapsed ? 'flex justify-center px-2' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-lg shadow-red-200 shrink-0 transition-transform duration-300">
            <TrendingUp size={22} className="text-white" />
          </div>
          <Fade show={!collapsed}>
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none italic">TeraSales</h1>
              <p className="text-[10px] font-bold text-brand-red uppercase tracking-[0.2em] mt-1.5">CRM System</p>
            </div>
          </Fade>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-hidden">
        {nav.map(({ icon, label, href }) => {
          const active = activeRoute === href;
          return (
            <a
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${active ? 'bg-red-50 text-brand-red border border-red-100' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}
                ${collapsed ? 'justify-center' : ''}`}
            >
              <div className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
              </div>
              <Fade show={!collapsed}>
                <span className="font-bold text-[14px] whitespace-nowrap">{label}</span>
              </Fade>
            </a>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="mt-auto p-4 bg-gray-50/50 border-t border-gray-100">
        <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-300 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-brand-red font-black text-lg shrink-0 border border-red-50">
            {userFullName.charAt(0)}
          </div>
          <Fade show={!collapsed}>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-gray-900 truncate">{userFullName}</p>
              <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-tighter">{userRole}</p>
            </div>
          </Fade>
        </div>
        <form action={logout}>
          <button
            className={`group w-full mt-3 flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 font-black text-[11px] uppercase tracking-widest ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            <Fade show={!collapsed}>
              <span>ออกจากระบบ</span>
            </Fade>
          </button>
        </form>
      </div>
    </aside>
  );
}