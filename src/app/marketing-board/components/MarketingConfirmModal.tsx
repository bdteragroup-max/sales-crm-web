'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertTriangle, XCircle, Info, HelpCircle } from 'lucide-react';

export interface MarketingConfirmModalProps {
  isOpen: boolean;
  type?: 'confirm' | 'prompt' | 'alert';
  variant?: 'danger' | 'primary' | 'warning' | 'success';
  title: string;
  message: string;
  subMessage?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export default function MarketingConfirmModal({
  isOpen,
  type = 'confirm',
  variant = 'primary',
  title,
  message,
  subMessage,
  inputLabel,
  inputPlaceholder = 'กรุณาระบุข้อความ...',
  defaultValue = '',
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  isLoading = false,
  onConfirm,
  onCancel
}: MarketingConfirmModalProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [inputError, setInputError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
      setInputError('');
    }
  }, [isOpen, defaultValue]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = () => {
    if (type === 'prompt') {
      if (!inputValue.trim()) {
        setInputError('กรุณากรอกข้อมูลในช่องนี้');
        return;
      }
      onConfirm(inputValue.trim());
    } else {
      onConfirm();
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
            <XCircle size={24} className="stroke-[2.2]" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle size={24} className="stroke-[2.2]" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 size={24} className="stroke-[2.2]" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
            <HelpCircle size={24} className="stroke-[2.2]" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    if (variant === 'danger') {
      return 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20';
    }
    if (variant === 'success') {
      return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20';
    }
    return 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20';
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden my-auto animate-in zoom-in-95 duration-150 relative z-10">
        
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shrink-0" />

        <div className="p-6 md:p-7 space-y-5">
          {/* Header row with Icon & Close */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {getIcon()}
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 leading-snug">
                  {title}
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TERA Marketing Board
                </span>
              </div>
            </div>

            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title="ปิด"
            >
              <X size={16} />
            </button>
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {message}
            </p>
            {subMessage && (
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {subMessage}
              </p>
            )}
          </div>

          {/* Prompt Input (if type is prompt) */}
          {type === 'prompt' && (
            <div className="space-y-1.5">
              {inputLabel && (
                <label className="block text-xs font-bold text-slate-700">
                  {inputLabel} <span className="text-red-600">*</span>
                </label>
              )}
              <textarea
                rows={3}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder={inputPlaceholder}
                autoFocus
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs md:text-sm text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none placeholder:text-slate-400 font-sans"
              />
              {inputError && (
                <p className="text-xs font-semibold text-red-600">
                  {inputError}
                </p>
              )}
            </div>
          )}

          {/* Symmetrical Twin Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {type !== 'alert' && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-2.5 px-5 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 ${getConfirmButtonClasses()}`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
