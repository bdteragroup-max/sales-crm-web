/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Plus,
  Search,
  Edit2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileSignature,
  Trash2,
  Building2,
  Download,
  X,
  Layers,
  LayoutGrid,
  ListFilter,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { deleteSchedule } from '@/app/actions/schedule'
import NewScheduleForm from './components/NewScheduleForm'
import UpdateScheduleForm from './components/UpdateScheduleForm'
import ScheduleCalendar, { getRepColor, initRepColors } from './components/ScheduleCalendar'
import StaffMultiSelect from './components/StaffMultiSelect'
import * as XLSX from 'xlsx'

interface ScheduleClientPageProps {
  initialSchedules: any[]
  staffList: any[]
  userRole?: string
  currentUserId?: string
  businessTypes?: string[]
}

function statusBadge(status: string) {
  if (!status || status === 'Planned' || status === 'รอทำ') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <Clock size={11} className="text-blue-600" /> รอทำ (Planned)
      </span>
    )
  }
  if (status === 'Completed' || status === 'เสร็จสิ้น') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={11} className="text-emerald-600" /> เสร็จสิ้น
      </span>
    )
  }
  if (status === 'Cancelled' || status === 'ยกเลิก') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
        <XCircle size={11} className="text-gray-400" /> ยกเลิก
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock size={11} className="text-amber-500" /> {status}
    </span>
  )
}

export default function ScheduleClientPage({
  initialSchedules,
  staffList,
  userRole,
  currentUserId,
  businessTypes = []
}: ScheduleClientPageProps) {
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'new'>(
    (searchParams.get('tab') as 'calendar' | 'list' | 'new') || 'calendar'
  )
  const [listViewMode, setListViewMode] = useState<'table' | 'cards'>('cards')

  const [schedules, setSchedules] = useState<any[]>(initialSchedules)
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null)
  const [newSchedulePreselectedDate, setNewSchedulePreselectedDate] = useState<string>('')

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week' | 'this_month'>('all')

  const roleLower = (userRole || '').toLowerCase().trim()
  const isManager =
    ['ผู้จัดการ', 'manager', 'sales manager', 'marketing manager', 'ผู้จัดการฝ่ายการตลาด', 'ผู้จัดการการตลาด', 'ผู้การจัดการตลาด', 'super_admin', 'super admin', 'admin'].includes(roleLower) ||
    roleLower.includes('manager') ||
    roleLower.includes('ผู้จัดการ') ||
    roleLower.includes('marketing') ||
    roleLower.includes('การตลาด')

  const isMarketingMgr =
    roleLower.includes('marketing manager') ||
    roleLower.includes('ผู้จัดการฝ่ายการตลาด') ||
    roleLower.includes('ผู้จัดการการตลาด') ||
    roleLower.includes('ผู้การจัดการตลาด')

  // Current time reference in Bangkok timezone
  const now = useMemo(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })), [])

  // Pre-seed unique colors for all staff members to guarantee zero repetition
  useMemo(() => {
    const names = [
      ...staffList.map((s: any) => s.fullName),
      ...schedules.map((s: any) => s.user?.fullName)
    ].filter(Boolean) as string[]
    initRepColors(names)
  }, [staffList, schedules])

  // Base schedules scoped by selected staff (if staff filter is active)
  const staffScopedSchedules = useMemo(() => {
    if (selectedStaffIds.length === 0) return schedules
    return schedules.filter(
      (s) => selectedStaffIds.includes(s.userId) || selectedStaffIds.includes(s.user?.id)
    )
  }, [schedules, selectedStaffIds])

  // Calculate overdue visits (planned date has passed, status not Completed/Cancelled, no visit report)
  const overdueVisits = useMemo(() => {
    return staffScopedSchedules.filter((s) => {
      const isPast = new Date(s.date) < now
      const isPending =
        !s.status ||
        (s.status !== 'Completed' && s.status !== 'เสร็จสิ้น' && s.status !== 'Cancelled' && s.status !== 'ยกเลิก')
      const noReport = !s.visitReport?.trim()
      return isPast && isPending && noReport
    })
  }, [staffScopedSchedules, now])

  // KPIs
  const completedCount = useMemo(
    () => staffScopedSchedules.filter((s) => s.status === 'Completed' || s.status === 'เสร็จสิ้น').length,
    [staffScopedSchedules]
  )
  const pendingCount = useMemo(
    () =>
      staffScopedSchedules.filter(
        (s) =>
          !s.status ||
          (s.status !== 'Completed' && s.status !== 'เสร็จสิ้น' && s.status !== 'Cancelled' && s.status !== 'ยกเลิก')
      ).length,
    [staffScopedSchedules]
  )
  const overdueCount = overdueVisits.length

  // Quick Date presets
  const applyDatePreset = (preset: 'all' | 'today' | 'this_week' | 'this_month') => {
    setDatePreset(preset)
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${d}`

    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
    } else if (preset === 'today') {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (preset === 'this_week') {
      const dayOfWeek = today.getDay() // 0 = Sun
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      const endStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
      setStartDate(startStr)
      setEndDate(endStr)
    } else if (preset === 'this_month') {
      const firstDay = `${y}-${m}-01`
      const lastDayObj = new Date(y, today.getMonth() + 1, 0)
      const lastDay = `${y}-${m}-${String(lastDayObj.getDate()).padStart(2, '0')}`
      setStartDate(firstDay)
      setEndDate(lastDay)
    }
  }

  // Filter Logic
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchesTitle = s.title?.toLowerCase().includes(q)
        const matchesSales = s.user?.fullName?.toLowerCase().includes(q)
        const matchesDesc = s.description?.toLowerCase().includes(q)
        const matchesCompany = s.company?.companyName?.toLowerCase().includes(q)
        const matchesNotes = s.notes?.toLowerCase().includes(q)
        const matchesDoc =
          s.quotationNumber?.toLowerCase().includes(q) ||
          s.poNumber?.toLowerCase().includes(q) ||
          s.invoiceNumber?.toLowerCase().includes(q)

        if (!matchesTitle && !matchesSales && !matchesDesc && !matchesCompany && !matchesNotes && !matchesDoc) {
          return false
        }
      }

      // Date Range
      if (startDate || endDate) {
        const sDate = new Date(s.date)
        sDate.setHours(0, 0, 0, 0)
        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (sDate < start) return false
        }
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(0, 0, 0, 0)
          if (sDate > end) return false
        }
      }

      // Status
      if (statusFilter) {
        if (statusFilter === 'Pending') {
          const isPending =
            !s.status ||
            (s.status !== 'Completed' && s.status !== 'เสร็จสิ้น' && s.status !== 'Cancelled' && s.status !== 'ยกเลิก')
          if (!isPending) return false
        } else if (statusFilter === 'Completed') {
          const isCompleted = s.status === 'Completed' || s.status === 'เสร็จสิ้น'
          if (!isCompleted) return false
        } else if (statusFilter === 'Cancelled') {
          const isCancelled = s.status === 'Cancelled' || s.status === 'ยกเลิก'
          if (!isCancelled) return false
        } else if (statusFilter === 'Overdue') {
          const now = new Date()
          const isPast = new Date(s.date) < now
          const isPending =
            !s.status ||
            (s.status !== 'Completed' && s.status !== 'เสร็จสิ้น' && s.status !== 'Cancelled' && s.status !== 'ยกเลิก')
          const noReport = !s.visitReport?.trim()
          if (!(isPast && isPending && noReport)) return false
        }
      }

      // Staff filter (multi-select)
      if (selectedStaffIds.length > 0) {
        const matches = selectedStaffIds.includes(s.userId) || selectedStaffIds.includes(s.user?.id)
        if (!matches) return false
      }

      return true
    })
  }, [schedules, searchTerm, startDate, endDate, statusFilter, selectedStaffIds])

  const hasActiveFilters = Boolean(
    searchTerm || startDate || endDate || statusFilter || selectedStaffIds.length > 0
  )

  const clearAllFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setStatusFilter('')
    setSelectedStaffIds([])
    setDatePreset('all')
  }

  const handleSuccess = (newSchedule: any) => {
    setSchedules((prev) =>
      [...prev, newSchedule].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    )
    setActiveTab('calendar')
  }

  const handleUpdateSuccess = (updated: any) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated, user: s.user } : s))
    )
  }

  const handleDeleteSuccess = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
    if (selectedSchedule?.id === id) setSelectedSchedule(null)
  }

  const handleDeleteListItem = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบตารางงานนี้?')) return
    const res = await deleteSchedule(id)
    if (res.success) {
      handleDeleteSuccess(id)
    } else {
      alert(res.error || 'Failed to delete schedule')
    }
  }

  const handleExportExcel = () => {
    if (filteredSchedules.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก')
      return
    }

    const dataToExport = filteredSchedules.map((s, index) => ({
      'ลำดับ (No.)': index + 1,
      'วันที่ (Date)': new Date(s.date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
      'เวลา (Time)': new Date(s.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      'พนักงาน (Sales)': s.user?.fullName || '-',
      'ชื่อบริษัท (Company)': s.company?.companyName || '-',
      'หัวข้อ (Title)': s.title || '-',
      'รายละเอียด (Description)': s.description || '-',
      'รหัส QT/PO/IV': [s.quotationNumber, s.poNumber, s.invoiceNumber].filter(Boolean).join(', ') || '-',
      'รายงานผล (Visit Report)': s.visitReport || '-',
      'สถานะ (Status)': s.status || 'รอทำ (Planned)',
      'หมายเหตุ (Notes)': s.notes || '-'
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    XLSX.utils.book_append_sheet(wb, ws, 'Schedules')
    XLSX.writeFile(wb, `Schedules_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Update Modal */}
      {selectedSchedule && (
        <UpdateScheduleForm
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onSuccess={handleUpdateSuccess}
          onDelete={handleDeleteSuccess}
          businessTypes={businessTypes}
        />
      )}

      {/* ── Top Header Card ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />

        <div className="flex items-start sm:items-center gap-4 relative z-10 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-[#ff2301] shadow-sm shrink-0 border border-red-100">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {isMarketingMgr
                  ? 'ตารางงานเซลล์ทุกคน (Marketing Overview)'
                  : isManager
                    ? 'ตารางงานทีมเซลล์ (Team Schedule)'
                    : 'ตารางงานของฉัน (My Schedule)'}
              </h1>
              {isMarketingMgr && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-red-50 text-[#ff2301] border border-red-200 shrink-0">
                  ผู้จัดการการตลาด
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
              {isMarketingMgr
                ? 'ติดตามตารางนัดหมาย เข้าพบลูกค้า และรายงานผลของทีมเซลล์ทุกคนในบริษัท'
                : isManager
                  ? 'ติดตามตารางงาน การเข้าพบลูกค้า และความคืบหน้าของทีมงาน'
                  : 'บันทึกนัดหมาย วางแผนงาน และรายงานผลการเข้าพบลูกค้าของคุณ'}
            </p>
          </div>
        </div>

        {/* View Switcher & Action (Symmetrical side-by-side alignment) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0">
          {/* Segmented View Mode */}
          <div className="inline-flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200/80 h-11 shrink-0">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 h-full rounded-xl text-xs font-bold transition-all ${activeTab === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <Calendar className="w-4 h-4" />
              <span>ปฏิทิน</span>
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 h-full rounded-xl text-xs font-bold transition-all ${activeTab === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <Layers className="w-4 h-4" />
              <span>รายการ ({filteredSchedules.length})</span>
            </button>
          </div>

          {/* Primary Action Button */}
          {activeTab === 'new' ? (
            <button
              onClick={() => setActiveTab('calendar')}
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปที่ปฏิทิน</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setNewSchedulePreselectedDate('')
                setActiveTab('new')
              }}
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-2xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกนัดหมายใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Interactive KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div
          onClick={() => setStatusFilter('')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${statusFilter === ''
              ? 'border-gray-900 ring-2 ring-gray-900/10 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'
            }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-semibold">นัดหมายทั้งหมด</span>
            <CalendarDays className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">{schedules.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">ตารางงานทั้งหมดในระบบ</div>
        </div>

        {/* Card 2: Planned / Pending */}
        <div
          onClick={() => setStatusFilter('Pending')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${statusFilter === 'Pending'
              ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm bg-blue-50/20'
              : 'border-gray-200 hover:border-blue-300'
            }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 mb-2">
            <span className="font-bold">รอทำ (Planned)</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900">{pendingCount}</div>
          <div className="text-[11px] text-blue-600/80 mt-1">รอดำเนินการเข้าพบ</div>
        </div>

        {/* Card 3: Completed */}
        <div
          onClick={() => setStatusFilter('Completed')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${statusFilter === 'Completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm bg-emerald-50/20'
              : 'border-gray-200 hover:border-emerald-300'
            }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-2">
            <span className="font-bold">เสร็จสิ้น (Completed)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900">{completedCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">เข้าพบลูกค้าเรียบร้อย</div>
        </div>

        {/* Card 4: Overdue Missing Report */}
        <div
          onClick={() => setStatusFilter('Overdue')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${statusFilter === 'Overdue'
              ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-sm bg-amber-50/20'
              : 'border-gray-200 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 mb-2">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> ค้างรายงานผล
            </span>
            {overdueCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900">{overdueCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">เลยกำหนด / ยังไม่เขียนรายงาน</div>
        </div>
      </div>

      {/* ── Overdue Warning Strip (Compact & Clean) ── */}
      {overdueVisits.length > 0 && statusFilter !== 'Overdue' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900">
                พบแผนงานเข้าพบเลยกำหนดที่ยังไม่มีรายงานผล {overdueVisits.length} รายการ
              </span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                กรุณาบันทึกผลการเข้าพบ (Visit Report) เพื่อให้การติดตามงานของทีมสมบูรณ์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStatusFilter('Overdue')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition-colors"
            >
              ดูเฉพาะรายการที่ค้าง
            </button>
            {overdueVisits[0] && (
              <Link
                href={`/schedule/report/${overdueVisits[0].id}`}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
              >
                เขียนรายงานล่าสุด &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Unified Filter Toolbar (Visible in Calendar & List) ── */}
      {activeTab !== 'new' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3.5 shadow-sm">
          {/* Row 1: Search, Staff Filter, Status, and Export */}
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาลูกค้า, หัวข้อนัดหมาย, ชื่อเซลล์, หรือเลขที่ QT/PO/IV..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Staff Multi-Select Filter with Search & Branch Filtering (For Managers & Marketing Manager) */}
            {isManager && staffList && staffList.length > 0 && (
              <StaffMultiSelect
                staffList={staffList}
                selectedStaffIds={selectedStaffIds}
                onChangeSelectedStaffIds={setSelectedStaffIds}
              />
            )}

            {/* Status Filter Dropdown */}
            <div className="w-full lg:w-44 shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#ff2301] outline-none transition-all"
              >
                <option value="">ทุกสถานะ</option>
                <option value="Pending">รอทำ (Planned)</option>
                <option value="Completed">เสร็จสิ้น (Completed)</option>
                <option value="Overdue">ค้างรายงานผล (Overdue)</option>
                <option value="Cancelled">ยกเลิก (Cancelled)</option>
              </select>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shrink-0"
              title="ส่งออกตารางงานที่แสดงเป็น Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>ส่งออก Excel</span>
            </button>
          </div>

          {/* Row 2: Date Presets & Custom Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-gray-400 mr-1 shrink-0">ช่วงเวลา:</span>
              {[
                { id: 'all' as const, label: 'ทั้งหมด' },
                { id: 'today' as const, label: 'วันนี้' },
                { id: 'this_week' as const, label: 'สัปดาห์นี้' },
                { id: 'this_month' as const, label: 'เดือนนี้' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${datePreset === p.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setDatePreset('all')
                }}
                className="px-2.5 py-1 rounded-xl border border-gray-200 text-xs font-medium bg-gray-50 focus:bg-white outline-none"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setDatePreset('all')
                }}
                className="px-2.5 py-1 rounded-xl border border-gray-200 text-xs font-medium bg-gray-50 focus:bg-white outline-none"
              />

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                  title="ล้างตัวกรองทั้งหมด"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Content Area ── */}
      {activeTab === 'new' ? (
        /* ── New Schedule Form ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200">
            <button
              onClick={() => setActiveTab('calendar')}
              className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#ff2301] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับไปที่ปฏิทิน</span>
            </button>
            <span className="text-xs font-bold text-gray-400">
              สร้างนัดหมาย / วางแผนการเข้าพบลูกค้า
            </span>
          </div>

          <NewScheduleForm
            staffList={staffList}
            onSuccess={handleSuccess}
            isManager={isManager}
            currentUserId={currentUserId}
            businessTypes={businessTypes}
            initialCompanyName={searchParams.get('customerName') || ''}
            initialDate={newSchedulePreselectedDate}
          />
        </div>
      ) : activeTab === 'calendar' ? (
        /* ── Calendar View ── */
        <ScheduleCalendar
          schedules={filteredSchedules}
          onSelectSchedule={setSelectedSchedule}
          onNewScheduleForDate={(dateStr) => {
            setNewSchedulePreselectedDate(dateStr)
            setActiveTab('new')
          }}
        />
      ) : (
        /* ── List View ── */
        <div className="space-y-4">
          {/* List View Sub-Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">
              แสดง {filteredSchedules.length} จากทั้งหมด {schedules.length} รายการ
            </span>

            {/* List Display Toggle: Cards or Table */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setListViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${listViewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setListViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${listViewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                title="มุมมองตาราง"
              >
                <ListFilter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
                <CalendarDays className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">ไม่พบนัดหมายในเงื่อนไขนี้</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                {hasActiveFilters
                  ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหา หรือคลิกล้างตัวกรองเพื่อดูตารางงานทั้งหมด'
                  : 'ยังไม่มีตารางงานนัดหมายในระบบ คลิกเพื่อเริ่มต้นสร้างนัดหมายฉบับแรก'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('new')}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#ff2301] text-white text-xs font-bold shadow-md hover:bg-[#e01f01] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>บันทึกนัดหมายใหม่</span>
                </button>
              )}
            </div>
          ) : listViewMode === 'cards' ? (
            /* ── Cards View ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((schedule) => {
                const color = getRepColor(schedule.user?.fullName)
                const isCompleted = schedule.status === 'Completed' || schedule.status === 'เสร็จสิ้น'
                const isCancelled = schedule.status === 'Cancelled' || schedule.status === 'ยกเลิก'
                const hasReport = !!schedule.visitReport?.trim()
                const isPast = new Date(schedule.date) < now
                const isOverdue = isPast && !isCompleted && !isCancelled && !hasReport

                return (
                  <div
                    key={schedule.id}
                    className={`bg-white rounded-2xl p-5 border transition-all hover:border-red-300 hover:shadow-md flex flex-col justify-between group relative overflow-hidden ${isOverdue ? 'border-amber-300 ring-1 ring-amber-300/40' : 'border-gray-200'
                      }`}
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Date, Time & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {new Date(schedule.date).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short'
                          })}{' '}
                          {new Date(schedule.date).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}{' '}
                          น.
                        </span>
                        {statusBadge(schedule.status)}
                      </div>

                      {/* Title & Customer */}
                      <div>
                        <h4 className="text-sm font-black text-gray-900 group-hover:text-[#ff2301] transition-colors leading-snug">
                          {schedule.title}
                        </h4>
                        {schedule.company?.companyName && (
                          <div className="flex items-center gap-1.5 text-xs text-[#ff2301] font-bold mt-1">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{schedule.company.companyName}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {schedule.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {schedule.description}
                        </p>
                      )}

                      {/* Tags QT/PO/IV */}
                      {(schedule.quotationNumber || schedule.poNumber || schedule.invoiceNumber) && (
                        <div className="flex flex-wrap gap-1.5">
                          {schedule.quotationNumber && (
                            <span className="text-[10px] bg-red-50 text-[#ff2301] px-2 py-0.5 rounded-lg border border-red-100 font-bold">
                              QT: {schedule.quotationNumber}
                            </span>
                          )}
                          {schedule.poNumber && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200 font-bold">
                              PO: {schedule.poNumber}
                            </span>
                          )}
                          {schedule.invoiceNumber && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 font-bold">
                              IV: {schedule.invoiceNumber}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Visit Report Alert or Preview */}
                      {hasReport ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-800">
                          <span className="font-bold flex items-center gap-1 text-emerald-700 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> รายงานผลการเข้าพบ:
                          </span>
                          <p className="line-clamp-2 mt-0.5 text-[11px] font-medium leading-relaxed">
                            {schedule.visitReport}
                          </p>
                        </div>
                      ) : isOverdue ? (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ค้างส่งรายงานผล
                          </span>
                          <Link
                            href={`/schedule/report/${schedule.id}`}
                            className="text-[11px] font-black text-[#ff2301] hover:underline flex items-center gap-0.5"
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                            เขียนรายงาน
                          </Link>
                        </div>
                      ) : null}
                    </div>

                    {/* Footer: Salesperson & Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${color.dot}`} style={color.dotStyle} />
                        <span className="font-bold text-gray-800 text-[11px]">
                          {schedule.user?.fullName || 'ไม่ระบุ'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {!hasReport && !isCancelled && (
                          <Link
                            href={`/schedule/report/${schedule.id}`}
                            className="p-1.5 text-gray-500 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                            title="เขียนรายงานผลการเข้าพบ"
                          >
                            <FileSignature className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => setSelectedSchedule(schedule)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไข / ดูข้อมูล"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteListItem(schedule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Table View ── */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">วันที่ / เวลา</th>
                      <th className="py-3 px-4">พนักงาน (Sales)</th>
                      <th className="py-3 px-4">ลูกค้า / บริษัท</th>
                      <th className="py-3 px-4">หัวข้อนัดหมาย</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4">รายงานผล</th>
                      <th className="py-3 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSchedules.map((schedule) => {
                      const color = getRepColor(schedule.user?.fullName)
                      const isCompleted = schedule.status === 'Completed' || schedule.status === 'เสร็จสิ้น'
                      const isCancelled = schedule.status === 'Cancelled' || schedule.status === 'ยกเลิก'
                      const hasReport = !!schedule.visitReport?.trim()
                      const isPast = new Date(schedule.date) < now
                      const isOverdue = isPast && !isCompleted && !isCancelled && !hasReport

                      return (
                        <tr key={schedule.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900">
                              {new Date(schedule.date).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit'
                              })}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(schedule.date).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}{' '}
                              น.
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-gray-800">
                              <span className={`w-2 h-2 rounded-full ${color.dot}`} style={color.dotStyle} />
                              <span>{schedule.user?.fullName || '—'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 max-w-[200px] truncate">
                              {schedule.company?.companyName || '—'}
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="font-bold text-gray-900 truncate">{schedule.title}</div>
                            {schedule.description && (
                              <div className="text-[10px] text-gray-400 truncate">
                                {schedule.description}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {statusBadge(schedule.status)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {hasReport ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={10} /> บันทึกแล้ว
                              </span>
                            ) : isOverdue ? (
                              <Link
                                href={`/schedule/report/${schedule.id}`}
                                className="inline-flex items-center gap-1 text-[10px] font-black text-[#ff2301] bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full border border-red-200"
                              >
                                <FileSignature size={10} /> เขียนรายงาน
                              </Link>
                            ) : (
                              <span className="text-gray-400 text-[10px]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedSchedule(schedule)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteListItem(schedule.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
