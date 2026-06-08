"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, Building2, Users, FileSignature, CheckCircle2, Clock } from "lucide-react"
import { updateInstallationOrder } from "@/app/actions/installationOrders"

export default function InstallationDashboardClient({ orders, users, currentUser }: { orders: any[], users?: any[], currentUser: any }) {
  const [activeTab, setActiveTab] = useState("all")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const router = useRouter()

  // KPIs
  const totalOrders = orders.length
  const completedOrders = orders.filter(o => o.status === "Completed" || o.status === "เสร็จสิ้น").length
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">แดชบอร์ดงานติดตั้ง</h1>
        <p className="text-sm font-medium text-gray-500">ภาพรวมการทำงานและสถิติงานติดตั้ง</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">งานติดตั้งทั้งหมด</p>
            <p className="text-2xl font-black text-gray-900">{totalOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">กำลังดำเนินการ</p>
            <p className="text-2xl font-black text-gray-900">{inProgressOrders}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">เสร็จสิ้นแล้ว</p>
            <p className="text-2xl font-black text-gray-900">{completedOrders}</p>
          </div>
        </div>
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
        </div>

        <div className="p-6 bg-slate-50/50 min-h-[400px]">
          {activeTab === "all" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap">หมายเลขติดตั้ง</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap">วันที่</th>
                    <th className="px-4 pb-3 font-bold text-gray-500">บริษัท</th>
                    <th className="px-4 pb-3 font-bold text-gray-500">ชื่องาน</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap">วิศวกร/ช่าง</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 whitespace-nowrap">ผู้บันทึก</th>
                    <th className="px-4 pb-3 font-bold text-gray-500 text-right whitespace-nowrap">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>
                  ) : orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/jobs/${order.jobId}/manage-installation-order`} className="text-orange-600 hover:underline font-medium">
                          {order.installationNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{new Date(order.installationDate).toLocaleDateString('th-TH')}</td>
                      <td className="px-4 py-3 min-w-[150px] font-medium text-gray-900">{order.company}</td>
                      <td className="px-4 py-3 min-w-[200px] max-w-[300px] text-gray-600 truncate" title={order.jobName}>{order.jobName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={order.technician || ""}
                          onChange={(e) => handleTechnicianChange(order.id, e.target.value)}
                          disabled={isUpdating === order.id || order.id.startsWith("mock-")}
                          className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent min-w-[140px] disabled:opacity-50"
                        >
                          <option value="">- เลือกช่าง -</option>
                          {users?.map(user => (
                            <option key={user.id} value={user.fullName}>{user.fullName} ({user.role})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{order.sender || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                        <span className={`px-2 py-0.5 rounded-full font-bold shrink-0 ${o.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
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
