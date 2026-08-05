"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Share2, FileText, Download, Loader2, Save } from 'lucide-react';
import { CustomerSatisfaction, Company, User } from '@/generated/client';

type SurveyData = CustomerSatisfaction & {
  company: Company;
  surveyor: User;
};

export default function SatisfactionDetailClient({ id }: { id: string }) {
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [analysisNote, setAnalysisNote] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [sharingToSales, setSharingToSales] = useState(false);
  const [sharingToService, setSharingToService] = useState(false);

  useEffect(() => {
    fetchSurvey();
  }, [id]);

  const fetchSurvey = async () => {
    try {
      const res = await fetch(`/api/satisfaction/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSurvey(data);
        setAnalysisNote(data.analysisNote || '');
        setActionPlan(data.actionPlan || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    setSavingAnalysis(true);
    try {
      const res = await fetch(`/api/satisfaction/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisNote, actionPlan })
      });
      if (res.ok) {
        alert('บันทึกข้อมูลวิเคราะห์สำเร็จ');
        fetchSurvey();
      } else {
        alert('บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAnalysis(false);
    }
  };

  const handleShare = async (target: 'SALES' | 'SERVICE') => {
    if (target === 'SALES') setSharingToSales(true);
    else setSharingToService(true);

    try {
      const res = await fetch(`/api/satisfaction/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      if (res.ok) {
        alert(`แจ้งเตือนทีม ${target} สำเร็จแล้ว`);
        fetchSurvey();
      } else {
        alert('การแจ้งเตือนล้มเหลว');
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (target === 'SALES') setSharingToSales(false);
      else setSharingToService(false);
    }
  };

  const handleExportPDF = async () => {
    window.open(`/api/satisfaction/${id}/pdf`, '_blank');
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#ff2301]" size={32} /></div>;
  }

  if (!survey) {
    return <div className="p-8 text-center text-gray-500">ไม่พบข้อมูลการประเมิน</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 mb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/marketing/satisfaction" className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{survey.company.companyName}</h1>
            <p className="text-gray-500">รอบประเมินที่ {survey.surveyRound} / ปี {survey.surveyYear}</p>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors"
        >
          <Download size={18} />
          <span>ดาวน์โหลดรายงาน (PDF)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scores & Feedback */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">คะแนนความพึงพอใจ</h2>
              <div className="text-3xl font-black text-[#ff2301]">{survey.scoreAverage.toFixed(1)}<span className="text-sm font-normal text-gray-500">/5</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600">Price (ราคา)</span>
                <span className="font-bold">{survey.scorePrice}/5</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600">Quality (คุณภาพ)</span>
                <span className="font-bold">{survey.scoreQuality}/5</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600">Delivery (การจัดส่ง)</span>
                <span className="font-bold">{survey.scoreDelivery}/5</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600">Sales (พนักงานขาย)</span>
                <span className="font-bold">{survey.scoreSales}/5</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600">Support (การแก้ปัญหา)</span>
                <span className="font-bold">{survey.scoreSupport}/5</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600">After-Sales (บริการหลังการขาย)</span>
                <span className="font-bold">{survey.scoreAfterSales}/5</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">ความคิดเห็นและข้อเสนอแนะ</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-semibold text-gray-500 block mb-2">ปัจจัยหลักที่เลือกซื้อ:</span>
                {survey.purchaseReasons.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {survey.purchaseReasons.map((reason: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">{reason}</span>
                    ))}
                  </div>
                ) : <span className="text-gray-400 text-sm">-</span>}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-500 block mb-2">ข้อเสนอแนะเพิ่มเติม:</span>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm min-h-[80px]">
                  {survey.suggestions || <span className="text-gray-400">ไม่มีข้อเสนอแนะเพิ่มเติม</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Analysis & Actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-[#ff2301]"/> บันทึกการวิเคราะห์
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ผลการวิเคราะห์</label>
                <textarea
                  value={analysisNote}
                  onChange={e => setAnalysisNote(e.target.value)}
                  placeholder="สาเหตุหรือข้อค้นพบจากการวิเคราะห์..."
                  className="w-full border-gray-300 rounded-lg focus:ring-[#ff2301] focus:border-[#ff2301] min-h-[100px] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">แผนการดำเนินการ</label>
                <textarea
                  value={actionPlan}
                  onChange={e => setActionPlan(e.target.value)}
                  placeholder="แนวทางแก้ไขหรือขั้นตอนการติดตาม..."
                  className="w-full border-gray-300 rounded-lg focus:ring-[#ff2301] focus:border-[#ff2301] min-h-[100px] text-sm"
                />
              </div>
              <button
                onClick={handleSaveAnalysis}
                disabled={savingAnalysis}
                className="w-full bg-[#ff2301] text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {savingAnalysis ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                บันทึกข้อมูลวิเคราะห์
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Share2 size={20} className="text-[#ff2301]"/> แจ้งเตือนทีมงานที่เกี่ยวข้อง
            </h2>
            <p className="text-sm text-gray-500 mb-4">ส่งการแจ้งเตือนไปยังทีมที่เกี่ยวข้องเพื่อรับทราบผลการประเมินนี้</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleShare('SALES')}
                disabled={sharingToSales}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                  survey.sharedToSales 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#ff2301] hover:text-[#ff2301]'
                }`}
              >
                {sharingToSales ? <Loader2 className="animate-spin" size={18} /> : (survey.sharedToSales ? <CheckCircle size={18} /> : <Share2 size={18} />)}
                {survey.sharedToSales ? 'ส่งให้ทีมฝ่ายขายแล้ว' : 'แจ้งเตือนทีมฝ่ายขาย'}
              </button>

              <button
                onClick={() => handleShare('SERVICE')}
                disabled={sharingToService}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                  survey.sharedToService 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#ff2301] hover:text-[#ff2301]'
                }`}
              >
                {sharingToService ? <Loader2 className="animate-spin" size={18} /> : (survey.sharedToService ? <CheckCircle size={18} /> : <Share2 size={18} />)}
                {survey.sharedToService ? 'ส่งให้ทีมบริการแล้ว' : 'แจ้งเตือนทีมบริการ'}
              </button>
            </div>
            {survey.sharedAt && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                ส่งล่าสุดเมื่อ: {new Date(survey.sharedAt).toLocaleString('th-TH')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
