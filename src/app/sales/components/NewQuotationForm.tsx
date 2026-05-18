import React, { useState, useEffect } from 'react';
import { Save, X, FileText, MapPin, User } from 'lucide-react';
import { saveSalesData, updateSalesData, searchCompanies, searchContacts, getPostalInfo } from '@/app/actions/sales';
import Card from './Card';
import InputField from './InputField';
import SelectField from './SelectField';

interface NewQuotationFormProps {
  businessTypes?: string[];
  initialData?: any;
  currentUserSale?: any;
  onSuccess?: () => void;
}

export default function NewQuotationForm({ businessTypes = [], initialData, currentUserSale, onSuccess }: NewQuotationFormProps) {
  const [status, setStatus] = useState('');
  const [winLossReason, setWinLossReason] = useState('');
  const [salesBeforeVat, setSalesBeforeVat] = useState(0);
  const [transportationFee, setTransportationFee] = useState(0);
  const [installationFee, setInstallationFee] = useState(0);

  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [postalResults, setPostalResults] = useState<any[]>([]);
  const [showPostalDropdown, setShowPostalDropdown] = useState(false);

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleContactBlur = () => {
    setTimeout(() => setShowContactSuggestions(false), 200);
  };

  // Form states to handle initialData
  const [formData, setFormData] = useState<any>({});

  const generateRequirementNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `REQ-${year}${month}${day}-${randomPart}`;
  };

  const formatDateForInput = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleCompanySearch = async (query: string) => {
    setFormData((prev: any) => ({ ...prev, companyName: query }));
    if (query.length >= 1) {
      const results = await searchCompanies(query);
      setCompanySuggestions(results);
      setShowSuggestions(results.length > 0 || query.length >= 1);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setFormData((prev: any) => ({
      ...prev,
      companyName: company.companyName,
      taxId: company.taxId || '',
      branchOrHeadOffice: company.branchOrHeadOffice || 'สำนักงานใหญ่',
      businessType: company.businessType || '',
      customerType: company.customerType || 'USER',
      customerStatus: company.customerStatus || 'ลูกค้าเก่า', 
      customerAccessChannel: company.customerAccessChannel || 'Website',
      address: company.address || '',
      subDistrict: company.subDistrict || '',
      district: company.district || '',
      province: company.province || '',
      postalCode: company.postalCode || '',
    }));
    setSelectedCompanyId(company.id);
    setShowSuggestions(false);
  };

  const handleContactSearch = async (query: string) => {
    setFormData((prev: any) => ({ ...prev, contactName: query }));
    if (query.length >= 1) {
      const results = await searchContacts(query, selectedCompanyId || undefined);
      setContactSuggestions(results);
      setShowContactSuggestions(results.length > 0 || query.length >= 1);
    } else {
      setContactSuggestions([]);
      setShowContactSuggestions(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    setFormData((prev: any) => ({
      ...prev,
      contactName: contact.contactName,
      position: contact.position || prev.position,
      mobilePhone: contact.mobilePhone || prev.mobilePhone,
      // Auto-fill company if not selected
      ...(!selectedCompanyId && contact.company ? {
        companyName: contact.company.companyName,
        taxId: contact.company.taxId || '',
        branchOrHeadOffice: contact.company.branchOrHeadOffice || 'สำนักงานใหญ่',
        businessType: contact.company.businessType || '',
        customerType: contact.company.customerType || 'USER',
        customerStatus: contact.company.customerStatus || 'ลูกค้าเก่า',
        customerAccessChannel: contact.company.customerAccessChannel || 'Website',
        address: contact.company.address || '',
        subDistrict: contact.company.subDistrict || '',
        district: contact.company.district || '',
        province: contact.company.province || '',
        postalCode: contact.company.postalCode || '',
      } : {})
    }));
    if (contact.company) setSelectedCompanyId(contact.company.id);
    setShowContactSuggestions(false);
  };

  const handlePostalCodeChange = async (postalCode: string) => {
    setFormData((prev: any) => ({ ...prev, postalCode }));
    if (postalCode.length === 5) {
      const results = await getPostalInfo(postalCode);
      if (results && results.length > 0) {
        setPostalResults(results);
        if (results.length === 1) {
          setFormData((prev: any) => ({
            ...prev,
            subDistrict: results[0].subDistrict,
            district: results[0].district,
            province: results[0].province
          }));
          setShowPostalDropdown(false);
        } else {
          // Multiple sub-districts found, show selection
          setShowPostalDropdown(true);
          // Set district/province from first result as they are likely the same
          setFormData((prev: any) => ({
            ...prev,
            district: results[0].district,
            province: results[0].province
          }));
        }
      }
    } else {
      setShowPostalDropdown(false);
    }
  };

  const handleSelectPostalResult = (result: any) => {
    setFormData((prev: any) => ({
      ...prev,
      subDistrict: result.subDistrict,
      district: result.district,
      province: result.province
    }));
    setShowPostalDropdown(false);
  };

  useEffect(() => {
    if (initialData) {
      setStatus(initialData.status || '');
      setWinLossReason(initialData.winLossReason || '');
      setSalesBeforeVat(Number(initialData.salesBeforeVat) || 0);
      setTransportationFee(Number(initialData.transportationFee) || 0);
      setInstallationFee(Number(initialData.installationFee) || 0);
      
      setFormData({
        updatedDate: formatDateForInput(initialData.updatedDate || initialData.createdAt),
        requirementNumber: initialData.requirementNumber || '',
        requirementDate: formatDateForInput(initialData.requirementDate),
        quotationNumber: initialData.quotationNumber || '',
        quotationDate: formatDateForInput(initialData.quotationDate),
        rejectReason: initialData.rejectReason || '',
        actualClosingAmount: initialData.actualClosingAmount || '',
        poDate: formatDateForInput(initialData.poDate),
        billingDate: formatDateForInput(initialData.billingDate),
        invoiceNumber: initialData.invoiceNumber || '',
        winLossReason: initialData.winLossReason || '',
        companyName: initialData.company?.companyName || '',
        taxId: initialData.company?.taxId || '',
        branchOrHeadOffice: initialData.company?.branchOrHeadOffice || 'สำนักงานใหญ่',
        businessType: initialData.company?.businessType || '',
        customerType: initialData.company?.customerType || 'USER',
        customerStatus: initialData.company?.customerStatus || 'ลูกค้าใหม่',
        customerAccessChannel: initialData.company?.customerAccessChannel || 'Website',
        address: initialData.company?.address || '',
        subDistrict: initialData.company?.subDistrict || '',
        district: initialData.company?.district || '',
        province: initialData.company?.province || '',
        postalCode: initialData.company?.postalCode || '',
        contactName: initialData.contact?.contactName || '',
        position: initialData.contact?.position || '',
        mobilePhone: initialData.contact?.mobilePhone || '',
        productInterest: initialData.subject || '',
        productType: initialData.productType || 'อื่นๆ',
        followUp1: formatDateForInput(initialData.followUp1),
        followUp2: formatDateForInput(initialData.followUp2),
        followUp3: formatDateForInput(initialData.followUp3),
        followUp4: formatDateForInput(initialData.followUp4),
        salesBranch: initialData.salesBranch || initialData.salesperson?.employeeSale?.branch || '',
        salesTeamLeader: initialData.salesTeamLeader || initialData.salesperson?.employeeSale?.teamLeader || '',
        remarks: initialData.remarks || '',
      });
      setSelectedCompanyId(initialData.companyId || null);
    } else {
      // Clear form and pre-fill with current user's sale info if available
      setFormData({
        updatedDate: formatDateForInput(new Date()),
        requirementNumber: generateRequirementNumber(),
        salesBranch: currentUserSale?.branch || '',
        salesTeamLeader: currentUserSale?.teamLeader || '',
        branchOrHeadOffice: 'สำนักงานใหญ่',
        customerType: 'USER',
        customerStatus: 'ลูกค้าใหม่',
        customerAccessChannel: 'Website',
        productType: 'อื่นๆ',
      });
      setStatus('');
      setWinLossReason('');
      setSalesBeforeVat(0);
      setTransportationFee(0);
      setInstallationFee(0);
    }
  }, [initialData]);

  const totalBeforeVat = salesBeforeVat + transportationFee + installationFee;
  const vat = totalBeforeVat * 0.07;
  const grandTotal = totalBeforeVat + vat;

  const isLostStatus = status && (status.startsWith('ปฏิเสธ') || status.startsWith('ยกเลิก'));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const form = new FormData(e.currentTarget);
    let res;
    
    if (initialData?.id) {
      res = await updateSalesData(initialData.id, form);
    } else {
      res = await saveSalesData(form);
    }

    if (res.success) {
      setMessage(initialData ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว');
      if (!initialData) {
        (e.target as HTMLFormElement).reset();
        setSalesBeforeVat(0);
        setTransportationFee(0);
        setInstallationFee(0);
        setStatus('');
      }
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } else {
      setMessage(res.error || 'เกิดข้อผิดพลาด');
    }
    setIsSubmitting(false);
  }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
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
              setStatus('');
              setSalesBeforeVat(0);
              setTransportationFee(0);
              setInstallationFee(0);
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
        <div className="space-y-6">
          <Card title="ข้อมูลเอกสาร">
            <div className="space-y-4">
              <InputField name="updatedDate" label="วันที่อัพเดท :" type="date" required value={formData.updatedDate || ''} onChange={handleInputChange} />
              <InputField name="requirementNumber" label="เลขที่ใบความต้องการลูกค้า :" type="text" readOnly value={formData.requirementNumber || ''} />
              <InputField name="requirementDate" label="วันที่เอกสารใบความต้องการ :" type="date" value={formData.requirementDate || ''} onChange={handleInputChange} />
              <div className="flex items-center gap-4">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">สถานะใบเสนอราคา :</label>
                <select
                  name="status"
                  value={status}
                  onChange={e => {
                    const newStatus = e.target.value;
                    setStatus(newStatus);
                    // Auto-fill closing price if won and currently empty
                    if (newStatus === 'เปิดบิลแล้ว' && !formData.actualClosingAmount) {
                      setFormData((prev: any) => ({ ...prev, actualClosingAmount: totalBeforeVat }));
                    }

                    const isNewLostStatus = newStatus && (newStatus.startsWith('ปฏิเสธ') || newStatus.startsWith('ยกเลิก'));
                    if (!isNewLostStatus) {
                      setWinLossReason('');
                      setFormData((prev: any) => ({
                        ...prev,
                        winLossReason: '',
                        rejectReason: ''
                      }));
                    }
                  }}
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white transition-all"
                >
                  <option value="">- เลือกสถานะ -</option>
                  <option>เปิดบิลแล้ว</option>
                  <option>รอจัดทำ PO</option>
                  <option>PO แล้วรอสินค้า</option>
                  <option>PO แล้วรอมัดจำ</option>
                  <option>PO แล้วรอเงินโอน</option>
                  <option>เสนอราคา</option>
                  <option>ปฏิเสธ-ได้ที่อื่นแล้ว</option>
                  <option>ปฏิเสธ-ยกเลิกสินค้า</option>
                  <option>ปฏิเสธ-อื่นๆ</option>
                  <option>รอใบประเมินราคา</option>
                  <option>ยกเลิก-Revise</option>
                </select>
              </div>
              {isLostStatus && (
                <div className="space-y-4 pt-4 pb-4 border-t border-b border-red-100 bg-red-50/20 px-4 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <label className="w-1/3 text-sm font-bold text-red-600 text-right">กลุ่มสาเหตุที่พลาดดีล : <span className="text-red-500">*</span></label>
                    <select
                      name="winLossReason"
                      value={winLossReason}
                      required
                      onChange={e => {
                        setWinLossReason(e.target.value);
                        setFormData((prev: any) => ({ ...prev, winLossReason: e.target.value }));
                      }}
                      className="flex-1 border border-red-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white transition-all font-bold text-gray-700"
                    >
                      <option value="">- เลือกสาเหตุหลัก -</option>
                      <option value="ราคาแพงกว่าคู่แข่ง">ราคาแพงกว่าคู่แข่ง (Price higher than competitors)</option>
                      <option value="ลูกค้าเลื่อนการดำเนินโครงการ">ลูกค้าเลื่อนการดำเนินโครงการ (Customer postponed project)</option>
                      <option value="สเปกสินค้าไม่ตรงตามความต้องการ">สเปกสินค้าไม่ตรงตามความต้องการ (Specifications mismatch)</option>
                      <option value="แพ้ให้คู่แข่ง (โปรดระบุรายละเอียด)">แพ้ให้คู่แข่ง (Lost to competitor)</option>
                      <option value="งบประมาณไม่ได้รับการอนุมัติ">งบประมาณไม่ได้รับการอนุมัติ (Budget not approved)</option>
                      <option value="อื่นๆ (โปรดระบุ)">อื่นๆ (Other)</option>
                    </select>
                  </div>

                  {winLossReason === 'แพ้ให้คู่แข่ง (โปรดระบุรายละเอียด)' && (
                    <div className="flex justify-end pl-[33.33%]">
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 animate-pulse">
                        ⚠️ โปรดระบุชื่อคู่แข่งในช่องรายละเอียดเพิ่มเติมด้านล่างเพื่อเก็บข้อมูลเชิงวิเคราะห์
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <label className="w-1/3 text-sm font-bold text-red-600 text-right mt-2.5">รายละเอียดเพิ่มเติม : <span className="text-red-500">*</span></label>
                    <textarea
                      name="rejectReason"
                      rows={2}
                      required
                      placeholder="ระบุคำอธิบาย หรือรายละเอียดเพิ่มเติม (เช่น ชื่อคู่แข่ง หรือเหตุผลที่ยกเลิก)..."
                      value={formData.rejectReason || ''}
                      onChange={handleInputChange}
                      className="flex-1 border border-red-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white transition-all"
                    />
                  </div>
                </div>
              )}
              <InputField
                name="quotationNumber"
                label="เลขที่ใบเสนอราคา (QUOTATION) :"
                type="text"
                placeholder="กรอกเลขที่ใบเสนอราคา..."
                value={formData.quotationNumber || ''}
                onChange={handleInputChange}
              />
              <InputField name="quotationDate" label="วันที่ออกใบเสนอราคา :" type="date" value={formData.quotationDate || ''} onChange={handleInputChange} />
            </div>
          </Card>

          <Card title="มูลค่า / ราคา">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ยอดขาย (ก่อน VAT) :</label>
                <input type="number" step="0.01" name="salesBeforeVat" value={salesBeforeVat} onChange={e => setSalesBeforeVat(parseFloat(e.target.value) || 0)} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-right font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ค่าขนส่ง :</label>
                <input type="number" step="0.01" name="transportationFee" value={transportationFee} onChange={e => setTransportationFee(parseFloat(e.target.value) || 0)} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-right font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ค่าติดตั้ง :</label>
                <input type="number" step="0.01" name="installationFee" value={installationFee} onChange={e => setInstallationFee(parseFloat(e.target.value) || 0)} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-right font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
              </div>
              <hr className="border-gray-100" />
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 space-y-3">
                <InputField name="totalAmountBeforeVat" label="รวมมูลค่าสินค้าก่อน VAT :" type="number" rightAlign readOnly value={totalBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })} />
                <InputField name="vatAmount" label="VAT 7% :" type="number" rightAlign readOnly value={vat.toLocaleString('th-TH', { minimumFractionDigits: 2 })} />
                <div className="pt-2 border-t border-red-100">
                  <div className="flex items-center gap-4">
                    <label className="w-1/3 text-sm font-bold text-red-700 text-right">รวมมูลค่าสินค้าสุทธิ :</label>
                    <div className="flex-1 bg-red-600 text-white rounded-xl p-3 text-right font-mono text-lg font-bold shadow-sm">
                      {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal opacity-80">บาท</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="การปิดงาน / บิล">
            <div className="space-y-4">
              <InputField name="actualClosingAmount" label="ยอดปิดงานจริง (ก่อน VAT) :" type="number" rightAlign value={formData.actualClosingAmount || ''} onChange={handleInputChange} />
              <InputField name="poDate" label="วันเปิด P/O :" type="date" value={formData.poDate || ''} onChange={handleInputChange} />
              <InputField name="billingDate" label="วันเปิดบิลขาย :" type="date" value={formData.billingDate || ''} onChange={handleInputChange} />
              <InputField name="invoiceNumber" label="หมายเลขใบแจ้งหนี้ :" type="text" value={formData.invoiceNumber || ''} onChange={handleInputChange} />
              {!isLostStatus && (
                <div className="flex items-start gap-4">
                  <label className="w-1/3 text-sm font-medium text-gray-600 text-right mt-2.5">เหตุผล ซื้อ/ไม่ซื้อ :</label>
                  <textarea name="winLossReason" rows={2} value={formData.winLossReason || ''} onChange={handleInputChange} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white transition-all"></textarea>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="ข้อมูลลูกค้า / บริษัท">
            <div className="space-y-8">
              {/* 1. Identity */}
              <div className="space-y-4 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200 group">
                <div className="flex items-center gap-3 text-red-600 mb-2">
                  <div className="p-2 bg-red-50 rounded-xl group-hover:scale-110 transition-transform">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-[0.1em]">ข้อมูลพื้นฐาน</span>
                </div>
                <div className="flex items-center gap-4 relative">
                  <label className="w-1/3 text-sm font-medium text-slate-500 text-right">ชื่อบริษัท : <span className="text-red-500">*</span></label>
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
                      onBlur={handleBlur}
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
                                {company.taxId && <span className="text-slate-300">|</span>}
                                {company.taxId && `เลขผู้เสียภาษี: ${company.taxId}`}
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
                <InputField name="taxId" label="เลขประจำตัวผู้เสียภาษี :" type="text" value={formData.taxId || ''} onChange={handleInputChange} />
              </div>

              {/* 2. Classification */}
              <div className="bg-slate-50/30 p-6 rounded-3xl border border-slate-100/50 space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                  <SelectField name="branchOrHeadOffice" label="สาขา/สำนักงานใหญ่ :" options={['สำนักงานใหญ่', 'สาขา']} value={formData.branchOrHeadOffice} onChange={handleInputChange} />
                  <SelectField name="businessType" label="ประเภทธุรกิจ :" options={businessTypes.length > 0 ? businessTypes : ['โรงงานอุตสาหกรรม', 'รับเหมาก่อสร้าง', 'ขายปลีก', 'อื่นๆ']} value={formData.businessType} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <SelectField name="customerType" label="ประเภทลูกค้า :" options={['USER', 'MAKER', 'TRADING']} value={formData.customerType} onChange={handleInputChange} />
                  <SelectField name="customerStatus" label="สถานะลูกค้า :" options={['ลูกค้าใหม่', 'ลูกค้าเก่า', 'ลูกค้ากลับมา']} value={formData.customerStatus} onChange={handleInputChange} />
                </div>
                <SelectField name="customerAccessChannel" label="ช่องทางรับลูกค้า :" options={['Website', 'Facebook', 'LINE', 'โทรศัพท์', 'Walk-in', 'Telesale']} value={formData.customerAccessChannel} onChange={handleInputChange} />
              </div>

              {/* 3. Address */}
              <div className="space-y-4 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200 group">
                <div className="flex items-center gap-3 text-blue-600 mb-2">
                  <div className="p-2 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                    <MapPin size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-[0.1em]">ที่อยู่จัดส่ง / ติดตั้ง</span>
                </div>
                <div className="flex items-start gap-4">
                  <label className="w-1/3 text-sm font-medium text-slate-500 text-right mt-3.5">รายละเอียดที่อยู่ :</label>
                  <textarea 
                    name="address" 
                    rows={2} 
                    value={formData.address || ''} 
                    onChange={handleInputChange} 
                    className="flex-1 border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]" 
                    placeholder="บ้านเลขที่, ถนน, หมู่บ้าน..."
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="relative">
                    <InputField name="subDistrict" label="ตำบล/แขวง :" type="text" value={formData.subDistrict || ''} onChange={handleInputChange} />
                    {showPostalDropdown && postalResults.length > 1 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เลือกตำบล/แขวง</span>
                        </div>
                        {postalResults.map((result, index) => (
                          <div 
                            key={index} 
                            onClick={() => handleSelectPostalResult(result)}
                            className="p-3 hover:bg-red-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 group"
                          >
                            <div className="text-sm text-slate-700 font-medium group-hover:text-red-600 transition-colors">{result.subDistrict}</div>
                            <div className="text-[10px] text-slate-400">{result.district}, {result.province}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <InputField name="district" label="อำเภอ/เขต :" type="text" value={formData.district || ''} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <InputField name="province" label="จังหวัด :" type="text" value={formData.province || ''} onChange={handleInputChange} />
                  <InputField 
                    name="postalCode" 
                    label="รหัสไปรษณีย์ :" 
                    type="text" 
                    value={formData.postalCode || ''} 
                    onChange={(e) => handlePostalCodeChange(e.target.value)} 
                  />
                </div>
              </div>

              {/* 4. Contact */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4 shadow-sm group">
                <div className="flex items-center gap-3 text-slate-600 mb-2">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 group-hover:scale-110 transition-transform">
                    <User size={20} className="text-slate-500" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-[0.1em]">ผู้ติดต่อหลัก</span>
                </div>
                <div className="flex items-center gap-4 relative">
                  <label className="w-1/3 text-sm font-medium text-slate-500 text-right">ชื่อผู้ติดต่อ :</label>
                  <div className="flex-1 relative">
                    <input 
                      name="contactName"
                      type="text"
                      autoComplete="off"
                      value={formData.contactName || ''}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]"
                      placeholder="พิมพ์ชื่อผู้ติดต่อ..."
                      onBlur={handleContactBlur}
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
                <div className="grid grid-cols-2 gap-6 pl-[33.333%]">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">ตำแหน่ง</label>
                    <input 
                      name="position" 
                      type="text" 
                      value={formData.position || ''} 
                      onChange={handleInputChange} 
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">เบอร์โทรศัพท์</label>
                    <input 
                      name="mobilePhone" 
                      type="tel" 
                      value={formData.mobilePhone || ''} 
                      onChange={handleInputChange} 
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                    />
                  </div>
                </div>
              </div>

              {/* 5. Product Interest */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-start gap-4">
                  <label className="w-1/3 text-sm font-medium text-slate-500 text-right mt-3.5">หัวข้อ/ที่สนใจ :</label>
                  <textarea 
                    name="productInterest" 
                    rows={2} 
                    value={formData.productInterest || ''} 
                    onChange={handleInputChange} 
                    className="flex-1 border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:shadow-sm focus:scale-[1.01]" 
                    placeholder="ระบุสิ่งที่ลูกค้าสนใจ..."
                  ></textarea>
                </div>
                <SelectField name="productType" label="ประเภทสินค้า :" options={['Inverter Veichi', 'Motor', 'Pump', 'Solar Roof', 'อื่นๆ']} value={formData.productType} onChange={handleInputChange} />
              </div>
            </div>
          </Card>

          <Card title="การติดตาม">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField name="followUp1" label="ติดตามครั้งที่ 1 :" type="date" value={formData.followUp1 || ''} onChange={handleInputChange} />
                <InputField name="followUp2" label="ติดตามครั้งที่ 2 :" type="date" value={formData.followUp2 || ''} onChange={handleInputChange} />
                <InputField name="followUp3" label="ติดตามครั้งที่ 3 :" type="date" value={formData.followUp3 || ''} onChange={handleInputChange} />
                <InputField name="followUp4" label="ติดตามครั้งที่ 4 :" type="date" value={formData.followUp4 || ''} onChange={handleInputChange} />
              </div>
            </div>
          </Card>

          <Card title="ข้อมูลเพิ่มเติม">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField name="salesBranch" label="สาขาของเซลล์ :" type="text" readOnly value={formData.salesBranch || ''} />
                <InputField name="salesTeamLeader" label="หัวหน้าทีม :" type="text" readOnly value={formData.salesTeamLeader || ''} />
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">หมายเหตุ :</label>
                <textarea name="remarks" rows={3} value={formData.remarks || ''} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white transition-all" placeholder="เพิ่มหมายเหตุ..."></textarea>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
