'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Package, AlertTriangle, XCircle } from 'lucide-react';
import {
  type SerializedStockItem,
  getStockStatusLabel,
} from '@/app/lib/stockUtils';

interface StockItemPickerProps {
  items: SerializedStockItem[];
  selectedItemId: string;
  onSelect: (itemId: string) => void;
  placeholder?: string;
  disableOutOfStock?: boolean;
  excludeItemIds?: string[];
  accentColor?: 'red' | 'slate' | 'rose' | 'emerald' | 'blue';
}

export default function StockItemPicker({
  items,
  selectedItemId,
  onSelect,
  placeholder = 'พิมพ์ชื่อสินค้า หรือ SKU เพื่อค้นหาและดูสต็อก...',
  disableOutOfStock = false,
  excludeItemIds = [],
  accentColor = 'red',
}: StockItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!item.isActive && disableOutOfStock) return false;
      if (excludeItemIds.includes(item.id) && item.id !== selectedItemId) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.note || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, disableOutOfStock, excludeItemIds, selectedItemId]);

  const ringClass =
    accentColor === 'slate' || accentColor === 'emerald' || accentColor === 'blue'
      ? 'focus:border-slate-500 focus:ring-slate-500/20'
      : 'focus:border-red-500 focus:ring-red-500/20';

  const statusMeta = selectedItem ? getStockStatusLabel(selectedItem.statusKind) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery('');
        }}
        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left flex items-center justify-between gap-2 transition-colors ${ringClass} focus:outline-none focus:ring-2`}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <Package size={16} className="text-slate-400 shrink-0" />
          {selectedItem ? (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">{selectedItem.name}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                {selectedItem.sku && <span className="font-mono">{selectedItem.sku}</span>}
                {selectedItem.note && (
                  <span className="text-slate-400 truncate max-w-[180px]">• {selectedItem.note}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedItem && statusMeta && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}
            >
              คงเหลือ {selectedItem.currentStock.toLocaleString()} {selectedItem.unit}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อสินค้า / รหัส SKU..."
                autoFocus
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                ไม่พบสินค้าที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                const itemMeta = getStockStatusLabel(item.statusKind);
                const isDisabled = disableOutOfStock && (!item.isActive || item.currentStock <= 0);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                      isDisabled
                        ? 'opacity-50 bg-slate-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-red-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isSelected && <Check size={14} className="text-red-600 shrink-0" />}
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                        {item.sku && <span className="font-mono text-slate-400">{item.sku}</span>}
                        {item.minStock !== null && item.minStock > 0 && (
                          <span>• ขั้นต่ำ {item.minStock.toLocaleString()}</span>
                        )}
                        {item.note && <span className="truncate max-w-[200px]">• {item.note}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.statusKind === 'LOW_STOCK' && (
                        <AlertTriangle size={13} className="text-red-500" />
                      )}
                      {item.statusKind === 'OUT_OF_STOCK' && (
                        <XCircle size={13} className="text-red-600" />
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold border ${itemMeta.badgeClass}`}
                      >
                        {item.currentStock.toLocaleString()} {item.unit}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

