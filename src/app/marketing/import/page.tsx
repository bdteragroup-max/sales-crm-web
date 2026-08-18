'use client'

import { useState } from 'react'
import { Upload, Download, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { generateExcelTemplate, validateImportLeads, importMarketingLeads } from '@/app/actions/marketing-import'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

export default function ImportLeadsPage() {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [rows, setRows] = useState<any[]>([])

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    try {
      const base64 = await generateExcelTemplate()
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
      a.download = 'Marketing_Leads_Template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'ไม่สามารถสร้างเทมเพลตได้', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsValidating(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        Swal.fire('Error', 'ไม่พบข้อมูลในไฟล์ Excel', 'error')
        setIsValidating(false)
        return
      }

      // Send to server for validation
      const result = await validateImportLeads(jsonData)
      if (result.success && result.data) {
        setRows(result.data)
      } else {
        Swal.fire('Error', result.error || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล', 'error')
      }
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'ไม่สามารถอ่านไฟล์ Excel ได้', 'error')
    } finally {
      setIsValidating(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleActionChange = (index: number, newAction: string) => {
    const newRows = [...rows]
    newRows[index].action = newAction
    setRows(newRows)
  }

  const handleConfirmImport = async () => {
    const validRows = rows.filter(r => r.action !== 'Skip')
    if (validRows.length === 0) {
      Swal.fire('Info', 'ไม่มีข้อมูลที่ต้องนำเข้า', 'info')
      return
    }

    setIsImporting(true)
    try {
      const idempotencyKey = `import-${Date.now()}`
      const result = await importMarketingLeads(rows, idempotencyKey)
      if (result.success) {
        await Swal.fire('สำเร็จ', `นำเข้าข้อมูลสำเร็จ ${result.importedCount} รายการ`, 'success')
        router.push('/marketing')
      } else {
        Swal.fire('Error', result.error || 'เกิดข้อผิดพลาดในการนำเข้า', 'error')
      }
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'เกิดข้อผิดพลาดระหว่างนำเข้า', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/marketing" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Import Leads (Excel)</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">นำเข้าข้อมูลลูกค้าใหม่ผ่านไฟล์ Excel</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Download size={28} className="text-blue-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">1. โหลดเทมเพลต (Download Template)</h3>
            <p className="text-sm text-gray-500 mt-1">ดาวน์โหลดไฟล์ Excel ต้นแบบเพื่อนำไปกรอกข้อมูล</p>
          </div>
          <button 
            onClick={handleDownloadTemplate} 
            disabled={isDownloading}
            className="mt-2 px-6 py-2 bg-blue-500 text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isDownloading && <Loader2 size={16} className="animate-spin" />}
            Download .xlsx
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center gap-4 relative">
          <div className="w-16 h-16 bg-brand-red/10 rounded-full flex items-center justify-center">
            <Upload size={28} className="text-brand-red" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">2. อัปโหลดข้อมูล (Upload Data)</h3>
            <p className="text-sm text-gray-500 mt-1">อัปโหลดไฟล์ Excel ที่กรอกข้อมูลเรียบร้อยแล้ว</p>
          </div>
          <label className={`mt-2 px-6 py-2 bg-brand-red text-white font-bold rounded-xl text-sm shadow-md hover:bg-red-700 transition-all cursor-pointer flex items-center gap-2 ${isValidating ? 'opacity-50 pointer-events-none' : ''}`}>
            {isValidating ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload .xlsx
            <input 
              type="file" 
              accept=".xlsx" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isValidating}
            />
          </label>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">ผลการตรวจสอบ ({rows.length} รายการ)</h3>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting && <Loader2 size={16} className="animate-spin" />}
              ยืนยันการนำเข้า
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[1200px]">
              <thead className="bg-gray-50/50 text-xs uppercase font-black text-gray-500 tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3">เบอร์โทร</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">บริษัท / เลขผู้เสียภาษี</th>
                  <th className="px-4 py-3">แคมเปญ / แหล่งที่มา</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.action === 'Skip' ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.customerName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.phoneNumber || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.email || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.companyName || '-'}</div>
                      <div className="text-xs text-gray-500">{row.taxId || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.campaignSource || '-'}</div>
                      <div className="text-xs text-gray-500">{row.leadSource || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'New' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                          <CheckCircle size={12} /> ข้อมูลใหม่
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                            <AlertCircle size={12} /> พบข้อมูลซ้ำ
                          </span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[150px]" title={row.matchedName}>
                            ระบบพบข้อมูล: {row.matchedName}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.action}
                        onChange={(e) => handleActionChange(idx, e.target.value)}
                        className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-red/20 outline-none
                          ${row.action === 'Skip' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white border-gray-200'}
                        `}
                      >
                        {row.status === 'New' ? (
                          <>
                            <option value="Create">สร้าง Lead ใหม่</option>
                            <option value="Skip">ข้าม (ไม่นำเข้า)</option>
                          </>
                        ) : (
                          <>
                            <option value="Update Interest">บันทึกความสนใจใหม่</option>
                            <option value="Create">สร้าง Lead ใหม่ (ทับซ้อน)</option>
                            <option value="Skip">ข้าม (ไม่นำเข้า)</option>
                          </>
                        )}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
