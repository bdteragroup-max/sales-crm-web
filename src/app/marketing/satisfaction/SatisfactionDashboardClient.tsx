"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, FileSpreadsheet, CheckCircle, CheckCircle2, Wrench, Clock, AlertTriangle, ArrowRight, BarChart3, TrendingUp, Filter, User, Download, ChevronDown } from 'lucide-react';
import { CustomerSatisfaction, Company } from '@/generated/client';
import { SATISFACTION_SCORE_LEGEND, formatPhoneForTel } from '@/app/lib/satisfactionScore';
import { InstallationStatusInfo } from '@/app/lib/satisfactionHelper';
import * as XLSX from 'xlsx';

type SurveyWithRelations = CustomerSatisfaction & {
  company: Company & { assignedUser?: { fullName: string } | null };
  salespersonName?: string | null;
  installationStatus?: InstallationStatusInfo;
};

export default function SatisfactionDashboardClient() {
  const router = useRouter();
  const [round, setRound] = useState<string>('1');
  const [year, setYear] = useState<string>('2569'); // Or current BE year
  const [installFilter, setInstallFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'NO_INSTALLATION'>('ALL');
  const [surveys, setSurveys] = useState<SurveyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set current year on mount
    const currentYearBE = new Date().getFullYear() + 543;
    setYear(currentYearBE.toString());
  }, []);

  // Click outside listener for export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [round, year]);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/satisfaction?round=${round}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setSurveys(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentYearBE = new Date().getFullYear() + 543;
  const years = Array.from({ length: 5 }, (_, i) => (currentYearBE - 2 + i).toString());

  // KPIs
  const surveyedCount = surveys.length;
  const averageScore = surveys.length > 0
    ? (surveys.reduce((acc, curr) => acc + curr.scoreAverage, 0) / surveys.length).toFixed(1)
    : '0.0';
  const below3Count = surveys.filter(s => s.scoreAverage < 3).length;
  const awaitingAnalysisCount = surveys.filter(s => !s.analysisNote).length;

  // Installation KPIs & Filtering
  const completedInstallCount = surveys.filter(s => s.installationStatus?.status === 'COMPLETED').length;
  const inProgressInstallCount = surveys.filter(s => s.installationStatus?.status === 'IN_PROGRESS').length;
  const noInstallCount = surveys.filter(s => s.installationStatus?.status === 'NO_INSTALLATION' || s.installationStatus?.status === 'UNKNOWN').length;

  const displayedSurveys = surveys.filter(s => {
    if (installFilter === 'ALL') return true;
    if (installFilter === 'COMPLETED') return s.installationStatus?.status === 'COMPLETED';
    if (installFilter === 'IN_PROGRESS') return s.installationStatus?.status === 'IN_PROGRESS';
    if (installFilter === 'NO_INSTALLATION') return s.installationStatus?.status === 'NO_INSTALLATION' || s.installationStatus?.status === 'UNKNOWN';
    return true;
  });

  // Averages per topic
  const calculateAverage = (field: keyof CustomerSatisfaction) => {
    if (surveys.length === 0) return 0;
    return (surveys.reduce((acc, curr) => acc + (curr[field] as number), 0) / surveys.length).toFixed(1);
  };

  const averages = [
    { label: 'Price (ราคา)', score: Number(calculateAverage('scorePrice')) },
    { label: 'Quality (คุณภาพสินค้า)', score: Number(calculateAverage('scoreQuality')) },
    { label: 'Delivery (การจัดส่ง)', score: Number(calculateAverage('scoreDelivery')) },
    { label: 'Sales Staff (พนักงานขาย)', score: Number(calculateAverage('scoreSales')) },
    { label: 'Support (การแก้ปัญหา)', score: Number(calculateAverage('scoreSupport')) },
    { label: 'After-sales (บริการหลังการขาย)', score: Number(calculateAverage('scoreAfterSales')) },
  ];

  const renderProgressBar = (score: number) => {
    const percentage = (score / 5) * 100;
    const isWarning = score < 3.5 && score > 0;
    const gradient = isWarning ? 'from-amber-400 to-red-400' : 'from-emerald-400 to-green-500';
    const bgGlow = isWarning ? 'shadow-amber-500/30' : 'shadow-green-500/30';

    return (
      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-sm ${bgGlow} transition-all duration-1000 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="font-black text-slate-700 w-10 text-right">{score.toFixed(1)}</span>
      </div>
    );
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (displayedSurveys.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออกตามเงื่อนไขที่เลือก');
      return;
    }

    const exportData = displayedSurveys.map((survey, index) => {
      let ratingCategory = 'ปานกลาง';
      if (survey.scoreAverage >= 4.5) ratingCategory = 'ดีมาก (มากที่สุด)';
      else if (survey.scoreAverage >= 3.5) ratingCategory = 'ดี (มาก)';
      else if (survey.scoreAverage >= 2.5) ratingCategory = 'ปานกลาง';
      else if (survey.scoreAverage >= 1.5) ratingCategory = 'น้อย (ต้องปรับปรุง)';
      else ratingCategory = 'น้อยที่สุด (เร่งด่วน)';

      const salesperson = survey.salespersonName || survey.company?.assignedUser?.fullName || '-';

      return {
        'ลำดับ': index + 1,
        'วันที่ประเมิน': new Date(survey.surveyDate).toLocaleDateString('th-TH'),
        'รอบการประเมิน': `รอบที่ ${survey.surveyRound}`,
        'ปี (พ.ศ.)': survey.surveyYear,
        'ช่องทางการประเมิน': survey.surveyMethod === 'PHONE' ? 'โทรศัพท์ (Phone)' : survey.surveyMethod === 'ONSITE' ? 'ลงพื้นที่ (On-site)' : (survey.surveyMethod || '-'),
        'ชื่อบริษัท / ลูกค้า': survey.company?.companyName || '-',
        'ผู้ติดต่อ': survey.contactName || '-',
        'เบอร์โทรศัพท์': survey.phone || '-',
        'จังหวัด': survey.province || survey.company?.province || '-',
        'ผู้แทนขายที่ดูแล': salesperson,
        'สถานะงานติดตั้ง': survey.installationStatus?.label || 'ไม่มีข้อมูลงานติดตั้ง',
        'เลขที่ใบงานติดตั้ง': survey.installationStatus?.orderNo || '-',
        'ช่างผู้รับผิดชอบ': survey.installationStatus?.technician || '-',
        'เลขที่ใบเสนอราคา': Array.isArray(survey.quotationIds) ? survey.quotationIds.join(', ') : (survey.quotationIds || '-'),
        'คะแนน: ราคา (Price)': survey.scorePrice,
        'คะแนน: คุณภาพสินค้า (Quality)': survey.scoreQuality,
        'คะแนน: การจัดส่ง (Delivery)': survey.scoreDelivery,
        'คะแนน: พนักงานขาย (Sales Staff)': survey.scoreSales,
        'คะแนน: การแก้ปัญหา (Support)': survey.scoreSupport,
        'คะแนน: บริการหลังการขาย (After-sales)': survey.scoreAfterSales,
        'คะแนนเฉลี่ยรวม': Number(survey.scoreAverage.toFixed(2)),
        'เกณฑ์ประเมิน': ratingCategory,
        'เหตุผลที่ตัดสินใจซื้อ': Array.isArray(survey.purchaseReasons) ? survey.purchaseReasons.join(', ') : (survey.purchaseReasons || '-'),
        'ข้อเสนอแนะเพิ่มเติมจากลูกค้า': survey.suggestions || '-',
        'บันทึกการสนทนา (Call Notes)': survey.callNotes || '-',
        'สถานะการวิเคราะห์': survey.analysisNote ? 'วิเคราะห์แล้ว' : 'รอดำเนินการ',
        'บันทึกการวิเคราะห์ (Marketing Analysis)': survey.analysisNote || '-',
        'แผนงานแก้ไข/ปรับปรุง (Action Plan)': survey.actionPlan || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for comfortable reading
    const colWidths = [
      { wch: 6 },  // ลำดับ
      { wch: 14 }, // วันที่
      { wch: 14 }, // รอบ
      { wch: 10 }, // ปี
      { wch: 20 }, // ช่องทาง
      { wch: 32 }, // ชื่อบริษัท
      { wch: 20 }, // ผู้ติดต่อ
      { wch: 16 }, // เบอร์โทร
      { wch: 16 }, // จังหวัด
      { wch: 22 }, // ผู้แทนขาย
      { wch: 20 }, // สถานะติดตั้ง
      { wch: 18 }, // เลขที่ใบงานติดตั้ง
      { wch: 20 }, // ช่าง
      { wch: 22 }, // เลขที่ใบเสนอราคา
      { wch: 14 }, // ราคา
      { wch: 14 }, // คุณภาพ
      { wch: 14 }, // การจัดส่ง
      { wch: 14 }, // พนักงานขาย
      { wch: 14 }, // การแก้ปัญหา
      { wch: 14 }, // บริการหลังการขาย
      { wch: 14 }, // คะแนนเฉลี่ย
      { wch: 20 }, // เกณฑ์ประเมิน
      { wch: 30 }, // เหตุผลตัดสินใจซื้อ
      { wch: 35 }, // ข้อเสนอแนะ
      { wch: 35 }, // บันทึกสนทนา
      { wch: 16 }, // สถานะวิเคราะห์
      { wch: 35 }, // บันทึกวิเคราะห์
      { wch: 35 }, // แผนงานแก้ไข
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'แบบประเมินความพึงพอใจ');

    const roundLabel = round === 'all' ? 'AllRounds' : `Round${round}`;
    const installLabel = installFilter !== 'ALL' ? `_${installFilter}` : '';
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Customer_Satisfaction_${year}_${roundLabel}${installLabel}_${dateStr}.${format}`;

    XLSX.writeFile(wb, fileName, { bookType: format });
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      <div className="p-6 max-w-7xl mx-auto space-y-8 pt-8">

        {/* Header & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              แดชบอร์ดความพึงพอใจ
            </h1>
            <p className="text-slate-500 font-medium mt-1">สรุปข้อมูลการประเมินจากลูกค้าและการวิเคราะห์ของฝ่ายการตลาด</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 pl-3">
              <Filter size={18} className="text-slate-400" />
            </div>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="border-0 bg-slate-50 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#ff2301] cursor-pointer py-2.5 px-4"
            >
              <option value="1">รอบที่ 1 (ม.ค. - มิ.ย.)</option>
              <option value="2">รอบที่ 2 (ก.ค. - ธ.ค.)</option>
              <option value="all">ทุกรอบการประเมิน (ม.ค. - ธ.ค.)</option>
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="border-0 bg-slate-50 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#ff2301] cursor-pointer py-2.5 px-4"
            >
              {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
            </select>

            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={displayedSurveys.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md hover:shadow-emerald-500/20 transition-all text-sm"
                title="ส่งออกไฟล์"
              >
                <Download size={16} />
                <span>ส่งออกไฟล์</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-50">
                    เลือกรูปแบบไฟล์ ({displayedSurveys.length} รายการ)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText size={16} className="text-blue-600" />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/marketing/satisfaction/new"
              className="flex items-center gap-2 bg-[#ff2301] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all ml-1"
            >
              <Plus size={18} />
              <span>เพิ่มแบบประเมิน</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/40 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 font-bold text-sm">ประเมินแล้ว</div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <FileText size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{surveyedCount}</span>
              <span className="text-sm font-semibold text-slate-500">รายการ</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/40 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 font-bold text-sm">คะแนนเฉลี่ยรวม</div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-emerald-600">{averageScore}</span>
              <span className="text-lg font-bold text-slate-400">/5</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/40 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 font-bold text-sm">ต่ำกว่า 3 ดาว</div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-red-500">{below3Count}</span>
              <span className="text-sm font-semibold text-slate-500">รายการ</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/40 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 font-bold text-sm">รอวิเคราะห์</div>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                <Clock size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-500">{awaitingAnalysisCount}</span>
              <span className="text-sm font-semibold text-slate-500">รายการ</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/40 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">คะแนนเฉลี่ยแต่ละด้าน</h2>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-10 bg-slate-50 rounded-xl w-full"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 flex-1">
                {averages.map((avg, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700">{avg.label}</span>
                    {renderProgressBar(avg.score)}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">เกณฑ์การให้คะแนน (Scoring Criteria)</h3>
              <div className="space-y-2 text-xs">
                {SATISFACTION_SCORE_LEGEND.map(legend => (
                  <div key={legend.score} className="flex items-center gap-2">
                    <span className="font-black text-slate-700 bg-slate-100 w-6 h-6 flex items-center justify-center rounded">{legend.score}</span>
                    <span className="text-slate-600">{legend.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/40 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100/60 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">รายการประเมินล่าสุด</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  แสดง {displayedSurveys.length} จากทั้งหมด {surveys.length} รายการ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Installation Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setInstallFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      installFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ทั้งหมด ({surveys.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallFilter('COMPLETED')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      installFilter === 'COMPLETED'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>ติดตั้งเสร็จแล้ว ({completedInstallCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallFilter('IN_PROGRESS')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      installFilter === 'IN_PROGRESS'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Wrench size={12} />
                    <span>กำลังติดตั้ง ({inProgressInstallCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallFilter('NO_INSTALLATION')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      installFilter === 'NO_INSTALLATION'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ไม่มีติดตั้ง ({noInstallCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  disabled={displayedSurveys.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="ส่งออก Excel เฉพาะรายการที่กำลังแสดงผล"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-5 font-bold whitespace-nowrap">วันที่</th>
                    <th className="p-5 font-bold whitespace-nowrap">ข้อมูลลูกค้า</th>
                    <th className="p-5 font-bold whitespace-nowrap">สถานะการติดตั้ง</th>
                    <th className="p-5 font-bold whitespace-nowrap text-center">คะแนนเฉลี่ย</th>
                    <th className="p-5 font-bold whitespace-nowrap">สถานะวิเคราะห์</th>
                    <th className="p-5 font-bold whitespace-nowrap text-right pr-8">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#ff2301] border-t-transparent"></div>
                          <span className="font-semibold">กำลังโหลดข้อมูล...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayedSurveys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                            <AlertTriangle size={24} className="text-slate-300" />
                          </div>
                          <span className="font-bold text-slate-500 text-base">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedSurveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                        <td className="p-5 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(survey.surveyDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="p-5 min-w-[250px]">
                          <div className="font-bold text-slate-900">{survey.company.companyName}</div>
                          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
                            <User size={12} className="text-[#ff2301]" />
                            <span>ผู้ติดต่อ: {survey.contactName || <span className="text-slate-400 font-normal">ไม่ระบุ</span>}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            {survey.phone ? (
                              <a href={`tel:${formatPhoneForTel(survey.phone)}`} className="text-blue-600 hover:underline">
                                {survey.phone}
                              </a>
                            ) : (
                              <span className="text-slate-300">ไม่มีเบอร์โทร</span>
                            )}
                            <span className="text-slate-300">|</span>
                            <span>
                              ผู้แทนขาย: {survey.salespersonName || survey.company?.assignedUser?.fullName ? (
                                <span className="text-slate-700 font-medium">{survey.salespersonName || survey.company?.assignedUser?.fullName}</span>
                              ) : (
                                <span className="text-slate-300 italic">N/A</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 whitespace-nowrap">
                          {survey.installationStatus?.status === 'COMPLETED' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm w-fit">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>ติดตั้งเสร็จสมบูรณ์แล้ว</span>
                              </span>
                              {survey.installationStatus.orderNo && (
                                <span className="text-[11px] text-slate-400 font-mono pl-1">
                                  {survey.installationStatus.orderNo}
                                </span>
                              )}
                            </div>
                          ) : survey.installationStatus?.status === 'IN_PROGRESS' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm w-fit animate-pulse">
                                <Wrench size={13} className="text-blue-600" />
                                <span>กำลังติดตั้งอยู่หน้างาน</span>
                              </span>
                              {survey.installationStatus.technician ? (
                                <span className="text-[11px] text-slate-500 font-medium pl-1">
                                  ช่าง: {survey.installationStatus.technician}
                                </span>
                              ) : survey.installationStatus.orderNo ? (
                                <span className="text-[11px] text-slate-400 font-mono pl-1">
                                  {survey.installationStatus.orderNo}
                                </span>
                              ) : null}
                            </div>
                          ) : survey.installationStatus?.status === 'NO_INSTALLATION' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                              ส่งมอบแล้ว (ไม่มีติดตั้ง)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 border border-slate-100 w-fit">
                              ไม่มีข้อมูลงานติดตั้ง
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          <span className={`inline-flex px-3 py-1.5 rounded-xl font-black text-sm shadow-sm ${survey.scoreAverage >= 4 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50' :
                            survey.scoreAverage >= 3 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/50' :
                              'bg-red-50 text-red-700 ring-1 ring-red-200/50'
                            }`}>
                            {survey.scoreAverage.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-5">
                          {survey.analysisNote ? (
                            <span className="text-emerald-700 flex items-center gap-1.5 font-bold text-xs bg-emerald-50 ring-1 ring-emerald-200/50 px-3 py-1.5 rounded-xl w-fit">
                              <CheckCircle size={14} /> วิเคราะห์แล้ว
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1.5 font-bold text-xs bg-amber-50 ring-1 ring-amber-200/50 px-3 py-1.5 rounded-xl w-fit">
                              <Clock size={14} /> รอดำเนินการ
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-right pr-8">
                          <Link
                            href={`/marketing/satisfaction/${survey.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-[#ff2301] text-slate-700 hover:text-white rounded-xl font-bold transition-all duration-300"
                          >
                            เปิดดู <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
