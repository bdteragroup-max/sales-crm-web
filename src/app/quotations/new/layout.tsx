import React from 'react';

export default function QuotationNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#111827] font-sans antialiased font-light selection:bg-red-500/30">
      {/* We apply fixed light mode colors to override any inherited dark mode from root */}
      {children}
    </div>
  );
}
