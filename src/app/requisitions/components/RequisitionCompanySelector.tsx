'use client';

import React from 'react';
import { Check } from 'lucide-react';
import {
  REQUISITION_COMPANIES,
  type RequisitionCompanyName,
  toggleRequisitionCompanySelection,
} from '@/app/lib/requisitionUtils';

interface RequisitionCompanySelectorProps {
  selectedCompanies: RequisitionCompanyName[];
  onChange: (nextCompanies: RequisitionCompanyName[]) => void;
  label?: string;
}

/**
 * Shared 1..3 company multi-selector used in new/edit requisition forms.
 */
export default function RequisitionCompanySelector({
  selectedCompanies,
  onChange,
  label = 'สังกัดบริษัท (Company)',
}: RequisitionCompanySelectorProps) {
  const safeSelected =
    selectedCompanies.length > 0 ? selectedCompanies : (['Group'] as RequisitionCompanyName[]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="block text-xs font-bold text-slate-700">{label}</label>
        <span className="text-[11px] font-semibold text-slate-500">
          เลือกได้สูงสุด 3 บริษัท ({safeSelected.length}/3)
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {REQUISITION_COMPANIES.map((companyName) => {
          const isSelected = safeSelected.includes(companyName);
          return (
            <label
              key={companyName}
              className={`min-h-[44px] px-2.5 rounded-xl border-2 flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm font-bold transition-all active:scale-[0.98] select-none ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                name="company"
                value={companyName}
                checked={isSelected}
                onChange={() =>
                  onChange(toggleRequisitionCompanySelection(safeSelected, companyName, 3))
                }
                className="sr-only"
              />
              {isSelected && <Check size={14} strokeWidth={3} />}
              <span>{companyName}</span>
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        เลือกได้ 1–3 บริษัท (กดซ้ำเพื่อยกเลิก • ต้องเลือกอย่างน้อย 1 บริษัท)
      </p>
    </div>
  );
}
