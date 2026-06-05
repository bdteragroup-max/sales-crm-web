"use client"

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="px-6 py-2.5 bg-[#ff2301] text-white rounded-xl shadow-lg hover:bg-[#d61e00] font-bold text-sm tracking-widest uppercase transition-all"
    >
      พิมพ์ใบส่งมอบงาน
    </button>
  )
}
