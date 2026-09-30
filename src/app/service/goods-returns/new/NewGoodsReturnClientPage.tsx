"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Building2,
  Calendar,
  FileText,
  Package,
  MapPin,
  Briefcase,
  AlertTriangle,
  Loader2,
  Search,
  X,
  FileCheck,
  User,
  Hash,
  ChevronDown,
} from "lucide-react";
import { createGoodsReturn } from "@/app/actions/goodsReturns";

interface GoodsReturnItem {
  no: number;
  itemCode: string;
  description: string;
  model: string;
  serialNumber: string;
  quantity: number;
  unit: string;
  totalAmount: number;
}

const RETURN_TYPE_OPTIONS = [
  { value: "RETURN_TO_CUSTOMER", label: "คืนลูกค้า (Return to Customer)" },
  { value: "RETURN_WITHOUT_REPAIR", label: "คืนโดยไม่ซ่อม (Return Without Repair)" },
  { value: "DEFECT", label: "คืนของเสีย (Defect Return)" },
  { value: "REPAIR", label: "ส่งซ่อม (Repair)" },
  { value: "SUPPLIER", label: "คืนซัพพลายเออร์ (Return to Supplier)" },
];

export default function NewGoodsReturnClientPage({
  companies,
  jobs,
  quotations,
  currentUser,
}: {
  companies: any[];
  jobs: any[];
  quotations: any[];
  currentUser: any;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Form State
  const [formData, setFormData] = useState({
    date: todayStr,
    customer: "",
    deliveryLocation: "",
    reference: "",
    returnType: "RETURN_TO_CUSTOMER",
    status: "Draft",
    receiverName: "",
    receiverDate: "",
    senderName: currentUser?.fullName || "",
    senderDate: todayStr,
    companyId: "",
    jobId: "",
    quotationId: "",
  });

  const [items, setItems] = useState<GoodsReturnItem[]>([
    {
      no: 1,
      itemCode: "",
      description: "",
      model: "",
      serialNumber: "",
      quantity: 1,
      unit: "ชิ้น",
      totalAmount: 0,
    },
  ]);

  // Company Search Dropdown
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    return companies.filter((c) =>
      c.companyName.toLowerCase().includes(companySearch.toLowerCase().trim())
    );
  }, [companies, companySearch]);

  const selectCompany = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    setFormData((prev) => ({
      ...prev,
      companyId,
      customer: comp ? comp.companyName : prev.customer,
      deliveryLocation: comp ? comp.address || "" : prev.deliveryLocation,
    }));
    setCompanySearch(comp ? comp.companyName : "");
    setShowCompanyDropdown(false);
  };

  // Job Search Dropdown
  const [jobSearch, setJobSearch] = useState("");
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return jobs;
    const q = jobSearch.toLowerCase().trim();
    return jobs.filter(
      (j) =>
        (j.jobNumber && j.jobNumber.toLowerCase().includes(q)) ||
        (j.item && j.item.toLowerCase().includes(q))
    );
  }, [jobs, jobSearch]);

  const selectJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    setFormData((prev) => ({
      ...prev,
      jobId,
    }));
    setJobSearch(job ? `${job.jobNumber} - ${job.item || ""}` : "");
    setShowJobDropdown(false);
  };

  // Quotation Search Dropdown
  const [quotationSearch, setQuotationSearch] = useState("");
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);

  const filteredQuotations = useMemo(() => {
    if (!quotationSearch.trim()) return quotations;
    const q = quotationSearch.toLowerCase().trim();
    return quotations.filter(
      (qt) =>
        (qt.quotationNumber && qt.quotationNumber.toLowerCase().includes(q)) ||
        (qt.subject && qt.subject.toLowerCase().includes(q))
    );
  }, [quotations, quotationSearch]);

  const selectQuotation = (quotationId: string) => {
    const quo = quotations.find((q) => q.id === quotationId);
    setFormData((prev) => ({
      ...prev,
      quotationId,
    }));
    setQuotationSearch(
      quo ? `${quo.quotationNumber} - ${quo.subject || ""}` : ""
    );
    setShowQuotationDropdown(false);
  };

  // Input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof GoodsReturnItem,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        no: items.length + 1,
        itemCode: "",
        description: "",
        model: "",
        serialNumber: "",
        quantity: 1,
        unit: "ชิ้น",
        totalAmount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      Swal.fire({
        icon: "info",
        title: "ไม่สามารถลบรายการได้",
        text: "ต้องมีรายการสินค้าส่งคืนอย่างน้อย 1 รายการ",
        confirmButtonColor: "#ff2301",
      });
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.map((item, i) => ({ ...item, no: i + 1 })));
  };

  // Calculations
  const totalQuantity = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [items]);

  const grandTotalAmount = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  }, [items]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อลูกค้า",
        text: "โปรดเลือกลูกค้าจากระบบหรือพิมพ์ระบุชื่อลูกค้า",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setLoading(true);

    const payload = {
      ...formData,
      items: JSON.stringify(items),
    };

    try {
      const res = await createGoodsReturn(payload);

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "สร้างใบส่งคืนสินค้าสำเร็จ",
          text: "บันทึกและสร้างเอกสารส่งคืนสินค้าเรียบร้อยแล้ว",
          timer: 1300,
          showConfirmButton: false,
        });
        router.push("/service/goods-returns");
      } else {
        throw new Error(res.error || "Failed to create goods return");
      }
    } catch (err: any) {
      console.error("Create goods return error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถสร้างเอกสารได้",
        confirmButtonColor: "#ff2301",
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header (Symmetrical Red/White/Gray) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative subtle gradient background */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />

        {/* Left: Branding & Page Identity */}
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <Link
            href="/service/goods-returns"
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-2xl transition-all shadow-sm active:scale-95 shrink-0"
            title="ย้อนกลับไปหน้ารายการ"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                สร้างใบส่งคืนสินค้า
              </h1>
              <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-3 py-1 rounded-full border border-red-200/80">
                NEW GOODS RETURN
              </span>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
              <span>SERVICE LOGISTICS</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 font-normal">
                จัดทำเอกสารส่งคืนสินค้า คืนของเสีย ส่งซ่อม หรือส่งคืนลูกค้า/ซัพพลายเออร์
              </span>
            </p>
          </div>
        </div>

        {/* Right: Symmetrical Action Controls (Unified h-10) */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap relative z-10 shrink-0">
          {/* Cancel button */}
          <Link
            href="/service/goods-returns"
            className="inline-flex items-center gap-1.5 px-5 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95"
          >
            <span>ยกเลิก</span>
          </Link>
        </div>
      </div>

      {/* ── Main Form ── */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: General Info */}
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                ข้อมูลทั่วไปของเอกสาร (General Information)
              </h2>
              <p className="text-xs text-gray-400">
                ระบุวันที่ ประเภทการส่งคืน ข้อมูลลูกค้า และเอกสารอ้างอิง
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                วันที่เอกสาร (Date) <span className="text-[#ff2301]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
                />
              </div>
            </div>

            {/* Return Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                ประเภทการส่งคืน (Return Type) <span className="text-[#ff2301]">*</span>
              </label>
              <select
                name="returnType"
                value={formData.returnType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
              >
                {RETURN_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                สถานะเอกสาร (Document Status)
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
              >
                <option value="Draft">แบบร่าง (Draft)</option>
                <option value="Completed">เสร็จสมบูรณ์ (Completed)</option>
              </select>
            </div>

            {/* Select Customer (Company Search) */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                เลือกลูกค้า / บริษัท (จากระบบ)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาหรือพิมพ์ชื่อลูกค้า..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setFormData((prev) => ({ ...prev, customer: e.target.value }));
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="w-full pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
                />
                {companySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompanySearch("");
                      setFormData((prev) => ({ ...prev, companyId: "", customer: "" }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showCompanyDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 max-h-56 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((c) => (
                      <div
                        key={c.id}
                        className="px-4 py-2.5 hover:bg-red-50/50 hover:text-[#ff2301] cursor-pointer text-xs font-medium transition-colors"
                        onMouseDown={() => selectCompany(c.id)}
                      >
                        <p className="font-bold text-gray-900 hover:text-[#ff2301]">{c.companyName}</p>
                        {c.address && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.address}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-400 text-center">
                      ไม่พบรายชื่อบริษัทในระบบ
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Customer (Free Text) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                ชื่อลูกค้า / ผู้รับการส่งคืน (พิมพ์ระบุเองได้) <span className="text-[#ff2301]">*</span>
              </label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                required
                placeholder="ชื่อบริษัทหรือชื่อลูกค้า"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
              />
            </div>

            {/* Delivery Location */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff2301]" />
                <span>สถานที่ส่งของ / ปลายทางการส่งคืน (Delivery Location)</span>
              </label>
              <input
                type="text"
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                placeholder="ที่อยู่จัดส่ง หรือสถานที่รับสินค้า"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
              />
            </div>

            {/* Link Job */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                อ้างถึงใบงาน (Job Number - ไม่บังคับ)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่ Job..."
                  value={jobSearch}
                  onChange={(e) => {
                    setJobSearch(e.target.value);
                    if (!e.target.value) {
                      setFormData((prev) => ({ ...prev, jobId: "" }));
                    }
                    setShowJobDropdown(true);
                  }}
                  onFocus={() => setShowJobDropdown(true)}
                  className="w-full pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
                />
                {jobSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setJobSearch("");
                      setFormData((prev) => ({ ...prev, jobId: "" }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showJobDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 max-h-56 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((j) => (
                      <div
                        key={j.id}
                        className="px-4 py-2.5 hover:bg-red-50/50 cursor-pointer text-xs font-medium transition-colors"
                        onMouseDown={() => selectJob(j.id)}
                      >
                        <p className="font-bold text-gray-900 font-mono">{j.jobNumber}</p>
                        {j.item && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{j.item}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-400 text-center">
                      ไม่พบข้อมูล Job
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Link Quotation */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                อ้างถึงใบเสนอราคา (Quotation / PO - ไม่บังคับ)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่ใบเสนอราคา..."
                  value={quotationSearch}
                  onChange={(e) => {
                    setQuotationSearch(e.target.value);
                    if (!e.target.value) {
                      setFormData((prev) => ({ ...prev, quotationId: "" }));
                    }
                    setShowQuotationDropdown(true);
                  }}
                  onFocus={() => setShowQuotationDropdown(true)}
                  className="w-full pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400"
                />
                {quotationSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuotationSearch("");
                      setFormData((prev) => ({ ...prev, quotationId: "" }));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showQuotationDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 max-h-56 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {filteredQuotations.length > 0 ? (
                    filteredQuotations.map((q) => (
                      <div
                        key={q.id}
                        className="px-4 py-2.5 hover:bg-red-50/50 cursor-pointer text-xs font-medium transition-colors"
                        onMouseDown={() => selectQuotation(q.id)}
                      >
                        <p className="font-bold text-gray-900 font-mono">{q.quotationNumber}</p>
                        {q.subject && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{q.subject}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-gray-400 text-center">
                      ไม่พบข้อมูลใบเสนอราคา
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional Reference */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                เลขที่อ้างอิงเพิ่มเติม (Reference Notes)
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="เช่น ใบกำกับภาษีเลขที่, ใบเคลมสินค้า, เลขที่ขนส่ง..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Returned Items Table */}
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-gray-900">
                    รายการสินค้าที่ส่งคืน (Returned Items)
                  </h2>
                  <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                    {items.length} รายการ
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  ระบุรายละเอียด รหัสสินค้า รุ่น หมายเลขเครื่อง และจำนวน
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-[#ff2301] text-xs font-bold transition-all shadow-sm active:scale-95 border border-red-100 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายการสินค้า</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">ลำดับ</th>
                  <th className="py-3 px-3 w-36">รหัสสินค้า (Item Code)</th>
                  <th className="py-3 px-3 min-w-[180px]">รายละเอียดสินค้า (Description)</th>
                  <th className="py-3 px-3 w-32">รุ่น (Model)</th>
                  <th className="py-3 px-3 w-32">Serial No. (S/N)</th>
                  <th className="py-3 px-3 w-20 text-right">จำนวน</th>
                  <th className="py-3 px-3 w-20 text-center">หน่วย</th>
                  <th className="py-3 px-3 w-28 text-right">มูลค่ารวม (฿)</th>
                  <th className="py-3 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                      {item.no || index + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.itemCode || ""}
                        onChange={(e) =>
                          handleItemChange(index, "itemCode", e.target.value)
                        }
                        placeholder="รหัสสินค้า"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        placeholder="ชื่อหรือรายละเอียดสินค้า"
                        required
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.model || ""}
                        onChange={(e) =>
                          handleItemChange(index, "model", e.target.value)
                        }
                        placeholder="รุ่น Model"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.serialNumber || ""}
                        onChange={(e) =>
                          handleItemChange(index, "serialNumber", e.target.value)
                        }
                        placeholder="S/N"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-right font-bold focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.unit || ""}
                        onChange={(e) =>
                          handleItemChange(index, "unit", e.target.value)
                        }
                        placeholder="ชิ้น"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-center focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.totalAmount || 0}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "totalAmount",
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-right font-mono font-medium focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Symmetrical Summary Bar */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-400 font-semibold">จำนวนรายการทั้งหมด:</span>
                <span className="font-bold text-gray-900 ml-2">{items.length} รายการ</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold">จำนวนชิ้นรวม:</span>
                <span className="font-bold text-gray-900 ml-2">{totalQuantity}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-bold uppercase tracking-wider">
                มูลค่ารวมทั้งสิ้น:
              </span>
              <span className="text-base font-black text-[#ff2301] font-mono">
                ฿{grandTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Signatures & Representatives */}
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5 text-[#ff2301]" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                ข้อมูลการส่งมอบและลงนาม (Signatures &amp; Personnel)
              </h2>
              <p className="text-xs text-gray-400">
                ระบุชื่อผู้ส่งและผู้รับสินค้าสำหรับพิมพ์ลงบนเอกสารทางการ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender Box */}
            <div className="p-5 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <User className="w-4 h-4 text-[#ff2301]" />
                <span>ผู้ส่งสินค้า (Sender)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  ชื่อผู้ส่งสินค้า
                </label>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleChange}
                  placeholder="ชื่อ-นามสกุล ผู้ส่ง"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  วันที่ส่งสินค้า
                </label>
                <input
                  type="date"
                  name="senderDate"
                  value={formData.senderDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
                />
              </div>
            </div>

            {/* Receiver Box */}
            <div className="p-5 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <User className="w-4 h-4 text-[#ff2301]" />
                <span>ผู้รับสินค้า (Receiver)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  ชื่อผู้รับสินค้า
                </label>
                <input
                  type="text"
                  name="receiverName"
                  value={formData.receiverName}
                  onChange={handleChange}
                  placeholder="ชื่อ-นามสกุล ผู้รับ"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  วันที่รับสินค้า
                </label>
                <input
                  type="date"
                  name="receiverDate"
                  value={formData.receiverDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Action Footer (Symmetrical) */}
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/service/goods-returns"
            className="w-full sm:w-auto px-6 h-11 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ยกเลิกและย้อนกลับ</span>
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 h-11 text-xs font-bold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกเอกสาร...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกและสร้างเอกสาร</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
