'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateQuotationStatus } from '@/app/actions/pipeline'
import { 
  GitCommit, 
  Sparkles, 
  Clock, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  Filter, 
  Building2, 
  User2, 
  Search, 
  FileSignature, 
  AlertCircle, 
  Edit3, 
  PlusCircle,
  EyeOff
} from 'lucide-react'

interface PipelineClientPageProps {
  initialQuotations: any[]
  teamMembers: any[]
  userRole?: string
  currentUserId?: string
}

const COLUMNS = [
  { id: 'ความสนใจ', label: 'ความสนใจ', subLabel: 'Interest / Target', color: 'border-t-sky-500 text-sky-500 bg-sky-500/5 hover:bg-sky-500/[0.08]' },
  { id: 'นัดหมาย', label: 'นัดหมาย', subLabel: 'Appt Scheduled', color: 'border-t-amber-500 text-amber-500 bg-amber-500/5 hover:bg-amber-500/[0.08]' },
  { id: 'เสนอราคา', label: 'เสนอราคา', subLabel: 'In Negotiation', color: 'border-t-brand-red text-brand-red bg-red-500/5 hover:bg-red-500/[0.08]' },
  { id: 'เปิดบิลแล้ว', label: 'ปิดการขาย', subLabel: 'Closed Won', color: 'border-t-emerald-500 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/[0.08]' }
]

export default function PipelineClientPage({ initialQuotations, teamMembers, userRole, currentUserId }: PipelineClientPageProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [quotations, setQuotations] = useState<any[]>(initialQuotations)
  
  // Drag states
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
  
  // Filter states
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showLostDeals, setShowLostDeals] = useState<boolean>(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const isManager = userRole === 'ผู้จัดการ'

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Dynamic Column List
  const columnsToRender = [...COLUMNS]
  if (showLostDeals) {
    columnsToRender.push({
      id: 'ปฏิเสธ/ยกเลิก',
      label: 'ไม่สำเร็จ / ยกเลิก',
      subLabel: 'Lost / Cancelled',
      color: 'border-t-gray-400 text-gray-500 bg-gray-500/5 hover:bg-gray-500/[0.08]'
    })
  }

  // ── Helper: Map Quotation Database Status to Kanban Column ID ──
  const mapStatusToColumn = (status: string): string => {
    if (!status || status === 'Pending') return 'ความสนใจ'
    
    // True Lost / Rejected — only pure reject statuses, NOT ยกเลิก-Revise
    if (status.startsWith('ปฏิเสธ') || (status.startsWith('ยกเลิก') && status !== 'ยกเลิก-Revise')) {
      return 'ปฏิเสธ/ยกเลิก'
    }
    // Won / Billing stages — เปิดบิลแล้ว, all PO variants, and รอจัดทำ PO
    if (
      status === 'เปิดบิลแล้ว' ||
      status === 'รอจัดทำ PO'  ||
      status.startsWith('PO')
    ) {
      return 'เปิดบิลแล้ว'
    }
    // Active quotation stages
    if (status === 'เสนอราคา' || status === 'ยกเลิก-Revise') {
      return 'เสนอราคา'
    }
    // Appointment / Evaluation stages
    if (status === 'นัดหมาย' || status === 'รอใบประเมินราคา') {
      return 'นัดหมาย'
    }
    
    return 'ความสนใจ' // Fallback for unknown / draft statuses
  }

  // ── Helper: Map Kanban Column ID to Primary Database Status string ──
  const mapColumnToDbStatus = (columnId: string): string => {
    if (columnId === 'เปิดบิลแล้ว') return 'เปิดบิลแล้ว'
    if (columnId === 'เสนอราคา') return 'เสนอราคา'
    if (columnId === 'นัดหมาย') return 'นัดหมาย'
    if (columnId === 'ปฏิเสธ/ยกเลิก') return 'ปฏิเสธ-อื่นๆ'
    return 'ความสนใจ'
  }

  // ── Common Move Quotation Logic ──
  const moveQuotationStatus = async (id: string, targetColumnId: string) => {
    const quotationToMove = quotations.find(q => q.id === id)
    if (!quotationToMove) return

    const currentColumn = mapStatusToColumn(quotationToMove.status)
    if (currentColumn === targetColumnId) return // Dropped on the same column

    // Optimistic UI update: change locally for instant drag feedback
    const oldQuotations = [...quotations]
    const nextDbStatus = mapColumnToDbStatus(targetColumnId)
    
    setQuotations(prev => 
      prev.map(q => q.id === id ? { ...q, status: nextDbStatus, updatedAt: new Date().toISOString() } : q)
    )

    // Call background Server Action to update database
    startTransition(async () => {
      try {
        const response = await updateQuotationStatus(id, nextDbStatus)
        if (response.success) {
          triggerToast(`ย้ายสถานะดีลสำเร็จ! 🎉`, 'success')
          router.refresh()
        } else {
          // Revert state if error
          setQuotations(oldQuotations)
          triggerToast(response.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error')
        }
      } catch (err) {
        console.error(err)
        setQuotations(oldQuotations)
        triggerToast('เกิดข้อผิดพลาดทางเทคนิคในการย้ายดีล', 'error')
      }
    })
  }

  // ── Drag and Drop Handlers ──
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDraggedOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedOverColumn !== columnId) {
      setDraggedOverColumn(columnId)
    }
  }

  const handleDragLeave = () => {
    setDraggedOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    setDraggedOverColumn(null)
    
    const id = e.dataTransfer.getData('text/plain') || draggingId
    if (!id) return

    await moveQuotationStatus(id, targetColumnId)
  }

  // ── Filtering Logic ──
  const filteredQuotations = quotations.filter(q => {
    // 1. Search filter (Company name, quotation number, or contact name)
    const matchesSearch = 
      !searchTerm ||
      q.company?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.contact?.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject?.toLowerCase().includes(searchTerm.toLowerCase())

    // 2. Salesperson filter (for managers)
    const matchesSalesperson = 
      !selectedSalespersonId || 
      q.salespersonId === selectedSalespersonId

    // 3. Exclude/Include truly Lost and Cancelled deals (ยกเลิก-Revise is NOT a lost deal)
    const isLost = q.status?.startsWith('ปฏิเสธ') || 
      (q.status?.startsWith('ยกเลิก') && q.status !== 'ยกเลิก-Revise')
    const matchesLostStatus = showLostDeals ? true : !isLost

    return matchesSearch && matchesSalesperson && matchesLostStatus
  })

  // ── Calculate column totals ──
  const getColumnData = (columnId: string) => {
    const list = filteredQuotations.filter(q => mapStatusToColumn(q.status) === columnId)
    const totalValue = list.reduce((sum, q) => sum + (Number(q.actualClosingAmount) || Number(q.totalAmountBeforeVat) || 0), 0)
    return { list, totalValue }
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      
      {/* ── Top Floating Toast Alert ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl border text-xs font-black shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header Bar ── */}
      <header className="shrink-0 h-20 border-b border-gray-100 px-8 flex items-center justify-between bg-white relative">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-red-200">
            <GitCommit size={20} className="text-white rotate-90" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              {isManager ? 'ท่อดีลฝ่ายขาย (Kanban Board)' : 'ท่อดีลของฉัน (My Pipeline)'}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Interactive Sales Pipeline
            </p>
          </div>
        </div>

        {/* Quick action: Create quotation */}
        <button
          onClick={() => router.push('/sales')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
        >
          <PlusCircle size={14} />
          <span>สร้างใบเสนอราคา</span>
        </button>
      </header>

      {/* ── Executive Value Summary Banner ── */}
      <div className={`shrink-0 grid ${showLostDeals ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'} border-b border-gray-100 bg-slate-50/50`}>
        {columnsToRender.map(col => {
          const { list, totalValue } = getColumnData(col.id)
          // Determine color for bullet point
          let bulletColor = '#6b7280' // default gray for lost
          if (col.id === 'ความสนใจ') bulletColor = '#0ea5e9'
          else if (col.id === 'นัดหมาย') bulletColor = '#f59e0b'
          else if (col.id === 'เสนอราคา') bulletColor = '#DC2626'
          else if (col.id === 'เปิดบิลแล้ว') bulletColor = '#10b981'

          return (
            <div key={col.id} className="flex flex-col px-6 py-4 border-r border-gray-100 last:border-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ color: bulletColor }} />
                <span>{col.label}</span>
                <span className="text-[8px] bg-white border border-gray-200 text-gray-400 px-1.5 py-0.2 rounded-full font-bold">
                  {list.length}
                </span>
              </p>
              <p className="text-sm md:text-base font-black text-gray-800 font-mono mt-1">
                ฿{totalValue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Filter & Search Section ── */}
      <div className="shrink-0 px-8 py-4 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาบริษัท, เลขที่ QT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8.5 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red placeholder-gray-300 transition-all"
          />
        </div>

        {/* Filters Wrapper */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Salesperson Selector (Manager only) */}
          {isManager && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Filter size={11} />
                <span>ผู้ดูแลดีล:</span>
              </span>
              <select
                value={selectedSalespersonId}
                onChange={(e) => setSelectedSalespersonId(e.target.value)}
                className="text-xs font-bold border border-gray-200 rounded-xl px-3.5 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              >
                <option value="">ทีมงานทั้งหมด (Everyone)</option>
                {teamMembers.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} {member.id === currentUserId ? '(ฉัน)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Lost Deals */}
          <button
            onClick={() => setShowLostDeals(!showLostDeals)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              showLostDeals
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
            }`}
          >
            <EyeOff size={12} />
            <span>{showLostDeals ? 'ซ่อนดีลพลาด/ยกเลิก' : 'แสดงดีลพลาด/ยกเลิก'}</span>
          </button>
        </div>
      </div>

      {/* ── Kanban Grid Board ── */}
      <div className="flex-1 overflow-x-auto bg-slate-50/50 p-6 custom-scrollbar">
        <div className={`h-full flex gap-5 ${showLostDeals ? 'min-w-[1250px]' : 'min-w-[1000px]'}`}>
          
          {columnsToRender.map(col => {
            const { list } = getColumnData(col.id)
            const isHovered = draggedOverColumn === col.id

            return (
              <div 
                key={col.id} 
                className={`flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${
                  isHovered ? 'ring-2 ring-brand-red/20 border-brand-red/30 scale-[1.01]' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`p-4 border-t-4 border-b border-gray-50 flex items-center justify-between ${col.color}`}>
                  <div>
                    <h3 className="text-xs font-black tracking-tight uppercase flex items-center gap-1.5">
                      <span>{col.label}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/70 border border-gray-200/50 rounded text-gray-500">
                        {list.length}
                      </span>
                    </h3>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{col.subLabel}</p>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                  {list.length > 0 ? (
                    list.map((quotation: any) => {
                      const isLost = quotation.status?.startsWith('ปฏิเสธ') || quotation.status?.startsWith('ยกเลิก')
                      
                      return (
                        <div
                          key={quotation.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, quotation.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-xl border border-gray-150 p-4 shadow-sm hover:shadow-md hover:border-gray-300/80 cursor-grab active:cursor-grabbing transition-all select-none relative group ${
                            draggingId === quotation.id ? 'opacity-40 border-dashed border-gray-300' : ''
                          } ${isLost ? 'bg-gray-50/50 border-gray-200' : ''}`}
                        >
                          {/* Card Header: Company Name */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-black text-gray-900 tracking-tight leading-snug group-hover:text-brand-red transition-colors line-clamp-1">
                              {quotation.company?.companyName || 'ไม่ระบุบริษัท'}
                            </h4>
                            
                            {/* Edit Action Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/sales?editId=${quotation.id}`) }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-brand-red hover:bg-gray-100 rounded-lg transition-all"
                              title="แก้ไขใบเสนอราคา"
                            >
                              <Edit3 size={11} />
                            </button>

                          </div>

                          {/* Business type badge */}
                          {quotation.company?.businessType && (
                            <span className="inline-block text-[8px] bg-slate-100 text-slate-500 border border-slate-200/50 px-1.5 py-0.2 rounded font-bold mt-1">
                              {quotation.company.businessType}
                            </span>
                          )}

                          {/* Product subject */}
                          {quotation.subject && (
                            <p className="text-[10px] font-bold text-gray-500 mt-2 line-clamp-1 flex items-center gap-1">
                              <Sparkles size={10} className="text-amber-500 shrink-0" />
                              <span>{quotation.subject}</span>
                            </p>
                          )}

                          {/* Quotation Number */}
                          {quotation.quotationNumber && (
                            <p className="text-[9px] font-bold text-gray-400 font-mono mt-1 select-all">
                              QT: {quotation.quotationNumber}
                            </p>
                          )}

                          {/* Divider */}
                          <div className="border-t border-gray-100 my-3" />

                          {/* Card Footer: Amount and Salesperson */}
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ยอดประเมิน</p>
                              <p className="text-xs font-black text-gray-800 font-mono">
                                ฿{(Number(quotation.actualClosingAmount) || Number(quotation.totalAmountBeforeVat) || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                              </p>
                            </div>

                            {/* Representative Badge */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                              <User2 size={10} className="text-gray-400 shrink-0" />
                              <span className="text-[9px] font-bold text-gray-600 truncate max-w-[70px]" title={quotation.salesperson?.fullName}>
                                {quotation.salesperson?.fullName?.split(' ')[0] || '—'}
                              </span>
                            </div>
                          </div>

                          {/* Mobile Touch-friendly Dropdown Selector */}
                          <div className="mt-3.5 block md:hidden">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-1.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest shrink-0">ย้ายสถานะ:</span>
                              <select
                                value={mapStatusToColumn(quotation.status)}
                                onChange={(e) => moveQuotationStatus(quotation.id, e.target.value)}
                                className="w-full text-[10px] font-bold bg-white text-gray-700 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-brand-red/20 focus:border-brand-red transition-all cursor-pointer"
                              >
                                {columnsToRender.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* If the deal is in Lost/Cancelled status, render indicator */}
                          {isLost && (
                            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border border-gray-200">
                              <span>LOST: {quotation.status}</span>
                            </div>
                          )}

                          {/* Integrated Quick Action for Appointment status */}
                          {col.id === 'นัดหมาย' && (
                            <div className="mt-3.5 flex justify-end">
                              <button
                                onClick={() => router.push('/schedule')}
                                className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/20 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                              >
                                <FileSignature size={10} />
                                <span>บันทึกความคืบหน้าเข้าพบ</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="h-full min-h-[180px] border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center p-6 text-center text-gray-300">
                      <Clock size={20} className="stroke-1 mb-1.5" />
                      <p className="text-[9px] font-black uppercase tracking-widest">ว่างเปล่า</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        </div>
      </div>
      
    </div>
  )
}
