"use client"

import React, { useState } from "react"
import { FileSignature, Search, FileText, CheckCircle2, Clock, Printer, Edit2, Save, X, FileDown, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { updateRepairDelivery, deleteRepairDelivery } from "@/app/actions/repairDeliveries"
import { useRouter } from "next/navigation"

export default function RepairDeliveriesClientPage({ initialDeliveries, currentUser }: { initialDeliveries: any[], currentUser: any }) {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState(initialDeliveries)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")


  const filteredDeliveries = deliveries.filter(d => {
    const term = searchQuery.toLowerCase()
    const matchSearch = d.deliveryNumber?.toLowerCase().includes(term) ||
                        (d.customer || "").toLowerCase().includes(term) ||
                        (d.company || "").toLowerCase().includes(term) ||
                        (d.jobName || "").toLowerCase().includes(term)
    
    let matchStatus = true;
    if (statusFilter && statusFilter !== "") {
      matchStatus = d.status === statusFilter;
    }

    return matchSearch && matchStatus
  })

  const handleDelete = async (id: string) => {
    if (confirm("คุณต้องการลบใบส่งมอบงานนี้ใช่หรือไม่?")) {
      const res = await deleteRepairDelivery(id)
      if (res.success) {
        setDeliveries(prev => prev.filter(d => d.id !== id))
      } else {
        alert("Failed to delete: " + res.error)
      }
    }
  }



  const totalCount = deliveries.length;
  const draftCount = deliveries.filter((d) => d.status === "Draft").length;
  const completedCount = deliveries.filter((d) => d.status === "Completed").length;

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
            <FileSignature size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              ใบส่งมอบงาน
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Delivery Notes / Service Reports
            </p>
          </div>
        </div>
      </header>

      {/* ── KPI Summary Strip ── */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
        {[
          { label: "ทั้งหมด (Total)", value: totalCount, icon: <FileText size={14} />, color: "text-gray-400", bg: "bg-gray-50" },
          { label: "ร่าง / รอส่งมอบ (Draft)", value: draftCount, icon: <Clock size={14} />, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "ส่งมอบแล้ว (Completed)", value: completedCount, icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((k) => (
          <div key={k.label} className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 ${k.bg}`}>
            <span className={k.color}>{k.icon}</span>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {k.label}
              </p>
              <p className={`text-sm md:text-lg font-black ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 text-[#ff2301] border-[#ff2301] bg-red-50/50">
            <FileText size={14} /> รายการทั้งหมด ({filteredDeliveries.length})
          </div>
          <Link
            href="/repair-deliveries/new"
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Plus size={14} /> บันทึกใหม่
          </Link>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 space-y-6">
          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่, ลูกค้า, ชื่องาน..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] placeholder-gray-300 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-[11px] font-black uppercase tracking-widest border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            >
              <option value="">สถานะทั้งหมด (All)</option>
              <option value="Draft">ร่าง / รอส่งมอบ (Draft)</option>
              <option value="Completed">ส่งมอบแล้ว (Completed)</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    วันที่สร้าง
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    เลขที่ส่งมอบ
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    ลูกค้า / บริษัท
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    ชื่องาน
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    ผู้รับมอบ (ลูกค้า)
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    สถานะ
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDeliveries.length > 0 ? (
                  filteredDeliveries.map((delivery) => (
                    <tr key={delivery.id} className="group hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-5 align-top">
                        <div className="text-[11px] font-bold text-gray-600">
                          {delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString("th-TH") : "—"}
                        </div>
                      </td>

                      <td className="py-4 px-5 align-top">
                        <div className="font-bold text-gray-900 font-mono text-xs">{delivery.deliveryNumber}</div>
                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">
                          Ref: {delivery.job?.jobNumber || "—"}
                        </div>
                      </td>

                      <td className="py-4 px-5 align-top max-w-[200px]">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {delivery.customer || delivery.company || "—"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">
                          {delivery.company && delivery.customer ? delivery.company : "-"}
                        </p>
                      </td>

                      <td className="py-4 px-5 align-top">
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                          {delivery.jobName || "—"}
                        </p>
                      </td>

                      <td className="py-4 px-5 align-top">
                        <p className="text-[11px] font-bold text-gray-600">
                          {delivery.nameReceiver || "—"}
                        </p>
                      </td>

                      <td className="py-4 px-5 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          delivery.status === "Completed" ? "bg-emerald-100 text-emerald-600" :
                          "bg-amber-100 text-amber-600"
                        }`}>
                          {delivery.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/repair-deliveries/${delivery.id}/pdf`} target="_blank" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="พิมพ์ใบส่งมอบ">
                            <FileDown size={16} />
                          </Link>
                          <Link href={`/repair-deliveries/${delivery.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                            <Edit2 size={16} />
                          </Link>
                          <button onClick={() => handleDelete(delivery.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300">
                        <FileSignature size={36} strokeWidth={1} />
                        <p className="text-xs font-bold uppercase tracking-widest">
                          {searchQuery || statusFilter ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีใบส่งมอบงาน"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
