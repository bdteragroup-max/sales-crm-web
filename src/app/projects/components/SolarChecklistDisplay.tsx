"use client";

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Clock,
  Download,
  Edit,
  ExternalLink,
  FileSignature,
  FileText,
  Loader2,
  PenTool,
  Sun,
  Users,
  User as UserIcon,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  HV_CHECKLIST,
  POST_INSTALL_PHOTOS,
  PRE_WORK_CHECKLIST,
  computeSolarChecklistProgress,
  formatSolarDateBkk,
  formatSolarDateTimeBkk,
  formatSolarTimeBkk,
  parseChecklistStringArray,
  type SolarChecklistItemDef,
  type SolarProjectRecord,
} from '@/app/lib/solarChecklistConfig';

interface Props {
  project: SolarProjectRecord;
  onEdit?: () => void;
}

interface LightboxState {
  urls: string[];
  index: number;
  title: string;
}

function ChecklistPhotoCard({
  indexNo,
  item,
  checked,
  images,
  variant = 'default',
  extraSpanClass = '',
  onPreviewImage,
}: {
  indexNo: number;
  item: SolarChecklistItemDef;
  checked: boolean;
  images: string[];
  variant?: 'default' | 'hv';
  extraSpanClass?: string;
  onPreviewImage: (urls: string[], index: number, title: string) => void;
}) {
  const isHv = variant === 'hv';
  const cleanTitle = item.label.replace(/^\d+\.\s*/, '');

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-all h-full ${
        isHv
          ? checked
            ? 'bg-orange-50/50 border-orange-200'
            : 'bg-orange-50/20 border-orange-200/70'
          : checked
          ? 'bg-white border-emerald-200 shadow-2xs'
          : 'bg-gray-50/70 border-gray-200/80'
      } ${extraSpanClass}`}
    >
      {/* Header Row: Index + Title + Check Badge */}
      <div className="flex items-start justify-between gap-2 min-h-[42px]">
        <div className="flex items-start gap-2 min-w-0">
          <span
            className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 font-mono ${
              checked
                ? 'bg-emerald-600 text-white'
                : isHv
                ? 'bg-orange-200/80 text-orange-900'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {indexNo}
          </span>
          <span className="text-xs font-bold text-gray-800 leading-snug line-clamp-2">
            {cleanTitle}
          </span>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            checked
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
        >
          {checked ? (
            <>
              <CheckCircle2 size={11} />
              <span>ผ่าน</span>
            </>
          ) : (
            <>
              <CircleDashed size={11} />
              <span>รอตรวจ</span>
            </>
          )}
        </span>
      </div>

      {/* Symmetrical Photo Grid (No Horizontal Scrollbars) */}
      {images.length > 0 ? (
        <div
          className={`grid gap-1.5 ${
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {images.map((imgUrl, idx) => (
            <button
              key={`${item.key}-${idx}`}
              type="button"
              onClick={() => onPreviewImage(images, idx, item.label)}
              className={`relative block w-full h-28 rounded-lg overflow-hidden border group cursor-pointer bg-gray-100 ${
                isHv ? 'border-orange-200' : 'border-gray-200'
              }`}
            >
              <Image
                src={imgUrl}
                alt={`${item.label} #${idx + 1}`}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[11px] font-bold px-2 py-0.5 rounded-md bg-black/40">
                  ดูรูปเต็ม
                </span>
              </div>
              {images.length > 1 && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.2 bg-black/60 text-white text-[9px] font-mono font-bold rounded">
                  {idx + 1}/{images.length}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div
          className={`w-full h-28 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1 ${
            isHv
              ? 'bg-orange-50/40 border-orange-200 text-orange-400'
              : 'bg-gray-100/80 border-gray-200 text-gray-400'
          }`}
        >
          <Camera size={18} className="opacity-60" />
          <span className="text-[11px] font-medium">ไม่มีรูปถ่ายแนบ</span>
        </div>
      )}
    </div>
  );
}

export default function SolarChecklistDisplay({ project, onEdit }: Props) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfCacheKey, setPdfCacheKey] = useState(() => Date.now());

  const progress = useMemo(() => computeSolarChecklistProgress(project), [project]);
  const workSummary = useMemo(
    () => parseChecklistStringArray(project.workSummary),
    [project.workSummary]
  );
  const siteProblems = useMemo(
    () => parseChecklistStringArray(project.siteProblems),
    [project.siteProblems]
  );

  if (
    project.projectCategory !== 'Solar Roof' &&
    project.projectCategory !== 'Solar Pump' &&
    project.projectCategory !== 'Solar' &&
    !(project.job?.item && project.job.item.toLowerCase().includes('solar'))
  ) {
    return null;
  }

  const teamMembersDisplay =
    project.siteTeamMembers ||
    [
      ...(project.members?.map(
        (m) =>
          `${m.user?.fullName || ''} (${m.role === 'admin' ? 'Project Admin' : 'Engineer'})`
      ) || []),
      project.externalTechnicians
        ? `${project.externalTechnicians} (ช่างภายนอก)`
        : '',
    ]
      .filter(Boolean)
      .join(', ') ||
    '-';

  const supervisorName = project.siteSupervisor || project.manager?.fullName || '-';
  const hasSignatures = Boolean(project.supervisorSignUrl || project.customerSignUrl);

  const openLightbox = (urls: string[], index: number, title: string) => {
    setLightbox({ urls, index, title });
  };

  const openPdfModal = () => {
    setPdfCacheKey(Date.now());
    setPdfLoading(true);
    setShowPdfPreview(true);
  };

  const inlinePdfUrl = `/api/projects/${project.id}/solar-checklist-pdf?mode=inline&v=${pdfCacheKey}`;
  const downloadPdfUrl = `/api/projects/${project.id}/solar-checklist-pdf?v=${pdfCacheKey}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* ── 1. Symmetrical Action Header ── */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#ff2301] border border-red-200 flex items-center justify-center shrink-0 shadow-2xs">
            <Sun size={22} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-gray-900 tracking-tight truncate">
                เอกสารการติดตั้งโซลาร์ (Solar Checklist)
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  project.isHighVoltage
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {project.isHighVoltage ? 'ระบบ High Voltage' : 'ระบบ Low Voltage'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {progress.totalChecked}/{progress.totalItems} รายการ ({progress.percent}%)
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {project.projectNumber} • {project.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={openPdfModal}
            className="h-10 inline-flex items-center justify-center gap-1.5 px-3.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <FileText size={14} className="text-[#ff2301] shrink-0" />
            <span>ดู / ดาวน์โหลด PDF</span>
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-4 bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Edit size={14} className="shrink-0" />
              <span>กรอก / แก้ไขข้อมูล</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* ── 2. Symmetrical 4-Card KPI Summary Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span className="truncate">เวลาเข้า – ออกหน้างาน</span>
              <Clock size={14} className="text-[#ff2301] shrink-0" />
            </div>
            <div className="text-sm font-black text-gray-900 font-mono truncate">
              {project.siteCheckInTime
                ? `${formatSolarTimeBkk(project.siteCheckInTime)} - ${
                    project.siteCheckOutTime
                      ? formatSolarTimeBkk(project.siteCheckOutTime)
                      : '?'
                  }`
                : 'ยังไม่ลงเวลา'}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {project.siteCheckInTime
                ? formatSolarDateBkk(project.siteCheckInTime)
                : 'ยังไม่มีข้อมูลวันที่'}
            </div>
          </div>

          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span className="truncate">ก่อนเริ่มงาน (Pre-Work)</span>
              <ClipboardCheck size={14} className="text-emerald-600 shrink-0" />
            </div>
            <div className="text-sm font-black text-gray-900 font-mono">
              {progress.preDone} / {progress.preTotal} หมวด
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${Math.round((progress.preDone / progress.preTotal) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span className="truncate">หลังติดตั้ง & รูปถ่าย</span>
              <Camera size={14} className="text-blue-600 shrink-0" />
            </div>
            <div className="text-sm font-black text-gray-900 font-mono">
              {progress.postDone} / {progress.postTotal} หัวข้อ
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              แนบรูปถ่ายทั้งหมด <strong className="text-gray-800">{progress.photoCount}</strong> รูป
            </div>
          </div>

          <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span className="truncate">ปัญหาหน้างาน & ลายเซ็น</span>
              <FileSignature size={14} className="text-amber-600 shrink-0" />
            </div>
            <div className="text-sm font-black text-gray-900">
              {siteProblems.length > 0 ? (
                <span className="text-red-600">พบ {siteProblems.length} รายการ</span>
              ) : (
                <span className="text-emerald-700">ไม่มีปัญหาหน้างาน</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              ลายเซ็น:{' '}
              <strong className={hasSignatures ? 'text-emerald-700' : 'text-gray-600'}>
                {project.supervisorSignUrl && project.customerSignUrl
                  ? 'ลงนามครบ 2 ฝ่าย'
                  : hasSignatures
                  ? 'ลงนามแล้วบางส่วน'
                  : 'ยังไม่ได้ลงนาม'}
              </strong>
            </div>
          </div>
        </div>

        {/* ── 3. Symmetrical 2-Column Info Cards (Check-in Team vs Work Summary) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Left Card: Check-in & Team */}
          <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 h-full">
            <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2.5">
              <Users size={16} className="text-[#ff2301] shrink-0" />
              <h4 className="font-black text-sm text-gray-900">
                1. ข้อมูลการเข้างานและทีมปฏิบัติงาน
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
              <div className="bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Clock size={12} /> เวลาเข้างาน (Check-in)
                </div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 mt-1 font-mono">
                  {formatSolarDateTimeBkk(project.siteCheckInTime)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Clock size={12} /> เวลาออกงาน (Check-out)
                </div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 mt-1 font-mono">
                  {formatSolarDateTimeBkk(project.siteCheckOutTime)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <UserIcon size={12} /> หัวหน้าทีม (Supervisor)
                </div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 mt-1 truncate">
                  {supervisorName}
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Zap size={12} /> ประเภทแรงดันไฟฟ้า
                </div>
                <div className="text-xs sm:text-sm font-bold text-gray-900 mt-1">
                  {project.isHighVoltage ? 'High Voltage (22-115 kV)' : 'Low Voltage (มาตรฐาน)'}
                </div>
              </div>

              <div className="sm:col-span-2 bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase mb-1">
                  รายชื่อทีมงานปฏิบัติการ (Team Members)
                </div>
                <div className="text-xs font-semibold text-gray-800 leading-relaxed">
                  {teamMembersDisplay}
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Work Summary & Site Problems */}
          <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 h-full">
            <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2.5">
              <Wrench size={16} className="text-emerald-600 shrink-0" />
              <h4 className="font-black text-sm text-gray-900">
                2. สรุปงานประจำวันและปัญหาหน้างาน
              </h4>
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col justify-between">
              <div className="bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase mb-1">
                  งานที่ทำสำเร็จ (Work Summary)
                </div>
                {workSummary.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-xs font-semibold text-gray-800">
                    {workSummary.map((line, i) => (
                      <li key={`ws-${i}`}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-400">- ยังไม่ได้ระบุรายการงาน</div>
                )}
              </div>

              <div
                className={`rounded-xl p-3 border ${
                  siteProblems.length > 0
                    ? 'bg-red-50/60 border-red-200'
                    : 'bg-white border-gray-200/80'
                }`}
              >
                <div className="text-[11px] font-bold text-gray-500 uppercase mb-1">
                  ปัญหา / อุปสรรคหน้างาน (Site Problems)
                </div>
                {siteProblems.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-xs font-bold text-red-700">
                    {siteProblems.map((line, i) => (
                      <li key={`sp-${i}`}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-400">- ไม่มีปัญหาหน้างาน</div>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-200/80">
                <div className="text-[11px] font-bold text-gray-400 uppercase mb-1">
                  งานค้าง / สิ่งที่ต้องทำต่อ (Remaining Work)
                </div>
                <div className="text-xs font-semibold text-gray-800 whitespace-pre-wrap">
                  {project.remainingWork || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Pre-Work Checklist (5 items -> Responsive Symmetrical 1 / 2+2+1 / 5 Cols) ── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
            <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-[#ff2301]" />
              <span>3. เตรียมความพร้อมก่อนเริ่มงาน (Pre-Work Checklist)</span>
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {progress.preDone}/{progress.preTotal} ผ่าน
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-stretch">
            {PRE_WORK_CHECKLIST.map((item, idx) => (
              <ChecklistPhotoCard
                key={item.key}
                indexNo={idx + 1}
                item={item}
                checked={Boolean(progress.pre[item.key])}
                images={progress.images[item.key] || []}
                extraSpanClass={
                  idx === PRE_WORK_CHECKLIST.length - 1
                    ? 'sm:col-span-2 xl:col-span-1'
                    : ''
                }
                onPreviewImage={openLightbox}
              />
            ))}
          </div>
        </section>

        {/* ── 5. Post-Install Photos (8 items -> 4x2 Symmetrical Grid) ── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
            <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
              <Camera size={16} className="text-[#ff2301]" />
              <span>4. รูปถ่ายหลังติดตั้ง (Post-Installation Photos)</span>
            </h4>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              {progress.postDone}/{progress.postTotal} ผ่าน
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-stretch">
            {POST_INSTALL_PHOTOS.map((item, idx) => (
              <ChecklistPhotoCard
                key={item.key}
                indexNo={idx + 1}
                item={item}
                checked={Boolean(progress.post[item.key])}
                images={progress.images[item.key] || []}
                onPreviewImage={openLightbox}
              />
            ))}
          </div>
        </section>

        {/* ── 6. High Voltage Checklist (4 items -> 4x1 Symmetrical Row) ── */}
        {project.isHighVoltage && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200 pb-2.5">
              <h4 className="font-black text-sm text-orange-700 flex items-center gap-2">
                <Zap size={16} />
                <span>5. ตรวจสอบระบบไฟฟ้าแรงสูง (High Voltage Checklist)</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 font-mono">
                {progress.hvDone}/{progress.hvTotal} ผ่าน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 items-stretch">
              {HV_CHECKLIST.map((item, idx) => (
                <ChecklistPhotoCard
                  key={item.key}
                  indexNo={idx + 1}
                  item={item}
                  checked={Boolean(progress.hv[item.key])}
                  images={progress.images[item.key] || []}
                  variant="hv"
                  onPreviewImage={openLightbox}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 7. Symmetrical 2-Column Digital Signatures Box ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
            <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
              <PenTool size={16} className="text-[#ff2301]" />
              <span>ลายเซ็นรับรองงานหน้างาน (Sign-off)</span>
            </h4>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-xs font-bold text-[#ff2301] hover:text-red-700 cursor-pointer"
              >
                {hasSignatures ? 'แก้ไขลายเซ็น' : '+ เพิ่มลายเซ็น'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                ผู้ควบคุมงาน (Project Supervisor / Team Leader)
              </span>
              <div className="w-full h-24 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-2 relative overflow-hidden">
                {project.supervisorSignUrl ? (
                  <Image
                    src={project.supervisorSignUrl}
                    alt="ลายเซ็นผู้ควบคุมงาน"
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-gray-400">ยังไม่มีลายเซ็น</span>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-600">{supervisorName}</span>
            </div>

            <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                ตัวแทนลูกค้า / ผู้รับมอบงาน (Customer Representative)
              </span>
              <div className="w-full h-24 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-2 relative overflow-hidden">
                {project.customerSignUrl ? (
                  <Image
                    src={project.customerSignUrl}
                    alt="ลายเซ็นลูกค้า"
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-gray-400">ยังไม่มีลายเซ็น</span>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-600">
                {project.clientName || 'ลูกค้า / ผู้รับมอบงาน'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ── Interactive Photo Lightbox Modal ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{lightbox.title}</p>
                {lightbox.urls.length > 1 && (
                  <p className="text-xs text-white/70 font-mono">
                    รูปที่ {lightbox.index + 1} / {lightbox.urls.length}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightbox.urls[lightbox.index]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
                >
                  <ExternalLink size={13} />
                  <span>เปิดต้นฉบับ</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="relative w-full h-[72vh] rounded-2xl overflow-hidden bg-black/40 border border-white/10">
              <Image
                src={lightbox.urls[lightbox.index]}
                alt={lightbox.title}
                fill
                unoptimized
                className="object-contain"
              />
              {lightbox.urls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index - 1 + prev.urls.length) % prev.urls.length,
                            }
                          : null
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox((prev) =>
                        prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── In-Page PDF Preview & Download Modal ── */}
      {showPdfPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
          onClick={() => setShowPdfPreview(false)}
        >
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 w-full max-w-5xl h-[100dvh] sm:h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#ff2301] shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                      รายงานเอกสารติดตั้งโซลาร์ (PDF)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-50 text-[#ff2301] border border-red-200">
                      {project.projectNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{project.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={downloadPdfUrl}
                  download={`Solar-Checklist-${project.projectNumber || project.id}.pdf`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Download size={15} />
                  <span>ดาวน์โหลด PDF</span>
                </a>
                <a
                  href={inlinePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-semibold transition"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">เปิดแท็บใหม่</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-gray-100">
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 z-10">
                  <Loader2 className="w-8 h-8 text-[#ff2301] animate-spin" />
                  <p className="text-xs font-bold text-gray-600">กำลังสร้างเอกสาร PDF พร้อมภาพถ่าย...</p>
                </div>
              )}
              <iframe
                src={inlinePdfUrl}
                onLoad={() => setPdfLoading(false)}
                className="w-full h-full border-0"
                title="Solar Checklist PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
