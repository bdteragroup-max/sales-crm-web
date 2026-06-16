'use client';
import React, { useState, useEffect } from "react";
import { searchCompanies } from "@/app/actions/sales";
import { extractCompanyCode } from "@/utils/company-utils";
import { JOB_TYPES } from "@/constants/job-types";
import { createClient } from "@/utils/supabase/client";
import { FileText, AlertCircle, Sparkles, ClipboardCheck, Loader2, Calendar, CalendarDays } from "lucide-react";

export function QuotationTransitionModal({ quotation, onConfirm, onCancel }: { quotation: any, onConfirm: (qt: string) => void, onCancel: () => void }) {
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

export function POTransitionModal({ quotation, isClosedStatus = false, onConfirm, onCancel }: { 
  quotation: any, 
  isClosedStatus?: boolean,
  onConfirm: (data: { 
    poNumber: string, 
    poDate: string, 
    subStatus: string, 
    jobType: string, 
    paymentMethod?: string, 
    installments?: any[],
    salesOrderDate?: string,
    deliveryDate?: string,
    creditTerms?: string,
    creditDocsUrl?: string,
    billingRegulations?: string,
    billingDocsUrl?: string,
    percentageTerms?: string,
    paymentDate?: string,
    workName?: string,
    companyId?: string,
    companyCode?: string
  }) => void, 
  onCancel: () => void 
}) {
  const job = quotation.jobs?.[0]
  const [poNumber, setPoNumber] = useState(job?.poNumber || quotation.poNumber || '')
  
  // Format existing date or use today
  const defaultDate = job?.poDate || quotation.poDate 
    ? new Date(job?.poDate || quotation.poDate).toISOString().slice(0, 10) 
    : new Date().toISOString().slice(0, 10)
  
  const [poDate, setPoDate] = useState(defaultDate)
  const [subStatus, setSubStatus] = useState('รอจัดทำ PO')
  const [jobType, setJobType] = useState<string>(job?.jobType || JOB_TYPES[0])
  const [paymentMethod, setPaymentMethod] = useState<string>(job?.paymentMethod || 'เครดิต')
  const [workName, setWorkName] = useState(job?.item || quotation.subject || quotation.productType || '')
  const [companyCode, setCompanyCode] = useState<string>(job?.companyCode || extractCompanyCode(quotation.quotationNumber || ''))
  
  // Sales Confirmation Fields
  const [salesOrderDate, setSalesOrderDate] = useState(job?.salesOrderDate ? new Date(job.salesOrderDate).toISOString().slice(0, 10) : defaultDate)
  const [deliveryDate, setDeliveryDate] = useState(job?.deliveryDate ? new Date(job.deliveryDate).toISOString().slice(0, 10) : '')
  const [creditTerms, setCreditTerms] = useState(job?.creditTerms || '')
  const [creditDocsUrl, setCreditDocsUrl] = useState(job?.creditDocsUrl || '')
  const [billingRegulations, setBillingRegulations] = useState(job?.billingRegulations || '')
  const [percentageTerms, setPercentageTerms] = useState(job?.percentageTerms || '')
  const [billingDocsUrl, setBillingDocsUrl] = useState(job?.billingDocsUrl || '')
  const [paymentDate, setPaymentDate] = useState(job?.paymentDate ? new Date(job.paymentDate).toISOString().slice(0, 10) : '')
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingBilling, setIsUploadingBilling] = useState(false)

  const [companySearchTerm, setCompanySearchTerm] = useState(quotation.company?.companyName || '')
  const [selectedCompanyId, setSelectedCompanyId] = useState(quotation.companyId || null)
  const [companyResults, setCompanyResults] = useState<any[]>([])
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (companySearchTerm.length >= 2 && !selectedCompanyId && companySearchTerm !== quotation.company?.companyName) {
        try {
          const results = await searchCompanies(companySearchTerm)
          setCompanyResults(results)
          setShowCompanyDropdown(true)
        } catch (error) {
          console.error(error)
        }
      } else {
        setCompanyResults([])
        setShowCompanyDropdown(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [companySearchTerm, selectedCompanyId, quotation.company?.companyName])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const supabase = createClient()
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `credit-docs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('uploadsService')
        .getPublicUrl(filePath)

      setCreditDocsUrl(publicUrl)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์')
    } finally {
      setIsUploading(false)
    }
  }

  const handleBillingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingBilling(true)
    const supabase = createClient()
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `billing-docs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('uploadsService')
        .getPublicUrl(filePath)

      setBillingDocsUrl(publicUrl)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์')
    } finally {
      setIsUploadingBilling(false)
    }
  }

  const totalAmount = Number(quotation.actualClosingAmount) || Number(quotation.totalAmountBeforeVat) || 0;

  const calculateDefaultInstallments = (count: number, baseDateStr: string) => {
    const baseDate = new Date(baseDateStr || new Date().toISOString().slice(0, 10));
    return Array.from({ length: count }).map((_, i) => {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const amount = i === count - 1 
        ? totalAmount - Math.floor(totalAmount / count) * (count - 1) 
        : Math.floor(totalAmount / count);
      return {
        installmentNo: i + 1,
        amount: amount.toString(),
        dueDate: d.toISOString().slice(0, 10)
      };
    });
  };

  const [installmentCount, setInstallmentCount] = useState<number>(job?.paymentTasks?.length || 3)
  const [installments, setInstallments] = useState<any[]>(() => {
    if (job?.paymentTasks && job.paymentTasks.length > 0) return job.paymentTasks
    return calculateDefaultInstallments(3, defaultDate)
  })

  const handleInstallmentCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setInstallmentCount(count);
    setInstallments(calculateDefaultInstallments(count, poDate));
  }

  const handleInstallmentChange = (index: number, field: string, value: string) => {
    const newInstallments = [...installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    
    if (field === 'amount') {
      let sumUpToCurrent = 0;
      for (let i = 0; i <= index; i++) {
        sumUpToCurrent += Number(newInstallments[i].amount) || 0;
      }
      const rem = totalAmount - sumUpToCurrent;
      const remCount = installmentCount - 1 - index;
      
      if (remCount > 0) {
        const each = Math.max(0, Math.floor(rem / remCount));
        for (let i = index + 1; i < installmentCount; i++) {
          const amt = (i === installmentCount - 1) ? (rem - each * (remCount - 1)) : each;
          newInstallments[i] = { ...newInstallments[i], amount: Math.max(0, amt).toString() };
        }
      }
    }
    
    setInstallments(newInstallments);
  }

  const PO_SUB_STATUSES = [
    'รอจัดทำ PO',
    'PO แล้วรอสินค้า',
    'PO แล้วรอมัดจำ',
    'PO แล้วรอเงินโอน'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isClosedStatus ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
              <ClipboardCheck size={20} />
            </div>
            {isClosedStatus ? 'ยืนยันปิดการขาย' : 'ข้อมูล Purchase Order'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <AlertCircle size={20} />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-start gap-4">
            <div className="flex-1 relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">บริษัทลูกค้า (Company)</label>
              <input 
                type="text"
                value={companySearchTerm}
                onChange={(e) => {
                  setCompanySearchTerm(e.target.value);
                  setSelectedCompanyId(null);
                  setCompanyResults([]);
                }}
                onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                onFocus={() => { if (companyResults.length > 0) setShowCompanyDropdown(true) }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                placeholder="พิมพ์เพื่อค้นหาบริษัท..."
              />
              {showCompanyDropdown && companyResults.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto divide-y divide-slate-50">
                  {companyResults.map((company, index) => (
                    <li 
                      key={index} 
                      onClick={() => {
                        setSelectedCompanyId(company.id);
                        setCompanySearchTerm(company.companyName);
                        setShowCompanyDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="font-bold text-slate-800 text-sm mb-0.5">{company.companyName}</div>
                    </li>
                  ))}
                </ul>
              )}
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
                บริษัทที่ออกบิล (Company) <span className="text-red-500">*</span>
              </label>
              <select
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              >
                <option value="TG">TG (Tera Group)</option>
                <option value="TE">TE (Tera Electric)</option>
                <option value="TP">TP (Tera Power)</option>
              </select>
            </div>
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

            {jobType !== 'สินค้าฝากขาย' && jobType !== 'งานขาย' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                  ชื่อชิ้นงาน (Work Name)
                </label>
                <input
                  type="text"
                  value={workName}
                  onChange={(e) => setWorkName(e.target.value)}
                  placeholder="เช่น ติดตั้งกล้องวงจรปิด"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                />
              </div>
            )}
            
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
              {['เงินสด', 'จ่ายแล้ว', 'เครดิต', 'เก็บเงินหน้างาน', 'ผ่อนชำระ'].map(method => (
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
            
            {paymentMethod === 'ผ่อนชำระ' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-800 uppercase tracking-widest">จำนวนงวด</label>
                  <select 
                    value={installmentCount} 
                    onChange={handleInstallmentCountChange}
                    className="px-3 py-1.5 border border-orange-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    {[2, 3, 4, 5, 6, 10, 12, 24, 36].map(num => (
                      <option key={num} value={num}>{num} งวด</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3">
                  {installments.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-16 text-xs font-bold text-orange-700">งวดที่ {inst.installmentNo}</div>
                      <input 
                        type="number" 
                        placeholder="จำนวนเงิน" 
                        value={inst.amount}
                        onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder-orange-300"
                      />
                      <input 
                        type="date" 
                        value={inst.dueDate}
                        onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                        className="w-32 px-2 py-1.5 border border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sales Confirmation Fields */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-4">
              <ClipboardCheck size={16} className="text-blue-600" /> ข้อมูลยืนยันการขาย (สำหรับบัญชี)
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                    วันที่สั่งซื้อ (Order Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={salesOrderDate}
                    onChange={(e) => setSalesOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                    วันที่ส่งมอบ (Delivery Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                {(paymentMethod === 'เงินสด' || paymentMethod === 'จ่ายแล้ว') && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      วันที่ชำระเงิน (Payment Date) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {paymentMethod !== 'เงินสด' && paymentMethod !== 'จ่ายแล้ว' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      เงื่อนไขเครดิต (Credit Terms)
                    </label>
                    <input
                      type="text"
                      value={creditTerms}
                      onChange={(e) => setCreditTerms(e.target.value)}
                      placeholder="เช่น 15, 30, 45, 60 วัน..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      เอกสารอนุมัติขอเครดิต (Credit Request Docs)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,image/*"
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                      />
                      {isUploading && <div className="text-xs text-blue-600 flex items-center gap-1 font-bold animate-pulse"><Loader2 size={12} className="animate-spin" /> กำลังอัปโหลด...</div>}
                    </div>
                    {creditDocsUrl && (
                      <a href={creditDocsUrl} target="_blank" rel="noreferrer" className="mt-2 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <FileText size={12} /> ดูไฟล์ที่อัปโหลด
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                      ระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน
                    </label>
                    <textarea
                      value={billingRegulations}
                      onChange={(e) => setBillingRegulations(e.target.value)}
                      rows={2}
                      placeholder="ระบุระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none mb-3"
                    />
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={handleBillingFileUpload}
                        accept=".pdf,image/*"
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                      />
                      {isUploadingBilling && <div className="text-xs text-blue-600 flex items-center gap-1 font-bold animate-pulse"><Loader2 size={12} className="animate-spin" /> กำลังอัปโหลด...</div>}
                    </div>
                    {billingDocsUrl && (
                      <a href={billingDocsUrl} target="_blank" rel="noreferrer" className="mt-2 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <FileText size={12} /> ดูไฟล์ที่อัปโหลด
                      </a>
                    )}
                  </div>

                </>
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1.5">
                  เงื่อนไข % กรณีขอเบิกเงิน (Invoice % Terms)
                </label>
                <textarea
                  value={percentageTerms}
                  onChange={(e) => setPercentageTerms(e.target.value)}
                  rows={2}
                  placeholder="ระบุเงื่อนไขการเบิกเงิน..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-black text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all tracking-wide"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => {
              const formattedInstallments = paymentMethod === 'ผ่อนชำระ' 
                ? installments.map(i => ({ ...i, amount: Number(i.amount) || 0, dueDate: i.dueDate ? new Date(i.dueDate) : new Date() }))
                : undefined;
              onConfirm({ 
                poNumber, poDate, subStatus, jobType, paymentMethod, installments: formattedInstallments,
                salesOrderDate, deliveryDate, creditTerms, creditDocsUrl, billingRegulations, billingDocsUrl, percentageTerms, paymentDate, workName, companyId: selectedCompanyId, companyCode
              })
            }}
            disabled={
              ((jobType !== 'สินค้าฝากขาย' && jobType !== 'งานขาย') && !workName?.trim()) ||
              !salesOrderDate ||
              !deliveryDate ||
              ((paymentMethod === 'เงินสด' || paymentMethod === 'จ่ายแล้ว') && !paymentDate)
            }
            className={`px-6 py-2.5 text-sm font-black text-white ${isClosedStatus ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25'} rounded-xl transition-all tracking-wide shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isClosedStatus ? 'บันทึกการปิดการขาย' : 'บันทึก PO'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppointmentTransitionModal({ quotation, onConfirm, onCancel }: { 
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
