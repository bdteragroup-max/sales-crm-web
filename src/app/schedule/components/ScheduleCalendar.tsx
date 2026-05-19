'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Clock, User as UserIcon, Calendar } from 'lucide-react'

// Modern, beautiful color palettes for representatives
const repColors = [
  { bg: 'bg-indigo-50/70', text: 'text-indigo-700', border: 'border-indigo-100', hover: 'hover:border-indigo-300', dot: 'bg-indigo-500' },
  { bg: 'bg-teal-50/70', text: 'text-teal-700', border: 'border-teal-100', hover: 'hover:border-teal-300', dot: 'bg-teal-500' },
  { bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-100', hover: 'hover:border-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-purple-50/70', text: 'text-purple-700', border: 'border-purple-100', hover: 'hover:border-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-emerald-50/70', text: 'text-emerald-700', border: 'border-emerald-100', hover: 'hover:border-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-cyan-50/70', text: 'text-cyan-700', border: 'border-cyan-100', hover: 'hover:border-cyan-300', dot: 'bg-cyan-500' },
  { bg: 'bg-rose-50/70', text: 'text-rose-700', border: 'border-rose-100', hover: 'hover:border-rose-300', dot: 'bg-rose-500' },
]

export const getRepColor = (fullName?: string) => {
  if (!fullName) return repColors[0]
  let hash = 0
  for (let i = 0; i < fullName.length; i++) {
    hash = fullName.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % repColors.length
  return repColors[index]
}

interface ScheduleCalendarProps {
  schedules: any[]
  onSelectSchedule: (schedule: any) => void
}

export default function ScheduleCalendar({ schedules, onSelectSchedule }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  // Filter schedules for the current month
  const monthSchedules = schedules.filter(s => {
    const d = new Date(s.date)
    return d.getFullYear() === year && d.getMonth() === month
  })

  // Group schedules by day
  const schedulesByDay: Record<number, any[]> = {}
  monthSchedules.forEach(s => {
    const day = new Date(s.date).getDate()
    if (!schedulesByDay[day]) schedulesByDay[day] = []
    schedulesByDay[day].push(s)
  })

  const daySchedules = selectedDay ? schedulesByDay[selectedDay] || [] : []

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Calendar Grid */}
      <div className="w-full bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{monthName}</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 text-gray-400 hover:text-brand-red">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 text-gray-400 hover:text-brand-red">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-4 mb-4">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{d}</div>
          ))}
          
          {emptyDays.map(i => <div key={`empty-${i}`} />)}
          
          {days.map(day => {
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
            const isSelected = day === selectedDay
            const hasSchedules = !!schedulesByDay[day]
            const count = schedulesByDay[day]?.length || 0
            const daySchedulesList = schedulesByDay[day] || []

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all group ${
                  isSelected ? 'bg-brand-red text-white shadow-lg shadow-red-200 scale-105 z-10' : 
                  isToday ? 'bg-red-50 text-brand-red border border-red-100' :
                  'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span className={`text-sm font-black ${isSelected ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>
                  {day}
                </span>
                
                {hasSchedules && (
                  <div className="mt-1 flex gap-0.5 justify-center flex-wrap max-w-[80%]">
                    {daySchedulesList.slice(0, 3).map((s) => {
                      const color = getRepColor(s.user?.fullName)
                      return (
                        <div 
                          key={s.id} 
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : color.dot}`} 
                          title={s.user?.fullName}
                        />
                      )
                    })}
                    {count > 3 && (
                      <span className={`text-[8px] leading-none font-black ml-0.5 ${isSelected ? 'text-white/80' : 'text-brand-red'}`}>
                        +
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Color Legend for Month's Representatives */}
        {(() => {
          const uniqueReps = Array.from(new Set(monthSchedules.map(s => s.user?.fullName).filter(Boolean)))
          if (uniqueReps.length === 0) return null
          return (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">คำอธิบายสีตามพนักงาน (Sales Representatives Colors):</p>
              <div className="flex flex-wrap gap-2.5">
                {uniqueReps.map(repName => {
                  const color = getRepColor(repName as string)
                  return (
                    <div key={repName as string} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm animate-in fade-in duration-300">
                      <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                      <span className="text-[10px] font-bold text-gray-600">{repName as string}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Side Panel: Schedules for Selected Day */}
      <div className="space-y-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-gray-900">แผนงานวันที่ {selectedDay}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{monthName}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 text-brand-red rounded-xl flex items-center justify-center font-black text-sm border border-red-100">
              {daySchedules.length}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
            {daySchedules.length > 0 ? (
              daySchedules.map((s, idx) => {
                const color = getRepColor(s.user?.fullName)
                return (
                  <div 
                    key={s.id} 
                    onClick={() => onSelectSchedule(s)}
                    className={`p-5 ${color.bg} rounded-2xl border ${color.border} ${color.hover} transition-all cursor-pointer group animate-in fade-in slide-in-from-right-4 duration-500 shadow-sm`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                        s.status === 'Completed' || s.status === 'เสร็จสิ้น' ? 'bg-emerald-500 text-white shadow-sm font-black' :
                        s.status === 'Cancelled' || s.status === 'ยกเลิก' ? 'bg-gray-300 text-white font-black' :
                        'bg-red-500 text-white shadow-sm font-black'
                      }`}>
                        {s.status || 'Planned'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                        <Clock size={12} className="text-gray-300" />
                        {new Date(s.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <h4 className="font-black text-gray-900 leading-tight mb-1 group-hover:text-brand-red transition-colors">{s.title}</h4>
                    
                    {s.company?.companyName && (
                      <p className="text-[10px] text-brand-red font-bold mb-2 uppercase tracking-tighter">@ {s.company.companyName}</p>
                    )}

                    {s.description && (
                      <p className="text-[11px] text-gray-600 line-clamp-2 mb-3 leading-relaxed font-semibold">{s.description}</p>
                    )}

                    {s.visitReport && (
                      <div className="mb-4 bg-emerald-50/80 p-3 rounded-xl border border-emerald-100 shadow-inner">
                        <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-1">รายงานผลการเข้าพบ (Visit Report):</p>
                        <p className="text-[10px] text-emerald-800 font-medium leading-relaxed whitespace-pre-wrap">{s.visitReport}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-3 border-t border-gray-200/60">
                      <div className={`flex items-center gap-2 text-[10px] font-black ${color.text}`}>
                        <UserIcon size={12} />
                        <span>{s.user?.fullName || 'ไม่ระบุ'}</span>
                      </div>
                      {s.location && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="truncate">{s.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar size={32} className="text-gray-300" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ไม่มีแผนงานในวันนี้</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
