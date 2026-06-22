'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { forwardLeadToSales } from '@/app/actions/marketing'
import { ArrowLeft, UserSquare, Calendar, Phone, Package, FileText, Send, AlertTriangle, Loader2, CheckCircle2, Search } from 'lucide-react'

export default function LeadDetailClient({ lead, salesReps }: { lead: any, salesReps: any[] }) {
  const router = useRouter()
  const [selectedRep, setSelectedRep] = useState('')
  const [isForwarding, setIsForwarding] = useState(false)
  const [error, setError] = useState('')
  
  // Combobox state
  const [searchRepQuery, setSearchRepQuery] = useState('')
  const [showRepDropdown, setShowRepDropdown] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const repDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (repDropdownRef.current && !repDropdownRef.current.contains(event.target as Node)) {
        setShowRepDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleForwardClick = async () => {
    if (!selectedRep) {
      setError('กรุณาเลือกฝ่ายขายที่ต้องการส่งต่อ')
      return
    }
    
    setError('')
    setIsForwarding(true)

    const result = await forwardLeadToSales(lead.id, selectedRep)
    setIsForwarding(false)
    
    if (result.success) {
      setSuccessMsg('ส่งต่อให้ฝ่ายขายเรียบร้อยแล้ว!')
      router.refresh()
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setError(result.error || 'Failed to forward lead')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/marketing')}
          className="px-4 py-2 rounded-xl text-xs font-black text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all flex items-center gap-2 uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> กลับหน้ารวม
        </button>

        {lead.isForwarded && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black flex items-center gap-2 border border-emerald-100 shadow-sm">
            <CheckCircle2 size={16} className="text-emerald-500" />
            ส่งต่อให้ฝ่ายขายแล้ว
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2 shadow-sm transition-all">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm transition-all">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
              <UserSquare size={20} className="text-brand-red" />
              ข้อมูลลูกค้า (Lead Information)
            </h2>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ชื่อลูกค้า / บริษัท</p>
                  <p className="text-base font-bold text-gray-900">{lead.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">เบอร์โทรศัพท์</p>
                  <p className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    {lead.phoneNumber || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">สินค้าที่สนใจ</p>
                  <p className="text-sm font-bold text-gray-800">{lead.productOfInterest || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ประเภทสินค้า</p>
                  {lead.productType ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-gray-700 text-xs rounded-lg font-bold border border-gray-200">
                      <Package size={12} />
                      {lead.productType}
                    </span>
                  ) : (
                    <p className="text-sm font-bold text-gray-800">-</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <FileText size={12} /> เนื้อหาการสนทนา
                </p>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[100px] whitespace-pre-wrap text-sm text-gray-700">
                  {lead.conversationContent || <span className="text-gray-400 italic">ไม่มีข้อมูลการสนทนา</span>}
                </div>
              </div>

              {lead.telesales && lead.telesales.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Phone size={16} className="text-brand-red" /> บันทึกการโทร (Telesales)
                  </h3>
                  <div className="space-y-4">
                    {lead.telesales.map((call: any) => (
                      <div key={call.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                         <div className="flex justify-between items-start mb-3">
                            <div>
                               <p className="text-xs font-bold text-gray-800">
                                  {new Date(call.createdAt).toLocaleString('th-TH')}
                               </p>
                               <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <UserSquare size={10} /> โดย {call.user?.fullName || 'ไม่ระบุ'}
                               </p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                               {call.callOutcome || call.result || 'ไม่มีผลลัพธ์'}
                            </span>
                         </div>
                         <div className="space-y-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {call.conversationSummary && (
                              <div>
                                <span className="text-xs font-bold text-gray-900 block mb-0.5">สรุปการสนทนา:</span>
                                <p className="text-xs">{call.conversationSummary}</p>
                              </div>
                            )}
                            {call.needsOrProblems && (
                              <div>
                                <span className="text-xs font-bold text-gray-900 block mb-0.5">ความต้องการ/ปัญหา:</span>
                                <p className="text-xs">{call.needsOrProblems}</p>
                              </div>
                            )}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-xs font-bold text-gray-500 mt-6">
                <p className="flex items-center gap-1.5">
                  <UserSquare size={14} /> ผู้สร้าง: {lead.createdBy?.fullName || 'ไม่ระบุ'}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar size={14} /> วันที่สร้าง: {new Date(lead.createdAt).toLocaleString('th-TH')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions / Status */}
        <div className="space-y-6">
          {!lead.isForwarded ? (
            <div className="bg-white rounded-2xl shadow-sm border border-brand-red/20 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
              
              <h3 className="text-sm font-black text-brand-red uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                <Send size={16} /> ส่งต่อให้ฝ่ายขาย
              </h3>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">เลือกพนักงานขาย</label>
                  <div className="relative" ref={repDropdownRef}>
                    <input
                      type="text"
                      value={searchRepQuery}
                      onChange={(e) => {
                        setSearchRepQuery(e.target.value)
                        setShowRepDropdown(true)
                        if (e.target.value === '') setSelectedRep('')
                      }}
                      onFocus={() => setShowRepDropdown(true)}
                      placeholder="-- พิมพ์ชื่อเพื่อค้นหา --"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white font-medium text-gray-700 pr-10"
                    />
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

                    {showRepDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        <ul className="py-1">
                          <li
                            onClick={() => {
                              setSelectedRep('')
                              setSearchRepQuery('')
                              setShowRepDropdown(false)
                            }}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-500 italic"
                          >
                            -- เลือกฝ่ายขาย --
                          </li>
                          {salesReps.filter(r => r.fullName.toLowerCase().includes(searchRepQuery.toLowerCase())).map((rep) => (
                            <li
                              key={rep.id}
                              onClick={() => {
                                setSelectedRep(rep.id)
                                setSearchRepQuery(rep.fullName)
                                setShowRepDropdown(false)
                              }}
                              className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-bold text-gray-700 border-t border-gray-50"
                            >
                              {rep.fullName}
                            </li>
                          ))}
                          {searchRepQuery && salesReps.filter(r => r.fullName.toLowerCase().includes(searchRepQuery.toLowerCase())).length === 0 && (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">
                              ไม่พบพนักงานชื่อนี้
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleForwardClick}
                  disabled={isForwarding}
                  className="w-full py-3 rounded-xl text-xs font-black text-white bg-brand-red hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-200 active:scale-95 disabled:opacity-70 disabled:active:scale-100 uppercase tracking-widest"
                >
                  {isForwarding ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  ยืนยันการส่งต่อ
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 border-b border-gray-100 pb-3">สถานะดีล (Pipeline Status)</h3>
               
               <div className="space-y-4">
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ฝ่ายขายที่ดูแล</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <UserSquare size={14} className="text-brand-red" />
                      {lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'ไม่ระบุ'}
                    </p>
                 </div>
                 
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">สถานะปัจจุบันใน Pipeline</p>
                    <div className="mt-1.5 px-3 py-2 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-sm font-black flex items-center justify-center">
                      {['รอติดตั้ง', 'ปิดการขาย', 'รอส่งมอบ', 'เปิดบิลแล้ว', 'ไม่สำเร็จ', 'ปฏิเสธ'].includes(lead.quotation?.status || '') 
                        ? lead.quotation?.status 
                        : lead.quotation?.status 
                          ? `ส่งใบเสนอราคา (${lead.quotation.status})` 
                          : lead.isContacted 
                            ? 'โทรติดต่อแล้ว' 
                            : lead.isForwarded 
                              ? 'รอฝ่ายขายติดต่อ' 
                              : 'รอพิจารณาส่งต่อ'}
                    </div>
                 </div>

                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ส่งต่อเมื่อ</p>
                    <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                      <Calendar size={12} />
                      {lead.forwardedAt ? new Date(lead.forwardedAt).toLocaleString('th-TH') : '-'}
                    </p>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
