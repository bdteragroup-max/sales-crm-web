"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calendar,
  FileText,
  DollarSign,
  FolderOpen,
  MapPin,
  Search,
  Check,
  Clock,
  ShieldCheck,
  Briefcase,
  Building2,
  ExternalLink,
  ChevronRight,
  Pencil,
  Eye,
  Loader2,
  Users,
  CheckCircle2,
  Layers,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { updateProject } from "@/app/actions/projects";
import SolarChecklist from "../../components/SolarChecklist";
import DynamicInstallmentsBuilder, {
  InstallmentItem,
  DepositConfig,
} from "../../components/DynamicInstallmentsBuilder";
import SearchableTeamSelect from "../../components/SearchableTeamSelect";

interface EditProjectClientProps {
  users: any[];
  jobs: any[];
  currentUserId: string;
  project: any;
  currentUserRole?: string;
}

export default function EditProjectClient({
  users,
  jobs,
  currentUserId,
  project,
  currentUserRole,
}: EditProjectClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize deposit from project.installmentsData?.deposit or project.firstPayment
  const initialDeposit: DepositConfig = useMemo(() => {
    const rawData = project.installmentsData;
    const pv = Number(project.projectValue) || 0;

    // 1. Structured object format
    if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
      if (rawData.hasDeposit && rawData.deposit) {
        const dep = rawData.deposit;
        return {
          hasDeposit: true,
          amount:
            dep.amount !== undefined && dep.amount !== null
              ? String(dep.amount)
              : "",
          percent:
            dep.percent !== undefined && dep.percent !== null
              ? String(dep.percent)
              : pv > 0 && dep.amount
              ? ((Number(dep.amount) / pv) * 100).toFixed(2)
              : "",
          dueDate: dep.dueDate
            ? new Date(dep.dueDate).toISOString().split("T")[0]
            : "",
          title: dep.title || "เงินมัดจำเมื่อเซ็นสัญญา",
        };
      } else if (rawData.hasDeposit === false) {
        return {
          hasDeposit: false,
          amount: "",
          percent: "",
          dueDate: "",
          title: "เงินมัดจำเมื่อเซ็นสัญญา",
        };
      }
    }

    // 2. Fallback to project.firstPayment if present and > 0
    if (
      project.firstPayment !== undefined &&
      project.firstPayment !== null &&
      Number(project.firstPayment) > 0
    ) {
      const depAmt = Number(project.firstPayment);
      return {
        hasDeposit: true,
        amount: String(depAmt),
        percent: pv > 0 ? ((depAmt / pv) * 100).toFixed(2) : "",
        dueDate: project.paymentDate
          ? new Date(project.paymentDate).toISOString().split("T")[0]
          : "",
        title: "เงินมัดจำเมื่อเซ็นสัญญา",
      };
    }

    return {
      hasDeposit: false,
      amount: "",
      percent: "",
      dueDate: "",
      title: "เงินมัดจำเมื่อเซ็นสัญญา",
    };
  }, [project]);

  const [deposit, setDeposit] = useState<DepositConfig>(initialDeposit);

  // Initialize progress installments from project.installmentsData or fallback to installment1..12
  const initialInstallments: InstallmentItem[] = useMemo(() => {
    const rawData = project.installmentsData;
    const pv = Number(project.projectValue) || 0;

    let items: any[] = [];
    if (
      rawData &&
      typeof rawData === "object" &&
      !Array.isArray(rawData) &&
      Array.isArray(rawData.installments)
    ) {
      items = rawData.installments;
    } else if (Array.isArray(rawData) && rawData.length > 0) {
      items = rawData;
    }

    if (items.length > 0) {
      return items.map((inst: any, idx: number) => ({
        id: `inst-${idx + 1}`,
        no: idx + 1,
        title: inst.title || `งวดที่ ${idx + 1}`,
        amount:
          inst.amount !== undefined && inst.amount !== null
            ? String(inst.amount)
            : "",
        percent:
          inst.percent !== undefined && inst.percent !== null
            ? String(inst.percent)
            : pv > 0 && inst.amount
            ? ((Number(inst.amount) / pv) * 100).toFixed(2)
            : "",
        dueDate: inst.dueDate
          ? new Date(inst.dueDate).toISOString().split("T")[0]
          : "",
      }));
    }

    // Legacy columns installment1..12
    const list: InstallmentItem[] = [];
    for (let i = 1; i <= 12; i++) {
      const val = project[`installment${i}`];
      if (
        val !== undefined &&
        val !== null &&
        String(val).trim() !== "" &&
        Number(val) > 0
      ) {
        list.push({
          id: `inst-${i}`,
          no: i,
          title: `งวดที่ ${i}`,
          amount: String(val),
          percent: pv > 0 ? ((Number(val) / pv) * 100).toFixed(2) : "",
          dueDate: "",
        });
      }
    }

    if (list.length > 0) return list;

    return [
      {
        id: "inst-1",
        no: 1,
        title: "ส่งมอบอุปกรณ์ / ดำเนินการขั้นที่ 1",
        amount: "",
        percent: "",
        dueDate: "",
      },
      {
        id: "inst-2",
        no: 2,
        title: "ติดตั้งโครงสร้างและอุปกรณ์",
        amount: "",
        percent: "",
        dueDate: "",
      },
      {
        id: "inst-3",
        no: 3,
        title: "ทดสอบระบบ (Commissioning)",
        amount: "",
        percent: "",
        dueDate: "",
      },
      {
        id: "inst-4",
        no: 4,
        title: "ส่งมอบงานขั้นสุดท้าย",
        amount: "",
        percent: "",
        dueDate: "",
      },
    ];
  }, [project]);

  const [installments, setInstallments] =
    useState<InstallmentItem[]>(initialInstallments);

  const [formData, setFormData] = useState({
    // Basic Info
    name: project.name || "",
    description: project.description || project.job?.item || "",
    clientName: project.clientName || project.job?.customerName || "",
    projectCategory: project.projectCategory || project.job?.jobType || "",
    department: project.department || "วิศวกรรม",
    province: project.province || "",
    district: project.district || "",
    siteAddress: project.siteAddress || "",
    managerId: project.managerId || currentUserId,
    jobId: project.jobId || "",

    // Timeline
    startDate: project.startDate
      ? new Date(project.startDate).toISOString().split("T")[0]
      : "",
    endDate: project.endDate
      ? new Date(project.endDate).toISOString().split("T")[0]
      : "",
    projectDuration: project.projectDuration?.toString() || "",
    projectDurationUnit: project.projectDurationUnit || "วัน",
    deliveryDate: project.deliveryDate
      ? new Date(project.deliveryDate).toISOString().split("T")[0]
      : project.job?.deliveryDate
      ? new Date(project.job.deliveryDate).toISOString().split("T")[0]
      : "",

    // Contract & Financial
    contractNumber: project.contractNumber || "",
    contractSignatory: project.contractSignatory || "",
    contractSigningDate: project.contractSigningDate
      ? new Date(project.contractSigningDate).toISOString().split("T")[0]
      : "",
    contractReturnStatus: project.contractReturnStatus || "",
    projectValue: project.projectValue?.toString() || "",
    securityDeposit: project.securityDeposit?.toString() || "",
    depositCollectionSchedule: project.depositCollectionSchedule
      ? new Date(project.depositCollectionSchedule).toISOString().split("T")[0]
      : "",
    depositRefundRequestNo: project.depositRefundRequestNo || "",
    penaltyPerDay: project.penaltyPerDay?.toString() || "",
    amountIncludingVat: project.amountIncludingVat?.toString() || "",
    budget: project.budget?.toString() || "",

    // Installments & Payments
    installment1: project.installment1?.toString() || "",
    installment2: project.installment2?.toString() || "",
    installment3: project.installment3?.toString() || "",
    installment4: project.installment4?.toString() || "",
    firstPayment: project.firstPayment?.toString() || "",
    secondPayment: project.secondPayment?.toString() || "",
    paymentDate: project.paymentDate
      ? new Date(project.paymentDate).toISOString().split("T")[0]
      : "",

    // Documents
    documentNumber: project.documentNumber || "",
    deliveryDocNumber: project.deliveryDocNumber || "",
    jbNumber: project.jbNumber || project.job?.jobNumber || "",
    certCompletionRequestNo: project.certCompletionRequestNo || "",
    certRequestStatus: project.certRequestStatus || "",
    pathFolder: project.pathFolder || "",
    statusPictureUrl: project.statusPictureUrl || "",
    updateCompanyProfile: project.updateCompanyProfile || false,

    externalTechnicians: project.externalTechnicians || "",

    // Solar Checklist
    siteCheckInTime: project.siteCheckInTime
      ? new Date(project.siteCheckInTime).toISOString().split("T")[0] +
        "T" +
        new Date(project.siteCheckInTime).toISOString().split("T")[1].slice(0, 5)
      : "",
    siteTeamMembers: project.siteTeamMembers || "",
    siteSupervisor: project.siteSupervisor || "",
    preChecklist: project.preChecklist || {},
    photoChecklist: project.photoChecklist || {},
    checklistImages: project.checklistImages || {},
    isHighVoltage: project.isHighVoltage || false,
    hvChecklist: project.hvChecklist || {},
    siteCheckOutTime: project.siteCheckOutTime
      ? new Date(project.siteCheckOutTime).toISOString().split("T")[0] +
        "T" +
        new Date(project.siteCheckOutTime).toISOString().split("T")[1].slice(0, 5)
      : "",
    workSummary: project.workSummary || [],
    siteProblems: project.siteProblems || [],
    remainingWork: project.remainingWork || "",
    supervisorSignUrl: project.supervisorSignUrl || null,
    customerSignUrl: project.customerSignUrl || null,
  });

  // Section 2: Team (Pre-populate from project.members if available)
  const [engineers, setEngineers] = useState<string[]>(() => {
    return (project.members || [])
      .filter(
        (m: any) =>
          m.role?.toLowerCase() === "engineer" ||
          m.role?.toLowerCase() === "วิศวกร"
      )
      .map((m: any) => m.userId);
  });
  const [admins, setAdmins] = useState<string[]>(() => {
    return (project.members || [])
      .filter(
        (m: any) =>
          m.role?.toLowerCase() === "admin" ||
          m.role?.toLowerCase() === "ผู้ดูแล"
      )
      .map((m: any) => m.userId);
  });

  // Section 3: Tasks (Pre-populate from project.tasks)
  const [tasks, setTasks] = useState<any[]>(() => {
    return (project.tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title || "",
      category: t.category || "",
      assigneeId: t.assigneeId || "",
      planStart: t.planStart
        ? new Date(t.planStart).toISOString().split("T")[0]
        : "",
      planEnd: t.planEnd
        ? new Date(t.planEnd).toISOString().split("T")[0]
        : "",
      weight: t.weight || 1,
    }));
  });

  // Auto-calculate project duration in days if both dates are set
  useEffect(() => {
    if (
      formData.startDate &&
      formData.endDate &&
      formData.projectDurationUnit === "วัน"
    ) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime >= 0) {
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setFormData((prev) => ({
          ...prev,
          projectDuration: diffDays.toString(),
        }));
      }
    }
  }, [formData.startDate, formData.endDate, formData.projectDurationUnit]);

  const handleAddTask = () => {
    setTasks([
      ...tasks,
      {
        title: "",
        category: "",
        assigneeId: "",
        planStart: "",
        planEnd: "",
        weight: 1,
      },
    ]);
  };

  const handleTaskChange = (index: number, field: string, value: any) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleRemoveTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      return alert("กรุณากรอกชื่อโครงการ (Project Name is required)");
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        return alert(
          "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม (End Date cannot be before Start Date)"
        );
      }
    }

    setIsSubmitting(true);
    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        clientName: formData.clientName,
        projectCategory: formData.projectCategory || undefined,
        department: formData.department || undefined,
        province: formData.province || undefined,
        district: formData.district || undefined,
        siteAddress: formData.siteAddress,
        managerId: formData.managerId,
        jobId: formData.jobId || undefined,

        // Timeline
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        projectDuration: formData.projectDuration
          ? parseInt(formData.projectDuration)
          : undefined,
        projectDurationUnit: formData.projectDurationUnit,
        deliveryDate: formData.deliveryDate
          ? new Date(formData.deliveryDate)
          : undefined,

        // Contract
        contractNumber: formData.contractNumber || undefined,
        contractSignatory: formData.contractSignatory || undefined,
        contractSigningDate: formData.contractSigningDate
          ? new Date(formData.contractSigningDate)
          : undefined,
        contractReturnStatus: formData.contractReturnStatus || undefined,

        // Financials
        projectValue: formData.projectValue
          ? parseFloat(formData.projectValue)
          : undefined,
        securityDeposit: formData.securityDeposit
          ? parseFloat(formData.securityDeposit)
          : undefined,
        depositCollectionSchedule: formData.depositCollectionSchedule
          ? new Date(formData.depositCollectionSchedule)
          : undefined,
        depositRefundRequestNo: formData.depositRefundRequestNo || undefined,
        penaltyPerDay: formData.penaltyPerDay
          ? parseFloat(formData.penaltyPerDay)
          : undefined,
        amountIncludingVat: formData.amountIncludingVat
          ? parseFloat(formData.amountIncludingVat)
          : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,

        // Dynamic Installments & Payments
        installmentsData: {
          hasDeposit: deposit.hasDeposit,
          deposit:
            deposit.hasDeposit && Number(deposit.amount) > 0
              ? {
                  amount: parseFloat(deposit.amount),
                  percent: deposit.percent
                    ? parseFloat(deposit.percent)
                    : undefined,
                  dueDate: deposit.dueDate
                    ? new Date(deposit.dueDate).toISOString()
                    : undefined,
                  title: deposit.title || "เงินมัดจำเมื่อเซ็นสัญญา",
                }
              : null,
          installments: installments
            .map((inst, idx) => ({
              no: idx + 1,
              title: inst.title || `งวดที่ ${idx + 1}`,
              amount: inst.amount ? parseFloat(inst.amount) : 0,
              percent: inst.percent ? parseFloat(inst.percent) : undefined,
              dueDate: inst.dueDate
                ? new Date(inst.dueDate).toISOString()
                : undefined,
            }))
            .filter((inst) => inst.amount > 0),
        },
        installment1: installments[0]?.amount
          ? parseFloat(installments[0].amount)
          : null,
        installment2: installments[1]?.amount
          ? parseFloat(installments[1].amount)
          : null,
        installment3: installments[2]?.amount
          ? parseFloat(installments[2].amount)
          : null,
        installment4: installments[3]?.amount
          ? parseFloat(installments[3].amount)
          : null,
        installment5: installments[4]?.amount
          ? parseFloat(installments[4].amount)
          : null,
        installment6: installments[5]?.amount
          ? parseFloat(installments[5].amount)
          : null,
        installment7: installments[6]?.amount
          ? parseFloat(installments[6].amount)
          : null,
        installment8: installments[7]?.amount
          ? parseFloat(installments[7].amount)
          : null,
        installment9: installments[8]?.amount
          ? parseFloat(installments[8].amount)
          : null,
        installment10: installments[9]?.amount
          ? parseFloat(installments[9].amount)
          : null,
        installment11: installments[10]?.amount
          ? parseFloat(installments[10].amount)
          : null,
        installment12: installments[11]?.amount
          ? parseFloat(installments[11].amount)
          : null,
        firstPayment:
          deposit.hasDeposit && Number(deposit.amount) > 0
            ? parseFloat(deposit.amount)
            : formData.firstPayment
            ? parseFloat(formData.firstPayment)
            : null,
        secondPayment: formData.secondPayment
          ? parseFloat(formData.secondPayment)
          : undefined,
        paymentDate:
          deposit.hasDeposit && deposit.dueDate
            ? new Date(deposit.dueDate)
            : formData.paymentDate
            ? new Date(formData.paymentDate)
            : undefined,

        // Docs
        documentNumber: formData.documentNumber || undefined,
        deliveryDocNumber: formData.deliveryDocNumber || undefined,
        jbNumber: formData.jbNumber || undefined,
        certCompletionRequestNo: formData.certCompletionRequestNo || undefined,
        certRequestStatus: formData.certRequestStatus || undefined,
        pathFolder: formData.pathFolder || undefined,
        statusPictureUrl: formData.statusPictureUrl || undefined,
        updateCompanyProfile: formData.updateCompanyProfile,
        externalTechnicians: formData.externalTechnicians || undefined,

        // Solar Checklist
        siteCheckInTime: formData.siteCheckInTime
          ? new Date(formData.siteCheckInTime)
          : undefined,
        siteTeamMembers: formData.siteTeamMembers || undefined,
        siteSupervisor: formData.siteSupervisor || undefined,
        preChecklist: formData.preChecklist || undefined,
        photoChecklist: formData.photoChecklist || undefined,
        checklistImages: formData.checklistImages || undefined,
        isHighVoltage: formData.isHighVoltage || false,
        hvChecklist: formData.hvChecklist || undefined,
        siteCheckOutTime: formData.siteCheckOutTime
          ? new Date(formData.siteCheckOutTime)
          : undefined,
        workSummary: formData.workSummary || undefined,
        siteProblems: formData.siteProblems || undefined,
        remainingWork: formData.remainingWork || undefined,
        supervisorSignUrl: formData.supervisorSignUrl || undefined,
        customerSignUrl: formData.customerSignUrl || undefined,
      };

      await updateProject(project.id, {
        ...projectData,
        engineers,
        admins,
        tasks,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกโครงการ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target as any;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const isFinancialPrivileged = useMemo(() => {
    const r = (currentUserRole || "").toLowerCase();
    return (
      r.includes("account") ||
      r.includes("บัญชี") ||
      r.includes("admin") ||
      r.includes("แอดมิน") ||
      r.includes("manage") ||
      r.includes("ผู้จัดการ")
    );
  }, [currentUserRole]);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 pb-28">
      {/* 1. Header Toolbar (Symmetrical 2-Column Balance) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        {/* Breadcrumb Row */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Link
            href="/"
            className="hover:text-red-600 transition-colors"
          >
            หน้าหลัก
          </Link>
          <span>/</span>
          <Link
            href="/projects"
            className="hover:text-red-600 transition-colors"
          >
            โครงการ
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${project.id}`}
            className="hover:text-red-600 transition-colors font-mono font-bold text-gray-700"
          >
            {project.projectNumber}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-bold">แก้ไขโครงการ</span>
        </div>

        {/* Main Header Content */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-1">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${project.id}`}
              className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl transition-colors shadow-xs shrink-0"
              title="ย้อนกลับ"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Pencil size={22} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  แก้ไขข้อมูลโครงการ (Edit Project)
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-gray-100 text-gray-800 border border-gray-200">
                  {project.projectNumber}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                ปรับปรุงรายละเอียดโครงการ ข้อมูลสัญญา ระยะเวลา และงวดการชำระเงิน
              </p>
            </div>
          </div>

          {/* Quick Actions (Right-aligned cluster) */}
          <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xs transition-colors"
            >
              <Eye size={14} className="text-gray-500" />
              <span>ดูรายละเอียด</span>
            </Link>

            <Link
              href={`/projects/${project.id}`}
              className="px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xs transition-colors"
            >
              ยกเลิก
            </Link>

            <button
              type="button"
              onClick={(e) => {
                const form = document.getElementById(
                  "project-edit-form"
                ) as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>บันทึกโครงการ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <form
        id="project-edit-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* ── Section 1: ข้อมูลทั่วไป (General Information - Symmetrical 2-Column Grid) ── */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-black text-xs">
              <FolderOpen size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                1. ข้อมูลทั่วไป (General Information)
              </h2>
              <p className="text-xs text-gray-500">
                รายละเอียดพื้นฐานของโครงการ ลูกค้า และการเชื่อมโยงระบบ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Project Name (Left) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span>ชื่อโครงการ (Project Name)</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="ระบุชื่อโครงการ"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            {/* Link to Job (Right) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>เชื่อมโยงกับ Job (Link to Job)</span>
                {formData.jobId && (
                  <span className="text-[10px] font-bold text-red-600">
                    เชื่อมต่ออยู่
                  </span>
                )}
              </label>
              <select
                name="jobId"
                value={formData.jobId}
                onChange={(e) => {
                  const newJobId = e.target.value;
                  const selectedJob = jobs.find((j) => j.id === newJobId);
                  setFormData((prev) => ({
                    ...prev,
                    jobId: newJobId,
                    budget: selectedJob?.quotation
                      ? (
                          selectedJob.quotation.actualClosingAmount ||
                          selectedJob.quotation.totalAmountBeforeVat ||
                          ""
                        ).toString() || prev.budget
                      : prev.budget,
                    name: selectedJob?.item || prev.name,
                    clientName: selectedJob?.customerName || prev.clientName,
                  }));
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all cursor-pointer"
              >
                <option value="">-- ไม่เชื่อมโยง (None) --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobNumber} - {j.customerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Client (Left) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                ลูกค้า (Client Name)
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                placeholder="ชื่อบริษัทหรือบุคคล"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            {/* Category (Right) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                หมวดหมู่โครงการ (Category)
              </label>
              <select
                name="projectCategory"
                value={formData.projectCategory}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all cursor-pointer"
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                <option value="Solar Roof">Solar Roof</option>
                <option value="Solar Pump">Solar Pump</option>
                <option value="Inverter">Inverter</option>
                <option value="Other">อื่นๆ (Other)</option>
              </select>
            </div>

            {/* Department (Left) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                แผนก (Department)
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="เช่น วิศวกรรม, บริการ"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            {/* Project Manager (Right) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span>ผู้จัดการโครงการ (Project Manager)</span>
                <span className="text-red-600">*</span>
              </label>
              <select
                name="managerId"
                required
                value={formData.managerId}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all cursor-pointer"
              >
                <option value="">-- เลือกผู้จัดการโครงการ --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role || "สมาชิก"})
                  </option>
                ))}
              </select>
            </div>

            {/* Province (Left) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <MapPin size={13} className="text-gray-400" />
                <span>จังหวัด (Province)</span>
              </label>
              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleInputChange}
                placeholder="เช่น กรุงเทพฯ, ชลบุรี"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            {/* District (Right) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                อำเภอ / เขต (District)
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                placeholder="เช่น เมือง, บางละมุง"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            {/* Site Address (Full Width span-2) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-gray-700">
                สถานที่ปฏิบัติงาน / รายละเอียด (Site Location / Description)
              </label>
              <textarea
                rows={2}
                name="siteAddress"
                value={formData.siteAddress}
                onChange={handleInputChange}
                placeholder="ที่อยู่หน้างาน หรือข้อความกำกับเพิ่มเติม"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: ระยะเวลาโครงการ (Timeline - Symmetrical 4-Card Grid) ── */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-black text-xs">
              <Calendar size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                2. ระยะเวลาโครงการ (Timeline & Schedule)
              </h2>
              <p className="text-xs text-gray-500">
                กำหนดการเริ่มต้น สิ้นสุด และวันส่งมอบงาน
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-200 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-red-600" />
                <span>วันที่เริ่ม (Start Date)</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
              />
            </div>

            {/* End Date */}
            <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-200 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-red-600" />
                <span>วันที่สิ้นสุด (End Date)</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
              />
            </div>

            {/* Duration */}
            <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-200 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Clock size={13} className="text-gray-500" />
                <span>ระยะเวลา (Duration)</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  name="projectDuration"
                  placeholder="จำนวน"
                  value={formData.projectDuration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                />
                <select
                  name="projectDurationUnit"
                  value={formData.projectDurationUnit}
                  onChange={handleInputChange}
                  className="w-24 px-2 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 outline-none font-bold text-gray-700 cursor-pointer"
                >
                  <option value="วัน">วัน</option>
                  <option value="เดือน">เดือน</option>
                  <option value="ปี">ปี</option>
                </select>
              </div>
            </div>

            {/* Delivery Date */}
            <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-200 space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-gray-500" />
                <span>วันที่ส่งมอบ (Delivery Date)</span>
              </label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: สัญญาและการเงิน (Contract & Financials - Symmetrical 2-Column Split) ── */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-black text-xs">
              <DollarSign size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                3. สัญญาและการเงิน (Contract & Financials)
              </h2>
              <p className="text-xs text-gray-500">
                ข้อมูลสัญญา มูลค่าโครงการ งบประมาณ และการแบ่งงวดชำระเงิน
              </p>
            </div>
          </div>

          {/* Symmetrical 2-Column Grid: Contract Details & Financial Values */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Contract Details */}
            <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200/80 pb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-gray-500" />
                <span>ข้อมูลสัญญา (Contract Details)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    เลขที่สัญญา (Contract No.)
                  </label>
                  <input
                    type="text"
                    name="contractNumber"
                    value={formData.contractNumber}
                    onChange={handleInputChange}
                    placeholder="เช่น CT-2026-001"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    ผู้เซ็นสัญญา (Signatory)
                  </label>
                  <input
                    type="text"
                    name="contractSignatory"
                    value={formData.contractSignatory}
                    onChange={handleInputChange}
                    placeholder="ชื่อผู้มีอำนาจลงนาม"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    วันที่เซ็นสัญญา (Sign Date)
                  </label>
                  <input
                    type="date"
                    name="contractSigningDate"
                    value={formData.contractSigningDate}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    สถานะการคืนสัญญา (Return Status)
                  </label>
                  <input
                    type="text"
                    name="contractReturnStatus"
                    value={formData.contractReturnStatus}
                    onChange={handleInputChange}
                    placeholder="เช่น ส่งคืนแล้ว, รอดำเนินการ"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Financial Values */}
            <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200/80 pb-2 flex items-center gap-1.5">
                <DollarSign size={14} className="text-red-600" />
                <span>มูลค่าและการเงิน (Financial Values)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    มูลค่าโครงการ รวม VAT (Project Value)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="projectValue"
                      value={formData.projectValue}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-mono font-bold text-gray-900"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                      ฿
                    </span>
                  </div>
                </div>

                {isFinancialPrivileged ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      มูลค่า ไม่รวม VAT (Excl. VAT)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={
                          formData.projectValue
                            ? (
                                (Number(formData.projectValue) * 100) /
                                107
                              ).toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "-"
                        }
                        className="w-full pl-7 pr-3.5 py-2.5 text-xs bg-gray-100/70 border border-gray-200 rounded-xl text-gray-600 font-mono font-bold outline-none cursor-default"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        ฿
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      ค่าปรับต่อวัน (Penalty/Day)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        name="penaltyPerDay"
                        value={formData.penaltyPerDay}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-mono font-medium text-gray-900"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        ฿
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    งบประมาณภายใน (Internal Budget)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-mono font-bold text-gray-900"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                      ฿
                    </span>
                  </div>
                </div>

                {isFinancialPrivileged && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      ค่าปรับต่อวัน (Penalty/Day)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        name="penaltyPerDay"
                        value={formData.penaltyPerDay}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-mono font-medium text-gray-900"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        ฿
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Symmetrical Security Deposit Card (3-Column Grid) */}
          <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-200 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200/80 pb-2">
              เงินค้ำประกันผลงาน (Security Deposit)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  เงินค้ำประกัน 5% (Security Deposit)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="securityDeposit"
                    value={formData.securityDeposit}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-mono font-medium text-gray-900"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        ฿
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  กำหนดเก็บเงินค้ำประกัน (Collection Schedule)
                </label>
                <input
                  type="date"
                  name="depositCollectionSchedule"
                  value={formData.depositCollectionSchedule}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  เลขขอคืนเงินค้ำประกัน (Refund Req No.)
                </label>
                <input
                  type="text"
                  name="depositRefundRequestNo"
                  value={formData.depositRefundRequestNo}
                  onChange={handleInputChange}
                  placeholder="เช่น RF-2026-001"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Installments Builder */}
          <div className="border-t border-gray-200 pt-5">
            <div className="mb-4">
              <h3 className="text-sm font-black text-gray-900">
                การแบ่งชำระเงินค่างวด (Payment Installments & Milestones)
              </h3>
              <p className="text-xs text-gray-500">
                กำหนดเงินมัดจำเมื่อเซ็นสัญญา และแบ่งงวดการส่งมอบงานจริงได้ตามต้องการ
              </p>
            </div>
            <DynamicInstallmentsBuilder
              projectValue={formData.projectValue}
              deposit={deposit}
              onDepositChange={setDeposit}
              installments={installments}
              onInstallmentsChange={setInstallments}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* ── Section 4: เอกสารและการจัดเก็บ (Documents & Storage - Symmetrical 3-Column Grid) ── */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-black text-xs">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                4. เอกสารและการจัดเก็บ (Documents & Records)
              </h2>
              <p className="text-xs text-gray-500">
                หมายเลขเอกสาร ใบส่งมอบ และลิงก์จัดเก็บเอกสารบนคลาวด์
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                เลขที่เอกสาร (Doc No.)
              </label>
              <input
                type="text"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleInputChange}
                placeholder="ระบุเลขที่เอกสาร"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                เลขที่ใบส่งมอบ (Delivery Doc No.)
              </label>
              <input
                type="text"
                name="deliveryDocNumber"
                value={formData.deliveryDocNumber}
                onChange={handleInputChange}
                placeholder="ระบุเลขที่ใบส่งมอบ"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">JB Number</label>
              <input
                type="text"
                name="jbNumber"
                value={formData.jbNumber}
                onChange={handleInputChange}
                placeholder="ระบุ JB Number"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                เลขที่ขอใบรับรองงานเสร็จ
              </label>
              <input
                type="text"
                name="certCompletionRequestNo"
                value={formData.certCompletionRequestNo}
                onChange={handleInputChange}
                placeholder="ระบุเลขที่คำขอ"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                สถานะการขอใบรับรอง
              </label>
              <input
                type="text"
                name="certRequestStatus"
                value={formData.certRequestStatus}
                onChange={handleInputChange}
                placeholder="เช่น อนุมัติแล้ว, รอยื่นเอกสาร"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="text-xs font-bold text-gray-700 mb-1">
                การอัปเดตข้อมูล
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 p-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  name="updateCompanyProfile"
                  checked={formData.updateCompanyProfile}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500/20 w-4 h-4"
                />
                <span>อัปเดตลง Company Profile</span>
              </label>
            </div>

            {/* Path Folder Link (Full Width) */}
            <div className="space-y-1.5 lg:col-span-3">
              <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Path Folder (ลิงก์จัดเก็บโฟลเดอร์โครงการ)</span>
                {formData.pathFolder && (
                  <a
                    href={formData.pathFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                  >
                    <span>เปิดลิงก์</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </label>
              <input
                type="text"
                name="pathFolder"
                value={formData.pathFolder}
                onChange={handleInputChange}
                placeholder="https://drive.google.com/..."
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Section 5: ทีมงานโครงการ (Project Team - Symmetrical 2-Column Balance) ── */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-black text-xs">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                5. ทีมงานโครงการ (Project Team)
              </h2>
              <p className="text-xs text-gray-500">
                มอบหมายบทบาทวิศวกร ผู้ดูแลฝ่ายแอดมิน และช่างภายนอก
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Engineers Searchable Dropdown */}
            <SearchableTeamSelect
              label="วิศวกรประจำโครงการ (Engineers)"
              subtitle="ค้นหาและเลือกวิศวกรที่รับผิดชอบการดำเนินงานหน้างาน"
              placeholder="คลิกเพื่อค้นหาและเลือกวิศวกร..."
              searchPlaceholder="พิมพ์ชื่อวิศวกร หรือแผนก..."
              users={users}
              selectedIds={engineers}
              onChange={setEngineers}
              badgeTheme="red"
              disabled={isSubmitting}
            />

            {/* Right Column: Admins Searchable Dropdown */}
            <SearchableTeamSelect
              label="ฝ่ายสนับสนุนและแอดมิน (Admins & Support)"
              subtitle="ค้นหาและเลือกเจ้าหน้าที่ประสานงานและธุรการโครงการ"
              placeholder="คลิกเพื่อค้นหาและเลือกแอดมิน..."
              searchPlaceholder="พิมพ์ชื่อแอดมิน หรือแผนก..."
              users={users}
              selectedIds={admins}
              onChange={setAdmins}
              badgeTheme="dark"
              disabled={isSubmitting}
            />

            {/* External Technicians (Full Width span-2) */}
            <div className="space-y-1.5 lg:col-span-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-700">
                ช่างภายนอก (External Technicians)
              </label>
              <textarea
                rows={2}
                name="externalTechnicians"
                value={formData.externalTechnicians}
                onChange={handleInputChange}
                placeholder="ระบุชื่อช่างภายนอก หรือผู้รับเหมาช่วง คั่นด้วยเครื่องหมายจุลภาค (,)"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Section 6: งานเริ่มต้น (Initial Tasks - Symmetrical Card Rows) ── */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-black text-xs">
                <Layers size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-gray-900 tracking-tight">
                    6. งานเริ่มต้น (Initial Tasks)
                  </h2>
                  <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                    {tasks.length} รายการ
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  แผนงานย่อยและผู้รับผิดชอบงาน
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddTask}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xs transition-colors"
            >
              <Plus size={14} className="text-red-600" />
              <span>เพิ่มงาน (Add Task)</span>
            </button>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end bg-gray-50/70 p-4 rounded-xl border border-gray-200"
                >
                  <div className="lg:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      ชื่องาน (Title) *
                    </label>
                    <input
                      type="text"
                      required
                      value={task.title}
                      onChange={(e) =>
                        handleTaskChange(index, "title", e.target.value)
                      }
                      placeholder="ชื่องานย่อย"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                    />
                  </div>

                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      หมวดหมู่ (Category)
                    </label>
                    <input
                      type="text"
                      value={task.category}
                      onChange={(e) =>
                        handleTaskChange(index, "category", e.target.value)
                      }
                      placeholder="หมวดงาน"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                    />
                  </div>

                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      ผู้รับผิดชอบ
                    </label>
                    <select
                      value={task.assigneeId}
                      onChange={(e) =>
                        handleTaskChange(index, "assigneeId", e.target.value)
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium cursor-pointer"
                    >
                      <option value="">ไม่มี (None)</option>
                      {users
                        .filter((u) =>
                          [formData.managerId, ...engineers, ...admins].includes(
                            u.id
                          )
                        )
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="lg:col-span-1.5 space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      เริ่ม
                    </label>
                    <input
                      type="date"
                      value={task.planStart}
                      onChange={(e) =>
                        handleTaskChange(index, "planStart", e.target.value)
                      }
                      className="w-full px-2 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                    />
                  </div>

                  <div className="lg:col-span-1.5 space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">
                      สิ้นสุด
                    </label>
                    <input
                      type="date"
                      value={task.planEnd}
                      onChange={(e) =>
                        handleTaskChange(index, "planEnd", e.target.value)
                      }
                      className="w-full px-2 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none text-gray-900 font-medium"
                    />
                  </div>

                  <div className="lg:col-span-1 flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="ลบงานนี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              ยังไม่มีการระบุงานเริ่มต้น (No tasks added yet)
            </div>
          )}
        </div>

        {/* ── Solar Checklist (Conditional) ── */}
        {(formData.projectCategory === "Solar Roof" ||
          formData.projectCategory === "Solar Pump") && (
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-xs">
            <SolarChecklist formData={formData} setFormData={setFormData} />
          </div>
        )}
      </form>

      {/* ── Symmetrical Floating Bottom Action Bar ── */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 md:px-8 max-w-[1400px] mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md p-3.5 px-6 rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between gap-4 pointer-events-auto">
          <div className="flex items-center gap-2.5 text-xs text-gray-500 font-medium truncate">
            <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              {project.projectNumber}
            </span>
            <span className="truncate max-w-[280px] sm:max-w-md font-bold text-gray-800">
              {formData.name || project.name}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/projects/${project.id}`}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-xs transition-colors"
            >
              ยกเลิก
            </Link>
            <button
              type="button"
              onClick={(e) => {
                const form = document.getElementById(
                  "project-edit-form"
                ) as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>บันทึกโครงการ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
