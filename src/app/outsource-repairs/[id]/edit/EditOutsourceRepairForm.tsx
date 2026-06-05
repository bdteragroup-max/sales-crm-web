"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Trash2, Search, Save, Loader2, FileSignature } from "lucide-react";
import { updateOutsourceRepair } from "@/app/actions/outsourceRepairs";
import { searchCompanies } from "@/app/actions/sales";

interface UserOption {
  id: string;
  name: string;
  position: string;
}

export default function EditOutsourceRepairForm({ users, currentUserId, initialData }: { users: UserOption[], currentUserId: string, initialData: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vendor State (Supplier)
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [isVendorSearching, setIsVendorSearching] = useState(false);
  const [vendorSearchResults, setVendorSearchResults] = useState<any[]>([]);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  
  const [vendorName, setVendorName] = useState(initialData?.vendorName || "");
  const [vendorAddress, setVendorAddress] = useState(initialData?.vendorAddress || "");
  const [vendorPhone, setVendorPhone] = useState(initialData?.vendorPhone || "");

  // Customer State
  const [customerName, setCustomerName] = useState(initialData?.customerName || "");
  const [customerAddress, setCustomerAddress] = useState(initialData?.customerAddress || "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || "");

  // Job search (Optional)
  const [jobId, setJobId] = useState(initialData?.jobId || "");
  const [outsourceNumber, setOutsourceNumber] = useState(initialData?.outsourceNumber || "");
  
  const formatDate = (isoStr: string) => isoStr ? new Date(isoStr).toISOString().split("T")[0] : "";
  const [sentDate, setSentDate] = useState(formatDate(initialData?.sentDate) || new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState(formatDate(initialData?.expectedReturnDate) || "");
  const [senderName, setSenderName] = useState(initialData?.sender || "");
  const [status, setStatus] = useState(initialData?.status || "SENT");

  // Items State
  const [items, setItems] = useState<any[]>(initialData?.items && initialData.items.length > 0 ? initialData.items : [
    { id: crypto.randomUUID(), type: "", brand: "", model: "", size: "", serial: "", qty: 1, remark: "" },
  ]);

  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "");
  const [settings, setSettings] = useState(initialData?.settings || "");
  const [remark, setRemark] = useState(initialData?.remark || "");

  useEffect(() => {
    const u = users.find(u => u.id === currentUserId);
    if (u && !senderName) {
      setSenderName(u.name);
    }
  }, [currentUserId, users, senderName]);

  // Handle Vendor Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (vendorSearchQuery.length >= 2) {
        setIsVendorSearching(true);
        const results = await searchCompanies(vendorSearchQuery);
        setVendorSearchResults(results);
        setIsVendorSearching(false);
      } else {
        setVendorSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [vendorSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setVendorSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectVendor = (company: any) => {
    setVendorName(company.companyName || "");
    const addressStr = `${company.address || ""} ${company.subDistrict || ""} ${company.district || ""} ${company.province || ""} ${company.postalCode || ""}`.trim();
    setVendorAddress(addressStr);
    setVendorPhone(""); // Companies table might not have phone easily accessible here, leave blank
    setVendorSearchQuery(company.companyName || "");
    setVendorSearchResults([]);
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

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // Submit
  const handleSubmit = async (action: "save" | "print") => {
    setIsSubmitting(true);
    try {
      const formData = {
        outsourceNumber,
        jobId: jobId || null,
        vendorName,
        vendorAddress,
        vendorPhone,
        customerName,
        customerAddress,
        customerPhone,
        sentDate,
        expectedReturnDate,
        items: items.map(i => ({
          type: i.type, brand: i.brand, model: i.model, size: i.size, serial: i.serial, qty: i.qty, remark: i.remark
        })),
        symptoms,
        settings,
        remark,
        sender: senderName,
        status: status,
      };

      const result = await updateOutsourceRepair(initialData.id, formData);

      if (result.success) {
        if (action === "print") {
          router.push(`/outsource-repairs/${initialData.id}/pdf`);
        } else {
          router.push("/outsource-repairs");
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

  const sectionHeaderClass = "flex items-center gap-2 pb-2 mb-4 border-b-2 border-red-500 font-semibold text-lg text-gray-800";
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-red-500 focus:border-red-500 bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
      <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
        <div className="flex items-center gap-2 text-white">
          <Wrench className="h-6 w-6" />
          <h1 className="text-xl font-bold">สร้างใบส่งซ่อมภายนอก</h1>
        </div>
      </div>

      <div className="p-6 space-y-8 pb-32">
        {/* Section 1: ข้อมูลเอกสาร */}
        <section>
          <div className={sectionHeaderClass}>1. ข้อมูลเอกสาร</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>เลขที่เอกสาร (ถ้ามี)</label>
              <input type="text" value={outsourceNumber} onChange={(e) => setOutsourceNumber(e.target.value)} className={inputClass} placeholder="เช่น EXT-2405-001" />
            </div>
            <div>
              <label className={labelClass}>วันที่ส่งซ่อม</label>
              <input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>วันที่คาดว่าจะเสร็จ</label>
              <input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ผู้ส่งซ่อม</label>
              <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Section 2: ข้อมูลผู้รับซ่อม (ซัพพลายเออร์) */}
        <section>
          <div className={sectionHeaderClass}>2. ข้อมูลผู้รับซ่อม (ซัพพลายเออร์)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={vendorSearchRef}>
            <div className="relative">
              <label className={labelClass}>ชื่อบริษัท/ซัพพลายเออร์</label>
              <input 
                type="text" 
                value={vendorSearchQuery}
                onChange={(e) => {
                  setVendorSearchQuery(e.target.value);
                  setVendorName(e.target.value);
                }}
                className={inputClass} 
                placeholder="พิมพ์เพื่อค้นหา..."
              />
              {isVendorSearching && (
                <div className="absolute right-3 top-9">
                  <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {vendorSearchResults.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                  {vendorSearchResults.map((company) => (
                    <li 
                      key={company.id} 
                      onClick={() => handleSelectVendor(company)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {company.companyName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className={labelClass}>เบอร์โทรติดต่อ</label>
              <input type="text" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>ที่อยู่</label>
              <input type="text" value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Section 3: ข้อมูลลูกค้า (เจ้าของเครื่อง) */}
        <section>
          <div className={sectionHeaderClass}>3. ข้อมูลลูกค้า (เจ้าของเครื่อง)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ชื่อลูกค้า / บริษัท</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>เบอร์โทรติดต่อ</label>
              <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>ที่อยู่</label>
              <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Section 4: รายการสินค้า */}
        <section>
          <div className="flex justify-between items-center pb-2 mb-4 border-b-2 border-red-500">
            <div className="flex items-center gap-2 font-semibold text-lg text-gray-800">
              4. รายการสินค้า
            </div>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md font-medium transition-colors">
              <Plus className="w-4 h-4" /> เพิ่มรายการ
            </button>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">ลำดับ</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">ประเภทสินค้า</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">ยี่ห้อ</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">รุ่น/โมเดล</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[100px]">ขนาด</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Serial No.</th>
                  <th className="px-4 py-3 whitespace-nowrap w-[80px]">จำนวน</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">หมายเหตุ</th>
                  <th className="px-4 py-3 whitespace-nowrap w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b bg-white">
                    <td className="px-4 py-2 text-center">{index + 1}</td>
                    <td className="px-2 py-2"><input type="text" value={item.type} onChange={(e) => updateItem(item.id, "type", e.target.value)} className={inputClass} placeholder="เช่น Motor, Pump" /></td>
                    <td className="px-2 py-2"><input type="text" value={item.brand} onChange={(e) => updateItem(item.id, "brand", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.model} onChange={(e) => updateItem(item.id, "model", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.size} onChange={(e) => updateItem(item.id, "size", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.serial} onChange={(e) => updateItem(item.id, "serial", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 1)} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="text" value={item.remark} onChange={(e) => updateItem(item.id, "remark", e.target.value)} className={inputClass} /></td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="text-gray-400 hover:text-red-500 disabled:opacity-30">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: รายละเอียดเพิ่มเติม */}
        <section>
          <div className={sectionHeaderClass}>5. รายละเอียดเพิ่มเติม</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>อาการเสีย</label>
              <textarea rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className={inputClass}></textarea>
            </div>
            <div>
              <label className={labelClass}>การตั้งค่า / ข้อมูลอื่นๆ</label>
              <textarea rows={3} value={settings} onChange={(e) => setSettings(e.target.value)} className={inputClass}></textarea>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>หมายเหตุ</label>
              <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} className={inputClass}></textarea>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky Action Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 px-6 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          ← ยกเลิก
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSubmit("save")} disabled={isSubmitting} className="px-6 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึก
          </button>
          <button type="button" onClick={() => handleSubmit("print")} disabled={isSubmitting} className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-200 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            บันทึก + พิมพ์ PDF
          </button>
        </div>
      </div>
    </div>
  );
}
