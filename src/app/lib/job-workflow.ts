export type Department = "sales" | "store" | "service" | "purchase" | "accounting" | "delivery" | "production"

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
      has_stock: [
        { key: "sales",      label: "Sales",   department: ["sales"] },
        { key: "store",      label: "Store",   department: ["store"] },
        { key: "accounting", label: "บัญชี",   department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",  department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",      label: "Sales",    department: ["sales"] },
        { key: "store",      label: "Store",    department: ["store"] },
        { key: "purchase",   label: "Purchase", department: ["purchase"] },
        { key: "accounting", label: "บัญชี",    department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",   department: ["delivery"] },
      ],
    },
  },

  // 2. งานซ่อม
  {
    jobType: "งานซ่อม",
    variantQuestion: {
      question: "ซ่อมได้เองหรือต้องส่งนอก?",
      askedAtStep: "service_issue",
      options: [
        { label: "ซ่อมเองได้",       value: "self_repair", icon: "Wrench" },
        { label: "ต้องส่งซ่อมนอก",   value: "outsource", icon: "Factory" },
      ],
    },
    flows: {
      self_repair: [
        { key: "sales",           label: "Sales",              department: ["sales"] },
        { key: "service_issue",   label: "Service (ออกใบรับซ่อม)", department: ["service"], note: "ref. QT ใบรับซ่อม" },
        { key: "service_repair",  label: "Service (ซ่อม)",     department: ["service"] },
        { key: "accounting",      label: "บัญชี",               department: ["accounting"] },
        { key: "delivery",        label: "จัดส่ง",              department: ["delivery"] },
      ],
      outsource: [
        { key: "sales",           label: "Sales",              department: ["sales"] },
        { key: "service_issue",   label: "Service (ออกใบรับซ่อม)", department: ["service"], note: "ref. QT ใบรับซ่อม" },
        { key: "outsource",       label: "ซ่อมนอกบริษัท",      department: ["service"] },
        { key: "purchase",        label: "Purchase",           department: ["purchase"] },
        { key: "service_done",    label: "Service (รับกลับ)",   department: ["service"] },
        { key: "accounting",      label: "บัญชี",               department: ["accounting"] },
        { key: "delivery",        label: "จัดส่ง",              department: ["delivery"] },
      ],
    },
  },

  // 3. งานติดตั้ง
  {
    jobType: "งานติดตั้ง",
    flows: {
      default: [
        { key: "sales",     label: "Sales",              department: ["sales"] },
        { key: "service",   label: "Service (ใบส่งมอบ)", department: ["service"], note: "ต้องมีใบส่งมอบงาน" },
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
        { key: "sales",      label: "Sales",              department: ["sales"] },
        { key: "store",      label: "Store",              department: ["store"] },
        { key: "service",    label: "Service (ใบส่งมอบ)", department: ["service"], note: "ใบส่งมอบงาน" },
        { key: "accounting", label: "บัญชี",               department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",              department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",       label: "Sales",      department: ["sales"] },
        { key: "store",       label: "Store",      department: ["store"] },
        { key: "production",  label: "Production", department: ["production"] },
        { key: "purchase",    label: "Purchase",   department: ["purchase"] },
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
        { key: "sales",      label: "Sales",   department: ["sales"] },
        { key: "store",      label: "Store",   department: ["store"] },
        { key: "accounting", label: "บัญชี",   department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",  department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",      label: "Sales",      department: ["sales"] },
        { key: "store",      label: "Store",      department: ["store"] },
        { key: "production", label: "Production", department: ["production"] },
        { key: "purchase",   label: "Purchase",   department: ["purchase"] },
        { key: "accounting", label: "บัญชี",       department: ["accounting"] },
        { key: "delivery",   label: "จัดส่ง",      department: ["delivery"] },
      ],
    },
  },

  // 6. งานโปรเจค
  {
    jobType: "งานโปรเจค",
    flows: {
      default: [
        { key: "sales",      label: "Sales (QT)", department: ["sales"], note: "ต้องมีเลข QT" },
        { key: "accounting", label: "บัญชี",       department: ["accounting"] },
      ],
    },
  },

  // 7. สินค้าฝากขาย
  {
    jobType: "สินค้าฝากขาย",
    flows: {
      default: [
        { key: "sales",      label: "Sales",   department: ["sales"] },
        { key: "store",      label: "Store",   department: ["store"] },
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
        { key: "sales",      label: "Sales (QT)", department: ["sales"], note: "ต้องมี QT" },
        { key: "service",    label: "Service",    department: ["service"] },
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
        { key: "sales",   label: "Sales",   department: ["sales"] },
        { key: "service", label: "Service", department: ["service"] },
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
        { key: "sales",    label: "Sales",               department: ["sales"] },
        { key: "service",  label: "Service",             department: ["service"] },
        { key: "store",    label: "Store (ซ่อมเสร็จ)",   department: ["store"], note: "ซ่อมเสร็จแจ้ง Sales" },
        { key: "delivery", label: "จัดส่ง",               department: ["delivery"] },
      ],
      no_stock: [
        { key: "sales",   label: "Sales",                        department: ["sales"] },
        { key: "service", label: "Service",                      department: ["service"] },
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

export function getCurrentStepDef(jobType: string, currentStep: string, variant?: string | null): StepDef | undefined {
  return getSteps(jobType, variant).find((s) => s.key === currentStep)
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
}
