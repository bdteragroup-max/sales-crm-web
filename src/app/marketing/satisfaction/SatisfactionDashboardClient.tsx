"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, ArrowRight, BarChart3, TrendingUp, Filter } from 'lucide-react';
import { CustomerSatisfaction, Company } from '@/generated/client';
import { SATISFACTION_SCORE_LEGEND, formatPhoneForTel } from '@/app/lib/satisfactionScore';

type SurveyWithRelations = CustomerSatisfaction & {
  company: Company & { assignedUser?: { fullName: string } | null };
};

export default function SatisfactionDashboardClient() {
  const router = useRouter();
  const [round, setRound] = useState<string>('1');
  const [year, setYear] = useState<string>('2569'); // Or current BE year
  const [surveys, setSurveys] = useState<SurveyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set current year on mount
    const currentYearBE = new Date().getFullYear() + 543;
    setYear(currentYearBE.toString());
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

          <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
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
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="border-0 bg-slate-50 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#ff2301] cursor-pointer py-2.5 px-4"
            >
              {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
            </select>

            <Link
              href="/marketing/satisfaction/new"
              className="flex items-center gap-2 bg-[#ff2301] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all ml-2"
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
            <div className="p-8 border-b border-slate-100/60 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">รายการประเมินล่าสุด</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-5 font-bold whitespace-nowrap">วันที่</th>
                    <th className="p-5 font-bold whitespace-nowrap">ข้อมูลลูกค้า</th>
                    <th className="p-5 font-bold whitespace-nowrap text-center">คะแนนเฉลี่ย</th>
                    <th className="p-5 font-bold whitespace-nowrap">สถานะ</th>
                    <th className="p-5 font-bold whitespace-nowrap text-right pr-8">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#ff2301] border-t-transparent"></div>
                          <span className="font-semibold">กำลังโหลดข้อมูล...</span>
                        </div>
                      </td>
                    </tr>
                  ) : surveys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                            <AlertTriangle size={24} className="text-slate-300" />
                          </div>
                          <span className="font-bold text-slate-500 text-base">ไม่พบข้อมูลในรอบการประเมินนี้</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    surveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                        <td className="p-5 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(survey.surveyDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="p-5 min-w-[250px]">
                          <div className="font-bold text-slate-900">{survey.company.companyName}</div>
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
                              ผู้แทนขาย: {survey.company.assignedUser?.fullName ? (
                                <span className="text-slate-700 font-medium">{survey.company.assignedUser.fullName}</span>
                              ) : (
                                <span className="text-slate-300 italic">N/A</span>
                              )}
                            </span>
                          </div>
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
