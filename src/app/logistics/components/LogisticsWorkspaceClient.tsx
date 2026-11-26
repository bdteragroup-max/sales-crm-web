'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { getLogisticsWorkspaceData } from '@/app/actions/logistics';
import {
  formatThaiDateSlash,
  LOGISTICS_SOURCE_META,
  LOGISTICS_TRIP_STATUS_META,
  toBangkokDateKey,
  type LogisticsQueueItem,
  type LogisticsStopSourceType,
  type LogisticsTripRecord,
  type LogisticsTripStatus,
  type LogisticsWorkspaceData,
} from '@/app/lib/logisticsTypes';
import TripBuilderModal from './TripBuilderModal';
import TripExecutionView from './TripExecutionView';

interface LogisticsWorkspaceClientProps {
  initialData: LogisticsWorkspaceData;
}

type ActiveMainTab = 'QUEUE' | 'TRIPS' | 'DRIVER';

export default function LogisticsWorkspaceClient({
  initialData,
}: LogisticsWorkspaceClientProps) {
  const [data, setData] = useState<LogisticsWorkspaceData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const defaultTab: ActiveMainTab =
    initialData.permissions.isTransportTeam && !initialData.permissions.isManager
      ? 'DRIVER'
      : 'QUEUE';
  const [activeTab, setActiveTab] = useState<ActiveMainTab>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Queue tab filters & multi-selection
  const [sourceFilter, setSourceFilter] = useState<'ALL' | Exclude<LogisticsStopSourceType, 'MANUAL'>>('ALL');
  const [includeUpcomingJobs, setIncludeUpcomingJobs] = useState(false);
  const [selectedQueueKeys, setSelectedQueueKeys] = useState<string[]>([]);

  // Trips tab filters
  const [tripStatusFilter, setTripStatusFilter] = useState<'ALL' | LogisticsTripStatus>('ALL');
  const [todayOnlyTrips, setTodayOnlyTrips] = useState(false);

  // Driver execution selected trip
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => {
    const activeMine = initialData.trips.find(
      (t) =>
        ['PLANNED', 'LOADING', 'IN_TRANSIT'].includes(t.status) &&
        (t.driverUserId === initialData.permissions.userId ||
          t.driverName === initialData.permissions.fullName)
    );
    const anyActive = initialData.trips.find((t) =>
      ['PLANNED', 'LOADING', 'IN_TRANSIT'].includes(t.status)
    );
    return activeMine?.id || anyActive?.id || initialData.trips[0]?.id || null;
  });

  // Builder Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderQueueSeed, setBuilderQueueSeed] = useState<LogisticsQueueItem[]>([]);

  const { permissions, vehicles, crewMembers, queueItems, trips, goldSummary } = data;

  const refreshAll = async (preferredTripId?: string) => {
    setIsRefreshing(true);
    try {
      const next = await getLogisticsWorkspaceData();
      if (next) {
        setData(next);
        if (preferredTripId) {
          setSelectedTripId(preferredTripId);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const todayKey = useMemo(() => toBangkokDateKey(new Date()), []);

  const filteredQueueItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queueItems.filter((item) => {
      if (!includeUpcomingJobs && !item.isReadyNow) return false;
      if (sourceFilter !== 'ALL' && item.sourceType !== sourceFilter) return false;
      if (!q) return true;
      const hay = [
        item.referenceNumber,
        item.customerName,
        item.destination,
        item.province,
        item.itemSummary,
        item.contactName,
        item.activeTripNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [queueItems, includeUpcomingJobs, sourceFilter, searchQuery]);

  const readyQueueCount = useMemo(
    () => queueItems.filter((item) => item.isReadyNow && !item.activeTripId).length,
    [queueItems]
  );
  const overdueQueueCount = useMemo(
    () => queueItems.filter((item) => item.isReadyNow && item.isOverdue).length,
    [queueItems]
  );

  const queueCountsBySource = useMemo(() => {
    const pool = queueItems.filter((item) => includeUpcomingJobs || item.isReadyNow);
    return {
      ALL: pool.length,
      JOB: pool.filter((i) => i.sourceType === 'JOB').length,
      REQUISITION: pool.filter((i) => i.sourceType === 'REQUISITION').length,
      REPAIR_DELIVERY: pool.filter((i) => i.sourceType === 'REPAIR_DELIVERY').length,
    };
  }, [queueItems, includeUpcomingJobs]);

  const activeTrips = useMemo(
    () => trips.filter((t) => ['PLANNED', 'LOADING', 'IN_TRANSIT'].includes(t.status)),
    [trips]
  );

  const tripCountsByStatus = useMemo(() => {
    const pool = todayOnlyTrips
      ? trips.filter((t) => toBangkokDateKey(t.tripDate) === todayKey)
      : trips;
    return {
      ALL: pool.length,
      PLANNED: pool.filter((t) => t.status === 'PLANNED').length,
      LOADING: pool.filter((t) => t.status === 'LOADING').length,
      IN_TRANSIT: pool.filter((t) => t.status === 'IN_TRANSIT').length,
      COMPLETED: pool.filter((t) => t.status === 'COMPLETED').length,
    };
  }, [trips, todayOnlyTrips, todayKey]);

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips.filter((t) => {
      if (tripStatusFilter !== 'ALL' && t.status !== tripStatusFilter) return false;
      if (todayOnlyTrips && toBangkokDateKey(t.tripDate) !== todayKey) return false;
      if (!q) return true;
      const hay = [
        t.tripNumber,
        t.vehiclePlate,
        t.vehicleName,
        t.courierName,
        t.driverName,
        t.helperNames,
        t.routeZone,
        ...t.stops.map((s) => `${s.referenceNumber || ''} ${s.customerName} ${s.destination || ''}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [trips, tripStatusFilter, todayOnlyTrips, todayKey, searchQuery]);

  const driverTrips = useMemo(() => {
    if (permissions.isManager) return trips;
    const mine = trips.filter(
      (t) => t.driverUserId === permissions.userId || t.driverName === permissions.fullName
    );
    return mine.length > 0 ? mine : trips;
  }, [trips, permissions]);

  const activeDriverTripsCount = useMemo(
    () =>
      driverTrips.filter((t) => ['PLANNED', 'LOADING', 'IN_TRANSIT'].includes(t.status)).length,
    [driverTrips]
  );

  const activeSelectedTrip: LogisticsTripRecord | null = useMemo(
    () => trips.find((t) => t.id === selectedTripId) || driverTrips[0] || null,
    [trips, selectedTripId, driverTrips]
  );

  const busyVehicleIdsToday = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of activeTrips) {
      if (t.vehicleAssetId && toBangkokDateKey(t.tripDate) === todayKey) {
        map.set(t.vehicleAssetId, t.tripNumber);
      }
    }
    return map;
  }, [activeTrips, todayKey]);

  const availableVehiclesTodayCount = useMemo(
    () => vehicles.filter((v) => v.status === 'available' && !busyVehicleIdsToday.has(v.id)).length,
    [vehicles, busyVehicleIdsToday]
  );

  const toggleQueueSelect = (queueKey: string) => {
    setSelectedQueueKeys((prev) =>
      prev.includes(queueKey) ? prev.filter((k) => k !== queueKey) : [...prev, queueKey]
    );
  };

  const allVisibleQueueSelected = useMemo(
    () =>
      filteredQueueItems.length > 0 &&
      filteredQueueItems.every((item) => selectedQueueKeys.includes(item.queueKey)),
    [filteredQueueItems, selectedQueueKeys]
  );

  const toggleSelectAllVisibleQueue = () => {
    if (!permissions.canPlanTrips || filteredQueueItems.length === 0) return;
    const visibleKeys = filteredQueueItems.map((i) => i.queueKey);
    if (allVisibleQueueSelected) {
      const visibleSet = new Set(visibleKeys);
      setSelectedQueueKeys((prev) => prev.filter((k) => !visibleSet.has(k)));
    } else {
      setSelectedQueueKeys((prev) => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  const openBuilderWithSelected = () => {
    const picked = queueItems.filter((item) => selectedQueueKeys.includes(item.queueKey));
    setBuilderQueueSeed(picked);
    setIsBuilderOpen(true);
  };

  const openSingleItemTrip = (item: LogisticsQueueItem) => {
    setBuilderQueueSeed([item]);
    setIsBuilderOpen(true);
  };

  const openTripInDriverTab = (tripId: string) => {
    setSelectedTripId(tripId);
    setActiveTab('DRIVER');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#f8fafc] text-slate-900">
      {/* ─── ROW 1: SYMMETRICAL STICKY HEADER ─── */}
      <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Truck size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base md:text-lg text-gray-900 leading-tight truncate">
              ศูนย์จัดการขนส่ง &amp; คิวรถ (Logistics)
            </h1>
            <p className="text-[11px] text-gray-500 font-medium leading-tight truncate hidden xl:block">
              รวมคิวงานจัดส่ง · จัดรถบริษัทวิ่งหลายจุด · ปิดส่ง POD บนมือถือ · คิดเบี้ยเลี้ยง/ค่าทางด่วน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {permissions.canPlanTrips && (
            <>
              <button
                type="button"
                onClick={openBuilderWithSelected}
                className="h-10 px-4 rounded-xl bg-[#ff2301] hover:bg-red-600 text-white text-xs md:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>
                  {selectedQueueKeys.length > 0
                    ? `จัดทริปจากที่เลือก (${selectedQueueKeys.length})`
                    : 'สร้างทริปวิ่งรถ'}
                </span>
              </button>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            </>
          )}
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-orange-600' : ''} />
          </button>
        </div>
      </header>

      {/* ─── ROW 2: SYMMETRICAL NAVIGATION TABS & SEARCH BAR (Uniform h-10 height) ─── */}
      <div className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="inline-flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 min-h-10">
          <button
            type="button"
            onClick={() => setActiveTab('QUEUE')}
            className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'QUEUE'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package size={13} />
            <span>คิวงานรอจัดส่ง</span>
            <span
              className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black inline-flex items-center justify-center leading-none ${
                activeTab === 'QUEUE' ? 'bg-red-50 text-[#ff2301]' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {readyQueueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRIPS')}
            className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'TRIPS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={13} />
            <span>จัดคิวรถ &amp; ตารางทริป</span>
            <span
              className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black inline-flex items-center justify-center leading-none ${
                activeTab === 'TRIPS' ? 'bg-orange-50 text-orange-700' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeTrips.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DRIVER')}
            className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'DRIVER'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck size={13} />
            <span>วิ่งรถ &amp; ปิดทริป (Mobile POD)</span>
            <span
              className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black inline-flex items-center justify-center leading-none ${
                activeTab === 'DRIVER'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeDriverTripsCount}
            </span>
          </button>
        </div>

        <div className="w-full md:w-72 lg:w-80 shrink-0">
          <div className="relative w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลข Job, ใบเบิก, ลูกค้า, ทะเบียนรถ..."
              className="w-full h-10 pl-8 pr-8 bg-slate-50 focus:bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                aria-label="ล้างคำค้นหา"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE ─── */}
      <main className="flex-1 px-4 sm:px-6 py-4 sm:py-5 w-full space-y-4">
        {/* Summary Grid — Uniform 3-Column KPI Blueprint */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-3.5 h-full">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-slate-500">คิวงานรอจัดส่ง (ยังไม่จัดทริป)</p>
                {overdueQueueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black leading-none">
                    เลยกำหนด {overdueQueueCount}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                  {readyQueueCount}
                </span>
                <span className="text-xs font-bold text-slate-400">รายการ</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {overdueQueueCount > 0 ? (
                  <span className="text-rose-600 font-bold">
                    มีงานเร่งด่วนเกินกำหนดส่ง {overdueQueueCount} จุด
                  </span>
                ) : (
                  'พร้อมมัดรวมจัดรอบวิ่งรถ'
                )}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-3.5 h-full">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-slate-500">ทริปรอออกรถ / กำลังวิ่ง</p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black leading-none">
                  รถว่าง {availableVehiclesTodayCount} คัน
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                  {activeTrips.length}
                </span>
                <span className="text-xs font-bold text-slate-400">ทริป</span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                รถบริษัทพร้อมวิ่งวันนี้{' '}
                <strong className="text-emerald-700">{availableVehiclesTodayCount}</strong> /{' '}
                {vehicles.length} คัน
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Car size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-3.5 h-full">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-slate-500">SLA ทีมขนส่งเดือนนี้ (≤ 5%)</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black leading-none ${
                    goldSummary.managerSlaPassed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  ล่าช้า {goldSummary.teamDelayRatePct}%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                  {goldSummary.teamSuccessfulDeliveries}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  / {goldSummary.teamTotalDeliveries} งานส่งตรงเวลา
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                POD ทริปของฉัน: <strong className="text-slate-700">{goldSummary.myTripStopsCompleted} จุด</strong> · เกณฑ์ SLA ทั้งทีม
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        {/* ─── TAB 1: UNIFIED QUEUE ─── */}
        {activeTab === 'QUEUE' && (
          <div className="space-y-3.5">
            {/* Symmetrical Queue Control Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 shadow-2xs">
              <div className="inline-flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 min-h-10">
                {(
                  [
                    ['ALL', 'ทั้งหมด', queueCountsBySource.ALL],
                    ['JOB', 'Jobs ส่งของ', queueCountsBySource.JOB],
                    ['REQUISITION', 'ใบเบิกสโตร์ (Req)', queueCountsBySource.REQUISITION],
                    ['REPAIR_DELIVERY', 'ใบส่งมอบซ่อม (DN)', queueCountsBySource.REPAIR_DELIVERY],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSourceFilter(key)}
                    className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      sourceFilter === key
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`min-w-4 h-4 px-1 rounded-full text-[10px] font-black inline-flex items-center justify-center leading-none ${
                        sourceFilter === key
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeUpcomingJobs}
                    onChange={(e) => setIncludeUpcomingJobs(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>รวมงานกำลังเตรียมของ (Pre-plan)</span>
                </label>

                {selectedQueueKeys.length > 0 && permissions.canPlanTrips && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedQueueKeys([])}
                      className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      ล้างที่เลือก ({selectedQueueKeys.length})
                    </button>
                    <button
                      type="button"
                      onClick={openBuilderWithSelected}
                      className="h-9 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Truck size={13} /> จัดคิวรถรวม {selectedQueueKeys.length} จุดส่ง
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Queue Table (Desktop) & Cards (Mobile) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {filteredQueueItems.length === 0 ? (
                <div className="py-16 px-6 text-center text-slate-400 space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Package size={24} />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">
                    ยังไม่มีคิวงานที่ตรงกับเงื่อนไขนี้
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    ลองเปิด &ldquo;รวมงานกำลังเตรียมของ (Pre-plan)&rdquo; เพื่อจองรถล่วงหน้า หรือกด &ldquo;สร้างทริปวิ่งรถ&rdquo; เพื่อเพิ่มจุดส่งเอง
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Symmetrical Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="py-3 px-3.5 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={allVisibleQueueSelected}
                              disabled={!permissions.canPlanTrips}
                              onChange={toggleSelectAllVisibleQueue}
                              title="เลือกทั้งหมดที่แสดง"
                              className="w-4 h-4 rounded border-slate-400 text-orange-500 focus:ring-orange-500 cursor-pointer accent-orange-500"
                            />
                          </th>
                          <th className="py-3 px-3.5 w-36 whitespace-nowrap">ประเภท / เลขที่</th>
                          <th className="py-3 px-3.5 min-w-[220px]">ลูกค้า / ปลายทางจัดส่ง</th>
                          <th className="py-3 px-3.5 min-w-[200px]">รายการสินค้า</th>
                          <th className="py-3 px-3.5 w-36 whitespace-nowrap">กำหนดส่ง / สถานะ</th>
                          <th className="py-3 px-3.5 w-40 text-center whitespace-nowrap">จัดคิวรถ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {filteredQueueItems.map((item) => {
                          const src = LOGISTICS_SOURCE_META[item.sourceType] || LOGISTICS_SOURCE_META.MANUAL;
                          const checked = selectedQueueKeys.includes(item.queueKey);
                          return (
                            <tr
                              key={item.queueKey}
                              className={`align-top transition-colors ${
                                checked ? 'bg-orange-50/70' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-3.5 px-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!permissions.canPlanTrips}
                                  onChange={() => toggleQueueSelect(item.queueKey)}
                                  className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                              </td>

                              <td className="py-3.5 px-3.5 whitespace-nowrap space-y-1">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${src.badge}`}
                                >
                                  {src.short} · {item.companyCode}
                                </span>
                                <div className="font-mono font-extrabold text-slate-900">
                                  {item.referenceNumber}
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 space-y-1">
                                <div className="font-extrabold text-slate-900">{item.customerName}</div>
                                {item.destination && (
                                  <p className="text-[11px] text-slate-600 flex items-start gap-1">
                                    <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
                                    <span>{item.destination}</span>
                                  </p>
                                )}
                                {(item.contactName || item.contactPhone) && (
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <Phone size={11} className="shrink-0" />
                                    <span>
                                      {item.contactName} {item.contactPhone}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-3.5">
                                <p className="text-[11px] text-slate-700 font-medium line-clamp-3 leading-relaxed">
                                  {item.itemSummary || '-'}
                                </p>
                              </td>

                              <td className="py-3.5 px-3.5 whitespace-nowrap space-y-1">
                                <div className="font-bold text-slate-900">
                                  {item.targetDate ? formatThaiDateSlash(item.targetDate) : 'ยังไม่ระบุวัน'}
                                </div>
                                {item.isOverdue && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                                    <AlertTriangle size={10} /> เลยกำหนด
                                  </span>
                                )}
                                <div
                                  className={`text-[10px] font-bold ${
                                    item.isReadyNow ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {item.readinessLabel}
                                </div>
                              </td>

                              <td className="py-3.5 px-3.5 text-center">
                                {item.activeTripId ? (
                                  <button
                                    type="button"
                                    onClick={() => openTripInDriverTab(item.activeTripId!)}
                                    className="w-32 h-8 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Truck size={12} /> {item.activeTripNumber}
                                  </button>
                                ) : permissions.canPlanTrips ? (
                                  <button
                                    type="button"
                                    onClick={() => openSingleItemTrip(item)}
                                    className="w-32 h-8 px-3 rounded-lg bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 text-[11px] font-bold inline-flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    + จัดขึ้นรถ
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">รอจัดคิว</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Responsive Queue Cards */}
                  <div className="md:hidden divide-y divide-slate-200/80">
                    {filteredQueueItems.map((item) => {
                      const src = LOGISTICS_SOURCE_META[item.sourceType] || LOGISTICS_SOURCE_META.MANUAL;
                      const checked = selectedQueueKeys.includes(item.queueKey);
                      return (
                        <div
                          key={`m-${item.queueKey}`}
                          className={`p-3.5 space-y-2 ${checked ? 'bg-orange-50/70' : 'bg-white'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!permissions.canPlanTrips}
                                onChange={() => toggleQueueSelect(item.queueKey)}
                                className="w-4 h-4 rounded border-slate-300 text-orange-600"
                              />
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${src.badge}`}
                              >
                                {src.short} · {item.companyCode}
                              </span>
                              <span className="font-mono text-xs font-extrabold text-slate-900">
                                {item.referenceNumber}
                              </span>
                            </label>

                            <span className="text-[11px] font-bold text-slate-600">
                              {item.targetDate ? formatThaiDateSlash(item.targetDate) : '-'}
                            </span>
                          </div>

                          <div className="text-xs font-extrabold text-slate-900">{item.customerName}</div>
                          {item.destination && (
                            <p className="text-[11px] text-slate-600 flex items-start gap-1">
                              <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
                              <span>{item.destination}</span>
                            </p>
                          )}
                          {item.itemSummary && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">{item.itemSummary}</p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.isOverdue && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                                  เลยกำหนด
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold ${
                                  item.isReadyNow ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {item.readinessLabel}
                              </span>
                            </div>

                            {item.activeTripId ? (
                              <button
                                type="button"
                                onClick={() => openTripInDriverTab(item.activeTripId!)}
                                className="h-8 px-3 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-extrabold inline-flex items-center gap-1"
                              >
                                <Truck size={12} /> {item.activeTripNumber}
                              </button>
                            ) : permissions.canPlanTrips ? (
                              <button
                                type="button"
                                onClick={() => openSingleItemTrip(item)}
                                className="h-8 px-3 rounded-lg bg-orange-600 text-white text-[11px] font-bold"
                              >
                                + จัดขึ้นรถ
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Balanced Queue Footer Strip */}
                  <div className="bg-slate-50/90 border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                    <span>แสดงทั้งหมด {filteredQueueItems.length} คิวงาน</span>
                    <span>
                      เลือกจัดทริปแล้ว{' '}
                      <strong className="text-slate-800">{selectedQueueKeys.length}</strong> จุดส่ง
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: FLEET AVAILABILITY & TRIP SCHEDULE ─── */}
        {activeTab === 'TRIPS' && (
          <div className="space-y-4">
            {/* Symmetrical Company Fleet Status Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Car size={15} className="text-orange-600" />
                  <span>สถานะรถบริษัทวันนี้ ({formatThaiDateSlash(new Date())})</span>
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                    ว่าง {availableVehiclesTodayCount} คัน
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                    กำลังวิ่ง {busyVehicleIdsToday.size} คัน
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold">
                    รวม {vehicles.length} คัน
                  </span>
                </div>
              </div>

              {vehicles.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 py-4 text-center text-xs text-slate-400">
                  ไม่พบข้อมูลทะเบียนรถบริษัท
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-0.5">
                  {vehicles.map((v) => {
                    const assignedTrip = busyVehicleIdsToday.get(v.id);
                    const isAvailable = v.status === 'available' && !assignedTrip;
                    return (
                      <div
                        key={v.id}
                        className={`rounded-xl border px-3 py-2 flex flex-col justify-between gap-1 transition-colors ${
                          assignedTrip
                            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                            : isAvailable
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-xs font-extrabold truncate">
                            {v.assetId}
                          </span>
                          {assignedTrip ? (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-black shrink-0">
                              {assignedTrip}
                            </span>
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                                isAvailable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isAvailable ? 'ว่าง' : 'ไม่ว่าง'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold opacity-80 truncate">
                          {v.vehicleType || v.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Symmetrical Trip Status Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 shadow-2xs">
              <div className="inline-flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 min-h-10">
                {(
                  [
                    ['ALL', 'ทั้งหมด', tripCountsByStatus.ALL],
                    ['PLANNED', 'จัดคิวรถแล้ว', tripCountsByStatus.PLANNED],
                    ['LOADING', 'กำลังโหลดของ', tripCountsByStatus.LOADING],
                    ['IN_TRANSIT', 'กำลังวิ่งจัดส่ง', tripCountsByStatus.IN_TRANSIT],
                    ['COMPLETED', 'ปิดทริปแล้ว', tripCountsByStatus.COMPLETED],
                  ] as const
                ).map(([stKey, stLabel, count]) => (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setTripStatusFilter(stKey)}
                    className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      tripStatusFilter === stKey
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <span>{stLabel}</span>
                    <span
                      className={`min-w-4 h-4 px-1 rounded-full text-[10px] font-black inline-flex items-center justify-center leading-none ${
                        tripStatusFilter === stKey
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between xl:justify-end gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  แสดง {filteredTrips.length} ทริป
                </span>
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={todayOnlyTrips}
                    onChange={(e) => setTodayOnlyTrips(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600"
                  />
                  <span>เฉพาะทริปวันนี้</span>
                </label>
              </div>
            </div>

            {/* Symmetrical 2-Column Trip Cards Grid */}
            {filteredTrips.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 text-center text-slate-400 space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Truck size={24} />
                </div>
                <p className="font-bold text-slate-700 text-sm">ยังไม่มีรอบวิ่งรถในเงื่อนไขนี้</p>
                <p className="text-xs text-slate-400">
                  เลือกแท็บ &ldquo;คิวงานรอจัดส่ง&rdquo; หรือกดปุ่ม &ldquo;สร้างทริปวิ่งรถ&rdquo; เพื่อเริ่มจัดคิวรถ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
                {filteredTrips.map((trip) => {
                  const meta = LOGISTICS_TRIP_STATUS_META[trip.status] || LOGISTICS_TRIP_STATUS_META.PLANNED;
                  const deliveredCount = trip.stops.filter((s) => s.status === 'DELIVERED').length;
                  const totalStops = trip.stops.length;
                  const progressPct = totalStops > 0 ? Math.round((deliveredCount / totalStops) * 100) : 0;
                  const visibleStops = trip.stops.slice(0, 4);
                  const remainingStops = Math.max(0, totalStops - visibleStops.length);

                  return (
                    <div
                      key={trip.id}
                      className="h-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-orange-300 transition-all"
                    >
                      <div className="space-y-3">
                        {/* Card Top Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-black text-slate-900">
                                {trip.tripNumber}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border inline-flex items-center gap-1 ${meta.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                              {formatThaiDateSlash(trip.tripDate)}
                              {trip.departureTime ? ` · ออก ${trip.departureTime} น.` : ''}
                              {trip.routeZone ? ` · ${trip.routeZone}` : ''}
                            </p>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-extrabold">
                              ส่งแล้ว {deliveredCount}/{totalStops} จุด
                            </span>
                            <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden ml-auto">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Uniform 2-Column Vehicle & Crew Strip */}
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-xs">
                          <div className="min-w-0 flex items-center gap-1.5 font-bold text-slate-700">
                            <Truck size={13} className="text-orange-600 shrink-0" />
                            <span className="truncate">{trip.vehiclePlate || trip.courierName || '-'}</span>
                          </div>
                          <div className="min-w-0 flex items-center gap-1.5 font-semibold text-slate-700">
                            <Users size={13} className="text-indigo-600 shrink-0" />
                            <span className="truncate">
                              {trip.driverName ||
                                (trip.transportType === 'EXTERNAL'
                                  ? `ขนส่งนอก · ${trip.courierName || '-'}`
                                  : '-')}
                            </span>
                          </div>
                        </div>

                        {/* Clean Bounded Stop Chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {visibleStops.map((st) => (
                            <span
                              key={st.id}
                              className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 max-w-full ${
                                st.status === 'DELIVERED'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : st.status === 'FAILED' || st.status === 'RESCHEDULED'
                                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="truncate">
                                #{st.stopOrder} {st.customerName}
                              </span>
                              {st.status === 'DELIVERED' && <CheckCircle2 size={10} className="shrink-0" />}
                            </span>
                          ))}
                          {remainingStops > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-extrabold">
                              +{remainingStops} จุดส่ง
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Balanced Card Footer */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 truncate">
                          {trip.status === 'COMPLETED' ? (
                            <span className="font-bold text-emerald-700">
                              เบี้ยเลี้ยง/ค่าทริป: ฿
                              {trip.totalExpenseAmount.toLocaleString('th-TH', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              จัดโดย {trip.createdByName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/logistics/trips/${trip.id}`}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <ExternalLink size={11} /> เปิดหน้าแยก
                          </Link>
                          <button
                            type="button"
                            onClick={() => openTripInDriverTab(trip.id)}
                            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap"
                          >
                            {trip.status === 'COMPLETED' ? 'ดูสรุปทริป' : 'บันทึก POD / ปิดทริป'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: DRIVER CONSOLE & MOBILE POD ─── */}
        {activeTab === 'DRIVER' && (
          <div className="space-y-4">
            {/* Symmetrical Trip Switcher Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-700 px-1 flex items-center gap-1.5 mr-1">
                  <Clock size={13} className="text-orange-600" /> เลือกทริปปฏิบัติงาน:
                </span>
                {driverTrips.length === 0 ? (
                  <span className="text-xs text-slate-400">ยังไม่มีทริปวิ่งรถ</span>
                ) : (
                  driverTrips.slice(0, 12).map((t) => {
                    const selected = activeSelectedTrip?.id === t.id;
                    const meta = LOGISTICS_TRIP_STATUS_META[t.status] || LOGISTICS_TRIP_STATUS_META.PLANNED;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTripId(t.id)}
                        className={`h-8 px-3 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                          selected
                            ? 'bg-orange-50 text-orange-800 border-orange-300 ring-1 ring-orange-200 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        <span className="font-mono">{t.tripNumber}</span>
                        <span className="text-[10px] opacity-75">
                          ({t.stops.filter((s) => s.status === 'DELIVERED').length}/{t.stops.length})
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 text-[11px] font-semibold text-slate-500">
                <span>ทั้งหมด {driverTrips.length} ทริป</span>
                {activeSelectedTrip && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold">
                    กำลังดู {activeSelectedTrip.tripNumber}
                  </span>
                )}
              </div>
            </div>

            {activeSelectedTrip ? (
              <TripExecutionView
                key={activeSelectedTrip.id}
                trip={activeSelectedTrip}
                permissions={permissions}
                onRefresh={() => refreshAll(activeSelectedTrip.id)}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 text-center text-slate-400 space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Sparkles size={24} />
                </div>
                <p className="font-bold text-slate-700 text-sm">
                  ยังไม่มีรอบวิ่งรถที่เปิดใช้งาน
                </p>
                {permissions.canPlanTrips && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderQueueSeed([]);
                      setIsBuilderOpen(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus size={14} /> สร้างทริปวิ่งรถใหม่
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <TripBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        vehicles={vehicles}
        crewMembers={crewMembers}
        branches={data.branches || []}
        existingTrips={trips}
        initialQueueItems={builderQueueSeed}
        currentUserId={permissions.userId}
        currentUserEmployeeId={permissions.employeeId}
        currentUserName={permissions.fullName}
        onVehicleAdded={(newVeh) => {
          setData((prev) => ({
            ...prev,
            vehicles: prev.vehicles.some((v) => v.id === newVeh.id)
              ? prev.vehicles
              : [newVeh, ...prev.vehicles],
          }));
        }}
        onCreated={async (createdTrip) => {
          setSelectedQueueKeys([]);
          await refreshAll(createdTrip.id);
          setActiveTab('DRIVER');
        }}
      />
    </div>
  );
}
