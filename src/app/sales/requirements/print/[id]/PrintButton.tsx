"use client";

import React, { useEffect } from 'react';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  useEffect(() => {
    // Wait a brief moment for fonts/images to load, then trigger print
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button 
      onClick={() => window.print()} 
      className="fixed bottom-10 right-10 print:hidden bg-brand-red text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center z-50"
      title="Print Document"
    >
      <Printer size={24} />
    </button>
  );
}
