"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ClipboardList, Building2, Users, FileSignature, CheckCircle2, Clock, CalendarPlus, MapPin, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { updateInstallationOrder } from "@/app/actions/installationOrders"
import SearchableSelect from "@/app/components/SearchableSelect"

export default function InstallationDashboardClient({ orders, users, currentUser }: { orders: any[], users?: any[], currentUser: any }) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) {
      setActiveTab(tab)
    } else {
      setActiveTab("all")
    }
  }, [searchParams])

  // Calendar logic
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

  const getOrdersForDay = (day: number) => {
    return orders.filter(o => {
      const targetDate = o.plannedStartDate || o.installationDate;
      if (!targetDate) return false;
      const d = new Date(targetDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  // KPIs
  const isCompleted = (status: string) => status === 'Completed' || status === 'เสร็จสิ้น' || status === 'ปิด Job - ติดตั้งเสร็จสิ้น' || status === 'ปิด Job - ตรวจเช็คเสร็จสิ้น';
  const totalOrders = orders.length
  const completedOrders = orders.filter(o => isCompleted(o.status)).length
  const inProgressOrders = totalOrders - completedOrders

  // Tab 2: By Company Data
  const companyMap = orders.reduce((acc, order) => {
    const comp = order.company || "ไม่ระบุบริษัท"
    if (!acc[comp]) acc[comp] = []
    acc[comp].push(order)
    return acc
  }, {} as Record<string, any[]>)

  const companyData = Object.keys(companyMap).map(key => ({
    company: key,
    count: companyMap[key].length,
    orders: companyMap[key]
  })).sort((a, b) => b.count - a.count)

  // Tab 3: Technician Data
  const techMap = orders.reduce((acc, order) => {
    const tech = order.technician || "ไม่ระบุช่าง"
    if (!acc[tech]) acc[tech] = []
    acc[tech].push(order)
    return acc
  }, {} as Record<string, any[]>)

  const techData = Object.keys(techMap).map(key => ({
    technician: key,
    count: techMap[key].length,
    orders: techMap[key]
  })).sort((a, b) => b.count - a.count)

  const handleTechnicianChange = async (orderId: string, newTechnician: string) => {
    if (orderId.startsWith("mock-")) {
      alert("กรุณาสร้างใบงานติดตั้งก่อน (คลิกที่ -รอสร้างใบงาน-)")
      return
    }
    setIsUpdating(orderId)
    try {
      await updateInstallationOrder(orderId, {
        technician: newTechnician,
        sender: currentUser?.fullName // Record who made the update
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to update technician:", error)
      alert("Failed to update technician")
    } finally {
      setIsUpdating(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "เปิด Job - ยังไม่เริ่มติดตั้ง": return "bg-yellow-100 text-yellow-800";
      case "กำลังติดตั้ง": return "bg-blue-100 text-blue-800";
      case "มีปัญหา": return "bg-red-100 text-red-800";
      case "ปิด Job - ติดตั้งเสร็จสิ้น": return "bg-green-200 text-green-900";
      case "ยกเลิก - PO": return "bg-red-700 text-white";
      case "ปิด Job - ตรวจเช็คเสร็จสิ้น": return "bg-emerald-700 text-white";
      case "กำลังตรวจเช็ค": return "bg-orange-200 text-orange-900";
      case "เปิด Job - ยังไม่เริ่มตรวจเช็ค": return "bg-slate-200 text-slate-800";
      case "รอดำเนินการ": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  }

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

  const isOwnerOrAdmin = (order: any) => {
    const roleStr = (currentUser?.role || '').toLowerCase();
    return order.technician === currentUser?.fullName || 
           roleStr === 'admin' || 
           roleStr === 'ผู้ดูแลระบบ' || 
           roleStr.includes('service engineer mgr');
  };

  const outstandingOrders = orders.filter(o => 
    !isCompleted(o.status) && 
    o.status !== "ยกเลิก - PO" &&
    (!o.technician || !o.plannedStartDate)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">แดชบอร์ดงานติดตั้ง</h1>
        <p className="text-sm font-medium text-gray-500">ภาพรวมการทำงานและสถิติงานติดตั้ง</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="?tab=all&status=all" className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${searchParams.get("status") === "all" || !searchParams.get("status") ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-100"}`}>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">งานติดตั้งทั้งหมด</p>
            <p className="text-2xl font-black text-gray-900">{totalOrders}</p>
          </div>
        </Link>
        <Link href="?tab=all&status=in-progress" className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${searchParams.get("status") === "in-progress" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-gray-100"}`}>
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">กำลังดำเนินการ</p>
            <p className="text-2xl font-black text-gray-900">{inProgressOrders}</p>
          </div>
        </Link>
        <Link href="?tab=all&status=completed" className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${searchParams.get("status") === "completed" ? "border-green-500 ring-2 ring-green-500/20" : "border-gray-100"}`}>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">เสร็จสิ้นแล้ว</p>
            <p className="text-2xl font-black text-gray-900">{completedOrders}</p>
          </div>
        </Link>
        <Link href="?tab=all&status=outstanding" className={`p-5 rounded-2xl border flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${searchParams.get("status") === "outstanding" ? "ring-2 ring-red-500/20" : ""} ${outstandingOrders.length > 0 ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100/50' : 'bg-emerald-50 border-emerald-200 shadow-sm'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${outstandingOrders.length > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {outstandingOrders.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${outstandingOrders.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              งานค้าง (รอช่าง/วันที่)
            </p>
            <p className={`text-2xl font-black ${outstandingOrders.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {outstandingOrders.length}
            </p>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-4 pt-4 gap-4">
          <button 
            onClick={() => setActiveTab("all")} 
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "all" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <ClipboardList size={16} /> ประวัติทั้งหมด
          </button>
          <button 
            onClick={() => setActiveTab("company")} 
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "company" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <Building2 size={16} /> แยกตามลูกค้า/บริษัท
          </button>
          <button 
            onClick={() => setActiveTab("technician")} 
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "technician" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <Users size={16} /> รายงานตามช่าง
          </button>
          <button 
            onClick={() => setActiveTab("schedule")} 
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "schedule" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <CalendarDays size={16} /> ตารางคิวงาน
          </button>
        </div>

        <div className="p-6 bg-slate-50/50 min-h-[400px]">
          {activeTab === "schedule" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-x-auto min-w-[800px] animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-800">{monthNames[month]} {year + 543}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors"><ChevronLeft size={20} /></button>
                  <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1.5 text-sm font-bold bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">วันนี้</button>
                  <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors"><ChevronRight size={20} /></button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(dayName => (
                  <div key={dayName} className="bg-gray-50 p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {dayName}
                  </div>
                ))}
                
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white min-h-[140px] opacity-40 border-t border-gray-100"></div>
                ))}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayOrders = getOrdersForDay(day);
                  const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                  
                  return (
                    <div key={day} className={`bg-white min-h-[140px] p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50 group border-t border-gray-100`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 group-hover:text-gray-900'}`}>{day}</span>
                        {dayOrders.length > 0 && <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{dayOrders.length} งาน</span>}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[120px] custom-scrollbar pb-1">
                        {dayOrders.map(order => {
                          const isDone = isCompleted(order.status);
                          return (
                            <Link href={`/jobs/${order.jobId}/manage-installation-order`} key={order.id} className={`block p-2 rounded-lg border text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                              <div className="text-[10px] font-black mb-1 truncate text-gray-900">{order.company}</div>
                              <div className="text-[10px] text-gray-600 truncate flex items-center gap-1 mb-1.5">
                                <Users size={10} className="shrink-0" /> {order.technician || 'ยังไม่ระบุ'}
                              </div>
                              <div className={`text-[9px] font-bold px-2 py-0.5 inline-block rounded-full ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {order.status || 'รอดำเนินการ'}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                
                {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
                  <div key={`empty-end-${i}`} className="bg-white min-h-[140px] border-t border-gray-100 opacity-40"></div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "all" && (() => {
            const statusFilter = searchParams.get("status") || "all";
            const filteredOrders = orders.filter(o => {
              if (statusFilter === "completed") return isCompleted(o.status);
              if (statusFilter === "in-progress") return !isCompleted(o.status);
              if (statusFilter === "outstanding") return outstandingOrders.includes(o);
              return true;
            });
            
            return (
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left text-sm min-w-[1200px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap w-24">หมายเลขติดตั้ง</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap w-24">วันที่</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 min-w-[150px]">บริษัท</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 min-w-[200px]">ชื่องาน</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap w-[200px]">วิศวกร/ช่าง</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap">เซลล์รับผิดชอบ</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap">ผู้บันทึก</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 text-center whitespace-nowrap w-32">แผนงาน</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 text-right whitespace-nowrap w-40">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>
                  ) : filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/jobs/${order.jobId}/manage-installation-order`} className="text-orange-600 hover:underline font-medium">
                          {order.installationNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{new Date(order.installationDate).toLocaleDateString('th-TH')}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        <div className="line-clamp-2 text-xs" title={order.company}>{order.company}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <Link href={`/jobs/${order.jobId}`} className="line-clamp-2 text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors" title={`ดูรายละเอียด Job: ${order.jobName}`}>
                          <span className="truncate">{order.jobName}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </Link>
                      </td>
                      <td className="px-4 py-3 min-w-[200px] relative">
                        <SearchableSelect
                          value={order.technician || ""}
                          onChange={(val) => handleTechnicianChange(order.id, val)}
                          disabled={isUpdating === order.id || order.id.startsWith("mock-")}
                          options={users?.map(user => ({ label: `${user.fullName}`, value: user.fullName })) || []}
                          placeholder="- เลือกช่าง -"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{order.job?.sellerName || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{order.sender || '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {!order.id.startsWith("mock-") && (
                          <div className="flex flex-col items-center gap-1">
                            {isOwnerOrAdmin(order) ? (
                              <Link href={`/jobs/${order.jobId}/installation-schedule`} className={`px-3 py-1 flex items-center gap-1.5 rounded-full text-[11px] font-bold transition-colors ${order.plannedStartDate ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>
                                {order.plannedStartDate ? (
                                  <><FileSignature size={12} /> แก้ไขแผน (Edit Plan)</>
                                ) : (
                                  <><CalendarPlus size={12} /> เพิ่มแผน (Plan)</>
                                )}
                              </Link>
                            ) : order.plannedStartDate ? (
                              <Link href={`/jobs/${order.jobId}/installation-plan`} className="px-3 py-1 flex items-center gap-1.5 rounded-full text-[11px] font-bold transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100">
                                <ClipboardList size={12} /> ดูแผนงาน (View)
                              </Link>
                            ) : (
                              <span className="px-3 py-1 flex items-center gap-1.5 rounded-full text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-100 cursor-not-allowed">
                                <CalendarPlus size={12} /> รอเพิ่มแผน
                              </span>
                            )}
                            {order.plannedStartDate && (
                              <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                {new Date(order.plannedStartDate).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {order.id.startsWith("mock-") ? (
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full tracking-wider ${getStatusColor("รอดำเนินการ")}`}>
                            รอดำเนินการ
                          </span>
                        ) : (
                          <select
                            value={STATUS_OPTIONS.includes(order.status) ? order.status : "เปิด Job - ยังไม่เริ่มติดตั้ง"}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={isUpdating === order.id}
                            className={`px-2 py-1 text-xs font-bold rounded-full outline-none cursor-pointer border-none appearance-none text-center ${getStatusColor(order.status)}`}
                            style={{ textAlignLast: 'center' }}
                          >
                            {!STATUS_OPTIONS.includes(order.status) && <option value={order.status} className="bg-white text-gray-900">{order.status}</option>}
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt} value={opt} className="bg-white text-gray-900 font-normal">{opt}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}

          {activeTab === "company" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companyData.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-400">ยังไม่มีข้อมูล</div>
              ) : companyData.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-gray-800 line-clamp-2">{item.company}</h3>
                    <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">{item.count} งาน</span>
                  </div>
                  <div className="space-y-3">
                    {item.orders.slice(0, 3).map((o: any, i: number) => (
                      <div key={i} className="text-sm">
                        <Link href={`/jobs/${o.jobId}/manage-installation-order`} className="text-orange-600 hover:underline font-medium text-xs block">
                          {o.installationNo}
                        </Link>
                        <span className="text-gray-500 text-xs truncate block">{o.jobName || '-'}</span>
                      </div>
                    ))}
                    {item.count > 3 && <div className="text-xs text-gray-400 pt-2">และอีก {item.count - 3} รายการ...</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "technician" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {techData.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-400">ยังไม่มีข้อมูล</div>
              ) : techData.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{item.technician}</h3>
                      <p className="text-xs text-gray-500">{item.count} งานติดตั้ง</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    {item.orders.slice(0, 3).map((o: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 truncate mr-2">{o.company}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold shrink-0 text-[10px] ${getStatusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </div>
                    ))}
                    {item.count > 3 && <div className="text-xs text-gray-400 pt-2 text-center">ดูเพิ่มเติม...</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Force TS update
