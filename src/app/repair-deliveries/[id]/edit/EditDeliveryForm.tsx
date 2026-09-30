"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  FileSignature,
  Save,
  ArrowLeft,
  RotateCcw,
  Printer,
  Building2,
  Users,
  ClipboardList,
  Search,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Phone,
  Briefcase,
  ShieldCheck,
  Clock,
  Wrench,
  Cog,
  GraduationCap,
  Eye,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  updateRepairDelivery,
  searchSalespeople,
} from "@/app/actions/repairDeliveries";
import { searchCompanies } from "@/app/actions/sales";

interface SalespersonResult {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  role: string;
  employeeSale?: { position: string | null; nickname: string | null } | null;
}

interface CompanyResult {
  id: string;
  companyName: string;
  address?: string | null;
  assignedUser?: { fullName: string } | null;
  contacts?: Array<{
    id: string;
    contactName: string;
    position?: string | null;
    mobilePhone?: string | null;
  }>;
}

const INTERNAL_COMPANIES = [
  { code: "TG", label: "TG", name: "Tera Group", fullName: "บจก. เทร่า กรุ๊ป" },
  { code: "TE", label: "TE", name: "Tera Electric", fullName: "บจก. เทร่า อิเล็คทริค" },
  { code: "TP", label: "TP", name: "Tera Power", fullName: "บจก. เทร่า พาวเวอร์" },
];

export default function EditDeliveryForm({
  initialData,
  currentUser,
}: {
  initialData: any;
  currentUser?: any;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    internalCompany: initialData.internalCompany || "TG",
    company: initialData.company || "",
    jobName: initialData.jobName || "",
    customer: initialData.customer || "",
    customerPosition: initialData.customerPosition || "",
    address: initialData.address || "",
    siteAddress: initialData.siteAddress || "",
    quotationNo: initialData.quotationNo || "",
    sender: initialData.sender || "",
    senderPhone: initialData.senderPhone || "",
    technician: initialData.technician || "",
    technicianPhone: initialData.technicianPhone || "",
    workInspect: initialData.workInspect || false,
    workInstall: initialData.workInstall || false,
    workRepair: initialData.workRepair || false,
    workTraining: initialData.workTraining || false,
    workTrainingDetails: initialData.workTrainingDetails || "",
    workInspectDetails: initialData.workInspectDetails || "",
    workInstallDetails: initialData.workInstallDetails || "",
    workRepairDetails: initialData.workRepairDetails || "",
    workOther: initialData.workOther || "",
    note: initialData.note || "",
    status: initialData.status || "Draft",
  });

  // Salesperson Autocomplete State
  const [senderSearchQuery, setSenderSearchQuery] = useState(
    initialData.sender || ""
  );
  const [senderResults, setSenderResults] = useState<SalespersonResult[]>([]);
  const [isSenderSearching, setIsSenderSearching] = useState(false);
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const senderDropdownRef = useRef<HTMLDivElement>(null);

  // Customer Company Autocomplete State
  const [companySearchQuery, setCompanySearchQuery] = useState(
    initialData.company || ""
  );
  const [companyResults, setCompanyResults] = useState<CompanyResult[]>([]);
  const [isCompanySearching, setIsCompanySearching] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Copy Feedback State
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Debounced Salesperson Search
  useEffect(() => {
    if (!senderSearchQuery || senderSearchQuery.trim().length < 1) {
      setSenderResults([]);
      setShowSenderDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSenderSearching(true);
      try {
        const res = await searchSalespeople(senderSearchQuery.trim());
        if (res.success && res.data) {
          setSenderResults(res.data as SalespersonResult[]);
          setShowSenderDropdown(true);
        }
      } catch (err) {
        console.error("Salesperson search error:", err);
      } finally {
        setIsSenderSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [senderSearchQuery]);

  // Debounced Company Search
  useEffect(() => {
    if (!companySearchQuery || companySearchQuery.trim().length < 2) {
      setCompanyResults([]);
      setShowCompanyDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCompanySearching(true);
      try {
        const results = await searchCompanies(companySearchQuery.trim());
        if (results && Array.isArray(results)) {
          setCompanyResults(results as CompanyResult[]);
          setShowCompanyDropdown(true);
        }
      } catch (err) {
        console.error("Company search error:", err);
      } finally {
        setIsCompanySearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [companySearchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        senderDropdownRef.current &&
        !senderDropdownRef.current.contains(target)
      ) {
        setShowSenderDropdown(false);
      }
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(target)
      ) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSalesperson = useCallback((person: SalespersonResult) => {
    setSenderSearchQuery(person.fullName);
    setFormData((prev) => ({
      ...prev,
      sender: person.fullName,
      senderPhone: person.phoneNumber || "",
    }));
    setShowSenderDropdown(false);
    setSenderResults([]);
  }, []);

  const clearSenderSelection = useCallback(() => {
    setSenderSearchQuery("");
    setFormData((prev) => ({
      ...prev,
      sender: "",
      senderPhone: "",
    }));
    setSenderResults([]);
    setShowSenderDropdown(false);
  }, []);

  const selectCompany = useCallback((comp: CompanyResult) => {
    setCompanySearchQuery(comp.companyName);
    setFormData((prev) => ({
      ...prev,
      company: comp.companyName,
      address: comp.address || prev.address,
      customer:
        !prev.customer && comp.contacts?.[0]?.contactName
          ? comp.contacts[0].contactName
          : prev.customer,
      customerPosition:
        !prev.customerPosition && comp.contacts?.[0]?.position
          ? comp.contacts[0].position
          : prev.customerPosition,
    }));
    setShowCompanyDropdown(false);
    setCompanyResults([]);
  }, []);

  const clearCompanySelection = useCallback(() => {
    setCompanySearchQuery("");
    setFormData((prev) => ({
      ...prev,
      company: "",
    }));
    setCompanyResults([]);
    setShowCompanyDropdown(false);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const copyAddressToSite = () => {
    if (!formData.address) return;
    setFormData((prev) => ({ ...prev, siteAddress: prev.address }));
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการคืนค่าข้อมูล?",
      text: "ข้อมูลที่คุณแก้ไขทั้งหมดจะถูกรีเซ็ตกลับไปเป็นค่าเดิมก่อนแก้ไข",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "คืนค่าข้อมูล",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      setFormData({
        internalCompany: initialData.internalCompany || "TG",
        company: initialData.company || "",
        jobName: initialData.jobName || "",
        customer: initialData.customer || "",
        customerPosition: initialData.customerPosition || "",
        address: initialData.address || "",
        siteAddress: initialData.siteAddress || "",
        quotationNo: initialData.quotationNo || "",
        sender: initialData.sender || "",
        senderPhone: initialData.senderPhone || "",
        technician: initialData.technician || "",
        technicianPhone: initialData.technicianPhone || "",
        workInspect: initialData.workInspect || false,
        workInstall: initialData.workInstall || false,
        workRepair: initialData.workRepair || false,
        workTraining: initialData.workTraining || false,
        workTrainingDetails: initialData.workTrainingDetails || "",
        workInspectDetails: initialData.workInspectDetails || "",
        workInstallDetails: initialData.workInstallDetails || "",
        workRepairDetails: initialData.workRepairDetails || "",
        workOther: initialData.workOther || "",
        note: initialData.note || "",
        status: initialData.status || "Draft",
      });
      setSenderSearchQuery(initialData.sender || "");
      setCompanySearchQuery(initialData.company || "");
    }
  };

  const handleSubmit = async (action: "save" | "view" = "save") => {
    if (!formData.customer.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อลูกค้า",
        text: "จำเป็นต้องระบุชื่อลูกค้าหรือผู้ติดต่อสำหรับการส่งมอบงาน",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    if (!formData.internalCompany) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกบริษัทผู้รับผิดชอบ",
        text: "โปรดเลือกบริษัทในเครือผู้รับผิดชอบงานส่งมอบ (TG, TE หรือ TP)",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
      };

      const res = await updateRepairDelivery(initialData.id, payload);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "บันทึกการแก้ไขสำเร็จ",
          text: `อัปเดตข้อมูลใบส่งมอบงาน ${initialData.deliveryNumber} เรียบร้อยแล้ว`,
          timer: 1500,
          showConfirmButton: false,
        });

        if (action === "view") {
          router.push(`/repair-deliveries/${initialData.id}/pdf`);
        } else {
          router.push("/repair-deliveries");
        }
        router.refresh();
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกข้อมูลได้",
          confirmButtonColor: "#ff2301",
        });
        setIsSubmitting(false);
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
      setIsSubmitting(false);
    }
  };

  const formatDateThai = (dateString?: string | Date | null) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateString);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400";
  const labelClass = "block text-xs font-bold text-gray-700 mb-1.5";

  return (
    <div className="space-y-8">
      {/* ── Top Hero Header Card (Symmetrical & Modern Red/White/Gray) ── */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          {/* Left: Branded Squircle Icon & Titles */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
                <FileSignature className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  แก้ไขใบส่งมอบงาน
                </h1>
                <span className="inline-flex items-center px-3 py-1 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-mono font-bold tracking-wide">
                  {initialData.deliveryNumber}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    formData.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      formData.status === "Completed"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                  />
                  {formData.status === "Completed"
                    ? "ส่งมอบแล้ว (Completed)"
                    : "แบบร่าง (Draft)"}
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                <span>EDIT REPAIR DELIVERY NOTE</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-normal">
                  แก้ไขรายละเอียดใบส่งมอบงานและรายงานการตรวจเช็คหน้างาน
                </span>
              </p>
            </div>
          </div>

          {/* Right: Symmetrical Action Buttons (Unified h-10 Heights) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap w-full lg:w-auto justify-start lg:justify-end overflow-x-auto pb-1 lg:pb-0">
            {/* Back Button */}
            <Link
              href="/repair-deliveries"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              <span>กลับหน้ารายการ</span>
            </Link>

            {/* View PDF Document */}
            <Link
              href={`/repair-deliveries/${initialData.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
              title="เปิดดูเอกสาร PDF"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>ดูเอกสาร PDF</span>
            </Link>

            {/* Reset Form Button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-40"
              title="คืนค่าข้อมูลเดิม"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Save Only Button */}
            <button
              type="button"
              onClick={() => handleSubmit("save")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>บันทึกข้อมูล</span>
            </button>

            {/* Save + View PDF Button */}
            <button
              type="button"
              onClick={() => handleSubmit("view")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95 shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>บันทึก + ดู PDF</span>
            </button>
          </div>
        </div>

        {/* Mini Meta Info Strip */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>สร้างเมื่อ: {formatDateThai(initialData.createdAt)}</span>
            </div>
            {initialData.updatedAt && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>แก้ไขล่าสุด: {formatDateThai(initialData.updatedAt)}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span>
              ผู้ดำเนินการ:{" "}
              <strong className="text-gray-900">
                {currentUser?.fullName || formData.sender || "เจ้าหน้าที่บริการ"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Linked Sales Job Callout (If Linked from Job) ── */}
      {initialData.job && (
        <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#ff2301] flex items-center justify-center font-bold shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    อ้างอิงใบงานหลัก (Linked Job)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 text-[#ff2301] border border-red-200">
                    {initialData.job.jobNumber}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {initialData.job.item ||
                    initialData.job.customerName ||
                    "ใบงานบริการเทร่ากรุ๊ป"}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-3 sm:gap-4 shrink-0">
              {initialData.job.quotationNumber && (
                <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400">เลขที่ QT/PO: </span>
                  <strong className="text-gray-900 font-mono">
                    {initialData.job.quotationNumber}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Symmetrical 2-Column Grid: Section 1 & Section 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* ── Section 1: Customer & Site Details (Left Column) ── */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  1. ข้อมูลลูกค้าและสถานที่ส่งมอบ
                </h2>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Customer &amp; Site Delivery Information
                </p>
              </div>
            </div>

            {/* Internal Company Selector (Data Owner) */}
            <div>
              <label className={labelClass}>
                บริษัทผู้รับผิดชอบ (Data Owner){" "}
                <span className="text-[#ff2301]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {INTERNAL_COMPANIES.map((c) => {
                  const isSelected = formData.internalCompany === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          internalCompany: c.code,
                        }))
                      }
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? "border-[#ff2301] bg-red-50/50 shadow-sm"
                          : "border-gray-200 bg-white hover:bg-gray-50/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            isSelected
                              ? "bg-[#ff2301] text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.label}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#ff2301]" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {c.fullName}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Company with Smart Search */}
            <div ref={companyDropdownRef} className="relative">
              <label className={labelClass}>
                บริษัทลูกค้า (Customer Company)
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={companySearchQuery}
                  onChange={(e) => {
                    setCompanySearchQuery(e.target.value);
                    setFormData((prev) => ({ ...prev, company: e.target.value }));
                  }}
                  onFocus={() => {
                    if (companyResults.length > 0) setShowCompanyDropdown(true);
                  }}
                  placeholder="พิมพ์ชื่อบริษัทลูกค้าเพื่อค้นหา..."
                  className={`${inputClass} pl-10 pr-10`}
                />
                {isCompanySearching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                  </div>
                )}
                {companySearchQuery && !isCompanySearching && (
                  <button
                    type="button"
                    onClick={clearCompanySelection}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Company Dropdown Results */}
              {showCompanyDropdown && companyResults.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 max-h-60 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {companyResults.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => selectCompany(comp)}
                      className="w-full text-left px-4 py-3 hover:bg-red-50/50 transition-colors group flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#ff2301] transition-colors truncate">
                          {comp.companyName}
                        </p>
                        {comp.address && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {comp.address}
                          </p>
                        )}
                        {comp.contacts && comp.contacts.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            ผู้ติดต่อ: {comp.contacts[0].contactName}{" "}
                            {comp.contacts[0].position &&
                              `(${comp.contacts[0].position})`}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md shrink-0">
                        เลือก
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Contact & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  ชื่อผู้ติดต่อ / ลูกค้า (Customer Name){" "}
                  <span className="text-[#ff2301]">*</span>
                </label>
                <input
                  type="text"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  placeholder="เช่น คุณสมชาย วิเชียรศรี"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  ฐานะ / ตำแหน่งลูกค้า (Position)
                </label>
                <input
                  type="text"
                  name="customerPosition"
                  value={formData.customerPosition}
                  onChange={handleChange}
                  placeholder="เช่น ผู้จัดการโรงงาน / วิศวกร"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Job Name / Equipment & Quotation/PO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  ชื่องาน / อุปกรณ์ที่ส่งมอบ (Job Name / Equipment)
                </label>
                <input
                  type="text"
                  name="jobName"
                  value={formData.jobName}
                  onChange={handleChange}
                  placeholder="เช่น ตรวจซ่อมมอเตอร์ 50HP"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  เลขที่ใบเสนอราคา / PO (Quotation / PO No.)
                </label>
                <input
                  type="text"
                  name="quotationNo"
                  value={formData.quotationNo}
                  onChange={handleChange}
                  placeholder="เช่น QT69-0123 / PO-2026-99"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Company Address */}
            <div>
              <label className={labelClass}>
                ที่อยู่บริษัทลูกค้า (Company Address)
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                placeholder="ระบุที่อยู่บริษัทสำหรับออกเอกสาร..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Site Delivery Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700">
                  สถานที่หน้างาน / จุดส่งมอบ (Site Address)
                </label>
                {formData.address && (
                  <button
                    type="button"
                    onClick={copyAddressToSite}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#ff2301] hover:text-[#d81900] transition-colors"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ใช้ที่อยู่เดียวกับบริษัท</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea
                name="siteAddress"
                value={formData.siteAddress}
                onChange={handleChange}
                rows={2}
                placeholder="ระบุสถานที่ส่งมอบจริงหรือไซต์งาน เช่น โรงงาน 2 แผนกซ่อมบำรุง..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>ตรวจสอบความถูกต้องของข้อมูลลูกค้าและสถานที่ก่อนบันทึก</span>
            <span className="font-mono text-gray-500">SECTION 1 OF 3</span>
          </div>
        </div>

        {/* ── Section 2: Responsible Personnel & Status (Right Column) ── */}
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  2. บุคลากรผู้รับผิดชอบและสถานะเอกสาร
                </h2>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Responsible Team &amp; Document Workflow
                </p>
              </div>
            </div>

            {/* Document Status Switcher */}
            <div>
              <label className={labelClass}>
                สถานะใบส่งมอบงาน (Document Status){" "}
                <span className="text-[#ff2301]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, status: "Draft" }))
                  }
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    formData.status === "Draft"
                      ? "border-amber-400 bg-amber-50/60 shadow-sm"
                      : "border-gray-200 bg-white hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        formData.status === "Draft"
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        แบบร่าง / รอส่งมอบ
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Draft Status
                      </p>
                    </div>
                  </div>
                  {formData.status === "Draft" && (
                    <Check className="w-4 h-4 text-amber-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, status: "Completed" }))
                  }
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    formData.status === "Completed"
                      ? "border-emerald-400 bg-emerald-50/60 shadow-sm"
                      : "border-gray-200 bg-white hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        formData.status === "Completed"
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        ส่งมอบเสร็จสมบูรณ์
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Completed Status
                      </p>
                    </div>
                  </div>
                  {formData.status === "Completed" && (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Salesperson in Charge with Autocomplete */}
            <div ref={senderDropdownRef} className="relative">
              <label className={labelClass}>
                พนักงานขายผู้รับผิดชอบ (Salesperson in Charge)
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={senderSearchQuery}
                  onChange={(e) => {
                    setSenderSearchQuery(e.target.value);
                    setFormData((prev) => ({ ...prev, sender: e.target.value }));
                  }}
                  onFocus={() => {
                    if (senderResults.length > 0) setShowSenderDropdown(true);
                  }}
                  placeholder="ค้นหาชื่อพนักงานขาย..."
                  className={`${inputClass} pl-10 pr-10`}
                />
                {isSenderSearching && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                  </div>
                )}
                {formData.sender && !isSenderSearching && (
                  <button
                    type="button"
                    onClick={clearSenderSelection}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Salesperson Dropdown Results */}
              {showSenderDropdown && senderResults.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 max-h-60 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {senderResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => selectSalesperson(person)}
                      className="w-full text-left px-4 py-3 hover:bg-red-50/50 transition-colors group flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#ff2301] transition-colors truncate">
                          {person.fullName}
                          {person.employeeSale?.nickname && (
                            <span className="ml-1.5 text-gray-400 font-medium">
                              ({person.employeeSale.nickname})
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          {person.employeeSale?.position || person.role}
                        </p>
                      </div>
                      {person.phoneNumber && (
                        <span className="text-xs text-gray-600 font-mono bg-gray-50 px-2.5 py-1 rounded-md shrink-0 border border-gray-100">
                          {person.phoneNumber}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Salesperson Phone */}
            <div>
              <label className={labelClass}>
                เบอร์โทรพนักงานขาย (Salesperson Phone)
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="senderPhone"
                  value={formData.senderPhone}
                  onChange={handleChange}
                  placeholder="เช่น 081-234-5678"
                  className={`${inputClass} pl-10 font-mono`}
                />
              </div>
            </div>

            {/* Technician / Field Engineer & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  ช่าง / วิศวกรผู้ส่งมอบ (Technician / Engineer)
                </label>
                <input
                  type="text"
                  name="technician"
                  value={formData.technician}
                  onChange={handleChange}
                  placeholder="เช่น ช่างวิเชียร ชำนาญการ"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  เบอร์โทรช่าง / วิศวกร (Technician Phone)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="technicianPhone"
                    value={formData.technicianPhone}
                    onChange={handleChange}
                    placeholder="เช่น 089-876-5432"
                    className={`${inputClass} pl-10 font-mono`}
                  />
                </div>
              </div>
            </div>

            {/* Handover Guidelines & Quality Assurance Callout */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-gray-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-[#ff2301]" />
                <span>ขั้นตอนมาตรฐานการส่งมอบงาน (Quality Protocol)</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#ff2301] shrink-0 mt-0.5" />
                  <span>ตรวจสอบสภาพเครื่องจักรและอุปกรณ์ให้ครบถ้วนก่อนส่งมอบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#ff2301] shrink-0 mt-0.5" />
                  <span>
                    ดำเนินการทดสอบการทำงานพร้อมสาธิตต่อหน้าผู้รับมอบงาน
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#ff2301] shrink-0 mt-0.5" />
                  <span>
                    ให้ลูกค้าตรวจสอบและลงลายมือชื่อในเอกสารรับมอบงานหรือในระบบ
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>สามารถปรับเปลี่ยนสถานะเอกสารเป็น "ส่งมอบแล้ว" ได้ที่นี่</span>
            <span className="font-mono text-gray-500">SECTION 2 OF 3</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Work Types & Service Scope (Full Width Symmetrical Card) ── */}
      <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              3. ขอบเขตงานบริการและรายละเอียดการตรวจเช็ค
            </h2>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Service Scope &amp; Inspection Checklist
            </p>
          </div>
        </div>

        {/* 4 Interactive Checklist Cards in Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. งานตรวจเช็ค (Inspection) */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              formData.workInspect
                ? "border-red-300 bg-red-50/40 shadow-sm"
                : "border-gray-200 bg-gray-50/50 hover:bg-white"
            }`}
          >
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="workInspect"
                  checked={formData.workInspect}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#ff2301] rounded border-gray-300 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <Eye
                    className={`w-4 h-4 ${
                      formData.workInspect ? "text-[#ff2301]" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      formData.workInspect ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    งานตรวจเช็ค
                  </span>
                </div>
              </label>
              <p className="text-[11px] text-gray-400 mt-1 pl-7">
                Inspection &amp; Diagnostics
              </p>
            </div>

            <input
              type="text"
              name="workInspectDetails"
              value={formData.workInspectDetails}
              onChange={handleChange}
              placeholder="รายละเอียดงานตรวจเช็ค (ถ้ามี)"
              className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-all ${
                formData.workInspect
                  ? "bg-white border-red-200 focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] text-gray-900"
                  : "bg-white/60 border-gray-200 text-gray-500 placeholder:text-gray-400"
              }`}
            />
          </div>

          {/* 2. งานติดตั้ง (Installation) */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              formData.workInstall
                ? "border-red-300 bg-red-50/40 shadow-sm"
                : "border-gray-200 bg-gray-50/50 hover:bg-white"
            }`}
          >
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="workInstall"
                  checked={formData.workInstall}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#ff2301] rounded border-gray-300 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <Cog
                    className={`w-4 h-4 ${
                      formData.workInstall ? "text-[#ff2301]" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      formData.workInstall ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    งานติดตั้ง
                  </span>
                </div>
              </label>
              <p className="text-[11px] text-gray-400 mt-1 pl-7">
                Installation &amp; Setup
              </p>
            </div>

            <input
              type="text"
              name="workInstallDetails"
              value={formData.workInstallDetails}
              onChange={handleChange}
              placeholder="รายละเอียดงานติดตั้ง (ถ้ามี)"
              className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-all ${
                formData.workInstall
                  ? "bg-white border-red-200 focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] text-gray-900"
                  : "bg-white/60 border-gray-200 text-gray-500 placeholder:text-gray-400"
              }`}
            />
          </div>

          {/* 3. งานซ่อม (Repair) */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              formData.workRepair
                ? "border-red-300 bg-red-50/40 shadow-sm"
                : "border-gray-200 bg-gray-50/50 hover:bg-white"
            }`}
          >
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="workRepair"
                  checked={formData.workRepair}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#ff2301] rounded border-gray-300 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <Wrench
                    className={`w-4 h-4 ${
                      formData.workRepair ? "text-[#ff2301]" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      formData.workRepair ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    งานซ่อม
                  </span>
                </div>
              </label>
              <p className="text-[11px] text-gray-400 mt-1 pl-7">
                Repair &amp; Overhaul
              </p>
            </div>

            <input
              type="text"
              name="workRepairDetails"
              value={formData.workRepairDetails}
              onChange={handleChange}
              placeholder="รายละเอียดงานซ่อม (ถ้ามี)"
              className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-all ${
                formData.workRepair
                  ? "bg-white border-red-200 focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] text-gray-900"
                  : "bg-white/60 border-gray-200 text-gray-500 placeholder:text-gray-400"
              }`}
            />
          </div>

          {/* 4. งานอบรม (Training) */}
          <div
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
              formData.workTraining
                ? "border-red-300 bg-red-50/40 shadow-sm"
                : "border-gray-200 bg-gray-50/50 hover:bg-white"
            }`}
          >
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="workTraining"
                  checked={formData.workTraining}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#ff2301] rounded border-gray-300 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <GraduationCap
                    className={`w-4 h-4 ${
                      formData.workTraining ? "text-[#ff2301]" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      formData.workTraining ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    งานอบรม
                  </span>
                </div>
              </label>
              <p className="text-[11px] text-gray-400 mt-1 pl-7">
                Training &amp; Handover
              </p>
            </div>

            <input
              type="text"
              name="workTrainingDetails"
              value={formData.workTrainingDetails}
              onChange={handleChange}
              placeholder="รายละเอียดงานอบรม (ถ้ามี)"
              className={`w-full px-3 py-2 text-xs border rounded-xl focus:outline-none transition-all ${
                formData.workTraining
                  ? "bg-white border-red-200 focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] text-gray-900"
                  : "bg-white/60 border-gray-200 text-gray-500 placeholder:text-gray-400"
              }`}
            />
          </div>
        </div>

        {/* Additional Work Details & Remarks in 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div>
            <label className={labelClass}>
              งานอื่นๆ เพิ่มเติม (Other Work Details)
            </label>
            <input
              type="text"
              name="workOther"
              value={formData.workOther}
              onChange={handleChange}
              placeholder="ระบุขอบเขตงานหรือรายละเอียดบริการอื่นๆ เพิ่มเติม"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>หมายเหตุเพิ่มเติม (Remarks / Note)</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={2}
              placeholder="ระบุบันทึกข้อความเพิ่มเติม หรือเงื่อนไขการส่งมอบงาน..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-2xl py-3.5 px-4 sm:px-8 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Summary Tag */}
          <div className="flex items-center gap-3 text-xs text-gray-500 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff2301]" />
              <span className="font-mono font-bold text-gray-900">
                {initialData.deliveryNumber}
              </span>
              <span className="text-gray-400">•</span>
              <span className="font-bold text-gray-800 truncate max-w-[180px] sm:max-w-xs">
                {formData.customer || "ยังไม่ได้ระบุชื่อลูกค้า"}
              </span>
            </div>
            {formData.company && (
              <span className="text-gray-400 truncate max-w-[150px] hidden md:inline">
                ({formData.company})
              </span>
            )}
          </div>

          {/* Right: Symmetrical Action Button Group */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Link
              href="/repair-deliveries"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">ยกเลิก</span>
            </Link>

            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-sm active:scale-95 disabled:opacity-40"
              title="คืนค่าข้อมูลเดิม"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("save")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>บันทึกข้อมูล</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("view")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>บันทึก + ดู PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
