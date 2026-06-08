"use client"

"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarPlus, MapPin, AlertCircle, ArrowRight, ClipboardList, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { updateInstallationOrder } from "@/app/actions/installationOrders"

export default function MyTasksClient({ orders, currentUser }: { orders: any[], currentUser: any }) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const STATUS_OPTIONS = [
    "เปิด Job - ยังไม่เริ่มติดตั้ง",
    "กำลังติดตั้ง",
    "มีปัญหา",
    "ปิด Job - ติดตั้งเสร็จสิ้น",
    "ยกเลิก - PO",
    "ปิด Job - ตรวจเช็คเสร็จสิ้น",
    "กำลังตรวจเช็ค",
    "เปิด Job - ยังไม่เริ่มตรวจเช็ค"
  ];

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (orderId.startsWith("mock-")) return;
    setIsUpdating(orderId);
    try {
      await updateInstallationOrder(orderId, { status: newStatus });
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    } finally {
      setIsUpdating(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "เปิด Job - ยังไม่เริ่มติดตั้ง": 
      case "เปิด Job - ยังไม่เริ่มตรวจเช็ค":
      case "รอดำเนินการ": 
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "กำลังติดตั้ง": 
      case "กำลังตรวจเช็ค":
        return "bg-red-50 text-red-700 border-red-100";
      case "มีปัญหา": 
        return "bg-red-600 text-white border-red-700";
      case "ปิด Job - ติดตั้งเสร็จสิ้น": 
      case "ปิด Job - ตรวจเช็คเสร็จสิ้น":
        return "bg-gray-900 text-white border-gray-900";
      case "ยกเลิก - PO": 
        return "bg-gray-50 text-gray-400 border-gray-100 line-through";
      default: 
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  }

  // KPIs
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "Completed" || o.status === "เสร็จสิ้น" || o.status === 'ปิด Job - ติดตั้งเสร็จสิ้น' || o.status === 'ปิด Job - ตรวจเช็คเสร็จสิ้น').length;
  const inProgressOrders = totalOrders - completedOrders;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col gap-1 border-l-4 border-red-600 pl-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">งานของฉัน</h1>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">My Tasks</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-red-200 transition-colors">
          <div className="w-12 h-12 bg-gray-50 text-gray-700 rounded-xl flex items-center justify-center">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">งานทั้งหมด</p>
            <p className="text-2xl font-black text-gray-900">{totalOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-red-200 transition-colors">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">กำลังดำเนินการ</p>
            <p className="text-2xl font-black text-gray-900">{inProgressOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-red-200 transition-colors">
          <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">เสร็จสิ้นแล้ว</p>
            <p className="text-2xl font-black text-gray-900">{completedOrders}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-gray-50 rounded-3xl border border-gray-200 border-dashed">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <AlertCircle className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">ยังไม่มีงานที่ได้รับมอบหมาย</p>
          </div>
        ) : orders.map((o: any, idx: number) => (
          <div key={idx} className="group bg-white rounded-2xl border border-gray-200 hover:border-red-200 overflow-hidden flex flex-col justify-between hover:shadow-lg hover:shadow-red-900/5 transition-all duration-300 relative">
            
            {/* Top red accent line on hover */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="relative inline-flex items-center">
                  <select
                    value={STATUS_OPTIONS.includes(o.status) ? o.status : "เปิด Job - ยังไม่เริ่มติดตั้ง"}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    disabled={isUpdating === o.id || o.id.startsWith("mock-")}
                    className={`px-3 py-1.5 pr-6 rounded-full text-[10px] font-bold tracking-wide border cursor-pointer appearance-none outline-none transition-all hover:shadow-sm ${getStatusColor(o.status)} ${isUpdating === o.id ? 'opacity-50' : ''}`}
                    style={{ textAlignLast: 'center' }}
                  >
                    {!STATUS_OPTIONS.includes(o.status) && <option value={o.status} className="bg-white text-gray-900">{o.status}</option>}
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt} className="bg-white text-gray-900 font-normal">{opt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    {isUpdating === o.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-current opacity-70" />
                    ) : (
                      <svg className="w-3 h-3 text-current opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider bg-gray-50 px-2 py-1 rounded-md shrink-0">{o.installationNo}</span>
              </div>
              
              <h3 className="text-lg font-black text-gray-900 mb-1.5 leading-tight line-clamp-2 group-hover:text-red-700 transition-colors">{o.company}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-6 font-medium">{o.jobName}</p>
              
              {o.plannedStartDate ? (
                <div className="bg-gray-50/50 border border-gray-100 p-3.5 rounded-xl space-y-3 mb-2 transition-colors group-hover:bg-red-50/30">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <CalendarPlus className="w-4 h-4 text-red-600" />
                    </div>
                    <span>{new Date(o.plannedStartDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</span>
                  </div>
                  {o.workLocation && (
                    <div className="flex items-start gap-3 text-sm font-medium text-gray-500">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="line-clamp-2 mt-1">{o.workLocation}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl mb-2 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                     <AlertCircle className="w-4 h-4 text-red-600" />
                   </div>
                   <p className="text-xs text-red-600 font-bold">รอเพิ่มแผนงาน</p>
                </div>
              )}
            </div>
            
            <div className="p-4 pt-0 mt-auto">
              <Link 
                href={`/jobs/${o.jobId}/installation-schedule`} 
                className={`flex items-center justify-center gap-2 w-full py-3 text-sm font-bold rounded-xl transition-all ${
                  o.plannedStartDate 
                    ? 'bg-gray-900 hover:bg-red-600 text-white hover:shadow-md hover:shadow-red-600/20' 
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900'
                }`}
              >
                {o.plannedStartDate ? 'แก้ไขแผนงาน (Edit Plan)' : 'เพิ่มแผนงาน (Add Plan)'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
