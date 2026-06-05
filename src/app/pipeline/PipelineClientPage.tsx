'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateQuotationStatus } from '@/app/actions/pipeline'
import { JOB_TYPES } from '@/constants/job-types'
import {
  Layers,
  Sparkles,
  Clock,
  FileText,
  CheckCircle2,
  TrendingUp,
  Filter,
  User2,
  Search,
  FileSignature,
  AlertCircle,
  Edit3,
  PlusCircle,
  EyeOff,
  Eye,
  ChevronRight,
  DollarSign,
  Package,
  ArrowRight,
  BarChart2,
  ClipboardCheck,
  Calendar,
  CalendarDays,
} from 'lucide-react'

interface PipelineClientPageProps {
  initialQuotations: any[]
  teamMembers: any[]
  userRole?: string
  currentUserId?: string
  initialDateField?: string
  initialPreset?: string
  initialDateFrom?: string
  initialDateTo?: string
}

const COLUMNS = [
  {
    id: 'ความสนใจ',
    label: 'ความสนใจ',
    subLabel: 'Interest / Target',
    accent: '#0ea5e9',
    accentBg: 'bg-sky-500',
    accentLight: 'bg-sky-50',
    accentBorder: 'border-sky-200',
    accentText: 'text-sky-600',
    accentRing: 'ring-sky-400/30',
    dot: 'bg-sky-400',
  },
  {
    id: 'นัดหมาย',
    label: 'นัดหมาย',
    subLabel: 'Appt Scheduled',
    accent: '#f59e0b',
    accentBg: 'bg-amber-500',
    accentLight: 'bg-amber-50',
    accentBorder: 'border-amber-200',
    accentText: 'text-amber-600',
    accentRing: 'ring-amber-400/30',
    dot: 'bg-amber-400',
  },
  {
    id: 'เสนอราคา',
    label: 'เสนอราคา',
    subLabel: 'In Negotiation',
    accent: '#DC2626',
    accentBg: 'bg-red-600',
    accentLight: 'bg-red-50',
    accentBorder: 'border-red-200',
    accentText: 'text-red-600',
    accentRing: 'ring-red-400/30',
    dot: 'bg-red-500',
  },
  {
    id: 'รอ PO',
    label: 'รอ PO',
    subLabel: 'Waiting for PO',
    accent: '#7c3aed',
    accentBg: 'bg-violet-600',
    accentLight: 'bg-violet-50',
    accentBorder: 'border-violet-200',
    accentText: 'text-violet-600',
    accentRing: 'ring-violet-400/30',
    dot: 'bg-violet-500',
  },
  {
    id: 'เปิดบิลแล้ว',
    label: 'ปิดการขาย',
    subLabel: 'Closed Won',
    accent: '#10b981',
    accentBg: 'bg-emerald-500',
    accentLight: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-600',
    accentRing: 'ring-emerald-400/30',
    dot: 'bg-emerald-400',
  },
]

const LOST_COLUMN = {
  id: 'ปฏิเสธ/ยกเลิก',
  label: 'ไม่สำเร็จ',
  subLabel: 'Lost / Cancelled',
  accent: '#6b7280',
  accentBg: 'bg-gray-500',
  accentLight: 'bg-gray-50',
  accentBorder: 'border-gray-200',
  accentText: 'text-gray-500',
  accentRing: 'ring-gray-400/20',
  dot: 'bg-gray-400',
}

export default function PipelineClientPage({ 
  initialQuotations, teamMembers, userRole, currentUserId, 
  initialDateField = 'updatedAt', initialPreset = '', initialDateFrom = '', initialDateTo = ''
}: PipelineClientPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [quotations, setQuotations] = useState<any[]>(initialQuotations)
  const [pendingTransition, setPendingTransition] = useState<{ 
    id: string, targetColumnId: string, nextDbStatus: string, quotation: any, type: 'quotation' | 'po' | 'appointment' | 'closed' 
  } | null>(null)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
  const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(new Set())

  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showLostDeals, setShowLostDeals] = useState<boolean>(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [inputQuotationNumber, setInputQuotationNumber] = useState('')
  const [inputPoNumber, setInputPoNumber] = useState('')
  const [inputPoDate, setInputPoDate] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentNote, setAppointmentNote] = useState('')

  // Date Filter States
  const [dateField, setDateField] = useState<string>(initialDateField)
  const [preset, setPreset] = useState<string>(initialPreset)
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom)
  const [dateTo, setDateTo] = useState<string>(initialDateTo)

  // Sync initial props when URL search params change
  useEffect(() => {
    setQuotations(initialQuotations)
  }, [initialQuotations])

  const updateFilters = (updates: { df?: string, pr?: string, dFrom?: string, dTo?: string }) => {
    const newDf = updates.df !== undefined ? updates.df : dateField
    const newPr = updates.pr !== undefined ? updates.pr : preset
    const newDFrom = updates.dFrom !== undefined ? updates.dFrom : dateFrom
    const newDTo = updates.dTo !== undefined ? updates.dTo : dateTo

    setDateField(newDf)
    setPreset(newPr)
    if (updates.dFrom !== undefined) setDateFrom(newDFrom)
    if (updates.dTo !== undefined) setDateTo(newDTo)

    const params = new URLSearchParams()
    if (newDf) params.set('dateField', newDf)
    if (newPr) params.set('preset', newPr)
    if (newPr === 'custom') {
      if (newDFrom) params.set('dateFrom', newDFrom)
      if (newDTo) params.set('dateTo', newDTo)
    }
    
    startTransition(() => {
      router.push(`/pipeline?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    updateFilters({ df: 'updatedAt', pr: '', dFrom: '', dTo: '' })
  }

  const isManager = userRole === 'ผู้จัดการ'

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const columnsToRender = showLostDeals ? [...COLUMNS, LOST_COLUMN] : [...COLUMNS]

  const mapStatusToColumn = (status: string): string => {
    if (!status || status === 'Pending') return 'ความสนใจ'
    if (status.includes('ไม่สำเร็จ') || status.includes('ปฏิเสธ')) return 'ปฏิเสธ/ยกเลิก'
    if (['รอติดตั้ง', 'ปิดการขาย', 'รอส่งมอบ', 'เปิดบิลแล้ว'].includes(status)) return 'เปิดบิลแล้ว'
    if (status.includes('รอจัดทำ PO') || status.includes('PO แล้วรอมัดจำ') || status.includes('PO แล้วรอสินค้า') || status.includes('PO แล้วรอเงินโอน')) return 'รอ PO'
    if (['เสนอราคา', 'ต่อรองราคา', 'ยกเลิก-Revise'].includes(status)) return 'เสนอราคา'
    if (status === 'นัดหมาย' || status === 'รอใบประเมินราคา') return 'นัดหมาย'
    return 'ความสนใจ'
  }

  const mapColumnToDbStatus = (columnId: string): string => {
    if (columnId === 'เปิดบิลแล้ว') return 'เปิดบิลแล้ว'
    if (columnId === 'รอ PO') return 'รอจัดทำ PO'
    if (columnId === 'เสนอราคา') return 'เสนอราคา'
    if (columnId === 'นัดหมาย') return 'นัดหมาย'
    if (columnId === 'ปฏิเสธ/ยกเลิก') return 'ปฏิเสธ-อื่นๆ'
    return 'ความสนใจ'
  }

  const moveQuotationStatus = async (id: string, targetColumnId: string) => {
    const quotationToMove = quotations.find(q => q.id === id)
    if (!quotationToMove) return
    const currentColumn = mapStatusToColumn(quotationToMove.status)
    if (currentColumn === targetColumnId) return

    const nextDbStatus = mapColumnToDbStatus(targetColumnId)

    // Intercept: moving from Interest/Appointment to Quotation
    if (targetColumnId === 'เสนอราคา' && (currentColumn === 'ความสนใจ' || currentColumn === 'นัดหมาย')) {
      setPendingTransition({
        id,
        targetColumnId,
        nextDbStatus,
        quotation: quotationToMove,
        type: 'quotation'
      })
      return;
    }

    // Intercept: moving from anywhere to Waiting for PO
    if (targetColumnId === 'รอ PO' && currentColumn !== 'รอ PO') {
      setPendingTransition({
        id,
        targetColumnId,
        nextDbStatus: 'รอจัดทำ PO',
        quotation: quotationToMove,
        type: 'po'
      })
      return;
    }

    // Intercept: moving from Interest to Appointment
    if (targetColumnId === 'นัดหมาย' && currentColumn === 'ความสนใจ') {
      setPendingTransition({
        id,
        targetColumnId,
        nextDbStatus,
        quotation: quotationToMove,
        type: 'appointment'
      })
      return;
    }

    // Intercept: moving from anywhere to Closed Won
    if (targetColumnId === 'เปิดบิลแล้ว' && currentColumn !== 'เปิดบิลแล้ว') {
      setPendingTransition({
        id,
        targetColumnId,
        nextDbStatus: 'เปิดบิลแล้ว',
        quotation: quotationToMove,
        type: 'closed'
      })
      return;
    }

    await executeMove(id, nextDbStatus)
  }

  const executeMove = async (id: string, nextDbStatus: string, extra?: { quotationNumber?: string, poNumber?: string, poDate?: string, jobType?: string, appointmentDate?: string, appointmentNote?: string, paymentMethod?: string }) => {
    const oldQuotations = [...quotations]
    setQuotations(prev => {
      const updated = prev.map(q => q.id === id ? { 
        ...q, 
        status: nextDbStatus, 
        updatedAt: new Date().toISOString(),
        ...(extra?.quotationNumber ? { quotationNumber: extra.quotationNumber } : {}),
        ...(extra?.poNumber ? { poNumber: extra.poNumber } : {}),
        ...(extra?.poDate ? { poDate: new Date(extra.poDate).toISOString() } : {})
      } : q);

      return updated.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    })
    
    setPendingCardIds(prev => new Set(prev).add(id))

    startTransition(async () => {
      try {
        const response = await updateQuotationStatus(id, nextDbStatus, extra)
        if (response.success) {
          triggerToast('ย้ายสถานะดีลสำเร็จ!', 'success')
          router.refresh()
        } else {
          setQuotations(oldQuotations)
          triggerToast(response.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error')
        }
      } catch (err) {
        setQuotations(oldQuotations)
        triggerToast('เกิดข้อผิดพลาดทางเทคนิคในการย้ายดีล', 'error')
      } finally {
        setPendingCardIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    })
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragEnd = () => { setDraggingId(null); setDraggedOverColumn(null) }
  const handleDragOver = (e: React.DragEvent, columnId: string) => { e.preventDefault(); if (draggedOverColumn !== columnId) setDraggedOverColumn(columnId) }
  const handleDragLeave = () => setDraggedOverColumn(null)
  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    setDraggedOverColumn(null)
    const id = e.dataTransfer.getData('text/plain') || draggingId
    if (!id) return
    await moveQuotationStatus(id, targetColumnId)
  }

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = !searchTerm ||
      q.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.requirementNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.contact?.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSalesperson = !selectedSalespersonId || q.salespersonId === selectedSalespersonId
    const isLost = q.status?.startsWith('ปฏิเสธ') || (q.status?.startsWith('ยกเลิก') && q.status !== 'ยกเลิก-Revise')
    const matchesLostStatus = showLostDeals ? true : !isLost
    return matchesSearch && matchesSalesperson && matchesLostStatus
  })

  const getColumnData = (columnId: string) => {
    const list = filteredQuotations.filter(q => mapStatusToColumn(q.status) === columnId)
    const totalValue = list.reduce((sum, q) => sum + (Number(q.actualClosingAmount) || Number(q.totalAmountBeforeVat) || 0), 0)
    return { list, totalValue }
  }

  const allActiveValue = COLUMNS.reduce((sum, col) => {
    const { totalValue } = getColumnData(col.id)
    return sum + totalValue
  }, 0)

  const fmtMoney = (v: number) => v >= 1_000_000
    ? `฿${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `฿${(v / 1_000).toFixed(0)}K`
    : `฿${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : name[0]
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] px-5 py-3.5 rounded-2xl border text-xs font-black shadow-2xl flex items-center gap-2.5 backdrop-blur-sm transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800 shadow-emerald-100'
            : 'bg-red-50/95 border-red-200 text-red-800 shadow-red-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-500" /> : <AlertCircle size={15} className="text-red-500" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header ── */}
      <header className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-red flex items-center justify-center shadow-md shadow-red-200">
            <Layers size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight">
              {isManager ? 'Sales Pipeline' : 'My Pipeline'}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isManager ? 'ท่อดีลฝ่ายขาย' : 'ท่อดีลของฉัน'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาบริษัท, เลขที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-52 pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
            />
          </div>

          {/* Salesperson filter */}
          {isManager && (
            <select
              value={selectedSalespersonId}
              onChange={(e) => setSelectedSalespersonId(e.target.value)}
              className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
            >
              <option value="">ทีมทั้งหมด</option>
              {teamMembers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.fullName}{m.id === currentUserId ? ' (ฉัน)' : ''}</option>
              ))}
            </select>
          )}

          {/* Toggle lost */}
          <button
            onClick={() => setShowLostDeals(!showLostDeals)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              showLostDeals ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
          >
            {showLostDeals ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showLostDeals ? 'ซ่อนดีลพลาด' : 'ดีลพลาด'}</span>
          </button>

          {/* Create */}
          <button
            onClick={() => router.push('/sales')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200 active:scale-95"
          >
            <PlusCircle size={13} />
            <span>สร้างใบเสนอราคา</span>
          </button>
        </div>
        </div>

        {/* ── Date Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-50">
          {/* Field Selection */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ตัวกรองวันที่:</span>
            <select
              value={dateField}
              onChange={(e) => updateFilters({ df: e.target.value })}
              className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
            >
              <option value="quotationDate">วันที่เสนอราคา</option>
              <option value="updatedAt">วันที่อัปเดตล่าสุด</option>
              <option value="createdAt">วันที่สร้าง</option>
            </select>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={() => updateFilters({ pr: 'thisMonth' })}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                preset === 'thisMonth' ? 'bg-white shadow-sm text-brand-red' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              เดือนนี้
            </button>
            <button
              onClick={() => updateFilters({ pr: '3months' })}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                preset === '3months' ? 'bg-white shadow-sm text-brand-red' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              3 เดือนย้อนหลัง
            </button>
            <button
              onClick={() => updateFilters({ pr: 'custom' })}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                preset === 'custom' ? 'bg-white shadow-sm text-brand-red' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              กำหนดเอง
            </button>
          </div>

          {/* Custom Date Range */}
          {preset === 'custom' && (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => updateFilters({ dFrom: e.target.value })}
                className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
              <span className="text-gray-400 font-bold text-xs px-1">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => updateFilters({ dTo: e.target.value })}
                className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
            </div>
          )}

          {/* Clear Filter */}
          {(preset !== '' || dateField !== 'updatedAt') && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            >
              <AlertCircle size={12} />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </header>

      {/* ── Pipeline Value Summary Bar ── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-8 overflow-x-auto">
        {columnsToRender.map(col => {
          const { list, totalValue } = getColumnData(col.id)
          const pct = allActiveValue > 0 ? (totalValue / allActiveValue) * 100 : 0
          return (
            <div key={col.id} className="flex items-center gap-3 shrink-0">
              <div className={`w-2 h-2 rounded-full ${col.dot}`} />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{col.label}</p>
                <p className="text-sm font-black text-gray-900">{fmtMoney(totalValue)}</p>
              </div>
              <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{list.length}</span>
              {col.id !== 'ปฏิเสธ/ยกเลิก' && (
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: col.accent }}
                  />
                </div>
              )}
              {col !== columnsToRender[columnsToRender.length - 1] && (
                <ChevronRight size={12} className="text-gray-300 ml-2" />
              )}
            </div>
          )
        })}


      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-x-auto p-5 custom-scrollbar">
        <div className={`h-full flex gap-4 ${showLostDeals ? 'min-w-[1550px]' : 'min-w-[1300px]'}`}>

          {columnsToRender.map(col => {
            const { list, totalValue } = getColumnData(col.id)
            const isHovered = draggedOverColumn === col.id
            const isLostCol = col.id === 'ปฏิเสธ/ยกเลิก'

            return (
              <div
                key={col.id}
                className={`flex-1 flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
                  isHovered
                    ? 'ring-2 shadow-xl scale-[1.01]'
                    : 'shadow-sm'
                }`}
                style={isHovered ? { '--tw-ring-color': col.accent, boxShadow: `0 0 0 2px ${col.accent}40, 0 20px 40px ${col.accent}15` } as any : {}}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div
                  className="shrink-0 px-4 py-3 flex items-center justify-between"
                  style={{ backgroundColor: col.accent }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                      {col.id === 'ความสนใจ' && <BarChart2 size={12} className="text-white" />}
                      {col.id === 'นัดหมาย' && <Clock size={12} className="text-white" />}
                      {col.id === 'เสนอราคา' && <FileText size={12} className="text-white" />}
                      {col.id === 'รอ PO' && <ClipboardCheck size={12} className="text-white" />}
                      {col.id === 'เปิดบิลแล้ว' && <CheckCircle2 size={12} className="text-white" />}
                      {col.id === 'ปฏิเสธ/ยกเลิก' && <AlertCircle size={12} className="text-white" />}
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-white uppercase tracking-widest leading-none">{col.label}</h3>
                      <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider mt-0.5">{col.subLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/25 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{list.length}</span>
                  </div>
                </div>

                {/* Column Value Footer strip */}
                <div className="shrink-0 px-4 py-2 flex items-center justify-between" style={{ backgroundColor: col.accent + '18' }}>
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: col.accent }}>มูลค่ารวม</span>
                  <span className="text-xs font-black font-mono" style={{ color: col.accent }}>{fmtMoney(totalValue)}</span>
                </div>

                {/* Cards */}
                <div className={`flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar ${isLostCol ? 'bg-gray-50/80' : 'bg-gray-50/60'}`}
                  style={{ maxHeight: 'calc(100vh - 290px)' }}>
                  {list.length > 0 ? (
                    list.map((quotation: any) => {
                      const isLost = quotation.status?.startsWith('ปฏิเสธ') || quotation.status?.startsWith('ยกเลิก')
                      const isDragging = draggingId === quotation.id
                      const amount = Number(quotation.actualClosingAmount) || Number(quotation.totalAmountBeforeVat) || 0
                      const rawName = quotation.salesperson?.fullName || ''
                      const salespersonName = rawName.replace(/u?undefined/ig, '').trim()
                      const initials = getInitials(salespersonName)

                      // Avatar color based on first char
                      const avatarColors = [
                        'bg-violet-100 text-violet-700',
                        'bg-sky-100 text-sky-700',
                        'bg-amber-100 text-amber-700',
                        'bg-emerald-100 text-emerald-700',
                        'bg-rose-100 text-rose-700',
                        'bg-indigo-100 text-indigo-700',
                      ]
                      const avatarColor = avatarColors[(salespersonName.charCodeAt(0) || 0) % avatarColors.length]

                      return (
                        <div key={quotation.id} className="relative">
                        <div
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, quotation.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all duration-150 select-none relative group ${
                            isDragging
                              ? 'opacity-30 scale-95 border-dashed border-gray-300 shadow-none'
                              : isLost
                              ? 'border-gray-150 opacity-70 hover:opacity-100'
                              : 'border-gray-100 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Colored left accent bar */}
                          <div
                            className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                            style={{ backgroundColor: isLost ? '#9ca3af' : col.accent }}
                          />

                          <div className="p-3.5 pl-4">
                            {/* Top row: company + edit */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-[11px] font-black text-gray-900 leading-snug line-clamp-2 group-hover:text-brand-red transition-colors flex-1">
                                {quotation.company?.companyName || 'ไม่ระบุบริษัท'}
                              </h4>
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/sales?editId=${quotation.id}`) }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-brand-red hover:bg-red-50 rounded-lg transition-all shrink-0"
                                title="แก้ไข"
                              >
                                <Edit3 size={11} />
                              </button>
                            </div>

                            {/* Tags row */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {quotation.company?.businessType && (
                                <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded font-bold">
                                  {quotation.company.businessType}
                                </span>
                              )}
                              {quotation.productType && (
                                <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                  <Package size={7} />
                                  {quotation.productType}
                                </span>
                              )}
                              {isLost && (
                                <span className="text-[8px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded font-black uppercase">
                                  {quotation.status}
                                </span>
                              )}
                            </div>

                            {/* Subject */}
                            {quotation.subject && (
                              <p className="text-[10px] text-gray-400 font-medium line-clamp-1 mb-2 flex items-center gap-1">
                                <Sparkles size={9} className="text-amber-400 shrink-0" />
                                {quotation.subject}
                              </p>
                            )}

                            {/* Document number */}
                            <div className="mb-2.5">
                              {(col.id === 'ความสนใจ' || col.id === 'นัดหมาย') && quotation.requirementNumber && (
                                <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-fit">
                                  <FileText size={8} className="text-slate-400 shrink-0" />
                                  <span className="text-[9px] font-black text-slate-500 font-mono select-all tracking-wide">
                                    {quotation.requirementNumber}
                                  </span>
                                </div>
                              )}
                              {(col.id === 'เสนอราคา' || col.id === 'รอ PO' || col.id === 'เปิดบิลแล้ว' || col.id === 'ปฏิเสธ/ยกเลิก') && quotation.quotationNumber && (
                                <div
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 w-fit border"
                                  style={{ backgroundColor: col.accent + '12', borderColor: col.accent + '35' }}
                                >
                                  <FileText size={8} className="shrink-0" style={{ color: col.accent }} />
                                  <span className="text-[9px] font-black font-mono select-all tracking-wide" style={{ color: col.accent }}>
                                    {quotation.quotationNumber}
                                  </span>
                                </div>
                              )}
                              {/* PO Number — shown in รอ PO and Closed Won columns */}
                              {(col.id === 'รอ PO' || col.id === 'เปิดบิลแล้ว' || col.id === 'ปฏิเสธ/ยกเลิก') && quotation.poNumber && (
                                <div className="mt-1 inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 w-fit">
                                  <DollarSign size={8} className="text-emerald-600 shrink-0" />
                                  <span className="text-[9px] font-black text-emerald-700 font-mono select-all tracking-wide">
                                    PO: {quotation.poNumber}
                                  </span>
                                </div>
                              )}
                            {/* Appointment Date — shown in นัดหมาย column */}
                            {col.id === 'นัดหมาย' && quotation.appointmentDate && (
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-600 font-black bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200/50 w-fit">
                                <Calendar size={11} className="shrink-0 text-amber-500" />
                                {new Date(quotation.appointmentDate).toLocaleDateString('th-TH', {
                                  day: 'numeric', month: 'short', year: '2-digit',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>

                          {/* Divider */}
                            <div className="border-t border-gray-50 mb-2.5" />

                            {/* Footer: amount + salesperson */}
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">ยอดประเมิน</p>
                                <p className="text-sm font-black text-gray-900 font-mono leading-tight">
                                  {fmtMoney(amount)}
                                </p>
                              </div>

                              {/* Salesperson */}
                              <div className="flex items-center gap-1.5 notranslate text-right" translate="no">
                                <span className="text-[9px] font-bold text-gray-500 max-w-[100px] leading-tight break-words" title={salespersonName}>
                                  {salespersonName || '—'}
                                </span>
                              </div>
                            </div>

                            {/* Appointment quick-action */}
                            {col.id === 'นัดหมาย' && (
                              <button
                                onClick={() => router.push('/schedule')}
                                className="mt-2.5 w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1 hover:text-white"
                                style={{
                                  backgroundColor: '#f59e0b18',
                                  borderColor: '#f59e0b40',
                                  color: '#d97706',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f59e0b'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f59e0b18'; (e.currentTarget as HTMLButtonElement).style.color = '#d97706' }}
                              >
                                <FileSignature size={9} />
                                <span>บันทึกเข้าพบ</span>
                              </button>
                            )}

                            {/* Mobile move selector */}
                            <div className="mt-2 block md:hidden">
                              <select
                                value={mapStatusToColumn(quotation.status)}
                                onChange={(e) => moveQuotationStatus(quotation.id, e.target.value)}
                                className="w-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                              >
                                {columnsToRender.map(c => (
                                  <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {pendingCardIds.has(quotation.id) && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                            <svg className="animate-spin h-6 w-6 text-brand-red" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        )}
                        </div>
                      )
                    })
                  ) : (
                    <div
                      className="min-h-[160px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all"
                      style={{
                        borderColor: isHovered ? col.accent + '80' : '#e5e7eb',
                        backgroundColor: isHovered ? col.accent + '08' : 'transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                        style={{ backgroundColor: col.accent + '18' }}
                      >
                        <ArrowRight size={14} style={{ color: col.accent + '80' }} />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">
                        {isHovered ? 'วางที่นี่' : 'ว่างเปล่า'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        </div>
      </div>
      {/* ── Modals: Pipeline Transitions ── */}
      {pendingTransition?.type === 'quotation' && (
        <QuotationTransitionModal
          quotation={pendingTransition.quotation}
          onConfirm={(qtNumber) => {
            executeMove(pendingTransition.id, pendingTransition.nextDbStatus, { quotationNumber: qtNumber });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
      {pendingTransition?.type === 'po' && (
        <POTransitionModal
          quotation={pendingTransition.quotation}
          isClosedStatus={false}
          onConfirm={(data) => {
            executeMove(pendingTransition.id, data.subStatus, { 
              poNumber: data.poNumber, 
              poDate: data.poDate,
              jobType: data.jobType
            });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
      {pendingTransition?.type === 'closed' && (
        <POTransitionModal
          quotation={pendingTransition.quotation}
          isClosedStatus={true}
          onConfirm={(data) => {
            executeMove(pendingTransition.id, 'เปิดบิลแล้ว', { 
              poNumber: data.poNumber, 
              poDate: data.poDate,
              jobType: data.jobType
            });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
      {pendingTransition?.type === 'appointment' && (
        <AppointmentTransitionModal
          quotation={pendingTransition.quotation}
          onConfirm={(data) => {
            executeMove(pendingTransition.id, pendingTransition.nextDbStatus, { 
              appointmentDate: data.appointmentDate, 
              appointmentNote: data.appointmentNote 
            });
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  )
}

function QuotationTransitionModal({ quotation, onConfirm, onCancel }: { quotation: any, onConfirm: (qt: string) => void, onCancel: () => void }) {
  const [qtNumber, setQtNumber] = useState(quotation.quotationNumber || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <FileText className="text-brand-red" size={20} />
            สร้างใบเสนอราคา
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <AlertCircle size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">บริษัทลูกค้า</p>
            <p className="text-sm font-black text-gray-800">{quotation.company?.companyName || 'ไม่ระบุชื่อบริษัท'}</p>
            {quotation.subject && <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><Sparkles size={12} className="text-amber-500"/> {quotation.subject}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
              เลขที่ใบเสนอราคา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={qtNumber}
              onChange={(e) => setQtNumber(e.target.value)}
              placeholder="เช่น QT69-001..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-all uppercase tracking-widest"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm(qtNumber)}
            disabled={!qtNumber.trim()}
            className="px-4 py-2 text-xs font-black text-white bg-brand-red hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all uppercase tracking-widest shadow-md shadow-red-500/20"
          >
            ยืนยันการย้าย
          </button>
        </div>
      </div>
    </div>
  )
}

function POTransitionModal({ quotation, isClosedStatus = false, onConfirm, onCancel }: { 
  quotation: any, 
  isClosedStatus?: boolean,
  onConfirm: (data: { poNumber: string, poDate: string, subStatus: string, jobType: string, paymentMethod?: string }) => void, 
  onCancel: () => void 
}) {
  const [poNumber, setPoNumber] = useState(quotation.poNumber || '')
  
  // Format existing date or use today
  const defaultDate = quotation.poDate 
    ? new Date(quotation.poDate).toISOString().slice(0, 10) 
    : new Date().toISOString().slice(0, 10)
  
  const [poDate, setPoDate] = useState(defaultDate)
  const [subStatus, setSubStatus] = useState('รอจัดทำ PO')
  const [jobType, setJobType] = useState<string>(JOB_TYPES[0])
  const [paymentMethod, setPaymentMethod] = useState<string>('เครดิต 30 วัน')

  const PO_SUB_STATUSES = [
    'รอจัดทำ PO',
    'PO แล้วรอสินค้า',
    'PO แล้วรอมัดจำ',
    'PO แล้วรอเงินโอน'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <ClipboardCheck className={isClosedStatus ? "text-emerald-600" : "text-violet-600"} size={20} />
            {isClosedStatus ? 'ยืนยันปิดการขาย' : 'ข้อมูล Purchase Order'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <AlertCircle size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-start gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">บริษัทลูกค้า</p>
              <p className="text-sm font-black text-gray-800">{quotation.company?.companyName || 'ไม่ระบุชื่อบริษัท'}</p>
            </div>
            {quotation.quotationNumber && (
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">เลขที่เสนอราคา</p>
                <p className="text-xs font-black font-mono text-brand-red">{quotation.quotationNumber}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                เลขที่ P/O (ถ้ามี)
              </label>
              <input
                type="text"
                autoFocus
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="ระบุเลขที่ PO..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                วันที่ P/O
              </label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                ประเภทงาน (Sales Type) <span className="text-red-500">*</span>
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              >
                {JOB_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {!isClosedStatus && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                  สถานะย่อย
                </label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                >
                  {PO_SUB_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
              วิธีการชำระเงิน <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['จ่ายแล้ว', 'เครดิต 30 วัน', 'เครดิต 60 วัน', 'เก็บเงินหน้างาน', 'ผ่อนชำระ'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    paymentMethod === method 
                      ? 'bg-brand-red text-white border-brand-red shadow-md shadow-red-200' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-red hover:text-brand-red'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-all uppercase tracking-widest"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm({ poNumber, poDate, subStatus, jobType, paymentMethod })}
            className={`px-4 py-2 text-xs font-black text-white ${isClosedStatus ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/20'} rounded-xl transition-all uppercase tracking-widest shadow-md`}
          >
            {isClosedStatus ? 'บันทึกการปิดการขาย' : 'บันทึก PO'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AppointmentTransitionModal({ quotation, onConfirm, onCancel }: { 
  quotation: any, 
  onConfirm: (data: { appointmentDate: string, appointmentNote: string }) => void, 
  onCancel: () => void 
}) {
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentNote, setAppointmentNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-50 rounded-xl">
            <Calendar size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-gray-900">บันทึกนัดหมายเข้าพบ</h3>
            <p className="text-xs text-gray-400 mt-0.5">{quotation.company?.companyName || 'ไม่ระบุชื่อบริษัท'}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
              วันที่และเวลานัดหมาย *
            </label>
            <input
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
              วัตถุประสงค์การเข้าพบ *
            </label>
            <textarea
              value={appointmentNote}
              onChange={(e) => setAppointmentNote(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none transition-all resize-none"
              placeholder="เช่น นำเสนอสินค้า Inverter Veichi รุ่นใหม่, ติดตามใบเสนอราคา..."
            />
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <CalendarDays size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              ระบบจะสร้างนัดหมายในปฏิทิน /schedule อัตโนมัติ
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all"
          >
            ยกเลิก
          </button>
          <button
            disabled={!appointmentDate || !appointmentNote.trim()}
            onClick={() => onConfirm({ appointmentDate, appointmentNote })}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all"
          >
            ✓ ยืนยันนัดหมาย
          </button>
        </div>
      </div>
    </div>
  )
}
