'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { 
  Bell, Plus, Search, Filter, Sparkles, Layers, Archive, 
  FileText, CheckCircle2, ChevronDown, Clock, ShieldCheck, RefreshCw 
} from 'lucide-react';
import PromotionsKanbanView from './PromotionsKanbanView';
import SalesMaterialsTab from './SalesMaterialsTab';
import ArchiveTab from './ArchiveTab';
import AnnouncementDetailModal from './AnnouncementDetailModal';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import NotificationsModal from './NotificationsModal';
import { getMarketingBoardData, getSalesMaterials, getArchiveAnnouncements } from '@/app/actions/marketingBoard';
import type { BoardFilters } from '@/app/lib/marketingBoardTypes';
import { AnnouncementItem } from './AnnouncementCard';

interface MarketingBoardClientProps {
  initialBoardData: any;
  initialSalesMaterials: any[];
  initialArchiveData: any[];
  currentUser: any;
}

export default function MarketingBoardClient({
  initialBoardData,
  initialSalesMaterials,
  initialArchiveData,
  currentUser
}: MarketingBoardClientProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'kanban' | 'materials' | 'archive'>('kanban');

  // Board Data state
  const [boardData, setBoardData] = useState(initialBoardData);
  const [salesMaterials, setSalesMaterials] = useState(initialSalesMaterials);
  const [archiveData, setArchiveData] = useState(initialArchiveData);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedProductGroup, setSelectedProductGroup] = useState('All Product Groups');
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedDateMonth, setSelectedDateMonth] = useState('All');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Modals state
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Reload data from server
  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      try {
        const filters: BoardFilters = {
          search,
          productGroup: selectedProductGroup,
          status: selectedStatus,
          branch: selectedBranch,
          dateMonth: selectedDateMonth,
          unreadOnly
        };

        const [newBoard, newMaterials, newArchive] = await Promise.all([
          getMarketingBoardData(filters),
          getSalesMaterials(),
          getArchiveAnnouncements()
        ]);

        setBoardData(newBoard);
        setSalesMaterials(newMaterials);
        setArchiveData(newArchive);
      } catch (err) {
        console.error('Failed to refresh marketing board data:', err);
      }
    });
  }, [search, selectedProductGroup, selectedStatus, selectedBranch, selectedDateMonth, unreadOnly]);

  // Live filter trigger
  const applyFilters = (overrides: Partial<BoardFilters> = {}) => {
    startTransition(async () => {
      try {
        const filters: BoardFilters = {
          search: overrides.search !== undefined ? overrides.search : search,
          productGroup: overrides.productGroup !== undefined ? overrides.productGroup : selectedProductGroup,
          status: overrides.status !== undefined ? overrides.status : selectedStatus,
          branch: overrides.branch !== undefined ? overrides.branch : selectedBranch,
          dateMonth: overrides.dateMonth !== undefined ? overrides.dateMonth : selectedDateMonth,
          unreadOnly: overrides.unreadOnly !== undefined ? overrides.unreadOnly : unreadOnly
        };

        const newBoard = await getMarketingBoardData(filters);
        setBoardData(newBoard);
      } catch (err) {
        console.error('Error applying filters:', err);
      }
    });
  };

  const userPerm = boardData?.userPermissions;
  const canManage = userPerm?.canManage;
  const unreadCount = boardData?.counts?.unread || 0;
  const unacknowledgedAnnouncements = (boardData?.announcements || []).filter((a: AnnouncementItem) => !a.isAcknowledged);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Header with Red Accent */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Brand Emblem & Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                <Sparkles size={22} className="drop-shadow-xs" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight">
                    TERA MARKETING BOARD
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/60 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  กระดานข่าวสารการตลาด โปรโมชั่น และเอกสารช่วยขายสำหรับทีมขายและสาขาทั่วประเทศ
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-colors shadow-2xs"
                title="รีเฟรชข้อมูล (Refresh)"
              >
                <RefreshCw size={17} className={isPending ? 'animate-spin text-red-600' : ''} />
              </button>

              {/* Notification Bell with Badge */}
              <button
                onClick={() => setIsNotificationsModalOpen(true)}
                className={`relative p-2.5 rounded-xl border transition-all shadow-2xs ${
                  unreadCount > 0 
                    ? 'border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100' 
                    : 'border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="การแจ้งเตือน (Notifications)"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Create Announcement Button (for Marketing & Admin) */}
              {canManage && (
                <button
                  onClick={() => {
                    setEditItem(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="py-2.5 px-4.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all shrink-0"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>+ สร้างประกาศใหม่</span>
                </button>
              )}
            </div>
          </div>

          {/* Symmetrical 3 Navigation Tabs */}
          <div className="flex items-center gap-6 mt-4 pt-2 border-t border-slate-100 overflow-x-auto text-xs md:text-sm font-bold">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'kanban'
                  ? 'border-red-600 text-red-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers size={16} className={activeTab === 'kanban' ? 'text-red-600' : 'text-slate-400'} />
              <span>โปรโมชั่นและข่าวสาร (Promotions & Updates)</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'materials'
                  ? 'border-red-600 text-red-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText size={16} className={activeTab === 'materials' ? 'text-red-600' : 'text-slate-400'} />
              <span>เอกสารช่วยขาย (Sales Materials)</span>
              {salesMaterials.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-mono font-semibold">
                  {salesMaterials.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'archive'
                  ? 'border-red-600 text-red-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Archive size={16} className={activeTab === 'archive' ? 'text-red-600' : 'text-slate-400'} />
              <span>คลังเอกสารประวัติ (Archive)</span>
              {archiveData.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-mono font-semibold">
                  {archiveData.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 space-y-6">
        
        {/* Symmetrical 4-Card Summary Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {/* Card 1: Active */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">กำลังใช้งาน (Active)</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {boardData?.counts?.active || 0}
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-0.5 inline-block">
                แคมเปญพร้อมขาย
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* Card 2: Ending Soon */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">ใกล้หมดอายุ (Ending Soon)</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                {boardData?.counts?.endingSoon || 0}
              </div>
              <span className="text-[11px] text-amber-600 font-bold mt-0.5 inline-block">
                ภายใน 5 วัน
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={22} />
            </div>
          </div>

          {/* Card 3: Total Announcements */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">แคมเปญทั้งหมด (Total)</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {boardData?.announcements?.length || 0}
              </div>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5 inline-block">
                4 กลุ่มสินค้าหลัก
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <Layers size={22} />
            </div>
          </div>

          {/* Card 4: Action Required / Unread */}
          <div className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-2xs flex items-center justify-between transition-all ${
            unreadCount > 0 
              ? 'border-red-200 ring-2 ring-red-500/10' 
              : 'border-slate-200/90'
          }`}>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">ยังไม่ได้รับทราบ (Pending)</span>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${
                unreadCount > 0 ? 'text-red-600' : 'text-slate-900'
              }`}>
                {unreadCount}
              </div>
              <span className={`text-[11px] font-bold mt-0.5 inline-block ${
                unreadCount > 0 ? 'text-red-600' : 'text-slate-400'
              }`}>
                {unreadCount > 0 ? 'มีรายการต้องรับทราบ' : 'รับทราบครบทุกประกาศ'}
              </span>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              unreadCount > 0 
                ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' 
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              <Bell size={22} />
            </div>
          </div>
        </div>

        {/* Tab 1: Promotions & Updates (with Filter Bar) */}
        {activeTab === 'kanban' && (
          <div className="flex flex-col flex-1 space-y-6 min-h-0">
            {/* Symmetrical Modern Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 shrink-0">
              
              {/* Left: Search and Dropdowns */}
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative min-w-[240px] flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อแคมเปญ หรือโปรโมชั่น..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      applyFilters({ search: e.target.value });
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Product Group Dropdown */}
                <div className="min-w-[160px]">
                  <select
                    value={selectedProductGroup}
                    onChange={(e) => {
                      setSelectedProductGroup(e.target.value);
                      applyFilters({ productGroup: e.target.value });
                    }}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    <option value="All Product Groups">ทุกกลุ่มสินค้า (All Groups)</option>
                    <option value="Marketing Headquarters">การตลาดส่วนกลาง (HQ)</option>
                    <option value="Inverter">อินเวอร์เตอร์ (Inverter)</option>
                    <option value="BLDC / Solar Pump">ปั๊มน้ำโซล่าเซลล์ (BLDC)</option>
                    <option value="Solar Roof">โซลาร์รูฟ (Solar Roof)</option>
                  </select>
                </div>

                {/* Status Dropdown */}
                <div className="min-w-[130px]">
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      applyFilters({ status: e.target.value });
                    }}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    <option value="All">ทุกสถานะ (All)</option>
                    <option value="Active">กำลังใช้งาน (Active)</option>
                    <option value="Ending Soon">ใกล้หมดอายุ (Ending)</option>
                    <option value="Scheduled">ตั้งเวลาไว้ (Scheduled)</option>
                    {canManage && <option value="Draft">แบบร่าง (Draft)</option>}
                    {canManage && <option value="Pending Approval">รออนุมัติ (Pending)</option>}
                  </select>
                </div>

                {/* Branch Dropdown */}
                <div className="min-w-[140px]">
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      applyFilters({ branch: e.target.value });
                    }}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    <option value="All Branches">ทุกสาขา (All Branches)</option>
                    {boardData?.branches?.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Dropdown */}
                <div className="min-w-[130px]">
                  <select
                    value={selectedDateMonth}
                    onChange={(e) => {
                      setSelectedDateMonth(e.target.value);
                      applyFilters({ dateMonth: e.target.value });
                    }}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                  >
                    <option value="All">ทุกช่วงเวลา (All Dates)</option>
                    <option value="2026-09">ก.ย. 2026 (Sep 2026)</option>
                    <option value="2026-10">ต.ค. 2026 (Oct 2026)</option>
                    <option value="2026-08">ส.ค. 2026 (Aug 2026)</option>
                  </select>
                </div>

                {/* Unread Only Toggle */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none py-1 px-2 rounded-lg hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(e) => {
                      setUnreadOnly(e.target.checked);
                      applyFilters({ unreadOnly: e.target.checked });
                    }}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span>เฉพาะที่ยังไม่ได้รับทราบ</span>
                </label>
              </div>

              {/* Right: Quick Status Breakdown */}
              <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {boardData?.counts?.active || 0} กำลังใช้งาน
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                  {boardData?.counts?.endingSoon || 0} ใกล้หมดอายุ
                </span>
                <span className={`px-2.5 py-1 rounded-lg border ${
                  unreadCount > 0 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {unreadCount} ยังไม่ได้รับทราบ
                </span>
              </div>
            </div>

            {/* Kanban Board */}
            <PromotionsKanbanView
              announcements={boardData?.announcements || []}
              onOpenDetail={(item) => setSelectedAnnouncementId(item.id)}
              onRefresh={handleRefresh}
              userPermissions={userPerm}
            />
          </div>
        )}

        {/* Tab 2: Sales Materials */}
        {activeTab === 'materials' && (
          <SalesMaterialsTab
            initialMaterials={salesMaterials}
            onRefresh={handleRefresh}
            userPermissions={userPerm}
          />
        )}

        {/* Tab 3: Archive */}
        {activeTab === 'archive' && (
          <ArchiveTab
            archiveItems={archiveData}
            onOpenDetail={(item) => setSelectedAnnouncementId(item.id)}
            onRefresh={handleRefresh}
            userPermissions={userPerm}
          />
        )}

      </main>

      {/* Detail Modal */}
      {selectedAnnouncementId && (
        <AnnouncementDetailModal
          announcementId={selectedAnnouncementId}
          onClose={() => setSelectedAnnouncementId(null)}
          onRefresh={handleRefresh}
          userPermissions={userPerm}
          onEdit={(item) => {
            setSelectedAnnouncementId(null);
            setEditItem(item);
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* Create / Edit Modal */}
      {isCreateModalOpen && (
        <CreateAnnouncementModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditItem(null);
          }}
          onSuccess={handleRefresh}
          branches={boardData?.branches || []}
          editItem={editItem}
          userPermissions={userPerm}
        />
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        unacknowledgedItems={unacknowledgedAnnouncements}
        onOpenDetail={(item) => setSelectedAnnouncementId(item.id)}
      />

    </div>
  );
}
