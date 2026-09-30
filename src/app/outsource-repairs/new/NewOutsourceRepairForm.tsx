"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  Truck,
  Building2,
  UserCheck,
  Calendar,
  Clock,
  User,
  Cpu,
  Plus,
  Trash2,
  Save,
  FileSignature,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  Settings,
  FileText,
  Phone,
  MapPin,
  Search,
  Loader2,
  X,
  ClipboardList,
  Check,
  Info,
} from "lucide-react";
import { createOutsourceRepair } from "@/app/actions/outsourceRepairs";
import { searchCompanies } from "@/app/actions/sales";

interface UserOption {
  id: string;
  name: string;
  position: string;
}

interface ItemRow {
  id: string;
  type: string;
  brand: string;
  model: string;
  size: string;
  serial: string;
  qty: number;
  remark: string;
}

interface Props {
  users: UserOption[];
  currentUserId: string;
  initialJob?: {
    id: string;
    jobNumber: string;
    customerName?: string | null;
    companyCode?: string | null;
    sellerName?: string | null;
    item?: string | null;
  } | null;
}

export default function NewOutsourceRepairForm({
  users,
  currentUserId,
  initialJob,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Document & Schedule State ──
  const [outsourceNumber, setOutsourceNumber] = useState("");
  const [sentDate, setSentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [senderName, setSenderName] = useState("");
  const [jobId, setJobId] = useState(initialJob?.id || "");

  // ── Vendor State (Supplier) with Smart Search ──
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [isVendorSearching, setIsVendorSearching] = useState(false);
  const [vendorSearchResults, setVendorSearchResults] = useState<any[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorSearchRef = useRef<HTMLDivElement>(null);

  // ── Customer State with Smart Search ──
  const [customerName, setCustomerName] = useState(
    initialJob?.customerName || ""
  );
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState(
    initialJob?.customerName || ""
  );
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // ── Items State ──
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: crypto.randomUUID(),
      type: initialJob?.item || "",
      brand: "",
      model: "",
      size: "",
      serial: "",
      qty: 1,
      remark: "",
    },
  ]);

  // ── Symptoms, Settings & Remarks ──
  const [symptoms, setSymptoms] = useState("");
  const [settings, setSettings] = useState("");
  const [remark, setRemark] = useState("");

  // Default Sender Name to Current User
  useEffect(() => {
    const u = users.find((u) => u.id === currentUserId);
    if (u && !senderName) {
      setSenderName(u.name);
    }
  }, [currentUserId, users, senderName]);

  // Vendor Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (vendorSearchQuery.trim().length >= 2) {
        setIsVendorSearching(true);
        try {
          const results = await searchCompanies(vendorSearchQuery);
          setVendorSearchResults(results || []);
          setShowVendorDropdown(true);
        } catch (err) {
          console.error("Vendor search error:", err);
        } finally {
          setIsVendorSearching(false);
        }
      } else {
        setVendorSearchResults([]);
        setShowVendorDropdown(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [vendorSearchQuery]);

  // Customer Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (customerSearchQuery.trim().length >= 2 && customerSearchQuery !== customerName) {
        setIsCustomerSearching(true);
        try {
          const results = await searchCompanies(customerSearchQuery);
          setCustomerSearchResults(results || []);
          setShowCustomerDropdown(true);
        } catch (err) {
          console.error("Customer search error:", err);
        } finally {
          setIsCustomerSearching(false);
        }
      } else {
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchQuery, customerName]);

  // Click outside to close autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        vendorSearchRef.current &&
        !vendorSearchRef.current.contains(event.target as Node)
      ) {
        setShowVendorDropdown(false);
      }
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Autocomplete Selection
  const handleSelectVendor = (company: any) => {
    const name = company.companyName || "";
    setVendorName(name);
    setVendorSearchQuery(name);

    const addressParts = [
      company.address,
      company.subDistrict,
      company.district,
      company.province,
      company.postalCode,
    ].filter(Boolean);
    setVendorAddress(addressParts.join(" ").trim());
    if (company.phone) setVendorPhone(company.phone);

    setShowVendorDropdown(false);
  };

  const handleSelectCustomer = (company: any) => {
    const name = company.companyName || "";
    setCustomerName(name);
    setCustomerSearchQuery(name);

    const addressParts = [
      company.address,
      company.subDistrict,
      company.district,
      company.province,
      company.postalCode,
    ].filter(Boolean);
    setCustomerAddress(addressParts.join(" ").trim());
    if (company.phone) setCustomerPhone(company.phone);

    setShowCustomerDropdown(false);
  };

  // Item Table Handlers
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "",
        brand: "",
        model: "",
        size: "",
        serial: "",
        qty: 1,
        remark: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Total quantity calculation
  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [items]);

  // Reset form
  const handleReset = async () => {
    const confirm = await Swal.fire({
      title: "ยืนยันการล้างข้อมูล?",
      text: "ข้อมูลที่คุณกรอกทั้งหมดในฟอร์มจะถูกรีเซ็ตกลับเป็นค่าเริ่มต้น",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ล้างข้อมูล",
      cancelButtonText: "ยกเลิก",
    });

    if (confirm.isConfirmed) {
      setOutsourceNumber("");
      setSentDate(new Date().toISOString().split("T")[0]);
      setExpectedReturnDate("");
      setVendorName("");
      setVendorSearchQuery("");
      setVendorAddress("");
      setVendorPhone("");
      setCustomerName("");
      setCustomerSearchQuery("");
      setCustomerAddress("");
      setCustomerPhone("");
      setItems([
        {
          id: crypto.randomUUID(),
          type: "",
          brand: "",
          model: "",
          size: "",
          serial: "",
          qty: 1,
          remark: "",
        },
      ]);
      setSymptoms("");
      setSettings("");
      setRemark("");
    }
  };

  // Submit Handler
  const handleSubmit = async (action: "save" | "print") => {
    if (!vendorName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุซัพพลายเออร์",
        text: "จำเป็นต้องระบุชื่อบริษัทหรือซัพพลายเออร์ผู้รับซ่อม",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    const hasValidItem = items.some((i) => i.type.trim() || i.model.trim());
    if (!hasValidItem) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุรายการอุปกรณ์",
        text: "โปรดระบุประเภทสินค้าหรือรุ่นโมเดลอย่างน้อย 1 รายการ",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        outsourceNumber: outsourceNumber.trim() || null,
        jobId: jobId || null,
        vendorName: vendorName.trim(),
        vendorAddress: vendorAddress.trim() || null,
        vendorPhone: vendorPhone.trim() || null,
        customerName: customerName.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerPhone: customerPhone.trim() || null,
        sentDate,
        expectedReturnDate: expectedReturnDate || null,
        items: items.map((i) => ({
          type: i.type.trim(),
          brand: i.brand.trim(),
          model: i.model.trim(),
          size: i.size.trim(),
          serial: i.serial.trim(),
          qty: Number(i.qty) || 1,
          remark: i.remark.trim(),
        })),
        symptoms: symptoms.trim() || null,
        settings: settings.trim() || null,
        remark: remark.trim() || null,
        sender: senderName.trim() || null,
      };

      const result = await createOutsourceRepair(payload);

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "บันทึกสำเร็จ",
          text: "สร้างใบส่งซ่อมภายนอกเรียบร้อยแล้ว",
          timer: 1500,
          showConfirmButton: false,
        });

        if (action === "print" && result.id) {
          router.push(`/outsource-repairs/${result.id}/pdf`);
        } else {
          router.push("/outsource-repairs");
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
          confirmButtonColor: "#ff2301",
        });
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsSubmitting(false);
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
                <Truck className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2301] animate-ping" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  สร้างใบส่งซ่อมภายนอก
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                  เปิดงานส่งซ่อมใหม่
                </span>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 flex flex-wrap items-center gap-2">
                <span>OUTSOURCE REPAIR & VENDOR MANAGEMENT</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-400 font-normal">
                  ระบบบันทึกและออกใบส่งซ่อมภายนอกโรงงาน
                </span>
              </p>
            </div>
          </div>

          {/* Right: Symmetrical Action Button Cluster (Single Row, Unified h-10 Heights) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap w-full lg:w-auto justify-start lg:justify-end overflow-x-auto pb-1 lg:pb-0">
            {/* Back Button */}
            <Link
              href="/outsource-repairs"
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              <span>กลับหน้ารายการ</span>
            </Link>

            {/* Reset Form Button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-40"
              title="ล้างข้อมูลฟอร์ม"
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

            {/* Primary Save + Print PDF Button */}
            <button
              type="button"
              onClick={() => handleSubmit("print")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all active:scale-95 shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSignature className="w-4 h-4" />
              )}
              <span>บันทึก + พิมพ์ PDF</span>
            </button>
          </div>
        </div>

        {/* Mini Meta Info Strip */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
            <span>
              สถานะเอกสารเริ่มต้น:{" "}
              <strong className="text-gray-900">อยู่ระหว่างส่งซ่อม (SENT)</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span>
              ผู้ทำรายการ:{" "}
              <strong className="text-gray-900">
                {senderName || "เจ้าหน้าที่บริการ"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Linked Sales Job Callout (If Linked) ── */}
      {initialJob && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                เชื่อมโยงจากงานขาย (Sales Job Reference)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-gray-900 text-white">
              {initialJob.jobNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">
                ลูกค้า/บริษัท
              </span>
              <span className="font-bold text-gray-800 text-sm">
                {initialJob.customerName || "-"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">
                พนักงานขาย
              </span>
              <span className="font-bold text-gray-800 text-sm">
                {initialJob.sellerName || "-"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">
                สังกัดบริษัท
              </span>
              <span className="font-bold text-gray-800 text-sm">
                {initialJob.companyCode || "TERA"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">
                สินค้าจาก Job
              </span>
              <span className="font-bold text-gray-800 text-sm truncate block">
                {initialJob.item || "-"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: ข้อมูลเอกสารและกำหนดเวลา ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                1. ข้อมูลเอกสารและกำหนดเวลา
              </h2>
              <p className="text-xs text-gray-400">
                DOCUMENT SPECIFICATIONS & SCHEDULE TIMELINE
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
            ข้อมูลหลัก
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Document Number */}
          <div>
            <label className={labelClass}>
              เลขที่ใบส่งซ่อม <span className="text-gray-400 font-normal">(ถ้ามี)</span>
            </label>
            <input
              type="text"
              value={outsourceNumber}
              onChange={(e) => setOutsourceNumber(e.target.value)}
              placeholder="เช่น EXT-2609-001"
              className={inputClass}
            />
          </div>

          {/* Sent Date */}
          <div>
            <label className={labelClass}>
              วันที่ส่งซ่อม <span className="text-[#ff2301]">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={sentDate}
                onChange={(e) => setSentDate(e.target.value)}
                className={`${inputClass} pl-10`}
                required
              />
            </div>
          </div>

          {/* Expected Return Date */}
          <div>
            <label className={labelClass}>วันที่คาดว่าจะแล้วเสร็จ / กำหนดคืน</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {/* Sender User */}
          <div>
            <label className={labelClass}>
              ผู้ส่งซ่อม <span className="text-[#ff2301]">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="ชื่อเจ้าหน้าที่ส่งซ่อม"
                className={`${inputClass} pl-10`}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections 2 & 3: Symmetrical 2-Column Side-by-Side Balance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ════════════════════════════════════════════════
            CARD 1 (LEFT): 2. ข้อมูลผู้รับซ่อม (ซัพพลายเออร์)
            ════════════════════════════════════════════════ */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  2. ข้อมูลผู้รับซ่อม (ซัพพลายเออร์)
                </h2>
                <p className="text-xs text-gray-400">OUTSOURCE VENDOR & SUPPLIER</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
              จำเป็น *
            </span>
          </div>

          <div className="space-y-4">
            {/* Vendor Name Search / Autocomplete */}
            <div className="relative" ref={vendorSearchRef}>
              <label className={labelClass}>
                ชื่อบริษัท / ซัพพลายเออร์ <span className="text-[#ff2301]">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vendorSearchQuery}
                  onChange={(e) => {
                    setVendorSearchQuery(e.target.value);
                    setVendorName(e.target.value);
                  }}
                  onFocus={() => {
                    if (vendorSearchResults.length > 0) setShowVendorDropdown(true);
                  }}
                  placeholder="พิมพ์ค้นหาหรือกรอกชื่อซัพพลายเออร์..."
                  className={`${inputClass} pl-10 pr-9`}
                  required
                />
                {isVendorSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                  </div>
                )}
                {vendorSearchQuery && !isVendorSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setVendorSearchQuery("");
                      setVendorName("");
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showVendorDropdown && vendorSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-30 divide-y divide-gray-100">
                  <div className="p-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/80 px-3">
                    เลือกซัพพลายเออร์จากฐานข้อมูล ({vendorSearchResults.length})
                  </div>
                  {vendorSearchResults.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectVendor(comp)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-red-50/50 transition-colors flex flex-col group"
                    >
                      <span className="font-bold text-sm text-gray-900 group-hover:text-[#ff2301]">
                        {comp.companyName}
                      </span>
                      {comp.province && (
                        <span className="text-xs text-gray-400">
                          {comp.district || ""} {comp.province}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vendor Phone */}
            <div>
              <label className={labelClass}>เบอร์โทรติดต่อซัพพลายเออร์</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="เช่น 02-123-4567, 081-xxx-xxxx"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* Vendor Address */}
            <div>
              <label className={labelClass}>ที่อยู่ซัพพลายเออร์ / สถานที่จัดส่ง</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  rows={3}
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  placeholder="ระบุที่อยู่ เลขที่ ถนน อำเภอ จังหวัด..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            CARD 2 (RIGHT): 3. ข้อมูลลูกค้าและเจ้าของเครื่อง
            ════════════════════════════════════════════════ */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  3. ข้อมูลลูกค้าและเจ้าของเครื่อง
                </h2>
                <p className="text-xs text-gray-400">CUSTOMER & EQUIPMENT OWNER</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
              เจ้าของสินค้า
            </span>
          </div>

          <div className="space-y-4">
            {/* Customer Name Search / Autocomplete */}
            <div className="relative" ref={customerSearchRef}>
              <label className={labelClass}>ชื่อลูกค้า / บริษัทเจ้าของเครื่อง</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setCustomerName(e.target.value);
                  }}
                  onFocus={() => {
                    if (customerSearchResults.length > 0) setShowCustomerDropdown(true);
                  }}
                  placeholder="พิมพ์ค้นหาหรือกรอกชื่อลูกค้า..."
                  className={`${inputClass} pl-10 pr-9`}
                />
                {isCustomerSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                )}
                {customerSearchQuery && !isCustomerSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearchQuery("");
                      setCustomerName("");
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showCustomerDropdown && customerSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-30 divide-y divide-gray-100">
                  <div className="p-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/80 px-3">
                    เลือกลูกค้าจากฐานข้อมูล ({customerSearchResults.length})
                  </div>
                  {customerSearchResults.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectCustomer(comp)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-gray-100 transition-colors flex flex-col group"
                    >
                      <span className="font-bold text-sm text-gray-900 group-hover:text-[#ff2301]">
                        {comp.companyName}
                      </span>
                      {comp.province && (
                        <span className="text-xs text-gray-400">
                          {comp.district || ""} {comp.province}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label className={labelClass}>เบอร์โทรติดต่อลูกค้า</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="เช่น 081-xxx-xxxx"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* Customer Address */}
            <div>
              <label className={labelClass}>ที่อยู่ลูกค้า / ไซต์งาน</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  rows={3}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="ระบุที่อยู่ลูกค้า หรือที่ตั้งโครงการ..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: รายการอุปกรณ์ที่ส่งซ่อม ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-gray-900">
                  4. รายการอุปกรณ์ที่ส่งซ่อม
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#ff2301] border border-red-200">
                  {items.length} รายการ
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                  รวม {totalQty} ชิ้น
                </span>
              </div>
              <p className="text-xs text-gray-400">EQUIPMENT & MACHINE SPECIFICATIONS</p>
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-[#ff2301] border border-red-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มรายการอุปกรณ์</span>
          </button>
        </div>

        {/* Responsive Table */}
        <div className="border border-gray-200/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-200 select-none">
                <tr>
                  <th className="px-3.5 py-3 w-12 text-center">ลำดับ</th>
                  <th className="px-3 py-3 min-w-[150px]">
                    ประเภทสินค้า <span className="text-[#ff2301]">*</span>
                  </th>
                  <th className="px-3 py-3 min-w-[120px]">ยี่ห้อ (Brand)</th>
                  <th className="px-3 py-3 min-w-[150px]">รุ่น / โมเดล</th>
                  <th className="px-3 py-3 min-w-[110px]">ขนาด / พิกัด</th>
                  <th className="px-3 py-3 min-w-[150px]">Serial No.</th>
                  <th className="px-3 py-3 w-24 text-center">จำนวน</th>
                  <th className="px-3 py-3 min-w-[150px]">หมายเหตุ</th>
                  <th className="px-3 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-red-50/20 transition-colors group"
                  >
                    {/* Index */}
                    <td className="px-3.5 py-2.5 text-center font-mono font-bold text-xs text-gray-400">
                      {index + 1}
                    </td>

                    {/* Type */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.type}
                        onChange={(e) => updateItem(item.id, "type", e.target.value)}
                        placeholder="เช่น Motor, Pump, Inverter"
                        className="w-full text-xs font-semibold px-2.5 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                        required
                      />
                    </td>

                    {/* Brand */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) => updateItem(item.id, "brand", e.target.value)}
                        placeholder="เช่น ABB, Siemens"
                        className="w-full text-xs font-semibold px-2.5 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                      />
                    </td>

                    {/* Model */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.model}
                        onChange={(e) => updateItem(item.id, "model", e.target.value)}
                        placeholder="เช่น ACS580"
                        className="w-full text-xs font-semibold font-mono px-2.5 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                      />
                    </td>

                    {/* Size */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) => updateItem(item.id, "size", e.target.value)}
                        placeholder="เช่น 15 kW, 20 HP"
                        className="w-full text-xs font-semibold px-2.5 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                      />
                    </td>

                    {/* Serial */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.serial}
                        onChange={(e) => updateItem(item.id, "serial", e.target.value)}
                        placeholder="S/N ของอุปกรณ์"
                        className="w-full text-xs font-semibold font-mono px-2.5 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                      />
                    </td>

                    {/* Qty */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(item.id, "qty", parseInt(e.target.value) || 1)
                        }
                        className="w-full text-xs font-bold text-center px-2 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                      />
                    </td>

                    {/* Remark */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) => updateItem(item.id, "remark", e.target.value)}
                        placeholder="หมายเหตุเฉพาะรายการ"
                        className="w-full text-xs px-2.5 py-2 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#ff2301] transition-all"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                        title={items.length === 1 ? "ต้องมีอย่างน้อย 1 รายการ" : "ลบรายการนี้"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="bg-gray-50/90 border-t border-gray-200 px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              แสดง {items.length} รายการอุปกรณ์
            </span>
            <div className="flex items-center gap-4">
              <span className="font-bold text-gray-700">
                รวมจำนวนสินค้าทั้งหมด:{" "}
                <span className="text-[#ff2301] font-mono text-sm ml-1">
                  {totalQty}
                </span>{" "}
                ชิ้น
              </span>
              <button
                type="button"
                onClick={addItem}
                className="text-[#ff2301] hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มแถว</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: รายละเอียดเพิ่มเติมและการตั้งค่า ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                5. รายละเอียดเพิ่มเติมและการตั้งค่า
              </h2>
              <p className="text-xs text-gray-400">
                DEFECT SYMPTOMS, PARAMETERS & TECHNICAL NOTES
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
            รายละเอียดงาน
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Symptoms */}
          <div>
            <label className={labelClass}>
              อาการเสียที่แจ้งซ่อม (Symptoms / Issues)
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="ระบุอาการผิดปกติ โค้ด Error หรือสาเหตุที่ต้องส่งซ่อมภายนอก..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Settings / Parameters */}
          <div>
            <label className={labelClass}>
              การตั้งค่า / ข้อมูลทางเทคนิคที่ต้องการ (Settings & Requirements)
            </label>
            <div className="relative">
              <textarea
                rows={4}
                value={settings}
                onChange={(e) => setSettings(e.target.value)}
                placeholder="ระบุพารามิเตอร์ ค่าความถี่ แรงดัน หรือการปรับแต่งที่ต้องการ..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Remarks (Full-width) */}
          <div className="lg:col-span-2">
            <label className={labelClass}>
              หมายเหตุเพิ่มเติม / ข้อตกลงพิเศษ (Additional Remarks)
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="ระบุเงื่อนไขการรับประกัน การส่งมอบ หรือบันทึกเพิ่มเติม..."
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-2xl p-4 sm:px-8 z-40">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff2301] animate-pulse" />
            <span>
              ซัพพลายเออร์:{" "}
              <strong className="text-gray-900">
                {vendorName || "ยังไม่ได้ระบุ"}
              </strong>
            </span>
            <span className="text-gray-300">•</span>
            <span>
              อุปกรณ์:{" "}
              <strong className="text-gray-900 font-mono">
                {items.length} รายการ ({totalQty} ชิ้น)
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("save")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
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
              onClick={() => handleSubmit("print")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSignature className="w-4 h-4" />
              )}
              <span>บันทึก + พิมพ์ PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
