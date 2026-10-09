"use client";

import React, { useRef, useState, useEffect } from 'react';
import { PaymentRequestRecord, updatePaymentRequestSignatures } from '@/app/actions/paymentRequests';
import { thaiBahtText } from '@/app/lib/thaiBahtText';
import { 
  Printer, 
  X, 
  Zap, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Loader2, 
  Check, 
  FileSpreadsheet, 
  Edit2,
  Paperclip,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  Archive,
  ChevronDown,
  Layers
} from 'lucide-react';
import { exportPaymentVoucherToExcel } from '../utils/exportPaymentVoucherExcel';

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
    logoUrl: string;
  }
> = {
  TG: {
    th: 'บริษัท เทอรา กรุ้ป จำกัด',
    en: 'Tera Group Co., Ltd.',
    taxId: '0105552112716',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
    logoUrl: '/4.png',
  },
  TE: {
    th: 'บริษัท เทอรา อิเล็กทริค จำกัด',
    en: 'Tera Electric Co., Ltd.',
    taxId: '0105557159958',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
    logoUrl: '/6.png',
  },
  TP: {
    th: 'บริษัท เทอรา เพาเวอร์ จำกัด',
    en: 'Tera Power Co., Ltd.',
    taxId: '0105564011223',
    address: '39 ซอยเฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กทม. 10250',
    telFax: 'โทร: +66(0) 2328-0801-3 แฟกซ์: +66(0) 2328-0804',
    branchTitle: 'สำนักงานใหญ่',
    logoUrl: '/7.png',
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

function resolveCompanyInfo(companyStr?: string) {
  if (!companyStr) return companyInfoMap['TG'];
  if (companyInfoMap[companyStr]) return companyInfoMap[companyStr];
  const s = String(companyStr).toLowerCase();
  if (s.includes('อิเล็กทริค') || s.includes('electric') || s === 'te') return companyInfoMap['TE'];
  if (s.includes('พาวเวอร์') || s.includes('เพาเวอร์') || s.includes('power') || s === 'tp') return companyInfoMap['TP'];
  return companyInfoMap['TG'];
}

export default function PrintablePaymentVoucher({ request, onClose, onUpdate }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const companyInfo = resolveCompanyInfo(request.company);

  // Font size adjustment state (percentage from 80% to 125%)
  const [fontScale, setFontScale] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState<boolean>(false);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'voucher' | 'attachments'>('all');
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState<boolean>(false);

  // Normalize & Parse Attachments (supporting array, JSON string, and payment slip)
  const normalizedAttachments = React.useMemo(() => {
    let list: any[] = [];
    if (Array.isArray(request.attachments)) {
      list = [...request.attachments];
    } else if (typeof request.attachments === 'string') {
      try {
        const parsed = JSON.parse(request.attachments);
        if (Array.isArray(parsed)) list = [...parsed];
      } catch {}
    }

    // Include payment slip if available and not already in attachments
    if (request.payment_slip_url) {
      const hasSlip = list.some((a: any) => a.url === request.payment_slip_url);
      if (!hasSlip) {
        list.push({
          fileName: 'สลิปหลักฐานการโอนเงิน (Payment Slip)',
          url: request.payment_slip_url,
          fileType: 'image/jpeg',
        });
      }
    }

    return list
      .map((att: any, idx: number) => {
        const name = att.fileName || att.name || `เอกสารแนบ_${idx + 1}`;
        const url = att.url || '';
        const size = att.fileSize || att.size;
        const type = att.fileType || att.type || '';
        return { name, url, size, type, raw: att };
      })
      .filter((att) => !!att.url);
  }, [request.attachments, request.payment_slip_url]);

  const hasAttachments = normalizedAttachments.length > 0;

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getFileBadge = (filename: string, fileType?: string) => {
    const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf' || fileType?.includes('pdf')) {
      return { icon: <FileText size={16} className="text-red-500" />, badge: 'PDF', bg: 'bg-red-50 border-red-200 text-red-700' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { icon: <FileSpreadsheet size={16} className="text-emerald-600" />, badge: 'EXCEL', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || fileType?.startsWith('image/')) {
      return { icon: <ImageIcon size={16} className="text-purple-600" />, badge: 'IMG', bg: 'bg-purple-50 border-purple-200 text-purple-700' };
    }
    if (['doc', 'docx'].includes(ext)) {
      return { icon: <FileText size={16} className="text-blue-600" />, badge: 'WORD', bg: 'bg-blue-50 border-blue-200 text-blue-700' };
    }
    return { icon: <File size={16} className="text-gray-500" />, badge: ext.toUpperCase() || 'FILE', bg: 'bg-gray-50 border-gray-200 text-gray-700' };
  };

  const handleDownloadSingleAttachment = async (att: { name: string; url: string }) => {
    try {
      const res = await fetch(att.url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = att.name || 'document';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(att.url, '_blank');
    }
  };

  const handleDownloadZip = async () => {
    if (!hasAttachments) return;
    setIsGeneratingPdf(true);
    setPdfGenerationStatus('กำลังเตรียมแพ็กเกจไฟล์ ZIP...');
    setShowDownloadMenu(false);
    setShowAttachmentsMenu(false);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < normalizedAttachments.length; i++) {
        const att = normalizedAttachments[i];
        setPdfGenerationStatus(`กำลังดาวน์โหลดไฟล์ (${i + 1}/${normalizedAttachments.length}): ${att.name}...`);
        try {
          const res = await fetch(att.url);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(`เอกสารแนบ_${i + 1}_${att.name}`, blob);
          }
        } catch (e) {
          console.warn(`Could not add ${att.name} to zip:`, e);
        }
      }

      setPdfGenerationStatus('กำลังสร้างไฟล์ ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `ชุดเอกสารจ่ายเงิน_${request.pay_number || 'voucher'}_พร้อมเอกสารแนบ.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to create ZIP package:', err);
      alert('ไม่สามารถสร้างไฟล์ ZIP ได้ กรุณาดาวน์โหลดแยกเป็นรายไฟล์');
    } finally {
      setIsGeneratingPdf(false);
      setPdfGenerationStatus('');
    }
  };

  // Digital Signatures state for each role (Prepared by, Supervisor, Verified by, Approved by)
  const [signatures, setSignatures] = useState<{
    preparedBy: string | null;
    supervisorApprovedBy: string | null;
    verifiedBy: string | null;
    approvedBy: string | null;
  }>({
    preparedBy: request.requester_signature_url || null,
    supervisorApprovedBy: request.supervisor_signature_url || null,
    verifiedBy: request.ap_signature_url || null,
    approvedBy: request.approver_signature_url || null,
  });

  const [isSavingSignature, setIsSavingSignature] = useState<{
    preparedBy: boolean;
    supervisorApprovedBy: boolean;
    verifiedBy: boolean;
    approvedBy: boolean;
  }>({
    preparedBy: false,
    supervisorApprovedBy: false,
    verifiedBy: false,
    approvedBy: false,
  });

  const [savedSuccessSlot, setSavedSuccessSlot] = useState<string | null>(null);

  // Names & Dates state for Supervisor, Verified by, and Approved by (with inline editable capability)
  const initialSupervisorName = request.supervisor_checked_by || request.assigned_supervisor_name || '';
  const initialVerifierName = request.accounting_manager_checked_by || request.ap_checked_by || '';
  const initialApproverName = request.approved_by || '';

  const [supervisorName, setSupervisorName] = useState<string>(initialSupervisorName);
  const [supervisorDate, setSupervisorDate] = useState<string | Date | null>(request.supervisor_checked_at || null);

  const [verifierName, setVerifierName] = useState<string>(initialVerifierName);
  const [verifierDate, setVerifierDate] = useState<string | Date | null>(
    request.accounting_manager_checked_at || request.ap_checked_at || null
  );

  const [approverName, setApproverName] = useState<string>(initialApproverName);
  const [approvedDate, setApprovedDate] = useState<string | Date | null>(request.approved_at || null);

  const [editingSlot, setEditingSlot] = useState<'supervisorApprovedBy' | 'verifiedBy' | 'approvedBy' | null>(null);
  const [editInputName, setEditInputName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  useEffect(() => {
    setSupervisorName(request.supervisor_checked_by || request.assigned_supervisor_name || '');
    setSupervisorDate(request.supervisor_checked_at || null);
    setVerifierName(request.accounting_manager_checked_by || request.ap_checked_by || '');
    setVerifierDate(request.accounting_manager_checked_at || request.ap_checked_at || null);
    setApproverName(request.approved_by || '');
    setApprovedDate(request.approved_at || null);
  }, [request]);

  const handleSaveSignerName = async (
    slot: 'supervisorApprovedBy' | 'verifiedBy' | 'approvedBy' | null,
    name: string
  ) => {
    if (!slot) return;
    const cleanName = name.trim();
    setIsSavingName(true);

    try {
      if (slot === 'supervisorApprovedBy') {
        setSupervisorName(cleanName);
        const newDate = cleanName ? (supervisorDate || new Date().toISOString()) : null;
        setSupervisorDate(newDate);
        if (request.id) {
          await updatePaymentRequestSignatures(request.id, {
            supervisorCheckedBy: cleanName || null,
            supervisorCheckedAt: newDate ? (typeof newDate === 'string' ? newDate : newDate.toISOString()) : null,
          });
          if (onUpdate) {
            onUpdate({
              ...request,
              supervisor_checked_by: cleanName || null,
              supervisor_checked_at: newDate ? (typeof newDate === 'string' ? newDate : newDate.toISOString()) : null,
            });
          }
        }
      } else if (slot === 'verifiedBy') {
        setVerifierName(cleanName);
        const newDate = cleanName ? (verifierDate || new Date().toISOString()) : null;
        setVerifierDate(newDate);
        if (request.id) {
          await updatePaymentRequestSignatures(request.id, {
            accountingManagerCheckedBy: cleanName || null,
            accountingManagerCheckedAt: newDate ? (typeof newDate === 'string' ? newDate : newDate.toISOString()) : null,
          });
          if (onUpdate) {
            onUpdate({
              ...request,
              accounting_manager_checked_by: cleanName || null,
              accounting_manager_checked_at: newDate ? (typeof newDate === 'string' ? newDate : newDate.toISOString()) : null,
            });
          }
        }
      } else if (slot === 'approvedBy') {
        setApproverName(cleanName);
        const newDate = cleanName ? (approvedDate || new Date().toISOString()) : null;
        setApprovedDate(newDate);
        if (request.id) {
          await updatePaymentRequestSignatures(request.id, {
            approvedByName: cleanName || null,
            approvedAt: newDate ? (typeof newDate === 'string' ? newDate : (newDate as Date).toISOString()) : null,
          });
          if (onUpdate) {
            onUpdate({
              ...request,
              approved_by: cleanName || null,
              approved_at: newDate ? (typeof newDate === 'string' ? newDate : (newDate as Date).toISOString()) : null,
            });
          }
        }
      }
      setEditingSlot(null);
    } catch (err) {
      console.error('Failed to save signer name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  // Load signatures from database record
  useEffect(() => {
    let prep = request.requester_signature_url || null;
    let sup = request.supervisor_signature_url || null;
    let veri = request.ap_signature_url || null;
    let appr = request.approver_signature_url || null;

    if (typeof window !== 'undefined') {
      // Purge legacy global key to prevent accidental signature leaks between users
      try {
        localStorage.removeItem('crm_supervisor_signature');
      } catch {}

      // Only load cached signature if it matches the exact requester's name
      if (!prep && request.requester_name) {
        const cached = localStorage.getItem(`crm_saved_signature_${request.requester_name}`);
        if (cached) {
          prep = cached;
        }
      }
    }

    setSignatures({
      preparedBy: prep,
      supervisorApprovedBy: sup,
      verifiedBy: veri,
      approvedBy: appr,
    });
  }, [
    request.id,
    request.requester_signature_url,
    request.supervisor_signature_url,
    request.ap_signature_url,
    request.approver_signature_url,
    request.requester_name,
  ]);

  const handleSignatureUpload = async (
    slot: 'preparedBy' | 'supervisorApprovedBy' | 'verifiedBy' | 'approvedBy',
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
            supervisorApprovedBy: 'supervisor_signature_url',
            verifiedBy: 'ap_signature_url',
            approvedBy: 'approver_signature_url',
          } as const;
          onUpdate({
            ...request,
            [fieldMap[slot]]: uploadedUrl,
          });
        }
      }

      // 3. Cache signature for the specific person name only (no shared generic keys)
      if (typeof window !== 'undefined') {
        try {
          if (slot === 'preparedBy' && request.requester_name) {
            localStorage.setItem(`crm_saved_signature_${request.requester_name}`, uploadedUrl);
          } else if (slot === 'supervisorApprovedBy') {
            const sName = request.supervisor_checked_by || request.assigned_supervisor_name || supervisorName;
            if (sName) {
              localStorage.setItem(`crm_saved_signature_${sName}`, uploadedUrl);
            }
          }
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

  const handleRemoveSignature = async (
    slot: 'preparedBy' | 'supervisorApprovedBy' | 'verifiedBy' | 'approvedBy'
  ) => {
    setSignatures((prev) => ({ ...prev, [slot]: null }));
    try {
      if (request.id) {
        await updatePaymentRequestSignatures(request.id, { [slot]: null });
        if (onUpdate) {
          const fieldMap = {
            preparedBy: 'requester_signature_url',
            supervisorApprovedBy: 'supervisor_signature_url',
            verifiedBy: 'ap_signature_url',
            approvedBy: 'approver_signature_url',
          } as const;
          onUpdate({
            ...request,
            [fieldMap[slot]]: null,
          });
        }
      }
      if (typeof window !== 'undefined') {
        try {
          if (slot === 'preparedBy' && request.requester_name) {
            localStorage.removeItem(`crm_saved_signature_${request.requester_name}`);
          } else if (slot === 'supervisorApprovedBy') {
            const sName = request.supervisor_checked_by || request.assigned_supervisor_name || supervisorName;
            if (sName) {
              localStorage.removeItem(`crm_saved_signature_${sName}`);
            }
            localStorage.removeItem('crm_supervisor_signature');
          }
        } catch {}
      }
    } catch (err) {
      console.error('Error removing signature:', err);
    }
  };

  // Generate & Print merged PDF with attachments via invisible iframe
  const handlePrintMergedPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfGenerationStatus('กำลังเตรียมเอกสารรวมสำหรับการพิมพ์...');
    try {
      if (typeof document !== 'undefined' && (document as any).fonts) {
        await (document as any).fonts.ready;
      }
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const element = printRef.current;
      if (!element) {
        window.print();
        return;
      }
      
      const prevDisplay = element.style.display;
      element.style.display = 'block';
      const prevShadow = element.style.boxShadow;
      element.style.boxShadow = 'none';
      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => {
          return (
            el.classList?.contains('print:hidden') ||
            el.classList?.contains('no-print') ||
            el.hasAttribute?.('data-pdf-ignore')
          );
        },
      });
      element.style.boxShadow = prevShadow;
      element.style.display = prevDisplay;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const basePdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      basePdf.addImage(imgData, 'JPEG', 6, 6, 198, 285);

      const { PDFDocument } = await import('pdf-lib');
      const voucherPdfBytes = basePdf.output('arraybuffer');
      const mergedPdf = await PDFDocument.create();

      const voucherDoc = await PDFDocument.load(voucherPdfBytes);
      const voucherPages = await mergedPdf.copyPages(voucherDoc, voucherDoc.getPageIndices());
      voucherPages.forEach((p) => mergedPdf.addPage(p));

      for (let i = 0; i < normalizedAttachments.length; i++) {
        const att = normalizedAttachments[i];
        setPdfGenerationStatus(`กำลังเตรียมเอกสารแนบ (${i + 1}/${normalizedAttachments.length}): ${att.name}...`);
        try {
          const ext = (att.name || '').split('.').pop()?.toLowerCase() || '';
          const res = await fetch(att.url);
          if (!res.ok) continue;
          const attBytes = await res.arrayBuffer();

          if (ext === 'pdf' || att.type?.includes('pdf')) {
            const attDoc = await PDFDocument.load(attBytes, { ignoreEncryption: true });
            const copiedPages = await mergedPdf.copyPages(attDoc, attDoc.getPageIndices());
            copiedPages.forEach((p) => mergedPdf.addPage(p));
          } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || att.type?.startsWith('image/')) {
            let imgEmbed;
            if (ext === 'png' || att.type?.includes('png')) {
              imgEmbed = await mergedPdf.embedPng(attBytes);
            } else {
              imgEmbed = await mergedPdf.embedJpg(attBytes);
            }
            const page = mergedPdf.addPage([595.28, 841.89]);
            const dims = imgEmbed.scaleToFit(535, 780);
            page.drawImage(imgEmbed, {
              x: (595.28 - dims.width) / 2,
              y: (841.89 - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            });
          }
        } catch (e) {
          console.warn(`Could not add ${att.name} for print:`, e);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
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
        }, 400);
      };
    } catch (err) {
      console.warn('Fallback to standard window.print():', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
      setPdfGenerationStatus('');
    }
  };

  const handlePrint = async () => {
    const hasPdfAttachment = normalizedAttachments.some(
      (att) =>
        att.name?.toLowerCase().endsWith('.pdf') ||
        att.type?.includes('pdf') ||
        att.url?.toLowerCase().includes('.pdf')
    );

    if (hasAttachments && hasPdfAttachment && activeTab !== 'voucher') {
      await handlePrintMergedPdf();
    } else {
      window.print();
    }
  };

  // Generate & Download PDF directly (with optional attachment merge)
  const handleDownloadPDF = async (mode: 'merged' | 'voucher_only' = 'merged') => {
    if (!printRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfGenerationStatus('กำลังสร้างหน้าเอกสารใบขออนุมัติจ่ายเงิน...');
    setShowDownloadMenu(false);
    setShowAttachmentsMenu(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 80));

      if (typeof document !== 'undefined' && (document as any).fonts) {
        await (document as any).fonts.ready;
      }

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = printRef.current;
      if (!element) return;
      const prevDisplay = element.style.display;
      element.style.display = 'block';
      const prevShadow = element.style.boxShadow;
      const prevBorder = element.style.border;
      element.style.boxShadow = 'none';
      element.style.border = 'none';

      const canvas = await html2canvas(element, {
        scale: 2.2, // High resolution for sharp print quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => {
          return (
            el.classList?.contains('print:hidden') ||
            el.classList?.contains('no-print') ||
            el.hasAttribute?.('data-pdf-ignore')
          );
        },
      });

      element.style.boxShadow = prevShadow;
      element.style.border = prevBorder;
      element.style.display = prevDisplay;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 6;
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

      // If mode is merged and there are attachments
      if (mode === 'merged' && hasAttachments) {
        setPdfGenerationStatus('กำลังผสานเอกสารแนบเข้ากับ PDF...');
        try {
          const { PDFDocument } = await import('pdf-lib');
          const voucherPdfBytes = pdf.output('arraybuffer');
          const mergedPdf = await PDFDocument.create();

          // 1. Copy Voucher Page(s)
          const voucherDoc = await PDFDocument.load(voucherPdfBytes);
          const voucherPages = await mergedPdf.copyPages(voucherDoc, voucherDoc.getPageIndices());
          voucherPages.forEach((p) => mergedPdf.addPage(p));

          // 2. Append each attachment
          for (let i = 0; i < normalizedAttachments.length; i++) {
            const att = normalizedAttachments[i];
            setPdfGenerationStatus(
              `กำลังประมวลผลไฟล์แนบ (${i + 1}/${normalizedAttachments.length}): ${att.name}...`
            );
            try {
              const ext = (att.name || '').split('.').pop()?.toLowerCase() || '';
              const res = await fetch(att.url);
              if (!res.ok) continue;
              const attBytes = await res.arrayBuffer();

              if (ext === 'pdf' || att.type?.includes('pdf')) {
                const attDoc = await PDFDocument.load(attBytes, { ignoreEncryption: true });
                const copiedPages = await mergedPdf.copyPages(attDoc, attDoc.getPageIndices());
                copiedPages.forEach((p) => mergedPdf.addPage(p));
              } else if (
                ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ||
                att.type?.startsWith('image/')
              ) {
                let imgEmbed;
                if (ext === 'png' || att.type?.includes('png')) {
                  imgEmbed = await mergedPdf.embedPng(attBytes);
                } else {
                  imgEmbed = await mergedPdf.embedJpg(attBytes);
                }
                const page = mergedPdf.addPage([595.28, 841.89]); // A4 portrait in points
                const dims = imgEmbed.scaleToFit(535, 780);
                page.drawImage(imgEmbed, {
                  x: (595.28 - dims.width) / 2,
                  y: (841.89 - dims.height) / 2,
                  width: dims.width,
                  height: dims.height,
                });
              }
            } catch (attErr) {
              console.warn(`Could not merge attachment ${att.name}:`, attErr);
            }
          }

          const mergedBytes = await mergedPdf.save();
          const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `ใบขออนุมัติจ่ายเงิน_${request.pay_number || 'voucher'}_รวมเอกสารแนบ.pdf`;
          link.click();
          URL.revokeObjectURL(link.href);
          return;
        } catch (mergeErr) {
          console.warn('PDF-lib merge fallback to single voucher pdf:', mergeErr);
        }
      }

      const filename = `ใบขออนุมัติจ่ายเงิน_${request.pay_number || 'voucher'}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
      setPdfGenerationStatus('');
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsGeneratingExcel(true);
      await exportPaymentVoucherToExcel({
        ...request,
        supervisor_checked_by: supervisorName || request.supervisor_checked_by,
        supervisor_checked_at: supervisorDate ? (typeof supervisorDate === 'string' ? supervisorDate : (supervisorDate as Date).toISOString()) : request.supervisor_checked_at,
        accounting_manager_checked_by: verifierName || request.accounting_manager_checked_by,
        accounting_manager_checked_at: verifierDate ? (typeof verifierDate === 'string' ? verifierDate : (verifierDate as Date).toISOString()) : (request.accounting_manager_checked_at || request.ap_checked_at),
        approved_by: approverName || request.approved_by,
        approved_at: approvedDate ? (typeof approvedDate === 'string' ? approvedDate : (approvedDate as Date).toISOString()) : request.approved_at,
      }, signatures);
    } catch (error) {
      console.error('Error generating Excel voucher:', error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    } finally {
      setIsGeneratingExcel(false);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* TH Sarabun font & Print CSS rules */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Caveat:wght@600&display=swap');

        @font-face {
          font-family: 'TH Sarabun';
          font-style: normal;
          font-weight: 400;
          src: local('TH Sarabun'), local('TH Sarabun New'), local('THSarabunNew'),
               local('TH SarabunPSK'), local('TH Sarabun Thai'), local('Sarabun'),
               url('/Sarabun-Regular.woff2') format('woff2'),
               url('/Sarabun-Regular.ttf') format('truetype'),
               url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/Sarabun/Sarabun-Regular.woff2') format('woff2');
        }

        @font-face {
          font-family: 'TH Sarabun';
          font-style: normal;
          font-weight: 700;
          src: local('TH Sarabun Bold'), local('TH Sarabun New Bold'), local('THSarabunNew-Bold'),
               local('TH SarabunPSK Bold'), local('TH Sarabun Thai Bold'), local('Sarabun Bold'),
               url('/Sarabun-Bold.woff2') format('woff2'),
               url('/Sarabun-Bold.ttf') format('truetype'),
               url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/Sarabun/Sarabun-Bold.woff2') format('woff2');
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
          .printable-sheet {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:overflow-visible print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <span className="text-sm font-bold text-gray-900">
              {hasAttachments ? `พิมพ์ใบขออนุมัติจ่ายเงิน (${1 + normalizedAttachments.length} หน้า)` : 'พิมพ์ใบขออนุมัติจ่ายเงิน (Payment Request Voucher)'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-50 text-red-700 border border-red-200">
              {request.pay_number}
            </span>
            {hasAttachments && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold flex items-center gap-1">
                <Paperclip size={12} /> แนบ {normalizedAttachments.length} ไฟล์
              </span>
            )}
          </div>

          {/* Center: Tabs if attachments exist */}
          {hasAttachments && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'all' ? 'bg-red-600 text-white font-bold shadow-2xs' : 'text-gray-600 hover:text-black'
                }`}
              >
                <Layers size={12} />
                <span>ดูทั้งหมด ({1 + normalizedAttachments.length} หน้า)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('voucher')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'voucher' ? 'bg-red-600 text-white font-bold shadow-2xs' : 'text-gray-600 hover:text-black'
                }`}
              >
                <FileText size={12} />
                <span>เฉพาะใบขออนุมัติ (หน้า 1)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'attachments' ? 'bg-red-600 text-white font-bold shadow-2xs' : 'text-gray-600 hover:text-black'
                }`}
              >
                <Paperclip size={12} />
                <span>เฉพาะเอกสารแนบ ({normalizedAttachments.length})</span>
              </button>
            </div>
          )}

          {/* Right: Actions, Zoom, Excel, PDF & Print */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Interactive Font Size Scale Controls */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs border border-gray-200">
              <span className="text-gray-500 font-medium px-1.5 text-[11px]">ขนาดฟอนต์:</span>
              <button
                onClick={() => setFontScale((prev) => Math.max(80, prev - 5))}
                className="px-2 py-1 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 transition text-xs shadow-2xs active:scale-95 cursor-pointer"
                title="ลดขนาดตัวอักษร"
              >
                A-
              </button>
              <span className="font-mono font-bold text-gray-800 w-11 text-center text-xs">
                {fontScale}%
              </span>
              <button
                onClick={() => setFontScale((prev) => Math.min(130, prev + 5))}
                className="px-2 py-1 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 transition text-xs shadow-2xs active:scale-95 cursor-pointer"
                title="เพิ่มขนาดตัวอักษร"
              >
                A+
              </button>
              <button
                onClick={() => setFontScale(100)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer"
                title="รีเซ็ตเป็นขนาดเริ่มต้น (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Attachments Dropdown Menu */}
            {hasAttachments && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentsMenu(!showAttachmentsMenu);
                    setShowDownloadMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="ดูรายชื่อไฟล์แนบทั้งหมด"
                >
                  <Paperclip size={13} className="text-red-600" />
                  <span>ไฟล์แนบ ({normalizedAttachments.length})</span>
                  <ChevronDown size={12} />
                </button>

                {showAttachmentsMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-gray-100 font-bold text-gray-900 flex items-center justify-between">
                      <span>เอกสารแนบในคำขอนี้</span>
                      <span className="text-[10px] text-gray-500">{normalizedAttachments.length} ไฟล์</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                      {normalizedAttachments.map((att, aIdx) => {
                        const badge = getFileBadge(att.name, att.type);
                        return (
                          <div key={aIdx} className="p-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate text-[11px]" title={att.name}>
                                {att.name}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {badge.badge} {att.size ? `• ${formatFileSize(att.size)}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-gray-200 rounded text-blue-600 hover:text-blue-800"
                                title="เปิดดูเต็มจอ"
                              >
                                <ExternalLink size={13} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDownloadSingleAttachment(att)}
                                className="p-1 hover:bg-gray-200 rounded text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                title="ดาวน์โหลดไฟล์นี้"
                              >
                                <Download size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 px-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleDownloadZip}
                        className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Archive size={13} />
                        <span>ดาวน์โหลดทั้งหมดเป็น ZIP</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct Excel (.xlsx) Download */}
            <button
              onClick={handleExportExcel}
              disabled={isGeneratingExcel || isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-2xs transition active:scale-[0.99] cursor-pointer"
              title="ส่งออกเอกสารใบขออนุมัติจ่ายเงินเป็นไฟล์ Excel (.xlsx)"
            >
              {isGeneratingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </>
              )}
            </button>

            {/* Direct PDF Download / Dropdown */}
            <div className="relative flex items-center">
              <button
                onClick={() => handleDownloadPDF(hasAttachments ? 'merged' : 'voucher_only')}
                disabled={isGeneratingPdf || isGeneratingExcel}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold ${
                  hasAttachments ? 'rounded-l-xl' : 'rounded-xl'
                } shadow-2xs transition active:scale-[0.99] cursor-pointer`}
                title={hasAttachments ? 'ดาวน์โหลดเอกสารใบขออนุมัติจ่ายเงินรวมกับเอกสารแนบทุกหน้าเป็นไฟล์ PDF เดียว' : 'ดาวน์โหลดเอกสารใบขออนุมัติจ่ายเงินเป็นไฟล์ PDF'}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังสร้าง PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{hasAttachments ? `PDF รวม (${1 + normalizedAttachments.length} หน้า)` : 'พิมพ์ PDF'}</span>
                  </>
                )}
              </button>

              {hasAttachments && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadMenu(!showDownloadMenu);
                    setShowAttachmentsMenu(false);
                  }}
                  disabled={isGeneratingPdf || isGeneratingExcel}
                  className="px-2 py-2 bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white text-xs font-bold rounded-r-xl border-l border-red-500 transition shadow-2xs cursor-pointer"
                  title="ตัวเลือกการดาวน์โหลดอื่นๆ"
                >
                  <ChevronDown size={14} />
                </button>
              )}

              {showDownloadMenu && hasAttachments && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF('merged')}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Layers size={14} className="text-red-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-gray-900">ดาวน์โหลด PDF รวมเอกสารแนบ</div>
                      <div className="text-[10px] text-gray-500">ใบขออนุมัติ + เอกสารแนบในไฟล์เดียว</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF('voucher_only')}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-gray-900">ดาวน์โหลดเฉพาะใบขออนุมัติ</div>
                      <div className="text-[10px] text-gray-500">PDF เฉพาะใบสำคัญจ่ายหน้าแรก</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Archive size={14} className="text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-gray-900">ดาวน์โหลดเฉพาะไฟล์แนบ (ZIP)</div>
                      <div className="text-[10px] text-gray-500">รวมไฟล์แนบทั้งหมด {normalizedAttachments.length} ไฟล์</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Standard Browser Print Button */}
            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf || isGeneratingExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition active:scale-[0.99] cursor-pointer"
              title="สั่งพิมพ์ผ่านหน้าต่างเบราว์เซอร์ / เครื่องพิมพ์"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ (Print)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner (when generating merged PDF) */}
        {pdfGenerationStatus && (
          <div className="print:hidden bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 flex items-center gap-2 font-medium animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>{pdfGenerationStatus}</span>
          </div>
        )}

        {/* Printable Paper Area (A4 Standard) */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 bg-gray-100 print:bg-white print:p-0 print:overflow-visible flex-1">
          {(activeTab === 'all' || activeTab === 'voucher') && (
            <div
              ref={printRef}
              className="voucher-sarabun bg-white p-6 sm:p-8 md:p-10 max-w-3xl mx-auto shadow-md print:shadow-none border border-gray-200 print:border-none text-black leading-tight print:p-0"
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
                  src={companyInfo.logoUrl || '/4.png'}
                  alt={`${request.company || 'TERA'} Logo`}
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
                <div className="text-xs sm:text-sm text-black font-normal leading-snug whitespace-nowrap">
                  เลขประจำตัวผู้เสียภาษี {companyInfo.taxId} <span className="whitespace-nowrap">{companyInfo.branchTitle}</span>
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
              {/* Line 1: Request Date & Requisition Date */}
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold">วันที่คำขอ (Request Date): </span>
                  <span>{formatThaiDate(request.created_at || request.document_date)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">วันที่ที่ทำเบิก (Requisition Date): </span>
                  <span>{formatThaiDate(request.document_date)}</span>
                </div>
              </div>

              {/* Line 2: Due Date */}
              <div>
                <span className="font-bold">วันที่ต้องการให้จ่าย (Due Date): </span>
                <span>{formatThaiDate(request.requested_payment_date)}</span>
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
                          {((it.vatType && it.vatType !== 'NO_VAT') || (it.whtType && it.whtType !== 'NONE')) && (
                            <div className="text-[10px] text-gray-700 font-mono mt-0.5 flex flex-wrap gap-1">
                              {it.vatType === 'INCLUDED_7%' && (
                                <span className="bg-gray-100 px-1 py-0.2 rounded border border-gray-300">
                                  รวม VAT 7% ({Number(it.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </span>
                              )}
                              {(it.vatType === 'EXCLUDE' || it.vatType === '7%') && (
                                <span className="bg-gray-100 px-1 py-0.2 rounded border border-gray-300">
                                  +VAT 7% ({Number(it.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </span>
                              )}
                              {it.whtType && it.whtType !== 'NONE' && (
                                <span className="bg-orange-50 text-orange-900 px-1 py-0.2 rounded border border-orange-200">
                                  หัก WHT {it.whtPercent || (it.whtType === '1%' ? 1 : it.whtType === '2%' ? 2 : it.whtType === '3%' ? 3 : 5)}% (-{Number(it.whtAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </span>
                              )}
                              {Number(it.netAmount || 0) > 0 && Number(it.netAmount) !== Number(it.amount) && (
                                <span className="text-gray-600 font-sans font-medium">
                                  สุทธิ: {Number(it.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          )}
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

                    {/* VAT Row (if applicable) */}
                    {vat > 0 && (
                      <tr className="border-b border-black">
                        <td colSpan={4} className="py-2 px-3 text-right font-bold border-r border-black">
                          ภาษีมูลค่าเพิ่ม (VAT {request.vat_type === 'ITEMIZED' ? 'รวมตามรายการ' : (request.vat_type === 'INCLUDED_7%' || request.vat_type === 'INCLUDE' ? '7% รวมในยอด' : request.vat_type === '7%' || !request.vat_type ? '7%' : request.vat_type)}):
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-black font-medium">
                          +{vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="bg-gray-50"></td>
                      </tr>
                    )}

                    {/* WHT Row (if applicable) */}
                    {wht > 0 && (
                      <tr className="border-b border-black">
                        <td colSpan={4} className="py-2 px-3 text-right font-bold border-r border-black">
                          หัก ภาษี ณ ที่จ่าย (Withholding Tax {request.wht_type === 'ITEMIZED' ? 'ตามรายการ' : `${Number(request.wht_percent || 0).toFixed(2)}%`}):
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-black text-red-700 font-medium">
                          -{wht.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="bg-gray-50"></td>
                      </tr>
                    )}

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
                        ภาษีมูลค่าเพิ่ม (VAT {request.vat_type === 'INCLUDED_7%' || request.vat_type === 'INCLUDE' ? '7% รวมในยอด' : request.vat_type === '7%' || !request.vat_type ? '7%' : request.vat_type}):
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

            {/* 6. Approval Signatures (4 Columns in a solid bordered box with unified rows for perfect symmetry) */}
            <div className="border border-black mb-2">
              {/* Row 1: Unified Header Row - 100% continuous flat bottom border */}
              <div className="grid grid-cols-4 divide-x divide-black bg-gray-200 border-b border-black text-center font-bold text-black text-[11.5px] sm:text-xs">
                <div className="py-1.5 px-1 flex items-center justify-center min-h-[32px] leading-normal">
                  จัดทำโดย (Prepared by)
                </div>
                <div className="py-1.5 px-1 flex items-center justify-center min-h-[32px] leading-normal">
                  หัวหน้าอนุมัติ (Supervisor)
                </div>
                <div className="py-1.5 px-1 flex items-center justify-center min-h-[32px] leading-normal">
                  ตรวจสอบโดย (Verified by)
                </div>
                <div className="py-1.5 px-1 flex items-center justify-center min-h-[32px] leading-normal">
                  อนุมัติโดย (Approved by)
                </div>
              </div>

              {/* Row 2: Unified Content Row - All 4 columns perfectly aligned */}
              <div className="grid grid-cols-4 divide-x divide-black text-center bg-white">
                {/* 1. จัดทำโดย (Prepared by) */}
                <div className="p-2 flex flex-col justify-between min-h-[120px] text-black">
                  <div className="min-h-[30px] flex items-center justify-center py-0.5">
                    <span className="font-semibold text-center text-xs sm:text-[13px] leading-normal px-1" title={request.requester_name}>
                      {request.requester_name}
                    </span>
                  </div>
                    
                    {/* Digital Signature Slot */}
                    <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                      {signatures.preparedBy ? (
                        <div className="relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signatures.preparedBy}
                            alt="ลายเซ็นผู้ขอเบิก"
                            className="h-9 sm:h-10 max-w-[100px] object-contain mx-auto"
                          />
                          <button
                            type="button"
                            data-pdf-ignore="true"
                            onClick={() => handleRemoveSignature('preparedBy')}
                            title="ลบลายเซ็น"
                            className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs italic select-none leading-normal">(ลงลายมือชื่อ)</div>
                      )}
                      <div data-pdf-ignore="true" className="print:hidden mt-0.5 flex items-center gap-1.5">
                        {isSavingSignature.preparedBy ? (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                          </span>
                        ) : savedSuccessSlot === 'preparedBy' ? (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                            <Check className="w-3 h-3" /> บันทึกแล้ว
                          </span>
                        ) : (
                          <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-1.5 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                            {signatures.preparedBy ? 'เปลี่ยน' : 'แนบลายเซ็น'}
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

                  <div className="min-h-[22px] flex items-center justify-center text-[11px] sm:text-xs leading-normal py-0.5">
                    วันที่ {formatThaiDate(request.document_date)}
                  </div>
                </div>

                {/* 2. หัวหน้าอนุมัติ (Supervisor) */}
                <div className="p-2 flex flex-col justify-between min-h-[120px] text-black">
                  <div className="min-h-[30px] flex items-center justify-center py-0.5">
                    {editingSlot === 'supervisorApprovedBy' ? (
                      <div className="print:hidden flex items-center justify-center gap-1 my-0.5">
                        <input
                          type="text"
                          autoFocus
                          value={editInputName}
                          onChange={(e) => setEditInputName(e.target.value)}
                          placeholder="ชื่อหัวหน้างาน..."
                          className="border border-blue-400 rounded px-1.5 py-0.5 text-xs text-black w-24 sm:w-28 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSignerName('supervisorApprovedBy', editInputName);
                            if (e.key === 'Escape') setEditingSlot(null);
                          }}
                        />
                        <button
                          type="button"
                          disabled={isSavingName}
                          onClick={() => handleSaveSignerName('supervisorApprovedBy', editInputName)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs"
                          title="บันทึก"
                        >
                          {isSavingName ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSlot(null)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow-xs"
                          title="ยกเลิก"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : supervisorName ? (
                      <div className="group relative flex items-center justify-center">
                        <span className="font-semibold text-center text-black text-xs sm:text-[13px] leading-normal px-1" title={supervisorName}>
                          {supervisorName}
                        </span>
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => {
                            setEditingSlot('supervisorApprovedBy');
                            setEditInputName(supervisorName);
                          }}
                          className="print:hidden ml-0.5 p-0.5 text-gray-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition"
                          title="แก้ไขชื่อหัวหน้างาน"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="group relative flex items-center justify-center">
                        <span className="text-gray-400 font-mono text-[11px] select-none leading-normal">
                          ................................
                        </span>
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => {
                            setEditingSlot('supervisorApprovedBy');
                            setEditInputName('');
                          }}
                          className="print:hidden ml-1 text-[10px] text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="ระบุชื่อหัวหน้างาน"
                        >
                          + ระบุชื่อ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Digital Signature Slot */}
                  <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                    {signatures.supervisorApprovedBy ? (
                      <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signatures.supervisorApprovedBy}
                          alt="ลายเซ็นหัวหน้างาน"
                          className="h-9 sm:h-10 max-w-[100px] object-contain mx-auto"
                        />
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => handleRemoveSignature('supervisorApprovedBy')}
                          title="ลบลายเซ็น"
                          className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic select-none leading-normal">(ลงลายมือชื่อ)</div>
                    )}
                    <div data-pdf-ignore="true" className="print:hidden mt-0.5 flex items-center gap-1.5">
                      {isSavingSignature.supervisorApprovedBy ? (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                        </span>
                      ) : savedSuccessSlot === 'supervisorApprovedBy' ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                          <Check className="w-3 h-3" /> บันทึกแล้ว
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-1.5 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                            {signatures.supervisorApprovedBy ? 'เปลี่ยน' : 'แนบลายเซ็น'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSignatureUpload('supervisorApprovedBy', e)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[22px] flex items-center justify-center text-[11px] sm:text-xs leading-normal py-0.5">
                    วันที่ {supervisorDate || request.supervisor_checked_at ? formatThaiDate(supervisorDate || request.supervisor_checked_at) : (supervisorName ? formatThaiDate(request.document_date) : '................................')}
                  </div>
                </div>

                {/* 3. ตรวจสอบโดย (Verified by) */}
                <div className="p-2 flex flex-col justify-between min-h-[120px] text-black">
                  <div className="min-h-[30px] flex items-center justify-center py-0.5">
                    {editingSlot === 'verifiedBy' ? (
                      <div className="print:hidden flex items-center justify-center gap-1 my-0.5">
                        <input
                          type="text"
                          autoFocus
                          value={editInputName}
                          onChange={(e) => setEditInputName(e.target.value)}
                          placeholder="ชื่อผู้ตรวจสอบ..."
                          className="border border-blue-400 rounded px-1.5 py-0.5 text-xs text-black w-24 sm:w-28 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSignerName('verifiedBy', editInputName);
                            if (e.key === 'Escape') setEditingSlot(null);
                          }}
                        />
                        <button
                          type="button"
                          disabled={isSavingName}
                          onClick={() => handleSaveSignerName('verifiedBy', editInputName)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs"
                          title="บันทึก"
                        >
                          {isSavingName ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSlot(null)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow-xs"
                          title="ยกเลิก"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : verifierName ? (
                      <div className="group relative flex items-center justify-center">
                        <span className="font-semibold text-center text-black text-xs sm:text-[13px] leading-normal px-1" title={verifierName}>
                          {verifierName}
                        </span>
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => {
                            setEditingSlot('verifiedBy');
                            setEditInputName(verifierName);
                          }}
                          className="print:hidden ml-0.5 p-0.5 text-gray-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition"
                          title="แก้ไขชื่อผู้ตรวจสอบ"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="group relative flex items-center justify-center">
                        <span className="text-gray-400 font-mono text-[11px] select-none leading-normal">
                          ................................
                        </span>
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => {
                            setEditingSlot('verifiedBy');
                            setEditInputName('');
                          }}
                          className="print:hidden ml-1 text-[10px] text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="ระบุชื่อผู้ตรวจสอบ"
                        >
                          + ระบุชื่อ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Digital Signature Slot */}
                  <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                    {signatures.verifiedBy ? (
                      <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signatures.verifiedBy}
                          alt="ลายเซ็นผู้ตรวจสอบ"
                          className="h-9 sm:h-10 max-w-[100px] object-contain mx-auto"
                        />
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => handleRemoveSignature('verifiedBy')}
                          title="ลบลายเซ็น"
                          className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic select-none leading-normal">(ลงลายมือชื่อ)</div>
                    )}
                    <div data-pdf-ignore="true" className="print:hidden mt-0.5 flex items-center gap-1.5">
                      {isSavingSignature.verifiedBy ? (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                        </span>
                      ) : savedSuccessSlot === 'verifiedBy' ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                          <Check className="w-3 h-3" /> บันทึกแล้ว
                        </span>
                      ) : (
                        <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-1.5 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                          {signatures.verifiedBy ? 'เปลี่ยน' : 'แนบลายเซ็น'}
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

                  <div className="min-h-[22px] flex items-center justify-center text-[11px] sm:text-xs leading-normal py-0.5">
                    วันที่ {verifierDate || request.accounting_manager_checked_at || request.ap_checked_at ? formatThaiDate(verifierDate || request.accounting_manager_checked_at || request.ap_checked_at) : (verifierName ? formatThaiDate(request.document_date) : '................................')}
                  </div>
                </div>

                {/* 4. อนุมัติโดย (Approved by) */}
                <div className="p-2 flex flex-col justify-between min-h-[120px] text-black">
                  <div className="min-h-[30px] flex items-center justify-center py-0.5">
                    {editingSlot === 'approvedBy' ? (
                      <div className="print:hidden flex items-center justify-center gap-1 my-0.5">
                        <input
                          type="text"
                          autoFocus
                          value={editInputName}
                          onChange={(e) => setEditInputName(e.target.value)}
                          placeholder="ชื่อผู้อนุมัติ..."
                          className="border border-blue-400 rounded px-1.5 py-0.5 text-xs text-black w-24 sm:w-28 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSignerName('approvedBy', editInputName);
                            if (e.key === 'Escape') setEditingSlot(null);
                          }}
                        />
                        <button
                          type="button"
                          disabled={isSavingName}
                          onClick={() => handleSaveSignerName('approvedBy', editInputName)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs"
                          title="บันทึก"
                        >
                          {isSavingName ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSlot(null)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow-xs"
                          title="ยกเลิก"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : approverName ? (
                      <div className="group relative flex items-center justify-center">
                        <span className="font-semibold text-center text-black text-xs sm:text-[13px] leading-normal px-1" title={approverName}>
                          {approverName}
                        </span>
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => {
                            setEditingSlot('approvedBy');
                            setEditInputName(approverName);
                          }}
                          className="print:hidden ml-0.5 p-0.5 text-gray-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition"
                          title="แก้ไขชื่อผู้อนุมัติ"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="group relative flex items-center justify-center">
                        <span className="text-gray-400 font-mono text-[11px] select-none leading-normal">
                          ................................
                        </span>
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => {
                            setEditingSlot('approvedBy');
                            setEditInputName('');
                          }}
                          className="print:hidden ml-1 text-[10px] text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="ระบุชื่อผู้อนุมัติ"
                        >
                          + ระบุชื่อ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Digital Signature Slot */}
                  <div className="flex flex-col items-center justify-center my-auto min-h-[46px]">
                    {signatures.approvedBy ? (
                      <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signatures.approvedBy}
                          alt="ลายเซ็นผู้อนุมัติ"
                          className="h-9 sm:h-10 max-w-[100px] object-contain mx-auto"
                        />
                        <button
                          type="button"
                          data-pdf-ignore="true"
                          onClick={() => handleRemoveSignature('approvedBy')}
                          title="ลบลายเซ็น"
                          className="print:hidden absolute -top-1 -right-3 p-0.5 text-red-500 hover:text-red-700 bg-white rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs italic select-none leading-normal">(ลงลายมือชื่อ)</div>
                    )}
                    <div data-pdf-ignore="true" className="print:hidden mt-0.5 flex items-center gap-1.5">
                      {isSavingSignature.approvedBy ? (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" /> กำลังบันทึก...
                        </span>
                      ) : savedSuccessSlot === 'approvedBy' ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 animate-in fade-in">
                          <Check className="w-3 h-3" /> บันทึกแล้ว
                        </span>
                      ) : (
                        <label className="cursor-pointer text-[10px] font-medium text-gray-600 hover:text-red-600 px-1.5 py-0.5 rounded border border-gray-300 hover:border-red-300 bg-gray-50 hover:bg-red-50 transition shadow-2xs">
                          {signatures.approvedBy ? 'เปลี่ยน' : 'แนบลายเซ็น'}
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

                  <div className="min-h-[22px] flex items-center justify-center text-[11px] sm:text-xs leading-normal py-0.5">
                    วันที่ {approvedDate || request.approved_at ? formatThaiDate(approvedDate || request.approved_at) : (approverName ? formatThaiDate(request.document_date) : '................................')}
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
                  พิมพ์เมื่อ: {printTimestamp} | {hasAttachments ? `หน้า 1 จาก ${1 + normalizedAttachments.length}` : 'แผ่นที่ 1/1'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continuation A4 Sheets for Attachments (Page 2, Page 3, ...) */}
        {hasAttachments && (activeTab === 'all' || activeTab === 'attachments') && (
          normalizedAttachments.map((att, idx) => {
            const badge = getFileBadge(att.name, att.type);
            const isPdf = att.type?.includes('pdf') || att.name?.toLowerCase().endsWith('.pdf') || att.url?.toLowerCase().includes('.pdf');
            const isImage = att.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || '') || /\.(jpg|jpeg|png|webp|gif)/i.test(att.url || '');
            const pageNumber = idx + 2;
            const totalPages = 1 + normalizedAttachments.length;

            return (
              <React.Fragment key={idx}>
                {/* Visual Page Break Separator (Screen only) */}
                <div className="w-full max-w-3xl mx-auto flex items-center justify-between my-6 text-xs text-gray-500 font-medium print:hidden">
                  <div className="flex-1 h-px bg-gray-300" />
                  <div className="mx-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 shadow-2xs">
                    <Paperclip size={13} className="text-red-500" />
                    <span>หน้า {pageNumber} จาก {totalPages}: เอกสารแนบ ({att.name})</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                </div>

                {/* Continuation A4 Paper Sheet */}
                <div
                  className="printable-sheet voucher-sarabun bg-white text-black shadow-md print:shadow-none border border-gray-200 print:border-none p-6 sm:p-8 max-w-3xl mx-auto my-4 print:my-0 flex flex-col justify-between"
                  style={{
                    minHeight: '280mm',
                    boxSizing: 'border-box',
                    fontFamily: "'TH Sarabun', 'TH Sarabun New', 'TH SarabunPSK', 'TH Sarabun Thai', 'Sarabun', sans-serif",
                  }}
                >
                  {/* Continuation Sheet Header */}
                  <div className="border-b-2 border-black pb-2 mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={companyInfo.logoUrl || '/4.png'}
                          alt={`${request.company || 'TERA'} Logo`}
                          className="h-10 w-auto object-contain shrink-0"
                        />
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-black leading-tight">
                            {companyInfo.th}
                          </h3>
                          <div className="text-xs text-gray-600 leading-tight">
                            เอกสารแนบประกอบใบขออนุมัติจ่ายเงิน / Attachment to Payment Request Voucher
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm sm:text-base font-bold text-black leading-tight">
                          {request.pay_number || '-'}
                        </div>
                        <div className="text-xs font-bold text-black mt-0.5">
                          หน้า {pageNumber} / {totalPages}
                        </div>
                      </div>
                    </div>

                    {/* File Details & Quick Actions */}
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-300 flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 text-gray-800">
                        <span className="font-bold text-black">เอกสารแนบรายการที่ {idx + 1}:</span>
                        <span className="font-semibold text-black truncate max-w-xs sm:max-w-md" title={att.name}>
                          {att.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${badge.bg}`}>
                          {badge.badge}
                        </span>
                        {att.size && <span className="text-gray-500 font-mono">({formatFileSize(att.size)})</span>}
                      </div>

                      <div className="flex items-center gap-3 print:hidden">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold hover:underline text-xs"
                          title="เปิดเอกสารในแท็บใหม่แบบเต็มจอ"
                        >
                          <ExternalLink size={12} /> เปิดดูเต็มจอ
                        </a>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleAttachment(att)}
                          className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-semibold hover:underline text-xs cursor-pointer"
                          title="ดาวน์โหลดไฟล์นี้"
                        >
                          <Download size={12} /> ดาวน์โหลดไฟล์
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Continuation Sheet Body */}
                  <div className="flex-1 w-full min-h-[220mm] bg-gray-50/60 rounded border border-gray-200 overflow-hidden relative flex flex-col justify-center items-center">
                    {isPdf ? (
                      <iframe
                        src={`${att.url}#toolbar=1&navpanes=0`}
                        className="w-full h-full min-h-[220mm] border-0"
                        title={`Preview ${att.name}`}
                      />
                    ) : isImage ? (
                      <div className="w-full h-full flex items-center justify-center p-2 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.name}
                          className="max-h-[215mm] max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="p-4 rounded-2xl bg-white shadow-xs border border-gray-200 mb-3 text-emerald-600">
                          {badge.icon}
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">{att.name}</h4>
                        <p className="text-xs text-gray-500 mb-4 max-w-sm">
                          เอกสารแนบประเภท {badge.badge} {att.size ? `(${formatFileSize(att.size)})` : ''} สามารถดาวน์โหลดเพื่อเปิดดูได้
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleAttachment(att)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <Download size={14} />
                          <span>ดาวน์โหลด {att.name}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Continuation Sheet Footer */}
                  <div className="text-[11px] text-gray-500 flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                    <span>* เอกสารแนบประกอบใบขออนุมัติจ่ายเงิน ({request.pay_number})</span>
                    <span>พิมพ์เมื่อ: {printTimestamp} | หน้า {pageNumber} จาก {totalPages}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>

    {/* TH Sarabun New & Sarabun Fonts + Robust Print & Canvas Isolation CSS */}
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

      @font-face {
        font-family: 'TH Sarabun New';
        font-style: normal;
        font-weight: 400;
        src: local('TH Sarabun New'),
             local('THSarabunNew'),
             local('Sarabun'),
             url('/Sarabun-Regular.woff2') format('woff2'),
             url('/Sarabun-Regular.ttf') format('truetype'),
             url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/Sarabun/Sarabun-Regular.woff2') format('woff2');
      }
      @font-face {
        font-family: 'TH Sarabun New';
        font-style: normal;
        font-weight: 700;
        src: local('TH Sarabun New Bold'),
             local('THSarabunNew-Bold'),
             local('Sarabun Bold'),
             url('/Sarabun-Bold.woff2') format('woff2'),
             url('/Sarabun-Bold.ttf') format('truetype'),
             url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@main/fonts/Sarabun/Sarabun-Bold.woff2') format('woff2');
      }

      .voucher-sarabun,
      .voucher-sarabun * {
        font-family: 'TH Sarabun New', 'Sarabun', Tahoma, sans-serif !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `}} />
  </div>
  );
}
