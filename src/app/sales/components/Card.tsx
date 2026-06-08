import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Card({ 
  title, 
  children, 
  collapsible = false, 
  defaultExpanded = true 
}: { 
  title: string, 
  children: React.ReactNode, 
  collapsible?: boolean, 
  defaultExpanded?: boolean 
}) {
  if (collapsible) {
    return (
      <details className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" open={defaultExpanded}>
        <summary className="bg-white px-6 py-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-gray-50/80 transition-colors [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-[#ff2301] rounded-full"></div>
            <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          </div>
          <ChevronDown className="text-gray-400 group-open:rotate-180 transition-transform duration-200" size={20} />
        </summary>
        <div className="p-6 border-t border-gray-100 bg-gray-50/20">
          {children}
        </div>
      </details>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <div className="w-1.5 h-5 bg-[#ff2301] rounded-full"></div>
        <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
