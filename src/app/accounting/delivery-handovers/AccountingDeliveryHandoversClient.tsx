"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  FileSignature,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  User,
  MapPin,
  FileText,
  Camera,
  Printer,
  ExternalLink,
  Eye,
  X,
  Check,
  Loader2,
  Calendar,
  Wrench,
  Briefcase,
  Receipt,
  DollarSign,
  Package,
  ClipboardCheck,
} from "lucide-react";
import { confirmAccountingDeliveryHandover } from "@/app/actions/repairDeliveries";

interface AccountingDeliveryHandoversClientProps {
  initialHandovers: any[];
  currentUser: any;
  initialDeliveryId?: string | null;
  initialTab?: "pending" | "billed" | "all";
}

export default function AccountingDeliveryHandoversClient({
  initialHandovers = [],
  currentUser,
  initialDeliveryId = null,
  initialTab = "pending",
}: AccountingDeliveryHandoversClientProps) {
  const [handovers, setHandovers] = useState<any[]>(initialHandovers);
  const [activeTab, setActiveTab] = useState<"pending" | "billed" | "all">(
    initialTab
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [accountingNote, setAccountingNote] = useState("");
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setHandovers(initialHandovers);
  }, [initialHandovers]);

  useEffect(() => {
    if (initialDeliveryId && handovers.length > 0) {
      const found = handovers.find((h) => h.id === initialDeliveryId);
      if (found) {
        setSelectedItem(found);
        setInvoiceNo(found.accountingInvoiceNo || "");
        setAccountingNote(found.accountingNote || "");
        if (found.accountingStatus === "BILLED") {
          setActiveTab("all");
        }
      }
    }
  }, [initialDeliveryId, handovers]);

  const pendingItems = useMemo(
    () => handovers.filter((h) => h.accountingStatus !== "BILLED"),
    [handovers]
  );

  const billedItems = useMemo(
    () => handovers.filter((h) => h.accountingStatus === "BILLED"),
    [handovers]
  );

  const totalQuotedValue = useMemo(() => {
    return handovers.reduce((sum, item) => {
      const q = item.linkedQuotation;
      const amt =
        Number(q?.actualClosingAmount) ||
        Number(q?.totalAmountBeforeVat) ||
        0;
      return sum + amt;
    }, 0);
  }, [handovers]);

  const filteredItems = useMemo(() => {
    const base =
      activeTab === "pending"
        ? pendingItems
        : activeTab === "billed"
          ? billedItems
          : handovers;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return base;

    return base.filter((item) => {
      const fields = [
        item.deliveryNumber,
        item.quotationNo,
        item.linkedServiceCall?.caseNumber,
        item.company,
        item.customer,
        item.jobName,
        item.sender,
        item.salesAckByName,
        item.accountingInvoiceNo,
        item.accountingAckByName,
      ];
      return fields.some((f) => String(f || "").toLowerCase().includes(q));
    });
  }, [activeTab, pendingItems, billedItems, handovers, searchTerm]);

  const formatThaiDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWorkTypesList = (item: any) => {
    const list: { label: string; detail?: string }[] = [];
    if (item.workInspect) {
      list.push({ label: "งานตรวจเช็ค", detail: item.workInspectDetails });
    }
    if (item.workInstall) {
      list.push({ label: "งานติดตั้ง", detail: item.workInstallDetails });
    }
    if (item.workRepair) {
      list.push({ label: "งานซ่อม", detail: item.workRepairDetails });
    }
    if (item.workTraining) {
      list.push({ label: "งานอบรม", detail: item.workTrainingDetails });
    }
    if (item.workOther) {
      list.push({ label: "อื่นๆ", detail: item.workOther });
    }
    return list;
  };

  const handleConfirmAccounting = async (
    item: any,
    customInvoiceNo?: string,
    customNote?: string
  ) => {
    setIsSavingId(item.id);
    try {
      const res = await confirmAccountingDeliveryHandover(item.id, {
        invoiceNo:
          customInvoiceNo !== undefined ? customInvoiceNo : invoiceNo,
        note: customNote !== undefined ? customNote : accountingNote,
        status: "BILLED",
      });

      if (res.success) {
        setHandovers((prev) =>
          prev.map((h) =>
            h.id === item.id
              ? {
                ...h,
                accountingStatus: "BILLED",
                accountingAckByName: res.accountingAckByName,
                accountingAckAt: res.accountingAckAt,
                accountingInvoiceNo: res.accountingInvoiceNo,
                accountingNote: res.accountingNote,
              }
              : h
          )
        );
        if (selectedItem?.id === item.id) {
          setSelectedItem((prev: any) =>
            prev
              ? {
                ...prev,
                accountingStatus: "BILLED",
                accountingAckByName: res.accountingAckByName,
                accountingAckAt: res.accountingAckAt,
                accountingInvoiceNo: res.accountingInvoiceNo,
                accountingNote: res.accountingNote,
              }
              : null
          );
        }

        await Swal.fire({
          icon: "success",
          title: "บันทึกการรับเอกสาร/วางบิลสำเร็จ",
          text: `บันทึกข้อมูลทางบัญชีสำหรับใบส่งมอบงาน ${item.deliveryNumber} เรียบร้อยแล้ว`,
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกข้อมูลได้",
          confirmButtonColor: "#ff2301",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถบันทึกข้อมูลได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsSavingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header (Symmetrical Left Title & Single Right Action) ── */}
      <header className="shrink-0 border-b border-slate-200/80 px-5 md:px-8 py-4 md:py-5 bg-white flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center shadow-md shadow-red-600/20 text-white shrink-0">
            <Receipt size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
              รับเอกสารใบส่งมอบงานจากฝ่ายขาย (สำหรับวางบิล / บัญชี)
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">
              รายการใบส่งมอบงานที่มีลายเซ็นครบและเซลล์กดรับทราบส่งต่อมาให้ฝ่ายบัญชี พร้อมข้อมูลใบเสนอราคา รายการอะไหล่ รูปถ่าย และลายเซ็นครบชุด
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end w-full sm:w-auto shrink-0">
          <Link
            href="/accounting"
            className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0"
          >
            <DollarSign size={15} className="shrink-0" />
            <span>ลูกหนี้การค้า (AR)</span>
          </Link>
        </div>
      </header>

      {/* ── Symmetrical 4-Card Equal-Height KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 px-5 md:px-8 py-4 bg-slate-50/70 border-b border-slate-200/80 items-stretch">
        <div className="h-full min-h-[96px] bg-white rounded-2xl border border-amber-200 p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-amber-700 tracking-tight truncate">
              รอบัญชีตรวจสอบ / วางบิล
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {pendingItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Pending Billing
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div className="h-full min-h-[96px] bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-emerald-700 tracking-tight truncate">
              บัญชีรับเรื่อง / วางบิลแล้ว
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {billedItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Processed / Billed
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="h-full min-h-[96px] bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-slate-600 tracking-tight truncate">
              เอกสารที่รับจากเซลล์ทั้งหมด
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {handovers.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Total Received Docs
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center shrink-0">
            <FileSignature size={20} />
          </div>
        </div>

        <div className="h-full min-h-[96px] bg-white rounded-2xl border border-red-200 p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-[#ff2301] tracking-tight truncate">
              มูลค่าตามใบเสนอราคารวม
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight truncate">
              ฿{totalQuotedValue.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Total Quotation Value
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ff2301] border border-red-200/70 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* ── Symmetrical 50/50 Filter Tabs & Search Bar (Aligns with 4-Card KPI Center Axis) ── */}
      <div className="shrink-0 px-5 md:px-8 py-3 border-b border-slate-200/80 bg-white grid grid-cols-1 lg:grid-cols-12 gap-3.5 md:gap-4 items-center">
        {/* Left 6 Cols: 3 Equal-Width Segmented Filter Buttons (h-11 outer) */}
        <div className="lg:col-span-6 grid grid-cols-3 gap-1.5 p-1 h-11 bg-slate-100/90 border border-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === "pending"
                ? "bg-[#ff2301] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
              }`}
          >
            <Clock size={13} className="shrink-0 hidden sm:inline" />
            <span className="truncate">รอบัญชีดำเนินการ</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${activeTab === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
                }`}
            >
              {pendingItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("billed")}
            className={`h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === "billed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
              }`}
          >
            <CheckCircle2 size={13} className="shrink-0 hidden sm:inline" />
            <span className="truncate">วางบิล/รับแล้ว</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${activeTab === "billed"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
                }`}
            >
              {billedItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
              }`}
          >
            <span className="truncate">ทั้งหมด</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${activeTab === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
                }`}
            >
              {handovers.length}
            </span>
          </button>
        </div>

        {/* Right 6 Cols: Matching h-11 Search Input */}
        <div className="lg:col-span-6 relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลข DN, เลข QT, เลขบิล, ชื่อบริษัท, เซลล์..."
            className="w-full h-11 pl-10 pr-9 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content List ── */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-5 space-y-4 bg-slate-50/40">
        {filteredItems.length === 0 ? (
          <div className="min-h-[260px] bg-white rounded-2xl border border-slate-200/80 p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Receipt size={26} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800">
                ยังไม่มีรายการเอกสารส่งมอบงานที่ส่งมาจากฝ่ายขาย
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                เมื่อฝ่ายขายกดรับทราบใบส่งมอบงานที่เซอร์วิสและลูกค้าเซ็นครบแล้ว ข้อมูลและชุดเอกสารจะถูกส่งมาแสดงที่หน้านี้โดยอัตโนมัติ
              </p>
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isBilled = item.accountingStatus === "BILLED";
            const qt = item.linkedQuotation;
            const sc = item.linkedServiceCall;
            const qtAmount =
              Number(qt?.actualClosingAmount) ||
              Number(qt?.totalAmountBeforeVat) ||
              0;
            const jobInfo = qt?.jobs?.[0] || null;
            const photosCount =
              (Array.isArray(item.photosBefore) ? item.photosBefore.length : 0) +
              (Array.isArray(item.photosAfter) ? item.photosAfter.length : 0);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md p-4 sm:p-5 space-y-3.5 ${isBilled
                    ? "border-emerald-200/90"
                    : "border-slate-200/90 hover:border-red-300"
                  }`}
              >
                {/* Symmetrical Card Top Bar: Badges Left + Timestamp Right */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                      {item.deliveryNumber}
                    </span>

                    {item.internalCompany && (
                      <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        {item.internalCompany}
                      </span>
                    )}

                    {item.quotationNo && (
                      <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        QT: {item.quotationNo}
                      </span>
                    )}

                    {sc?.caseNumber && (
                      <span className="h-7 inline-flex items-center px-2.5 rounded-lg text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        เคสเซอร์วิส: {sc.caseNumber}
                      </span>
                    )}

                    {isBilled ? (
                      <span className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>
                          บัญชีรับเรื่อง/วางบิลแล้ว
                          {item.accountingInvoiceNo
                            ? ` (${item.accountingInvoiceNo})`
                            : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>รอบัญชีตรวจสอบ / วางบิล</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1 shrink-0">
                    <Calendar size={12} className="shrink-0" />
                    <span>
                      เซลล์ส่งต่อเมื่อ:{" "}
                      {formatThaiDate(
                        item.accountingSentAt ||
                        item.salesAckAt ||
                        item.updatedAt
                      )}
                    </span>
                  </span>
                </div>

                {/* Symmetrical 12-Column Body (9 Cols Details + 3 Cols Equal-Width Action Panel) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  {/* Left 9 Cols: Customer + 2 Equal Summary Sub-Cards */}
                  <div className="lg:col-span-9 h-full flex flex-col justify-between gap-3.5 min-w-0">
                    {/* Customer & Uniform Value Box Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                          <Building2
                            size={18}
                            className="text-[#ff2301] shrink-0"
                          />
                          <span className="truncate">
                            {item.company || item.customer || "-"}
                          </span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <User size={13} className="text-slate-400 shrink-0" />
                            <span>
                              ผู้รับมอบงาน:{" "}
                              {item.nameReceiver || item.customer || "-"}
                              {item.customerPosition
                                ? ` (${item.customerPosition})`
                                : ""}
                            </span>
                          </span>
                          {item.jobName && (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Briefcase
                                size={13}
                                className="text-[#ff2301] shrink-0"
                              />
                              <span>งาน: {item.jobName}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`min-w-[190px] h-14 px-3.5 rounded-xl border flex flex-col justify-center sm:text-right shrink-0 ${qtAmount > 0
                            ? "bg-red-50/70 border-red-200"
                            : "bg-slate-50 border-slate-200/80"
                          }`}
                      >
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          มูลค่าใบเสนอราคา (ก่อน VAT)
                        </div>
                        <div
                          className={`text-base font-black font-mono leading-tight ${qtAmount > 0 ? "text-[#ff2301]" : "text-slate-400"
                            }`}
                        >
                          {qtAmount > 0
                            ? `฿${qtAmount.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}`
                            : "ไม่ระบุมูลค่า"}
                        </div>
                      </div>
                    </div>

                    {/* Symmetrical 2-Column Equal-Height Summary Cards */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch text-xs">
                      <div className="h-full bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between gap-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <DollarSign size={14} className="text-[#ff2301] shrink-0" />
                          <span>ข้อมูลการขาย &amp; เงื่อนไขชำระเงิน</span>
                        </div>
                        <div className="text-slate-600 space-y-1">
                          <div>
                            เซลล์ผู้ยืนยันส่งมอบ:{" "}
                            <b className="text-slate-900">
                              {item.salesAckByName || item.sender || "-"}
                            </b>
                          </div>
                          <div>
                            เลขที่ PO ลูกค้า:{" "}
                            <b className="font-mono text-slate-900">
                              {qt?.poNumber || "-"}
                            </b>
                          </div>
                          <div>
                            เงื่อนไขชำระเงิน:{" "}
                            <b className="text-slate-800">
                              {jobInfo?.paymentMethod || jobInfo?.creditTerms
                                ? `${jobInfo.paymentMethod || "-"}${jobInfo.creditTerms
                                  ? ` (${jobInfo.creditTerms})`
                                  : ""
                                }`
                                : "-"}
                            </b>
                          </div>
                          {item.salesAckNote && (
                            <div className="text-emerald-800 font-medium pt-0.5">
                              หมายเหตุจากเซลล์: &ldquo;{item.salesAckNote}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="h-full bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between gap-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FileSignature size={14} className="text-[#ff2301] shrink-0" />
                          <span>หลักฐานการส่งมอบงาน &amp; ลายเซ็น</span>
                        </div>
                        <div className="text-slate-600 space-y-1">
                          <div>
                            ผู้ส่งมอบ (ช่าง/เซอร์วิส):{" "}
                            <b className="text-slate-900">
                              {item.nameSender || item.technician || "-"}
                            </b>{" "}
                            {item.sigSenderUrl ? (
                              <span className="text-emerald-700 font-bold">
                                ✓ มีลายเซ็น
                              </span>
                            ) : null}
                          </div>
                          <div>
                            ผู้รับมอบ (ลูกค้า):{" "}
                            <b className="text-slate-900">
                              {item.nameReceiver || item.customer || "-"}
                            </b>{" "}
                            {item.sigReceiverUrl ? (
                              <span className="text-emerald-700 font-bold">
                                ✓ มีลายเซ็น
                              </span>
                            ) : null}
                          </div>
                          <div>
                            รูปถ่ายหน้างาน (Before/After):{" "}
                            <b className="text-slate-900">{photosCount} รูป</b>
                            {sc?.partsUsed?.length
                              ? ` • อะไหล่ที่ใช้: ${sc.partsUsed.length} รายการ`
                              : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isBilled &&
                      (item.accountingInvoiceNo || item.accountingNote) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.accountingInvoiceNo && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                <Receipt size={13} className="shrink-0" />
                                <span>
                                  เลขที่ใบแจ้งหนี้/บิล: {item.accountingInvoiceNo}
                                </span>
                              </span>
                            )}
                            {item.accountingNote && (
                              <span className="text-xs font-medium text-slate-700">
                                • หมายเหตุบัญชี: {item.accountingNote}
                              </span>
                            )}
                          </div>
                          {item.accountingAckByName && (
                            <span className="text-[11px] text-slate-500">
                              บันทึกโดย {item.accountingAckByName} (
                              {formatThaiDate(item.accountingAckAt)})
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Right 3 Cols: Framed Action Stack (100% Equal Width & Uniform h-10 Buttons) */}
                  <div className="lg:col-span-3 h-full bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setInvoiceNo(item.accountingInvoiceNo || "");
                        setAccountingNote(item.accountingNote || "");
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Eye size={15} className="text-[#ff2301] shrink-0" />
                      <span className="truncate">เปิดดูชุดเอกสาร &amp; วางบิล</span>
                    </button>

                    <Link
                      href={`/repair-deliveries/${item.id}/pdf`}
                      target="_blank"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Printer size={14} className="text-[#ff2301] shrink-0" />
                      <span className="truncate">พิมพ์ใบส่งมอบงาน (PDF)</span>
                    </Link>

                    {!isBilled ? (
                      <button
                        type="button"
                        disabled={isSavingId === item.id}
                        onClick={() => handleConfirmAccounting(item, "", "")}
                        className="w-full h-10 px-3 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/20 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {isSavingId === item.id ? (
                          <Loader2 size={15} className="animate-spin shrink-0" />
                        ) : (
                          <ClipboardCheck size={15} className="shrink-0" />
                        )}
                        <span className="truncate">ยืนยันรับเอกสาร / วางบิล</span>
                      </button>
                    ) : (
                      <div className="w-full h-10 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <Check size={14} className="shrink-0" />
                        <span className="truncate">ดำเนินการทางบัญชีแล้ว</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Full Document Package & Billing Modal (Symmetrical Equal-Height Grids) ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setSelectedItem(null)}
          />

          <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      ชุดเอกสารส่งมอบงานสำหรับฝ่ายบัญชี
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                      {selectedItem.deliveryNumber}
                    </span>
                    {selectedItem.quotationNo && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        QT: {selectedItem.quotationNo}
                      </span>
                    )}
                    {selectedItem.linkedServiceCall?.caseNumber && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {selectedItem.linkedServiceCall.caseNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    ลูกค้า:{" "}
                    <b className="text-slate-800">
                      {selectedItem.company || selectedItem.customer || "-"}
                    </b>{" "}
                    • เซลล์ผู้ยืนยันส่งต่อ:{" "}
                    <b className="text-slate-800">
                      {selectedItem.salesAckByName || selectedItem.sender || "-"}
                    </b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-10 h-10 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-slate-50/50">
              {/* 1. Customer & Quotation Financial Summary (Equal Height) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2.5">
                  <div className="min-h-[24px] text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} className="text-[#ff2301] shrink-0" />
                    <span>ข้อมูลลูกค้า &amp; สถานที่ส่งมอบ</span>
                  </div>
                  <div className="flex-1 bg-slate-50/70 rounded-xl border border-slate-200/70 p-3 text-xs space-y-1.5 text-slate-700">
                    <div>
                      <span className="text-slate-400">บริษัทลูกค้า:</span>{" "}
                      <b className="text-slate-900">
                        {selectedItem.company || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">ผู้รับมอบงาน:</span>{" "}
                      <b>
                        {selectedItem.nameReceiver ||
                          selectedItem.customer ||
                          "-"}
                      </b>{" "}
                      {selectedItem.customerPosition
                        ? `(${selectedItem.customerPosition})`
                        : ""}
                    </div>
                    <div className="flex items-start gap-1 pt-0.5 text-slate-600">
                      <MapPin
                        size={13}
                        className="text-slate-400 shrink-0 mt-0.5"
                      />
                      <span>
                        {selectedItem.siteAddress ||
                          selectedItem.address ||
                          "ไม่ระบุสถานที่ส่งมอบ"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2.5">
                  <div className="min-h-[24px] text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={15} className="text-[#ff2301] shrink-0" />
                    <span>ข้อมูลใบเสนอราคา &amp; การรับทราบของเซลล์</span>
                  </div>
                  <div className="flex-1 bg-slate-50/70 rounded-xl border border-slate-200/70 p-3 text-xs space-y-1.5 text-slate-700">
                    <div>
                      <span className="text-slate-400">เลขที่ใบเสนอราคา:</span>{" "}
                      <b className="font-mono text-blue-700">
                        {selectedItem.quotationNo || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        มูลค่าใบเสนอราคา (ก่อน VAT):
                      </span>{" "}
                      <b className="font-mono text-[#ff2301]">
                        {selectedItem.linkedQuotation
                          ? `฿${(
                            Number(
                              selectedItem.linkedQuotation.actualClosingAmount
                            ) ||
                            Number(
                              selectedItem.linkedQuotation
                                .totalAmountBeforeVat
                            ) ||
                            0
                          ).toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}`
                          : "-"}
                      </b>
                    </div>
                    {selectedItem.linkedQuotation?.poNumber && (
                      <div>
                        <span className="text-slate-400">เลขที่ PO:</span>{" "}
                        <b className="font-mono">
                          {selectedItem.linkedQuotation.poNumber}
                        </b>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">เซลล์ผู้รับทราบ:</span>{" "}
                      <b>
                        {selectedItem.salesAckByName ||
                          selectedItem.sender ||
                          "-"}
                      </b>{" "}
                      ({formatThaiDate(selectedItem.salesAckAt)})
                    </div>
                    {selectedItem.salesAckNote && (
                      <div>
                        <span className="text-slate-400">หมายเหตุจากเซลล์:</span>{" "}
                        <b className="text-emerald-700">
                          {selectedItem.salesAckNote}
                        </b>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Work Scope & Service Call Parts Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={15} className="text-[#ff2301] shrink-0" />
                  <span>ขอบเขตงานที่ส่งมอบ &amp; รายการอะไหล่</span>
                </div>

                {getWorkTypesList(selectedItem).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch text-xs">
                    {getWorkTypesList(selectedItem).map((w, idx) => (
                      <div
                        key={idx}
                        className="h-full last:odd:sm:col-span-2 p-3 rounded-xl bg-red-50/40 border border-red-200/70"
                      >
                        <div className="font-bold text-[#ff2301] mb-1">
                          ✓ {w.label}
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap">
                          {w.detail || "ดำเนินการเรียบร้อย"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 px-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-400 text-center">
                    ไม่ได้ระบุรายละเอียดประเภทงานเพิ่มเติม
                  </div>
                )}

                {Array.isArray(selectedItem.linkedServiceCall?.partsUsed) &&
                  selectedItem.linkedServiceCall.partsUsed.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Package size={14} className="text-[#ff2301] shrink-0" />
                        <span>
                          รายการอะไหล่จากใบงานเซอร์วิส (
                          {selectedItem.linkedServiceCall.caseNumber})
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 w-10 text-center">#</th>
                              <th className="py-2 px-3">รายการอะไหล่</th>
                              <th className="py-2 px-3 w-20 text-center">
                                จำนวน
                              </th>
                              <th className="py-2 px-3 w-20 text-center">
                                หน่วย
                              </th>
                              <th className="py-2 px-3">หมายเหตุ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedItem.linkedServiceCall.partsUsed.map(
                              (p: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 text-center font-mono text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-900">
                                    {p.name || "-"}
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-[#ff2301]">
                                    {p.qty || 1}
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-600">
                                    {p.unit || "ชิ้น"}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500">
                                    {p.remark || "-"}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>

              {/* 3. Before & After Photos (Equal Height) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="min-h-[24px] text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-amber-600 shrink-0" />
                    <span>
                      รูปภาพก่อนปฏิบัติงาน (Before) (
                      {Array.isArray(selectedItem.photosBefore)
                        ? selectedItem.photosBefore.length
                        : 0}{" "}
                      รูป)
                    </span>
                  </div>
                  {Array.isArray(selectedItem.photosBefore) &&
                    selectedItem.photosBefore.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {selectedItem.photosBefore.map(
                        (url: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
                          >
                            <img
                              src={url}
                              alt={`Before ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[112px] flex items-center justify-center text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      ไม่มีรูปถ่ายก่อนปฏิบัติงาน
                    </div>
                  )}
                </div>

                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="min-h-[24px] text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-emerald-600 shrink-0" />
                    <span>
                      รูปภาพหลังปฏิบัติงาน (After) (
                      {Array.isArray(selectedItem.photosAfter)
                        ? selectedItem.photosAfter.length
                        : 0}{" "}
                      รูป)
                    </span>
                  </div>
                  {Array.isArray(selectedItem.photosAfter) &&
                    selectedItem.photosAfter.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {selectedItem.photosAfter.map(
                        (url: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
                          >
                            <img
                              src={url}
                              alt={`After ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[112px] flex items-center justify-center text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      ไม่มีรูปถ่ายหลังปฏิบัติงาน
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Signatures (Equal Height) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-red-200/80 p-4 flex flex-col justify-between gap-2.5">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSignature size={15} className="text-[#ff2301] shrink-0" />
                    <span>1. ลายเซ็นผู้ส่งมอบงาน (เซอร์วิส / ช่าง)</span>
                  </div>
                  <div className="h-28 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                    {selectedItem.sigSenderUrl ? (
                      <img
                        src={selectedItem.sigSenderUrl}
                        alt="Sender Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        ไม่มีลายเซ็นผู้ส่งมอบ
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    ลงชื่อ:{" "}
                    <b className="text-slate-900">
                      {selectedItem.nameSender ||
                        selectedItem.technician ||
                        "-"}
                    </b>
                  </div>
                </div>

                <div className="h-full bg-white rounded-2xl border border-emerald-200/80 p-4 flex flex-col justify-between gap-2.5">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSignature size={15} className="text-emerald-600 shrink-0" />
                    <span>2. ลายเซ็นผู้รับมอบงาน (ลูกค้า)</span>
                  </div>
                  <div className="h-28 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                    {selectedItem.sigReceiverUrl ? (
                      <img
                        src={selectedItem.sigReceiverUrl}
                        alt="Receiver Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        ไม่มีลายเซ็นผู้รับมอบ
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-between gap-2">
                    <span>
                      ลงชื่อ:{" "}
                      <b className="text-slate-900">
                        {selectedItem.nameReceiver ||
                          selectedItem.customer ||
                          "-"}
                      </b>
                    </span>
                    {selectedItem.customerPosition && (
                      <span className="text-slate-500 shrink-0">
                        ตำแหน่ง: {selectedItem.customerPosition}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Accounting Recording Form (Uniform h-11 Inputs) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={15} className="text-[#ff2301] shrink-0" />
                  <span>บันทึกการรับเอกสาร / เลขที่ใบแจ้งหนี้ (สำหรับฝ่ายบัญชี)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลขที่ใบแจ้งหนี้ / ใบกำกับภาษี (Invoice No.)
                    </label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="เช่น INV-2026-0012..."
                      className="w-full h-11 px-3.5 text-xs font-mono font-bold bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      หมายเหตุฝ่ายบัญชี
                    </label>
                    <input
                      type="text"
                      value={accountingNote}
                      onChange={(e) => setAccountingNote(e.target.value)}
                      placeholder="เช่น วางบิลเรียบร้อย นัดชำระ..."
                      className="w-full h-11 px-3.5 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Uniform h-10 Buttons) */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link
                  href={`/repair-deliveries/${selectedItem.id}/pdf`}
                  target="_blank"
                  className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all whitespace-nowrap"
                >
                  <Printer size={15} className="text-[#ff2301] shrink-0" />
                  <span>พิมพ์ใบส่งมอบงาน (PDF)</span>
                </Link>

                {selectedItem.linkedServiceCall?.id && (
                  <Link
                    href={`/service/calls/${selectedItem.linkedServiceCall.id}/pdf`}
                    target="_blank"
                    className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all whitespace-nowrap"
                  >
                    <Printer size={15} className="text-purple-600 shrink-0" />
                    <span>พิมพ์ใบรายงานเซอร์วิส (PDF)</span>
                  </Link>
                )}

                {selectedItem.linkedQuotation?.id && (
                  <Link
                    href={`/sales?editId=${selectedItem.linkedQuotation.id}`}
                    className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-all whitespace-nowrap"
                  >
                    <FileText size={14} className="shrink-0" />
                    <span>ดูใบเสนอราคา ({selectedItem.quotationNo})</span>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 whitespace-nowrap"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  disabled={isSavingId === selectedItem.id}
                  onClick={() =>
                    handleConfirmAccounting(
                      selectedItem,
                      invoiceNo,
                      accountingNote
                    )
                  }
                  className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/25 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isSavingId === selectedItem.id ? (
                    <Loader2 size={15} className="animate-spin shrink-0" />
                  ) : (
                    <ClipboardCheck size={15} className="shrink-0" />
                  )}
                  <span>
                    {selectedItem.accountingStatus === "BILLED"
                      ? "อัปเดตข้อมูลวางบิล"
                      : "ยืนยันรับเอกสาร / บันทึกวางบิลแล้ว"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Full preview"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

