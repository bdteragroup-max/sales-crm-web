"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  Building2,
  User,
  Phone,
  MapPin,
  Cpu,
  Camera,
  FileSignature,
  Package,
  Printer,
  ExternalLink,
  Eye,
  X,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  Calendar,
} from "lucide-react";

const ONSITE_RESULT_LABELS: Record<string, string> = {
  RESOLVED_ONSITE: "แก้ไขสำเร็จหน้างาน ระบบทำงานปกติ",
  BRING_BACK_REPAIR: "ต้องนำเครื่องกลับเข้าศูนย์บริการเพื่อซ่อม",
  WAITING_PARTS_QUOTE: "รอเสนอราคาอะไหล่ / รออะไหล่เข้าเปลี่ยน",
  FOLLOW_UP_NEEDED: "รอติดตามอาการ / ลูกค้าปรับปรุงระบบหน้างาน",
};

interface ServiceHandoversClientProps {
  initialHandovers: any[];
  currentUser: any;
  initialCaseId?: string | null;
  initialTab?: "pending" | "completed" | "all";
}

export default function ServiceHandoversClient({
  initialHandovers = [],
  currentUser,
  initialCaseId = null,
  initialTab = "pending",
}: ServiceHandoversClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "all">(
    initialTab
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialCaseId && initialHandovers.length > 0) {
      const found = initialHandovers.find((h) => h.id === initialCaseId);
      if (found) {
        setSelectedItem(found);
        if (found.linkedQuotationId) {
          setActiveTab("all");
        }
      }
    }
  }, [initialCaseId, initialHandovers]);

  const pendingItems = useMemo(
    () => initialHandovers.filter((h) => !h.linkedQuotationId),
    [initialHandovers]
  );
  const completedItems = useMemo(
    () => initialHandovers.filter((h) => Boolean(h.linkedQuotationId)),
    [initialHandovers]
  );

  const filteredItems = useMemo(() => {
    const base =
      activeTab === "pending"
        ? pendingItems
        : activeTab === "completed"
        ? completedItems
        : initialHandovers;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return base;

    return base.filter((item) => {
      const fields = [
        item.caseNumber,
        item.companyName,
        item.contactName,
        item.contactPhone,
        item.inverterModel,
        item.serialNumber,
        item.reportedIssue,
        item.assignedSalesName,
        item.nameTechnician,
        item.responsibleName,
        item.linkedQuotationNo,
        item.linkedDeliveryNo,
      ];
      return fields.some((f) => String(f || "").toLowerCase().includes(q));
    });
  }, [activeTab, pendingItems, completedItems, initialHandovers, searchTerm]);

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

  const handleCopySummary = (item: any) => {
    const partsArr = Array.isArray(item.partsUsed) ? item.partsUsed : [];
    const partsStr =
      partsArr.length > 0
        ? partsArr
            .map(
              (p: any, idx: number) =>
                `${idx + 1}. ${p.name || "-"} จำนวน ${p.qty || 1} ${
                  p.unit || "ชิ้น"
                }${p.remark ? ` (${p.remark})` : ""}`
            )
            .join("\n")
        : "ไม่มีรายการอะไหล่";

    const text = [
      `เลขเคสเซอร์วิส: ${item.caseNumber}`,
      `ลูกค้า: ${item.companyName} (${item.contactName || "-"} โทร. ${
        item.contactPhone || "-"
      })`,
      `รุ่นเครื่อง: ${item.inverterModel || "-"}${
        item.serialNumber ? ` (S/N: ${item.serialNumber})` : ""
      }`,
      `อาการที่แจ้ง: ${item.reportedIssue || "-"}`,
      `สาเหตุที่ตรวจพบ: ${item.analyzedCause || "-"}`,
      `การแก้ไข: ${item.recommendedSolution || "-"}`,
      `รายการอะไหล่:\n${partsStr}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header ── */}
      <header className="shrink-0 border-b border-slate-200/80 px-6 md:px-8 py-4 md:py-5 bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d81900] flex items-center justify-center shadow-md shadow-red-600/20 text-white shrink-0">
            <Wrench size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                งานส่งต่อจากเซอร์วิสเพื่อเปิดใบเสนอราคา
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              เปิดดูรายละเอียดงานซ่อม อะไหล่ รูปถ่ายหน้างาน และลายเซ็นที่ส่งมาจากทีมเซอร์วิส พร้อมกดสร้างใบเสนอราคาและส่งไปใบส่งมอบงานอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <Link
            href="/service/calls"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <Wrench size={15} className="text-slate-500" />
            <span>ดูตารางเคสเซอร์วิสทั้งหมด</span>
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

      {/* ── Symmetrical 3-Card KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 p-4 md:px-8 md:py-4 bg-slate-50/70 border-b border-slate-200/80">
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-amber-700 tracking-tight">
              รอดำเนินการทำใบเสนอราคา
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {pendingItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Quotation
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-emerald-700 tracking-tight">
              เปิดใบเสนอราคา &amp; ส่งใบส่งมอบงานแล้ว
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {completedItems.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Completed &amp; Synced to Delivery Note
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-600 tracking-tight">
              งานส่งต่อจากเซอร์วิสทั้งหมด
            </p>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {initialHandovers.length.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Assigned Handovers
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-[#ff2301] border border-red-200/70 flex items-center justify-center shrink-0">
            <FileSignature size={20} />
          </div>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="shrink-0 px-4 md:px-8 py-3 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
            <span>รอเปิดใบเสนอราคา</span>
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
            onClick={() => setActiveTab("completed")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>เปิดใบเสนอราคาแล้ว</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "completed"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {completedItems.length}
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
              {initialHandovers.length}
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
            placeholder="ค้นหาเลขเคส, ชื่อบริษัท, รุ่นเครื่อง, ชื่อเซลล์..."
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
              <Wrench size={26} />
            </div>
            <h3 className="text-base font-black text-slate-800">
              ไม่พบรายการงานที่ส่งต่อจากเซอร์วิส
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              เมื่อทีมเซอร์วิสปิดงานหน้างานและเลือกส่งต่อให้เซลล์ รายการจะปรากฏในหน้านี้พร้อมข้อมูลอะไหล่ รูปถ่ายหน้างาน และลายเซ็นลูกค้าทันที
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = Boolean(item.linkedQuotationId);
            const partsArr = Array.isArray(item.partsUsed) ? item.partsUsed : [];
            const photosBeforeArr = Array.isArray(item.photosBefore)
              ? item.photosBefore
              : [];
            const photosAfterArr = Array.isArray(item.photosAfter)
              ? item.photosAfter
              : [];
            const totalPhotos = photosBeforeArr.length + photosAfterArr.length;
            const hasSignatures = Boolean(
              item.sigTechnicianUrl || item.sigCustomerUrl
            );
            const techName =
              item.nameTechnician || item.responsibleName || "ทีมเซอร์วิส";

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md p-5 ${
                  isCompleted
                    ? "border-emerald-200/90"
                    : "border-slate-200/90 hover:border-red-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Info */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                        {item.caseNumber}
                      </span>

                      {item.internalCompany && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          {item.internalCompany}
                        </span>
                      )}

                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} />
                          <span>
                            เปิดใบเสนอราคาแล้ว ({item.linkedQuotationNo || "QT"})
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>รอเซลล์เปิดใบเสนอราคา</span>
                        </span>
                      )}

                      {item.onsiteResult && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {ONSITE_RESULT_LABELS[item.onsiteResult] ||
                            item.onsiteResult}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 ml-auto lg:ml-0">
                        <Calendar size={12} />
                        ส่งต่อเมื่อ:{" "}
                        {formatThaiDate(item.assignedSalesAt || item.updatedAt)}
                      </span>
                    </div>

                    {/* Customer & Inverter Info */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        <Building2 size={18} className="text-[#ff2301] shrink-0" />
                        <span>{item.companyName}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <User size={13} className="text-slate-400" />
                          ผู้ติดต่อ: {item.contactName || "-"}
                        </span>
                        {item.contactPhone && (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Phone size={13} className="text-slate-400" />
                            {item.contactPhone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Cpu size={13} className="text-[#ff2301]" />
                          รุ่น: {item.inverterModel || "-"}
                          {item.serialNumber ? ` (S/N: ${item.serialNumber})` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Issue, Solution & Parts Preview Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/70 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-700">
                          อาการที่แจ้ง / สาเหตุ:
                        </div>
                        <p className="text-slate-600 line-clamp-2">
                          {item.reportedIssue || "-"}
                          {item.analyzedCause
                            ? ` • สาเหตุ: ${item.analyzedCause}`
                            : ""}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-slate-700">
                          การแก้ไขหน้างาน / ข้อเสนอแนะช่าง:
                        </div>
                        <p className="text-slate-600 line-clamp-2">
                          {item.recommendedSolution ||
                            item.onsiteResultNote ||
                            "-"}
                        </p>
                      </div>
                    </div>

                    {/* Parts + Photos + Signatures + People Summary Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          partsArr.length > 0
                            ? "bg-orange-50 text-orange-800 border-orange-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <Package size={13} />
                        <span>อะไหล่ที่ใช้/เสนอเปลี่ยน: {partsArr.length} รายการ</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          totalPhotos > 0
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <Camera size={13} />
                        <span>รูปหน้างาน (Before/After): {totalPhotos} รูป</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          hasSignatures
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <FileSignature size={13} />
                        <span>
                          {hasSignatures
                            ? "มีลายเซ็นช่าง & ลูกค้าพร้อมส่งต่อ"
                            : "ยังไม่มีลายเซ็นดิจิทัล"}
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                        ช่างผู้ส่งงาน: <b>{techName}</b>
                      </span>

                      {item.assignedSalesName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-[#ff2301] border border-red-200/70">
                          เซลล์ผู้รับเรื่อง: <b>{item.assignedSalesName}</b>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Action Column */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* 1. Open Full Service Handover Detail Modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs"
                    >
                      <Eye size={15} className="text-[#ff2301]" />
                      <span>เปิดดูข้อมูลจากเซอร์วิส</span>
                    </button>

                    {/* 2. Primary Button: Proceed to Create Quotation */}
                    {!isCompleted ? (
                      <Link
                        href={`/sales?serviceCallId=${item.id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/20 transition-all"
                      >
                        <Sparkles size={15} />
                        <span>ดำเนินการทำใบเสนอราคา</span>
                        <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <div className="flex flex-wrap lg:flex-col items-stretch gap-2 w-full sm:w-auto">
                        <Link
                          href={`/sales?editId=${item.linkedQuotationId}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all"
                        >
                          <FileText size={14} />
                          <span>ใบเสนอราคา: {item.linkedQuotationNo}</span>
                        </Link>
                        {item.linkedDeliveryId && (
                          <Link
                            href={`/repair-deliveries/${item.linkedDeliveryId}`}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                          >
                            <FileSignature size={14} />
                            <span>
                              ใบส่งมอบงาน: {item.linkedDeliveryNo || "เปิดดู"}
                            </span>
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Full Service Handover Detail Modal (เมื่อเซลล์กด "เปิดดูข้อมูลจากเซอร์วิส") ── */}
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
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      ข้อมูลส่งต่อจากทีมเซอร์วิส
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-red-50 text-[#ff2301] border border-red-200">
                      {selectedItem.caseNumber}
                    </span>
                    {selectedItem.internalCompany && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                        {selectedItem.internalCompany}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    ลูกค้า: <b className="text-slate-800">{selectedItem.companyName}</b> • ช่างผู้ส่งงาน:{" "}
                    <b className="text-slate-800">
                      {selectedItem.nameTechnician ||
                        selectedItem.responsibleName ||
                        "-"}
                    </b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopySummary(selectedItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all"
                >
                  {copiedId === selectedItem.id ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกข้อมูลแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>คัดลอกข้อมูลไปวาง</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              {/* 1. Customer & Device Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} className="text-[#ff2301]" />
                    <span>ข้อมูลลูกค้า &amp; สถานที่หน้างาน</span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <div>
                      <span className="text-slate-400">บริษัทลูกค้า:</span>{" "}
                      <b className="text-slate-900">{selectedItem.companyName}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">ผู้ติดต่อ:</span>{" "}
                      <b>{selectedItem.contactName || "-"}</b>{" "}
                      {selectedItem.customerPosition
                        ? `(${selectedItem.customerPosition})`
                        : ""}
                    </div>
                    <div>
                      <span className="text-slate-400">เบอร์โทรศัพท์:</span>{" "}
                      <b>{selectedItem.contactPhone || "-"}</b>
                    </div>
                    {selectedItem.siteAddress && (
                      <div className="flex items-start gap-1 pt-1 text-slate-600">
                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>{selectedItem.siteAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={15} className="text-[#ff2301]" />
                    <span>ข้อมูลเครื่อง &amp; สรุปผลหน้างาน</span>
                  </div>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <div>
                      <span className="text-slate-400">รุ่น Inverter:</span>{" "}
                      <b className="text-slate-900">
                        {selectedItem.inverterModel || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">Serial Number (S/N):</span>{" "}
                      <b className="font-mono">
                        {selectedItem.serialNumber || "-"}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">ผลการเข้าหน้างาน:</span>{" "}
                      <span className="inline-block px-2 py-0.5 rounded bg-red-50 text-[#ff2301] font-bold">
                        {ONSITE_RESULT_LABELS[selectedItem.onsiteResult] ||
                          selectedItem.onsiteResult ||
                          "เข้าตรวจสอบหน้างานแล้ว"}
                      </span>
                    </div>
                    {selectedItem.onsiteResultNote && (
                      <div>
                        <span className="text-slate-400">หมายเหตุหน้างาน:</span>{" "}
                        <span>{selectedItem.onsiteResultNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Technical Details (Issue, Cause, Solution) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={15} className="text-[#ff2301]" />
                  <span>รายละเอียดอาการเสีย การตรวจเช็ค และการแก้ไขของช่าง</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="font-bold text-slate-500 mb-1">
                      1. อาการที่ลูกค้าแจ้ง
                    </div>
                    <p className="text-slate-900 whitespace-pre-wrap font-medium">
                      {selectedItem.reportedIssue || "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="font-bold text-slate-500 mb-1">
                      2. สาเหตุที่วิเคราะห์ได้
                    </div>
                    <p className="text-slate-900 whitespace-pre-wrap font-medium">
                      {selectedItem.analyzedCause || "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="font-bold text-slate-500 mb-1">
                      3. การแก้ไข / ข้อเสนอแนะ
                    </div>
                    <p className="text-slate-900 whitespace-pre-wrap font-medium">
                      {selectedItem.recommendedSolution || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Parts Used / Recommended Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={15} className="text-[#ff2301]" />
                    <span>
                      รายการอะไหล่ที่ใช้ / เสนอเปลี่ยน (
                      {Array.isArray(selectedItem.partsUsed)
                        ? selectedItem.partsUsed.length
                        : 0}{" "}
                      รายการ)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    ข้อมูลนี้จะถูกดึงไปใส่ในรายละเอียดใบเสนอราคาและใบส่งมอบงานอัตโนมัติ
                  </span>
                </div>

                {Array.isArray(selectedItem.partsUsed) &&
                selectedItem.partsUsed.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">รายการอะไหล่ / อุปกรณ์</th>
                          <th className="py-2.5 px-3 w-24 text-center">จำนวน</th>
                          <th className="py-2.5 px-3 w-24 text-center">หน่วย</th>
                          <th className="py-2.5 px-3">หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItem.partsUsed.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    ไม่ได้ระบุรายการอะไหล่ในเคสนี้
                  </div>
                )}
              </div>

              {/* 4. Before & After Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-amber-600" />
                    <span>
                      รูปถ่ายก่อนดำเนินการ (Before) (
                      {Array.isArray(selectedItem.photosBefore)
                        ? selectedItem.photosBefore.length
                        : 0}{" "}
                      รูป)
                    </span>
                  </div>
                  {Array.isArray(selectedItem.photosBefore) &&
                  selectedItem.photosBefore.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
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
                      ไม่มีรูปถ่ายก่อนดำเนินการ
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-emerald-600" />
                    <span>
                      รูปถ่ายหลังดำเนินการ (After) (
                      {Array.isArray(selectedItem.photosAfter)
                        ? selectedItem.photosAfter.length
                        : 0}{" "}
                      รูป)
                    </span>
                  </div>
                  {Array.isArray(selectedItem.photosAfter) &&
                  selectedItem.photosAfter.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
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
                      ไม่มีรูปถ่ายหลังดำเนินการ
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Technician & Customer Digital Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSignature size={15} className="text-[#ff2301]" />
                    <span>ลายเซ็นช่าง / ผู้ให้บริการหน้างาน</span>
                  </div>
                  <div className="h-28 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                    {selectedItem.sigTechnicianUrl ? (
                      <img
                        src={selectedItem.sigTechnicianUrl}
                        alt="Technician Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        ยังไม่มีลายเซ็นช่าง
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>
                      ลงชื่อ:{" "}
                      <b className="text-slate-900">
                        {selectedItem.nameTechnician ||
                          selectedItem.responsibleName ||
                          "-"}
                      </b>
                    </span>
                    {selectedItem.technicianPhone && (
                      <span>โทร: {selectedItem.technicianPhone}</span>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileSignature size={15} className="text-emerald-600" />
                    <span>ลายเซ็นลูกค้า / ผู้รับบริการ</span>
                  </div>
                  <div className="h-28 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                    {selectedItem.sigCustomerUrl ? (
                      <img
                        src={selectedItem.sigCustomerUrl}
                        alt="Customer Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        ยังไม่มีลายเซ็นลูกค้า
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>
                      ลงชื่อ:{" "}
                      <b className="text-slate-900">
                        {selectedItem.nameCustomer ||
                          selectedItem.contactName ||
                          "-"}
                      </b>
                    </span>
                    {selectedItem.customerPosition && (
                      <span>ตำแหน่ง: {selectedItem.customerPosition}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link
                  href={`/service/calls/${selectedItem.id}/pdf`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
                >
                  <Printer size={15} className="text-[#ff2301]" />
                  <span>ดูใบรายงานเซอร์วิส (PDF)</span>
                </Link>

                <Link
                  href={`/service/calls/${selectedItem.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
                >
                  <ExternalLink size={14} />
                  <span>เปิดหน้าเคสเซอร์วิส</span>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                {selectedItem.linkedDeliveryId && (
                  <Link
                    href={`/repair-deliveries/${selectedItem.linkedDeliveryId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <FileSignature size={15} />
                    <span>
                      เปิดใบส่งมอบงาน ({selectedItem.linkedDeliveryNo || "DN"})
                    </span>
                  </Link>
                )}

                <Link
                  href={`/sales?serviceCallId=${selectedItem.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2301] to-[#e01f01] hover:from-[#e01f01] hover:to-[#c81900] text-white text-xs font-black shadow-md shadow-red-500/25 transition-all"
                >
                  <Sparkles size={15} />
                  <span>
                    {selectedItem.linkedQuotationNo
                      ? `สร้างใบเสนอราคาเพิ่ม (มี ${selectedItem.linkedQuotationNo} แล้ว)`
                      : "ดำเนินการทำใบเสนอราคาจากงานนี้"}
                  </span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for full-screen photo inspection */}
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

