"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Plus,
  Trash2,
  X,
  Upload,
  ArrowLeft,
  ClipboardList,
  Building2,
  User,
  Calendar,
  Phone,
  CheckCircle2,
  Loader2,
  Save,
  Printer,
  FileSignature,
  RotateCcw,
  CheckSquare,
  AlertCircle,
  Cpu,
  Layers,
  Search,
} from "lucide-react";
import { createRepairOrder } from "@/app/actions/repairOrders";
import { searchCompanies, searchContacts, getPostalInfo } from "@/app/actions/sales";
import Swal from "sweetalert2";

interface UserOption {
  id: string;
  name: string;
  position: string;
}

interface RepairOrderItem {
  id: string;
  type: string;
  brand: string;
  model: string;
  size: string;
  serial: string;
  qty: number;
  remark: string;
}

const CHECKLIST_ITEMS = [
  { k: "Front", l: "ด้านหน้า / Front", isVideo: false },
  { k: "Top", l: "ด้านบน / Top", isVideo: false },
  { k: "SideLeft", l: "ด้านข้าง (ซ้าย) / Left", isVideo: false },
  { k: "SideRight", l: "ด้านข้าง (ขวา) / Right", isVideo: false },
  { k: "Inside", l: "ด้านใน / Inside", isVideo: false },
  { k: "Nameplate", l: "Nameplate", isVideo: false },
  { k: "Bottom", l: "ด้านล่าง / Bottom", isVideo: false },
  { k: "TerminalNut", l: "Terminal / Nut", isVideo: false },
  { k: "TermCover", l: "Term. Cover", isVideo: false },
  { k: "Cover", l: "ฝาครอบ / Cover", isVideo: false },
  { k: "Video", l: "วิดีโอตรวจสอบ / Video", isVideo: true },
];

export default function NewRepairOrderForm({
  users,
  currentUserId,
  initialData,
}: {
  users: UserOption[];
  currentUserId: string;
  initialData?: any;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General Form State
  const [workType, setWorkType] = useState("ซ่อม");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [receiverId, setReceiverId] = useState(currentUserId);
  const [forwardedBy, setForwardedBy] = useState(initialData?.forwardedBy || "");
  const [salesPerson, setSalesPerson] = useState(initialData?.salesPerson || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [deliveryNoteNo, setDeliveryNoteNo] = useState("");

  // Customer State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [isSearchingContact, setIsSearchingContact] = useState(false);
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const contactSearchRef = useRef<HTMLDivElement>(null);

  const [customerCompany, setCustomerCompany] = useState(initialData?.customerCompany || "");
  const [serviceProviderCompany, setServiceProviderCompany] = useState(initialData?.company || "TERA GROUP");
  const [customerAddress, setCustomerAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");

  const [postalOptions, setPostalOptions] = useState<any[]>([]);

  // Items State
  const [items, setItems] = useState<RepairOrderItem[]>([
    { id: crypto.randomUUID(), type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" },
  ]);

  // Symptoms & Checklist State
  const [symptoms, setSymptoms] = useState("");
  const [settings, setSettings] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    Front: false,
    Top: false,
    SideLeft: false,
    SideRight: false,
    Inside: false,
    Nameplate: false,
    Bottom: false,
    TerminalNut: false,
    TermCover: false,
    Cover: false,
    Video: false,
  });

  // Images State
  const [checklistFiles, setChecklistFiles] = useState<Record<string, File[]>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Signatures State
  const [senderName, setSenderName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiverNameText, setReceiverNameText] = useState("");
  const [sentDate, setSentDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const u = users.find((u) => u.id === receiverId);
    if (u && !receiverNameText) {
      setReceiverNameText(u.name);
    }
  }, [receiverId, users, receiverNameText]);

  // Handle Search Company
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchCompanies(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle Search Contact
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (contactSearchQuery.length >= 2) {
        setIsSearchingContact(true);
        const results = await searchContacts(contactSearchQuery, selectedCompanyId || undefined);
        setContactSearchResults(results);
        setIsSearchingContact(false);
      } else {
        setContactSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [contactSearchQuery, selectedCompanyId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
      if (contactSearchRef.current && !contactSearchRef.current.contains(event.target as Node)) {
        setContactSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCompany = (company: any) => {
    setSelectedCompanyId(company.id);
    setCustomerCompany(company.companyName || "");
    setCustomerAddress(company.address || "");
    setSubDistrict(company.subDistrict || "");
    setDistrict(company.district || "");
    setProvince(company.province || "");
    setPostalCode(company.postalCode || "");
    setSearchQuery(company.companyName || "");
    setSearchResults([]);
  };

  const handleSelectContact = (contact: any) => {
    setSenderName(contact.contactName || "");
    setPhoneNumber(contact.phone || contact.mobile || "");
    setContactSearchQuery(contact.contactName || "");
    setContactSearchResults([]);

    if (contact.company && !selectedCompanyId) {
      handleSelectCompany(contact.company);
    }
  };

  const handlePostalCodeChange = async (val: string) => {
    setPostalCode(val);
    if (val.length >= 5) {
      const data = await getPostalInfo(val);
      if (data && data.length > 0) {
        if (data.length === 1) {
          setSubDistrict(data[0].subDistrict);
          setDistrict(data[0].district);
          setProvince(data[0].province);
        } else {
          setPostalOptions(data);
        }
      }
    } else {
      setPostalOptions([]);
    }
  };

  const handlePostalSelect = (option: any) => {
    setSubDistrict(option.subDistrict);
    setDistrict(option.district);
    setProvince(option.province);
    setPostalOptions([]);
  };

  // Handle Items
  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RepairOrderItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // Handle Checklist
  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle Images per Checklist Item
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      for (const file of newFiles) {
        if (file.size > 50 * 1024 * 1024) {
          Swal.fire({
            icon: "warning",
            title: "ไฟล์มีขนาดใหญ่เกินไป",
            text: `ไฟล์ ${file.name} มีขนาดใหญ่เกิน 50MB`,
            confirmButtonColor: "#ff2301",
          });
        } else {
          validFiles.push(file);
        }
      }
      setChecklistFiles((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), ...validFiles],
      }));
    }
  };

  const removeFile = (key: string, index: number) => {
    setChecklistFiles((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  // Reset form
  const handleReset = () => {
    setWorkType("ซ่อม");
    setInvoiceNo("");
    setReceiverId(currentUserId);
    setForwardedBy("");
    setSalesPerson("");
    setPhoneNumber("");
    setDeliveryNoteNo("");
    setCustomerCompany("");
    setServiceProviderCompany("TERA GROUP");
    setCustomerAddress("");
    setPostalCode("");
    setSubDistrict("");
    setDistrict("");
    setProvince("");
    setSearchQuery("");
    setContactSearchQuery("");
    setSelectedCompanyId("");
    setItems([{ id: crypto.randomUUID(), type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }]);
    setSymptoms("");
    setSettings("");
    setChecklist({
      Front: false,
      Top: false,
      SideLeft: false,
      SideRight: false,
      Inside: false,
      Nameplate: false,
      Bottom: false,
      TerminalNut: false,
      TermCover: false,
      Cover: false,
      Video: false,
    });
    setChecklistFiles({});
    setSenderName("");
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setSentDate(new Date().toISOString().split("T")[0]);
  };

  // Submit Handler
  const handleSubmit = async (action: "save" | "print") => {
    if (!customerCompany.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุชื่อบริษัท/ลูกค้า",
        text: "จำเป็นต้องระบุชื่อบริษัทหรือลูกค้าในการเปิดใบแจ้งซ่อม",
        confirmButtonColor: "#ff2301",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload Images/Videos directly from browser to Supabase Storage
      const uploadedFilesMap: Record<string, string[]> = {};
      const allFiles = Object.values(checklistFiles).flat();
      if (allFiles.length > 0) {
        setIsUploading(true);

        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        for (const [key, files] of Object.entries(checklistFiles)) {
          if (files.length === 0) continue;
          uploadedFilesMap[key] = [];
          for (const file of files) {
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
              throw new Error(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${file.name}`);
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("uploadsService").getPublicUrl(uploadData.path);

            uploadedFilesMap[key].push(publicUrl);
          }
        }
        setIsUploading(false);
      }

      // 2. Prepare Data
      const selectedUser = users.find((u) => u.id === receiverId);

      const payload = {
        jobId: initialData?.jobId,
        workType,
        invoiceNo,
        receiverName: selectedUser?.name || receiverNameText,
        forwardedBy,
        phoneNumber,
        deliveryNoteNo,
        customerCompany,
        company: serviceProviderCompany,
        salesPerson: salesPerson,
        customerAddress: `${customerAddress} ${subDistrict} ${district} ${province} ${postalCode}`.trim(),
        items: items.map((i) => ({
          type: i.type,
          brand: i.brand,
          model: i.model,
          size: i.size,
          serial: i.serial,
          qty: i.qty,
          remark: i.remark,
        })),
        symptoms,
        settings,
        checklist,
        checklistImages: uploadedFilesMap,
        senderName,
        receivedDate,
        sentDate,
      };

      // 3. Save
      const result = await createRepairOrder(payload);

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "บันทึกสำเร็จ",
          text: "สร้างใบแจ้งซ่อมใหม่เรียบร้อยแล้ว",
          timer: 1600,
          showConfirmButton: false,
        });

        if (action === "print" && result.jobId) {
          router.push(`/repair-orders/${result.jobId}/print`);
        } else {
          router.push("/repair-orders");
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
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.message || "เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-[#ff2301] transition-all text-gray-900 placeholder:text-gray-400";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1.5";

  return (
    <div className="space-y-8">
      {/* ── Top Header Card (Matching User's Reference Screenshot) ── */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-7 shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Red Squircle Badge + Title + Subtitle */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center text-white shadow-lg shadow-red-500/25 shrink-0">
              <Wrench className="w-7 h-7" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff2301]" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  สร้างใบแจ้งซ่อมใหม่
                </h1>
                <span className="px-3 py-0.5 bg-red-50 text-[#ff2301] border border-red-200/80 rounded-full text-xs font-bold tracking-wide">
                  เปิดงานใหม่
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-1">
                <span className="font-bold uppercase tracking-wider text-gray-500">
                  REPAIR ORDER & SERVICE MANAGEMENT
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">
                  ระบบบันทึกรับซ่อมและตรวจเช็คอุปกรณ์
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions (Back, Reset, and Save Buttons) */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/repair-orders"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              <span>กลับหน้ารายการ</span>
            </Link>

            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm disabled:opacity-40"
              title="ล้างข้อมูลฟอร์ม"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("save")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>บันทึก</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("print")}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white font-bold text-xs shadow-lg shadow-red-500/25 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>บันทึก + พิมพ์</span>
            </button>
          </div>
        </div>

        {/* Mini Meta Info */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff2301]" />
            <span>เลขที่ใบแจ้งซ่อม <strong className="font-mono text-gray-800">RO{new Date().getFullYear() + 543}-XXXX</strong> จะถูกสร้างอัตโนมัติเมื่อกดบันทึก</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span>ผู้ทำรายการ: <strong className="text-gray-800">{users.find((u) => u.id === currentUserId)?.name || "เจ้าหน้าที่"}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Sales Job Reference Callout (If Linked to a Job) ── */}
      {initialData?.job && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                ข้อมูลงานเบื้องต้นจากฝ่ายขาย (Sales Job Reference)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-gray-900 text-white">
              {initialData.job.jobNumber || "-"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">ลูกค้า/บริษัท</span>
              <span className="font-bold text-gray-800 text-sm">{initialData.job.customerName || "-"}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">พนักงานขาย</span>
              <span className="font-bold text-gray-800 text-sm">{initialData.job.sellerName || "-"}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">ใบเสนอราคา / PO</span>
              <span className="font-bold text-gray-800 text-sm">
                {initialData.job.quotationNumber || "-"} / {initialData.job.poNumber || "-"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-400 block font-semibold mb-0.5">สินค้าเบื้องต้น</span>
              <span className="font-bold text-gray-800 text-sm truncate block">{initialData.job.item || "-"}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1 & 2: Symmetrical 2-Column Balance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ════════════════════════════════════════════════
            COLUMN 1 (LEFT): 1. ข้อมูลการรับซ่อม
            ════════════════════════════════════════════════ */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  1. ข้อมูลการรับซ่อมและเอกสาร
                </h2>
                <p className="text-xs text-gray-400">ORDER & DOCUMENT SPECIFICATIONS</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
              ข้อมูลหลัก *
            </span>
          </div>

          <div className="space-y-4">
            {/* บริษัทผู้รับบริการ & วันที่รับซ่อม */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>บริษัทผู้รับบริการ <span className="text-[#ff2301]">*</span></label>
                <select
                  value={serviceProviderCompany}
                  onChange={(e) => setServiceProviderCompany(e.target.value)}
                  className={inputClass}
                >
                  <option value="TERA GROUP">TERA GROUP</option>
                  <option value="TERA ELECTRIC">TERA ELECTRIC</option>
                  <option value="TERA POWER">TERA POWER</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>วันที่รับซ่อม <span className="text-[#ff2301]">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>

            {/* รูปแบบงาน (Job Type) */}
            <div>
              <label className={labelClass}>รูปแบบงาน (Job Type) <span className="text-[#ff2301]">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["ซ่อม", "เคลม", "ไม่ซ่อม/คืนสินค้า", "ตรวจเช็ค"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWorkType(type)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      workType === type
                        ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-[#ff2301]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoice No. & Delivery Note No. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Invoice No.</label>
                <input
                  type="text"
                  placeholder="เช่น INV-XXXX"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Delivery Note / Ref Job No.</label>
                <input
                  type="text"
                  placeholder="เลขที่ใบส่งของ / อ้างอิง"
                  value={deliveryNoteNo}
                  onChange={(e) => setDeliveryNoteNo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* ผู้รับซ่อม (Receiver) */}
            <div>
              <label className={labelClass}>ผู้รับซ่อม (Receiver) <span className="text-[#ff2301]">*</span></label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <select
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className={`${inputClass} pl-10`}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* เซลล์ที่รับผิดชอบ & ส่งต่อโดย */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>เซลล์ที่รับผิดชอบ (Salesperson)</label>
                <input
                  type="text"
                  placeholder="ชื่อพนักงานขาย"
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>ส่งต่อโดย (Forwarded By)</label>
                <input
                  type="text"
                  placeholder="ผู้ส่งต่อเรื่อง"
                  value={forwardedBy}
                  onChange={(e) => setForwardedBy(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* เบอร์โทรติดต่อ */}
            <div>
              <label className={labelClass}>เบอร์โทรศัพท์ติดต่อ</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="เช่น 081-234-5678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            COLUMN 2 (RIGHT): 2. ข้อมูลลูกค้า
            ════════════════════════════════════════════════ */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  2. ข้อมูลลูกค้าและสถานที่ติดต่อ
                </h2>
                <p className="text-xs text-gray-400">CUSTOMER & SITE DETAILS</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#ff2301] rounded-lg border border-red-200">
              ข้อมูลลูกค้า *
            </span>
          </div>

          <div className="space-y-4">
            {/* ค้นหาและระบุชื่อบริษัท/ลูกค้า */}
            <div className="relative" ref={searchRef}>
              <label className={labelClass}>ชื่อบริษัท / ลูกค้า <span className="text-[#ff2301]">*</span></label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery || customerCompany}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCustomerCompany(e.target.value);
                  }}
                  className={`${inputClass} pl-10`}
                  placeholder="พิมพ์เพื่อค้นหาบริษัทจากฐานข้อมูล..."
                />
                {isSearching && (
                  <div className="absolute right-3.5 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-auto mt-2 py-2">
                  {searchResults.map((company) => (
                    <li
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className="px-4 py-2.5 hover:bg-red-50 hover:text-[#ff2301] cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="font-bold text-gray-900">{company.companyName}</div>
                      {company.address && (
                        <div className="text-xs text-gray-400 truncate">{company.address}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ผู้ติดต่อ (Contact Person) */}
            <div className="relative" ref={contactSearchRef}>
              <label className={labelClass}>ผู้ติดต่อ (Contact Person)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contactSearchQuery || senderName}
                  onChange={(e) => {
                    setContactSearchQuery(e.target.value);
                    setSenderName(e.target.value);
                  }}
                  className={`${inputClass} pl-10`}
                  placeholder="พิมพ์เพื่อค้นหาผู้ติดต่อ..."
                />
                {isSearchingContact && (
                  <div className="absolute right-3.5 top-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                  </div>
                )}
              </div>

              {contactSearchResults.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-auto mt-2 py-2">
                  {contactSearchResults.map((contact) => (
                    <li
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="px-4 py-2.5 hover:bg-red-50 hover:text-[#ff2301] cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="font-bold text-gray-900">{contact.contactName}</div>
                      <div className="text-xs text-gray-400">{contact.phone || contact.mobile || "-"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ที่อยู่ */}
            <div>
              <label className={labelClass}>ที่อยู่ (Address)</label>
              <textarea
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="เลขที่, ถนน, ซอย..."
              />
            </div>

            {/* รหัสไปรษณีย์ และ ที่อยู่ย่อย */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>รหัสไปรษณีย์</label>
                <input
                  type="text"
                  maxLength={5}
                  value={postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  className={inputClass}
                  placeholder="เช่น 10110"
                />

                {postalOptions.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-auto mt-2 py-2">
                    {postalOptions.map((opt, i) => (
                      <li
                        key={i}
                        onClick={() => handlePostalSelect(opt)}
                        className="px-4 py-2.5 hover:bg-red-50 hover:text-[#ff2301] cursor-pointer text-xs font-medium transition-colors border-b border-gray-50 last:border-0"
                      >
                        {opt.subDistrict} &gt; {opt.district} &gt; {opt.province}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className={labelClass}>แขวง / ตำบล</label>
                <input
                  type="text"
                  value={subDistrict}
                  onChange={(e) => setSubDistrict(e.target.value)}
                  className={`${inputClass} bg-gray-50`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>เขต / อำเภอ</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={`${inputClass} bg-gray-50`}
                />
              </div>

              <div>
                <label className={labelClass}>จังหวัด</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={`${inputClass} bg-gray-50`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: รายการสินค้า (Items Table) ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-gray-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                3. รายการสินค้าส่งซ่อม
              </h2>
              <p className="text-xs text-gray-400">EQUIPMENT & REPAIR ITEMS LIST</p>
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มรายการสินค้า</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-200 font-bold">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-3 py-3 min-w-[140px]">ประเภทสินค้า</th>
                <th className="px-3 py-3 min-w-[120px]">ยี่ห้อ</th>
                <th className="px-3 py-3 min-w-[140px]">รุ่น / โมเดล</th>
                <th className="px-3 py-3 min-w-[100px]">ขนาด</th>
                <th className="px-3 py-3 min-w-[140px]">Serial No.</th>
                <th className="px-3 py-3 w-24 text-center">จำนวน</th>
                <th className="px-3 py-3 min-w-[150px]">หมายเหตุ</th>
                <th className="px-3 py-3 w-12 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-red-50/20 transition-colors">
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-gray-400 text-xs">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.type}
                      onChange={(e) => updateItem(item.id, "type", e.target.value)}
                      className={inputClass}
                      placeholder="เช่น Inverter, Motor"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.brand}
                      onChange={(e) => updateItem(item.id, "brand", e.target.value)}
                      className={inputClass}
                      placeholder="ยี่ห้อ"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.model}
                      onChange={(e) => updateItem(item.id, "model", e.target.value)}
                      className={inputClass}
                      placeholder="รุ่น/โมเดล"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.size}
                      onChange={(e) => updateItem(item.id, "size", e.target.value)}
                      className={inputClass}
                      placeholder="ขนาด/พิกัด"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.serial}
                      onChange={(e) => updateItem(item.id, "serial", e.target.value)}
                      className={`${inputClass} font-mono`}
                      placeholder="S/N"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 1)}
                      className={`${inputClass} text-center font-bold`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.remark}
                      onChange={(e) => updateItem(item.id, "remark", e.target.value)}
                      className={inputClass}
                      placeholder="หมายเหตุอาการ"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-30 transition-colors"
                      title="ลบแถว"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 4: อาการเสีย + Checklist ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                4. อาการเสียและการตรวจสอบสภาพก่อนซ่อม
              </h2>
              <p className="text-xs text-gray-400">SYMPTOMS & PHYSICAL INSPECTION CHECKLIST</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
            การตรวจสอบ
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Left Column: Symptoms & Settings */}
          <div className="space-y-5">
            <div>
              <label className={labelClass}>อาการเสียที่พบ (Symptoms)</label>
              <textarea
                rows={5}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className={`${inputClass} resize-y leading-relaxed`}
                placeholder="ระบุอาการเสียอย่างละเอียด เช่น มอเตอร์ไม่หมุน, ไฟ Overload ติดค้าง, มีเสียงเตือนดัง..."
              />
            </div>

            <div>
              <label className={labelClass}>การตั้งค่า / ค่าพารามิเตอร์ (Setting)</label>
              <textarea
                rows={4}
                value={settings}
                onChange={(e) => setSettings(e.target.value)}
                className={`${inputClass} resize-y leading-relaxed`}
                placeholder="ระบุค่าความถี่, แรงดัน, กระแส หรือการตั้งค่าที่ใช้งาน..."
              />
            </div>
          </div>

          {/* Right Column: Checklist with Photos */}
          <div>
            <label className={labelClass}>Checklist ตรวจสอบสภาพภายนอกก่อนซ่อม</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50/70 p-4 sm:p-5 rounded-2xl border border-gray-200">
              {CHECKLIST_ITEMS.map(({ k, l, isVideo }) => (
                <div
                  key={k}
                  className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-gray-200/80 shadow-sm"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={checklist[k] || false}
                        onChange={() => toggleChecklist(k)}
                        className="peer w-4 h-4 opacity-0 absolute"
                      />
                      <div className="w-4 h-4 rounded border-2 border-gray-300 peer-checked:bg-[#ff2301] peer-checked:border-[#ff2301] transition-colors flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-800 group-hover:text-[#ff2301] transition-colors">
                      {l}
                    </span>
                  </label>

                  {checklist[k] && (
                    <div className="flex flex-wrap gap-2 items-start pl-6 mt-1">
                      <label className="cursor-pointer border-2 border-dashed border-red-200 hover:border-[#ff2301] hover:bg-red-50 rounded-xl w-16 h-16 flex flex-col items-center justify-center text-red-400 hover:text-[#ff2301] transition-all shrink-0">
                        <Upload className="w-4 h-4 mb-0.5" />
                        <span className="text-[9px] font-bold uppercase">{isVideo ? "วิดีโอ" : "รูปภาพ"}</span>
                        <input
                          type="file"
                          accept={isVideo ? "video/*" : "image/*"}
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileChange(e, k)}
                        />
                      </label>

                      {(checklistFiles[k] || []).map((file, idx) => {
                        const previewUrl = URL.createObjectURL(file);
                        const isVid = file.type.startsWith("video/");
                        return (
                          <div
                            key={idx}
                            className="relative group w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0 border border-gray-200"
                          >
                            {isVid ? (
                              <video src={previewUrl} className="w-full h-full object-cover" muted />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={previewUrl} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(k, idx)}
                              className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: การส่งมอบและการรับมอบ ── */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ff2301]">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                5. การส่งมอบและการรับมอบสินค้า
              </h2>
              <p className="text-xs text-gray-400">HANDOVER & RECEIPT CONFIRMATION</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
            ลายเซ็นกำกับ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center min-h-[180px]">
            <div className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-6">
              ผู้ส่งซ่อม (ลูกค้า / ตัวแทน)
            </div>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="พิมพ์ชื่อ-นามสกุล ผู้ส่งซ่อม"
              className="w-full max-w-[280px] text-center bg-transparent border-b-2 border-dashed border-gray-300 focus:border-[#ff2301] px-4 py-2 font-medium text-gray-900 outline-none transition-colors text-sm"
            />
          </div>

          <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center min-h-[180px]">
            <div className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-6">
              ผู้รับซ่อม (เจ้าหน้าที่ Tera Group)
            </div>
            <input
              type="text"
              value={receiverNameText}
              onChange={(e) => setReceiverNameText(e.target.value)}
              placeholder="พิมพ์ชื่อ-นามสกุล ผู้รับซ่อม"
              className="w-full max-w-[280px] text-center bg-transparent border-b-2 border-dashed border-gray-300 focus:border-[#ff2301] px-4 py-2 font-medium text-gray-900 outline-none transition-colors text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Fixed Symmetrical Bottom Action Dock ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/repair-orders"
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-[#ff2301] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ยกเลิกและกลับหน้ารายการ</span>
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ล้างฟอร์ม
              </button>

              <button
                type="button"
                onClick={() => handleSubmit("save")}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
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
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] disabled:opacity-50 rounded-xl shadow-lg shadow-red-500/25 transition-all transform active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>บันทึก + พิมพ์เอกสาร</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Uploading Overlay Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full">
            <Loader2 className="w-10 h-10 text-[#ff2301] animate-spin" />
            <div>
              <div className="font-bold text-gray-900 text-base">กำลังอัปโหลดรูปภาพ / วิดีโอ...</div>
              <div className="text-xs text-gray-500 mt-1">กรุณารอสักครู่ ระบบกำลังจัดเก็บไฟล์ไปยังคลาวด์</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
