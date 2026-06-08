"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Trash2, X, Upload, ArrowLeft, ClipboardList, Users, FileSignature, CheckCircle2, Loader2, Save } from "lucide-react";
import { createRepairOrder } from "@/app/actions/repairOrders";
import { searchCompanies, searchContacts, getPostalInfo } from "@/app/actions/sales";

interface UserOption {
  id: string;
  name: string;
  position: string;
}

interface RepairOrderItem {
  id: string;
  type: string;
  brand: string;
  model: string;
  size: string;
  serial: string;
  qty: number;
  remark: string;
}

export default function NewRepairOrderForm({
  users,
  currentUserId,
  initialData,
}: {
  users: UserOption[];
  currentUserId: string;
  initialData?: any;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General Form State
  const [workType, setWorkType] = useState("ซ่อม");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [receiverId, setReceiverId] = useState(currentUserId);
  const [forwardedBy, setForwardedBy] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryNoteNo, setDeliveryNoteNo] = useState("");

  // Customer State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [isSearchingContact, setIsSearchingContact] = useState(false);
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const contactSearchRef = useRef<HTMLDivElement>(null);

  const [customerCompany, setCustomerCompany] = useState(initialData?.customerCompany || "");
  const [customerAddress, setCustomerAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");

  const [postalOptions, setPostalOptions] = useState<any[]>([]);

  // Items State
  const [items, setItems] = useState<RepairOrderItem[]>([
    { id: crypto.randomUUID(), type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" },
  ]);

  // Symptoms & Checklist State
  const [symptoms, setSymptoms] = useState("");
  const [settings, setSettings] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    Front: false, Top: false,
    SideLeft: false, SideRight: false,
    Inside: false, Nameplate: false,
    Bottom: false, TerminalNut: false,
    TermCover: false, Cover: false,
    Video: false
  });

  // Images State
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Signatures State
  const [senderName, setSenderName] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiverNameText, setReceiverNameText] = useState("");
  const [sentDate, setSentDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    // Populate receiver text based on dropdown default
    const u = users.find(u => u.id === receiverId);
    if (u && !receiverNameText) {
      setReceiverNameText(u.name);
    }
  }, [receiverId, users, receiverNameText]);

  // Handle Search Company
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchCompanies(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (contactSearchQuery.length >= 2) {
        setIsSearchingContact(true);
        const results = await searchContacts(contactSearchQuery, selectedCompanyId || undefined);
        setContactSearchResults(results);
        setIsSearchingContact(false);
      } else {
        setContactSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [contactSearchQuery, selectedCompanyId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
      if (contactSearchRef.current && !contactSearchRef.current.contains(event.target as Node)) {
        setContactSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCompany = (company: any) => {
    setSelectedCompanyId(company.id);
    setCustomerCompany(company.companyName || "");
    setCustomerAddress(company.address || "");
    setSubDistrict(company.subDistrict || "");
    setDistrict(company.district || "");
    setProvince(company.province || "");
    setPostalCode(company.postalCode || "");
    setSearchQuery(company.companyName || "");
    setSearchResults([]);
  };

  const handleSelectContact = (contact: any) => {
    setSenderName(contact.contactName || "");
    setPhoneNumber(contact.phone || contact.mobile || "");
    setContactSearchQuery(contact.contactName || "");
    setContactSearchResults([]);

    if (contact.company && !selectedCompanyId) {
      handleSelectCompany(contact.company);
    }
  };

  const handlePostalCodeChange = async (val: string) => {
    setPostalCode(val);
    if (val.length >= 5) {
      const data = await getPostalInfo(val);
      if (data && data.length > 0) {
        if (data.length === 1) {
          setSubDistrict(data[0].subDistrict);
          setDistrict(data[0].district);
          setProvince(data[0].province);
        } else {
          setPostalOptions(data);
        }
      }
    } else {
      setPostalOptions([]);
    }
  };

  const handlePostalSelect = (option: any) => {
    setSubDistrict(option.subDistrict);
    setDistrict(option.district);
    setProvince(option.province);
    setPostalOptions([]);
  };

  // Handle Items
  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RepairOrderItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // Handle Checklist
  const toggleChecklist = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle Images
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (action: "save" | "print") => {
    setIsSubmitting(true);
    
    try {
      // 1. Upload Images
      const uploadedUrls: string[] = [];
      if (images.length > 0) {
        setIsUploading(true);
        for (const file of images) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: fd
          });
          const result = await res.json();
          if (result.success && result.url) {
            uploadedUrls.push(result.url);
          }
        }
        setIsUploading(false);
      }

      // 2. Prepare Data
      const selectedUser = users.find(u => u.id === receiverId);

      const formData = {
        jobId: initialData?.jobId,
        workType,
        invoiceNo,
        receiverName: selectedUser?.name || receiverNameText,
        forwardedBy,
        phoneNumber,
        deliveryNoteNo,
        customerCompany,
        company: initialData?.company,
        salesPerson: initialData?.salesPerson,
        customerAddress: `${customerAddress} ${subDistrict} ${district} ${province} ${postalCode}`.trim(),
        items: items.map(i => ({
          type: i.type, brand: i.brand, model: i.model, size: i.size, serial: i.serial, qty: i.qty, remark: i.remark
        })),
        symptoms,
        settings,
        checklist: checklist,
        checklistImages: (uploadedUrls.length > 0 ? { general: uploadedUrls } : {}) as Record<string, string[]>,
        senderName,
        receivedDate,
        sentDate,
      };

      // 3. Save
      const result = await createRepairOrder(formData);

      if (result.success) {
        if (action === "print" && result.repairOrderId) {
          router.push(`/repair-orders/${result.repairOrderId}/print`);
        } else {
          router.push("/repair-orders");
        }
      } else {
        alert(result.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการดำเนินการ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50/50 text-sm border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5";

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden mb-12 relative">
      <div className="bg-gradient-to-r from-red-50 to-white border-b border-red-100/50 px-4 md:px-8 py-5 md:py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => router.back()} className="p-2 -ml-2 text-red-400 hover:text-red-600 hover:bg-red-100/50 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#ff2301] to-[#d01800] text-white shadow-lg shadow-red-500/30 flex items-center justify-center">
              <Wrench size={22} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase">สร้างใบแจ้งซ่อมใหม่</h1>
              <p className="text-[10px] md:text-xs font-bold text-[#ff2301] uppercase tracking-widest">New Repair Order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/30 pb-32">
        {/* Section 1: ข้อมูลการรับซ่อม */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
              <ClipboardList size={18} />
            </div>
            1. ข้อมูลการรับซ่อม
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            <div>
              <label className={labelClass}>วันที่รับซ่อม</label>
              <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputClass} />
            </div>
            <div className="lg:col-span-2">
              <label className={labelClass}>รูปแบบงาน</label>
              <div className="flex items-center gap-6 py-2">
                {["ซ่อม", "เคลม", "ไม่ซ่อม/คืนสินค้า"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input type="radio" name="workType" value={opt} checked={workType === opt} onChange={(e) => setWorkType(e.target.value)} className="w-4 h-4 text-red-600 focus:ring-red-500" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className={labelClass}>Invoice No.</label>
              <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Delivery Note No.</label>
              <input type="text" value={deliveryNoteNo} onChange={(e) => setDeliveryNoteNo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ผู้รับซ่อม (Receiver)</label>
              <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className={inputClass}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ส่งต่อโดย (Forwarded By)</label>
              <input type="text" value={forwardedBy} onChange={(e) => setForwardedBy(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>เบอร์โทรติดต่อ</label>
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Section 2: ข้อมูลลูกค้า */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
              <Users size={18} />
            </div>
            2. ข้อมูลลูกค้า
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6" ref={searchRef}>
            <div className="relative md:col-span-1">
              <label className={labelClass}>ชื่อบริษัท/ลูกค้า</label>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCustomerCompany(e.target.value);
                }}
                className={inputClass} 
                placeholder="พิมพ์เพื่อค้นหาบริษัท..."
              />
              {isSearching && (
                <div className="absolute right-3 top-9">
                  <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {searchResults.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto mt-2 py-2">
                  {searchResults.map((company) => (
                    <li 
                      key={company.id} 
                      onClick={() => handleSelectCompany(company)}
                      className="px-4 py-2 hover:bg-red-50 hover:text-red-600 cursor-pointer text-sm font-medium transition-colors"
                    >
                      {company.companyName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative md:col-span-1" ref={contactSearchRef}>
              <label className={labelClass}>ผู้ติดต่อ (Contact Person)</label>
              <input 
                type="text" 
                value={contactSearchQuery}
                onChange={(e) => {
                  setContactSearchQuery(e.target.value);
                  setSenderName(e.target.value);
                }}
                className={inputClass} 
                placeholder="พิมพ์เพื่อค้นหาผู้ติดต่อ..."
              />
              {isSearchingContact && (
                <div className="absolute right-3 top-9">
                  <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {contactSearchResults.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto mt-2 py-2">
                  {contactSearchResults.map((contact) => (
                    <li 
                      key={contact.id} 
                      onClick={() => handleSelectContact(contact)}
                      className="px-4 py-2 hover:bg-red-50 hover:text-red-600 cursor-pointer text-sm font-medium transition-colors"
                    >
                      <div className="font-bold">{contact.contactName}</div>
                      <div className="text-[10px] text-gray-500">{contact.phone || contact.mobile}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className={labelClass}>ที่อยู่</label>
              <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={inputClass} />
            </div>

            <div className="relative">
              <label className={labelClass}>รหัสไปรษณีย์</label>
              <input type="text" value={postalCode} onChange={(e) => handlePostalCodeChange(e.target.value)} className={inputClass} maxLength={5} />
              {postalOptions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto mt-2 py-2">
                  {postalOptions.map((opt, i) => (
                    <li 
                      key={i} 
                      onClick={() => handlePostalSelect(opt)}
                      className="px-4 py-2 hover:bg-red-50 hover:text-red-600 cursor-pointer text-sm font-medium transition-colors"
                    >
                      {opt.subDistrict} &gt; {opt.district} &gt; {opt.province}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div>
              <label className={labelClass}>แขวง/ตำบล</label>
              <input type="text" value={subDistrict} readOnly className={`${inputClass} bg-gray-100/50`} />
            </div>
            <div>
              <label className={labelClass}>เขต/อำเภอ</label>
              <input type="text" value={district} readOnly className={`${inputClass} bg-gray-100/50`} />
            </div>
            <div>
              <label className={labelClass}>จังหวัด</label>
              <input type="text" value={province} readOnly className={`${inputClass} bg-gray-100/50`} />
            </div>
          </div>
        </div>

        {/* Section 3: รายการสินค้า */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                <Wrench size={18} />
              </div>
              3. รายการสินค้า
            </h2>
            <button type="button" onClick={addItem} className="flex items-center gap-2 text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-xl transition-all shadow-sm">
              <Plus className="w-4 h-4" /> เพิ่มรายการ
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-bold">ลำดับ</th>
                  <th className="px-4 py-3 font-bold min-w-[150px]">ประเภทสินค้า</th>
                  <th className="px-4 py-3 font-bold min-w-[120px]">ยี่ห้อ</th>
                  <th className="px-4 py-3 font-bold min-w-[150px]">รุ่น/โมเดล</th>
                  <th className="px-4 py-3 font-bold min-w-[100px]">ขนาด</th>
                  <th className="px-4 py-3 font-bold min-w-[150px]">Serial No.</th>
                  <th className="px-4 py-3 font-bold w-[80px]">จำนวน</th>
                  <th className="px-4 py-3 font-bold min-w-[150px]">หมายเหตุ</th>
                  <th className="px-4 py-3 font-bold w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-2 text-center font-bold text-gray-400">{index + 1}</td>
                    <td className="px-2 py-2"><input type="text" value={item.type} onChange={(e) => updateItem(item.id, "type", e.target.value)} className={inputClass} placeholder="เช่น Motor, Pump" /></td>
                    <td className="px-2 py-2"><input type="text" value={item.brand} onChange={(e) => updateItem(item.id, "brand", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.model} onChange={(e) => updateItem(item.id, "model", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.size} onChange={(e) => updateItem(item.id, "size", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.serial} onChange={(e) => updateItem(item.id, "serial", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 1)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.remark} onChange={(e) => updateItem(item.id, "remark", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: อาการเสีย + Checklist */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-500 rounded-lg">
              <ClipboardList size={18} />
            </div>
            4. อาการเสียและการตรวจสอบ
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>อาการเสีย (Symptoms)</label>
                <textarea rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className={inputClass}></textarea>
              </div>
              <div>
                <label className={labelClass}>การตั้งค่า (Setting)</label>
                <textarea rows={3} value={settings} onChange={(e) => setSettings(e.target.value)} className={inputClass}></textarea>
              </div>
            </div>
            
            <div>
              <label className={labelClass}>Checklist ก่อนซ่อม</label>
              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                {[
                  { k: "Front", l: "ด้านหน้า/Front" }, { k: "Top", l: "ด้านบน/Top" },
                  { k: "SideLeft", l: "ด้านข้าง(ซ้าย)/Side Left" }, { k: "SideRight", l: "ด้านข้าง(ขวา)/Side Right" },
                  { k: "Inside", l: "ด้านใน/Inside" }, { k: "Nameplate", l: "Nameplate" },
                  { k: "Bottom", l: "ด้านล่าง/Bottom" }, { k: "TerminalNut", l: "Terminal/Nut" },
                  { k: "TermCover", l: "Term.Cover" }, { k: "Cover", l: "ฝาครอบ/Cover" },
                  { k: "Video", l: "Video" }
                ].map(({ k, l }) => (
                  <label key={k} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={checklist[k] || false} onChange={() => toggleChecklist(k)} className="peer w-5 h-5 opacity-0 absolute" />
                      <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:bg-red-500 peer-checked:border-red-500 transition-colors flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <label className={labelClass}>รูปภาพประกอบ (Checklist Images)</label>
            <div className="flex flex-wrap gap-4 items-start mt-3">
              <label className="cursor-pointer border-2 border-dashed border-red-200 hover:border-red-500 hover:bg-red-50 rounded-2xl w-32 h-32 flex flex-col items-center justify-center text-red-400 hover:text-red-600 transition-all">
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">เพิ่มรูปภาพ</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
              </label>

              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative group w-32 h-32 rounded-2xl overflow-hidden shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: ลายเซ็น */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-6 flex items-center gap-3">
            <div className="p-2 bg-pink-50 text-pink-500 rounded-lg">
              <FileSignature size={18} />
            </div>
            5. การส่งมอบและการรับมอบ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center min-h-[200px]">
              <div className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-8">ผู้ส่งซ่อม (ลูกค้า)</div>
              <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="พิมพ์ชื่อผู้ส่งซ่อม" className="w-full max-w-[250px] text-center bg-transparent border-b-2 border-dashed border-gray-300 focus:border-red-500 px-4 py-2 font-medium text-gray-900 outline-none transition-colors" />
            </div>

            <div className="bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center min-h-[200px]">
              <div className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-8">ผู้รับซ่อม (Tera Group)</div>
              <input type="text" value={receiverNameText} onChange={(e) => setReceiverNameText(e.target.value)} placeholder="พิมพ์ชื่อผู้รับซ่อม" className="w-full max-w-[250px] text-center bg-transparent border-b-2 border-dashed border-gray-300 focus:border-red-500 px-4 py-2 font-medium text-gray-900 outline-none transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 px-6 flex justify-between items-center shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
        <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-50">
          ยกเลิก
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSubmit("save")} disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึก
          </button>
          <button type="button" onClick={() => handleSubmit("print")} disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold bg-[#ff2301] text-white rounded-xl hover:bg-[#d61e00] transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            บันทึก + พิมพ์ PDF
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <div className="font-bold text-gray-800">กำลังอัปโหลดรูปภาพ...</div>
          </div>
        </div>
      )}
    </div>
  );
}
