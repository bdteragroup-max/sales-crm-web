"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Users, CalendarDays, Calendar, PhoneCall, Building2,
  LogOut, TrendingUp, Settings, Bell, Loader2, Menu, X, GitCommit, Briefcase, Wrench, DollarSign, FileText, FileSignature, ExternalLink, ClipboardList, UserSquare, Calculator, FolderOpen, MapPin, ShoppingCart, Package, Boxes, Coins, Kanban, Activity, LifeBuoy, Tv, UserCircle, Layers, Check, Megaphone, ShieldCheck, FileCheck, Receipt, ClipboardCheck, ShieldAlert, RotateCcw, Sparkles, PanelLeftClose, PanelLeftOpen, Search
} from 'lucide-react';
import { isSuperUser, isReadOnlyExecutive, canManageAllPaymentRequests } from '@/app/lib/roleHelper';
import { logout, getMyDepartment } from '@/app/actions/auth';
import { getPendingPaymentTaskCount } from '@/app/actions/accounting';
import { getPendingInstallationCount } from '@/app/actions/installationOrders';
import { getPendingRepairOrderCount } from '@/app/actions/repairOrders';
import { getPendingOutsourceRepairCount } from '@/app/actions/outsourceRepairs';
import { getPendingRepairDeliveryCount, getPendingSalesDeliveryAckCount, getPendingAccountingDeliveryCount } from '@/app/actions/repairDeliveries';
import { getPendingEstimationCount } from '@/app/actions/estimations';
import { getPendingMarketingRequestCount } from '@/app/actions/marketingRequests';
import { getUnreadMarketingBoardCount } from '@/app/actions/marketingBoard';
import { getBranchContentSidebarAccess } from '@/app/actions/branchContent';
import { getPendingServiceClaimCount } from '@/app/actions/serviceClaims';
import { getOpenServiceCallCount, getPendingServiceHandoverCount } from '@/app/actions/service-calls';
import CoinMiniWidget from './CoinMiniWidget';
import NotificationBell from './NotificationBell'; // HMR flush

type SidebarProps = {
  activeRoute?: string;
  userFullName?: string;
  userId?: string;
  userRole?: string;
  theme?: 'red' | 'blue' | 'purple' | 'green';
};

type NavItem = { icon: React.ElementType; label: string; href: string };

const executiveNav = [
  // ── 1. Executive Suite ──
  { icon: LayoutDashboard, label: 'Executive KPI (สรุปภาพรวมผู้บริหาร)', href: '/executive/kpi' },
  { icon: GitCommit, label: 'Pipeline Forecast (คาดการณ์ยอดขาย)', href: '/executive/pipeline' },
  { icon: Bell, label: 'SLA & Bottleneck Monitor (ติดตามคอขวด)', href: '/executive/sla' },

  // ── 2. Operations & Engineering ──
  { icon: Briefcase, label: 'ติดตามงานทั้งหมด (Master Jobs Tracker)', href: '/jobs' },
  { icon: PhoneCall, label: 'Service Desk (แจ้งปัญหาลูกค้า)', href: '/service/calls' },
  { icon: FileSignature, label: 'ใบส่งมอบงาน (Repair Deliveries)', href: '/repair-deliveries' },
  { icon: ShieldAlert, label: 'ระบบแจ้งเคลม (Service Claims)', href: '/service/claims' },
  { icon: ShieldAlert, label: 'ติดตามสินค้าชำรุด (Damage Tracking)', href: '/damage-reports/accounting' },
  { icon: FolderOpen, label: 'ภาพรวมโครงการ (Projects Dashboard)', href: '/projects/dashboard' },
  { icon: Boxes, label: 'ภาพรวมฝ่ายผลิต (Production Dashboard)', href: '/production/dashboard' },
  { icon: Wrench, label: 'ภาพรวมงานบริการ (Service Overview)', href: '/executive/service' },
  { icon: CalendarDays, label: 'ตารางงานช่าง (Technician Schedule)', href: '/technician/schedule' },

  // ── 3. Marketing & Commercial ──
  { icon: Megaphone, label: 'กระดานการตลาด (Marketing Board)', href: '/marketing-board' },
  { icon: Sparkles, label: 'บอร์ดคอนเทนต์สาขา (Branch Content Board)', href: '/marketing-board/branch-content' },
  { icon: Tv, label: 'แดชบอร์ดการตลาดและโฆษณา (Marketing & Ads)', href: '/marketing/dashboard' },
  { icon: Users, label: 'ทะเบียนลูกค้า (Client 360)', href: '/clients' },

  // ── 4. Finance, Procurement & Rewards ──
  { icon: DollarSign, label: 'แดชบอร์ดการเงิน/บัญชี (Finance & Accounting)', href: '/accounting/dashboard' },
  { icon: FileSignature, label: 'รับใบส่งมอบงานจากเซลล์ (วางบิล/บัญชี)', href: '/accounting/delivery-handovers' },
  { icon: Receipt, label: 'ขอเบิกจ่ายเงิน (Payment Request)', href: '/accounting/payment-requests/new' },
  { icon: FileCheck, label: 'ทะเบียนขอจ่ายเงิน (Payment Requests)', href: '/accounting/payment-requests' },
  { icon: Package, label: 'เจ้าหนี้การค้า (AP Payables)', href: '/accounting/payables' },
  { icon: ShoppingCart, label: 'ภาพรวมจัดซื้อ (Purchasing Overview)', href: '/executive/purchasing' },
  { icon: Coins, label: 'ภาพรวมเหรียญรางวัล (Coins & Rewards)', href: '/executive/coins' },

  // ── 5. System ──
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

const managerNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมทีม', href: '/dashboard' },
  { icon: Receipt, label: 'ขอเบิกจ่ายเงิน (Payment Request)', href: '/accounting/payment-requests/new' },
  { icon: FileCheck, label: 'ทะเบียนขอจ่ายเงิน/อนุมัติ (Payment Requests)', href: '/accounting/payment-requests' },
  { icon: Megaphone, label: 'กระดานการตลาด (Marketing Board)', href: '/marketing-board' },
  { icon: GitCommit, label: 'ท่อดีลฝ่ายขาย', href: '/pipeline' },
  { icon: Bell, label: 'Leads จาก Marketing', href: '/sales/leads' },
  { icon: Wrench, label: 'งานส่งต่อจากเซอร์วิส (เปิดใบเสนอราคา)', href: '/sales/service-handovers' },
  { icon: FileSignature, label: 'ใบส่งมอบงานที่เซ็นแล้ว (เซลล์รับทราบ)', href: '/sales/delivery-acknowledgements' },
  { icon: TrendingUp, label: 'จัดการใบเสนอราคา', href: '/sales' },
  { icon: DollarSign, label: 'บันทึกค่าใช้จ่าย', href: '/sales/expenses' },
  { icon: FileText, label: 'ใบรับความต้องการ', href: '/sales/requirements' },
  { icon: MapPin, label: 'สำรวจไซต์งาน', href: '/sales/surveys' },
  { icon: PhoneCall, label: 'Service Desk (แจ้งปัญหาลูกค้า)', href: '/service/calls' },
  { icon: Calendar, label: 'ตารางงานเซอร์วิส', href: '/service/schedules' },
  { icon: LayoutDashboard, label: 'Marketing', href: '/marketing' },
  { icon: Users, label: 'จัดการทีม', href: '/team' },
  { icon: MapPin, label: 'ตรวจสอบ GPS ลงเวลา', href: '/department/checkins' },
  { icon: FileText, label: 'รายงานใช้น้ำมัน & GPS', href: '/department/fuel-report' },
  { icon: CalendarDays, label: 'จัดการตารางงาน', href: '/schedule' },
  { icon: PhoneCall, label: 'เทเลเซลล์', href: '/telesales' },
  { icon: Users, label: 'ลูกค้าและผู้ติดต่อ', href: '/clients' },
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

const repNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมของฉัน', href: '/dashboard' },
  { icon: Megaphone, label: 'กระดานการตลาด (Marketing Board)', href: '/marketing-board' },
  { icon: GitCommit, label: 'ท่อดีลของฉัน', href: '/pipeline' },
  { icon: Bell, label: 'Leads จาก Marketing', href: '/sales/leads' },
  { icon: Wrench, label: 'งานส่งต่อจากเซอร์วิส (เปิดใบเสนอราคา)', href: '/sales/service-handovers' },
  { icon: FileSignature, label: 'ใบส่งมอบงานที่เซ็นแล้ว (เซลล์รับทราบ)', href: '/sales/delivery-acknowledgements' },
  { icon: TrendingUp, label: 'บันทึกใบเสนอราคา', href: '/sales' },
  { icon: DollarSign, label: 'บันทึกค่าใช้จ่าย', href: '/sales/expenses' },
  { icon: FileText, label: 'ใบรับความต้องการ', href: '/sales/requirements' },
  { icon: MapPin, label: 'สำรวจไซต์งาน', href: '/sales/surveys' },
  { icon: PhoneCall, label: 'Service Desk (แจ้งปัญหาลูกค้า)', href: '/service/calls' },
  { icon: Calendar, label: 'ตารางงานเซอร์วิส', href: '/service/schedules' },
  { icon: CalendarDays, label: 'ตารางงานของฉัน', href: '/schedule' },
  { icon: PhoneCall, label: 'เทเลเซลล์', href: '/telesales' },
  { icon: Users, label: 'ลูกค้าและผู้ติดต่อ', href: '/clients' },
  { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
];

const serviceNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมฝ่ายบริการ', href: '/service/dashboard' },
  { icon: ShieldAlert, label: 'รายการแจ้งเคลม (Claims Intake)', href: '/service/claims' },
  { icon: PhoneCall, label: 'Service Desk', href: '/service/calls' },
  { icon: ClipboardCheck, label: 'ตรวจเช็ค & Fault Report (CR)', href: '/service/check-reports' },
  { icon: Wrench, label: 'ใบรับซ่อม (ซ่อมใน)', href: '/repair-orders' },
  { icon: ExternalLink, label: 'ใบส่งซ่อม (ซ่อมภายนอก)', href: '/outsource-repairs' },
  { icon: FileSignature, label: 'ใบส่งมอบงาน', href: '/repair-deliveries' },
  { icon: ClipboardList, label: 'แดชบอร์ดงานติดตั้ง', href: '/service/installation' },
  { icon: Calculator, label: 'ประเมินราคางานซ่อม/ประกอบ', href: '/service/estimations' },
  { icon: UserSquare, label: 'งานของฉัน', href: '/service/my-tasks' },
  { icon: CalendarDays, label: 'ตารางงานช่าง (Technician Tasks)', href: '/technician/schedule' },
  { icon: Calendar, label: 'ตารางงานเซอร์วิส', href: '/service/schedules' },
  { icon: Kanban, label: 'กระดานงาน (Kanban)', href: '/marketing/kanban' },
  { icon: Package, label: 'ใบส่งคืนสินค้า', href: '/service/goods-returns' },

];

const serviceMgrNav = [
  { icon: LayoutDashboard, label: 'MGR Dashboard & Import', href: '/service-mgr/calls' },
];

const technicianNav = [
  { icon: Wrench, label: 'งานผลิตของฉัน (Cabinet)', href: '/technician/production' },
  { icon: PhoneCall, label: 'Service Desk (แจ้งปัญหาลูกค้า)', href: '/service/calls' },
  { icon: ShieldAlert, label: 'รายการแจ้งเคลม (Claims)', href: '/service/claims' },
  { icon: ClipboardCheck, label: 'ตรวจเช็ค & Fault Report (CR)', href: '/service/check-reports' },
  { icon: FileSignature, label: 'ใบส่งมอบงาน', href: '/repair-deliveries' },
  { icon: CalendarDays, label: 'ตารางงานช่าง (Technician Tasks)', href: '/technician/schedule' },
  { icon: Building2, label: 'งานซ่อมสถานที่ (Facility Repairs)', href: '/technician/facility-repairs' },
  { icon: ExternalLink, label: 'ใบส่งซ่อม (ซ่อมภายนอก)', href: '/outsource-repairs' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
];

const backofficeNav = [
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
];

const purchasingNav = [
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
  { icon: LayoutDashboard, label: 'แดชบอร์ดจัดซื้อ', href: '/admin/procurement/dashboard' },
  { icon: FileText, label: 'รายการ PR', href: '/admin/procurement/pr' },
  { icon: ClipboardList, label: 'รายการ PO', href: '/admin/procurement/po' },
];

const storeNav = [
  { icon: LayoutDashboard, label: 'แดชบอร์ดสโตร์', href: '/store/dashboard' },
  { icon: ShieldAlert, label: 'แจ้งเคลมสินค้า (Service Claim)', href: '/service/claims' },
  { icon: ShieldAlert, label: 'แจ้งสินค้าชำรุดเสียหาย (Damage Report)', href: '/damage-reports' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
  { icon: ShoppingCart, label: 'รับสินค้า (PO)', href: '/store/receive' },
  { icon: Package, label: 'รายการเบิก/ยืมวัสดุอุปกรณ์', href: '/store/requisitions' },
  { icon: RotateCcw, label: 'ใบส่งคืนสินค้า (Return Note)', href: '/store/returns' },
];

const storeAndPurchasingNav = [
  { icon: LayoutDashboard, label: 'แดชบอร์ดสโตร์', href: '/store/dashboard' },
  { icon: ShieldAlert, label: 'แจ้งเคลมสินค้า (Service Claim)', href: '/service/claims' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
  { icon: ShoppingCart, label: 'รับสินค้า (PO)', href: '/store/receive' },
  { icon: Package, label: 'รายการเบิก/ยืมวัสดุอุปกรณ์', href: '/store/requisitions' },
  { icon: RotateCcw, label: 'ใบส่งคืนสินค้า (Return Note)', href: '/store/returns' },
  { icon: LayoutDashboard, label: 'แดชบอร์ดจัดซื้อ', href: '/admin/procurement/dashboard' },
  { icon: FileText, label: 'รายการ PR', href: '/admin/procurement/pr' },
  { icon: ClipboardList, label: 'รายการ PO', href: '/admin/procurement/po' },
];

const projectNav = [
  { icon: FolderOpen, label: 'โครงการของฉัน', href: '/projects' },
  { icon: CalendarDays, label: 'ตารางงานช่าง (Technician Tasks)', href: '/technician/schedule' },
  { icon: MapPin, label: 'แบบสำรวจไซต์งาน', href: '/sales/surveys' },
  { icon: Calculator, label: 'ประเมินราคางานซ่อม/ประกอบ', href: '/service/estimations' },
  { icon: Kanban, label: 'กระดานงาน (Kanban)', href: '/marketing/kanban' },
];

const marketingNav = [
  { icon: LayoutDashboard, label: 'Marketing Dashboard', href: '/marketing/dashboard' },
  { icon: Megaphone, label: 'กระดานการตลาด (Marketing Board)', href: '/marketing-board' },
  { icon: Sparkles, label: 'บอร์ดคอนเทนต์สาขา (Branch Content Board)', href: '/marketing-board/branch-content' },
  { icon: Megaphone, label: 'คำขอการตลาด (Marketing Request)', href: '/marketing/requests' },
  { icon: Tv, label: 'แดชบอร์ดโฆษณา (Ads Dashboard)', href: '/marketing/ads/dashboard' },
  { icon: FolderOpen, label: 'แคมเปญโฆษณา (Ads Campaigns)', href: '/marketing/ads/campaigns' },
  { icon: Users, label: 'Marketing Leads', href: '/marketing' },
  { icon: ClipboardList, label: 'แบบสอบถามความพึงพอใจ', href: '/marketing/satisfaction' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
  { icon: Kanban, label: 'กระดานงาน (Kanban)', href: '/marketing/kanban' },
];

const marketingManagerNav = [
  { icon: Settings, label: 'ตั้งค่าข้อมูลพื้นฐาน (Ads Master Data)', href: '/admin/ads/master-data' }
];

const projectAdminNav = [
  { icon: LayoutDashboard, label: 'ภาพรวมโครงการ', href: '/projects/dashboard' },
  { icon: FolderOpen, label: 'จัดการโครงการ', href: '/projects' },
  { icon: MapPin, label: 'แบบสำรวจไซต์งาน', href: '/sales/surveys' },
  { icon: Kanban, label: 'กระดานงาน (Kanban)', href: '/marketing/kanban' },
];

const productionNav = [
  { icon: LayoutDashboard, label: 'Production Dashboard', href: '/production/dashboard' },
  { icon: Package, label: 'สถานะคำสั่งผลิต', href: '/orders' },
  { icon: ShieldAlert, label: 'แจ้งเคลมสินค้า (QC Claim)', href: '/service/claims' },
  { icon: ClipboardList, label: 'ตรวจสอบคุณภาพ (QC)', href: '/production/qc' },
  { icon: Activity, label: 'ทดสอบการทำงาน (FAT)', href: '/production/fat' },
  { icon: ExternalLink, label: 'ใบส่งซ่อม (ซ่อมภายนอก)', href: '/outsource-repairs' },
  { icon: Boxes, label: 'ผลิตเพื่อสต็อก (Stock)', href: '/production/stock' },
  { icon: Users, label: 'ภาระงานช่าง (Workload)', href: '/production/workload' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
];

const accountingNav = [
  { icon: LayoutDashboard, label: 'แดชบอร์ดบัญชี/การเงิน', href: '/accounting/dashboard' },
  { icon: FileSignature, label: 'รับใบส่งมอบงานจากเซลล์ (วางบิล/บัญชี)', href: '/accounting/delivery-handovers' },
  { icon: ShieldAlert, label: 'ติดตามสินค้าชำรุด (Damage Tracking)', href: '/damage-reports/accounting' },
  { icon: Receipt, label: 'ขอเบิกจ่ายเงิน (Payment Request)', href: '/accounting/payment-requests/new' },
  { icon: FileCheck, label: 'ทะเบียนขอจ่ายเงิน (Payment Requests)', href: '/accounting/payment-requests' },
  { icon: ShieldCheck, label: 'ตั้งค่าเครดิตลูกค้า (Credit Settings)', href: '/accounting/credit-settings' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
  { icon: DollarSign, label: 'ลูกหนี้การค้า (AR Collections)', href: '/accounting' },
  { icon: Package, label: 'เจ้าหนี้การค้า (AP Payables)', href: '/accounting/payables' },
  { icon: FileText, label: 'รายงานใช้น้ำมัน & GPS', href: '/department/fuel-report' },
];

const bdNav = [
  { icon: LayoutDashboard, label: 'BD Dashboard', href: '/bd/dashboard' },
  { icon: Megaphone, label: 'คำขอการตลาด (Marketing Request)', href: '/marketing/requests/new' },
  { icon: UserCircle, label: 'งานของฉัน (My Work)', href: '/bd/my-work' },
  { icon: FileText, label: 'BD Intake', href: '/bd/intake' },
  { icon: Kanban, label: 'กระดานงาน (Kanban)', href: '/bd/kanban' },
  { icon: TrendingUp, label: 'รายงานพัฒนาธุรกิจ (Reports)', href: '/bd/reports' },
  { icon: Briefcase, label: 'ระบบคิวงานแผนก', href: '/department' },
  { icon: LifeBuoy, label: 'จัดการปัญหาระบบ (Tickets)', href: '/bd/tickets' },
  { icon: Building2, label: 'แจ้งซ่อมสถานที่ (Report Repair)', href: '/facility-repairs/new' },
  { icon: Tv, label: 'Team Overview (TV)', href: '/bd/tickets/tv' },
  { icon: Receipt, label: 'ขอเบิกจ่ายเงิน (Payment Request)', href: '/accounting/payment-requests/new' },
  { icon: Package, label: 'เบิกของโครงการ / เบิกยืมอุปกรณ์', href: '/requisitions' }
];

const commonNav = [
  { icon: FileSignature, label: 'ใบส่งมอบงาน (Repair Deliveries)', href: '/repair-deliveries' },
  { icon: ShieldAlert, label: 'แจ้งเคลมสินค้า (Service Claim)', href: '/service/claims' },
  { icon: ShieldAlert, label: 'แจ้งสินค้าชำรุดเสียหาย (Damage Report)', href: '/damage-reports' },
  { icon: Megaphone, label: 'กระดานการตลาด (Marketing Board)', href: '/marketing-board' },
  { icon: Megaphone, label: 'คำขอการตลาด (Marketing Request)', href: '/marketing/requests/new' },
  { icon: Receipt, label: 'ขอเบิกจ่ายเงิน (Payment Request)', href: '/accounting/payment-requests/new' },
  { icon: LifeBuoy, label: 'แจ้งปัญหาระบบ', href: '/support/tickets' },
  { icon: Building2, label: 'แจ้งซ่อมสถานที่ (Report Repair)', href: '/facility-repairs/new' },
  { icon: Package, label: 'เบิกของโครงการ / เบิกยืมอุปกรณ์', href: '/requisitions' }
];

export default function SidebarClient(props: SidebarProps) {
  let nav = repNav;
  const roleStr = (props.userRole || '').toLowerCase();
  const isTechnician = roleStr.includes('technician') || roleStr === 'ช่าง' || roleStr.includes('ช่างประกอบ') || roleStr.includes('ช่างตู้');

  const isExecutive = isReadOnlyExecutive(roleStr);
  const isSuperAdmin = isSuperUser(roleStr);
  const isManager = roleStr === 'ผู้จัดการ' || roleStr === 'manager' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด' || roleStr === 'ผู้การจัดการตลาด';

  const allNavs = [
    ...executiveNav, ...managerNav, ...repNav, ...serviceNav, ...serviceMgrNav, ...technicianNav,
    ...purchasingNav, ...storeNav, ...projectNav, ...marketingNav, ...marketingManagerNav, ...productionNav, ...bdNav,
    ...commonNav
  ];
  const superAdminNav = Array.from(new Map(allNavs.map(item => [item.href, item])).values());

  if (isSuperAdmin) {
    nav = superAdminNav;
  } else if (isExecutive) {
    nav = executiveNav;
  } else if (['marketing', 'การตลาด'].some(r => roleStr.includes(r))) {
    if (isManager) {
      nav = Array.from(new Map([...managerNav, ...marketingNav, ...marketingManagerNav].map(item => [item.href, item])).values());
    } else {
      nav = marketingNav;
    }
  } else if (isManager) {
    nav = managerNav;
  } else if (roleStr.includes('admin project') || roleStr.includes('project admin')) {
    nav = projectAdminNav;
  } else if (isTechnician) {
    nav = technicianNav;
  } else if (roleStr === 'อื่นๆ' || roleStr.includes('service') || roleStr.includes('บริการ') || roleStr.includes('ซ่อม')) {
    nav = serviceNav; // Service / non-sales departments see repair orders
    if (roleStr.includes('mgr') || roleStr.includes('manager')) {
      nav = [...nav, ...serviceMgrNav];
    }
  } else if (['accounting', 'บัญชี', 'finance', 'การเงิน'].some(r => roleStr.includes(r))) {
    nav = accountingNav;
  } else if (['project', 'โปรเจค', 'โปรเจกต์'].some(r => roleStr.includes(r))) {
    nav = projectNav; // Project users see their projects
  } else if (roleStr === 'ผู้จัดการคลังสินค้าและจัดซื้อ' || (roleStr.includes('คลังสินค้า') && roleStr.includes('จัดซื้อ'))) {
    nav = storeAndPurchasingNav;
  } else if (roleStr.includes('production') || roleStr.includes('ผลิต')) {
    nav = productionNav;
  } else if (['purchasing', 'จัดซื้อ'].some(r => roleStr.includes(r))) {
    nav = purchasingNav;
  } else if (['warehouse', 'คลังสินค้า', 'store', 'สโตร์'].some(r => roleStr.includes(r))) {
    nav = storeNav;
  } else if (['business development', 'bd', 'พัฒนาธุรกิจ'].some(r => roleStr.includes(r))) {
    nav = bdNav;
  } else if (['admin', 'ขนส่ง', 'shipping', 'logistics', 'โลจิสติกส์'].some(r => roleStr.includes(r))) {
    // Note: If admin needs procurement links, we can assign them purchasingNav or managerNav
    // But currently admin is grouped here. Let's give admin the purchasingNav as well, 
    // since we allowed admin in page.tsx
    if (roleStr === 'admin') {
      nav = purchasingNav;
    } else {
      nav = backofficeNav; // Back-office non-sales see their own department queue
    }
  }

  const isBdRole = ['business development', 'bd', 'พัฒนาธุรกิจ'].some(r => roleStr.includes(r));
  const isMarketingRole = ['marketing', 'การตลาด', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด'].some(r => roleStr.includes(r));
  let navToAppend = isExecutive ? [] : commonNav;

  if (isBdRole) {
    navToAppend = navToAppend.filter(item => !['/marketing/requests/new', '/facility-repairs/new', '/support/tickets'].includes(item.href));
  }
  if (isTechnician) {
    navToAppend = navToAppend.filter(item => item.href !== '/facility-repairs/new');
  }
  if (isMarketingRole) {
    navToAppend = navToAppend.filter(item => item.href !== '/marketing/requests/new');
  }

  const finalNav = Array.from(new Map([...nav, ...navToAppend].map(item => [item.href, item])).values());

  // Guarantee that /repair-deliveries is ALWAYS visible to all roles
  if (!finalNav.some(item => item.href === '/repair-deliveries')) {
    finalNav.push({
      icon: FileSignature,
      label: 'ใบส่งมอบงาน (Repair Deliveries)',
      href: '/repair-deliveries',
    });
  }

  // Guarantee that /requisitions is ALWAYS visible to all employees & provincial branches
  if (!finalNav.some(item => item.href === '/requisitions')) {
    finalNav.push({
      icon: Package,
      label: 'เบิกของโครงการ / เบิกยืมอุปกรณ์',
      href: '/requisitions',
    });
  }

  // Guarantee that /accounting/payment-requests/new is ALWAYS visible to all department roles
  if (!finalNav.some(item => item.href === '/accounting/payment-requests/new')) {
    finalNav.push({
      icon: Receipt,
      label: 'ขอเบิกจ่ายเงิน (Payment Request)',
      href: '/accounting/payment-requests/new',
    });
  }

  const isAccountingUser = canManageAllPaymentRequests(props.userRole);
  if (!finalNav.some(item => item.href === '/accounting/payment-requests')) {
    finalNav.push({
      icon: FileCheck,
      label: isAccountingUser ? 'ทะเบียนขอจ่ายเงิน (Payment Requests)' : 'สถานะคำขอเบิกเงิน (My Requests)',
      href: '/accounting/payment-requests',
    });
  }

  const appendCommon = (items: NavItem[]) =>
    Array.from(new Map([...items, ...commonNav].map(item => [item.href, item])).values());

  const superAdminContexts = isSuperAdmin ? {
    'All (Default)': superAdminNav,
    'Store & Warehouse': appendCommon(storeNav),
    'Executive': appendCommon(executiveNav),
    'Sales & Marketing': appendCommon([...managerNav, ...repNav, ...marketingNav, ...marketingManagerNav]),
    'Service & Technician': appendCommon([...serviceNav, ...serviceMgrNav, ...technicianNav]),
    'Projects & Production': appendCommon([...projectNav, ...productionNav]),
    'Admin & Finance': appendCommon([...purchasingNav, ...storeNav, ...bdNav, ...accountingNav])
  } : undefined;

  return <ResponsiveSidebar {...props} nav={finalNav} isSuperAdmin={isSuperAdmin} superAdminContexts={superAdminContexts} />;
}

function ResponsiveSidebar({
  activeRoute = '/dashboard',
  userFullName = 'User',
  userRole = 'ตัวแทนฝ่ายขาย',
  userId,
  theme,
  nav: defaultNav,
  isSuperAdmin,
  superAdminContexts,
}: SidebarProps & { nav: NavItem[], isSuperAdmin?: boolean, superAdminContexts?: Record<string, NavItem[]> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [unpaidCount, setUnpaidCount] = useState(0);
  const [pendingInstallationCount, setPendingInstallationCount] = useState(0);
  const [pendingRepairCount, setPendingRepairCount] = useState(0);
  const [pendingOutsourceCount, setPendingOutsourceCount] = useState(0);
  const [pendingDeliveryCount, setPendingDeliveryCount] = useState(0);
  const [pendingEstimationCount, setPendingEstimationCount] = useState(0);
  const [pendingMarketingRequestCount, setPendingMarketingRequestCount] = useState(0);
  const [unreadMarketingBoardCount, setUnreadMarketingBoardCount] = useState(0);
  const [pendingBranchContentCount, setPendingBranchContentCount] = useState(0);
  const [canAccessBranchContent, setCanAccessBranchContent] = useState<boolean>(false);
  const [pendingClaimCount, setPendingClaimCount] = useState(0);
  const [openServiceCallCount, setOpenServiceCallCount] = useState(0);
  const [pendingServiceHandoverCount, setPendingServiceHandoverCount] = useState(0);
  const [pendingSalesDeliveryAckCount, setPendingSalesDeliveryAckCount] = useState(0);
  const [pendingAccountingDeliveryCount, setPendingAccountingDeliveryCount] = useState(0);

  const [selectedContext, setSelectedContext] = useState<string>('All (Default)');
  const [isContextSwitcherOpen, setIsContextSwitcherOpen] = useState(false);
  const contextSwitcherRef = useRef<HTMLDivElement>(null);

  // Desktop Expanded / Collapsed State (Default: Expanded so all roles see icon + menu name)
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [menuSearch, setMenuSearch] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedExpanded = localStorage.getItem('sidebarExpanded_v1');
      if (savedExpanded === 'false') {
        setIsExpanded(false);
      } else if (savedExpanded === 'true') {
        setIsExpanded(true);
      }
    }
  }, []);

  const toggleSidebarExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarExpanded_v1', String(next));
      }
      if (next) {
        setTooltip(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      const savedContext = localStorage.getItem('superAdminViewContext');
      if (savedContext && superAdminContexts && superAdminContexts[savedContext]) {
        setSelectedContext(savedContext);
      }
    }
  }, [isSuperAdmin, superAdminContexts]);

  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      const cached = sessionStorage.getItem(`branchContentAccess_${userId}`);
      if (cached === 'true') setCanAccessBranchContent(true);
      else if (cached === 'false') setCanAccessBranchContent(false);
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextSwitcherRef.current && !contextSwitcherRef.current.contains(event.target as Node)) {
        setIsContextSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const baseNav = isSuperAdmin && superAdminContexts && superAdminContexts[selectedContext] ? superAdminContexts[selectedContext] : defaultNav;
  const nav = React.useMemo(() => {
    if (canAccessBranchContent) {
      if (baseNav.some(item => item.href === '/marketing-board/branch-content')) {
        return baseNav;
      }
      const next = [...baseNav];
      const mktIdx = next.findIndex(item => item.href === '/marketing-board');
      const branchContentItem: NavItem = {
        icon: Sparkles,
        label: 'บอร์ดคอนเทนต์สาขา (Branch Content Board)',
        href: '/marketing-board/branch-content',
      };
      if (mktIdx !== -1) {
        next.splice(mktIdx + 1, 0, branchContentItem);
      } else {
        next.push(branchContentItem);
      }
      return next;
    }
    return baseNav.filter(item => item.href !== '/marketing-board/branch-content');
  }, [baseNav, canAccessBranchContent]);

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
      getPendingPaymentTaskCount().then(setUnpaidCount).catch(() => { });
    }

    const isServiceUser = roleStr === 'อื่นๆ' || roleStr.includes('service') || roleStr.includes('technician') || roleStr.includes('บริการ') || roleStr.includes('ซ่อม') || roleStr.includes('ช่าง') || roleStr === 'ผู้จัดการ' || roleStr === 'sales manager' || roleStr === 'marketing manager' || roleStr === 'ผู้จัดการฝ่ายการตลาด' || roleStr === 'ผู้จัดการการตลาด' || roleStr === 'ผู้บริหาร' || roleStr === 'executive' || roleStr === 'super_admin';
    if (isServiceUser) {
      getPendingInstallationCount().then(setPendingInstallationCount).catch(() => { });
      getPendingRepairOrderCount().then(setPendingRepairCount).catch(() => { });
      getPendingOutsourceRepairCount().then(setPendingOutsourceCount).catch(() => { });
      getPendingEstimationCount().then(setPendingEstimationCount).catch(() => { });
    }

    getPendingRepairDeliveryCount().then(setPendingDeliveryCount).catch(() => { });
    getPendingMarketingRequestCount().then(setPendingMarketingRequestCount).catch(() => { });
    getUnreadMarketingBoardCount().then(setUnreadMarketingBoardCount).catch(() => { });
    getBranchContentSidebarAccess()
      .then((res) => {
        setCanAccessBranchContent(res.canAccess);
        setPendingBranchContentCount(res.pendingCount);
        if (typeof window !== 'undefined' && userId) {
          sessionStorage.setItem(`branchContentAccess_${userId}`, String(res.canAccess));
        }
      })
      .catch(() => { });
    getPendingServiceClaimCount().then(setPendingClaimCount).catch(() => { });
    getOpenServiceCallCount().then(setOpenServiceCallCount).catch(() => { });
    getPendingServiceHandoverCount().then(setPendingServiceHandoverCount).catch(() => { });
    getPendingSalesDeliveryAckCount().then(setPendingSalesDeliveryAckCount).catch(() => { });
    getPendingAccountingDeliveryCount().then(setPendingAccountingDeliveryCount).catch(() => { });
  }, [router, baseNav, userRole, userId]);

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
  const bestMatchHref = sortedNav.find(n =>
    currentFullPath === n.href ||
    pathname === n.href ||
    pathname.startsWith(n.href + '/') ||
    (pathname.startsWith('/marketing/requests') && n.href.startsWith('/marketing/requests'))
  )?.href || activeRoute;

  const currentTheme = theme || 'red';

  const getThemeColors = () => {
    switch (currentTheme) {
      case 'blue': return { bg: 'bg-blue-600', text: 'text-blue-600', lightBg: 'bg-blue-50', border: 'border-blue-100', shadow: 'shadow-blue-200', hoverBg: 'hover:bg-blue-50' };
      case 'purple': return { bg: 'bg-purple-600', text: 'text-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-100', shadow: 'shadow-purple-200', hoverBg: 'hover:bg-purple-50' };
      case 'green': return { bg: 'bg-green-600', text: 'text-green-600', lightBg: 'bg-green-50', border: 'border-green-100', shadow: 'shadow-green-200', hoverBg: 'hover:bg-green-50' };
      case 'red':
      default:
        return { bg: 'bg-[#ff2301]', text: 'text-[#ff2301]', lightBg: 'bg-red-50', border: 'border-red-100', shadow: 'shadow-red-100', hoverBg: 'hover:bg-red-50' };
    }
  };
  const colors = getThemeColors();

  const getBadgeForHref = (href: string): { count: number; color: string; pulse?: boolean } | null => {
    if (href === '/accounting' && unpaidCount > 0) {
      return { count: unpaidCount, color: 'bg-red-500 text-white' };
    }
    if (href === '/service/installation' && pendingInstallationCount > 0) {
      return { count: pendingInstallationCount, color: 'bg-red-500 text-white' };
    }
    if (href === '/repair-orders' && pendingRepairCount > 0) {
      return { count: pendingRepairCount, color: 'bg-red-500 text-white' };
    }
    if (href === '/outsource-repairs' && pendingOutsourceCount > 0) {
      return { count: pendingOutsourceCount, color: 'bg-red-500 text-white' };
    }
    if (href === '/repair-deliveries' && pendingDeliveryCount > 0) {
      return { count: pendingDeliveryCount, color: 'bg-red-500 text-white' };
    }
    if (href === '/service/estimations' && pendingEstimationCount > 0) {
      return { count: pendingEstimationCount, color: 'bg-red-500 text-white' };
    }
    if ((href === '/marketing/requests' || href === '/marketing/requests/new') && pendingMarketingRequestCount > 0) {
      return { count: pendingMarketingRequestCount, color: 'bg-red-500 text-white' };
    }
    if (href === '/marketing-board' && unreadMarketingBoardCount > 0) {
      return { count: unreadMarketingBoardCount, color: 'bg-[#ff2301] text-white', pulse: true };
    }
    if (href === '/marketing-board/branch-content' && pendingBranchContentCount > 0) {
      return { count: pendingBranchContentCount, color: 'bg-purple-600 text-white', pulse: true };
    }
    if (href === '/service/claims' && pendingClaimCount > 0) {
      return { count: pendingClaimCount, color: 'bg-amber-500 text-white', pulse: true };
    }
    if (href === '/service/calls' && openServiceCallCount > 0) {
      return { count: openServiceCallCount, color: 'bg-[#ff2301] text-white' };
    }
    if (href === '/sales/service-handovers' && pendingServiceHandoverCount > 0) {
      return { count: pendingServiceHandoverCount, color: 'bg-[#ff2301] text-white', pulse: true };
    }
    if (href === '/sales/delivery-acknowledgements' && pendingSalesDeliveryAckCount > 0) {
      return { count: pendingSalesDeliveryAckCount, color: 'bg-[#ff2301] text-white', pulse: true };
    }
    if (href === '/accounting/delivery-handovers' && pendingAccountingDeliveryCount > 0) {
      return { count: pendingAccountingDeliveryCount, color: 'bg-[#ff2301] text-white', pulse: true };
    }
    return null;
  };

  const filteredDesktopNav = React.useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return nav;
    return nav.filter(item =>
      item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
    );
  }, [nav, menuSearch]);

  const homeHref = isReadOnlyExecutive(userRole)
    ? '/executive/kpi'
    : userRole === 'อื่นๆ'
    ? '/department'
    : (userRole || '').toLowerCase().includes('project')
    ? '/jobs'
    : '/dashboard';

  if (pathname === '/bd/tickets/tv') return null;

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (Expandable / Collapsible for All Roles) ─── */}
      <aside
        className={`hidden md:flex ${
          isExpanded ? 'w-[264px]' : 'w-[76px]'
        } h-screen bg-white flex-col shrink-0 justify-between border-r border-slate-200/80 relative z-40 select-none transition-all duration-300 ease-in-out print:hidden`}
      >
        {/* Top Fixed Brand Header + Search + Context Switcher */}
        <div className="flex flex-col w-full shrink-0 pt-5 px-3">
          {isExpanded ? (
            <div className="flex items-center justify-between gap-2 px-1">
              <Link
                href={homeHref}
                className="flex items-center gap-2.5 min-w-0 group"
              >
                <div
                  className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center shadow-md ${colors.shadow} group-hover:scale-105 transition-all duration-200 shrink-0`}
                >
                  <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <span className="font-sans font-black text-base text-slate-900 tracking-tight block truncate">
                    TeraSales
                  </span>
                  <span className="text-[10px] font-sans font-bold text-[#ff2301] tracking-wider block -mt-0.5 uppercase truncate">
                    CRM &amp; ERP System
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0">
                {userRole !== 'อื่นๆ' && (
                  <NotificationBell userId={userId} isExpanded={true} />
                )}
                <button
                  type="button"
                  onClick={toggleSidebarExpanded}
                  title="ย่อแถบเมนู (แสดงเฉพาะไอคอน)"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <Link
                href={homeHref}
                className={`w-11 h-11 ${colors.bg} rounded-2xl flex items-center justify-center shadow-lg ${colors.shadow} hover:scale-105 transition-all duration-300`}
              >
                <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
              </Link>
              <button
                type="button"
                onClick={toggleSidebarExpanded}
                onMouseEnter={(e) => showTooltip('ขยายแถบเมนู (แสดงชื่อเมนู)', e)}
                onMouseLeave={hideTooltip}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          )}

          {/* Quick Search Input when Expanded */}
          {isExpanded && (
            <div className="relative mt-3.5">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="ค้นหาเมนู..."
                className="w-full pl-8 pr-7 py-2 text-xs font-medium bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:bg-white focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10 text-slate-800 placeholder:text-slate-400 transition-all"
              />
              {menuSearch && (
                <button
                  type="button"
                  onClick={() => setMenuSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* SuperAdmin Context Switcher */}
          {isSuperAdmin && superAdminContexts && (
            <div className="relative mt-3" ref={contextSwitcherRef}>
              {isExpanded ? (
                <button
                  type="button"
                  onClick={() => setIsContextSwitcherOpen(!isContextSwitcherOpen)}
                  className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold border transition-all ${
                    isContextSwitcherOpen
                      ? `${colors.lightBg} ${colors.text} ${colors.border}`
                      : 'bg-slate-50/80 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Layers size={15} className="text-[#ff2301] shrink-0" />
                    <span className="truncate">มุมมอง: {selectedContext}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                    สลับ
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsContextSwitcherOpen(!isContextSwitcherOpen)}
                  onMouseEnter={(e) =>
                    !isContextSwitcherOpen &&
                    showTooltip(`View Context: ${selectedContext}`, e)
                  }
                  onMouseLeave={hideTooltip}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative mx-auto group ${
                    isContextSwitcherOpen
                      ? `${colors.lightBg} ${colors.text} shadow-sm border ${colors.border}`
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Layers
                    size={19}
                    strokeWidth={isContextSwitcherOpen ? 2.5 : 2}
                    className="transition-transform duration-200 group-hover:scale-105"
                  />
                </button>
              )}

              {isContextSwitcherOpen && (
                <div
                  className={`absolute ${
                    isExpanded ? 'left-0 right-0 top-full mt-1.5' : 'left-[68px] top-0 w-56'
                  } bg-white border border-slate-200 shadow-xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1`}
                >
                  <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      เลือกชุดเมนูตามแผนก
                    </span>
                  </div>
                  {Object.keys(superAdminContexts).map((ctx) => (
                    <button
                      key={ctx}
                      type="button"
                      onClick={() => {
                        setSelectedContext(ctx);
                        localStorage.setItem('superAdminViewContext', ctx);
                        setIsContextSwitcherOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors ${
                        selectedContext === ctx
                          ? `${colors.text} ${colors.lightBg}`
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{ctx}</span>
                      {selectedContext === ctx && <Check size={14} strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="w-full h-px bg-slate-100 mt-3.5 shrink-0" />
        </div>

        {/* Scrollable Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredDesktopNav.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ไม่พบเมนูที่ค้นหา
            </div>
          ) : (
            filteredDesktopNav.map(({ icon: Icon, label, href }) => {
              const isActive = href === bestMatchHref;
              const isLoading = loadingHref === href;
              const badge = getBadgeForHref(href);

              if (isExpanded) {
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={true}
                    onClick={() => {
                      if (!isActive) {
                        setLoadingHref(href);
                      }
                    }}
                    className={`w-full min-h-[42px] py-2 px-3 rounded-xl flex items-center gap-3 transition-all duration-150 relative group border ${
                      isActive
                        ? `${colors.lightBg} ${colors.text} ${colors.border} font-bold shadow-2xs`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 border-transparent font-semibold'
                    }`}
                  >
                    <div className="shrink-0 relative flex items-center justify-center w-5 h-5">
                      {isLoading ? (
                        <Loader2 size={18} className={`animate-spin ${colors.text}`} />
                      ) : (
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.5 : 2}
                          className={`transition-transform duration-150 group-hover:scale-105 ${
                            isActive ? colors.text : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                      )}
                    </div>

                    <span className="text-[13px] leading-snug flex-1 line-clamp-1">
                      {label}
                    </span>

                    {badge && (
                      <span
                        className={`min-w-[20px] h-5 px-1.5 ${badge.color} text-[10px] font-black rounded-full flex items-center justify-center shadow-2xs shrink-0 ${
                          badge.pulse ? 'animate-pulse' : ''
                        }`}
                      >
                        {badge.count > 99 ? '99+' : badge.count}
                      </span>
                    )}
                  </Link>
                );
              }

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
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative mx-auto group ${
                    isActive
                      ? `${colors.lightBg} ${colors.text} shadow-sm border ${colors.border}`
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={19} className={`animate-spin ${colors.text}`} />
                  ) : (
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.5 : 2}
                      className="transition-transform duration-200 group-hover:scale-105"
                    />
                  )}
                  {isActive && !isLoading && (
                    <span
                      className={`absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full ${colors.bg} border border-white animate-pulse`}
                    />
                  )}
                  {badge && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 ${badge.color} text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                        badge.pulse ? 'animate-pulse' : ''
                      }`}
                    >
                      {badge.count > 99 ? '99+' : badge.count}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Bottom Fixed Footer Section */}
        <div className="flex flex-col gap-2 w-full px-3 pb-4 pt-2 border-t border-slate-100 shrink-0">
          <CoinMiniWidget
            isMobile={false}
            isExpanded={isExpanded}
            activeRoute={activeRoute}
            onMouseEnter={(e) => !isExpanded && showTooltip('Gold Coin', e)}
            onMouseLeave={hideTooltip}
          />

          {/* Quick Link to Jobs / Department */}
          {isExpanded ? (
            <Link
              href={userRole === 'อื่นๆ' ? '/department' : '/jobs'}
              prefetch={true}
              onClick={() => {
                const target = userRole === 'อื่นๆ' ? '/department' : '/jobs';
                if (activeRoute !== target) {
                  setLoadingHref(target);
                }
              }}
              className={`w-full py-2 px-3 rounded-xl flex items-center gap-3 transition-all duration-150 border ${
                activeRoute === '/jobs' || activeRoute === '/department'
                  ? `${colors.lightBg} ${colors.text} ${colors.border} font-bold`
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent font-semibold'
              }`}
            >
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {loadingHref === (userRole === 'อื่นๆ' ? '/department' : '/jobs') ? (
                  <Loader2 size={17} className={`animate-spin ${colors.text}`} />
                ) : (
                  <Briefcase
                    size={17}
                    strokeWidth={activeRoute === '/jobs' || activeRoute === '/department' ? 2.5 : 2}
                    className="text-slate-400"
                  />
                )}
              </div>
              <span className="text-xs truncate">
                {userRole === 'อื่นๆ' ? 'ระบบจัดการคิวงาน (Department)' : 'ระบบลงทะเบียนงาน (Jobs)'}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href={userRole === 'อื่นๆ' ? '/department' : '/jobs'}
                prefetch={true}
                onMouseEnter={(e) =>
                  showTooltip(
                    userRole === 'อื่นๆ'
                      ? 'ระบบจัดการคิวงาน (Department)'
                      : 'ระบบลงทะเบียนงาน (Jobs)',
                    e
                  )
                }
                onMouseLeave={hideTooltip}
                onClick={() => {
                  const target = userRole === 'อื่นๆ' ? '/department' : '/jobs';
                  if (activeRoute !== target) {
                    setLoadingHref(target);
                  }
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative mx-auto group ${
                  activeRoute === '/jobs' || activeRoute === '/department'
                    ? `${colors.lightBg} ${colors.text} shadow-sm border ${colors.border}`
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {loadingHref === (userRole === 'อื่นๆ' ? '/department' : '/jobs') ? (
                  <Loader2 size={19} className={`animate-spin ${colors.text}`} />
                ) : (
                  <Briefcase
                    size={19}
                    strokeWidth={activeRoute === '/jobs' || activeRoute === '/department' ? 2.5 : 2}
                    className="transition-transform duration-200 group-hover:scale-105"
                  />
                )}
              </Link>

              {userRole !== 'อื่นๆ' && (
                <div className="mx-auto">
                  <NotificationBell userId={userId} isExpanded={false} />
                </div>
              )}
            </>
          )}

          {/* Profile & Logout Row */}
          {isExpanded ? (
            <div className="flex items-center gap-1.5 pt-1">
              <Link
                href="/settings"
                prefetch={true}
                onClick={() => {
                  if (activeRoute !== '/settings') {
                    setIsSettingsLoading(true);
                  }
                }}
                className={`flex-1 min-w-0 p-2 rounded-xl flex items-center gap-2.5 transition-all duration-200 border ${
                  activeRoute === '/settings'
                    ? `${colors.lightBg} ${colors.text} ${colors.border} font-bold`
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg ${colors.lightBg} ${colors.text} border ${colors.border} font-black text-xs flex items-center justify-center uppercase shrink-0`}
                >
                  {isSettingsLoading ? (
                    <Loader2 size={14} className={`animate-spin ${colors.text}`} />
                  ) : (
                    userFullName.charAt(0)
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {userFullName}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 truncate leading-tight">
                    {userRole}
                  </span>
                </div>
              </Link>

              <form action={logout} onSubmit={() => setIsLogoutLoading(true)}>
                <button
                  type="submit"
                  title="ออกจากระบบ"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:${colors.text} ${colors.hoverBg} border border-slate-200/70 transition-all duration-200 shrink-0`}
                >
                  {isLogoutLoading ? (
                    <Loader2 size={16} className={`animate-spin ${colors.text}`} />
                  ) : (
                    <LogOut size={16} strokeWidth={2} />
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
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
                className={`w-10 h-10 rounded-2xl ${colors.lightBg} ${colors.text} border ${colors.border} font-black text-xs flex items-center justify-center transition-all duration-200 hover:scale-105 uppercase`}
              >
                {isSettingsLoading ? (
                  <Loader2 size={16} className={`animate-spin ${colors.text}`} />
                ) : (
                  userFullName.charAt(0)
                )}
              </Link>

              <form action={logout} onSubmit={() => setIsLogoutLoading(true)} className="w-full flex justify-center">
                <button
                  type="submit"
                  onMouseEnter={(e) => showTooltip('ออกจากระบบ', e)}
                  onMouseLeave={hideTooltip}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-gray-400 hover:${colors.text} ${colors.hoverBg} transition-all duration-200 group`}
                >
                  {isLogoutLoading ? (
                    <Loader2 size={18} className={`animate-spin ${colors.text}`} />
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
          )}
        </div>
      </aside>

      {/* ─── MOBILE FLOATING TRIGGER BUTTON ─── */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`md:hidden fixed left-4 bottom-4 z-50 ${colors.bg} text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all outline-none print:hidden`}
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
        className={`md:hidden fixed top-0 bottom-0 left-0 w-[270px] bg-white border-r border-gray-100 flex flex-col py-8 px-5 z-50 transition-transform duration-300 ease-out transform shadow-2xl overflow-y-auto custom-scrollbar ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand header */}
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between">
            <Link href={isReadOnlyExecutive(userRole) ? '/executive/kpi' : userRole === 'อื่นๆ' ? '/department' : (userRole || '').toLowerCase().includes('project') ? '/jobs' : '/dashboard'} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
              <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center shadow-lg ${colors.shadow}`}>
                <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <span className="font-sans font-black text-lg text-gray-900 tracking-tight block">TeraSales</span>
                <span className="text-[9px] font-sans font-bold text-[#ff2301] tracking-wider block -mt-1 uppercase">CRM System</span>
              </div>
            </Link>

            {userRole !== 'อื่นๆ' && (
              <NotificationBell userId={userId} isMobile={true} />
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-100 my-6" />

          {isSuperAdmin && superAdminContexts && (
            <div className="mb-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">View Context</span>
              <div className="flex flex-col gap-1.5 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                {Object.keys(superAdminContexts).map(ctx => (
                  <button
                    key={ctx}
                    onClick={() => {
                      setSelectedContext(ctx);
                      localStorage.setItem('superAdminViewContext', ctx);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${selectedContext === ctx ? `${colors.bg} text-white shadow-md` : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {ctx}
                    {selectedContext === ctx && <Check size={16} strokeWidth={2.5} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nav items list */}
          <nav className="flex flex-col gap-3 w-full">
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
                  className={`w-full h-12 rounded-xl flex items-center gap-3.5 px-4 transition-all duration-200 border ${isActive
                    ? `${colors.lightBg} ${colors.text} ${colors.border} font-bold`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                    }`}
                >
                  <div className="shrink-0 relative">
                    {isLoading ? (
                      <Loader2 size={24} className={`animate-spin ${colors.text}`} />
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
                    {href === '/repair-orders' && pendingRepairCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingRepairCount > 99 ? '99+' : pendingRepairCount}
                      </span>
                    )}
                    {href === '/outsource-repairs' && pendingOutsourceCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingOutsourceCount > 99 ? '99+' : pendingOutsourceCount}
                      </span>
                    )}
                    {href === '/repair-deliveries' && pendingDeliveryCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingDeliveryCount > 99 ? '99+' : pendingDeliveryCount}
                      </span>
                    )}
                    {href === '/service/estimations' && pendingEstimationCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingEstimationCount > 99 ? '99+' : pendingEstimationCount}
                      </span>
                    )}
                    {(href === '/marketing/requests' || href === '/marketing/requests/new') && pendingMarketingRequestCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingMarketingRequestCount > 99 ? '99+' : pendingMarketingRequestCount}
                      </span>
                    )}
                    {href === '/marketing-board' && unreadMarketingBoardCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[#ff2301] text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {unreadMarketingBoardCount > 99 ? '99+' : unreadMarketingBoardCount}
                      </span>
                    )}
                    {href === '/marketing-board/branch-content' && pendingBranchContentCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-purple-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingBranchContentCount > 99 ? '99+' : pendingBranchContentCount}
                      </span>
                    )}
                    {href === '/service/claims' && pendingClaimCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingClaimCount > 99 ? '99+' : pendingClaimCount}
                      </span>
                    )}
                    {href === '/service/calls' && openServiceCallCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[#ff2301] text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {openServiceCallCount > 99 ? '99+' : openServiceCallCount}
                      </span>
                    )}
                    {href === '/sales/service-handovers' && pendingServiceHandoverCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[#ff2301] text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingServiceHandoverCount > 99 ? '99+' : pendingServiceHandoverCount}
                      </span>
                    )}
                    {href === '/sales/delivery-acknowledgements' && pendingSalesDeliveryAckCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[#ff2301] text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingSalesDeliveryAckCount > 99 ? '99+' : pendingSalesDeliveryAckCount}
                      </span>
                    )}
                    {href === '/accounting/delivery-handovers' && pendingAccountingDeliveryCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-[#ff2301] text-white text-[9px] font-black rounded-full flex items-center justify-center border-[1.5px] border-white shadow-sm z-10">
                        {pendingAccountingDeliveryCount > 99 ? '99+' : pendingAccountingDeliveryCount}
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
            className={`w-full h-12 rounded-xl flex items-center gap-3.5 px-4 transition-all duration-200 border ${(activeRoute === '/jobs' || activeRoute === '/department')
              ? `${colors.lightBg} ${colors.text} ${colors.border} font-bold`
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
              }`}
          >
            <div className="shrink-0">
              {loadingHref === (userRole === 'อื่นๆ' ? '/department' : '/jobs') ? (
                <Loader2 size={18} className={`animate-spin ${colors.text}`} />
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
            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 border ${activeRoute === '/settings'
              ? `${colors.lightBg} ${colors.text} ${colors.border} font-bold`
              : 'bg-gray-50/50 hover:bg-gray-50 text-gray-700 border-gray-100'
              }`}
          >
            <div className={`w-10 h-10 rounded-lg ${colors.lightBg} ${colors.text} border ${colors.border} font-black text-sm flex items-center justify-center uppercase shrink-0`}>
              {isSettingsLoading ? (
                <Loader2 size={16} className={`animate-spin ${colors.text}`} />
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
              className={`w-full h-12 rounded-xl flex items-center gap-3.5 px-4 text-gray-500 hover:${colors.text} ${colors.hoverBg} transition-all duration-200 font-sans font-semibold text-sm outline-none`}
            >
              <div className="shrink-0">
                {isLogoutLoading ? (
                  <Loader2 size={18} className={`animate-spin ${colors.text}`} />
                ) : (
                  <LogOut size={18} strokeWidth={2} />
                )}
              </div>
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ─── DESKTOP TOOLTIP (Only when Collapsed) ─── */}
      {tooltip && !isExpanded && (
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