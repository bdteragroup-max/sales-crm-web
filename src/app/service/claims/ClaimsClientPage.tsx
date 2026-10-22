"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  Warehouse,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
  Calendar,
  Layers,
  Zap,
  Cog,
  Droplets,
  ExternalLink,
} from "lucide-react";

interface ClaimsClientPageProps {
  initialClaims: any[];
  currentUser?: any;
}

export default function ClaimsClientPage({
  initialClaims = [],
  currentUser,
}: ClaimsClientPageProps) {
  const router = useRouter();
  const [claims, setClaims] = useState(initialClaims);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>("ALL");

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status === "PENDING").length;
    const underReview = claims.filter((c) => c.status === "UNDER_REVIEW").length;
    const accepted = claims.filter((c) => c.status === "ACCEPTED").length;
    const converted = claims.filter(
      (c) => c.status === "CONVERTED_CR" || c.status === "CONVERTED_RO"
    ).length;
    const warehouseCount = claims.filter((c) => c.department === "WAREHOUSE").length;
    const qcCount = claims.filter((c) => c.department === "QC").length;

    return { total, pending, underReview, accepted, converted, warehouseCount, qcCount };
  }, [claims]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (departmentFilter !== "ALL" && claim.department !== departmentFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && claim.status !== statusFilter) {
        return false;
      }
      if (equipmentTypeFilter !== "ALL" && claim.equipmentType !== equipmentTypeFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchModel = claim.model?.toLowerCase().includes(q);
        const matchSn = claim.serialNumber?.toLowerCase().includes(q);
        const matchNum = claim.claimNumber?.toLowerCase().includes(q);
        const matchReporter = claim.reporterName?.toLowerCase().includes(q);
        const matchSymptoms = claim.symptoms?.toLowerCase().includes(q);
        if (!matchModel && !matchSn && !matchNum && !matchReporter && !matchSymptoms) {
          return false;
        }
      }
      return true;
    });
  }, [claims, search, departmentFilter, statusFilter, equipmentTypeFilter]);

  const STATUS_CONFIG: Record<
    string,
    { label: string; badge: string }
  > = {
    PENDING: { label: "รอรับเรื่อง", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    UNDER_REVIEW: { label: "กำลังตรวจสอบ", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    ACCEPTED: { label: "รับเคลมแล้ว", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    CONVERTED_CR: { label: "เปิดใบ CR แล้ว", badge: "bg-purple-50 text-purple-700 border-purple-200" },
    CONVERTED_RO: { label: "เปิดใบ RO แล้ว", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    REJECTED: { label: "ปฏิเสธ", badge: "bg-rose-50 text-rose-700 border-rose-200" },
    CLOSED: { label: "ปิดงาน", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                ระบบรับแจ้งเคลมสินค้า (Service Claims Intake)
              </span>
              <span className="text-xs text-slate-400">คลังสินค้า & QC → ฝ่ายเซอร์วิส</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              รายการแจ้งเคลมสินค้า (Warranty & Defect Claims)
            </h1>
          </div>
        </div>

        <Link
          href="/service/claims/new"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-500/25 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ แจ้งเคลมสินค้าใหม่ (New Claim)</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div
          onClick={() => {
            setStatusFilter("ALL");
            setDepartmentFilter("ALL");
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-400 transition cursor-pointer"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            ทั้งหมด
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
          <span className="text-[11px] text-slate-400">รายการแจ้งเคลม</span>
        </div>

        {/* Pending */}
        <div
          onClick={() => setStatusFilter("PENDING")}
          className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-2xs hover:border-amber-400 transition cursor-pointer"
        >
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
            รอรับเรื่อง
          </span>
          <div className="text-2xl font-black text-amber-800 mt-1">{metrics.pending}</div>
          <span className="text-[11px] text-amber-600">รอเปิดตรวจ</span>
        </div>

        {/* Under Review */}
        <div
          onClick={() => setStatusFilter("UNDER_REVIEW")}
          className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-2xs hover:border-blue-400 transition cursor-pointer"
        >
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
            กำลังตรวจ
          </span>
          <div className="text-2xl font-black text-blue-800 mt-1">{metrics.underReview}</div>
          <span className="text-[11px] text-blue-600">เช็ค S/N & วีดีโอ</span>
        </div>

        {/* Accepted */}
        <div
          onClick={() => setStatusFilter("ACCEPTED")}
          className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-2xs hover:border-emerald-400 transition cursor-pointer"
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
            รับเคลมแล้ว
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">{metrics.accepted}</div>
          <span className="text-[11px] text-emerald-600">อนุมัติเคลม</span>
        </div>

        {/* Converted to CR / RO */}
        <div
          onClick={() => setStatusFilter("CONVERTED_CR")}
          className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 shadow-2xs hover:border-purple-400 transition cursor-pointer"
        >
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">
            เปิดใบ CR/RO
          </span>
          <div className="text-2xl font-black text-purple-800 mt-1">{metrics.converted}</div>
          <span className="text-[11px] text-purple-600">เข้าสู่ระบบซ่อม</span>
        </div>

        {/* By Department Breakdown */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            แยกตามแผนก
          </span>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-600">คลัง: <b>{metrics.warehouseCount}</b></span>
            <span className="text-slate-600">QC: <b>{metrics.qcCount}</b></span>
          </div>
          <span className="text-[10px] text-slate-400">คลังสินค้า vs QC</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Department Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setDepartmentFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                departmentFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter("WAREHOUSE")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                departmentFilter === "WAREHOUSE"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>คลังสินค้า ({metrics.warehouseCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter("QC")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                departmentFilter === "QC"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ฝ่าย QC ({metrics.qcCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Model, S/N, เลขที่แจ้งเคลม, ผู้แจ้ง..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Claims List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredClaims.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-700">ไม่พบรายการแจ้งเคลม</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ยังไม่มีรายการแจ้งเคลมที่ตรงกับเงื่อนไข หรือสามารถกดปุ่มแจ้งเคลมใหม่เพื่อเริ่มต้นส่งเรื่อง
            </p>
            <Link
              href="/service/claims/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>แจ้งเคลมสินค้าใหม่</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 w-32">เลขที่เคลม</th>
                  <th className="py-3 px-3 w-28">รูปเนมเพลท</th>
                  <th className="py-3 px-4">Model & Serial No.</th>
                  <th className="py-3 px-4">อาการเสียที่พบ</th>
                  <th className="py-3 px-3 text-center w-28">หลักฐาน</th>
                  <th className="py-3 px-3">แผนกผู้แจ้ง</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => {
                  const statusInfo = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
                  const dateFormatted = claim.claimDate
                    ? new Date(claim.claimDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })
                    : "-";

                  return (
                    <tr
                      key={claim.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/service/claims/${claim.id}`)}
                    >
                      {/* Claim Number & Date */}
                      <td className="py-3 px-4 font-mono font-bold text-red-600">
                        <div>{claim.claimNumber}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                          {dateFormatted}
                        </div>
                      </td>

                      {/* Nameplate Photo Thumbnail */}
                      <td className="py-3 px-3">
                        {claim.nameplatePhotoUrl ? (
                          <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-neutral-900 flex items-center justify-center shrink-0">
                            <img
                              src={claim.nameplatePhotoUrl}
                              alt="Nameplate"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                            ไม่มีรูป
                          </div>
                        )}
                      </td>

                      {/* Model & S/N */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {claim.brand ? `${claim.brand} ` : ""}
                          {claim.model}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-400 font-sans">S/N:</span>
                          <span className="font-bold text-red-600">
                            {claim.serialNumber || "(ระบุในรูปเนมเพลท)"}
                          </span>
                        </div>
                      </td>

                      {/* Symptoms */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 leading-relaxed text-[11.5px]">
                          {claim.symptoms}
                        </p>
                      </td>

                      {/* Media indicators (Video & Photos) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {claim.defectVideoUrl && (
                            <span
                              className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200"
                              title="มีคลิปวีดีโออาการเสีย"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {Array.isArray(claim.defectPhotos) && claim.defectPhotos.length > 0 && (
                            <span
                              className="px-1.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                              title="มีรูปภาพความเสียหายเพิ่มเติม"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>{claim.defectPhotos.length}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold">
                          {claim.department === "WAREHOUSE" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-50 text-red-700 border border-red-200 font-bold">
                              <Warehouse className="w-3 h-3" /> คลังสินค้า
                            </span>
                          ) : claim.department === "QC" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                              <ShieldCheck className="w-3 h-3" /> ฝ่าย QC
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                              {claim.department}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                          โดย: {claim.reporterName}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/service/claims/${claim.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {claim.linkedCrId && (
                            <Link
                              href={`/service/check-reports/${claim.linkedCrId}/edit`}
                              className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                              title="เปิดใบตรวจเช็ค CR"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
