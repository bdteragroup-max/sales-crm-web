"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Loader2, 
  ArrowLeft, 
  Building2, 
  Package, 
  CheckCircle, 
  Sparkles, 
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Receipt,
  Calendar,
  DollarSign,
  Info,
  CheckCircle2,
  Tag,
  User,
  Phone,
  ChevronDown,
  X,
  Check,
  ArrowRight,
  RotateCcw,
  MapPin,
  Briefcase,
  Wrench
} from 'lucide-react';
import { searchCompanies } from "@/app/actions/sales";
import Link from 'next/link';
import { SATISFACTION_SCORE_LEGEND, formatPhoneForTel } from '@/app/lib/satisfactionScore';
import { getCurrentCycle } from '@/app/lib/satisfactionHelper';

const formatContactName = (name?: string | null) => {
  if (!name) return '';
  let trimmed = name.trim();
  while (trimmed.startsWith('คุณคุณ')) {
    trimmed = trimmed.replace(/^คุณคุณ/, 'คุณ');
  }
  if (trimmed.startsWith('คุณนาย')) {
    trimmed = trimmed.replace(/^คุณนาย\s*/, 'นาย ');
  }
  if (trimmed.startsWith('คุณนาง')) {
    trimmed = trimmed.replace(/^คุณนาง\s*/, 'นาง ');
  }
  if (/^(คุณ|นาย|นาง|น\.ส\.|ดร\.|ช่าง)/.test(trimmed)) {
    return trimmed;
  }
  return `คุณ${trimmed}`;
};

const formatDate = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  }).format(amount);
};

type CriteriaComments = Partial<Record<
  'scorePrice' | 'scoreQuality' | 'scoreDelivery' | 'scoreSales' | 'scoreSupport' | 'scoreAfterSales',
  string
>>;

export default function NewSatisfactionSurvey() {
  const router = useRouter();

  const currentCycle = getCurrentCycle();
  const [round, setRound] = useState(currentCycle.round);
  const [year, setYear] = useState(currentCycle.year);
  const [method, setMethod] = useState('PHONE');

  // Closed Sales vs All Companies filter
  const [closedOnlyFilter, setClosedOnlyFilter] = useState(true);

  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [availableContacts, setAvailableContacts] = useState<Array<{
    id?: string;
    contactName: string;
    position?: string | null;
    mobilePhone?: string | null;
  }>>([]);

  const [activeCompanies, setActiveCompanies] = useState<any[]>([]);
  const [loadingActiveCompanies, setLoadingActiveCompanies] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside listener for company dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  const [loadingData, setLoadingData] = useState(false);
  const [salesData, setSalesData] = useState<{ 
    quotations: any[];
    closedQuotations?: any[];
    openQuotations?: any[];
    productSummary: any[];
    contacts?: any[];
    defaultContactName?: string | null;
    defaultPhone?: string | null;
    isClosedSale?: boolean;
    latestPoNumber?: string | null;
    latestInvoiceNumber?: string | null;
    latestClosedDate?: string | null;
    latestQuotationNumber?: string | null;
    closedStatus?: string | null;
    totalClosedAmount?: number;
    salespersonName?: string | null;
    installationStatus?: any;
  } | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const displayedCompanies = useMemo(() => {
    const baseList = closedOnlyFilter ? activeCompanies.filter(c => c.isClosedSale) : activeCompanies;
    
    if (!search.trim()) {
      return baseList;
    }

    const query = search.trim().toLowerCase();
    const inMemoryMatches = baseList.filter(c => {
      const matchName = c.companyName?.toLowerCase().includes(query);
      const matchContact = c.primaryContactName?.toLowerCase().includes(query);
      const matchPo = c.latestPoNumber?.toLowerCase().includes(query);
      const matchInvoice = c.latestInvoiceNumber?.toLowerCase().includes(query);
      const matchProvince = c.province?.toLowerCase().includes(query);
      const matchSales = c.assignedUser?.fullName?.toLowerCase().includes(query);
      return Boolean(matchName || matchContact || matchPo || matchInvoice || matchProvince || matchSales);
    });

    const existingIds = new Set(inMemoryMatches.map(c => c.id));
    const extraMatches = companies.filter(c => !existingIds.has(c.id));

    return [...inMemoryMatches, ...extraMatches];
  }, [activeCompanies, closedOnlyFilter, search, companies]);

  const handleSelectCompany = (company: any) => {
    setSelectedCompany(company);
    setIsDropdownOpen(false);
    setSearch('');
  };

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
        const results = await searchCompanies(search, { 
          round, 
          year, 
          method, 
          onlyClosedSales: closedOnlyFilter 
        });
        setCompanies(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [search, round, year, method, closedOnlyFilter]);

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

      const initialContacts: any[] = [];
      if (selectedCompany.contacts && Array.isArray(selectedCompany.contacts)) {
        selectedCompany.contacts.forEach((c: any) => {
          if (c?.contactName) initialContacts.push(c);
        });
      }
      setAvailableContacts(initialContacts);

      const initContactName = selectedCompany.primaryContactName || initialContacts[0]?.contactName || '';
      setContactName(initContactName);

      const initPhone = selectedCompany.primaryContactPhone || initialContacts[0]?.mobilePhone || selectedCompany.phone || '';
      setPhone(initPhone);
    } else {
      setSalesData(null);
      setContactName('');
      setPhone('');
      setAvailableContacts([]);
    }
  }, [selectedCompany, round, year]);

  const fetchSalesData = async (companyId: string, r: string, y: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/satisfaction/company-data?companyId=${companyId}&round=${r}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);

        // Merge contacts from company-data
        if (data.contacts && Array.isArray(data.contacts)) {
          setAvailableContacts(prev => {
            const map = new Map<string, any>();
            prev.forEach(c => {
              if (c?.contactName) map.set(c.contactName.trim().toLowerCase(), c);
            });
            data.contacts.forEach((c: any) => {
              if (c?.contactName) map.set(c.contactName.trim().toLowerCase(), c);
            });
            return Array.from(map.values());
          });
        }

        // Auto-fill contactName if empty
        setContactName(prev => {
          if (!prev && data.defaultContactName) {
            return data.defaultContactName;
          }
          return prev;
        });

        // Fallback phone from quotation contact or defaultPhone if not set
        setPhone(prev => {
          if (!prev) {
            if (data.defaultPhone) return data.defaultPhone;
            if (data.quotations && data.quotations.length > 0) {
              const quoteWithPhone = data.quotations.find((q: any) => q.contact?.mobilePhone || q.contact?.phone);
              return quoteWithPhone?.contact?.mobilePhone || quoteWithPhone?.contact?.phone || '';
            }
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
    if (!contactName.trim()) return alert('กรุณาระบุชื่อลูกค้า / ผู้ติดต่อ เพื่อให้สะดวกต่อการประสานงานกับฝ่ายขาย');
    if (Object.values(scores).some(s => s === 0)) return alert('กรุณาให้คะแนนให้ครบทุกด้าน');

    setSubmitting(true);
    try {
      const payload = {
        surveyRound: parseInt(round),
        surveyYear: parseInt(year),
        surveyMethod: method,
        surveyBy: 'MARKETING', // Using placeholder for marketing user
        companyId: selectedCompany.id,
        contactName: contactName.trim(),
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
        <div className="bg-white text-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 relative">
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Building2 size={160} className="text-gray-800" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
              <Sparkles size={20} className="text-[#ff2301]" />
              ข้อมูลลูกค้าและบริษัท
            </h2>

            {/* Filter Toggle: Closed Sales Only vs All */}
            <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setClosedOnlyFilter(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  closedOnlyFilter 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShieldCheck size={14} />
                <span>เฉพาะลูกค้าที่ปิดการขายแล้ว (Closed Sales)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  closedOnlyFilter ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {activeCompanies.filter(c => c.isClosedSale).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setClosedOnlyFilter(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !closedOnlyFilter 
                    ? 'bg-gray-800 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 size={14} />
                <span>ทั้งหมด ({activeCompanies.length})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {(!selectedCompany || isDropdownOpen) ? (
              /* Unified Company Search & Select Station */
              <div className="col-span-1 lg:col-span-3 space-y-4" ref={dropdownRef}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <Building2 size={18} className="text-[#ff2301]" />
                      <span>{selectedCompany ? 'ค้นหาและเลือกเปลี่ยนบริษัทลูกค้า' : 'เลือกบริษัทลูกค้าเพื่อเริ่มต้นประเมินความพึงพอใจ'}</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedCompany 
                        ? 'คลิกเลือกบริษัทใหม่ที่ต้องการประเมิน หรือกดยกเลิกเพื่อคงบริษัทเดิม' 
                        : 'ค้นหาจากรายชื่อลูกค้าที่มีการปิดการขาย (มี PO/เปิดบิล) หรือเลือกจากบริษัททั้งหมด'}
                    </p>
                  </div>

                  {selectedCompany && (
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(false)}
                      className="self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                    >
                      <X size={14} />
                      <span>ยกเลิก (ใช้บริษัทเดิม)</span>
                    </button>
                  )}
                </div>

                {/* Prominent Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search size={18} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="พิมพ์ชื่อบริษัท, ผู้ติดต่อ, เลข PO, เลขที่บิล, หรือจังหวัดเพื่อค้นหา..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-32 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#ff2301] focus:bg-white focus:border-transparent outline-none transition-all shadow-2xs placeholder-gray-400"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                    {isSearching && (
                      <Loader2 size={16} className="text-[#ff2301] animate-spin" />
                    )}
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                        title="ล้างคำค้นหา"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <span className="text-xs font-bold text-[#ff2301] bg-red-50 border border-red-100 px-2.5 py-1 rounded-xl">
                      {displayedCompanies.length} บริษัท
                    </span>
                  </div>
                </div>

                {/* Clean Scrollable Company List */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
                    {loadingActiveCompanies ? (
                      <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                        <Loader2 size={24} className="animate-spin text-[#ff2301]" />
                        <span className="text-sm font-medium">กำลังโหลดข้อมูลบริษัท...</span>
                      </div>
                    ) : displayedCompanies.length === 0 ? (
                      <div className="p-12 text-center text-gray-400 text-sm space-y-2">
                        <Building2 size={36} className="mx-auto mb-2 text-gray-300" />
                        <div className="font-bold text-gray-700">ไม่พบบริษัทที่ตรงกับเงื่อนไขการค้นหา</div>
                        <div className="text-xs text-gray-400">
                          {search.trim() ? `ไม่พบผลลัพธ์สำหรับ "${search}"` : 'ไม่มีข้อมูลบริษัทในรอบนี้'}
                        </div>
                        <div className="pt-2 flex items-center justify-center gap-2">
                          {search && (
                            <button
                              type="button"
                              onClick={() => setSearch('')}
                              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                            >
                              ล้างคำค้นหา
                            </button>
                          )}
                          {closedOnlyFilter && (
                            <button
                              type="button"
                              onClick={() => setClosedOnlyFilter(false)}
                              className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#ff2301] font-bold rounded-xl transition-colors"
                            >
                              แสดงบริษัททั้งหมด ({activeCompanies.length})
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      displayedCompanies.map((company) => {
                        const isSelected = selectedCompany?.id === company.id;
                        return (
                          <div
                            key={company.id}
                            onClick={() => handleSelectCompany(company)}
                            className={`p-3.5 transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                              isSelected 
                                ? 'bg-red-50/90 border-l-4 border-l-[#ff2301]' 
                                : 'hover:bg-red-50/40 border-l-4 border-l-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={`text-sm font-bold leading-tight group-hover:text-[#ff2301] transition-colors ${
                                  isSelected ? 'text-[#ff2301]' : 'text-gray-900'
                                }`}>
                                  {company.companyName}
                                </span>
                                {company.isClosedSale ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck size={11} className="text-emerald-600" /> ปิดการขายแล้ว
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    ยังไม่ปิดการขาย
                                  </span>
                                )}
                                {company.installationStatus?.status === 'COMPLETED' && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 size={11} className="text-emerald-600" /> ติดตั้งเสร็จสิ้น
                                  </span>
                                )}
                                {company.installationStatus?.status === 'IN_PROGRESS' && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                    <Wrench size={11} className="text-blue-600 animate-pulse" /> กำลังติดตั้งหน้างาน
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                {company.primaryContactName && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                    <User size={11} className="text-[#ff2301]" />
                                    {formatContactName(company.primaryContactName)}
                                  </span>
                                )}
                                {company.latestPoNumber && (
                                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                                    PO: {company.latestPoNumber}
                                  </span>
                                )}
                                {company.latestInvoiceNumber && !company.latestPoNumber && (
                                  <span className="font-mono text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                                    บิล: {company.latestInvoiceNumber}
                                  </span>
                                )}
                                {company.province && (
                                  <span className="inline-flex items-center gap-1 text-gray-500">
                                    <MapPin size={11} className="text-gray-400" />
                                    <span>{company.province}</span>
                                  </span>
                                )}
                                {company.assignedUser?.fullName && (
                                  <span className="inline-flex items-center gap-1 text-gray-400">
                                    <Briefcase size={11} className="text-gray-400" />
                                    <span>เซลล์: {company.assignedUser.fullName}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isSelected ? (
                                <div className="flex items-center gap-1 text-xs font-bold text-[#ff2301] bg-white px-3 py-1.5 rounded-xl border border-red-200 shadow-xs">
                                  <Check size={14} />
                                  <span>กำลังเลือก</span>
                                </div>
                              ) : (
                                <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-[#ff2301] group-hover:translate-x-0.5 transition-all">
                                  <span>เลือกบริษัทนี้</span>
                                  <ArrowRight size={14} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Selected Company Summary Card (Left Column) */
              <div className="lg:col-span-1 p-4 rounded-2xl border border-gray-200 bg-gray-50/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0 border border-red-100">
                      <Building2 size={20} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedCompany.isClosedSale ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck size={11} className="text-emerald-600" /> ปิดการขายแล้ว
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          ยังไม่ปิดการขาย
                        </span>
                      )}
                      {(salesData?.installationStatus || selectedCompany.installationStatus)?.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 size={11} className="text-emerald-600" /> ติดตั้งเสร็จสิ้น
                        </span>
                      )}
                      {(salesData?.installationStatus || selectedCompany.installationStatus)?.status === 'IN_PROGRESS' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                          <Wrench size={11} className="text-blue-600 animate-pulse" /> กำลังติดตั้งหน้างาน
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-base font-black text-gray-900 leading-snug">
                      {selectedCompany.companyName}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                      {selectedCompany.latestPoNumber && (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                          PO: {selectedCompany.latestPoNumber}
                        </span>
                      )}
                      {selectedCompany.latestInvoiceNumber && !selectedCompany.latestPoNumber && (
                        <span className="font-mono text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                          บิล: {selectedCompany.latestInvoiceNumber}
                        </span>
                      )}
                      {selectedCompany.province && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <MapPin size={11} className="text-gray-400" />
                          <span>{selectedCompany.province}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(true)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <RotateCcw size={13} className="text-[#ff2301]" />
                  <span>ค้นหา / เปลี่ยนบริษัทอื่น</span>
                </button>
              </div>
            )}

            {/* Selected Details */}
            {selectedCompany && !isDropdownOpen && (
              <div className="lg:col-span-2 flex flex-col justify-between gap-5 pt-2 lg:pt-0 lg:pl-8 lg:border-l border-gray-200">
                {/* Contact Name & Quick Pick */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-[#ff2301]" />
                      <span>ชื่อลูกค้า / ผู้ติดต่อ (Contact Person)</span>
                      <span className="text-[#ff2301]">*</span>
                    </label>
                    <span className="text-[11px] text-gray-400">ผู้ให้ข้อมูลการประเมิน</span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="ระบุชื่อผู้ติดต่อ / ลูกค้า (เช่น คุณสมชาย จัดซื้อ)..."
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-[#ff2301] focus:bg-white outline-none font-semibold transition-all"
                    />
                  </div>

                  {/* Quick-select chips if company has contacts */}
                  {availableContacts.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span>เลือกจากผู้ติดต่อในระบบ:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {availableContacts.map((c, idx) => {
                          const isSelected = contactName === c.contactName;
                          return (
                            <button
                              key={c.id || idx}
                              type="button"
                              onClick={() => {
                                setContactName(c.contactName);
                                if (c.mobilePhone) {
                                  setPhone(c.mobilePhone);
                                }
                              }}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-red-50 border-[#ff2301] text-[#ff2301] font-bold shadow-xs'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <User size={12} className={isSelected ? 'text-[#ff2301]' : 'text-gray-400'} />
                              <span>{c.contactName}</span>
                              {c.position && <span className="text-[10px] text-gray-400">({c.position})</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone & Salesperson Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Phone size={13} className="text-gray-400" />
                      <span>เบอร์โทรศัพท์ติดต่อ</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="กรอกเบอร์โทรศัพท์..."
                        className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#ff2301] focus:bg-white outline-none font-medium"
                      />
                      {phone && (
                        <a
                          href={`tel:${formatPhoneForTel(phone)}`}
                          className="shrink-0 bg-[#ff2301] hover:bg-red-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Phone size={14} />
                          <span>โทร</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      พนักงานขายผู้รับผิดชอบ
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium h-[42px] flex items-center">
                      {selectedCompany.assignedUser?.fullName || salesData?.quotations?.[0]?.salesperson?.fullName ? (
                        <span className="text-gray-800 font-bold">
                          {selectedCompany.assignedUser?.fullName || salesData?.quotations?.[0]?.salesperson?.fullName}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">ไม่มีข้อมูลพนักงานขาย</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Caller Assurance Banner (แถบยืนยันการรับ PO / สถานะการสั่งซื้อ) */}
            {selectedCompany && !isDropdownOpen && (
              <div className="lg:col-span-3 pt-4 border-t border-gray-100">
                {(salesData?.isClosedSale ?? selectedCompany?.isClosedSale) ? (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/90 border-2 border-emerald-300 p-5 shadow-sm space-y-4">
                    {/* Top header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <div className="text-emerald-950 font-black text-base flex items-center gap-2">
                            <span>ยืนยันสถานะ: ปิดการขายแล้ว (Closed Sale)</span>
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          </div>
                          <div className="text-xs text-emerald-700 font-medium">
                            ลูกค้ารายนี้มีประวัติการรับ Purchase Order (PO) หรือเปิดบิลเรียบร้อยแล้ว
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-sm">
                          {salesData?.closedStatus || selectedCompany.closedStatus || 'เปิดบิลแล้ว'}
                        </span>
                        {/* Installation Status Badge */}
                        {(() => {
                          const installStatus = salesData?.installationStatus || selectedCompany?.installationStatus;
                          if (!installStatus) return null;
                          if (installStatus.status === 'COMPLETED') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 text-white rounded-full text-xs font-bold shadow-sm border border-emerald-400">
                                <CheckCircle2 size={13} className="text-emerald-200" />
                                <span>ติดตั้งเสร็จสมบูรณ์แล้ว</span>
                              </span>
                            );
                          }
                          if (installStatus.status === 'IN_PROGRESS') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm border border-blue-400">
                                <Wrench size={13} className="text-blue-200 animate-pulse" />
                                <span>กำลังติดตั้งอยู่หน้างาน</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-600 text-white rounded-full text-xs font-bold shadow-sm">
                              <Package size={13} className="text-slate-200" />
                              <span>{installStatus.badgeText || 'ไม่มีงานติดตั้ง'}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {/* PO Number */}
                      <div className="bg-white/95 p-3 rounded-xl border border-emerald-200 shadow-xs">
                        <div className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                          <FileText size={13} className="text-emerald-600" />
                          เลขที่ PO / ใบสั่งซื้อ
                        </div>
                        <div className="text-sm font-black font-mono text-emerald-800 mt-1 truncate">
                          {salesData?.latestPoNumber || selectedCompany.latestPoNumber || 'เปิดบิลตามใบเสนอราคา'}
                        </div>
                      </div>

                      {/* Invoice or Quotation Number */}
                      <div className="bg-white/95 p-3 rounded-xl border border-emerald-200 shadow-xs">
                        <div className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                          <Receipt size={13} className="text-emerald-600" />
                          เลขที่ใบกำกับ / ใบเสนอราคา
                        </div>
                        <div className="text-sm font-black font-mono text-gray-800 mt-1 truncate">
                          {salesData?.latestInvoiceNumber || selectedCompany.latestInvoiceNumber || salesData?.latestQuotationNumber || selectedCompany.latestQuotationNumber || '-'}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="bg-white/95 p-3 rounded-xl border border-emerald-200 shadow-xs">
                        <div className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                          <Calendar size={13} className="text-emerald-600" />
                          วันที่รับ PO / เปิดบิล
                        </div>
                        <div className="text-sm font-bold text-gray-800 mt-1 truncate">
                          {formatDate(salesData?.latestClosedDate || selectedCompany.latestClosedDate)}
                        </div>
                      </div>

                      {/* Total Closed Amount */}
                      <div className="bg-white/95 p-3 rounded-xl border border-emerald-200 shadow-xs">
                        <div className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                          <DollarSign size={13} className="text-emerald-600" />
                          ยอดเงินปิดการขาย
                        </div>
                        <div className="text-sm font-black text-emerald-700 mt-1 truncate">
                          {formatCurrency(salesData?.totalClosedAmount || selectedCompany.actualClosingAmount)}
                        </div>
                      </div>

                      {/* Installation Status Card */}
                      {(() => {
                        const installStatus = salesData?.installationStatus || selectedCompany?.installationStatus;
                        const isCompleted = installStatus?.status === 'COMPLETED';
                        const isInProgress = installStatus?.status === 'IN_PROGRESS';
                        const borderStyle = isCompleted ? 'border-emerald-300 bg-emerald-50/60' : isInProgress ? 'border-blue-300 bg-blue-50/60' : 'border-emerald-200 bg-white/95';
                        const textColor = isCompleted ? 'text-emerald-800' : isInProgress ? 'text-blue-800' : 'text-gray-700';
                        const iconColor = isCompleted ? 'text-emerald-600' : isInProgress ? 'text-blue-600' : 'text-gray-400';

                        return (
                          <div className={`p-3 rounded-xl border shadow-xs transition-all ${borderStyle}`}>
                            <div className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                              <Wrench size={13} className={iconColor} />
                              สถานะการติดตั้ง
                            </div>
                            <div className={`text-sm font-black mt-1 truncate flex items-center gap-1.5 ${textColor}`}>
                              {isCompleted && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />}
                              {isInProgress && <Wrench size={15} className="text-blue-600 shrink-0 animate-bounce" />}
                              <span title={installStatus?.label || 'ไม่มีข้อมูลงานติดตั้ง'}>
                                {installStatus?.label || 'ไม่มีข้อมูลงานติดตั้ง'}
                              </span>
                            </div>
                            {installStatus?.orderNo && (
                              <div className="text-[10px] text-gray-500 mt-0.5 truncate font-mono">
                                ใบงาน: {installStatus.orderNo}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Caller Guidance Tip */}
                    <div className="bg-emerald-100/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900 leading-relaxed">
                      <Info size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 w-full">
                        <div>
                          <strong className="font-bold text-emerald-950">คำแนะนำสำหรับผู้โทรสอบถาม: </strong>
                          {(salesData?.latestPoNumber || selectedCompany.latestPoNumber) ? (
                            <span>
                              ลูกค้ารายนี้มีใบสั่งซื้อทางการ เลขที่ PO: <strong className="font-mono underline text-emerald-950 px-1.5 py-0.5 bg-white/80 rounded border border-emerald-200">{salesData?.latestPoNumber || selectedCompany.latestPoNumber}</strong> สามารถอ้างอิงเลข PO นี้เพื่อให้ลูกค้ามั่นใจว่าเป็นการโทรติดตามความพึงพอใจจากการสั่งซื้อจริง
                            </span>
                          ) : (
                            <span>
                              ลูกค้ารายนี้เปิดบิลเรียบร้อยแล้ว อ้างอิงใบเสนอราคาเลขที่ <strong className="font-mono text-emerald-950 px-1.5 py-0.5 bg-white/80 rounded border border-emerald-200">{salesData?.latestQuotationNumber || selectedCompany.latestQuotationNumber}</strong> หรือใบกำกับภาษีในการสนทนาได้
                            </span>
                          )}
                        </div>
                        {(() => {
                          const installStatus = salesData?.installationStatus || selectedCompany?.installationStatus;
                          if (!installStatus) return null;
                          if (installStatus.status === 'COMPLETED') {
                            return (
                              <div className="pt-1.5 text-emerald-900 font-medium border-t border-emerald-200/70 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span><strong>สถานะงานติดตั้ง: ติดตั้งเสร็จสมบูรณ์แล้ว</strong> — สามารถสอบถามความพึงพอใจด้านคุณภาพสินค้าและผลงานการติดตั้งของทีมช่างได้เต็มที่</span>
                              </div>
                            );
                          }
                          if (installStatus.status === 'IN_PROGRESS') {
                            return (
                              <div className="pt-1.5 text-blue-900 font-medium border-t border-emerald-200/70 flex items-center gap-1.5">
                                <Wrench size={13} className="text-blue-600 shrink-0" />
                                <span><strong>สถานะงานติดตั้ง: กำลังติดตั้งอยู่หน้างาน</strong> — แนะนำให้สอบถามความเรียบร้อยของการประสานงานและการเข้าหน้างานของช่างเบื้องต้น</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 shadow-sm space-y-2">
                    <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                      <span>คำเตือนสำหรับผู้โทร: ยังไม่ปิดการขาย (อยู่ระหว่างเสนอราคา / ยังไม่มี PO)</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed pl-7">
                      ลูกค้ารายนี้ยังไม่มีประวัติการรับ Purchase Order (PO) หรือเปิดบิลในช่วงเวลานี้ (พบเฉพาะใบเสนอราคาที่ยังไม่ปิดการขาย) 
                      หากโทรประเมินความพึงพอใจ อาจทำให้ลูกค้าสับสน กรุณาตรวจสอบกับพนักงานขายก่อนดำเนินการ
                    </p>
                  </div>
                )}
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
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 sticky top-24 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-gray-400" size={18} /> 
                    ข้อมูลประกอบการขาย
                  </h3>
                  {salesData && salesData.isClosedSale && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-600" />
                      ปิดการขายแล้ว
                    </span>
                  )}
                </div>

                {loadingData ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
                    <Loader2 className="animate-spin text-[#ff2301]" size={16} /> กำลังโหลดข้อมูล...
                  </div>
                ) : salesData && salesData.quotations.length > 0 ? (
                  (() => {
                    const closedQuotes = salesData.closedQuotations || salesData.quotations.filter((q: any) => q.isClosedSale);
                    const openQuotes = salesData.openQuotations || salesData.quotations.filter((q: any) => !q.isClosedSale);

                    return (
                      <div className="space-y-4">
                        {/* Summary Header */}
                        <div className="space-y-1.5">
                          {closedQuotes.length > 0 ? (
                            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start gap-2">
                              <CheckCircle className="shrink-0 mt-0.5 text-emerald-600" size={16} />
                              <div>
                                <p>พบรายการปิดการขาย <strong>{closedQuotes.length}</strong> รายการ</p>
                                <p className="text-[11px] font-normal text-emerald-700 mt-0.5">
                                  สินค้าสั่งซื้อ {salesData.productSummary.filter((p: any) => p.isClosedSale).length} รายการ
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                              <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={16} />
                              <p>ไม่มีประวัติปิดการขาย (พบใบเสนอราคาค้างท่อ {openQuotes.length} รายการ)</p>
                            </div>
                          )}
                        </div>

                        {/* Closed Sales Section */}
                        {closedQuotes.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck size={14} className="text-emerald-600" />
                              <span>รายการสั่งซื้อ / PO ที่ปิดการขายแล้ว ({closedQuotes.length})</span>
                            </div>

                            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                              {closedQuotes.map((q: any, idx: number) => {
                                const qProducts = salesData.productSummary.filter((p: any) => p.quotationNumber === q.quotationNumber);
                                return (
                                  <div key={idx} className="bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2 transition-all">
                                    {/* PO Header Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-mono font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                                            {q.poNumber ? `PO: ${q.poNumber}` : 'เปิดบิลแล้ว'}
                                          </span>
                                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                            {q.status}
                                          </span>
                                        </div>
                                        {q.invoiceNumber && (
                                          <span className="text-[11px] font-mono text-blue-700 mt-1">
                                            เลขที่บิล: {q.invoiceNumber}
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-right shrink-0">
                                        <div className="text-xs font-black text-emerald-800">
                                          {formatCurrency(q.actualClosingAmount ?? q.totalAmountBeforeVat)}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                          {formatDate(q.billingDate || q.poDate || q.quotationDate)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quotation No */}
                                    <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                                      <FileText size={11} className="text-gray-400" />
                                      <span>อ้างอิง: {q.quotationNumber}</span>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-1.5 pt-1 border-t border-emerald-100">
                                      {qProducts.map((prod: any, pIdx: number) => (
                                        <div key={pIdx} className="bg-white p-2 rounded-xl border border-emerald-100/80 text-xs">
                                          <div className="font-bold text-gray-800 line-clamp-2">
                                            {prod.item || 'ไม่ทราบชื่อสินค้า'}
                                          </div>
                                          {prod.jobType && prod.jobType !== 'N/A' && (
                                            <div className="mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded w-fit">
                                              {prod.jobType}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Open Quotations Section (If any) */}
                        {openQuotes.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText size={13} className="text-amber-500" />
                              <span>ใบเสนอราคาอื่นๆ ที่ยังไม่ปิดการขาย ({openQuotes.length})</span>
                            </div>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {openQuotes.map((q: any, idx: number) => {
                                const qProducts = salesData.productSummary.filter((p: any) => p.quotationNumber === q.quotationNumber);
                                return (
                                  <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="font-mono font-bold text-gray-700">{q.quotationNumber}</span>
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                        {q.status || 'เสนอราคา'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                      {formatDate(q.quotationDate)} • {formatCurrency(q.totalAmountBeforeVat)}
                                    </div>
                                    {qProducts.length > 0 && (
                                      <div className="text-[11px] text-gray-600 line-clamp-1 pt-1 border-t border-gray-200/60">
                                        {qProducts.map(p => p.item).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
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
