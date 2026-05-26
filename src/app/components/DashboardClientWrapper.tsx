'use client';
import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the main dashboard UI with SSR disabled
// This natively prevents Recharts from crashing during server-side rendering
const DashboardUI = dynamic(() => import('./DashboardUI'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 font-bold animate-pulse">กำลังโหลดแดชบอร์ด...</div>
    </div>
  )
});

export default function DashboardClientWrapper(props: any) {
  return <DashboardUI {...props} />;
}
