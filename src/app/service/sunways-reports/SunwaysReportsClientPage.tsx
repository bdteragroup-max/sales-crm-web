"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit3,
  FilePlus2,
  FileText,
  Printer,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { deleteSunwaysReport } from "@/app/actions/sunwaysReports";
import {
  SUNWAYS_STATUS_CONFIG,
  type SunwaysReportRecord,
  type SunwaysReportStatus,
} from "@/app/lib/sunwaysReportConfig";

interface SunwaysReportsClientPageProps {
  initialReports: SunwaysReportRecord[];
  userRole: string;
  currentUserId: string;
}

export default function SunwaysReportsClientPage({
  initialReports,
  userRole,
  currentUserId,
}: SunwaysReportsClientPageProps) {
  const router = useRouter();
  const [reports, setReports] = useState<SunwaysReportRecord[]>(initialReports || []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [
        r.reportNumber,
        r.companyName,
        r.plantName,
        r.inverterModel,
        r.serialNumber,
        r.communicationPerson,
        r.faultObserved,
        r.inspectorName,
      ].some((val) => typeof val === "string" && val.toLowerCase().includes(q));
    });
  }, [reports, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: reports.length,
      draft: reports.filter((r) => r.status === "DRAFT").length,
      completed: reports.filter((r) => r.status === "COMPLETED").length,
      submitted: reports.filter((r) => r.status === "SUBMITTED").length,
    };
  }, [reports]);

  const canDelete = (r: SunwaysReportRecord) => {
    const roleLower = (userRole || "").toLowerCase();
    if (
      roleLower.includes("super") ||
      roleLower.includes("admin") ||
      (roleLower.includes("service") &&
        (roleLower.includes("mgr") || roleLower.includes("manager")))
    ) {
      return true;
    }
    return Boolean(r.createdById && r.createdById === currentUserId);
  };

  const handleDelete = async (r: SunwaysReportRecord) => {
    const confirm = await Swal.fire({
      title: `ลบรายงาน ${r.reportNumber}?`,
      text: "การลบจะไม่สามารถกู้คืนได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      confirmButtonText: "ลบรายงาน",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;

    const res = await deleteSunwaysReport(r.id);
    if (!res.success) {
      Swal.fire("ลบไม่สำเร็จ", res.error || "", "error");
      return;
    }
    setReports((prev) => prev.filter((item) => item.id !== r.id));
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                รายงานตรวจเช็ค Sunways (Inverter Check Points)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                TH / EN
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกผลตรวจสอบอินเวอร์เตอร์ Sunways ตามแบบฟอร์มมาตรฐาน 4 หน้า พร้อมระบบแปลภาษา ไทย ↔ อังกฤษ
            </p>
          </div>
        </div>

        <Link
          href="/service/sunways-reports/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <FilePlus2 className="w-4 h-4" />
          สร้างรายงาน Sunways ใหม่
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ทั้งหมด", value: counts.all, filter: "ALL", color: "text-slate-900" },
          { label: "แบบร่าง (Draft)", value: counts.draft, filter: "DRAFT", color: "text-amber-600" },
          { label: "ตรวจเช็คเสร็จสิ้น", value: counts.completed, filter: "COMPLETED", color: "text-emerald-600" },
          { label: "ส่งรายงานแล้ว", value: counts.submitted, filter: "SUBMITTED", color: "text-blue-600" },
        ].map((card) => (
          <button
            key={card.filter}
            type="button"
            onClick={() => setStatusFilter(card.filter)}
            className={`text-left bg-white rounded-2xl border p-4 transition-all ${
              statusFilter === card.filter
                ? "border-orange-500 ring-2 ring-orange-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</div>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร, บริษัท, ชื่อ Plant, รุ่นอินเวอร์เตอร์, S/N, ผู้ตรวจ..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-orange-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="ALL">ทุกสถานะ</option>
          <option value="DRAFT">แบบร่าง (Draft)</option>
          <option value="COMPLETED">ตรวจเช็คเสร็จสิ้น</option>
          <option value="SUBMITTED">ส่งรายงานแล้ว</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-600">
              ยังไม่มีรายงาน Sunways Check Points
            </div>
            <p className="text-xs text-slate-400">
              กดปุ่ม &ldquo;สร้างรายงาน Sunways ใหม่&rdquo; เพื่อเริ่มบันทึกการตรวจเช็ค
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">เลขที่ / วันที่</th>
                  <th className="px-4 py-3 text-left font-semibold">ลูกค้า / Plant Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Model / S/N</th>
                  <th className="px-4 py-3 text-left font-semibold">อาการที่พบ (Fault)</th>
                  <th className="px-4 py-3 text-left font-semibold">สถานะ & ภาษา</th>
                  <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const st =
                    SUNWAYS_STATUS_CONFIG[(r.status as SunwaysReportStatus) || "DRAFT"] ||
                    SUNWAYS_STATUS_CONFIG.DRAFT;
                  const b = r.bilingualData || {};
                  const hasTh = Boolean(b.th?.companyName || b.th?.plantName || b.th?.faultObserved);
                  const hasEn = Boolean(b.en?.companyName || b.en?.plantName || b.en?.faultObserved);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold text-slate-900">{r.reportNumber}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(r.reportDate).toLocaleDateString("th-TH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        {r.inspectorName && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ผู้ตรวจ: {r.inspectorName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">
                          {r.companyName || "-"}
                        </div>
                        {r.plantName && (
                          <div className="text-xs text-slate-600">Plant: {r.plantName}</div>
                        )}
                        {r.plantCapacity && (
                          <div className="text-[11px] text-slate-400">
                            Capacity: {r.plantCapacity}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-800">
                          {r.inverterModel || "-"}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {r.serialNumber || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top max-w-[240px]">
                        <div className="text-xs text-slate-700 line-clamp-2">
                          {r.faultObserved || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top space-y-1.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.badgeClass}`}
                        >
                          {st.labelTh}
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                          {hasTh && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                              TH ✓
                            </span>
                          )}
                          {hasEn && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                              EN ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/service/sunways-reports/${r.id}/print`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                            title="ดูและพิมพ์แบบฟอร์ม Sunways 4 หน้า"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            PDF
                          </Link>
                          <Link
                            href={`/service/sunways-reports/${r.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            แก้ไข
                          </Link>
                          {canDelete(r) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(r)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                              title="ลบรายงาน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
