"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Save,
  Printer,
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  ClipboardList,
  Building2,
  User,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  Cpu,
  CheckSquare,
  Lock,
  ExternalLink,
  Check,
  X,
  FileText,
  Upload,
  Layers,
  ChevronDown
} from "lucide-react";
import { LoadingButton } from "@/app/components/LoadingButton";
import { createRepairOrder } from "@/app/actions/repairOrders";
import { searchContacts } from "@/app/actions/sales";
import Swal from "sweetalert2";

const CHECKLIST_OPTIONS = [
  { key: "Front", label: "ด้านหน้า / Front" },
  { key: "Top", label: "ด้านบน / Top" },
  { key: "SideLeft", label: "ด้านข้าง (ซ้าย) / Left" },
  { key: "SideRight", label: "ด้านข้าง (ขวา) / Right" },
  { key: "Inside", label: "ด้านใน / Inside" },
  { key: "Nameplate", label: "Nameplate" },
  { key: "Bottom", label: "ด้านล่าง / Bottom" },
  { key: "TerminalNut", label: "Terminal / Nut" },
  { key: "TermCover", label: "Term. cover" },
  { key: "Cover", label: "ฝาครอบ / Cover" },
  { key: "Video", label: "Video" },
];

interface EditRepairOrderFormProps {
  companies: any[];
  users: any[];
  initialData: any;
}

export default function EditRepairOrderForm({
  companies = [],
  users = [],
  initialData,
}: EditRepairOrderFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingAndPrint, setIsSubmittingAndPrint] = useState(false);
  const [message, setMessage] = useState("");

  // Company Autocomplete
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Contact Autocomplete
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ key: string; index: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState<any>({
    id: initialData?.id || "",
    jobId: initialData?.jobId || "",
    workType: "ซ่อม",
    company: "TERA GROUP",
    customerCompany: "",
    phoneNumber: "",
    customerPhoneNumber: "",
    customerAddress: "",
    invoiceNo: "",
    deliveryNoteNo: "",
    receiverName: "",
    senderName: "",
    forwardedBy: "",
    technicianName: "",
    handoverRef: "",
    salesPerson: "",
    symptoms: "",
    settings: "",
    receivedDate: new Date().toISOString().split("T")[0],
    sentDate: "",
    items: [{ type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }],
    checklist: {},
    checklistImages: {},
  });

  // Service Technicians list
  const serviceUsers = React.useMemo(() => {
    return users?.filter(
      (u) =>
        u.role?.toLowerCase().includes("service") ||
        u.role?.toLowerCase().includes("ช่าง") ||
        u.role?.toLowerCase().includes("บริการ") ||
        u.role?.toLowerCase().includes("tech")
    );
  }, [users]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        receivedDate: initialData.receivedDate
          ? new Date(initialData.receivedDate).toISOString().split("T")[0]
          : "",
        sentDate: initialData.sentDate
          ? new Date(initialData.sentDate).toISOString().split("T")[0]
          : "",
        items:
          initialData.items?.length > 0
            ? initialData.items
            : [{ type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }],
        checklist: initialData.checklist || {},
        checklistImages: initialData.checklistImages || {},
        customerPhoneNumber: initialData.customerPhoneNumber || initialData.phoneNumber || "",
        customerCompany: initialData.customerCompany || initialData.job?.customerName || "",
        customerAddress: initialData.customerAddress || "",
        salesPerson: initialData.salesPerson || initialData.job?.sellerName || "",
        technicianName: initialData.technicianName || "",
      });
      if (initialData.senderName) {
        setContactSearchQuery(initialData.senderName);
      }
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCompanySearch = (query: string) => {
    setFormData((prev: any) => ({ ...prev, customerCompany: query }));
    if (query.length >= 1) {
      const results = companies.filter((c) =>
        c.companyName.toLowerCase().includes(query.toLowerCase())
      );
      setCompanySuggestions(results.slice(0, 5));
      setShowSuggestions(results.length > 0 || query.length >= 1);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setSelectedCompanyId(company.id);
    setFormData((prev: any) => ({
      ...prev,
      customerCompany: company.companyName,
      customerAddress: company.address || company.billingAddress || "",
      customerPhoneNumber: company.phone || company.phoneNumber || prev.customerPhoneNumber,
    }));
    setShowSuggestions(false);
  };

  useEffect(() => {
    const fetchContacts = async () => {
      if (contactSearchQuery.length >= 2) {
        const results = await searchContacts(contactSearchQuery, selectedCompanyId || undefined);
        setContactSuggestions(results);
        setShowContactSuggestions(true);
      } else {
        setContactSuggestions([]);
        setShowContactSuggestions(false);
      }
    };
    const timeoutId = setTimeout(fetchContacts, 500);
    return () => clearTimeout(timeoutId);
  }, [contactSearchQuery, selectedCompanyId]);

  const handleContactSelect = (contact: any) => {
    setFormData((prev: any) => ({
      ...prev,
      senderName: contact.contactName || "",
      customerPhoneNumber: contact.phone || contact.mobile || prev.customerPhoneNumber,
    }));
    setContactSearchQuery(contact.contactName || "");
    setShowContactSuggestions(false);

    if (contact.company && !selectedCompanyId) {
      handleCompanySelect(contact.company);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setShowContactSuggestions(false);
    }, 200);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        { type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev: any) => {
      const newItems = prev.items.filter((_: any, i: number) => i !== index);
      const newImages = { ...prev.checklistImages };
      Object.keys(newImages).forEach((key) => {
        if (newImages[key] && newImages[key].length > index) {
          const arr = [...newImages[key]];
          arr.splice(index, 1);
          newImages[key] = arr;
        }
      });
      return { ...prev, items: newItems, checklistImages: newImages };
    });
  };

  const handleChecklistChange = (key: string) => {
    setFormData((prev: any) => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: !prev.checklist[key] },
    }));
  };

  const triggerUpload = (key: string, index: number) => {
    setUploadTarget({ key, index });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    if (file.size > 50 * 1024 * 1024) {
      Swal.fire({
        title: "ไฟล์มีขนาดใหญ่เกินไป",
        text: `ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (รองรับสูงสุด 50MB)`,
        icon: "warning",
        confirmButtonColor: "#ff2301",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const supabase = (await import("@supabase/supabase-js")).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploadsService")
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        Swal.fire({
          title: "อัปโหลดไม่สำเร็จ",
          text: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${uploadError.message}`,
          icon: "error",
          confirmButtonColor: "#ff2301",
        });
        throw new Error("Upload failed");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("uploadsService").getPublicUrl(uploadData.path);

      const { key, index } = uploadTarget;
      setFormData((prev: any) => {
        const newImages = { ...prev.checklistImages };
        if (!newImages[key]) newImages[key] = [];
        while (newImages[key].length <= index) newImages[key].push("");
        newImages[key][index] = publicUrl;
        return { ...prev, checklistImages: newImages };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (key: string, index: number) => {
    setFormData((prev: any) => {
      const newImages = { ...prev.checklistImages };
      if (newImages[key]) {
        const arr = [...newImages[key]];
        arr[index] = "";
        newImages[key] = arr;
      }
      return { ...prev, checklistImages: newImages };
    });
  };

  async function handleSubmit(e: React.FormEvent, printAfter: boolean = false) {
    e.preventDefault();
    if (printAfter) setIsSubmittingAndPrint(true);
    else setIsSubmitting(true);
    setMessage("");

    const submitData = {
      ...formData,
      phoneNumber:
        formData.customerPhoneNumber &&
        formData.phoneNumber &&
        formData.customerPhoneNumber !== formData.phoneNumber
          ? `${formData.phoneNumber} / ${formData.customerPhoneNumber}`
          : formData.customerPhoneNumber || formData.phoneNumber,
    };

    try {
      const res = await createRepairOrder(submitData);

      if (res.success) {
        Swal.fire({
          title: "บันทึกสำเร็จ",
          text: "บันทึกการแก้ไขใบรับซ่อมเรียบร้อยแล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: "rounded-2xl" },
        });

        if (printAfter && res.jobId) {
          router.push(`/repair-orders/${res.jobId}/print`);
        } else {
          router.push("/repair-orders");
        }
      } else {
        setMessage(res.error || "เกิดข้อผิดพลาดในการบันทึก");
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกข้อมูลได้",
          icon: "error",
          confirmButtonColor: "#ff2301",
        });
        setIsSubmitting(false);
        setIsSubmittingAndPrint(false);
      }
    } catch (err: any) {
      setMessage(err.message || "เกิดข้อผิดพลาด");
      setIsSubmitting(false);
      setIsSubmittingAndPrint(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      {/* ───────────────────────────────────────────────────────────
          TOP NAVIGATION & HERO BAR (Symmetrical Red/White/Gray)
      ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Breadcrumb & Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/repair-orders"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold transition-all shadow-sm group"
          >
            <ArrowLeft size={14} className="text-gray-400 group-hover:text-[#ff2301] transition-colors" />
            <span>กลับสู่หน้ารายการใบรับซ่อม</span>
          </Link>

          <span className="text-xs font-semibold text-gray-400">
            เอกสารอ้างอิง: <span className="font-mono text-gray-700">{initialData?.id}</span>
          </span>
        </div>

        {/* Hero Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#c71a00] flex items-center justify-center text-white shadow-lg shadow-red-500/25">
              <Wrench size={26} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  แก้ไขใบรับซ่อม
                </h1>
                <span className="font-mono px-3 py-1 rounded-xl text-xs font-black bg-red-50 text-[#ff2301] border border-red-200">
                  {initialData?.job?.jobNumber || initialData?.jobId || "RO"}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex items-center gap-2">
                <span>EDIT REPAIR ORDER</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-700 font-bold">{formData.customerCompany || "—"}</span>
              </p>
            </div>
          </div>

          {/* Right Action Links */}
          <div className="flex flex-wrap items-center gap-2.5">
            {formData.jobId && (
              <Link
                href={`/jobs?jobId=${formData.jobId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold transition-all shadow-sm"
              >
                <ExternalLink size={13} />
                <span>ดูข้อมูล Job</span>
              </Link>
            )}

            <Link
              href={`/repair-orders/${formData.jobId || initialData?.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-[#ff2301] text-xs font-bold transition-all shadow-sm"
            >
              <Printer size={13} />
              <span>พิมพ์ PDF</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SALES JOB REFERENCE CARD (Symmetrical Red/White/Gray)
      ─────────────────────────────────────────────────────────── */}
      {initialData?.job && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 border-l-4 border-l-[#ff2301] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-[#ff2301]" />
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                ข้อมูลงานเบื้องต้นจากฝ่ายขาย (Sales & Job Reference)
              </h2>
            </div>
            <span className="text-[11px] font-bold text-gray-400">
              สถานะปัจจุบัน:{" "}
              <span className="text-gray-800 font-black">{initialData.job.currentStep || "service_receive"}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                เลขที่งาน (Job Number)
              </span>
              <p className="text-sm font-black font-mono text-gray-900 mt-0.5">
                {initialData.job.jobNumber || "—"}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                ลูกค้า / บริษัท
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                {initialData.job.customerName || "—"}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                พนักงานขาย
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                {initialData.job.sellerName || "—"}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                ใบเสนอราคา / PO
              </span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                {initialData.job.quotationNumber || "—"} / {initialData.job.poNumber || "—"}
              </p>
            </div>
          </div>

          {initialData.job.item && (
            <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                สินค้าและรายละเอียดงานจาก Sales
              </span>
              <p className="text-xs font-medium text-gray-700 leading-relaxed">
                {initialData.job.item}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          SECTION 1 & SECTION 2: 2-COLUMN SYMMETRICAL GRID
      ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Section 1: ข้อมูลการรับซ่อม ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <span className="w-7 h-7 rounded-xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center font-black text-xs">
              1
            </span>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                ข้อมูลการรับซ่อม (Repair Details)
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">
                รายละเอียดการเปิดเอกสารรับซ่อมและผู้รับผิดชอบ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Document No */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                เลขที่เอกสาร (Document No.)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={initialData?.job?.jobNumber || formData.jobId || ""}
                  className="w-full pl-9 pr-4 py-2.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none cursor-not-allowed"
                />
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Received Date */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                วันที่รับซ่อม (Repair Date)
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="receivedDate"
                  value={formData.receivedDate || ""}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
                />
              </div>
            </div>

            {/* Work Type */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                ประเภทงาน (Job Type)
              </label>
              <div className="relative">
                <select
                  name="workType"
                  value={formData.workType || "ซ่อม"}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-800 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all appearance-none cursor-pointer pr-8"
                >
                  <option value="ซ่อม">ซ่อม</option>
                  <option value="เคลม">เคลม</option>
                  <option value="ไม่ซ่อม/คืนสินค้า">ไม่ซ่อม/คืนสินค้า</option>
                  <option value="ตรวจเช็ค">ตรวจเช็ค</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Invoice No */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                เลขที่ Invoice (Invoice No.)
              </label>
              <input
                type="text"
                name="invoiceNo"
                placeholder="INV-..."
                value={formData.invoiceNo || ""}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
              />
            </div>

            {/* Receiver Name */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                ผู้รับซ่อม (Recipient)
              </label>
              <div className="relative">
                <select
                  name="receiverName"
                  value={formData.receiverName || ""}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-800 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all appearance-none cursor-pointer pr-8"
                >
                  <option value="">- เลือกผู้รับซ่อม -</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.fullName}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Assigned Technician */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                ช่างผู้รับผิดชอบ (Assigned Tech)
              </label>
              <div className="relative">
                <select
                  name="technicianName"
                  value={formData.technicianName || ""}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-800 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all appearance-none cursor-pointer pr-8"
                >
                  <option value="">- ยังไม่มอบหมายช่าง -</option>
                  {serviceUsers.map((u) => (
                    <option key={u.id} value={u.fullName}>
                      {u.fullName}
                    </option>
                  ))}
                  {users.filter(u => !serviceUsers.includes(u)).map((u) => (
                    <option key={u.id} value={u.fullName}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Forwarded By */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                ส่งต่อโดย (Forwarder)
              </label>
              <input
                type="text"
                name="forwardedBy"
                placeholder="ระบุผู้ส่งต่อ..."
                value={formData.forwardedBy || ""}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
              />
            </div>

            {/* Delivery Note / Ref Job No */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                Delivery Note / Ref Job No
              </label>
              <input
                type="text"
                name="deliveryNoteNo"
                placeholder="เลขที่ใบส่งของ..."
                value={formData.deliveryNoteNo || ""}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: ข้อมูลลูกค้าและการติดต่อ ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <span className="w-7 h-7 rounded-xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center font-black text-xs">
              2
            </span>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                ข้อมูลลูกค้า (Customer & Contact)
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">
                ข้อมูลบริษัทลูกค้า ผู้ติดต่อ และที่อยู่สำหรับการประสานงาน
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Company Search with Suggestions */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                บริษัท / ลูกค้า (Company Name) <span className="text-[#ff2301]">*</span>
              </label>
              <div className="relative">
                <input
                  name="customerCompany"
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.customerCompany || ""}
                  onChange={(e) => handleCompanySearch(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="พิมพ์ค้นหาชื่อบริษัทลูกค้า..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
                />
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  {companySuggestions.length > 0 ? (
                    companySuggestions.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onMouseDown={() => handleCompanySelect(company)}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-red-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <span className="font-bold text-gray-900 block">{company.companyName}</span>
                        {company.address && (
                          <span className="text-[10px] text-gray-400 truncate block mt-0.5">
                            {company.address}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-xs font-bold text-gray-400">
                      ไม่พบข้อมูลบริษัท
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Person Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  ผู้ติดต่อ (Contact Person)
                </label>
                <div className="relative">
                  <input
                    name="contactSearch"
                    type="text"
                    autoComplete="off"
                    value={contactSearchQuery}
                    onChange={(e) => {
                      setContactSearchQuery(e.target.value);
                      setFormData((prev: any) => ({ ...prev, senderName: e.target.value }));
                    }}
                    onBlur={handleBlur}
                    placeholder="พิมพ์ชื่อผู้ติดต่อ..."
                    className="w-full pl-9 pr-4 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
                  />
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                {showContactSuggestions && (
                  <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {contactSuggestions.length > 0 ? (
                      contactSuggestions.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onMouseDown={() => handleContactSelect(contact)}
                          className="w-full text-left px-4 py-3 text-xs hover:bg-red-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <span className="font-bold text-gray-900 block">{contact.contactName}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {contact.phone || contact.mobile || "—"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs font-bold text-gray-400">
                        ไม่พบข้อมูลผู้ติดต่อ
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  เบอร์โทรศัพท์ลูกค้า (Customer Phone)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="customerPhoneNumber"
                    placeholder="02-xxx-xxxx, 08x-xxx-xxxx"
                    value={formData.customerPhoneNumber || ""}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-4 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
                  />
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Customer Address */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                ที่อยู่สำหรับจัดส่ง / ตรวจเช็ค (Address)
              </label>
              <div className="relative">
                <textarea
                  name="customerAddress"
                  rows={2}
                  value={formData.customerAddress || ""}
                  onChange={handleInputChange}
                  placeholder="ระบุที่อยู่ของลูกค้า..."
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all custom-scrollbar"
                />
              </div>
            </div>

            {/* Service Entity */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                บริษัทผู้ให้บริการ (Service Entity)
              </label>
              <div className="relative">
                <select
                  name="company"
                  value={formData.company || "TERA GROUP"}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-800 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all appearance-none cursor-pointer pr-8"
                >
                  <option value="TERA GROUP">TERA GROUP</option>
                  <option value="TERA ELECTRIC">TERA ELECTRIC</option>
                  <option value="TERA POWER">TERA POWER</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 3: รายการสินค้าและอุปกรณ์ (FULL WIDTH SYMMETRICAL TABLE)
      ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center font-black text-xs">
              3
            </span>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                รายการสินค้าและอุปกรณ์ที่รับซ่อม (Product Items)
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">
                ระบุชนิด ยี่ห้อ รุ่น ขนาด Serial Number และจำนวนของอุปกรณ์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#ff2301] border border-red-200 text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus size={14} />
            <span>เพิ่มรายการสินค้า</span>
          </button>
        </div>

        {/* Product Items Table */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[860px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-[50px]">ลำดับ</th>
                  <th className="py-3 px-3 w-[18%]">ชนิด / สินค้า (Type)</th>
                  <th className="py-3 px-3 w-[15%]">ยี่ห้อ (Brand)</th>
                  <th className="py-3 px-3 w-[15%]">รุ่น (Model)</th>
                  <th className="py-3 px-3 w-[12%]">ขนาด (Size)</th>
                  <th className="py-3 px-3 w-[16%]">Serial Number</th>
                  <th className="py-3 px-3 text-center w-[9%]">จำนวน (Qty)</th>
                  <th className="py-3 px-3 w-[15%]">หมายเหตุ (Remark)</th>
                  <th className="py-3 px-3 text-center w-[60px]">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {formData.items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                      {idx + 1}
                    </td>

                    {/* Type */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="ประเภทสินค้า..."
                        value={item.type || ""}
                        onChange={(e) => handleItemChange(idx, "type", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Brand */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="ยี่ห้อ..."
                        value={item.brand || ""}
                        onChange={(e) => handleItemChange(idx, "brand", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Model */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="รุ่น..."
                        value={item.model || ""}
                        onChange={(e) => handleItemChange(idx, "model", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Size */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="ขนาด..."
                        value={item.size || ""}
                        onChange={(e) => handleItemChange(idx, "size", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Serial Number */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="S/N..."
                        value={item.serial || ""}
                        onChange={(e) => handleItemChange(idx, "serial", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty ?? 1}
                        onChange={(e) => handleItemChange(idx, "qty", parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 text-xs font-bold text-center rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Remark */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="หมายเหตุ..."
                        value={item.remark || ""}
                        onChange={(e) => handleItemChange(idx, "remark", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:border-[#ff2301] focus:ring-1 focus:ring-[#ff2301] outline-none"
                      />
                    </td>

                    {/* Delete Action Button */}
                    <td className="py-2 px-2 text-center">
                      {formData.items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="ลบแถวนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 4: อาการเสีย เช็คลิสต์ และรูปถ่าย (2 COLUMNS)
      ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <span className="w-7 h-7 rounded-xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center font-black text-xs">
            4
          </span>
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
              อาการเสีย เช็คลิสต์สภาพเครื่อง และรูปถ่าย (Symptoms, Checklist & Photos)
            </h2>
            <p className="text-[11px] text-gray-400 font-medium">
              ระบุอาการเสีย การตั้งค่า ตรวจสอบรายการภายนอก และแนบรูปภาพอุปกรณ์
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Symptoms & Settings */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
                <AlertCircle size={14} className="text-[#ff2301]" />
                <span>อาการเสียที่ตรวจพบ / ลูกค้าแจ้ง (Symptoms)</span>
              </label>
              <textarea
                name="symptoms"
                rows={4}
                value={formData.symptoms || ""}
                onChange={handleInputChange}
                placeholder="ระบุอาการเสียอย่างละเอียด..."
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all custom-scrollbar"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
                <Cpu size={14} className="text-gray-500" />
                <span>การตั้งค่า / หมายเหตุทางเทคนิค (Settings)</span>
              </label>
              <textarea
                name="settings"
                rows={3}
                value={formData.settings || ""}
                onChange={handleInputChange}
                placeholder="ระบุการตั้งค่าหรือหมายเหตุทางเทคนิค..."
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all custom-scrollbar"
              />
            </div>
          </div>

          {/* Right Column: Checklist & Image Uploads */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                <CheckSquare size={14} className="text-[#ff2301]" />
                <span>การตรวจสอบสภาพภายนอก (Checklist)</span>
              </label>

              {/* Checklist Option Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200">
                {CHECKLIST_OPTIONS.map((item) => {
                  const isChecked = !!formData.checklist[item.key];
                  return (
                    <label
                      key={item.key}
                      onClick={() => handleChecklistChange(item.key)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer border select-none transition-all ${
                        isChecked
                          ? "bg-red-50 text-red-700 border-red-200 shadow-xs"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? "bg-[#ff2301] border-[#ff2301] text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check size={11} className="stroke-[3]" />}
                      </div>
                      <span className="truncate">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Uploaded Images Gallery for Checked Items */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Camera size={14} className="text-[#ff2301]" />
                  <span>รูปภาพอุปกรณ์ตามหัวข้อที่เลือก</span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium">(สูงสุด 50MB ต่อรูป)</span>
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap gap-3">
                {CHECKLIST_OPTIONS.filter((item) => formData.checklist[item.key]).length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    ติ๊กเลือกหัวข้อด้านบนเพื่อแนบรูปถ่ายอุปกรณ์
                  </p>
                ) : (
                  CHECKLIST_OPTIONS.map((item) => {
                    if (!formData.checklist[item.key]) return null;
                    return formData.items.map((_: any, pIdx: number) => {
                      const imgUrl = formData.checklistImages[item.key]?.[pIdx];
                      const isUploadingThis =
                        uploading && uploadTarget?.key === item.key && uploadTarget?.index === pIdx;

                      return (
                        <div
                          key={`${item.key}-${pIdx}`}
                          className="flex flex-col items-center w-[84px] group"
                        >
                          <div
                            onClick={() => triggerUpload(item.key, pIdx)}
                            className={`w-[84px] h-[84px] rounded-2xl border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all relative ${
                              !imgUrl
                                ? "bg-gray-50 border-dashed border-gray-300 hover:border-[#ff2301] hover:bg-red-50/20"
                                : "bg-white border-solid border-gray-200 shadow-sm"
                            }`}
                          >
                            {imgUrl ? (
                              <img src={imgUrl} alt={item.label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-[#ff2301] transition-colors">
                                {isUploadingThis ? (
                                  <span className="w-5 h-5 rounded-full border-2 border-[#ff2301] border-t-transparent animate-spin" />
                                ) : (
                                  <>
                                    <Camera size={20} />
                                    <span className="text-[9px] font-bold uppercase">อัปโหลด</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {imgUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(item.key, pIdx);
                              }}
                              className="mt-1.5 text-[10px] text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full transition-colors"
                            >
                              ลบรูป
                            </button>
                          )}

                          <span className="text-[9px] font-medium text-gray-500 text-center leading-tight mt-1 truncate max-w-[80px]">
                            {item.label.split("/")[0]}
                          </span>
                        </div>
                      );
                    });
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 5: ข้อมูลผู้ส่ง/รับคืน (SYMMETRICAL GRID)
      ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <span className="w-7 h-7 rounded-xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center font-black text-xs">
            5
          </span>
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
              ข้อมูลผู้ส่งซ่อมและนัดหมายส่งคืน (Signatures & Handover)
            </h2>
            <p className="text-[11px] text-gray-400 font-medium">
              ข้อมูลผู้ส่งเครื่องและกำหนดการนัดหมายส่งมอบสินค้าคืน
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sender Name */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              ผู้ส่งซ่อม (Sender Name)
            </label>
            <input
              type="text"
              name="senderName"
              placeholder="ชื่อผู้ส่งเครื่อง..."
              value={formData.senderName || ""}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
            />
          </div>

          {/* Sales Person */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              เซลล์ที่รับผิดชอบ (Sales Person)
            </label>
            <input
              type="text"
              name="salesPerson"
              placeholder="พนักงานขาย..."
              value={formData.salesPerson || ""}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
            />
          </div>

          {/* Received Date */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              วันที่รับซ่อม (Received Date)
            </label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate || ""}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
            />
          </div>

          {/* Sent Date */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              วันที่ส่งของคืน (Return Date)
            </label>
            <input
              type="date"
              name="sentDate"
              value={formData.sentDate || ""}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-[#ff2301]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          STICKY BOTTOM FLOATING ACTION BAR (SYMMETRICAL & MODERN)
      ─────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/90 p-4 shadow-xl z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: Back / Cancel Button */}
          <button
            type="button"
            onClick={() => router.push("/repair-orders")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={15} />
            <span>ยกเลิก</span>
          </button>

          {/* Center: Live feedback message */}
          {message && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <Check size={14} />
              <span>{message}</span>
            </div>
          )}

          {/* Right: Action Buttons Cluster */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Save Button */}
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
            >
              {!isSubmitting && <Save size={15} />}
              <span>บันทึกการแก้ไข</span>
            </LoadingButton>

            {/* Save + Print PDF Button (Primary CTA) */}
            <LoadingButton
              type="button"
              onClick={(e: any) => handleSubmit(e, true)}
              loading={isSubmittingAndPrint}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#bf1a01] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-500/25 active:scale-95"
            >
              {!isSubmittingAndPrint && <Printer size={15} />}
              <span>บันทึก + พิมพ์ใบรับซ่อม (PDF)</span>
            </LoadingButton>
          </div>
        </div>
      </div>
    </form>
  );
}
