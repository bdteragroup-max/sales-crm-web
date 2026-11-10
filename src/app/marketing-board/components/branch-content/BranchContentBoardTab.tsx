'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Building2,
  Calendar,
  BarChart3,
  Kanban,
  ShieldCheck,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RefreshCw,
  Sparkles,
  User,
  Layers,
} from 'lucide-react';
import BranchContentCard from './BranchContentCard';
import CreateEditBranchContentModal from './CreateEditBranchContentModal';
import BranchContentDetailModal from './BranchContentDetailModal';
import BranchContentCalendarView from './BranchContentCalendarView';
import BranchContentDashboardView from './BranchContentDashboardView';
import { getBranchContentBoardData } from '@/app/actions/branchContent';
import type {
  BranchContentItem,
  BranchContentPermissions,
  BranchMasterItem,
} from '@/app/lib/branchContentTypes';
import {
  KANBAN_COLUMNS,
  PRODUCT_GROUPS,
  TARGET_CHANNELS,
} from '@/app/lib/branchContentTypes';
import { matchBranch } from '@/app/lib/roleHelper';

interface BranchContentBoardTabProps {
  initialData: {
    contents: BranchContentItem[];
    branches: BranchMasterItem[];
    staffOptions: { id: string; name: string; branch: string | null }[];
    permissions: BranchContentPermissions | null;
  };
}

export default function BranchContentBoardTab({
  initialData,
}: BranchContentBoardTabProps) {
  const [contents, setContents] = useState<BranchContentItem[]>(
    initialData.contents || []
  );
  const [branches] = useState<BranchMasterItem[]>(initialData.branches || []);
  const [staffOptions] = useState(initialData.staffOptions || []);
  const permissions = initialData.permissions;

  // Default sub-view: Marketing/Admin defaults to 'review_board', Branch staff defaults to 'my_branch'
  const [subView, setSubView] = useState<
    'my_branch' | 'review_board' | 'calendar' | 'dashboard'
  >(permissions?.canViewAllBranches ? 'review_board' : 'my_branch');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedProductGroup, setSelectedProductGroup] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [reviewQueueFilter, setReviewQueueFilter] = useState<
    | 'ALL'
    | 'WAITING_BRANCH_MANAGER'
    | 'APPROVE_1_WAITING_MARKETING'
    | 'ENDORSED_FOR_MARKETING_MANAGER'
    | 'OVERDUE'
  >('ALL');

  // Modals
  const [selectedItem, setSelectedItem] = useState<BranchContentItem | null>(null);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BranchContentItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getBranchContentBoardData();
      if (fresh.success) {
        setContents(fresh.contents);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleItemUpsert = (updated: BranchContentItem) => {
    setContents(prev => {
      const exists = prev.some(c => c.id === updated.id);
      if (exists) {
        return prev.map(c => (c.id === updated.id ? updated : c));
      }
      return [updated, ...prev];
    });
    if (selectedItem?.id === updated.id) {
      setSelectedItem(updated);
    }
  };

  // Filtered contents
  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      // 1. Sub-view branch scope: In "My Branch Board", if user has a branch, filter to their branch
      if (subView === 'my_branch' && permissions?.userBranchId) {
        const matchesMyBranch =
          matchBranch(item.branchId, permissions.userBranchId) ||
          matchBranch(item.branchName, permissions.userBranchName);
        if (!matchesMyBranch) return false;
      }

      // 2. Explicit Branch Dropdown Filter
      if (selectedBranch !== 'ALL') {
        const matchesSelected =
          item.branchId === selectedBranch ||
          matchBranch(item.branchName, selectedBranch) ||
          matchBranch(item.branchId, selectedBranch);
        if (!matchesSelected) return false;
      }

      // 3. Product Group Filter
      if (selectedProductGroup !== 'ALL' && item.productGroup !== selectedProductGroup) {
        return false;
      }

      // 4. Channel Filter
      if (selectedChannel !== 'ALL') {
        const hasCh =
          item.targetChannels?.includes(selectedChannel) ||
          item.actualChannel === selectedChannel;
        if (!hasCh) return false;
      }

      // 5. Assignee Filter
      if (selectedAssignee !== 'ALL') {
        if (item.assigneeId !== selectedAssignee && item.createdById !== selectedAssignee) {
          return false;
        }
      }

      // 6. Month Filter
      if (selectedMonth !== 'ALL') {
        const dStr = item.plannedPublishDate || item.submissionDueDate || item.createdAt;
        if (!dStr) return false;
        const d = new Date(dStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonth) return false;
      }

      // 7. Quick Review Queue Filter
      if (reviewQueueFilter === 'WAITING_BRANCH_MANAGER') {
        if (item.status !== 'PENDING_REVIEW') {
          return false;
        }
      } else if (reviewQueueFilter === 'APPROVE_1_WAITING_MARKETING') {
        if (
          item.status !== 'APPROVE_1' ||
          item.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER'
        ) {
          return false;
        }
      } else if (reviewQueueFilter === 'ENDORSED_FOR_MARKETING_MANAGER') {
        if (
          item.status !== 'APPROVE_1' ||
          item.reviewSubStatus !== 'ENDORSED_FOR_MARKETING_MANAGER'
        ) {
          return false;
        }
      } else if (reviewQueueFilter === 'OVERDUE') {
        if (!item.isOverdue) return false;
      }

      // 8. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = item.contentNo.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchBranchName = item.branchName.toLowerCase().includes(q);
        const matchCaption = item.caption?.toLowerCase().includes(q);
        const matchAssignee = item.assigneeName?.toLowerCase().includes(q);
        if (!matchNo && !matchTitle && !matchBranchName && !matchCaption && !matchAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [
    contents,
    subView,
    permissions,
    selectedBranch,
    selectedProductGroup,
    selectedChannel,
    selectedAssignee,
    selectedMonth,
    reviewQueueFilter,
    searchQuery,
  ]);

  // Available months from data
  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    contents.forEach(c => {
      const dStr = c.plannedPublishDate || c.createdAt;
      if (!dStr) return;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      map.set(key, label);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [contents]);

  // Quick summary counts for Review Banner
  const quickCounts = useMemo(() => {
    let waitingBranchMgr = 0;
    let approve1WaitingMarketing = 0;
    let endorsedForManager = 0;
    let revise = 0;
    let overdue = 0;

    contents.forEach(c => {
      if (c.status === 'PENDING_REVIEW') {
        waitingBranchMgr++;
      } else if (c.status === 'APPROVE_1') {
        if (c.reviewSubStatus === 'ENDORSED_FOR_MARKETING_MANAGER') endorsedForManager++;
        else approve1WaitingMarketing++;
      }
      if (c.status === 'REVISE') revise++;
      if (c.isOverdue) overdue++;
    });

    return {
      waitingBranchMgr,
      approve1WaitingMarketing,
      endorsedForManager,
      revise,
      overdue,
    };
  }, [contents]);

  return (
    <div className="space-y-5">
      {/* Top Sub-Menu & Role Badge Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: 4 Sub-Menu Views (Section 5 & 10) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubView('my_branch');
              setReviewQueueFilter('ALL');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              subView === 'my_branch'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 size={15} />
            <span>My Branch Board</span>
            {permissions?.userBranchName && (
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px]">
                {permissions.userBranchName}
              </span>
            )}
          </button>

          {permissions?.canViewAllBranches && (
            <button
              type="button"
              onClick={() => setSubView('review_board')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                subView === 'review_board'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Kanban size={15} />
              <span>Marketing Review Board</span>
              {quickCounts.approve1WaitingMarketing + quickCounts.endorsedForManager > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black">
                  Approve-1 ({quickCounts.approve1WaitingMarketing + quickCounts.endorsedForManager})
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSubView('calendar');
              setReviewQueueFilter('ALL');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              subView === 'calendar'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar size={15} />
            <span>Content Calendar</span>
          </button>

          {permissions?.canViewAllBranches && (
            <button
              type="button"
              onClick={() => {
                setSubView('dashboard');
                setReviewQueueFilter('ALL');
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                subView === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 size={15} />
              <span>Dashboard & รายงาน (11 สาขา)</span>
            </button>
          )}
        </div>

        {/* Right: Role Badge + Create Content Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {permissions && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-red-600" />
              <span>{permissions.roleLabel}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsCreateEditOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-extrabold shadow-md shadow-red-500/20 transition-all"
          >
            <Plus size={16} />
            สร้างคอนเทนต์สาขาใหม่
          </button>
        </div>
      </div>

      {/* Quick Review Queue Filter Pills (Shown in Marketing Review Board or My Branch Board) */}
      {(subView === 'review_board' || subView === 'my_branch') && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReviewQueueFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              reviewQueueFilter === 'ALL'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            แสดงทุกสถานะ ({contents.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setReviewQueueFilter(
                reviewQueueFilter === 'WAITING_BRANCH_MANAGER'
                  ? 'ALL'
                  : 'WAITING_BRANCH_MANAGER'
              )
            }
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
              reviewQueueFilter === 'WAITING_BRANCH_MANAGER'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock size={13} />
            1. รอ ผจก.สาขาตรวจ ({quickCounts.waitingBranchMgr})
          </button>

          <button
            type="button"
            onClick={() =>
              setReviewQueueFilter(
                reviewQueueFilter === 'APPROVE_1_WAITING_MARKETING'
                  ? 'ALL'
                  : 'APPROVE_1_WAITING_MARKETING'
              )
            }
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
              reviewQueueFilter === 'APPROVE_1_WAITING_MARKETING'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Sparkles size={13} />
            2. Approve - 1: ผจก.สาขาผ่านแล้ว • รอการตลาดตรวจ (
            {quickCounts.approve1WaitingMarketing})
          </button>

          <button
            type="button"
            onClick={() =>
              setReviewQueueFilter(
                reviewQueueFilter === 'ENDORSED_FOR_MARKETING_MANAGER'
                  ? 'ALL'
                  : 'ENDORSED_FOR_MARKETING_MANAGER'
              )
            }
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
              reviewQueueFilter === 'ENDORSED_FOR_MARKETING_MANAGER'
                ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                : 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200 hover:bg-fuchsia-100'
            }`}
          >
            <ShieldCheck size={13} />
            3. Marketing ตรวจผ่าน • รอ ผจก.การตลาดอนุมัติ (
            {quickCounts.endorsedForManager})
          </button>

          {quickCounts.overdue > 0 && (
            <button
              type="button"
              onClick={() =>
                setReviewQueueFilter(reviewQueueFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')
              }
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
                reviewQueueFilter === 'OVERDUE'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle size={13} />
              งานเกินกำหนด ({quickCounts.overdue})
            </button>
          )}
        </div>
      )}

      {/* Search & Multi-Dimension Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        {/* Search Input */}
        <div className="lg:col-span-2 relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัส BC, ชื่อคอนเทนต์, แคปชั่น, สาขา, ผู้รับผิดชอบ..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Branch Filter (11 Master Branches) */}
        <div>
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            disabled={
              !permissions?.canViewAllBranches && !!permissions?.userBranchId
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
          >
            <option value="ALL">ทุกสาขา (All 11 Branches)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                สาขา{b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Product Group Filter */}
        <div>
          <select
            value={selectedProductGroup}
            onChange={e => setSelectedProductGroup(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">ทุกกลุ่มสินค้า</option>
            {PRODUCT_GROUPS.map(pg => (
              <option key={pg} value={pg}>
                {pg.split(' / ')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Channel Filter */}
        <div>
          <select
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">ทุกช่องทาง (All Channels)</option>
            {TARGET_CHANNELS.map(ch => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">ทุกช่วงเวลา (All Months)</option>
            {monthOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MAIN CONTENT VIEW BY ACTIVE SUB-VIEW */}
      {(subView === 'my_branch' || subView === 'review_board') && (
        <div className="overflow-x-auto pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 min-w-[1380px]">
            {KANBAN_COLUMNS.map(col => {
              const colItems = filteredContents.filter(c => c.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`flex flex-col rounded-2xl border ${col.borderColor} bg-slate-100/60 min-h-[540px] max-h-[78vh]`}
                >
                  {/* Column Header */}
                  <div
                    className={`p-3.5 rounded-t-2xl border-b ${col.borderColor} ${col.headerBg} flex items-center justify-between sticky top-0 z-10`}
                  >
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs tracking-wide uppercase">
                        {col.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {col.subtitle}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-black border ${col.badgeColor}`}
                    >
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                    {colItems.length === 0 ? (
                      <div className="h-36 rounded-xl border border-dashed border-slate-200/80 flex items-center justify-center text-[11px] text-slate-400 font-medium">
                        ไม่มีรายการในสถานะนี้
                      </div>
                    ) : (
                      colItems.map(item => (
                        <BranchContentCard
                          key={item.id}
                          item={item}
                          onClick={clicked => setSelectedItem(clicked)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subView === 'calendar' && (
        <BranchContentCalendarView
          contents={filteredContents}
          onCardClick={clicked => setSelectedItem(clicked)}
        />
      )}

      {subView === 'dashboard' && (
        <BranchContentDashboardView
          contents={filteredContents}
          branches={branches}
        />
      )}

      {/* Create / Edit Modal */}
      <CreateEditBranchContentModal
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingItem(null);
        }}
        onSuccess={savedItem => handleItemUpsert(savedItem)}
        editItem={editingItem}
        branches={branches}
        staffOptions={staffOptions}
        permissions={permissions}
      />

      {/* Detail & Review Modal */}
      <BranchContentDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={updatedItem => handleItemUpsert(updatedItem)}
        onEditClick={itemToEdit => {
          setSelectedItem(null);
          setEditingItem(itemToEdit);
          setIsCreateEditOpen(true);
        }}
        permissions={permissions}
      />
    </div>
  );
}

