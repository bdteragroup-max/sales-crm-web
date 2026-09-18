"use client";

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  FileText, 
  MapPin, 
  User, 
  AlertTriangle, 
  ClipboardCheck, 
  Loader2, 
  Trash2, 
  Building2, 
  TrendingUp, 
  Clock, 
  Paperclip,
  CheckCircle2,
  Calendar,
  Package
} from 'lucide-react';
import { saveSalesData, updateSalesData, searchCompanies, searchContacts, getPostalInfo } from '@/app/actions/sales';
import Card from './Card';
import InputField from './InputField';
import SelectField from './SelectField';
import { LoadingButton } from '@/app/components/LoadingButton';
import { extractCompanyCode } from '@/utils/company-utils';
import { JOB_TYPES } from '@/constants/job-types';
import { createClient } from '@/utils/supabase/client';
import CabinetDocumentSection from './CabinetDocumentSection';
import { calculateQuotationExpiration } from '@/utils/quotation-expiration';

interface NewQuotationFormProps {
  businessTypes?: string[];
  initialData?: any;
  currentUserSale?: any;
  onSuccess?: () => void;
}

export default function NewQuotationForm({ businessTypes = [], initialData, currentUserSale, onSuccess }: NewQuotationFormProps) {
  const isEditing = initialData && !!initialData.id;
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

  const [isUploading, setIsUploading] = useState(false);
  const [creditDocsUrl, setCreditDocsUrl] = useState('');

  const [isUploadingBilling, setIsUploadingBilling] = useState(false);
  const [billingDocsUrl, setBillingDocsUrl] = useState('');

  const [boqFiles, setBoqFiles] = useState<{ url: string; name: string; size: number }[]>([]);
  const [quotationFiles, setQuotationFiles] = useState<{ url: string; name: string; size: number }[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<{ url: string; name: string; size: number }[]>([]);
  const [customerDocFiles, setCustomerDocFiles] = useState<{ url: string; name: string; size: number }[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState<{ [key: string]: boolean }>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const supabase = createClient();
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `credit-docs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploadsService')
        .getPublicUrl(filePath);

      setCreditDocsUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBillingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBilling(true);
    const supabase = createClient();
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `billing-docs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploadsService')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploadsService')
        .getPublicUrl(filePath);

      setBillingDocsUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setIsUploadingBilling(false);
    }
  };

  const handleJobDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingDocs(prev => ({ ...prev, [type]: true }));
    const supabase = createClient();
    try {
      const uploadedDocs: { url: string; name: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `job-documents-temp/${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploadsService')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('uploadsService')
          .getPublicUrl(filePath);

        uploadedDocs.push({ url: publicUrl, name: file.name, size: file.size });
      }

      if (type === 'BOQ') setBoqFiles(prev => [...prev, ...uploadedDocs]);
      if (type === 'QUOTATION') setQuotationFiles(prev => [...prev, ...uploadedDocs]);
      if (type === 'PAYMENT') setPaymentFiles(prev => [...prev, ...uploadedDocs]);
      if (type === 'CUSTOMER_DOC') setCustomerDocFiles(prev => [...prev, ...uploadedDocs]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setIsUploadingDocs(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDeleteJobDoc = (type: string, urlToRemove: string) => {
    if (type === 'BOQ') setBoqFiles(prev => prev.filter(f => f.url !== urlToRemove));
    if (type === 'QUOTATION') setQuotationFiles(prev => prev.filter(f => f.url !== urlToRemove));
    if (type === 'PAYMENT') setPaymentFiles(prev => prev.filter(f => f.url !== urlToRemove));
    if (type === 'CUSTOMER_DOC') setCustomerDocFiles(prev => prev.filter(f => f.url !== urlToRemove));
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleContactBlur = () => {
    setTimeout(() => setShowContactSuggestions(false), 200);
  };

  const [formData, setFormData] = useState<any>({
    installments: [
      { installmentNo: 1, amount: '', dueDate: new Date().toISOString().slice(0, 10) },
      { installmentNo: 2, amount: '', dueDate: '' },
      { installmentNo: 3, amount: '', dueDate: '' }
    ],
    installmentCount: 3
  });

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
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
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
      const results = await searchContacts(query);
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
          setShowPostalDropdown(true);
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

      if (initialData.isPrefilled) {
        setFormData({
          updatedDate: formatDateForInput(new Date()),
          requirementNumber: initialData.requirementNumber || generateRequirementNumber(),
          requirementDate: initialData.requirementDate ? formatDateForInput(initialData.requirementDate) : formatDateForInput(new Date()),
          quotationNumber: '',
          quotationDate: '',
          rejectReason: '',
          actualClosingAmount: '',
          poDate: '',
          poNumber: '',
          billingDate: '',
          invoiceNumber: '',
          winLossReason: '',
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
          productInterest: initialData.productInterest || '',
          productType: initialData.productType || 'Other',
          followUp1: '',
          followUp2: '',
          followUp3: '',
          followUp4: '',
          workName: initialData.productInterest || '',
          salesBranch: currentUserSale?.branch || '',
          salesTeamLeader: currentUserSale?.teamLeader || '',
          remarks: initialData.remarks || '',
          salesOrderDate: formatDateForInput(new Date()),
          paymentDate: '',
        });
        setCreditDocsUrl('');
      } else {
        const d = initialData.billingDate || initialData.poDate || initialData.quotationDate || initialData.updatedAt || new Date();
        setFormData({
          updatedDate: formatDateForInput(d),
          requirementNumber: initialData.requirementNumber || '',
          requirementDate: formatDateForInput(initialData.requirementDate),
          quotationNumber: initialData.quotationNumber || '',
          quotationDate: formatDateForInput(initialData.quotationDate),
          rejectReason: initialData.rejectReason || '',
          actualClosingAmount: initialData.actualClosingAmount || '',
          poDate: formatDateForInput(initialData.poDate),
          poNumber: initialData.poNumber || '',
          billingDate: formatDateForInput(initialData.billingDate),
          invoiceNumber: initialData.invoiceNumber || '',
          winLossReason: initialData.winLossReason || '',
          companyName: initialData.company?.companyName || '',
          taxId: initialData.company?.taxId || '',
          branchOrHeadOffice: initialData.company?.branchOrHeadOffice || 'สำนักงานใหญ่',
          businessType: initialData.company?.businessType || '',
          customerType: initialData.company?.customerType || 'USER',
          customerStatus: initialData.company?.customerStatus || 'ลูกค้าเก่า',
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
          productType: initialData.productType || 'Other',
          followUp1: formatDateForInput(initialData.followUp1),
          followUp2: formatDateForInput(initialData.followUp2),
          followUp3: formatDateForInput(initialData.followUp3),
          followUp4: formatDateForInput(initialData.followUp4),
          workName: initialData.jobs?.[0]?.item || initialData.subject || initialData.productType || '',
          salesBranch: initialData.salesBranch || initialData.salesperson?.employeeSale?.branch || '',
          salesTeamLeader: initialData.salesTeamLeader || initialData.salesperson?.employeeSale?.teamLeader || '',
          remarks: initialData.remarks || '',
          jobType: initialData.jobs?.[0]?.jobType || '',
          paymentMethod: initialData.jobs?.[0]?.paymentMethod?.startsWith('เครดิต') ? 'เครดิต' : (initialData.jobs?.[0]?.paymentMethod || 'เครดิต'),
          installmentCount: initialData.jobs?.[0]?.paymentTasks?.length || 3,
          installments: initialData.jobs?.[0]?.paymentTasks?.length > 0 ? initialData.jobs[0].paymentTasks : [
            { installmentNo: 1, amount: '', dueDate: formatDateForInput(new Date()) },
            { installmentNo: 2, amount: '', dueDate: '' },
            { installmentNo: 3, amount: '', dueDate: '' }
          ],
          salesOrderDate: initialData.jobs?.[0]?.salesOrderDate ? formatDateForInput(initialData.jobs[0].salesOrderDate) : formatDateForInput(new Date()),
          paymentDate: initialData.jobs?.[0]?.paymentDate ? formatDateForInput(initialData.jobs[0].paymentDate) : '',
          deliveryDate: initialData.jobs?.[0]?.deliveryDate ? formatDateForInput(initialData.jobs[0].deliveryDate) : '',
          creditTerms: initialData.jobs?.[0]?.creditTerms || '',
          billingRegulations: initialData.jobs?.[0]?.billingRegulations || '',
          percentageTerms: initialData.jobs?.[0]?.percentageTerms || '',
          companyCode: initialData.jobs?.[0]?.companyCode || extractCompanyCode(initialData.quotationNumber || ''),
        });
        setCreditDocsUrl(initialData.jobs?.[0]?.creditDocsUrl || '');
        setBillingDocsUrl(initialData.jobs?.[0]?.billingDocsUrl || '');
      }
      setSelectedCompanyId(initialData.companyId || null);
    } else {
      setFormData({
        updatedDate: formatDateForInput(new Date()),
        requirementNumber: generateRequirementNumber(),
        salesBranch: currentUserSale?.branch || '',
        salesTeamLeader: currentUserSale?.teamLeader || '',
        branchOrHeadOffice: 'สำนักงานใหญ่',
        customerType: 'USER',
        customerStatus: 'ลูกค้าใหม่',
        customerAccessChannel: 'Website',
        productType: 'Other',
        companyCode: 'TP',
      });
      setStatus('');
      setWinLossReason('');
      setSalesBeforeVat(0);
      setTransportationFee(0);
      setInstallationFee(0);
      setCreditDocsUrl('');
      setBillingDocsUrl('');
    }
  }, [initialData]);

  const totalBeforeVat = salesBeforeVat + transportationFee + installationFee;
  const vat = totalBeforeVat * 0.07;
  const grandTotal = totalBeforeVat + vat;

  const expirationInfo = calculateQuotationExpiration({
    quotationDate: formData.quotationDate,
    createdAt: initialData?.createdAt,
    productType: formData.productType,
    followUp1: formData.followUp1,
    followUp2: formData.followUp2,
    followUp3: formData.followUp3,
    followUp4: formData.followUp4,
    status,
  });

  const isLostStatus = status && (status.startsWith('ปฏิเสธ') || status.startsWith('ยกเลิก'));

  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinModalData, setCoinModalData] = useState({ gold: 0, message: '' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const formDataObj = new FormData(e.currentTarget);
    if (creditDocsUrl) {
      formDataObj.append('creditDocsUrl', creditDocsUrl);
    }
    if (billingDocsUrl) {
      formDataObj.append('billingDocsUrl', billingDocsUrl);
    }

    const isCabinetSelected = formData.jobType === "งานตู้" || formData.jobType === "งานตู้ + ติดตั้ง" || formData.jobType === "Cabinet Job" || formData.jobType === "Cabinet Job + Installation";
    const cabinetJob = initialData?.jobs?.find((j: any) => j.jobType === "งานตู้" || j.jobType === "งานตู้ + ติดตั้ง" || j.jobType === "Cabinet Job" || j.jobType === "Cabinet Job + Installation");
    const isPOStatus = status?.startsWith("PO") || status === "Invoice Opened" || status === "เปิดบิลแล้ว";

    if (isCabinetSelected && isPOStatus && !cabinetJob) {
      const jobDocuments = [
        ...boqFiles.map(f => ({ type: 'BOQ', fileUrl: f.url, fileName: f.name, fileSize: f.size })),
        ...quotationFiles.map(f => ({ type: 'QUOTATION', fileUrl: f.url, fileName: f.name, fileSize: f.size })),
        ...paymentFiles.map(f => ({ type: 'PAYMENT', fileUrl: f.url, fileName: f.name, fileSize: f.size })),
        ...customerDocFiles.map(f => ({ type: 'CUSTOMER_DOC', fileUrl: f.url, fileName: f.name, fileSize: f.size }))
      ];
      formDataObj.append('jobDocuments', JSON.stringify(jobDocuments));
    }

    let res;
    if (isEditing) {
      formDataObj.append('id', initialData.id);
      res = await updateSalesData(initialData.id, formDataObj);
    } else {
      res = await saveSalesData(formDataObj);
    }

    if (res.success) {
      setMessage(isEditing ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว');
      if (!isEditing) {
        (e.target as HTMLFormElement).reset();
        setSalesBeforeVat(0);
        setTransportationFee(0);
        setInstallationFee(0);
        setStatus('');
      }

      if (res.awardedGold && res.awardedGold > 0) {
        setCoinModalData({ gold: res.awardedGold, message: res.awardMessage || '' });
        setShowCoinModal(true);
      } else if (onSuccess) {
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
    <>
      {showCoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl scale-in-center border border-slate-200">
            <div className="text-6xl mb-4">🪙</div>
            <h2 className="text-2xl font-black text-amber-600 mb-2">ยินดีด้วย! คุณได้รับเหรียญทอง</h2>
            <p className="text-slate-600 mb-6 font-medium text-sm">{coinModalData.message}</p>
            <button
              type="button"
              onClick={() => {
                setShowCoinModal(false);
                if (onSuccess) onSuccess();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl w-full shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="creditDocsUrl" value={creditDocsUrl} />

        {/* ── Symmetrical Command Header & Action Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center shrink-0">
              <FileText size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  {isEditing ? 'กำลังแก้ไขใบเสนอราคา' : 'สร้างใบเสนอราคาใหม่'}
                </span>
                {formData.quotationNumber && (
                  <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">
                    {formData.quotationNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">กรอกข้อมูลให้ครบถ้วนเพื่อความสมบูรณ์ของเอกสารและกระบวนการขาย</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (isEditing) onSuccess?.();
                else {
                  setFormData({});
                  setStatus('');
                  setSalesBeforeVat(0);
                  setTransportationFee(0);
                  setInstallationFee(0);
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <X size={15} />
              <span>{isEditing ? 'ยกเลิก' : 'ล้างข้อมูล'}</span>
            </button>

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-red-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {!isSubmitting && <Save size={16} strokeWidth={2.5} />}
              <span>{isEditing ? 'ยืนยันบันทึกการแก้ไข' : 'บันทึกใบเสนอราคา'}</span>
            </LoadingButton>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            message.includes('เรียบร้อย')
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <CheckCircle2 size={16} className={message.includes('เรียบร้อย') ? 'text-emerald-600' : 'text-red-600'} />
            <span>{message}</span>
          </div>
        )}

        {/* ── Symmetrical Dual-Column Primary Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ========================================================================= */}
          {/* LEFT COLUMN: 🏢 ข้อมูลลูกค้าและผู้ติดต่อ (Customer & Contact Relations)      */}
          {/* ========================================================================= */}
          <div className="space-y-6">

            {/* 1. ข้อมูลบริษัทลูกค้าและสถานที่ */}
            <Card title="ข้อมูลบริษัทลูกค้าและที่อยู่" icon={<Building2 size={18} />}>
              <div className="space-y-4">
                {/* Company Search / Name Input */}
                <div className="relative w-full">
                  <label className="text-xs font-bold text-slate-700 ml-0.5 block mb-1.5">
                    ชื่อบริษัท : <span className="text-red-600">*</span>
                  </label>
                  <div className="relative w-full">
                    <input
                      name="companyName"
                      type="text"
                      required
                      autoComplete="off"
                      value={formData.companyName || ''}
                      onChange={(e) => handleCompanySearch(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 bg-white font-medium outline-none transition-all hover:border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-500/15"
                      placeholder="พิมพ์ชื่อบริษัทเพื่อค้นหา หรือพิมพ์เพื่อสร้างใหม่..."
                      onBlur={handleBlur}
                    />
                    {showSuggestions && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {companySuggestions.length > 0 ? (
                          companySuggestions.map((company) => (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => handleCompanySelect(company)}
                              className="w-full text-left px-4 py-3 text-xs hover:bg-red-50 transition-colors flex flex-col gap-0.5 border-b border-slate-100 last:border-0"
                            >
                              <span className="font-bold text-slate-900">{company.companyName}</span>
                              <span className="text-[11px] text-slate-500 flex items-center gap-2">
                                <MapPin size={11} className="text-slate-400" /> {company.province || 'ไม่ระบุจังหวัด'}
                                {company.taxId && <span className="text-slate-300">|</span>}
                                {company.taxId && `Tax: ${company.taxId}`}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-5 text-center">
                            <p className="text-xs font-bold text-slate-400">ไม่พบข้อมูลบริษัทเดิมในระบบ (จะสร้างรายการใหม่)</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField 
                    name="branchOrHeadOffice" 
                    label="สาขา/สำนักงานใหญ่ :" 
                    options={['สำนักงานใหญ่', 'สาขา']} 
                    value={formData.branchOrHeadOffice} 
                    onChange={handleInputChange} 
                  />
                  <InputField 
                    name="taxId" 
                    label="เลขประจำตัวผู้เสียภาษี :" 
                    type="text" 
                    placeholder="เลขประจำตัว 13 หลัก"
                    value={formData.taxId || ''} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField 
                    name="businessType" 
                    label="ประเภทธุรกิจ :" 
                    options={businessTypes.length > 0 ? businessTypes : ['โรงงานอุตสาหกรรม', 'รับเหมาก่อสร้าง', 'ขายปลีก', 'อื่นๆ']} 
                    value={formData.businessType} 
                    onChange={handleInputChange} 
                  />
                  <SelectField 
                    name="customerType" 
                    label="ประเภทลูกค้า :" 
                    options={['USER', 'MAKER', 'TRADING']} 
                    value={formData.customerType} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField 
                    name="customerStatus" 
                    label="สถานะลูกค้า :" 
                    options={['ลูกค้าใหม่', 'ลูกค้าเก่า', 'ลูกค้ากลับมา']} 
                    value={formData.customerStatus} 
                    onChange={handleInputChange} 
                  />
                  <SelectField 
                    name="customerAccessChannel" 
                    label="ช่องทางรับลูกค้า :" 
                    options={['Website', 'Facebook', 'LINE', 'โทรศัพท์', 'Walk-in', 'Telesale', 'Shopee', 'Lazada', 'TikTok', 'Google', 'Booth', 'YouTube']} 
                    value={formData.customerAccessChannel} 
                    onChange={handleInputChange} 
                  />
                </div>

                {/* Complete Address */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-slate-700 ml-0.5">
                      รายละเอียดที่อยู่ :
                    </label>
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 bg-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 resize-none"
                      placeholder="บ้านเลขที่, อาคาร, ถนน, ซอย..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <InputField 
                        name="subDistrict" 
                        label="ตำบล/แขวง :" 
                        type="text" 
                        value={formData.subDistrict || ''} 
                        onChange={handleInputChange} 
                      />
                      {showPostalDropdown && postalResults.length > 1 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                            เลือกตำบล/แขวง
                          </div>
                          {postalResults.map((result, index) => (
                            <div
                              key={index}
                              onClick={() => handleSelectPostalResult(result)}
                              className="p-2.5 hover:bg-red-50 cursor-pointer border-b border-slate-50 last:border-0"
                            >
                              <div className="text-xs font-bold text-slate-800">{result.subDistrict}</div>
                              <div className="text-[10px] text-slate-400">{result.district}, {result.province}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <InputField 
                      name="district" 
                      label="อำเภอ/เขต :" 
                      type="text" 
                      value={formData.district || ''} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField 
                      name="province" 
                      label="จังหวัด :" 
                      type="text" 
                      value={formData.province || ''} 
                      onChange={handleInputChange} 
                    />
                    <InputField
                      name="postalCode"
                      label="รหัสไปรษณีย์ :"
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. ผู้ติดต่อและทีมงานขาย */}
            <Card title="ข้อมูลผู้ติดต่อและทีมขาย" icon={<User size={18} />}>
              <div className="space-y-4">
                <div className="relative w-full">
                  <label className="text-xs font-bold text-slate-700 ml-0.5 block mb-1.5">
                    ชื่อผู้ติดต่อ :
                  </label>
                  <div className="relative w-full">
                    <input
                      name="contactName"
                      type="text"
                      autoComplete="off"
                      value={formData.contactName || ''}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 bg-white font-medium outline-none transition-all hover:border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-500/15"
                      placeholder="พิมพ์ชื่อผู้ติดต่อเพื่อค้นหา..."
                      onBlur={handleContactBlur}
                    />
                    {showContactSuggestions && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {contactSuggestions.length > 0 ? (
                          contactSuggestions.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => handleContactSelect(contact)}
                              className="w-full text-left px-4 py-3 text-xs hover:bg-red-50 transition-colors flex flex-col gap-0.5 border-b border-slate-100 last:border-0"
                            >
                              <span className="font-bold text-slate-900">{contact.contactName}</span>
                              <span className="text-[11px] text-slate-500 flex items-center gap-2">
                                {contact.company?.companyName || 'ไม่ระบุบริษัท'} {contact.mobilePhone && `| Tel: ${contact.mobilePhone}`}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-5 text-center">
                            <p className="text-xs font-bold text-slate-400">ไม่พบข้อมูลผู้ติดต่อเดิมในระบบ</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField 
                    name="position" 
                    label="ตำแหน่ง :" 
                    type="text" 
                    placeholder="เช่น ผู้จัดการฝ่ายจัดซื้อ / วิศวกร"
                    value={formData.position || ''} 
                    onChange={handleInputChange} 
                  />
                  <InputField 
                    name="mobilePhone" 
                    label="เบอร์โทรศัพท์ :" 
                    type="tel" 
                    placeholder="เช่น 081-234-5678"
                    value={formData.mobilePhone || ''} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField 
                    name="salesBranch" 
                    label="สาขาของเซลล์ :" 
                    type="text" 
                    readOnly 
                    value={formData.salesBranch || ''} 
                  />
                  <InputField 
                    name="salesTeamLeader" 
                    label="หัวหน้าทีม :" 
                    type="text" 
                    readOnly 
                    value={formData.salesTeamLeader || ''} 
                  />
                </div>

                <InputField 
                  name="remarks" 
                  label="หมายเหตุเพิ่มเติม :" 
                  type="text" 
                  placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับการติดต่อ..." 
                  value={formData.remarks || ''} 
                  onChange={handleInputChange} 
                />
              </div>
            </Card>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: 📄 รายละเอียดใบเสนอราคาและการเงิน (Quotation & Commercial)   */}
          {/* ========================================================================= */}
          <div className="space-y-6">

            {/* 1. ข้อมูลเอกสารและการเสนอราคา */}
            <Card title="ข้อมูลใบเสนอราคา" icon={<FileText size={18} />}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    name="quotationNumber"
                    label="เลขที่ใบเสนอราคา (QT) :"
                    type="text"
                    placeholder="กรอกเลขที่ QT..."
                    value={formData.quotationNumber || ''}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    name="quotationDate" 
                    label="วันที่ออกใบเสนอราคา :" 
                    type="date" 
                    value={formData.quotationDate || ''} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField 
                    name="requirementNumber" 
                    label="เลขที่ใบความต้องการ :" 
                    type="text" 
                    readOnly 
                    value={formData.requirementNumber || ''} 
                  />
                  <InputField 
                    name="requirementDate" 
                    label="วันที่ใบความต้องการ :" 
                    type="date" 
                    value={formData.requirementDate || ''} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField 
                    name="updatedDate" 
                    label="วันที่อ้างอิง :" 
                    type="date" 
                    required 
                    value={formData.updatedDate || ''} 
                    readOnly 
                  />

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-slate-700 ml-0.5">
                      สถานะใบเสนอราคา : <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="status"
                      value={status}
                      required
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setStatus(newStatus);
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
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 bg-white font-medium outline-none transition-all hover:border-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-500/15"
                    >
                      <option value="">- เลือกสถานะ -</option>
                      <option value="เสนอราคา">เสนอราคา</option>
                      {status === 'หมดอายุ' && (
                        <option value="หมดอายุ" disabled>หมดอายุ (ระบบกำหนดอัตโนมัติ)</option>
                      )}
                      <option value="รอจัดทำ PO">รอจัดทำ PO</option>
                      <option value="PO แล้วรอสินค้า">PO แล้วรอสินค้า</option>
                      <option value="PO แล้วรอมัดจำ">PO แล้วรอมัดจำ</option>
                      <option value="PO แล้วรอเงินโอน">PO แล้วรอเงินโอน</option>
                      <option value="เปิดบิลแล้ว">เปิดบิลแล้ว</option>
                      <option value="รอใบประเมินราคา">รอใบประเมินราคา</option>
                      <option value="ปฏิเสธ-ได้ที่อื่นแล้ว">ปฏิเสธ-ได้ที่อื่นแล้ว</option>
                      <option value="ปฏิเสธ-ยกเลิกสินค้า">ปฏิเสธ-ยกเลิกสินค้า</option>
                      <option value="ปฏิเสธ-อื่นๆ">ปฏิเสธ-อื่นๆ</option>
                      <option value="ยกเลิก-Revise">ยกเลิก-Revise</option>
                    </select>
                  </div>
                </div>

                {isLostStatus && (
                  <div className="space-y-4 p-4 border border-red-200 bg-red-50/40 rounded-2xl animate-in fade-in">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-red-700 ml-0.5">
                        สาเหตุที่พลาดดีล : <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="winLossReason"
                        value={winLossReason}
                        required
                        onChange={e => {
                          setWinLossReason(e.target.value);
                          setFormData((prev: any) => ({ ...prev, winLossReason: e.target.value }));
                        }}
                        className="w-full border border-red-200 rounded-xl p-2.5 text-sm bg-white font-bold text-slate-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15"
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

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-red-700 ml-0.5">
                        รายละเอียดเพิ่มเติม : <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        name="rejectReason"
                        rows={2}
                        required
                        placeholder="ระบุคำอธิบาย หรือรายละเอียดเพิ่มเติม..."
                        value={formData.rejectReason || ''}
                        onChange={handleInputChange}
                        className="w-full border border-red-200 rounded-xl p-2.5 text-sm bg-white text-slate-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Quotation Validity & Expiration Notice */}
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                  expirationInfo.isExpired
                    ? 'bg-stone-50 border-stone-300 text-stone-800'
                    : expirationInfo.isExtendedByFollowUp
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <Clock size={16} className={`shrink-0 mt-0.5 ${
                    expirationInfo.isExpired 
                      ? 'text-stone-600' 
                      : expirationInfo.isExtendedByFollowUp 
                      ? 'text-emerald-600' 
                      : 'text-slate-500'
                  }`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black">
                        อายุใบเสนอราคา: {expirationInfo.baseDays} วัน ({expirationInfo.isLongValidity ? 'Solar Roof / MDB' : 'สินค้าทั่วไป'})
                      </span>
                      {expirationInfo.effectiveExpiryDate && (
                        <span className="font-semibold text-[11px] text-slate-500" suppressHydrationWarning>
                          • กำหนดหมดอายุ: {new Date(expirationInfo.effectiveExpiryDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {expirationInfo.isExtendedByFollowUp && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ขยายเวลาแล้ว (+30 วัน)
                        </span>
                      )}
                      {expirationInfo.isExpired && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-stone-200 text-stone-800 border border-stone-400">
                          หมดอายุแล้ว
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {expirationInfo.isExtendedByFollowUp
                        ? `ขยายเวลาเพิ่ม 30 วันจากการติดตามลูกค้าล่าสุด (สถานะ: ${expirationInfo.statusText})`
                        : expirationInfo.isExpired
                        ? `${expirationInfo.statusText} (สามารถโทรติดตามลูกค้าและบันทึกวันติดตามผลเพื่อขยายอายุเพิ่มอีก 30 วัน)`
                        : `การบันทึกวันติดตามผลลูกค้าในหัวข้อ "บันทึกการติดตามลูกค้า" จะขยายอายุใบเสนอราคาเพิ่มอีก 30 วันนับจากวันที่ติดตาม`}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. ข้อมูลสินค้าและสิ่งที่สนใจ */}
            <Card title="ข้อมูลสินค้าและสิ่งที่สนใจ" icon={<Package size={18} />}>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700 ml-0.5">
                    หัวข้อ/ที่สนใจ :
                  </label>
                  <textarea
                    name="productInterest"
                    rows={2}
                    value={formData.productInterest || ''}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 bg-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 resize-none placeholder:text-slate-400"
                    placeholder="ระบุสิ่งที่ลูกค้าสนใจ..."
                  />
                </div>

                <SelectField 
                  name="productType" 
                  label="ประเภทสินค้า :" 
                  options={['Inverter Veichi', 'Inverter Other', 'Motor', 'Pump', 'Part', 'MDB/DB', 'Solar Roof', 'Solar Pump', 'Other']} 
                  value={formData.productType} 
                  onChange={handleInputChange} 
                />
              </div>
            </Card>

            {/* 3. มูลค่าและการคำนวณราคา */}
            <Card title="มูลค่าและการคำนวณราคา" icon={<TrendingUp size={18} />}>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700 ml-0.5">
                    ยอดขายสินค้า (ก่อน VAT) :
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-bold text-xs">฿</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="salesBeforeVat" 
                      value={salesBeforeVat} 
                      onChange={e => setSalesBeforeVat(parseFloat(e.target.value) || 0)} 
                      onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                      className="w-full border border-slate-200 rounded-xl p-2.5 pl-8 text-sm text-right font-mono font-bold text-slate-900 bg-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-slate-700 ml-0.5">
                      ค่าขนส่ง :
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-bold text-xs">฿</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        name="transportationFee" 
                        value={transportationFee} 
                        onChange={e => setTransportationFee(parseFloat(e.target.value) || 0)} 
                        onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                        className="w-full border border-slate-200 rounded-xl p-2.5 pl-8 text-sm text-right font-mono font-bold text-slate-900 bg-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-bold text-slate-700 ml-0.5">
                      ค่าติดตั้ง :
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-bold text-xs">฿</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        name="installationFee" 
                        value={installationFee} 
                        onChange={e => setInstallationFee(parseFloat(e.target.value) || 0)} 
                        onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                        className="w-full border border-slate-200 rounded-xl p-2.5 pl-8 text-sm text-right font-mono font-bold text-slate-900 bg-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15" 
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField 
                      name="totalAmountBeforeVat" 
                      label="รวมก่อน VAT :" 
                      type="text" 
                      rightAlign 
                      readOnly 
                      value={totalBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    />
                    <InputField 
                      name="vatAmount" 
                      label="ภาษีมูลค่าเพิ่ม (VAT 7%) :" 
                      type="text" 
                      rightAlign 
                      readOnly 
                      value={vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    />
                  </div>

                  {/* Symmetrical High-Impact Red Grand Total Card */}
                  <div className="bg-red-600 rounded-2xl p-5 text-white shadow-md shadow-red-600/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-red-100">รวมมูลค่าสินค้าสุทธิ</p>
                      <p className="text-xs text-red-100/90 font-medium">Grand Total (Net Value)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                        ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* ── Symmetrical Full-Width Collapsible Panels ── */}
        <div className="space-y-6 pt-2">

          {/* 3. ข้อมูลการปิดงาน เงื่อนไขการชำระเงิน และการเปิดบิล (Closing, PO & Billing) */}
          <details 
            className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
            open={Boolean(status?.startsWith('PO') || status === 'เปิดบิลแล้ว' || formData.poNumber || formData.actualClosingAmount)}
          >
            <summary className="bg-white px-5 md:px-6 py-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50/80 transition-colors [&::-webkit-details-marker]:hidden border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-red-600 rounded-full shrink-0"></div>
                <ClipboardCheck size={18} className="text-red-600 shrink-0" />
                <div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight">
                    เงื่อนไขการเงิน การวางบิล และเปิด P/O
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">ระบุเมื่อได้รับใบสั่งซื้อ (P/O), ข้อมูลเปิดบิลขาย หรือเงื่อนไขเครดิต</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(status?.startsWith('PO') || status === 'เปิดบิลแล้ว') && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    ข้อมูลสำคัญสำหรับสถานะนี้
                  </span>
                )}
                <span className="text-xs font-bold text-slate-400 group-open:rotate-180 transition-transform duration-200">▼</span>
              </div>
            </summary>

            <div className="p-5 md:p-6 bg-white space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField 
                  name="actualClosingAmount" 
                  label="ยอดปิดงานจริง (ก่อน VAT) :" 
                  type="number" 
                  rightAlign 
                  value={formData.actualClosingAmount || ''} 
                  onChange={handleInputChange} 
                />
                <InputField 
                  name="poNumber" 
                  label="เลขที่ P/O (Purchase Order) :" 
                  type="text" 
                  placeholder="กรอกเลขที่ใบสั่งซื้อ..." 
                  value={formData.poNumber || ''} 
                  onChange={handleInputChange} 
                />
                <InputField 
                  name="poDate" 
                  label="วันเปิด P/O :" 
                  type="date" 
                  value={formData.poDate || ''} 
                  onChange={handleInputChange} 
                  required={status?.startsWith('PO')} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField 
                  name="billingDate" 
                  label="วันเปิดบิลขาย :" 
                  type="date" 
                  value={formData.billingDate || ''} 
                  onChange={handleInputChange} 
                  required={status === 'เปิดบิลแล้ว'} 
                />
                <InputField 
                  name="invoiceNumber" 
                  label="หมายเลขใบแจ้งหนี้ :" 
                  type="text" 
                  placeholder="กรอกหมายเลขใบแจ้งหนี้..."
                  value={formData.invoiceNumber || ''} 
                  onChange={handleInputChange} 
                />
                <SelectField
                  name="companyCode"
                  label="บริษัทที่ออกบิล :"
                  options={['TP', 'TG', 'TE']}
                  value={formData.companyCode || 'TP'}
                  onChange={handleInputChange}
                />
              </div>

              <input type="hidden" name="installments" value={JSON.stringify(formData.installments || [])} />

              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField 
                    name="jobType" 
                    label="ประเภทงาน (Job Type) :" 
                    options={[...JOB_TYPES]} 
                    value={formData.jobType || ''} 
                    onChange={handleInputChange} 
                  />
                  <SelectField 
                    name="paymentMethod" 
                    label="วิธีการชำระเงิน :" 
                    options={['เงินสด', 'เครดิต', 'ผ่อนชำระ']} 
                    value={formData.paymentMethod || 'เครดิต'} 
                    onChange={handleInputChange} 
                  />
                </div>

                {formData.jobType && formData.jobType !== 'สินค้าฝากขาย' && formData.jobType !== 'งานขาย' && (
                  <InputField 
                    name="workName" 
                    label="ชื่อชิ้นงาน (Work Name) :" 
                    type="text" 
                    placeholder="เช่น ติดตั้งกล้องวงจรปิด / ประกอบตู้ MDB" 
                    value={formData.workName || ''} 
                    onChange={handleInputChange} 
                    required 
                  />
                )}

                {formData.paymentMethod === 'ผ่อนชำระ' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">กำหนดงวดผ่อนชำระ</label>
                      <select
                        value={formData.installmentCount || 3}
                        onChange={(e) => {
                          const count = parseInt(e.target.value);
                          const currentInstallments = formData.installments || [];
                          const newInstallments: any[] = [];
                          for (let i = 1; i <= count; i++) {
                            newInstallments.push(currentInstallments[i - 1] || { installmentNo: i, amount: '', dueDate: '' });
                          }
                          setFormData((prev: any) => ({ ...prev, installmentCount: count, installments: newInstallments }));
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 outline-none focus:border-red-600 cursor-pointer"
                      >
                        {[2, 3, 4, 5, 6, 10, 12, 24, 36].map(num => (
                          <option key={num} value={num}>{num} งวด</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2.5">
                      {(formData.installments || []).map((inst: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
                          <span className="text-xs font-bold text-slate-500 w-16 shrink-0">งวดที่ {inst.installmentNo || idx + 1}</span>
                          <input
                            type="number"
                            placeholder="จำนวนเงิน (บาท)"
                            value={inst.amount}
                            onChange={(e) => {
                              const updated = [...formData.installments];
                              updated[idx] = { ...updated[idx], amount: e.target.value };
                              setFormData((prev: any) => ({ ...prev, installments: updated }));
                            }}
                            className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono outline-none focus:border-red-600"
                          />
                          <input
                            type="date"
                            value={inst.dueDate ? inst.dueDate.slice(0, 10) : ''}
                            onChange={(e) => {
                              const updated = [...formData.installments];
                              updated[idx] = { ...updated[idx], dueDate: e.target.value };
                              setFormData((prev: any) => ({ ...prev, installments: updated }));
                            }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-red-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Credit Docs & Billing Regulations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      เอกสารอนุมัติเครดิต :
                    </label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,image/*"
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-colors cursor-pointer"
                    />
                    {isUploading && <div className="text-xs text-red-600 flex items-center gap-1.5 font-bold animate-pulse"><Loader2 size={13} className="animate-spin" /> กำลังอัปโหลด...</div>}
                    {creditDocsUrl && (
                      <a href={creditDocsUrl} target="_blank" rel="noreferrer" className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1.5 mt-1">
                        <FileText size={14} /> ดูเอกสารเครดิตที่อัปโหลด
                      </a>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      ระเบียบการวางบิลและเงื่อนไข :
                    </label>
                    <textarea 
                      name="billingRegulations" 
                      rows={2} 
                      placeholder="ระบุระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน..." 
                      value={formData.billingRegulations || ''} 
                      onChange={handleInputChange} 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 bg-white outline-none focus:border-red-600 resize-none"
                    />
                    <input
                      type="file"
                      onChange={handleBillingFileUpload}
                      accept=".pdf,image/*"
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer"
                    />
                    {isUploadingBilling && <div className="text-xs text-red-600 flex items-center gap-1.5 font-bold animate-pulse"><Loader2 size={13} className="animate-spin" /> กำลังอัปโหลด...</div>}
                    {billingDocsUrl && (
                      <a href={billingDocsUrl} target="_blank" rel="noreferrer" className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1.5 mt-1">
                        <FileText size={14} /> ดูเอกสารระเบียบวางบิล
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-700 ml-0.5">
                    เงื่อนไข % เบิกเงินตามงวดงาน :
                  </label>
                  <textarea 
                    name="percentageTerms" 
                    rows={2} 
                    placeholder="ระบุเงื่อนไขการเบิกเงินตามงวดงาน..." 
                    value={formData.percentageTerms || ''} 
                    onChange={handleInputChange} 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-red-600 resize-none bg-white"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* 4. บันทึกการติดตามและประเมินผลการขาย (Follow-Up Log) */}
          <details 
            className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
            open={Boolean(formData.followUp1 || formData.followUp2 || formData.winLossReason)}
          >
            <summary className="bg-white px-5 md:px-6 py-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-slate-50/80 transition-colors [&::-webkit-details-marker]:hidden border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-5 bg-red-600 rounded-full shrink-0"></div>
                <Clock size={18} className="text-red-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base tracking-tight">
                      บันทึกการติดตามลูกค้า (Follow-Up Log)
                    </h3>
                    {expirationInfo.isExtendedByFollowUp && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ขยายอายุเพิ่ม 30 วันแล้ว
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    บันทึกประวัติการโทรติดตาม (การบันทึกวันติดตามผลจะขยายอายุใบเสนอราคาเพิ่มอีก 30 วันจากวันที่ติดตาม)
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 group-open:rotate-180 transition-transform duration-200">▼</span>
            </summary>

            <div className="p-5 md:p-6 bg-white space-y-4">
              {expirationInfo.latestFollowUpDate && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800" suppressHydrationWarning>
                  <span className="font-bold">
                    ติดตามล่าสุด: {new Date(expirationInfo.latestFollowUpDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    ขยายวันหมดอายุเป็น: {expirationInfo.effectiveExpiryDate ? new Date(expirationInfo.effectiveExpiryDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InputField name="followUp1" label="ติดตามครั้งที่ 1 :" type="date" value={formData.followUp1 || ''} onChange={handleInputChange} />
                <InputField name="followUp2" label="ติดตามครั้งที่ 2 :" type="date" value={formData.followUp2 || ''} onChange={handleInputChange} />
                <InputField name="followUp3" label="ติดตามครั้งที่ 3 :" type="date" value={formData.followUp3 || ''} onChange={handleInputChange} />
                <InputField name="followUp4" label="ติดตามครั้งที่ 4 :" type="date" value={formData.followUp4 || ''} onChange={handleInputChange} />
              </div>

              {!isLostStatus && (
                <div className="flex flex-col gap-1.5 w-full pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 ml-0.5">
                    เหตุผล ซื้อ/ไม่ซื้อ หรือความคืบหน้าการตัดสินใจ :
                  </label>
                  <textarea 
                    name="winLossReason" 
                    rows={2} 
                    placeholder="ระบุความคืบหน้า หรือเหตุผลการตัดสินใจของลูกค้า..." 
                    value={formData.winLossReason || ''} 
                    onChange={handleInputChange} 
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 bg-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/15 resize-none"
                  />
                </div>
              )}
            </div>
          </details>

        </div>

        {/* ── Cabinet Documents Section (Full Width if applicable) ── */}
        {(status?.startsWith("PO") || status === "Invoice Opened" || status === "เปิดบิลแล้ว") && (
          (() => {
            const cabinetJob = initialData?.jobs?.find((j: any) => j.jobType === "งานตู้" || j.jobType === "งานตู้ + ติดตั้ง" || j.jobType === "Cabinet Job" || j.jobType === "Cabinet Job + Installation");
            const isCabinetSelected = formData.jobType === "งานตู้" || formData.jobType === "งานตู้ + ติดตั้ง" || formData.jobType === "Cabinet Job" || formData.jobType === "Cabinet Job + Installation";

            if (cabinetJob) {
              return (
                <div className="w-full">
                  <CabinetDocumentSection
                    jobId={cabinetJob.id}
                    initialRequiredDeliveryDate={cabinetJob.requiredDeliveryDate}
                  />
                </div>
              );
            } else if (isCabinetSelected) {
              return (
                <div className="w-full">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 text-slate-900">
                      <div className="w-1.5 h-5 bg-red-600 rounded-full"></div>
                      <h3 className="text-base font-black tracking-tight">
                        เอกสารงานประกอบตู้ (Cabinet Job Documents)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'BOQ', label: 'BOQ', state: boqFiles },
                        { key: 'QUOTATION', label: 'ใบเสนอราคา (จากลูกค้า)', state: quotationFiles },
                        { key: 'PAYMENT', label: 'เอกสารการชำระเงิน', state: paymentFiles },
                        { key: 'CUSTOMER_DOC', label: 'เอกสารลูกค้า (ภ.พ.20, หนังสือรับรอง)', state: customerDocFiles },
                      ].map((doc) => (
                        <div key={doc.key} className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-2.5">
                              {doc.label}
                            </label>
                            <div className="space-y-2">
                              <input
                                type="file"
                                multiple
                                onChange={(e) => handleJobDocUpload(e, doc.key)}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition-colors cursor-pointer"
                              />
                              {isUploadingDocs[doc.key] && (
                                <div className="text-xs text-red-600 flex items-center gap-1 font-bold animate-pulse">
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>กำลังอัปโหลด...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {doc.state.length > 0 && (
                            <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-200/80">
                              {doc.state.map((f, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                                  <a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 hover:text-red-600 font-bold flex items-center gap-1.5 truncate">
                                    <FileText size={13} className="text-slate-400 shrink-0" /> 
                                    <span className="truncate">{f.name}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJobDoc(doc.key, f.url)}
                                    className="text-slate-400 hover:text-red-600 p-1"
                                    title="ลบไฟล์"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* ── Sticky Bottom Action Bar ── */}
        <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-sm shrink-0">
              ฿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">ยอดรวมสุทธิ:</span>
                <span className="font-mono text-base font-black text-red-600">
                  ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {formData.companyName ? `ลูกค้า: ${formData.companyName}` : 'ยังไม่ได้ระบุชื่อบริษัทลูกค้า'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (isEditing) onSuccess?.();
                else {
                  setFormData({});
                  setStatus('');
                  setSalesBeforeVat(0);
                  setTransportationFee(0);
                  setInstallationFee(0);
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
            >
              {isEditing ? 'ยกเลิก' : 'ล้างข้อมูล'}
            </button>

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-red-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {!isSubmitting && <Save size={16} strokeWidth={2.5} />}
              <span>{isEditing ? 'ยืนยันบันทึกการแก้ไข' : 'บันทึกใบเสนอราคา'}</span>
            </LoadingButton>
          </div>
        </div>
      </form>
    </>
  );
}
