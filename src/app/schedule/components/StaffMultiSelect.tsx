'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Users,
  Search,
  X,
  Check,
  ChevronDown,
  Building2,
  CheckSquare,
  Square
} from 'lucide-react'
import { getRepColor } from './ScheduleCalendar'

export interface StaffMember {
  id: string
  fullName: string
  employeeId?: string
  role?: string
  branchCode?: string
  branchName?: string
}

interface StaffMultiSelectProps {
  staffList: StaffMember[]
  selectedStaffIds: string[]
  onChangeSelectedStaffIds: (ids: string[]) => void
}

export default function StaffMultiSelect({
  staffList,
  selectedStaffIds,
  onChangeSelectedStaffIds
}: StaffMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('ทั้งหมด')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Extract unique branches with staff count
  const branches = useMemo(() => {
    const counts: Record<string, number> = {}
    staffList.forEach((s) => {
      const b = s.branchName || 'สำนักงานใหญ่'
      counts[b] = (counts[b] || 0) + 1
    })

    const branchNames = Object.keys(counts).sort((a, b) => {
      if (a.includes('สำนักงานใหญ่')) return -1
      if (b.includes('สำนักงานใหญ่')) return 1
      return a.localeCompare(b, 'th')
    })

    return [
      { name: 'ทั้งหมด', count: staffList.length },
      ...branchNames.map((b) => ({ name: b, count: counts[b] }))
    ]
  }, [staffList])

  // Filter staff by search and branch
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return staffList.filter((s) => {
      // Branch filter
      if (selectedBranch !== 'ทั้งหมด') {
        const b = s.branchName || 'สำนักงานใหญ่'
        if (b !== selectedBranch) return false
      }

      // Search query
      if (q) {
        const nameMatch = (s.fullName || '').toLowerCase().includes(q)
        const branchMatch = (s.branchName || '').toLowerCase().includes(q)
        const codeMatch = (s.branchCode || '').toLowerCase().includes(q)
        const empIdMatch = (s.employeeId || '').toLowerCase().includes(q)
        if (!nameMatch && !branchMatch && !codeMatch && !empIdMatch) return false
      }

      return true
    })
  }, [staffList, selectedBranch, searchQuery])

  // Toggle single staff
  const toggleStaff = (id: string) => {
    if (selectedStaffIds.includes(id)) {
      onChangeSelectedStaffIds(selectedStaffIds.filter((item) => item !== id))
    } else {
      onChangeSelectedStaffIds([...selectedStaffIds, id])
    }
  }

  // Select all visible staff in current branch/search
  const selectAllVisible = () => {
    const visibleIds = filteredStaff.map((s) => s.id)
    const newSelected = Array.from(new Set([...selectedStaffIds, ...visibleIds]))
    onChangeSelectedStaffIds(newSelected)
  }

  // Deselect all visible staff in current branch/search
  const deselectAllVisible = () => {
    const visibleIds = new Set(filteredStaff.map((s) => s.id))
    onChangeSelectedStaffIds(selectedStaffIds.filter((id) => !visibleIds.has(id)))
  }

  // Clear all selections (return to "everyone")
  const clearAll = () => {
    onChangeSelectedStaffIds([])
  }

  // Check if all visible staff are currently selected
  const isAllVisibleSelected =
    filteredStaff.length > 0 &&
    filteredStaff.every((s) => selectedStaffIds.includes(s.id))

  // Trigger button display label
  const triggerLabel = useMemo(() => {
    if (selectedStaffIds.length === 0) {
      return `พนักงานทุกคน (${staffList.length})`
    }
    if (selectedStaffIds.length === 1) {
      const staff = staffList.find((s) => s.id === selectedStaffIds[0])
      return staff ? staff.fullName : '1 คนที่เลือก'
    }
    return `เลือก ${selectedStaffIds.length} คน`
  }, [selectedStaffIds, staffList])

  return (
    <div className="relative w-full lg:w-72 shrink-0" ref={dropdownRef}>
      {/* ── Trigger Button ── */}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left ${
            selectedStaffIds.length > 0
              ? 'bg-red-50/70 border-red-200 text-[#ff2301] shadow-xs'
              : 'bg-gray-50 hover:bg-white border-gray-200 text-gray-800'
          }`}
          title="ค้นหาและเลือกพนักงาน (เลือกได้หลายคน หรือเลือกตามสาขา)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Users
              className={`w-4 h-4 shrink-0 ${
                selectedStaffIds.length > 0 ? 'text-[#ff2301]' : 'text-gray-400'
              }`}
            />
            <span className="truncate">{triggerLabel}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedStaffIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-[#ff2301] text-white text-[10px] font-black leading-none">
                {selectedStaffIds.length}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Quick Clear Button (X) */}
        {selectedStaffIds.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-600 rounded-md transition-colors"
            title="ล้างตัวเลือกพนักงาน (ดูทุกคน)"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Popover Dropdown Panel ── */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-[420px] top-full mt-2 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-black text-gray-900">
              <Users className="w-4 h-4 text-[#ff2301]" />
              <span>เลือกดูพนักงาน & สาขา</span>
            </div>

            <div className="flex items-center gap-2">
              {selectedStaffIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  ดูทุกคน ({staffList.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box (พิมพ์หาชื่อได้) */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์ชื่อพนักงาน, รหัส หรือสาขา..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#ff2301] outline-none transition-all placeholder:text-gray-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Branch Filter Tabs (ค้นหาแบบแบ่งสาขาได้) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> แบ่งตามสาขา:
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {branches.length - 1} สาขา
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {branches.map((b) => {
                const isActive = selectedBranch === b.name
                return (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setSelectedBranch(b.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span
                      className={`ml-1 px-1 py-0.2 rounded-md text-[9px] ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {b.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Branch Selection Action Bar */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[11px] font-medium text-gray-500">
              พบ {filteredStaff.length} คน
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isAllVisibleSelected ? deselectAllVisible : selectAllVisible}
                className="flex items-center gap-1 text-[11px] font-bold text-[#ff2301] hover:underline"
              >
                {isAllVisibleSelected ? (
                  <>
                    <Square className="w-3 h-3" />
                    <span>ยกเลิกที่แสดง ({filteredStaff.length})</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3" />
                    <span>
                      {selectedBranch === 'ทั้งหมด'
                        ? 'เลือกทั้งหมดที่พบ'
                        : `เลือกทั้งสาขานี้ (${filteredStaff.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Staff List with Checkboxes (เลือกดูได้หลายคน) */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-100 p-1 bg-gray-50/40">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaffIds.includes(staff.id)
                const color = getRepColor(staff.fullName)

                return (
                  <label
                    key={staff.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-red-50/70 text-[#ff2301]'
                        : 'hover:bg-white text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStaff(staff.id)}
                        className="rounded border-gray-300 text-[#ff2301] focus:ring-[#ff2301] h-3.5 w-3.5 cursor-pointer"
                      />

                      {/* Rep Color Dot */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`}
                        style={color.dotStyle}
                      />

                      <div className="min-w-0">
                        <div className="font-bold truncate text-gray-900 leading-tight">
                          {staff.fullName}
                        </div>
                        {staff.role && (
                          <div className="text-[10px] text-gray-400 truncate">
                            {staff.role}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Branch Badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200/80 text-gray-600 shrink-0">
                      {staff.branchName || 'สำนักงานใหญ่'}
                    </span>
                  </label>
                )
              })
            ) : (
              <div className="py-8 text-center space-y-1">
                <p className="text-xs font-bold text-gray-500">ไม่พบพนักงานที่ค้นหา</p>
                <p className="text-[11px] text-gray-400">
                  ลองเปลี่ยนคำค้นหา หรือเลือกสาขาอื่น
                </p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-gray-500">
              {selectedStaffIds.length === 0 ? (
                <span>แสดงพนักงานทุกคน ({staffList.length} คน)</span>
              ) : (
                <span>
                  เลือก <strong className="text-[#ff2301]">{selectedStaffIds.length}</strong> / {staffList.length} คน
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>เสร็จสิ้น</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
