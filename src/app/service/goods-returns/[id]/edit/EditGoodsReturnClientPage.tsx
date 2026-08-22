"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { updateGoodsReturn } from "@/app/actions/goodsReturns";

interface GoodsReturnItem {
  no: number;
  itemCode: string;
  description: string;
  model: string;
  serialNumber: string;
  quantity: number;
  unit: string;
  totalAmount: number;
}

export default function EditGoodsReturnClientPage({ companies, jobs, quotations, currentUser, initialGoodsReturn }: { companies: any[], jobs: any[], quotations: any[], currentUser: any, initialGoodsReturn: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' });
  
  const [formData, setFormData] = useState({
    date: initialGoodsReturn?.date ? new Date(initialGoodsReturn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    customer: initialGoodsReturn?.customer || "",
    deliveryLocation: initialGoodsReturn?.deliveryLocation || "",
    reference: initialGoodsReturn?.reference || "",
    returnType: initialGoodsReturn?.returnType || "RETURN_TO_CUSTOMER",
    receiverName: initialGoodsReturn?.receiverName || "",
    receiverDate: initialGoodsReturn?.receiverDate ? new Date(initialGoodsReturn.receiverDate).toISOString().split('T')[0] : "",
    senderName: initialGoodsReturn?.senderName || currentUser?.fullName || "",
    senderDate: initialGoodsReturn?.senderDate ? new Date(initialGoodsReturn.senderDate).toISOString().split('T')[0] : "",
    companyId: initialGoodsReturn?.companyId || "",
    jobId: initialGoodsReturn?.jobId || "",
    quotationId: initialGoodsReturn?.quotationId || "",
  });

  const parsedItems = initialGoodsReturn?.items ? (typeof initialGoodsReturn.items === 'string' ? JSON.parse(initialGoodsReturn.items) : initialGoodsReturn.items) : [{ no: 1, itemCode: "", description: "", model: "", serialNumber: "", quantity: 1, unit: "", totalAmount: 0 }];

  const [items, setItems] = useState<GoodsReturnItem[]>(parsedItems);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const initialCompany = companies.find((c: any) => c.id === formData.companyId);
  const [companySearch, setCompanySearch] = useState(initialCompany ? initialCompany.companyName : "");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const filteredCompanies = companies.filter(c =>
    c.companyName.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    setFormData(prev => ({
      ...prev,
      companyId,
      customer: company ? company.companyName : prev.customer,
      deliveryLocation: company ? company.address || "" : prev.deliveryLocation,
    }));
    setCompanySearch(company ? company.companyName : "");
    setShowCompanyDropdown(false);
  };

  const initialJob = jobs.find((j: any) => j.id === formData.jobId);
  const [jobSearch, setJobSearch] = useState(initialJob ? `${initialJob.jobNumber} - ${initialJob.item || ""}` : "");
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const filteredJobs = jobs.filter(j =>
    (j.jobNumber && j.jobNumber.toLowerCase().includes(jobSearch.toLowerCase())) ||
    (j.item && j.item.toLowerCase().includes(jobSearch.toLowerCase()))
  );

  const selectJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    setFormData(prev => ({
      ...prev,
      jobId
    }));
    setJobSearch(job ? `${job.jobNumber} - ${job.item || ""}` : "");
    setShowJobDropdown(false);
  };

  const initialQuotation = quotations.find((q: any) => q.id === formData.quotationId);
  const [quotationSearch, setQuotationSearch] = useState(initialQuotation ? `${initialQuotation.quotationNumber} - ${initialQuotation.subject || ""}` : "");
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);

  const filteredQuotations = quotations.filter(q =>
    (q.quotationNumber && q.quotationNumber.toLowerCase().includes(quotationSearch.toLowerCase())) ||
    (q.subject && q.subject.toLowerCase().includes(quotationSearch.toLowerCase()))
  );

  const selectQuotation = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === quotationId);
    setFormData(prev => ({
      ...prev,
      quotationId
    }));
    setQuotationSearch(quotation ? `${quotation.quotationNumber} - ${quotation.subject || ""}` : "");
    setShowQuotationDropdown(false);
  };

  const handleItemChange = (index: number, field: keyof GoodsReturnItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { no: items.length + 1, itemCode: "", description: "", model: "", serialNumber: "", quantity: 1, unit: "", totalAmount: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.map((item, i) => ({ ...item, no: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      items: JSON.stringify(items),
    };

    const res = await updateGoodsReturn(initialGoodsReturn.id, payload);

    if (res.success) {
      setModalConfig({ show: true, type: 'success', message: 'แก้ไขใบส่งคืนสินค้าสำเร็จ' });
    } else {
      setModalConfig({ show: true, type: 'error', message: "เกิดข้อผิดพลาด: " + res.error });
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แก้ไขใบส่งคืนสินค้า</h1>
          <p className="text-gray-500 text-sm">อัปเดตข้อมูลใบส่งคืนสินค้า {initialGoodsReturn?.documentNo}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ข้อมูลทั่วไป</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ (Date)</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทการคืน (Return Type)</label>
              <select
                name="returnType"
                value={formData.returnType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              >
                <option value="RETURN_TO_CUSTOMER">คืนลูกค้า (Return to Customer)</option>
                <option value="RETURN_WITHOUT_REPAIR">คืนโดยไม่ซ่อม (Return Without Repair)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลือกลูกค้า (จากระบบ)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาหรือพิมพ์ชื่อลูกค้า..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
                />
                {showCompanyDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map(c => (
                        <div
                          key={c.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                          onMouseDown={() => selectCompany(c.id)}
                        >
                          {c.companyName}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">ไม่พบรายชื่อลูกค้า</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ลูกค้า (พิมพ์ระบุเองได้)</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="ชื่อลูกค้า"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่ส่งของ</label>
              <input
                type="text"
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                placeholder="ที่อยู่จัดส่ง"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อ้างถึง Job (ไม่บังคับ)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหา Job Number หรือชื่อสินค้า..."
                  value={jobSearch}
                  onChange={(e) => {
                    setJobSearch(e.target.value);
                    if (e.target.value === "") {
                      setFormData(prev => ({ ...prev, jobId: "" }));
                    }
                    setShowJobDropdown(true);
                  }}
                  onFocus={() => setShowJobDropdown(true)}
                  onBlur={() => setTimeout(() => setShowJobDropdown(false), 200)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
                />
                {showJobDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredJobs.length > 0 ? (
                      filteredJobs.map(j => (
                        <div
                          key={j.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                          onMouseDown={() => selectJob(j.id)}
                        >
                          {j.jobNumber} - {j.item}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">ไม่พบข้อมูล Job</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อ้างถึง Quotation/PO (ไม่บังคับ)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่หรือชื่อโครงการ..."
                  value={quotationSearch}
                  onChange={(e) => {
                    setQuotationSearch(e.target.value);
                    if (e.target.value === "") {
                      setFormData(prev => ({ ...prev, quotationId: "" }));
                    }
                    setShowQuotationDropdown(true);
                  }}
                  onFocus={() => setShowQuotationDropdown(true)}
                  onBlur={() => setTimeout(() => setShowQuotationDropdown(false), 200)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
                />
                {showQuotationDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredQuotations.length > 0 ? (
                      filteredQuotations.map(q => (
                        <div
                          key={q.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                          onMouseDown={() => selectQuotation(q.id)}
                        >
                          {q.quotationNumber} - {q.subject}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">ไม่พบข้อมูล Quotation/PO</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">อ้างถึง (พิมพ์ระบุเพิ่มเติม)</label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">รายการสินค้า</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <Plus size={16} />
              เพิ่มรายการ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium w-12 text-center">No.</th>
                  <th className="px-4 py-2 font-medium w-40">รหัสสินค้า</th>
                  <th className="px-4 py-2 font-medium min-w-[180px]">รายละเอียด</th>
                  <th className="px-4 py-2 font-medium w-36">Model</th>
                  <th className="px-4 py-2 font-medium w-36">S/N</th>
                  <th className="px-4 py-2 font-medium w-20">จำนวน</th>
                  <th className="px-4 py-2 font-medium w-20">หน่วย</th>
                  <th className="px-4 py-2 font-medium w-28">มูลค่ารวม</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-center">{item.no}</td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) => handleItemChange(index, "itemCode", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Model"
                        value={item.model || ""}
                        onChange={(e) => handleItemChange(index, "model", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="S/N"
                        value={item.serialNumber || ""}
                        onChange={(e) => handleItemChange(index, "serialNumber", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.totalAmount}
                        onChange={(e) => handleItemChange(index, "totalAmount", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded focus:border-[#ff2301] focus:ring-1 focus:ring-red-100 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-400">ยังไม่มีรายการ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ข้อมูลการเซ็น (สำหรับออกเอกสาร)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้รับสินค้า</label>
              <input
                type="text"
                name="receiverName"
                value={formData.receiverName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับสินค้า</label>
              <input
                type="date"
                name="receiverDate"
                value={formData.receiverDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ส่งสินค้า</label>
              <input
                type="text"
                name="senderName"
                value={formData.senderName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ส่งสินค้า</label>
              <input
                type="date"
                name="senderDate"
                value={formData.senderDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#ff2301]"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#ff2301] text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </form>

      {/* Modal */}
      {modalConfig.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center transform transition-all">
            {modalConfig.type === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {modalConfig.type === 'success' ? 'สำเร็จ!' : 'ข้อผิดพลาด'}
            </h3>
            <p className="text-gray-500 mb-6">{modalConfig.message}</p>
            <button
              onClick={() => {
                setModalConfig({ ...modalConfig, show: false });
                if (modalConfig.type === 'success') {
                  router.push("/service/goods-returns");
                }
              }}
              className={`w-full py-3 rounded-xl font-medium text-white transition-colors ${
                modalConfig.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-[#ff2301] hover:bg-red-700'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
