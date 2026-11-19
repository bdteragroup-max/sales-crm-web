'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_REPORT_TITLE,
  REPORT_OVERALL_REMARK_ELEMENT_ID,
  canEditSolarCleaningRole,
  canManageSolarCleaningRecord,
  canSignSolarCleaningAsProjectMgr,
  canSignSolarCleaningAsServiceMgr,
  countReportPhotos,
  createDefaultReportData,
  createEmptyWorkItems,
  findMissingReportPhotoNotes,
  getSolarCleaningStatusMeta,
  isOverallRemarkMissing,
  normalizeReportData,
  normalizeWorkItems,
  resolveManagerSignConfig,
  toBkkDateInputValue,
  type InspectionPassStatus,
  type SelectableCustomerOption,
  type SelectableProjectOption,
  type SolarCleaningRecord,
  type SolarCleaningReportData,
} from '@/app/lib/solarCleaningConfig';
import { toBkkDateTimeLocalValue } from '@/app/lib/solarChecklistConfig';
import {
  createSolarCleaningInspection,
  deleteSolarCleaningInspection,
  signSolarCleaningByManager,
  updateSolarCleaningInspection,
} from '@/app/actions/solarCleaning';
import SolarCleaningPdfModal from './SolarCleaningPdfModal';
import SolarCleaningPrecheckStep, {
  type PrecheckStepFormValues,
} from './SolarCleaningPrecheckStep';
import SolarCleaningReportStep from './SolarCleaningReportStep';

interface SolarCleaningFormClientProps {
  initialRecord?: SolarCleaningRecord | null;
  projects: SelectableProjectOption[];
  customers?: SelectableCustomerOption[];
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  defaultTab?: 'precheck' | 'report';
}

async function uploadDataUrlSignature(
  sigUrl: string | null,
  tag: string
): Promise<string | null> {
  if (!sigUrl || !sigUrl.startsWith('data:image/')) {
    return sigUrl || null;
  }
  const res = await fetch(sigUrl);
  const blob = await res.blob();
  const file = new File([blob], `solar-cleaning-${tag}-${Date.now()}.png`, {
    type: 'image/png',
  });
  const form = new FormData();
  form.append('file', file);
  form.append('bucket', 'uploadsService');

  const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
  const json = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !json?.success || !json?.url) {
    return sigUrl;
  }
  return json.url;
}

export default function SolarCleaningFormClient({
  initialRecord,
  projects,
  customers = [],
  currentUser,
  defaultTab = 'precheck',
}: SolarCleaningFormClientProps) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState<SelectableCustomerOption[]>(customers);
  const [activeStep, setActiveStep] = useState<'precheck' | 'report'>(defaultTab);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningMgr, setIsSigningMgr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pdfPreviewType, setPdfPreviewType] = useState<'system-check' | 'inspection-report' | null>(null);
  const [pdfCacheKey, setPdfCacheKey] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRemarkErrors, setShowRemarkErrors] = useState(false);

  const canEdit = initialRecord
    ? canManageSolarCleaningRecord({
        userId: currentUser.id,
        userRole: currentUser.role,
        createdById: initialRecord.createdById,
      })
    : canEditSolarCleaningRole(currentUser.role);
  const canSignPm = canSignSolarCleaningAsProjectMgr(currentUser.role);
  const canSignSm = canSignSolarCleaningAsServiceMgr(currentUser.role);
  const canDelete =
    Boolean(initialRecord) &&
    canManageSolarCleaningRecord({
      userId: currentUser.id,
      userRole: currentUser.role,
      createdById: initialRecord?.createdById,
    });

  const [status, setStatus] = useState<string>(initialRecord?.status || 'Draft');

  const [precheck, setPrecheck] = useState<PrecheckStepFormValues>(() => ({
    companyCode: initialRecord?.companyCode || 'TE',
    projectId: initialRecord?.projectId || null,
    projectName: initialRecord?.projectName || '',
    location: initialRecord?.location || '',
    customerName: initialRecord?.customerName || '',
    customerPhone: initialRecord?.customerPhone || '',
    inspectorNames: initialRecord?.inspectorNames || currentUser.fullName || '',
    systemSizeKwp: initialRecord?.systemSizeKwp || '',
    inspectionRound: initialRecord?.inspectionRound || '',
    inspectionDate:
      toBkkDateInputValue(initialRecord?.inspectionDate) || toBkkDateInputValue(new Date()),

    projectTypes: initialRecord?.projectTypes || [],
    projectTypeOther: initialRecord?.projectTypeOther || '',
    jobTypes: initialRecord?.jobTypes || ['ล้างแผง และตรวจเช็คระบบ'],
    jobTypeOther: initialRecord?.jobTypeOther || '',
    workItems: initialRecord
      ? normalizeWorkItems(initialRecord.workItems)
      : createEmptyWorkItems(),
    additionalDetail: initialRecord?.additionalDetail || '',

    checkInCustomerSignUrl: initialRecord?.checkInCustomerSignUrl || null,
    checkInCustomerName: initialRecord?.checkInCustomerName || '',
    checkInAt: toBkkDateTimeLocalValue(initialRecord?.checkInAt),
    checkOutCustomerSignUrl: initialRecord?.checkOutCustomerSignUrl || null,
    checkOutCustomerName: initialRecord?.checkOutCustomerName || '',
    checkOutAt: toBkkDateTimeLocalValue(initialRecord?.checkOutAt),
    inspectorSignUrl: initialRecord?.inspectorSignUrl || null,
    inspectorSignerName:
      initialRecord?.inspectorSignerName || initialRecord?.inspectorNames || '',
  }));

  const [reportTitle, setReportTitle] = useState<string>(
    initialRecord?.reportTitle || DEFAULT_REPORT_TITLE
  );
  const [reportDate, setReportDate] = useState<string>(
    toBkkDateInputValue(initialRecord?.reportDate || initialRecord?.inspectionDate) ||
      toBkkDateInputValue(new Date())
  );
  const [overallResult, setOverallResult] = useState<InspectionPassStatus>(
    initialRecord?.overallResult === 'NOT_PASS' ? 'NOT_PASS' : 'PASS'
  );
  const [reportData, setReportData] = useState<SolarCleaningReportData>(() =>
    initialRecord ? normalizeReportData(initialRecord.reportData) : createDefaultReportData()
  );

  const [projectMgrSignUrl, setProjectMgrSignUrl] = useState<string | null>(
    initialRecord?.projectMgrSignUrl || null
  );
  const [serviceMgrSignUrl, setServiceMgrSignUrl] = useState<string | null>(
    initialRecord?.serviceMgrSignUrl || null
  );

  const statusMeta = getSolarCleaningStatusMeta(status);
  const totalPhotos = useMemo(() => countReportPhotos(reportData), [reportData]);

  const handleSaveAll = async (targetStatus?: string) => {
    if (!canEdit) return;
    if (!precheck.projectName.trim() || !precheck.customerName.trim()) {
      setFeedback({ type: 'error', text: 'กรุณาระบุชื่อโครงการและชื่อลูกค้าก่อนบันทึก' });
      setActiveStep('precheck');
      return;
    }

    const nextStatus = targetStatus || status;
    const requiresAllRemarks =
      activeStep === 'report' ||
      nextStatus === 'Report Drafting' ||
      nextStatus === 'Pending Manager Sign' ||
      nextStatus === 'Completed';
    if (requiresAllRemarks) {
      const missingPhotoNotes = findMissingReportPhotoNotes(reportData);
      const missingOverallRemark = isOverallRemarkMissing(reportData);
      if (missingPhotoNotes.length > 0 || missingOverallRemark) {
        setShowRemarkErrors(true);
        setActiveStep('report');

        let scrollTargetId = REPORT_OVERALL_REMARK_ELEMENT_ID;
        if (missingPhotoNotes.length > 0) {
          scrollTargetId = missingPhotoNotes[0].id;
          const previewLabels = missingPhotoNotes
            .slice(0, 3)
            .map((m) => m.label)
            .join(', ');
          const suffix =
            missingPhotoNotes.length > 3 ? ` และอีก ${missingPhotoNotes.length - 3} รูป` : '';
          const overallSuffix = missingOverallRemark
            ? ' และกรุณากรอก "ข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม"'
            : '';
          setFeedback({
            type: 'error',
            text: `กรุณาพิมพ์คำอธิบายใต้รูปถ่ายให้ครบทุกรูปที่แนบ (ยังขาด ${missingPhotoNotes.length} รูป: ${previewLabels}${suffix})${overallSuffix}`,
          });
        } else {
          setFeedback({
            type: 'error',
            text: 'กรุณากรอกข้อมูล "ข้อเสนอแนะ / สรุปผลการตรวจสอบระบบโดยรวม" ก่อนบันทึก',
          });
        }

        setTimeout(() => {
          const targetEl = document.getElementById(scrollTargetId);
          targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (
            scrollTargetId === REPORT_OVERALL_REMARK_ELEMENT_ID &&
            targetEl instanceof HTMLTextAreaElement
          ) {
            targetEl.focus({ preventScroll: true });
          }
        }, 60);
        return;
      }
    }
    setShowRemarkErrors(false);

    setIsSaving(true);
    setFeedback(null);
    try {
      const [
        uploadedCheckInSign,
        uploadedCheckOutSign,
        uploadedInspectorSign,
        uploadedPmSign,
        uploadedSmSign,
      ] = await Promise.all([
        uploadDataUrlSignature(precheck.checkInCustomerSignUrl, 'checkin'),
        uploadDataUrlSignature(precheck.checkOutCustomerSignUrl, 'checkout'),
        uploadDataUrlSignature(precheck.inspectorSignUrl, 'inspector'),
        canSignPm
          ? uploadDataUrlSignature(projectMgrSignUrl, 'pm')
          : Promise.resolve(projectMgrSignUrl),
        canSignSm
          ? uploadDataUrlSignature(serviceMgrSignUrl, 'sm')
          : Promise.resolve(serviceMgrSignUrl),
      ]);

      const payload = {
        companyCode: precheck.companyCode,
        status: targetStatus || status,
        projectId: precheck.projectId,
        projectName: precheck.projectName,
        location: precheck.location,
        customerName: precheck.customerName,
        customerPhone: precheck.customerPhone,
        inspectorNames: precheck.inspectorNames,
        systemSizeKwp: precheck.systemSizeKwp,
        inspectionRound: precheck.inspectionRound,
        inspectionDate: precheck.inspectionDate,
        reportDate,

        projectTypes: precheck.projectTypes,
        projectTypeOther: precheck.projectTypeOther,
        jobTypes: precheck.jobTypes,
        jobTypeOther: precheck.jobTypeOther,
        workItems: precheck.workItems,
        additionalDetail: precheck.additionalDetail,
        checkInCustomerSignUrl: uploadedCheckInSign,
        checkInCustomerName: precheck.checkInCustomerName,
        checkInAt: precheck.checkInAt || null,
        checkOutCustomerSignUrl: uploadedCheckOutSign,
        checkOutCustomerName: precheck.checkOutCustomerName,
        checkOutAt: precheck.checkOutAt || null,
        inspectorSignUrl: uploadedInspectorSign,
        inspectorSignerName: precheck.inspectorSignerName,

        reportTitle,
        reportData,
        overallResult,
        projectMgrSignUrl: canSignPm ? uploadedPmSign : undefined,
        serviceMgrSignUrl: canSignSm ? uploadedSmSign : undefined,
      };

      if (initialRecord?.id) {
        const res = await updateSolarCleaningInspection(initialRecord.id, payload);
        if (!res.success) {
          setFeedback({ type: 'error', text: res.error || 'บันทึกไม่สำเร็จ' });
          return;
        }
        if (res.status) setStatus(res.status);
        setPrecheck((prev) => ({
          ...prev,
          checkInCustomerSignUrl: uploadedCheckInSign,
          checkOutCustomerSignUrl: uploadedCheckOutSign,
          inspectorSignUrl: uploadedInspectorSign,
        }));
        if (canSignPm) setProjectMgrSignUrl(uploadedPmSign);
        if (canSignSm) setServiceMgrSignUrl(uploadedSmSign);
        setPdfCacheKey(Date.now());
        setFeedback({ type: 'success', text: 'บันทึกข้อมูลและอัปเดตเอกสารเรียบร้อยแล้ว' });
        router.refresh();
      } else {
        const res = await createSolarCleaningInspection(payload);
        if (!res.success || !res.id) {
          setFeedback({ type: 'error', text: res.error || 'สร้างเอกสารไม่สำเร็จ' });
          return;
        }
        router.push(`/projects/solar-cleaning/${res.id}`);
        router.refresh();
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickManagerSign = async (
    roleType: 'project_manager' | 'service_manager',
    sigUrl: string | null
  ) => {
    if (!initialRecord?.id) return;
    setIsSigningMgr(true);
    setFeedback(null);
    try {
      const finalUrl = await uploadDataUrlSignature(sigUrl, roleType);
      const res = await signSolarCleaningByManager(initialRecord.id, {
        roleType,
        signatureUrl: finalUrl,
      });
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'บันทึกลายเซ็นไม่สำเร็จ' });
        return;
      }
      if (roleType === 'project_manager') setProjectMgrSignUrl(finalUrl);
      else setServiceMgrSignUrl(finalUrl);
      if (res.status) setStatus(res.status);
      setPdfCacheKey(Date.now());
      setFeedback({
        type: 'success',
        text:
          roleType === 'project_manager'
            ? 'ลงนามรับรองในฐานะ Project Manager เรียบร้อยแล้ว'
            : 'ลงนามรับรองในฐานะ Service Manager เรียบร้อยแล้ว',
      });
      router.refresh();
    } finally {
      setIsSigningMgr(false);
    }
  };

  const handleDelete = async () => {
    if (!initialRecord?.id) return;
    setIsDeleting(true);
    try {
      const res = await deleteSolarCleaningInspection(initialRecord.id);
      if (!res.success) {
        setIsDeleteConfirmOpen(false);
        setFeedback({ type: 'error', text: res.error || 'ลบไม่สำเร็จ' });
        return;
      }
      router.push('/projects/solar-cleaning');
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const openPdf = (type: 'system-check' | 'inspection-report') => {
    if (!initialRecord?.id) {
      setFeedback({
        type: 'error',
        text: 'กรุณากด "บันทึกเอกสาร" ก่อนสร้างไฟล์ PDF',
      });
      return;
    }
    setPdfCacheKey(Date.now());
    setPdfPreviewType(type);
  };

  return (
    <div className="p-3 sm:p-5 md:p-8 pb-28 max-w-[1440px] w-full mx-auto space-y-5">
      {/* ── Top Action Header ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/projects/solar-cleaning"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition"
              >
                <ArrowLeft size={13} />
                <span>หน้ารวมล้างแผง &amp; ตรวจเช็ค</span>
              </Link>
              <span className="font-mono font-black px-2.5 py-1 rounded-lg bg-gray-900 text-white">
                {initialRecord?.docNumber || 'สร้างเอกสารใหม่'}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">
              {precheck.projectName || 'ใบตรวจเช็คระบบ & Inspection Report ล้างแผงโซลาร์รูฟ'}
            </h1>
            <p className="text-xs text-gray-500 truncate">
              ลูกค้า: {precheck.customerName || '-'} • รูปถ่าย Report {totalPhotos} รูป
              {initialRecord?.createdBy?.fullName
                ? ` • ผู้สร้าง: ${initialRecord.createdBy.fullName}`
                : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openPdf('system-check')}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileText size={14} className="text-[#ff2301] shrink-0" />
              <span className="truncate">PDF ใบตรวจเช็ค</span>
            </button>

            <button
              type="button"
              onClick={() => openPdf('inspection-report')}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileText size={14} className="text-blue-600 shrink-0" />
              <span className="truncate">PDF Report</span>
            </button>

            {canDelete && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="h-10 inline-flex items-center justify-center gap-1.5 px-3 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>ลบ</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveAll()}
                className={`h-10 inline-flex items-center justify-center gap-1.5 px-4 bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 ${
                  !canDelete ? 'col-span-2 sm:col-span-1' : ''
                }`}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Selector (for team coordination) & Feedback */}
        {canEdit && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-gray-500">สถานะเอกสาร:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 bg-gray-50 text-base sm:text-xs font-bold text-gray-800 outline-none"
              >
                <option value="Draft">1. เตรียมเอกสาร (Draft)</option>
                <option value="Precheck Ready">2. พร้อมเข้าหน้างาน (รอลูกค้าเซ็น)</option>
                <option value="Customer Signed">3. ลูกค้าเซ็นแล้ว (รอทำ Report)</option>
                <option value="Report Drafting">4. กำลังจัดทำ Inspection Report</option>
                <option value="Pending Manager Sign">5. ส่งให้แมเนเจอร์โปรเจค &amp; เซอร์วิสเซ็น</option>
                <option value="Completed">6. เสร็จสมบูรณ์</option>
              </select>
            </div>

            {initialRecord?.id && status !== 'Pending Manager Sign' && status !== 'Completed' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveAll('Pending Manager Sign')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition"
              >
                <Send size={13} />
                <span>
                  {(() => {
                    const m = resolveManagerSignConfig(reportData.managerSignMode).mode;
                    if (m === 'PM') return 'ส่งให้ Project Manager เซ็นรับรอง';
                    if (m === 'SM') return 'ส่งให้ Service Manager เซ็นรับรอง';
                    if (m === 'ANY') return 'ส่งให้ PM หรือ Service Mgr เซ็นรับรอง';
                    return 'ส่งให้ PM & Service Mgr เซ็นรับรอง';
                  })()}
                </span>
              </button>
            )}
          </div>
        )}

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* ── Symmetrical 2-Step Segmented Navigation ── */}
      <div className="bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveStep('precheck')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeStep === 'precheck'
              ? 'bg-white text-[#ff2301] border border-red-200 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
          }`}
        >
          <ClipboardCheck size={17} className="shrink-0" />
          <span>ขั้นที่ 1: แบบตรวจเช็คระบบ (ใบให้ลูกค้าเซ็นหน้างาน)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep('report')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeStep === 'report'
              ? 'bg-white text-[#ff2301] border border-red-200 shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
          }`}
        >
          <Camera size={17} className="shrink-0" />
          <span>ขั้นที่ 2: Inspection Report &amp; ลายเซ็นผู้จัดการ ({totalPhotos} รูป)</span>
        </button>
      </div>

      {/* ── Active Step Content ── */}
      {activeStep === 'precheck' ? (
        <SolarCleaningPrecheckStep
          value={precheck}
          onChange={(updater) => setPrecheck(updater)}
          projects={projects}
          customers={customerOptions}
          onCustomerAdded={(added) =>
            setCustomerOptions((prev) => {
              const filtered = prev.filter(
                (c) =>
                  c.id !== added.id &&
                  c.companyName.trim().toLowerCase() !== added.companyName.trim().toLowerCase()
              );
              return [added, ...filtered];
            })
          }
          currentUserFullName={currentUser.fullName}
          readOnly={!canEdit}
        />
      ) : (
        <SolarCleaningReportStep
          reportTitle={reportTitle}
          reportDate={reportDate}
          overallResult={overallResult}
          reportData={reportData}
          onMetaChange={(patch) => {
            if (patch.reportTitle !== undefined) setReportTitle(patch.reportTitle);
            if (patch.reportDate !== undefined) setReportDate(patch.reportDate);
            if (patch.overallResult !== undefined) setOverallResult(patch.overallResult);
          }}
          onReportChange={(updater) => setReportData(updater)}
          readOnly={!canEdit}
          showRemarkErrors={showRemarkErrors}
          projectMgrSignUrl={projectMgrSignUrl}
          projectMgrName={initialRecord?.projectMgrName}
          projectMgrSignedAt={
            initialRecord?.projectMgrSignedAt ? String(initialRecord.projectMgrSignedAt) : null
          }
          serviceMgrSignUrl={serviceMgrSignUrl}
          serviceMgrName={initialRecord?.serviceMgrName}
          serviceMgrSignedAt={
            initialRecord?.serviceMgrSignedAt ? String(initialRecord.serviceMgrSignedAt) : null
          }
          canSignProjectMgr={canSignPm}
          canSignServiceMgr={canSignSm}
          isSigningManager={isSigningMgr}
          onQuickManagerSign={handleQuickManagerSign}
          onDirectManagerSignChange={(roleType, nextUrl) => {
            if (roleType === 'project_manager') setProjectMgrSignUrl(nextUrl);
            else setServiceMgrSignUrl(nextUrl);
          }}
          currentUserFullName={currentUser.fullName}
          recordId={initialRecord?.id}
        />
      )}

      {/* ── Sticky Bottom Action Bar ── */}
      {canEdit && (
        <div className="bg-white/95 backdrop-blur-xs border border-gray-200 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="text-xs text-gray-500">
            บันทึกข้อมูลแล้วสามารถกดออก PDF ได้ทั้ง <strong>ใบตรวจเช็คระบบ</strong> และ{' '}
            <strong>Inspection Report</strong>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {activeStep === 'precheck' ? (
              <button
                type="button"
                onClick={() => setActiveStep('report')}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold cursor-pointer"
              >
                ไปขั้นตอน Inspection Report &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveStep('precheck')}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold cursor-pointer"
              >
                &larr; กลับไปแบบตรวจเช็คระบบ
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveAll()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกเอกสารทั้งหมด'}</span>
            </button>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && initialRecord?.id && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">ยืนยันการลบเอกสาร</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ต้องการลบเอกสาร {initialRecord.docNumber} ใช่หรือไม่ การลบจะไม่สามารถกู้คืนได้
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="h-10 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="h-10 inline-flex items-center gap-1.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบเอกสาร'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfPreviewType && initialRecord?.id && (
        <SolarCleaningPdfModal
          recordId={initialRecord.id}
          docNumber={initialRecord.docNumber}
          customerName={precheck.customerName}
          pdfType={pdfPreviewType}
          cacheKey={pdfCacheKey}
          onClose={() => setPdfPreviewType(null)}
        />
      )}
    </div>
  );
}

