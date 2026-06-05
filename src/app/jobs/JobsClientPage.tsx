"use client";

import React, { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { ClipboardList, Trash2, Edit2, ChevronDown, ChevronRight, X, Wrench, CheckCircle2 } from "lucide-react";
import { updateJob, deleteJob, UpdateJobPayload, createStandaloneJob } from "./actions";
import { JOB_TYPES } from "@/constants/job-types";
import { useRouter } from "next/navigation";

import JobTimeline from "./JobTimeline";
import { isCompleted, getCurrentStepDef, getSteps } from "@/app/lib/job-workflow";

type StepLog = {
  step:        string
  completedBy: string
  department:  string
  completedAt: Date
  note?:       string | null
}

type Job = { 
  id: string; 
  jobNumber: string; 
  companyCode: string; 
  jobType: string; 
  month: number; 
  yearBe: number; 
  dateClosed: Date; 
  customerName: string; 
  item: string | null; 
  quotationNumber: string | null; 
  poNumber: string | null; 
  sellerName: string | null;
  currentStep: string;
  flowVariant: string | null;
  deliveryMethod?: string | null;
  deliveryDate?: Date | string | null;
  courierCompany?: string | null;
  trackingNumber?: string | null;
  trackingPhotoUrl?: string | null;
  stepLogs: StepLog[];
  paymentMethod?: string | null;
  paymentTask?: any;
};

const COMPANY_CODES = ["TP", "TG", "TE"];

const MONTH_NAMES = [
  "", "Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.",
  "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec.",
];

function formatDate(d: Date | string) {
  const date = new Date(d);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth() + 1]} ${date.getFullYear() + 543}`;
}

// ── Badge colors per type/company ──────────────────────────
function CompanyBadge({ code }: { code: string }) { 
  const styles: Record<string, string> = { 
    TP: "bg-blue-50 text-blue-800 border-blue-200", 
    TG: "bg-green-50 text-green-800 border-green-200", 
    TE: "bg-amber-50 text-amber-800 border-amber-200", 
  }; 
  return ( 
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${styles[code] ?? "bg-gray-100 text-gray-700"}`}>
      {code}
    </span>
  );
}

function JobTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    "งานขาย": "bg-teal-50 text-teal-800 border-teal-200",
    "งานซ่อม": "bg-red-50 text-red-800 border-red-200",
    "งานติดตั้ง": "bg-amber-50 text-amber-800 border-amber-200",
    "งานขาย + ติดตั้ง": "bg-amber-50 text-amber-800 border-amber-200",
    "งานโปรเจค": "bg-purple-50 text-purple-800 border-purple-200",
    "ค่าบริการ": "bg-gray-50 text-gray-700 border-gray-200",
    "งานตรวจเช็ค": "bg-gray-50 text-gray-700 border-gray-200",
    "งานเคลม": "bg-red-50 text-red-800 border-red-200",
    "สินค้าฝากขาย": "bg-teal-50 text-teal-800 border-teal-200",
    "งานตู้": "bg-purple-50 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${colorMap[type] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}> 
      {type} 
    </span> 
  );
}

// ── Editable fields ───────────────────── ─────────────────────
function EditableField({ 
  label, value, type = "text", options, onSave,
}: { 
  label: string; 
  value: string; 
  type?: "text" | "date" | "select"; 
  options?: string[]; 
  onSave: (v: string) => void;
}) { 
  const [editing, setEditing] = useState(false); 
  const [draft, setDraft] = useState(value); 

  function commit() { 
    if (draft !== value) onSave(draft); 
    setEditing(false); 
  } 

  return ( 
    <div> 
      <p className="text-xs text-gray-400 mb-0.5">{label}</p> 
      {editing ? ( 
        <div className="flex gap-1 items-center"> 
          {type === "select" ? ( 
            <select 
              autoFocus 
              value={draft} 
              onChange={(e) => setDraft(e.target.value)} 
              onBlur={commit} 
              className="text-sm border rounded px-2 py-1 bg-white" 
            > 
              {options?.map((o) => <option key={o}>{o}</option>)} 
            </select> 
          ) : ( 
            <input 
              autoFocus 
              type={type} 
              value={draft} 
              onChange={(e) => setDraft(e.target.value)} 
              onBlur={commit} 
              onKeyDown={(e) => e.key === "Enter" && commit()} 
              className="text-sm border rounded px-2 py-1 bg-white w-full" 
            /> 
          )} 
          <button onClick={commit} className="text-xs text-blue-600 hover:underline">บันทึก</button> 
        </div> 
      ) : ( 
        <button 
          onClick={() => { setDraft(value); setEditing(true); }} 
          className="text-sm text-gray-800 hover:text-blue-600 hover:underline text-left w-full group flex items-center gap-1" 
        > 
          <span>{value || <span className="text-gray-400 italic">—</span>}</span> 
          <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-gray-400" /> 
        </button> 
      )} 
    </div> 
  );
}

// ── Expanded row ────────────────────── ──────────────────────
function ExpandedRow({ 
  job, 
  onUpdate, 
  onDelete, 
  isManager,
  userName,
  userDept,
  userRole,
}: { 
  job: Job; 
  onUpdate: (id: string, data: UpdateJobPayload) => void; 
  onDelete: (id: string) => void; 
  isManager: boolean;
  userName: string;
  userDept: string;
  userRole: string;
}) { 
  const save = (field: keyof UpdateJobPayload) => (value: string) => 
    onUpdate(job.id, { [field]: value }); 

  return ( 
    <tr> 
      <td colSpan={10} className="bg-gray-50 border-b px-6 py-4 shadow-inner"> 
        <div className="mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">สถานะการดำเนินงาน</p>
          <JobTimeline
            jobId={job.id}
            jobType={job.jobType}
            currentStep={job.currentStep}
            flowVariant={job.flowVariant}
            stepLogs={job.stepLogs}
            userName={userName}
            userDept={userDept}
            userRole={userRole}
            isManager={isManager}
            jobNumber={job.jobNumber}
            customerName={job.customerName}
            sellerName={job.sellerName || undefined}
            paymentTask={job.paymentTask}
          />

          {job.deliveryMethod && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wide">ข้อมูลการจัดส่ง</p>
              <div className="flex flex-wrap gap-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">รูปแบบ</p>
                  <p className="text-xs font-bold text-gray-700">{job.deliveryMethod === 'in-house' ? 'จัดส่งเอง (In-house)' : 'บริษัทขนส่ง (Courier)'}</p>
                </div>
                {job.deliveryMethod === 'in-house' && job.deliveryDate && (
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">วันที่จัดส่ง</p>
                    <p className="text-xs font-bold text-gray-700">{formatDate(job.deliveryDate)}</p>
                  </div>
                )}
                {job.deliveryMethod === 'courier' && (
                  <>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">บริษัทขนส่ง</p>
                      <p className="text-xs font-bold text-brand-red">{job.courierCompany}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">เลขพัสดุ</p>
                      <p className="text-xs font-bold text-gray-700">{job.trackingNumber}</p>
                    </div>
                  </>
                )}
                {job.trackingPhotoUrl && (
                  <div className="w-full mt-2">
                    <p className="text-[10px] text-gray-400 font-medium mb-2">สลิป/ใบเสร็จ</p>
                    <a href={job.trackingPhotoUrl} target="_blank" rel="noreferrer" className="inline-block border border-gray-200 rounded-lg overflow-hidden hover:border-brand-red transition-colors shadow-sm">
                      <img src={job.trackingPhotoUrl} alt="Tracking slip" className="h-32 object-contain bg-gray-50" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {isManager && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <span className="text-xs text-brand-red font-medium flex items-center gap-1">
                <Edit2 size={10} /> 
                แก้ไขสถานะแบบ Manual (สำหรับผู้จัดการ):
              </span>
              <select 
                value={job.currentStep} 
                onChange={(e) => onUpdate(job.id, { currentStep: e.target.value } as any)}
                className="text-xs border rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:border-brand-red"
              >
                <option value={job.currentStep}>-- เลือกสถานะใหม่ --</option>
                {getSteps(job.jobType, job.flowVariant)?.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                )) || <option value={job.currentStep}>{job.currentStep}</option>}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mb-4"> 
          <EditableField label="ประเภทงาน" value={job.jobType} type="select" options={JOB_TYPES as unknown as string[]} onSave={save("jobType")} /> 
          <EditableField label="หมายเลข PO" value={job.poNumber ?? ""} onSave={save("poNumber")} /> 
          <EditableField label="วันที่ปิดการขาย" value={new Date(job.dateClosed).toISOString().slice(0, 10)} type="date" onSave={save("dateClosed")} />
          <EditableField label="ชื่อลูกค้า" value={job.customerName} onSave={save("customerName")} />
          <EditableField label="รายการสินค้า" value={job.item ?? ""} onSave={save("item")} />
          <EditableField label="ใบเสนอราคา" value={job.quotationNumber ?? ""} onSave={save("quotationNumber")} />
          <EditableField label="พนักงานขาย" value={job.sellerName ?? ""} onSave={save("sellerName")} />
          <EditableField label="บริษัท" value={job.companyCode} type="select" options={COMPANY_CODES} onSave={save("companyCode")} />
        </div>

        {isManager && (
          <button
            onClick={() => {
              if (confirm(`คุณต้องการลบงาน ${job.jobNumber} ใช่หรือไม่?`)) onDelete(job.id);
            }}
            className="text-xs text-red-500 hover:underline flex items-center gap-1"
          >
            <Trash2 size={12} /> ลบงานนี้
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Main component ───────────────────── ─────────────────────
export default function JobsClientPage({ 
  jobs: initialJobs, 
  isManager, 
  currentUser,
  userDept,
  userRole,
  actionParam,
}: { 
  jobs: Job[]; 
  isManager: boolean; 
  currentUser: string;
  userDept: string;
  userRole: string;
  actionParam?: string;
}) { 
  const router = useRouter();
  const [showQuickRepair, setShowQuickRepair] = useState(actionParam === "new-repair");
  const [quickRepairLoading, setQuickRepairLoading] = useState(false);

  useEffect(() => {
    if (actionParam === "new-repair") {
      setShowQuickRepair(true);
      router.replace("/jobs", { scroll: false });
    }
  }, [actionParam, router]);

  const [jobs, setJobs] = useState(initialJobs); 
  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);
  const [expanded, setExpanded] = useState<string | null>(null); 
  const [search, setSearch] = useState(""); 
  const [filterCo, setFilterCo] = useState(""); 
  const [filterType, setFilterType] = useState(""); 
  const [filterMonth, setFilterMonth] = useState(""); 
  const [isPending, startTransition] = useTransition(); 

  const normalizedDept = useMemo(() => {
    const roleLower = String(userRole || "").toLowerCase().trim()
    const d = userDept.toLowerCase().trim()
    const depts: string[] = []
    
    const isSales = roleLower.includes('sale') || roleLower.includes('ขาย') || roleLower.includes('เซล') || roleLower.includes('marketing') || d.includes('sale') || d.includes('ขาย') || d.includes('เซล') || d.includes('marketing')
    const isAccounting = roleLower.includes('account') || roleLower.includes('บัญชี') || roleLower.includes('finance') || d.includes('account') || d.includes('บัญชี') || d.includes('finance')
    const isService = roleLower.includes('service') || roleLower.includes('ซ่อม') || roleLower.includes('บริการ') || d.includes('service') || d.includes('ซ่อม') || d.includes('บริการ')
    const isPurchase = roleLower.includes('purchase') || roleLower.includes('จัดซื้อ') || d.includes('purchase') || d.includes('จัดซื้อ')
    const isProduction = roleLower.includes('production') || roleLower.includes('ผลิต') || d.includes('production') || d.includes('ผลิต')
    
    const isDeliveryRole = roleLower.includes('delivery') || roleLower.includes('transport') || roleLower.includes('จัดส่ง') || roleLower.includes('ขนส่ง') || roleLower.includes('driver') || roleLower.includes('คนขับ')
    const isStoreRole = roleLower.includes('store') || roleLower.includes('warehouse') || roleLower.includes('สโตร์') || roleLower.includes('คลัง')
    
    if (isDeliveryRole) {
      depts.push("delivery")
    } else if (isStoreRole || d.includes('store') || d.includes('สโตร์') || d.includes('คลัง')) {
      depts.push("store")
    }
    
    if (isSales) depts.push("sales")
    if (isAccounting) depts.push("accounting")
    if (isService) depts.push("service")
    if (isPurchase) depts.push("purchase")
    if (isProduction) depts.push("production")
    
    if (depts.length === 0) depts.push(d)
    return depts
  }, [userDept, userRole])

  const [filterStatus, setFilterStatus] = useState<"all" | "pending">(
    normalizedDept.includes("sales") ? "all" : "pending"
  );

  // ── Unique months from data ── 
  const months = useMemo(() => { 
    const s = new Set(jobs.map((j) => `${j.yearBe}-${String(j.month).padStart(2, "0")}`)); 
    return Array.from(s).sort().reverse(); 
  }, [jobs]); 

  // ── Filter ── 
  const filtered = useMemo(() => { 
    const q = search.toLowerCase(); 
    return jobs.filter((j) => { 
      if (search && ![j.jobNumber, j.customerName, j.quotationNumber ?? ""].some((v) => v.toLowerCase().includes(q))) return false; 
      if (filterCo && j.companyCode !== filterCo) return false; 
      if (filterType && j.jobType !== filterType) return false; 
      if (filterMonth) { 
        const [y, m] = filterMonth.split("-"); 
        if (j.yearBe !== +y || j.month !== +m) return false; 
      } 
      if (filterStatus === "pending") {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs)) return false;
        const stepDef = getCurrentStepDef(j.jobType, j.currentStep, j.flowVariant, j.stepLogs);
        if (!stepDef?.department.some(dept => normalizedDept.includes(dept))) return false;
      }
      return true; 
    }); 
  }, [jobs, search, filterCo, filterType, filterMonth, filterStatus, normalizedDept]); 

  // ── Handlers ── 
  function handleUpdate(id: string, data: UpdateJobPayload) { 
    startTransition(async () => { 
      await updateJob(id, data); 
      setJobs((prev) => 
        prev.map((j) => 
          j.id === id 
            ? { ...j, ...data, ...(data.dateClosed ? { dateClosed: new Date(data.dateClosed) } : {}) } as any
            : j 
        ) 
      ); 
    }); 
  } 

  function handleDelete(id: string) { 
    startTransition(async () => { 
      await deleteJob(id); 
      setJobs((prev) => prev.filter((j) => j.id !== id)); 
      setExpanded(null); 
    }); 
  } 

  // ── Stats ── 
  const thisMonthCount = useMemo(() => { 
    const now = new Date(); 
    const m = now.getMonth() + 1; 
    const y = (now.getFullYear() + 543) % 100; 
    return jobs.filter((j) => j.month === m && j.yearBe === y).length; 
  }, [jobs]); 

  const withPO = jobs.filter((j) => j.poNumber).length; 

  const pendingActionCount = useMemo(() => {
    return jobs.filter((j) => {
      if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs)) return false;
      const stepDef = getCurrentStepDef(j.jobType, j.currentStep, j.flowVariant, j.stepLogs);
      return stepDef?.department.some(dept => normalizedDept.includes(dept));
    }).length;
  }, [jobs, normalizedDept]);

  const completedOverallCount = useMemo(() => {
    return jobs.filter((j) => isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs)).length;
  }, [jobs]);

  const kpis = useMemo(() => {
    if (normalizedDept.includes('sales')) {
      return [
        { label: 'งานทั้งหมด', value: jobs.length, color: 'text-gray-400', bg: 'bg-gray-50' },
        { label: 'เดือนนี้', value: thisMonthCount, color: 'text-sky-500', bg: 'bg-sky-50' },
        { label: 'มี PO แล้ว', value: withPO, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'ยังไม่มี PO', value: jobs.length - withPO, color: 'text-amber-500', bg: 'bg-amber-50' },
      ];
    } else {
      return [
        { label: 'งานทั้งหมด', value: jobs.length, color: 'text-gray-400', bg: 'bg-gray-50' },
        { label: 'รอฉันดำเนินการ', value: pendingActionCount, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'รอแผนกอื่น', value: jobs.length - pendingActionCount - completedOverallCount, color: 'text-sky-500', bg: 'bg-sky-50' },
        { label: 'เสร็จสมบูรณ์', value: completedOverallCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ];
    }
  }, [normalizedDept, jobs.length, thisMonthCount, withPO, pendingActionCount, completedOverallCount]);

  function QuickRepairModal() {
    const [customerName, setCustomerName] = useState("");
    const [item, setItem] = useState("");
    const [companyCode, setCompanyCode] = useState("TP");

    async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!customerName || !item) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      setQuickRepairLoading(true);
      try {
        const newJob = await createStandaloneJob({ customerName, item, companyCode, jobType: "งานซ่อม" });
        setJobs(prev => [newJob as any, ...prev]);
        setShowQuickRepair(false);
        router.push(`/jobs/${newJob.id}/repair-order`);
      } catch (err) {
        alert("เกิดข้อผิดพลาด");
      } finally {
        setQuickRepairLoading(false);
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Wrench size={18} className="text-brand-red" />
              ออกใบรับซ่อมด่วน (Quick Repair Order)
            </h2>
            <button onClick={() => setShowQuickRepair(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อลูกค้า</label>
              <input autoFocus required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">รายการ/สินค้าที่จะซ่อม</label>
              <input required type="text" value={item} onChange={e => setItem(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">บริษัท</label>
              <select value={companyCode} onChange={e => setCompanyCode(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red">
                <option value="TP">TP</option>
                <option value="TG">TG</option>
                <option value="TE">TE</option>
              </select>
            </div>
            <button disabled={quickRepairLoading} type="submit" className="w-full mt-2 bg-brand-red text-white py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-colors shadow-md shadow-red-200 flex items-center justify-center gap-2">
              {quickRepairLoading ? "กำลังสร้าง..." : "สร้างใบรับซ่อม"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return ( 
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible"> 
      {showQuickRepair && <QuickRepairModal />}

      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-lg shadow-red-200">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">Jobs Directory</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isManager ? "แสดงงานทั้งหมดในระบบ" : `แสดงเฉพาะงานของ ${currentUser}`}
            </p>
          </div>
        </div>
      </header>

      {/* ── KPI Summary Strip ── */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
        {kpis.map(k => (
          <div key={k.label} className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 ${k.bg}`}>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
              <p className={`text-sm md:text-lg font-black ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">

        {/* Filters */} 
        <div className="flex flex-wrap gap-3 items-center">
        <input 
          type="text" 
          placeholder="ค้นหางาน / ลูกค้า / ใบเสนอราคา..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
        /> 
        <select 
          value={filterCo} 
          onChange={(e) => setFilterCo(e.target.value)} 
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
        > 
          <option value="">ทุกบริษัท</option> 
          {COMPANY_CODES.map((c) => <option key={c}>{c}</option>)} 
        </select> 
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)} 
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
        > 
          <option value="">งานทุกประเภท</option> 
          {JOB_TYPES.map((t) => <option key={t}>{t}</option>)} 
        </select> 
        <select 
          value={filterMonth} 
          onChange={(e) => setFilterMonth(e.target.value)} 
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
        > 
          <option value="">ทุกเดือน</option> 
          {months.map((m) => { 
            const [y, mo] = m.split("-"); 
            return <option key={m} value={m}>{MONTH_NAMES[+mo]} 25{y}</option>; 
          })} 
        </select> 
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value as "all" | "pending")} 
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" 
        > 
          <option value="all">สถานะทั้งหมด</option> 
          <option value="pending">รอฉันดำเนินการ</option> 
        </select>
        {(search || filterCo || filterType || filterMonth || filterStatus !== (normalizedDept.includes("sales") ? "all" : "pending")) && ( 
          <button 
            onClick={() => { setSearch(""); setFilterCo(""); setFilterType(""); setFilterMonth(""); setFilterStatus(normalizedDept.includes("sales") ? "all" : "pending"); }} 
            className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors" 
          > 
            ล้างตัวกรอง
          </button> 
        )} 
        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">{filtered.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest w-12"></th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">รหัสงาน</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">บริษัท</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ประเภทงาน</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">วันที่ปิดการขาย</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ลูกค้า</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ใบเสนอราคา</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">หมายเลข PO</th>
              <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">พนักงานขาย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-16 text-gray-400 font-medium">
                  ไม่พบงานที่ตรงกับเงื่อนไข
                </td>
              </tr>
            )}
            {filtered.map((job) => {
              const isOpen = expanded === job.id;
              return (
                <React.Fragment key={job.id}>
                  <tr 
                    onClick={() => setExpanded(isOpen ? null : job.id)} 
                    className={`cursor-pointer transition-colors ${isOpen ? "bg-blue-50/50" : "hover:bg-gray-50"} ${isPending ? "opacity-60" : ""}`} 
                  > 
                    <td className="px-5 py-4 text-gray-400"> 
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />} 
                    </td> 
                    <td className="px-5 py-4 font-mono font-black text-brand-red tracking-wide text-xs"> 
                      {job.jobNumber} 
                    </td> 
                    <td className="px-5 py-4">
                      <span className={`
                        inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border
                        ${isCompleted(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-blue-50 text-blue-600 border-blue-200"
                        }
                      `}>
                        {isCompleted(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)
                          ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> เสร็จแล้ว</span>
                          : getCurrentStepDef(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)?.label ?? job.currentStep
                        }
                      </span>
                    </td>
                    <td className="px-5 py-4"> 
                      <CompanyBadge code={job.companyCode} /> 
                    </td> 
                    <td className="px-5 py-4"> 
                      <JobTypeBadge type={job.jobType} /> 
                    </td> 
                    <td className="px-5 py-4"> 
                      <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
                        {formatDate(job.dateClosed)}
                      </span>
                    </td> 
                    <td className="px-5 py-4"> 
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[180px]">
                        {job.customerName}
                      </p>
                    </td> 
                    <td className="px-5 py-4 font-mono text-[11px] font-black text-gray-800 hover:text-brand-red hover:underline transition-colors"> 
                      {job.quotationNumber ?? "—"} 
                    </td> 
                    <td className="px-5 py-4 font-mono text-[11px] font-black text-gray-500"> 
                      {job.poNumber ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[11px] font-bold text-gray-600">
                        {job.sellerName ?? "—"}
                      </p>
                    </td>
                  </tr>

                  {isOpen && (
                    <ExpandedRow
                      job={job}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      isManager={isManager}
                      userName={currentUser}
                      userDept={userDept}
                      userRole={userRole}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      </div>
    </div>
  );
}
