import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { saveTelesaleData, updateTelesaleData } from '@/app/actions/telesales';
import { searchCompanies, searchContacts, searchCompetitors } from '@/app/actions/sales';
import { getSalesEmployees } from '@/app/actions/user';
import Card from '@/app/sales/components/Card';
import InputField from '@/app/sales/components/InputField';
import SelectField from '@/app/sales/components/SelectField';
import { MapPin } from 'lucide-react';

interface NewTelesaleFormProps {
  userFullName?: string;
  branch?: string;
  initialData?: any;
  onSuccess?: () => void;
}

export default function NewTelesaleForm({ userFullName, branch = 'สำนักงานใหญ่', initialData, onSuccess }: NewTelesaleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [competitorSuggestions, setCompetitorSuggestions] = useState<any[]>([]);
  const [showCompetitorSuggestions, setShowCompetitorSuggestions] = useState(false);

  const formatDateForInput = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  };

  const formatDateTimeForInput = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
    return `${dateStr}T${timeStr}`;
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        callDate: formatDateForInput(initialData.callDate),
        callStatus: initialData.callStatus || '',
        callOutcome: initialData.callOutcome || '',
        companyName: initialData.company?.companyName || '',
        contactPerson: initialData.contactPerson || '',
        phoneNumber: initialData.phoneNumber || '',
        customerType: initialData.company?.customerType || 'USER',
        customerStatus: initialData.company?.customerStatus || 'ลูกค้าใหม่',
        forwardTo: initialData.forwardTo || '',
        conversationSummary: initialData.conversationSummary || '',
        needsOrProblems: initialData.needsOrProblems || '',
        meetingObjective: initialData.meetingObjective || '',
        competitorName: initialData.competitorName || '',
        competitorPrice: initialData.competitorPrice || '',
        competitorPromotion: initialData.competitorPromotion || '',
        callbackAt: formatDateTimeForInput(initialData.callbackAt),
        visitDate: formatDateTimeForInput(initialData.visitDate),
      });
      setSelectedCompanyId(initialData.companyId || null);
    } else {
      setFormData({});
      setSelectedCompanyId(null);
    }
  }, [initialData]);

  useEffect(() => {
    async function loadEmployees() {
      const data = await getSalesEmployees();
      setEmployees(data);
    }
    loadEmployees();
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const standardObjectives = ['นำเสนอสินค้า', 'ตรวจสอบหน้างาน', 'ส่งมอบสินค้า', 'ติดตามงาน'];

  const getObjectiveValues = () => {
    const val = formData.meetingObjective || '';
    if (!val) return { selectVal: '', detailVal: '' };
    if (standardObjectives.includes(val)) return { selectVal: val, detailVal: '' };

    // Check if it matches "อื่นๆ (detail)"
    const match = val.match(/^อื่นๆ \((.*)\)$/);
    if (match) {
      return { selectVal: 'อื่นๆ', detailVal: match[1] };
    }
    if (val === 'อื่นๆ') {
      return { selectVal: 'อื่นๆ', detailVal: '' };
    }
    return { selectVal: 'อื่นๆ', detailVal: val };
  };

  const { selectVal, detailVal } = getObjectiveValues();

  const handleObjectiveSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'อื่นๆ') {
      setFormData((prev: any) => ({
        ...prev,
        meetingObjective: detailVal ? `อื่นๆ (${detailVal})` : 'อื่นๆ'
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        meetingObjective: val
      }));
    }
  };

  const handleObjectiveDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev: any) => ({
      ...prev,
      meetingObjective: val ? `อื่นๆ (${val})` : 'อื่นๆ'
    }));
  };

  const handleCompanySearch = async (query: string) => {
    setFormData((prev: any) => ({ ...prev, companyName: query }));
    if (query.length >= 2) {
      const results = await searchCompanies(query);
      setCompanySuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setFormData((prev: any) => ({
      ...prev,
      companyName: company.companyName,
      customerType: company.customerType || 'USER',
      customerStatus: company.customerStatus || 'ลูกค้าเก่า',
    }));
    setSelectedCompanyId(company.id);
    setShowSuggestions(false);
  };

  const handleContactSearch = async (query: string) => {
    setFormData((prev: any) => ({ ...prev, contactPerson: query }));
    if (query.length >= 1) {
      const results = await searchContacts(query, selectedCompanyId || undefined);
      setContactSuggestions(results);
      setShowContactSuggestions(results.length > 0);
    } else {
      setContactSuggestions([]);
      setShowContactSuggestions(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    setFormData((prev: any) => ({
      ...prev,
      contactPerson: contact.contactName,
      phoneNumber: contact.mobilePhone || prev.phoneNumber,
      // If contact has a company and we don't have one selected, fill it
      ...(!selectedCompanyId && contact.company ? {
        companyName: contact.company.companyName,
        customerType: contact.company.customerType || 'USER',
        customerStatus: contact.company.customerStatus || 'ลูกค้าเก่า',
      } : {})
    }));
    if (contact.company) setSelectedCompanyId(contact.company.id);
    setShowContactSuggestions(false);
  };

  const handleCompetitorSearch = async (query: string) => {
    setFormData((prev: any) => ({ ...prev, competitorName: query }));
    if (query.length >= 1) {
      const results = await searchCompetitors(query);
      setCompetitorSuggestions(results);
      setShowCompetitorSuggestions(results.length > 0);
    } else {
      setCompetitorSuggestions([]);
      setShowCompetitorSuggestions(false);
    }
  };

  const handleCompetitorSelect = (competitor: any) => {
    setFormData((prev: any) => ({
      ...prev,
      competitorName: competitor.name,
      competitorPrice: competitor.price || prev.competitorPrice,
      competitorPromotion: competitor.promotion || prev.competitorPromotion,
    }));
    setShowCompetitorSuggestions(false);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const form = new FormData(e.currentTarget);
    let res;
    
    if (initialData?.id) {
      res = await updateTelesaleData(initialData.id, form);
    } else {
      res = await saveTelesaleData(form);
    }
    
    if (res.success) {
      setMessage(initialData ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว');
      if (!initialData) {
        (e.target as HTMLFormElement).reset();
        setFormData({});
      }
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } else {
      setMessage(res.error || 'เกิดข้อผิดพลาด');
    }
    setIsSubmitting(false);
  }

  const renderDateTimeField = (name: string, label: string) => {
    const dt = formData[name] || '';
    const datePart = dt ? dt.split('T')[0] : '';
    const timePart = dt ? dt.split('T')[1] : '';
    const h = timePart ? timePart.split(':')[0] : '09';
    const m = timePart ? timePart.split(':')[1] : '00';

    return (
      <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 w-full">
        <label className="w-full md:w-1/3 text-left md:text-right text-xs md:text-sm font-semibold md:font-medium text-slate-500 md:text-gray-600 ml-1 md:ml-0 shrink-0">
          {label}
        </label>
        <div className="flex-1 flex items-center gap-1.5 w-full min-w-0">
          <input 
            type="date" 
            value={datePart}
            onChange={(e) => {
              const newDate = e.target.value;
              if (!newDate) {
                setFormData((prev: any) => ({ ...prev, [name]: '' }));
              } else {
                setFormData((prev: any) => ({ ...prev, [name]: `${newDate}T${h}:${m}` }));
              }
            }}
            className="w-1/2 border border-slate-200 rounded-xl p-2.5 text-sm outline-none bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 min-w-0"
          />
          <div className="w-1/2 flex items-center gap-1 min-w-0">
            <select 
              value={dt ? h : ''}
              onChange={(e) => {
                const newH = e.target.value;
                setFormData((prev: any) => ({ ...prev, [name]: `${datePart || formatDateForInput(new Date())}T${newH}:${m}` }));
              }}
              className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm outline-none bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 text-center px-1 min-w-0"
            >
              <option value="" disabled>ชม.</option>
              {Array.from({length: 24}).map((_, i) => {
                const val = i.toString().padStart(2, '0');
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
            <span className="self-center font-bold text-gray-400">:</span>
            <select 
              value={dt ? m : ''}
              onChange={(e) => {
                const newM = e.target.value;
                setFormData((prev: any) => ({ ...prev, [name]: `${datePart || formatDateForInput(new Date())}T${h}:${newM}` }));
              }}
              className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm outline-none bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 text-center px-1 min-w-0"
            >
              <option value="" disabled>นาที</option>
              {Array.from({length: 60}).map((_, i) => {
                const val = i.toString().padStart(2, '0');
                return <option key={val} value={val}>{val}</option>;
              })}
            </select>
          </div>
          <input type="hidden" name={name} value={dt} />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Action Bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-red hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          <Save size={18} />
          {isSubmitting ? 'กำลังบันทึก...' : (initialData ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูล')}
        </button>
        <button 
          type="button" 
          onClick={() => {
            if (initialData) onSuccess?.();
            else {
              setFormData({});
              setMessage('');
            }
          }}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <X size={18} />
          {initialData ? 'ยกเลิก' : 'ล้างข้อมูล'}
        </button>
        {message && (
          <div className="text-sm font-bold px-4 py-2.5 rounded-xl bg-green-50 text-green-700 border border-green-100 ml-auto animate-in fade-in slide-in-from-right-4">
            {message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card title="ข้อมูลการโทร">
            <div className="space-y-4">
              <InputField name="callDate" label="วันที่โทร :" type="date" required value={formData.callDate || ''} onChange={handleInputChange} />
              <SelectField name="callStatus" label="การรับสาย :" options={['รับสาย', 'ไม่รับสาย', 'สายไม่ว่าง', 'ฝากข้อความ']} value={formData.callStatus} onChange={handleInputChange} />
              <SelectField name="callOutcome" label="ผลลัพธ์ (Outcome) :" options={['สนใจ', 'ไม่สนใจ', 'ขอข้อมูลเพิ่มเติม', 'นัดหมายสำเร็จ', 'ติดตามภายหลัง']} value={formData.callOutcome} onChange={handleInputChange} />
            </div>
          </Card>

          <Card title="สรุปและนัดหมาย">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right mt-2.5">เนื้อหาที่พูดคุย :</label>
                <textarea 
                  name="conversationSummary" 
                  rows={3} 
                  value={formData.conversationSummary || ''} 
                  onChange={handleInputChange} 
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white transition-all"
                  placeholder="สรุปรายละเอียดการพูดคุย..."
                ></textarea>
              </div>
              <div className="flex items-start gap-4">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right mt-2.5">สิ่งที่ลูกค้าต้องการ :</label>
                <textarea 
                  name="needsOrProblems" 
                  rows={3} 
                  value={formData.needsOrProblems || ''} 
                  onChange={handleInputChange} 
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white transition-all"
                  placeholder="ระบุสิ่งที่ลูกค้าต้องการ / ปัญหา..."
                ></textarea>
              </div>
              {renderDateTimeField('callbackAt', 'นัดโทรกลับ :')}
              <SelectField 
                name="meetingObjectiveSelect" 
                label="วัตถุประสงค์เข้าพบ :" 
                options={['นำเสนอสินค้า', 'ตรวจสอบหน้างาน', 'ส่งมอบสินค้า', 'ติดตามงาน', 'อื่นๆ']} 
                value={selectVal} 
                onChange={handleObjectiveSelectChange} 
              />
              {selectVal === 'อื่นๆ' && (
                <InputField 
                  name="meetingObjectiveDetail" 
                  label="ระบุวัตถุประสงค์อื่นๆ :" 
                  type="text" 
                  placeholder="กรอกวัตถุประสงค์เข้าพบ..." 
                  value={detailVal} 
                  onChange={handleObjectiveDetailChange} 
                  required
                />
              )}
              <input type="hidden" name="meetingObjective" value={formData.meetingObjective || ''} />
              {renderDateTimeField('visitDate', 'วันนัดเข้าพบ (Visit Date) :')}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card title="ข้อมูลลูกค้า / บริษัท">
            <div className="space-y-4">
              <div className="flex items-center gap-4 relative">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ชื่อบริษัท / บุคคล : <span className="text-red-500">*</span></label>
                <div className="flex-1 relative">
                  <input 
                    name="companyName"
                    type="text"
                    required
                    autoComplete="off"
                    value={formData.companyName || ''}
                    onChange={(e) => handleCompanySearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]"
                    placeholder="พิมพ์ชื่อบริษัทเพื่อค้นหา..."
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                      {companySuggestions.length > 0 ? (
                        companySuggestions.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleCompanySelect(company)}
                            className="w-full text-left px-5 py-4 text-sm hover:bg-red-50 transition-colors flex flex-col gap-1 border-b border-slate-50 last:border-0"
                          >
                            <span className="font-bold text-slate-900">{company.companyName}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-2">
                              <MapPin size={12} /> {company.province || 'ไม่ระบุจังหวัด'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-5 py-8 text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ไม่พบข้อมูลบริษัท</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 relative">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ผู้ติดต่อ :</label>
                <div className="flex-1 relative">
                  <input 
                    name="contactPerson"
                    type="text"
                    autoComplete="off"
                    value={formData.contactPerson || ''}
                    onChange={(e) => handleContactSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]"
                    placeholder="พิมพ์ชื่อผู้ติดต่อ..."
                    onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
                  />
                  {showContactSuggestions && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                      {contactSuggestions.length > 0 ? (
                        contactSuggestions.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => handleContactSelect(contact)}
                            className="w-full text-left px-5 py-4 text-sm hover:bg-red-50 transition-colors flex flex-col gap-1 border-b border-slate-50 last:border-0"
                          >
                            <span className="font-bold text-slate-900">{contact.contactName}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-2">
                              {contact.company?.companyName || 'ไม่ระบุบริษัท'} {contact.mobilePhone && `| ${contact.mobilePhone}`}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-5 py-8 text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ไม่พบข้อมูลผู้ติดต่อ</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <InputField name="phoneNumber" label="เบอร์โทรศัพท์ :" type="tel" placeholder="0xx-xxx-xxxx" value={formData.phoneNumber || ''} onChange={handleInputChange} />
              <hr className="border-gray-100" />
              <SelectField name="customerType" label="ประเภทลูกค้า :" options={['USER', 'MAKER', 'TRADING', 'อื่นๆ']} value={formData.customerType} onChange={handleInputChange} />
              <SelectField name="customerStatus" label="สถานะลูกค้า :" options={['ลูกค้าใหม่', 'ลูกค้าเก่า', 'ลูกค้าเป้าหมาย']} value={formData.customerStatus} onChange={handleInputChange} />
              <SelectField 
                name="forwardTo" 
                label="งานส่งต่อให้ :" 
                options={employees.map(e => e.fullName)} 
                value={formData.forwardTo} 
                onChange={handleInputChange} 
              />
            </div>
          </Card>

          <Card title="ข้อมูลคู่แข่ง">
            <div className="space-y-4">
              <div className="flex items-center gap-4 relative">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ชื่อคู่แข่ง :</label>
                <div className="flex-1 relative">
                  <input 
                    name="competitorName"
                    type="text"
                    autoComplete="off"
                    value={formData.competitorName || ''}
                    onChange={(e) => handleCompetitorSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]"
                    placeholder="พิมพ์ชื่อคู่แข่ง..."
                    onBlur={() => setTimeout(() => setShowCompetitorSuggestions(false), 200)}
                  />
                  {showCompetitorSuggestions && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                      {competitorSuggestions.length > 0 ? (
                        competitorSuggestions.map((competitor) => (
                          <button
                            key={competitor.id}
                            type="button"
                            onClick={() => handleCompetitorSelect(competitor)}
                            className="w-full text-left px-5 py-4 text-sm hover:bg-red-50 transition-colors flex flex-col gap-1 border-b border-slate-50 last:border-0"
                          >
                            <span className="font-bold text-slate-900">{competitor.name}</span>
                            <span className="text-xs text-gray-400">
                              {competitor.price ? `ราคามาตรฐาน: ${competitor.price.toLocaleString()} บาท` : 'ไม่ระบุราคา'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-5 py-8 text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ไม่พบข้อมูลคู่แข่ง</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <InputField name="competitorPrice" label="ราคาคู่แข่ง (บาท) :" type="number" value={formData.competitorPrice || ''} onChange={handleInputChange} />
              <InputField name="competitorPromotion" label="โปรโมชั่นคู่แข่ง :" type="text" value={formData.competitorPromotion || ''} onChange={handleInputChange} />
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
