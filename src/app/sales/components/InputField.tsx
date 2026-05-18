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
    <div className="flex items-center gap-4">
      <label className="w-1/3 text-sm font-medium text-gray-600 text-right">
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
