"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Trash2, Printer, CheckCircle2, Clock, Wrench } from "lucide-react";
import { deleteOutsourceRepair } from "@/app/actions/outsourceRepairs";

export default function OutsourceRepairsClientPage({ initialData, currentUser }: { initialData: any[], currentUser: any }) {
  const [data, setData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.outsourceNumber?.toLowerCase() || '').includes(term) ||
                        (item.vendorName?.toLowerCase() || '').includes(term) ||
                        (item.customerName?.toLowerCase() || '').includes(term) ||
                        (item.job?.jobNumber?.toLowerCase() || '').includes(term);
    
    let matchStatus = true;
    if (statusFilter && statusFilter !== "") {
      matchStatus = item.status === statusFilter;
    }

    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm("ยืนยันการลบเอกสารนี้?")) {
      const res = await deleteOutsourceRepair(id);
      if (res.success) {
        setData(data.filter(d => d.id !== id));
      } else {
        alert(res.error || "Failed to delete");
      }
    }
  };

  const totalCount = data.length;
  const sentCount = data.filter(d => d.status === "SENT").length;
  const returnedCount = data.filter(d => d.status === "RETURNED").length;

  return (
    <div className="p-4 md:p-8 bg-gray-50/50 min-h-full">
      <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
        {/* ── Top Header Bar ── */}
        <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
              <Wrench size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                ใบส่งซ่อมภายนอก
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                OUTSOURCE REPAIRS
              </p>
            </div>
          </div>
        </header>

        {/* ── KPI Summary Strip ── */}
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
          {[
            { label: "ทั้งหมด", value: totalCount, icon: <FileText size={14} />, color: "text-gray-400", bg: "bg-gray-50" },
            { label: "ส่งซ่อมแล้ว", value: sentCount, icon: <Clock size={14} />, color: "text-amber-500", bg: "bg-amber-50" },
            { label: "รับคืนแล้ว", value: returnedCount, icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((k) => (
            <div key={k.label} className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 ${k.bg}`}>
              <span className={k.color}>{k.icon}</span>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">{k.label}</div>
                <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="shrink-0 p-4 md:p-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อซัพพลายเออร์, ลูกค้า, Job No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium outline-none"
            >
              <option value="">ทุกสถานะ</option>
              <option value="SENT">ส่งซ่อมแล้ว</option>
              <option value="RETURNED">รับคืนแล้ว</option>
            </select>
          </div>
          <Link
            href="/outsource-repairs/new"
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#ff2301] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-[#d61e00] transition-all"
          >
            <Plus size={18} />
            สร้างใบส่งซ่อมภายนอก
          </Link>
        </div>

        {/* ── Table Section ── */}
        <div className="flex-1 overflow-auto bg-gray-50/30">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">เอกสาร / Job No</th>
                <th className="px-6 py-4 font-bold tracking-wider">ซัพพลายเออร์ (Vendor)</th>
                <th className="px-6 py-4 font-bold tracking-wider">ลูกค้า (Customer)</th>
                <th className="px-6 py-4 font-bold tracking-wider">วันที่ส่งซ่อม</th>
                <th className="px-6 py-4 font-bold tracking-wider text-center">สถานะ</th>
                <th className="px-6 py-4 font-bold tracking-wider text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-red-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{item.outsourceNumber || 'No Number'}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.job?.jobNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{item.vendorName || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.customerName || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {item.sentDate ? new Date(item.sentDate).toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      item.status === 'SENT' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      item.status === 'RETURNED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {item.status === 'SENT' ? 'ส่งซ่อมแล้ว' : 
                       item.status === 'RETURNED' ? 'รับคืนแล้ว' : item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/outsource-repairs/${item.id}/pdf`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="พิมพ์ใบส่งซ่อม"
                        target="_blank"
                      >
                        <Printer className="w-5 h-5" />
                      </Link>
                      <Link
                        href={`/outsource-repairs/${item.id}/edit`}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="แก้ไขเอกสาร"
                      >
                        <Wrench className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบเอกสาร"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center bg-gray-50/50">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-gray-100 shadow-sm mb-4">
                      <FileText className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">ไม่พบข้อมูลใบส่งซ่อมภายนอก</h3>
                    <p className="text-gray-500 text-sm">
                      {searchTerm || statusFilter ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีการสร้างใบส่งซ่อมภายนอก"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
