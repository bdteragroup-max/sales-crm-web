"use client";

import React, { useState } from 'react';
import {
  Building2,
  Users,
  Search,
  MapPin,
  Phone,
  FileText,
  Tag,
  ChevronRight,
  Plus,
  PhoneCall,
  X,
  Loader2,
} from 'lucide-react';
import { createCompany, createContact, getDistricts, getSubDistricts } from '@/app/actions/clients';

interface Company {
  id: string;
  companyName: string;
  taxId?: string | null;
  address?: string | null;
  area?: string | null;
  province?: string | null;
  district?: string | null;
  subDistrict?: string | null;
  postalCode?: string | null;
  businessType?: string | null;
  customerType?: string | null;
  customerStatus?: string | null;
  branchOrHeadOffice?: string | null;
  assignedUser?: { 
    fullName: string; 
    employeeSale?: { position: string | null } | null;
  } | null;
  telesales: { createdAt: string; callDate?: string | null }[];
  quotations: {
    createdAt: string;
    quotationDate?: string | null;
    salesperson?: {
      id: string;
      fullName: string;
      role: string;
      employeeSale?: { position: string | null } | null;
    } | null;
  }[];
  contacts: { id: string; contactName: string; position?: string | null; mobilePhone?: string | null }[];
  _count: { quotations: number; telesales: number };
}

interface Contact {
  id: string;
  contactName: string;
  position?: string | null;
  mobilePhone?: string | null;
  company: { id: string; companyName: string };
}

interface ClientsClientPageProps {
  initialCompanies: Company[];
  initialContacts: Contact[];
  salesReps: any[];
  businessTypes: { id: string; name: string }[];
  provinces: string[];
}

type ActiveTab = 'companies' | 'contacts';

const statusColors: Record<string, string> = {
  ลูกค้าเก่า: 'bg-gray-100 text-gray-700',
  'ลูกค้าเก่า (ผู้ติดต่อใหม่)': 'bg-blue-50 text-blue-600 border border-blue-100',
  ลูกค้าใหม่: 'bg-red-50 text-brand-red border border-red-100',
  ลูกค้าเป้าหมาย: 'bg-red-600 text-white',
  ไม่ใช่ลูกค้า: 'bg-gray-100 text-gray-400',
};

export default function ClientsClientPage({ initialCompanies, initialContacts, salesReps, businessTypes, provinces }: ClientsClientPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [showNewBusinessTypeInput, setShowNewBusinessTypeInput] = useState(false);

  // ─── Address Cascading State ────────────────────────────────────────
  const [districts, setDistricts] = useState<string[]>([]);
  const [subDistricts, setSubDistricts] = useState<{ subDistrict: string, postalCode: string }[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubDistrict, setSelectedSubDistrict] = useState('');
  const [autoPostalCode, setAutoPostalCode] = useState('');

  const handleProvinceChange = async (province: string) => {
    setSelectedProvince(province);
    setSelectedDistrict('');
    setSelectedSubDistrict('');
    setAutoPostalCode('');
    setDistricts([]);
    setSubDistricts([]);
    if (province) {
      const res = await getDistricts(province);
      setDistricts(res.map(d => d.district as string));
    }
  };

  const handleDistrictChange = async (district: string) => {
    setSelectedDistrict(district);
    setSelectedSubDistrict('');
    setAutoPostalCode('');
    setSubDistricts([]);
    if (district) {
      const res = await getSubDistricts(selectedProvince, district);
      setSubDistricts(res.map(s => ({ subDistrict: s.subDistrict as string, postalCode: s.postalCode as string })));
    }
  };

  const handleSubDistrictChange = (subDistrict: string) => {
    setSelectedSubDistrict(subDistrict);
    const match = subDistricts.find(s => s.subDistrict === subDistrict);
    if (match) {
      setAutoPostalCode(match.postalCode);
    }
  };

  // ─── Filtered data ───────────────────────────────────────────────────
  const filteredCompanies = initialCompanies.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.companyName?.toLowerCase().includes(q) ||
      c.taxId?.toLowerCase().includes(q) ||
      c.businessType?.toLowerCase().includes(q) ||
      c.province?.toLowerCase().includes(q)
    );
  });

  const filteredContacts = initialContacts.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.contactName?.toLowerCase().includes(q) ||
      c.company?.companyName?.toLowerCase().includes(q) ||
      c.mobilePhone?.toLowerCase().includes(q) ||
      c.position?.toLowerCase().includes(q)
    );
  });

  const getTimeSince = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'วันนี้';
    if (diffDays < 30) return `${diffDays} วันที่แล้ว`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} เดือนที่แล้ว`;
    
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} ปีที่แล้ว`;
  };

  return (
    <div className="w-full">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl shadow-sm">
            <Building2 size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ลูกค้าและบริษัท</h1>
            <p className="text-gray-500 mt-1 text-sm">
              จัดการข้อมูลบริษัทและผู้ติดต่อในระบบ CRM
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 text-sm"
          >
            <Plus size={18} />
            เพิ่มบริษัทใหม่
          </button>
          <button 
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} className="text-red-500" />
            เพิ่มผู้ติดต่อ
          </button>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-gray-200 mb-6 bg-white/50 px-2 pt-2 rounded-t-xl overflow-x-auto">
        <TabButton
          active={activeTab === 'companies'}
          onClick={() => { setActiveTab('companies'); setSearchTerm(''); setExpandedCompany(null); }}
          icon={<Building2 size={16} />}
          label="บริษัท"
          count={initialCompanies.length}
        />
        <TabButton
          active={activeTab === 'contacts'}
          onClick={() => { setActiveTab('contacts'); setSearchTerm(''); setExpandedCompany(null); }}
          icon={<Users size={16} />}
          label="ผู้ติดต่อ"
          count={initialContacts.length}
        />
      </div>

      {/* ─── Search bar ──────────────────────────────────────────────────── */}
      <div className="relative max-w-md mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={17} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={
            activeTab === 'companies'
              ? 'ค้นหาตามชื่อบริษัท, เลขภาษี, จังหวัด...'
              : 'ค้นหาตามชื่อ, บริษัท, เบอร์โทร...'
          }
          className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ─── Companies Tab ───────────────────────────────────────────────── */}
      {activeTab === 'companies' && (
        <div className="space-y-3">
          {filteredCompanies.length === 0 ? (
            <EmptyState message={searchTerm ? 'ไม่พบบริษัทที่ค้นหา' : 'ยังไม่มีข้อมูลบริษัท'} icon={<Building2 size={40} className="text-gray-300" />} />
          ) : (
            filteredCompanies.map((company) => {
              const activeHandler = company.quotations?.[0]?.salesperson || company.assignedUser;
              return (
                <div
                key={company.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-red-100"
              >
                {/* Company Row */}
                <button
                  onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                  className="w-full flex items-center gap-4 p-5 text-left group"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-black text-lg shrink-0 border border-red-100">
                    {company.companyName.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-[15px]">{company.companyName}</span>
                      {company.customerStatus && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColors[company.customerStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {company.customerStatus}
                        </span>
                      )}
                      {company.branchOrHeadOffice && (
                        <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                          {company.branchOrHeadOffice}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {company.taxId && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Tag size={11} /> {company.taxId}
                        </span>
                      )}
                      {(company.province || company.district) && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={11} />
                          {[company.district, company.province].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {company.businessType && (
                        <span className="text-xs text-gray-500">{company.businessType}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <div className="text-right pr-4 border-r border-gray-100 min-w-[100px]">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ติดต่อล่าสุด</p>
                      {(() => {
                        const lastTele = company.telesales?.[0]?.callDate || company.telesales?.[0]?.createdAt;
                        const lastQuot = company.quotations?.[0]?.quotationDate || company.quotations?.[0]?.createdAt;
                        
                        const lastDate = [lastTele, lastQuot]
                          .filter(Boolean)
                          .map(d => new Date(d as string))
                          .sort((a, b) => b.getTime() - a.getTime())[0];

                        if (!lastDate) {
                          return <p className="text-[11px] font-bold mt-0.5 text-gray-300">ยังไม่เคยติดต่อ</p>;
                        }

                        const isOld = new Date().getTime() - lastDate.getTime() > 1000 * 60 * 60 * 24 * 30;
                        return (
                          <p className={`text-[11px] font-bold mt-0.5 ${isOld ? 'text-amber-600' : 'text-green-600'}`}>
                            {getTimeSince(lastDate.toISOString())}
                          </p>
                        );
                      })()}
                    </div>
                    
                    {/* Assigned Salesperson / Account Manager */}
                    <div className="text-left px-4 border-r border-gray-100 min-w-[125px]">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ผู้ดูแลบัญชี</p>
                      {activeHandler ? (
                        <div>
                          <p className="text-[11px] font-black text-gray-800 mt-0.5 truncate max-w-[120px]">{activeHandler.fullName}</p>
                          <p className="text-[9px] text-gray-400 font-bold truncate max-w-[120px]">
                            {activeHandler.employeeSale?.position || 'Sales Rep'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold mt-0.5 text-gray-300">ไม่มีผู้ดูแล</p>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="flex items-center gap-1 text-gray-700 font-bold text-sm">
                        <FileText size={13} className="text-red-400" />
                        {company._count.quotations}
                      </div>
                      <p className="text-[10px] text-gray-400">ใบเสนอ</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-gray-700 font-bold text-sm">
                        <PhoneCall size={13} className="text-gray-400" />
                        {company._count.telesales}
                      </div>
                      <p className="text-[10px] text-gray-400">โทรหา</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-gray-700 font-bold text-sm">
                        <Users size={13} className="text-gray-400" />
                        {company.contacts.length}
                      </div>
                      <p className="text-[10px] text-gray-400">ผู้ติดต่อ</p>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    className={`text-gray-300 shrink-0 transition-transform duration-200 group-hover:text-red-400 ${expandedCompany === company.id ? 'rotate-90 text-red-400' : ''}`}
                  />
                </button>

                {/* Expanded contacts section */}
                {expandedCompany === company.id && company.contacts.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Users size={12} /> ผู้ติดต่อ ({company.contacts.length} คน)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {company.contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                            {contact.contactName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{contact.contactName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {contact.position && <span>{contact.position}</span>}
                              {contact.mobilePhone && (
                                <span className="flex items-center gap-0.5">
                                  <Phone size={10} /> {contact.mobilePhone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expandedCompany === company.id && company.contacts.length === 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                    <Plus size={14} />
                    ยังไม่มีผู้ติดต่อในบริษัทนี้
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      )}

      {/* ─── Contacts Tab ────────────────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/60 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="font-semibold py-4 px-6">ชื่อผู้ติดต่อ</th>
                  <th className="font-semibold py-4 px-6">ตำแหน่ง</th>
                  <th className="font-semibold py-4 px-6">บริษัท</th>
                  <th className="font-semibold py-4 px-6">เบอร์โทรศัพท์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                            {contact.contactName.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{contact.contactName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-500">{contact.position || '-'}</td>
                      <td className="py-4 px-6">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <Building2 size={14} className="text-red-400 shrink-0" />
                          {contact.company?.companyName || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {contact.mobilePhone ? (
                          <a
                            href={`tel:${contact.mobilePhone}`}
                            className="flex items-center gap-1.5 text-brand-red hover:text-red-700 font-medium"
                          >
                            <Phone size={14} /> {contact.mobilePhone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Users size={36} className="text-gray-200" />
                        <span>{searchTerm ? 'ไม่พบผู้ติดต่อที่ค้นหา' : 'ยังไม่มีข้อมูลผู้ติดต่อ'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-brand-red rounded-lg">
                  <Building2 size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900">เพิ่มบริษัทใหม่</h3>
              </div>
              <button onClick={() => setIsCompanyModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={async (formData) => {
              const res = await createCompany(Object.fromEntries(formData));
              if (res.success) {
                setIsCompanyModalOpen(false);
                window.location.reload(); // Quick refresh to show new data
              } else {
                alert(res.message);
              }
            }} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อบริษัท (Company Name) *</label>
                  <input required name="companyName" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all" placeholder="บริษัท เอบีซี จำกัด" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                  <input name="taxId" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all" placeholder="0123456789012" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทลูกค้า (นิติบุคคล / บุคคลธรรมดา) *</label>
                  <select required name="customerType" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none">
                    <option value="นิติบุคคล">นิติบุคคล (Legal Entity)</option>
                    <option value="บุคคลธรรมดา">บุคคลธรรมดา (Individual)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทธุรกิจ (Business Type) *</label>
                  <select 
                    required 
                    name="businessType" 
                    onChange={(e) => setShowNewBusinessTypeInput(e.target.value === 'ADD_NEW')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none"
                  >
                    <option value="">-- เลือกประเภทธุรกิจ --</option>
                    {businessTypes.map(type => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-brand-red font-bold">+ เพิ่มประเภทธุรกิจใหม่...</option>
                  </select>
                </div>

                {showNewBusinessTypeInput && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-black text-brand-red uppercase tracking-widest ml-1 italic">ระบุประเภทธุรกิจใหม่ *</label>
                    <input 
                      required 
                      name="newBusinessType" 
                      className="w-full bg-red-50/30 border border-red-100 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all" 
                      placeholder="เช่น อสังหาริมทรัพย์, พลังงาน" 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สถานะลูกค้า</label>
                  <select name="customerStatus" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none">
                    <option value="ลูกค้าใหม่">ลูกค้าใหม่</option>
                    <option value="ลูกค้าเป้าหมาย">ลูกค้าเป้าหมาย</option>
                    <option value="ลูกค้าเก่า">ลูกค้าเก่า</option>
                    <option value="ลูกค้าเก่า (ผู้ติดต่อใหม่)">ลูกค้าเก่า (ผู้ติดต่อใหม่)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ผู้ดูแลบัญชี (Account Manager)</label>
                  <select name="assignedUserId" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none">
                    <option value="">-- เลือกผู้จัดการ/พนักงาน --</option>
                    {salesReps.map(rep => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName} ({rep.employeeSale?.position || rep.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด *</label>
                  <select 
                    required 
                    name="province" 
                    value={selectedProvince}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none"
                  >
                    <option value="">-- เลือกจังหวัด --</option>
                    {provinces.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ *</label>
                  <select 
                    required 
                    name="district" 
                    value={selectedDistrict}
                    disabled={!selectedProvince}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">-- เลือกเขต/อำเภอ --</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล *</label>
                  <select 
                    required 
                    name="subDistrict" 
                    value={selectedSubDistrict}
                    disabled={!selectedDistrict}
                    onChange={(e) => handleSubDistrictChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">-- เลือกแขวง/ตำบล --</option>
                    {subDistricts.map(s => (
                      <option key={s.subDistrict} value={s.subDistrict}>{s.subDistrict}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์ *</label>
                  <input 
                    required 
                    name="postalCode" 
                    value={autoPostalCode}
                    onChange={(e) => setAutoPostalCode(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 outline-none transition-all" 
                    placeholder="10XXX" 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all">ยกเลิก</button>
                <button type="submit" className="flex-2 px-10 py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all">บันทึกข้อมูลบริษัท</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                  <Users size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900">เพิ่มผู้ติดต่อ</h3>
              </div>
              <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={async (formData) => {
              const res = await createContact(Object.fromEntries(formData));
              if (res.success) {
                setIsContactModalOpen(false);
                window.location.reload();
              } else {
                alert(res.message);
              }
            }} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สังกัดบริษัท *</label>
                <select required name="companyId" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none">
                  <option value="">-- เลือกบริษัท --</option>
                  {initialCompanies.map(comp => (
                    <option key={comp.id} value={comp.id}>{comp.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล *</label>
                <input required name="contactName" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all" placeholder="คุณสมชาย ใจดี" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ตำแหน่ง (Position)</label>
                <input name="position" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all" placeholder="Manager / Director" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                <input name="mobilePhone" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all" placeholder="081-xxx-xxxx" />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all">ยกเลิก</button>
                <button type="submit" className="flex-2 px-10 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all">เพิ่มผู้ติดต่อ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
        active
          ? 'border-red-600 text-red-600 bg-white shadow-sm rounded-t-lg'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/60'
      }`}
    >
      {icon}
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
      {icon}
      <p className="text-sm">{message}</p>
    </div>
  );
}
