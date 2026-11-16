"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  ClipboardList,
  Wrench,
  CheckCircle2,
  ExternalLink,
  User,
  Phone,
  Pencil,
  AlertCircle,
  FileSignature,
} from "lucide-react";

export interface PlanViewerOrder {
  id: string;
  installationNo: string;
  jobId: string | null;
  jobNumber: string | null;
  sellerName: string | null;
  quotationNo: string | null;
  company: string | null;
  jobName: string | null;
  siteAddress: string | null;
  status: string;
  technician: string | null;
  technicianPhone: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  workLocation: string | null;
  workPlan: string | null;
  technicianNote: string | null;
  planUpdatedAt: string | null;
  planUpdatedByName: string | null;
}

export interface PlanViewerJobFallback {
  id: string;
  jobNumber: string;
  customerName: string;
  item: string | null;
}

interface PlanViewerClientProps {
  order: PlanViewerOrder | null;
  jobFallback: PlanViewerJobFallback | null;
  canEditPlan: boolean;
}

interface BkkDateParts {
  dateKey: string;
  day: string;
  monthShortEn: string;
  dateLabelTh: string;
  timeLabelTh: string;
}

function formatBkkParts(iso: string | null): BkkDateParts | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
  }).format(d);

  const monthShortEn = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    month: "short",
  }).format(d);

  const dateLabelTh = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);

  const timeLabelTh = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  return { dateKey, day, monthShortEn, dateLabelTh, timeLabelTh };
}

function getStatusColor(status: string): string {
  switch (status) {
    case "เปิด Job - ยังไม่เริ่มติดตั้ง":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "กำลังติดตั้ง":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "มีปัญหา":
      return "bg-red-100 text-red-800 border-red-200";
    case "ปิด Job - ติดตั้งเสร็จสิ้น":
      return "bg-green-200 text-green-900 border-green-300";
    case "ยกเลิก - PO":
      return "bg-red-700 text-white border-red-800";
    case "ปิด Job - ตรวจเช็คเสร็จสิ้น":
      return "bg-emerald-700 text-white border-emerald-800";
    case "กำลังตรวจเช็ค":
      return "bg-orange-200 text-orange-900 border-orange-300";
    case "เปิด Job - ยังไม่เริ่มตรวจเช็ค":
      return "bg-slate-200 text-slate-800 border-slate-300";
    case "รอดำเนินการ":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function PlanViewerClient({
  order,
  jobFallback,
  canEditPlan,
}: PlanViewerClientProps) {
  const router = useRouter();

  if (!order) {
    return (
      <div className="bg-slate-50 min-h-screen pb-12">
        <div className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-2xs px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/service/installation")}
            className="p-2 -ml-1 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900">แผนงานติดตั้ง</h1>
            <p className="text-xs text-slate-500">{jobFallback?.jobNumber || "-"}</p>
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto mt-4">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">ยังไม่มีใบงานติดตั้ง (Installation Order)</h2>
              <p className="text-xs text-slate-600">
                งาน {jobFallback?.jobNumber} ({jobFallback?.customerName}) ยังไม่ได้สร้างใบงานติดตั้ง จึงยังไม่มีแผนงานให้เปิดดู
              </p>
              {jobFallback?.item && (
                <p className="text-xs text-slate-500 pt-1">{jobFallback.item}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {jobFallback?.id && (
                <Link
                  href={`/jobs/${jobFallback.id}/manage-installation-order`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  <FileSignature className="w-4 h-4" />
                  สร้างใบงานติดตั้ง
                </Link>
              )}
              <button
                type="button"
                onClick={() => router.push("/service/installation")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
              >
                กลับหน้าแดชบอร์ด
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tasks = order.workPlan
    ? order.workPlan
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const equipments = order.technicianNote
    ? order.technicianNote
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const startParts = formatBkkParts(order.plannedStartDate);
  const endParts = formatBkkParts(order.plannedEndDate);
  const updatedParts = formatBkkParts(order.planUpdatedAt);
  const isSameDay = Boolean(startParts && endParts && startParts.dateKey === endParts.dateKey);

  const locationText = (order.workLocation || "").trim();
  const isMapUrl = /^https?:\/\//i.test(locationText);
  const scheduleHref = order.jobId ? `/jobs/${order.jobId}/installation-schedule` : null;
  const orderHref = order.jobId ? `/jobs/${order.jobId}/manage-installation-order` : null;

  return (
    <div className="bg-slate-50 min-h-screen pb-28">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/service/installation")}
              className="p-2 -ml-1 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-700 shrink-0"
              aria-label="กลับหน้าแดชบอร์ดงานติดตั้ง"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                แผนงานติดตั้ง
              </h1>
              <p className="text-xs text-slate-500 font-mono truncate">
                {order.installationNo}
                {order.jobNumber ? ` • ${order.jobNumber}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-full border ${getStatusColor(
                order.status
              )}`}
            >
              {order.status}
            </span>
            {canEditPlan && scheduleHref && (
              <Link
                href={scheduleHref}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไขแผน
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Customer & Personnel Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 space-y-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ลูกค้า &amp; รายละเอียดงาน (Customer &amp; Job)
              </h2>
              {order.quotationNo && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {order.quotationNo}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900">{order.company || "-"}</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{order.jobName || "-"}</p>
            {order.siteAddress && (
              <p className="text-xs text-slate-500 mt-1.5">
                <span className="font-semibold text-slate-700">หน้างาน:</span> {order.siteAddress}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-700 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">ช่าง / วิศวกรผู้รับผิดชอบ</div>
                <div className="font-bold text-slate-900 truncate">
                  {order.technician || "ยังไม่ระบุช่าง"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">เบอร์ติดต่อช่าง / เซลล์</div>
                <div className="font-semibold text-slate-900 truncate">
                  {order.technicianPhone ? (
                    <a href={`tel:${order.technicianPhone}`} className="text-red-600 hover:underline">
                      {order.technicianPhone}
                    </a>
                  ) : (
                    <span>{order.sellerName ? `เซลล์: ${order.sellerName}` : "-"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Location Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1.5 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-700" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">กำหนดการ &amp; สถานที่ (Schedule &amp; Location)</h2>
          </div>

          {startParts ? (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-red-50 text-red-700 border border-red-200 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold uppercase">{startParts.monthShortEn}</span>
                  <span className="text-lg font-black leading-none">{startParts.day}</span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  {endParts && !isSameDay ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>เริ่ม: {startParts.dateLabelTh} เวลา {startParts.timeLabelTh} น.</span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-700 pl-5">
                        สิ้นสุด: {endParts.dateLabelTh} เวลา {endParts.timeLabelTh} น.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-slate-500">{startParts.dateLabelTh}</div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>
                          {startParts.timeLabelTh} น.
                          {endParts ? ` - ${endParts.timeLabelTh} น.` : ""}
                        </span>
                      </div>
                    </>
                  )}
                  <p className="text-[11px] text-slate-400">เวลาปฏิบัติงาน (Asia/Bangkok)</p>
                </div>
              </div>

              {locationText && (
                <div className="flex items-start gap-3 bg-red-50/50 p-3.5 rounded-xl border border-red-200/80">
                  <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-xs font-bold text-slate-900">สถานที่ปฏิบัติงาน (Work Location)</p>
                    {isMapUrl ? (
                      <>
                        <a
                          href={locationText}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          เปิดแผนที่ Google Maps
                        </a>
                        <p className="text-[11px] text-slate-500 break-all leading-relaxed">
                          {locationText}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-700 break-words leading-relaxed">
                        {locationText}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-medium">ยังไม่ได้ระบุกำหนดการ</p>
            </div>
          )}
        </div>

        {/* Steps Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-slate-900 p-1.5 rounded-lg">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">ขั้นตอนการทำงาน (Work Plan)</h2>
            </div>
            {tasks.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {tasks.length} ขั้นตอน
              </span>
            )}
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-2.5">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 items-start p-2.5 rounded-xl bg-slate-50/70 border border-slate-100"
                >
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed break-words min-w-0 flex-1">
                    {task}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-red-200 bg-red-50/50 p-4 text-center space-y-2.5">
              <p className="text-xs sm:text-sm font-bold text-red-800">
                ยังไม่ได้ระบุขั้นตอนการทำงานในแผนงานนี้
              </p>
              <p className="text-xs text-red-700/80">
                {canEditPlan
                  ? "กรุณากดเพิ่มขั้นตอนการทำงานเพื่อให้ทีมช่างและผู้เกี่ยวข้องดูรายละเอียดหน้างานได้ครบถ้วน"
                  : `ผู้วางแผน${order.technician ? ` (${order.technician})` : ""} ยังไม่ได้กรอกรายการขั้นตอนการทำงาน`}
              </p>
              {canEditPlan && scheduleHref && (
                <div className="pt-1">
                  <Link
                    href={scheduleHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    เพิ่มขั้นตอนแผนงานตอนนี้
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Equipment Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-slate-100 p-1.5 rounded-lg">
              <Wrench className="w-4 h-4 text-slate-700" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">หมายเหตุ / อุปกรณ์ที่ต้องเตรียม (Notes &amp; Equipment)</h2>
          </div>

          {equipments.length > 0 ? (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              {equipments.map((equipment, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-800 leading-snug break-words min-w-0 flex-1">
                    {equipment}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">ไม่มีข้อมูลอุปกรณ์เพิ่มเติม</p>
          )}

          {updatedParts && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
              <span>
                อัปเดตแผนล่าสุด: {updatedParts.dateLabelTh} เวลา {updatedParts.timeLabelTh} น.
              </span>
              {order.planUpdatedByName && <span>โดย {order.planUpdatedByName}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-10">
        <div className="max-w-2xl mx-auto p-3 sm:p-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/service/installation")}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-2xs transition-colors"
          >
            กลับสู่แดชบอร์ด
          </button>
          {orderHref && (
            <Link
              href={orderHref}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-colors shrink-0"
            >
              ใบงาน
            </Link>
          )}
          {canEditPlan && scheduleHref && (
            <Link
              href={scheduleHref}
              className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              แก้ไขแผน
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
