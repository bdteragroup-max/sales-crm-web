/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  RotateCcw,
  Plus,
  Search,
  FileText,
  Printer,
  Trash2,
  Pencil,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  LayoutGrid,
  ListFilter,
  Eye,
  Package,
  Phone,
  Sparkles,
} from "lucide-react";
import { deleteGoodsReturn } from "@/app/actions/goodsReturns";
import {
  RETURN_TYPES,
  INTERNAL_COMPANIES,
  getReturnTypeMeta,
  getInternalCompanyMeta,
  parseGoodsReturnData,
} from "./types";
import GoodsReturnPrintPaper from "./components/GoodsReturnPrintPaper";

interface Props {
  initialData: any[];
  currentUser?: any;
  companies?: any[];
  jobs?: any[];
  quotations?: any[];
}

export default function StoreReturnsClient({
  initialData,
}: Props) {
  const [data, setData] = useState<any[]>(initialData || []);

  // UI state
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Selected item for details/print preview modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [previewMode, setPreviewMode] = useState<"half" | "full">("half");

  const formatThaiDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "Completed":
      case "เสร็จสิ้น":
        return {
          label: "รับคืนเรียบร้อย",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          dotColor: "bg-emerald-500",
          icon: CheckCircle2,
        };
      case "Draft":
      default:
        return {
          label: "แบบร่าง / รอดำเนินการ",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
          dotColor: "bg-amber-500",
          icon: Clock,
        };
    }
  };

  // Delete Action
  const handleDelete = async (doc: any) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบเอกสาร?",
      text: `ต้องการลบใบส่งคืนเลขที่ "${doc.documentNo}" หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff2301",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsDeleting(doc.id);
    try {
      const res = await deleteGoodsReturn(doc.id);
      if (res.success) {
        setData((prev) => prev.filter((d) => d.id !== doc.id));
        if (selectedDoc?.id === doc.id) {
          setSelectedDoc(null);
        }
        await Swal.fire({
          icon: "success",
          title: "ลบเอกสารสำเร็จ",
          text: `ลบเอกสาร ${doc.documentNo} เรียบร้อยแล้ว`,
          timer: 1100,
          showConfirmButton: false,
        });
      } else {
        throw new Error(res.error || "Failed to delete document");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถลบเอกสารได้",
        confirmButtonColor: "#ff2301",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const changeSpec = data.filter((d) => d.returnType === "CHANGE_SPEC").length;
    const toWarehouse = data.filter((d) => d.returnType === "RETURN_TO_WAREHOUSE").length;
    const defectRepair = data.filter(
      (d) => d.returnType === "DEFECT" || d.returnType === "REPAIR" || d.returnType === "WRONG_MODEL"
    ).length;
    const draft = data.filter((d) => d.status === "Draft" || !d.status).length;
    const completed = data.filter((d) => d.status === "Completed").length;

    return { total, changeSpec, toWarehouse, defectRepair, draft, completed };
  }, [data]);

  // Filtered List
  const filtered = useMemo(() => {
    return data.filter((d: any) => {
      // 1. Tab filter
      if (activeTab === "CHANGE_SPEC" && d.returnType !== "CHANGE_SPEC") return false;
      if (activeTab === "RETURN_TO_WAREHOUSE" && d.returnType !== "RETURN_TO_WAREHOUSE") return false;
      if (activeTab === "WRONG_MODEL" && d.returnType !== "WRONG_MODEL") return false;
      if (
        activeTab === "DEFECT_REPAIR" &&
        d.returnType !== "DEFECT" &&
        d.returnType !== "REPAIR" &&
        d.returnType !== "SUPPLIER"
      )
        return false;
      if (activeTab === "DRAFT" && d.status !== "Draft") return false;
      if (activeTab === "COMPLETED" && d.status !== "Completed") return false;

      // 2. Return Type dropdown filter
      if (typeFilter !== "all" && d.returnType !== typeFilter) return false;

      // 3. Status dropdown filter
      if (statusFilter !== "all" && d.status !== statusFilter) return false;

      // 4. Company dropdown filter (TG / TP / TE)
      if (companyFilter !== "all") {
        const { internalCompany } = parseGoodsReturnData(d);
        if (internalCompany !== companyFilter) return false;
      }

      // 4. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const docNo = (d.documentNo || "").toLowerCase();
        const customer = (d.customer || "").toLowerCase();
        const ref = (d.reference || "").toLowerCase();
        const sender = (d.senderName || "").toLowerCase();
        const receiver = (d.receiverName || "").toLowerCase();

        // Check inside items
        const { items, reason } = parseGoodsReturnData(d);
        const reasonMatch = (reason || "").toLowerCase().includes(q);
        const itemMatch = items.some(
          (it) =>
            (it.type || "").toLowerCase().includes(q) ||
            (it.model || "").toLowerCase().includes(q) ||
            (it.brand || "").toLowerCase().includes(q) ||
            (it.serialNumber || "").toLowerCase().includes(q) ||
            (it.remark || "").toLowerCase().includes(q)
        );

        if (
          !docNo.includes(q) &&
          !customer.includes(q) &&
          !ref.includes(q) &&
          !sender.includes(q) &&
          !receiver.includes(q) &&
          !reasonMatch &&
          !itemMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, activeTab, typeFilter, statusFilter, companyFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Page Header ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#ff2301] via-red-500 to-gray-900" />

        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-[#ff2301] shadow-sm shrink-0 border border-red-100">
            <RotateCcw className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                ใบส่งคืนสินค้า (Goods Return Notes)
              </h1>
              <span className="text-xs font-bold text-[#ff2301] bg-red-50 px-3 py-1 rounded-full border border-red-200/80">
                ระบบคลังสินค้า & สโตร์
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              จัดการเอกสารส่งคืนสินค้า คืนสโตร์ เปลี่ยนสเปคจากซับคอนแทรคเตอร์ตามแบบฟอร์ม FO-EN-03
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link
            href="/store/returns/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-sm font-bold shadow-md shadow-red-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างใบส่งคืนสินค้า</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total */}
        <div
          onClick={() => setActiveTab("ALL")}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${
            activeTab === "ALL"
              ? "border-[#ff2301] ring-2 ring-red-500/10 shadow-sm"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-semibold">ทั้งหมด</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">{kpis.total}</div>
          <div className="text-[11px] text-gray-400 mt-1">ใบส่งคืนทั้งหมดในระบบ</div>
        </div>

        {/* Card 2: Change Spec (Featured for Subcontractors) */}
        <div
          onClick={() => setActiveTab("CHANGE_SPEC")}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${
            activeTab === "CHANGE_SPEC"
              ? "border-blue-500 ring-2 ring-blue-500/10 shadow-sm bg-blue-50/20"
              : "border-gray-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 mb-2">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> ซับเปลี่ยนสเปค
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900">{kpis.changeSpec}</div>
          <div className="text-[11px] text-blue-600/80 mt-1">เปลี่ยนสเปคสินค้า</div>
        </div>

        {/* Card 3: Return to Warehouse */}
        <div
          onClick={() => setActiveTab("RETURN_TO_WAREHOUSE")}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${
            activeTab === "RETURN_TO_WAREHOUSE"
              ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm"
              : "border-gray-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-2">
            <span className="font-bold">ส่งคืนคลังสินค้า</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900">{kpis.toWarehouse}</div>
          <div className="text-[11px] text-emerald-600 mt-1">คืนสโตร์กลาง</div>
        </div>

        {/* Card 4: Drafts */}
        <div
          onClick={() => setActiveTab("DRAFT")}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${
            activeTab === "DRAFT"
              ? "border-amber-500 ring-2 ring-amber-500/10 shadow-sm"
              : "border-gray-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 mb-2">
            <span className="font-bold">แบบร่าง / รอรับคืน</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900">{kpis.draft}</div>
          <div className="text-[11px] text-amber-600 mt-1">ยังไม่ตรวจรับ</div>
        </div>

        {/* Card 5: Completed */}
        <div
          onClick={() => setActiveTab("COMPLETED")}
          className={`bg-white rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all ${
            activeTab === "COMPLETED"
              ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm"
              : "border-gray-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-2">
            <span className="font-bold">เสร็จสมบูรณ์</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900">{kpis.completed}</div>
          <div className="text-[11px] text-emerald-600 mt-1">รับเข้าคลังเรียบร้อย</div>
        </div>
      </div>

      {/* ── Filters & Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold border-b border-gray-100">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ทั้งหมด ({kpis.total})
          </button>
          <button
            onClick={() => setActiveTab("CHANGE_SPEC")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "CHANGE_SPEC"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-700 hover:bg-blue-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>เปลี่ยนสเปคสินค้า ({kpis.changeSpec})</span>
          </button>
          <button
            onClick={() => setActiveTab("RETURN_TO_WAREHOUSE")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "RETURN_TO_WAREHOUSE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ส่งคืนคลัง ({kpis.toWarehouse})
          </button>
          <button
            onClick={() => setActiveTab("WRONG_MODEL")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "WRONG_MODEL"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ผิดรุ่น / ไม่ตรงสเปค
          </button>
          <button
            onClick={() => setActiveTab("DEFECT_REPAIR")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "DEFECT_REPAIR"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ของเสีย / ส่งซ่อม
          </button>
          <button
            onClick={() => setActiveTab("DRAFT")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "DRAFT"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            แบบร่าง ({kpis.draft})
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            รับคืนแล้ว ({kpis.completed})
          </button>
        </div>

        {/* Search & Select Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่เอกสาร, ชื่อซับ/คู่ค้า, รุ่น, S/N, หรือสาเหตุการส่งคืน..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#ff2301] focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-56 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 focus:bg-white outline-none"
          >
            <option value="all">ประเภทการส่งคืนทั้งหมด</option>
            {RETURN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-36 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 focus:bg-white outline-none"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="Draft">แบบร่าง (Draft)</option>
            <option value="Completed">รับคืนแล้ว (Completed)</option>
          </select>

          {/* Company Filter (TG / TP / TE) */}
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full md:w-40 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 focus:bg-white outline-none"
          >
            <option value="all">ทุกบริษัท (TG/TP/TE)</option>
            {INTERNAL_COMPANIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "cards" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
              title="มุมมองตาราง"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Results List ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mx-auto">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">ไม่พบเอกสารส่งคืนสินค้า</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {search || typeFilter !== "all" || statusFilter !== "all"
              ? "ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง"
              : "ยังไม่มีรายการใบส่งคืนสินค้าในหมวดหมู่นี้ เริ่มต้นสร้างใบส่งคืนฉบับแรกได้เลย"}
          </p>
          <Link
            href="/store/returns/new"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff2301] text-white text-xs font-bold shadow-md hover:bg-[#e01f01] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างใบส่งคืนสินค้า</span>
          </Link>
        </div>
      ) : viewMode === "cards" ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc: any) => {
            const typeMeta = getReturnTypeMeta(doc.returnType);
            const statusMeta = getStatusMeta(doc.status);
            const { items, reason, phoneNumber, internalCompany } = parseGoodsReturnData(doc);
            const compMeta = getInternalCompanyMeta(internalCompany);
            const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl p-5 border border-gray-200/90 hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Doc Number, Company Badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-gray-900 group-hover:text-[#ff2301] transition-colors">
                        {doc.documentNo}
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                          internalCompany === "TP"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : internalCompany === "TE"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-red-50 text-[#ff2301] border-red-200"
                        }`}
                        title={compMeta.fullName}
                      >
                        {internalCompany}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border ${statusMeta.badgeClass} flex items-center gap-1`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Return Type Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border ${typeMeta.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${typeMeta.dotColor}`} />
                      {typeMeta.label}
                    </span>
                  </div>

                  {/* Company / Subcontractor */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-black text-gray-900 line-clamp-1">
                          {doc.customer || doc.company?.companyName || "ไม่ระบุบริษัท"}
                        </div>
                        {phoneNumber && (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason (อาการเสีย / สาเหตุการคืน) */}
                  {reason && (
                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                      <span className="text-gray-400 block text-[10px] font-bold">สาเหตุการคืน:</span>
                      <span className="font-semibold text-gray-800 line-clamp-2">{reason}</span>
                    </div>
                  )}

                  {/* Items summary */}
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">รายการสินค้า:</span>
                      <span className="font-bold text-gray-900">
                        {items.length} รายการ ({totalQty} ชิ้น/ตัว)
                      </span>
                    </div>
                    {items.slice(0, 2).map((it, idx) => (
                      <div key={idx} className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                        <span className="text-gray-300">•</span>
                        <span className="font-semibold text-gray-700">{it.type || it.brand}:</span>
                        <span>{it.model}</span>
                        {it.size && <span className="text-gray-400">({it.size})</span>}
                        <span className="text-red-600 font-bold ml-auto shrink-0">x{it.quantity}</span>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <div className="text-[10px] text-gray-400 italic">
                        และอีก {items.length - 2} รายการ...
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Date & Actions */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatThaiDate(doc.date || doc.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      title="ดูตัวอย่าง / พิมพ์"
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/store/returns/${doc.id}/print`}
                      title="พิมพ์เอกสาร FO-EN-03"
                      className="p-1.5 text-gray-600 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/store/returns/${doc.id}/edit`}
                      title="แก้ไขข้อมูล"
                      className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={isDeleting === doc.id}
                      title="ลบเอกสาร"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">เลขที่เอกสาร</th>
                  <th className="py-3 px-4">วันที่</th>
                  <th className="py-3 px-4">บริษัท / ซับคอนแทรคเตอร์</th>
                  <th className="py-3 px-4">ประเภทการส่งคืน</th>
                  <th className="py-3 px-4">สาเหตุการคืน</th>
                  <th className="py-3 px-4 text-center">จำนวนรายการ</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((doc: any) => {
                  const typeMeta = getReturnTypeMeta(doc.returnType);
                  const statusMeta = getStatusMeta(doc.status);
                  const { items, reason, internalCompany } = parseGoodsReturnData(doc);
                  const compMeta = getInternalCompanyMeta(internalCompany);
                  const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{doc.documentNo}</span>
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
                              internalCompany === "TP"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : internalCompany === "TE"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-red-50 text-[#ff2301] border-red-200"
                            }`}
                            title={compMeta.fullName}
                          >
                            {internalCompany}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {formatThaiDate(doc.date || doc.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">
                          {doc.customer || doc.company?.companyName || "—"}
                        </div>
                        {doc.reference && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            อ้างอิง: {doc.reference}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${typeMeta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${typeMeta.dotColor}`} />
                          {typeMeta.shortLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-gray-700">
                        {reason || "—"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-gray-800">
                        {items.length} รายการ ({totalQty})
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            title="ดูตัวอย่าง"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/store/returns/${doc.id}/print`}
                            title="พิมพ์เอกสาร"
                            className="p-1.5 text-gray-600 hover:text-[#ff2301] hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/store/returns/${doc.id}/edit`}
                            title="แก้ไข"
                            className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={isDeleting === doc.id}
                            title="ลบ"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Document Preview Modal ── */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-[#ff2301]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <span>ตัวอย่างใบส่งคืนสินค้า: {selectedDoc.documentNo}</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    แบบฟอร์มส่งคืนสินค้าคลังสินค้า TERA GROUP (FO-EN-03)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Print Mode Selector */}
                <div className="hidden sm:flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setPreviewMode("half")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      previewMode === "half" ? "bg-red-50 text-[#ff2301]" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    2 ส่วนใน 1 หน้า (ตามรูป)
                  </button>
                  <button
                    onClick={() => setPreviewMode("full")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      previewMode === "full" ? "bg-red-50 text-[#ff2301]" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    2 หน้าเต็ม
                  </button>
                </div>

                <Link
                  href={`/store/returns/${selectedDoc.id}/print`}
                  target="_blank"
                  className="px-3.5 py-1.5 rounded-xl bg-[#ff2301] hover:bg-[#e01f01] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์เอกสาร</span>
                </Link>

                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Render Paper */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-200">
              <GoodsReturnPrintPaper data={selectedDoc} mode={previewMode} />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span>จัดทำโดยระบบ CRM เทอรา กรุ๊ป</span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
