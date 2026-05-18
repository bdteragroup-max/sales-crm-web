'use client'

import React, { useState } from 'react'
import { CalendarDays, Plus, Search, Edit2, Calendar, CheckCircle2, Clock, XCircle, LayoutList } from 'lucide-react'
import NewScheduleForm from './components/NewScheduleForm'
import UpdateScheduleForm from './components/UpdateScheduleForm'
import ScheduleCalendar from './components/ScheduleCalendar'

interface ScheduleClientPageProps {
  initialSchedules: any[]
  staffList: any[]
  userRole?: string
  currentUserId?: string
  businessTypes?: string[]
}

function statusBadge(status: string) {
  if (!status) return <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-red/10 text-brand-red border border-red-100">วางแผน</span>
  if (status === 'Completed' || status === 'เสร็จสิ้น')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white"><CheckCircle2 size={10} /> เสร็จสิ้น</span>
  if (status === 'Cancelled' || status === 'ยกเลิก')
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-400"><XCircle size={10} /> ยกเลิก</span>
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-white"><Clock size={10} /> {status}</span>
}

export default function ScheduleClientPage({ initialSchedules, staffList, userRole, currentUserId, businessTypes = [] }: ScheduleClientPageProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'list' | 'calendar'>('calendar')
  const [schedules, setSchedules] = useState(initialSchedules)
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const isManager = userRole === 'ผู้จัดการ'

  const handleSuccess = (newSchedule: any) => {
    setSchedules([...schedules, newSchedule].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setActiveTab('list')
  }

  const handleUpdateSuccess = (updated: any) => {
    setSchedules(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated, user: s.user } : s))
  }

  const handleDeleteSuccess = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  const filteredSchedules = schedules.filter(s =>
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const completedCount = schedules.filter(s => s.status === 'Completed' || s.status === 'เสร็จสิ้น').length
  const pendingCount = schedules.filter(s => !s.status || (s.status !== 'Completed' && s.status !== 'เสร็จสิ้น' && s.status !== 'Cancelled' && s.status !== 'ยกเลิก')).length
  const cancelledCount = schedules.filter(s => s.status === 'Cancelled' || s.status === 'ยกเลิก').length

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Update modal */}
      {selectedSchedule && (
        <UpdateScheduleForm
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onSuccess={handleUpdateSuccess}
          onDelete={handleDeleteSuccess}
          businessTypes={businessTypes}
        />
      )}

      {/* ── Header Bar ── */}
      <header className="shrink-0 h-20 border-b border-gray-100 px-8 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-red-200">
            <CalendarDays size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              {isManager ? 'ตารางงานทีม' : 'ตารางงานของฉัน'}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isManager ? 'Team Schedule Management' : 'My Schedule'}
            </p>
          </div>
        </div>
      </header>

      {/* ── KPI Strip (list view) ── */}
      {activeTab === 'list' && (
        <div className="shrink-0 grid grid-cols-4 border-b border-gray-100">
          {[
            { label: 'ทั้งหมด',     value: schedules.length,  icon: <LayoutList size={14} />,    color: 'text-gray-400',    bg: 'bg-gray-50' },
            { label: 'เสร็จสิ้น',  value: completedCount,    icon: <CheckCircle2 size={14} />,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'รอดำเนินการ', value: pendingCount,     icon: <Clock size={14} />,         color: 'text-amber-500',   bg: 'bg-amber-50' },
            { label: 'ยกเลิก',     value: cancelledCount,    icon: <XCircle size={14} />,       color: 'text-gray-400',    bg: 'bg-gray-50' },
          ].map(k => (
            <div key={k.label} className={`flex items-center gap-3 px-6 py-4 ${k.bg} border-r border-gray-100 last:border-0`}>
              <span className={k.color}>{k.icon}</span>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="shrink-0 flex items-center gap-1 px-8 pt-4 border-b border-gray-100 bg-white">
        {[
          { id: 'new'      as const, label: 'บันทึกใหม่',                                                           icon: <Plus size={14} /> },
          { id: 'list'     as const, label: `รายการทั้งหมด (${schedules.length})`,                                  icon: <Search size={14} /> },
          { id: 'calendar' as const, label: 'มุมมองปฏิทิน',                                                          icon: <Calendar size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all ${
              activeTab === tab.id
                ? 'text-brand-red border-brand-red bg-red-50/50'
                : 'text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'new' ? (
          <div className="p-8">
            <NewScheduleForm
              staffList={staffList}
              onSuccess={handleSuccess}
              isManager={isManager}
              currentUserId={currentUserId}
              businessTypes={businessTypes}
            />
          </div>

        ) : activeTab === 'calendar' ? (
          <div className="p-6 h-full">
            <ScheduleCalendar
              schedules={schedules}
              onSelectSchedule={setSelectedSchedule}
            />
          </div>

        ) : (
          <div className="p-8 space-y-6">
            {/* Search */}
            <div className="relative w-full max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาหัวข้อ, พนักงาน..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">วันที่ / เวลา</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">พนักงาน</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest w-2/5">หัวข้อ / งาน</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSchedules.length > 0 ? (
                    filteredSchedules.map(schedule => (
                      <tr key={schedule.id} className="group hover:bg-gray-50/60 transition-colors">
                        {/* Date / Time */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <p className="text-xs font-black text-gray-800">
                            {new Date(schedule.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                            {new Date(schedule.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </p>
                        </td>
                        {/* Staff */}
                        <td className="py-4 px-5">
                          <p className="text-xs font-bold text-gray-900">{schedule.user?.fullName || '—'}</p>
                        </td>
                        {/* Title + Details */}
                        <td className="py-4 px-5">
                          <p className="text-xs font-black text-gray-900">{schedule.title}</p>
                          {schedule.company?.companyName && (
                            <p className="text-[10px] text-brand-red font-bold mt-0.5">@ {schedule.company.companyName}</p>
                          )}
                          {schedule.description && (
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 line-clamp-1">{schedule.description}</p>
                          )}
                          {schedule.presentationStatus && (
                            <p className="text-[10px] font-bold text-brand-red mt-1">● {schedule.presentationStatus}</p>
                          )}
                          {(schedule.quotationNumber || schedule.poNumber || schedule.invoiceNumber) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {schedule.quotationNumber && <span className="text-[10px] bg-red-50 text-brand-red px-2 py-0.5 rounded-lg border border-red-100 font-black">QT: {schedule.quotationNumber}</span>}
                              {schedule.poNumber && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200 font-black">PO: {schedule.poNumber}</span>}
                              {schedule.invoiceNumber && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 font-black">IV: {schedule.invoiceNumber}</span>}
                            </div>
                          )}
                          {schedule.notes && (
                            <p className="mt-1.5 text-[10px] text-gray-400 italic line-clamp-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              "{schedule.notes}"
                            </p>
                          )}
                        </td>
                        {/* Status */}
                        <td className="py-4 px-5">{statusBadge(schedule.status)}</td>
                        {/* Action */}
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => setSelectedSchedule(schedule)}
                            className="p-2 text-gray-300 hover:text-brand-red hover:bg-red-50 rounded-xl transition-all group-hover:text-gray-500"
                            title="แก้ไข / บันทึกผล"
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <CalendarDays size={36} strokeWidth={1} />
                          <p className="text-xs font-bold uppercase tracking-widest">
                            {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีตารางงาน'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredSchedules.length > 0 && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                แสดง {filteredSchedules.length} รายการ จาก {schedules.length} รายการทั้งหมด
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
