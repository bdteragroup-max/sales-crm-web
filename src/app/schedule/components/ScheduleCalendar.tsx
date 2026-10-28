/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Building2,
  FileSignature,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'

export interface RepColor {
  bg: string
  text: string
  border: string
  dot: string
  ring: string
  style: React.CSSProperties
  dotStyle: React.CSSProperties
}

// 36 visually distinct, modern, high-contrast pastel palettes to guarantee no two reps share colors
export const repColors: RepColor[] = [
  // 1. Emerald Green
  {
    bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-600', ring: 'ring-emerald-500/20',
    style: { backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' },
    dotStyle: { backgroundColor: '#059669' }
  },
  // 2. Royal Purple
  {
    bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-600', ring: 'ring-purple-500/20',
    style: { backgroundColor: '#faf5ff', color: '#6b21a8', borderColor: '#e9d5ff' },
    dotStyle: { backgroundColor: '#9333ea' }
  },
  // 3. Amber Gold
  {
    bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-500', ring: 'ring-amber-500/20',
    style: { backgroundColor: '#fffbeb', color: '#78350f', borderColor: '#fde68a' },
    dotStyle: { backgroundColor: '#d97706' }
  },
  // 4. Vibrant Cyan
  {
    bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300', dot: 'bg-cyan-600', ring: 'ring-cyan-500/20',
    style: { backgroundColor: '#ecfeff', color: '#155e75', borderColor: '#a5f3fc' },
    dotStyle: { backgroundColor: '#0891b2' }
  },
  // 5. Rose Red
  {
    bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-600', ring: 'ring-rose-500/20',
    style: { backgroundColor: '#fff1f2', color: '#9f1239', borderColor: '#fecdd3' },
    dotStyle: { backgroundColor: '#e11d48' }
  },
  // 6. Classic Indigo
  {
    bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-600', ring: 'ring-indigo-500/20',
    style: { backgroundColor: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' },
    dotStyle: { backgroundColor: '#4f46e5' }
  },
  // 7. Lime Green
  {
    bg: 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-300', dot: 'bg-lime-600', ring: 'ring-lime-500/20',
    style: { backgroundColor: '#f7fee7', color: '#365314', borderColor: '#d9f99d' },
    dotStyle: { backgroundColor: '#65a30d' }
  },
  // 8. Bright Fuchsia / Magenta
  {
    bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-300', dot: 'bg-fuchsia-600', ring: 'ring-fuchsia-500/20',
    style: { backgroundColor: '#fdf4ff', color: '#86198f', borderColor: '#f5d0fe' },
    dotStyle: { backgroundColor: '#c026d3' }
  },
  // 9. Sky Blue
  {
    bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-600', ring: 'ring-sky-500/20',
    style: { backgroundColor: '#f0f9ff', color: '#075985', borderColor: '#bae6fd' },
    dotStyle: { backgroundColor: '#0284c7' }
  },
  // 10. Tangerine Orange
  {
    bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-600', ring: 'ring-orange-500/20',
    style: { backgroundColor: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' },
    dotStyle: { backgroundColor: '#ea580c' }
  },
  // 11. Deep Teal
  {
    bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-600', ring: 'ring-teal-500/20',
    style: { backgroundColor: '#f0fdfa', color: '#115e59', borderColor: '#99f6e4' },
    dotStyle: { backgroundColor: '#0d9488' }
  },
  // 12. Deep Violet
  {
    bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-300', dot: 'bg-violet-600', ring: 'ring-violet-500/20',
    style: { backgroundColor: '#f5f3ff', color: '#5b21b6', borderColor: '#ddd6fe' },
    dotStyle: { backgroundColor: '#7c3aed' }
  },
  // 13. Electric Blue
  {
    bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-600', ring: 'ring-blue-500/20',
    style: { backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' },
    dotStyle: { backgroundColor: '#2563eb' }
  },
  // 14. Crimson Scarlet
  {
    bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-600', ring: 'ring-red-500/20',
    style: { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' },
    dotStyle: { backgroundColor: '#dc2626' }
  },
  // 15. Hot Pink
  {
    bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-300', dot: 'bg-pink-600', ring: 'ring-pink-500/20',
    style: { backgroundColor: '#fdf2f8', color: '#9d174d', borderColor: '#fbcfe8' },
    dotStyle: { backgroundColor: '#db2777' }
  },
  // 16. Golden Yellow
  {
    bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-300', dot: 'bg-yellow-600', ring: 'ring-yellow-500/20',
    style: { backgroundColor: '#fefce8', color: '#713f12', borderColor: '#fef08a' },
    dotStyle: { backgroundColor: '#ca8a04' }
  },
  // 17. Cool Slate
  {
    bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-600', ring: 'ring-slate-500/20',
    style: { backgroundColor: '#f1f5f9', color: '#1e293b', borderColor: '#cbd5e1' },
    dotStyle: { backgroundColor: '#475569' }
  },
  // 18. Spring Green
  {
    bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-600', ring: 'ring-green-500/20',
    style: { backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' },
    dotStyle: { backgroundColor: '#16a34a' }
  },
  // 19. Coral Peach
  {
    bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', dot: 'bg-rose-500', ring: 'ring-rose-500/20',
    style: { backgroundColor: '#fff5f5', color: '#9b2c2c', borderColor: '#feb2b2' },
    dotStyle: { backgroundColor: '#e53e3e' }
  },
  // 20. Mint Turquoise
  {
    bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200', dot: 'bg-teal-500', ring: 'ring-teal-500/20',
    style: { backgroundColor: '#e6fffa', color: '#234e52', borderColor: '#b2f5ea' },
    dotStyle: { backgroundColor: '#319795' }
  },
  // 21. Lavender Mist
  {
    bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', dot: 'bg-purple-500', ring: 'ring-purple-500/20',
    style: { backgroundColor: '#f3e8ff', color: '#581c87', borderColor: '#d8b4fe' },
    dotStyle: { backgroundColor: '#7e22ce' }
  },
  // 22. Warm Terracotta
  {
    bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', dot: 'bg-orange-500', ring: 'ring-orange-500/20',
    style: { backgroundColor: '#ffedd5', color: '#7c2d12', borderColor: '#fdba74' },
    dotStyle: { backgroundColor: '#c2410c' }
  },
  // 23. Cobalt Ocean
  {
    bg: 'bg-sky-100', text: 'text-sky-900', border: 'border-sky-300', dot: 'bg-sky-700', ring: 'ring-sky-500/20',
    style: { backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' },
    dotStyle: { backgroundColor: '#0284c7' }
  },
  // 24. Ruby Wine
  {
    bg: 'bg-rose-100', text: 'text-rose-950', border: 'border-rose-300', dot: 'bg-rose-700', ring: 'ring-rose-500/20',
    style: { backgroundColor: '#ffe4e6', color: '#881337', borderColor: '#fda4af' },
    dotStyle: { backgroundColor: '#be123c' }
  },
  // 25. Warm Bronze
  {
    bg: 'bg-amber-100', text: 'text-amber-950', border: 'border-amber-300', dot: 'bg-amber-700', ring: 'ring-amber-500/20',
    style: { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' },
    dotStyle: { backgroundColor: '#b45309' }
  },
  // 26. Aqua Seafoam
  {
    bg: 'bg-teal-100', text: 'text-teal-950', border: 'border-teal-300', dot: 'bg-teal-700', ring: 'ring-teal-500/20',
    style: { backgroundColor: '#ccfbf1', color: '#115e59', borderColor: '#5eead4' },
    dotStyle: { backgroundColor: '#0f766e' }
  },
  // 27. Berry Plum
  {
    bg: 'bg-pink-100', text: 'text-pink-950', border: 'border-pink-300', dot: 'bg-pink-700', ring: 'ring-pink-500/20',
    style: { backgroundColor: '#fce7f3', color: '#831843', borderColor: '#f472b6' },
    dotStyle: { backgroundColor: '#9d174d' }
  },
  // 28. Crisp Apple Green
  {
    bg: 'bg-green-100', text: 'text-green-950', border: 'border-green-300', dot: 'bg-green-700', ring: 'ring-green-500/20',
    style: { backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' },
    dotStyle: { backgroundColor: '#15803d' }
  },
  // 29. Deep Navy Blue
  {
    bg: 'bg-blue-100', text: 'text-blue-950', border: 'border-blue-300', dot: 'bg-blue-800', ring: 'ring-blue-500/20',
    style: { backgroundColor: '#dbeafe', color: '#1e3a8a', borderColor: '#93c5fd' },
    dotStyle: { backgroundColor: '#1d4ed8' }
  },
  // 30. Warm Stone Taupe
  {
    bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-300', dot: 'bg-stone-600', ring: 'ring-stone-500/20',
    style: { backgroundColor: '#f5f5f4', color: '#292524', borderColor: '#d6d3d1' },
    dotStyle: { backgroundColor: '#57534e' }
  },
  // 31. Cerulean Wave
  {
    bg: 'bg-sky-100', text: 'text-sky-950', border: 'border-sky-400', dot: 'bg-sky-600', ring: 'ring-sky-500/20',
    style: { backgroundColor: '#bae6fd', color: '#0c4a6e', borderColor: '#38bdf8' },
    dotStyle: { backgroundColor: '#0369a1' }
  },
  // 32. Royal Amethyst
  {
    bg: 'bg-violet-100', text: 'text-violet-950', border: 'border-violet-300', dot: 'bg-violet-700', ring: 'ring-violet-500/20',
    style: { backgroundColor: '#ede9fe', color: '#4c1d95', borderColor: '#c4b5fd' },
    dotStyle: { backgroundColor: '#6d28d9' }
  },
  // 33. Golden Sunset
  {
    bg: 'bg-yellow-100', text: 'text-yellow-950', border: 'border-yellow-400', dot: 'bg-yellow-600', ring: 'ring-yellow-500/20',
    style: { backgroundColor: '#fef08a', color: '#713f12', borderColor: '#fde047' },
    dotStyle: { backgroundColor: '#a16207' }
  },
  // 34. Forest Olive
  {
    bg: 'bg-lime-100', text: 'text-lime-950', border: 'border-lime-400', dot: 'bg-lime-700', ring: 'ring-lime-500/20',
    style: { backgroundColor: '#ecfccb', color: '#365314', borderColor: '#bef264' },
    dotStyle: { backgroundColor: '#4d7c0f' }
  },
  // 35. Velvet Maroon
  {
    bg: 'bg-rose-200', text: 'text-rose-950', border: 'border-rose-400', dot: 'bg-rose-800', ring: 'ring-rose-500/20',
    style: { backgroundColor: '#fecdd3', color: '#4c0519', borderColor: '#fb7185' },
    dotStyle: { backgroundColor: '#9f1239' }
  },
  // 36. Marine Jade
  {
    bg: 'bg-cyan-100', text: 'text-cyan-950', border: 'border-cyan-400', dot: 'bg-cyan-700', ring: 'ring-cyan-500/20',
    style: { backgroundColor: '#cffafe', color: '#164e63', borderColor: '#67e8f9' },
    dotStyle: { backgroundColor: '#0e7490' }
  }
]

// Registry map to guarantee that each representative gets a unique color with zero repetition
const repColorMap = new Map<string, number>()
let nextColorIndex = 0

export const initRepColors = (names: string[]) => {
  if (!names || names.length === 0) return
  const unique = Array.from(new Set(names.filter(Boolean).map(n => n.trim()))).sort((a, b) =>
    a.localeCompare(b, 'th')
  )
  unique.forEach(name => {
    if (!repColorMap.has(name)) {
      repColorMap.set(name, nextColorIndex % repColors.length)
      nextColorIndex++
    }
  })
}

export const getRepColor = (fullName?: string): RepColor => {
  if (!fullName || !fullName.trim()) return repColors[0]
  const key = fullName.trim()
  if (!repColorMap.has(key)) {
    repColorMap.set(key, nextColorIndex % repColors.length)
    nextColorIndex++
  }
  const colorIndex = repColorMap.get(key) ?? 0
  return repColors[colorIndex]
}

interface ScheduleCalendarProps {
  schedules: any[]
  onSelectSchedule: (schedule: any) => void
  onNewScheduleForDate?: (dateStr: string) => void
}

export default function ScheduleCalendar({
  schedules,
  onSelectSchedule,
  onNewScheduleForDate
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today.getDate())
  }

  const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  // Filter schedules for the current month
  const monthSchedules = useMemo(() => {
    return schedules.filter(s => {
      const d = new Date(s.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [schedules, year, month])

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const map: Record<number, any[]> = {}
    monthSchedules.forEach(s => {
      const day = new Date(s.date).getDate()
      if (!map[day]) map[day] = []
      map[day].push(s)
    })
    return map
  }, [monthSchedules])

  const daySchedules = selectedDay ? schedulesByDay[selectedDay] || [] : []

  // Unique representatives this month sorted alphabetically and registered for unique colors
  const uniqueReps = useMemo(() => {
    const list = Array.from(
      new Set(monthSchedules.map((s) => s.user?.fullName).filter(Boolean) as string[])
    )
    const sorted = list.sort((a, b) => a.localeCompare(b, 'th'))
    initRepColors(sorted)
    return sorted
  }, [monthSchedules])

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── Left Column: Calendar Month Grid (8 cols) ── */}
      <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
        {/* Month Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#ff2301] shadow-sm font-bold border border-red-100">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 capitalize">
                {monthName}
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                ทั้งหมด {monthSchedules.length} นัดหมายในเดือนนี้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
            >
              วันนี้
            </button>
            <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-0.5 bg-gray-50/50">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-white text-gray-500 hover:text-[#ff2301] rounded-lg transition-all"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-white text-gray-500 hover:text-[#ff2301] rounded-lg transition-all"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Day Grid */}
        <div>
          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, idx) => (
              <div
                key={d}
                className={`text-xs font-bold py-2 ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-gray-50/40 opacity-40" />
            ))}

            {days.map((day) => {
              const today = new Date()
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
              const isSelected = day === selectedDay
              const count = schedulesByDay[day]?.length || 0
              const daySchedulesList = schedulesByDay[day] || []

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-between border transition-all relative group text-left ${
                    isSelected
                      ? 'bg-[#ff2301] text-white border-[#ff2301] shadow-md shadow-red-500/25 scale-[1.03] z-10'
                      : isToday
                      ? 'bg-red-50/70 border-red-200 text-[#ff2301] hover:bg-red-100/60'
                      : 'bg-white hover:bg-gray-50/80 border-gray-100/80 hover:border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-black transition-transform ${
                        isSelected
                          ? 'text-white'
                          : isToday
                          ? 'text-[#ff2301]'
                          : 'text-gray-800 group-hover:scale-110'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff2301]" />
                    )}
                  </div>

                  {/* Visit Indicators / Dots */}
                  <div className="w-full flex items-center justify-center gap-1 flex-wrap mt-auto">
                    {daySchedulesList.slice(0, 3).map((s) => {
                      const color = getRepColor(s.user?.fullName)
                      return (
                        <span
                          key={s.id}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-transform ${
                            isSelected ? 'bg-white/90 ring-1 ring-white/40' : color.dot
                          }`}
                          style={isSelected ? undefined : color.dotStyle}
                          title={`${s.user?.fullName || 'เซลล์'}: ${s.company?.companyName || s.title}`}
                        />
                      )
                    })}
                    {count > 3 && (
                      <span
                        className={`text-[9px] font-black px-1 rounded-md leading-none ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-[#ff2301]'
                        }`}
                      >
                        +{count - 3}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend for Representatives */}
        {uniqueReps.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold text-gray-500">
                พนักงานที่มีนัดหมายในเดือนนี้ ({uniqueReps.length}):
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueReps.map((repName) => {
                const color = getRepColor(repName as string)
                return (
                  <div
                    key={repName as string}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${color.bg} ${color.text} ${color.border}`}
                    style={color.style}
                  >
                    <span className={`w-2 h-2 rounded-full ${color.dot}`} style={color.dotStyle} />
                    <span>{repName as string}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Daily Agenda Panel (4-5 cols) ── */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-4 lg:sticky lg:top-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
          <div>
            <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">
              ตารางงานประจำวัน
            </span>
            <h3 className="text-base font-black text-gray-900 mt-0.5">
              วันที่ {selectedDay} {monthName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-red-50 text-[#ff2301] text-xs font-black border border-red-100">
              {daySchedules.length} นัดหมาย
            </span>
          </div>
        </div>

        {/* Quick Add Button for this day */}
        {onNewScheduleForDate && (
          <button
            onClick={() => onNewScheduleForDate(selectedDateStr)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-[#ff2301] border border-gray-200 hover:border-red-200 text-xs font-bold transition-all group"
          >
            <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#ff2301]" />
            <span>เพิ่มนัดหมายในวันที่ {selectedDay}</span>
          </button>
        )}

        {/* Day Schedules List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {daySchedules.length > 0 ? (
            daySchedules.map((s) => {
              const color = getRepColor(s.user?.fullName)
              const isCompleted = s.status === 'Completed' || s.status === 'เสร็จสิ้น'
              const isCancelled = s.status === 'Cancelled' || s.status === 'ยกเลิก'
              const hasReport = !!s.visitReport?.trim()
              const isPast = new Date(s.date) < new Date()
              const isOverdue = isPast && !isCompleted && !isCancelled && !hasReport

              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSchedule(s)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-md relative overflow-hidden bg-white hover:border-red-300 ${
                    isOverdue ? 'border-amber-300/80 ring-1 ring-amber-300/40' : 'border-gray-200'
                  }`}
                >
                  {/* Top Bar: Time & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {new Date(s.date).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}{' '}
                      น.
                    </span>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isCancelled
                          ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : isCancelled ? (
                        <XCircle className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Clock className="w-3 h-3 text-blue-600" />
                      )}
                      {s.status || 'รอทำ (Planned)'}
                    </span>
                  </div>

                  {/* Title & Company */}
                  <h4 className="text-xs sm:text-sm font-black text-gray-900 group-hover:text-[#ff2301] transition-colors leading-snug">
                    {s.title}
                  </h4>

                  {s.company?.companyName && (
                    <div className="flex items-center gap-1.5 text-xs text-[#ff2301] font-bold mt-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{s.company.companyName}</span>
                    </div>
                  )}

                  {s.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1.5 leading-relaxed font-medium">
                      {s.description}
                    </p>
                  )}

                  {/* Tags QT/PO/IV */}
                  {(s.quotationNumber || s.poNumber || s.invoiceNumber) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.quotationNumber && (
                        <span className="text-[9px] bg-red-50 text-[#ff2301] px-1.5 py-0.5 rounded font-bold border border-red-100">
                          QT: {s.quotationNumber}
                        </span>
                      )}
                      {s.poNumber && (
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold border border-gray-200">
                          PO: {s.poNumber}
                        </span>
                      )}
                      {s.invoiceNumber && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-100">
                          IV: {s.invoiceNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Visit Report Alert or Snippet */}
                  {hasReport ? (
                    <div className="mt-2.5 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[10px] text-emerald-800">
                      <span className="font-bold flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> รายงานผลเข้าพบแล้ว:
                      </span>
                      <p className="line-clamp-2 mt-0.5 font-medium">{s.visitReport}</p>
                    </div>
                  ) : isOverdue ? (
                    <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                      <span className="text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        ยังไม่มีรายงานผล
                      </span>
                      <Link
                        href={`/schedule/report/${s.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-black text-[#ff2301] hover:underline flex items-center gap-0.5"
                      >
                        <FileSignature className="w-3 h-3" />
                        เขียนรายงาน
                      </Link>
                    </div>
                  ) : null}

                  {/* Footer: Salesperson badge */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} style={color.dotStyle} />
                      <span className="text-[11px] font-bold text-gray-700">
                        {s.user?.fullName || 'ไม่ระบุพนักงาน'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 group-hover:text-[#ff2301] font-bold">
                      แก้ไข / ดูรายละเอียด &rarr;
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-16 text-center space-y-2 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 mx-auto shadow-sm">
                <CalendarIcon className="w-6 h-6 text-gray-300" />
              </div>
              <h5 className="text-xs font-bold text-gray-600">ไม่มีนัดหมายในวันที่ {selectedDay}</h5>
              <p className="text-[11px] text-gray-400 max-w-[200px] mx-auto">
                คลิกที่ปุ่มเพิ่มนัดหมายด้านบนเพื่อบันทึกงานใหม่
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
