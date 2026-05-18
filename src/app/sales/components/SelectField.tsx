import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({ 
  name, 
  label, 
  options, 
  value, 
  onChange,
  vertical
}: { 
  name: string, 
  label: string, 
  options: string[], 
  value?: string, 
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void,
  vertical?: boolean
}) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-semibold text-slate-500 ml-1">{label}</label>
        <div className="relative">
          <select 
            name={name} 
            value={value} 
            onChange={onChange}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none transition-all duration-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01] appearance-none pr-10"
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
    <div className="flex items-center gap-4">
      <label className="w-1/3 text-sm font-medium text-slate-600 text-right">{label}</label>
      <div className="flex-1 relative">
        <select 
          name={name} 
          value={value} 
          onChange={onChange}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none transition-all duration-200 hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01] appearance-none pr-10"
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
