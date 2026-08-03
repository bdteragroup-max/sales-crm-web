"use client";

import React, { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { ClipboardList, Trash2, Edit2, ChevronDown, ChevronRight, X, Wrench, CheckCircle2, FolderOpen, Plus, Sparkles, User2, Clock, XCircle } from "lucide-react";
import { updateJob, deleteJob, UpdateJobPayload, createStandaloneJob } from "./actions";
import { JOB_TYPES } from "@/constants/job-types";
import { useRouter } from "next/navigation";

import PushNotificationButton from "./PushNotificationButton";
import JobTimeline from "./JobTimeline";
import { isCompleted, getCurrentStepDef, getSteps } from "@/app/lib/job-workflow";

type StepLog = {
  step: string
  completedBy: string
  department: string
  completedAt: Date
  note?: string | null
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
  paymentDate?: Date | string | null;
  paymentTasks?: any[];
  installationOrders?: any[];
  repairOrder?: any;
  project?: any;
  repairDeliveries?: any[];
  quotation?: {
    subject: string | null;
    actualClosingAmount: number | null;
    totalAmountBeforeVat: number | null;
    company?: {
      businessType: string | null;
    } | null;
    orders?: any[];
  } | null;
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
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${styles[code] ?? "bg-gray-100 text-gray-700"}`}>
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
    "งานตู้ + ติดตั้ง": "bg-purple-50 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${colorMap[type] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
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
              {options?.map((o) => <option key={o} value={o}>{o}</option>)}
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

// ── Job Procurement Status ──────────────────────
import { getProcurementForJob } from "@/app/actions/jobs";

function JobProcurementStatus({ customerName, projectName }: { customerName: string, projectName?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProcurementForJob(customerName, projectName).then(res => {
      setData(res);
      setLoading(false);
    });
  }, [customerName, projectName]);

  if (loading) return <div className="mt-5 pt-5 border-t border-gray-100 text-sm text-gray-500 flex items-center gap-2"><div className="animate-spin h-3 w-3 border-2 border-brand-red rounded-full border-t-transparent"></div> กำลังโหลดสถานะจัดซื้อ...</div>;
  if (data.length === 0) return null;

  return (
    <div className="mt-5 pt-5 border-t border-gray-100 animate-in fade-in">
      <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
        <FolderOpen size={12} />
        สถานะจัดซื้อ (Procurement)
      </p>
      <div className="flex flex-wrap gap-2">
        {data.map(pr => (
          <div key={pr.id} className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 flex flex-col gap-2 w-fit min-w-[240px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">PR</span>
                {pr.prNumber}
              </span>
              <span className="text-[10px] text-gray-500">{new Date(pr.createdAt).toLocaleDateString('th-TH')}</span>
            </div>
            {pr.purchaseOrders?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {pr.purchaseOrders.map((po: any) => (
                  <div key={po.id} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium ${po.receiveStatus === 'Received' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    <span>{po.poNumber}</span>
                    <span className="text-gray-300">|</span>
                    <span>{po.receiveStatus === 'Received' ? 'รับแล้ว' : 'รอรับ'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-gray-400">รอเปิด PO (Purchase Order)</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Job Production Status ──────────────────────
function JobProductionStatus({ job, userRole }: { job: Job, userRole?: string }) {
  const productionOrder = job.quotation?.orders?.[0];
  if (!productionOrder) return null;

  const qcStatus = productionOrder.qcStatus || 'PENDING';
  const orderStatus = productionOrder.status || 'รอดำเนินการ';

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">สถานะการผลิต & QC</p>
      <div className="flex flex-wrap items-stretch gap-4">
        {/* Overall Status */}
        <div className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 w-fit pr-8 ${orderStatus === 'เสร็จสิ้น' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className={`p-2 rounded-full ${orderStatus === 'เสร็จสิ้น' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
            {orderStatus === 'เสร็จสิ้น' ? <CheckCircle2 size={16} /> : <Wrench size={16} />}
          </div>
          <div>
            <p className="text-xs font-bold mb-0.5 text-gray-800">สถานะใบสั่งผลิต:</p>
            <p className={`text-sm font-black ${orderStatus === 'เสร็จสิ้น' ? 'text-green-700' : 'text-blue-700'}`}>{orderStatus}</p>
          </div>
        </div>

        {/* Production Schedule */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-sm flex items-center gap-4 min-w-[280px]">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-xs text-amber-800 font-bold mb-0.5">กำหนดผลิตเสร็จ:</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900">
                {productionOrder.productionDeadline ? new Date(productionOrder.productionDeadline).toLocaleDateString('th-TH') : 'ยังไม่กำหนด'}
              </span>
              {productionOrder.estimatedDays && (
                <span className="text-xs font-bold text-amber-600">
                  ({productionOrder.estimatedDays} วันทำการ)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* QC Status */}
        <div className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 w-fit pr-8 ${qcStatus === 'PASS' ? 'bg-green-50 border-green-100' :
          qcStatus === 'FAIL' ? 'bg-red-50 border-red-100' :
            'bg-slate-50 border-slate-100'
          }`}>
          <div className={`p-2 rounded-full ${qcStatus === 'PASS' ? 'bg-green-100 text-green-600' :
            qcStatus === 'FAIL' ? 'bg-red-100 text-red-600' :
              'bg-slate-200 text-slate-500'
            }`}>
            {qcStatus === 'PASS' ? <CheckCircle2 size={16} /> :
              qcStatus === 'FAIL' ? <XCircle size={16} /> :
                <Sparkles size={16} />}
          </div>
          <div className="flex-1">
            <p className={`text-xs font-bold mb-0.5 ${qcStatus === 'PASS' ? 'text-green-800' :
              qcStatus === 'FAIL' ? 'text-red-800' :
                'text-slate-600'
              }`}>
              ผล QC (ตู้คอนเทนเนอร์): {qcStatus === 'PENDING' ? 'รอการตรวจสอบ' : qcStatus}
            </p>
            {qcStatus !== 'PENDING' && productionOrder.qcBy && (
              <p className="text-[10px] text-gray-500">
                โดย: {productionOrder.qcBy} {productionOrder.qcAt && `เมื่อ ${new Date(productionOrder.qcAt).toLocaleDateString('th-TH')}`}
              </p>
            )}
            {qcStatus === 'FAIL' && productionOrder.qcNote && (
              <p className="text-[10px] text-red-600 mt-1 line-clamp-2" title={productionOrder.qcNote}>
                หมายเหตุ: {productionOrder.qcNote}
              </p>
            )}
          </div>
        </div>
      </div>
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
  isMobile = false,
}: {
  job: Job;
  onUpdate: (id: string, data: UpdateJobPayload) => void;
  onDelete: (id: string) => void;
  isManager: boolean;
  userName: string;
  userDept: string;
  userRole: string;
  isMobile?: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const save = (field: keyof UpdateJobPayload) => (value: string) =>
    onUpdate(job.id, { [field]: value });

  const content = (
    <div className="bg-gray-50/50 p-4 md:p-5 w-full shadow-inner">
      <div className="mb-5 pb-5 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">สถานะการดำเนินงาน (Timeline)</p>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
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
            paymentTasks={job.paymentTasks}
            installationOrders={job.installationOrders}
            repairOrder={job.repairOrder}
            project={job.project}
            repairDeliveries={job.repairDeliveries}
          />
        </div>

        {job.deliveryMethod && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">ข้อมูลการจัดส่ง</p>
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

        <JobProcurementStatus customerName={job.customerName} projectName={job.project?.name} />
        {/* Production Status & QC */}
        <JobProductionStatus job={job} userRole={userRole} />

        {isManager && (
          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs text-brand-red font-bold flex items-center gap-1.5">
              <Wrench size={12} />
              แก้ไขสถานะแบบ Manual:
            </span>
            <select
              value={job.currentStep}
              onChange={(e) => onUpdate(job.id, { currentStep: e.target.value } as any)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red max-w-[250px]"
            >
              <option value={job.currentStep}>-- เลือกสถานะใหม่ --</option>
              {getSteps(job.jobType, job.flowVariant)?.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              )) || <option value={job.currentStep}>{job.currentStep}</option>}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm mb-4">
        <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">ข้อมูลงานเบื้องต้น</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
          {/* Row 1 */}
          <EditableField label="ชื่อลูกค้า" value={job.customerName} onSave={save("customerName")} />
          <EditableField label="บริษัท" value={job.companyCode} type="select" options={COMPANY_CODES} onSave={save("companyCode")} />
          <div>
            <p className="text-xs text-gray-400 mb-0.5">พนักงานขาย</p>
            <p className="text-sm text-gray-800">{job.sellerName || job.project?.contractSignatory || job.project?.manager?.fullName || <span className="text-gray-400 italic">—</span>}</p>
          </div>
          <EditableField label="ประเภทงาน" value={job.jobType} type="select" options={JOB_TYPES as unknown as string[]} onSave={save("jobType")} />

          {/* Row 2 */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">ใบเสนอราคา</p>
            <p className="text-sm text-gray-800">{job.quotationNumber || <span className="text-gray-400 italic">—</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">หมายเลข PO</p>
            <p className="text-sm text-gray-800">{job.poNumber || <span className="text-gray-400 italic">—</span>}</p>
          </div>
          <EditableField label="วันที่ปิดการขาย" value={new Date(job.dateClosed).toISOString().slice(0, 10)} type="date" onSave={save("dateClosed")} />
          <EditableField label="วันที่ต้องการจัดส่ง" value={job.deliveryDate ? new Date(job.deliveryDate).toISOString().slice(0, 10) : (job.project?.endDate ? new Date(job.project.endDate).toISOString().slice(0, 10) : (job.project?.deliveryDate ? new Date(job.project.deliveryDate).toISOString().slice(0, 10) : ""))} type="date" onSave={save("deliveryDate")} />

          {/* Row 3 */}
          <div className="sm:col-span-2">
            <EditableField label="รายการสินค้า" value={job.item ?? ""} onSave={save("item")} />
          </div>
          <EditableField label="รูปแบบการชำระเงิน" value={job.paymentMethod || (job.project?.installment1 || job.project?.installment2 || job.project?.installment3 || job.project?.installment4 ? "แบ่งชำระ" : "")} onSave={save("paymentMethod")} />
          <EditableField label="วันที่ชำระเงิน" value={job.paymentDate ? new Date(job.paymentDate).toISOString().slice(0, 10) : (job.project?.contractSigningDate ? new Date(job.project.contractSigningDate).toISOString().slice(0, 10) : (job.project?.paymentDate ? new Date(job.project.paymentDate).toISOString().slice(0, 10) : ""))} type="date" onSave={save("paymentDate")} />
        </div>
      </div>

      {isManager && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-red-500 font-bold hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={12} /> ลบงานนี้
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 mb-2">ยืนยันการลบงาน</h3>
            <p className="text-sm text-gray-500 mb-6">
              คุณต้องการลบงาน <span className="font-bold text-brand-red">{job.jobNumber}</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(job.id);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="animate-in slide-in-from-top-1 fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <tr className="animate-in slide-in-from-top-1 fade-in duration-200">
      <td colSpan={14} className="p-0 border-b border-gray-100">
        {content}
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
  targetJobId,
  initialSearch,
}: {
  jobs: Job[];
  isManager: boolean;
  currentUser: string;
  userDept: string;
  userRole: string;
  actionParam?: string;
  targetJobId?: string;
  initialSearch?: string;
}) {
  const router = useRouter();
  const [showQuickRepair, setShowQuickRepair] = useState(actionParam === "new-repair");
  const [quickRepairLoading, setQuickRepairLoading] = useState(false);
  const [showQuickProject, setShowQuickProject] = useState(false);
  const [quickProjectLoading, setQuickProjectLoading] = useState(false);

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
  const [expanded, setExpanded] = useState<string | null>(targetJobId || null);
  const [search, setSearch] = useState(initialSearch || "");
  const [filterCo, setFilterCo] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterDeptStatus, setFilterDeptStatus] = useState("");
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
    const isProject = roleLower.includes('project') || roleLower.includes('โปรเจค') || roleLower.includes('service engineer mgr') || d.includes('project') || d.includes('โปรเจค')

    const isDeliveryRole = roleLower.includes('delivery') || roleLower.includes('transport') || roleLower.includes('จัดส่ง') || roleLower.includes('ขนส่ง') || roleLower.includes('driver') || roleLower.includes('คนขับ')
    const isStoreRole = roleLower.includes('store') || roleLower.includes('warehouse') || roleLower.includes('สโตร์') || roleLower.includes('คลัง')

    if (isDeliveryRole) {
      depts.push("delivery")
    }
    if (isStoreRole || d.includes('store') || d.includes('สโตร์') || d.includes('คลัง')) {
      depts.push("store")
    }

    if (isSales) depts.push("sales")
    if (isAccounting) depts.push("accounting")
    if (isService) depts.push("service")
    if (isPurchase) depts.push("purchase")
    if (isProduction) depts.push("production")
    if (isProject) depts.push("project")

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

  const uniqueEmployees = useMemo(() => {
    const s = new Set(jobs.map((j) => j.sellerName).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [jobs]);

  // ── Filter ── 
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter((j) => {
      if (search && ![j.jobNumber, j.customerName, j.quotationNumber ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
      if (filterCo && j.companyCode !== filterCo) return false;
      if (filterType && j.jobType !== filterType) return false;
      if (filterEmployee && j.sellerName !== filterEmployee) return false;
      if (filterMonth === "custom") {
        if (filterStartDate) {
          const s = new Date(filterStartDate);
          s.setHours(0, 0, 0, 0);
          if (new Date(j.dateClosed) < s) return false;
        }
        if (filterEndDate) {
          const e = new Date(filterEndDate);
          e.setHours(23, 59, 59, 999);
          if (new Date(j.dateClosed) > e) return false;
        }
      } else if (filterMonth) {
        const [y, m] = filterMonth.split("-");
        if (j.yearBe !== +y || j.month !== +m) return false;
      }
      if (filterDeptStatus) {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs)) return false;
        const stepDef = getCurrentStepDef(j.jobType, j.currentStep, j.flowVariant, j.stepLogs);
        if (!stepDef?.department?.includes(filterDeptStatus as any)) return false;
      } else if (filterStatus === "pending") {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs)) return false;

        if (normalizedDept.includes("production")) {
          if (j.jobType === "งานตู้" || j.jobType === "งานตู้ + ติดตั้ง") {
            return true;
          }
        }

        const stepDef = getCurrentStepDef(j.jobType, j.currentStep, j.flowVariant, j.stepLogs);
        if (!stepDef?.department?.some(dept => normalizedDept.includes(dept))) return false;
      }
      return true;
    });
  }, [jobs, search, filterCo, filterType, filterEmployee, filterMonth, filterStartDate, filterEndDate, filterDeptStatus, filterStatus, normalizedDept]);

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
      return stepDef?.department?.some(dept => normalizedDept.includes(dept));
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
        router.push(`/jobs/${newJob.id}/manage-repair-order`);
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

  function QuickProjectModal() {
    const [customerName, setCustomerName] = useState("");
    const [item, setItem] = useState("");
    const [companyCode, setCompanyCode] = useState("TP");

    async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!customerName || !item) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      setQuickProjectLoading(true);
      try {
        const newJob = await createStandaloneJob({ customerName, item, companyCode, jobType: "งานโปรเจค" });
        setJobs(prev => [newJob as any, ...prev]);
        setShowQuickProject(false);
        router.push(`/projects`);
      } catch (err) {
        alert("เกิดข้อผิดพลาด");
      } finally {
        setQuickProjectLoading(false);
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-600" />
              สร้างงานโปรเจคด่วน (Quick Project)
            </h2>
            <button onClick={() => setShowQuickProject(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อลูกค้า / ชื่อโปรเจค</label>
              <input autoFocus required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียดงาน</label>
              <input required type="text" value={item} onChange={e => setItem(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">บริษัท</label>
              <select value={companyCode} onChange={e => setCompanyCode(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="TP">TP</option>
                <option value="TG">TG</option>
                <option value="TE">TE</option>
              </select>
            </div>
            <button disabled={quickProjectLoading} type="submit" className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center justify-center gap-2">
              {quickProjectLoading ? "กำลังสร้าง..." : "สร้างโปรเจค"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {showQuickRepair && <QuickRepairModal />}
      {showQuickProject && <QuickProjectModal />}

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
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <PushNotificationButton />
          {(normalizedDept.includes('project') || normalizedDept.includes('sales') || isManager) && (
            <button
              onClick={() => setShowQuickProject(true)}
              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
            >
              <FolderOpen size={14} />
              สร้างงานโปรเจค
            </button>
          )}
          {(normalizedDept.includes('service') || isManager) && (
            <button
              onClick={() => setShowQuickRepair(true)}
              className="px-4 py-2 bg-brand-red/10 text-brand-red hover:bg-brand-red/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Wrench size={14} />
              เปิดงานซ่อมด่วน
            </button>
          )}
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
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6">

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
            className="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          >
            <option value="">ทุกบริษัท</option>
            {COMPANY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          >
            <option value="">พนักงานขายทั้งหมด</option>
            {uniqueEmployees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          >
            <option value="">งานทุกประเภท</option>
            {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              if (e.target.value !== "custom") {
                setFilterStartDate("");
                setFilterEndDate("");
              }
            }}
            className="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          >
            <option value="">ทุกเดือน</option>
            <option value="custom">กำหนดเอง (ระบุช่วงวันที่)</option>
            {months.map((m) => {
              const [y, mo] = m.split("-");
              return <option key={m} value={m}>{MONTH_NAMES[+mo]} 25{y}</option>;
            })}
          </select>
          {filterMonth === "custom" && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
              <span className="text-gray-400 text-sm hidden sm:inline">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
            </div>
          )}
          <select
            value={filterDeptStatus}
            onChange={(e) => setFilterDeptStatus(e.target.value)}
            className="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          >
            <option value="">ทุกแผนก (รอทั้งหมด)</option>
            <option value="sales">รอ ฝ่ายขาย</option>
            <option value="store">รอ สโตร์</option>
            <option value="service">รอ ฝ่ายบริการ</option>
            <option value="purchase">รอ จัดซื้อ</option>
            <option value="accounting">รอ บัญชี</option>
            <option value="delivery">รอ จัดส่ง</option>
            <option value="production">รอ ผลิต</option>
            <option value="project">รอ โปรเจค</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "pending")}
            className="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอฉันดำเนินการ</option>
          </select>
          {(search || filterCo || filterType || filterEmployee || filterMonth || filterStartDate || filterEndDate || filterDeptStatus || filterStatus !== (normalizedDept.includes("sales") ? "all" : "pending")) && (
            <button
              onClick={() => { setSearch(""); setFilterCo(""); setFilterType(""); setFilterEmployee(""); setFilterMonth(""); setFilterStartDate(""); setFilterEndDate(""); setFilterDeptStatus(""); setFilterStatus(normalizedDept.includes("sales") ? "all" : "pending"); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
          <span className="w-full md:w-auto text-center md:ml-auto text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">{filtered.length} รายการ</span>
        </div>

        {/* Mobile View (Cards) */}
        <div className="block md:hidden space-y-4 pb-8">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 font-medium bg-white rounded-2xl border border-gray-100 shadow-sm">
              ไม่พบงานที่ตรงกับเงื่อนไข
            </div>
          )}
          {filtered.map((job) => {
            const isOpen = expanded === job.id;
            const derivedSellerName = job.sellerName || job.project?.contractSignatory || job.project?.manager?.fullName || "—";
            const hasInstallments = job.project?.installment1 || job.project?.installment2 || job.project?.installment3 || job.project?.installment4;
            const derivedPaymentMethod = job.paymentMethod || (hasInstallments ? "แบ่งชำระ" : "—");

            return (
              <React.Fragment key={`mobile-${job.id}`}>
                <div
                  onClick={() => setExpanded(isOpen ? null : job.id)}
                  className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer p-4 flex flex-col gap-3 transition-colors ${isOpen ? "ring-2 ring-brand-red/20 bg-red-50/10" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono font-black text-brand-red tracking-wide text-sm whitespace-nowrap">{job.jobNumber}</span>
                      <span className="text-[11px] font-bold text-gray-400">{formatDate(job.dateClosed)}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <CompanyBadge code={job.companyCode} />
                      {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 line-clamp-2">{job.customerName}</p>
                    </div>
                    {job.quotation?.company?.businessType && (
                      <span className="inline-block text-[8px] bg-slate-100 text-slate-500 border border-slate-200/50 px-1.5 py-0.5 rounded font-bold w-fit mt-0.5">
                        {job.quotation.company.businessType}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <JobTypeBadge type={job.jobType} />
                      {job.quotation?.orders?.[0] && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black tracking-widest uppercase ${job.quotation.orders[0].status === 'เสร็จสิ้น' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`} title={`QC: ${job.quotation.orders[0].qcStatus || 'PENDING'}`}>
                          <Wrench size={10} /> ผลิต: {job.quotation.orders[0].status || 'รอดำเนินการ'}
                        </div>
                      )}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border
                        ${isCompleted(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}
                      >
                        {isCompleted(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)
                          ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> เสร็จแล้ว</span>
                          : getCurrentStepDef(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)?.label ?? job.currentStep
                        }
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 my-3" />

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ยอดประเมิน</p>
                      <p className="text-xs font-black text-gray-800 font-mono">
                        {(job.quotation?.actualClosingAmount || job.quotation?.totalAmountBeforeVat) ?
                          `฿${(Number(job.quotation.actualClosingAmount) || Number(job.quotation.totalAmountBeforeVat) || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`
                          : "—"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                      <User2 size={10} className="text-gray-400 shrink-0" />
                      <span className="text-[9px] font-bold text-gray-600 truncate max-w-[70px]" title={derivedSellerName}>
                        {derivedSellerName.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100 text-[11px]">
                    <div>
                      <span className="text-gray-400 font-medium">ใบเสนอราคา:</span>
                      <p className="font-mono font-black text-gray-800">{job.quotationNumber ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">หมายเลข PO:</span>
                      <p className="font-mono font-black text-gray-600">{job.poNumber ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">การชำระเงิน:</span>
                      <p className="font-bold text-green-700">{derivedPaymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">การจัดส่ง:</span>
                      <p className="font-bold text-gray-700">{job.deliveryMethod === 'in-house' ? 'จัดส่งเอง' : job.deliveryMethod === 'courier' ? 'ขนส่งนอก' : '—'}</p>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4 p-2 sm:p-4">
                    <ExpandedRow
                      job={job}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      isManager={isManager}
                      userName={currentUser}
                      userDept={userDept}
                      userRole={userRole}
                      isMobile={true}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b border-gray-100">
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest w-12"></th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">รหัสงาน</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">บริษัท</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ประเภทงาน</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ยอดประเมิน</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ลูกค้า</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">วันปิดการขาย</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">การชำระเงิน</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">นัดหมาย</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">การจัดส่ง</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">ใบเสนอราคา</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">หมายเลข PO</th>
                <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">พนักงานขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center py-16 text-gray-400 font-medium">
                    ไม่พบงานที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
              {filtered.map((job) => {
                const isOpen = expanded === job.id;
                const derivedSellerName = job.sellerName || job.project?.contractSignatory || job.project?.manager?.fullName || "—";
                const derivedDeliveryDate = job.deliveryDate || job.project?.endDate || job.project?.deliveryDate;
                const derivedPaymentDate = job.paymentDate || job.project?.contractSigningDate || job.project?.paymentDate;
                const hasInstallments = job.project?.installment1 || job.project?.installment2 || job.project?.installment3 || job.project?.installment4;
                const derivedPaymentMethod = job.paymentMethod || (hasInstallments ? "แบ่งชำระ" : null);

                return (
                  <React.Fragment key={job.id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : job.id)}
                      className={`cursor-pointer transition-colors ${isOpen ? "bg-red-50/50" : "hover:bg-gray-50"} ${isPending ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-4 text-gray-400">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="px-5 py-4 font-mono font-black text-brand-red tracking-wide text-xs whitespace-nowrap">
                        {job.jobNumber}
                      </td>
                      <td className="px-5 py-4">
                        {getCurrentStepDef(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)?.department.includes("service") ? (
                          <div
                            className={`
                            inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer hover:shadow-md transition-all
                            ${isCompleted(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                              }
                          `}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/service/my-tasks");
                            }}
                          >
                            {isCompleted(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)
                              ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> เสร็จแล้ว</span>
                              : getCurrentStepDef(job.jobType, job.currentStep, job.flowVariant, job.stepLogs)?.label ?? job.currentStep
                            }
                          </div>
                        ) : (
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
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <CompanyBadge code={job.companyCode} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 w-32">
                          <JobTypeBadge type={job.jobType} />
                          {job.quotation?.orders?.[0] && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold w-fit ${job.quotation.orders[0].status === 'เสร็จสิ้น' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`} title={`QC: ${job.quotation.orders[0].qcStatus || 'PENDING'}`}>
                              <Wrench size={10} /> ผลิต: {job.quotation.orders[0].status || 'รอดำเนินการ'}
                            </div>
                          )}
                          {(job.jobType === 'Project' || job.jobType === 'งานโปรเจค') && (
                            job.project ? (
                              <a href={`/projects/${job.project.id}`} className="text-[10px] font-bold text-brand-red hover:underline flex items-center gap-1 w-fit">
                                <FolderOpen className="w-3 h-3" /> เปิดโครงการ
                              </a>
                            ) : (normalizedDept.includes('project') || isManager) ? (
                              <a href={`/projects/new?jobId=${job.id}`} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 w-fit">
                                <Plus className="w-3 h-3" /> สร้างโครงการ
                              </a>
                            ) : null
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono font-bold text-gray-700">
                          {(job.quotation?.actualClosingAmount || job.quotation?.totalAmountBeforeVat) ?
                            `฿${(Number(job.quotation.actualClosingAmount) || Number(job.quotation.totalAmountBeforeVat) || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 w-40">
                          <p className="text-xs font-bold text-gray-900 line-clamp-2" title={job.customerName}>{job.customerName}</p>
                          {job.quotation?.company?.businessType && (
                            <span className="text-[9px] font-bold text-gray-500 bg-gray-100 w-fit px-1.5 py-0.5 rounded">
                              {job.quotation.company.businessType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
                          {formatDate(job.dateClosed)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          {derivedPaymentMethod ? (
                            <span className="text-[10px] font-bold whitespace-nowrap bg-green-50 border border-green-100 text-green-700 px-2 py-0.5 rounded-md w-fit">
                              {derivedPaymentMethod}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                          {derivedPaymentDate && (
                            <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">
                              จ่าย: {new Date(derivedPaymentDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {derivedDeliveryDate && (
                            <span className="text-[10px] font-bold whitespace-nowrap bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-md" title="วันที่ต้องการ / จัดส่ง">
                              ต้องการ: {new Date(derivedDeliveryDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {job.installationOrders && job.installationOrders.length > 0 && job.installationOrders[0]?.plannedStartDate && (
                            <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md" title="แผนงาน Service">
                              แผน: {new Date(job.installationOrders[0].plannedStartDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {!derivedDeliveryDate && !(job.installationOrders && job.installationOrders.length > 0 && job.installationOrders[0]?.plannedStartDate) && (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          {job.deliveryMethod ? (
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md w-fit whitespace-nowrap">
                              {job.deliveryMethod === 'in-house' ? 'จัดส่งเอง' : 'ขนส่งเอกชน'}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                          {job.deliveryMethod === 'courier' && job.courierCompany && (
                            <span className="text-[9px] font-bold text-brand-red truncate max-w-[100px]" title={job.courierCompany}>
                              {job.courierCompany}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] font-black text-gray-800 hover:text-brand-red hover:underline transition-colors">
                        {job.quotationNumber ?? "—"}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] font-black text-gray-500">
                        {job.poNumber ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg w-fit">
                          <User2 size={10} className="text-gray-400 shrink-0" />
                          <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px]" title={derivedSellerName}>
                            {derivedSellerName.split(' ')[0]}
                          </span>
                        </div>
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
