'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Loader2, 
  FileText, 
  Upload, 
  Check, 
  Trash2,
  Paperclip,
  ExternalLink,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Archive,
  ChevronDown,
  Layers,
  Eye,
  FolderDown
} from 'lucide-react';

interface PRPrintItemRow {
  code?: string;
  description: string;
  details?: string;
  quantity: string | number;
  unit?: string;
  unitPrice?: string | number;
}

interface PrintablePRData {
  prNumber: string;
  projectName: string;
  itemList: string;
  requestedBy: string;
  recordedAt?: string | null;
  note?: string | null;
  supplierName?: string;
  requiredDate?: string | null;
  deliveryBy?: string;
  itemRows?: PRPrintItemRow[];
  attachments?: any[];
  signatures?: {
    requester?: string | null;
    reviewer?: string | null;
    approver?: string | null;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prData: PrintablePRData;
  onSignaturesChange?: (signatures: { requester: string | null; reviewer: string | null; approver: string | null; }) => void;
}

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
  G: {
    th: 'บริษัท เทอรา กรุ้ป จำกัด',
    en: 'TERA GROUP CO., LTD.',
    taxId: '0105552112716',
    address: '39 ซ.เฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
    telFax: 'โทรศัพท์/Tel 02-328-0801-3 โทรสาร/Fax 02-328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
  E: {
    th: 'บริษัท เทอรา อิเล็กทริค จำกัด',
    en: 'TERA ELECTRIC CO., LTD.',
    taxId: '0105557159958',
    address: '39 ซ.เฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
    telFax: 'โทรศัพท์/Tel 02-328-0801-3 โทรสาร/Fax 02-328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
  P: {
    th: 'บริษัท เทอรา เพาเวอร์ จำกัด',
    en: 'TERA POWER CO., LTD.',
    taxId: '0105564011223',
    address: '39 ซ.เฉลิมพระเกียรติ ร.9 ซอย 28 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
    telFax: 'โทรศัพท์/Tel 02-328-0801-3 โทรสาร/Fax 02-328-0804',
    branchTitle: 'สำนักงานใหญ่',
  },
};

function formatExpressBEDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const beYear = String(d.getFullYear() + 543).slice(-2);
    return `${dd}/${mm}/${beYear}`;
  } catch {
    return String(dateInput);
  }
}

// Helper to compress signature image for instant rendering and storage
const getCompressedSignatureDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 380;
        const MAX_HEIGHT = 140;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', 0.92));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

type SignatureSlot = 'requester' | 'reviewer' | 'approver';

export default function PrintablePurchaseRequisitionModal({ 
  isOpen, 
  onClose, 
  prData, 
  onSignaturesChange 
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'pr' | 'attachments'>('all');
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState<boolean>(false);

  const hasAttachments = Boolean(prData.attachments && Array.isArray(prData.attachments) && prData.attachments.length > 0);
  const attachmentsList = (prData.attachments && Array.isArray(prData.attachments)) ? prData.attachments : [];

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getFileBadge = (filename: string, fileType?: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
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

  // Digital Signature state for 3 slots
  const [signatures, setSignatures] = useState<{
    requester: string | null;
    reviewer: string | null;
    approver: string | null;
  }>({
    requester: prData.signatures?.requester || null,
    reviewer: prData.signatures?.reviewer || null,
    approver: prData.signatures?.approver || null,
  });

  const [isUploadingSlot, setIsUploadingSlot] = useState<SignatureSlot | null>(null);
  const [saveStatusSlot, setSaveStatusSlot] = useState<SignatureSlot | null>(null);

  // Auto-load signature from localStorage (by PR number or by user name)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prKey = prData.prNumber ? `pr_sig_${prData.prNumber}` : 'pr_sig_draft';
    const userKey = prData.requestedBy ? `pr_sig_user_${prData.requestedBy}` : null;
    const crmKey = prData.requestedBy ? `crm_saved_signature_${prData.requestedBy}` : null;

    const cachedRequester = 
      localStorage.getItem(`${prKey}_requester`) ||
      (userKey ? localStorage.getItem(userKey) : null) ||
      (crmKey ? localStorage.getItem(crmKey) : null) ||
      localStorage.getItem('pr_default_requester_signature') ||
      prData.signatures?.requester ||
      null;

    const cachedReviewer = 
      localStorage.getItem(`${prKey}_reviewer`) ||
      localStorage.getItem('pr_default_reviewer_signature') ||
      prData.signatures?.reviewer ||
      null;

    const cachedApprover = 
      localStorage.getItem(`${prKey}_approver`) ||
      localStorage.getItem('pr_default_approver_signature') ||
      prData.signatures?.approver ||
      null;

    const loaded = {
      requester: cachedRequester,
      reviewer: cachedReviewer,
      approver: cachedApprover,
    };

    setSignatures(loaded);
    if (onSignaturesChange) {
      onSignaturesChange(loaded);
    }
  }, [prData.prNumber, prData.requestedBy]);

  // Handle uploading and persisting a signature
  const handleSignatureUpload = async (slot: SignatureSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingSlot(slot);

    try {
      // 1. Generate fast, clean compressed DataURL
      const dataUrl = await getCompressedSignatureDataUrl(file);

      // Instant local preview
      setSignatures(prev => {
        const next = { ...prev, [slot]: dataUrl };
        if (onSignaturesChange) onSignaturesChange(next);
        return next;
      });

      // 2. Upload to Supabase Storage in the background
      let finalUrl = dataUrl;
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'uploadsService');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          finalUrl = data.url;
        }
      } catch (uploadErr) {
        console.warn('API upload failed, using local data URL fallback:', uploadErr);
      }

      // 3. Persist in localStorage for permanent recall
      if (typeof window !== 'undefined') {
        const prKey = prData.prNumber ? `pr_sig_${prData.prNumber}` : 'pr_sig_draft';
        localStorage.setItem(`${prKey}_${slot}`, finalUrl);

        if (slot === 'requester') {
          if (prData.requestedBy) {
            localStorage.setItem(`pr_sig_user_${prData.requestedBy}`, finalUrl);
            localStorage.setItem(`crm_saved_signature_${prData.requestedBy}`, finalUrl);
          }
          localStorage.setItem('pr_default_requester_signature', finalUrl);
        } else if (slot === 'reviewer') {
          localStorage.setItem('pr_default_reviewer_signature', finalUrl);
        } else if (slot === 'approver') {
          localStorage.setItem('pr_default_approver_signature', finalUrl);
        }
      }

      setSaveStatusSlot(slot);
      setTimeout(() => setSaveStatusSlot(null), 2500);
    } catch (err) {
      console.error('Error saving signature:', err);
    } finally {
      setIsUploadingSlot(null);
    }
  };

  // Remove signature
  const handleRemoveSignature = (slot: SignatureSlot) => {
    setSignatures(prev => {
      const next = { ...prev, [slot]: null };
      if (onSignaturesChange) onSignaturesChange(next);
      return next;
    });

    if (typeof window !== 'undefined') {
      const prKey = prData.prNumber ? `pr_sig_${prData.prNumber}` : 'pr_sig_draft';
      localStorage.removeItem(`${prKey}_${slot}`);
      if (slot === 'requester') {
        if (prData.requestedBy) {
          localStorage.removeItem(`pr_sig_user_${prData.requestedBy}`);
        }
        localStorage.removeItem('pr_default_requester_signature');
      } else if (slot === 'reviewer') {
        localStorage.removeItem('pr_default_reviewer_signature');
      } else if (slot === 'approver') {
        localStorage.removeItem('pr_default_approver_signature');
      }
    }
  };

  if (!isOpen) return null;

  // Determine company from PR Number prefix (e.g. PR69-G... -> G, PR69-E... -> E, PR69-P... -> P)
  const prNum = prData.prNumber || '';
  const companyKey = 
    prNum.includes('-G') ? 'G' :
    prNum.includes('-E') ? 'E' :
    prNum.includes('-P') ? 'P' :
    'G';

  const company = companyInfoMap[companyKey] || companyInfoMap['G'];

  // Resolve items: use passed itemRows, or parse from itemList string
  const resolvedItems: PRPrintItemRow[] = 
    prData.itemRows && prData.itemRows.length > 0 
      ? prData.itemRows.filter(r => (r.description && r.description.trim()) || (r.details && r.details.trim()))
      : (prData.itemList || '')
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(line => {
            const clean = line.replace(/^\d+[\.\)]\s*/, '');
            let code = '';
            let desc = clean;
            let details = '';

            const codeMatch = desc.match(/^\[([^\]]+)\]\s*/);
            if (codeMatch) {
              code = codeMatch[1].trim();
              desc = desc.slice(codeMatch[0].length);
            }

            // Remove warehouse if any
            desc = desc.replace(/\(คลัง:\s*([^\)]+)\)/i, '').trim();

            // Remove price if any
            const priceMatch = desc.match(/@\s*([0-9\.,]+)\s*(?:บ\.|บาท)?/i);
            let unitPrice = '0.00';
            if (priceMatch) {
              unitPrice = priceMatch[1].replace(/,/g, '').trim();
              desc = desc.replace(priceMatch[0], '').trim();
            }

            // Remove qty & unit if any
            let quantity = '1.00';
            let unit = 'EA';
            const qtyUnitMatch = desc.match(/-\s*([0-9\.,]+)\s*([A-Za-zก-๙]+)?/i) ||
                                 desc.match(/จำนวน\s*([0-9\.,]+)\s*([A-Za-zก-๙]+)?/i);
            if (qtyUnitMatch) {
              quantity = qtyUnitMatch[1].replace(/,/g, '').trim();
              if (qtyUnitMatch[2]) unit = qtyUnitMatch[2].trim();
              desc = desc.replace(qtyUnitMatch[0], '').trim();
            }

            // Extract details in parentheses at the end if any
            const detailsMatch = desc.match(/\(([^)]+)\)\s*$/);
            if (detailsMatch) {
              details = detailsMatch[1].trim();
              desc = desc.slice(0, detailsMatch.index).trim();
            }

            return {
              code: code || undefined,
              description: desc,
              details: details || undefined,
              quantity,
              unit,
              unitPrice
            };
          });

  // Print Merged PDF handler (for printing all pages including PDF attachments)
  const handlePrintMergedPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfGenerationStatus('กำลังเตรียมเอกสารทุกหน้าสำหรับพิมพ์...');
    try {
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
      const canvas = await html2canvas(element, { scale: 2.2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      element.style.boxShadow = prevShadow;
      element.style.display = prevDisplay;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const basePdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      basePdf.addImage(imgData, 'JPEG', 6, 6, 198, 285);

      const { PDFDocument } = await import('pdf-lib');
      const prPdfBytes = basePdf.output('arraybuffer');
      const mergedPdf = await PDFDocument.create();

      const prDoc = await PDFDocument.load(prPdfBytes);
      const prPages = await mergedPdf.copyPages(prDoc, prDoc.getPageIndices());
      prPages.forEach(p => mergedPdf.addPage(p));

      for (let i = 0; i < attachmentsList.length; i++) {
        const att = attachmentsList[i];
        setPdfGenerationStatus(`กำลังเตรียมเอกสารแนบ (${i + 1}/${attachmentsList.length}): ${att.name}...`);
        try {
          const ext = (att.name || '').split('.').pop()?.toLowerCase() || '';
          const res = await fetch(att.url);
          if (!res.ok) continue;
          const attBytes = await res.arrayBuffer();

          if (ext === 'pdf') {
            const attDoc = await PDFDocument.load(attBytes, { ignoreEncryption: true });
            const copiedPages = await mergedPdf.copyPages(attDoc, attDoc.getPageIndices());
            copiedPages.forEach(p => mergedPdf.addPage(p));
          } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
            let imgEmbed;
            if (ext === 'png') {
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
              height: dims.height
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

  // Browser Print handler
  const handlePrint = async () => {
    const hasPdfAttachment = attachmentsList.some((att: any) => 
      att.name?.toLowerCase().endsWith('.pdf') || att.type?.includes('pdf') || att.url?.toLowerCase().includes('.pdf')
    );

    if (hasAttachments && hasPdfAttachment && activeTab !== 'pr') {
      await handlePrintMergedPdf();
    } else {
      window.print();
    }
  };

  // Direct PDF Download handler using html2canvas + jsPDF (+ optional pdf-lib merge)
  const handleDownloadPDF = async (mode: 'merged' | 'pr_only' = 'merged') => {
    if (!printRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfGenerationStatus('กำลังสร้างหน้าเอกสาร PR...');
    setShowDownloadMenu(false);
    setShowAttachmentsMenu(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 80));

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
      element.style.boxShadow = 'none';

      const canvas = await html2canvas(element, {
        scale: 2.5, // Crisp high-DPI print render
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => {
          return (
            el.classList?.contains('print:hidden') ||
            el.classList?.contains('no-print') ||
            el.getAttribute?.('data-html2canvas-ignore') === 'true'
          );
        },
      });

      element.style.boxShadow = prevShadow;
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
        setPdfGenerationStatus('กำลังผสานเอกสารแนบจากผู้ขายเข้ากับ PDF...');
        try {
          const { PDFDocument } = await import('pdf-lib');
          const prPdfBytes = pdf.output('arraybuffer');
          const mergedPdf = await PDFDocument.create();

          // 1. Copy PR Page(s)
          const prDoc = await PDFDocument.load(prPdfBytes);
          const prPages = await mergedPdf.copyPages(prDoc, prDoc.getPageIndices());
          prPages.forEach(p => mergedPdf.addPage(p));

          // 2. Append each attachment
          for (let i = 0; i < attachmentsList.length; i++) {
            const att = attachmentsList[i];
            setPdfGenerationStatus(`กำลังประมวลผลไฟล์แนบ (${i + 1}/${attachmentsList.length}): ${att.name}...`);
            try {
              const ext = (att.name || '').split('.').pop()?.toLowerCase() || '';
              const res = await fetch(att.url);
              if (!res.ok) continue;
              const attBytes = await res.arrayBuffer();

              if (ext === 'pdf') {
                const attDoc = await PDFDocument.load(attBytes, { ignoreEncryption: true });
                const copiedPages = await mergedPdf.copyPages(attDoc, attDoc.getPageIndices());
                copiedPages.forEach(p => mergedPdf.addPage(p));
              } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                let imgEmbed;
                if (ext === 'png') {
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
                  height: dims.height
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
          link.download = `ใบขอซื้อ_${prData.prNumber || 'PR'}_รวมเอกสารแนบ.pdf`;
          link.click();
          URL.revokeObjectURL(link.href);
          return;
        } catch (mergeErr) {
          console.warn('PDF-lib merge fallback to single PR pdf:', mergeErr);
        }
      }

      // Single PR page download
      pdf.save(`ใบขอซื้อ_${prData.prNumber || 'PR'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
      setPdfGenerationStatus('');
    }
  };

  // ZIP Download handler using jszip
  const handleDownloadZip = async () => {
    if (!hasAttachments) return;
    setIsGeneratingPdf(true);
    setPdfGenerationStatus('กำลังเตรียมแพ็กเกจไฟล์ ZIP...');
    setShowDownloadMenu(false);
    setShowAttachmentsMenu(false);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. Generate PR PDF
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const element = printRef.current;
      if (element) {
        const prevDisplay = element.style.display;
        element.style.display = 'block';
        const prevShadow = element.style.boxShadow;
        element.style.boxShadow = 'none';
        const canvas = await html2canvas(element, { scale: 2.2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        element.style.boxShadow = prevShadow;
        element.style.display = prevDisplay;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'JPEG', 6, 6, 198, 285);
        zip.file(`1_ใบขอซื้อ_${prData.prNumber || 'PR'}.pdf`, pdf.output('arraybuffer'));
      }

      // 2. Fetch and add attachments
      for (let i = 0; i < attachmentsList.length; i++) {
        const att = attachmentsList[i];
        setPdfGenerationStatus(`กำลังดาวน์โหลดไฟล์ (${i + 1}/${attachmentsList.length}): ${att.name}...`);
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

      setPdfGenerationStatus('กำลังบีบอัดไฟล์ ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `ชุดเอกสารPR_${prData.prNumber || 'PR'}_พร้อมเอกสารแนบ.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error downloading zip:', err);
    } finally {
      setIsGeneratingPdf(false);
      setPdfGenerationStatus('');
    }
  };

  const formattedDocDate = formatExpressBEDate(prData.recordedAt || new Date());
  const formattedReqDate = formatExpressBEDate(prData.requiredDate || prData.recordedAt || new Date());

  // Fixed number of table body rows to match Express sheet height
  const minTableRows = 14;
  const fillerCount = Math.max(0, minTableRows - resolvedItems.length);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="w-full max-w-5xl bg-gray-900 text-white rounded-2xl px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 mb-4 sticky top-2 z-50 print:hidden border border-gray-800">
        
        {/* Left: Document Identity */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">
            <FileText size={16} />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>{hasAttachments ? `พรีวิวชุดเอกสาร PR (${1 + attachmentsList.length} หน้า)` : 'พรีวิวใบขอซื้อ (PR)'}</span>
              {hasAttachments && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                  มีแนบ {attachmentsList.length} ไฟล์
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {prData.prNumber || 'PR-DRAFT'}
            </div>
          </div>
        </div>

        {/* Center: View Tabs (If attachments exist) */}
        {hasAttachments && (
          <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'all' ? 'bg-red-600 text-white font-bold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={12} />
              <span>ดูทั้งหมดต่อเนื่อง ({1 + attachmentsList.length} หน้า)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pr')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'pr' ? 'bg-red-600 text-white font-bold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText size={12} />
              <span>เฉพาะใบขอซื้อ (หน้า 1)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'attachments' ? 'bg-red-600 text-white font-bold shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Paperclip size={12} />
              <span>เฉพาะเอกสารแนบ ({attachmentsList.length})</span>
            </button>
          </div>
        )}

        {/* Right: Actions, Zoom & Download */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5 border border-gray-700">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(60, prev - 10))}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="ซูมออก"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono w-10 text-center text-gray-200">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(140, prev + 10))}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="ซูมเข้า"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="รีเซ็ตซูม 100%"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Attachments Quick Dropdown (If attachments exist) */}
          {hasAttachments && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentsMenu(!showAttachmentsMenu);
                  setShowDownloadMenu(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="ดูรายชื่อไฟล์แนบทั้งหมด"
              >
                <Paperclip size={13} className="text-red-400" />
                <span>ไฟล์แนบ ({attachmentsList.length})</span>
                <ChevronDown size={12} />
              </button>

              {showAttachmentsMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-gray-700 font-bold text-gray-200 flex items-center justify-between">
                    <span>เอกสารแนบจากผู้ขาย</span>
                    <span className="text-[10px] text-gray-400">{attachmentsList.length} ไฟล์</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-700/50">
                    {attachmentsList.map((att: any, aIdx: number) => {
                      const badge = getFileBadge(att.name, att.type);
                      return (
                        <div key={aIdx} className="p-2.5 hover:bg-gray-700/50 transition flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white truncate text-[11px]" title={att.name}>
                              {att.name}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {badge.badge} {att.size ? `• ${formatFileSize(att.size)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-600 rounded text-blue-400 hover:text-blue-300"
                              title="เปิดดูเต็มจอ"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleAttachment(att)}
                              className="p-1 hover:bg-gray-600 rounded text-emerald-400 hover:text-emerald-300"
                              title="ดาวน์โหลดไฟล์นี้"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 px-2 border-t border-gray-700">
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      className="w-full py-1.5 px-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Archive size={13} />
                      <span>ดาวน์โหลดทั้งหมดเป็น ZIP</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Download Button with Dropdown */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => handleDownloadPDF(hasAttachments ? 'merged' : 'pr_only')}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-l-lg text-xs font-semibold shadow-xs transition-colors"
              title={hasAttachments ? 'ดาวน์โหลดเอกสาร PR รวมกับเอกสารแนบทุกหน้าเป็นไฟล์ PDF เดียว' : 'ดาวน์โหลดเอกสารใบขอซื้อเป็นไฟล์ PDF'}
            >
              {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{hasAttachments ? `ดาวน์โหลด PDF รวม (${1 + attachmentsList.length} หน้า)` : 'ดาวน์โหลด PDF'}</span>
            </button>

            {hasAttachments && (
              <button
                type="button"
                onClick={() => {
                  setShowDownloadMenu(!showDownloadMenu);
                  setShowAttachmentsMenu(false);
                }}
                disabled={isGeneratingPdf}
                className="px-1.5 py-1.5 bg-red-700 hover:bg-red-800 disabled:bg-gray-700 text-white rounded-r-lg text-xs font-semibold border-l border-red-500 transition-colors"
                title="ตัวเลือกการดาวน์โหลดอื่นๆ"
              >
                <ChevronDown size={14} />
              </button>
            )}

            {showDownloadMenu && hasAttachments && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF('merged')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 text-white flex items-center gap-2 transition"
                >
                  <Layers size={14} className="text-red-400" />
                  <div>
                    <div className="font-semibold text-xs">ดาวน์โหลด PDF รวมเอกสารแนบ</div>
                    <div className="text-[10px] text-gray-400">ใบขอซื้อ PR + ใบเสนอราคาในไฟล์เดียว</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF('pr_only')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 text-white flex items-center gap-2 transition"
                >
                  <FileText size={14} className="text-blue-400" />
                  <div>
                    <div className="font-semibold text-xs">ดาวน์โหลดเฉพาะใบขอซื้อ (PR)</div>
                    <div className="text-[10px] text-gray-400">PDF เฉพาะใบขอซื้อหน้าเดียว</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 text-white flex items-center gap-2 transition border-t border-gray-700 mt-1 pt-1.5"
                >
                  <Archive size={14} className="text-amber-400" />
                  <div>
                    <div className="font-semibold text-xs">ดาวน์โหลดทั้งหมดเป็น ZIP</div>
                    <div className="text-[10px] text-gray-400">รวมไฟล์ PR + ไฟล์แนบต้นฉบับทั้งหมด</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer size={14} />
            <span>พิมพ์</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors ml-1"
            title="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Floating Status Toast when generating PDF or Merging */}
      {isGeneratingPdf && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 text-xs animate-in slide-in-from-bottom">
          <Loader2 size={18} className="animate-spin text-red-500" />
          <div>
            <div className="font-bold">{pdfGenerationStatus || 'กำลังประมวลผลเอกสาร...'}</div>
            <div className="text-[11px] text-gray-400">ระบบกำลังเตรียมไฟล์ กรุณารอสักครู่</div>
          </div>
        </div>
      )}

      {/* Printable Sheet Viewport */}
      <div 
        className="w-full flex flex-col items-center pb-12 print:p-0 print:m-0"
        style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined, transformOrigin: 'top center' }}
      >
        <div id="pr-printable-document" className="w-full flex flex-col items-center">
          <div
            ref={printRef}
            id="pr-printable-sheet"
            className={`printable-sheet bg-white text-black shadow-2xl print:shadow-none print:block relative ${activeTab === 'attachments' ? 'hidden' : 'block'}`}
            style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm 12mm',
            boxSizing: 'border-box',
            fontSize: '14px',
            lineHeight: 1.25,
            color: '#000000',
            backgroundColor: '#ffffff',
            fontFamily: "'TH Sarabun New', 'Sarabun', Tahoma, sans-serif"
          }}
        >
          {/* 1. Header: Logo + Company Info (Left) | Document Title (Right) */}
          <div className="flex items-start justify-between gap-4 pb-2">
            {/* Left: TERA Logo & Company Details */}
            <div className="flex items-start gap-3 flex-1">
              <div className="shrink-0 pt-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/4.png"
                  alt="TERA Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
              <div className="space-y-0.5 leading-tight">
                <h1 className="text-[19px] font-bold text-black tracking-tight leading-none">
                  {company.th}
                </h1>
                <p className="text-[13px] text-gray-800 leading-tight">
                  {company.address}
                </p>
                <p className="text-[13px] text-gray-800 leading-tight whitespace-nowrap">
                  {company.telFax}
                </p>
                <div className="text-[13px] text-gray-800 flex items-center gap-4 pt-0.5 leading-tight whitespace-nowrap">
                  <span className="whitespace-nowrap">
                    เลขประจำตัวผู้เสียภาษี/ Tax ID <strong className="font-semibold text-black">{company.taxId}</strong>
                  </span>
                  <span className="whitespace-nowrap shrink-0">{company.branchTitle}</span>
                </div>
              </div>
            </div>

            {/* Right: Document Title */}
            <div className="text-right shrink-0 pt-0.5">
              <h2 className="text-[23px] font-bold text-black tracking-tight leading-none">
                ใบขอซื้อ/ Purchase Requisition
              </h2>
              <div className="text-[15px] font-bold text-black mt-1">
                ต้นฉบับ/Original {hasAttachments && `(หน้า 1/${1 + attachmentsList.length})`}
              </div>
            </div>
          </div>

          {/* 2. Top Symmetrical Rounded Info Boxes */}
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            
            {/* Left Box: Supplier & Reference */}
            <div className="border border-black rounded-xl p-2.5 min-h-[96px] text-[13px] space-y-1 relative">
              <div className="flex items-start">
                <span className="w-20 shrink-0 font-normal text-black leading-snug">
                  ผู้จำหน่าย<br /><span className="text-[10px] text-gray-600">Supplier</span>
                </span>
                <span className="font-medium text-black">
                  {prData.supplierName || '000000000'}
                </span>
              </div>
              <div className="pl-20 text-[11px] text-gray-600 leading-tight">
                000000 000000
              </div>
              <div className="pl-20 text-[11px] text-gray-600 leading-tight">
                39180
              </div>
              <div className="flex items-start pt-1">
                <span className="w-20 shrink-0 font-normal text-black leading-snug">
                  อ้างอิง<br /><span className="text-[10px] text-gray-600">Reference</span>
                </span>
                <span className="font-bold text-black flex-1 break-words leading-tight">
                  {prData.projectName || '-'}
                </span>
              </div>
            </div>

            {/* Right Box: PR Number & Document Dates */}
            <div className="border border-black rounded-xl p-2.5 min-h-[96px] text-[13px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-normal text-black leading-snug">
                  เลขที่ใบขอซื้อ<br /><span className="text-[10px] text-gray-600">PR No.</span>
                </span>
                <span className="font-bold text-black text-[16px]">
                  {prData.prNumber || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-0.5">
                <span className="font-normal text-black leading-snug">
                  วันที่<br /><span className="text-[10px] text-gray-600">Date</span>
                </span>
                <span className="font-medium text-black">
                  {formattedDocDate}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-0.5">
                <span className="font-normal text-black leading-snug">
                  วันที่รับของ<br /><span className="text-[10px] text-gray-600">Required Date</span>
                </span>
                <span className="font-medium text-black">
                  {formattedReqDate}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-0.5">
                <span className="font-normal text-black leading-snug">
                  ขนส่งโดย<br /><span className="text-[10px] text-gray-600">Delivery by</span>
                </span>
                <span className="font-medium text-black">
                  {prData.deliveryBy || '-'}
                </span>
              </div>
              {hasAttachments && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-0.5">
                  <span className="font-normal text-black leading-snug">
                    เอกสารแนบ<br /><span className="text-[10px] text-gray-600">Attachment</span>
                  </span>
                  <span className="font-semibold text-black text-[12px]">
                    มี {attachmentsList.length} ไฟล์ (ต่อหน้า 2)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Main Accounting Ledger Box (Continuous Vertical Lines & Integrated Remarks) */}
          <div className="mt-2.5 border border-black rounded-xl overflow-hidden flex flex-col">
            {/* Table Section */}
            <table className="w-full border-collapse text-[13px] table-fixed border-b border-black">
              <thead>
                <tr className="border-b border-black text-center font-bold text-black bg-gray-50/60 leading-tight">
                  <th className="w-12 py-1.5 px-1 border-r border-black font-bold">
                    ลำดับ<br /><span className="text-[10px] font-normal">No.</span>
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-black text-left font-bold">
                    รหัสสินค้า/รายละเอียด<br /><span className="text-[10px] font-normal">Code/ Descriptions</span>
                  </th>
                  <th className="w-28 py-1.5 px-2 border-r border-black text-right font-bold">
                    จำนวน<br /><span className="text-[10px] font-normal">Quantity</span>
                  </th>
                  <th className="w-28 py-1.5 px-2 text-right font-bold">
                    ราคา<br /><span className="text-[10px] font-normal">Price</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Active Populated Item Rows */}
                {resolvedItems.map((item, idx) => {
                  const qty = parseFloat(String(item.quantity)) || 1;
                  const unitStr = item.unit ? ` ${item.unit}` : '';
                  const price = parseFloat(String(item.unitPrice)) || 0;

                  return (
                    <tr key={idx} className="align-top leading-snug">
                      <td className="py-1.5 px-1 border-r border-black text-center">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-black text-left">
                        <div className="text-black whitespace-pre-line break-words leading-tight">
                          <div>
                            {item.code ? <span className="font-bold text-gray-900">[{item.code}] </span> : null}
                            <span>{item.description}</span>
                          </div>
                          {item.details && item.details.trim() && (
                            <div className="text-[12px] text-gray-800 font-normal mt-0.5 leading-snug">
                              ({item.details.trim().replace(/^\((.*)\)$/, '$1')})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 border-r border-black text-right font-medium">
                        {qty.toFixed(2)}{unitStr}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {price > 0 ? price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  );
                })}

                {/* Filler rows carrying continuous vertical column borders all the way to the bottom border */}
                {[...Array(fillerCount)].map((_, i) => (
                  <tr key={`filler-${i}`} className="h-[28px] leading-none">
                    <td className="border-r border-black">&nbsp;</td>
                    <td className="border-r border-black">&nbsp;</td>
                    <td className="border-r border-black">&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4. Integrated Remark Section */}
            <div className="p-2.5 min-h-[68px] text-[13px] bg-white">
              <span className="font-bold text-black block leading-tight">
                หมายเหตุ<br /><span className="text-[10px] font-normal text-gray-600">Remark</span>
              </span>
              <div className="text-gray-800 whitespace-pre-line mt-1">
                {prData.note || '-'}
                {prData.attachments && Array.isArray(prData.attachments) && prData.attachments.length > 0 && (
                  <div className="mt-1.5 pt-1 border-t border-gray-200 text-[11px] text-gray-700">
                    <span className="font-bold text-black">เอกสารแนบจากผู้ขาย ({prData.attachments.length} ไฟล์): </span>
                    <span>{prData.attachments.map((a: any) => a.name || 'เอกสารแนบ').join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Signatures Footer (3 Columns with Upload & Permanent Persistence) */}
          <div className="mt-8 pt-4 grid grid-cols-3 gap-6 text-center text-[13px]">
            
            {/* Requester Column */}
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center pb-0.5 relative group">
                {signatures.requester ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatures.requester}
                      alt="ลายเซ็นผู้ขอซื้อ"
                      className="h-11 max-w-[130px] object-contain mx-auto select-none"
                    />
                    {!isGeneratingPdf && (
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => handleRemoveSignature('requester')}
                        title="ลบลายเซ็น"
                        className="print:hidden absolute -top-1.5 -right-3.5 p-0.5 text-red-500 hover:text-white bg-white hover:bg-red-600 rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="italic text-gray-700 text-[13px]">
                    {prData.requestedBy || '...........................'}
                  </span>
                )}
              </div>

              <div className="border-b border-black w-4/5 mx-auto" />

              <div className="font-bold text-black pt-0.5 leading-tight">
                ผู้ขอซื้อ (เจ้าหน้าที่)
              </div>
              {signatures.requester && prData.requestedBy && (
                <div className="text-[11px] text-gray-600 leading-tight">
                  ({prData.requestedBy})
                </div>
              )}

              {/* Interactive Upload Controls (Hidden on Print & PDF) */}
              {!isGeneratingPdf && (
                <div data-html2canvas-ignore="true" className="print:hidden pt-1 flex items-center justify-center gap-1.5">
                  {isUploadingSlot === 'requester' ? (
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin text-red-600" />
                      กำลังบันทึก...
                    </span>
                  ) : saveStatusSlot === 'requester' ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <Check size={11} />
                      บันทึกแล้ว
                    </span>
                  ) : (
                    <label className="cursor-pointer text-[10px] font-semibold text-gray-700 hover:text-red-700 px-2 py-0.5 rounded border border-gray-300 hover:border-red-400 bg-gray-50 hover:bg-red-50 transition shadow-2xs flex items-center gap-1">
                      <Upload size={10} />
                      <span>{signatures.requester ? 'เปลี่ยนภาพ' : 'แนบลายเซ็น'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSignatureUpload('requester', e)}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Reviewer / Supervisor Column */}
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center pb-0.5 relative group">
                {signatures.reviewer ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatures.reviewer}
                      alt="ลายเซ็นผู้ตรวจสอบ"
                      className="h-11 max-w-[130px] object-contain mx-auto select-none"
                    />
                    {!isGeneratingPdf && (
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => handleRemoveSignature('reviewer')}
                        title="ลบลายเซ็น"
                        className="print:hidden absolute -top-1.5 -right-3.5 p-0.5 text-red-500 hover:text-white bg-white hover:bg-red-600 rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-6" />
                )}
              </div>

              <div className="border-b border-black w-4/5 mx-auto" />

              <div className="font-bold text-black pt-0.5 leading-tight">
                ผู้ตรวจสอบ (หัวหน้าฝ่าย)
              </div>

              {/* Interactive Upload Controls (Hidden on Print & PDF) */}
              {!isGeneratingPdf && (
                <div data-html2canvas-ignore="true" className="print:hidden pt-1 flex items-center justify-center gap-1.5">
                  {isUploadingSlot === 'reviewer' ? (
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin text-red-600" />
                      กำลังบันทึก...
                    </span>
                  ) : saveStatusSlot === 'reviewer' ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <Check size={11} />
                      บันทึกแล้ว
                    </span>
                  ) : (
                    <label className="cursor-pointer text-[10px] font-semibold text-gray-700 hover:text-red-700 px-2 py-0.5 rounded border border-gray-300 hover:border-red-400 bg-gray-50 hover:bg-red-50 transition shadow-2xs flex items-center gap-1">
                      <Upload size={10} />
                      <span>{signatures.reviewer ? 'เปลี่ยนภาพ' : 'แนบลายเซ็น'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSignatureUpload('reviewer', e)}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Approver Column */}
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center pb-0.5 relative group">
                {signatures.approver ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatures.approver}
                      alt="ลายเซ็นผู้อนุมัติ"
                      className="h-11 max-w-[130px] object-contain mx-auto select-none"
                    />
                    {!isGeneratingPdf && (
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => handleRemoveSignature('approver')}
                        title="ลบลายเซ็น"
                        className="print:hidden absolute -top-1.5 -right-3.5 p-0.5 text-red-500 hover:text-white bg-white hover:bg-red-600 rounded-full border border-red-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-6" />
                )}
              </div>

              <div className="border-b border-black w-4/5 mx-auto" />

              <div className="font-bold text-black pt-0.5 leading-tight">
                ผู้อนุมัติ (ผู้อำนวยการสาย)
              </div>

              {/* Interactive Upload Controls (Hidden on Print & PDF) */}
              {!isGeneratingPdf && (
                <div data-html2canvas-ignore="true" className="print:hidden pt-1 flex items-center justify-center gap-1.5">
                  {isUploadingSlot === 'approver' ? (
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin text-red-600" />
                      กำลังบันทึก...
                    </span>
                  ) : saveStatusSlot === 'approver' ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <Check size={11} />
                      บันทึกแล้ว
                    </span>
                  ) : (
                    <label className="cursor-pointer text-[10px] font-semibold text-gray-700 hover:text-red-700 px-2 py-0.5 rounded border border-gray-300 hover:border-red-400 bg-gray-50 hover:bg-red-50 transition shadow-2xs flex items-center gap-1">
                      <Upload size={10} />
                      <span>{signatures.approver ? 'เปลี่ยนภาพ' : 'แนบลายเซ็น'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSignatureUpload('approver', e)}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supplier Attachments as Continuation Pages (Page 2, Page 3...) */}
        {hasAttachments && (activeTab === 'all' || activeTab === 'attachments') && (
          attachmentsList.map((att: any, idx: number) => {
            const badge = getFileBadge(att.name, att.type);
            const isPdf = att.type?.includes('pdf') || att.name?.toLowerCase().endsWith('.pdf') || att.url?.toLowerCase().includes('.pdf');
            const isImage = att.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || '') || /\.(jpg|jpeg|png|webp|gif)/i.test(att.url || '');
            const pageNumber = idx + 2;
            const totalPages = 1 + attachmentsList.length;

            return (
              <React.Fragment key={idx}>
                {/* Visual Page Break Indicator between A4 sheets (Screen only) */}
                <div className="w-full max-w-[210mm] flex items-center justify-between my-6 text-xs text-gray-400 font-medium print:hidden">
                  <div className="flex-1 h-px bg-gray-700/60" />
                  <div className="mx-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-200 shadow-sm">
                    <Paperclip size={13} className="text-red-400" />
                    <span>หน้า {pageNumber} จาก {totalPages}: เอกสารแนบจากผู้ขาย ({att.name})</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-700/60" />
                </div>

                {/* Continuation A4 Paper Sheet */}
                <div
                  className="printable-sheet bg-white text-black shadow-2xl print:shadow-none print:block relative flex flex-col justify-between"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '8mm 12mm',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    lineHeight: 1.25,
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    fontFamily: "'TH Sarabun New', 'Sarabun', Tahoma, sans-serif"
                  }}
                >
                  {/* Header */}
                  <div className="border-b-2 border-black pb-2 mb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/4.png"
                          alt="TERA Logo"
                          className="h-10 w-auto object-contain shrink-0"
                        />
                        <div>
                          <h3 className="text-[17px] font-bold text-black leading-tight">
                            {company.th}
                          </h3>
                          <div className="text-[12px] text-gray-700 leading-tight">
                            เอกสารแนบประกอบใบขอซื้อ / Attachment to Purchase Requisition
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[16px] font-bold text-black leading-tight">
                          {prData.prNumber || '-'}
                        </div>
                        <div className="text-[12px] font-bold text-black mt-0.5">
                          หน้า {pageNumber} / {totalPages}
                        </div>
                      </div>
                    </div>

                    {/* File Details & Quick Action Bar */}
                    <div className="mt-2 pt-1.5 border-t border-dashed border-gray-300 flex flex-wrap items-center justify-between text-[12px] gap-2">
                      <div className="flex items-center gap-2 text-gray-800">
                        <span className="font-bold text-black">เอกสารแนบรายการที่ {idx + 1}:</span>
                        <span className="font-semibold text-black truncate max-w-xs sm:max-w-md" title={att.name}>
                          {att.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-bold border border-gray-200">
                          {badge.badge}
                        </span>
                        {att.size && <span className="text-gray-500">({formatFileSize(att.size)})</span>}
                        {att.supplier && <span className="text-gray-600">• ผู้ขาย: {att.supplier}</span>}
                      </div>

                      <div className="flex items-center gap-3 print:hidden">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold hover:underline text-[12px]"
                          title="เปิดเอกสารในแท็บใหม่แบบเต็มจอ"
                        >
                          <ExternalLink size={12} /> เปิดดูเต็มจอ
                        </a>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleAttachment(att)}
                          className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-semibold hover:underline text-[12px]"
                          title="ดาวน์โหลดไฟล์นี้"
                        >
                          <Download size={12} /> ดาวน์โหลดไฟล์
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Document Page Body */}
                  <div className="flex-1 w-full min-h-[235mm] h-[235mm] bg-gray-50/50 rounded-sm border border-gray-300 overflow-hidden relative flex flex-col justify-center items-center">
                    {isPdf ? (
                      <iframe
                        src={`${att.url}#toolbar=1&navpanes=0`}
                        className="w-full h-full border-0"
                        title={`Preview ${att.name}`}
                      />
                    ) : isImage ? (
                      <div className="w-full h-full flex items-center justify-center p-2 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.name}
                          className="max-h-[230mm] max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-200 mb-3 text-emerald-600">
                          {badge.icon}
                        </div>
                        <h4 className="text-base font-bold text-gray-900 mb-1">{att.name}</h4>
                        <p className="text-xs text-gray-500 mb-4 max-w-sm">
                          เอกสารแนบประเภท {badge.badge} {att.size ? `(${formatFileSize(att.size)})` : ''} สามารถดาวน์โหลดเพื่อเปิดด้วยโปรแกรมในเครื่องของคุณ
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleAttachment(att)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          <Download size={14} />
                          <span>ดาวน์โหลด {att.name}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-black mt-2 pt-1.5 flex items-center justify-between text-[11px] text-gray-600">
                    <div className="truncate max-w-md">
                      อ้างอิงโครงการ: <strong className="text-black font-semibold">{prData.projectName || '-'}</strong> | ผู้ขอซื้อ: <strong className="text-black font-semibold">{prData.requestedBy || '-'}</strong>
                    </div>
                    <div className="shrink-0 font-bold text-black">
                      หน้า {pageNumber} จาก {totalPages}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        </div>
      </div>

      {/* TH Sarabun New @font-face & Robust Print-Only Isolation CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');

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

        #pr-printable-document,
        #pr-printable-document *,
        #pr-printable-sheet,
        #pr-printable-sheet * {
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
          body * {
            visibility: hidden !important;
          }
          #pr-printable-document,
          #pr-printable-document * {
            visibility: visible !important;
          }
          #pr-printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .printable-sheet {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 285mm !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .printable-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
