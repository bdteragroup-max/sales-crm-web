"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  CheckCircle2,
  Wrench,
  Clock,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Filter,
  User,
  Download,
  ChevronDown,
  Search,
  Star,
  Sparkles,
  PhoneCall,
  Calendar,
  Layers,
  X
} from 'lucide-react';
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
  const [year, setYear] = useState<string>('2569');
  const [installFilter, setInstallFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'NO_INSTALLATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const averageScoreNum = surveys.length > 0
    ? surveys.reduce((acc, curr) => acc + curr.scoreAverage, 0) / surveys.length
    : 0;
  const averageScore = averageScoreNum.toFixed(1);
  const below3Count = surveys.filter(s => s.scoreAverage < 3).length;
  const awaitingAnalysisCount = surveys.filter(s => !s.analysisNote).length;

  // Installation KPIs
  const completedInstallCount = surveys.filter(s => s.installationStatus?.status === 'COMPLETED').length;
  const inProgressInstallCount = surveys.filter(s => s.installationStatus?.status === 'IN_PROGRESS').length;
  const noInstallCount = surveys.filter(s => s.installationStatus?.status === 'NO_INSTALLATION' || s.installationStatus?.status === 'UNKNOWN').length;

  // Satisfaction Tiers Breakdown
  const tierCounts = {
    excellent: surveys.filter(s => s.scoreAverage >= 4.5).length,
    good: surveys.filter(s => s.scoreAverage >= 3.5 && s.scoreAverage < 4.5).length,
    fair: surveys.filter(s => s.scoreAverage >= 2.5 && s.scoreAverage < 3.5).length,
    poor: surveys.filter(s => s.scoreAverage < 2.5).length,
  };

  // Filtered Surveys (by install status & search term)
  const displayedSurveys = surveys.filter(s => {
    // 1. Installation filter
    if (installFilter === 'COMPLETED' && s.installationStatus?.status !== 'COMPLETED') return false;
    if (installFilter === 'IN_PROGRESS' && s.installationStatus?.status !== 'IN_PROGRESS') return false;
    if (installFilter === 'NO_INSTALLATION' && s.installationStatus?.status !== 'NO_INSTALLATION' && s.installationStatus?.status !== 'UNKNOWN') return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const companyMatch = s.company?.companyName?.toLowerCase().includes(q);
      const contactMatch = s.contactName?.toLowerCase().includes(q);
      const phoneMatch = s.phone?.includes(q);
      const salesMatch = (s.salespersonName || s.company?.assignedUser?.fullName)?.toLowerCase().includes(q);
      const provMatch = (s.province || s.company?.province)?.toLowerCase().includes(q);
      const orderMatch = s.installationStatus?.orderNo?.toLowerCase().includes(q);
      const techMatch = s.installationStatus?.technician?.toLowerCase().includes(q);
      if (!companyMatch && !contactMatch && !phoneMatch && !salesMatch && !provMatch && !orderMatch && !techMatch) {
        return false;
      }
    }
    return true;
  });

  // Averages per topic
  const calculateAverage = (field: keyof CustomerSatisfaction) => {
    if (surveys.length === 0) return 0;
    return (surveys.reduce((acc, curr) => acc + (curr[field] as number), 0) / surveys.length).toFixed(1);
  };

  const averages = [
    { label: 'Price (ราคาและความคุ้มค่า)', score: Number(calculateAverage('scorePrice')) },
    { label: 'Quality (คุณภาพสินค้า)', score: Number(calculateAverage('scoreQuality')) },
    { label: 'Delivery (ความรวดเร็วและการจัดส่ง)', score: Number(calculateAverage('scoreDelivery')) },
    { label: 'Sales Staff (การบริการของฝ่ายขาย)', score: Number(calculateAverage('scoreSales')) },
    { label: 'Support (การแก้ปัญหาและประสานงาน)', score: Number(calculateAverage('scoreSupport')) },
    { label: 'After-sales (บริการหลังการขาย)', score: Number(calculateAverage('scoreAfterSales')) },
  ];

  const renderProgressBar = (score: number) => {
    const percentage = Math.min(100, Math.max(0, (score / 5) * 100));
    const isWarning = score < 3.0 && score > 0;
    const isGood = score >= 4.0;
    const gradient = isWarning
      ? 'from-amber-400 to-rose-500'
      : isGood
        ? 'from-emerald-400 to-teal-500'
        : 'from-blue-400 to-indigo-500';

    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="font-bold text-slate-800 text-xs w-9 text-right tabular-nums">{score.toFixed(1)}</span>
      </div>
    );
  };

  const getRatingCategory = (avg: number) => {
    if (avg >= 4.5) return { label: 'ดีมาก (มากที่สุด)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (avg >= 3.5) return { label: 'ดี (มาก)', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (avg >= 2.5) return { label: 'ปานกลาง', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (avg >= 1.5) return { label: 'น้อย (ปรับปรุง)', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { label: 'น้อยที่สุด (เร่งด่วน)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
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

  const activeRating = getRatingCategory(averageScoreNum);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 font-sans">
      <div className="p-6 max-w-7xl mx-auto space-y-8 pt-8">

        {/* 1. Header & Controls (Symmetric Top Bar) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff2301] to-orange-500 text-white shadow-md shadow-red-500/20">
                <Star size={20} className="fill-white" />
              </span>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  แดชบอร์ดความพึงพอใจ
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-0.5">
                  สรุปผลการสำรวจความคิดเห็นลูกค้าและการวิเคราะห์ของฝ่ายการตลาด • รอบที่ {round === 'all' ? 'ทั้งหมด' : round} ปี {year}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-2 pl-3">
              <Filter size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">ตัวกรอง</span>
            </div>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="border-0 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#ff2301] cursor-pointer py-2.5 px-3.5 hover:bg-slate-100 transition-colors"
            >
              <option value="1">รอบที่ 1 (ม.ค. - มิ.ย.)</option>
              <option value="2">รอบที่ 2 (ก.ค. - ธ.ค.)</option>
              <option value="all">ทุกรอบการประเมิน (ม.ค. - ธ.ค.)</option>
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="border-0 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#ff2301] cursor-pointer py-2.5 px-3.5 hover:bg-slate-100 transition-colors"
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
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-1.5 text-xs font-bold text-slate-400 border-b border-slate-100">
                    เลือกรูปแบบไฟล์ ({displayedSurveys.length} รายการ)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    <span>Excel Spreadsheet (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                  >
                    <FileText size={16} className="text-blue-600" />
                    <span>CSV Comma Separated (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/marketing/satisfaction/new"
              className="flex items-center gap-2 bg-[#ff2301] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all ml-1 text-sm"
            >
              <Plus size={18} />
              <span>เพิ่มแบบประเมิน</span>
            </Link>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards (4 Symmetrical Columns 1:1:1:1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Surveyed */}
          <div className="bg-white p-6 rounded-[1.8rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 font-bold text-xs uppercase tracking-wider">ประเมินแล้วทั้งหมด</div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{surveyedCount}</span>
              <span className="text-xs font-bold text-slate-400">รายการ</span>
            </div>
            <div className="mt-3 text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-500" />
              <span>คิดเป็น 100% ของรอบประเมินนี้</span>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white p-6 rounded-[1.8rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 font-bold text-xs uppercase tracking-wider">คะแนนเฉลี่ยรวม</div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-600 tracking-tight">{averageScore}</span>
              <span className="text-sm font-bold text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${activeRating.color}`}>
                {activeRating.label}
              </span>
            </div>
          </div>

          {/* Below 3 Stars */}
          <div className="bg-white p-6 rounded-[1.8rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 font-bold text-xs uppercase tracking-wider">ต่ำกว่า 3.0 ดาว</div>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-rose-600 tracking-tight">{below3Count}</span>
              <span className="text-xs font-bold text-slate-400">รายการ</span>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-400 flex items-center gap-1.5">
              {below3Count > 0 ? (
                <span className="text-rose-600 font-bold">ต้องการการติดตามแก้ไขเร่งด่วน</span>
              ) : (
                <span className="text-emerald-600 font-bold">ไม่มีรายการต่ำกว่าเกณฑ์</span>
              )}
            </div>
          </div>

          {/* Pending Analysis */}
          <div className="bg-white p-6 rounded-[1.8rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 font-bold text-xs uppercase tracking-wider">รอดำเนินการวิเคราะห์</div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-500 tracking-tight">{awaitingAnalysisCount}</span>
              <span className="text-xs font-bold text-slate-400">รายการ</span>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-400 flex items-center gap-1.5">
              {awaitingAnalysisCount > 0 ? (
                <span className="text-amber-600 font-bold">รอการตลาดวิเคราะห์และวางแผน</span>
              ) : (
                <span className="text-emerald-600 font-bold">วิเคราะห์ครบถ้วนแล้ว</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Analytics & Breakdown Section (Symmetrical 2-Column Grid: 50% / 50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Card: Category Performance Breakdown */}
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff2301] flex items-center justify-center">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">คะแนนเฉลี่ยแต่ละด้าน</h2>
                    <p className="text-xs font-semibold text-slate-400">การประเมินความพึงพอใจ 6 มิติ</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700">
                  <span>เป้าหมาย</span>
                  <span className="text-emerald-600">≥ 4.0</span>
                </div>
              </div>

              {loading ? (
                <div className="animate-pulse space-y-5">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-8 bg-slate-50 rounded-xl w-full"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {averages.map((avg, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{avg.label}</span>
                        <span className={`font-bold ${avg.score >= 4 ? 'text-emerald-600' : avg.score >= 3 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {avg.score.toFixed(1)} / 5.0
                        </span>
                      </div>
                      {renderProgressBar(avg.score)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compact Scoring Criteria Legend */}
            <div className="mt-7 pt-5 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                เกณฑ์การให้คะแนน (Scoring Legend)
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {SATISFACTION_SCORE_LEGEND.map(legend => (
                  <div key={legend.score} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                    <span className="font-black text-slate-800 text-sm leading-none mb-1">{legend.score}</span>
                    <span className="text-[10px] font-bold text-slate-500 truncate w-full">{legend.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Card: Score Distribution & On-Site Operations Overview */}
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">สัดส่วนคะแนน & การปฏิบัติการ</h2>
                    <p className="text-xs font-semibold text-slate-400">ภาพรวมระดับความพึงพอใจและงานติดตั้งหน้างาน</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
                  ทั้งหมด {surveyedCount} รายการ
                </div>
              </div>

              {/* CSAT Distribution Bars */}
              <div className="space-y-3.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>สัดส่วนระดับความพึงพอใจ (CSAT Tiers)</span>
                  <span className="text-[11px] text-slate-400 font-semibold">จำนวนและเปอร์เซ็นต์</span>
                </div>

                {/* Excellent */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      ดีมาก (4.5 - 5.0 ดาว)
                    </span>
                    <span className="text-slate-700">
                      {tierCounts.excellent} รายการ ({surveyedCount > 0 ? Math.round((tierCounts.excellent / surveyedCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${surveyedCount > 0 ? (tierCounts.excellent / surveyedCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Good */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      ดี (3.5 - 4.4 ดาว)
                    </span>
                    <span className="text-slate-700">
                      {tierCounts.good} รายการ ({surveyedCount > 0 ? Math.round((tierCounts.good / surveyedCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${surveyedCount > 0 ? (tierCounts.good / surveyedCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Fair */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      ปานกลาง (2.5 - 3.4 ดาว)
                    </span>
                    <span className="text-slate-700">
                      {tierCounts.fair} รายการ ({surveyedCount > 0 ? Math.round((tierCounts.fair / surveyedCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${surveyedCount > 0 ? (tierCounts.fair / surveyedCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Poor */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-rose-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      ต้องปรับปรุง (&lt; 2.5 ดาว)
                    </span>
                    <span className="text-slate-700">
                      {tierCounts.poor} รายการ ({surveyedCount > 0 ? Math.round((tierCounts.poor / surveyedCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-700"
                      style={{ width: `${surveyedCount > 0 ? (tierCounts.poor / surveyedCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: On-Site Operations 3-Column Symmetrical Summary */}
            <div className="mt-7 pt-5 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                สถานะงานติดตั้งหน้างาน (On-Site Operations)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-xs mb-1">
                    <CheckCircle2 size={14} />
                    <span>ติดตั้งเสร็จแล้ว</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 tracking-tight">{completedInstallCount}</div>
                  <div className="text-[10px] text-emerald-600/80 font-bold">รายการ</div>
                </div>

                <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-700 font-bold text-xs mb-1">
                    <Wrench size={14} />
                    <span>กำลังติดตั้ง</span>
                  </div>
                  <div className="text-2xl font-black text-blue-700 tracking-tight">{inProgressInstallCount}</div>
                  <div className="text-[10px] text-blue-600/80 font-bold">รายการ</div>
                </div>

                <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-700 font-bold text-xs mb-1">
                    <CheckCircle size={14} />
                    <span>ไม่มีงานติดตั้ง</span>
                  </div>
                  <div className="text-2xl font-black text-slate-700 tracking-tight">{noInstallCount}</div>
                  <div className="text-[10px] text-slate-500 font-bold">รายการ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Full-Width Evaluation Records Table Section (Symmetrical 100% Width) */}
        <div className="w-full bg-white rounded-[2rem] border border-slate-200/70 shadow-sm shadow-slate-200/40 overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <span>รายการแบบประเมินความพึงพอใจ</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {displayedSurveys.length} รายการ
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  แสดง {displayedSurveys.length} จากทั้งหมด {surveys.length} รายการตามเงื่อนไขที่เลือก
                </p>
              </div>

              {/* Search Bar Input */}
              <div className="relative min-w-[280px] sm:min-w-[340px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อลูกค้า, ผู้แทนขาย, ช่าง, เบอร์โทร..."
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff2301] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills & Secondary Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
                  <CheckCircle2 size={13} />
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
                  <Wrench size={13} />
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

              {/* Quick Excel Export */}
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                disabled={displayedSurveys.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="ส่งออก Excel เฉพาะรายการที่กำลังแสดงผล"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>ดาวน์โหลด Excel ({displayedSurveys.length})</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4 font-bold whitespace-nowrap pl-6">วันที่ & ช่องทาง</th>
                  <th className="p-4 font-bold whitespace-nowrap">ข้อมูลลูกค้า / ผู้ติดต่อ</th>
                  <th className="p-4 font-bold whitespace-nowrap">ผู้แทนขายผู้ดูแล</th>
                  <th className="p-4 font-bold whitespace-nowrap">สถานะงานติดตั้ง</th>
                  <th className="p-4 font-bold whitespace-nowrap text-center">คะแนนเฉลี่ย</th>
                  <th className="p-4 font-bold whitespace-nowrap text-center">สถานะวิเคราะห์</th>
                  <th className="p-4 font-bold whitespace-nowrap text-right pr-6">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#ff2301] border-t-transparent"></div>
                        <span className="font-bold text-slate-500">กำลังโหลดข้อมูลการประเมิน...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedSurveys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <AlertTriangle size={24} />
                        </div>
                        <span className="font-bold text-slate-600 text-base">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</span>
                        <p className="text-xs text-slate-400">ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองสถานะงานติดตั้ง</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedSurveys.map((survey) => {
                    const rating = getRatingCategory(survey.scoreAverage);
                    const salesperson = survey.salespersonName || survey.company?.assignedUser?.fullName;

                    return (
                      <tr key={survey.id} className="hover:bg-slate-50/70 transition-colors group cursor-default">
                        {/* 1. Date & Method */}
                        <td className="p-4 pl-6 whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {new Date(survey.surveyDate).toLocaleDateString('th-TH')}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                            {survey.surveyMethod === 'PHONE' ? (
                              <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                <PhoneCall size={10} /> โทรศัพท์
                              </span>
                            ) : survey.surveyMethod === 'ONSITE' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <Wrench size={10} /> ลงพื้นที่
                              </span>
                            ) : (
                              <span>{survey.surveyMethod || '-'}</span>
                            )}
                          </div>
                        </td>

                        {/* 2. Customer & Contact Info */}
                        <td className="p-4 min-w-[240px]">
                          <div className="font-bold text-slate-900 leading-tight">
                            {survey.company.companyName}
                          </div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                            <User size={12} className="text-[#ff2301]" />
                            <span>ผู้ติดต่อ: {survey.contactName || <span className="text-slate-400 font-normal">ไม่ระบุ</span>}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            {survey.phone ? (
                              <a href={`tel:${formatPhoneForTel(survey.phone)}`} className="text-blue-600 hover:underline font-semibold">
                                {survey.phone}
                              </a>
                            ) : (
                              <span className="text-slate-300">ไม่มีเบอร์โทร</span>
                            )}
                            {(survey.province || survey.company?.province) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">{survey.province || survey.company?.province}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 3. Assigned Salesperson */}
                        <td className="p-4 whitespace-nowrap">
                          {salesperson ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {salesperson.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-slate-800">{salesperson}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">N/A</span>
                          )}
                        </td>

                        {/* 4. Installation Status */}
                        <td className="p-4 whitespace-nowrap">
                          {survey.installationStatus?.status === 'COMPLETED' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 w-fit">
                                <CheckCircle2 size={12} className="text-emerald-600" />
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 w-fit animate-pulse">
                                <Wrench size={12} className="text-blue-600" />
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                              ส่งมอบแล้ว (ไม่มีติดตั้ง)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 w-fit">
                              ไม่มีข้อมูลงานติดตั้ง
                            </span>
                          )}
                        </td>

                        {/* 5. Average Score & Rating Pill */}
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-black text-slate-900 leading-none">
                              {survey.scoreAverage.toFixed(1)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${rating.color}`}>
                              {rating.label.split(' ')[0]}
                            </span>
                          </div>
                        </td>

                        {/* 6. Analysis Status */}
                        <td className="p-4 text-center whitespace-nowrap">
                          {survey.analysisNote ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                              <CheckCircle size={13} /> วิเคราะห์แล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                              <Clock size={13} /> รอดำเนินการ
                            </span>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="p-4 text-right pr-6 whitespace-nowrap">
                          <Link
                            href={`/marketing/satisfaction/${survey.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-[#ff2301] text-slate-700 hover:text-white rounded-xl font-bold text-xs transition-all duration-200 shadow-sm"
                          >
                            <span>เปิดดู</span>
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Stats */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold px-6">
            <span>แสดงข้อมูลทั้งหมด {displayedSurveys.length} รายการ</span>
            <span className="text-slate-500">ระบบประเมินความพึงพอใจลูกค้า TERA CRM</span>
          </div>
        </div>

      </div>
    </div>
  );
}
