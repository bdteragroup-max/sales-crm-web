"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowLeft, Building2, Package, CheckCircle, Sparkles, MessageSquare } from 'lucide-react';
import { searchCompanies } from "@/app/actions/sales";
import Link from 'next/link';
import { SATISFACTION_SCORE_LEGEND, formatPhoneForTel } from '@/app/lib/satisfactionScore';

type CriteriaComments = Partial<Record<
  'scorePrice' | 'scoreQuality' | 'scoreDelivery' | 'scoreSales' | 'scoreSupport' | 'scoreAfterSales',
  string
>>;

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
  const [phone, setPhone] = useState('');

  const [activeCompanies, setActiveCompanies] = useState<any[]>([]);
  const [loadingActiveCompanies, setLoadingActiveCompanies] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [salesData, setSalesData] = useState<{ quotations: any[], productSummary: any[] } | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [scores, setScores] = useState({
    scorePrice: 0,
    scoreQuality: 0,
    scoreDelivery: 0,
    scoreSales: 0,
    scoreSupport: 0,
    scoreAfterSales: 0
  });

  const [criteriaComments, setCriteriaComments] = useState<CriteriaComments>({});

  const [feedback, setFeedback] = useState({
    purchaseReasons: [] as string[],
    suggestions: '',
    callNotes: ''
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
        const results = await searchCompanies(search, { round, year, method });
        setCompanies(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [search, round, year, method]);

  // Fetch active companies based on round, year, and method
  useEffect(() => {
    const fetchActiveCompanies = async () => {
      setLoadingActiveCompanies(true);
      try {
        const res = await fetch(`/api/satisfaction/active-companies?round=${round}&year=${year}&method=${method}`);
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
  }, [round, year, method]);

  // Fetch sales data when company is selected
  useEffect(() => {
    if (selectedCompany) {
      fetchSalesData(selectedCompany.id, round, year);
      if (selectedCompany.contacts && selectedCompany.contacts.length > 0 && selectedCompany.contacts[0].mobilePhone) {
        setPhone(selectedCompany.contacts[0].mobilePhone);
      } else {
        setPhone('');
      }
    } else {
      setSalesData(null);
      setPhone('');
    }
  }, [selectedCompany, round, year]);

  const fetchSalesData = async (companyId: string, r: string, y: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/satisfaction/company-data?companyId=${companyId}&round=${r}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
        
        // Fallback phone from quotation contact if not set
        setPhone(prev => {
          if (!prev && data.quotations && data.quotations.length > 0) {
            const quoteWithPhone = data.quotations.find((q: any) => q.contact?.mobilePhone || q.contact?.phone);
            return quoteWithPhone?.contact?.mobilePhone || quoteWithPhone?.contact?.phone || '';
          }
          return prev;
        });
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
        phone: phone,
        quotationIds: salesData?.quotations.map(q => q.quotationNumber) || [],
        scorePrice: scores.scorePrice,
        scoreQuality: scores.scoreQuality,
        scoreDelivery: scores.scoreDelivery,
        scoreSales: scores.scoreSales,
        scoreSupport: scores.scoreSupport,
        scoreAfterSales: scores.scoreAfterSales,
        purchaseReasons: feedback.purchaseReasons,
        suggestions: feedback.suggestions,
        callNotes: feedback.callNotes,
        criteriaComments: criteriaComments,
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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all">
      <div className="flex flex-col mb-3 lg:mb-0 lg:w-1/3">
        <span className="font-bold text-gray-700">{label}</span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 lg:w-2/3 justify-end items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(num => {
            const isActive = scores[field] === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => setScores(prev => ({ ...prev, [field]: num }))}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black transition-all duration-200 border-2 relative
                  ${isActive
                    ? 'bg-[#ff2301] border-[#ff2301] text-white shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {num}
                {isActive && (
                  <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm border border-gray-200">
                    <CheckCircle className="text-[#ff2301]" size={12} fill="currentColor" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
        
        <div className="w-full sm:w-auto relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <MessageSquare size={16} className={criteriaComments[field] ? 'text-[#ff2301]' : 'text-gray-400'} />
          </div>
          <input 
            type="text" 
            placeholder="ความคิดเห็นเพิ่มเติม..." 
            value={criteriaComments[field] || ''}
            onChange={(e) => setCriteriaComments(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full sm:w-48 pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] focus:bg-white outline-none transition-colors text-gray-700"
          />
        </div>
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
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/marketing/satisfaction" className="p-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-gray-800">แบบประเมินความพึงพอใจลูกค้า</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-700"
            >
              <option value="1">รอบที่ 1 (ม.ค.-มิ.ย.)</option>
              <option value="2">รอบที่ 2 (ก.ค.-ธ.ค.)</option>
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-700"
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-700"
            >
              <option value="PHONE">โทรศัพท์ (Phone)</option>
              <option value="LINK">ลิงก์ (Link)</option>
              <option value="ONSITE">ลงพื้นที่ (On-site)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Customer & Company Profile Card */}
        <div className="bg-white text-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Building2 size={160} className="text-gray-800" />
          </div>
          
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Sparkles size={20} className="text-[#ff2301]" />
            ข้อมูลลูกค้าและบริษัท
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {/* Search / Select Company */}
            <div className="space-y-4 lg:col-span-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">เลือกบริษัท</label>
                {loadingActiveCompanies ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <Loader2 size={16} className="animate-spin" /> กำลังโหลดข้อมูล...
                  </div>
                ) : (
                  <select
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] outline-none"
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
                    <option value="" disabled>-- เลือกบริษัท --</option>
                    {activeCompanies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="relative">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="ค้นหาบริษัทอื่น..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedCompany(null);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff2301] outline-none text-gray-800 placeholder-gray-400 text-sm"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ff2301] animate-spin" size={16} />
                  )}
                </div>

                {companies.length > 0 && !selectedCompany && (
                  <div className="absolute z-50 w-full mt-2 bg-white text-gray-800 rounded-xl shadow-xl max-h-[250px] overflow-y-auto border border-gray-200">
                    {companies.map(company => (
                      <div
                        key={company.id}
                        onClick={() => {
                          setSelectedCompany(company);
                          setSearch(company.companyName);
                          setCompanies([]);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <div className="font-bold">{company.companyName}</div>
                        {company.province && <div className="text-xs text-gray-500">{company.province}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Details */}
            {selectedCompany && (
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 lg:pt-0 lg:pl-8 lg:border-l border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">เบอร์โทรศัพท์ติดต่อ</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="กรอกเบอร์โทรศัพท์..."
                      className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#ff2301] outline-none"
                    />
                    {phone && (
                      <a
                        href={`tel:${formatPhoneForTel(phone)}`}
                        className="shrink-0 bg-[#ff2301] hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
                      >
                        โทร
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">พนักงานขาย</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium h-[42px] flex items-center">
                    {selectedCompany.assignedUser?.fullName || salesData?.quotations?.[0]?.salesperson?.fullName ? (
                      <span className="text-gray-800 font-bold">{selectedCompany.assignedUser?.fullName || salesData?.quotations?.[0]?.salesperson?.fullName}</span>
                    ) : (
                      <span className="text-gray-400 italic">ไม่มีข้อมูลพนักงานขาย</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid (Left: Survey, Right: Sales Context) */}
        {selectedCompany && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20">
            
            {/* Left Column: Scoring & Feedback */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-xl font-bold text-gray-800">การให้คะแนนความพึงพอใจ</h3>
                  
                  {/* Legend */}
                  <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 overflow-x-auto">
                    {SATISFACTION_SCORE_LEGEND.map(legend => (
                      <div key={legend.score} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg shadow-sm whitespace-nowrap text-xs font-medium text-gray-600 border border-gray-100">
                        <span className="font-black text-[#ff2301]">{legend.score}</span>
                        <span>{legend.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <ScoreSelector label="ราคา (Price)" field="scorePrice" />
                  <ScoreSelector label="คุณภาพสินค้า (Product Quality)" field="scoreQuality" />
                  <ScoreSelector label="การจัดส่ง/ความรวดเร็ว (Delivery/Speed)" field="scoreDelivery" />
                  <ScoreSelector label="พนักงานขาย (Sales Rep)" field="scoreSales" />
                  <ScoreSelector label="การแก้ปัญหา (Support)" field="scoreSupport" />
                  <ScoreSelector label="บริการหลังการขาย (After-Sales)" field="scoreAfterSales" />
                </div>
              </div>

              {/* Feedback Section */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-6">
                <div className="space-y-4">
                  <label className="block font-bold text-gray-800">เหตุผลหลักในการสั่งซื้อ (Key Purchase Reasons)</label>
                  <div className="flex flex-wrap gap-2">
                    {purchaseReasonOptions.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => toggleReason(reason)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                          feedback.purchaseReasons.includes(reason)
                            ? 'bg-red-50 border-[#ff2301] text-[#ff2301]'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-800">บันทึกการโทร (ข้อมูลภายใน)</label>
                    <textarea
                      value={feedback.callNotes}
                      onChange={e => setFeedback(prev => ({ ...prev, callNotes: e.target.value }))}
                      placeholder="จดบันทึกข้อความหรือข้อสังเกตจากการคุย..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[120px] resize-y text-sm text-gray-700"
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-800">ข้อเสนอแนะจากลูกค้า</label>
                    <textarea
                      value={feedback.suggestions}
                      onChange={e => setFeedback(prev => ({ ...prev, suggestions: e.target.value }))}
                      placeholder="ข้อเสนอแนะเพิ่มเติมที่ได้รับจากลูกค้า..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#ff2301] outline-none min-h-[120px] resize-y text-sm text-gray-700"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Context/Sales Data */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="text-gray-400" size={18} /> 
                  ข้อมูลประกอบการขาย
                </h3>

                {loadingData ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
                    <Loader2 className="animate-spin text-[#ff2301]" size={16} /> กำลังโหลดข้อมูล...
                  </div>
                ) : salesData && salesData.quotations.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-2">
                      <CheckCircle className="shrink-0 mt-0.5 text-[#ff2301]" size={16} />
                      <p>พบใบเสนอราคา <strong>{salesData.quotations.length}</strong> รายการ ({salesData.productSummary.length} สินค้า)</p>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {salesData.productSummary.map((prod, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <div className="font-bold text-gray-700 text-sm line-clamp-2" title={prod.item}>
                            {prod.item || 'ไม่ทราบชื่อสินค้า'}
                          </div>
                          <div className="mt-2 flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">{prod.quotationNumber}</span>
                            <span className="font-bold text-[#ff2301]">{prod.jobType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package className="text-gray-300" size={20} />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">ไม่พบข้อมูลการขายในช่วงเวลานี้</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Floating Submit Bar */}
      {selectedCompany && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-center z-50">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full max-w-5xl bg-[#ff2301] hover:bg-red-600 text-white px-8 py-3.5 rounded-2xl font-black text-lg transition-all disabled:opacity-70 flex items-center justify-center gap-3 shadow-lg shadow-red-500/20"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกแบบประเมิน'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
