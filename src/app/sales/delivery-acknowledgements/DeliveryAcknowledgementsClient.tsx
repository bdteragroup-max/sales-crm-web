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
      {/* ── Top Header ── */}
      <header className="shrink-0 border-b border-slate-200/80 px-6 md:px-8 py-4 md:py-5 bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center shadow-md shadow-red-600/20 text-white shrink-0">
            <FileSignature size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                ใบส่งมอบงานที่เซ็นแล้ว (แจ้งเซลล์รับทราบ)
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              เมื่อทีมเซอร์วิสและลูกค้าเซ็นใบส่งมอบงานเสร็จสมบูรณ์ ข้อมูลพร้อมรูปถ่ายหน้างานและลายเซ็นจะถูกส่งมาให้เซลล์ตรวจสอบ กดรับทราบ และติดตามสถานะการวางบิลจากฝ่ายบัญชีได้ที่นี่
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <Link
            href="/repair-deliveries"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <FileSignature size={15} className="text-slate-500" />
            <span>ดูทะเบียนใบส่งมอบงานทั้งหมด</span>
          </Link>
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs"
          >
            <FileText size={15} />
            <span>หน้าระบบใบเสนอราคา</span>
          </Link>
        </div>
      </header>

      {/* ── Symmetrical 4-Card KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 p-4 md:px-8 md:py-4 bg-slate-50/70 border-b border-slate-200/80">
        <div
          onClick={() => setActiveTab("pending")}
          className="cursor-pointer bg-white rounded-2xl border border-amber-200 hover:border-amber-300 p-4 shadow-xs flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-black text-amber-700 tracking-tight">
              รอเซลล์กดรับทราบผลส่งมอบ
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {pendingItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Sales Ack
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("acknowledged")}
          className="cursor-pointer bg-white rounded-2xl border border-emerald-200 hover:border-emerald-300 p-4 shadow-xs flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-black text-emerald-700 tracking-tight">
              ส่งต่อบัญชีแล้ว • รอบัญชีวางบิล
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {waitingBillingItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sent to Accounting
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("billed")}
          className="cursor-pointer bg-white rounded-2xl border border-blue-200 hover:border-blue-300 p-4 shadow-xs flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-black text-blue-700 tracking-tight">
              ฝ่ายบัญชีวางบิลแล้ว
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {billedItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Billed by Accounting
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0">
            <Receipt size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("all")}
          className="cursor-pointer bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4 shadow-xs flex items-center justify-between transition-all"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-600 tracking-tight">
              ใบส่งมอบงานที่เซ็นครบทั้งหมด
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {deliveries.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Signed Deliveries
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ff2301] border border-red-200/70 flex items-center justify-center shrink-0">
            <FileSignature size={20} />
          </div>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="shrink-0 px-4 md:px-8 py-3 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
              activeTab === "pending"
                ? "bg-[#ff2301] text-white shadow-sm shadow-red-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock size={14} />
            <span>รอรับทราบ</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
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
            onClick={() => setActiveTab("acknowledged")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
              activeTab === "acknowledged"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>ส่งต่อบัญชีแล้ว (รอวางบิล)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
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
            onClick={() => setActiveTab("billed")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
              activeTab === "billed"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Receipt size={14} />
            <span>บัญชีวางบิลแล้ว</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
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
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
              activeTab === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>ทั้งหมด</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {deliveries.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลข DN, เลข QT, ชื่อบริษัท, ลูกค้า, ช่าง..."
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content List ── */}
      <div className="flex-1 overflow-y-auto p-4 md:px-8 md:py-6 space-y-4 bg-slate-50/40">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileSignature size={26} />
            </div>
            <h3 className="text-base font-black text-slate-800">
              ไม่พบรายการใบส่งมอบงานที่เซ็นแล้วตามเงื่อนไข
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              เมื่อทีมเซอร์วิสและลูกค้าเซ็นใบส่งมอบงานในหน้า /repair-deliveries เสร็จเรียบร้อย ข้อมูลจะวิ่งมาแสดงในหน้านี้ให้เซลล์กดรับทราบโดยอัตโนมัติ
            </p>
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
                className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md p-5 ${
                  isAcked
                    ? "border-emerald-200/90"
                    : "border-slate-200/90 hover:border-red-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Details */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                        {item.deliveryNumber}
                      </span>

                      {item.internalCompany && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          {item.internalCompany}
                        </span>
                      )}

                      {item.quotationNo && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          QT: {item.quotationNo}
                        </span>
                      )}

                      {isAcked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} />
                          <span>
                            เซลล์รับทราบแล้ว
                            {item.salesAckByName
                              ? ` (${item.salesAckByName})`
                              : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>รอเซลล์กดรับทราบผลส่งมอบงาน</span>
                        </span>
                      )}

                      {item.accountingStatus === "BILLED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Receipt size={13} />
                          <span>
                            บัญชีวางบิลแล้ว
                            {item.accountingInvoiceNo
                              ? `: ${item.accountingInvoiceNo}`
                              : ""}
                          </span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 ml-auto lg:ml-0">
                        <Calendar size={12} />
                        เซ็นส่งมอบเมื่อ:{" "}
                        {formatThaiDate(
                          item.signedCompletedAt ||
                            item.deliveryDate ||
                            item.updatedAt
                        )}
                      </span>
                    </div>

                    {/* Customer & Job Name */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        <Building2 size={18} className="text-[#ff2301] shrink-0" />
                        <span>{item.company || item.customer || "-"}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <User size={13} className="text-slate-400" />
                          ผู้รับมอบ: {item.nameReceiver || item.customer || "-"}
                          {item.customerPosition
                            ? ` (${item.customerPosition})`
                            : ""}
                        </span>
                        {item.jobName && (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Briefcase size={13} className="text-[#ff2301]" />
                            งาน: {item.jobName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Work Scope & Signatures Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/70 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-700">
                          ขอบเขตงานที่ส่งมอบ:
                        </div>
                        {workTypes.length > 0 ? (
                          <div className="space-y-1">
                            {workTypes.map((w, idx) => (
                              <div key={idx} className="text-slate-600">
                                <b className="text-slate-800">• {w.label}:</b>{" "}
                                {w.detail || "ดำเนินการเรียบร้อย"}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">
                            {item.note || item.comments || "-"}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-700">
                          ผู้ลงนามในใบส่งมอบงาน:
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <CheckCircle2
                            size={13}
                            className={
                              item.sigSenderUrl
                                ? "text-emerald-600 shrink-0"
                                : "text-slate-300 shrink-0"
                            }
                          />
                          <span>
                            ผู้ส่งมอบ (เซอร์วิส/ช่าง):{" "}
                            <b className="text-slate-900">
                              {item.nameSender || item.technician || "-"}
                            </b>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <CheckCircle2
                            size={13}
                            className={
                              item.sigReceiverUrl
                                ? "text-emerald-600 shrink-0"
                                : "text-slate-300 shrink-0"
                            }
                          />
                          <span>
                            ผู้รับมอบ (ลูกค้า):{" "}
                            <b className="text-slate-900">
                              {item.nameReceiver || item.customer || "-"}
                            </b>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Accounting Billing Status Box (Shown when Billed or Sent to Accounting) */}
                    {isAcked && (
                      <div
                        className={`rounded-xl p-3 border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          item.accountingStatus === "BILLED"
                            ? "bg-blue-50/70 border-blue-200 text-blue-950"
                            : "bg-amber-50/60 border-amber-200 text-amber-950"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="inline-flex items-center gap-1.5 font-black">
                            <Receipt
                              size={14}
                              className={
                                item.accountingStatus === "BILLED"
                                  ? "text-blue-600"
                                  : "text-amber-600"
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

                        {item.accountingStatus === "BILLED" && (
                          <div className="text-[11px] text-blue-800 font-semibold shrink-0">
                            ผู้วางบิล: <b>{item.accountingAckByName || "-"}</b>
                            {item.accountingAckAt
                              ? ` • ${formatThaiDate(item.accountingAckAt)}`
                              : ""}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Summary Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          totalPhotos > 0
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <Camera size={13} />
                        <span>รูปภาพก่อน/หลังส่งมอบ: {totalPhotos} รูป</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <FileSignature size={13} />
                        <span>
                          {item.sigSenderUrl && item.sigReceiverUrl
                            ? "เซ็นครบทั้งเซอร์วิส & ลูกค้า"
                            : "มีลายเซ็นส่งมอบแล้ว"}
                        </span>
                      </span>

                      {item.sender && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-[#ff2301] border border-red-200/70">
                          เซลล์ผู้ประสานงาน: <b>{item.sender}</b>
                        </span>
                      )}

                      {isAcked && item.salesAckNote && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50/70 text-emerald-900 border border-emerald-200">
                          หมายเหตุเซลล์: {item.salesAckNote}
                        </span>
                      )}

                      {isAcked && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            item.accountingStatus === "BILLED"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {item.accountingStatus === "BILLED"
                            ? `ฝ่ายบัญชีวางบิลแล้ว${
                                item.accountingInvoiceNo
                                  ? ` (${item.accountingInvoiceNo})`
                                  : ""
                              }`
                            : "ส่งต่อฝ่ายบัญชีแล้ว • รอบัญชีวางบิล"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setAckNote(item.salesAckNote || "");
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs"
                    >
                      <Eye size={15} className="text-[#ff2301]" />
                      <span>เปิดดูข้อมูล &amp; ลายเซ็น</span>
                    </button>

                    <Link
                      href={`/repair-deliveries/${item.id}/pdf`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                    >
                      <Printer size={14} className="text-[#ff2301]" />
                      <span>ดูใบส่งมอบงาน (PDF)</span>
                    </Link>

                    {!isAcked ? (
                      <button
                        type="button"
                        disabled={isAckingId === item.id}
                        onClick={() => handleAcknowledge(item, "")}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
                      >
                        {isAckingId === item.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <ClipboardCheck size={15} />
                        )}
                        <span>กดรับทราบ &amp; ส่งต่อฝ่ายบัญชี</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        <Check size={14} />
                        <span>
                          ส่งต่อบัญชีเมื่อ {formatThaiDate(item.salesAckAt)}
                        </span>
                      </span>
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
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                      {selectedItem.deliveryNumber}
                    </span>
                    {selectedItem.quotationNo && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
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
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              {/* 1. Customer & Job Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} className="text-[#ff2301]" />
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
                      <span className="text-slate-400">ผู้ติดต่อ/ผู้รับมอบ:</span>{" "}
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

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench size={15} className="text-[#ff2301]" />
                    <span>ข้อมูลเอกสาร &amp; ผู้ปฏิบัติงาน</span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <div>
                      <span className="text-slate-400">ชื่องาน / โครงการ:</span>{" "}
                      <b className="text-slate-900">
                        {selectedItem.jobName || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">เลขที่ใบเสนอราคา:</span>{" "}
                      <b className="font-mono text-blue-700">
                        {selectedItem.quotationNo || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">ช่าง/วิศวกรผู้ส่งมอบ:</span>{" "}
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
                      <span className="text-slate-400">เซลล์ผู้ประสานงาน:</span>{" "}
                      <b>{selectedItem.sender || "-"}</b>{" "}
                      {selectedItem.senderPhone
                        ? `(${selectedItem.senderPhone})`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Work Scope & Comments */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  ขอบเขตงานบริการและหมายเหตุการส่งมอบ
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {getWorkTypesList(selectedItem).map((w, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-red-50/40 border border-red-200/70"
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

              {/* 3. Before & After Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-amber-600" />
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
                    <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      ไม่มีรูปถ่ายก่อนปฏิบัติงาน
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-emerald-600" />
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
                    <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      ไม่มีรูปถ่ายหลังปฏิบัติงาน
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Both Digital Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-red-200/80 p-4 space-y-2">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSignature size={15} className="text-[#ff2301]" />
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
                  <div className="text-xs text-slate-600 pt-1">
                    ลงชื่อตัวบรรจง:{" "}
                    <b className="text-slate-900">
                      {selectedItem.nameSender ||
                        selectedItem.technician ||
                        "-"}
                    </b>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 space-y-2">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSignature size={15} className="text-emerald-600" />
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
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>
                      ลงชื่อตัวบรรจง:{" "}
                      <b className="text-slate-900">
                        {selectedItem.nameReceiver ||
                          selectedItem.customer ||
                          "-"}
                      </b>
                    </span>
                    {selectedItem.customerPosition && (
                      <span>ตำแหน่ง: {selectedItem.customerPosition}</span>
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
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#ff2301] focus:ring-2 focus:ring-red-500/10"
                />
                {selectedItem.salesAckStatus === "ACKNOWLEDGED" && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
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
                          ? "text-blue-600"
                          : "text-amber-600"
                      }
                    />
                    <span>สถานะการวางบิล / ออกใบแจ้งหนี้จากฝ่ายบัญชี</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white rounded-xl p-3.5 border border-blue-200/80">
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

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link
                  href={`/repair-deliveries/${selectedItem.id}/pdf`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
                >
                  <Printer size={15} className="text-[#ff2301]" />
                  <span>พิมพ์ใบส่งมอบงาน (PDF A4)</span>
                </Link>

                <Link
                  href={`/repair-deliveries/${selectedItem.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
                >
                  <ExternalLink size={14} />
                  <span>เปิดดูหน้าใบส่งมอบงานเต็ม</span>
                </Link>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  disabled={isAckingId === selectedItem.id}
                  onClick={() => handleAcknowledge(selectedItem, ackNote)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/25 transition-all disabled:opacity-50"
                >
                  {isAckingId === selectedItem.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ClipboardCheck size={15} />
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

