"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, Clock, ClipboardList, Wrench, CheckCircle2 } from "lucide-react"

export default function PlanViewerClient({ order, currentUser }: { order: any, currentUser: any }) {
  const router = useRouter()

  const tasks = order.workPlan ? order.workPlan.split('\n').filter((t: string) => t.trim() !== "") : []
  const equipments = order.technicianNote ? order.technicianNote.split('\n').filter((t: string) => t.trim() !== "") : []

  const getStatusColor = (status: string) => {
    switch (status) {
      case "เปิด Job - ยังไม่เริ่มติดตั้ง": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "กำลังติดตั้ง": return "bg-blue-100 text-blue-800 border-blue-200";
      case "มีปัญหา": return "bg-red-100 text-red-800 border-red-200";
      case "ปิด Job - ติดตั้งเสร็จสิ้น": return "bg-green-200 text-green-900 border-green-300";
      case "ยกเลิก - PO": return "bg-red-700 text-white border-red-800";
      case "ปิด Job - ตรวจเช็คเสร็จสิ้น": return "bg-emerald-700 text-white border-emerald-800";
      case "กำลังตรวจเช็ค": return "bg-orange-200 text-orange-900 border-orange-300";
      case "เปิด Job - ยังไม่เริ่มตรวจเช็ค": return "bg-slate-200 text-slate-800 border-slate-300";
      case "รอดำเนินการ": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Mobile Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/service/installation")}
            className="p-2 -ml-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-gray-900 leading-tight">แผนงานติดตั้ง</h1>
            <p className="text-xs text-gray-500">{order.installationNo}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Customer Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ลูกค้า (Customer)</h2>
          <p className="text-sm font-bold text-gray-900">{order.company}</p>
          <p className="text-xs text-gray-600 mt-1">{order.jobName}</p>
        </div>

        {/* Schedule & Location Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">กำหนดการ (Schedule)</h2>
          
          {order.plannedStartDate ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 text-blue-700 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold uppercase">{new Date(order.plannedStartDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-black leading-none">{new Date(order.plannedStartDate).getDate()}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    {new Date(order.plannedStartDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. 
                    {order.plannedEndDate && ` - ${new Date(order.plannedEndDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">เวลาปฏิบัติงาน (Working Hours)</p>
                </div>
              </div>

              {order.workLocation && (
                <div className="flex gap-3 bg-red-50/50 p-3 rounded-xl border border-red-100">
                  <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">สถานที่ปฏิบัติงาน (Location)</p>
                    <p className="text-xs text-gray-700 mt-0.5">{order.workLocation}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-500 font-medium">ยังไม่ได้ระบุกำหนดการ</p>
            </div>
          )}
        </div>

        {/* Steps Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">ขั้นตอนการทำงาน (Work Plan)</h2>
          </div>
          
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task: string, idx: number) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 pt-1 leading-relaxed">{task}</p>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูลขั้นตอนการทำงาน</p>
          )}
        </div>

        {/* Equipment Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-orange-100 p-1.5 rounded-lg">
              <Wrench className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">หมายเหตุ / อุปกรณ์ (Notes & Equipment)</h2>
          </div>
          
          {equipments.length > 0 ? (
            <div className="space-y-2 bg-orange-50/50 p-3 rounded-xl border border-orange-100">
              {equipments.map((equipment: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800 leading-tight">{equipment}</p>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูลอุปกรณ์เพิ่มเติม</p>
          )}
        </div>
      </div>
      
      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-10 max-w-lg mx-auto">
        <button
          onClick={() => router.push("/service/installation")}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl font-bold text-sm shadow-sm transition-colors"
        >
          กลับสู่แดชบอร์ด (Back to Dashboard)
        </button>
      </div>
    </div>
  )
}
