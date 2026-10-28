/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Copy,
  Building2,
  Package,
  Phone,
  Loader2,
  X,
  User,
  Tag,
} from "lucide-react";
import { createGoodsReturn, updateGoodsReturn } from "@/app/actions/goodsReturns";
import {
  RETURN_TYPES,
  ReturnItem,
  INTERNAL_COMPANIES,
  getInternalCompanyMeta,
  parseGoodsReturnData,
} from "../types";

interface Props {
  initialData?: any;
  companies: any[];
  jobs: any[];
  quotations?: any;
  currentUser: any;
  isEdit?: boolean;
  basePath?: string; // default "/store/returns"
}

const QUICK_REASONS = [
  "เปลี่ยนสเปคสินค้าตามหน้างาน",
  "ผิดรุ่น / ไม่ตรงตามที่ระบุ",
  "ส่งคืนคลังสินค้า (ไม่ใช้งาน)",
  "สินค้าชำรุด / เสียหาย",
  "สินค้าส่วนเกินเหลือจากโครงการ",
];

const COMMON_TYPES = [
  "เช็ควาล์ว",
  "บอลวาล์ว",
  "เกทวาล์ว",
  "อินเวอร์เตอร์",
  "สายไฟ / สายเคเบิล",
  "ตู้ควบคุม / ตู้สวิตช์บอร์ด",
  "เบรกเกอร์ (MCCB / MCB)",
  "ปั๊มน้ำ",
  "ท่อ / ข้อต่อ",
  "มิเตอร์ไฟฟ้า",
  "เซนเซอร์ / อุปกรณ์วัด",
  "อุปกรณ์ยึดจับ / แคลมป์",
];

export default function GoodsReturnForm({
  initialData,
  companies,
  jobs,
  currentUser,
  isEdit = false,
  basePath = "/store/returns",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const parsedInitial = useMemo(() => {
    return parseGoodsReturnData(initialData);
  }, [initialData]);

  // Form State
  const [formData, setFormData] = useState({
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : todayStr,
    customer: initialData?.customer || "",
    deliveryLocation: initialData?.deliveryLocation || "",
    reference: initialData?.reference || "",
    returnType: initialData?.returnType || "CHANGE_SPEC",
    status: initialData?.status || "Draft",
    receiverName: initialData?.receiverName || (currentUser?.fullName || ""),
    receiverDate: initialData?.receiverDate
      ? new Date(initialData.receiverDate).toISOString().split("T")[0]
      : todayStr,
    senderName: initialData?.senderName || "",
    senderDate: initialData?.senderDate
      ? new Date(initialData.senderDate).toISOString().split("T")[0]
      : todayStr,
    companyId: initialData?.companyId || "",
    jobId: initialData?.jobId || "",
    quotationId: initialData?.quotationId || "",
    internalCompany: (parsedInitial.internalCompany || "TG") as "TG" | "TP" | "TE",
    phoneNumber: parsedInitial.phoneNumber || "",
    reason: parsedInitial.reason || (isEdit ? "" : "เปลี่ยนสเปคสินค้าตามหน้างาน"),
    settings: parsedInitial.settings || "",
    notes: parsedInitial.notes || "",
  });

  const [items, setItems] = useState<ReturnItem[]>(
    parsedInitial.items.length > 0
      ? parsedInitial.items
      : [
          {
            no: 1,
            type: "",
            brand: "",
            model: "",
            size: "",
            serialNumber: "",
            quantity: 1,
            unit: "ตัว",
            remark: "",
          },
        ]
  );

  // Company Search Dropdown
  const [companySearch, setCompanySearch] = useState(
    initialData?.company?.companyName || initialData?.customer || ""
  );
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies.slice(0, 50);
    const q = companySearch.toLowerCase().trim();
    return companies
      .filter((c) => c.companyName.toLowerCase().includes(q))
      .slice(0, 50);
  }, [companies, companySearch]);

  const selectCompany = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    if (comp) {
      setFormData((prev) => ({
        ...prev,
        companyId,
        customer: comp.companyName,
        deliveryLocation: comp.address || prev.deliveryLocation,
        phoneNumber: comp.phoneNumber || prev.phoneNumber,
      }));
      setCompanySearch(comp.companyName);
    }
    setShowCompanyDropdown(false);
  };

  // Job Search Dropdown
  const [jobSearch, setJobSearch] = useState(
    initialData?.job?.jobNumber ? `${initialData.job.jobNumber} - ${initialData.job.item || ""}` : ""
  );
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return jobs.slice(0, 50);
    const q = jobSearch.toLowerCase().trim();
    return jobs
      .filter(
        (j) =>
          (j.jobNumber && j.jobNumber.toLowerCase().includes(q)) ||
          (j.item && j.item.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [jobs, jobSearch]);

  const selectJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setFormData((prev) => ({
        ...prev,
        jobId,
        reference: prev.reference ? prev.reference : job.jobNumber,
      }));
      setJobSearch(`${job.jobNumber} - ${job.item || ""}`);
    }
    setShowJobDropdown(false);
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
    field: keyof ReturnItem,
    value: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        no: prev.length + 1,
        type: "",
        brand: "",
        model: "",
        size: "",
        serialNumber: "",
        quantity: 1,
        unit: "ตัว",
        remark: "",
      },
    ]);
  };

  const duplicateItem = (index: number) => {
    const target = items[index];
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, {
        ...target,
        no: copy.length + 1,
        serialNumber: "",
      });
      return copy.map((it, i) => ({ ...it, no: i + 1 }));
    });
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
    setItems((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      return copy.map((it, i) => ({ ...it, no: i + 1 }));
    });
  };

  // Total Quantity
  const totalQuantity = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  }, [items]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อบริษัท / ซับคอนแทรคเตอร์",
        text: "โปรดเลือกลูกค้า/ซับคอนแทรคเตอร์จากระบบ หรือพิมพ์ชื่อบริษัท",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    // Check at least one item has some info
    const hasValidItem = items.some(
      (it) => it.type.trim() || it.model.trim() || it.brand.trim()
    );
    if (!hasValidItem) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุรายการสินค้า",
        text: "โปรดระบุประเภทสินค้า ยี่ห้อ หรือรุ่น/โมเดล อย่างน้อย 1 รายการ",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setLoading(true);

    // Prepare payload
    // We store items as JSON object with list + extended metadata to preserve backward compatibility
    const itemsPayload = JSON.stringify({
      list: items,
      reason: formData.reason,
      settings: formData.settings,
      phoneNumber: formData.phoneNumber,
      subcontractor: formData.customer,
      notes: formData.notes,
      internalCompany: formData.internalCompany,
    });

    const payload = {
      date: formData.date ? new Date(formData.date) : new Date(),
      customer: formData.customer,
      deliveryLocation: formData.deliveryLocation,
      reference: formData.reference,
      returnType: formData.returnType,
      status: formData.status,
      receiverName: formData.receiverName,
      receiverDate: formData.receiverDate ? new Date(formData.receiverDate) : undefined,
      senderName: formData.senderName,
      senderDate: formData.senderDate ? new Date(formData.senderDate) : undefined,
      companyId: formData.companyId || undefined,
      jobId: formData.jobId || undefined,
      quotationId: formData.quotationId || undefined,
      items: itemsPayload,
    };

    try {
      let res: any;
      if (isEdit && initialData?.id) {
        res = await updateGoodsReturn(initialData.id, payload);
      } else {
        res = await createGoodsReturn(payload);
      }

      if (res.success) {
        const targetId = isEdit ? initialData.id : res.goodsReturnId;
        const actionResult = await Swal.fire({
          icon: "success",
          title: isEdit ? "อัปเดตใบส่งคืนสำเร็จ" : "สร้างใบส่งคืนสินค้าสำเร็จ",
          text: isEdit
            ? "บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว"
            : "จัดทำเอกสารส่งคืนสินค้าเข้าสู่ระบบเรียบร้อย",
          showCancelButton: true,
          confirmButtonColor: "#ff2301",
          cancelButtonColor: "#374151",
          confirmButtonText: "พิมพ์เอกสาร (Print)",
          cancelButtonText: "กลับหน้ารายการ",
        });

        if (actionResult.isConfirmed && targetId) {
          router.push(`${basePath}/${targetId}/print`);
        } else {
          router.push(basePath);
        }
      } else {
        throw new Error(res.error || "บันทึกข้อมูลไม่สำเร็จ");
      }
    } catch (err: any) {
      console.error("Save goods return error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถบันทึกเอกสารได้",
        confirmButtonColor: "#ff2301",
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />

        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <Link
            href={basePath}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-2xl transition-all shadow-sm active:scale-95 shrink-0"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {isEdit ? "แก้ไขใบส่งคืนสินค้า" : "สร้างใบส่งคืนสินค้า (Return Note)"}
              </h1>
              <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-3 py-1 rounded-full border border-red-200/80">
                {isEdit ? initialData?.documentNo : "แบบฟอร์มคลังสินค้า / FO-EN-03"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              จัดทำเอกสารส่งคืนสินค้า คืนสโตร์ เปลี่ยนสเปคสินค้าจากซับคอนแทรคเตอร์ หรือส่งซ่อม
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link
            href={basePath}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-all"
          >
            ยกเลิก
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-sm font-bold shadow-md shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEdit ? "บันทึกการแก้ไข" : "บันทึกเอกสาร"}</span>
          </button>
        </div>
      </div>

      {/* ── Main Form Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Header Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#ff2301] font-bold">
                1
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">ข้อมูลทั่วไปและต้นทาง</h2>
                <p className="text-xs text-gray-500">
                  ระบุบริษัทในเครือผู้รับสินค้าคืน บริษัทคู่ค้า / ซับคอนแทรคเตอร์ วันที่ และประเภทการส่งคืน
                </p>
              </div>
            </div>

            {/* Document Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">สถานะ:</span>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Draft">แบบร่าง (Draft)</option>
                <option value="Completed">เสร็จสมบูรณ์ (Completed)</option>
              </select>
            </div>
          </div>

          {/* Internal Company Selector (TG / TP / TE) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-gray-50 via-slate-50 to-red-50/20 border border-gray-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#ff2301]" />
                  บริษัทในเครือผู้รับสินค้าคืน (Company) <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  เลือกบริษัทในเครือเพื่อแสดงในหัวเอกสารและใบส่งคืนสินค้า
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                เลือก: <span className="text-[#ff2301] font-black">{formData.internalCompany}</span> - {getInternalCompanyMeta(formData.internalCompany).fullName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? "border-[#ff2301] bg-white ring-2 ring-red-500/20 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50/80 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                        isSelected
                          ? "bg-[#ff2301] text-white shadow-md shadow-red-500/25"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {c.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-gray-900 truncate">
                          {c.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold text-[#ff2301] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            เลือกใช้งาน
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-700 truncate mt-0.5">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {c.fullName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Return Date */}
            <div>
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center mb-1.5">
                วันที่ส่งคืน <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm font-medium focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all bg-white"
                />
              </div>
            </div>

            {/* Return Type */}
            <div>
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center mb-1.5">
                ประเภทการส่งคืน <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="returnType"
                value={formData.returnType}
                onChange={handleChange}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all bg-white"
              >
                {RETURN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference (JOB / PO) */}
            <div className="relative">
              <div className="flex items-center justify-between h-5 mb-1.5">
                <label className="text-xs font-bold text-gray-700">
                  เลขอ้างอิง (JOB / PO / Quotation)
                </label>
                {jobs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowJobDropdown((v) => !v)}
                    className="text-[11px] text-[#ff2301] hover:underline font-semibold"
                  >
                    เลือกจาก JOB
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="เช่น JOB-2569-041 หรือ PO-TE-2601"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all font-mono bg-white"
                />
              </div>

              {showJobDropdown && filteredJobs.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>เลือก Job ในระบบ</span>
                    <button
                      type="button"
                      onClick={() => setShowJobDropdown(false)}
                      className="hover:text-gray-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {filteredJobs.map((j) => (
                    <button
                      type="button"
                      key={j.id}
                      onClick={() => selectJob(j.id)}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-xs border-b border-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="font-mono font-bold text-gray-900">{j.jobNumber}</span>
                      <span className="text-[11px] text-gray-400 truncate max-w-[180px]">{j.item || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Company / Subcontractor Autocomplete */}
            <div className="relative md:col-span-2">
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center mb-1.5">
                บริษัท / ซับคอนแทรคเตอร์ / ผู้ส่งสินค้า <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({ ...prev, customer: val }));
                    setCompanySearch(val);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  placeholder="ค้นหาหรือพิมพ์ชื่อบริษัท เช่น บจก. สกาววิวัฒน์"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-300 text-sm font-semibold focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all bg-white"
                  required
                />
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>

              {/* Dropdown search results */}
              {showCompanyDropdown && filteredCompanies.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto">
                  <div className="p-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>เลือกคู่ค้าจากระบบ ({filteredCompanies.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowCompanyDropdown(false)}
                      className="hover:text-gray-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {filteredCompanies.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => selectCompany(c.id)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-xs font-medium text-gray-800 border-b border-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="font-bold text-gray-900">{c.companyName}</span>
                      <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
                        {c.address || ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center mb-1.5">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="เช่น 080 131 8518"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all bg-white"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center mb-1.5">
                ที่อยู่ / สถานที่หน้างาน
              </label>
              <input
                type="text"
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                placeholder="ระบุที่อยู่ หรือสถานที่ส่งคืนสินค้า เช่น 39 ซอยเฉลิมพระเกียรติ ร.9 ซ.28 แขวงดอกไม้ เขตประเวศ กทม."
                className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Items Table (Matches FO-EN-03 form) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#ff2301] font-bold">
                2
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  รายการสินค้าส่งคืน ({items.length} รายการ | รวม {totalQuantity} ชิ้น/ตัว)
                </h2>
                <p className="text-xs text-gray-500">
                  ตารางตามใบส่งคืนสินค้า FO-EN-03 (ประเภทสินค้า, ยี่ห้อ, รุ่น/โมเดล, ขนาด, S/N, จำนวน)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มแถวสินค้า</span>
            </button>
          </div>

          {/* Quick presets for common item types */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-gray-500">
            <span className="font-semibold text-gray-400 shrink-0">ตัวเลือกประเภทบ่อย:</span>
            {COMMON_TYPES.slice(0, 6).map((tp) => (
              <button
                type="button"
                key={tp}
                onClick={() => {
                  // Fill empty first row or add
                  const emptyIdx = items.findIndex((it) => !it.type);
                  if (emptyIdx >= 0) {
                    handleItemChange(emptyIdx, "type", tp);
                  } else {
                    setItems((prev) => [
                      ...prev,
                      {
                        no: prev.length + 1,
                        type: tp,
                        brand: "",
                        model: "",
                        size: "",
                        serialNumber: "",
                        quantity: 1,
                        unit: "ตัว",
                        remark: "",
                      },
                    ]);
                  }
                }}
                className="px-2.5 py-1 bg-gray-100 hover:bg-red-50 hover:text-[#ff2301] rounded-lg transition-colors shrink-0 font-medium"
              >
                + {tp}
              </button>
            ))}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full min-w-[900px] text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                  <th className="py-3 px-3 min-w-[150px]">ประเภทสินค้า</th>
                  <th className="py-3 px-3 min-w-[130px]">ยี่ห้อ</th>
                  <th className="py-3 px-3 min-w-[180px]">รุ่น / โมเดล</th>
                  <th className="py-3 px-3 min-w-[90px]">ขนาด</th>
                  <th className="py-3 px-3 min-w-[140px]">Serial No.</th>
                  <th className="py-3 px-3 text-center min-w-[80px]">จำนวน</th>
                  <th className="py-3 px-3 min-w-[70px]">หน่วย</th>
                  <th className="py-3 px-3 min-w-[140px]">หมายเหตุ</th>
                  <th className="py-3 px-2 text-center w-20">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-red-50/30 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center font-bold text-gray-500">
                      {index + 1}
                    </td>

                    {/* Type / Category */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.type}
                        onChange={(e) =>
                          handleItemChange(index, "type", e.target.value)
                        }
                        placeholder="เช่น เช็ควาล์ว"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Brand */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) =>
                          handleItemChange(index, "brand", e.target.value)
                        }
                        placeholder="เช่น ARITA"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Model */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.model}
                        onChange={(e) =>
                          handleItemChange(index, "model", e.target.value)
                        }
                        placeholder="เช่น เช็ควาล์ว 3'' หรือ S1-1"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) =>
                          handleItemChange(index, "size", e.target.value)
                        }
                        placeholder="เช่น 3'', 100kW"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Serial No. */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.serialNumber}
                        onChange={(e) =>
                          handleItemChange(index, "serialNumber", e.target.value)
                        }
                        placeholder="S/N (ถ้ามี)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center font-bold focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, "unit", e.target.value)
                        }
                        placeholder="ตัว/ชิ้น"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Remark */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) =>
                          handleItemChange(index, "remark", e.target.value)
                        }
                        placeholder="เช่น สลับรุ่น, คืนคลัง"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#ff2301] focus:border-[#ff2301] outline-none bg-white"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          title="ทำซ้ำแถวนี้"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          title="ลบแถวนี้"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Reason, Settings & Signatures */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#ff2301] font-bold">
              3
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">
                สาเหตุการคืนสินค้า & ลายมือชื่อ
              </h2>
              <p className="text-xs text-gray-500">
                ระบุเหตุผล (เช่น ผิดรุ่น, เปลี่ยนสเปค) และข้อมูลผู้ส่งคืน/ผู้ตรวจรับคลังสินค้า
              </p>
            </div>
          </div>

          {/* Quick presets strip spanning full width */}
          <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 shrink-0">
              <Tag className="w-3.5 h-3.5 text-[#ff2301]" />
              <span>เลือกสาเหตุการส่งคืนที่พบบ่อย:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setFormData((prev) => ({ ...prev, reason: r }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    formData.reason === r
                      ? "bg-red-50 border-red-300 text-[#ff2301] shadow-xs"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Symmetrical Two-Column Textareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Reason / Symptoms */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center">
                อาการเสีย / สาเหตุการส่งคืน <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="reason"
                rows={4}
                value={formData.reason}
                onChange={handleChange}
                placeholder="ระบุสาเหตุการส่งคืนอย่างละเอียด เช่น ทางซับมีการส่งสินค้าแล้วเปลี่ยนสเปคสินค้า หรือ ผิดรุ่น"
                className="w-full h-32 px-3.5 py-2.5 rounded-2xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all font-medium resize-none bg-white"
                required
              />
            </div>

            {/* Right Column: Settings / Remarks */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-bold text-gray-700 h-5 flex items-center">
                การตั้งค่า / หมายเหตุเพิ่มเติม
              </label>
              <textarea
                name="settings"
                rows={4}
                value={formData.settings}
                onChange={handleChange}
                placeholder="ระบุการตั้งค่า หรือเงื่อนไขเพิ่มเติม (ถ้ามี)"
                className="w-full h-32 px-3.5 py-2.5 rounded-2xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none transition-all resize-none bg-white"
              />
            </div>
          </div>

          {/* Symmetrical Signature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            {/* Sender (ซับคอนแทรคเตอร์ / ผู้ส่ง) */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 h-6">
                <User className="w-4 h-4 text-[#ff2301]" />
                <span>ผู้ส่งคืนสินค้า (ซับคอนแทรคเตอร์ / คู่ค้า)</span>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500">
                  ชื่อ-สกุล ผู้ส่งคืน
                </label>
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleChange}
                  placeholder="เช่น เผ่าอินทร์"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs font-semibold focus:ring-2 focus:ring-[#ff2301] outline-none bg-white transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500">
                  วันที่ส่งคืน
                </label>
                <input
                  type="date"
                  name="senderDate"
                  value={formData.senderDate}
                  onChange={handleChange}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#ff2301] outline-none bg-white transition-all"
                />
              </div>
            </div>

            {/* Receiver (เจ้าหน้าที่คลังสินค้า) */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 h-6">
                <Package className="w-4 h-4 text-[#ff2301]" />
                <span>ผู้รับคืนสินค้า (เจ้าหน้าที่คลังสินค้า / TERA)</span>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500">
                  ชื่อ-สกุล ผู้ตรวจรับ
                </label>
                <input
                  type="text"
                  name="receiverName"
                  value={formData.receiverName}
                  onChange={handleChange}
                  placeholder="ชื่อเจ้าหน้าที่สโตร์ / คลังสินค้า"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs font-semibold focus:ring-2 focus:ring-[#ff2301] outline-none bg-white transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500">
                  วันที่รับเข้าคลัง
                </label>
                <input
                  type="date"
                  name="receiverDate"
                  value={formData.receiverDate}
                  onChange={handleChange}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#ff2301] outline-none bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={basePath}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-all"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-base font-bold shadow-lg shadow-red-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{isEdit ? "บันทึกการแก้ไข" : "บันทึกเอกสารส่งคืนสินค้า"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
