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
  vertical
}: { 
  name: string, 
  label: string, 
  type: string, 
  rightAlign?: boolean, 
  readOnly?: boolean, 
  value?: string, 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
  required?: boolean,
  placeholder?: string,
  vertical?: boolean
}) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-semibold text-slate-500 ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input 
          name={name}
          type={type} 
          readOnly={readOnly}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 
            ${rightAlign ? 'text-right font-mono' : ''} 
            ${readOnly 
              ? 'bg-slate-50 text-slate-500 border-slate-100 cursor-not-allowed' 
              : 'bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]'
            }`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 w-full">
      <label className="w-full md:w-1/3 text-left md:text-right text-xs md:text-sm font-semibold md:font-medium text-slate-500 md:text-gray-600 ml-1 md:ml-0 shrink-0">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        name={name}
        type={type} 
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`flex-1 border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 
          ${rightAlign ? 'text-right font-mono' : ''} 
          ${readOnly 
            ? 'bg-slate-50 text-slate-500 border-slate-100 cursor-not-allowed' 
            : 'bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]'
          }`}
      />
    </div>
  );
}
