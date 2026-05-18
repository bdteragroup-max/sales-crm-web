import React from 'react';

export default function Card({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <div className="w-1.5 h-5 bg-red-500 rounded-full"></div>
        <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
