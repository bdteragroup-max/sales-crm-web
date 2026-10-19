'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Search,
  Filter,
  Users,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  CheckCheck,
  RefreshCw,
  Eye,
  History,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Phone,
  Building,
  MapPin,
  Calendar,
  X,
  ChevronDown,
  BarChart3
} from 'lucide-react'
import {
  generateExcelTemplate,
  generateCsvTemplate,
  validateImportLeads,
  importMarketingLeads,
  generateSummaryReportExcel,
  getImportHistoryLogs,
  ValidatedLeadRow,
  ImportSummaryStats,
  ActiveSalesRep,
  ImportHistoryItem,
} from '@/app/actions/marketing-import'

// ==========================================
// Searchable Sales Rep Dropdown Component
// ==========================================
function SearchableSalesRepSelect({
  salesReps,
  selectedId,
  onSelect,
}: {
  salesReps: ActiveSalesRep[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedRep = useMemo(() => {
    return salesReps.find((r) => r.id === selectedId) || salesReps[0]
  }, [salesReps, selectedId])

  const filteredReps = useMemo(() => {
    if (!search.trim()) return salesReps
    const q = search.toLowerCase().trim()
    return salesReps.filter((rep) => {
      const matchName = rep.fullName.toLowerCase().includes(q)
      const matchNick = rep.nickname?.toLowerCase().includes(q)
      const matchEmp = rep.employeeId?.toLowerCase().includes(q)
      const matchRole = rep.role.toLowerCase().includes(q)
      return matchName || matchNick || matchEmp || matchRole
    })
  }, [salesReps, search])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getInitials = (name: string) => {
    if (!name) return 'S'
    const parts = name.trim().split(/\s+/)
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2)
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition-all min-w-[240px] sm:min-w-[280px] focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-7 h-7 rounded-lg bg-red-100 text-brand-red font-black text-[11px] flex items-center justify-center shrink-0">
            {getInitials(selectedRep?.fullName || '')}
          </div>
          <div className="text-left truncate">
            <div className="font-bold text-slate-900 truncate">
              {selectedRep ? (
                <>
                  {selectedRep.fullName} {selectedRep.nickname ? `(${selectedRep.nickname})` : ''}
                </>
              ) : (
                'เลือกพนักงานขาย...'
              )}
            </div>
            {selectedRep?.role && (
              <div className="text-[10px] text-slate-400 font-normal truncate">
                {selectedRep.employeeId ? `[${selectedRep.employeeId}] ` : ''}{selectedRep.role}
              </div>
            )}
          </div>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่อ, ชื่อเล่น, รหัสพนักงาน..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
              <span>รายชื่อพนักงานขายที่พร้อมรับงาน</span>
              <span className="font-semibold text-slate-600">พบ {filteredReps.length} ท่าน</span>
            </div>
          </div>

          {/* List of Reps */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredReps.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Users size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">ไม่พบพนักงานที่ค้นหา</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ลองพิมพ์คำค้นหาใหม่อีกครั้ง</p>
              </div>
            ) : (
              filteredReps.map((rep) => {
                const isSelected = rep.id === selectedId
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => {
                      onSelect(rep.id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-red-50/70 text-brand-red font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getInitials(rep.fullName)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{rep.fullName}</span>
                          {rep.nickname && (
                            <span className="text-brand-red font-semibold">({rep.nickname})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
                          {rep.employeeId && (
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">
                              {rep.employeeId}
                            </span>
                          )}
                          <span>{rep.role}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-brand-red shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface LeadImportClientProps {
  salesReps: ActiveSalesRep[]
  initialHistory: ImportHistoryItem[]
}

export default function LeadImportClient({ salesReps, initialHistory }: LeadImportClientProps) {
  const router = useRouter()

  // Tab State: 'import' or 'history'
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')

  // Import Process States
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<string>('')
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [isImporting, setIsImporting] = useState<boolean>(false)
  const [isDownloadingReport, setIsDownloadingReport] = useState<boolean>(false)

  // Data States
  const [rows, setRows] = useState<ValidatedLeadRow[]>([])
  const [stats, setStats] = useState<ImportSummaryStats | null>(null)
  const [historyList, setHistoryList] = useState<ImportHistoryItem[]>(initialHistory)
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'DUPLICATE' | 'REVIEW_REQUIRED' | 'INVALID'>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Sales Routing States
  const [routingType, setRoutingType] = useState<'specific_sales' | 'round_robin' | 'unassigned'>('unassigned')
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>(salesReps[0]?.id || '')

  // Match Inspection Modal
  const [inspectRow, setInspectRow] = useState<ValidatedLeadRow | null>(null)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  // Drag & Drop
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  // Copy helper
  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedPhone(text)
    setTimeout(() => setCopiedPhone(null), 2000)
  }

  // Download Templates
  const handleDownloadTemplate = async (type: 'xlsx' | 'csv') => {
    setIsDownloadingTemplate(true)
    try {
      const base64 = type === 'xlsx' ? await generateExcelTemplate() : await generateCsvTemplate()
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const mime = type === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8;'
      const blob = new Blob([byteArray], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'xlsx' ? 'Lead_Import_Template.xlsx' : 'Lead_Import_Template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์เทมเพลตได้', 'error')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  // Parse & Validate File
  const processUploadedFile = async (file: File) => {
    if (!file) return
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV (.csv) เท่านั้น', 'warning')
      return
    }

    setFileName(file.name)
    setFileSize((file.size / 1024).toFixed(1) + ' KB')
    setIsValidating(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      // Convert XLSX sheet objects into guaranteed plain JavaScript objects
      const cleanRows: Record<string, string>[] = []
      for (const row of jsonData as any[]) {
        const plain: Record<string, string> = {}
        for (const [key, val] of Object.entries(row)) {
          if (val !== undefined && val !== null) {
            plain[String(key).trim()] = String(val).trim()
          }
        }
        cleanRows.push(plain)
      }
      const sanitizedPayload = JSON.parse(JSON.stringify(cleanRows))

      // Server-side duplicate detection and validation
      const result = await validateImportLeads(sanitizedPayload)

      if (result.success && result.data && result.stats) {
        setRows(result.data)
        setStats(result.stats)

        Swal.fire({
          title: 'ตรวจสอบข้อมูลสำเร็จ',
          html: `
            <div class="text-left text-sm space-y-1.5 py-2">
              <div class="flex justify-between"><span>จำนวนทั้งหมด:</span> <b>${result.stats.total} รายการ</b></div>
              <div class="flex justify-between text-emerald-600"><span>• ลูกค้าใหม่ (New Leads):</span> <b>${result.stats.newLeads}</b></div>
              <div class="flex justify-between text-amber-600"><span>• พบข้อมูลซ้ำในระบบ:</span> <b>${result.stats.duplicates}</b></div>
              <div class="flex justify-between text-purple-600"><span>• ต้องตรวจสอบเพิ่มเติม:</span> <b>${result.stats.reviewRequired}</b></div>
              ${result.stats.invalid > 0 ? `<div class="flex justify-between text-red-600"><span>• ข้อมูลไม่สมบูรณ์:</span> <b>${result.stats.invalid}</b></div>` : ''}
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'เข้าสู่หน้าตรวจสอบ',
          confirmButtonColor: '#E11D48',
        })
      } else {
        Swal.fire('เกิดข้อผิดพลาด', result.error || 'ไม่สามารถตรวจสอบข้อมูลได้', 'error')
      }
    } catch (err: any) {
      console.error(err)
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์', 'error')
    } finally {
      setIsValidating(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processUploadedFile(file)
    }
    e.target.value = ''
  }

  // Row Action Change
  const handleActionChange = (index: number, newAction: 'CREATE' | 'SKIP' | 'UPDATE_INTEREST') => {
    setRows(prev => {
      const next = [...prev]
      const foundIdx = next.findIndex(r => r.index === index)
      if (foundIdx !== -1) {
        next[foundIdx] = { ...next[foundIdx], action: newAction }
      }
      return next
    })
  }

  // Bulk Actions
  const handleSelectOnlyNew = () => {
    setRows(prev =>
      prev.map(r => ({
        ...r,
        action: r.status === 'NEW' ? 'CREATE' : 'SKIP',
      }))
    )
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'เลือกเฉพาะ New Leads สำเร็จ',
      showConfirmButton: false,
      timer: 2000,
    })
  }

  const handleSelectNewAndReview = () => {
    setRows(prev =>
      prev.map(r => ({
        ...r,
        action: r.status === 'NEW' || r.status === 'REVIEW_REQUIRED' ? 'CREATE' : 'SKIP',
      }))
    )
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'เลือก New Leads และรายการตรวจสอบผ่านแล้ว',
      showConfirmButton: false,
      timer: 2000,
    })
  }

  const handleSkipAllDuplicates = () => {
    setRows(prev =>
      prev.map(r => (r.status === 'DUPLICATE' ? { ...r, action: 'SKIP' } : r))
    )
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'ตั้งค่าข้ามข้อมูลซ้ำทั้งหมดเรียบร้อย',
      showConfirmButton: false,
      timer: 2000,
    })
  }

  // Download Summary Report Excel
  const handleDownloadSummaryReport = async () => {
    if (!stats || rows.length === 0) return
    setIsDownloadingReport(true)
    try {
      const cleanRows = JSON.parse(JSON.stringify(rows))
      const cleanStats = JSON.parse(JSON.stringify(stats))
      const base64 = await generateSummaryReportExcel(cleanRows, cleanStats)
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Lead_Import_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างรายงาน Excel ได้', 'error')
    } finally {
      setIsDownloadingReport(false)
    }
  }

  // Confirm Import
  const handleConfirmImport = async () => {
    const itemsToImport = rows.filter(r => r.action === 'CREATE')
    if (itemsToImport.length === 0) {
      Swal.fire('ไม่มีรายการที่เลือก', 'กรุณาเลือกรายการที่ต้องการนำเข้าอย่างน้อย 1 รายการ', 'info')
      return
    }

    let routingLabel = 'ส่งเข้าส่วนกลาง (Unassigned Pool)'
    if (routingType === 'specific_sales') {
      const rep = salesReps.find(s => s.id === selectedSalesRepId)
      routingLabel = `มอบหมายให้เซลส์: ${rep?.fullName || 'ไม่ระบุ'}`
    } else if (routingType === 'round_robin') {
      routingLabel = `สุ่มกระจายงานเท่าๆ กัน (${salesReps.length} ท่าน)`
    }

    const confirmResult = await Swal.fire({
      title: 'ยืนยันการนำเข้าข้อมูล?',
      html: `
        <div class="text-left text-sm py-2 space-y-2">
          <p>คุณกำลังจะนำเข้า <b>${itemsToImport.length} รายการ</b> เข้าสู่ระบบ CRM</p>
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div class="text-xs text-slate-500 font-semibold uppercase">การมอบหมายงาน (Routing)</div>
            <div class="font-bold text-slate-800 mt-0.5">${routingLabel}</div>
          </div>
          <p class="text-xs text-slate-500">* รายการที่ถูกตั้งเป็น 'ข้าม' (${rows.length - itemsToImport.length} รายการ) จะไม่ถูกบันทึกเป็น Lead ใหม่</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันนำเข้าข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#059669', // Emerald
      cancelButtonColor: '#94A3B8',
    })

    if (!confirmResult.isConfirmed) return

    setIsImporting(true)
    try {
      const cleanLeads = JSON.parse(JSON.stringify(rows))
      const res = await importMarketingLeads({
        leads: cleanLeads,
        routingType,
        assignedToId: routingType === 'specific_sales' ? selectedSalesRepId : null,
        salesRepIds: salesReps.map(s => s.id),
        fileName: fileName || 'leads.xlsx',
      })

      if (res.success) {
        await Swal.fire({
          title: 'นำเข้าข้อมูลสำเร็จ!',
          text: `บันทึกข้อมูลลูกค้าใหม่เข้าสู่ CRM สำเร็จ ${res.importedCount} รายการ`,
          icon: 'success',
          confirmButtonColor: '#E11D48',
        })
        router.push('/marketing')
      } else {
        Swal.fire('เกิดข้อผิดพลาด', res.error || 'ไม่สามารถนำเข้าข้อมูลได้', 'error')
      }
    } catch (err: any) {
      console.error(err)
      Swal.fire('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดระหว่างนำเข้าข้อมูล', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  // Refresh History
  const handleRefreshHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const refreshed = await getImportHistoryLogs()
      setHistoryList(refreshed)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Filtered rows for table
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Status Filter
      if (statusFilter !== 'ALL' && row.status !== statusFilter) {
        return false
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = row.customerName?.toLowerCase().includes(q)
        const matchPhone = row.phoneNumber?.includes(q)
        const matchComp = row.companyName?.toLowerCase().includes(q)
        const matchProv = row.province?.toLowerCase().includes(q)
        const matchSource = row.leadSource?.toLowerCase().includes(q)
        const matchProd = row.productOfInterest?.toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchComp && !matchProv && !matchSource && !matchProd) {
          return false
        }
      }
      return true
    })
  }, [rows, statusFilter, searchQuery])

  const selectedCount = rows.filter(r => r.action === 'CREATE').length

  return (
    <div className="min-h-screen bg-slate-50/70 pb-32">
      {/* ── Top App Bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/marketing"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors active:scale-95"
              title="กลับหน้าการตลาด"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-100 text-brand-red text-[11px] font-black tracking-wider uppercase rounded-md">
                  CRM Marketing
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">Duplicate Detection Engine</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                <FileSpreadsheet className="text-brand-red" size={24} />
                นำเข้าและตรวจจับข้อมูลลูกค้าซ้ำ (Lead Import)
              </h1>
            </div>
          </div>

          {/* Symmetrical Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'import'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload size={14} className={activeTab === 'import' ? 'text-brand-red' : ''} />
              นำเข้าและตรวจสอบ
            </button>
            <button
              onClick={() => {
                setActiveTab('history')
                handleRefreshHistory()
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={14} className={activeTab === 'history' ? 'text-brand-red' : ''} />
              ประวัติการนำเข้า ({historyList.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Symmetrical 3-Step Visual Workflow Banner (มองออกว่าใช้งานยังไงทันที) ── */}
      {activeTab === 'import' && (
        <div className="bg-white/90 border-b border-slate-200/80 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  rows.length === 0
                    ? 'bg-red-50/70 border-red-200 text-brand-red shadow-xs'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    rows.length === 0 ? 'bg-brand-red text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {rows.length === 0 ? '1' : <Check size={16} />}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold truncate">1. เตรียมและอัปโหลดไฟล์</div>
                  <div className="text-[11px] opacity-80 truncate">
                    {rows.length === 0 ? 'ดาวน์โหลดเทมเพลตและเลือกไฟล์' : `อัปโหลดแล้ว: ${fileName} (${rows.length} รายการ)`}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  rows.length > 0
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    rows.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  2
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold truncate">2. ตรวจจับข้อมูลซ้ำในระบบ</div>
                  <div className="text-[11px] opacity-80 truncate">
                    {rows.length > 0
                      ? `New Leads: ${stats?.newLeads || 0} | ซ้ำ: ${stats?.duplicates || 0} | ตรวจสอบ: ${stats?.reviewRequired || 0}`
                      : 'ระบบจะเทียบความซ้ำกับ CRM อัตโนมัติ'}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  rows.length > 0 && selectedCount > 0
                    ? 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    rows.length > 0 && selectedCount > 0 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  3
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold truncate">3. มอบหมายและนำเข้า CRM</div>
                  <div className="text-[11px] opacity-80 truncate">
                    {selectedCount > 0 ? `พร้อมนำเข้าสู่ระบบ ${selectedCount} รายการ` : 'เลือกทีมขายและกดยืนยัน'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* ══════════════════════════════════════════════════════
            TAB 1: IMPORT & VALIDATE
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* ── STEP 1 VIEW: Symmetrical 50/50 Dual Cards (แสดงเมื่อยังไม่มีไฟล์) ── */}
            {rows.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Card: 1. เตรียมเทมเพลต (50%) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-100">
                        1
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">เตรียมไฟล์ข้อมูล (Download Templates)</h2>
                        <p className="text-xs text-slate-500">ดาวน์โหลดฟอร์มมาตรฐานที่มีหัวคอลัมน์ถูกต้องพร้อมใช้งาน</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-5">
                      คุณสามารถดาวน์โหลดแบบฟอร์มเปล่าเพื่อนำไปกรอกข้อมูล หรือใช้ไฟล์ที่คุณมีอยู่แล้วได้เลย ระบบจะตรวจจับหัวตารางอัจฉริยะให้อัตโนมัติ
                    </p>

                    {/* Symmetrical Dual Download Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                      <button
                        onClick={() => handleDownloadTemplate('xlsx')}
                        disabled={isDownloadingTemplate}
                        className="flex flex-col items-center justify-center p-4 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-900 rounded-xl text-center transition-all group disabled:opacity-50 active:scale-98"
                      >
                        <FileSpreadsheet size={24} className="text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">Microsoft Excel</span>
                        <span className="text-[10px] text-emerald-700/80 mt-0.5">ไฟล์สกุล .xlsx (แนะนำ)</span>
                      </button>

                      <button
                        onClick={() => handleDownloadTemplate('csv')}
                        disabled={isDownloadingTemplate}
                        className="flex flex-col items-center justify-center p-4 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 text-blue-900 rounded-xl text-center transition-all group disabled:opacity-50 active:scale-98"
                      >
                        <FileText size={24} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">CSV Spreadsheet</span>
                        <span className="text-[10px] text-blue-700/80 mt-0.5">ไฟล์สกุล .csv (UTF-8)</span>
                      </button>
                    </div>
                  </div>

                  {/* Symmetrical Feature Checklist */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-2 text-slate-600">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      ความสามารถของระบบตรวจจับอัตโนมัติ
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>รองรับหัวตาราง <b>ชื่อลูกค้า / ผู้ติดต่อ</b>, <b>ชื่อบริษัท</b>, หรือชื่อบุคคล</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>แปลงเบอร์โทรศัพท์เป็น <b>10 หลักมาตรฐานไทย</b> อัตโนมัติ (ตัดรหัส 066..., 66...)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>เทียบความซ้ำกับทั้งตาราง <b>ลูกค้าเดิม</b> และ <b>Marketing Leads</b> ในระบบ CRM ทันที</span>
                    </div>
                  </div>
                </div>

                {/* Right Card: 2. อัปโหลดและตรวจสอบ (50%) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-black text-sm shrink-0 border border-red-100">
                        2
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">อัปโหลดไฟล์เข้าระบบ (Upload & Analyze)</h2>
                        <p className="text-xs text-slate-500">รองรับไฟล์ Excel (.xlsx, .xls) และ CSV (.csv)</p>
                      </div>
                    </div>
                  </div>

                  {/* Modern Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOver(false)
                      const file = e.dataTransfer.files?.[0]
                      if (file) processUploadedFile(file)
                    }}
                    className={`flex-1 border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all ${
                      isDragOver
                        ? 'border-brand-red bg-red-50/50 scale-[0.99]'
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {isValidating ? (
                        <Loader2 size={30} className="text-brand-red animate-spin" />
                      ) : (
                        <Upload size={30} className="text-brand-red" />
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {isValidating ? 'กำลังตรวจสอบและตรวจจับข้อมูลซ้ำในระบบ CRM...' : 'ลากไฟล์มาวางที่นี่ หรือคลิกปุ่มด้านล่าง'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      ระบบจะวิเคราะห์ความถูกต้องและคัดแยกข้อมูลซ้ำให้อัตโนมัติ โดยไม่กระทบข้อมูลเดิม
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-bold text-slate-600">.XLSX</span>
                      <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-bold text-slate-600">.XLS</span>
                      <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-bold text-slate-600">.CSV</span>
                    </div>

                    <label
                      className={`mt-5 px-6 py-2.5 bg-gradient-to-r from-brand-red to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 ${
                        isValidating ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {isValidating ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      เลือกไฟล์จากคอมพิวเตอร์
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={handleFileInputChange}
                        disabled={isValidating}
                      />
                    </label>
                  </div>

                  <div className="mt-4 text-center text-[11px] text-slate-400">
                    ขนาดไฟล์สูงสุดไม่เกิน 25 MB ต่อการนำเข้า 1 ครั้ง
                  </div>
                </div>
              </div>
            ) : (
              /* ── Symmetrical File Info & Change File Banner (แสดงเมื่ออัปโหลดแล้ว) ── */
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-black shrink-0 border border-red-100">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{fileName}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                        {fileSize}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200">
                        <CheckCircle2 size={12} /> ตรวจสอบแล้ว {rows.length} รายการ
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ประมวลผลและจับคู่กับฐานข้อมูล CRM สำเร็จแล้ว คุณสามารถเลือกรายการที่ต้องการนำเข้าได้ทันที
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer active:scale-95">
                    <RefreshCw size={13} />
                    <span>เลือกไฟล์ใหม่</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={handleFileInputChange}
                      disabled={isValidating}
                    />
                  </label>

                  <button
                    onClick={handleDownloadSummaryReport}
                    disabled={isDownloadingReport}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {isDownloadingReport ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-emerald-600" />}
                    <span>ส่งออกรายงาน (.xlsx)</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 VIEW: Symmetrical 4-Card Summary KPI Grid ── */}
            {stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Leads */}
                  <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md ${
                      statusFilter === 'ALL'
                        ? 'border-slate-900 ring-2 ring-slate-900/15'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-1 bg-slate-400 absolute top-0 left-0 right-0" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">ข้อมูลทั้งหมด</span>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Layers size={16} />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                      {stats.total.toLocaleString()}
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-slate-600 h-full rounded-full w-full" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-between">
                      <span>จำนวนทั้งหมดในไฟล์</span>
                      <span className="font-bold text-slate-700">100%</span>
                    </div>
                  </div>

                  {/* Card 2: New Leads */}
                  <div
                    onClick={() => setStatusFilter('NEW')}
                    className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md ${
                      statusFilter === 'NEW'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/25'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="h-1 bg-emerald-500 absolute top-0 left-0 right-0" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">1. New Leads</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Sparkles size={16} />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                      {stats.newLeads.toLocaleString()}
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.newLeads / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-between">
                      <span>เบอร์ไม่ซ้ำ พร้อมนำเข้า</span>
                      <span className="font-bold text-emerald-700">
                        {stats.total > 0 ? ((stats.newLeads / stats.total) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Duplicates */}
                  <div
                    onClick={() => setStatusFilter('DUPLICATE')}
                    className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md ${
                      statusFilter === 'DUPLICATE'
                        ? 'border-amber-500 ring-2 ring-amber-500/25'
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="h-1 bg-amber-500 absolute top-0 left-0 right-0" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">2. ข้อมูลซ้ำใน CRM</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Copy size={16} />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
                      {stats.duplicates.toLocaleString()}
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.duplicates / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-between">
                      <span>ตรงกับลูกค้าหรือ Lead เดิม</span>
                      <span className="font-bold text-amber-700">
                        {stats.total > 0 ? ((stats.duplicates / stats.total) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Review Required */}
                  <div
                    onClick={() => setStatusFilter('REVIEW_REQUIRED')}
                    className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden group shadow-xs hover:shadow-md ${
                      statusFilter === 'REVIEW_REQUIRED'
                        ? 'border-purple-500 ring-2 ring-purple-500/25'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="h-1 bg-purple-500 absolute top-0 left-0 right-0" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">3. ต้องตรวจสอบ</span>
                      <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <AlertTriangle size={16} />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-600 mt-2">
                      {stats.reviewRequired.toLocaleString()}
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.reviewRequired / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-between">
                      <span>ชื่อใกล้เคียงหรือซ้ำในไฟล์</span>
                      <span className="font-bold text-purple-700">
                        {stats.total > 0 ? ((stats.reviewRequired / stats.total) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Symmetrical Warning Banner if any invalid records */}
                {stats.invalid > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-800">
                    <div className="flex items-center gap-2.5">
                      <XCircle size={18} className="text-red-500 shrink-0" />
                      <span>
                        พบข้อมูลไม่สมบูรณ์ <b>{stats.invalid} รายการ</b> (เนื่องจากเบอร์โทรศัพท์ไม่ครบถ้วนหรือไม่ระบุ) โดยระบบได้ตั้งค่าเป็น <b>"ข้าม (ไม่นำเข้า)"</b> ให้อัตโนมัติ
                      </span>
                    </div>
                    <button
                      onClick={() => setStatusFilter('INVALID')}
                      className="px-3 py-1 bg-white border border-red-300 rounded-lg text-red-700 font-bold hover:bg-red-100/50 transition-colors shrink-0"
                    >
                      ดูรายการ ({stats.invalid})
                    </button>
                  </div>
                )}

                {/* ── STEP 3 SETUP: Symmetrical Sales Routing & Assignment Bar ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">การมอบหมายงานให้ทีมขาย (Lead Routing & Assignment)</h3>
                        <p className="text-xs text-slate-500">เลือกวิธีการส่งต่องานสำหรับ Lead ใหม่ที่กำลังจะนำเข้าสู่ระบบ CRM</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Symmetrical 3-way toggle */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setRoutingType('unassigned')}
                          className={`px-3.5 py-1.5 rounded-lg transition-all ${
                            routingType === 'unassigned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ส่งเข้าส่วนกลาง (Unassigned)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoutingType('specific_sales')}
                          className={`px-3.5 py-1.5 rounded-lg transition-all ${
                            routingType === 'specific_sales' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ระบุพนักงานขาย
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoutingType('round_robin')}
                          className={`px-3.5 py-1.5 rounded-lg transition-all ${
                            routingType === 'round_robin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          สุ่มแบ่งงานเท่าๆ กัน (Round-Robin)
                        </button>
                      </div>

                      {/* Searchable dropdown if specific_sales */}
                      {routingType === 'specific_sales' && (
                        <SearchableSalesRepSelect
                          salesReps={salesReps}
                          selectedId={selectedSalesRepId}
                          onSelect={setSelectedSalesRepId}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Symmetrical Action Shortcuts & Filter Toolbar ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                  {/* Left: Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSelectOnlyNew}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      นำเข้าเฉพาะ New Leads ({stats.newLeads})
                    </button>
                    <button
                      onClick={handleSelectNewAndReview}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      New Leads + รายการตรวจสอบ ({stats.newLeads + stats.reviewRequired})
                    </button>
                    <button
                      onClick={handleSkipAllDuplicates}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <XCircle size={14} className="text-amber-500" />
                      ข้ามรายการซ้ำทั้งหมด
                    </button>
                  </div>

                  {/* Right: Search box */}
                  <div className="relative min-w-[260px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ, เบอร์โทร, บริษัท..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Main Results Data Table Card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Table Tab Status Filters */}
                  <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ทั้งหมด ({rows.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('NEW')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                          statusFilter === 'NEW' ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 size={12} />
                        New Leads ({stats.newLeads})
                      </button>
                      <button
                        onClick={() => setStatusFilter('DUPLICATE')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                          statusFilter === 'DUPLICATE' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        <Copy size={12} />
                        ข้อมูลซ้ำในระบบ ({stats.duplicates})
                      </button>
                      <button
                        onClick={() => setStatusFilter('REVIEW_REQUIRED')}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                          statusFilter === 'REVIEW_REQUIRED' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
                        }`}
                      >
                        <AlertTriangle size={12} />
                        ต้องตรวจสอบ ({stats.reviewRequired})
                      </button>
                      {stats.invalid > 0 && (
                        <button
                          onClick={() => setStatusFilter('INVALID')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            statusFilter === 'INVALID' ? 'bg-red-500 text-white shadow-xs' : 'text-red-700 hover:bg-red-50'
                          }`}
                        >
                          <XCircle size={12} />
                          ไม่สมบูรณ์ ({stats.invalid})
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      แสดง <b className="text-slate-800">{filteredRows.length}</b> จาก <b>{rows.length}</b> รายการ
                    </div>
                  </div>

                  {/* Responsive Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[1250px]">
                      <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3.5 w-12 text-center">#</th>
                          <th className="px-4 py-3.5 w-60">ลูกค้า / ผู้ติดต่อ</th>
                          <th className="px-4 py-3.5 w-44">บริษัท / องค์กร</th>
                          <th className="px-4 py-3.5 w-32">จังหวัด</th>
                          <th className="px-4 py-3.5 w-44">แหล่งที่มา / สินค้า</th>
                          <th className="px-4 py-3.5 w-64">สถานะ & ผลการเทียบระบบ CRM</th>
                          <th className="px-4 py-3.5 w-44 text-center">การดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                              ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row) => (
                            <tr
                              key={row.index}
                              className={`transition-colors ${
                                row.action === 'SKIP'
                                  ? 'bg-slate-50/50 opacity-60'
                                  : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Row Index */}
                              <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">
                                {row.index}
                              </td>

                              {/* Customer Contact */}
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900 text-sm">
                                  {row.customerName || <span className="text-red-500 italic">ไม่ระบุชื่อ</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-slate-600 font-mono font-medium">
                                    {row.phoneNumber || '-'}
                                  </span>
                                  {row.phoneNumber && (
                                    <button
                                      onClick={(e) => handleCopy(row.phoneNumber, e)}
                                      className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                                      title="คัดลอกเบอร์โทร"
                                    >
                                      {copiedPhone === row.phoneNumber ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                    </button>
                                  )}
                                </div>
                                {row.email && (
                                  <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{row.email}</div>
                                )}
                              </td>

                              {/* Company */}
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800 text-xs">
                                  {row.companyName || '-'}
                                </div>
                                {row.taxId && (
                                  <div className="text-[10px] text-slate-400">Tax: {row.taxId}</div>
                                )}
                              </td>

                              {/* Province */}
                              <td className="px-4 py-3 text-xs text-slate-600">
                                {row.province || '-'}
                                {row.district && <div className="text-[11px] text-slate-400">{row.district}</div>}
                              </td>

                              {/* Lead Source & Product */}
                              <td className="px-4 py-3">
                                {row.leadSource ? (
                                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200">
                                    {row.leadSource}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                                {row.productOfInterest && (
                                  <div className="text-xs text-slate-700 font-medium mt-1 truncate max-w-[180px]" title={row.productOfInterest}>
                                    {row.productOfInterest}
                                  </div>
                                )}
                              </td>

                              {/* Status & Diagnostic Details */}
                              <td className="px-4 py-3">
                                {row.status === 'NEW' ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                                      <CheckCircle2 size={13} /> New Lead (ลูกค้าใหม่)
                                    </span>
                                    <div className="text-[11px] text-slate-500 leading-tight">
                                      ไม่พบเบอร์ในระบบ CRM สามารถนำเข้าได้
                                    </div>
                                  </div>
                                ) : row.status === 'DUPLICATE' ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                                        <Copy size={12} /> พบข้อมูลซ้ำ
                                      </span>
                                      <button
                                        onClick={() => setInspectRow(row)}
                                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-0.5"
                                      >
                                        <Eye size={11} /> ดูข้อมูล CRM
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-slate-600 leading-tight truncate max-w-[240px]" title={row.reason}>
                                      ตรงกับ: <b className="text-slate-800">{row.matchedName}</b>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      เซลส์ผู้ดูแล: <b>{row.matchedSalesRep}</b> | สถานะ: {row.matchedCustomerStatus}
                                    </div>
                                  </div>
                                ) : row.status === 'REVIEW_REQUIRED' ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-800 text-xs font-bold rounded-lg border border-purple-200">
                                        <AlertTriangle size={12} /> ต้องตรวจสอบ
                                      </span>
                                      {row.matchedName && (
                                        <button
                                          onClick={() => setInspectRow(row)}
                                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-0.5"
                                        >
                                          <Eye size={11} /> เทียบข้อมูล
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-purple-900 leading-tight max-w-[240px]">
                                      {row.reason}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                                      <XCircle size={12} /> ข้อมูลไม่สมบูรณ์
                                    </span>
                                    <div className="text-[10px] text-red-600 leading-tight">
                                      {row.errorReason || row.reason}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Action Selector */}
                              <td className="px-4 py-3 text-center">
                                <select
                                  value={row.action}
                                  disabled={row.status === 'INVALID'}
                                  onChange={(e) => handleActionChange(row.index, e.target.value as any)}
                                  className={`text-xs font-bold rounded-xl border px-3 py-2 w-full transition-all cursor-pointer ${
                                    row.action === 'CREATE'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {row.status === 'INVALID' ? (
                                    <option value="SKIP">ข้าม (ข้อมูลไม่ถูกต้อง)</option>
                                  ) : row.status === 'NEW' ? (
                                    <>
                                      <option value="CREATE">✓ สร้าง Lead ใหม่</option>
                                      <option value="SKIP">✕ ข้าม (ไม่นำเข้า)</option>
                                    </>
                                  ) : row.status === 'DUPLICATE' ? (
                                    <>
                                      <option value="SKIP">✕ ข้าม (ซ้ำในระบบ - แนะนำ)</option>
                                      <option value="CREATE">⚠ สร้างทับซ้อน (Lead ใหม่)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="CREATE">✓ ยืนยันเป็น Lead ใหม่</option>
                                      <option value="SKIP">✕ ข้าม (ไม่นำเข้า)</option>
                                    </>
                                  )}
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: IMPORT HISTORY LOG
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <History size={18} className="text-brand-red" />
                    ประวัติการนำเข้าไฟล์ลูกค้า (Import History Log)
                  </h2>
                  <p className="text-xs text-slate-500">
                    บันทึกการนำเข้าไฟล์ วันที่ เวลา ผู้ดำเนินการ และจำนวนรายการที่ประมวลผล
                  </p>
                </div>

                <button
                  onClick={handleRefreshHistory}
                  disabled={isLoadingHistory}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 self-start sm:self-auto"
                >
                  <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
                  รีเฟรชประวัติ
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <History size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-600">ยังไม่มีประวัติการนำเข้าไฟล์</p>
                  <p className="text-xs text-slate-400 mt-1">
                    เมื่อคุณนำเข้าไฟล์รายชื่อลูกค้า ระบบจะบันทึกประวัติและสรุปผลไว้ที่นี่
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[900px]">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5">วันที่ & เวลา</th>
                        <th className="px-4 py-3.5">ชื่อไฟล์</th>
                        <th className="px-4 py-3.5">ผู้ดำเนินการ</th>
                        <th className="px-4 py-3.5 text-center">ทั้งหมด</th>
                        <th className="px-4 py-3.5 text-center text-emerald-700">Lead ใหม่</th>
                        <th className="px-4 py-3.5 text-center text-amber-700">ซ้ำในระบบ</th>
                        <th className="px-4 py-3.5 text-center text-purple-700">ตรวจสอบ</th>
                        <th className="px-4 py-3.5">การมอบหมายงาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {historyList.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {new Date(log.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <FileSpreadsheet size={15} className="text-slate-400" />
                              {log.fileName}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-800">{log.createdByUserName}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                            {log.totalRecords.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-600">
                            {log.importedCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-amber-600">
                            {log.duplicateCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-purple-600">
                            {log.reviewCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5">
                            {log.routingType === 'specific_sales' ? (
                              <span className="text-slate-700 font-medium">
                                มอบหมาย: {log.assignedUserName || 'ระบุเซลส์'}
                              </span>
                            ) : log.routingType === 'round_robin' ? (
                              <span className="text-blue-700 font-medium">สุ่มกระจายงาน (Round-Robin)</span>
                            ) : (
                              <span className="text-slate-500">ส่วนกลาง (Unassigned)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Symmetrical Match Inspection Side-by-Side Modal (50/50 Dual Card) ── */}
      {inspectRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    inspectRow.status === 'DUPLICATE' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {inspectRow.status === 'DUPLICATE' ? <Copy size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    เปรียบเทียบข้อมูลที่ตรวจพบ (CRM Match Comparison)
                  </h3>
                  <p className="text-xs text-slate-500">แถวที่ {inspectRow.index} จากไฟล์ที่อัปโหลด</p>
                </div>
              </div>
              <button
                onClick={() => setInspectRow(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Symmetrical Side-by-Side Grid */}
            <div className="p-6 space-y-4">
              {/* Diagnosis Alert */}
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  inspectRow.status === 'DUPLICATE'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-purple-50 border-purple-200 text-purple-900'
                }`}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} /> เหตุผลที่ตรวจพบ:
                </div>
                {inspectRow.reason}
              </div>

              {/* Symmetrical 50/50 Dual Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Left: Uploaded Data (50%) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs flex flex-col justify-between">
                  <div className="font-black text-slate-700 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                    ข้อมูลจากไฟล์อัปโหลด (Uploaded Data)
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400">ชื่อลูกค้า:</span>
                      <div className="font-bold text-slate-900">{inspectRow.customerName || '-'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                      <div className="font-bold text-slate-900 font-mono">{inspectRow.phoneNumber || '-'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">ชื่อบริษัท:</span>
                      <div className="font-semibold text-slate-800">{inspectRow.companyName || '-'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">จังหวัด:</span>
                      <div className="text-slate-700">{inspectRow.province || '-'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">แหล่งที่มา:</span>
                      <div className="text-slate-700">{inspectRow.leadSource || '-'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">สินค้าที่สนใจ:</span>
                      <div className="text-slate-700">{inspectRow.productOfInterest || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Right: CRM Database Match (50%) */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-2.5 text-xs flex flex-col justify-between">
                  <div>
                    <div className="font-black text-emerald-800 uppercase tracking-wider text-[10px] pb-1 border-b border-emerald-200 flex items-center justify-between">
                      <span>ข้อมูลในระบบ CRM (Existing Record)</span>
                      <span className="px-1.5 py-0.5 bg-emerald-200/60 rounded text-[9px] font-bold">
                        {inspectRow.matchedType === 'CUSTOMER' ? 'ลูกค้าเดิม' : inspectRow.matchedType === 'LEAD' ? 'Lead เดิม' : 'ซ้ำในไฟล์'}
                      </span>
                    </div>
                    <div className="space-y-2 mt-2.5">
                      <div>
                        <span className="text-slate-400">ชื่อในระบบ CRM:</span>
                        <div className="font-bold text-emerald-950">{inspectRow.matchedName || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">เบอร์โทรในระบบ:</span>
                        <div className="font-bold text-emerald-950 font-mono">{inspectRow.matchedPhone || '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">เซลส์ผู้ดูแลปัจจุบัน:</span>
                        <div className="font-bold text-slate-900">
                          {inspectRow.matchedSalesRep || 'ยังไม่มีผู้ดูแล'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">สถานะลูกค้าใน CRM:</span>
                        <div className="font-semibold text-slate-800">
                          {inspectRow.matchedCustomerStatus || 'ไม่ระบุสถานะ'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  handleActionChange(inspectRow.index, 'SKIP')
                  setInspectRow(null)
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95"
              >
                ✕ ข้ามรายการนี้ (ไม่นำเข้า)
              </button>

              <button
                onClick={() => {
                  handleActionChange(inspectRow.index, 'CREATE')
                  setInspectRow(null)
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>ยืนยันนำเข้าเป็น Lead ใหม่</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Import Confirmation Bar (Symmetrical & Modern Dock) ── */}
      {rows.length > 0 && activeTab === 'import' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-6 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0">
                {selectedCount}
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">รายการที่เลือกนำเข้าสู่ CRM</div>
                <div className="text-sm font-bold text-slate-900">
                  {selectedCount} รายการ <span className="text-slate-400 font-normal">จากทั้งหมด {rows.length} รายการ</span>
                </div>
              </div>

              {routingType === 'specific_sales' && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 ml-2">
                  <UserCheck size={14} className="text-brand-red" />
                  <span>
                    เซลส์ผู้ดูแล: <b className="text-slate-900">{salesReps.find(r => r.id === selectedSalesRepId)?.fullName || 'ไม่ระบุ'}</b>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmImport}
                disabled={isImporting || selectedCount === 0}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>กำลังนำเข้าข้อมูลสู่ CRM...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>ยืนยันการนำเข้าข้อมูล ({selectedCount} รายการ)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
