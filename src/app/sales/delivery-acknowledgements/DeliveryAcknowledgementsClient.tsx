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
  Phone,
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
  ClipboardCheck,
  Receipt,
} from "lucide-react";
import { acknowledgeRepairDelivery } from "@/app/actions/repairDeliveries";

interface DeliveryAcknowledgementsClientProps {
  initialDeliveries: any[];
  currentUser: any;
  initialDeliveryId?: string | null;
  initialTab?: "pending" | "acknowledged" | "billed" | "all";
}

export default function DeliveryAcknowledgementsClient({
  initialDeliveries = [],
  currentUser,
  initialDeliveryId = null,
  initialTab = "pending",
}: DeliveryAcknowledgementsClientProps) {
  const [deliveries, setDeliveries] = useState<any[]>(initialDeliveries);
  const [activeTab, setActiveTab] = useState<
    "pending" | "acknowledged" | "billed" | "all"
  >(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [isAckingId, setIsAckingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setDeliveries(initialDeliveries);
  }, [initialDeliveries]);

  useEffect(() => {
    if (initialDeliveryId && deliveries.length > 0) {
      const found = deliveries.find((d) => d.id === initialDeliveryId);
      if (found) {
        setSelectedItem(found);
        setAckNote(found.salesAckNote || "");
        if (found.accountingStatus === "BILLED") {
          setActiveTab("billed");
        } else if (found.salesAckStatus === "ACKNOWLEDGED") {
          setActiveTab("all");
        }
      }
    }
  }, [initialDeliveryId, deliveries]);

  const pendingItems = useMemo(
    () => deliveries.filter((d) => d.salesAckStatus !== "ACKNOWLEDGED"),
    [deliveries]
  );

  const acknowledgedItems = useMemo(
    () => deliveries.filter((d) => d.salesAckStatus === "ACKNOWLEDGED"),
    [deliveries]
  );

  const waitingBillingItems = useMemo(
    () =>
      deliveries.filter(
        (d) =>
          d.salesAckStatus === "ACKNOWLEDGED" && d.accountingStatus !== "BILLED"
      ),
    [deliveries]
  );

  const billedItems = useMemo(
    () => deliveries.filter((d) => d.accountingStatus === "BILLED"),
    [deliveries]
  );

  const filteredItems = useMemo(() => {
    const base =
      activeTab === "pending"
        ? pendingItems
        : activeTab === "acknowledged"
        ? waitingBillingItems
        : activeTab === "billed"
        ? billedItems
        : deliveries;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return base;

    return base.filter((item) => {
      const fields = [
        item.deliveryNumber,
        item.quotationNo,
        item.company,
        item.customer,
        item.jobName,
        item.sender,
        item.technician,
        item.nameSender,
        item.nameReceiver,
        item.salesAckByName,
        item.accountingInvoiceNo,
        item.accountingAckByName,
        item.accountingNote,
      ];
      return fields.some((f) => String(f || "").toLowerCase().includes(q));
    });
  }, [
    activeTab,
    pendingItems,
    waitingBillingItems,
    billedItems,
    deliveries,
    searchTerm,
  ]);

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

  const handleAcknowledge = async (item: any, customNote?: string) => {
    setIsAckingId(item.id);
    try {
      const res = await acknowledgeRepairDelivery(
        item.id,
        customNote !== undefined ? customNote : ackNote
      );
      if (res.success) {
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === item.id
              ? {
                  ...d,
                  salesAckStatus: "ACKNOWLEDGED",
                  salesAckByName: res.salesAckByName,
                  salesAckAt: res.salesAckAt,
                  salesAckNote: res.salesAckNote,
                  accountingStatus: res.accountingStatus || "PENDING",
                  accountingSentAt: res.accountingSentAt,
                }
              : d
          )
        );
        if (selectedItem?.id === item.id) {
          setSelectedItem((prev: any) =>
            prev
              ? {
                  ...prev,
                  salesAckStatus: "ACKNOWLEDGED",
                  salesAckByName: res.salesAckByName,
                  salesAckAt: res.salesAckAt,
                  salesAckNote: res.salesAckNote,
                  accountingStatus: res.accountingStatus || "PENDING",
                  accountingSentAt: res.accountingSentAt,
                }
              : null
          );
        }
        await Swal.fire({
          icon: "success",
          title: "รับทราบ & ส่งต่อฝ่ายบัญชีแล้ว",
          text: `บันทึกการรับทราบใบส่งมอบงาน ${item.deliveryNumber} และส่งเอกสารให้ฝ่ายบัญชีเรียบร้อยแล้ว`,
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.error || "ไม่สามารถบันทึกรับทราบได้",
          confirmButtonColor: "#ff2301",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถบันทึกรับทราบได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsAckingId(null);
    }
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

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header (Symmetrical Left Title & Single Right Action) ── */}
      <header className="shrink-0 border-b border-slate-200/80 px-5 md:px-8 py-4 md:py-5 bg-white flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center shadow-md shadow-red-600/20 text-white shrink-0">
            <FileSignature size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
              ใบส่งมอบงานที่เซ็นแล้ว (แจ้งเซลล์รับทราบ)
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">
              เมื่อทีมเซอร์วิสและลูกค้าเซ็นใบส่งมอบงานเสร็จสมบูรณ์ ข้อมูลพร้อมรูปถ่ายหน้างานและลายเซ็นจะถูกส่งมาให้เซลล์ตรวจสอบ กดรับทราบ และติดตามสถานะการวางบิลจากฝ่ายบัญชีได้ที่นี่
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end w-full sm:w-auto shrink-0">
          <Link
            href="/sales"
            className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0"
          >
            <FileText size={15} className="shrink-0" />
            <span>หน้าระบบใบเสนอราคา</span>
          </Link>
        </div>
      </header>

      {/* ── Symmetrical 4-Card Equal-Height KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 px-5 md:px-8 py-4 bg-slate-50/70 border-b border-slate-200/80 items-stretch">
        <div
          onClick={() => setActiveTab("pending")}
          className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "pending"
              ? "border-amber-400 ring-2 ring-amber-500/15"
              : "border-amber-200 hover:border-amber-300"
          }`}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-amber-700 tracking-tight truncate">
              รอเซลล์กดรับทราบผลส่งมอบ
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {pendingItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Pending Sales Ack
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("acknowledged")}
          className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "acknowledged"
              ? "border-emerald-400 ring-2 ring-emerald-500/15"
              : "border-emerald-200 hover:border-emerald-300"
          }`}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-emerald-700 tracking-tight truncate">
              ส่งต่อบัญชีแล้ว • รอบัญชีวางบิล
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {waitingBillingItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Sent to Accounting
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("billed")}
          className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "billed"
              ? "border-blue-400 ring-2 ring-blue-500/15"
              : "border-blue-200 hover:border-blue-300"
          }`}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-blue-700 tracking-tight truncate">
              ฝ่ายบัญชีวางบิลแล้ว
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {billedItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Billed by Accounting
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0">
            <Receipt size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("all")}
          className={`h-full min-h-[96px] cursor-pointer bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "all"
              ? "border-slate-400 ring-2 ring-slate-500/15"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black text-slate-600 tracking-tight truncate">
              ใบส่งมอบงานที่เซ็นครบทั้งหมด
            </p>
            <p className="text-xl xl:text-2xl font-black text-slate-900 font-mono leading-tight">
              {deliveries.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              Total Signed Deliveries
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ff2301] border border-red-200/70 flex items-center justify-center shrink-0">
            <FileSignature size={20} />
          </div>
        </div>
      </div>

      {/* ── Symmetrical 50/50 Filter Tabs & Search Bar (Aligns with 4-Card KPI Center Axis) ── */}
      <div className="shrink-0 px-5 md:px-8 py-3 border-b border-slate-200/80 bg-white grid grid-cols-1 lg:grid-cols-12 gap-3.5 md:gap-4 items-center">
        {/* Left 6 Cols: 4 Equal-Width Segmented Filter Buttons */}
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 sm:h-11 bg-slate-100/90 border border-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "pending"
                ? "bg-[#ff2301] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <Clock size={13} className="shrink-0 hidden xl:inline" />
            <span className="truncate">รอรับทราบ</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeTab === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingItems.length}
            </span>
          </button>

          <button
            type="button"
            title="ส่งต่อบัญชีแล้ว (รอบัญชีวางบิล)"
            onClick={() => setActiveTab("acknowledged")}
            className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "acknowledged"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <CheckCircle2 size={13} className="shrink-0 hidden xl:inline" />
            <span className="truncate">รอวางบิล</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeTab === "acknowledged"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {waitingBillingItems.length}
            </span>
          </button>

          <button
            type="button"
            title="ฝ่ายบัญชีวางบิลแล้ว"
            onClick={() => setActiveTab("billed")}
            className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "billed"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <Receipt size={13} className="shrink-0 hidden xl:inline" />
            <span className="truncate">วางบิลแล้ว</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeTab === "billed"
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {billedItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`h-9 sm:h-full px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-0 ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
          >
            <span className="truncate">ทั้งหมด</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeTab === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {deliveries.length}
            </span>
          </button>
        </div>

        {/* Right 6 Cols: Full-Width h-11 Search Input */}
        <div className="lg:col-span-6 relative w-full">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลข DN, เลข QT, ชื่อบริษัท, ลูกค้า, ช่าง..."
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
              <FileSignature size={26} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800">
                ไม่พบรายการใบส่งมอบงานที่เซ็นแล้วตามเงื่อนไข
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                เมื่อทีมเซอร์วิสและลูกค้าเซ็นใบส่งมอบงานในหน้า /repair-deliveries เสร็จเรียบร้อย ข้อมูลจะวิ่งมาแสดงในหน้านี้ให้เซลล์กดรับทราบโดยอัตโนมัติ
              </p>
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isAcked = item.salesAckStatus === "ACKNOWLEDGED";
            const photosBeforeArr = Array.isArray(item.photosBefore)
              ? item.photosBefore
              : [];
            const photosAfterArr = Array.isArray(item.photosAfter)
              ? item.photosAfter
              : [];
            const totalPhotos = photosBeforeArr.length + photosAfterArr.length;
            const workTypes = getWorkTypesList(item);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md p-4 sm:p-5 space-y-3.5 ${
                  isAcked
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

                    {isAcked ? (
                      <span className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>
                          เซลล์รับทราบแล้ว
                          {item.salesAckByName ? ` (${item.salesAckByName})` : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>รอเซลล์กดรับทราบผลส่งมอบงาน</span>
                      </span>
                    )}

                    {item.accountingStatus === "BILLED" && (
                      <span className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Receipt size={13} className="shrink-0" />
                        <span>
                          บัญชีวางบิลแล้ว
                          {item.accountingInvoiceNo
                            ? `: ${item.accountingInvoiceNo}`
                            : ""}
                        </span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1 shrink-0">
                    <Calendar size={12} className="shrink-0" />
                    <span>
                      เซ็นส่งมอบเมื่อ:{" "}
                      {formatThaiDate(
                        item.signedCompletedAt ||
                          item.deliveryDate ||
                          item.updatedAt
                      )}
                    </span>
                  </span>
                </div>

                {/* Symmetrical 12-Column Body (9 Cols Details + 3 Cols Equal-Width Action Panel) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  {/* Left 9 Cols: Customer + 2 Equal Summary Sub-Cards + Accounting Status */}
                  <div className="lg:col-span-9 h-full flex flex-col justify-between gap-3.5 min-w-0">
                    {/* Customer & Coordinator Box Row */}
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
                              ผู้รับมอบ: {item.nameReceiver || item.customer || "-"}
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
                        className={`min-w-[190px] h-14 px-3.5 rounded-xl border flex flex-col justify-center sm:text-right shrink-0 ${
                          item.sender
                            ? "bg-red-50/60 border-red-200/80"
                            : "bg-slate-50 border-slate-200/80"
                        }`}
                      >
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          เซลล์ผู้ประสานงาน
                        </div>
                        <div
                          className={`text-sm font-black truncate leading-tight ${
                            item.sender ? "text-[#ff2301]" : "text-slate-400"
                          }`}
                        >
                          {item.sender || "ไม่ระบุผู้ประสานงาน"}
                        </div>
                      </div>
                    </div>

                    {/* Symmetrical 2-Column Equal-Height Summary Sub-Cards */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch text-xs">
                      <div className="h-full bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between gap-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Wrench size={14} className="text-[#ff2301] shrink-0" />
                          <span>ขอบเขตงานที่ส่งมอบ</span>
                        </div>
                        <div className="text-slate-600 space-y-1 flex-1">
                          {workTypes.length > 0 ? (
                            workTypes.map((w, idx) => (
                              <div key={idx}>
                                <b className="text-slate-800">• {w.label}:</b>{" "}
                                {w.detail || "ดำเนินการเรียบร้อย"}
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500">
                              {item.note || item.comments || "-"}
                            </p>
                          )}
                        </div>
                        {isAcked && item.salesAckNote && (
                          <div className="text-emerald-800 font-medium pt-1 border-t border-slate-200/70">
                            หมายเหตุเซลล์: &ldquo;{item.salesAckNote}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="h-full bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between gap-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <FileSignature
                            size={14}
                            className="text-[#ff2301] shrink-0"
                          />
                          <span>ผู้ลงนาม &amp; หลักฐานการส่งมอบ</span>
                        </div>
                        <div className="text-slate-600 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              size={13}
                              className={
                                item.sigSenderUrl
                                  ? "text-emerald-600 shrink-0"
                                  : "text-slate-300 shrink-0"
                              }
                            />
                            <span className="truncate">
                              ผู้ส่งมอบ (เซอร์วิส/ช่าง):{" "}
                              <b className="text-slate-900">
                                {item.nameSender || item.technician || "-"}
                              </b>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              size={13}
                              className={
                                item.sigReceiverUrl
                                  ? "text-emerald-600 shrink-0"
                                  : "text-slate-300 shrink-0"
                              }
                            />
                            <span className="truncate">
                              ผู้รับมอบ (ลูกค้า):{" "}
                              <b className="text-slate-900">
                                {item.nameReceiver || item.customer || "-"}
                              </b>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Camera
                              size={13}
                              className={
                                totalPhotos > 0
                                  ? "text-sky-600 shrink-0"
                                  : "text-slate-400 shrink-0"
                              }
                            />
                            <span>
                              รูปภาพก่อน/หลังส่งมอบ:{" "}
                              <b className="text-slate-900">
                                {totalPhotos} รูป
                              </b>{" "}
                              (ก่อน {photosBeforeArr.length} / หลัง{" "}
                              {photosAfterArr.length})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Single Clean Accounting Billing Status Strip */}
                    {isAcked && (
                      <div
                        className={`rounded-xl px-3.5 py-2.5 border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          item.accountingStatus === "BILLED"
                            ? "bg-blue-50/70 border-blue-200 text-blue-950"
                            : "bg-amber-50/60 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                          <span className="inline-flex items-center gap-1.5 font-black">
                            <Receipt
                              size={14}
                              className={
                                item.accountingStatus === "BILLED"
                                  ? "text-blue-600 shrink-0"
                                  : "text-amber-600 shrink-0"
                              }
                            />
                            <span>
                              สถานะฝ่ายบัญชี:{" "}
                              {item.accountingStatus === "BILLED"
                                ? "วางบิล / ออกใบแจ้งหนี้เรียบร้อยแล้ว"
                                : "ส่งต่อฝ่ายบัญชีแล้ว • รอตรวจสอบและวางบิล"}
                            </span>
                          </span>

                          {item.accountingInvoiceNo && (
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-white border border-blue-200 text-blue-800">
                              เลขใบแจ้งหนี้/วางบิล: {item.accountingInvoiceNo}
                            </span>
                          )}

                          {item.accountingNote && (
                            <span className="text-slate-700 font-medium">
                              หมายเหตุบัญชี: <b>{item.accountingNote}</b>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-semibold shrink-0 text-slate-600">
                          {item.accountingStatus === "BILLED" ? (
                            <span className="text-blue-800">
                              ผู้วางบิล: <b>{item.accountingAckByName || "-"}</b>
                              {item.accountingAckAt
                                ? ` • ${formatThaiDate(item.accountingAckAt)}`
                                : ""}
                            </span>
                          ) : (
                            <span>
                              ส่งต่อบัญชีเมื่อ: {formatThaiDate(item.salesAckAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 3 Cols: Uniform Full-Width Action Stack (3 x h-10 Items) */}
                  <div className="lg:col-span-3 h-full bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setAckNote(item.salesAckNote || "");
                      }}
                      className="w-full h-10 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
                    >
                      <Eye size={15} className="text-[#ff2301] shrink-0" />
                      <span>เปิดดูข้อมูล &amp; ลายเซ็น</span>
                    </button>

                    <Link
                      href={`/repair-deliveries/${item.id}/pdf`}
                      target="_blank"
                      className="w-full h-10 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all whitespace-nowrap"
                    >
                      <Printer size={14} className="text-[#ff2301] shrink-0" />
                      <span>ดูใบส่งมอบงาน (PDF)</span>
                    </Link>

                    {!isAcked ? (
                      <button
                        type="button"
                        disabled={isAckingId === item.id}
                        onClick={() => handleAcknowledge(item, "")}
                        className="w-full h-10 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {isAckingId === item.id ? (
                          <Loader2 size={15} className="animate-spin shrink-0" />
                        ) : (
                          <ClipboardCheck size={15} className="shrink-0" />
                        )}
                        <span>กดรับทราบ &amp; ส่งต่อบัญชี</span>
                      </button>
                    ) : (
                      <div
                        title={`ส่งต่อบัญชีเมื่อ ${formatThaiDate(item.salesAckAt)}`}
                        className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold whitespace-nowrap"
                      >
                        <Check size={14} className="shrink-0" />
                        <span>ส่งต่อฝ่ายบัญชีแล้ว</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Full Inspection & Acknowledgement Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setSelectedItem(null)}
          />

          <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      รายละเอียดใบส่งมอบงานที่เซ็นแล้ว
                    </h2>
                    <span className="h-6 inline-flex items-center px-2.5 rounded-full text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                      {selectedItem.deliveryNumber}
                    </span>
                    {selectedItem.quotationNo && (
                      <span className="h-6 inline-flex items-center px-2.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        QT: {selectedItem.quotationNo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    ลูกค้า:{" "}
                    <b className="text-slate-800">
                      {selectedItem.company || selectedItem.customer || "-"}
                    </b>{" "}
                    • เซลล์ผู้ประสานงาน:{" "}
                    <b className="text-slate-800">{selectedItem.sender || "-"}</b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-9 h-9 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-slate-50/50">
              {/* 1. Symmetrical Equal-Height Customer & Job Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={15} className="text-[#ff2301] shrink-0" />
                      <span>ข้อมูลลูกค้า &amp; สถานที่ส่งมอบ</span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-700">
                      <div>
                        <span className="text-slate-400">บริษัทลูกค้า:</span>{" "}
                        <b className="text-slate-900">
                          {selectedItem.company || "-"}
                        </b>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          ผู้ติดต่อ/ผู้รับมอบ:
                        </span>{" "}
                        <b>
                          {selectedItem.nameReceiver ||
                            selectedItem.customer ||
                            "-"}
                        </b>{" "}
                        {selectedItem.customerPosition
                          ? `(${selectedItem.customerPosition})`
                          : ""}
                      </div>
                      {(selectedItem.siteAddress || selectedItem.address) && (
                        <div className="flex items-start gap-1 pt-1 text-slate-600">
                          <MapPin
                            size={13}
                            className="text-slate-400 shrink-0 mt-0.5"
                          />
                          <span>
                            {selectedItem.siteAddress || selectedItem.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench size={15} className="text-[#ff2301] shrink-0" />
                      <span>ข้อมูลเอกสาร &amp; ผู้ปฏิบัติงาน</span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-700">
                      <div>
                        <span className="text-slate-400">
                          ชื่องาน / โครงการ:
                        </span>{" "}
                        <b className="text-slate-900">
                          {selectedItem.jobName || "-"}
                        </b>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          เลขที่ใบเสนอราคา:
                        </span>{" "}
                        <b className="font-mono text-blue-700">
                          {selectedItem.quotationNo || "-"}
                        </b>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          ช่าง/วิศวกรผู้ส่งมอบ:
                        </span>{" "}
                        <b>
                          {selectedItem.nameSender ||
                            selectedItem.technician ||
                            "-"}
                        </b>{" "}
                        {selectedItem.technicianPhone
                          ? `(${selectedItem.technicianPhone})`
                          : ""}
                      </div>
                      <div>
                        <span className="text-slate-400">
                          เซลล์ผู้ประสานงาน:
                        </span>{" "}
                        <b>{selectedItem.sender || "-"}</b>{" "}
                        {selectedItem.senderPhone
                          ? `(${selectedItem.senderPhone})`
                          : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Work Scope & Comments */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  ขอบเขตงานบริการและหมายเหตุการส่งมอบ
                </div>
                {getWorkTypesList(selectedItem).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch text-xs">
                    {getWorkTypesList(selectedItem).map((w, idx) => (
                      <div
                        key={idx}
                        className="h-full p-3 rounded-xl bg-red-50/40 border border-red-200/70"
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
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    ไม่ได้ระบุหมวดหมู่งานย่อย
                  </div>
                )}
                {(selectedItem.note || selectedItem.comments) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    {selectedItem.note && (
                      <div>
                        <span className="font-bold text-slate-600">
                          หมายเหตุใบส่งมอบ:{" "}
                        </span>
                        <span className="text-slate-800">
                          {selectedItem.note}
                        </span>
                      </div>
                    )}
                    {selectedItem.comments && (
                      <div>
                        <span className="font-bold text-slate-600">
                          ความคิดเห็นเพิ่มเติม:{" "}
                        </span>
                        <span className="text-slate-800">
                          {selectedItem.comments}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Symmetrical Equal-Height Before & After Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
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
                    <div className="flex-1 min-h-[128px] flex items-center justify-center text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      ไม่มีรูปถ่ายก่อนปฏิบัติงาน
                    </div>
                  )}
                </div>

                <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
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
                    <div className="flex-1 min-h-[128px] flex items-center justify-center text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      ไม่มีรูปถ่ายหลังปฏิบัติงาน
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Symmetrical Equal-Height Digital Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="h-full bg-white rounded-2xl border border-red-200/80 p-4 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <FileSignature
                        size={15}
                        className="text-[#ff2301] shrink-0"
                      />
                      <span>1. ลายเซ็นผู้ส่งมอบงาน (เซอร์วิส / ช่าง)</span>
                    </div>
                    <div className="h-32 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
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
                  </div>
                  <div className="text-xs text-slate-600 pt-1">
                    ลงชื่อตัวบรรจง:{" "}
                    <b className="text-slate-900">
                      {selectedItem.nameSender ||
                        selectedItem.technician ||
                        "-"}
                    </b>
                  </div>
                </div>

                <div className="h-full bg-white rounded-2xl border border-emerald-200/80 p-4 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <FileSignature
                        size={15}
                        className="text-emerald-600 shrink-0"
                      />
                      <span>2. ลายเซ็นผู้รับมอบงาน (ลูกค้า)</span>
                    </div>
                    <div className="h-32 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
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
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-between gap-2 pt-1">
                    <span>
                      ลงชื่อตัวบรรจง:{" "}
                      <b className="text-slate-900">
                        {selectedItem.nameReceiver ||
                          selectedItem.customer ||
                          "-"}
                      </b>
                    </span>
                    {selectedItem.customerPosition && (
                      <span className="shrink-0">
                        ตำแหน่ง: {selectedItem.customerPosition}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Sales Acknowledgement Note Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <label className="block text-xs font-black text-slate-900">
                  บันทึกหมายเหตุการรับทราบจากฝ่ายขาย (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="เช่น รับทราบการส่งมอบงานเรียบร้อย เตรียมส่งเรื่องวางบิล/ติดตามลูกค้า..."
                  className="w-full h-11 px-3.5 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10 transition-all"
                />
                {selectedItem.salesAckStatus === "ACKNOWLEDGED" && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>
                      รับทราบแล้วโดย {selectedItem.salesAckByName || "-"} เมื่อ{" "}
                      {formatThaiDate(selectedItem.salesAckAt)}
                    </span>
                  </p>
                )}
              </div>

              {/* 6. Accounting Billing Status & Invoice Details Box */}
              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  selectedItem.accountingStatus === "BILLED"
                    ? "bg-blue-50/70 border-blue-200"
                    : "bg-amber-50/50 border-amber-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Receipt
                      size={16}
                      className={
                        selectedItem.accountingStatus === "BILLED"
                          ? "text-blue-600 shrink-0"
                          : "text-amber-600 shrink-0"
                      }
                    />
                    <span>สถานะการวางบิล / ออกใบแจ้งหนี้จากฝ่ายบัญชี</span>
                  </div>

                  <span
                    className={`h-6 inline-flex items-center px-2.5 rounded-full text-[11px] font-black border ${
                      selectedItem.accountingStatus === "BILLED"
                        ? "bg-blue-600 text-white border-blue-600"
                        : selectedItem.salesAckStatus === "ACKNOWLEDGED"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {selectedItem.accountingStatus === "BILLED"
                      ? "ฝ่ายบัญชีวางบิลเรียบร้อยแล้ว"
                      : selectedItem.salesAckStatus === "ACKNOWLEDGED"
                      ? "ส่งต่อฝ่ายบัญชีแล้ว • รอบัญชีวางบิล"
                      : "รอเซลล์กดรับทราบเพื่อส่งต่อฝ่ายบัญชี"}
                  </span>
                </div>

                {selectedItem.accountingStatus === "BILLED" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch text-xs bg-white rounded-xl p-3.5 border border-blue-200/80">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        เลขที่ใบแจ้งหนี้ / ใบกำกับภาษี / ใบวางบิล:
                      </span>
                      <span className="font-mono font-black text-blue-700 text-sm">
                        {selectedItem.accountingInvoiceNo || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        ผู้ดำเนินการฝ่ายบัญชี:
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedItem.accountingAckByName || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        วันเวลาที่บันทึกวางบิล:
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatThaiDate(selectedItem.accountingAckAt)}
                      </span>
                    </div>
                    {selectedItem.accountingNote && (
                      <div className="sm:col-span-3 pt-2 border-t border-slate-100">
                        <span className="text-slate-400">
                          หมายเหตุจากฝ่ายบัญชี:{" "}
                        </span>
                        <b className="text-slate-800">
                          {selectedItem.accountingNote}
                        </b>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    เมื่อฝ่ายบัญชีตรวจสอบเอกสารและบันทึกเลขที่ใบแจ้งหนี้/วางบิลในหน้า{" "}
                    <b>/accounting/delivery-handovers</b> เรียบร้อยแล้ว
                    ข้อมูลเลขที่บิลและสถานะจะแสดงให้เซลล์เห็นในส่วนนี้ทันที
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer (Uniform h-10 Buttons) */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link
                  href={`/repair-deliveries/${selectedItem.id}/pdf`}
                  target="_blank"
                  className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all whitespace-nowrap"
                >
                  <Printer size={15} className="text-[#ff2301] shrink-0" />
                  <span>พิมพ์ใบส่งมอบงาน (PDF A4)</span>
                </Link>

                <Link
                  href={`/repair-deliveries/${selectedItem.id}`}
                  className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all whitespace-nowrap"
                >
                  <ExternalLink size={14} className="shrink-0" />
                  <span>เปิดดูหน้าใบส่งมอบงานเต็ม</span>
                </Link>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all whitespace-nowrap"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  disabled={isAckingId === selectedItem.id}
                  onClick={() => handleAcknowledge(selectedItem, ackNote)}
                  className="h-10 inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/25 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isAckingId === selectedItem.id ? (
                    <Loader2 size={15} className="animate-spin shrink-0" />
                  ) : (
                    <ClipboardCheck size={15} className="shrink-0" />
                  )}
                  <span>
                    {selectedItem.salesAckStatus === "ACKNOWLEDGED"
                      ? "อัปเดตบันทึก & ส่งข้อมูลให้ฝ่ายบัญชี"
                      : "ยืนยันรับทราบ & ส่งเอกสารให้ฝ่ายบัญชี"}
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

