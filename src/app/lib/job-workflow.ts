export type Department = "sales" | "store" | "service" | "purchase" | "accounting" | "delivery" | "production" | "project"

export type StepDef = {
  key:         string
  label:       string
  department:  Department[]   // แผนกที่กดยืนยันได้
  note?:       string         // hint แสดงใน UI
}

export type FlowVariantQuestion = {
  question: string
  askedAtStep: string
  options:  { label: string; value: string; icon?: string }[]
}

export type WorkflowDef = {
  jobType:          string
  variantQuestion?: FlowVariantQuestion   // ถ้ามี → ถามตอน Sales confirm step แรก
  flows: {
    [variant: string]: StepDef[]          // "default" ถ้าไม่มี variant
  }
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW DEFINITIONS — ครบทุก 10 ประเภท
// ─────────────────────────────────────────────────────────────

export const WORKFLOWS: WorkflowDef[] = [

  // 1. งานขาย
  {
    jobType: "งานขาย",
    variantQuestion: {
      question: "มีสินค้าในสต๊อกหรือไม่?",
      askedAtStep: "store",
      options: [
        { label: "มีของในสต๊อก",  value: "has_stock", icon: "CheckCircle2" },
        { label: "ไม่มีของ ต้องสั่งซื้อ", value: "no_stock", icon: "XCircle" },
      ],
    },
    flows: {
      default: [
        { key: "sales",      label: "ฝ่ายขาย",   department: ["sales"] },
        { key: "store",      label: "สโตร์",   department: ["store"] },
        { key: "pending_variant", label: "รอเช็คสต๊อก...", department: [] },
      ],
      has_stock: [
        { key: "sales",      label: "ฝ่ายขาย",   department: ["sales"] },
        { key: "store",      label: "สโตร์",   department: ["store"] },
        { key: "accounting", label: "บัญชี",   department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",  department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",      label: "ฝ่ายขาย",    department: ["sales"] },
        { key: "store",      label: "สโตร์",    department: ["store"] },
        { key: "sales_pr",   label: "ฝ่ายขาย - เปิด PR", department: ["sales"] },
        { key: "purchase_find_supplier", label: "จัดซื้อ - หาร้านค้า/Supplier", department: ["purchase"] },



        { key: "store_receive", label: "สโตร์ - รับและตรวจสอบสินค้า", department: ["store"] },
        { key: "accounting", label: "บัญชี",    department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",   department: ["delivery"] },
      ],
    },
  },

  // 2. งานซ่อม
  {
    jobType: "งานซ่อม",
    variantQuestion: {
      question: "อยู่ในประกัน หรือ นอกประกัน (ส่งซ่อม/ซ่อมเอง)?",
      askedAtStep: "service_receive",
      options: [
        { label: "ในประกัน (ซ่อมเอง)", value: "in_house_warranty", icon: "ShieldCheck" },
        { label: "นอกประกัน (ซ่อมเอง)", value: "in_house_charged", icon: "Wrench" },
        { label: "ส่งซ่อมนอก (Outsource)", value: "outsource", icon: "Factory" },
      ],
    },
    flows: {
      default: [
        { key: "service_receive", label: "ฝ่ายบริการ (รับซ่อม)", department: ["service", "sales"], note: "ออกใบรับซ่อม" },
        { key: "pending_variant", label: "รอระบุประเภทซ่อม...", department: [] },
      ],
      in_house_warranty: [
        { key: "service_receive", label: "ฝ่ายบริการ (รับซ่อม)", department: ["service", "sales"] },
        { key: "service_repair",  label: "ฝ่ายบริการ (กำลังซ่อม)", department: ["service"] },
        { key: "service_qc",      label: "ฝ่ายบริการ (QC)",        department: ["service"] },
        { key: "service_return",  label: "ส่งมอบ (คืนสินค้าซ่อม)", department: ["service"] },
      ],
      in_house_charged: [
        { key: "service_receive",  label: "ฝ่ายบริการ (รับซ่อม)", department: ["service", "sales"] },
        { key: "sales_quote",      label: "ฝ่ายขาย (เสนอราคา)",  department: ["sales"] },
        { key: "customer_approval",label: "รอลูกค้าอนุมัติ",     department: ["sales"] },
        { key: "service_repair",   label: "ฝ่ายบริการ (กำลังซ่อม)", department: ["service"] },
        { key: "service_qc",       label: "ฝ่ายบริการ (QC)",        department: ["service"] },
        { key: "service_return",   label: "ส่งมอบ (คืนสินค้าซ่อม)", department: ["service"] },
        { key: "accounting",       label: "บัญชี",               department: ["accounting"] },
      ],
      outsource: [
        { key: "service_receive",      label: "ฝ่ายบริการ (รับซ่อม)", department: ["service", "sales"] },
        { key: "service_outsource",    label: "ฝ่ายบริการ (ส่งซ่อมนอก)", department: ["service"] },
        { key: "purchase_followup",    label: "จัดซื้อ (ติดตาม)", department: ["purchase"] },
        { key: "service_receive_back", label: "ฝ่ายบริการ (รับกลับ)", department: ["service"] },
        { key: "service_qc",           label: "ฝ่ายบริการ (QC)",      department: ["service"] },
        { key: "service_return",       label: "ส่งมอบ (คืนสินค้าซ่อม)", department: ["service"] },
        { key: "accounting",           label: "บัญชี",               department: ["accounting"] },
      ]
    },
  },

  // 3. งานติดตั้ง
  {
    jobType: "งานติดตั้ง",
    flows: {
      default: [
        { key: "sales",     label: "ฝ่ายขาย",              department: ["sales"] },
        { key: "service",   label: "ฝ่ายบริการ (ใบส่งมอบ)", department: ["service"], note: "ต้องมีใบส่งมอบงาน" },
        { key: "accounting",label: "บัญชี",               department: ["accounting"] },
      ],
    },
  },

  // 4. งานขาย+ติดตั้ง
  {
    jobType: "งานขาย + ติดตั้ง",
    variantQuestion: {
      question: "มีสินค้า/อุปกรณ์ในสต๊อกหรือไม่?",
      askedAtStep: "store",
      options: [
        { label: "มีของในสต๊อก",       value: "has_stock", icon: "CheckCircle2" },
        { label: "ไม่มีของ ต้องสั่ง/ผลิต", value: "no_stock", icon: "XCircle" },
      ],
    },
    flows: {
      has_stock: [
        { key: "sales",      label: "ฝ่ายขาย",              department: ["sales"] },
        { key: "store",      label: "สโตร์",              department: ["store"] },
        { key: "service",    label: "ฝ่ายบริการ (ใบส่งมอบ)", department: ["service"], note: "ใบส่งมอบงาน" },
        { key: "accounting", label: "บัญชี",               department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",              department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",       label: "ฝ่ายขาย",      department: ["sales"] },
        { key: "store",       label: "สโตร์",      department: ["store"] },
        { key: "sales_pr",    label: "ฝ่ายขาย - เปิด PR", department: ["sales"] },
        { key: "production",  label: "ฝ่ายผลิต", department: ["production"] },
        { key: "purchase_find_supplier", label: "จัดซื้อ - หาร้านค้า/Supplier", department: ["purchase"] },



        { key: "store_receive", label: "สโตร์ - รับและตรวจสอบสินค้า", department: ["store"] },
        { key: "accounting",  label: "บัญชี",       department: ["accounting"] },
        { key: "delivery",    label: "จัดส่ง",      department: ["delivery"] },
      ],
    },
  },

  // 5. งานตู้
  {
    jobType: "งานตู้",
    variantQuestion: {
      question: "มีอุปกรณ์พร้อมหรือไม่?",
      askedAtStep: "store",
      options: [
        { label: "มีอุปกรณ์พร้อม",     value: "has_stock", icon: "CheckCircle2" },
        { label: "ไม่มี ต้องผลิต/สั่ง", value: "no_stock", icon: "XCircle" },
      ],
    },
    flows: {
      has_stock: [
        { key: "sales",      label: "ฝ่ายขาย",   department: ["sales"] },
        { key: "store",      label: "สโตร์",   department: ["store"] },
        { key: "accounting", label: "บัญชี",   department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",  department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",      label: "ฝ่ายขาย",      department: ["sales"] },
        { key: "store",      label: "สโตร์",      department: ["store"] },
        { key: "sales_pr",   label: "ฝ่ายขาย - เปิด PR", department: ["sales"] },
        { key: "production", label: "ฝ่ายผลิต", department: ["production"] },
        { key: "purchase_find_supplier", label: "จัดซื้อ - หาร้านค้า/Supplier", department: ["purchase"] },



        { key: "store_receive", label: "สโตร์ - รับและตรวจสอบสินค้า", department: ["store"] },
        { key: "accounting", label: "บัญชี",       department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",      department: ["delivery"] },
      ],
    },
  },

  // 6. งานโปรเจค
  {
    jobType: "งานโปรเจค",
    variantQuestion: {
      question: "มีอุปกรณ์ที่ต้องสั่งซื้อหรือไม่?",
      askedAtStep: "store",
      options: [
        { label: "ไม่มี (พร้อมดำเนินการ)", value: "no_purchase", icon: "CheckCircle2" },
        { label: "มี (ต้องสั่งซื้อเพิ่ม)", value: "need_purchase", icon: "ShoppingCart" },
      ],
    },
    flows: {
      default: [
        { key: "sales",      label: "ฝ่ายขาย (QT)", department: ["sales"], note: "ต้องมีเลข QT" },
        { key: "store",      label: "สโตร์", department: ["store"] },
        { key: "pending_variant", label: "รอเช็คการสั่งซื้อ...", department: [] },
      ],
      no_purchase: [
        { key: "sales",      label: "ฝ่ายขาย (QT)", department: ["sales"], note: "ต้องมีเลข QT" },
        { key: "store",      label: "สโตร์", department: ["store"] },
        { key: "project",    label: "โปรเจค", department: ["project"] },
        { key: "accounting", label: "บัญชี",       department: ["accounting"] },
      ],
      need_purchase: [
        { key: "sales",      label: "ฝ่ายขาย (QT)", department: ["sales"], note: "ต้องมีเลข QT" },
        { key: "store",      label: "สโตร์", department: ["store"] },
        { key: "sales_pr",   label: "ฝ่ายขาย - เปิด PR", department: ["sales"] },
        { key: "purchase_find_supplier", label: "จัดซื้อ - หาร้านค้า/Supplier", department: ["purchase"] },



        { key: "store_receive", label: "สโตร์ - รับและตรวจสอบสินค้า", department: ["store"] },
        { key: "project",    label: "โปรเจค", department: ["project"] },
        { key: "accounting", label: "บัญชี",       department: ["accounting"] },
      ],
    },
  },

  // 7. สินค้าฝากขาย
  {
    jobType: "สินค้าฝากขาย",
    flows: {
      default: [
        { key: "sales",      label: "ฝ่ายขาย",   department: ["sales"] },
        { key: "store",      label: "สโตร์",   department: ["store"] },
        { key: "accounting", label: "บัญชี",   department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",  department: ["delivery"] },
      ],
    },
  },

  // 8. ค่าบริการ
  {
    jobType: "ค่าบริการ",
    flows: {
      default: [
        { key: "sales",      label: "ฝ่ายขาย (QT)", department: ["sales"], note: "ต้องมี QT" },
        { key: "service",    label: "ฝ่ายบริการ",    department: ["service"] },
        { key: "accounting", label: "บัญชี",       department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",      department: ["delivery"] },
      ],
    },
  },

  // 9. งานตรวจเช็ค
  {
    jobType: "งานตรวจเช็ค",
    flows: {
      default: [
        { key: "sales",   label: "ฝ่ายขาย",   department: ["sales"] },
        { key: "service", label: "ฝ่ายบริการ", department: ["service"] },
      ],
    },
  },

  // 10. งานเคลม
  {
    jobType: "งานเคลม",
    variantQuestion: {
      question: "มีของสำหรับซ่อมหรือไม่?",
      askedAtStep: "service",
      options: [
        { label: "มีของ ซ่อมได้",          value: "has_stock", icon: "CheckCircle2" },
        { label: "ไม่มีของ ต้องตรวจราคา", value: "no_stock", icon: "XCircle" },
      ],
    },
    flows: {
      has_stock: [
        { key: "sales",    label: "ฝ่ายขาย",               department: ["sales"] },
        { key: "service",  label: "ฝ่ายบริการ",             department: ["service"] },
        { key: "store",    label: "Store (ซ่อมเสร็จ)",   department: ["store"], note: "ซ่อมเสร็จแจ้ง Sales" },
        { key: "delivery", label: "จัดส่ง",               department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",   label: "ฝ่ายขาย",                        department: ["sales"] },
        { key: "service", label: "ฝ่ายบริการ",                      department: ["service"] },
        { key: "store",   label: "Store (ตรวจเช็คราคาซ่อมนอก)", department: ["store"] },
      ],
    },
  },
]

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

export function getWorkflow(jobType: string): WorkflowDef | undefined {
  return WORKFLOWS.find((w) => w.jobType === jobType)
}

export function getSteps(jobType: string, variant?: string | null): StepDef[] {
  const wf = getWorkflow(jobType)
  if (!wf) return []
  const key = variant ?? "default"
  return wf.flows[key] ?? wf.flows["default"] ?? Object.values(wf.flows)[0] ?? []
}

export function getCurrentStepDef(jobType: string, currentStep: string, variant?: string | null, stepLogs?: any[]): StepDef | undefined {
  const steps = getSteps(jobType, variant)
  let idx = steps.findIndex((s) => s.key === currentStep)
  if (idx === -1 && stepLogs) {
    const firstUnfinished = steps.findIndex(s => !stepLogs.some(l => l.step === s.key))
    idx = firstUnfinished === -1 ? Math.max(0, steps.length - 1) : firstUnfinished
  }
  return steps[idx]
}

export function getNextStep(jobType: string, currentStep: string, variant?: string | null): StepDef | undefined {
  const steps = getSteps(jobType, variant)
  const idx   = steps.findIndex((s) => s.key === currentStep)
  return steps[idx + 1]
}

export function isCompleted(jobType: string, currentStep: string, variant: string | null | undefined, stepLogs: any[]): boolean {
  const steps = getSteps(jobType, variant)
  return currentStep === steps[steps.length - 1]?.key && stepLogs.some((l: any) => l.step === currentStep)
}

export function canUserAdvance(
  step:           StepDef,
  userDepartment: Department
): boolean {
  return step.department.includes(userDepartment)
}

// DEPT label สำหรับ badge
export const DEPT_LABELS: Record<Department, string> = {
  sales:      "Sales",
  store:      "Store",
  service:    "Service",
  purchase:   "Purchase",
  accounting: "บัญชี",
  delivery:   "จัดส่ง",
  production: "Production",
  project:    "โปรเจค",
}
