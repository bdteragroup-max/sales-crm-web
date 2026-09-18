import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({ 
  name, 
  label, 
  options, 
  value, 
  onChange, 
  vertical = true,
  required
}: { 
  name: string; 
  label: string; 
  options: string[]; 
  value?: string; 
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  vertical?: boolean;
  required?: boolean;
}) {
  const selectClass = `w-full border border-slate-200 text-slate-900 rounded-xl p-2.5 text-sm bg-white outline-none transition-all duration-150 
    hover:border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-500/15 focus:shadow-xs appearance-none pr-10 font-medium`;

  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-bold text-slate-700 ml-0.5">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        <div className="relative">
          <select 
            name={name} 
            value={value} 
            onChange={onChange}
            required={required}
            className={selectClass}
          >
            <option value="">- เลือก -</option>
            {options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={18} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 w-full">
      <label className="w-full sm:w-1/3 text-left sm:text-right text-xs sm:text-sm font-bold text-slate-700 shrink-0">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex-1 relative w-full">
        <select 
          name={name} 
          value={value} 
          onChange={onChange}
          required={required}
          className={selectClass}
        >
          <option value="">- เลือก -</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
}
