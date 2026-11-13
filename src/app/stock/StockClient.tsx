'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Boxes,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Search,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  History,
  SlidersHorizontal,
  Pencil,
  RotateCcw,
  Download,
  RefreshCw,
  FolderPlus,
  ShieldCheck,
  User,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  TrendingDown,
  TrendingUp,
  Eye,
  Lock,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  getStockDashboardData,
  getStockTransactions,
  cancelWithdrawTransaction,
} from '@/app/actions/stock';
import {
  type SerializedStockCategory,
  type SerializedStockItem,
  type SerializedStockTransaction,
  type StockStatusKind,
  STOCK_TX_TYPE_META,
  getStockStatusLabel,
  formatBkkDateTime,
  formatBkkDateTimeFull,
} from '@/app/lib/stockUtils';
import WithdrawModal from './components/WithdrawModal';
import RestockModal from './components/RestockModal';
import StockItemFormModal from './components/StockItemFormModal';
import CategoryModal from './components/CategoryModal';

interface StockSummary {
  totalItems: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  withdrawnThisMonth: number;
  restockedThisMonth: number;
}

interface StockPermissions {
  canWithdraw: boolean;
  canManageStock: boolean;
  canManageCategories: boolean;
  isMarketingManager: boolean;
}

interface StockCurrentUser {
  id: string;
  fullName: string;
  role: string;
  branch: string | null;
}

interface StockClientProps {
  initialCategories: SerializedStockCategory[];
  initialActiveCategoryCode: string | null;
  initialItems: SerializedStockItem[];
  initialSummary: StockSummary;
  initialTransactions: SerializedStockTransaction[];
  initialTransactionsTotal: number;
  users: Array<{ id: string; fullName: string; role: string }>;
  permissions: StockPermissions;
  currentUser: StockCurrentUser;
}

type ItemSortOption = 'default' | 'stock_asc' | 'stock_desc' | 'withdrawn_desc' | 'name_asc';
type ViewModeOption = 'table' | 'cards';

const HISTORY_PAGE_SIZE = 25;

const STATUS_FILTER_PILLS: Array<{
  key: 'ALL' | StockStatusKind;
  label: string;
  dotClass: string;
}> = [
    { key: 'ALL', label: 'ทั้งหมด', dotClass: 'bg-slate-900' },
    { key: 'IN_STOCK', label: 'พร้อมเบิก', dotClass: 'bg-slate-500' },
    { key: 'LOW_STOCK', label: 'ใกล้หมด', dotClass: 'bg-red-400' },
    { key: 'OUT_OF_STOCK', label: 'หมดสต็อก', dotClass: 'bg-red-600' },
    { key: 'INACTIVE', label: 'ปิดใช้งาน', dotClass: 'bg-slate-300' },
  ];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStockTextColorClass(item: SerializedStockItem): string {
  if (!item.isActive) return 'text-slate-400';
  if (item.currentStock <= 0) return 'text-red-600';
  if (item.statusKind === 'LOW_STOCK') return 'text-red-500';
  return 'text-slate-900';
}

function computeStockGaugePercent(item: SerializedStockItem): number {
  if (!item.isActive || item.currentStock <= 0) return 0;
  const referenceMax =
    item.minStock && item.minStock > 0
      ? Math.max(item.minStock * 3, item.currentStock)
      : Math.max(50, item.currentStock);
  return Math.max(8, Math.min(100, Math.round((item.currentStock / referenceMax) * 100)));
}

function StockLevelBar({
  item,
  widthClass = 'w-24',
}: {
  item: SerializedStockItem;
  widthClass?: string;
}) {
  const pct = computeStockGaugePercent(item);
  const fillClass = !item.isActive
    ? 'bg-slate-300'
    : item.currentStock <= 0
      ? 'bg-red-600'
      : item.statusKind === 'LOW_STOCK'
        ? 'bg-red-500'
        : 'bg-slate-700';

  return (
    <div className={`${widthClass} h-1.5 rounded-full bg-slate-100 overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ItemUtilityGroup({
  item,
  canManageStock,
  buttonHeightClass,
  onAdjust,
  onEdit,
  onHistory,
}: {
  item: SerializedStockItem;
  canManageStock: boolean;
  buttonHeightClass: string;
  onAdjust: (item: SerializedStockItem) => void;
  onEdit: (item: SerializedStockItem) => void;
  onHistory: (item: SerializedStockItem) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white divide-x divide-slate-200 overflow-hidden shrink-0">
      {canManageStock && (
        <>
          <button
            type="button"
            onClick={() => onAdjust(item)}
            title="ปรับยอดตรวจนับสต็อก"
            aria-label="ปรับยอดตรวจนับสต็อก"
            className={`${buttonHeightClass} inline-flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="แก้ไขข้อมูลสินค้า"
            aria-label="แก้ไขข้อมูลสินค้า"
            className={`${buttonHeightClass} inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onHistory(item)}
        title="ดูประวัติเคลื่อนไหวสินค้านี้"
        aria-label="ดูประวัติเคลื่อนไหวสินค้านี้"
        className={`${buttonHeightClass} inline-flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors cursor-pointer`}
      >
        <History className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function StockItemCard({
  item,
  canManageStock,
  onWithdraw,
  onRestock,
  onAdjust,
  onEdit,
  onHistory,
  onPreviewImage,
}: {
  item: SerializedStockItem;
  canManageStock: boolean;
  onWithdraw: (itemId: string) => void;
  onRestock: (itemId: string) => void;
  onAdjust: (item: SerializedStockItem) => void;
  onEdit: (item: SerializedStockItem) => void;
  onHistory: (item: SerializedStockItem) => void;
  onPreviewImage: (item: SerializedStockItem) => void;
}) {
  const statusMeta = getStockStatusLabel(item.statusKind);
  const canWithdrawThis = item.isActive && item.currentStock > 0;
  const withdrawDisabledLabel = !item.isActive ? 'ปิดใช้งาน' : 'หมดสต็อก';

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-red-300/80 hover:shadow-md transition-all">
      {/* Top: Thumbnail + Title + Status */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {item.imageUrl ? (
              <button
                type="button"
                onClick={() => onPreviewImage(item)}
                title="คลิกดูรูปภาพสินค้า"
                className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 hover:ring-2 hover:ring-red-300 transition-all cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Package className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3
                className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[40px]"
                title={item.name}
              >
                {item.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-medium">
                  {item.sku || 'ไม่มี SKU'}
                </span>
                {item.prInfo && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium truncate max-w-[130px]">
                    PR: {item.prInfo}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
            {statusMeta.label}
          </span>
        </div>

        {/* Middle: Symmetrical 2-Column Metric Well */}
        <div className="grid grid-cols-2 rounded-xl bg-slate-50/90 border border-slate-200/70 divide-x divide-slate-200/80">
          <div className="p-3 space-y-1.5">
            <div className="text-[11px] font-medium text-slate-500">คงเหลือปัจจุบัน</div>
            <div className={`text-xl font-black leading-none tabular-nums ${getStockTextColorClass(item)}`}>
              {item.currentStock.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
            </div>
            <StockLevelBar item={item} widthClass="w-full" />
          </div>

          <div className="p-3 flex flex-col justify-between">
            <div className="text-[11px] font-medium text-slate-500">เบิกใช้ 30 วัน</div>
            <div className="text-base font-bold text-slate-800 tabular-nums">
              {(item.withdrawn30d ?? 0) > 0
                ? `${(item.withdrawn30d ?? 0).toLocaleString()} ${item.unit}`
                : '-'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {item.minStock !== null && item.minStock > 0
                ? `แจ้งเตือน ≤ ${item.minStock.toLocaleString()} ${item.unit}`
                : 'ไม่ตั้งจุดแจ้งเตือน'}
            </div>
          </div>
        </div>

        {/* Note & Updated Info */}
        <div className="text-xs text-slate-500 space-y-1">
          {item.note && (
            <p className="truncate bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100" title={item.note}>
              หมายเหตุ: {item.note}
            </p>
          )}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <span className="truncate">อัปเดต: {item.updatedByName || '-'}</span>
            <span className="shrink-0">{formatBkkDateTime(item.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Bottom: Symmetrical Action Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          disabled={!canWithdrawThis}
          onClick={() => onWithdraw(item.id)}
          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowDownCircle className="w-4 h-4 shrink-0" />
          <span>{canWithdrawThis ? 'เบิกเลย' : withdrawDisabledLabel}</span>
        </button>

        {canManageStock && (
          <button
            type="button"
            onClick={() => onRestock(item.id)}
            className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4 shrink-0" />
            <span>เติมสต็อก</span>
          </button>
        )}

        <ItemUtilityGroup
          item={item}
          canManageStock={canManageStock}
          buttonHeightClass="w-10 h-10"
          onAdjust={onAdjust}
          onEdit={onEdit}
          onHistory={onHistory}
        />
      </div>
    </div>
  );
}

function HistoryMobileCard({
  tx,
  canManageStock,
  isCancelling,
  onCancelWithdraw,
}: {
  tx: SerializedStockTransaction;
  canManageStock: boolean;
  isCancelling: boolean;
  onCancelWithdraw: (tx: SerializedStockTransaction) => void;
}) {
  const meta = STOCK_TX_TYPE_META[tx.txType] ?? {
    label: tx.txType,
    shortLabel: tx.txType,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    sign: 'neutral' as const,
  };
  const isCancelled = tx.status === 'CANCELLED';
  const canCancelThis =
    canManageStock && tx.txType === 'WITHDRAW' && tx.status === 'COMPLETED';
  const qtyColor =
    tx.qtyChange > 0
      ? 'text-slate-900'
      : tx.qtyChange < 0
        ? 'text-red-600'
        : 'text-slate-700';

  return (
    <div
      className={`rounded-2xl border border-slate-200 p-4 space-y-3 ${isCancelled ? 'bg-slate-50 opacity-80' : 'bg-white'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}
            >
              {meta.shortLabel}
            </span>
            {isCancelled && (
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                ยกเลิกแล้ว
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-400">{tx.batchCode || '-'}</span>
          </div>
          <h4
            className={`text-sm font-bold text-slate-900 ${isCancelled ? 'line-through text-slate-500' : ''
              }`}
          >
            {tx.itemName}
          </h4>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-lg font-extrabold tabular-nums ${qtyColor}`}>
            {tx.qtyChange > 0
              ? `+${tx.qtyChange.toLocaleString()}`
              : tx.qtyChange.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">{tx.itemUnit}</span>
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {tx.stockBefore.toLocaleString()} → {tx.stockAfter.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-800">
            {tx.requesterName || tx.createdByName || '-'}
          </span>
          {tx.branch && (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                {tx.branch}
              </span>
            </>
          )}
        </div>
        {(tx.purpose || tx.note) && (
          <div className="flex items-start gap-1.5 text-slate-500">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{[tx.purpose, tx.note].filter(Boolean).join(' • ')}</span>
          </div>
        )}
        {isCancelled && (
          <div className="text-red-600">
            ยกเลิกโดย {tx.cancelledByName || '-'}: {tx.cancelReason || '-'}
          </div>
        )}
        <div className="text-[11px] text-slate-400">{formatBkkDateTimeFull(tx.txDate)}</div>
      </div>

      {canCancelThis && (
        <button
          type="button"
          disabled={isCancelling}
          onClick={() => onCancelWithdraw(tx)}
          className="w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {isCancelling ? 'กำลังคืนสต็อก...' : 'ยกเลิกการเบิก & คืนสต็อก'}
        </button>
      )}
    </div>
  );
}

export default function StockClient({
  initialCategories,
  initialActiveCategoryCode,
  initialItems,
  initialSummary,
  initialTransactions,
  initialTransactionsTotal,
  users,
  permissions,
  currentUser,
}: StockClientProps) {
  const [categories, setCategories] = useState<SerializedStockCategory[]>(initialCategories);
  const [activeCategoryCode, setActiveCategoryCode] = useState<string | null>(
    initialActiveCategoryCode
  );
  const [items, setItems] = useState<SerializedStockItem[]>(initialItems);
  const [summary, setSummary] = useState<StockSummary>(initialSummary);

  const [transactions, setTransactions] =
    useState<SerializedStockTransaction[]>(initialTransactions);
  const [transactionsTotal, setTransactionsTotal] = useState<number>(initialTransactionsTotal);
  const [transactionsPage, setTransactionsPage] = useState<number>(1);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');
  const [viewMode, setViewMode] = useState<ViewModeOption>('table');
  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemStatusFilter, setItemStatusFilter] = useState<'ALL' | StockStatusKind>('ALL');
  const [itemSort, setItemSort] = useState<ItemSortOption>('default');
  const [previewItem, setPreviewItem] = useState<SerializedStockItem | null>(null);

  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyTxType, setHistoryTxType] = useState<string>('ALL');
  const [historyItemId, setHistoryItemId] = useState<string>('ALL');
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');

  const [withdrawModal, setWithdrawModal] = useState<{
    open: boolean;
    initialItemId: string | null;
    nonce: number;
  }>({ open: false, initialItemId: null, nonce: 0 });

  const [restockModal, setRestockModal] = useState<{
    open: boolean;
    initialItemId: string | null;
    nonce: number;
  }>({ open: false, initialItemId: null, nonce: 0 });

  const [itemFormModal, setItemFormModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'adjust';
    editingItem: SerializedStockItem | null;
    nonce: number;
  }>({ open: false, mode: 'create', editingItem: null, nonce: 0 });

  const [categoryModal, setCategoryModal] = useState<{ open: boolean; nonce: number }>({
    open: false,
    nonce: 0,
  });

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const activeCategory = useMemo(() => {
    if (!categories.length) return null;
    return categories.find((c) => c.code === activeCategoryCode) ?? categories[0] ?? null;
  }, [categories, activeCategoryCode]);

  const statusCounts = useMemo(() => {
    const counts: Record<'ALL' | StockStatusKind, number> = {
      ALL: items.length,
      IN_STOCK: 0,
      LOW_STOCK: 0,
      OUT_OF_STOCK: 0,
      INACTIVE: 0,
    };
    for (const item of items) {
      counts[item.statusKind] = (counts[item.statusKind] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const list = items.filter((item) => {
      if (itemStatusFilter !== 'ALL' && item.statusKind !== itemStatusFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        item.name,
        item.sku ?? '',
        item.unit,
        item.prInfo ?? '',
        item.note ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    if (itemSort === 'default') return list;
    const sorted = [...list];
    if (itemSort === 'stock_asc') {
      sorted.sort((a, b) => a.currentStock - b.currentStock);
    } else if (itemSort === 'stock_desc') {
      sorted.sort((a, b) => b.currentStock - a.currentStock);
    } else if (itemSort === 'withdrawn_desc') {
      sorted.sort((a, b) => (b.withdrawn30d ?? 0) - (a.withdrawn30d ?? 0));
    } else if (itemSort === 'name_asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return sorted;
  }, [items, itemSearch, itemStatusFilter, itemSort]);

  const activeWithdrawableCount = useMemo(
    () => items.filter((it) => it.isActive && it.currentStock > 0).length,
    [items]
  );

  const hasActiveItemFilters = Boolean(
    itemSearch.trim() || itemStatusFilter !== 'ALL' || itemSort !== 'default'
  );

  const hasActiveHistoryFilters = Boolean(
    historySearch.trim() ||
    historyTxType !== 'ALL' ||
    historyItemId !== 'ALL' ||
    historyDateFrom ||
    historyDateTo
  );

  const openWithdrawModal = (initialItemId: string | null = null) => {
    setWithdrawModal((prev) => ({
      open: true,
      initialItemId,
      nonce: prev.nonce + 1,
    }));
  };

  const openRestockModal = (initialItemId: string | null = null) => {
    if (!permissions.canManageStock) return;
    setRestockModal((prev) => ({
      open: true,
      initialItemId,
      nonce: prev.nonce + 1,
    }));
  };

  const openItemFormModal = (
    mode: 'create' | 'edit' | 'adjust',
    editingItem: SerializedStockItem | null = null
  ) => {
    if (!permissions.canManageStock) return;
    setItemFormModal((prev) => ({
      open: true,
      mode,
      editingItem,
      nonce: prev.nonce + 1,
    }));
  };

  const openCategoryModal = () => {
    if (!permissions.canManageCategories) return;
    setCategoryModal((prev) => ({ open: true, nonce: prev.nonce + 1 }));
  };

  const loadTransactions = async (overrides?: {
    categoryId?: string | null;
    page?: number;
    search?: string;
    txType?: string;
    itemId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const targetCatId =
      overrides?.categoryId !== undefined
        ? overrides.categoryId
        : (activeCategory?.id ?? null);
    const targetPage = overrides?.page ?? transactionsPage;
    const targetSearch = overrides?.search ?? historySearch;
    const targetTxType = overrides?.txType ?? historyTxType;
    const targetItemId = overrides?.itemId ?? historyItemId;
    const targetDateFrom = overrides?.dateFrom ?? historyDateFrom;
    const targetDateTo = overrides?.dateTo ?? historyDateTo;

    setIsLoadingHistory(true);
    try {
      const res = await getStockTransactions({
        categoryId: targetCatId ?? undefined,
        itemId: targetItemId === 'ALL' ? undefined : targetItemId,
        txType: targetTxType === 'ALL' ? undefined : targetTxType,
        search: targetSearch.trim() || undefined,
        dateFrom: targetDateFrom || undefined,
        dateTo: targetDateTo || undefined,
        page: targetPage,
        pageSize: HISTORY_PAGE_SIZE,
      });

      if (res.success) {
        setTransactions(res.rows);
        setTransactionsTotal(res.totalCount);
        setTransactionsPage(res.page);
      } else if (res.error) {
        await Swal.fire({
          icon: 'error',
          title: 'โหลดประวัติไม่สำเร็จ',
          text: res.error,
          confirmButtonColor: '#dc2626',
        });
      }
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'โหลดประวัติไม่สำเร็จ',
        text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const refreshDashboard = async (
    targetCategoryCode?: string,
    opts?: { resetFilters?: boolean }
  ) => {
    const codeToFetch = targetCategoryCode ?? activeCategoryCode ?? undefined;
    const switchingCategory = Boolean(
      targetCategoryCode && targetCategoryCode !== activeCategoryCode
    );
    const resetFilters = opts?.resetFilters ?? switchingCategory;

    setIsRefreshing(true);
    try {
      const res = await getStockDashboardData(codeToFetch);
      if (!res.success) {
        await Swal.fire({
          icon: 'error',
          title: 'โหลดข้อมูลสต็อกไม่สำเร็จ',
          text: res.error,
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      setCategories(res.categories);
      setActiveCategoryCode(res.activeCategoryCode);
      setItems(res.items);
      setSummary(res.summary);

      const resolvedCat =
        res.categories.find((c) => c.code === res.activeCategoryCode) ??
        res.categories[0] ??
        null;

      if (switchingCategory && res.activeCategoryCode && typeof window !== 'undefined') {
        window.history.replaceState(
          null,
          '',
          `/stock?category=${encodeURIComponent(res.activeCategoryCode)}`
        );
      }

      if (resetFilters) {
        setItemSearch('');
        setItemStatusFilter('ALL');
        setItemSort('default');
        setHistorySearch('');
        setHistoryTxType('ALL');
        setHistoryItemId('ALL');
        setHistoryDateFrom('');
        setHistoryDateTo('');
        await loadTransactions({
          categoryId: resolvedCat?.id ?? null,
          page: 1,
          search: '',
          txType: 'ALL',
          itemId: 'ALL',
          dateFrom: '',
          dateTo: '',
        });
      } else {
        await loadTransactions({
          categoryId: resolvedCat?.id ?? null,
          page: transactionsPage,
        });
      }
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'รีเฟรชข้อมูลไม่สำเร็จ',
        text: 'ไม่สามารถดึงข้อมูลล่าสุดจากระบบได้',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetItemFilters = () => {
    setItemSearch('');
    setItemStatusFilter('ALL');
    setItemSort('default');
  };

  const handleHistorySearchInput = (nextValue: string) => {
    setHistorySearch(nextValue);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      void loadTransactions({ search: nextValue, page: 1 });
    }, 350);
  };

  const handleResetHistoryFilters = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setHistorySearch('');
    setHistoryTxType('ALL');
    setHistoryItemId('ALL');
    setHistoryDateFrom('');
    setHistoryDateTo('');
    void loadTransactions({
      search: '',
      txType: 'ALL',
      itemId: 'ALL',
      dateFrom: '',
      dateTo: '',
      page: 1,
    });
  };

  const handleJumpToItemHistory = (item: SerializedStockItem) => {
    setActiveTab('history');
    setHistoryItemId(item.id);
    setHistoryTxType('ALL');
    setHistorySearch('');
    setHistoryDateFrom('');
    setHistoryDateTo('');
    void loadTransactions({
      itemId: item.id,
      txType: 'ALL',
      search: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
    });
  };

  const handleCancelWithdraw = async (tx: SerializedStockTransaction) => {
    if (!permissions.canManageStock || tx.txType !== 'WITHDRAW' || tx.status !== 'COMPLETED') {
      return;
    }

    const restoreQty = Math.abs(tx.qtyChange);
    const result = await Swal.fire({
      title: 'ยืนยันยกเลิกการเบิกและคืนสต็อก',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.6;color:#334155;">
          <p><strong>สินค้า:</strong> ${escapeHtml(tx.itemName)}</p>
          <p><strong>ผู้เบิกเดิม:</strong> ${escapeHtml(tx.requesterName || tx.createdByName || '-')}</p>
          <p><strong>คืนสต็อกทันที:</strong> <span style="color:#0f172a;font-weight:700;">+${restoreQty.toLocaleString()} ${escapeHtml(tx.itemUnit)}</span></p>
        </div>
      `,
      icon: 'warning',
      input: 'text',
      inputLabel: 'เหตุผลในการยกเลิก / คืนยอด *',
      inputPlaceholder: 'เช่น คีย์จำนวนผิด, เบิกผิดรายการ, ยกเลิกงานอีเวนต์',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันคืนยอดเข้าสต็อก',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณาระบุเหตุผลในการยกเลิก';
        }
        return null;
      },
    });

    if (!result.isConfirmed || !result.value) return;

    setCancellingTxId(tx.id);
    try {
      const res = await cancelWithdrawTransaction({
        transactionId: tx.id,
        reason: String(result.value).trim(),
      });
      if (!res.success) {
        await Swal.fire({
          icon: 'error',
          title: 'ยกเลิกรายการไม่สำเร็จ',
          text: res.error,
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'คืนสต็อกเรียบร้อย',
        text: `บันทึกการยกเลิกและคืน +${restoreQty.toLocaleString()} ${tx.itemUnit} (${res.batchCode})`,
        timer: 2200,
        showConfirmButton: false,
      });

      await refreshDashboard(activeCategoryCode ?? undefined, { resetFilters: false });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อระบบเพื่อยกเลิกรายการได้',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setCancellingTxId(null);
    }
  };

  const handleExportItemsExcel = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = filteredItems.map((item, idx) => ({
      ลำดับ: idx + 1,
      รหัสสินค้า: item.sku ?? '-',
      ชื่อสินค้า: item.name,
      หมวดหมู่: item.categoryName,
      คงเหลือปัจจุบัน: item.currentStock,
      หน่วย: item.unit,
      จุดสั่งซื้อ_Min: item.minStock ?? '-',
      สถานะ: getStockStatusLabel(item.statusKind).label,
      เบิกใช้_30_วัน: item.withdrawn30d ?? 0,
      ข้อมูล_PR_สั่งซื้อ: item.prInfo ?? '-',
      หมายเหตุ: item.note ?? '-',
      อัปเดตล่าสุดโดย: item.updatedByName ?? '-',
      เวลาอัปเดตล่าสุด: formatBkkDateTimeFull(item.updatedAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `สต็อก_${activeCategory?.code ?? 'ALL'}_${todayStr}.xlsx`);
  };

  const handleExportHistoryExcel = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = transactions.map((tx, idx) => {
      const meta = STOCK_TX_TYPE_META[tx.txType];
      return {
        ลำดับ: (transactionsPage - 1) * HISTORY_PAGE_SIZE + idx + 1,
        วันที่เวลา: formatBkkDateTimeFull(tx.txDate),
        รหัสเอกสาร: tx.batchCode ?? '-',
        ประเภท: meta?.label ?? tx.txType,
        สถานะรายการ: tx.status === 'CANCELLED' ? 'ยกเลิกแล้ว' : 'สำเร็จ',
        รหัส_SKU: tx.itemSku ?? '-',
        ชื่อสินค้า: tx.itemName,
        จำนวนเปลี่ยนแปลง: tx.qtyChange,
        คงเหลือก่อน: tx.stockBefore,
        คงเหลือหลัง: tx.stockAfter,
        หน่วย: tx.itemUnit,
        ผู้เบิก_ผู้รับ: tx.requesterName ?? '-',
        สาขา_หน้างาน: tx.branch ?? '-',
        วัตถุประสงค์: tx.purpose ?? '-',
        หมายเหตุ: tx.note ?? '-',
        ผู้ทำรายการในระบบ: tx.createdByName ?? '-',
        เหตุผลที่ยกเลิก: tx.cancelReason ?? '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History');
    XLSX.writeFile(wb, `ประวัติสต็อก_${activeCategory?.code ?? 'ALL'}_p${transactionsPage}_${todayStr}.xlsx`);
  };

  const totalHistoryPages = Math.max(1, Math.ceil(transactionsTotal / HISTORY_PAGE_SIZE));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5 font-ibm-thai pb-28 md:pb-10">
      {/* ── 1. Symmetrical Modern Header Card ── */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {/* Tier 1: Top Control Meta Bar (Left: Breadcrumb & Role Permission | Right: Current User) */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-slate-500">
              <Boxes className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>สต็อกสินค้า</span>
              {activeCategory && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-800 font-semibold truncate">{activeCategory.name}</span>
                </>
              )}
            </div>

            <span className="hidden sm:inline text-slate-300">•</span>

            {permissions.canManageStock ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                สิทธิ์ฝ่ายการตลาด / ผู้จัดการ: เบิก + เติมสต็อก + จัดการสินค้า
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Eye className="w-3 h-3 shrink-0" />
                สิทธิ์ผู้ใช้งานทั่วไป: ดูสต็อกเรียลไทม์ + เบิกสินค้า
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200/90 text-[11px] text-slate-700 shadow-2xs shrink-0">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-400">ผู้ใช้งาน:</span>
            <strong className="text-slate-900">{currentUser.fullName}</strong>
            <span className="text-slate-400">({currentUser.role.trim()})</span>
          </div>
        </div>

        {/* Tier 2: Hero Title + Symmetrical Action Center */}
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  ระบบสต็อก &amp; เบิกจ่ายสินค้า
                </h1>
                {activeCategory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                    <Layers className="w-3 h-3" />
                    {activeCategory.name}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                เช็คยอดคงเหลือเรียลไทม์ เบิกจ่ายสินค้า และติดตามความเคลื่อนไหวของสต็อกในจุดเดียว
              </p>
            </div>
          </div>

          {/* Balanced Action Buttons (Equal Height h-10) */}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
            <button
              type="button"
              onClick={() => openWithdrawModal(null)}
              disabled={items.length === 0}
              className="hidden md:inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>เบิกสินค้า</span>
            </button>

            {permissions.canManageStock && (
              <>
                <button
                  type="button"
                  onClick={() => openRestockModal(null)}
                  disabled={items.length === 0}
                  className="hidden md:inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>เติมสต็อก</span>
                </button>

                <button
                  type="button"
                  onClick={() => openItemFormModal('create', null)}
                  disabled={!activeCategory}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มสินค้าใหม่</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => void refreshDashboard(activeCategoryCode ?? undefined)}
              disabled={isRefreshing}
              title="รีเฟรชข้อมูลสต็อกล่าสุด"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* Tier 3: Symmetrical Category Bar */}
        <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 flex-1">
            {categories.map((cat) => {
              const isSelected = activeCategory?.code === cat.code;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (!isSelected) {
                      void refreshDashboard(cat.code, { resetFilters: true });
                    }
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {permissions.canManageCategories && (
            <button
              type="button"
              onClick={openCategoryModal}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-dashed border-red-300 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เพิ่มหมวดหมู่</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Symmetrical 6-Card KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('items');
            setItemStatusFilter('ALL');
          }}
          className={`h-full flex flex-col justify-between text-left bg-white rounded-2xl border p-4 shadow-2xs transition-all cursor-pointer ${activeTab === 'items' && itemStatusFilter === 'ALL'
            ? 'border-red-500 ring-2 ring-red-100'
            : 'border-slate-200/90 hover:border-slate-400'
            }`}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs font-semibold text-slate-500">รายการสินค้า</span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 tabular-nums tracking-tight">
            {summary.totalItems.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            พร้อมเบิก {activeWithdrawableCount.toLocaleString()} รายการ
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('items');
            setItemStatusFilter('ALL');
          }}
          className="h-full flex flex-col justify-between text-left bg-white rounded-2xl border border-slate-200/90 hover:border-slate-400 p-4 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs font-semibold text-slate-500">คงเหลือรวม</span>
            <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 tabular-nums tracking-tight">
            {summary.totalUnits.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">จำนวนชิ้นทั้งหมดในหมวด</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('items');
            setItemStatusFilter('LOW_STOCK');
          }}
          className={`h-full flex flex-col justify-between text-left bg-white rounded-2xl border p-4 shadow-2xs transition-all cursor-pointer ${activeTab === 'items' && itemStatusFilter === 'LOW_STOCK'
            ? 'border-red-400 ring-2 ring-red-100'
            : 'border-red-200/80 hover:border-red-400'
            }`}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs font-semibold text-red-700">ใกล้หมด</span>
            <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-red-600 tabular-nums tracking-tight">
            {summary.lowStockCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-red-500">ถึงจุดแจ้งเตือน</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('items');
            setItemStatusFilter('OUT_OF_STOCK');
          }}
          className={`h-full flex flex-col justify-between text-left bg-white rounded-2xl border p-4 shadow-2xs transition-all cursor-pointer ${activeTab === 'items' && itemStatusFilter === 'OUT_OF_STOCK'
            ? 'border-red-600 ring-2 ring-red-200'
            : 'border-red-300 hover:border-red-500'
            }`}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs font-semibold text-red-800">หมดสต็อก</span>
            <span className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-red-700 tabular-nums tracking-tight">
            {summary.outOfStockCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-red-600">คงเหลือ 0 ชิ้น</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setHistoryTxType('WITHDRAW');
            void loadTransactions({ txType: 'WITHDRAW', page: 1 });
          }}
          className={`h-full flex flex-col justify-between text-left bg-white rounded-2xl border p-4 shadow-2xs transition-all cursor-pointer ${activeTab === 'history' && historyTxType === 'WITHDRAW'
            ? 'border-red-500 ring-2 ring-red-100'
            : 'border-slate-200/90 hover:border-red-300'
            }`}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs font-semibold text-slate-500">เบิกเดือนนี้</span>
            <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-red-600 tabular-nums tracking-tight">
            {summary.withdrawnThisMonth.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">คลิกดูประวัติการเบิก</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setHistoryTxType('RESTOCK');
            void loadTransactions({ txType: 'RESTOCK', page: 1 });
          }}
          className={`h-full flex flex-col justify-between text-left bg-white rounded-2xl border p-4 shadow-2xs transition-all cursor-pointer ${activeTab === 'history' && historyTxType === 'RESTOCK'
            ? 'border-slate-700 ring-2 ring-slate-200'
            : 'border-slate-200/90 hover:border-slate-400'
            }`}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs font-semibold text-slate-500">เติมเดือนนี้</span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 tabular-nums tracking-tight">
            {summary.restockedThisMonth.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">คลิกดูประวัติรับเข้า</div>
        </button>
      </div>

      {/* ── 3. Main Symmetrical Workspace Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Top Bar: Segmented Mode Switcher + View Controls & Export */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Segmented Main Tabs */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'items'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Package className="w-4 h-4" />
              <span>รายการสินค้าคงเหลือ</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${activeTab === 'items'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-200/80 text-slate-700'
                  }`}
              >
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'history'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <History className="w-4 h-4" />
              <span>ประวัติเคลื่อนไหวสต็อก</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${activeTab === 'history'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-200/80 text-slate-700'
                  }`}
              >
                {transactionsTotal.toLocaleString()}
              </span>
            </button>
          </div>

          {/* Right: View Switcher + Export Excel */}
          <div className="flex items-center gap-2">
            {activeTab === 'items' && (
              <div
                className="hidden md:inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80"
                role="group"
                aria-label="เลือกรูปแบบการแสดงผล"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                  title="แสดงแบบตาราง"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>ตาราง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                  title="แสดงแบบการ์ด"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>การ์ด</span>
                </button>
              </div>
            )}

            {activeTab === 'items' ? (
              <button
                type="button"
                onClick={handleExportItemsExcel}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>ส่งออก Excel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportHistoryExcel}
                disabled={transactions.length === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>ส่งออก Excel หน้านี้</span>
              </button>
            )}
          </div>
        </div>

        {/* Unified Toolbar */}
        {activeTab === 'items' ? (
          <div className="px-4 sm:px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
            {/* Symmetrical 12-Col Search + Sort + Filter Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              <div className="lg:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="เช็คสต็อกด่วน — พิมพ์ชื่อสินค้า เช่น หมวก, ร่ม, ปากกา หรือรหัส SKU..."
                  className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900 transition-all"
                />
                {itemSearch && (
                  <button
                    type="button"
                    onClick={() => setItemSearch('')}
                    aria-label="ล้างคำค้นหา"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="lg:col-span-3 relative">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={itemSort}
                  onChange={(e) => setItemSort(e.target.value as ItemSortOption)}
                  aria-label="เรียงลำดับสินค้า"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-700 font-medium cursor-pointer"
                >
                  <option value="default">เรียงตามลำดับปกติ</option>
                  <option value="stock_asc">คงเหลือ: น้อย → มาก</option>
                  <option value="stock_desc">คงเหลือ: มาก → น้อย</option>
                  <option value="withdrawn_desc">เบิกใช้ 30 วันสูงสุด</option>
                  <option value="name_asc">ชื่อสินค้า: ก → ฮ</option>
                </select>
              </div>

              <div className="lg:col-span-3 flex items-center justify-end">
                {hasActiveItemFilters ? (
                  <button
                    type="button"
                    onClick={handleResetItemFilters}
                    className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรอง (พบ {filteredItems.length} รายการ)</span>
                  </button>
                ) : (
                  <div className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white flex items-center justify-center gap-2 text-xs text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    <span>
                      พร้อมเบิก <strong className="text-slate-900">{activeWithdrawableCount}</strong> /{' '}
                      {items.length} รายการ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Balanced Status Filter Pills + Result Count */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTER_PILLS.map((pill) => {
                  const isActive = itemStatusFilter === pill.key;
                  const count = statusCounts[pill.key] ?? 0;
                  return (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => setItemStatusFilter(pill.key)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold border transition-all cursor-pointer ${isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : pill.dotClass
                          }`}
                      />
                      <span>{pill.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="text-xs text-slate-500 tabular-nums">
                แสดง <strong className="text-slate-800">{filteredItems.length}</strong> จาก{' '}
                {items.length} รายการ
              </span>
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
            {/* Symmetrical 12-Col History Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => handleHistorySearchInput(e.target.value)}
                  placeholder="ค้นหาชื่อผู้เบิก, สินค้า, เอกสาร, สาขา..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none text-sm text-slate-900"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={historyTxType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setHistoryTxType(nextType);
                    void loadTransactions({ txType: nextType, page: 1 });
                  }}
                  aria-label="กรองตามประเภทรายการ"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white focus:border-red-500 outline-none text-sm text-slate-900 cursor-pointer"
                >
                  <option value="ALL">ทุกประเภทรายการ</option>
                  <option value="WITHDRAW">เบิกสินค้า</option>
                  <option value="RESTOCK">เติมสต็อก / รับเข้า</option>
                  <option value="RETURN">รับคืนเข้าคลัง</option>
                  <option value="CANCEL_RETURN">ยกเลิกการเบิก (คืนสต็อก)</option>
                  <option value="ADJUST">ปรับยอดตรวจนับ</option>
                  <option value="OPENING">ยอดยกมาตั้งต้น</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <select
                  value={historyItemId}
                  onChange={(e) => {
                    const nextItem = e.target.value;
                    setHistoryItemId(nextItem);
                    void loadTransactions({ itemId: nextItem, page: 1 });
                  }}
                  aria-label="กรองตามสินค้า"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white focus:border-red-500 outline-none text-sm text-slate-900 cursor-pointer"
                >
                  <option value="ALL">สินค้าทุกรายการ</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.currentStock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHistoryDateFrom(val);
                    void loadTransactions({ dateFrom: val, page: 1 });
                  }}
                  title="ตั้งแต่วันที่"
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                />
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHistoryDateTo(val);
                    void loadTransactions({ dateTo: val, page: 1 });
                  }}
                  title="ถึงวันที่"
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                />
              </div>
            </div>

            {hasActiveHistoryFilters && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-red-50/80 border border-red-200 text-xs text-red-800">
                <span>
                  กำลังแสดงประวัติแบบกรองข้อมูล ({transactionsTotal.toLocaleString()} รายการ)
                </span>
                <button
                  type="button"
                  onClick={handleResetHistoryFilters}
                  className="inline-flex items-center gap-1 font-bold text-red-700 hover:underline cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  ล้างตัวกรอง
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: ITEMS CONTENT */}
        {activeTab === 'items' && (
          <div className="p-4 sm:p-6">
            {filteredItems.length === 0 ? (
              <div className="py-14 px-4 text-center max-w-md mx-auto">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-800 font-bold">
                  {itemSearch.trim()
                    ? `ไม่พบสินค้าชื่อ "${itemSearch.trim()}" ในหมวด ${activeCategory?.name ?? 'นี้'}`
                    : 'ไม่พบรายการสินค้าตามเงื่อนไขที่เลือก'}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  ลองล้างตัวกรองหรือเปลี่ยนคำค้นหาเพื่อดูรายการทั้งหมด
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {hasActiveItemFilters && (
                    <button
                      type="button"
                      onClick={handleResetItemFilters}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      แสดงทั้งหมด
                    </button>
                  )}
                  {itemSearch.trim() &&
                    (permissions.canManageStock ? (
                      <button
                        type="button"
                        onClick={() => openItemFormModal('create', null)}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มสินค้าใหม่เข้าระบบ
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                        <Lock className="w-3.5 h-3.5" />
                        หากต้องการเพิ่มรายการใหม่ กรุณาแจ้งฝ่ายการตลาด
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View (shown only when viewMode === 'table') */}
                {viewMode === 'table' && (
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">สินค้า / รหัส SKU</th>
                          <th className="py-3 px-3 w-[124px]">สถานะ</th>
                          <th className="py-3 px-3 text-right w-[170px]">คงเหลือปัจจุบัน</th>
                          <th className="py-3 px-3 text-right w-[110px]">เบิก 30 วัน</th>
                          <th className="py-3 px-3 w-[150px]">อัปเดตล่าสุด</th>
                          <th className="py-3 px-4 text-right w-[270px]">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredItems.map((item) => {
                          const statusMeta = getStockStatusLabel(item.statusKind);
                          const canWithdrawThis = item.isActive && item.currentStock > 0;
                          const withdrawDisabledLabel = !item.isActive ? 'ปิดใช้งาน' : 'หมดสต็อก';
                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/90 transition-colors align-middle"
                            >
                              <td className="py-3 px-4 max-w-[340px]">
                                <div className="flex items-center gap-3">
                                  {item.imageUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewItem(item)}
                                      title="คลิกดูรูปภาพสินค้า"
                                      className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 hover:ring-2 hover:ring-red-300 transition-all cursor-pointer"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ) : (
                                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">
                                      {item.name}
                                    </div>
                                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className="font-mono text-slate-600">
                                        {item.sku || '-'}
                                      </span>
                                      {item.prInfo && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                                          PR: {item.prInfo}
                                        </span>
                                      )}
                                      {item.note && (
                                        <span
                                          className="text-slate-400 truncate max-w-[180px]"
                                          title={item.note}
                                        >
                                          • {item.note}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}
                                  />
                                  {statusMeta.label}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex flex-col items-end gap-1">
                                  <div
                                    className={`text-base font-black tabular-nums leading-none ${getStockTextColorClass(
                                      item
                                    )}`}
                                  >
                                    {item.currentStock.toLocaleString()}{' '}
                                    <span className="text-xs font-semibold text-slate-500">
                                      {item.unit}
                                    </span>
                                  </div>
                                  <StockLevelBar item={item} widthClass="w-24" />
                                  {item.minStock !== null && item.minStock > 0 && (
                                    <div className="text-[10px] text-slate-400 tabular-nums">
                                      แจ้งเตือน ≤ {item.minStock.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 text-right whitespace-nowrap text-slate-700 font-semibold tabular-nums">
                                {(item.withdrawn30d ?? 0) > 0
                                  ? `${(item.withdrawn30d ?? 0).toLocaleString()} ${item.unit}`
                                  : '-'}
                              </td>

                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                                  {item.updatedByName || '-'}
                                </div>
                                <div className="text-[11px] text-slate-400 tabular-nums">
                                  {formatBkkDateTime(item.updatedAt)}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={!canWithdrawThis}
                                    onClick={() => openWithdrawModal(item.id)}
                                    className="w-[90px] h-8 inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <ArrowDownCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{canWithdrawThis ? 'เบิกเลย' : withdrawDisabledLabel}</span>
                                  </button>

                                  {permissions.canManageStock && (
                                    <button
                                      type="button"
                                      onClick={() => openRestockModal(item.id)}
                                      title="เติมสต็อกสินค้านี้"
                                      className="w-[68px] h-8 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>เติม</span>
                                    </button>
                                  )}

                                  <ItemUtilityGroup
                                    item={item}
                                    canManageStock={permissions.canManageStock}
                                    buttonHeightClass="w-8 h-8"
                                    onAdjust={(it) => openItemFormModal('adjust', it)}
                                    onEdit={(it) => openItemFormModal('edit', it)}
                                    onHistory={handleJumpToItemHistory}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Card Grid View (always shown on Mobile, and on Desktop when viewMode === 'cards') */}
                <div
                  className={
                    viewMode === 'cards'
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                      : 'grid grid-cols-1 gap-3 md:hidden'
                  }
                >
                  {filteredItems.map((item) => (
                    <StockItemCard
                      key={item.id}
                      item={item}
                      canManageStock={permissions.canManageStock}
                      onWithdraw={(id) => openWithdrawModal(id)}
                      onRestock={(id) => openRestockModal(id)}
                      onAdjust={(it) => openItemFormModal('adjust', it)}
                      onEdit={(it) => openItemFormModal('edit', it)}
                      onHistory={handleJumpToItemHistory}
                      onPreviewImage={(it) => setPreviewItem(it)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: HISTORY LEDGER */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-6 space-y-4">
            {isLoadingHistory ? (
              <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-red-600" />
                กำลังโหลดประวัติเคลื่อนไหวสต็อก...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-14 text-center">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-bold">ไม่พบประวัติการเคลื่อนไหวตามตัวกรอง</p>
                {hasActiveHistoryFilters && (
                  <button
                    type="button"
                    onClick={handleResetHistoryFilters}
                    className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop History Table */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">วันที่ / เอกสาร</th>
                        <th className="py-3 px-3">ประเภท</th>
                        <th className="py-3 px-3">สินค้า</th>
                        <th className="py-3 px-3 text-right">เปลี่ยนแปลง</th>
                        <th className="py-3 px-3 text-right">ยอดก่อน → หลัง</th>
                        <th className="py-3 px-3">ผู้เบิก / รายละเอียด</th>
                        <th className="py-3 px-4 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {transactions.map((tx) => {
                        const meta = STOCK_TX_TYPE_META[tx.txType] ?? {
                          label: tx.txType,
                          shortLabel: tx.txType,
                          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                          sign: 'neutral' as const,
                        };
                        const isCancelled = tx.status === 'CANCELLED';
                        const canCancelThis =
                          permissions.canManageStock &&
                          tx.txType === 'WITHDRAW' &&
                          tx.status === 'COMPLETED';
                        const qtyColor =
                          tx.qtyChange > 0
                            ? 'text-slate-900'
                            : tx.qtyChange < 0
                              ? 'text-red-600'
                              : 'text-slate-700';

                        return (
                          <tr
                            key={tx.id}
                            className={`transition-colors align-middle ${isCancelled ? 'bg-slate-50/70 opacity-75' : 'hover:bg-slate-50/80'
                              }`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-800 tabular-nums">
                                {formatBkkDateTimeFull(tx.txDate)}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {tx.batchCode || '-'}
                              </div>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="inline-flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
                                >
                                  {meta.shortLabel}
                                </span>
                                {isCancelled && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                    ยกเลิกแล้ว
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div
                                className={`font-semibold text-slate-900 ${isCancelled ? 'line-through text-slate-500' : ''
                                  }`}
                              >
                                {tx.itemName}
                              </div>
                              {tx.itemSku && (
                                <div className="text-[11px] font-mono text-slate-400">
                                  {tx.itemSku}
                                </div>
                              )}
                            </td>

                            <td
                              className={`py-3 px-3 text-right whitespace-nowrap font-bold tabular-nums ${qtyColor}`}
                            >
                              {tx.qtyChange > 0
                                ? `+${tx.qtyChange.toLocaleString()}`
                                : tx.qtyChange.toLocaleString()}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                {tx.itemUnit}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap text-xs text-slate-600 tabular-nums">
                              {tx.stockBefore.toLocaleString()} →{' '}
                              <strong className="text-slate-900">
                                {tx.stockAfter.toLocaleString()}
                              </strong>
                            </td>

                            <td className="py-3 px-3 max-w-[280px]">
                              <div className="text-xs text-slate-800 font-medium flex flex-wrap items-center gap-1.5">
                                {(tx.requesterName || tx.createdByName) && (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {tx.requesterName || tx.createdByName}
                                  </span>
                                )}
                                {tx.branch && (
                                  <span className="inline-flex items-center gap-1 text-slate-500">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {tx.branch}
                                  </span>
                                )}
                              </div>
                              {(tx.purpose || tx.note) && (
                                <div
                                  className="text-[11px] text-slate-500 mt-0.5 truncate"
                                  title={tx.note ?? tx.purpose ?? ''}
                                >
                                  {[tx.purpose, tx.note].filter(Boolean).join(' • ')}
                                </div>
                              )}
                              {isCancelled && (tx.cancelReason || tx.cancelledByName) && (
                                <div className="text-[11px] text-red-600 mt-0.5">
                                  ยกเลิกโดย {tx.cancelledByName || '-'}: {tx.cancelReason || '-'}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {canCancelThis ? (
                                <button
                                  type="button"
                                  disabled={cancellingTxId === tx.id}
                                  onClick={() => void handleCancelWithdraw(tx)}
                                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  {cancellingTxId === tx.id ? 'กำลังคืน...' : 'ยกเลิกเบิก'}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile History Cards */}
                <div className="md:hidden space-y-3">
                  {transactions.map((tx) => (
                    <HistoryMobileCard
                      key={tx.id}
                      tx={tx}
                      canManageStock={permissions.canManageStock}
                      isCancelling={cancellingTxId === tx.id}
                      onCancelWithdraw={(target) => void handleCancelWithdraw(target)}
                    />
                  ))}
                </div>

                {/* Symmetrical Pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="tabular-nums">
                    แสดงหน้าที่ <strong>{transactionsPage}</strong> จาก{' '}
                    <strong>{totalHistoryPages}</strong> (ทั้งหมด{' '}
                    {transactionsTotal.toLocaleString()} รายการ)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={transactionsPage <= 1 || isLoadingHistory}
                      onClick={() => void loadTransactions({ page: transactionsPage - 1 })}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      ก่อนหน้า
                    </button>
                    <button
                      type="button"
                      disabled={transactionsPage >= totalHistoryPages || isLoadingHistory}
                      onClick={() => void loadTransactions({ page: transactionsPage + 1 })}
                      className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold cursor-pointer"
                    >
                      ถัดไป
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
          <span>ทุกการเบิกและเติมสต็อกบันทึกประวัติแบบเรียลไทม์ พร้อมตรวจสอบย้อนหลังได้</span>
        </div>
        <span>
          {permissions.canManageStock
            ? 'สิทธิ์ฝ่ายการตลาด / ผู้จัดการ: เติมสต็อก เพิ่มสินค้า และปรับยอดได้'
            : 'สิทธิ์ผู้ใช้งานทั่วไป: ดูยอดคงเหลือเรียลไทม์และเบิกสินค้าได้'}
        </span>
      </div>

        {/* Mobile Sticky Action Bar (clears SidebarClient bottom-left floating button) */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 pl-20 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => openWithdrawModal(null)}
            disabled={items.length === 0}
            className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-sm font-bold shadow-sm cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4" />
            เบิกสินค้า
          </button>

          {permissions.canManageStock && (
            <button
              type="button"
              onClick={() => openRestockModal(null)}
              disabled={items.length === 0}
              className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              <ArrowUpCircle className="w-4 h-4" />
              เติมสต็อก
            </button>
          )}
        </div>

        {/* Quick Product Image Preview Modal */}
        {previewItem && previewItem.imageUrl && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">{previewItem.name}</h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {previewItem.sku || 'ไม่มี SKU'} • คงเหลือ {previewItem.currentStock.toLocaleString()}{' '}
                    {previewItem.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-50 p-4 flex items-center justify-center max-h-[60vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewItem.imageUrl}
                  alt={previewItem.name}
                  className="max-h-[50vh] w-auto rounded-xl object-contain border border-slate-200 bg-white"
                />
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  ปิด
                </button>
                {previewItem.isActive && previewItem.currentStock > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = previewItem.id;
                      setPreviewItem(null);
                      openWithdrawModal(id);
                    }}
                    className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    เบิกสินค้านี้
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modals (keyed per open so child state initializes cleanly) */}
        {withdrawModal.open && (
          <WithdrawModal
            key={`withdraw-${withdrawModal.nonce}-${withdrawModal.initialItemId ?? 'none'}`}
            isOpen={true}
            onClose={() => setWithdrawModal((prev) => ({ ...prev, open: false }))}
            onSuccess={() => void refreshDashboard(activeCategoryCode ?? undefined)}
            items={items}
            initialItemId={withdrawModal.initialItemId}
            currentUser={currentUser}
            users={users}
          />
        )}

        {restockModal.open && permissions.canManageStock && (
          <RestockModal
            key={`restock-${restockModal.nonce}-${restockModal.initialItemId ?? 'none'}`}
            isOpen={true}
            onClose={() => setRestockModal((prev) => ({ ...prev, open: false }))}
            onSuccess={() => void refreshDashboard(activeCategoryCode ?? undefined)}
            items={items}
            initialItemId={restockModal.initialItemId}
          />
        )}

        {itemFormModal.open && permissions.canManageStock && activeCategory && (
          <StockItemFormModal
            key={`itemform-${itemFormModal.nonce}-${itemFormModal.mode}-${itemFormModal.editingItem?.id ?? 'new'}`}
            isOpen={true}
            mode={itemFormModal.mode}
            onClose={() => setItemFormModal((prev) => ({ ...prev, open: false }))}
            onSuccess={() => void refreshDashboard(activeCategoryCode ?? undefined)}
            onSwitchToRestock={(itemId) => {
              setItemFormModal((prev) => ({ ...prev, open: false }));
              openRestockModal(itemId);
            }}
            categoryId={activeCategory.id}
            categoryName={activeCategory.name}
            existingItems={items}
            editingItem={itemFormModal.editingItem}
          />
        )}

        {categoryModal.open && permissions.canManageCategories && (
          <CategoryModal
            key={`cat-${categoryModal.nonce}`}
            isOpen={true}
            onClose={() => setCategoryModal((prev) => ({ ...prev, open: false }))}
            onSuccess={(createdCode) => {
              setCategoryModal((prev) => ({ ...prev, open: false }));
              void refreshDashboard(createdCode, { resetFilters: true });
            }}
          />
        )}
      </div>
      );
}
