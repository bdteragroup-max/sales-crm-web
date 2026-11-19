'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import {
  filterProvinceComboboxOptions,
  type ProvinceComboboxOption,
} from '@/app/marketing/constants/thaiProvinces';

interface ProvinceComboboxProps {
  value: string;
  onChange: (nextValue: string) => void;
  options: ProvinceComboboxOption[];
  emptyLabel?: string;
  totalCount?: number;
  searchPlaceholder?: string;
  variant?: 'filter' | 'form';
  id?: string;
  name?: string;
}

/**
 * Searchable province dropdown supporting both Lead table filters and New/Edit Lead forms.
 */
export default function ProvinceCombobox({
  value,
  onChange,
  options,
  emptyLabel = 'ทุกจังหวัด (All Provinces)',
  totalCount,
  searchPlaceholder = 'พิมพ์ค้นหาจังหวัด...',
  variant = 'filter',
  id,
  name,
}: ProvinceComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [isOpen]);

  const filteredOptions = useMemo(
    () => filterProvinceComboboxOptions(options, query),
    [options, query]
  );

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const displayText = selectedOption
    ? selectedOption.count !== undefined
      ? `${selectedOption.label} (${selectedOption.count})`
      : selectedOption.label
    : value
      ? value
      : totalCount !== undefined
        ? `${emptyLabel.includes('(') ? emptyLabel : `${emptyLabel} (${totalCount})`}`
        : emptyLabel;

  const isFilter = variant === 'filter';
  const triggerClass = isFilter
    ? `w-full sm:w-auto min-w-[190px] pl-3 pr-2.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs ${
        value
          ? 'bg-sky-100/80 border-sky-400 text-sky-900 ring-2 ring-sky-500/15'
          : 'bg-sky-50/60 hover:bg-sky-50 border-sky-200 text-sky-900'
      }`
    : `w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold flex items-center justify-between gap-2 transition-all shadow-xs cursor-pointer ${
        value
          ? 'bg-white text-gray-900'
          : 'bg-gray-50/60 hover:bg-gray-50 text-gray-500'
      }`;

  const handleSelect = (nextVal: string) => {
    onChange(nextVal);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        id={id}
        onClick={() => {
          setIsOpen((prev) => {
            if (prev) setQuery('');
            return !prev;
          });
        }}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <MapPin size={13} className="text-sky-600 shrink-0" />
          <span className="truncate">{displayText}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white/80"
              title="ล้างตัวเลือกจังหวัด"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden ${
            isFilter ? 'w-72 right-0 sm:left-0' : 'w-full left-0'
          }`}
          role="listbox"
        >
          {/* Sticky Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setQuery('');
                  } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredOptions[0].value);
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title="ล้างคำค้นหา"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 py-1">
            {!query.trim() && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                  !value
                    ? 'bg-sky-50 text-sky-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 font-semibold'
                }`}
              >
                <span className="truncate">{emptyLabel}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {totalCount !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                      {totalCount}
                    </span>
                  )}
                  {!value && <Check size={13} className="text-sky-600" />}
                </span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-sky-50 text-sky-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <MapPin
                        size={12}
                        className={isSelected ? 'text-sky-600 shrink-0' : 'text-slate-400 shrink-0'}
                      />
                      <span className="truncate">{opt.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {opt.count !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {opt.count}
                        </span>
                      )}
                      {isSelected && <Check size={13} className="text-sky-600" />}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-5 text-center text-xs text-slate-400">
                ไม่พบจังหวัดที่ค้นหา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
