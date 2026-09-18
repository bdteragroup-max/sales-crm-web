import React from 'react';

export default function InputField({ 
  name, 
  label, 
  type, 
  rightAlign, 
  readOnly, 
  value, 
  onChange, 
  required, 
  placeholder, 
  vertical = true,
  prefix,
  suffix
}: { 
  name: string; 
  label: string; 
  type: string; 
  rightAlign?: boolean; 
  readOnly?: boolean; 
  value?: string; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  required?: boolean; 
  placeholder?: string; 
  vertical?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  const inputClass = `w-full border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl p-2.5 text-sm outline-none transition-all duration-150 
    ${rightAlign ? 'text-right font-mono font-medium' : ''} 
    ${readOnly 
      ? 'bg-slate-50/80 text-slate-600 border-slate-200 cursor-not-allowed font-medium' 
      : 'bg-white hover:border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-500/15 focus:shadow-xs'
    }`;

  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-bold text-slate-700 ml-0.5">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        <div className="relative flex items-center">
          {prefix && <div className="absolute left-3 pointer-events-none text-slate-400">{prefix}</div>}
          <input 
            name={name}
            type={type} 
            readOnly={readOnly}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className={`${inputClass} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''}`}
          />
          {suffix && <div className="absolute right-3 pointer-events-none text-slate-400 text-xs font-bold">{suffix}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 w-full">
      <label className="w-full sm:w-1/3 text-left sm:text-right text-xs sm:text-sm font-bold text-slate-700 shrink-0">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex-1 relative flex items-center w-full">
        {prefix && <div className="absolute left-3 pointer-events-none text-slate-400">{prefix}</div>}
        <input 
          name={name}
          type={type} 
          readOnly={readOnly}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`${inputClass} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''}`}
        />
        {suffix && <div className="absolute right-3 pointer-events-none text-slate-400 text-xs font-bold">{suffix}</div>}
      </div>
    </div>
  );
}
