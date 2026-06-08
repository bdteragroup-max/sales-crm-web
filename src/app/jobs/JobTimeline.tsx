"use client"

import { useState, useTransition } from "react"
import { getSteps, getWorkflow, type StepDef } from "@/app/lib/job-workflow"
import { confirmJobStep, rejectJobStep } from "@/app/actions/jobs"
import { XCircle, Edit2 } from "lucide-react"
import { Check, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
type StepLog = {
  step:        string
  completedBy: string
  department:  string
  completedAt: Date
  note?:       string | null
}

type Props = {
  jobId:        string
  jobType:      string
  currentStep:  string
  flowVariant:  string | null
  stepLogs:     StepLog[]
  userName:     string
  userDept:     string   // department ของ user ที่ login อยู่
  userRole?:    string   // role ของ user
  isManager?:   boolean
  jobNumber?:    string
  customerName?: string
  sellerName?:   string
  paymentTasks?: any[]
  installationOrders?: any[]
  repairOrder?: any
}

export default function JobTimeline({
  jobId, jobType, currentStep, flowVariant, stepLogs, userName, userDept, userRole, isManager,
  jobNumber, customerName, sellerName, paymentTasks, installationOrders, repairOrder
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [pendingConfirm, setPendingConfirm]     = useState(false)
  const [noteInput, setNoteInput]               = useState("")
  const [showHistory, setShowHistory]           = useState(false)
  
  // Delivery specific state
  const [deliveryMethod, setDeliveryMethod] = useState<"in-house" | "courier">("in-house")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [courierCompany, setCourierCompany] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingFile, setTrackingFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // PR / PO specific state
  const [prItemsText, setPrItemsText] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [supplierPhone, setSupplierPhone] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [expectedDate, setExpectedDate] = useState("")

  const wf        = getWorkflow(jobType)
  const steps     = getSteps(jobType, flowVariant)
  let currentIdx = steps.findIndex((s) => s.key === currentStep)
  
  // Self-heal logic for legacy or invalid states (like SERVICE_ISSUE)
  if (currentIdx === -1) {
    const firstUnfinished = steps.findIndex(s => !stepLogs.some(l => l.step === s.key))
    currentIdx = firstUnfinished === -1 ? Math.max(0, steps.length - 1) : firstUnfinished
  }
  
  const actualCurrentKey = steps[currentIdx]?.key || currentStep;
  const isFinished = currentIdx === steps.length - 1 && stepLogs.some((l) => l.step === actualCurrentKey)

  // step ที่ active (รอ confirm อยู่)
  const activeStep = isFinished ? null : steps[currentIdx]

  function handleReject(targetStepKey: string) {
    if (!noteInput.trim()) {
      alert("กรุณาระบุหมายเหตุ (สาเหตุที่ตีกลับ) ก่อนกดตีกลับ/แก้ไข");
      return;
    }
    startTransition(async () => {
      await rejectJobStep(jobId, targetStepKey, noteInput, userName);
      setNoteInput("");
      setPendingConfirm(false);
      setShowVariantModal(false);
    });
  }

  // user กด confirm step ปัจจุบัน
  function handleConfirm(variant?: string) {
    if (!activeStep) return
    startTransition(async () => {
      // Validate PR/PO fields
      if (activeStep.key === "sales_pr" && !prItemsText) {
        alert("กรุณาระบุรายการสินค้าที่ต้องการสั่งซื้อ");
        return;
      }
      if (activeStep.key === "purchase_find_supplier" && !supplierName) {
        alert("กรุณาระบุชื่อร้านค้า/Supplier");
        return;
      }
      if (activeStep.key === "purchase_po" && !poNumber) {
        alert("กรุณาระบุเลขที่ PO");
        return;
      }

      const prItems = prItemsText ? [{ text: prItemsText }] : undefined;
      const numTotalAmount = totalAmount ? parseFloat(totalAmount) : undefined;

      await confirmJobStep({
        jobId,
        stepKey:     activeStep.key,
        completedBy: userName,
        department:  userDept,
        note:        noteInput || undefined,
        variant,
        prItems,
        supplierName: supplierName || undefined,
        supplierPhone: supplierPhone || undefined,
        totalAmount: numTotalAmount,
        poNumber: poNumber || undefined,
        expectedDate: expectedDate || undefined,
      })
      setNoteInput("")
      setPendingConfirm(false)
      setShowVariantModal(false)
    })
  }

  async function handleConfirmDelivery() {
    if (!activeStep) return;
    
    if (deliveryMethod === "in-house" && !deliveryDate) {
      alert("กรุณาระบุวันที่จัดส่ง");
      return;
    }
    if (deliveryMethod === "courier" && (!courierCompany || !trackingNumber)) {
      alert("กรุณาระบุบริษัทขนส่งและเลขพัสดุ");
      return;
    }

    let photoUrl = "";
    if (deliveryMethod === "courier" && trackingFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", trackingFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) photoUrl = data.url;
      } catch (err) {
        console.error("Upload failed", err);
        alert("อัปโหลดรูปภาพไม่สำเร็จ");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    startTransition(async () => {
      await confirmJobStep({
        jobId,
        stepKey:     activeStep.key,
        completedBy: userName,
        department:  userDept,
        note:        noteInput || undefined,
        deliveryMethod,
        deliveryDate: deliveryMethod === "in-house" ? deliveryDate : undefined,
        courierCompany: deliveryMethod === "courier" ? courierCompany : undefined,
        trackingNumber: deliveryMethod === "courier" ? trackingNumber : undefined,
        trackingPhotoUrl: photoUrl || undefined,
      })
      setNoteInput("")
      setPendingConfirm(false)
      setShowVariantModal(false)
    })
  }

  // ตรวจว่า user กด confirm step นี้ได้มั้ย
  const normalizedDept = (() => {
    const roleLower = String(userRole || "").toLowerCase().trim()
    const deptLower = String(userDept || "").toLowerCase().trim()
    
    const depts: string[] = []
    
    const isSales = roleLower.includes('sale') || roleLower.includes('ขาย') || roleLower.includes('เซล') || roleLower.includes('marketing') || deptLower.includes('sale') || deptLower.includes('ขาย') || deptLower.includes('เซล') || deptLower.includes('marketing')
    const isAccounting = roleLower.includes('account') || roleLower.includes('บัญชี') || roleLower.includes('finance') || deptLower.includes('account') || deptLower.includes('บัญชี') || deptLower.includes('finance')
    const isService = roleLower.includes('service') || roleLower.includes('ซ่อม') || roleLower.includes('บริการ') || deptLower.includes('service') || deptLower.includes('ซ่อม') || deptLower.includes('บริการ')
    const isPurchase = roleLower.includes('purchase') || roleLower.includes('จัดซื้อ') || deptLower.includes('purchase') || deptLower.includes('จัดซื้อ')
    const isProduction = roleLower.includes('production') || roleLower.includes('ผลิต') || deptLower.includes('production') || deptLower.includes('ผลิต')
    
    const isDeliveryRole = roleLower.includes('delivery') || roleLower.includes('transport') || roleLower.includes('จัดส่ง') || roleLower.includes('ขนส่ง') || roleLower.includes('driver') || roleLower.includes('คนขับ')
    const isStoreRole = roleLower.includes('store') || roleLower.includes('warehouse') || roleLower.includes('สโตร์') || roleLower.includes('คลัง')
    
    if (isDeliveryRole) {
      depts.push("delivery")
    } else if (isStoreRole || deptLower.includes('store') || deptLower.includes('สโตร์') || deptLower.includes('คลัง')) {
      depts.push("store")
    }
    
    if (isSales) depts.push("sales")
    if (isAccounting) depts.push("accounting")
    if (isService) depts.push("service")
    if (isPurchase) depts.push("purchase")
    if (isProduction) depts.push("production")
    
    if (depts.length === 0) depts.push(deptLower)
    return depts
  })()

  // ผู้จัดการสามารถกดยืนยันได้ทุก step หรือพนักงานแผนกนั้นๆ กดยืนยันได้
  const canConfirm = isManager || (activeStep?.department.some(dept => normalizedDept.includes(dept)) ?? false)

  // Message แจ้งเตือนสาเหตุที่กดไม่ได้
  const blockReasonMessage = (() => {
    if (!activeStep) return null;
    
    // Check if any payment task is incomplete
    const hasIncompletePayment = paymentTasks && paymentTasks.length > 0 
      ? paymentTasks.some((pt: any) => pt.status !== 'ตรวจสอบและบันทึกแล้ว')
      : false;

    if (!hasIncompletePayment) return null;

    // Check payment method
    const paymentMethod = paymentTasks?.[0]?.job?.paymentMethod || paymentTasks?.[0]?.paymentMethod || '';
    const isInstallment = paymentMethod === 'ผ่อนชำระ';
    
    if (isInstallment) {
      if (['complete'].includes(activeStep.key)) {
        return `ระงับการดำเนินการชั่วคราว: รอฝ่ายบัญชีตรวจสอบการชำระเงินค่างวดให้ครบถ้วน`;
      }
    } else {
      if (['store_send', 'accounting', 'complete'].includes(activeStep.key)) {
        const status = paymentTasks?.[0]?.status || 'รอดำเนินการ';
        return `ระงับการดำเนินการชั่วคราว: รอฝ่ายบัญชีตรวจสอบการชำระเงิน (สถานะ: ${status})`;
      }
    }
    return null;
  })();

  const isBlocked = !!blockReasonMessage;

  // ── Variant Modal ──
  function VariantModal() {
    if (!wf?.variantQuestion) return null
    
    // Import icons dynamically for rendering
    const { CheckCircle2, XCircle, Wrench, Factory } = require("lucide-react")
    const ICON_MAP: Record<string, any> = { CheckCircle2, XCircle, Wrench, Factory }

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-80">
          <p className="font-medium text-gray-800 mb-4">{wf.variantQuestion.question}</p>
          <div className="flex flex-col gap-2">
            {wf.variantQuestion.options.map((opt) => {
              const Icon = opt.icon ? ICON_MAP[opt.icon] : null;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleConfirm(opt.value)}
                  disabled={isPending}
                  className="text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-brand-red hover:bg-red-50 text-sm transition-colors flex items-center gap-2"
                >
                  {Icon && <Icon size={16} />}
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowVariantModal(false)}
            className="mt-3 text-xs text-gray-400 hover:underline w-full text-center"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      {showVariantModal && <VariantModal />}

      {/* Timeline steps */}
      <div className="relative w-full overflow-x-auto pb-6 scrollbar-hide">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <ol className="flex items-start justify-between min-w-[500px] w-full relative pt-2">
            {steps.map((step, idx) => {
              const log      = stepLogs.find((l) => l.step === step.key)
              const isDone   = !!log
              const isActive = !isDone && idx === currentIdx
              const isFuture = idx > currentIdx && !isDone

              return (
                <li key={step.key} className="flex flex-col items-center relative z-10 flex-1 px-1 group">
                  {/* Connector line to next step */}
                  {idx < steps.length - 1 && (
                    <div 
                      className={`absolute top-[16px] left-[50%] w-full h-[4px] z-[-1] transition-all duration-500 rounded-full
                        ${isDone && currentIdx > idx ? "bg-emerald-400" : "bg-gray-100"}
                      `} 
                    />
                  )}

                  {/* Step node */}
                  <div
                    className={`
                      flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-sm
                      ${isDone   ? "w-8 h-8 rounded-full bg-emerald-500 text-white ring-4 ring-emerald-50 scale-100" : ""}
                      ${isActive ? "w-10 h-10 rounded-full bg-gradient-to-tr from-brand-red to-red-400 text-white ring-4 ring-red-50 scale-110 shadow-red-200 shadow-lg" : ""}
                      ${isFuture ? "w-8 h-8 rounded-full bg-white border-2 border-gray-200 text-gray-400 scale-100" : ""}
                    `}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : isActive ? (
                      <span className="text-sm">{idx + 1}</span>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  
                  {/* Text Label */}
                  <div className="flex flex-col items-center mt-4">
                    <span className={`text-[11px] md:text-[13px] font-bold text-center leading-tight break-words max-w-[90px] transition-colors
                      ${isDone   ? "text-emerald-700" : ""}
                      ${isActive ? "text-gray-900" : ""}
                      ${isFuture ? "text-gray-400" : ""}
                    `}>
                      {step.label}
                    </span>
                    {isDone && log && (
                      <span className="text-[10px] text-gray-500 mt-1.5 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                        {log.completedBy.split(' ')[0]}
                      </span>
                    )}
                    {isActive && blockReasonMessage && (
                      <div className="mt-2 bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-100 max-w-[120px]">
                        <p className="text-[10px] font-bold text-center leading-tight">
                          {blockReasonMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {/* Confirm area */}
      {!isFinished && canConfirm && activeStep && (
        <div className="mt-2 p-6 bg-white rounded-2xl border border-gray-100 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red to-orange-400" />
          
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 tracking-wide uppercase">
                ยืนยัน Step: {activeStep.label}
              </p>
              {activeStep.note && <p className="text-xs text-gray-500 mt-0.5">{activeStep.note}</p>}
            </div>
          </div>

          {activeStep.key === "sales_pr" && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 text-sm shadow-sm">
              <p className="font-bold text-gray-800 mb-3">รายการสินค้าที่ต้องการ (PR)</p>
              <div>
                <textarea value={prItemsText} onChange={e => setPrItemsText(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red min-h-[100px]" placeholder="ระบุชื่อสินค้า, สเปค, จำนวน..." />
              </div>
            </div>
          )}

          {activeStep.key === "purchase_find_supplier" && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 text-sm shadow-sm space-y-3">
              <p className="font-bold text-gray-800 mb-1">ข้อมูลร้านค้า (Supplier)</p>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อร้านค้า / Supplier *</label>
                <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" placeholder="กรอกชื่อร้าน..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">เบอร์ติดต่อร้านค้า</label>
                <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" placeholder="กรอกเบอร์โทร..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ราคารวม (บาท)</label>
                <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" placeholder="0.00" />
              </div>
            </div>
          )}

          {activeStep.key === "sales_acknowledge_po" && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200 text-sm shadow-sm space-y-3">
              <p className="font-bold text-brand-red mb-1">ตรวจสอบและรับทราบ PO</p>
              <p className="text-gray-700">กรุณาตรวจสอบข้อมูลการสั่งซื้อ เมื่อถูกต้องครบถ้วนแล้ว กดยืนยันเพื่อรับทราบ</p>
            </div>
          )}

          {activeStep.key === "purchase_po" && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 text-sm shadow-sm space-y-3">
              <p className="font-bold text-gray-800 mb-1">บันทึก PO</p>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">เลขที่เอกสาร PO *</label>
                <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" placeholder="เช่น PO-6601001" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">วันที่คาดว่าจะได้รับสินค้า</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
              </div>
            </div>
          )}

          {activeStep.key === "delivery" && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 text-sm shadow-sm">
              <p className="font-bold text-gray-800 mb-3">รูปแบบการจัดส่ง</p>
              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                  <input type="radio" name="deliveryMethod" value="in-house" checked={deliveryMethod === "in-house"} onChange={() => setDeliveryMethod("in-house")} className="accent-brand-red w-4 h-4" />
                  จัดส่งเอง (In-house)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                  <input type="radio" name="deliveryMethod" value="courier" checked={deliveryMethod === "courier"} onChange={() => setDeliveryMethod("courier")} className="accent-brand-red w-4 h-4" />
                  บริษัทขนส่ง (Courier)
                </label>
              </div>

              {deliveryMethod === "in-house" && (
                <div className="mb-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">วันที่จัดส่ง *</label>
                  <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                </div>
              )}

              {deliveryMethod === "courier" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">บริษัทขนส่ง *</label>
                    <input type="text" value={courierCompany} onChange={e => setCourierCompany(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" placeholder="เช่น Kerry, J&T, ไปรษณีย์ไทย" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">เลขพัสดุ (Tracking Number) *</label>
                    <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">รูปถ่ายสลิป/ใบเสร็จ (แนบเพื่อเป็นหลักฐาน)</label>
                    <input type="file" accept="image/*" onChange={e => setTrackingFile(e.target.files?.[0] || null)} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-brand-red hover:file:bg-red-100 transition-colors" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="หมายเหตุ (ถ้ามี)..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all focus:bg-white"
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {activeStep.key === "sales_acknowledge_po" && (
                <button
                  disabled={isPending || isBlocked}
                  onClick={() => handleReject("purchase_po")}
                  className="flex-1 bg-white text-gray-700 border border-gray-200 text-sm font-bold px-6 py-3.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5 text-red-500" /> ตีกลับให้จัดซื้อแก้ไข
                </button>
              )}

              <button
                disabled={isPending || isUploading || isBlocked}
                onClick={() => {
                  if (activeStep.key === "delivery") {
                    handleConfirmDelivery();
                    return;
                  }
                  const isVariantStep = wf?.variantQuestion?.askedAtStep === activeStep.key;
                  if (isVariantStep && !flowVariant) {
                    setShowVariantModal(true)
                  } else {
                    handleConfirm()
                  }
                }}
                className="flex-[2] bg-gradient-to-r from-brand-red to-red-600 text-white text-sm font-black uppercase tracking-wider px-6 py-3.5 rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin"/> กำลังอัปโหลดรูป...</>
                ) : isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin"/> กำลังบันทึก...</>
                ) : (
                  <><Check className="w-5 h-5 stroke-[3]"/> ยืนยันข้อมูลในขั้นตอนนี้</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons for Service / Sales */}
      {(normalizedDept.includes("service") || normalizedDept.includes("sales")) && (
        <div className="flex flex-col gap-2 mt-4">
          
          {/* Repair Buttons */}
          {(jobType.includes("ซ่อม") || jobType.includes("เคลม") || jobType.includes("ตรวจ") || jobType.includes("เช็ค") || jobType.includes("ซ่อมบำรุง") || jobType.includes("PM")) && (
            <>
              {normalizedDept.includes("service") && (
                <Link
                  href={`/jobs/${jobId}/manage-repair-order`}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex justify-center items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  จัดการข้อมูลใบรับซ่อม
                </Link>
              )}
              <Link
                href={`/jobs/${jobId}/repair-order`}
                className="w-full bg-brand-red border border-transparent text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all shadow-sm flex justify-center items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                พิมพ์ใบรับซ่อม (PDF)
              </Link>
            </>
          )}

          {/* Installation Buttons */}
          {(jobType.includes("ติดตั้ง") || jobType.includes("ซ่อม")) && (
            <>
              {(jobType.includes("ซ่อม") || jobType.includes("เคลม") || jobType.includes("ตรวจ") || jobType.includes("เช็ค") || jobType.includes("ซ่อมบำรุง") || jobType.includes("PM")) && (
                <div className="w-full h-px bg-gray-100 my-1"></div>
              )}
              {normalizedDept.includes("service") && (
                <Link
                  href={`/jobs/${jobId}/manage-installation-order`}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex justify-center items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  จัดการข้อมูลใบติดตั้ง
                </Link>
              )}
              <Link
                href={`/jobs/${jobId}/installation-order`}
                className="w-full bg-orange-600 border border-transparent text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-all shadow-sm flex justify-center items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                พิมพ์ใบติดตั้ง (PDF)
              </Link>
            </>
          )}
        </div>
      )}

      {/* ไม่มีสิทธิ์ */}
      {!isFinished && !canConfirm && activeStep && (
        <p className="mt-3 text-xs text-gray-400 italic">
          step นี้รอแผนก: {activeStep.department.join(", ")} ยืนยัน
        </p>
      )}

      {/* เสร็จแล้ว */}
      {isFinished && (
        <p className="mt-3 text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Job นี้เสร็จสมบูรณ์แล้ว</p>
      )}

      {/* Service Status Section */}
      {((installationOrders && installationOrders.length > 0) || repairOrder) && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              สถานะงาน Service (อัปเดตล่าสุด)
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {installationOrders?.map((order) => (
              <div key={order.id} className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wide text-orange-600">
                      {order.installationNo}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${order.status === 'Completed' || order.status.includes('เสร็จสิ้น') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {order.status || 'Draft'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 font-medium">ช่างรับผิดชอบ: <span className="font-bold text-gray-700">{order.technician || 'ยังไม่ระบุ'}</span></p>
                  {order.plannedStartDate && (
                    <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                      แผนงาน: <span className="font-bold text-gray-700">{new Date(order.plannedStartDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {repairOrder && (
              <div className="flex justify-between items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wide text-brand-red">
                      {repairOrder.invoiceNo || 'ใบรับซ่อม'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 font-medium">ผู้รับเรื่อง: <span className="font-bold text-gray-700">{repairOrder.forwardedBy || 'ยังไม่ระบุ'}</span></p>
                  {repairOrder.receivedDate && (
                     <p className="text-[10px] text-gray-500 mt-0.5 font-medium">รับเรื่อง: <span className="font-bold text-gray-700">{new Date(repairOrder.receivedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Work History Section */}
      <div className="mt-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-between transition-colors border border-gray-200"
        >
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ดูประวัติการทำงาน (Work History)
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform ${showHistory ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {showHistory && (
          <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-700">ประวัติการทำงานเรียงตามลำดับ</h3>
            </div>
            <div className="p-4 space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
              {stepLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">ยังไม่มีประวัติการทำงาน</p>
              ) : (
                stepLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-red shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">{getSteps(jobType, flowVariant).find(s => s.key === log.step)?.label || log.step}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-700">{log.completedBy}</span> • แผนก {log.department}
                      </p>
                      {log.note && (
                        <p className="text-[10px] text-red-600 mt-1 bg-red-50 px-2 py-1 rounded border border-red-100">
                          หมายเหตุ: {log.note}
                        </p>
                      )}
                      <p className="text-[9px] text-gray-400 mt-1">
                        {new Date(log.completedAt).toLocaleString("th-TH")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
