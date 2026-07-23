import React, { useState, useEffect } from 'react';
import { Save, X, FileText, MapPin, User, AlertTriangle, ClipboardCheck, Loader2, Trash2 } from 'lucide-react';
import { saveSalesData, updateSalesData, searchCompanies, searchContacts, getPostalInfo } from '@/app/actions/sales';
import Card from './Card';
import InputField from './InputField';
import SelectField from './SelectField';
import { LoadingButton } from '@/app/components/LoadingButton';
import { extractCompanyCode } from '@/utils/company-utils';
import { JOB_TYPES } from '@/constants/job-types';
import { createClient } from '@/utils/supabase/client';
import CabinetDocumentSection from './CabinetDocumentSection';

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

  // Form states to handle initialData
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl scale-in-center">
            <div className="text-7xl mb-4">🪙</div>
            <h2 className="text-2xl font-black text-yellow-600 mb-2">ยินดีด้วย! คุณได้รับเหรียญทอง</h2>
            <p className="text-gray-600 mb-6 font-medium">{coinModalData.message}</p>
            <button
              type="button"
              onClick={() => {
                setShowCoinModal(false);
                if (onSuccess) onSuccess();
              }}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 px-8 rounded-xl w-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              เยี่ยมไปเลย!
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="creditDocsUrl" value={creditDocsUrl} />
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {!isSubmitting && <Save size={18} />}
            {isEditing ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูล'}
          </LoadingButton>
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
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <X size={18} />
            {isEditing ? 'ยกเลิก' : 'ล้างข้อมูล'}
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
                <InputField name="updatedDate" label="วันที่อ้างอิง (Reference Date) :" type="date" required value={formData.updatedDate || ''} readOnly />
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
                    <option value="เปิดบิลแล้ว">เปิดบิลแล้ว</option>
                    <option value="รอจัดทำ PO">รอจัดทำ PO</option>
                    <option value="PO แล้วรอสินค้า">PO แล้วรอสินค้า</option>
                    <option value="PO แล้วรอมัดจำ">PO แล้วรอมัดจำ</option>
                    <option value="PO แล้วรอเงินโอน">PO แล้วรอเงินโอน</option>
                    <option value="เสนอราคา">เสนอราคา</option>
                    <option value="ปฏิเสธ-ได้ที่อื่นแล้ว">ปฏิเสธ-ได้ที่อื่นแล้ว</option>
                    <option value="ปฏิเสธ-ยกเลิกสินค้า">ปฏิเสธ-ยกเลิกสินค้า</option>
                    <option value="ปฏิเสธ-อื่นๆ">ปฏิเสธ-อื่นๆ</option>
                    <option value="รอใบประเมินราคา">รอใบประเมินราคา</option>
                    <option value="ยกเลิก-Revise">ยกเลิก-Revise</option>
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
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 animate-pulse flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                          <span>โปรดระบุชื่อคู่แข่งในช่องรายละเอียดเพิ่มเติมด้านล่างเพื่อเก็บข้อมูลเชิงวิเคราะห์</span>
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
                  <input type="number" step="0.01" name="salesBeforeVat" value={salesBeforeVat} onChange={e => setSalesBeforeVat(parseFloat(e.target.value) || 0)} onWheel={(e) => (e.target as HTMLInputElement).blur()} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-right font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ค่าขนส่ง :</label>
                  <input type="number" step="0.01" name="transportationFee" value={transportationFee} onChange={e => setTransportationFee(parseFloat(e.target.value) || 0)} onWheel={(e) => (e.target as HTMLInputElement).blur()} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-right font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-1/3 text-sm font-medium text-gray-600 text-right">ค่าติดตั้ง :</label>
                  <input type="number" step="0.01" name="installationFee" value={installationFee} onChange={e => setInstallationFee(parseFloat(e.target.value) || 0)} onWheel={(e) => (e.target as HTMLInputElement).blur()} className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm text-right font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
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
                <InputField name="poDate" label="วันเปิด P/O :" type="date" value={formData.poDate || ''} onChange={handleInputChange} required={status?.startsWith('PO')} />
                <InputField name="poNumber" label="เลขที่ P/O (Purchase Order) :" type="text" placeholder="กรอกเลขที่ใบสั่งซื้อ..." value={formData.poNumber || ''} onChange={handleInputChange} />
                <InputField name="billingDate" label="วันเปิดบิลขาย :" type="date" value={formData.billingDate || ''} onChange={handleInputChange} required={status === 'เปิดบิลแล้ว'} />
                <InputField name="invoiceNumber" label="หมายเลขใบแจ้งหนี้ :" type="text" value={formData.invoiceNumber || ''} onChange={handleInputChange} />

                {/* Hidden input to submit installments */}
                <input type="hidden" name="installments" value={JSON.stringify(formData.installments || [])} />

                {(status === 'เปิดบิลแล้ว' || status?.startsWith('PO')) && (
                  <div className="pt-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField
                        name="companyCode"
                        label="บริษัทที่ออกบิล (Company) :"
                        options={['TP', 'TG', 'TE']}
                        value={formData.companyCode || 'TP'}
                        onChange={handleInputChange}
                      />
                      <SelectField name="jobType" label="ประเภทงาน (Job Type) :" options={[...JOB_TYPES]} value={formData.jobType || ''} onChange={handleInputChange} />
                    </div>
                    {formData.jobType !== 'สินค้าฝากขาย' && formData.jobType !== 'งานขาย' && (
                      <InputField name="workName" label="ชื่อชิ้นงาน (Work Name) :" type="text" placeholder="เช่น ติดตั้งกล้องวงจรปิด" value={formData.workName || ''} onChange={handleInputChange} required />
                    )}
                    <SelectField name="paymentMethod" label="วิธีการชำระเงิน :" options={['เงินสด', 'เครดิต', 'ผ่อนชำระ']} value={formData.paymentMethod || 'เครดิต'} onChange={handleInputChange} />

                    {formData.paymentMethod === 'ผ่อนชำระ' && (
                      <div className="flex items-start gap-4">
                        <label className="w-1/3 text-sm font-bold text-orange-600 text-right mt-2.5">ตั้งค่างวดผ่อนชำระ :</label>
                        <div className="flex-1 bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-orange-800 uppercase tracking-widest">จำนวนงวด</label>
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
                              className="px-3 py-1.5 border border-orange-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            >
                              {[2, 3, 4, 5, 6, 10, 12, 24, 36].map(num => (
                                <option key={num} value={num}>{num} งวด</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-3">
                            {(formData.installments || []).map((inst: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="w-16 text-xs font-bold text-orange-700">งวดที่ {inst.installmentNo}</div>
                                <input
                                  type="number"
                                  placeholder="จำนวนเงิน"
                                  value={inst.amount || ''}
                                  onChange={(e) => {
                                    const newInstallments = [...(formData.installments || [])];
                                    newInstallments[idx] = { ...newInstallments[idx], amount: e.target.value };
                                    setFormData((prev: any) => ({ ...prev, installments: newInstallments }));
                                  }}
                                  className="flex-1 px-2 py-1.5 border border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder-orange-300"
                                />
                                <input
                                  type="date"
                                  value={inst.dueDate || ''}
                                  onChange={(e) => {
                                    const newInstallments = [...(formData.installments || [])];
                                    newInstallments[idx] = { ...newInstallments[idx], dueDate: e.target.value };
                                    setFormData((prev: any) => ({ ...prev, installments: newInstallments }));
                                  }}
                                  className="w-32 px-2 py-1.5 border border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 mt-6 space-y-4">
                      <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                        <ClipboardCheck size={16} className="text-blue-600" /> ข้อมูลยืนยันการขาย (สำหรับบัญชี)
                      </h3>
                      <div className="flex flex-col gap-4">
                        <InputField name="salesOrderDate" label="วันที่สั่งซื้อ (Order Date) :" type="date" value={formData.salesOrderDate || ''} onChange={handleInputChange} required />
                        <InputField name="deliveryDate" label="วันที่ส่งมอบ (Delivery Date) :" type="date" value={formData.deliveryDate || ''} onChange={handleInputChange} required />
                        {(formData.paymentMethod === 'เงินสด' || formData.paymentMethod === 'จ่ายแล้ว') && (
                          <InputField name="paymentDate" label="วันที่ชำระเงิน (Payment Date) :" type="date" value={formData.paymentDate || ''} onChange={handleInputChange} required />
                        )}
                      </div>

                      {formData.paymentMethod !== 'เงินสด' && formData.paymentMethod !== 'จ่ายแล้ว' && (
                        <>
                          <div className="mt-4">
                            <InputField name="creditTerms" label="เงื่อนไขเครดิต (Credit Terms) :" type="text" placeholder="เช่น 15, 30, 45, 60 วัน..." value={formData.creditTerms || ''} onChange={handleInputChange} />
                          </div>

                          <div className="flex flex-col gap-6 mt-4">
                            <div className="flex flex-col md:flex-row items-start gap-1.5 md:gap-4 w-full">
                              <label className="w-full md:w-1/3 text-left md:text-right text-xs md:text-sm font-semibold md:font-medium text-slate-500 md:text-gray-600 mt-2.5">เอกสารอนุมัติขอเครดิต :</label>
                              <div className="flex-1 w-full border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col justify-center h-full">
                                <div className="flex flex-col gap-3">
                                  <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    accept=".pdf,image/*"
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
                                  />
                                  {isUploading && <div className="text-xs text-blue-600 flex items-center gap-1.5 font-bold animate-pulse"><Loader2 size={14} className="animate-spin" /> กำลังอัปโหลด...</div>}
                                </div>
                                {creditDocsUrl && (
                                  <div className="mt-4 pt-4 border-t border-slate-100">
                                    <a href={creditDocsUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline flex items-center gap-1.5 bg-blue-50 w-fit px-3 py-1.5 rounded-lg transition-colors">
                                      <FileText size={14} /> ดูไฟล์ที่อัปโหลด
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-start gap-1.5 md:gap-4 w-full">
                              <label className="w-full md:w-1/3 text-left md:text-right text-xs md:text-sm font-semibold md:font-medium text-slate-500 md:text-gray-600 mt-2.5">ระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน :</label>
                              <div className="flex-1 w-full border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col gap-4">
                                <textarea name="billingRegulations" rows={2} placeholder="ระบุระเบียบการวางบิล และเงื่อนไขการจ่ายเงิน..." value={formData.billingRegulations || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"></textarea>
                                <div className="flex flex-col gap-3">
                                  <input
                                    type="file"
                                    onChange={handleBillingFileUpload}
                                    accept=".pdf,image/*"
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
                                  />
                                  {isUploadingBilling && <div className="text-xs text-blue-600 flex items-center gap-1.5 font-bold animate-pulse"><Loader2 size={14} className="animate-spin" /> กำลังอัปโหลด...</div>}
                                </div>
                                {billingDocsUrl && (
                                  <div className="pt-4 border-t border-slate-100 mt-1">
                                    <a href={billingDocsUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline flex items-center gap-1.5 bg-blue-50 w-fit px-3 py-1.5 rounded-lg transition-colors">
                                      <FileText size={14} /> ดูไฟล์ที่อัปโหลด
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                        </>
                      )}

                      <div className="flex flex-col md:flex-row items-start gap-1.5 md:gap-4 w-full mt-6">
                        <label className="w-full md:w-1/3 text-left md:text-right text-xs md:text-sm font-semibold md:font-medium text-slate-500 md:text-gray-600 mt-2.5">เงื่อนไข % กรณีขอเบิกเงิน (Invoice % Terms) :</label>
                        <textarea name="percentageTerms" rows={2} placeholder="ระบุเงื่อนไขการเบิกเงิน..." value={formData.percentageTerms || ''} onChange={handleInputChange} className="flex-1 w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white hover:border-slate-300 transition-all resize-none shadow-sm"></textarea>
                      </div>
                    </div>
                  </div>
                )}
                {!isLostStatus && (
                  <div className="flex flex-col md:flex-row items-start gap-1.5 md:gap-4 w-full mt-4">
                    <label className="w-full md:w-1/3 text-left md:text-right text-xs md:text-sm font-semibold md:font-medium text-slate-500 md:text-gray-600 mt-2.5">เหตุผล ซื้อ/ไม่ซื้อ :</label>
                    <textarea name="winLossReason" rows={2} placeholder="ระบุเหตุผล..." value={formData.winLossReason || ''} onChange={handleInputChange} className="flex-1 w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white hover:border-slate-300 transition-all resize-none shadow-sm"></textarea>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <SelectField name="branchOrHeadOffice" label="สาขา/สำนักงานใหญ่ :" vertical={true} options={['สำนักงานใหญ่', 'สาขา']} value={formData.branchOrHeadOffice} onChange={handleInputChange} />
                    <SelectField name="businessType" label="ประเภทธุรกิจ :" vertical={true} options={businessTypes.length > 0 ? businessTypes : ['โรงงานอุตสาหกรรม', 'รับเหมาก่อสร้าง', 'ขายปลีก', 'อื่นๆ']} value={formData.businessType} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <SelectField name="customerType" label="ประเภทลูกค้า :" vertical={true} options={['USER', 'MAKER', 'TRADING']} value={formData.customerType} onChange={handleInputChange} />
                    <SelectField name="customerStatus" label="สถานะลูกค้า :" vertical={true} options={['ลูกค้าใหม่', 'ลูกค้าเก่า', 'ลูกค้ากลับมา']} value={formData.customerStatus} onChange={handleInputChange} />
                  </div>
                  <SelectField name="customerAccessChannel" label="ช่องทางรับลูกค้า :" options={['Website', 'Facebook', 'LINE', 'โทรศัพท์', 'Walk-in', 'Telesale', 'Shopee', 'Lazada', 'TikTok', 'Google', 'Booth', 'YouTube']} value={formData.customerAccessChannel} onChange={handleInputChange} />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="relative">
                      <InputField name="subDistrict" label="ตำบล/แขวง :" type="text" vertical={true} value={formData.subDistrict || ''} onChange={handleInputChange} />
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
                    <InputField name="district" label="อำเภอ/เขต :" type="text" vertical={true} value={formData.district || ''} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <InputField name="province" label="จังหวัด :" type="text" vertical={true} value={formData.province || ''} onChange={handleInputChange} />
                    <InputField
                      name="postalCode"
                      label="รหัสไปรษณีย์ :"
                      type="text"
                      vertical={true}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:pl-[33.333%]">
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
                  <SelectField name="productType" label="ประเภทสินค้า :" options={['Inverter Veichi', 'Inverter Other', 'Motor', 'Pump', 'Part', 'MDB/DB', 'Solar Roof', 'Solar Pump', 'Other']} value={formData.productType} onChange={handleInputChange} />
                </div>
              </div>
            </Card>

            <Card title="การติดตาม">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField name="followUp1" label="ติดตามครั้งที่ 1 :" type="date" value={formData.followUp1 || ''} onChange={handleInputChange} />
                  <InputField name="followUp2" label="ติดตามครั้งที่ 2 :" type="date" value={formData.followUp2 || ''} onChange={handleInputChange} />
                  <InputField name="followUp3" label="ติดตามครั้งที่ 3 :" type="date" value={formData.followUp3 || ''} onChange={handleInputChange} />
                  <InputField name="followUp4" label="ติดตามครั้งที่ 4 :" type="date" value={formData.followUp4 || ''} onChange={handleInputChange} />
                </div>
              </div>
            </Card>

            <Card title="ข้อมูลเพิ่มเติม">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField name="salesBranch" label="สาขาของเซลล์ :" type="text" readOnly vertical={true} value={formData.salesBranch || ''} />
                  <InputField name="salesTeamLeader" label="หัวหน้าทีม :" type="text" readOnly vertical={true} value={formData.salesTeamLeader || ''} />
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">หมายเหตุ :</label>
                  <textarea name="remarks" rows={3} value={formData.remarks || ''} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white transition-all" placeholder="เพิ่มหมายเหตุ..."></textarea>
                </div>
              </div>
            </Card>
          </div>
        </div>

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
                <div className="w-full mt-6">
                  <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 shadow-sm">
                    <h3 className="text-sm font-black text-orange-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      เอกสารงานประกอบตู้
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'BOQ', label: 'BOQ', state: boqFiles },
                        { key: 'QUOTATION', label: 'ใบเสนอราคา (จากลูกค้า)', state: quotationFiles },
                        { key: 'PAYMENT', label: 'เอกสารการชำระเงิน', state: paymentFiles },
                        { key: 'CUSTOMER_DOC', label: 'เอกสารลูกค้า (ภ.พ.20, หนังสือรับรอง)', state: customerDocFiles },
                      ].map((doc) => (
                        <div key={doc.key} className="bg-white p-4 rounded-xl border border-orange-100">
                          <label className="block text-xs font-bold text-gray-700 mb-3">
                            {doc.label}
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleJobDocUpload(e, doc.key)}
                              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 transition-colors cursor-pointer"
                            />
                            {isUploadingDocs[doc.key] && <div className="text-xs text-orange-600 flex items-center gap-1 font-bold animate-pulse"><Loader2 size={14} className="animate-spin" /></div>}
                          </div>
                          {doc.state.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {doc.state.map((f, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-orange-50 p-2.5 rounded-lg border border-orange-100 group">
                                  <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-2 truncate">
                                    <FileText size={14} className="shrink-0" /> <span className="truncate">{f.name}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJobDoc(doc.key, f.url)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-white"
                                    title="ลบไฟล์"
                                  >
                                    <Trash2 size={14} />
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
      </form>
    </>
  );
}
