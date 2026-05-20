'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateSchedule } from '@/app/actions/schedule'
import { CalendarDays, Building2, User2, ClipboardList, CheckCircle2, ChevronLeft, AlertCircle, Sparkles, FilePlus } from 'lucide-react'

interface VisitReportClientProps {
  schedule: any
  currentUserId: string
  userRole?: string
}

export default function VisitReportClient({ schedule, currentUserId, userRole }: VisitReportClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Form states
  const [visitReport, setVisitReport] = useState(schedule.visitReport || '')
  const [outcome, setOutcome] = useState('medium') // Default neutral — user must actively select high interest
  const [presentationStatus, setPresentationStatus] = useState(schedule.presentationStatus || 'นำเสนอเรียบร้อย')
  const [notes, setNotes] = useState(schedule.notes || '')
  const [wantsQuotation, setWantsQuotation] = useState(false) // User must explicitly opt-in


  // Modal state
  const [showQuotationModal, setShowQuotationModal] = useState(false)

  const formattedDate = mounted
    ? new Date(schedule.date).toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  const formattedTime = mounted
    ? new Date(schedule.date).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' น.'
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitReport.trim()) {
      setError('กรุณากรอกรายงานผลการเข้าพบ')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Only send the fields we are actually changing — passing undefined for other
      // fields in a Prisma update would erase existing data (title, description, date etc.)
      const response = await updateSchedule(schedule.id, {
        status: 'Completed',
        visitReport: visitReport.trim(),
        presentationStatus,
        notes: notes.trim() || null,
      })

      if (response.success) {
        // Open the quotation promotion modal only when the user has the wantsQuotation toggle enabled
        if (wantsQuotation) {
          setShowQuotationModal(true)
        } else {
          router.push('/schedule')
          router.refresh()
        }
      } else {
        setError(response.error || 'ไม่สามารถบันทึกรายงานได้')
      }
    } catch (err: any) {
      console.error(err)
      setError('เกิดข้อผิดพลาดในการบันทึกรายงาน')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuotation = () => {
    setShowQuotationModal(false)
    // Only pass companyId to prefill if the schedule actually has a linked company
    if (schedule.companyId) {
      router.push(`/sales?prefill=true&companyId=${schedule.companyId}`)
    } else {
      // No company linked — open sales page without prefill
      router.push('/sales')
    }
  }

  const handleSkipQuotation = () => {
    setShowQuotationModal(false)
    router.push('/schedule')
    router.refresh()
  }


  return (
    <div className="max-w-4xl mx-auto px-4 py-6 relative">
      
      {/* ── Header Back Navigation ── */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/schedule')}
          className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-brand-red uppercase tracking-widest transition-colors"
        >
          <ChevronLeft size={16} /> ย้อนกลับไปหน้าตารางงาน
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-red via-red-500 to-amber-500" />
        
        {/* ── Visit Header ── */}
        <div className="p-8 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
                <ClipboardList size={24} />
              </div>
              <div>
                <span className="text-[9px] bg-brand-red/10 text-brand-red border border-brand-red/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                  บันทึกรายงานผลการเข้าพบ
                </span>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mt-1">
                  {schedule.title}
                </h1>
                {schedule.company && (
                  <p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-1.5">
                    <Building2 size={14} className="text-gray-400" />
                    <span>{schedule.company.companyName}</span>
                    {schedule.company.businessType && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                        {schedule.company.businessType}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 flex flex-col items-start md:items-end gap-1 shrink-0 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">กำหนดการนัดหมาย</p>
              <p className="text-xs font-black text-gray-800">{formattedDate}</p>
              <p className="text-[10px] font-bold text-gray-400">{formattedTime}</p>
            </div>
          </div>
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in duration-300">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Metadata Info Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <User2 className="text-gray-400 shrink-0" size={18} />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ผู้รับผิดชอบงาน</p>
                <p className="text-xs font-bold text-gray-800">{schedule.user?.fullName || '—'}</p>
              </div>
            </div>
            {schedule.description && (
              <div className="flex items-start gap-3 border-t md:border-t-0 md:border-l border-gray-200/60 pt-4 md:pt-0 md:pl-6">
                <CalendarDays className="text-gray-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">รายละเอียดนัดหมายเดิม</p>
                  <p className="text-xs font-medium text-gray-600 line-clamp-2 leading-relaxed">{schedule.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
              ส่วนบันทึกผลลัพธ์การเข้าพบ (Results)
            </h3>

            {/* 1. Visit Outcome & Presentation Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  ประเมินความสนใจของลูกค้า *
                </label>
                <select
                  value={outcome}
                  onChange={(e) => {
                    const val = e.target.value
                    setOutcome(val)
                    if (val === 'excellent' || val === 'good') {
                      setWantsQuotation(true)
                    } else {
                      setWantsQuotation(false)
                    }
                  }}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                >
                  <option value="excellent">🔥 สนใจระดับสูง / ต้องการสร้างใบเสนอราคาทันที</option>
                  <option value="good">👍 สนใจ / ขอดูข้อมูลใบเสนอราคาเพื่อพิจารณา</option>
                  <option value="medium">😐 ปานกลาง / ยังไม่พร้อมตัดสินใจ รอการติดตามผล</option>
                  <option value="low">👎 ความสนใจน้อย / ปฏิเสธเสนอราคา</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  สถานะการเจรจา (Presentation Status) *
                </label>
                <select
                  value={presentationStatus}
                  onChange={(e) => setPresentationStatus(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                >
                  <option value="นำเสนอเรียบร้อย">นำเสนอเรียบร้อย</option>
                  <option value="ส่งใบเสนอราคาแล้ว">ส่งใบเสนอราคาแล้ว</option>
                  <option value="ส่งสินค้าตัวอย่าง">ส่งสินค้าตัวอย่าง</option>
                  <option value="รอใบประเมินราคา">รอประเมินราคา</option>
                  <option value="อยู่ระหว่างติดตามงาน">อยู่ระหว่างติดตามงาน</option>
                </select>
              </div>
            </div>

            {/* 2. Visit Report (Textarea) */}
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                รายงานสรุปผลการเข้าพบ (Visit Report Summary) *
              </label>
              <textarea
                value={visitReport}
                onChange={(e) => setVisitReport(e.target.value)}
                placeholder="กรุณากรอกข้อมูลสรุปรายละเอียดการพูดคุยกับลูกค้า, ความต้องการ, ปัญหาที่พบ หรือประเด็นที่เสนอขาย..."
                className="w-full min-h-[160px] text-xs font-medium border border-gray-200 rounded-xl px-4 py-3.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all leading-relaxed placeholder-gray-300"
              />
            </div>

            {/* 3. Follow-up Notes */}
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                บันทึกหมายเหตุเพิ่มเติม / ข้อควรระวัง (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ข้อมูลคูแข่ง, งบประมาณลูกค้า, แบรนด์ที่ใช้อยู่..."
                className="w-full text-xs font-medium border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all placeholder-gray-300"
              />
            </div>

            {/* 4. Glassmorphic Quotation Pre-fill Toggle */}
            <div className="p-4 bg-gradient-to-r from-red-50/40 to-amber-50/40 border border-brand-red/10 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-800 tracking-tight">ระบบแนะนำสร้างใบเสนอราคาอัตโนมัติ</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Automated Quotation Generator</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantsQuotation}
                  onChange={(e) => setWantsQuotation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-red/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
              </label>
            </div>
          </div>

          {/* ── Submit Buttons ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 justify-end">
            <button
              type="button"
              onClick={() => router.push('/schedule')}
              className="px-6 py-3 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-brand-red to-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-red-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{loading ? 'กำลังบันทึก...' : 'บันทึกรายงานการเข้าพบ'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Premium Glassmorphic Recommendation Modal (Quotation Modal) ── */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass backdrop blur */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleSkipQuotation}
          />
          
          <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-white/20 p-8 max-w-md w-full relative z-10 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 mb-6 relative">
              <Sparkles size={28} className="animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              การเข้าพบเป็นไปด้วยดีใช่ไหมครับ?
            </h3>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">
              Want to create a quotation?
            </p>
            
            <p className="text-xs font-bold text-gray-500 mt-4 leading-relaxed max-w-sm">
              เราประเมินว่า <span className="text-brand-red font-black">"{schedule.company?.companyName || 'ลูกค้า'}"</span> มีความสนใจและโอกาสดีลสำเร็จสูงมาก 
              ต้องการสร้างเอกสารใบเสนอราคาที่กรอกข้อมูลบริษัทล่วงหน้าทันทีเลยหรือไม่?
            </p>

            {/* Quick pre-fill info summary badge */}
            <div className="my-5 w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ข้อมูลพรีฟิลล่วงหน้า (Prefill Context)</p>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate">
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  <span>{schedule.company?.companyName || '—'}</span>
                </p>
                {schedule.company?.businessType && (
                  <p className="text-[10px] text-slate-500 pl-4.5 font-medium">ประเภทธุรกิจ: {schedule.company.businessType}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleGenerateQuotation}
                className="w-full py-3.5 bg-gradient-to-r from-brand-red to-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-red-200 transition-all flex items-center justify-center gap-2"
              >
                <FilePlus size={16} />
                <span>สร้างใบเสนอราคาเลย</span>
              </button>
              <button
                onClick={handleSkipQuotation}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                ยังไม่สร้าง, กลับหน้าตารางงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
