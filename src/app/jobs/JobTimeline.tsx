"use client"

import { useState, useTransition } from "react"
import { getSteps, getWorkflow, type StepDef } from "@/app/lib/job-workflow"
import { confirmJobStep } from "@/app/actions/jobs"

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
  isManager?:   boolean
}

export default function JobTimeline({
  jobId, jobType, currentStep, flowVariant, stepLogs, userName, userDept, isManager,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [pendingConfirm, setPendingConfirm]     = useState(false)
  const [noteInput, setNoteInput]               = useState("")

  const wf        = getWorkflow(jobType)
  const steps     = getSteps(jobType, flowVariant)
  const currentIdx = steps.findIndex((s) => s.key === currentStep)
  const isFinished = currentIdx === steps.length - 1 && stepLogs.some((l) => l.step === currentStep)

  // step ที่ active (รอ confirm อยู่)
  const activeStep = isFinished ? null : steps[currentIdx]

  // user กด confirm step ปัจจุบัน
  function handleConfirm(variant?: string) {
    if (!activeStep) return
    startTransition(async () => {
      await confirmJobStep({
        jobId,
        stepKey:     activeStep.key,
        completedBy: userName,
        department:  userDept,
        note:        noteInput || undefined,
        variant,
      })
      setNoteInput("")
      setPendingConfirm(false)
      setShowVariantModal(false)
    })
  }

  // ตรวจว่า user กด confirm step นี้ได้มั้ย
  const normalizedDept = (() => {
    const d = userDept.toLowerCase().trim()
    const depts: string[] = []
    if (d.includes('sale') || d.includes('ขาย') || d.includes('marketing') || d.includes('business development') || d.includes('การตลาด')) depts.push("sales")
    if (d.includes('account') || d.includes('finance') || d.includes('บัญชี') || d.includes('การเงิน') || d.includes('ap ') || d.includes('ar ')) depts.push("accounting")
    if (d.includes('store') || d.includes('warehouse') || d.includes('สโตร์') || d.includes('คลัง')) depts.push("store")
    if (d.includes('service') || d.includes('บริการ') || d.includes('ซ่อม')) depts.push("service")
    if (d.includes('purchase') || d.includes('จัดซื้อ')) depts.push("purchase")
    if (d.includes('delivery') || d.includes('transport') || d.includes('จัดส่ง') || d.includes('ขนส่ง') || d.includes('driver') || d.includes('คนขับ')) depts.push("delivery")
    if (d.includes('production') || d.includes('ผลิต')) depts.push("production")
    
    if (depts.length === 0) depts.push(d)
    return depts
  })()

  // ผู้จัดการ หรือพนักงานแผนกนั้นๆ กดยืนยันได้
  // แต่ manager ของ sales ก็กดได้เฉพาะ step sales เท่านั้น
  const canConfirm = activeStep?.department.some(dept => normalizedDept.includes(dept)) ?? false

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
      <ol className="flex flex-wrap gap-0 items-start">
        {steps.map((step, idx) => {
          const log      = stepLogs.find((l) => l.step === step.key)
          const isDone   = !!log
          const isActive = !isDone && idx === currentIdx
          const isFuture = idx > currentIdx && !isDone

          return (
            <li key={step.key} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all
                    ${isDone   ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200" : ""}
                    ${isActive ? "bg-brand-red   border-brand-red   text-white animate-pulse shadow-md shadow-red-200" : ""}
                    ${isFuture ? "bg-gray-100   border-gray-300   text-gray-400" : ""}
                  `}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap max-w-[72px] text-center leading-tight
                  ${isDone   ? "text-emerald-600 font-bold" : ""}
                  ${isActive ? "text-brand-red font-bold" : ""}
                  ${isFuture ? "text-gray-400" : ""}
                `}>
                  {step.label}
                </span>
                {isDone && log && (
                  <span className="text-[10px] text-gray-400 mt-0.5">{log.completedBy}</span>
                )}
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 mt-[-16px] ${isDone ? "bg-emerald-400" : "bg-gray-200"}`} />
              )}
            </li>
          )
        })}
      </ol>

      {/* Confirm area */}
      {!isFinished && canConfirm && activeStep && (
        <div className="mt-6 p-4 bg-red-50/50 rounded-xl border border-red-100 shadow-sm">
          <p className="text-xs font-black text-brand-red uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
            ยืนยัน Step: {activeStep.label}
            {activeStep.note && <span className="text-red-400 ml-1 text-[10px]">({activeStep.note})</span>}
          </p>
          <input
            type="text"
            placeholder="หมายเหตุ (ถ้ามี)..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          />
          <button
            disabled={isPending}
            onClick={() => {
              // ตรวจสอบว่า step นี้คือ step ที่ต้องตอบคำถาม variant หรือไม่
              const isVariantStep = wf?.variantQuestion?.askedAtStep === activeStep.key;
              if (isVariantStep && !flowVariant) {
                setShowVariantModal(true)
              } else {
                handleConfirm()
              }
            }}
            className="bg-brand-red text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all shadow-md shadow-red-200"
          >
            {isPending ? "กำลังบันทึก..." : "✓ ยืนยัน step นี้"}
          </button>
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
        <p className="mt-3 text-xs text-green-600 font-medium">✅ Job นี้เสร็จสมบูรณ์แล้ว</p>
      )}
    </div>
  )
}
