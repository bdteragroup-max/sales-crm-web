"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowLeft, Building2, Package, CheckCircle, Sparkles } from 'lucide-react';
import { searchCompanies } from "@/app/actions/sales";
import Link from 'next/link';

export default function NewSatisfactionSurvey() {
  const router = useRouter();

  const currentYearBE = new Date().getFullYear() + 543;
  const [round, setRound] = useState('1');
  const [year, setYear] = useState(currentYearBE.toString());
  const [method, setMethod] = useState('PHONE');

  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);

  const [activeCompanies, setActiveCompanies] = useState<any[]>([]);
  const [loadingActiveCompanies, setLoadingActiveCompanies] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [salesData, setSalesData] = useState<{ quotations: any[], productSummary: any[] } | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [scores, setScores] = useState({
    price: 0,
    quality: 0,
    delivery: 0,
    sales: 0,
    support: 0,
    afterSales: 0
  });

  const [feedback, setFeedback] = useState({
    purchaseReasons: [] as string[],
    suggestions: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Search companies
  useEffect(() => {
    if (search.length < 2) {
      setCompanies([]);
      return;
    }
    if (selectedCompany && search === selectedCompany.companyName) return;

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCompanies(search);
        setCompanies(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [search]);

  // Fetch active companies based on round and year
  useEffect(() => {
    const fetchActiveCompanies = async () => {
      setLoadingActiveCompanies(true);
      try {
        const res = await fetch(`/api/satisfaction/active-companies?round=${round}&year=${year}`);
        if (res.ok) {
          const data = await res.json();
          setActiveCompanies(data.companies || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingActiveCompanies(false);
      }
    };
    fetchActiveCompanies();
  }, [round, year]);

  // Fetch sales data when company is selected
  useEffect(() => {
    if (selectedCompany) {
      fetchSalesData(selectedCompany.id, round, year);
    } else {
      setSalesData(null);
    }
  }, [selectedCompany, round, year]);

  const fetchSalesData = async (companyId: string, r: string, y: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/satisfaction/company-data?companyId=${companyId}&round=${r}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return alert('กรุณาเลือกบริษัท');
    if (Object.values(scores).some(s => s === 0)) return alert('กรุณาให้คะแนนให้ครบทุกด้าน');

    setSubmitting(true);
    try {
      const payload = {
        surveyRound: parseInt(round),
        surveyYear: parseInt(year),
        surveyMethod: method,
        surveyBy: 'MARKETING', // Using placeholder for marketing user
        companyId: selectedCompany.id,
        province: selectedCompany.province || '',
        phone: selectedCompany.phone || '', // Need to ensure company has phone or get from contact
        quotationIds: salesData?.quotations.map(q => q.quotationNumber) || [],
        scorePrice: scores.price,
        scoreQuality: scores.quality,
        scoreDelivery: scores.delivery,
        scoreSales: scores.sales,
        scoreSupport: scores.support,
        scoreAfterSales: scores.afterSales,
        purchaseReasons: feedback.purchaseReasons,
        suggestions: feedback.suggestions,
      };

      const res = await fetch('/api/satisfaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        router.push('/marketing/satisfaction');
      } else {
        alert('บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  const ScoreSelector = ({ label, field }: { label: string, field: keyof typeof scores }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-all duration-300">
      <span className="font-bold text-gray-800 mb-3 sm:mb-0">{label}</span>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => setScores(prev => ({ ...prev, [field]: num }))}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black transition-all duration-300 transform ${scores[field] === num
                ? 'bg-gradient-to-br from-[#ff2301] to-red-600 text-white shadow-lg shadow-red-500/30 scale-110'
                : 'bg-white text-gray-500 border border-gray-100 hover:border-[#ff2301]/30 hover:bg-red-50/50 hover:text-[#ff2301] hover:scale-105 active:scale-95'
              }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  const purchaseReasonOptions = ['ราคา (Price)', 'คุณภาพ (Quality)', 'ชื่อเสียงแบรนด์ (Brand)', 'การบริการ (Service)', 'คนรู้จักแนะนำ (Recommendation)', 'ประสบการณ์เดิม (Previous)'];

  const toggleReason = (reason: string) => {
    setFeedback(prev => ({
      ...prev,
      purchaseReasons: prev.purchaseReasons.includes(reason)
        ? prev.purchaseReasons.filter(r => r !== reason)
        : [...prev.purchaseReasons, reason]
    }));
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="p-6 max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-5">
          <Link href="/marketing/satisfaction" className="p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm hover:shadow-md hover:bg-white transition-all hover:scale-105 active:scale-95 group">
            <ArrowLeft size={22} className="text-gray-500 group-hover:text-gray-900 transition-colors" />
          </Link>
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 flex items-center gap-2">
              เพิ่มแบบประเมินความพึงพอใจ
            </h1>
            <p className="text-gray-500 font-medium mt-1">บันทึกความคิดเห็นและคะแนนจากลูกค้าเพื่อพัฒนาบริการ</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Step 1: Survey Info & Company */}
          <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2rem] border border-white shadow-xl shadow-red-900/5 space-y-8">
            <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-200/50 pb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff2301] to-red-600 text-white shadow-lg shadow-red-500/20 flex items-center justify-center text-lg">1</div>
              ข้อมูลการประเมินและบริษัทลูกค้า
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">รอบประเมิน</label>
                <select
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  className="w-full bg-white/80 border-0 ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] shadow-sm transition-all hover:bg-white"
                >
                  <option value="1">รอบที่ 1 (ม.ค.-มิ.ย.)</option>
                  <option value="2">รอบที่ 2 (ก.ค.-ธ.ค.)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">ปี (พ.ศ.)</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-white/80 border-0 ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] shadow-sm transition-all hover:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">วิธีการประเมิน</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-white/80 border-0 ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] shadow-sm transition-all hover:bg-white"
                >
                  <option value="PHONE">โทรศัพท์ (Phone)</option>
                  <option value="LINK">ลิงก์ออนไลน์ (Link)</option>
                  <option value="ONSITE">เข้าพบลูกค้า (On-site)</option>
                </select>
              </div>
            </div>

            {/* Suggested Companies */}
            <div className="pt-4 border-t border-gray-100/50 mt-6">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-[#ff2301]" /> 
                บริษัทที่มีการขายสำเร็จในรอบประเมินนี้
              </label>
              
              {loadingActiveCompanies ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" /> กำลังโหลด...
                </div>
              ) : activeCompanies.length > 0 ? (
                <div className="mb-4">
                  <select
                    className="w-full bg-white/80 border-0 ring-1 ring-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] shadow-sm transition-all hover:bg-white text-gray-900"
                    value={selectedCompany?.id || ""}
                    onChange={(e) => {
                      const compId = e.target.value;
                      if (!compId) return;
                      const company = activeCompanies.find(c => c.id === compId);
                      if (company) {
                        setSelectedCompany(company);
                        setSearch(company.companyName);
                        setCompanies([]);
                      }
                    }}
                  >
                    <option value="" disabled>-- เลือกบริษัทที่มีการขายสำเร็จ --</option>
                    {activeCompanies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-sm text-gray-400 mb-4 bg-gray-50/50 px-4 py-2 rounded-lg inline-block border border-gray-100">
                  ไม่พบการขายที่สำเร็จในรอบประเมินนี้
                </div>
              )}
            </div>

            <div className="relative pt-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">ค้นหาบริษัทลูกค้า (อื่นๆ)</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff2301] transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อบริษัท..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedCompany(null);
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-white/80 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-[#ff2301] shadow-sm transition-all hover:bg-white font-medium text-gray-900 placeholder:font-normal"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ff2301] animate-spin" size={20} />
                )}
              </div>

              {companies.length > 0 && !selectedCompany && (
                <div className="absolute z-20 w-full mt-2 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto overflow-hidden">
                  {companies.map(company => (
                    <div
                      key={company.id}
                      onClick={() => {
                        setSelectedCompany(company);
                        setSearch(company.companyName);
                        setCompanies([]);
                      }}
                      className="px-5 py-4 hover:bg-red-50 cursor-pointer flex items-center gap-4 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Building2 className="text-gray-400" size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{company.companyName}</div>
                        {company.province && <div className="text-sm text-gray-500 font-medium">{company.province}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Sales Data Overview */}
          {selectedCompany && (
            <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2rem] border border-white shadow-xl shadow-red-900/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-200/50 pb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff2301] to-red-600 text-white shadow-lg shadow-red-500/20 flex items-center justify-center text-lg">2</div>
                ข้อมูลการซื้อขายในรอบนี้
              </div>

              {loadingData ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-[#ff2301]" size={28} />
                  </div>
                  <span className="font-semibold text-gray-600">กำลังสืบค้นข้อมูลจากฐานข้อมูล...</span>
                </div>
              ) : salesData && salesData.quotations.length > 0 ? (
                <div className="space-y-6">
                  <div className="text-sm font-bold text-[#0055ff] bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <CheckCircle className="text-blue-600 shrink-0" size={20} />
                    </div>
                    พบ {salesData.quotations.length} ใบเสนอราคา (รวม {salesData.productSummary.length} รายการสินค้า)
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><Package className="text-gray-400" size={18} /> รายการสินค้าที่สั่งซื้อ</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {salesData.productSummary.map((prod, idx) => (
                        <div key={idx} className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="font-bold text-gray-900 truncate" title={prod.item}>{prod.item || 'Unknown Item'}</div>
                          <div className="text-sm text-gray-500 mt-2 flex justify-between items-center">
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-md">{prod.quotationNumber}</span>
                            <span className="uppercase text-[#ff2301] font-bold text-xs tracking-wider">{prod.jobType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-gray-100 border-dashed">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-gray-300" size={32} />
                  </div>
                  <p className="text-gray-600 font-bold text-lg">ไม่พบข้อมูลการซื้อขายในรอบนี้</p>
                  <p className="text-gray-400 mt-2 font-medium">คุณยังสามารถบันทึกแบบประเมินได้ตามปกติ</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Scores */}
          {selectedCompany && (
            <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2rem] border border-white shadow-xl shadow-red-900/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-200/50 pb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff2301] to-red-600 text-white shadow-lg shadow-red-500/20 flex items-center justify-center text-lg">3</div>
                คะแนนความพึงพอใจ
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ScoreSelector label="Price (ราคา)" field="price" />
                <ScoreSelector label="Quality (คุณภาพสินค้า)" field="quality" />
                <ScoreSelector label="Delivery (การจัดส่ง)" field="delivery" />
                <ScoreSelector label="Sales Service (พนักงานขาย)" field="sales" />
                <ScoreSelector label="Support (การแก้ปัญหา)" field="support" />
                <ScoreSelector label="After-Sales (บริการหลังการขาย)" field="afterSales" />
              </div>

              <div className="pt-6 space-y-8 border-t border-gray-200/50">
                <div className="space-y-4">
                  <label className="block font-bold text-gray-900 text-lg">ปัจจัยหลักที่เลือกซื้อ</label>
                  <div className="flex flex-wrap gap-3">
                    {purchaseReasonOptions.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => toggleReason(reason)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border shadow-sm hover:shadow-md hover:-translate-y-0.5 ${feedback.purchaseReasons.includes(reason)
                            ? 'bg-gradient-to-r from-[#ff2301] to-red-600 text-white border-transparent shadow-red-500/30'
                            : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                          }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block font-bold text-gray-900 text-lg">ข้อเสนอแนะเพิ่มเติม</label>
                  <textarea
                    value={feedback.suggestions}
                    onChange={e => setFeedback(prev => ({ ...prev, suggestions: e.target.value }))}
                    placeholder="ความคิดเห็นหรือข้อเสนอแนะอื่นๆ จากลูกค้า (ถ้ามี)..."
                    className="w-full bg-white/80 border-0 ring-1 ring-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#ff2301] shadow-sm transition-all hover:bg-white min-h-[140px] resize-y font-medium text-gray-800 placeholder:font-normal"
                  ></textarea>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Floating Action Bar */}
      {selectedCompany && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex justify-center z-50 animate-in slide-in-from-bottom-full duration-500">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full max-w-4xl bg-gradient-to-r from-[#ff2301] to-red-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-1 active:translate-y-0 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            {submitting ? <Loader2 className="animate-spin relative z-10" size={24} /> : <CheckCircle className="relative z-10" size={24} />}
            <span className="relative z-10">{submitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกผลประเมิน'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
