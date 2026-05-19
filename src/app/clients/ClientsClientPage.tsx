"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createCompany, createContact, getDistricts, getSubDistricts, getLocationsByPostalCode, updateCompany, updateContact, reassignCompanyAdministrator } from '@/app/actions/clients';

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
    id: string;
    fullName: string; 
    employeeSale?: { position: string | null } | null;
    isActive?: boolean | null;
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
  contacts: { 
    id: string; 
    contactName: string; 
    position?: string | null; 
    mobilePhone?: string | null;
    email?: string | null;
    isETaxReceiver?: boolean | null;
  }[];
  _count: { quotations: number; telesales: number };
  billingAddress?: string | null;
  billingSubDistrict?: string | null;
  billingDistrict?: string | null;
  billingProvince?: string | null;
  billingPostalCode?: string | null;
  shippingAddress?: string | null;
  shippingSubDistrict?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;
  shippingPostalCode?: string | null;
  paymentMethod?: string | null;
}

interface Contact {
  id: string;
  contactName: string;
  position?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  isETaxReceiver?: boolean | null;
  companyId?: string | null;
  company?: { id: string; companyName: string } | null;
}

interface ClientsClientPageProps {
  initialCompanies: Company[];
  initialContacts: Contact[];
  companiesCount: number;
  contactsCount: number;
  allCompanies: { id: string; companyName: string }[];
  salesReps: any[];
  businessTypes: { id: string; name: string }[];
  provinces: string[];
  currentPage: number;
  limit: number;
}

type ActiveTab = 'companies' | 'contacts';

const statusColors: Record<string, string> = {
  ลูกค้าเก่า: 'bg-gray-100 text-gray-700',
  'ลูกค้าเก่า (ผู้ติดต่อใหม่)': 'bg-blue-50 text-blue-600 border border-blue-100',
  ลูกค้าใหม่: 'bg-red-50 text-brand-red border border-red-100',
  ลูกค้าเป้าหมาย: 'bg-red-600 text-white',
  ไม่ใช่ลูกค้า: 'bg-gray-100 text-gray-400',
};

export default function ClientsClientPage({
  initialCompanies,
  initialContacts,
  companiesCount,
  contactsCount,
  allCompanies,
  salesReps,
  businessTypes,
  provinces,
  currentPage,
  limit,
}: ClientsClientPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [showNewBusinessTypeInput, setShowNewBusinessTypeInput] = useState(false);

  // ─── Inline Reassignment State ─────────────────────────────────────────
  const [reassigningCompanyId, setReassigningCompanyId] = useState<string | null>(null);
  const [selectedNewRepId, setSelectedNewRepId] = useState<string>('');
  const [isReassigningLoading, setIsReassigningLoading] = useState<boolean>(false);

  // ─── Edit Company / Contact State ─────────────────────────────────────
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [showEditNewBusinessTypeInput, setShowEditNewBusinessTypeInput] = useState(false);

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);

  // Address Cascading State for Editing Company
  const [editDistricts, setEditDistricts] = useState<string[]>([]);
  const [editSubDistricts, setEditSubDistricts] = useState<{ subDistrict: string, postalCode: string }[]>([]);
  const [editSelectedProvince, setEditSelectedProvince] = useState('');
  const [editSelectedDistrict, setEditSelectedDistrict] = useState('');
  const [editSelectedSubDistrict, setEditSelectedSubDistrict] = useState('');
  const [editAutoPostalCode, setEditAutoPostalCode] = useState('');

  // Billing Address States for Create Form
  const [isBillingSameAsRegistered, setIsBillingSameAsRegistered] = useState(true);
  const [billingAddress, setBillingAddress] = useState('');
  const [billingProvince, setBillingProvince] = useState('');
  const [billingDistrict, setBillingDistrict] = useState('');
  const [billingSubDistrict, setBillingSubDistrict] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');

  // Shipping Address States for Create Form
  const [isShippingSameAsBilling, setIsShippingSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [shippingDistrict, setShippingDistrict] = useState('');
  const [shippingSubDistrict, setShippingSubDistrict] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');

  // Billing Address States for Edit Form
  const [editIsBillingSameAsRegistered, setEditIsBillingSameAsRegistered] = useState(true);
  const [editBillingAddress, setEditBillingAddress] = useState('');
  const [editBillingProvince, setEditBillingProvince] = useState('');
  const [editBillingDistrict, setEditBillingDistrict] = useState('');
  const [editBillingSubDistrict, setEditBillingSubDistrict] = useState('');
  const [editBillingPostalCode, setEditBillingPostalCode] = useState('');

  // Shipping Address States for Edit Form
  const [editIsShippingSameAsBilling, setEditIsShippingSameAsBilling] = useState(true);
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editShippingProvince, setEditShippingProvince] = useState('');
  const [editShippingDistrict, setEditShippingDistrict] = useState('');
  const [editShippingSubDistrict, setEditShippingSubDistrict] = useState('');
  const [editShippingPostalCode, setEditShippingPostalCode] = useState('');

  // Payment Method States
  const [paymentMethod, setPaymentMethod] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');

  // ─── Address Cascading State ────────────────────────────────────────
  const [districts, setDistricts] = useState<string[]>([]);
  const [subDistricts, setSubDistricts] = useState<{ subDistrict: string, postalCode: string }[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubDistrict, setSelectedSubDistrict] = useState('');
  const [autoPostalCode, setAutoPostalCode] = useState('');

  const handleInlineReassign = async (companyId: string) => {
    if (!selectedNewRepId) return;
    setIsReassigningLoading(true);
    try {
      const res = await reassignCompanyAdministrator(companyId, selectedNewRepId);
      if (res.success) {
        setReassigningCompanyId(null);
        setSelectedNewRepId('');
        router.refresh();
      } else {
        alert(res.message || 'เกิดข้อผิดพลาดในการมอบหมายผู้ดูแลใหม่');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsReassigningLoading(false);
    }
  };

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

  // ─── Edit Handlers & Autocomplete ─────────────────────────────────────
  const handleEditCompany = async (company: Company) => {
    setEditingCompany(company);
    setShowEditNewBusinessTypeInput(false);
    
    // Pre-populate main address
    setEditSelectedProvince(company.province || '');
    setEditSelectedDistrict(company.district || '');
    setEditSelectedSubDistrict(company.subDistrict || '');
    setEditAutoPostalCode(company.postalCode || '');
    
    if (company.province) {
      const dists = await getDistricts(company.province);
      setEditDistricts(dists.map(d => d.district as string));
    } else {
      setEditDistricts([]);
    }
    if (company.province && company.district) {
      const subs = await getSubDistricts(company.province, company.district);
      setEditSubDistricts(subs.map(s => ({ subDistrict: s.subDistrict as string, postalCode: s.postalCode as string })));
    } else {
      setEditSubDistricts([]);
    }

    // Pre-populate Billing Address
    setEditBillingAddress(company.billingAddress || '');
    setEditBillingSubDistrict(company.billingSubDistrict || '');
    setEditBillingDistrict(company.billingDistrict || '');
    setEditBillingProvince(company.billingProvince || '');
    setEditBillingPostalCode(company.billingPostalCode || '');

    // Detect if billing is same as registered
    const sameBilling = 
      (company.billingAddress || '') === (company.address || '') &&
      (company.billingProvince || '') === (company.province || '') &&
      (company.billingDistrict || '') === (company.district || '') &&
      (company.billingSubDistrict || '') === (company.subDistrict || '') &&
      (company.billingPostalCode || '') === (company.postalCode || '');
    setEditIsBillingSameAsRegistered(sameBilling && !!company.billingAddress);

    // Pre-populate Shipping Address
    setEditShippingAddress(company.shippingAddress || '');
    setEditShippingSubDistrict(company.shippingSubDistrict || '');
    setEditShippingDistrict(company.shippingDistrict || '');
    setEditShippingProvince(company.shippingProvince || '');
    setEditShippingPostalCode(company.shippingPostalCode || '');

    // Detect if shipping is same as billing
    const sameShipping =
      (company.shippingAddress || '') === (company.billingAddress || '') &&
      (company.shippingProvince || '') === (company.billingProvince || '') &&
      (company.shippingDistrict || '') === (company.billingDistrict || '') &&
      (company.shippingSubDistrict || '') === (company.billingSubDistrict || '') &&
      (company.shippingPostalCode || '') === (company.billingPostalCode || '');
    setEditIsShippingSameAsBilling(sameShipping && !!company.shippingAddress);

    setEditPaymentMethod(company.paymentMethod || '');
    setIsEditCompanyModalOpen(true);
  };

  const handleEditContact = (contact: Contact, companyId: string) => {
    setEditingContact({
      ...contact,
      companyId
    });
    setIsEditContactModalOpen(true);
  };

  const handleEditProvinceChange = async (province: string) => {
    setEditSelectedProvince(province);
    setEditSelectedDistrict('');
    setEditSelectedSubDistrict('');
    setEditAutoPostalCode('');
    setEditDistricts([]);
    setEditSubDistricts([]);
    if (province) {
      const res = await getDistricts(province);
      setEditDistricts(res.map(d => d.district as string));
    }
  };

  const handleEditDistrictChange = async (district: string) => {
    setEditSelectedDistrict(district);
    setEditSelectedSubDistrict('');
    setEditAutoPostalCode('');
    setEditSubDistricts([]);
    if (district) {
      const res = await getSubDistricts(editSelectedProvince, district);
      setEditSubDistricts(res.map(s => ({ subDistrict: s.subDistrict as string, postalCode: s.postalCode as string })));
    }
  };

  const handleEditSubDistrictChange = (subDistrict: string) => {
    setEditSelectedSubDistrict(subDistrict);
    const match = editSubDistricts.find(s => s.subDistrict === subDistrict);
    if (match) {
      setEditAutoPostalCode(match.postalCode);
    }
  };

  // Postal code auto-fill for Create Company main address
  React.useEffect(() => {
    if (autoPostalCode && autoPostalCode.length === 5) {
      const triggerAutofill = async () => {
        const locations = await getLocationsByPostalCode(autoPostalCode);
        if (locations && locations.length > 0) {
          const first = locations[0];
          setSelectedProvince(first.province);
          
          const dists = await getDistricts(first.province);
          setDistricts(dists.map(d => d.district as string));
          setSelectedDistrict(first.district);

          const subs = await getSubDistricts(first.province, first.district);
          setSubDistricts(subs.map(s => ({ subDistrict: s.subDistrict as string, postalCode: s.postalCode as string })));
          setSelectedSubDistrict(first.subDistrict);
        }
      };
      triggerAutofill();
    }
  }, [autoPostalCode]);

  // Postal code auto-fill for Edit Company main address
  React.useEffect(() => {
    if (editAutoPostalCode && editAutoPostalCode.length === 5) {
      const triggerAutofill = async () => {
        const locations = await getLocationsByPostalCode(editAutoPostalCode);
        if (locations && locations.length > 0) {
          const first = locations[0];
          setEditSelectedProvince(first.province);
          
          const dists = await getDistricts(first.province);
          setEditDistricts(dists.map(d => d.district as string));
          setEditSelectedDistrict(first.district);

          const subs = await getSubDistricts(first.province, first.district);
          setEditSubDistricts(subs.map(s => ({ subDistrict: s.subDistrict as string, postalCode: s.postalCode as string })));
          setEditSelectedSubDistrict(first.subDistrict);
        }
      };
      triggerAutofill();
    }
  }, [editAutoPostalCode]);

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
                    <div className="text-left px-4 border-r border-gray-100 min-w-[165px]">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ผู้ดูแลบัญชี</p>
                      {reassigningCompanyId === company.id ? (
                        <div className="mt-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={selectedNewRepId}
                            onChange={(e) => setSelectedNewRepId(e.target.value)}
                            disabled={isReassigningLoading}
                            className="text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none w-full max-w-[145px] focus:border-brand-red font-medium text-gray-700 shadow-sm"
                          >
                            <option value="">-- เลือกผู้ดูแลใหม่ --</option>
                            {salesReps.map((rep) => (
                              <option key={rep.id} value={rep.id}>
                                {rep.fullName} ({rep.employeeSale?.position || rep.role})
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isReassigningLoading || !selectedNewRepId}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInlineReassign(company.id);
                              }}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 disabled:bg-gray-200 text-white font-extrabold px-2 py-0.5 rounded shadow-sm transition-all"
                            >
                              {isReassigningLoading ? '...' : 'บันทึก'}
                            </button>
                            <button
                              type="button"
                              disabled={isReassigningLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReassigningCompanyId(null);
                                setSelectedNewRepId('');
                              }}
                              className="text-[9px] text-gray-500 hover:text-gray-700 font-bold px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50 bg-white transition-all"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : company.assignedUser ? (
                        <div>
                          <p className={`text-[11px] font-black mt-0.5 truncate max-w-[120px] ${company.assignedUser.isActive === false ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {company.assignedUser.fullName}
                          </p>
                          {company.assignedUser.isActive === false ? (
                            <div className="flex flex-col items-start gap-1 mt-1">
                              <span className="inline-block bg-red-50 text-red-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wider animate-pulse">
                                unavailable
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReassigningCompanyId(company.id);
                                  setSelectedNewRepId('');
                                }}
                                className="text-[9px] text-red-600 hover:text-red-700 font-black tracking-wide underline mt-0.5 bg-transparent border-0 p-0 cursor-pointer transition-colors block"
                              >
                                Assign new administrator
                              </button>
                            </div>
                          ) : (
                            <p className="text-[9px] text-gray-400 font-bold truncate max-w-[120px]">
                              {company.assignedUser.employeeSale?.position || 'Sales Rep'}
                            </p>
                          )}
                        </div>
                      ) : activeHandler ? (
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
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 flex-wrap gap-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Users size={12} className="text-red-500" />
                        <span>ผู้ติดต่อ ({company.contacts.length} คน)</span>
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCompany(company);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl shadow-sm transition-all"
                      >
                        <Building2 size={12} /> แก้ไขข้อมูลบริษัท/ลูกค้า
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {company.contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                          <div className="flex items-center gap-3 min-w-0">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditContact(contact, company.id);
                            }}
                            className="text-[11px] font-black text-slate-400 hover:text-brand-red underline transition-colors shrink-0"
                          >
                            แก้ไข
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expandedCompany === company.id && company.contacts.length === 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 text-center text-sm text-gray-400 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Plus size={14} /> ยังไม่มีผู้ติดต่อในบริษัทนี้
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCompany(company);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl shadow-sm transition-all"
                    >
                      <Building2 size={12} /> แก้ไขข้อมูลบริษัท/ลูกค้า
                    </button>
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
                  <th className="font-semibold py-4 px-6 text-right">การจัดการ</th>
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
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditContact(contact, contact.companyId || contact.company?.id || '')}
                          className="text-[11px] font-black text-slate-400 hover:text-brand-red underline transition-colors"
                        >
                          แก้ไข
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-gray-400">
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จดทะเบียน/ที่อยู่หลัก (Registered Address) *</label>
                  <input required name="address" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" placeholder="123/45 หมู่ 6 ถนนวิภาวดีรังสิต..." />
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

                {/* Billing Address Section */}
                <div className="md:col-span-2 border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">ที่อยู่สำหรับออกใบกำกับภาษี (Billing Address)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const mainAddr = (document.querySelector('input[name="address"]') as HTMLInputElement)?.value || '';
                        setBillingAddress(mainAddr);
                        setBillingProvince(selectedProvince);
                        setBillingDistrict(selectedDistrict);
                        setBillingSubDistrict(selectedSubDistrict);
                        setBillingPostalCode(autoPostalCode);
                      }}
                      className="text-xs font-black text-brand-red hover:underline"
                    >
                      คัดลอกจากที่อยู่หลัก
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่ใบกำกับภาษี</label>
                      <input
                        name="billingAddress"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="ที่อยู่สำหรับออกใบกำกับภาษี..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล</label>
                      <input
                        name="billingSubDistrict"
                        value={billingSubDistrict}
                        onChange={(e) => setBillingSubDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="แขวง/ตำบล"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ</label>
                      <input
                        name="billingDistrict"
                        value={billingDistrict}
                        onChange={(e) => setBillingDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="เขต/อำเภอ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด</label>
                      <input
                        name="billingProvince"
                        value={billingProvince}
                        onChange={(e) => setBillingProvince(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="จังหวัด"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์</label>
                      <input
                        name="billingPostalCode"
                        value={billingPostalCode}
                        onChange={(e) => setBillingPostalCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="รหัสไปรษณีย์"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address Section */}
                <div className="md:col-span-2 border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">ที่อยู่จัดส่งสินค้า (Shipping Address)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShippingAddress(billingAddress);
                        setShippingProvince(billingProvince);
                        setShippingDistrict(billingDistrict);
                        setShippingSubDistrict(billingSubDistrict);
                        setShippingPostalCode(billingPostalCode);
                      }}
                      className="text-xs font-black text-brand-red hover:underline"
                    >
                      คัดลอกจากที่อยู่ใบกำกับภาษี
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จัดส่ง</label>
                      <input
                        name="shippingAddress"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="ที่อยู่จัดส่งสินค้า..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล</label>
                      <input
                        name="shippingSubDistrict"
                        value={shippingSubDistrict}
                        onChange={(e) => setShippingSubDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="แขวง/ตำบล"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ</label>
                      <input
                        name="shippingDistrict"
                        value={shippingDistrict}
                        onChange={(e) => setShippingDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="เขต/อำเภอ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด</label>
                      <input
                        name="shippingProvince"
                        value={shippingProvince}
                        onChange={(e) => setShippingProvince(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="จังหวัด"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์</label>
                      <input
                        name="shippingPostalCode"
                        value={shippingPostalCode}
                        onChange={(e) => setShippingPostalCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="รหัสไปรษณีย์"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">วิธีการชำระเงิน (Payment Method)</label>
                  <select
                    name="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none"
                  >
                    <option value="">-- เลือกวิธีการชำระเงิน --</option>
                    <option value="เงินสด">เงินสด (Cash)</option>
                    <option value="โอนเงินผ่านธนาคาร">โอนเงินผ่านธนาคาร (Bank Transfer)</option>
                    <option value="เครดิต 30 วัน">เครดิต 30 วัน (30 Days Credit)</option>
                    <option value="เครดิต 60 วัน">เครดิต 60 วัน (60 Days Credit)</option>
                  </select>
                </div>

                {/* Primary Contact Section */}
                <div className="md:col-span-2 border-t border-gray-100 pt-6">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">ข้อมูลผู้ติดต่อหลัก (Primary Contact)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อผู้ติดต่อหลัก</label>
                      <input
                        name="contactName"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="คุณสมชาย ดีใจ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ตำแหน่ง</label>
                      <input
                        name="contactPosition"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="Manager / Director"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                      <input
                        name="contactPhone"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="081-xxx-xxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">อีเมลผู้ติดต่อ (สำหรับออกเอกสาร E-tax)</label>
                      <input
                        name="contactEmail"
                        type="email"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                        placeholder="somchai@company.com"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isETaxReceiver"
                        name="isETaxReceiver"
                        value="true"
                        className="w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red focus:ring-opacity-25"
                      />
                      <label htmlFor="isETaxReceiver" className="text-xs font-black text-slate-700 select-none">
                        ผู้ติดต่อรายนี้เป็นผู้รับเอกสาร E-Tax (E-Tax Recipient)
                      </label>
                    </div>
                  </div>
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

      {/* ─── Edit Company Modal ───────────────────────────────────────────── */}
      {isEditCompanyModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-brand-red rounded-lg">
                  <Building2 size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900">แก้ไขข้อมูลบริษัท/ลูกค้า</h3>
              </div>
              <button onClick={() => setIsEditCompanyModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={async (formData) => {
              const res = await updateCompany(editingCompany.id, Object.fromEntries(formData));
              if (res.success) {
                setIsEditCompanyModalOpen(false);
                window.location.reload();
              } else {
                alert(res.message);
              }
            }} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อบริษัท (Company Name) *</label>
                  <input required name="companyName" defaultValue={editingCompany.companyName || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                  <input name="taxId" defaultValue={editingCompany.taxId || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทลูกค้า *</label>
                  <select required name="customerType" defaultValue={editingCompany.customerType || 'นิติบุคคล'} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none">
                    <option value="นิติบุคคล">นิติบุคคล (Legal Entity)</option>
                    <option value="บุคคลธรรมดา">บุคคลธรรมดา (Individual)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทธุรกิจ (Business Type) *</label>
                  <select 
                    required 
                    name="businessType" 
                    defaultValue={editingCompany.businessType || ''}
                    onChange={(e) => setShowEditNewBusinessTypeInput(e.target.value === 'ADD_NEW')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none"
                  >
                    <option value="">-- เลือกประเภทธุรกิจ --</option>
                    {businessTypes.map(type => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-brand-red font-bold">+ เพิ่มประเภทธุรกิจใหม่...</option>
                  </select>
                </div>

                {showEditNewBusinessTypeInput && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-black text-brand-red uppercase tracking-widest ml-1 italic">ระบุประเภทธุรกิจใหม่ *</label>
                    <input 
                      required 
                      name="newBusinessType" 
                      className="w-full bg-red-50/30 border border-red-100 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" 
                      placeholder="เช่น อสังหาริมทรัพย์, พลังงาน" 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สถานะลูกค้า</label>
                  <select name="customerStatus" defaultValue={editingCompany.customerStatus || 'ลูกค้าใหม่'} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none">
                    <option value="ลูกค้าใหม่">ลูกค้าใหม่</option>
                    <option value="ลูกค้าเป้าหมาย">ลูกค้าเป้าหมาย</option>
                    <option value="ลูกค้าเก่า">ลูกค้าเก่า</option>
                    <option value="ลูกค้าเก่า (ผู้ติดต่อใหม่)">ลูกค้าเก่า (ผู้ติดต่อใหม่)</option>
                  </select>
                </div>
                 <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ผู้ดูแลบัญชี (Account Manager)</label>
                  <select name="assignedUserId" defaultValue={editingCompany.assignedUser?.id || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none">
                    <option value="">-- เลือกผู้จัดการ/พนักงาน --</option>
                    {salesReps.map(rep => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName} ({rep.employeeSale?.position || rep.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address Section */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จดทะเบียน/ที่อยู่หลัก (Registered Address) *</label>
                  <input required name="address" defaultValue={editingCompany.address || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด *</label>
                  <select 
                    required 
                    name="province" 
                    value={editSelectedProvince}
                    onChange={(e) => handleEditProvinceChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none"
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
                    value={editSelectedDistrict}
                    disabled={!editSelectedProvince}
                    onChange={(e) => handleEditDistrictChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">-- เลือกเขต/อำเภอ --</option>
                    {editDistricts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล *</label>
                  <select 
                    required 
                    name="subDistrict" 
                    value={editSelectedSubDistrict}
                    disabled={!editSelectedDistrict}
                    onChange={(e) => handleEditSubDistrictChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none disabled:opacity-50"
                  >
                    <option value="">-- เลือกแขวง/ตำบล --</option>
                    {editSubDistricts.map(s => (
                      <option key={s.subDistrict} value={s.subDistrict}>{s.subDistrict}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์ *</label>
                  <input 
                    required 
                    name="postalCode" 
                    value={editAutoPostalCode}
                    onChange={(e) => setEditAutoPostalCode(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 outline-none transition-all" 
                  />
                </div>

                {/* Billing Address Section */}
                <div className="md:col-span-2 border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">ที่อยู่สำหรับออกใบกำกับภาษี (Billing Address)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const mainAddr = (document.querySelector('form input[name="address"]') as HTMLInputElement)?.value || '';
                        setEditBillingAddress(mainAddr);
                        setEditBillingProvince(editSelectedProvince);
                        setEditBillingDistrict(editSelectedDistrict);
                        setEditBillingSubDistrict(editSelectedSubDistrict);
                        setEditBillingPostalCode(editAutoPostalCode);
                      }}
                      className="text-xs font-black text-brand-red hover:underline"
                    >
                      คัดลอกจากที่อยู่หลัก
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่ใบกำกับภาษี</label>
                      <input
                        name="billingAddress"
                        value={editBillingAddress}
                        onChange={(e) => setEditBillingAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล</label>
                      <input
                        name="billingSubDistrict"
                        value={editBillingSubDistrict}
                        onChange={(e) => setEditBillingSubDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ</label>
                      <input
                        name="billingDistrict"
                        value={editBillingDistrict}
                        onChange={(e) => setEditBillingDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด</label>
                      <input
                        name="billingProvince"
                        value={editBillingProvince}
                        onChange={(e) => setEditBillingProvince(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์</label>
                      <input
                        name="billingPostalCode"
                        value={editBillingPostalCode}
                        onChange={(e) => setEditBillingPostalCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address Section */}
                <div className="md:col-span-2 border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">ที่อยู่จัดส่งสินค้า (Shipping Address)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditShippingAddress(editBillingAddress);
                        setEditShippingProvince(editBillingProvince);
                        setEditShippingDistrict(editBillingDistrict);
                        setEditShippingSubDistrict(editBillingSubDistrict);
                        setEditShippingPostalCode(editBillingPostalCode);
                      }}
                      className="text-xs font-black text-brand-red hover:underline"
                    >
                      คัดลอกจากที่อยู่ใบกำกับภาษี
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จัดส่ง</label>
                      <input
                        name="shippingAddress"
                        value={editShippingAddress}
                        onChange={(e) => setEditShippingAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล</label>
                      <input
                        name="shippingSubDistrict"
                        value={editShippingSubDistrict}
                        onChange={(e) => setEditShippingSubDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ</label>
                      <input
                        name="shippingDistrict"
                        value={editShippingDistrict}
                        onChange={(e) => setEditShippingDistrict(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด</label>
                      <input
                        name="shippingProvince"
                        value={editShippingProvince}
                        onChange={(e) => setEditShippingProvince(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์</label>
                      <input
                        name="shippingPostalCode"
                        value={editShippingPostalCode}
                        onChange={(e) => setEditShippingPostalCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">วิธีการชำระเงิน (Payment Method)</label>
                  <select
                    name="paymentMethod"
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all appearance-none"
                  >
                    <option value="">-- เลือกวิธีการชำระเงิน --</option>
                    <option value="เงินสด">เงินสด (Cash)</option>
                    <option value="โอนเงินผ่านธนาคาร">โอนเงินผ่านธนาคาร (Bank Transfer)</option>
                    <option value="เครดิต 30 วัน">เครดิต 30 วัน (30 Days Credit)</option>
                    <option value="เครดิต 60 วัน">เครดิต 60 วัน (60 Days Credit)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsEditCompanyModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all">ยกเลิก</button>
                <button type="submit" className="flex-2 px-10 py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Contact Modal ───────────────────────────────────────────── */}
      {isEditContactModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                  <Users size={20} />
                </div>
                <h3 className="text-xl font-black text-gray-900">แก้ไขข้อมูลผู้ติดต่อ</h3>
              </div>
              <button onClick={() => setIsEditContactModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form action={async (formData) => {
              const res = await updateContact(editingContact.id, Object.fromEntries(formData));
              if (res.success) {
                setIsEditContactModalOpen(false);
                window.location.reload();
              } else {
                alert(res.message);
              }
            }} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สังกัดบริษัท *</label>
                <select required name="companyId" defaultValue={editingContact.companyId || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none">
                  <option value="">-- เลือกบริษัท --</option>
                  {initialCompanies.map(comp => (
                    <option key={comp.id} value={comp.id}>{comp.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล *</label>
                <input required name="contactName" defaultValue={editingContact.contactName || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ตำแหน่ง (Position)</label>
                <input name="position" defaultValue={editingContact.position || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์</label>
                <input name="mobilePhone" defaultValue={editingContact.mobilePhone || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">อีเมลผู้ติดต่อ (สำหรับออกเอกสาร E-tax)</label>
                <input name="email" type="email" defaultValue={editingContact.email || ''} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red outline-none transition-all" placeholder="name@company.com" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsETaxReceiver"
                  name="isETaxReceiver"
                  value="true"
                  defaultChecked={editingContact.isETaxReceiver || false}
                  className="w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red focus:ring-opacity-25"
                />
                <label htmlFor="editIsETaxReceiver" className="text-xs font-black text-slate-700 select-none">
                  ผู้ติดต่อรายนี้เป็นผู้รับเอกสาร E-Tax (E-Tax Recipient)
                </label>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsEditContactModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all">ยกเลิก</button>
                <button type="submit" className="flex-2 px-10 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all">บันทึกการแก้ไข</button>
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
