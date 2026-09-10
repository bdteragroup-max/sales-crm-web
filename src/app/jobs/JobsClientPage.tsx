"use client";

import React, { useState, useMemo, useTransition, useEffect, useRef } from "react";
import {
  ClipboardList,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  X,
  Wrench,
  CheckCircle2,
  FolderOpen,
  Plus,
  Sparkles,
  User2,
  Clock,
  XCircle,
  Download,
  RotateCcw,
  Search,
  ChevronLeft,
  Building2,
  Layers,
  Calendar,
  ArrowUpDown,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
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
                {pr.purchaseOrders.map((po: any) => {
                  const isCancelled = po.receiveStatus === 'Cancelled';
                  const isReceived = po.receiveStatus === 'Received';
                  const chipClass = isCancelled
                    ? 'bg-red-50 border-red-200 text-red-700 line-through opacity-75'
                    : isReceived
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : 'bg-amber-50 border-amber-100 text-amber-700';
                  const statusText = isCancelled ? 'ยกเลิก' : (isReceived ? 'รับแล้ว' : 'รอรับ');
                  return (
                    <div key={po.id} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-medium ${chipClass}`}>
                      <span>{po.poNumber}</span>
                      <span className="text-gray-300">|</span>
                      <span>{statusText}</span>
                    </div>
                  );
                })}
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
  const [filterPo, setFilterPo] = useState("");
  const [isPending, startTransition] = useTransition();

  const isSuperAdmin = useMemo(() => {
    const roleLower = String(userRole || "").toLowerCase().trim();
    return (
      userRole === "SUPER_ADMIN" ||
      roleLower === "super_admin" ||
      roleLower === "super admin" ||
      roleLower.includes("super_admin") ||
      roleLower.includes("superadmin") ||
      roleLower === "admin" ||
      roleLower === "administrator" ||
      roleLower.includes("ผู้ดูแลระบบ") ||
      roleLower === "executive" ||
      roleLower === "ผู้บริหาร"
    );
  }, [userRole]);

  const normalizedDept = useMemo(() => {
    const roleLower = String(userRole || "").toLowerCase().trim();
    const d = userDept.toLowerCase().trim();

    if (isSuperAdmin) {
      return [
        "all",
        "sales",
        "accounting",
        "service",
        "purchase",
        "production",
        "project",
        "delivery",
        "store",
      ];
    }

    const depts: string[] = [];

    const isSales =
      roleLower.includes("sale") ||
      roleLower.includes("ขาย") ||
      roleLower.includes("เซล") ||
      roleLower.includes("marketing") ||
      d.includes("sale") ||
      d.includes("ขาย") ||
      d.includes("เซล") ||
      d.includes("marketing");
    const isAccounting =
      roleLower.includes("account") ||
      roleLower.includes("บัญชี") ||
      roleLower.includes("finance") ||
      d.includes("account") ||
      d.includes("บัญชี") ||
      d.includes("finance");
    const isService =
      roleLower.includes("service") ||
      roleLower.includes("ซ่อม") ||
      roleLower.includes("บริการ") ||
      d.includes("service") ||
      d.includes("ซ่อม") ||
      d.includes("บริการ");
    const isPurchase =
      roleLower.includes("purchase") ||
      roleLower.includes("จัดซื้อ") ||
      d.includes("purchase") ||
      d.includes("จัดซื้อ");
    const isProduction =
      roleLower.includes("production") ||
      roleLower.includes("ผลิต") ||
      d.includes("production") ||
      d.includes("ผลิต");
    const isProject =
      roleLower.includes("project") ||
      roleLower.includes("โปรเจค") ||
      roleLower.includes("service engineer mgr") ||
      d.includes("project") ||
      d.includes("โปรเจค");

    const isDeliveryRole =
      roleLower.includes("delivery") ||
      roleLower.includes("transport") ||
      roleLower.includes("จัดส่ง") ||
      roleLower.includes("ขนส่ง") ||
      roleLower.includes("driver") ||
      roleLower.includes("คนขับ");
    const isStoreRole =
      roleLower.includes("store") ||
      roleLower.includes("warehouse") ||
      roleLower.includes("สโตร์") ||
      roleLower.includes("คลัง");

    if (isDeliveryRole) depts.push("delivery");
    if (isStoreRole || d.includes("store") || d.includes("สโตร์") || d.includes("คลัง")) {
      depts.push("store");
    }

    if (isSales) depts.push("sales");
    if (isAccounting) depts.push("accounting");
    if (isService) depts.push("service");
    if (isPurchase) depts.push("purchase");
    if (isProduction) depts.push("production");
    if (isProject) depts.push("project");

    if (depts.length === 0) depts.push(d);
    return depts;
  }, [userDept, userRole, isSuperAdmin]);

  const [statusTab, setStatusTab] = useState<string>("all");

  const months = useMemo(() => {
    const s = new Set(
      jobs.map((j) => `${j.yearBe}-${String(j.month).padStart(2, "0")}`)
    );
    return Array.from(s).sort().reverse();
  }, [jobs]);

  const uniqueEmployees = useMemo(() => {
    const s = new Set<string>();
    jobs.forEach((j) => {
      const name = j.sellerName?.trim().replace(/\s+/g, " ");
      if (name) s.add(name);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "th"));
  }, [jobs]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = (now.getFullYear() + 543) % 100;
    return jobs.filter((j) => j.month === m && j.yearBe === y).length;
  }, [jobs]);

  const withPO = useMemo(
    () => jobs.filter((j) => Boolean(j.poNumber)).length,
    [jobs]
  );
  const withoutPO = useMemo(() => jobs.length - withPO, [jobs, withPO]);

  const pendingActionCount = useMemo(() => {
    return jobs.filter((j) => {
      if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs))
        return false;
      const stepDef = getCurrentStepDef(
        j.jobType,
        j.currentStep,
        j.flowVariant,
        j.stepLogs
      );
      return stepDef?.department?.some((dept) => normalizedDept.includes(dept));
    }).length;
  }, [jobs, normalizedDept]);

  const completedOverallCount = useMemo(() => {
    return jobs.filter((j) =>
      isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs)
    ).length;
  }, [jobs]);

  const inProgressCount = useMemo(() => {
    return Math.max(0, jobs.length - completedOverallCount);
  }, [jobs.length, completedOverallCount]);

  const waitingOtherCount = useMemo(() => {
    return Math.max(
      0,
      jobs.length - pendingActionCount - completedOverallCount
    );
  }, [jobs.length, pendingActionCount, completedOverallCount]);

  function handleUpdate(id: string, data: UpdateJobPayload) {
    startTransition(async () => {
      await updateJob(id, data);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? ({
                ...j,
                ...data,
                ...(data.dateClosed
                  ? { dateClosed: new Date(data.dateClosed) }
                  : {}),
              } as any)
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

  const exportToExcel = () => {
    const data = filtered.map((j) => {
      const val =
        Number(j.quotation?.actualClosingAmount) ||
        Number(j.quotation?.totalAmountBeforeVat) ||
        0;
      const stepDef = getCurrentStepDef(
        j.jobType,
        j.currentStep,
        j.flowVariant,
        j.stepLogs
      );
      const isDone = isCompleted(
        j.jobType,
        j.currentStep,
        j.flowVariant,
        j.stepLogs
      );

      return {
        "เลขที่งาน (Job No.)": j.jobNumber,
        "บริษัท": j.companyCode,
        "ชื่อลูกค้า": j.customerName,
        "รายการ/สินค้า": j.item || "-",
        "ประเภทงาน": j.jobType,
        "ขั้นตอนปัจจุบัน": isDone
          ? "เสร็จสมบูรณ์"
          : stepDef?.label || j.currentStep,
        "ยอดเงินประเมิน": val,
        "วันที่ปิดการขาย": formatDate(j.dateClosed),
        "ใบเสนอราคา": j.quotationNumber || "-",
        "เลขที่ PO": j.poNumber || "-",
        "เซลส์ผู้ดูแล": j.sellerName || "-",
        "การชำระเงิน": j.paymentMethod || "-",
        "รูปแบบการจัดส่ง":
          j.deliveryMethod === "in-house"
            ? "จัดส่งเอง"
            : j.deliveryMethod === "courier"
            ? "ขนส่งเอกชน"
            : "-",
        "วันที่ต้องการจัดส่ง": j.deliveryDate ? formatDate(j.deliveryDate) : "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs Directory");
    XLSX.writeFile(
      workbook,
      `Jobs_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  function QuickRepairModal() {
    const [customerName, setCustomerName] = useState("");
    const [item, setItem] = useState("");
    const [companyCode, setCompanyCode] = useState("TP");

    async function handleCreate(e: React.FormEvent) {
      e.preventDefault();
      if (!customerName || !item) {
        Swal.fire({
          icon: "warning",
          title: "ข้อมูลไม่ครบถ้วน",
          text: "กรุณาระบุชื่อลูกค้าและสินค้าที่จะซ่อม",
        });
        return;
      }
      setQuickRepairLoading(true);
      try {
        const newJob = await createStandaloneJob({
          customerName,
          item,
          companyCode,
          jobType: "งานซ่อม",
        });
        setJobs((prev) => [newJob as any, ...prev]);
        setShowQuickRepair(false);
        router.push(`/jobs/${newJob.id}/manage-repair-order`);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถสร้างใบรับซ่อมได้",
        });
      } finally {
        setQuickRepairLoading(false);
      }
    }

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Wrench size={16} />
              </div>
              ออกใบรับซ่อมด่วน (Quick Repair Order)
            </h2>
            <button
              onClick={() => setShowQuickRepair(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อลูกค้า / บริษัท
              </label>
              <input
                autoFocus
                required
                type="text"
                placeholder="เช่น บจก. เทรา กรุ๊ป"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                รายการ / สินค้าที่จะซ่อม
              </label>
              <input
                required
                type="text"
                placeholder="เช่น ซ่อมบอร์ดคอนโทรล หรือ มอเตอร์ขับเคลื่อน"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                บริษัท
              </label>
              <select
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white transition-all"
              >
                <option value="TP">TP (Tera Pack)</option>
                <option value="TG">TG (Tera Group)</option>
                <option value="TE">TE (Tera Express)</option>
              </select>
            </div>
            <div className="pt-2">
              <button
                disabled={quickRepairLoading}
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {quickRepairLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังสร้าง...</span>
                  </>
                ) : (
                  <>
                    <Wrench size={14} />
                    <span>สร้างใบรับซ่อมด่วน</span>
                  </>
                )}
              </button>
            </div>
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
      if (!customerName || !item) {
        Swal.fire({
          icon: "warning",
          title: "ข้อมูลไม่ครบถ้วน",
          text: "กรุณากรอกชื่อลูกค้าและรายละเอียดงาน",
        });
        return;
      }
      setQuickProjectLoading(true);
      try {
        const newJob = await createStandaloneJob({
          customerName,
          item,
          companyCode,
          jobType: "งานโปรเจค",
        });
        setJobs((prev) => [newJob as any, ...prev]);
        setShowQuickProject(false);
        router.push(`/projects`);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถสร้างโปรเจคได้",
        });
      } finally {
        setQuickProjectLoading(false);
      }
    }

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderOpen size={16} />
              </div>
              สร้างงานโปรเจคด่วน (Quick Project)
            </h2>
            <button
              onClick={() => setShowQuickProject(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อลูกค้า / ชื่อโปรเจค
              </label>
              <input
                autoFocus
                required
                type="text"
                placeholder="เช่น บจก. เทรา กรุ๊ป หรือ โครงการระบบสายพานลำเลียง"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                รายละเอียดงาน
              </label>
              <input
                required
                type="text"
                placeholder="เช่น ระบบจัดเรียงสินค้าอัตโนมัติ 1 ไลน์"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                บริษัท
              </label>
              <select
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              >
                <option value="TP">TP (Tera Pack)</option>
                <option value="TG">TG (Tera Group)</option>
                <option value="TE">TE (Tera Express)</option>
              </select>
            </div>
            <div className="pt-2">
              <button
                disabled={quickProjectLoading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {quickProjectLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังสร้าง...</span>
                  </>
                ) : (
                  <>
                    <FolderOpen size={14} />
                    <span>สร้างงานโปรเจค</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusTab === "this_month") {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = (now.getFullYear() + 543) % 100;
        if (j.month !== m || j.yearBe !== y) return false;
      } else if (statusTab === "in_progress") {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs))
          return false;
      } else if (statusTab === "with_po") {
        if (!j.poNumber) return false;
      } else if (statusTab === "without_po") {
        if (j.poNumber) return false;
      } else if (statusTab === "pending_action") {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs))
          return false;
        const stepDef = getCurrentStepDef(
          j.jobType,
          j.currentStep,
          j.flowVariant,
          j.stepLogs
        );
        if (
          !stepDef?.department?.some((dept) => normalizedDept.includes(dept))
        )
          return false;
      } else if (statusTab === "waiting_other") {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs))
          return false;
        const stepDef = getCurrentStepDef(
          j.jobType,
          j.currentStep,
          j.flowVariant,
          j.stepLogs
        );
        if (
          stepDef?.department?.some((dept) => normalizedDept.includes(dept))
        )
          return false;
      } else if (statusTab === "completed") {
        if (!isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs))
          return false;
      }

      if (filterCo && j.companyCode !== filterCo) return false;
      if (filterType && j.jobType !== filterType) return false;
      if (filterEmployee) {
        const jobSeller = (j.sellerName || "").trim().replace(/\s+/g, " ");
        const targetSeller = filterEmployee.trim().replace(/\s+/g, " ");
        if (jobSeller !== targetSeller) return false;
      }
      if (filterDeptStatus) {
        if (isCompleted(j.jobType, j.currentStep, j.flowVariant, j.stepLogs))
          return false;
        const stepDef = getCurrentStepDef(
          j.jobType,
          j.currentStep,
          j.flowVariant,
          j.stepLogs
        );
        if (!stepDef?.department.includes(filterDeptStatus as any)) return false;
      }
      if (filterPo === "with_po" && !j.poNumber) return false;
      if (filterPo === "without_po" && j.poNumber) return false;
      if (filterMonth === "custom") {
        const jobDate = new Date(j.dateClosed).getTime();
        if (filterStartDate && jobDate < new Date(filterStartDate).getTime())
          return false;
        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          if (jobDate > end.getTime()) return false;
        }
      } else if (filterMonth) {
        const [y, mo] = filterMonth.split("-");
        if (j.yearBe !== +y || j.month !== +mo) return false;
      }
      if (search) {
        const q = search.trim().replace(/\s+/g, " ").toLowerCase();
        const jn = j.jobNumber.toLowerCase();
        const cn = j.customerName.toLowerCase();
        const it = (j.item || "").toLowerCase();
        const qn = (j.quotationNumber || "").toLowerCase();
        const po = (j.poNumber || "").toLowerCase();
        const sn = (j.sellerName || "").trim().replace(/\s+/g, " ").toLowerCase();
        if (
          !jn.includes(q) &&
          !cn.includes(q) &&
          !it.includes(q) &&
          !qn.includes(q) &&
          !po.includes(q) &&
          !sn.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    jobs,
    statusTab,
    filterCo,
    filterType,
    filterEmployee,
    filterDeptStatus,
    filterPo,
    filterMonth,
    filterStartDate,
    filterEndDate,
    search,
    normalizedDept,
  ]);

  type SortField = "dateClosed" | "jobNumber" | "customerName" | "amount";
  const [sortField, setSortField] = useState<SortField>("dateClosed");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const sortedJobs = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "dateClosed") {
        cmp =
          new Date(a.dateClosed).getTime() - new Date(b.dateClosed).getTime();
      } else if (sortField === "jobNumber") {
        cmp = a.jobNumber.localeCompare(b.jobNumber);
      } else if (sortField === "customerName") {
        cmp = a.customerName.localeCompare(b.customerName);
      } else if (sortField === "amount") {
        const valA =
          Number(a.quotation?.actualClosingAmount) ||
          Number(a.quotation?.totalAmountBeforeVat) ||
          0;
        const valB =
          Number(b.quotation?.actualClosingAmount) ||
          Number(b.quotation?.totalAmountBeforeVat) ||
          0;
        cmp = valA - valB;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedJobs.length / pageSize) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedJobs.slice(start, start + pageSize);
  }, [sortedJobs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    statusTab,
    filterCo,
    filterType,
    filterEmployee,
    filterMonth,
    filterStartDate,
    filterEndDate,
    filterDeptStatus,
    filterPo,
    search,
  ]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const formatCurrency = (val: number) => {
    return `฿${val.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  };

  const isFiltered = Boolean(
    statusTab !== "all" ||
      filterCo ||
      filterType ||
      filterEmployee ||
      filterMonth ||
      filterStartDate ||
      filterEndDate ||
      filterDeptStatus ||
      filterPo ||
      search
  );

  const resetFilters = () => {
    setStatusTab("all");
    setFilterCo("");
    setFilterType("");
    setFilterEmployee("");
    setFilterMonth("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterDeptStatus("");
    setFilterPo("");
    setSearch("");
    setCurrentPage(1);
  };

  const isSalesUser = normalizedDept.includes("sales");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {showQuickRepair && <QuickRepairModal />}
      {showQuickProject && <QuickProjectModal />}

      {/* ── 1. Top Header & Navigation Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <ClipboardList className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-medium">ทะเบียนงาน (Jobs)</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">
              ภาพรวมและการติดตามสถานะงาน
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <User2 size={11} className="text-slate-500" />
              <span>
                {isSuperAdmin
                  ? "ผู้ดูแลระบบ (SUPER ADMIN - ทุกงานในระบบ)"
                  : isManager
                  ? "ผู้บริหาร (ทุกงานในระบบ)"
                  : `พนักงาน: ${currentUser}`}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                ระบบติดตามสถานะงาน{" "}
                <span className="text-slate-400 font-medium text-base sm:text-lg">
                  (Jobs Directory)
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ติดตามสถานะงาน วงจรการผลิต-จัดส่ง แผนกที่รอรับผิดชอบ และความคืบหน้ารายโครงการ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 lg:justify-end shrink-0 pt-2 lg:pt-0">
          {(normalizedDept.includes("project") ||
            normalizedDept.includes("sales") ||
            isManager) && (
            <button
              onClick={() => setShowQuickProject(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
            >
              <FolderOpen size={14} />
              <span>สร้างงานโปรเจค</span>
            </button>
          )}

          {(normalizedDept.includes("service") || isManager) && (
            <button
              onClick={() => setShowQuickRepair(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-all shadow-xs shrink-0"
            >
              <Wrench size={14} />
              <span>เปิดงานซ่อมด่วน</span>
            </button>
          )}

          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <PushNotificationButton className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0" />

          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusTab("all")}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
            statusTab === "all"
              ? "border-blue-400 ring-2 ring-blue-100"
              : "border-slate-200/80 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              งานทั้งหมดในระบบ
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {jobs.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
        </div>

        {isSalesUser ? (
          <>
            <div
              onClick={() =>
                setStatusTab(statusTab === "this_month" ? "all" : "this_month")
              }
              className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
                statusTab === "this_month"
                  ? "border-sky-400 ring-2 ring-sky-100"
                  : "border-slate-200/80 hover:border-sky-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                  งานประจำเดือนนี้
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {thisMonthCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">รายการ</span>
              </div>
            </div>

            <div
              onClick={() =>
                setStatusTab(statusTab === "in_progress" ? "all" : "in_progress")
              }
              className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
                statusTab === "in_progress"
                  ? "border-amber-400 ring-2 ring-amber-100"
                  : "border-slate-200/80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  กำลังดำเนินการ
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">
                  {inProgressCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">รายการ</span>
              </div>
            </div>

            <div
              onClick={() =>
                setStatusTab(statusTab === "completed" ? "all" : "completed")
              }
              className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
                statusTab === "completed"
                  ? "border-emerald-400 ring-2 ring-emerald-100"
                  : "border-slate-200/80 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  เสร็จสมบูรณ์แล้ว
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">
                  {completedOverallCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">รายการ</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              onClick={() =>
                setStatusTab(
                  statusTab === "pending_action" ? "all" : "pending_action"
                )
              }
              className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
                statusTab === "pending_action"
                  ? "border-amber-400 ring-2 ring-amber-100"
                  : "border-slate-200/80 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  รอแผนกฉันดำเนินการ
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">
                  {pendingActionCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">งาน</span>
              </div>
            </div>

            <div
              onClick={() =>
                setStatusTab(
                  statusTab === "waiting_other" ? "all" : "waiting_other"
                )
              }
              className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
                statusTab === "waiting_other"
                  ? "border-sky-400 ring-2 ring-sky-100"
                  : "border-slate-200/80 hover:border-sky-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                  รอแผนกอื่นดำเนินการ
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Layers size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {waitingOtherCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">งาน</span>
              </div>
            </div>

            <div
              onClick={() =>
                setStatusTab(statusTab === "completed" ? "all" : "completed")
              }
              className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all hover:shadow-md ${
                statusTab === "completed"
                  ? "border-emerald-400 ring-2 ring-emerald-100"
                  : "border-slate-200/80 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  เสร็จสมบูรณ์แล้ว
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">
                  {completedOverallCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">งาน</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 w-fit">
            <button
              onClick={() => setFilterCo("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterCo === ""
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              ทั้งหมด ({jobs.length})
            </button>
            {COMPANY_CODES.map((code) => {
              const count = jobs.filter((j) => j.companyCode === code).length;
              return (
                <button
                  key={code}
                  onClick={() => setFilterCo(filterCo === code ? "" : code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterCo === code
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {code} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่งาน, ชื่อลูกค้า, สินค้า, PO, ผู้ดูแล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <span>ตัวกรอง:</span>
          </div>

          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">พนักงานขายทั้งหมด</option>
            {uniqueEmployees.map((emp) => (
              <option key={emp} value={emp}>
                {emp}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">ประเภทงานทั้งหมด</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
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
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">ทุกช่วงเวลา</option>
            <option value="custom">ระบุช่วงวันที่...</option>
            {months.map((m) => {
              const [y, mo] = m.split("-");
              return (
                <option key={m} value={m}>
                  {MONTH_NAMES[+mo]} 25{y}
                </option>
              );
            })}
          </select>

          {filterMonth === "custom" && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="text-xs bg-transparent text-slate-700 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="text-xs bg-transparent text-slate-700 focus:outline-none"
              />
            </div>
          )}

          <select
            value={filterDeptStatus}
            onChange={(e) => setFilterDeptStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">ทุกแผนกที่รับผิดชอบ</option>
            <option value="sales">ฝ่ายขาย (Sales)</option>
            <option value="store">คลังสินค้า (Store)</option>
            <option value="service">ฝ่ายบริการ (Service)</option>
            <option value="purchase">จัดซื้อ (Purchase)</option>
            <option value="accounting">บัญชี (Accounting)</option>
            <option value="delivery">จัดส่ง (Delivery)</option>
            <option value="production">ฝ่ายผลิต (Production)</option>
            <option value="project">โปรเจค (Project)</option>
          </select>

          <select
            value={filterPo}
            onChange={(e) => setFilterPo(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">สถานะ PO ทั้งหมด</option>
            <option value="with_po">มีเลข PO แล้ว ({withPO})</option>
            <option value="without_po">ยังไม่มี PO ({withoutPO})</option>
          </select>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors ml-auto flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}

          <span className="text-xs font-semibold text-slate-500 ml-auto bg-slate-100 px-2.5 py-1 rounded-lg">
            พบ {filtered.length} รายการ
          </span>
        </div>
      </div>

      <div className="block md:hidden space-y-3">
        {paginatedJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6 text-slate-400 text-sm">
            ไม่พบงานที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          paginatedJobs.map((job) => {
            const isOpen = expanded === job.id;
            const derivedSellerName =
              job.sellerName ||
              job.project?.contractSignatory ||
              job.project?.manager?.fullName ||
              "—";
            const val =
              Number(job.quotation?.actualClosingAmount) ||
              Number(job.quotation?.totalAmountBeforeVat) ||
              0;
            const isDone = isCompleted(
              job.jobType,
              job.currentStep,
              job.flowVariant,
              job.stepLogs
            );
            const stepDef = getCurrentStepDef(
              job.jobType,
              job.currentStep,
              job.flowVariant,
              job.stepLogs
            );

            return (
              <div
                key={`mob-${job.id}`}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                <div
                  onClick={() => setExpanded(isOpen ? null : job.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50/60 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CompanyBadge code={job.companyCode} />
                      <span className="font-mono font-bold text-sm text-blue-700">
                        {job.jobNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700">
                        {val > 0 ? formatCurrency(val) : "—"}
                      </span>
                      {isOpen ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {job.customerName}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {job.item || "-"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <JobTypeBadge type={job.jobType} />
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isDone
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 size={10} />
                            <span>เสร็จแล้ว</span>
                          </>
                        ) : (
                          <span>{stepDef?.label || job.currentStep}</span>
                        )}
                      </span>
                    </div>
                    <span className="text-[11px]">
                      {formatDate(job.dateClosed)}
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100">
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
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center"></th>
                <th
                  onClick={() => handleSort("jobNumber")}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>เลขที่งาน</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">สถานะ & ขั้นตอน</th>
                <th className="py-3.5 px-4">บริษัท</th>
                <th className="py-3.5 px-4">ประเภทงาน</th>
                <th
                  onClick={() => handleSort("customerName")}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ลูกค้า & รายละเอียด</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ยอดประเมิน</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dateClosed")}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>วันปิดการขาย</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">การชำระ & นัดส่ง</th>
                <th className="py-3.5 px-4">ผู้ดูแล</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedJobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    ไม่พบรายการงานที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => {
                  const isOpen = expanded === job.id;
                  const derivedSellerName =
                    job.sellerName ||
                    job.project?.contractSignatory ||
                    job.project?.manager?.fullName ||
                    "—";
                  const derivedDeliveryDate =
                    job.deliveryDate ||
                    job.project?.endDate ||
                    job.project?.deliveryDate;
                  const hasInstallments =
                    job.project?.installment1 ||
                    job.project?.installment2 ||
                    job.project?.installment3 ||
                    job.project?.installment4;
                  const derivedPaymentMethod =
                    job.paymentMethod ||
                    (hasInstallments ? "แบ่งชำระ" : null);
                  const val =
                    Number(job.quotation?.actualClosingAmount) ||
                    Number(job.quotation?.totalAmountBeforeVat) ||
                    0;
                  const isDone = isCompleted(
                    job.jobType,
                    job.currentStep,
                    job.flowVariant,
                    job.stepLogs
                  );
                  const stepDef = getCurrentStepDef(
                    job.jobType,
                    job.currentStep,
                    job.flowVariant,
                    job.stepLogs
                  );

                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : job.id)}
                        className={`cursor-pointer transition-colors ${
                          isOpen
                            ? "bg-blue-50/40"
                            : "hover:bg-slate-50/80 bg-white"
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {isOpen ? (
                            <ChevronDown size={16} className="text-blue-600" />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-700 tracking-wide text-xs">
                            {job.jobNumber}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${
                              isDone
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>เสร็จสมบูรณ์</span>
                              </>
                            ) : (
                              <span>{stepDef?.label || job.currentStep}</span>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CompanyBadge code={job.companyCode} />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <JobTypeBadge type={job.jobType} />
                            {(job.jobType === "Project" ||
                              job.jobType === "งานโปรเจค") &&
                              (job.project ? (
                                <a
                                  href={`/projects/${job.project.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <FolderOpen size={11} />
                                  <span>เปิดโปรเจค</span>
                                </a>
                              ) : (
                                (normalizedDept.includes("project") ||
                                  isManager) && (
                                  <a
                                    href={`/projects/new?jobId=${job.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                                  >
                                    <Plus size={11} />
                                    <span>สร้างโปรเจค</span>
                                  </a>
                                )
                              ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-col">
                            <span
                              className="font-bold text-slate-900 truncate"
                              title={job.customerName}
                            >
                              {job.customerName}
                            </span>
                            <span
                              className="text-[11px] text-slate-500 truncate"
                              title={job.item ?? ""}
                            >
                              {job.item || "-"}
                            </span>
                          </div>
                        </td>

                        {/* Estimated Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                          {val > 0 ? formatCurrency(val) : "—"}
                        </td>

                        {/* Date Closed */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                          {formatDate(job.dateClosed)}
                        </td>

                        {/* Payment & Schedule */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {derivedPaymentMethod ? (
                              <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md w-fit">
                                {derivedPaymentMethod}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                            {derivedDeliveryDate && (
                              <span className="text-[10px] font-medium text-slate-500">
                                ส่ง: {formatDate(derivedDeliveryDate)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Seller */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-lg w-fit">
                            <User2 size={11} className="text-slate-400 shrink-0" />
                            <span
                              className="text-[11px] font-semibold text-slate-700 truncate max-w-[85px]"
                              title={derivedSellerName}
                            >
                              {derivedSellerName.split(" ")[0]}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ── */}
        {sortedJobs.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              หน้า <span className="font-semibold text-slate-800">{currentPage}</span> จาก{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span> (ทั้งหมด{" "}
              {sortedJobs.length} งาน)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>
              <div className="text-xs font-bold px-2 text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
