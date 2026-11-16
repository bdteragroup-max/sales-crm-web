'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Home,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  Loader2,
  Locate,
  MapPin,
  PenTool,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import SearchableSelect from '@/app/components/SearchableSelect';
import { createCompanyForSurvey, getSiteSurveyById } from '@/app/actions/siteSurveys';
import {
  REQUIRED_CHECKLIST_ITEMS,
  ROOF_PATTERN_LABELS,
  ROOF_TYPES,
  SOLAR_REASONS,
  SURVEY_DOC_PRESETS,
  SURVEY_PHOTO_PRESETS,
  SURVEY_STATUS_OPTIONS,
  TARIFF_OPTIONS,
  canEditSalesSurveyRole,
  canEstimateSurveyRole,
  computeSurveyCompleteness,
  extractAttachmentFilename,
  formatNum,
  getElectricityBillUrl,
  getEstimationStatusMeta,
  getSurveyCompanyMeta,
  getSurveyStatusMeta,
  isImageAttachmentUrl,
  isPdfAttachmentUrl,
  isSpreadsheetAttachmentUrl,
  normalizeSurveyCompanyCode,
  parseNullableFloat,
  parseNullableInt,
  SURVEY_COMPANY_OPTIONS,
} from '@/app/lib/surveyMetadata';
import { ProjectEstimationCard, ReadOnlySurveySections } from './SurveyEngineeringSummary';
import SurveyPdfPreviewModal from './SurveyPdfPreviewModal';
import SurveySignatureBox, { rememberSignatureInStorage } from './SurveySignatureBox';
import SurveySelect from './SurveySelect';

type Props = {
  surveyId: string | null;
  companies: any[];
  salesReps: any[];
  currentUser: any;
  onSuccess: () => void;
  onSaved?: (savedSurvey: any) => void;
};

function buildInitialFormData(currentUser: any) {
  return {
    surveyNumber: 'สร้างอัตโนมัติเมื่อบันทึก',
    surveyDate: format(new Date(), 'yyyy-MM-dd'),
    companyCode: 'TE',
    companyId: '',
    customerName: '',
    projectName: '',
    projectLocation: '',
    coordinatorName: '',
    coordinatorPhone: '',
    salespersonId: currentUser?.id || '',
    surveyorName: currentUser?.fullName || '',
    status: 'Draft',
    version: 1,
    latitude: null as number | null,
    longitude: null as number | null,
    hasSingleLineDiagram: false,
    requiredInfoChecklist: [] as string[],
    amrCustomerCode: '',
    loadProfileFileUrl: '',
    roofStructureFileUrl: '',
    buildingPlanFileUrl: '',
    buildingElectricalFileUrl: '',
    electricalCabinetFileUrl: '',
    additionalRemark: '',
    estimatedPrice: null as number | null,
    estimationNote: '',
    estimatedByUserId: '',
    estimatedAt: null as string | null,
    estimationStatus: null as string | null,
    salesSignatureUrl: null as string | null,
    salesSignedAt: null as string | null,
    projectSignatureUrl: null as string | null,
    projectSignedAt: null as string | null,
    usageBehavior: {},
    electricalProfile: {},
    tariffSelection: { tiers: [] },
    structure: { roofAges: [], roofType: [] },
    qa: { solarReasons: [] },
    photos: [],
    documents: [],
    electricityBill: null as any,
  };
}

function hydrateSurveyData(d: any) {
  return {
    ...d,
    surveyDate: d.surveyDate ? format(new Date(d.surveyDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    companyCode: normalizeSurveyCompanyCode(d.companyCode),
    companyId: d.companyId || '',
    coordinatorName: d.coordinatorName || '',
    coordinatorPhone: d.coordinatorPhone || '',
    surveyorName: d.surveyorName || '',
    projectName: d.projectName || '',
    projectLocation: d.projectLocation || '',
    amrCustomerCode: d.amrCustomerCode || '',
    additionalRemark: d.additionalRemark || '',
    usageBehavior: d.usageBehavior || {},
    electricalProfile: d.electricalProfile || {},
    tariffSelection: d.tariffSelection || { tiers: [] },
    structure: d.structure || { roofAges: [], roofType: [] },
    qa: d.qa || { solarReasons: [] },
    photos: d.photos || [],
    documents: d.documents || [],
    electricityBill: d.electricityBill || null,
    salesSignatureUrl: d.salesSignatureUrl || null,
    salesSignedAt: d.salesSignedAt || null,
    projectSignatureUrl: d.projectSignatureUrl || null,
    projectSignedAt: d.projectSignedAt || null,
  };
}

export default function SiteSurveyForm({
  surveyId,
  companies,
  salesReps,
  currentUser,
  onSuccess,
  onSaved,
}: Props) {
  const router = useRouter();
  const canEstimate = canEstimateSurveyRole(currentUser?.role);
  const canEditSales = canEditSalesSurveyRole(currentUser?.role);

  const [loading, setLoading] = useState<boolean>(Boolean(surveyId));
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [localCompanies, setLocalCompanies] = useState(companies);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [conflictError, setConflictError] = useState<{ currentVersion: number; message: string } | null>(null);

  const [formData, setFormData] = useState<any>(() => buildInitialFormData(currentUser));
  const [pdfPreviewState, setPdfPreviewState] = useState<{ id: string; cacheKey: number } | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    getSiteSurveyById(surveyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setFormData(hydrateSurveyData(res.data));
          setIsDirty(false);
        } else {
          setError(res.error || 'ไม่สามารถโหลดข้อมูลแบบสำรวจได้');
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const reloadLatestSurvey = async (id: string) => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const res = await getSiteSurveyById(id);
      if (res.success && res.data) {
        setFormData(hydrateSurveyData(res.data));
        setIsDirty(false);
      } else {
        setError(res.error || 'Failed to load survey');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((curr) => (curr === msg ? null : curr)), 4000);
  };

  const updateField = (field: string, value: any, section?: string) => {
    setIsDirty(true);
    if (section) {
      setFormData((prev: any) => ({
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [field]: value,
        },
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
    index?: number,
    keyName?: string
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = '';

    const uploadId = `${fieldName}-${index ?? 'root'}`;
    setUploadingKey(uploadId);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();

      if (data.success && data.url) {
        if (fieldName === 'electricityBill') {
          setIsDirty(true);
          setFormData((prev: any) => {
            const currObj =
              prev.electricityBill && typeof prev.electricityBill === 'object' ? prev.electricityBill : {};
            return {
              ...prev,
              electricityBill: {
                ...currObj,
                fileUrl: data.url,
              },
            };
          });
        } else if (index === undefined) {
          updateField(fieldName, data.url);
        } else if (keyName) {
          setIsDirty(true);
          setFormData((prev: any) => {
            const arr = [...(prev[fieldName] || [])];
            arr[index] = { ...arr[index], [keyName]: data.url };
            return { ...prev, [fieldName]: arr };
          });
        }
        showToast('อัปโหลดไฟล์สำเร็จ');
      } else {
        setError('อัปโหลดไฟล์ไม่สำเร็จ: ' + (data.error || 'Unknown error'));
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadSignatureDataUrlIfNeeded = async (
    sigValue: string | null | undefined,
    roleTag: string
  ): Promise<string | null> => {
    if (!sigValue) return null;
    if (!sigValue.startsWith('data:image/')) return sigValue;
    try {
      const resp = await fetch(sigValue);
      const blob = await resp.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `survey-signature-${roleTag}-${Date.now()}.${ext}`, {
        type: blob.type || 'image/png',
      });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'uploadsService');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (uploadRes.ok && uploadJson?.success && uploadJson?.url) {
        return uploadJson.url;
      }
    } catch {
      // Fallback gracefully to data URL
    }
    return sigValue;
  };

  const performSave = async (
    overrides: Record<string, any> = {},
    options: {
      forceOverwrite?: boolean;
      navigateBack?: boolean;
      openPdfAfter?: boolean;
      successMessage?: string;
    } = {}
  ) => {
    setSaving(true);
    setError(null);
    setConflictError(null);

    try {
      const merged = {
        ...formData,
        ...overrides,
      };

      if (!merged.salespersonId) {
        throw new Error('กรุณาเลือกเซลส์ผู้ดูแลก่อนบันทึก');
      }

      if (merged.salesSignatureUrl?.startsWith('data:image/')) {
        merged.salesSignatureUrl = await uploadSignatureDataUrlIfNeeded(merged.salesSignatureUrl, 'sales');
        rememberSignatureInStorage(currentUser?.fullName, merged.salesSignatureUrl);
      }
      if (merged.projectSignatureUrl?.startsWith('data:image/')) {
        merged.projectSignatureUrl = await uploadSignatureDataUrlIfNeeded(merged.projectSignatureUrl, 'project');
        rememberSignatureInStorage(currentUser?.fullName, merged.projectSignatureUrl);
      }

      if (options.forceOverwrite && conflictError) {
        merged.version = conflictError.currentVersion;
      }

      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setConflictError({ currentVersion: data.currentVersion, message: data.error });
        setSaving(false);
        return null;
      }

      if (!res.ok) {
        throw new Error(data.details || data.error || 'บันทึกแบบสำรวจไม่สำเร็จ');
      }

      const hydrated = hydrateSurveyData(data);
      setFormData(hydrated);
      setIsDirty(false);
      onSaved?.(hydrated);
      router.refresh();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('site-survey-updated'));
      }

      if (options.successMessage) {
        showToast(options.successMessage);
      }

      if (options.openPdfAfter && hydrated.id) {
        setPdfPreviewState({ id: hydrated.id, cacheKey: Date.now() });
      } else if (options.navigateBack) {
        onSuccess();
      }

      return hydrated;
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOrSyncPdf = async (pendingOverrides?: Record<string, any>) => {
    const validOverrides =
      pendingOverrides && typeof pendingOverrides === 'object' && !('nativeEvent' in pendingOverrides)
        ? pendingOverrides
        : {};
    const hasPending = Object.keys(validOverrides).length > 0;
    if (!formData.id || isDirty || hasPending) {
      await performSave(validOverrides, {
        openPdfAfter: true,
        successMessage: 'บันทึกข้อมูลล่าสุดแล้ว กำลังสร้าง PDF...',
      });
    } else {
      setPdfPreviewState({ id: formData.id, cacheKey: Date.now() });
    }
  };

  const handleCreateCompany = async (name: string) => {
    setIsCreatingCompany(true);
    try {
      const res = await createCompanyForSurvey(name);
      if (res.success && res.data) {
        setLocalCompanies((prev) => [...prev, res.data]);
        updateField('companyId', res.data.id);
        updateField('customerName', res.data.companyName);
      } else {
        setError(res.error || 'Failed to create company');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField('latitude', position.coords.latitude);
        updateField('longitude', position.coords.longitude);
        showToast('ดึงพิกัด GPS ปัจจุบันสำเร็จ');
      },
      () => {
        setError('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาตรวจสอบการอนุญาต Location ของเบราว์เซอร์');
      }
    );
  };

  const completeness = useMemo(() => computeSurveyCompleteness(formData), [formData]);
  const companyMeta = getSurveyCompanyMeta(formData.companyCode);
  const statusMeta = getSurveyStatusMeta(formData.status);
  const estMeta = getEstimationStatusMeta(formData.estimationStatus);

  // Sales sees estimation card/badges ONLY after Project / Admin Project has completed estimation
  const showEstimationCard = canEstimate || formData.estimationStatus === 'Estimated';

  const usage = formData.usageBehavior || {};
  const elec = formData.electricalProfile || {};
  const struct = formData.structure || {};

  // Tariff totals calculation
  const tariffTiers: any[] = formData.tariffSelection?.tiers || [];
  const tariffTotalKwh = tariffTiers.reduce((acc, t) => acc + (Number(t.qtyKwhPerMonth) || 0), 0);
  const tariffTotalBaht = tariffTiers.reduce(
    (acc, t) => acc + (Number(t.ratePerKwh) || 0) * (Number(t.qtyKwhPerMonth) || 0),
    0
  );
  const tariffBlendedRate = tariffTotalKwh > 0 ? Number((tariffTotalBaht / tariffTotalKwh).toFixed(4)) : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-[#ff2301] animate-spin mb-4" />
        <p className="text-gray-600 font-medium">กำลังโหลดข้อมูลแบบสำรวจ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3.5 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 text-[#ff2301] border border-red-200">
                {formData.surveyNumber}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${companyMeta.badgeClass}`}>
                {companyMeta.code} • {companyMeta.shortName}
              </span>
              {formData.id && (
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  v.{formData.version}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
                {statusMeta.shortLabel}
              </span>
              {showEstimationCard && formData.estimationStatus && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${estMeta.badgeClass}`}>
                  {estMeta.label}
                  {formData.estimatedPrice ? ` • ฿${formatNum(formData.estimatedPrice)}` : ''}
                </span>
              )}
              {isDirty && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ยังไม่บันทึกการแก้ไข
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-xl font-bold text-gray-900 break-words">
              {formData.customerName ||
                formData.projectName ||
                (surveyId ? 'รายละเอียดแบบสำรวจไซต์งาน' : 'สร้างแบบสำรวจไซต์งานใหม่')}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>
                ความครบถ้วน:{' '}
                <strong className="text-gray-800">
                  {completeness.completedCount}/{completeness.total} หมวด ({completeness.percent}%)
                </strong>
              </span>
              {formData.projectName && (
                <span className="break-words">
                  โปรเจกต์: <strong className="text-gray-700">{formData.projectName}</strong>
                </span>
              )}
              {formData.salesperson?.fullName && (
                <span>
                  เซลส์: <strong className="text-gray-700">{formData.salesperson.fullName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleOpenOrSyncPdf()}
              className={`${
                canEditSales ? 'col-span-1' : 'col-span-2'
              } inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer disabled:opacity-50 min-h-[42px]`}
            >
              <FileText className="w-4 h-4 text-[#ff2301] shrink-0" />
              <span className="truncate">{!formData.id ? 'บันทึก & สร้าง PDF' : isDirty ? 'บันทึก & ดู PDF' : 'ดู / ดาวน์โหลด PDF'}</span>
            </button>

            {canEditSales && (
              <>
                <button
                  type="button"
                  disabled={saving || !!conflictError}
                  onClick={() =>
                    performSave({}, { navigateBack: false, successMessage: 'บันทึกข้อมูลแบบสำรวจเรียบร้อยแล้ว' })
                  }
                  className="col-span-1 inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer min-h-[42px]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                  <span>บันทึกข้อมูล</span>
                </button>

                {formData.status !== 'Pending Estimate' && formData.status !== 'Estimated' && (
                  <button
                    type="button"
                    disabled={saving || !!conflictError}
                    onClick={() =>
                      performSave(
                        {
                          status: 'Pending Estimate',
                          estimationStatus: formData.estimationStatus || 'Pending',
                        },
                        {
                          navigateBack: false,
                          successMessage: 'ส่งข้อมูลให้ทีมโปรเจคประเมินราคาแล้ว',
                        }
                      )
                    }
                    className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff2301] hover:bg-red-700 disabled:bg-red-300 text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer min-h-[42px]"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>ส่งให้โปรเจคประเมิน</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-2 text-sm font-medium shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {conflictError && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-orange-800">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">ตรวจพบการแก้ไขพร้อมกัน (Version Conflict)</h3>
              <p className="text-xs mt-1">
                มีผู้ใช้งานอื่นบันทึกข้อมูลเวอร์ชัน {conflictError.currentVersion} ไปก่อนหน้า (หน้าจอคุณอยู่ที่เวอร์ชัน{' '}
                {formData.version})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => reloadLatestSurvey(surveyId!)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-orange-300 text-orange-700 px-3.5 py-2 rounded-lg hover:bg-orange-100 text-xs font-bold cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4" /> โหลดข้อมูลล่าสุด
            </button>
            <button
              type="button"
              onClick={() =>
                performSave({}, { forceOverwrite: true, successMessage: 'บันทึกทับข้อมูลเรียบร้อยแล้ว' })
              }
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-600 text-white px-3.5 py-2 rounded-lg hover:bg-orange-700 text-xs font-bold cursor-pointer"
            >
              <Check className="w-4 h-4" /> ยืนยันบันทึกทับ
            </button>
          </div>
        </div>
      )}

      {error && !conflictError && (
        <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Key Highlights Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-medium text-gray-500 flex items-center justify-between gap-1">
            <span className="truncate">ค่าไฟเฉลี่ย / เดือน</span>
            <DollarSign className="w-4 h-4 text-red-500 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-gray-900 mt-1 truncate">
            {usage.avgBillThbPerMonth ? `฿${formatNum(usage.avgBillThbPerMonth)}` : 'ยังไม่ระบุ'}
          </div>
          <div className="text-[11px] sm:text-xs text-gray-500 mt-1 truncate">
            กลางวัน/กลางคืน: <span className="font-semibold text-gray-700">{usage.dayNightRatio || '-'}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-medium text-gray-500 flex items-center justify-between gap-1">
            <span className="truncate">ระบบไฟฟ้า & หม้อแปลง</span>
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-gray-900 mt-1 truncate">
            {elec.gridProvider || '-'} {elec.transformerKva ? `• ${formatNum(elec.transformerKva)} kVA` : ''}
          </div>
          <div className="text-[11px] sm:text-xs text-gray-500 mt-1 truncate">
            {(elec.voltageLevel || []).join(', ') || 'ยังไม่ระบุแรงดันไฟ'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-medium text-gray-500 flex items-center justify-between gap-1">
            <span className="truncate">หลังคา & ขนาดพื้นที่</span>
            <Home className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-gray-900 mt-1 truncate">
            {(struct.roofType || []).join(', ') || 'ยังไม่ระบุชนิดหลังคา'}
          </div>
          <div className="text-[11px] sm:text-xs text-gray-500 mt-1 truncate">
            พื้นที่: <span className="font-semibold text-gray-700">{struct.roofDimWxlM || '-'}</span>
            {struct.buildingHeightM ? ` • สูง ${struct.buildingHeightM} ม.` : ''}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-medium text-gray-500 flex items-center justify-between gap-1">
            <span className="truncate">ความครบถ้วน</span>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${completeness.percent === 100 ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base sm:text-lg font-bold text-gray-900">
              {completeness.completedCount}/{completeness.total} หมวด
            </span>
            <span className="text-xs font-bold text-[#ff2301]">({completeness.percent}%)</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#ff2301] rounded-full transition-all"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area: Single Scrollable Page (+ Right Estimation Card ONLY if allowed or Estimated) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={showEstimationCard ? 'lg:col-span-8 space-y-6' : 'lg:col-span-12 space-y-6'}>
          {!canEditSales ? (
            /* Pure Project / Engineering View: Clean Scannable Read-Only Overview on One Page */
            <ReadOnlySurveySections formData={formData} />
          ) : (
            /* Sales / Executive / Super Admin View: All 7 Sections Editable in One Scrollable Page */
            <div className="space-y-6">
              {/* SECTION 1: Project Info */}
              <section
                id="survey-sec-project"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      1. ข้อมูลโครงการ ลูกค้า และผู้ประสานงาน
                    </h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'project')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      กรอกแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      บริษัทผู้ออกเอกสาร / หัวรายงาน PDF (TP / TG / TE)
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {SURVEY_COMPANY_OPTIONS.map((comp) => {
                        const isSelected = companyMeta.code === comp.code;
                        return (
                          <button
                            key={comp.code}
                            type="button"
                            onClick={() => updateField('companyCode', comp.code)}
                            aria-pressed={isSelected}
                            className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border text-center sm:text-left transition cursor-pointer ${
                              isSelected
                                ? 'border-[#ff2301] bg-red-50/40 ring-2 ring-[#ff2301]/15 shadow-2xs'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                            }`}
                          >
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white border border-gray-100 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                              <Image
                                src={comp.logoUrl}
                                alt={comp.enName}
                                width={44}
                                height={44}
                                unoptimized
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 flex-1 w-full">
                              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold tracking-wide border ${comp.badgeClass}`}
                                >
                                  {comp.code}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-[#ff2301] shrink-0 hidden sm:inline" />
                                )}
                              </div>
                              <div className="text-[11px] sm:text-xs font-bold text-gray-900 mt-1 truncate">
                                {comp.shortName}
                              </div>
                              <div className="hidden md:block text-[11px] text-gray-500 truncate">
                                {comp.enName}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เลขที่แบบสำรวจ</label>
                    <input
                      type="text"
                      value={formData.surveyNumber}
                      readOnly
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-gray-50 text-base sm:text-sm font-mono text-gray-700 min-h-[42px] sm:min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">วันที่สำรวจ</label>
                    <input
                      type="date"
                      value={formData.surveyDate}
                      onChange={(e) => updateField('surveyDate', e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none min-h-[42px] sm:min-h-[38px] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">สถานะงานสำรวจ</label>
                    <SurveySelect
                      value={formData.status}
                      onChange={(val) => updateField('status', val)}
                      options={SURVEY_STATUS_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      ลูกค้า (อ้างอิงจากระบบ CRM) <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={formData.companyId || ''}
                      onChange={(val) => {
                        const comp = localCompanies.find((c) => c.id === val);
                        updateField('companyId', val);
                        if (comp) {
                          updateField('customerName', comp.companyName);
                          if (!formData.projectLocation) {
                            const locParts = [];
                            if (comp.address) locParts.push(comp.address);
                            if (comp.subDistrict) locParts.push(`ต.${comp.subDistrict}`);
                            if (comp.district) locParts.push(`อ.${comp.district}`);
                            if (comp.province) locParts.push(`จ.${comp.province}`);
                            if (comp.postalCode) locParts.push(comp.postalCode);
                            const locString = locParts.join(' ');
                            if (locString) updateField('projectLocation', locString);
                          }
                        }
                      }}
                      options={localCompanies.map((c) => ({ label: c.companyName, value: c.id }))}
                      placeholder="-- ค้นหาหรือพิมพ์ชื่อลูกค้าใหม่ --"
                      onCreate={handleCreateCompany}
                      isCreating={isCreatingCompany}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อลูกค้าที่แสดงในเอกสาร</label>
                    <input
                      type="text"
                      value={formData.customerName || ''}
                      onChange={(e) => updateField('customerName', e.target.value)}
                      placeholder="ระบุหรือแก้ชื่อลูกค้าที่จะพิมพ์ใน PDF"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อโครงการ / อาคาร</label>
                    <input
                      type="text"
                      value={formData.projectName || ''}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      placeholder="เช่น โรงงาน A, โซลาร์รูฟท็อปอาคาร 2"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ผู้ประสานงานหน้างาน</label>
                    <input
                      type="text"
                      value={formData.coordinatorName || ''}
                      onChange={(e) => updateField('coordinatorName', e.target.value)}
                      placeholder="ชื่อผู้ติดต่อหน้างาน"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เบอร์โทรผู้ประสานงาน</label>
                    <input
                      type="text"
                      value={formData.coordinatorPhone || ''}
                      onChange={(e) => updateField('coordinatorPhone', e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1">สถานที่ตั้งโครงการ</label>
                    <textarea
                      value={formData.projectLocation || ''}
                      onChange={(e) => updateField('projectLocation', e.target.value)}
                      placeholder="ที่อยู่สถานที่ติดตั้ง"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เซลส์ผู้ดูแล</label>
                    <SurveySelect
                      value={formData.salespersonId || ''}
                      onChange={(val) => updateField('salespersonId', val)}
                      placeholder="-- เลือกเซลส์ --"
                      options={[
                        { value: '', label: '-- เลือกเซลส์ --' },
                        ...salesReps.map((s) => ({
                          value: s.id,
                          label: s.fullName,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ผู้สำรวจหน้างาน (Surveyor)</label>
                    <input
                      type="text"
                      value={formData.surveyorName || ''}
                      onChange={(e) => updateField('surveyorName', e.target.value)}
                      placeholder="ชื่อผู้ลงพื้นที่สำรวจ"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude ?? ''}
                        onChange={(e) => updateField('latitude', parseNullableFloat(e.target.value))}
                        placeholder="13.7563"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude ?? ''}
                        onChange={(e) => updateField('longitude', parseNullableFloat(e.target.value))}
                        placeholder="100.5018"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px]"
                    >
                      <Locate className="w-4 h-4 text-[#ff2301]" />
                      ดึงพิกัด GPS ปัจจุบัน
                    </button>
                    {typeof formData.latitude === 'number' && typeof formData.longitude === 'number' && (
                      <a
                        href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-red-50 hover:bg-red-100 text-[#ff2301] rounded-xl text-xs font-bold border border-red-200 transition min-h-[40px]"
                      >
                        <MapPin className="w-4 h-4" />
                        เปิดดูตำแหน่งใน Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 2: Usage Behavior */}
              <section
                id="survey-sec-behavior"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">2. พฤติกรรมการใช้พลังงานของลูกค้า</h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'behavior')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      กรอกแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เวลาทำงาน (Working Hours)</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
                        <SurveySelect
                          compact
                          centerLabel
                          value={(formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[0] || '08'}
                          onChange={(val) => {
                            const currentStartMin = (formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[1] || '00';
                            const end = (formData.usageBehavior?.workingHours || '').split(' - ')[1] || '17:00';
                            updateField('workingHours', `${val}:${currentStartMin} - ${end}`, 'usageBehavior');
                          }}
                          options={Array.from({ length: 24 }, (_, i) => {
                            const h = i.toString().padStart(2, '0');
                            return { value: h, label: h };
                          })}
                        />
                        <span className="text-gray-400 font-bold text-xs">:</span>
                        <SurveySelect
                          compact
                          centerLabel
                          value={(formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[1] || '00'}
                          onChange={(val) => {
                            const currentStartHour = (formData.usageBehavior?.workingHours || '').split(' - ')[0]?.split(':')[0] || '08';
                            const end = (formData.usageBehavior?.workingHours || '').split(' - ')[1] || '17:00';
                            updateField('workingHours', `${currentStartHour}:${val} - ${end}`, 'usageBehavior');
                          }}
                          options={['00', '15', '30', '45'].map((m) => ({ value: m, label: m }))}
                        />
                      </div>
                      <span className="text-gray-500 text-xs font-bold px-0.5">ถึง</span>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
                        <SurveySelect
                          compact
                          centerLabel
                          value={(formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[0] || '17'}
                          onChange={(val) => {
                            const start = (formData.usageBehavior?.workingHours || '').split(' - ')[0] || '08:00';
                            const currentEndMin = (formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[1] || '00';
                            updateField('workingHours', `${start} - ${val}:${currentEndMin}`, 'usageBehavior');
                          }}
                          options={Array.from({ length: 24 }, (_, i) => {
                            const h = i.toString().padStart(2, '0');
                            return { value: h, label: h };
                          })}
                        />
                        <span className="text-gray-400 font-bold text-xs">:</span>
                        <SurveySelect
                          compact
                          centerLabel
                          value={(formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[1] || '00'}
                          onChange={(val) => {
                            const start = (formData.usageBehavior?.workingHours || '').split(' - ')[0] || '08:00';
                            const currentEndHour = (formData.usageBehavior?.workingHours || '').split(' - ')[1]?.split(':')[0] || '17';
                            updateField('workingHours', `${start} - ${currentEndHour}:${val}`, 'usageBehavior');
                          }}
                          options={['00', '15', '30', '45'].map((m) => ({ value: m, label: m }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">สัดส่วนใช้ไฟ กลางวัน/กลางคืน</label>
                    <input
                      type="text"
                      placeholder="เช่น 70/30"
                      value={formData.usageBehavior?.dayNightRatio || ''}
                      onChange={(e) => updateField('dayNightRatio', e.target.value, 'usageBehavior')}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ค่าไฟเฉลี่ยต่อเดือน (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.usageBehavior?.avgBillThbPerMonth ?? ''}
                      onChange={(e) => updateField('avgBillThbPerMonth', parseNullableFloat(e.target.value), 'usageBehavior')}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">วันทำงานต่อสัปดาห์ (วัน)</label>
                    <input
                      type="number"
                      value={formData.usageBehavior?.workingDaysPerWeek ?? ''}
                      onChange={(e) => updateField('workingDaysPerWeek', parseNullableInt(e.target.value), 'usageBehavior')}
                      placeholder="เช่น 6"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">วันหยุดต่อสัปดาห์ (วัน)</label>
                    <input
                      type="number"
                      value={formData.usageBehavior?.nonWorkingDaysPerWeek ?? ''}
                      onChange={(e) => updateField('nonWorkingDaysPerWeek', parseNullableInt(e.target.value), 'usageBehavior')}
                      placeholder="เช่น 1"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">วันทำงาน/ปี</label>
                      <input
                        type="number"
                        value={formData.usageBehavior?.workingDaysPerYear ?? ''}
                        onChange={(e) => updateField('workingDaysPerYear', parseNullableInt(e.target.value), 'usageBehavior')}
                        placeholder="300"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">วันหยุด/ปี</label>
                      <input
                        type="number"
                        value={formData.usageBehavior?.nonWorkingDaysPerYear ?? ''}
                        onChange={(e) => updateField('nonWorkingDaysPerYear', parseNullableInt(e.target.value), 'usageBehavior')}
                        placeholder="13"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1">เครื่องจักร / อุปกรณ์ไฟฟ้าหลัก (Main Equipment)</label>
                    <textarea
                      placeholder="เช่น Chiller, Air compressor, เครื่องฉีดพลาสติก, แอร์สำนักงาน..."
                      value={formData.usageBehavior?.mainEquipment || ''}
                      onChange={(e) => updateField('mainEquipment', e.target.value, 'usageBehavior')}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      rows={2}
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 3: Electrical Profile */}
              <section
                id="survey-sec-electrical"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      3. ข้อมูลระบบไฟฟ้าและหม้อแปลง (Electrical Profile)
                    </h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'electrical')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      กรอกแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">การไฟฟ้า (Grid Provider)</label>
                      <SurveySelect
                        value={formData.electricalProfile?.gridProvider || ''}
                        onChange={(val) => updateField('gridProvider', val, 'electricalProfile')}
                        placeholder="-- เลือก --"
                        options={[
                          { value: '', label: '-- เลือก --' },
                          { value: 'PEA', label: 'การไฟฟ้าส่วนภูมิภาค (PEA)' },
                          { value: 'MEA', label: 'การไฟฟ้านครหลวง (MEA)' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทผู้ใช้ไฟ (User Type)</label>
                      <SurveySelect
                        value={formData.electricalProfile?.userType || ''}
                        onChange={(val) => updateField('userType', val, 'electricalProfile')}
                        placeholder="-- เลือก --"
                        options={[
                          { value: '', label: '-- เลือก --' },
                          { value: 'Type 1', label: 'บ้านอยู่อาศัย (Type 1)' },
                          { value: 'Type 2', label: 'กิจการขนาดเล็ก (Type 2)' },
                          { value: 'Type 3', label: 'กิจการขนาดกลาง (Type 3)' },
                          { value: 'Type 4', label: 'กิจการขนาดใหญ่ (Type 4)' },
                          { value: 'Type 5', label: 'กิจการเฉพาะอย่าง (Type 5)' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">หน่วยใช้ไฟเฉลี่ย (kWh/เดือน)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.electricalProfile?.kwhQty ?? ''}
                        onChange={(e) => updateField('kwhQty', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="เช่น 15000"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">อัตราค่าไฟเฉลี่ย (บาท/หน่วย)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.electricalProfile?.rateThbPerKwh ?? ''}
                        onChange={(e) => updateField('rateThbPerKwh', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="เช่น 4.18"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm font-mono focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                  </div>

                  {/* Voltage & Meter */}
                  <div className="bg-gray-50/70 p-4 border border-gray-200 rounded-2xl space-y-4">
                    <div className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">
                      ระดับแรงดันไฟฟ้า และขนาดมิเตอร์
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={formData.electricalProfile?.voltageLevel?.includes('230 V (1 Phase)') || false}
                          onChange={(e) => {
                            const current = formData.electricalProfile?.voltageLevel || [];
                            updateField(
                              'voltageLevel',
                              e.target.checked ? [...current, '230 V (1 Phase)'] : current.filter((v: string) => v !== '230 V (1 Phase)'),
                              'electricalProfile'
                            );
                          }}
                          className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                        />
                        <span className="text-sm font-bold text-gray-800">230 V (1 Phase)</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-6 text-xs text-gray-700">
                        <span className="text-gray-500">ขนาดมิเตอร์:</span>
                        {['15(45) A', '30(100) A', '50(150) A'].map((m) => (
                          <label key={`230-${m}`} className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            <input
                              type="checkbox"
                              checked={formData.electricalProfile?.meterSize?.includes(`${m} (1P)`) || false}
                              onChange={(e) => {
                                const current = formData.electricalProfile?.meterSize || [];
                                updateField(
                                  'meterSize',
                                  e.target.checked ? [...current, `${m} (1P)`] : current.filter((v: string) => v !== `${m} (1P)`),
                                  'electricalProfile'
                                );
                              }}
                              className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                            />
                            <span>{m}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={formData.electricalProfile?.voltageLevel?.includes('400 V (3 Phase)') || false}
                          onChange={(e) => {
                            const current = formData.electricalProfile?.voltageLevel || [];
                            updateField(
                              'voltageLevel',
                              e.target.checked ? [...current, '400 V (3 Phase)'] : current.filter((v: string) => v !== '400 V (3 Phase)'),
                              'electricalProfile'
                            );
                          }}
                          className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                        />
                        <span className="text-sm font-bold text-gray-800">400 V (3 Phase)</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-6 text-xs text-gray-700">
                        <span className="text-gray-500">ขนาดมิเตอร์:</span>
                        {['15(45) A', '30(100) A', '50(150) A', '200/400 A'].map((m) => (
                          <label key={`400-${m}`} className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            <input
                              type="checkbox"
                              checked={formData.electricalProfile?.meterSize?.includes(`${m} (3P)`) || false}
                              onChange={(e) => {
                                const current = formData.electricalProfile?.meterSize || [];
                                updateField(
                                  'meterSize',
                                  e.target.checked ? [...current, `${m} (3P)`] : current.filter((v: string) => v !== `${m} (3P)`),
                                  'electricalProfile'
                                );
                              }}
                              className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                            />
                            <span>{m}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs font-bold text-gray-600 mb-2">แรงดันไฟฟ้าแรงสูง (High Voltage)</div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {['22 kV (PEA)', '24 kV (MEA)', '33 kV (PEA-ภาคใต้)', '69 kV', '115 kV'].map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium">
                            <input
                              type="checkbox"
                              checked={formData.electricalProfile?.voltageLevel?.includes(v) || false}
                              onChange={(e) => {
                                const current = formData.electricalProfile?.voltageLevel || [];
                                updateField(
                                  'voltageLevel',
                                  e.target.checked ? [...current, v] : current.filter((val: string) => val !== v),
                                  'electricalProfile'
                                );
                              }}
                              className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                            />
                            <span className="text-gray-800">{v}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Peak วันจันทร์ - ศุกร์ (kW)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.electricalProfile?.peakKwWeekday ?? ''}
                        onChange={(e) => updateField('peakKwWeekday', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Peak วันเสาร์ - อาทิตย์ (kW)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.electricalProfile?.peakKwWeekend ?? ''}
                        onChange={(e) => updateField('peakKwWeekend', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนหม้อแปลง (ลูก)</label>
                      <input
                        type="number"
                        value={formData.electricalProfile?.transformerCount ?? ''}
                        onChange={(e) => updateField('transformerCount', parseNullableInt(e.target.value), 'electricalProfile')}
                        placeholder="1"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">พิกัดหม้อแปลง (kVA)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.electricalProfile?.transformerKva ?? ''}
                        onChange={(e) => updateField('transformerKva', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="เช่น 500"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">พิกัดเมนเบรกเกอร์ AT of ACDB (A)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.electricalProfile?.breakerAmp ?? ''}
                        onChange={(e) => updateField('breakerAmp', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="เช่น 400"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะเดินสายถึงตู้เมน MDB (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.electricalProfile?.mainPanelCableLengthM ?? ''}
                        onChange={(e) => updateField('mainPanelCableLengthM', parseNullableFloat(e.target.value), 'electricalProfile')}
                        placeholder="เช่น 35"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ยี่ห้อหม้อแปลง (Brand)</label>
                      <input
                        type="text"
                        value={formData.electricalProfile?.transformerBrand || ''}
                        onChange={(e) => updateField('transformerBrand', e.target.value, 'electricalProfile')}
                        placeholder="เช่น ABB, Schneider, Ekarat"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">รุ่นหม้อแปลง (Model)</label>
                      <input
                        type="text"
                        value={formData.electricalProfile?.transformerModel || ''}
                        onChange={(e) => updateField('transformerModel', e.target.value, 'electricalProfile')}
                        placeholder="เช่น DTR-315/11"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">แบบไฟฟ้า (Single Line Diagram)</label>
                      <div className="flex items-center gap-6 h-10">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="hasSingleLineDiagram"
                            checked={formData.hasSingleLineDiagram === true}
                            onChange={() => updateField('hasSingleLineDiagram', true)}
                            className="w-4 h-4 text-[#ff2301]"
                          />
                          <span>มี (Available)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="hasSingleLineDiagram"
                            checked={formData.hasSingleLineDiagram === false}
                            onChange={() => updateField('hasSingleLineDiagram', false)}
                            className="w-4 h-4 text-[#ff2301]"
                          />
                          <span>ไม่มี</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 4: Tariff Selection */}
              <section
                id="survey-sec-tariff"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">4. อัตราค่าไฟฟ้า (TOU / TOD)</h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'tariff')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      กรอกแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {TARIFF_OPTIONS.map((group, groupIdx) => (
                      <div key={groupIdx} className="border-b border-gray-100 last:border-0">
                        <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-800 text-xs sm:text-sm border-b border-gray-100">
                          {group.group}
                        </div>

                        {group.subgroups.map((sub, subIdx) => (
                          <div key={subIdx} className="p-3 sm:p-4 space-y-3">
                            <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">{sub.subgroup}</h4>
                            <div className="space-y-3 pl-2.5 sm:pl-3 border-l-2 border-gray-100 ml-0.5 sm:ml-1">
                              {sub.options.map((opt) => {
                                const isSelected = formData.tariffSelection?.tariffCategory === opt.label;
                                return (
                                  <div key={opt.id} className="space-y-2">
                                    <label className="flex items-start sm:items-center gap-2.5 cursor-pointer group">
                                      <input
                                        type="radio"
                                        name="tariffCategory"
                                        checked={isSelected}
                                        onChange={() => {
                                          updateField('tariffCategory', opt.label, 'tariffSelection');
                                          updateField(
                                            'tiers',
                                            opt.tiers.map((t) => ({
                                              tierName: t.name,
                                              ratePerKwh: t.rate,
                                              qtyKwhPerMonth: 0,
                                            })),
                                            'tariffSelection'
                                          );
                                        }}
                                        onClick={() => {
                                          if (isSelected) {
                                            updateField('tariffCategory', '', 'tariffSelection');
                                            updateField('tiers', [], 'tariffSelection');
                                          }
                                        }}
                                        className="w-4 h-4 mt-0.5 sm:mt-0 text-[#ff2301] shrink-0"
                                      />
                                      <span className="text-sm font-semibold text-gray-800 group-hover:text-[#ff2301]">
                                        {opt.label}
                                      </span>
                                    </label>

                                    {isSelected && (
                                      <div className="pl-2 sm:pl-6 space-y-2">
                                        {opt.tiers.map((t, tierIdx) => {
                                          const currentTier = (formData.tariffSelection?.tiers || []).find(
                                            (ct: any) => ct.tierName === t.name
                                          );
                                          return (
                                            <div
                                              key={tierIdx}
                                              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-700 bg-red-50/50 border border-red-100 p-2.5 sm:p-3 rounded-xl"
                                            >
                                              <div className="font-bold text-gray-900">{t.name}</div>
                                              <div className="text-gray-600">{t.rate} บาท/หน่วย</div>
                                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <span className="shrink-0">จำนวน</span>
                                                <input
                                                  type="number"
                                                  value={currentTier?.qtyKwhPerMonth ?? ''}
                                                  onChange={(e) => {
                                                    const newTiers = [...(formData.tariffSelection?.tiers || [])];
                                                    const idx = newTiers.findIndex((ct: any) => ct.tierName === t.name);
                                                    if (idx !== -1) {
                                                      newTiers[idx] = {
                                                        ...newTiers[idx],
                                                        qtyKwhPerMonth: parseNullableFloat(e.target.value) ?? 0,
                                                      };
                                                    }
                                                    updateField('tiers', newTiers, 'tariffSelection');
                                                  }}
                                                  className="flex-1 sm:flex-none w-full sm:w-28 px-2.5 py-1.5 sm:py-1 text-center border border-gray-300 bg-white rounded-lg focus:border-[#ff2301] outline-none font-mono text-base sm:text-sm"
                                                />
                                                <span className="shrink-0">kWh/เดือน</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    <div className="p-3 bg-amber-50/70 text-xs text-amber-900 border-t border-gray-200">
                      <strong>หมายเหตุ:</strong> On-Peak จ.-ศ. 09:00 - 22:00 น. | Off-Peak จ.-ศ. 22:00 - 09:00 น. และ เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <div className="text-xs text-gray-500 font-medium">อัตราค่าไฟเฉลี่ยก่อน VAT</div>
                      <div className="text-base font-bold text-gray-900 font-mono mt-0.5">{tariffBlendedRate} บาท/หน่วย</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">รวมปริมาณการใช้ไฟ</div>
                      <div className="text-base font-bold text-gray-900 font-mono mt-0.5">{formatNum(tariffTotalKwh)} kWh/เดือน</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">ประมาณการค่าไฟฐาน/เดือน</div>
                      <div className="text-base font-bold text-[#ff2301] font-mono mt-0.5">฿{formatNum(tariffTotalBaht)}</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 5: Roof Structure */}
              <section
                id="survey-sec-structure"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">5. โครงสร้างหลังคาและพื้นที่ติดตั้ง</h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'structure')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      กรอกแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ขนาดพื้นที่หลังคา (W × L)</label>
                      <input
                        type="text"
                        value={formData.structure?.roofDimWxlM || ''}
                        onChange={(e) => updateField('roofDimWxlM', e.target.value, 'structure')}
                        placeholder="เช่น 20 x 50 เมตร"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ความสูงอาคาร (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.buildingHeightM ?? ''}
                        onChange={(e) => updateField('buildingHeightM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">อายุหลังคาโดยรวม (ปี)</label>
                      <input
                        type="number"
                        value={formData.structure?.roofAgeYear ?? ''}
                        onChange={(e) => updateField('roofAgeYear', parseNullableInt(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                  </div>

                  {/* Roof Type & Individual Ages */}
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl border border-gray-200 space-y-2.5">
                    <div className="text-xs font-bold text-gray-800">ประเภทหลังคา และอายุการใช้งานแยกประเภท</div>
                    <div className="divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 px-3 sm:px-4">
                      {ROOF_TYPES.map((r) => {
                        const isChecked = formData.structure?.roofType?.includes(r);
                        const ageObj = formData.structure?.roofAges?.find((a: any) => a.roofType === r);
                        return (
                          <div key={r} className="flex flex-wrap items-center justify-between py-2.5 gap-2.5 sm:gap-3">
                            <label className="flex items-center gap-2.5 sm:gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked || false}
                                onChange={(e) => {
                                  const current = formData.structure?.roofType || [];
                                  updateField(
                                    'roofType',
                                    e.target.checked ? [...current, r] : current.filter((v: string) => v !== r),
                                    'structure'
                                  );
                                  if (!e.target.checked) {
                                    const currentAges = formData.structure?.roofAges || [];
                                    updateField('roofAges', currentAges.filter((a: any) => a.roofType !== r), 'structure');
                                  }
                                }}
                                className="w-4 h-4 text-[#ff2301] rounded border-gray-300 shrink-0"
                              />
                              <span className="text-sm font-medium text-gray-800">{r}</span>
                            </label>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">อายุ:</span>
                              <input
                                type="number"
                                disabled={!isChecked}
                                value={ageObj?.ageYear ?? ''}
                                onChange={(e) => {
                                  const val = parseNullableInt(e.target.value) ?? 0;
                                  const currentAges = formData.structure?.roofAges || [];
                                  const filtered = currentAges.filter((a: any) => a.roofType !== r);
                                  updateField('roofAges', [...filtered, { roofType: r, ageYear: val }], 'structure');
                                }}
                                className="w-20 px-2.5 py-1.5 sm:py-1 text-center border border-gray-300 rounded-lg disabled:bg-gray-50 outline-none focus:border-[#ff2301] text-base sm:text-sm"
                                placeholder="0"
                              />
                              <span className="text-gray-500">ปี</span>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={formData.structure?.roofType?.some((r: string) => r.startsWith('อื่นๆ:')) || false}
                              onChange={(e) => {
                                const current = formData.structure?.roofType || [];
                                if (e.target.checked) {
                                  updateField('roofType', [...current, 'อื่นๆ: '], 'structure');
                                } else {
                                  updateField('roofType', current.filter((v: string) => !v.startsWith('อื่นๆ:')), 'structure');
                                  const currentAges = formData.structure?.roofAges || [];
                                  updateField('roofAges', currentAges.filter((a: any) => a.roofType !== 'อื่นๆ'), 'structure');
                                }
                              }}
                              className="w-4 h-4 text-[#ff2301] rounded border-gray-300 shrink-0"
                            />
                            <span className="text-sm font-medium text-gray-800">อื่นๆ:</span>
                          </label>
                          <input
                            type="text"
                            disabled={!formData.structure?.roofType?.some((r: string) => r.startsWith('อื่นๆ:'))}
                            value={(formData.structure?.roofType?.find((r: string) => r.startsWith('อื่นๆ:')) || '').replace('อื่นๆ: ', '')}
                            onChange={(e) => {
                              const val = 'อื่นๆ: ' + e.target.value;
                              const current = formData.structure?.roofType || [];
                              updateField('roofType', [...current.filter((v: string) => !v.startsWith('อื่นๆ:')), val], 'structure');
                            }}
                            className="flex-1 min-w-0 sm:flex-none sm:w-44 px-3 py-1.5 sm:py-1 text-base sm:text-sm border border-gray-300 rounded-lg disabled:bg-gray-50 outline-none focus:border-[#ff2301]"
                            placeholder="ระบุชนิดหลังคา"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs self-end sm:self-auto">
                          <span className="text-gray-500">อายุ:</span>
                          <input
                            type="number"
                            disabled={!formData.structure?.roofType?.some((r: string) => r.startsWith('อื่นๆ:'))}
                            value={formData.structure?.roofAges?.find((a: any) => a.roofType === 'อื่นๆ')?.ageYear ?? ''}
                            onChange={(e) => {
                              const val = parseNullableInt(e.target.value) ?? 0;
                              const currentAges = formData.structure?.roofAges || [];
                              const filtered = currentAges.filter((a: any) => a.roofType !== 'อื่นๆ');
                              updateField('roofAges', [...filtered, { roofType: 'อื่นๆ', ageYear: val }], 'structure');
                            }}
                            className="w-20 px-2.5 py-1.5 sm:py-1 text-center border border-gray-300 rounded-lg disabled:bg-gray-50 outline-none focus:border-[#ff2301] text-base sm:text-sm"
                            placeholder="0"
                          />
                          <span className="text-gray-500">ปี</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">รูปแบบหลังคา (Roof Pattern)</label>
                      <SurveySelect
                        value={formData.structure?.roofPattern || ''}
                        onChange={(val) => updateField('roofPattern', val, 'structure')}
                        placeholder="-- เลือกรูปแบบ --"
                        options={[
                          { value: '', label: '-- เลือกรูปแบบ --' },
                          ...Object.entries(ROOF_PATTERN_LABELS).map(([k, label]) => ({
                            value: k,
                            label,
                          })),
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทรอน Metal Sheet</label>
                      <input
                        type="text"
                        value={formData.structure?.metalSheetType || ''}
                        onChange={(e) => updateField('metalSheetType', e.target.value, 'structure')}
                        placeholder="เช่น Kliplok, Bolt"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ความชันหลังคา Slope (°)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.roofSlopeDeg ?? ''}
                        onChange={(e) => updateField('roofSlopeDeg', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">มุม Azimuth (°)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.azimuthDeg ?? ''}
                        onChange={(e) => updateField('azimuthDeg', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="Azimuth"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">มุม Tilt (°)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.tiltDeg ?? ''}
                        onChange={(e) => updateField('tiltDeg', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="Tilt"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะแป ถึง แป (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.purlinToPurlinM ?? ''}
                        onChange={(e) => updateField('purlinToPurlinM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะจันทัน ถึง จันทัน (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.rafterToRafterM ?? ''}
                        onChange={(e) => updateField('rafterToRafterM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะเสา ถึง เสา (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.columnToColumnM ?? ''}
                        onChange={(e) => updateField('columnToColumnM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะช่องแสง ถึง ช่องแสง (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.skylightToSkylightM ?? ''}
                        onChange={(e) => updateField('skylightToSkylightM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะ Jack Roof (W×L เมตร)</label>
                      <input
                        type="text"
                        value={formData.structure?.jackRoofDimM || ''}
                        onChange={(e) => updateField('jackRoofDimM', e.target.value, 'structure')}
                        placeholder="เช่น 1.20 x 3.50"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระยะลูกหมุน Ventilation (W×L เมตร)</label>
                      <input
                        type="text"
                        value={formData.structure?.ventilationDimM || ''}
                        onChange={(e) => updateField('ventilationDimM', e.target.value, 'structure')}
                        placeholder="เช่น 0.60 x 0.60"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">ระบบป้องกันฟ้าผ่า (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.lightningProtectionM ?? ''}
                        onChange={(e) => updateField('lightningProtectionM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">บันไดลิง / ทางขึ้นหลังคา (เมตร)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.structure?.serviceLadderM ?? ''}
                        onChange={(e) => updateField('serviceLadderM', parseNullableFloat(e.target.value), 'structure')}
                        placeholder="0"
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุโครงสร้างเพิ่มเติม</label>
                      <textarea
                        value={formData.structure?.otherNotes || ''}
                        onChange={(e) => updateField('otherNotes', e.target.value, 'structure')}
                        rows={2}
                        placeholder="รายละเอียดโครงสร้างหลังคา, เงาบัง, ความแข็งแรง..."
                        className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 6: Q&A */}
              <section
                id="survey-sec-qa"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">6. คำถามวิศวกรรมเพิ่มเติม (Q&A)</h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'qa')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      กรอกแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2.5">
                    <label className="block text-xs font-bold text-gray-800">6.1 จุดประสงค์ในการติดตั้งโซลาร์ (Reasons for Solar)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {SOLAR_REASONS.map((r) => (
                        <label
                          key={r}
                          className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={formData.qa?.solarReasons?.includes(r) || false}
                            onChange={(e) => {
                              const current = formData.qa?.solarReasons || [];
                              updateField(
                                'solarReasons',
                                e.target.checked ? [...current, r] : current.filter((v: string) => v !== r),
                                'qa'
                              );
                            }}
                            className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                          />
                          <span>{r}</span>
                        </label>
                      ))}
                    </div>
                    <textarea
                      value={formData.qa?.solarReasonsDetail || ''}
                      onChange={(e) => updateField('solarReasonsDetail', e.target.value, 'qa')}
                      rows={2}
                      placeholder="รายละเอียดความต้องการของลูกค้าเพิ่มเติม..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                      <label className="block text-xs font-bold text-gray-800">6.2 การใช้ไฟกลางวัน/กลางคืน</label>
                      <input
                        type="text"
                        value={formData.qa?.dayNightUsage || ''}
                        onChange={(e) => updateField('dayNightUsage', e.target.value, 'qa')}
                        placeholder="สัดส่วน / รูปแบบการใช้งาน"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                      />
                      <input
                        type="text"
                        value={formData.qa?.dayNightUsageDetail || ''}
                        onChange={(e) => updateField('dayNightUsageDetail', e.target.value, 'qa')}
                        placeholder="หมายเหตุเพิ่มเติม"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs outline-none focus:border-[#ff2301]"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">6.3 Day Load</label>
                        <input
                          type="text"
                          value={formData.qa?.dayLoad || ''}
                          onChange={(e) => updateField('dayLoad', e.target.value, 'qa')}
                          placeholder="โหลดกลางวัน"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">6.4 Night Load</label>
                        <input
                          type="text"
                          value={formData.qa?.nightLoad || ''}
                          onChange={(e) => updateField('nightLoad', e.target.value, 'qa')}
                          placeholder="โหลดกลางคืน"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                      <label className="block text-xs font-bold text-gray-800">6.5 โหลดที่ต้องการสำรองไฟ (Backup Load)</label>
                      <input
                        type="text"
                        value={formData.qa?.backupLoad || ''}
                        onChange={(e) => updateField('backupLoad', e.target.value, 'qa')}
                        placeholder="อุปกรณ์ที่ต้องการสำรองไฟ"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                      />
                      <input
                        type="text"
                        value={formData.qa?.backupLoadDetail || ''}
                        onChange={(e) => updateField('backupLoadDetail', e.target.value, 'qa')}
                        placeholder="หมายเหตุเพิ่มเติม"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs outline-none focus:border-[#ff2301]"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                      <label className="block text-xs font-bold text-gray-800">6.6 โหมดชาร์จแบตเตอรี่</label>
                      <input
                        type="text"
                        value={formData.qa?.batteryChargeMode || ''}
                        onChange={(e) => updateField('batteryChargeMode', e.target.value, 'qa')}
                        placeholder="เช่น Peak Shaving, Self-Consumption"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm outline-none focus:border-[#ff2301]"
                      />
                      <input
                        type="text"
                        value={formData.qa?.batteryChargeDetail || ''}
                        onChange={(e) => updateField('batteryChargeDetail', e.target.value, 'qa')}
                        placeholder="หมายเหตุเพิ่มเติม"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs outline-none focus:border-[#ff2301]"
                      />
                    </div>

                    <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl border border-gray-200 space-y-2">
                      <label className="block text-xs font-bold text-gray-800">6.7 ชาร์จไฟจาก Grid เวลากลางคืน?</label>
                      <SurveySelect
                        value={formData.qa?.gridChargeAtNight || ''}
                        onChange={(val) => updateField('gridChargeAtNight', val, 'qa')}
                        placeholder="-- เลือก --"
                        options={[
                          { value: '', label: '-- เลือก --' },
                          { value: 'Yes', label: 'ใช่ (Yes)' },
                          { value: 'No', label: 'ไม่ (No)' },
                        ]}
                      />
                      <input
                        type="text"
                        value={formData.qa?.gridChargeAtNightDetail || ''}
                        onChange={(e) => updateField('gridChargeAtNightDetail', e.target.value, 'qa')}
                        placeholder="รายละเอียดเพิ่มเติม"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs outline-none focus:border-[#ff2301]"
                      />
                    </div>

                    <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl border border-gray-200 space-y-2">
                      <label className="block text-xs font-bold text-gray-800">
                        6.8 Inverter สำรองไฟเมื่อไฟดับ & คุณภาพไฟฟ้า
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <SurveySelect
                          value={formData.qa?.inverterBackupOnOutage || ''}
                          onChange={(val) => updateField('inverterBackupOnOutage', val, 'qa')}
                          placeholder="สำรองเมื่อไฟดับ?"
                          buttonClassName="sm:text-xs"
                          options={[
                            { value: '', label: 'สำรองเมื่อไฟดับ?' },
                            { value: 'Yes', label: 'ใช่ (Yes)' },
                            { value: 'No', label: 'ไม่ (No)' },
                          ]}
                        />
                        <SurveySelect
                          value={formData.qa?.powerQualityIssue || ''}
                          onChange={(val) => updateField('powerQualityIssue', val, 'qa')}
                          placeholder="มีปัญหาไฟตก/กระชาก?"
                          buttonClassName="sm:text-xs"
                          options={[
                            { value: '', label: 'มีปัญหาไฟตก/กระชาก?' },
                            { value: 'Yes', label: 'มี (Yes)' },
                            { value: 'No', label: 'ไม่มี (No)' },
                          ]}
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.qa?.powerQualityIssueDetail || ''}
                        onChange={(e) => updateField('powerQualityIssueDetail', e.target.value, 'qa')}
                        placeholder="ระบุปัญหาคุณภาพไฟ (ถ้ามี)"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-xs outline-none focus:border-[#ff2301]"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 7: Checklist, Bill, Photos, Docs, Remark */}
              <section
                id="survey-sec-media"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      7. Checklist ข้อมูลประกอบ, บิลค่าไฟ, รูปถ่าย และหมายเหตุ
                    </h3>
                  </div>
                  {completeness.checks.find((c) => c.id === 'media')?.done && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      มีไฟล์แนบแล้ว
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 space-y-6">
                  {/* 7.1 Checklist */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      7.1 Checklist ข้อมูลที่ต้องเตรียมสำหรับทีมโปรเจค
                    </h4>
                    <div className="space-y-2.5">
                      {REQUIRED_CHECKLIST_ITEMS.map((item) => {
                        const isChecked = formData.requiredInfoChecklist?.includes(item.value) || false;
                        const fileUrl = 'fileField' in item && item.fileField ? formData[item.fileField] : '';
                        return (
                          <div key={item.value} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                            <label className="flex items-start gap-3 cursor-pointer w-fit">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = formData.requiredInfoChecklist || [];
                                  updateField(
                                    'requiredInfoChecklist',
                                    e.target.checked
                                      ? [...current, item.value]
                                      : current.filter((i: string) => i !== item.value)
                                  );
                                }}
                                className="mt-0.5 w-4 h-4 rounded text-[#ff2301] border-gray-300"
                              />
                              <span className="text-sm font-bold text-gray-800">{item.label}</span>
                            </label>

                            {'showLatLng' in item && item.showLatLng && (
                              <div className="ml-0 sm:ml-7 text-xs text-gray-600 font-mono break-all">
                                Latitude: {formData.latitude ?? '-'} , Longitude: {formData.longitude ?? '-'}
                              </div>
                            )}

                            {isChecked && 'fileField' in item && item.fileField && (
                              <div className="ml-0 sm:ml-7 flex flex-wrap items-center gap-2.5 sm:gap-3">
                                <label className="inline-flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg bg-white border border-gray-300 hover:border-[#ff2301] text-xs font-semibold text-gray-700 cursor-pointer min-h-[38px]">
                                  <UploadCloud className="w-4 h-4 text-[#ff2301]" />
                                  <span>{fileUrl ? 'เปลี่ยนไฟล์' : 'อัปโหลดไฟล์'}</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf,.xlsx,.xls,.csv,.dwg"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e, item.fileField as string)}
                                  />
                                </label>
                                {uploadingKey === `${item.fileField}-root` && (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                                )}
                                {fileUrl && (
                                  <div className="inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                                    {isImageAttachmentUrl(fileUrl) && (
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-12 h-9 rounded-md overflow-hidden border border-gray-200 bg-white shrink-0 block"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={fileUrl} alt={item.value} className="w-full h-full object-cover" />
                                      </a>
                                    )}
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-bold text-[#ff2301] hover:underline inline-flex items-center gap-1 min-w-0 max-w-full"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{extractAttachmentFilename(fileUrl, 'เปิดดูไฟล์แนบ')}</span>
                                    </a>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                                      {isPdfAttachmentUrl(fileUrl)
                                        ? 'PDF • รวมใน PDF'
                                        : isSpreadsheetAttachmentUrl(fileUrl)
                                        ? 'ตาราง • แสดงใน PDF'
                                        : isImageAttachmentUrl(fileUrl)
                                        ? 'รูปภาพ • รวมใน PDF'
                                        : 'ฝังใน PDF'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateField(item.fileField as string, null)}
                                      className="text-gray-400 hover:text-red-600 cursor-pointer p-1"
                                      title="ลบไฟล์"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isChecked && 'isAmr' in item && item.isAmr && (
                              <div className="ml-0 sm:ml-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <input
                                  type="text"
                                  value={formData.amrCustomerCode || ''}
                                  onChange={(e) => updateField('amrCustomerCode', e.target.value)}
                                  placeholder="รหัสลูกค้า AMR Code"
                                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-xs outline-none focus:border-[#ff2301]"
                                />
                                <input
                                  type="text"
                                  value={formData.electricalProfile?.amrUsernamePlain || ''}
                                  onChange={(e) => updateField('amrUsernamePlain', e.target.value, 'electricalProfile')}
                                  placeholder="AMR Username"
                                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-xs outline-none focus:border-[#ff2301]"
                                />
                                <input
                                  type="text"
                                  value={formData.electricalProfile?.amrPasswordPlain || ''}
                                  onChange={(e) => updateField('amrPasswordPlain', e.target.value, 'electricalProfile')}
                                  placeholder="AMR Password"
                                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-xs outline-none focus:border-[#ff2301]"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7.2 Electricity Bill */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      7.2 บิลค่าไฟฟ้า (Electricity Bill)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนรอบบิล (เดือน)</label>
                        <input
                          type="number"
                          value={
                            typeof formData.electricityBill === 'object'
                              ? formData.electricityBill?.billCount ?? ''
                              : ''
                          }
                          onChange={(e) => {
                            const count = parseNullableInt(e.target.value);
                            const curr =
                              formData.electricityBill && typeof formData.electricityBill === 'object'
                                ? formData.electricityBill
                                : { fileUrl: getElectricityBillUrl(formData.electricityBill) };
                            updateField('electricityBill', { ...curr, billCount: count });
                          }}
                          placeholder="เช่น 3"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none focus:border-[#ff2301]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุบิลค่าไฟ</label>
                        <input
                          type="text"
                          value={
                            typeof formData.electricityBill === 'object'
                              ? formData.electricityBill?.note || ''
                              : ''
                          }
                          onChange={(e) => {
                            const curr =
                              formData.electricityBill && typeof formData.electricityBill === 'object'
                                ? formData.electricityBill
                                : { fileUrl: getElectricityBillUrl(formData.electricityBill) };
                            updateField('electricityBill', { ...curr, note: e.target.value });
                          }}
                          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none focus:border-[#ff2301]"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs font-bold cursor-pointer">
                        <UploadCloud className="w-4 h-4" />
                        <span>{getElectricityBillUrl(formData.electricityBill) ? 'อัปโหลดบิลใหม่' : 'อัปโหลดบิลค่าไฟ'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'electricityBill')}
                        />
                      </label>
                      {uploadingKey === 'electricityBill-root' && (
                        <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                      )}
                      {getElectricityBillUrl(formData.electricityBill) && (
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0 max-w-full">
                          {isImageAttachmentUrl(getElectricityBillUrl(formData.electricityBill)) && (
                            <a
                              href={getElectricityBillUrl(formData.electricityBill)}
                              target="_blank"
                              rel="noreferrer"
                              className="w-20 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white block shrink-0"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getElectricityBillUrl(formData.electricityBill)}
                                alt="บิลค่าไฟฟ้า"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          )}
                          <a
                            href={getElectricityBillUrl(formData.electricityBill)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-[#ff2301] hover:underline inline-flex items-center gap-1 min-w-0 max-w-full"
                          >
                            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              {extractAttachmentFilename(getElectricityBillUrl(formData.electricityBill), 'เปิดดูบิลค่าไฟที่อัปโหลด')}
                            </span>
                          </a>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                            {isPdfAttachmentUrl(getElectricityBillUrl(formData.electricityBill))
                              ? 'PDF • รวมหน้าใน PDF'
                              : isImageAttachmentUrl(getElectricityBillUrl(formData.electricityBill))
                              ? 'รูปภาพ • รวมใน PDF'
                              : 'รวมใน PDF'}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateField('electricityBill', null)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer p-1"
                            title="ลบบิล"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 7.3 Site Photos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        7.3 รูปถ่ายหน้างาน (Site Photos)
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          updateField('photos', [
                            ...(formData.photos || []),
                            { photoType: '', fileUrl: '', photoDesc: '' },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-900 hover:bg-black text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> เพิ่มรูปถ่าย
                      </button>
                    </div>

                    {(!formData.photos || formData.photos.length === 0) && (
                      <p className="text-xs text-gray-400">ยังไม่มีรูปถ่ายหน้างาน</p>
                    )}

                    <div className="space-y-3">
                      {formData.photos?.map((photo: any, index: number) => (
                        <div
                          key={index}
                          className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row gap-3.5 sm:gap-4 items-start"
                        >
                          {photo.fileUrl ? (
                            <a
                              href={photo.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full md:w-32 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0 block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.fileUrl} alt={photo.photoType || 'photo'} className="w-full h-full object-cover" />
                            </a>
                          ) : (
                            <div className="w-full md:w-32 h-24 rounded-lg border border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-400 shrink-0">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex-1 w-full space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <input
                                type="text"
                                value={photo.photoType || ''}
                                onChange={(e) => {
                                  const arr = [...formData.photos];
                                  arr[index] = { ...arr[index], photoType: e.target.value };
                                  updateField('photos', arr);
                                }}
                                placeholder="หัวข้อรูป (เช่น หลังคา, ตู้ MDB)"
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none focus:border-[#ff2301]"
                              />
                              <input
                                type="text"
                                value={photo.photoDesc || ''}
                                onChange={(e) => {
                                  const arr = [...formData.photos];
                                  arr[index] = { ...arr[index], photoDesc: e.target.value };
                                  updateField('photos', arr);
                                }}
                                placeholder="คำอธิบายเพิ่มเติม"
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none focus:border-[#ff2301]"
                              />
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {SURVEY_PHOTO_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    const arr = [...formData.photos];
                                    arr[index] = { ...arr[index], photoType: preset };
                                    updateField('photos', arr);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[11px] border cursor-pointer ${
                                    photo.photoType === preset
                                      ? 'bg-red-50 border-red-300 text-[#ff2301] font-bold'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white border border-gray-300 hover:border-[#ff2301] text-xs font-semibold text-gray-700 cursor-pointer min-h-[38px]">
                                <UploadCloud className="w-4 h-4 text-[#ff2301]" />
                                <span>{photo.fileUrl ? 'เปลี่ยนรูป' : 'อัปโหลดรูปภาพ'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'photos', index, 'fileUrl')}
                                />
                              </label>
                              {uploadingKey === `photos-${index}` && (
                                <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                              )}
                              {photo.fileUrl && (
                                <a
                                  href={photo.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-[#ff2301] hover:underline inline-flex items-center gap-1"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" /> เปิดดูรูปเต็ม
                                </a>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const arr = [...formData.photos];
                              arr.splice(index, 1);
                              updateField('photos', arr);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer self-end md:self-start"
                            title="ลบรูป"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7.4 Additional Documents */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        7.4 เอกสารประกอบอื่นๆ (Documents)
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          updateField('documents', [
                            ...(formData.documents || []),
                            { documentType: '', customerProvided: false, fileUrl: '', note: '' },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-xl transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> เพิ่มเอกสาร
                      </button>
                    </div>

                    {(!formData.documents || formData.documents.length === 0) && (
                      <p className="text-xs text-gray-400">ยังไม่มีเอกสารแนบเพิ่มเติม</p>
                    )}

                    <div className="space-y-3">
                      {formData.documents?.map((doc: any, index: number) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 w-full">
                              <input
                                type="text"
                                value={doc.documentType || ''}
                                onChange={(e) => {
                                  const arr = [...formData.documents];
                                  arr[index] = { ...arr[index], documentType: e.target.value };
                                  updateField('documents', arr);
                                }}
                                placeholder="ประเภทเอกสาร"
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none focus:border-[#ff2301]"
                              />
                              <input
                                type="text"
                                value={doc.note || ''}
                                onChange={(e) => {
                                  const arr = [...formData.documents];
                                  arr[index] = { ...arr[index], note: e.target.value };
                                  updateField('documents', arr);
                                }}
                                placeholder="หมายเหตุเอกสาร"
                                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none focus:border-[#ff2301]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const arr = [...formData.documents];
                                arr.splice(index, 1);
                                updateField('documents', arr);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {SURVEY_DOC_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  const arr = [...formData.documents];
                                  arr[index] = { ...arr[index], documentType: preset };
                                  updateField('documents', arr);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[11px] border cursor-pointer ${
                                  doc.documentType === preset
                                    ? 'bg-red-50 border-red-300 text-[#ff2301] font-bold'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(doc.customerProvided)}
                                onChange={(e) => {
                                  const arr = [...formData.documents];
                                  arr[index] = { ...arr[index], customerProvided: e.target.checked };
                                  updateField('documents', arr);
                                }}
                                className="w-4 h-4 text-[#ff2301] rounded border-gray-300"
                              />
                              ลูกค้าเตรียมให้
                            </label>
                            <label className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-700 cursor-pointer min-h-[38px]">
                              <UploadCloud className="w-4 h-4 text-[#ff2301]" />
                              <span>{doc.fileUrl ? 'เปลี่ยนไฟล์' : 'อัปโหลดไฟล์'}</span>
                              <input
                                type="file"
                                accept="*/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, 'documents', index, 'fileUrl')}
                              />
                            </label>
                            {uploadingKey === `documents-${index}` && (
                              <Loader2 className="w-4 h-4 animate-spin text-[#ff2301]" />
                            )}
                            {doc.fileUrl && (
                              <div className="inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                                {isImageAttachmentUrl(doc.fileUrl) && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-12 h-9 rounded-md overflow-hidden border border-gray-200 bg-white shrink-0 block"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={doc.fileUrl}
                                      alt={doc.documentType || 'document'}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                )}
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-[#ff2301] hover:underline inline-flex items-center gap-1 min-w-0 max-w-full"
                                >
                                  <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{extractAttachmentFilename(doc.fileUrl, 'เปิดดูเอกสาร')}</span>
                                </a>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                                  {isPdfAttachmentUrl(doc.fileUrl)
                                    ? 'PDF • รวมใน PDF'
                                    : isSpreadsheetAttachmentUrl(doc.fileUrl)
                                    ? 'ตาราง • แสดงใน PDF'
                                    : isImageAttachmentUrl(doc.fileUrl)
                                    ? 'รูปภาพ • รวมใน PDF'
                                    : 'ฝังใน PDF'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Remark */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      หมายเหตุเพิ่มเติมจากเซลส์ / ผู้สำรวจ (Additional Remarks)
                    </label>
                    <textarea
                      value={formData.additionalRemark || ''}
                      onChange={(e) => updateField('additionalRemark', e.target.value)}
                      rows={3}
                      placeholder="เช่น ลูกค้าสนใจ Inverter ยี่ห้อเฉพาะ หรือเงื่อนไขพิเศษหน้างาน..."
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:border-[#ff2301] outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 8: Signatures (Sales & Project Preview) */}
              <section
                id="survey-sec-signature"
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden scroll-mt-4"
              >
                <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-[#ff2301]" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      8. ลายเซ็นประกอบแบบสำรวจ (Sign-off for PDF)
                    </h3>
                  </div>
                  {(formData.salesSignatureUrl || formData.projectSignatureUrl) && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      พร้อมแสดงใน PDF
                    </span>
                  )}
                </div>

                <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <SurveySignatureBox
                    key={`sales-sig-${formData.id || 'new'}-${formData.version}`}
                    title="ผู้บันทึกสำรวจ / พนักงานขาย (Sales / Surveyor)"
                    subtitle="วาดลายเซ็นหรืออัปโหลดรูปเพื่อแสดงในช่องลงนาม PDF"
                    signerName={
                      formData.surveyorName ||
                      salesReps.find((r: any) => r.id === formData.salespersonId)?.fullName ||
                      currentUser?.fullName
                    }
                    signedAt={formData.salesSignedAt || formData.surveyDate}
                    value={formData.salesSignatureUrl}
                    savedKeyName={currentUser?.fullName}
                    onChange={(nextUrl, nextSignedAt) => {
                      setIsDirty(true);
                      setFormData((prev: any) => ({
                        ...prev,
                        salesSignatureUrl: nextUrl,
                        salesSignedAt: nextSignedAt,
                      }));
                    }}
                  />

                  <div className="flex flex-col gap-2 h-full">
                    <div className="flex-1">
                      <SurveySignatureBox
                        readOnly
                        title="ฝ่ายวิศวกรรม / โปรเจค (Project & Engineering)"
                        signerName={formData.estimatedByUser?.fullName}
                        signedAt={formData.projectSignedAt || formData.estimatedAt}
                        value={formData.projectSignatureUrl}
                        onChange={() => {}}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 px-1">
                      {canEstimate
                        ? 'ทีมโปรเจคสามารถวาดหรือแนบลายเซ็นได้ในกล่อง "ส่วนงานทีมโปรเจค (ประเมินราคา)" ด้านขวา'
                        : 'ลายเซ็นทีมโปรเจคจะแสดงอัตโนมัติเมื่อทีมโปรเจคลงนามและส่งผลประเมินแล้ว'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Bottom Action Bar for Sales */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="hidden sm:block text-xs text-gray-500">
                  กรอกข้อมูลแล้ว <strong className="text-gray-900">{completeness.completedCount}/{completeness.total}</strong> หมวด
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleOpenOrSyncPdf()}
                    className="col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs sm:text-sm font-bold transition cursor-pointer min-h-[42px]"
                  >
                    <FileText className="w-4 h-4 text-[#ff2301] shrink-0" />
                    <span className="truncate">{!formData.id ? 'บันทึก & สร้าง PDF' : isDirty ? 'บันทึก & ดู PDF' : 'ดู / ดาวน์โหลด PDF'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving || !!conflictError}
                    onClick={() =>
                      performSave({}, { navigateBack: false, successMessage: 'บันทึกข้อมูลแบบสำรวจเรียบร้อยแล้ว' })
                    }
                    className="col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold transition cursor-pointer min-h-[42px]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                    <span>บันทึกข้อมูล</span>
                  </button>
                  {formData.status !== 'Pending Estimate' && formData.status !== 'Estimated' && (
                    <button
                      type="button"
                      disabled={saving || !!conflictError}
                      onClick={() =>
                        performSave(
                          {
                            status: 'Pending Estimate',
                            estimationStatus: formData.estimationStatus || 'Pending',
                          },
                          {
                            navigateBack: false,
                            successMessage: 'ส่งข้อมูลให้ทีมโปรเจคประเมินราคาแล้ว',
                          }
                        )
                      }
                      className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#ff2301] hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer min-h-[42px]"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                      <span>ส่งให้โปรเจคประเมิน</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Estimation Card: Visible ONLY to Project / Admin Project / Executive / SUPER_ADMIN OR to Sales when estimationStatus === 'Estimated' */}
        {showEstimationCard && (
          <ProjectEstimationCard
            key={`${formData.id || 'new'}-${formData.version}`}
            formData={formData}
            currentUser={currentUser}
            canEstimate={canEstimate}
            saving={saving}
            isDirty={isDirty}
            onSaveEstimation={async (overrides) => {
              await performSave(overrides, {
                successMessage:
                  overrides.estimationStatus === 'Estimated'
                    ? 'บันทึกผลประเมินราคาและส่งกลับให้ Sales เรียบร้อยแล้ว'
                    : overrides.estimationStatus === 'Need Info'
                    ? 'ส่งคำขอข้อมูลเพิ่มเติมกลับไปยัง Sales แล้ว'
                    : 'บันทึกร่างผลประเมินเรียบร้อยแล้ว',
              });
            }}
            onOpenPdf={handleOpenOrSyncPdf}
          />
        )}
      </div>

      {/* Embedded Connected PDF Preview Modal */}
      {pdfPreviewState && (
        <SurveyPdfPreviewModal
          surveyId={pdfPreviewState.id}
          surveyNumber={formData.surveyNumber}
          customerName={formData.customerName}
          cacheKey={pdfPreviewState.cacheKey}
          onClose={() => setPdfPreviewState(null)}
        />
      )}
    </div>
  );
}
