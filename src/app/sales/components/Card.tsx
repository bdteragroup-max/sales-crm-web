import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Card({ 
  title, 
  children, 
  collapsible = false, 
  defaultExpanded = true,
  badge,
  icon
}: { 
  title: string; 
  children: React.ReactNode; 
  collapsible?: boolean; 
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  if (collapsible) {
    return (
      <details className="group bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden transition-all duration-200 hover:border-slate-300" open={defaultExpanded}>
        <summary className="bg-white px-5 md:px-6 py-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50/80 transition-colors [&::-webkit-details-marker]:hidden border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-red-600 rounded-full shadow-xs shrink-0"></div>
            {icon && <span className="text-red-600 shrink-0">{icon}</span>}
            <h2 className="font-black text-slate-900 text-base tracking-tight">{title}</h2>
            {badge}
          </div>
          <ChevronDown className="text-slate-400 group-open:rotate-180 transition-transform duration-200" size={18} />
        </summary>
        <div className="p-5 md:p-6 bg-white">
          {children}
        </div>
      </details>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden transition-all duration-200 hover:border-slate-300">
      <div className="bg-white border-b border-slate-100 px-5 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-5 bg-red-600 rounded-full shadow-xs shrink-0"></div>
          {icon && <span className="text-red-600 shrink-0">{icon}</span>}
          <h2 className="font-black text-slate-900 text-base tracking-tight">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-5 md:p-6 bg-white">
        {children}
      </div>
    </div>
  );
}
