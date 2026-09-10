'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Kanban,
  List as ListIcon,
  Calendar,
  User,
  MapPin,
  Clock,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  FileText,
  RotateCcw
} from 'lucide-react';
import {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  RequestTypeCode,
  RequestStatusCode,
  RequestTypeConfig,
  StatusConfig
} from '@/constants/marketingRequests';
import { getMarketingRequests, getMarketingBoardRequests } from '@/app/actions/marketingRequests';

interface Props {
  initialRequests: any[];
  initialCounts: Record<string, number>;
  isMarketingOrAdmin: boolean;
  currentUserId: string;
  branches: string[];
  initialBoardData: Record<string, any[]>;
}

export default function MarketingRequestsListClient({
  initialRequests,
  initialCounts,
  isMarketingOrAdmin,
  currentUserId,
  branches,
  initialBoardData
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'my' | 'all'>(isMarketingOrAdmin ? 'all' : 'my');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [boardData, setBoardData] = useState<Record<string, any[]>>(initialBoardData);

  // Refresh data based on filters
  const applyFilters = (
    newTab: 'my' | 'all' = activeTab,
    newStatus: string = selectedStatus,
    newType: string = selectedType,
    newBranch: string = selectedBranch,
    newSearch: string = searchQuery
  ) => {
    startTransition(async () => {
      const res = await getMarketingRequests({
        tab: newTab,
        status: newStatus,
        type: newType,
        branch: newBranch,
        search: newSearch
      });
      if (res.success && res.data) {
        setRequests(res.data);
        setCounts(res.counts || {});
      }

      if (viewMode === 'board') {
        const bRes = await getMarketingBoardRequests();
        if (bRes.success && bRes.data) {
          setBoardData(bRes.data);
        }
      }
    });
  };

  const handleTabChange = (tab: 'my' | 'all') => {
    setActiveTab(tab);
    applyFilters(tab, selectedStatus, selectedType, selectedBranch, searchQuery);
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    applyFilters(activeTab, status, selectedType, selectedBranch, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(activeTab, selectedStatus, selectedType, selectedBranch, searchQuery);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
    setSelectedBranch('ALL');
    applyFilters(activeTab, 'ALL', 'ALL', 'ALL', '');
  };

  // Statuses order for Kanban Board (Requirement 20: BACKLOG -> TO DO -> IN PROGRESS -> REVIEW -> DONE + WAITING, CANCELLED)
  const boardColumns: RequestStatusCode[] = [
    'BACKLOG',
    'TO_DO',
    'IN_PROGRESS',
    'WAITING',
    'REVIEW',
    'DONE',
    'CANCELLED'
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              รายการคำขอฝ่ายการตลาด
            </h1>
            <span className="text-xs bg-red-50 text-red-600 font-semibold px-2.5 py-0.5 rounded-full border border-red-100">
              ระบบคำขอการตลาด
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            ติดตามสถานะงาน และจัดการคำขอจากทุกสาขาและสำนักงานใหญ่
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <ListIcon size={14} />
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('board');
                applyFilters(activeTab, selectedStatus, selectedType, selectedBranch, searchQuery);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'board'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <Kanban size={14} />
              <span>กระดาน</span>
            </button>
          </div>

          {/* New Request Button */}
          <Link
            href="/marketing/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>สร้างคำขอใหม่</span>
          </Link>
        </div>
      </div>

      {/* Tabs & Status Pills */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        {/* Main Tab Buttons */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('my')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${activeTab === 'my'
                ? 'bg-red-600 text-white shadow-sm shadow-red-500/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                }`}
            >
              คำขอของฉัน
            </button>

            {isMarketingOrAdmin && (
              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${activeTab === 'all'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-500/20'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                  }`}
              >
                คำขอทั้งหมดในระบบ
              </button>
            )}
          </div>

          <div className="text-xs text-gray-400">
            พบทั้งหมด <span className="font-bold text-gray-700">{counts.ALL || 0}</span> รายการ
          </div>
        </div>

        {/* Status Pills (Requirement 30) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => handleStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${selectedStatus === 'ALL'
              ? 'bg-red-600 text-white shadow-sm shadow-red-500/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <span>ทั้งหมด</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${selectedStatus === 'ALL' ? 'bg-white/20 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
              {counts.ALL || 0}
            </span>
          </button>

          {(Object.keys(REQUEST_STATUSES) as RequestStatusCode[]).map(st => {
            const config = REQUEST_STATUSES[st];
            const isSelected = selectedStatus === st;
            const count = counts[st] || 0;

            return (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${isSelected
                  ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-500/20'
                  : `${config.badgeBg} ${config.badgeText} ${config.borderColor} hover:opacity-85`
                  }`}
              >
                <span>{config.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-700 border border-gray-200 shadow-xs'
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Keyword Search */}
          <div className="sm:col-span-5 relative">
            <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่คำขอ, ชื่องาน, ผู้ขอ, สาขา..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-100 outline-none transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value);
                applyFilters(activeTab, selectedStatus, e.target.value, selectedBranch, searchQuery);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-red-500 outline-none"
            >
              <option value="ALL">ทุกประเภทคำขอ</option>
              {(Object.keys(REQUEST_TYPES) as RequestTypeCode[]).map(t => (
                <option key={t} value={t}>
                  {REQUEST_TYPES[t].title}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedBranch}
              onChange={e => {
                setSelectedBranch(e.target.value);
                applyFilters(activeTab, selectedStatus, selectedType, e.target.value, searchQuery);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:border-red-500 outline-none"
            >
              <option value="ALL">ทุกสาขา</option>
              {branches.map((b, idx) => (
                <option key={idx} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="sm:col-span-1 flex items-center justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              title="รีเซ็ตตัวกรอง"
              className="w-full h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* Loading Indicator */}
      {isPending && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-full animate-pulse border border-red-100">
            <Sparkles size={14} />
            <span>กำลังปรับปรุงข้อมูล...</span>
          </div>
        </div>
      )}

      {/* Content View: Table or Kanban */}
      {viewMode === 'list' ? (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                <FileText size={32} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">ไม่พบรายการคำขอ</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
                ยังไม่มีคำขอในเงื่อนไขที่ท่านเลือก สามารถคลิกปุ่มด้านล่างเพื่อสร้างคำขอใหม่
              </p>
              <Link
                href="/marketing/requests/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-500/20 transition-all"
              >
                <Plus size={16} />
                <span>สร้างคำขอใหม่</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3.5 px-4">เลขที่คำขอ</th>
                    <th className="py-3.5 px-4">ประเภทงาน</th>
                    <th className="py-3.5 px-4">ชื่องาน / รายละเอียด</th>
                    <th className="py-3.5 px-4">ผู้ขอ / สาขา</th>
                    <th className="py-3.5 px-4">วันที่ต้องการใช้</th>
                    <th className="py-3.5 px-4">ผู้รับผิดชอบ</th>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map(req => {
                    const typeConfig = REQUEST_TYPES[req.requestType as RequestTypeCode];
                    const statusConfig = REQUEST_STATUSES[req.status as RequestStatusCode];
                    const formattedDate = new Date(req.requiredDate).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    return (
                      <tr
                        key={req.id}
                        onClick={() => router.push(`/marketing/requests/${req.requestNo}`)}
                        className="hover:bg-red-50/25 cursor-pointer transition-colors group"
                      >
                        {/* Request No */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-red-600 group-hover:underline">
                            {req.requestNo}
                          </span>
                        </td>

                        {/* Request Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-700">
                            {typeConfig?.shortTitle || req.requestType}
                          </span>
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <p className="font-bold text-gray-900 line-clamp-1 group-hover:text-red-600 transition-colors">
                            {req.title}
                          </p>
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {req.description}
                          </p>
                        </td>

                        {/* Requester & Branch */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-gray-800">{req.requesterName}</p>
                          <p className="text-[11px] text-gray-400">
                            {req.requesterBranch} | {req.requesterDepartment}
                          </p>
                        </td>

                        {/* Required Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                            <Calendar size={13} className="text-gray-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Assignee */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {req.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-red-50 text-red-700 border border-red-100 font-bold flex items-center justify-center text-[10px]">
                                {req.assignedTo.fullName.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-800">{req.assignedTo.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">- ยังไม่มีผู้รับผิดชอบ -</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig?.badgeBg || 'bg-gray-100'
                              } ${statusConfig?.badgeText || 'text-gray-700'} ${statusConfig?.borderColor || 'border-gray-200'}`}
                          >
                            {statusConfig?.label || req.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                            <span>ดูรายละเอียด</span>
                            <ChevronRight size={14} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* KANBAN BOARD VIEW (Requirements 20-22) */
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-[1200px]">
            {boardColumns.map(colKey => {
              const colConfig = REQUEST_STATUSES[colKey];
              const colCards = boardData[colKey] || [];

              return (
                <div
                  key={colKey}
                  className="w-80 shrink-0 bg-gray-100/80 rounded-2xl p-3.5 border border-gray-200/80 flex flex-col max-h-[calc(100vh-250px)]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: colConfig.color }}
                      />
                      <h3 className="font-bold text-xs text-gray-800 tracking-wide uppercase">
                        {colConfig.label}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full shadow-xs border border-gray-200">
                      {colCards.length}
                    </span>
                  </div>

                  {/* Cards Scrollable Area */}
                  <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                    {colCards.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
                        ไม่มีงานในสถานะนี้
                      </div>
                    ) : (
                      colCards.map((card: any) => {
                        const typeConfig = REQUEST_TYPES[card.requestType as RequestTypeCode];
                        const formattedDate = new Date(card.requiredDate).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        });

                        return (
                          <div
                            key={card.id}
                            onClick={() => router.push(`/marketing/requests/${card.requestNo}`)}
                            className="bg-white rounded-xl p-3.5 shadow-sm hover:shadow-md border border-gray-200/80 hover:border-red-300 transition-all cursor-pointer group space-y-2.5"
                          >
                            {/* Card Top: Request ID & Type */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-red-600">
                                {card.requestNo}
                              </span>
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                                {typeConfig?.shortTitle || card.requestType}
                              </span>
                            </div>

                            {/* Card Title */}
                            <h4 className="font-bold text-xs text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">
                              {card.title}
                            </h4>

                            {/* Requester & Branch info */}
                            <div className="text-[11px] text-gray-500 flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                              <div className="flex items-center gap-1 truncate">
                                <User size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate">{card.requesterName}</span>
                              </div>
                              <span className="text-[10px] bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded shrink-0 font-medium">
                                {card.requesterBranch}
                              </span>
                            </div>

                            {/* Card Footer: Usage Date & Assignee */}
                            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                              <div className="flex items-center gap-1 font-medium text-gray-600">
                                <Clock size={11} />
                                <span>{formattedDate}</span>
                              </div>

                              <div>
                                {card.assignedTo ? (
                                  <span className="font-bold text-gray-700">
                                    {card.assignedTo.fullName}
                                  </span>
                                ) : (
                                  <span className="italic text-gray-400">- ไม่ระบุ -</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
