"use client";

import React, { useRef, useState, useEffect } from 'react';
import { PaymentRequestRecord, updatePaymentRequestSignatures } from '@/app/actions/paymentRequests';
import { thaiBahtText } from '@/app/lib/thaiBahtText';
import { Printer, X, Zap, Upload, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, Check } from 'lucide-react';

type Props = {
  request: PaymentRequestRecord;
  onClose: () => void;
  onUpdate?: (updated: PaymentRequestRecord) => void;
};

const companyInfoMap: Record<
  string,
  {
    th: string;
    en: string;
    taxId: string;
    address: string;
    telFax: string;
    branchTitle: string;
  }
> = {
  TG: {
    th: 'บริษัท เทอรา กรุ๊ป จำกัด',
    en: 'Tera Group Co., Ltd.',
    taxId: '0105552112716',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
  TE: {
    th: 'บริษัท เทอรา อิเล็กทริค จำกัด',
    en: 'Tera Electric Co., Ltd.',
    taxId: '0105557159958',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
  TP: {
    th: 'บริษัท เทอรา เพาเวอร์ จำกัด',
    en: 'Tera Power Co., Ltd.',
    taxId: '0105564011223',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
};

const classificationLabels: Record<string, string> = {
  VENDOR_BILL: 'ชำระเจ้าหนี้การค้า (Vendor Bill / AP)',
  REIMBURSEMENT: 'เบิกจ่ายพนักงาน / สำรองจ่าย (Reimbursement)',
  BRANCH_SITE: 'ขอเบิกจ่ายสาขา / ไซต์งาน (Site / Branch)',
  PETTY_CASH: 'เงินสดย่อย (Petty Cash)',
  CASH_ADVANCE: 'เงินทดรองจ่าย (Cash Advance)',
};

function formatThaiDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '.............................';
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export default function PrintablePaymentVoucher({ request, onClose, onUpdate }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const companyInfo = companyInfoMap[request.company] || companyInfoMap['TG'];

  // Font size adjustment state (percentage from 80% to 125%)
  const [fontScale, setFontScale] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Digital Signatures state for each role
  const [signatures, setSignatures] = useState<{
    preparedBy: string | null;
    verifiedBy: string | null;
    approvedBy: string | null;
  }>({
    preparedBy: request.requester_signature_url || null,
    verifiedBy: request.supervisor_signature_url || null,
    approvedBy: request.approver_signature_url || null,
  });

  const [isSavingSignature, setIsSavingSignature] = useState<{
    preparedBy: boolean;
    verifiedBy: boolean;
    approvedBy: boolean;
  }>({
    preparedBy: false,
    verifiedBy: false,
    approvedBy: false,
  });

  const [savedSuccessSlot, setSavedSuccessSlot] = useState<string | null>(null);

  // Auto-load signature from database or remembered in localStorage for requester
  useEffect(() => {
    let prep = request.requester_signature_url || null;
    let veri = request.supervisor_signature_url || null;
    let appr = request.approver_signature_url || null;

    if (!prep && typeof window !== 'undefined' && request.requester_name) {
      const cached = localStorage.getItem(`crm_saved_signature_${request.requester_name}`);
      if (cached) {
        prep = cached;
        if (request.id) {
          updatePaymentRequestSignatures(request.id, { preparedBy: cached }).catch(() => {});
        }
      }
    }

    setSignatures({
      preparedBy: prep,
      verifiedBy: veri,
      approvedBy: appr,
    });
  }, [request.id, request.requester_signature_url, request.supervisor_signature_url, request.approver_signature_url, request.requester_name]);

  const handleSignatureUpload = async (
    slot: 'preparedBy' | 'verifiedBy' | 'approvedBy',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Fast local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSignatures((prev) => ({
          ...prev,
          [slot]: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);

    setIsSavingSignature((prev) => ({ ...prev, [slot]: true }));

    try {
      // 1. Upload to Supabase storage via /api/upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'uploadsService');

      let uploadedUrl: string | null = null;
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          uploadedUrl = data.url;
        }
      } catch (uploadErr) {
        console.warn('API upload failed, will fallback to data URL:', uploadErr);
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(file);
        });
      }

      setSignatures((prev) => ({ ...prev, [slot]: uploadedUrl }));

      // 2. Persist to database
      if (request.id) {
        await updatePaymentRequestSignatures(request.id, { [slot]: uploadedUrl });
        if (onUpdate) {
          const fieldMap = {
            preparedBy: 'requester_signature_url',
            verifiedBy: 'supervisor_signature_url',
            approvedBy: 'approver_signature_url',
          } as const;
          onUpdate({
            ...request,
            [fieldMap[slot]]: uploadedUrl,
          });
        }
      }

      // 3. Cache requester signature in localStorage for all future payment vouchers
      if (slot === 'preparedBy' && typeof window !== 'undefined' && request.requester_name) {
        try {
          localStorage.setItem(`crm_saved_signature_${request.requester_name}`, uploadedUrl);
        } catch {}
      }

      setSavedSuccessSlot(slot);
      setTimeout(() => setSavedSuccessSlot(null), 3000);
    } catch (err) {
      console.error('Error uploading/saving signature:', err);
    } finally {
      setIsSavingSignature((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handleRemoveSignature = async (slot: 'preparedBy' | 'verifiedBy' | 'approvedBy') => {
    setSignatures((prev) => ({ ...prev, [slot]: null }));
    try {
      if (request.id) {
        await updatePaymentRequestSignatures(request.id, { [slot]: null });
        if (onUpdate) {
          const fieldMap = {
            preparedBy: 'requester_signature_url',
            verifiedBy: 'supervisor_signature_url',
            approvedBy: 'approver_signature_url',
          } as const;
          onUpdate({
            ...request,
            [fieldMap[slot]]: null,
          });
        }
      }
      if (slot === 'preparedBy' && typeof window !== 'undefined' && request.requester_name) {
        try {
          localStorage.removeItem(`crm_saved_signature_${request.requester_name}`);
        } catch {}
      }
    } catch (err) {
      console.error('Error removing signature:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate & Download PDF directly
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = printRef.current;
      const prevShadow = element.style.boxShadow;
      const prevBorder = element.style.border;
      element.style.boxShadow = 'none';
      element.style.border = 'none';

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for sharp print quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => {
          return el.classList.contains('print:hidden') || el.hasAttribute('data-pdf-ignore');
        },
      });

      element.style.boxShadow = prevShadow;
      element.style.border = prevBorder;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const maxPdfWidth = pageWidth - margin * 2;
      const maxPdfHeight = pageHeight - margin * 2;

      const ratio = canvas.width / canvas.height;
      let imgWidth = maxPdfWidth;
      let imgHeight = maxPdfWidth / ratio;

      if (imgHeight > maxPdfHeight) {
        imgHeight = maxPdfHeight;
        imgWidth = maxPdfHeight * ratio;
      }

      const xPos = margin + (maxPdfWidth - imgWidth) / 2;
      const yPos = margin;

      pdf.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);

      const filename = `ใบขออนุมัติจ่ายเงิน_${request.pay_number || 'voucher'}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to browser print if canvas fails
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const netAmount = Number(request.net_amount) || 0;
  const subtotal = Number(request.subtotal_amount) || 0;
  const vat = Number(request.vat_amount) || 0;
  const wht = Number(request.wht_amount) || 0;
  const bahtText = thaiBahtText(netAmount);

  // Formatted print timestamp in Thai Buddhist Era
  const now = new Date();
  const printTimestamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* TH Sarabun font & Print CSS rules */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Caveat:wght@600&display=swap');

        @font-face {
          font-family: 'TH Sarabun';
          font-style: normal;
          font-weight: 400;
          src: local('TH Sarabun'), local('TH Sarabun New'), local('THSarabunNew'),
               local('TH SarabunPSK'), local('TH Sarabun Thai'), local('Sarabun'),
               url('/Sarabun-Regular.ttf') format('truetype'),
               url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
        }

        @font-face {
          font-family: 'TH Sarabun';
          font-style: normal;
          font-weight: 700;
          src: local('TH Sarabun Bold'), local('TH Sarabun New Bold'), local('THSarabunNew-Bold'),
               local('TH SarabunPSK Bold'), local('TH Sarabun Thai Bold'), local('Sarabun Bold'),
               url('/Sarabun-Bold.ttf') format('truetype'),
               url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew-Bold.woff2') format('woff2');
        }

        .voucher-sarabun {
          font-family: 'TH Sarabun', 'TH Sarabun New', 'TH SarabunPSK', 'TH Sarabun Thai', 'Sarabun', sans-serif !important;
        }

        .signature-font {
          font-family: 'Caveat', cursive, sans-serif;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <span className="text-sm font-bold text-gray-900">
              พิมพ์ใบขออนุมัติจ่ายเงิน (Payment Request Voucher)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 text-red-700 border border-red-200">
              {request.pay_number}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Interactive Font Size Scale Controls */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs border border-gray-200">
              <span className="text-gray-500 font-medium px-1.5 text-[11px]">ขนาดฟอนต์:</span>
              <button
                onClick={() => setFontScale((prev) => Math.max(80, prev - 5))}
                className="px-2 py-1 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 transition text-xs shadow-2xs active:scale-95"
                title="ลดขนาดตัวอักษร"
              >
                A-
              </button>
              <span className="font-mono font-bold text-gray-800 w-11 text-center text-xs">
                {fontScale}%
              </span>
              <button
                onClick={() => setFontScale((prev) => Math.min(130, prev + 5))}
                className="px-2 py-1 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 transition text-xs shadow-2xs active:scale-95"
                title="เพิ่มขนาดตัวอักษร"
              >
                A+
              </button>
              <button
                onClick={() => setFontScale(100)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition"
                title="รีเซ็ตเป็นขนาดเริ่มต้น (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Direct PDF Download / Print */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-[0.99]"
              title="สร้างและดาวน์โหลดไฟล์เอกสาร PDF ทันที"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>พิมพ์เอกสาร (PDF)</span>
                </>
              )}
            </button>

            {/* Standard Browser Print Button */}
            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition active:scale-[0.99]"
              title="สั่งพิมพ์ผ่านหน้าต่างเบราว์เซอร์ / เครื่องพิมพ์"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ (Print)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4 Standard) */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 bg-gray-100 print:bg-white print:p-0">
          <div
            ref={printRef}
            className="voucher-sarabun bg-white p-6 sm:p-8 md:p-10 max-w-3xl mx-auto shadow-md print:shadow-none border border-gray-200 print:border-none text-black leading-tight"
            style={{
              fontSize: `${fontScale}%`,
              fontFamily: "'TH Sarabun', 'TH Sarabun New', 'TH SarabunPSK', 'TH Sarabun Thai', 'Sarabun', sans-serif",
            }}
          >
            {/* 1. Header: Logo (Left) + Company Info (Center) + Document Title (Right) */}
            <div className="flex items-start justify-between gap-3 pb-1">
              {/* Left: Logo */}
              <div className="shrink-0 flex items-center justify-start pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/4.png"
                  alt="TERA Logo"
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>

              {/* Center: Company Info */}
              <div className="flex-1 text-left px-2">
                <div className="text-sm sm:text-base font-bold text-black leading-snug">
                  {companyInfo.th} ({companyInfo.en})
                </div>
                <div className="text-xs sm:text-sm text-black font-normal leading-snug">
                  {companyInfo.address}
                </div>
                <div className="text-xs sm:text-sm text-black font-normal leading-snug">
                  {companyInfo.telFax}
                </div>
                <div className="text-xs sm:text-sm text-black font-normal leading-snug">
                  เลขประจำตัวผู้เสียภาษี {companyInfo.taxId} {companyInfo.branchTitle}
                </div>
              </div>

              {/* Right: Document Title */}
              <div className="text-right shrink-0 pt-0.5">
                <div className="text-base sm:text-lg font-bold text-black leading-tight">
                  ใบขออนุมัติจ่ายเงิน
                </div>
                <div className="text-xs sm:text-sm font-bold text-black leading-tight">
                  (PAYMENT REQUEST VOUCHER)
                </div>
              </div>
            </div>

            {/* 2. Sub-header Line: Form Name on Left, PAY NO. on Right */}
            <div className="flex justify-between items-baseline font-bold text-xs sm:text-sm text-black mt-3 mb-1">
              <div>แบบฟอร์มขออนุมัติเบิกจ่ายและตั้งหนี้ ประจำ{companyInfo.th}</div>
              <div className="text-right">
                เลขที่เอกสาร / PAY NO.: {request.pay_number}
                {request.urgency === 'EMERGENCY' && (
                  <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-300 px-2 py-0.5 rounded-full font-sans">
                    <Zap className="w-2.5 h-2.5" /> ด่วนที่สุด (EMERGENCY)
                  </span>
                )}
              </div>
            </div>

            {/* 3. Metadata Lines (Exact clean format from sample) */}
            <div className="text-xs sm:text-sm text-black space-y-0.5 mb-3">
              {/* Line 1: Request Date & Due Date */}
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold">วันที่ทำรายการ (Request Date): </span>
                  <span>{formatThaiDate(request.document_date)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">วันที่ต้องการให้จ่าย (Due Date): </span>
                  <span>{formatThaiDate(request.requested_payment_date)}</span>
                </div>
              </div>

              {/* Line 2: Requester */}
              <div>
                <span className="font-bold">ผู้ขอเบิก (Requester): </span>
                <span>
                  {request.requester_name}
                  {request.requester_department ? ` (${request.requester_department})` : ''}
                  {request.requester_phone ? ` โทร ${request.requester_phone}` : ''}
                </span>
              </div>

              {/* Line 3: Payee / Supplier */}
              <div>
                <span className="font-bold">ผู้รับเงิน / เจ้าหนี้ (Payee / Supplier): </span>
                <span>{request.supplier_name}</span>
              </div>

              {/* Line 4: Tax ID */}
              <div>
                <span className="font-bold">เลขประจำตัวผู้เสียภาษี: </span>
                <span className="font-mono">{request.supplier_tax_id || '-'}</span>
              </div>

              {/* Line 5: Classification */}
              <div>
                <span className="font-bold">ประเภทรายการ (Classification): </span>
                <span>{classificationLabels[request.classification] || request.classification}</span>
              </div>

              {/* Line 6: Cost Center */}
              <div>
                <span className="font-bold">โครงการ / ศูนย์ต้นทุน (Cost Center): </span>
                <span>{request.cost_center || `${request.company} FORM`}</span>
              </div>

              {/* Line 7: Branch */}
              <div>
                <span className="font-bold">สาขาที่เกิดค่าใช้จ่าย (Branch): </span>
                <span>{request.branch}</span>
              </div>

              {/* Line 8: Bank Details */}
              <div>
                <span className="font-bold">ข้อมูลการชำระเงิน (Bank Details): </span>
                <span>
                  {request.bank_name || 'พร้อมเพย์ / ไม่ระบุ'}
                  {request.bank_account_no ? ` เลขที่ ${request.bank_account_no}` : ''}
                  {request.bank_account_name ? ` (ชื่อบัญชี: ${request.bank_account_name})` : ''}
                </span>
              </div>

              {/* Line 9: Invoice No. */}
              <div>
                <span className="font-bold">เลขที่ใบกำกับ/ใบเสร็จ (Invoice No.): </span>
                <span>
                  {request.has_no_doc_number ? (
                    '(ไม่มีเลขที่เอกสาร - บิลเงินสด/ใบรับรอง)'
                  ) : (
                    request.invoice_number || '-'
                  )}
                </span>
              </div>

              {/* Line 10: PO/PR */}
              <div>
                <span className="font-bold">เลขที่ PO/PR อ้างอิง: </span>
                <span>{request.po_pr_number || ''}</span>
              </div>
            </div>

            {/* 4. Financial Details Table */}
            <div className="border border-black mb-2">
              {Array.isArray(request.items) && request.items.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-200 text-black font-bold border-b border-black text-center">
                      <th className="py-2 px-1 w-12 border-r border-black align-middle">ลำดับ</th>
                      <th className="py-2 px-2 w-24 border-r border-black align-middle">วันที่บิล</th>
                      <th className="py-2 px-2.5 w-48 border-r border-black align-middle">ผู้จำหน่าย</th>
                      <th className="py-2 px-3 border-r border-black align-middle">รายการ</th>
                      <th className="py-2 px-3 w-32 border-r border-black align-middle">จำนวนเงิน</th>
                      <th className="py-2 px-2 w-28 align-middle">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-black">
                    {request.items.map((it: any, idx: number) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="py-2 px-1 text-center border-r border-black align-top font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-black align-top font-mono text-[11px]">
                          {it.billDate || '-'}
                        </td>
                        <td className="py-2 px-2.5 border-r border-black align-top leading-tight">
                          <p className="font-semibold">{it.supplierName || '-'}</p>
                          {it.invoiceNumber && (
                            <span className="text-[10px] text-gray-700 block font-mono">บิล: {it.invoiceNumber}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-black align-top leading-tight">
                          <p className="whitespace-pre-wrap">{it.description}</p>
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-black align-top font-medium">
                          {Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-center align-top text-[11px] text-gray-700">
                          {it.remarks || '-'}
                        </td>
                      </tr>
                    ))}

                    {/* Credit Card Deduction Row (if applicable) */}
                    {Number(request.credit_card_deduction || 0) > 0 && (
                      <tr className="border-b border-black bg-gray-50/50">
                        <td colSpan={4} className="py-2 px-3 text-right font-bold border-r border-black">
                          หักยอดที่จ่ายด้วยบัตรเครดิต:
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-red-700 border-r border-black">
                          -{Number(request.credit_card_deduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-center text-[10px] text-gray-500">จ่ายผ่านบัตร</td>
                      </tr>
                    )}

                    {/* Total Amount Row */}
                    <tr className="border-b border-black font-bold">
                      <td colSpan={4} className="py-2 px-3 text-right border-r border-black">
                        จำนวนเงินรวม (Total Amount):
                      </td>
                      <td className="py-2 px-3 text-right font-mono border-r border-black">
                        {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="bg-gray-100"></td>
                    </tr>

                    {/* Net Payable Row */}
                    <tr className="font-bold bg-gray-100/70">
                      <td colSpan={4} className="py-2.5 px-3 text-right border-r border-black">
                        ยอดสุทธิที่เบิกจ่าย (Net Payable):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm sm:text-base border-r border-black">
                        {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-200 text-black font-bold border-b border-black">
                      <th className="py-2 px-2 w-14 text-center border-r border-black align-middle leading-normal">
                        ลำดับ<br />(No.)
                      </th>
                      <th className="py-2 px-3 text-center border-r border-black align-middle leading-normal">
                        รายละเอียดค่าใช้จ่ายและวัตถุประสงค์ (Purpose)
                      </th>
                      <th className="py-2 px-3 w-44 text-center align-middle leading-normal">
                        จำนวนเงิน (บาท)<br />(Amount THB)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-black">
                    <tr className="border-b border-black min-h-[45px]">
                      <td className="py-2.5 px-2 text-center border-r border-black align-middle leading-normal">
                        1
                      </td>
                      <td className="py-2.5 px-3 border-r border-black align-middle leading-normal">
                        <p className="whitespace-pre-wrap">{request.purpose}</p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono align-middle leading-normal font-medium">
                        {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Summary Rows (Vertically centered, comfortable padding, no line overlapping) */}
                    <tr className="border-b border-black">
                      <td colSpan={2} className="py-2 px-3 text-right font-bold border-r border-black align-middle leading-normal">
                        ยอดเงินก่อนภาษีมูลค่าเพิ่ม (Pre-VAT Subtotal):
                      </td>
                      <td className="py-2 px-3 text-right font-mono align-middle leading-normal font-medium">
                        {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td colSpan={2} className="py-2 px-3 text-right font-bold border-r border-black align-middle leading-normal">
                        ภาษีมูลค่าเพิ่ม (VAT {request.vat_type === '7%' || !request.vat_type ? '7%' : request.vat_type}):
                      </td>
                      <td className="py-2 px-3 text-right font-mono align-middle leading-normal font-medium">
                        {vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td colSpan={2} className="py-2 px-3 text-right font-bold border-r border-black align-middle leading-normal">
                        หัก ภาษี ณ ที่จ่าย (Withholding Tax {Number(request.wht_percent || 0).toFixed(2)}%):
                      </td>
                      <td className="py-2 px-3 text-right font-mono align-middle leading-normal font-medium">
                        {wht > 0 ? `-${wht.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00'}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right font-bold border-r border-black align-middle leading-normal">
                        ยอดชำระสุทธิ (Net Payment Amount):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold align-middle leading-normal text-sm sm:text-base">
                        {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* 5. Thai Baht Text Left-aligned */}
            <div className="text-xs sm:text-sm font-bold text-black mb-3">
              จำนวนเงินตัวอักษร: ({bahtText})
            </div>

            {/* 6. Approval Signatures (3 Columns in a solid bordered box with gray headers) */}
            <div className="border border-black mb-2">
              <div className="grid grid-cols-3 divide-x divide-black text-center text-xs sm:text-sm">
                {/* 1. จัดทำโดย (Prepared by) */}
                <div className="flex flex-col">
                  <div className="bg-gray-200 py-1 font-bold text-black border-b border-black">
                    จัดทำโดย (Prepared by)
                  </div>
                  <div className="p-2 flex flex-col justify-between h-28 text-black">
                    <div className="font-semibold text-center">{request.requester_name}</div>
                    
                    {/* Digital Signature Slot */}
                    <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                      {signatures.preparedBy ? (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signatures.preparedBy}
                            alt="ลายเซ็นผู้ขอเบิก"
                            className="h-10 max-w-[140px] object-contain mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSignature('preparedBy')}
                            title="ลบลายเซ็น"
                            className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic select-none">(ลงลายมือชื่อ)</div>
                      )}
                      <div className="print:hidden mt-0.5 flex items-center gap-1.5">
                        {isSavingSignature.preparedBy ? (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                          </span>
                        ) : savedSuccessSlot === 'preparedBy' ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                            <Check className="w-3 h-3" /> บันทึกแล้ว
                          </span>
                        ) : (
                          <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-2 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                            {signatures.preparedBy ? 'เปลี่ยนภาพ' : 'แนบลายเซ็น'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSignatureUpload('preparedBy', e)}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="text-xs">
                      วันที่ {formatThaiDate(request.document_date)}
                    </div>
                  </div>
                </div>

                {/* 2. ตรวจสอบโดย (Verified by) */}
                <div className="flex flex-col">
                  <div className="bg-gray-200 py-1 font-bold text-black border-b border-black">
                    ตรวจสอบโดย (Verified by)
                  </div>
                  <div className="p-2 flex flex-col justify-between h-28 text-black">
                    <div className="text-gray-400 font-mono text-[11px] select-none">
                      {request.accounting_manager_checked_by || request.ap_checked_by || '....................................................'}
                    </div>

                    {/* Digital Signature Slot */}
                    <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                      {signatures.verifiedBy ? (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signatures.verifiedBy}
                            alt="ลายเซ็นผู้ตรวจสอบ"
                            className="h-10 max-w-[140px] object-contain mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSignature('verifiedBy')}
                            title="ลบลายเซ็น"
                            className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic select-none">(ลงลายมือชื่อ)</div>
                      )}
                      <div className="print:hidden mt-0.5 flex items-center gap-1.5">
                        {isSavingSignature.verifiedBy ? (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                          </span>
                        ) : savedSuccessSlot === 'verifiedBy' ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                            <Check className="w-3 h-3" /> บันทึกแล้ว
                          </span>
                        ) : (
                          <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-2 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                            {signatures.verifiedBy ? 'เปลี่ยนภาพ' : 'แนบลายเซ็น'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSignatureUpload('verifiedBy', e)}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="text-xs">
                      วันที่ {request.supervisor_checked_at || request.ap_checked_at ? formatThaiDate(request.supervisor_checked_at || request.ap_checked_at) : '....................................'}
                    </div>
                  </div>
                </div>

                {/* 3. อนุมัติโดย (Approved by) */}
                <div className="flex flex-col">
                  <div className="bg-gray-200 py-1 font-bold text-black border-b border-black">
                    อนุมัติโดย (Approved by)
                  </div>
                  <div className="p-2 flex flex-col justify-between h-28 text-black">
                    <div className="text-gray-400 font-mono text-[11px] select-none">
                      {request.approved_by || '....................................................'}
                    </div>

                    {/* Digital Signature Slot */}
                    <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                      {signatures.approvedBy ? (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signatures.approvedBy}
                            alt="ลายเซ็นผู้อนุมัติ"
                            className="h-10 max-w-[140px] object-contain mx-auto"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSignature('approvedBy')}
                            title="ลบลายเซ็น"
                            className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic select-none">(ลงลายมือชื่อ)</div>
                      )}
                      <div className="print:hidden mt-0.5 flex items-center gap-1.5">
                        {isSavingSignature.approvedBy ? (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                          </span>
                        ) : savedSuccessSlot === 'approvedBy' ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                            <Check className="w-3 h-3" /> บันทึกแล้ว
                          </span>
                        ) : (
                          <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-2 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                            {signatures.approvedBy ? 'เปลี่ยนภาพ' : 'แนบลายเซ็น'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSignatureUpload('approvedBy', e)}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="text-xs">
                      วันที่ {request.approved_at ? formatThaiDate(request.approved_at) : '....................................'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Footer Section */}
            <div className="text-[11px] text-black space-y-1 mt-2">
              <div>* ใบขออนุมัตินี้สร้างขึ้นจากระบบกลาง TERA ERP/CRM ทะเบียนคุม ใช้จ่าย</div>
              <div className="w-full border-b border-black" />
              <div className="flex justify-between items-end pt-0.5">
                <div className="space-y-0.5">
                  <div className="font-bold">ส่วนสำหรับฝ่ายบัญชีเจ้าหนี้ (AP VERIFICATION)</div>
                  {request.ap_notes && <div>(AP Notes): {request.ap_notes}</div>}
                  <div>หมายเหตุ WHT</div>
                </div>
                <div className="text-right">
                  พิมพ์เมื่อ: {printTimestamp} | แผ่นที่ 1/1
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
