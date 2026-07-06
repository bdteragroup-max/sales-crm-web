"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Save, X, Plus, Trash2, Camera, Printer, ArrowLeft, ClipboardList } from 'lucide-react';
import { LoadingButton } from '@/app/components/LoadingButton';
import { createRepairOrder } from '@/app/actions/repairOrders';
import { searchContacts } from '@/app/actions/sales';
import InputField from '@/app/sales/components/InputField';
import SelectField from '@/app/sales/components/SelectField';
import Card from '@/app/sales/components/Card';
import { useRouter } from 'next/navigation';

const CHECKLIST_OPTIONS = [
  { key: 'Front', label: 'ด้านหน้า / Front' },
  { key: 'Top', label: 'ด้านบน / Top' },
  { key: 'SideLeft', label: 'ด้านข้าง (ซ้าย) / Side Left' },
  { key: 'SideRight', label: 'ด้านข้าง (ขวา) / Side Right' },
  { key: 'Inside', label: 'ด้านใน / Inside' },
  { key: 'Nameplate', label: 'Nameplate' },
  { key: 'Bottom', label: 'ด้านล่าง / Bottom' },
  { key: 'TerminalNut', label: 'Terminal / Nut' },
  { key: 'TermCover', label: 'Term. cover' },
  { key: 'Cover', label: 'ฝาครอบ / Cover' },
  { key: 'Video', label: 'Video' },
];

export default function EditRepairOrderForm({ companies = [], users = [], initialData }: { companies: any[], users: any[], initialData: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingAndPrint, setIsSubmittingAndPrint] = useState(false);
  const [message, setMessage] = useState('');
  
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{key: string, index: number} | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<any>({
    jobId: '',
    workType: 'ซ่อม',
    company: 'TERA GROUP',
    customerCompany: '',
    phoneNumber: '', 
    customerPhoneNumber: '', 
    customerAddress: '',
    invoiceNo: '',
    deliveryNoteNo: '',
    receiverName: '',
    senderName: '',
    forwardedBy: '',
    handoverRef: '',
    salesPerson: '',
    symptoms: '',
    settings: '',
    receivedDate: new Date().toISOString().split('T')[0],
    sentDate: '',
    items: [{ type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }],
    checklist: {},
    checklistImages: {}
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        receivedDate: initialData.receivedDate ? new Date(initialData.receivedDate).toISOString().split('T')[0] : '',
        sentDate: initialData.sentDate ? new Date(initialData.sentDate).toISOString().split('T')[0] : '',
        items: initialData.items?.length > 0 ? initialData.items : [{ type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }],
        checklist: initialData.checklist || {},
        checklistImages: initialData.checklistImages || {},
        customerPhoneNumber: initialData.customerPhoneNumber || initialData.phoneNumber || '',
        customerCompany: initialData.customerCompany || initialData.job?.customerName || '',
        customerAddress: initialData.customerAddress || '',
        salesPerson: initialData.salesPerson || initialData.job?.sellerName || '',
      });
      if (initialData.senderName) {
        setContactSearchQuery(initialData.senderName);
      }
    }
  }, [initialData]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCompanySearch = (query: string) => {
    setFormData((prev: any) => ({ ...prev, customerCompany: query }));
    if (query.length >= 1) {
      const results = companies.filter(c => c.companyName.toLowerCase().includes(query.toLowerCase()));
      setCompanySuggestions(results.slice(0, 5));
      setShowSuggestions(results.length > 0 || query.length >= 1);
    } else {
      setCompanySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCompanySelect = (company: any) => {
    setSelectedCompanyId(company.id);
    setFormData((prev: any) => ({
      ...prev,
      customerCompany: company.companyName,
      customerAddress: company.address || company.billingAddress || '',
      customerPhoneNumber: company.phone || company.phoneNumber || prev.customerPhoneNumber,
    }));
    setShowSuggestions(false);
  };

  useEffect(() => {
    const fetchContacts = async () => {
      if (contactSearchQuery.length >= 2) {
        const results = await searchContacts(contactSearchQuery, selectedCompanyId || undefined);
        setContactSuggestions(results);
        setShowContactSuggestions(true);
      } else {
        setContactSuggestions([]);
        setShowContactSuggestions(false);
      }
    };
    const timeoutId = setTimeout(fetchContacts, 500);
    return () => clearTimeout(timeoutId);
  }, [contactSearchQuery, selectedCompanyId]);

  const handleContactSelect = (contact: any) => {
    setFormData((prev: any) => ({
      ...prev,
      senderName: contact.contactName || '',
      customerPhoneNumber: contact.phone || contact.mobile || prev.customerPhoneNumber,
    }));
    setContactSearchQuery(contact.contactName || '');
    setShowContactSuggestions(false);

    if (contact.company && !selectedCompanyId) {
      handleCompanySelect(contact.company);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setShowContactSuggestions(false);
    }, 200);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [...prev.items, { type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev: any) => {
      const newItems = prev.items.filter((_: any, i: number) => i !== index);
      const newImages = { ...prev.checklistImages };
      Object.keys(newImages).forEach(key => {
        if (newImages[key] && newImages[key].length > index) {
          const arr = [...newImages[key]];
          arr.splice(index, 1);
          newImages[key] = arr;
        }
      });
      return { ...prev, items: newItems, checklistImages: newImages };
    });
  };

  const handleChecklistChange = (key: string) => {
    setFormData((prev: any) => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: !prev.checklist[key] }
    }));
  };

  const triggerUpload = (key: string, index: number) => {
    setUploadTarget({ key, index });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    
    if (file.size > 50 * 1024 * 1024) {
      alert(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (รองรับสูงสุด 50MB)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    setUploading(true);
    try {
      const supabase = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('uploadsService')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false
        });
            if (uploadError) {
              console.error('Upload error:', uploadError);
              alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${file.name}\nสาเหตุ: ${uploadError.message}`);
              throw new Error('Upload failed');
            }
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('uploadsService')
        .getPublicUrl(uploadData.path);
      
      const { key, index } = uploadTarget;
      setFormData((prev: any) => {
        const newImages = { ...prev.checklistImages };
        if (!newImages[key]) newImages[key] = [];
        while (newImages[key].length <= index) newImages[key].push("");
        newImages[key][index] = publicUrl;
        return { ...prev, checklistImages: newImages };
      });
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (key: string, index: number) => {
    setFormData((prev: any) => {
      const newImages = { ...prev.checklistImages };
      if (newImages[key]) {
        const arr = [...newImages[key]];
        arr[index] = "";
        newImages[key] = arr;
      }
      return { ...prev, checklistImages: newImages };
    });
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, printAfter: boolean = false) {
    e.preventDefault();
    if (printAfter) setIsSubmittingAndPrint(true);
    else setIsSubmitting(true);
    setMessage('');
    
    const submitData = {
      ...formData,
      phoneNumber: formData.customerPhoneNumber && formData.phoneNumber && formData.customerPhoneNumber !== formData.phoneNumber 
        ? `${formData.phoneNumber} / ${formData.customerPhoneNumber}`
        : formData.customerPhoneNumber || formData.phoneNumber
    };

    const res = await createRepairOrder(submitData);

    if (res.success) {
      setMessage('บันทึกการแก้ไขใบรับซ่อมเรียบร้อยแล้ว');
      if (printAfter && res.jobId) {
        router.push(`/repair-orders/${res.jobId}/print`);
      } else {
        router.push('/repair-orders');
      }
    } else {
      setMessage(res.error || 'เกิดข้อผิดพลาด');
      setIsSubmitting(false);
      setIsSubmittingAndPrint(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 relative">
      {formData?.job && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-5 md:p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-sm font-black text-blue-800 uppercase tracking-wide mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" />
            ข้อมูลงานเบื้องต้นจาก Sales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">เลขที่งาน (Job)</p>
              <p className="text-sm font-bold text-gray-800">{formData.job.jobNumber || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">ลูกค้า/บริษัท</p>
              <p className="text-sm font-bold text-gray-800">{formData.job.customerName || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">พนักงานขาย</p>
              <p className="text-sm font-bold text-gray-800">{formData.job.sellerName || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">ใบเสนอราคา / PO</p>
              <p className="text-sm font-bold text-gray-800">{formData.job.quotationNumber || "-"} / {formData.job.poNumber || "-"}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">สินค้า/อาการเสียเบื้องต้น</p>
              <p className="text-sm font-medium text-gray-700 bg-white/60 p-2.5 rounded-lg border border-blue-50/50 mt-1">{formData.job.item || "-"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Section 1: Repair Information ── */}
        <Card title="Section 1: ข้อมูลการซ่อม (Repair Information)">
          <div className="space-y-4">
            <InputField name="jobId" label="Document No. :" type="text" readOnly placeholder="(Auto Generated RO-YY-XXXX)" value={formData.job?.jobNumber || ''} />
            <InputField name="receivedDate" label="วันที่รับซ่อม (Repair Date) :" type="date" value={formData.receivedDate || ''} onChange={handleInputChange} />
            
            <SelectField name="workType" label="Job Type :" options={['ซ่อม', 'เคลม', 'ไม่ซ่อม/คืนสินค้า', 'ตรวจเช็ค']} value={formData.workType || 'ซ่อม'} onChange={handleInputChange} />
            <InputField name="invoiceNo" label="Invoice No :" type="text" value={formData.invoiceNo || ''} onChange={handleInputChange} />

            <div className="flex items-center gap-4">
              <label className="w-1/3 text-sm font-medium text-slate-500 text-right">ผู้รับซ่อม (Recipient) :</label>
              <select 
                name="receiverName" 
                value={formData.receiverName || ''} 
                onChange={handleInputChange} 
                className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="">- เลือกผู้รับซ่อม -</option>
                {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
              </select>
            </div>
            <InputField name="forwardedBy" label="ส่งต่อโดย (Forwarder) :" type="text" value={formData.forwardedBy || ''} onChange={handleInputChange} />
            
            <InputField name="phoneNumber" label="เบอร์โทรผู้ติดต่อ :" type="text" value={formData.phoneNumber || ''} onChange={handleInputChange} />
            <InputField name="deliveryNoteNo" label="Delivery Note / Ref Job No :" type="text" value={formData.deliveryNoteNo || ''} onChange={handleInputChange} />
          </div>
        </Card>

        {/* ── Section 2: Customer Information ── */}
        <Card title="Section 2: ข้อมูลลูกค้า (Customer Information)">
          <div className="space-y-4">
            <div className="flex items-center gap-4 relative">
              <label className="w-1/3 text-sm font-medium text-slate-500 text-right">บริษัท/ลูกค้า (Company Name) : <span className="text-red-500">*</span></label>
              <div className="flex-1 relative">
                <input 
                  name="customerCompany"
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.customerCompany || ''}
                  onChange={(e) => handleCompanySearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  placeholder="ค้นหาชื่อบริษัท..."
                  onBlur={handleBlur}
                />
                {showSuggestions && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
                    {companySuggestions.length > 0 ? (
                      companySuggestions.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onMouseDown={() => handleCompanySelect(company)}
                          className="w-full text-left px-5 py-4 text-sm hover:bg-red-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <span className="font-bold text-slate-900">{company.companyName}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center text-xs font-bold text-gray-400">ไม่พบข้อมูล</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 relative">
              <label className="w-1/3 text-sm font-medium text-slate-500 text-right">ผู้ติดต่อ (Contact Person) :</label>
              <div className="flex-1 relative">
                <input 
                  name="contactSearch"
                  type="text"
                  autoComplete="off"
                  value={contactSearchQuery}
                  onChange={(e) => {
                    setContactSearchQuery(e.target.value);
                    setFormData((prev: any) => ({ ...prev, senderName: e.target.value }));
                  }}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  placeholder="ค้นหาชื่อผู้ติดต่อ..."
                  onBlur={handleBlur}
                />
                {showContactSuggestions && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
                    {contactSuggestions.length > 0 ? (
                      contactSuggestions.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onMouseDown={() => handleContactSelect(contact)}
                          className="w-full text-left px-5 py-4 text-sm hover:bg-red-50 transition-colors border-b border-slate-50 last:border-0 flex flex-col"
                        >
                          <span className="font-bold text-slate-900">{contact.contactName}</span>
                          <span className="text-[10px] text-gray-500">{contact.phone || contact.mobile}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-8 text-center text-xs font-bold text-gray-400">ไม่พบข้อมูลผู้ติดต่อ</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <label className="w-1/3 text-sm font-medium text-slate-500 text-right mt-3.5">ที่อยู่ (Address) :</label>
              <textarea 
                name="customerAddress" 
                rows={3} 
                value={formData.customerAddress || ''} 
                onChange={handleInputChange} 
                className="flex-1 border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white hover:border-slate-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                placeholder="ที่อยู่ลูกค้า..."
              ></textarea>
            </div>

            <InputField name="customerPhoneNumber" label="เบอร์โทรลูกค้า (Customer Phone) :" type="text" value={formData.customerPhoneNumber || ''} onChange={handleInputChange} />
            <SelectField name="company" label="บริษัทผู้รับบริการ :" options={['TERA GROUP', 'TERA ELECTRIC', 'TERA POWER']} value={formData.company || 'TERA GROUP'} onChange={handleInputChange} />
          </div>
        </Card>
      </div>

      {/* ── Section 3: Product List ── */}
      <Card title="Section 3: รายการสินค้า (Product List)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-bold rounded-tl-xl w-[5%]">ลำดับ</th>
                <th className="py-3 px-4 font-bold w-[15%]">Type</th>
                <th className="py-3 px-4 font-bold w-[15%]">Brand</th>
                <th className="py-3 px-4 font-bold w-[15%]">Model</th>
                <th className="py-3 px-4 font-bold w-[10%]">Size</th>
                <th className="py-3 px-4 font-bold w-[15%]">Serial No.</th>
                <th className="py-3 px-4 font-bold w-[10%]">Quantity</th>
                <th className="py-3 px-4 font-bold w-[15%] rounded-tr-xl">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formData.items.map((item: any, idx: number) => (
                <tr key={idx} className="group relative bg-white">
                  <td className="py-3 px-4 font-medium text-slate-500 text-center">{idx + 1}</td>
                  <td className="py-2 px-2"><input type="text" value={item.type || ''} onChange={e => handleItemChange(idx, 'type', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" /></td>
                  <td className="py-2 px-2"><input type="text" value={item.brand || ''} onChange={e => handleItemChange(idx, 'brand', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" /></td>
                  <td className="py-2 px-2"><input type="text" value={item.model || ''} onChange={e => handleItemChange(idx, 'model', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" /></td>
                  <td className="py-2 px-2"><input type="text" value={item.size || ''} onChange={e => handleItemChange(idx, 'size', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" /></td>
                  <td className="py-2 px-2"><input type="text" value={item.serial || ''} onChange={e => handleItemChange(idx, 'serial', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" /></td>
                  <td className="py-2 px-2"><input type="number" value={item.qty || ''} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value)||1)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-center" /></td>
                  <td className="py-2 px-2 relative">
                    <input type="text" value={item.remark || ''} onChange={e => handleItemChange(idx, 'remark', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-start">
          <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors">
            <Plus size={16} />
            + Add Item
          </button>
        </div>
      </Card>

      {/* ── Section 4: Symptom and Checklist ── */}
      <Card title="Section 4: อาการเสีย เช็คลิสต์ และรูปภาพ (Symptom, Checklist & Images)">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-500">อาการเสีย (Malfunctions / Symptom) :</label>
              <textarea 
                name="symptoms" 
                rows={4} 
                value={formData.symptoms || ''} 
                onChange={handleInputChange} 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                placeholder="ระบุอาการเสีย..."
              ></textarea>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-500">การตั้งค่า (Settings) :</label>
              <textarea 
                name="settings" 
                rows={3} 
                value={formData.settings || ''} 
                onChange={handleInputChange} 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none transition-all duration-200 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                placeholder="ระบุการตั้งค่า..."
              ></textarea>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-500 block">การตรวจสอบสภาพ (Checklist) :</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {CHECKLIST_OPTIONS.map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={!!formData.checklist[item.key]} 
                    onChange={() => handleChecklistChange(item.key)}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>

            {/* Uploaded Images Gallery for checked items */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-600 mb-3">อัปโหลดรูปภาพสินค้า (ตามหัวข้อที่ติ๊ก) <span className="text-red-500 font-medium">(รองรับสูงสุด 50MB)</span>:</p>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <div className="flex flex-wrap gap-4">
                {CHECKLIST_OPTIONS.map(item => {
                  if (!formData.checklist[item.key]) return null;
                  return formData.items.map((_: any, pIdx: number) => {
                    const imgUrl = formData.checklistImages[item.key]?.[pIdx];
                    return (
                      <div key={`${item.key}-${pIdx}`} className="flex flex-col items-center w-[80px] group">
                        <div 
                          onClick={() => triggerUpload(item.key, pIdx)}
                          className={`w-[80px] h-[80px] rounded-xl border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all ${!imgUrl ? 'bg-slate-50 border-dashed border-slate-300 hover:border-slate-500' : 'bg-white border-solid border-slate-200'}`}
                        >
                          {imgUrl ? (
                            <img src={imgUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-400">
                              {uploading && uploadTarget?.key === item.key && uploadTarget?.index === pIdx ? (
                                <span className="text-xs animate-pulse">...</span>
                              ) : (
                                <Camera size={20} />
                              )}
                            </div>
                          )}
                        </div>
                        {imgUrl && (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(item.key, pIdx); }}
                            className="mt-2 text-[10px] text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded-full"
                          >
                            ลบรูป
                          </button>
                        )}
                        <div className="text-[10px] mt-1 text-center font-medium text-slate-500 leading-tight">
                          {item.label.split('/')[0]}<br/>(ชิ้นที่ {pIdx+1})
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* ── Section 5: Signature ── */}
      <Card title="Section 5: ข้อมูลผู้ส่ง/รับคืน (Signature & Dates)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <InputField name="senderName" label="ผู้ส่งซ่อม (Sender) :" type="text" value={formData.senderName || ''} onChange={handleInputChange} />
            <InputField name="receivedDate" label="วันที่รับซ่อม (Received Date) :" type="date" value={formData.receivedDate || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-4">
            <InputField name="salesPerson" label="เซลล์ที่รับผิดชอบ :" type="text" value={formData.salesPerson || ''} onChange={handleInputChange} />
            <InputField name="sentDate" label="วันที่ส่งของคืน (Return Date) :" type="date" value={formData.sentDate || ''} onChange={handleInputChange} />
          </div>
        </div>
      </Card>

      {/* ── Sticky Action Buttons Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 md:pl-64">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
            Cancel
          </button>
          
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm flex-1 md:flex-none justify-center"
          >
            {!isSubmitting && <Save size={18} />}
            Save
          </LoadingButton>

          <LoadingButton
            type="button"
            onClick={(e: any) => handleSubmit(e, true)}
            loading={isSubmittingAndPrint}
            className="px-6 py-3 bg-[#ff2301] hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-red-200 flex-1 md:flex-none justify-center ml-auto md:ml-0"
          >
            {!isSubmittingAndPrint && <Printer size={18} />}
            Save + Print PDF
          </LoadingButton>

          {message && (
            <div className="hidden md:flex items-center text-sm font-bold text-green-600 ml-auto bg-green-50 px-4 rounded-xl border border-green-100">
              {message}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
