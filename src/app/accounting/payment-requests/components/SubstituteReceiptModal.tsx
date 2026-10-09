"use client";

import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  SubstituteReceiptData,
  SubstituteReceiptLineItem,
  formatThaiBuddhistDate,
  parseDescriptionQtyAndPrice,
  uploadSubstituteReceiptPdf,
  generateSubstituteReceiptPdfBlob,
  getSubstituteCertificateFileName,
} from './SubstituteReceiptCertificate';
import SubstituteReceiptCertificateView from './SubstituteReceiptCertificate';
import {
  X,
  Printer,
  Download,
  Check,
  RefreshCw,
  FileText,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Info,
  PenLine,
  Eraser,
  Trash2,
  Upload,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import Swal from 'sweetalert2';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialData: SubstituteReceiptData;
  onSaveAndAttach?: (
    updatedData: SubstituteReceiptData,
    attachment: {
      url: string;
      fileName: string;
      fileSize: number;
      dataUrl?: string;
    }
  ) => void;
};

export default function SubstituteReceiptModal({
  isOpen,
  onClose,
  initialData,
  onSaveAndAttach,
}: Props) {
  const [formData, setFormData] = useState<SubstituteReceiptData>(initialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [activeSigTab, setActiveSigTab] = useState<'requester' | 'approver'>('requester');
  const [useSameSignature, setUseSameSignature] = useState<boolean>(true);
  const [hasLoadedSavedSig, setHasLoadedSavedSig] = useState<boolean>(false);

  const sigPadRequester = useRef<SignatureCanvas | null>(null);
  const sigPadApprover = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 1. Look up cached signatures from localStorage for zero-touch auto-filling
      let cachedRequester = initialData.requesterSignatureUrl;
      let cachedApprover = initialData.approverSignatureUrl;
      let loadedFromStorage = false;

      if (typeof window !== 'undefined') {
        if (!cachedRequester && initialData.requesterName) {
          const stored = localStorage.getItem(`crm_saved_signature_${initialData.requesterName}`);
          if (stored) {
            cachedRequester = stored;
            loadedFromStorage = true;
          }
        }
        if (!cachedApprover && initialData.approverName) {
          const storedSup = localStorage.getItem(`crm_saved_signature_${initialData.approverName}`);
          if (storedSup) {
            cachedApprover = storedSup;
            loadedFromStorage = true;
          }
        }
      }

      setHasLoadedSavedSig(loadedFromStorage);

      if (initialData.items && initialData.items.length > 0) {
        const lineItems = initialData.items.map((it) => {
          const parsed = parseDescriptionQtyAndPrice(it.description || '', it.amount);
          return {
            ...it,
            quantity: it.quantity !== undefined && it.quantity > 0 ? it.quantity : parsed.quantity,
            unitPrice: it.unitPrice !== undefined && it.unitPrice > 0 ? it.unitPrice : parsed.unitPrice,
            amount: Number(it.amount) || 0,
          };
        });
        const total = lineItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
        setFormData({
          ...initialData,
          items: lineItems,
          amount: total,
          startDate: initialData.startDate || initialData.billDate,
          endDate: initialData.endDate || initialData.billDate,
          companyName: initialData.companyName || 'บจก.เทอรา กรุ้ป',
          companyCode: initialData.companyCode || (initialData.companyName?.includes('อิเล็กทริค') ? 'TE' : initialData.companyName?.includes('พาวเวอร์') ? 'TP' : 'TG'),
          approverName: initialData.approverName || '',
          approverPosition: initialData.approverPosition || 'หัวหน้างาน',
          requesterSignatureUrl: cachedRequester,
          approverSignatureUrl: cachedApprover,
        });
      } else {
        const parsed = parseDescriptionQtyAndPrice(initialData.description || '', initialData.amount);
        setFormData({
          ...initialData,
          quantity: initialData.quantity !== undefined && initialData.quantity > 0 ? initialData.quantity : parsed.quantity,
          unitPrice: initialData.unitPrice !== undefined && initialData.unitPrice > 0 ? initialData.unitPrice : parsed.unitPrice,
          startDate: initialData.startDate || initialData.billDate,
          endDate: initialData.endDate || initialData.billDate,
          companyName: initialData.companyName || 'บจก.เทอรา กรุ้ป',
          companyCode: initialData.companyCode || (initialData.companyName?.includes('อิเล็กทริค') ? 'TE' : initialData.companyName?.includes('พาวเวอร์') ? 'TP' : 'TG'),
          approverName: initialData.approverName || '',
          approverPosition: initialData.approverPosition || 'หัวหน้างาน',
          requesterSignatureUrl: cachedRequester,
          approverSignatureUrl: cachedApprover,
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Handle changes in form inputs
  const handleChange = (field: keyof SubstituteReceiptData, val: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      // If quantity or unit price changes, auto-update total amount
      if (field === 'quantity') {
        const q = Number(val) || 1;
        const u = Number(updated.unitPrice) || 0;
        updated.amount = Math.round(q * u * 100) / 100;
      } else if (field === 'unitPrice') {
        const q = Number(updated.quantity) || 1;
        const u = Number(val) || 0;
        updated.amount = Math.round(q * u * 100) / 100;
      } else if (field === 'amount') {
        const total = Number(val) || 0;
        const q = Number(updated.quantity) || 1;
        if (q > 0) {
          updated.unitPrice = Math.round((total / q) * 100) / 100;
        }
      }
      return updated;
    });
  };

  // Handle changes to a specific item when multiple items are combined
  const handleLineItemChange = (idx: number, field: keyof SubstituteReceiptLineItem, val: any) => {
    setFormData((prev) => {
      const items = prev.items ? [...prev.items] : [];
      if (!items[idx]) return prev;
      const current = { ...items[idx], [field]: val };

      if (field === 'quantity') {
        const q = Number(val) || 1;
        const u = Number(current.unitPrice) || 0;
        current.amount = Math.round(q * u * 100) / 100;
      } else if (field === 'unitPrice') {
        const q = Number(current.quantity) || 1;
        const u = Number(val) || 0;
        current.amount = Math.round(q * u * 100) / 100;
      } else if (field === 'amount') {
        const total = Number(val) || 0;
        const q = Number(current.quantity) || 1;
        if (q > 0) {
          current.unitPrice = Math.round((total / q) * 100) / 100;
        }
      }
      items[idx] = current;
      const totalAmount = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      const desc = items.map((it) => it.description).filter(Boolean).join(', ');

      return {
        ...prev,
        items,
        amount: totalAmount,
        description: desc || prev.description,
      };
    });
  };

  const persistSignaturesToStorage = (data: SubstituteReceiptData) => {
    if (typeof window === 'undefined') return;
    try {
      if (data.requesterSignatureUrl && data.requesterName) {
        localStorage.setItem(`crm_saved_signature_${data.requesterName}`, data.requesterSignatureUrl);
      }
      if (data.approverSignatureUrl && data.approverName) {
        localStorage.setItem(`crm_saved_signature_${data.approverName}`, data.approverSignatureUrl);
      }
    } catch {}
  };

  const handleRequesterEndStroke = () => {
    if (sigPadRequester.current && !sigPadRequester.current.isEmpty()) {
      const dataUrl = sigPadRequester.current.getTrimmedCanvas().toDataURL('image/png');
      setFormData((prev) => ({
        ...prev,
        requesterSignatureUrl: dataUrl,
        approverSignatureUrl: useSameSignature ? dataUrl : prev.approverSignatureUrl,
      }));
    }
  };

  const handleApproverEndStroke = () => {
    if (sigPadApprover.current && !sigPadApprover.current.isEmpty()) {
      const dataUrl = sigPadApprover.current.getTrimmedCanvas().toDataURL('image/png');
      setFormData((prev) => ({ ...prev, approverSignatureUrl: dataUrl }));
    }
  };

  const handleRequesterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          requesterSignatureUrl: dataUrl,
          approverSignatureUrl: useSameSignature ? dataUrl : prev.approverSignatureUrl,
        }));
        sigPadRequester.current?.clear();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApproverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setFormData((prev) => ({ ...prev, approverSignatureUrl: dataUrl }));
        sigPadApprover.current?.clear();
      };
      reader.readAsDataURL(file);
    }
  };

  const prepareDataForPdf = (): SubstituteReceiptData => {
    const data = { ...formData };
    if (sigPadRequester.current && !sigPadRequester.current.isEmpty()) {
      data.requesterSignatureUrl = sigPadRequester.current.getTrimmedCanvas().toDataURL('image/png');
    }
    if (sigPadApprover.current && !sigPadApprover.current.isEmpty()) {
      data.approverSignatureUrl = sigPadApprover.current.getTrimmedCanvas().toDataURL('image/png');
    }
    if (useSameSignature && data.requesterSignatureUrl && !data.approverSignatureUrl) {
      data.approverSignatureUrl = data.requesterSignatureUrl;
    }
    return data;
  };

  // Direct print via invisible iframe
  const handlePrint = async () => {
    setIsGenerating(true);
    setGeneratingStatus('กำลังจัดเตรียมไฟล์ PDF สำหรับพิมพ์...');
    try {
      const dataToExport = prepareDataForPdf();
      setFormData(dataToExport);
      persistSignaturesToStorage(dataToExport);
      const { blob } = await generateSubstituteReceiptPdfBlob(dataToExport);
      const blobUrl = URL.createObjectURL(blob);
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.src = blobUrl;
      document.body.appendChild(printFrame);

      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            window.open(blobUrl, '_blank');
          }
        }, 300);
      };
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'ไม่สามารถพิมพ์ได้',
        text: err.message || 'เกิดข้อผิดพลาดในการประมวลผล PDF',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsGenerating(false);
      setGeneratingStatus('');
    }
  };

  // Direct PDF download
  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setGeneratingStatus('กำลังเรนเดอร์ PDF คุณภาพสูง...');
    try {
      const dataToExport = prepareDataForPdf();
      setFormData(dataToExport);
      persistSignaturesToStorage(dataToExport);
      const { blob, fileName } = await generateSubstituteReceiptPdfBlob(dataToExport);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'ดาวน์โหลดไม่สำเร็จ',
        text: err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด PDF',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsGenerating(false);
      setGeneratingStatus('');
    }
  };

  // Save & Attach to form
  const handleSaveAndAttach = async () => {
    setIsGenerating(true);
    setGeneratingStatus('กำลังสร้างเอกสาร PDF และแนบลงในระบบ...');
    try {
      const dataToSave = prepareDataForPdf();
      setFormData(dataToSave);
      persistSignaturesToStorage(dataToSave);
      const result = await uploadSubstituteReceiptPdf(dataToSave);
      if (onSaveAndAttach) {
        onSaveAndAttach(dataToSave, result);
      }
      Swal.fire({
        title: 'แนบใบรับรองแทนสำเร็จ!',
        text: `ไฟล์ "${result.fileName}" ถูกแนบลงในเอกสารแล้ว`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถแนบเอกสารได้',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsGenerating(false);
      setGeneratingStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-red-50 via-white to-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                ใบรับรองแทนใบเสร็จรับเงิน (CERTIFICATION OF PAYMENT)
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                  แบบ บก.111
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                เอกสารแนบประกอบการเบิกจ่ายเงินทดแทนกรณีไม่สามารถเรียกเก็บใบเสร็จรับเงินจากผู้ขายได้
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50/50">
          {/* Left Column: Form Editors */}
          <div className="lg:col-span-5 space-y-4">
            {formData.items && formData.items.length > 1 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">รวมเอกสาร {formData.items.length} รายการใน PDF เดียวกัน</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    เนื่องจากเป็นผู้จำหน่ายเดียวกัน (<b>{formData.supplierName || 'ร้านค้าเดียวกัน'}</b>) และวันที่เดียวกัน (<b>{formatThaiBuddhistDate(formData.billDate)}</b>) ระบบจึงรวมลงในใบรับรองฉบับเดียวตามระเบียบ
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">
                <Building2 className="w-4 h-4 text-red-600" />
                <span>ข้อมูลร้านค้าและรายการสินค้า</span>
              </div>

              {/* Bill Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  วันที่บิล / วันที่จ่ายเงิน *
                </label>
                <input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => handleChange('billDate', e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ชื่อกิจการ / ร้านค้าผู้รับเงิน *
                </label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => handleChange('supplierName', e.target.value)}
                  placeholder="เช่น โรงแรมภูฟ้ารีสอร์ท, ร้านป้าสมศรี, วินมอเตอร์ไซค์"
                  className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white font-medium"
                />
              </div>

              {formData.items && formData.items.length > 1 ? (
                /* Multiple items in certificate */
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>รายการสินค้าในใบรับรอง ({formData.items.length} รายการ)</span>
                    <span className="text-[11px] text-gray-500 font-normal">แก้ไขรายละเอียดแต่ละแถวได้</span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {formData.items.map((it, itemIdx) => (
                      <div
                        key={it.id || itemIdx}
                        className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 hover:bg-gray-50 transition space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-gray-700">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] flex items-center justify-center font-bold">
                              {itemIdx + 1}
                            </span>
                            <span>รายการที่ {itemIdx + 1}</span>
                          </span>
                          <span className="font-mono text-red-700 font-bold">
                            {(Number(it.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </span>
                        </div>

                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleLineItemChange(itemIdx, 'description', e.target.value)}
                          placeholder="ชื่อรายการสินค้า / บริการ"
                          className="w-full text-xs rounded border border-gray-300 py-1 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">จำนวน</label>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity || 1}
                              onChange={(e) => handleLineItemChange(itemIdx, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="w-full text-xs text-center font-mono rounded border border-gray-300 py-1 px-1 focus:ring-1 focus:ring-red-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">ราคา/หน่วย (฿)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={it.unitPrice || 0}
                              onChange={(e) => handleLineItemChange(itemIdx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs text-right font-mono rounded border border-gray-300 py-1 px-1 focus:ring-1 focus:ring-red-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-700 font-medium mb-0.5">รวมเงิน (฿)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={it.amount || 0}
                              onChange={(e) => handleLineItemChange(itemIdx, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs text-right font-mono font-bold text-red-700 rounded border border-red-300 py-1 px-1 focus:ring-1 focus:ring-red-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combined Grand Total Display */}
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 flex items-center justify-between text-xs mt-2">
                    <span className="font-bold text-red-900">ยอดรวมทั้งสิ้น ({formData.items.length} รายการ):</span>
                    <span className="font-bold font-mono text-sm text-red-700">
                      {formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                </div>
              ) : (
                /* Single Item Form */
                <>
                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      รายการสินค้า / บริการ *
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="เช่น ค่าห้องพัก 3 ห้อง, ค่าโดยสารรถรับจ้าง"
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>

                  {/* Qty, Unit Price & Total */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        จำนวน
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity || 1}
                        onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs text-center font-mono rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        ราคาต่อหน่วย (฿)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.unitPrice || 0}
                        onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs text-right font-mono rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-red-700 mb-1">
                        รวมเงิน (฿) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount || 0}
                        onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs text-right font-mono font-bold rounded-lg border border-red-300 bg-red-50/50 py-1.5 px-2 text-red-900 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Requester & Approver & Company Details */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">
                <User className="w-4 h-4 text-red-600" />
                <span>ข้อมูลผู้เบิกจ่าย หัวหน้างาน และต้นสังกัด</span>
              </div>

              {/* Requester Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ชื่อผู้เบิกจ่าย *
                  </label>
                  <input
                    type="text"
                    value={formData.requesterName}
                    onChange={(e) => handleChange('requesterName', e.target.value)}
                    placeholder="เช่น นายพลพล พิศเพิ่ง"
                    className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ตำแหน่งผู้เบิกจ่าย
                  </label>
                  <input
                    type="text"
                    value={formData.requesterPosition || ''}
                    onChange={(e) => handleChange('requesterPosition', e.target.value)}
                    placeholder="เช่น ช่าง, พนักงานขาย, วิศวกร"
                    className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white"
                  />
                </div>
              </div>

              {/* Approver Details (Supervisor) */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                    <span>ชื่อผู้อนุมัติ (หัวหน้างาน) *</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                      หัวหน้างาน
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.approverName || ''}
                    onChange={(e) => handleChange('approverName', e.target.value)}
                    placeholder="เช่น นายวิชัย สมบูรณ์ (หัวหน้างาน)"
                    className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ตำแหน่งผู้อนุมัติ
                  </label>
                  <input
                    type="text"
                    value={formData.approverPosition || ''}
                    onChange={(e) => handleChange('approverPosition', e.target.value)}
                    placeholder="เช่น หัวหน้างาน, ผู้จัดการ"
                    className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white"
                  />
                </div>
              </div>

              {/* Company Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  เบิกจ่ายในงานของทาง (ชื่อบริษัท) *
                </label>
                <select
                  value={formData.companyName}
                  onChange={(e) => {
                    const compName = e.target.value;
                    let code: 'TG' | 'TE' | 'TP' = 'TG';
                    if (compName.includes('อิเล็กทริค')) code = 'TE';
                    else if (compName.includes('พาวเวอร์') || compName.includes('เพาเวอร์')) code = 'TP';
                    setFormData((prev) => ({
                      ...prev,
                      companyName: compName,
                      companyCode: code,
                    }));
                  }}
                  className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-1 focus:ring-red-500 bg-white font-medium"
                >
                  <option value="บจก.เทอรา กรุ้ป">บจก.เทอรา กรุ้ป (Tera Group - TG)</option>
                  <option value="บจก.เทอรา อิเล็กทริค">บจก.เทอรา อิเล็กทริค (Tera Electric - TE)</option>
                  <option value="บจก.เทอรา พาวเวอร์">บจก.เทอรา พาวเวอร์ (Tera Power - TP)</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    ตั้งแต่วันที่
                  </label>
                  <input
                    type="date"
                    value={formData.startDate || formData.billDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    ถึงวันที่
                  </label>
                  <input
                    type="date"
                    value={formData.endDate || formData.billDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                  <PenLine className="w-4 h-4 text-red-600" />
                  <span>ลายมือชื่อในเอกสาร (แนบ / วาดลายเซ็น)</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveSigTab('requester')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                      activeSigTab === 'requester'
                        ? 'bg-white text-gray-900 shadow-2xs font-bold'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>ผู้เบิกจ่าย</span>
                    {formData.requesterSignatureUrl && (
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSigTab('approver')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                      activeSigTab === 'approver'
                        ? 'bg-white text-gray-900 shadow-2xs font-bold'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>ผู้อนุมัติ (หัวหน้างาน)</span>
                    {formData.approverSignatureUrl && (
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign Once Quick-Sync Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl p-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-amber-950">
                  <input
                    type="checkbox"
                    checked={useSameSignature}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseSameSignature(checked);
                      if (checked && formData.requesterSignatureUrl) {
                        setFormData((prev) => ({
                          ...prev,
                          approverSignatureUrl: prev.requesterSignatureUrl,
                        }));
                      }
                    }}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                  />
                  <span>เซ็นครั้งเดียว ใช้ทั้ง 2 ช่อง (ผู้เบิกจ่าย + ผู้อนุมัติ)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {hasLoadedSavedSig && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ดึงลายเซ็นเดิมให้อัตโนมัติ
                    </span>
                  )}
                  {useSameSignature && (
                    <span className="text-[10px] text-amber-800 bg-amber-200/80 font-bold px-2 py-0.5 rounded-full">
                      ซิงค์อัตโนมัติ
                    </span>
                  )}
                </div>
              </div>

              {activeSigTab === 'requester' ? (
                /* Requester Signature Tab */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">
                      ลายมือชื่อผู้เบิกจ่ายเงิน: <span className="text-gray-900 font-bold">{formData.requesterName || 'พนักงาน'}</span>
                    </span>
                    {formData.requesterSignatureUrl ? (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> มีลายเซ็นแล้ว
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        วาดหรืออัปโหลดลายเซ็น
                      </span>
                    )}
                  </div>

                  {formData.requesterSignatureUrl ? (
                    <div className="relative border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 flex flex-col items-center justify-center">
                      <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-center w-full max-w-[280px] h-[90px] shadow-2xs">
                        <img
                          src={formData.requesterSignatureUrl}
                          alt="Requester Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-100 w-full justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                approverSignatureUrl: prev.requesterSignatureUrl,
                              }));
                              Swal.fire({
                                title: 'คัดลอกลายเซ็นแล้ว',
                                text: 'นำลายเซ็นไปใส่ในช่องผู้อนุมัติ (หัวหน้างาน) เรียบร้อยแล้ว',
                                icon: 'success',
                                timer: 1500,
                                showConfirmButton: false,
                              });
                            }}
                            className="text-[11px] text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md font-semibold transition cursor-pointer inline-flex items-center gap-1"
                            title="คัดลอกลายเซ็นนี้ไปใส่ช่องผู้อนุมัติทันที"
                          >
                            <Copy className="w-3 h-3" /> นำไปใส่ช่องผู้อนุมัติด้วย
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              requesterSignatureUrl: undefined,
                              approverSignatureUrl: useSameSignature ? undefined : prev.approverSignatureUrl,
                            }));
                            setTimeout(() => sigPadRequester.current?.clear(), 50);
                          }}
                          className="text-[11px] text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition"
                        >
                          <Trash2 className="w-3 h-3" /> ลบเพื่อเซ็นใหม่
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-slate-50 relative group">
                        <SignatureCanvas
                          ref={sigPadRequester}
                          onEnd={handleRequesterEndStroke}
                          canvasProps={{
                            className: 'w-full h-[120px] cursor-crosshair bg-white',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            sigPadRequester.current?.clear();
                            setFormData((prev) => ({ ...prev, requesterSignatureUrl: undefined }));
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white shadow-xs border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 transition cursor-pointer"
                          title="ล้างลายเส้น"
                        >
                          <Eraser className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1.5 left-2 pointer-events-none text-[10px] text-gray-400">
                          ใช้นิ้วหรือเมาส์วาดลายมือชื่อในกรอบนี้ (จะซิงค์ไปยังช่องผู้อนุมัติอัตโนมัติ)
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <label className="cursor-pointer text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>อัปโหลดรูปภาพลายเซ็น (PNG/JPG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleRequesterFileUpload}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            sigPadRequester.current?.clear();
                            setFormData((prev) => ({ ...prev, requesterSignatureUrl: undefined }));
                          }}
                          className="text-gray-500 hover:text-gray-700 text-[11px] cursor-pointer"
                        >
                          ล้างลายเส้น
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Approver Signature Tab */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">
                      ลายมือชื่อผู้อนุมัติ: <span className="text-gray-900 font-bold">{formData.approverName || 'หัวหน้างาน'}</span>
                    </span>
                    {formData.approverSignatureUrl ? (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> มีลายเซ็นแล้ว
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">
                        (เว้นว่างได้ เพื่อพิมพ์เซ็นจริงบนเอกสาร)
                      </span>
                    )}
                  </div>

                  {/* 1-Click Copy from Requester if empty */}
                  {formData.requesterSignatureUrl && !formData.approverSignatureUrl && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-center space-y-1.5">
                      <p className="text-xs text-blue-900 font-medium">ต้องการใช้ลายเซ็นเดียวกับผู้เบิกจ่ายหรือไม่?</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            approverSignatureUrl: prev.requesterSignatureUrl,
                          }));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> ใช้ลายเซ็นเดียวกับ {formData.requesterName || 'ผู้เบิกจ่าย'}
                      </button>
                    </div>
                  )}

                  {formData.approverSignatureUrl ? (
                    <div className="relative border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 flex flex-col items-center justify-center">
                      <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-center w-full max-w-[280px] h-[90px] shadow-2xs">
                        <img
                          src={formData.approverSignatureUrl}
                          alt="Approver Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-100 w-full justify-between">
                        <span className="text-[11px] text-gray-500">ลายเซ็นหัวหน้างานจะฝังลงในเอกสาร PDF อัตโนมัติ</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, approverSignatureUrl: undefined }));
                            setTimeout(() => sigPadApprover.current?.clear(), 50);
                          }}
                          className="text-[11px] text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition"
                        >
                          <Trash2 className="w-3 h-3" /> ลบเพื่อเซ็นใหม่
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-slate-50 relative group">
                        <SignatureCanvas
                          ref={sigPadApprover}
                          onEnd={handleApproverEndStroke}
                          canvasProps={{
                            className: 'w-full h-[120px] cursor-crosshair bg-white',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            sigPadApprover.current?.clear();
                            setFormData((prev) => ({ ...prev, approverSignatureUrl: undefined }));
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white shadow-xs border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 transition cursor-pointer"
                          title="ล้างลายเส้น"
                        >
                          <Eraser className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1.5 left-2 pointer-events-none text-[10px] text-gray-400">
                          ใช้นิ้วหรือเมาส์วาดลายมือชื่อผู้อนุมัติ (หรือปล่อยว่างไว้เพื่อลงนามจริง)
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <label className="cursor-pointer text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>อัปโหลดรูปภาพลายเซ็น (PNG/JPG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleApproverFileUpload}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            sigPadApprover.current?.clear();
                            setFormData((prev) => ({ ...prev, approverSignatureUrl: undefined }));
                          }}
                          className="text-gray-500 hover:text-gray-700 text-[11px] cursor-pointer"
                        >
                          ล้างลายเส้น
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                การติ๊กเลือกช่อง <b>บิลไม่สมบูรณ์</b> จะจัดเตรียมใบรับรองแทนใบเสร็จรับเงินให้โดยอัตโนมัติ เพื่อให้ฝ่ายบัญชีสามารถนำไปเป็นหลักฐานทางภาษีได้อย่างถูกต้องตามเกณฑ์กรมสรรพากร
              </p>
            </div>
          </div>

          {/* Right Column: Live A4 Visual Preview */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs text-gray-500 mb-2 font-medium">
              <span>ตัวอย่างเอกสารใบรับรองแทนใบเสร็จรับเงิน (ขนาด A4):</span>
              <span className="text-[11px] text-gray-400">อัปเดตแบบเรียลไทม์</span>
            </div>

            {/* Scaled Preview Frame */}
            <div className="w-full overflow-x-auto bg-gray-200/80 p-4 rounded-2xl border border-gray-300 flex justify-center">
              <div className="scale-[0.82] origin-top sm:scale-[0.88] transition-transform">
                <SubstituteReceiptCertificateView data={formData} />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              พิมพ์เอกสาร (Print)
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-gray-600" />
              ดาวน์โหลด PDF
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleSaveAndAttach}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {generatingStatus || 'กำลังประมวลผล...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  บันทึกและแนบในคำขอ (Attach PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
