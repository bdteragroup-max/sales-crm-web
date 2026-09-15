'use client'

import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  HelpCircle,
  Layers,
  ArrowRight,
  Sparkles,
  Database
} from 'lucide-react'
import {
  importMassPerformanceSnapshots,
  PerformanceSnapshot,
  ActiveAdPerformanceItem
} from '@/app/actions/ads-performance'

interface MassUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  campaigns: any[]
  initialAds: ActiveAdPerformanceItem[]
  currentUser: {
    name: string
    role: string
  }
  onImportSuccess: (importedCount: number) => void
}

interface ParsedRow {
  rowNum: number
  level: 'Campaign' | 'AdSet' | 'Ads'
  entityId: string
  entityName?: string
  campaignId?: string
  adSetId?: string
  adId?: string
  spend: number
  messageInbox: number
  reach: number
  impressions: number
  clicks: number
  dataAsOf: string
  notes?: string
  oldSpend?: number
  oldInbox?: number
  oldReach?: number
  status: 'READY' | 'NO_CHANGE' | 'WARNING' | 'ERROR'
  message?: string
}

export default function MassUpdateModal({
  isOpen,
  onClose,
  campaigns,
  initialAds,
  currentUser,
  onImportSuccess
}: MassUpdateModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  if (!isOpen) return null

  // Generate and download XLSX Template with 4 worksheets
  const handleDownloadXlsxTemplate = () => {
    const wb = XLSX.utils.book_new()

    // 1. Campaign Level Sheet
    const campaignData = campaigns.map(c => ({
      'Level': 'Campaign',
      'Entity ID (รหัสเป้าหมาย)': c.campaignId || c.id,
      'Campaign Name (ชื่อแคมเปญ)': c.name,
      'Channel (ช่องทาง)': c.channel?.name || c.channelName || 'Meta Ads',
      'Branch (สาขา)': c.branch?.name || 'ทุกสาขา',
      'Product Group (กลุ่มสินค้า)': c.product?.name || c.productCategory || 'ทุกกลุ่มสินค้า',
      'Amount Spent (ค่าใช้จ่ายสะสม ฿)': 0,
      'Message Inbox (ข้อความสะสม)': 0,
      'Reach (การเข้าถึงสะสม)': 0,
      'Impressions (การมองเห็นสะสม)': 0,
      'Clicks (จำนวนคลิกสะสม)': 0,
      'Data as of (วัน-เวลาดึงข้อมูล YYYY-MM-DD HH:mm)': new Date().toISOString().slice(0, 16).replace('T', ' '),
      'Notes (หมายเหตุ)': ''
    }))
    const wsCampaign = XLSX.utils.json_to_sheet(campaignData)
    XLSX.utils.book_append_sheet(wb, wsCampaign, 'Campaign Level')

    // 2. Ad Set Level Sheet
    const adSetMap = new Map<string, any>()
    initialAds.forEach(a => {
      if (a.adSetId && !adSetMap.has(a.adSetId)) {
        adSetMap.set(a.adSetId, {
          'Level': 'AdSet',
          'Entity ID (รหัสเป้าหมาย)': a.adSetId,
          'Campaign ID (รหัสแคมเปญ)': a.campaignId,
          'Ad Set Name (ชื่อชุดโฆษณา)': a.adSetName,
          'Amount Spent (ค่าใช้จ่ายสะสม ฿)': 0,
          'Message Inbox (ข้อความสะสม)': 0,
          'Reach (การเข้าถึงสะสม)': 0,
          'Impressions (การมองเห็นสะสม)': 0,
          'Clicks (จำนวนคลิกสะสม)': 0,
          'Data as of (วัน-เวลาดึงข้อมูล YYYY-MM-DD HH:mm)': new Date().toISOString().slice(0, 16).replace('T', ' '),
          'Notes (หมายเหตุ)': ''
        })
      }
    })
    const wsAdSet = XLSX.utils.json_to_sheet(Array.from(adSetMap.values()))
    XLSX.utils.book_append_sheet(wb, wsAdSet, 'Ad Set Level')

    // 3. Ads Level Sheet
    const adsData = initialAds.map(a => ({
      'Level': 'Ads',
      'Entity ID (รหัสโฆษณา)': a.adId,
      'Campaign ID (รหัสแคมเปญ)': a.campaignId,
      'Ad Set ID (รหัสชุดโฆษณา)': a.adSetId,
      'Ad Name (ชื่อโฆษณา)': a.adName,
      'Creative File (ชื่อชิ้นงานสื่อ)': a.creativeFile || '',
      'Creative Version (เวอร์ชัน)': a.creativeVersion || 'V1',
      'Amount Spent (ค่าใช้จ่ายสะสม ฿)': a.spend || 0,
      'Message Inbox (ข้อความสะสม)': a.messageInbox || 0,
      'Reach (การเข้าถึงสะสม)': a.reach || 0,
      'Impressions (การมองเห็นสะสม)': a.impressions || 0,
      'Clicks (จำนวนคลิกสะสม)': a.clicks || 0,
      'Data as of (วัน-เวลาดึงข้อมูล YYYY-MM-DD HH:mm)': new Date().toISOString().slice(0, 16).replace('T', ' '),
      'Notes (หมายเหตุ)': ''
    }))
    const wsAds = XLSX.utils.json_to_sheet(adsData)
    XLSX.utils.book_append_sheet(wb, wsAds, 'Ads Level')

    // 4. Instructions Sheet
    const instructions = [
      { 'หัวข้อ (Topic)': '1. รูปแบบตัวเลขสะสม', 'คำอธิบาย (Description)': 'ตัวเลขทุกช่อง (ค่าใช้จ่าย, ข้อความ, เข้าถึง, มองเห็น, คลิก) ให้กรอกเป็นตัวเลขสะสมล่าสุด ณ เวลาที่ดึงข้อมูล' },
      { 'หัวข้อ (Topic)': '2. คอลัมน์ที่ห้ามแก้ไข', 'คำอธิบาย (Description)': 'ห้ามแก้ไข Level, Entity ID, Campaign ID และ Ad Set ID เพื่อให้ระบบจับคู่ข้อมูลได้ถูกต้อง' },
      { 'หัวข้อ (Topic)': '3. รูปแบบวัน-เวลา', 'คำอธิบาย (Description)': 'ให้กรอก Data as of ในรูปแบบ YYYY-MM-DD HH:mm เช่น 2026-08-31 16:30' },
      { 'หัวข้อ (Topic)': '4. การอัปเดตหลายแท็บ', 'คำอธิบาย (Description)': 'คุณสามารถเลือกลบแถวที่ไม่ต้องการอัปเดต หรือกรอกเฉพาะรายการที่มีการเปลี่ยนแปลงได้' }
    ]
    const wsInstructions = XLSX.utils.json_to_sheet(instructions)
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

    XLSX.writeFile(wb, `Ads_Performance_Mass_Template_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Generate and download CSV Template
  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Level',
      'Entity ID',
      'Entity Name',
      'Campaign ID',
      'Ad Set ID',
      'Amount Spent',
      'Message Inbox',
      'Reach',
      'Impressions',
      'Clicks',
      'Data as of',
      'Notes'
    ]

    const rows = initialAds.map(a => [
      'Ads',
      `"${a.adId}"`,
      `"${(a.adName || '').replace(/"/g, '""')}"`,
      `"${a.campaignId}"`,
      `"${a.adSetId || ''}"`,
      a.spend || 0,
      a.messageInbox || 0,
      a.reach || 0,
      a.impressions || 0,
      a.clicks || 0,
      `"${new Date().toISOString().slice(0, 16).replace('T', ' ')}"`,
      '""'
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ads_Performance_Template_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Parse uploaded file
  const handleFileUpload = async (file: File) => {
    setSelectedFile(file)
    setParsing(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setParsedRows([])

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      const allRows: ParsedRow[] = []
      let rowCounter = 1

      // Helper map of existing ads and campaigns
      const adMap = new Map<string, ActiveAdPerformanceItem>()
      initialAds.forEach(a => adMap.set(a.adId, a))

      const campMap = new Map<string, any>()
      campaigns.forEach(c => campMap.set(c.campaignId || c.id, c))

      // Iterate sheets
      for (const sheetName of wb.SheetNames) {
        if (sheetName.toLowerCase().includes('instruction')) continue

        const ws = wb.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        for (const raw of rawJson) {
          const levelVal = String(raw['Level'] || raw['level'] || '').trim().toLowerCase()
          let effectiveLevel: 'Campaign' | 'AdSet' | 'Ads' = 'Ads'
          if (levelVal.includes('camp')) effectiveLevel = 'Campaign'
          else if (levelVal.includes('set')) effectiveLevel = 'AdSet'

          // Extract ID
          const rawId = String(
            raw['Entity ID (รหัสเป้าหมาย)'] ||
            raw['Entity ID (รหัสโฆษณา)'] ||
            raw['Entity ID'] ||
            raw['entityId'] ||
            raw['Ad ID'] ||
            raw['Campaign ID'] ||
            ''
          ).trim()

          const entityName = String(
            raw['Entity Name'] ||
            raw['Campaign Name (ชื่อแคมเปญ)'] ||
            raw['Ad Set Name (ชื่อชุดโฆษณา)'] ||
            raw['Ad Name (ชื่อโฆษณา)'] ||
            raw['Ad Name'] ||
            ''
          ).trim()

          let campId = String(raw['Campaign ID (รหัสแคมเปญ)'] || raw['Campaign ID'] || raw['campaignId'] || '').trim()
          let adSetId = String(raw['Ad Set ID (รหัสชุดโฆษณา)'] || raw['Ad Set ID'] || raw['adSetId'] || '').trim()

          const spend = Number(raw['Amount Spent (ค่าใช้จ่ายสะสม ฿)'] ?? raw['Amount Spent'] ?? raw['spend'] ?? 0)
          const inbox = Number(raw['Message Inbox (ข้อความสะสม)'] ?? raw['Message Inbox'] ?? raw['messageInbox'] ?? 0)
          const reach = Number(raw['Reach (การเข้าถึงสะสม)'] ?? raw['Reach'] ?? raw['reach'] ?? 0)
          const imp = Number(raw['Impressions (การมองเห็นสะสม)'] ?? raw['Impressions'] ?? raw['impressions'] ?? 0)
          const clicks = Number(raw['Clicks (จำนวนคลิกสะสม)'] ?? raw['Clicks'] ?? raw['clicks'] ?? 0)
          const dataAsOf = String(raw['Data as of (วัน-เวลาดึงข้อมูล YYYY-MM-DD HH:mm)'] ?? raw['Data as of'] ?? raw['dataAsOf'] ?? '').trim()
          const notes = String(raw['Notes (หมายเหตุ)'] ?? raw['Notes'] ?? raw['notes'] ?? '').trim()

          let status: 'READY' | 'NO_CHANGE' | 'WARNING' | 'ERROR' = 'READY'
          let message = ''

          let oldSpend = 0
          let oldInbox = 0
          let oldReach = 0

          if (!rawId) {
            status = 'ERROR'
            message = 'ไม่พบ Entity ID'
          } else {
            // Validate existence
            if (effectiveLevel === 'Ads') {
              const matchedAd = adMap.get(rawId)
              if (!matchedAd) {
                status = 'ERROR'
                message = `ไม่พบรหัสโฆษณา ${rawId} ในระบบ`
              } else {
                campId = campId || matchedAd.campaignId
                adSetId = adSetId || matchedAd.adSetId
                oldSpend = matchedAd.spend || 0
                oldInbox = matchedAd.messageInbox || 0
                oldReach = matchedAd.reach || 0

                if (spend === oldSpend && inbox === oldInbox && reach === oldReach) {
                  status = 'NO_CHANGE'
                  message = 'ตัวเลขตรงกับข้อมูลล่าสุดเดิม'
                } else if (spend < oldSpend || inbox < oldInbox || reach < oldReach) {
                  status = 'WARNING'
                  message = 'ตัวเลขบางค่าน้อยกว่าค่าก่อนหน้า (ลดลง)'
                } else {
                  status = 'READY'
                  message = 'พร้อมบันทึก (ตัวเลขใหม่/เพิ่มขึ้น)'
                }
              }
            } else if (effectiveLevel === 'Campaign') {
              const matchedCamp = campMap.get(rawId)
              if (!matchedCamp) {
                status = 'ERROR'
                message = `ไม่พบรหัสแคมเปญ ${rawId} ในระบบ`
              } else {
                campId = rawId
                status = 'READY'
                message = 'พร้อมบันทึกระดับแคมเปญ'
              }
            } else {
              // AdSet
              if (!campId) {
                status = 'ERROR'
                message = 'ขาด Campaign ID สำหรับ Ad Set'
              } else {
                status = 'READY'
                message = 'พร้อมบันทึกระดับ Ad Set'
              }
            }
          }

          if (isNaN(spend) || isNaN(inbox) || isNaN(reach) || isNaN(imp) || isNaN(clicks)) {
            status = 'ERROR'
            message = 'รูปแบบตัวเลขไม่ถูกต้อง'
          }

          allRows.push({
            rowNum: rowCounter++,
            level: effectiveLevel,
            entityId: rawId,
            entityName: entityName || rawId,
            campaignId: campId,
            adSetId: adSetId || undefined,
            adId: effectiveLevel === 'Ads' ? rawId : undefined,
            spend: isNaN(spend) ? 0 : spend,
            messageInbox: isNaN(inbox) ? 0 : inbox,
            reach: isNaN(reach) ? 0 : reach,
            impressions: isNaN(imp) ? 0 : imp,
            clicks: isNaN(clicks) ? 0 : clicks,
            dataAsOf: dataAsOf || new Date().toISOString(),
            notes,
            oldSpend,
            oldInbox,
            oldReach,
            status,
            message
          })
        }
      }

      setParsedRows(allRows)
      if (allRows.length === 0) {
        setErrorMessage('ไม่พบแถวข้อมูลในไฟล์ที่เลือก กรุณาตรวจสอบว่ามีข้อมูลในชีท')
      }
    } catch (err: any) {
      console.error('Error parsing file:', err)
      setErrorMessage(err.message || 'ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ .xlsx หรือ .csv ตามเทมเพลต')
    } finally {
      setParsing(false)
    }
  }

  // Summary counts
  const summary = {
    total: parsedRows.length,
    ready: parsedRows.filter(r => r.status === 'READY').length,
    noChange: parsedRows.filter(r => r.status === 'NO_CHANGE').length,
    warning: parsedRows.filter(r => r.status === 'WARNING').length,
    error: parsedRows.filter(r => r.status === 'ERROR').length
  }

  // Download error report CSV
  const handleDownloadErrorReport = () => {
    const errorRows = parsedRows.filter(r => r.status === 'ERROR')
    if (errorRows.length === 0) return

    const headers = ['Row Number', 'Level', 'Entity ID', 'Entity Name', 'Campaign ID', 'Error Reason']
    const lines = errorRows.map(r => [
      r.rowNum,
      r.level,
      `"${r.entityId}"`,
      `"${(r.entityName || '').replace(/"/g, '""')}"`,
      `"${r.campaignId || ''}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...lines.map(l => l.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ads_Import_Errors_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Confirm and save mass import
  const handleConfirmImport = async () => {
    const importableRows = parsedRows.filter(r => r.status === 'READY' || r.status === 'WARNING')
    if (importableRows.length === 0) {
      setErrorMessage('ไม่มีรายการที่พร้อมนำเข้าข้อมูล (โปรดแก้ไขรายการที่มีข้อผิดพลาด)')
      return
    }

    setImporting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payloadRows = importableRows.map(r => ({
        level: r.level,
        campaignId: r.campaignId || '',
        adSetId: r.adSetId,
        adId: r.adId,
        entityId: r.entityId,
        spend: r.spend,
        messageInbox: r.messageInbox,
        reach: r.reach,
        impressions: r.impressions,
        clicks: r.clicks,
        dataAsOf: r.dataAsOf,
        notes: r.notes
      }))

      const res = await importMassPerformanceSnapshots({
        filename: selectedFile?.name || 'mass_upload.xlsx',
        fileType: selectedFile?.name.endsWith('.csv') ? 'CSV' : 'XLSX',
        rows: payloadRows,
        skipDuplicateCheck: true
      })

      if (res.success) {
        setSuccessMessage(`นำเข้าข้อมูลสำเร็จ ${res.importedCount} รายการ! (รหัสงาน: ${res.jobId})`)
        onImportSuccess(res.importedCount)
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setErrorMessage(`นำเข้าข้อมูลไม่สำเร็จ: พบข้อผิดพลาด ${res.errorCount} รายการ`)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">
                  อัปเดตผลลัพธ์จำนวนมาก (Mass Update Results)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  .xlsx / .csv
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ดาวน์โหลดไฟล์แม่แบบ กรอกตัวเลขสะสม แล้วอัปโหลดเพื่อบันทึก Snapshot พร้อมกันทุกระดับ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Template Download Bar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  ไฟล์แม่แบบสำหรับการอัปเดต (Template Files)
                </h4>
                <p className="text-[11px] text-slate-500">
                  มีข้อมูลรหัสแคมเปญ ชุดโฆษณา และโฆษณาที่เปิดใช้งานอยู่เตรียมไว้ให้แล้ว
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadXlsxTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด Excel (.xlsx 4 แท็บ)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* File Dropzone */}
          <div
            onDragOver={e => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0])
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver
              ? 'border-rose-500 bg-rose-50/50'
              : 'border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-white'
              }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0])
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm">
                คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
              </div>
              <p className="text-xs text-slate-500">
                รองรับไฟล์ Microsoft Excel (.xlsx, .xls) หรือ CSV (.csv)
              </p>
              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 shadow-2xs">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-500" />
                  <span>{selectedFile.name}</span>
                  <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Parsing State */}
          {parsing && (
            <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
              <span className="text-xs font-medium">กำลังอ่านและตรวจสอบความถูกต้องของข้อมูล...</span>
            </div>
          )}

          {/* Validation Summary Badges */}
          {parsedRows.length > 0 && !parsing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  สรุปผลการตรวจสอบไฟล์ ({summary.total} รายการ)
                </h4>

                {summary.error > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-semibold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดรายงานข้อผิดพลาด (CSV)</span>
                  </button>
                )}
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">พร้อมบันทึก (Ready)</span>
                    <span className="text-lg font-black text-emerald-900 font-mono">{summary.ready}</span>
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">ไม่เปลี่ยนแปลง (Same)</span>
                    <span className="text-lg font-black text-slate-800 font-mono">{summary.noChange}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">แจ้งเตือน (ลดลง)</span>
                    <span className="text-lg font-black text-amber-900 font-mono">{summary.warning}</span>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">ข้อผิดพลาด (Errors)</span>
                    <span className="text-lg font-black text-rose-900 font-mono">{summary.error}</span>
                  </div>
                </div>
              </div>

              {/* Preview Diff Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5">แถว</th>
                        <th className="px-3 py-2.5">ระดับ</th>
                        <th className="px-3 py-2.5">รหัสเป้าหมาย</th>
                        <th className="px-3 py-2.5">ชื่อรายการ</th>
                        <th className="px-3 py-2.5 text-right">ค่าใช้จ่ายสะสม (เดิม → ใหม่)</th>
                        <th className="px-3 py-2.5 text-right">ข้อความ (เดิม → ใหม่)</th>
                        <th className="px-3 py-2.5 text-center">สถานะ</th>
                        <th className="px-3 py-2.5">คำอธิบาย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map(r => (
                        <tr
                          key={r.rowNum}
                          className={`hover:bg-slate-50 ${r.status === 'ERROR'
                            ? 'bg-rose-50/30'
                            : r.status === 'WARNING'
                              ? 'bg-amber-50/20'
                              : 'bg-white'
                            }`}
                        >
                          <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{r.rowNum}</td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {r.level}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{r.entityId}</td>
                          <td className="px-3 py-2 text-slate-700 truncate max-w-[180px]" title={r.entityName}>
                            {r.entityName}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className="text-slate-400">฿{(r.oldSpend || 0).toLocaleString()}</span>
                            <span className="mx-1 text-slate-300">→</span>
                            <span className="font-bold text-slate-900">฿{r.spend.toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className="text-slate-400">{(r.oldInbox || 0).toLocaleString()}</span>
                            <span className="mx-1 text-slate-300">→</span>
                            <span className="font-bold text-blue-600">{r.messageInbox.toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.status === 'READY' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                พร้อมบันทึก
                              </span>
                            )}
                            {r.status === 'NO_CHANGE' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                ไม่เปลี่ยน
                              </span>
                            )}
                            {r.status === 'WARNING' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                ตัวเลขลดลง
                              </span>
                            )}
                            {r.status === 'ERROR' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                ข้อผิดพลาด
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-500 truncate max-w-[200px]" title={r.message}>
                            {r.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>
                พร้อมนำเข้า <strong className="text-emerald-700 font-bold">{summary.ready + summary.warning}</strong> จากทั้งหมด {summary.total} รายการ
              </span>
            ) : (
              <span>โปรดอัปโหลดไฟล์เพื่อเริ่มการตรวจสอบ</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              ปิด (Close)
            </button>
            <button
              type="button"
              disabled={importing || (summary.ready + summary.warning === 0)}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังนำเข้าข้อมูล...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>ยืนยันนำเข้าข้อมูล ({summary.ready + summary.warning} รายการ)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
