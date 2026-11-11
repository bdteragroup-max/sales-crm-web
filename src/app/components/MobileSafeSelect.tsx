"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  dotClass?: string;
}

interface MobileSafeSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: "sm" | "md";
  placement?: "bottom" | "top";
  className?: string;
}

export default function MobileSafeSelect({
  options,
  value,
  onChange,
  placeholder = "เลือกรายการ...",
  disabled = false,
  searchable = false,
  searchPlaceholder = "พิมพ์ค้นหา...",
  size = "md",
  placement = "bottom",
  className = "",
}: MobileSafeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, query]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isOpen, searchable]);

  const sizeClasses =
    size === "sm"
      ? "h-10 px-3 text-xs font-semibold rounded-xl"
      : "h-12 px-3.5 text-sm font-medium rounded-xl";

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) setQuery("");
            return next;
          });
        }}
        className={`w-full flex items-center justify-between gap-2 text-left border transition-all min-w-0 ${sizeClasses} ${disabled
          ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed opacity-70"
          : isOpen
            ? "bg-white border-[#ff2301] ring-4 ring-red-500/10 text-gray-900"
            : size === "sm"
              ? "bg-gray-50/70 hover:bg-white border-gray-200 text-gray-700"
              : "bg-white hover:border-gray-400 border-gray-300 text-gray-900"
          }`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.dotClass && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotClass}`}
            />
          )}
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-[#ff2301] border border-red-200 text-[11px] font-black shrink-0">
              {selectedOption.badge}
            </span>
          )}
          <span
            className={`truncate ${selectedOption ? "text-gray-900" : "text-gray-400 font-normal"
              }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#ff2301]" : "text-gray-400"
            }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute z-50 left-0 right-0 max-w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden ${placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            }`}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/60">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-8 py-2 text-base sm:text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff2301] text-gray-900 placeholder:text-gray-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value || "__empty__"}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors min-w-0 ${isSelected
                      ? "bg-red-50/80 text-[#ff2301] font-bold"
                      : "text-gray-800 hover:bg-gray-50 font-medium"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.dotClass && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`}
                        />
                      )}
                      {opt.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[11px] font-black shrink-0 border ${isSelected
                            ? "bg-[#ff2301] text-white border-[#ff2301]"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm leading-snug break-words">
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[11px] text-gray-400 font-normal truncate">
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#ff2301] shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-5 text-center text-xs text-gray-400">
                ไม่พบรายการที่ค้นหา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

