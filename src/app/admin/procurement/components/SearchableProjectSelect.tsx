'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Layers } from 'lucide-react';

export interface ProjectOption {
  name: string;
  count: number;
}

interface SearchableProjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ProjectOption[];
  totalCount?: number;
  placeholder?: string;
  className?: string;
}

export default function SearchableProjectSelect({
  value,
  onChange,
  options,
  totalCount,
  placeholder = 'ทุกโครงการ',
  className = '',
}: SearchableProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.name.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => opt.name === value) || { name: value, count: 0 };
  }, [options, value]);

  const handleSelect = (project: string) => {
    onChange(project);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-xs md:text-sm bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-all select-none ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
            : value
            ? 'border-blue-300 bg-blue-50/30'
            : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <Layers size={14} className={value ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
          {value ? (
            <span className="font-semibold text-gray-900 truncate">
              {selectedOption?.name || value}
              {selectedOption && selectedOption.count > 0 && (
                <span className="text-[11px] text-blue-600 ml-1.5 font-normal">
                  ({selectedOption.count})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-600 truncate">
              {placeholder} ({options.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="ล้างตัวเลือกโครงการ"
              className="p-0.5 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </div>
      </div>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full min-w-[320px] sm:min-w-[380px] max-w-[480px] z-50 bg-white border border-gray-200/90 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Sticky Search Header */}
          <div className="p-2.5 bg-gray-50/90 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์เพื่อค้นหาโครงการ..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 px-1">
              <span>พบ {filteredOptions.length} โครงการ</span>
              {searchQuery && (
                <span className="text-blue-600 font-medium">กรองด้วยคำว่า &quot;{searchQuery}&quot;</span>
              )}
            </div>
          </div>

          {/* Options Scroll List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 p-1">
            {/* Option: All Projects */}
            {(!searchQuery.trim() || 'ทุกโครงการ'.includes(searchQuery.toLowerCase())) && (
              <div
                onClick={() => handleSelect('')}
                className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  !value
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>ทุกโครงการ (แสดงทั้งหมด)</span>
                </div>
                {totalCount !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                    {totalCount.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Filtered Project Options */}
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <p>ไม่พบโครงการที่ตรงกับคำค้นหา</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-1 text-blue-600 hover:underline text-[11px]"
                >
                  ล้างคำค้นหา
                </button>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.name;
                return (
                  <div
                    key={opt.name}
                    onClick={() => handleSelect(opt.name)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {isSelected ? (
                        <Check size={14} className="text-blue-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate" title={opt.name}>
                        {opt.name}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isSelected
                          ? 'bg-blue-200/60 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {opt.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
