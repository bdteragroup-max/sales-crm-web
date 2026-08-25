import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
}

const variantStyles = {
  danger: {
    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
    bg: 'bg-red-100',
    btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
    bg: 'bg-yellow-100',
    btn: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  },
  info: {
    icon: <Info className="w-6 h-6 text-blue-600" />,
    bg: 'bg-blue-100',
    btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  success: {
    icon: <CheckCircle className="w-6 h-6 text-green-600" />,
    bg: 'bg-green-100',
    btn: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onClose : undefined} 
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={!isLoading ? onClose : undefined}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${style.bg}`}>
            {style.icon}
          </div>
          
          <div className="flex-1 mt-2 sm:mt-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <div className="text-sm text-gray-500 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`w-full sm:w-auto px-5 py-2.5 text-white font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 ${style.btn}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
