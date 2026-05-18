import React from 'react';

export default function DashboardCard({ 
  icon, 
  iconBg, 
  title, 
  value, 
  subtext 
}: { 
  icon: React.ReactNode, 
  iconBg: string, 
  title: string, 
  value: string, 
  subtext?: string 
}) {
  return (
    <div className="bg-white rounded-3xl p-6 flex items-start gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex flex-col justify-center h-14">
        <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase">{title}</p>
        <div className="flex items-end gap-3">
          <h3 className="text-3xl font-bold text-gray-900 leading-none">{value}</h3>
          {subtext && (
            <p className="text-[13px] text-gray-500 font-medium leading-none mb-1">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}
