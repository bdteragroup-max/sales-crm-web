'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Filter,
  Home,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { deleteSiteSurvey } from '@/app/actions/siteSurveys';
import {
  SURVEY_COMPANY_OPTIONS,
  SURVEY_STATUS_OPTIONS,
  canEditSalesSurveyRole,
  canEstimateSurveyRole,
  formatNum,
  formatThaiDate,
  getEstimationStatusMeta,
  getSurveyCompanyMeta,
  getSurveyStatusMeta,
  isSurveyProjectRole,
} from '@/app/lib/surveyMetadata';
import SiteSurveyForm from './SiteSurveyForm';
import SurveyPdfPreviewModal from './SurveyPdfPreviewModal';
import SurveySelect from './SurveySelect';

type SurveyManagerProps = {
  initialSurveys: any[];
  companies: any[];
  salesReps: any[];
  currentUser: any;
};

type QuickBucket = 'ALL' | 'IN_DRAFT' | 'PENDING_ESTIMATE' | 'ESTIMATED_DONE';

export default function SurveyManager({
  initialSurveys,
  companies,
  salesReps,
  currentUser,
}: SurveyManagerProps) {
  const router = useRouter();
  const [prevInitialSurveys, setPrevInitialSurveys] = useState(initialSurveys);
  const [surveys, setSurveys] = useState(initialSurveys);

  if (initialSurveys !== prevInitialSurveys) {
    setPrevInitialSurveys(initialSurveys);
    setSurveys(initialSurveys);
  }

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickBucket, setQuickBucket] = useState<QuickBucket>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [salesFilter, setSalesFilter] = useState<string>('ALL');
  const [pdfTarget, setPdfTarget] = useState<any | null>(null);
  const [surveyToDelete, setSurveyToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isProjectRole = isSurveyProjectRole(currentUser?.role);
  const canEditSales = canEditSalesSurveyRole(currentUser?.role);
  const canEstimate = canEstimateSurveyRole(currentUser?.role);

  const handleNewSurvey = () => {
    setEditingSurveyId(null);
    setView('form');
  };

  const handleEditSurvey = (id: string) => {
    setEditingSurveyId(id);
    setView('form');
  };

  const handleBackToList = () => {
    setView('list');
    setEditingSurveyId(null);
    router.refresh();
  };

  const handleSurveySaved = (saved: any) => {
    if (!saved?.id) return;
    setSurveys((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      const summaryItem = {
        ...saved,
        _count: {
          photos: Array.isArray(saved.photos) ? saved.photos.length : saved._count?.photos || 0,
          documents: Array.isArray(saved.documents) ? saved.documents.length : saved._count?.documents || 0,
        },
      };
      if (exists) {
        return prev.map((s) => (s.id === saved.id ? summaryItem : s));
      }
      return [summaryItem, ...prev];
    });
  };

  const executeDeleteSurvey = async () => {
    if (!surveyToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteSiteSurvey(surveyToDelete.id);
      if (res.success) {
        setSurveys((prev) => prev.filter((s) => s.id !== surveyToDelete.id));
        setSurveyToDelete(null);
        router.refresh();
      } else {
        alert('ลบแบบสำรวจไม่สำเร็จ: ' + res.error);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบแบบสำรวจ: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bucket counts
  const counts = useMemo(() => {
    let inDraft = 0;
    let pendingEst = 0;
    let estDone = 0;
    surveys.forEach((s) => {
      if (s.status === 'Estimated' || s.status === 'Completed' || s.estimationStatus === 'Estimated') {
        estDone++;
      } else if (s.status === 'Pending Estimate' || s.status === 'Need Info' || s.estimationStatus === 'Pending') {
        pendingEst++;
      } else {
        inDraft++;
      }
    });
    return { total: surveys.length, inDraft, pendingEst, estDone };
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return surveys.filter((s) => {
      if (quickBucket === 'IN_DRAFT') {
        if (s.status !== 'Draft' && s.status !== 'In Progress') return false;
      } else if (quickBucket === 'PENDING_ESTIMATE') {
        if (s.status !== 'Pending Estimate' && s.status !== 'Need Info' && s.estimationStatus !== 'Pending') return false;
      } else if (quickBucket === 'ESTIMATED_DONE') {
        if (s.status !== 'Estimated' && s.status !== 'Completed' && s.estimationStatus !== 'Estimated') return false;
      }

      const companyMeta = getSurveyCompanyMeta(s.companyCode);
      if (companyFilter !== 'ALL' && companyMeta.code !== companyFilter) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (salesFilter !== 'ALL' && s.salesperson?.id !== salesFilter) return false;

      if (!q) return true;
      return (
        companyMeta.code.toLowerCase().includes(q) ||
        companyMeta.thName.toLowerCase().includes(q) ||
        (s.surveyNumber || '').toLowerCase().includes(q) ||
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.projectName || '').toLowerCase().includes(q) ||
        (s.projectLocation || '').toLowerCase().includes(q) ||
        (s.salesperson?.fullName || '').toLowerCase().includes(q)
      );
    });
  }, [surveys, quickBucket, companyFilter, statusFilter, salesFilter, searchTerm]);

  if (view === 'form') {
    return (
      <div className="p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
        <button
          type="button"
          onClick={handleBackToList}
          className="mb-3 sm:mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#ff2301] hover:text-red-800 transition-colors cursor-pointer py-1.5"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          กลับหน้ารายการสำรวจทั้งหมด (Back to List)
        </button>
        <SiteSurveyForm
          key={editingSurveyId || 'new-survey'}
          surveyId={editingSurveyId}
          companies={companies}
          salesReps={salesReps}
          currentUser={currentUser}
          onSuccess={handleBackToList}
          onSaved={handleSurveySaved}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
              บันทึกสำรวจไซต์งาน (Site Surveys)
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isProjectRole
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-red-50 text-[#ff2301] border-red-200'
              }`}
            >
              {isProjectRole ? 'ทีมโปรเจค & ประเมินราคา' : 'ทีมขาย & ประสานงาน'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            {isProjectRole
              ? 'ตรวจสอบข้อมูลไฟฟ้า หลังคา รูปถ่าย บิลค่าไฟ และบันทึกประเมินราคาเบื้องต้น พร้อมออกรายงาน PDF'
              : 'บันทึกข้อมูลสำรวจหน้างาน ส่งต่อให้ทีมโปรเจคประเมินราคา ติดตามสถานะ และพิมพ์เอกสาร PDF'}
          </p>
        </div>

        {canEditSales && (
          <button
            type="button"
            onClick={handleNewSurvey}
            className="w-full md:w-auto justify-center inline-flex items-center gap-2 bg-[#ff2301] hover:bg-red-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all font-bold text-sm whitespace-nowrap cursor-pointer min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            สร้างบันทึกสำรวจใหม่
          </button>
        )}
      </div>

      {/* Interactive KPI Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <button
          type="button"
          onClick={() => {
            setQuickBucket('ALL');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3 sm:p-4 rounded-2xl border transition cursor-pointer ${
            quickBucket === 'ALL'
              ? 'bg-white border-[#ff2301] ring-2 ring-[#ff2301]/15 shadow-xs'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span className="truncate">แบบสำรวจทั้งหมด</span>
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{counts.total}</div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">ทุกรายการในระบบ</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setQuickBucket('IN_DRAFT');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3 sm:p-4 rounded-2xl border transition cursor-pointer ${
            quickBucket === 'IN_DRAFT'
              ? 'bg-white border-sky-500 ring-2 ring-sky-500/15 shadow-xs'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span className="truncate">ฉบับร่าง / กำลังสำรวจ</span>
            <Clock className="w-4 h-4 text-sky-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-sky-700 mt-1">{counts.inDraft}</div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">เซลส์กำลังเก็บข้อมูล</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setQuickBucket('PENDING_ESTIMATE');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3 sm:p-4 rounded-2xl border transition cursor-pointer ${
            quickBucket === 'PENDING_ESTIMATE'
              ? 'bg-white border-amber-500 ring-2 ring-amber-500/15 shadow-xs'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span className="truncate">รอทีมโปรเจคประเมิน</span>
            <Calculator className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">{counts.pendingEst}</div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">รอประเมินราคา / ขอข้อมูลเพิ่ม</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setQuickBucket('ESTIMATED_DONE');
            setStatusFilter('ALL');
          }}
          className={`text-left p-3 sm:p-4 rounded-2xl border transition cursor-pointer ${
            quickBucket === 'ESTIMATED_DONE'
              ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/15 shadow-xs'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span className="truncate">ประเมินแล้ว / เสร็จสมบูรณ์</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{counts.estDone}</div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">พร้อมนำไปทำใบเสนอราคา</div>
        </button>
      </div>

      {/* Search & Filter Container */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center justify-between bg-gray-50/60">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ SV, ชื่อลูกค้า, โปรเจกต์, เซลส์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-white border border-gray-300 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0 sm:w-44">
              <Building2 className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <SurveySelect
                value={companyFilter}
                onChange={setCompanyFilter}
                options={[
                  { value: 'ALL', label: 'ทุกบริษัท (TP/TG/TE)' },
                  ...SURVEY_COMPANY_OPTIONS.map((c) => ({
                    value: c.code,
                    label: `${c.code} — ${c.shortName}`,
                  })),
                ]}
                buttonClassName="text-xs font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0 sm:w-40">
              <Filter className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <SurveySelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: 'ทุกสถานะงาน' },
                  ...SURVEY_STATUS_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.shortLabel,
                  })),
                ]}
                buttonClassName="text-xs font-semibold"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs text-gray-500 min-w-0 sm:w-44">
              <User className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <SurveySelect
                value={salesFilter}
                onChange={setSalesFilter}
                options={[
                  { value: 'ALL', label: 'เซลส์ทุกคน' },
                  ...salesReps.map((rep) => ({
                    value: rep.id,
                    label: rep.fullName,
                  })),
                ]}
                buttonClassName="text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4 font-bold">เลขที่ / วันที่</th>
                <th className="py-3 px-4 font-bold">ลูกค้า / โครงการ</th>
                <th className="py-3 px-4 font-bold">ข้อมูลสำคัญหน้างาน</th>
                <th className="py-3 px-4 font-bold">เซลส์ผู้ดูแล</th>
                <th className="py-3 px-4 font-bold">สถานะ & ผลประเมิน</th>
                <th className="py-3 px-4 font-bold text-right">จัดการ / PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-base font-bold text-gray-700">ไม่พบรายการสำรวจที่ตรงกับเงื่อนไข</p>
                      <p className="text-xs text-gray-400 mt-1">ลองปรับตัวกรอง หรือสร้างบันทึกสำรวจใหม่</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((survey) => {
                  const companyMeta = getSurveyCompanyMeta(survey.companyCode);
                  const statusMeta = getSurveyStatusMeta(survey.status);
                  const estMeta = getEstimationStatusMeta(survey.estimationStatus);
                  const avgBill = survey.usageBehavior?.avgBillThbPerMonth;
                  const kva = survey.electricalProfile?.transformerKva;
                  const roofTypes: string[] = survey.structure?.roofType || [];
                  const photoCount = survey._count?.photos || 0;
                  const hasBill = Boolean(survey.electricityBill?.fileUrl);

                  return (
                    <tr
                      key={survey.id}
                      onClick={() => handleEditSurvey(survey.id)}
                      className="hover:bg-red-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[#ff2301] group-hover:text-red-800 text-xs">
                            {survey.surveyNumber}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${companyMeta.badgeClass}`}>
                            {companyMeta.code}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{formatThaiDate(survey.surveyDate)}</div>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-[260px]">
                        <div className="font-bold text-gray-900 truncate">{survey.customerName || '-'}</div>
                        {survey.projectName && (
                          <div className="text-xs text-gray-600 truncate mt-0.5">{survey.projectName}</div>
                        )}
                        {survey.projectLocation && (
                          <div className="text-[11px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{survey.projectLocation}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {avgBill ? (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold">
                              ค่าไฟ ฿{formatNum(avgBill)}
                            </span>
                          ) : null}
                          {kva ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                              <Zap className="w-3 h-3" /> {formatNum(kva)} kVA
                            </span>
                          ) : null}
                          {roofTypes.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                              <Home className="w-3 h-3" /> {roofTypes[0]}
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                              photoCount > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-400 border-gray-200'
                            }`}
                          >
                            <Camera className="w-3 h-3" /> {photoCount} รูป
                          </span>
                          {hasBill && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                              <FileCheck2 className="w-3 h-3" /> มีบิล
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top text-xs text-gray-700">
                        <div className="font-semibold text-gray-900">{survey.salesperson?.fullName || '-'}</div>
                        {survey.surveyorName && (
                          <div className="text-[11px] text-gray-400 mt-0.5">ผู้สำรวจ: {survey.surveyorName}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}>
                            {statusMeta.shortLabel}
                          </span>
                          {(canEstimate || survey.estimationStatus === 'Estimated') && survey.estimatedPrice ? (
                            <div className="text-xs font-extrabold text-emerald-700 font-mono">
                              ฿{formatNum(survey.estimatedPrice)}
                            </div>
                          ) : canEstimate && survey.estimationStatus ? (
                            <div className="text-[11px] text-gray-500">{estMeta.label}</div>
                          ) : null}
                        </div>
                      </td>

                      <td
                        className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPdfTarget(survey)}
                            title="ดู / ดาวน์โหลด PDF"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-gray-700 hover:text-[#ff2301] border border-gray-200 hover:border-red-200 text-xs font-bold transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#ff2301]" />
                            PDF
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditSurvey(survey.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#ff2301] text-[#ff2301] hover:text-white text-xs font-bold transition cursor-pointer"
                          >
                            {isProjectRole ? 'ตรวจ & ประเมิน' : 'เปิดดู / แก้ไข'}
                          </button>

                          {canEditSales && (
                            <button
                              type="button"
                              onClick={() => setSurveyToDelete(survey)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="ลบแบบสำรวจ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredSurveys.length === 0 ? (
            <div className="py-12 text-center text-gray-500 px-4">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">ไม่พบข้อมูลการสำรวจ</p>
              <p className="text-xs text-gray-400 mt-1">ลองปรับคำค้นหาหรือสร้างบันทึกใหม่</p>
            </div>
          ) : (
            filteredSurveys.map((survey) => {
              const companyMeta = getSurveyCompanyMeta(survey.companyCode);
              const statusMeta = getSurveyStatusMeta(survey.status);
              const kva = survey.electricalProfile?.transformerKva;
              const roofTypes: string[] = survey.structure?.roofType || [];
              const hasBill = Boolean(survey.electricityBill?.fileUrl);
              return (
                <div
                  key={survey.id}
                  onClick={() => handleEditSurvey(survey.id)}
                  className="p-4 space-y-3 bg-white active:bg-red-50/30 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-[#ff2301]">{survey.surveyNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${companyMeta.badgeClass}`}>
                          {companyMeta.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">{formatThaiDate(survey.surveyDate)}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${statusMeta.badgeClass}`}>
                      {statusMeta.shortLabel}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 break-words">{survey.customerName || '-'}</div>
                    {survey.projectName && <div className="text-xs text-gray-600 mt-0.5 break-words">{survey.projectName}</div>}
                    {survey.projectLocation && (
                      <div className="text-[11px] text-gray-400 mt-1 flex items-start gap-1">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{survey.projectLocation}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px]">
                      {survey.usageBehavior?.avgBillThbPerMonth ? (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                          ค่าไฟ ฿{formatNum(survey.usageBehavior.avgBillThbPerMonth)}
                        </span>
                      ) : null}
                      {kva ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          <Zap className="w-3 h-3" /> {formatNum(kva)} kVA
                        </span>
                      ) : null}
                      {roofTypes.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                          <Home className="w-3 h-3" /> {roofTypes[0]}
                        </span>
                      ) : null}
                      {(canEstimate || survey.estimationStatus === 'Estimated') && survey.estimatedPrice ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          ประเมิน ฿{formatNum(survey.estimatedPrice)}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        <Camera className="w-3 h-3" /> {survey._count?.photos || 0} รูป
                      </span>
                      {hasBill && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <FileCheck2 className="w-3 h-3" /> มีบิล
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="space-y-2.5 pt-2.5 border-t border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-xs text-gray-500 truncate">
                      เซลส์ผู้ดูแล: <strong className="text-gray-700">{survey.salesperson?.fullName || '-'}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfTarget(survey)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer min-h-[40px]"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#ff2301]" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditSurvey(survey.id)}
                        className="flex-[1.5] inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#ff2301] text-white text-xs font-bold cursor-pointer min-h-[40px]"
                      >
                        {isProjectRole ? 'ตรวจ & ประเมิน' : 'เปิดดู / แก้ไข'}
                      </button>
                      {canEditSales && (
                        <button
                          type="button"
                          onClick={() => setSurveyToDelete(survey)}
                          className="p-2 text-gray-400 hover:text-red-600 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-gray-200 shrink-0"
                          title="ลบแบบสำรวจ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick PDF Preview Modal from List */}
      {pdfTarget && (
        <SurveyPdfPreviewModal
          surveyId={pdfTarget.id}
          surveyNumber={pdfTarget.surveyNumber}
          customerName={pdfTarget.customerName}
          cacheKey={pdfTarget.updatedAt || pdfTarget.version || 1}
          onClose={() => setPdfTarget(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {surveyToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isDeleting && setSurveyToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">ยืนยันการลบแบบสำรวจ</h3>
            <p className="text-sm text-gray-600">
              คุณต้องการลบแบบสำรวจ{' '}
              <span className="font-mono font-bold text-[#ff2301]">{surveyToDelete.surveyNumber}</span>{' '}
              ({surveyToDelete.customerName || '-'}) ใช่หรือไม่? ข้อมูลทั้งหมดไม่สามารถกู้คืนได้
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSurveyToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeDeleteSurvey}
                className="px-4 py-2 rounded-xl bg-[#ff2301] hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-bold cursor-pointer"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
