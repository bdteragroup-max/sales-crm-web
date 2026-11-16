'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type SurveySelectOption = {
  value: string;
  label: string;
};

type MenuCoords = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SurveySelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  centerLabel?: boolean;
};

export default function SurveySelect({
  value,
  onChange,
  options,
  placeholder = '-- เลือก --',
  disabled = false,
  className = '',
  buttonClassName = '',
  compact = false,
  centerLabel = false,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const edgeGap = 8;
    const safeWidth = Math.max(Math.min(rect.width, vw - edgeGap * 2), 64);
    const clampedLeft = Math.max(edgeGap, Math.min(rect.left, vw - safeWidth - edgeGap));
    const spaceBelow = vh - rect.bottom - edgeGap;
    const spaceAbove = rect.top - edgeGap;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(256, Math.max(110, openUp ? spaceAbove - 4 : spaceBelow - 4));

    setCoords({
      left: clampedLeft,
      width: safeWidth,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? vh - rect.top + 4 : undefined,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    const handleEscape = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsOpen(false);
    };
    const handleScrollOrResize = () => updateCoords();

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-1.5 border bg-white text-left outline-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-[#ff2301] ring-2 ring-[#ff2301]/20'
            : 'border-gray-300 hover:border-gray-400'
        } ${
          compact
            ? 'px-2.5 py-2 rounded-lg text-base sm:text-sm min-h-[40px] sm:min-h-[38px]'
            : 'px-3.5 py-2 rounded-xl text-base sm:text-sm min-h-[42px] sm:min-h-[38px]'
        } ${buttonClassName}`}
      >
        <span
          className={`truncate min-w-0 flex-1 ${centerLabel ? 'text-center' : ''} ${
            selectedOption && selectedOption.value !== '' ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-[#ff2301]' : ''
          }`}
        />
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              maxHeight: `${coords.maxHeight}px`,
            }}
            className="z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto p-1 overscroll-contain"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={`${opt.value}-${opt.label}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 rounded-lg text-sm text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-red-50 text-[#ff2301] font-bold'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-100'
                  }`}
                >
                  <span className="break-words whitespace-normal leading-snug flex-1 min-w-0">
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#ff2301] shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

