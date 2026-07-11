"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Loader2, Building2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { searchCompanies } from '@/app/actions/sales';

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    img.onload = () => {
      const maxSize = 1920;
      let { width, height } = img;
      if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
        'image/jpeg', 0.85
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function PdfUploadModal({ isOpen, onClose, onSuccess }: PdfUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Loading, 3: Preview
  const [isDragging, setIsDragging] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company matching state
  const [matchingCompanies, setMatchingCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'new'>('new');
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setExtractedData(null);
      setError('');
      setMatchingCompanies([]);
      setSelectedCompanyId('new');
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('กรุณาอัปโหลดไฟล์ PDF, JPG, PNG เท่านั้น');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    const fileToSend = await compressImage(file);
    await processFile(fileToSend);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('กรุณาอัปโหลดไฟล์ PDF, JPG, PNG เท่านั้น');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    const fileToSend = await compressImage(file);
    await processFile(fileToSend);
  };

  const processFile = async (file: File) => {
    setStep(2);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/sales/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        setStep(3);
        
        // Auto search for matching company
        if (result.data.customerName) {
          setIsSearchingCompany(true);
          try {
            const matches = await searchCompanies(result.data.customerName.substring(0, 10)); // Use first 10 chars for better fuzzy match
            if (matches && matches.length > 0) {
              setMatchingCompanies(matches);
              // Auto select the first exact or close match if any, otherwise default to 'new'
              const bestMatch = matches.find((m: any) => 
                m.companyName.toLowerCase().includes(result.data.customerName.toLowerCase()) || 
                result.data.customerName.toLowerCase().includes(m.companyName.toLowerCase())
              );
              if (bestMatch) {
                setSelectedCompanyId(bestMatch.id);
              } else if (matches.length > 0) {
                setSelectedCompanyId(matches[0].id);
              }
            }
          } catch (e) {
            console.error('Error searching company:', e);
          } finally {
            setIsSearchingCompany(false);
          }
        }
      } else {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการอ่านข้อมูล');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการอ่านข้อมูล โปรดลองใหม่อีกครั้ง');
      setStep(1);
    }
  };

  const handleConfirm = () => {
    if (!extractedData) return;
    
    // Prepare the data to send back
    const finalData = {
      isPrefilled: true,
      quotationNumber: extractedData.quotationNumber || extractedData.quotation_no,
      quotationDate: extractedData.quotationDate || extractedData.quotation_date,
      company: {
        id: selectedCompanyId === 'new' ? undefined : selectedCompanyId,
        companyName: extractedData.customerName,
        taxId: extractedData.customerTaxId,
        address: extractedData.customerAddress,
      },
      contact: {
        contactName: extractedData.attn,
        mobilePhone: extractedData.customerTel,
      },
      salesBeforeVat: Number(extractedData.subtotal) || 0,
      remarks: extractedData.remark || '',
      productInterest: extractedData.items?.map((item: any) => `${item.no || ''}. ${item.description || ''} - ${item.quantity || ''} ${item.unit || ''}`).join('\n') || ''
    };
    
    onSuccess(finalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl scale-in-center">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <FileText size={20} className="text-brand-red" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase">อ่านข้อมูลจากเอกสาร</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Auto-fill from Quotation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          
          {step === 1 && (
            <div className="flex flex-col items-center">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                  ${isDragging ? 'border-brand-red bg-red-50' : 'border-gray-200 hover:border-brand-red/50 hover:bg-gray-50'}
                `}
              >
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
                  <Upload size={32} className="text-brand-red" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">ลากไฟล์ PDF หรือรูปภาพมาวางที่นี่</h3>
                <p className="text-sm font-medium text-gray-500 mb-6">รองรับ PDF, JPG, PNG (ขนาดไม่เกิน 10MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept=".pdf,.jpg,.jpeg,.png,.webp" 
                  className="hidden" 
                />
                <button className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-colors shadow-lg">
                  เลือกไฟล์
                </button>
              </div>
              {error && (
                <div className="mt-6 w-full p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm font-bold">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-gray-100"></div>
                <div className="w-24 h-24 rounded-full border-4 border-brand-red border-t-transparent animate-spin absolute top-0 left-0"></div>
                <FileText size={32} className="text-brand-red absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">กำลังอ่านข้อมูลจากใบเสนอราคา...</h3>
              <p className="text-sm font-bold text-gray-400">ระบบ AI กำลังวิเคราะห์และดึงข้อมูล โปรดรอสักครู่</p>
            </div>
          )}

          {step === 3 && extractedData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Preview Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 font-mono text-sm shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <FileText size={100} />
                </div>
                
                <h4 className="font-black text-gray-800 border-b border-gray-200 pb-3 mb-4 flex items-center gap-2 relative z-10">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  ผลลัพธ์การอ่านใบเสนอราคา
                </h4>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-gray-500 font-bold mb-1">เลขที่ใบเสนอราคา:</p>
                    <p className="font-black text-brand-red text-lg">{extractedData.quotationNumber || extractedData.quotation_no || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-bold mb-1">วันที่:</p>
                    <p className="font-black text-gray-800 text-lg">
                      {extractedData.quotationDate || extractedData.quotation_date ? new Date(extractedData.quotationDate || extractedData.quotation_date).toLocaleDateString('th-TH') : '-'}
                    </p>
                  </div>
                  <div className="col-span-2 mt-2">
                    <p className="text-gray-500 font-bold mb-1">ลูกค้า:</p>
                    <p className="font-black text-gray-800">{extractedData.customerName || '-'}</p>
                    <p className="text-gray-600 mt-1">{extractedData.attn ? `ผู้ติดต่อ: ${extractedData.attn}` : ''}</p>
                  </div>
                </div>

                {extractedData.items && extractedData.items.length > 0 && (
                  <div className="mt-6 relative z-10">
                    <p className="text-gray-500 font-bold mb-2">รายการสินค้า ({extractedData.items.length} รายการ):</p>
                    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {extractedData.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                          <span className="flex-1 text-gray-700 truncate">{item.no}. {item.description}</span>
                          <span className="font-black text-gray-900 whitespace-nowrap">
                            {Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 relative z-10 text-right">
                  <div className="col-start-2 flex justify-between">
                    <span className="text-gray-500 font-bold">ยอดก่อน VAT:</span>
                    <span className="font-black text-gray-900">{Number(extractedData.subtotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="col-start-2 flex justify-between">
                    <span className="text-gray-500 font-bold">VAT {extractedData.vatRate || 7}%:</span>
                    <span className="font-black text-gray-900">{Number(extractedData.vatAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="col-start-2 flex justify-between text-brand-red bg-red-50 p-2 rounded-lg mt-1">
                    <span className="font-black">ยอดสุทธิ:</span>
                    <span className="font-black text-lg">{Number(extractedData.netAmount || extractedData.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Company Match Selection */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h4 className="font-black text-gray-800 mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  จับคู่บริษัทในฐานข้อมูล
                </h4>
                
                {isSearchingCompany ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-400 py-4">
                    <Loader2 size={14} className="animate-spin" /> กำลังค้นหาบริษัทที่ตรงกัน...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 mb-2">บริษัทที่ระบุในเอกสาร: <span className="text-gray-900">"{extractedData.customerName}"</span></p>
                    
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedCompanyId === 'new' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name="companyMatch" 
                        className="mt-1"
                        checked={selectedCompanyId === 'new'} 
                        onChange={() => setSelectedCompanyId('new')} 
                      />
                      <div>
                        <p className="text-sm font-black text-gray-900">สร้างบริษัทใหม่ (Create New)</p>
                        <p className="text-[11px] font-bold text-gray-500 mt-0.5">ใช้ข้อมูลชื่อ, ที่อยู่, เลขผู้เสียภาษี จากไฟล์ PDF</p>
                      </div>
                    </label>

                    {matchingCompanies.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-bold text-gray-400 mb-2">บริษัทที่น่าจะตรงกันในฐานข้อมูล:</p>
                        {matchingCompanies.map((company) => (
                          <label key={company.id} className={`flex items-start gap-3 p-3 rounded-xl border mb-2 cursor-pointer transition-all ${selectedCompanyId === company.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <input 
                              type="radio" 
                              name="companyMatch" 
                              className="mt-1"
                              checked={selectedCompanyId === company.id} 
                              onChange={() => setSelectedCompanyId(company.id)} 
                            />
                            <div>
                              <p className="text-sm font-black text-gray-900">{company.companyName}</p>
                              <div className="flex gap-4 mt-0.5">
                                <p className="text-[11px] font-bold text-gray-500">Tax ID: {company.taxId || '-'}</p>
                                <p className="text-[11px] font-bold text-gray-500 truncate max-w-[200px]">Address: {company.address || '-'}</p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className="p-4 md:px-6 md:py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-3xl flex justify-between items-center">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 shadow-sm">
              ยกเลิก / อัปโหลดใหม่
            </button>
            <button 
              onClick={handleConfirm} 
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-red-200 hover:scale-105 active:scale-95"
            >
              ใช้ข้อมูลนี้ <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
