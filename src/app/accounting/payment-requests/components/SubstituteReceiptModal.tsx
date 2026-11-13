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
} from './SubstituteReceiptCertificate';
import SubstituteReceiptCertificateView from './SubstituteReceiptCertificate';
import { truncate2Decimals } from '../utils/itemTaxes';
import type { SupervisorOption } from '@/app/actions/paymentRequests';
import { normalizePersonName } from '@/app/lib/roleHelper';
import { thaiBahtText } from '@/app/lib/thaiBahtText';
import {
  X,
  Printer,
  Download,
  Check,
  RefreshCw,
  FileText,
  Building2,
  User,
  Info,
  PenLine,
  Eraser,
  Trash2,
  Upload,
  CheckCircle2,
  Copy,
  Search,
  ChevronDown,
  Eye,
  Edit3,
  AlertCircle,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import Swal from 'sweetalert2';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialData: SubstituteReceiptData;
  defaultSigTab?: 'requester' | 'approver';
  defaultApproverName?: string;
  defaultApproverId?: string;
  supervisorOptions?: SupervisorOption[];
  currentUserId?: string;
  currentUserEmpId?: string | null;
  signingRole?: 'requester' | 'approver' | 'both';
  saveButtonLabel?: string;
  onSaveAndAttach?: (
    updatedData: SubstituteReceiptData,
    attachment: {
      url: string;
      fileName: string;
      fileSize: number;
      dataUrl?: string;
    }
  ) => Promise<void> | void;
};

export default function SubstituteReceiptModal({
  isOpen,
  onClose,
  initialData,
  defaultSigTab = 'requester',
  defaultApproverName = '',
  defaultApproverId = '',
  supervisorOptions = [],
  currentUserId = '',
  currentUserEmpId = null,
  signingRole = 'both',
  saveButtonLabel,
  onSaveAndAttach,
}: Props) {
  const [formData, setFormData] = useState<SubstituteReceiptData>(initialData);
  const [modalTab, setModalTab] = useState<'edit' | 'preview'>('edit');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [activeSigTab, setActiveSigTab] = useState<'requester' | 'approver'>(
    signingRole === 'approver' ? 'approver' : signingRole === 'requester' ? 'requester' : defaultSigTab
  );
  const effectiveSigTab: 'requester' | 'approver' =
    signingRole === 'requester' ? 'requester' : signingRole === 'approver' ? 'approver' : activeSigTab;
  const [useSameSignature, setUseSameSignature] = useState<boolean>(false);
  const [hasLoadedSavedSig, setHasLoadedSavedSig] = useState<boolean>(false);
  const [isDrawingRequester, setIsDrawingRequester] = useState<boolean>(false);
  const [isDrawingApprover, setIsDrawingApprover] = useState<boolean>(false);
  const [canvasWidth, setCanvasWidth] = useState<number>(420);

  // Searchable supervisor dropdown inside modal
  const [isSupDropdownOpen, setIsSupDropdownOpen] = useState<boolean>(false);
  const [supSearchQuery, setSupSearchQuery] = useState<string>('');
  const [isManualApproverInput, setIsManualApproverInput] = useState<boolean>(false);
  const supDropdownRef = useRef<HTMLDivElement | null>(null);

  const sigPadRequester = useRef<SignatureCanvas | null>(null);
  const sigPadApprover = useRef<SignatureCanvas | null>(null);
  const sigBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      setModalTab('edit');
      setIsSupDropdownOpen(false);
      setSupSearchQuery('');
      setIsManualApproverInput(false);
      setActiveSigTab(defaultSigTab);
      const resolvedApproverName = initialData.approverName || defaultApproverName || '';
      const resolvedApproverId = initialData.approverId || defaultApproverId || '';

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
        if (!cachedApprover && resolvedApproverName) {
          const storedSup = localStorage.getItem(`crm_saved_signature_${resolvedApproverName}`);
          if (storedSup) {
            cachedApprover = storedSup;
            loadedFromStorage = true;
          }
        }
      }

      setHasLoadedSavedSig(loadedFromStorage);
      setUseSameSignature(false);
      setIsDrawingRequester(!cachedRequester);
      setIsDrawingApprover(!cachedApprover);

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
          approverId: resolvedApproverId,
          approverName: resolvedApproverName,
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
          approverId: resolvedApproverId,
          approverName: resolvedApproverName,
          approverPosition: initialData.approverPosition || 'หัวหน้างาน',
          requesterSignatureUrl: cachedRequester,
          approverSignatureUrl: cachedApprover,
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, initialData, defaultSigTab, defaultApproverName, defaultApproverId]);

  // Close supervisor dropdown on outside click
  useEffect(() => {
    if (!isSupDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (supDropdownRef.current && !supDropdownRef.current.contains(e.target as Node)) {
        setIsSupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isSupDropdownOpen]);

  // Measure signature pad container when opening or switching tabs (only if active pad has no unsaved strokes)
  useEffect(() => {
    if (!isOpen || modalTab !== 'edit') return;
    const raf = requestAnimationFrame(() => {
      const width = sigBoxRef.current?.clientWidth;
      if (!width || width < 200) return;
      const activePad = effectiveSigTab === 'requester' ? sigPadRequester.current : sigPadApprover.current;
      if (!activePad || activePad.isEmpty()) {
        setCanvasWidth(Math.floor(width));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, modalTab, effectiveSigTab, isDrawingRequester, isDrawingApprover]);

  if (!isOpen) return null;

  // Handle changes in form inputs
  const handleChange = (field: keyof SubstituteReceiptData, val: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      // If quantity or unit price changes, auto-update total amount
      if (field === 'quantity') {
        const q = Number(val) || 1;
        const u = Number(updated.unitPrice) || 0;
        updated.amount = truncate2Decimals(q * u);
      } else if (field === 'unitPrice') {
        const q = Number(updated.quantity) || 1;
        const u = Number(val) || 0;
        updated.amount = truncate2Decimals(q * u);
      } else if (field === 'amount') {
        const total = Number(val) || 0;
        const q = Number(updated.quantity) || 1;
        if (q > 0) {
          updated.unitPrice = truncate2Decimals(total / q);
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
        current.amount = truncate2Decimals(q * u);
      } else if (field === 'unitPrice') {
        const q = Number(current.quantity) || 1;
        const u = Number(val) || 0;
        current.amount = truncate2Decimals(q * u);
      } else if (field === 'amount') {
        const total = Number(val) || 0;
        const q = Number(current.quantity) || 1;
        if (q > 0) {
          current.unitPrice = truncate2Decimals(total / q);
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

  const switchSigTab = (nextTab: 'requester' | 'approver') => {
    if (formData.requesterSignatureUrl) setIsDrawingRequester(false);
    if (formData.approverSignatureUrl) setIsDrawingApprover(false);
    setActiveSigTab(nextTab);
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
        setIsDrawingRequester(false);
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
        setIsDrawingApprover(false);
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
        await onSaveAndAttach(dataToSave, result);
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

  const handleSwitchModalTab = (nextTab: 'edit' | 'preview') => {
    if (nextTab === modalTab) return;
    if (nextTab === 'preview') {
      const snap = prepareDataForPdf();
      setFormData(snap);
    }
    setModalTab(nextTab);
  };

  const cleanRequesterNorm = normalizePersonName(formData.requesterName);
  const cleanSearch = supSearchQuery.trim().toLowerCase();
  const selectableSupervisors = supervisorOptions.filter((opt) => {
    if (currentUserId && opt.userId === currentUserId) return false;
    if (currentUserEmpId && opt.empId && opt.empId.trim().toUpperCase() === currentUserEmpId.trim().toUpperCase()) {
      return false;
    }
    if (cleanRequesterNorm && normalizePersonName(opt.fullName) === cleanRequesterNorm) return false;
    if (!cleanSearch) return true;
    return (
      opt.fullName.toLowerCase().includes(cleanSearch) ||
      (opt.nickname && opt.nickname.toLowerCase().includes(cleanSearch)) ||
      (opt.department && opt.department.toLowerCase().includes(cleanSearch)) ||
      (opt.branch && opt.branch.toLowerCase().includes(cleanSearch)) ||
      (opt.jobTitle && opt.jobTitle.toLowerCase().includes(cleanSearch)) ||
      (opt.empId && opt.empId.toLowerCase().includes(cleanSearch))
    );
  });

  const isApproverManuallyChanged =
    Boolean(defaultApproverName && formData.approverName) &&
    normalizePersonName(formData.approverName) !== normalizePersonName(defaultApproverName);

  const requiredSigPresent =
    signingRole === 'approver'
      ? Boolean(formData.approverSignatureUrl)
      : Boolean(formData.requesterSignatureUrl);
  const missingChecklist: string[] = [];
  if (!formData.supplierName?.trim()) missingChecklist.push('ชื่อร้านค้า / ผู้รับเงิน');
  if (!(Number(formData.amount) > 0)) missingChecklist.push('ยอดเงินมากกว่า 0 ฿');
  if (!formData.requesterName?.trim()) missingChecklist.push('ชื่อผู้เบิกจ่าย');
  if (!formData.approverName?.trim()) missingChecklist.push('ชื่อหัวหน้างานผู้อนุมัติ');
  if (!requiredSigPresent) {
    missingChecklist.push(signingRole === 'approver' ? 'ลายเซ็นผู้อนุมัติ' : 'ลายเซ็นผู้เบิกจ่าย');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-200 bg-linear-to-r from-red-50 via-white to-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 flex flex-wrap items-center gap-2">
                <span>ใบรับรองแทนใบเสร็จรับเงิน</span>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                  แบบ บก.111
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 truncate">
                กรอกข้อมูลรายการ เลือกหัวหน้าผู้อนุมัติ และลงนามได้ทันทีในหน้านี้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Mode Switcher Tabs */}
            <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchModalTab('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  modalTab === 'edit'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>1. กรอกข้อมูล & เซ็นชื่อ</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchModalTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  modalTab === 'preview'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>2. ดูตัวอย่างเอกสาร A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {modalTab === 'edit' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-gray-50/70">
            {/* Left Column (7/12): Items, Requester, Supervisor Picker & Company */}
            <div className="lg:col-span-7 space-y-4">
              {formData.items && formData.items.length > 1 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">รวมเอกสาร {formData.items.length} รายการใน PDF เดียวกัน</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      ร้านค้าเดียวกัน (<b>{formData.supplierName || 'ร้านค้าเดียวกัน'}</b>) วันที่เดียวกัน (<b>{formatThaiBuddhistDate(formData.billDate)}</b>) ระบบรวมลงในใบรับรองฉบับเดียวให้อัตโนมัติ
                    </p>
                  </div>
                </div>
              )}

              {/* Card 1: Merchant & Expense Items */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                      1
                    </span>
                    <Building2 className="w-4 h-4 text-red-600" />
                    <span>ร้านค้าและรายการค่าใช้จ่าย</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    รวม {formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      วันที่จ่ายเงิน <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.billDate}
                      onChange={(e) => handleChange('billDate', e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      ชื่อกิจการ / ร้านค้าผู้รับเงิน <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => handleChange('supplierName', e.target.value)}
                      placeholder="เช่น ร้านอาหาร, วินมอเตอร์ไซค์, โรงแรม, ร้านวัสดุก่อสร้าง"
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white font-medium"
                    />
                  </div>
                </div>

                {formData.items && formData.items.length > 1 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                      <span>รายละเอียดสินค้า ({formData.items.length} รายการ)</span>
                      <span className="text-gray-400 font-normal">แก้ไขจำนวนและราคาแต่ละรายการได้</span>
                    </div>

                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {formData.items.map((it, itemIdx) => (
                        <div
                          key={it.id || itemIdx}
                          className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 space-y-2 text-xs"
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

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                value={it.description}
                                onChange={(e) => handleLineItemChange(itemIdx, 'description', e.target.value)}
                                placeholder="ชื่อรายการสินค้า / บริการ"
                                className="w-full text-xs rounded border border-gray-300 py-1 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-gray-500 mb-0.5">จำนวน</label>
                              <input
                                type="number"
                                min="1"
                                value={it.quantity || 1}
                                onChange={(e) => handleLineItemChange(itemIdx, 'quantity', parseInt(e.target.value, 10) || 1)}
                                className="w-full text-xs text-center font-mono rounded border border-gray-300 py-1 px-1 focus:ring-1 focus:ring-red-500 bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-gray-500 mb-0.5">ราคา/หน่วย</label>
                              <input
                                type="number"
                                step="0.01"
                                value={it.unitPrice || 0}
                                onChange={(e) => handleLineItemChange(itemIdx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full text-xs text-right font-mono rounded border border-gray-300 py-1 px-1 focus:ring-1 focus:ring-red-500 bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-red-700 font-semibold mb-0.5">รวม (฿)</label>
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
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        รายการสินค้า / บริการ <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="เช่น ค่าทางด่วน, ค่าห้องพัก, ค่าโดยสาร"
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">จำนวน</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity || 1}
                        onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full text-xs text-center font-mono rounded-lg border border-gray-300 py-1.5 px-1.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">ราคา/หน่วย</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.unitPrice || 0}
                        onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs text-right font-mono rounded-lg border border-gray-300 py-1.5 px-1.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-red-700 mb-1">รวมเงิน (฿) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount || 0}
                        onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs text-right font-mono font-bold rounded-lg border border-red-300 bg-red-50/50 py-1.5 px-1.5 text-red-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Requester, Supervisor Selector & Company */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <User className="w-4 h-4 text-red-600" />
                  <span>ผู้เบิกจ่าย หัวหน้างานผู้อนุมัติ และบริษัท</span>
                </div>

                {/* Requester Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      ชื่อผู้เบิกจ่าย <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.requesterName}
                      onChange={(e) => handleChange('requesterName', e.target.value)}
                      placeholder="เช่น นายสมชาย ใจดี"
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">ตำแหน่ง / แผนกผู้เบิกจ่าย</label>
                    <input
                      type="text"
                      value={formData.requesterPosition || ''}
                      onChange={(e) => handleChange('requesterPosition', e.target.value)}
                      placeholder="เช่น ช่าง, พนักงานขาย, BD"
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                    />
                  </div>
                </div>

                {/* Highlighted Approver / Supervisor Selector Box */}
                <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/90 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-sky-950 flex items-center gap-1.5">
                      <span>หัวหน้างานผู้อนุมัติ (Approver) *</span>
                      {isApproverManuallyChanged ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                          เปลี่ยนหัวหน้าเองแล้ว <Check size={10} />
                        </span>
                      ) : formData.approverName ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                          จับคู่หัวหน้างาน
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                          กรุณาเลือกหัวหน้างาน
                        </span>
                      )}
                    </span>

                    {isApproverManuallyChanged && defaultApproverName && signingRole !== 'approver' && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            approverId: defaultApproverId || '',
                            approverName: defaultApproverName,
                            approverPosition: 'หัวหน้างาน',
                          }))
                        }
                        className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1 cursor-pointer underline"
                      >
                        <RotateCcw className="w-3 h-3" /> ใช้ค่าเดิม ({defaultApproverName})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                    <div className="sm:col-span-7 relative" ref={supDropdownRef}>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                        ชื่อผู้อนุมัติ (เลือกหัวหน้างานที่ถูกต้องได้ทันที)
                      </label>

                      {supervisorOptions.length > 0 && !isManualApproverInput && signingRole !== 'approver' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsSupDropdownOpen((prev) => !prev)}
                            className="w-full text-left text-xs rounded-lg border border-sky-300 py-1.5 px-2.5 bg-white hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 flex items-center justify-between gap-2 cursor-pointer font-semibold text-gray-900 shadow-2xs"
                          >
                            <span className="truncate">
                              {formData.approverName || 'คลิกเลือกหัวหน้างานผู้อนุมัติ...'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>

                          {isSupDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={supSearchQuery}
                                  onChange={(e) => setSupSearchQuery(e.target.value)}
                                  placeholder="ค้นหาชื่อ, ชื่อเล่น, แผนก หรือสาขา..."
                                  className="w-full text-xs bg-transparent focus:outline-none text-gray-800"
                                />
                              </div>

                              <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                                {selectableSupervisors.length === 0 ? (
                                  <div className="p-3 text-center text-[11px] text-gray-500">
                                    ไม่พบรายชื่อที่ค้นหา
                                  </div>
                                ) : (
                                  selectableSupervisors.map((opt) => {
                                    const isSelected =
                                      (formData.approverId && formData.approverId === opt.id) ||
                                      (formData.approverName &&
                                        normalizePersonName(formData.approverName) === normalizePersonName(opt.fullName));
                                    return (
                                      <button
                                        key={`${opt.id}_${opt.fullName}`}
                                        type="button"
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            approverId: opt.id,
                                            approverName: opt.fullName,
                                            approverPosition: opt.jobTitle || prev.approverPosition || 'หัวหน้างาน',
                                          }));
                                          setIsSupDropdownOpen(false);
                                          setSupSearchQuery('');
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-sky-50 transition flex items-start justify-between gap-2 cursor-pointer ${
                                          isSelected ? 'bg-sky-50/90' : ''
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                                            <span>{opt.fullName}</span>
                                            {opt.nickname && (
                                              <span className="text-[10px] text-gray-500 font-normal">({opt.nickname})</span>
                                            )}
                                            {opt.isManagerial && (
                                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold shrink-0">
                                                หัวหน้า/ผู้จัดการ
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                            {[opt.jobTitle || opt.role, opt.department, opt.branch].filter(Boolean).join(' • ')}
                                          </div>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>

                              <div className="p-1.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsManualApproverInput(true);
                                    setIsSupDropdownOpen(false);
                                  }}
                                  className="w-full text-center text-[11px] font-semibold text-gray-600 hover:text-red-700 py-1 rounded hover:bg-white transition cursor-pointer"
                                >
                                  + พิมพ์ชื่อหัวหน้างานเอง (กรณีไม่พบในรายการ)
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={formData.approverName || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                approverId: '',
                                approverName: e.target.value,
                              }))
                            }
                            placeholder="ระบุชื่อหัวหน้างานผู้อนุมัติ"
                            className="w-full text-xs rounded-lg border border-sky-300 py-1.5 px-2.5 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white font-semibold"
                          />
                          {supervisorOptions.length > 0 && signingRole !== 'approver' && (
                            <button
                              type="button"
                              onClick={() => setIsManualApproverInput(false)}
                              className="text-[10px] text-sky-700 hover:underline font-medium cursor-pointer"
                            >
                              ← กลับไปเลือกจากรายชื่อในระบบ
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">ตำแหน่งผู้อนุมัติ</label>
                      <input
                        type="text"
                        value={formData.approverPosition || ''}
                        onChange={(e) => handleChange('approverPosition', e.target.value)}
                        placeholder="เช่น หัวหน้างาน, ผู้จัดการ"
                        className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                      />
                    </div>
                  </div>

                  {signingRole !== 'approver' && supervisorOptions.length > 0 && (
                    <p className="text-[10px] text-sky-800 leading-relaxed flex items-start gap-1.5">
                      <Lightbulb size={12} className="text-sky-600 shrink-0 mt-0.5" />
                      <span>หากระบบจับคู่หัวหน้าไม่ตรง กดเลือกหัวหน้างานที่ถูกต้องได้เลย ระบบจะอัปเดตสิทธิ์อนุมัติคำขอนี้ให้คนที่เลือกทันที</span>
                    </p>
                  )}
                </div>

                {/* Company & Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      เบิกจ่ายในงานของทาง (บริษัท) *
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
                      <option value="บจก.เทอรา กรุ้ป">บจก.เทอรา กรุ้ป (TG)</option>
                      <option value="บจก.เทอรา อิเล็กทริค">บจก.เทอรา อิเล็กทริค (TE)</option>
                      <option value="บจก.เทอรา พาวเวอร์">บจก.เทอรา พาวเวอร์ (TP)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={formData.startDate || formData.billDate}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">ถึงวันที่</label>
                    <input
                      type="date"
                      value={formData.endDate || formData.billDate}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-300 py-1.5 px-2 focus:ring-1 focus:ring-red-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5/12): Live Summary + Prominent Signature Pad (Always Above the Fold!) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Compact Live Document Summary Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                      สรุปใบรับรอง บก.111 • {formData.companyCode || 'TG'}
                    </span>
                    <p className="text-sm font-bold text-white truncate">
                      {formData.supplierName?.trim() || 'ยังไม่ระบุร้านค้า / ผู้รับเงิน'}
                    </p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      วันที่ {formatThaiBuddhistDate(formData.billDate)} • {(formData.items?.length || 1)} รายการ
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">ยอดรวมสุทธิ</span>
                    <span className="text-lg font-extrabold font-mono text-amber-300">
                      {formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 bg-white/10 rounded-lg px-2.5 py-1.5">
                  ตัวอักษร: <span className="text-white font-medium">{thaiBahtText(formData.amount)}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] border-t border-slate-700/80">
                  <div className="text-slate-300 truncate">
                    ผู้เบิก: <b className="text-white">{formData.requesterName || '-'}</b> → ผู้อนุมัติ:{' '}
                    <b className="text-amber-300">{formData.approverName || 'ยังไม่เลือก'}</b>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchModalTab('preview')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] transition cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูใบจริง A4</span>
                  </button>
                </div>
              </div>

              {/* Signature Card (Always immediately visible!) */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                      3
                    </span>
                    <PenLine className="w-4 h-4 text-red-600" />
                    <span>
                      {signingRole === 'requester'
                        ? 'ลงนามผู้เบิกจ่ายเงิน'
                        : signingRole === 'approver'
                        ? 'ลงนามผู้อนุมัติ (หัวหน้างาน)'
                        : 'ลายมือชื่อในเอกสาร'}
                    </span>
                  </div>
                  {signingRole === 'both' && (
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        onClick={() => switchSigTab('requester')}
                        className={`px-2 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                          effectiveSigTab === 'requester'
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
                        onClick={() => switchSigTab('approver')}
                        className={`px-2 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                          effectiveSigTab === 'approver'
                            ? 'bg-white text-gray-900 shadow-2xs font-bold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <span>ผู้อนุมัติ</span>
                        {formData.approverSignatureUrl && (
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Role Guidance / Quick-Sync Banner */}
                {signingRole === 'requester' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-sky-50/90 border border-sky-200 rounded-xl p-2.5 text-[11px] text-sky-900">
                    <span className="font-medium leading-relaxed">
                      เซ็นเฉพาะช่อง <b>ผู้เบิกจ่ายเงิน</b> ด้านล่าง • ช่องผู้อนุมัติจะส่งให้หัวหน้าลงนามหลังส่งคำขอ
                    </span>
                    {hasLoadedSavedSig && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> ดึงลายเซ็นเดิมอัตโนมัติ
                      </span>
                    )}
                  </div>
                ) : signingRole === 'approver' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-950">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-amber-900">โหมดหัวหน้างาน:</span>
                      <span>ผู้เบิก ({formData.requesterName || 'พนักงาน'}):</span>
                      {formData.requesterSignatureUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                          ลงนามแล้ว <Check size={10} />
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 bg-white font-semibold px-1.5 py-0.5 rounded border border-gray-200">
                          ยังไม่เซ็น
                        </span>
                      )}
                    </div>
                    {hasLoadedSavedSig && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> ดึงลายเซ็นเดิมอัตโนมัติ
                      </span>
                    )}
                  </div>
                ) : (
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
                            setIsDrawingApprover(false);
                          }
                        }}
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                      />
                      <span>ใช้ลายเซ็นเดียวกันทั้ง 2 ช่อง</span>
                    </label>
                    {hasLoadedSavedSig && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ดึงลายเซ็นเดิม
                      </span>
                    )}
                  </div>
                )}

                {effectiveSigTab === 'requester' ? (
                  /* Requester Signature Tab */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 truncate">
                        ผู้เบิกจ่าย: <span className="text-gray-900 font-bold">{formData.requesterName || 'พนักงาน'}</span>
                      </span>
                      {formData.requesterSignatureUrl ? (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> มีลายเซ็นแล้ว
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                          วาดหรืออัปโหลดลายเซ็น
                        </span>
                      )}
                    </div>

                    {!isDrawingRequester && formData.requesterSignatureUrl ? (
                      <div className="relative border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 flex flex-col items-center justify-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-center w-full max-w-[280px] h-[95px] shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formData.requesterSignatureUrl}
                            alt="Requester Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-100 w-full justify-between">
                          <div className="flex items-center gap-2">
                            {signingRole === 'both' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    approverSignatureUrl: prev.requesterSignatureUrl,
                                  }));
                                  setIsDrawingApprover(false);
                                  Swal.fire({
                                    title: 'คัดลอกลายเซ็นแล้ว',
                                    text: 'นำลายเซ็นไปใส่ในช่องผู้อนุมัติ (หัวหน้างาน) เรียบร้อยแล้ว',
                                    icon: 'success',
                                    timer: 1500,
                                    showConfirmButton: false,
                                  });
                                }}
                                className="text-[11px] text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md font-semibold transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> ใช้ช่องผู้อนุมัติด้วย
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                requesterSignatureUrl: undefined,
                                approverSignatureUrl: useSameSignature ? undefined : prev.approverSignatureUrl,
                              }));
                              setIsDrawingRequester(true);
                              setTimeout(() => sigPadRequester.current?.clear(), 50);
                            }}
                            className="text-[11px] text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition"
                          >
                            <Trash2 className="w-3 h-3" /> ลบเพื่อเซ็นใหม่
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div ref={sigBoxRef} className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-slate-50 relative group">
                          <SignatureCanvas
                            ref={sigPadRequester}
                            onEnd={handleRequesterEndStroke}
                            canvasProps={{
                              width: canvasWidth,
                              height: 130,
                              className: 'w-full h-[130px] cursor-crosshair bg-white touch-none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              sigPadRequester.current?.clear();
                              setFormData((prev) => ({
                                ...prev,
                                requesterSignatureUrl: undefined,
                                approverSignatureUrl: useSameSignature ? undefined : prev.approverSignatureUrl,
                              }));
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white shadow-xs border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 transition cursor-pointer"
                            title="ล้างลายเส้น"
                          >
                            <Eraser className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-1.5 left-2 pointer-events-none text-[10px] text-gray-400">
                            วาดลายเซ็นที่นี่ได้เลย (ระบบจำให้อัตโนมัติ)
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <label className="cursor-pointer text-[11px] text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>อัปโหลดรูปลายเซ็น</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleRequesterFileUpload}
                            />
                          </label>

                          <div className="flex items-center gap-2">
                            {formData.requesterSignatureUrl && (
                              <button
                                type="button"
                                onClick={() => setIsDrawingRequester(false)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs"
                              >
                                <Check className="w-3 h-3" /> ดูตัวอย่างลายเซ็น
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                sigPadRequester.current?.clear();
                                setFormData((prev) => ({
                                  ...prev,
                                  requesterSignatureUrl: undefined,
                                  approverSignatureUrl: useSameSignature ? undefined : prev.approverSignatureUrl,
                                }));
                              }}
                              className="text-gray-500 hover:text-gray-700 text-[11px] cursor-pointer"
                            >
                              ล้างลายเส้น
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Approver Signature Tab */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 truncate">
                        ผู้อนุมัติ: <span className="text-gray-900 font-bold">{formData.approverName || 'หัวหน้างาน'}</span>
                      </span>
                      {formData.approverSignatureUrl ? (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> มีลายเซ็นแล้ว
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                          วาดหรืออัปโหลดลายเซ็น
                        </span>
                      )}
                    </div>

                    {signingRole === 'both' && formData.requesterSignatureUrl && !formData.approverSignatureUrl && (
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-center space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              approverSignatureUrl: prev.requesterSignatureUrl,
                            }));
                            setIsDrawingApprover(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> ใช้ลายเซ็นเดียวกับ {formData.requesterName || 'ผู้เบิกจ่าย'}
                        </button>
                      </div>
                    )}

                    {!isDrawingApprover && formData.approverSignatureUrl ? (
                      <div className="relative border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 flex flex-col items-center justify-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-center w-full max-w-[280px] h-[95px] shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formData.approverSignatureUrl}
                            alt="Approver Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-100 w-full justify-between">
                          <span className="text-[11px] text-gray-500">ลายเซ็นผู้อนุมัติจะฝังใน PDF</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, approverSignatureUrl: undefined }));
                              setIsDrawingApprover(true);
                              setTimeout(() => sigPadApprover.current?.clear(), 50);
                            }}
                            className="text-[11px] text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition"
                          >
                            <Trash2 className="w-3 h-3" /> ลบเพื่อเซ็นใหม่
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div ref={sigBoxRef} className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-slate-50 relative group">
                          <SignatureCanvas
                            ref={sigPadApprover}
                            onEnd={handleApproverEndStroke}
                            canvasProps={{
                              width: canvasWidth,
                              height: 130,
                              className: 'w-full h-[130px] cursor-crosshair bg-white touch-none',
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
                            วาดลายมือชื่อผู้อนุมัติที่นี่ได้เลย
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <label className="cursor-pointer text-[11px] text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>อัปโหลดรูปลายเซ็น</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleApproverFileUpload}
                            />
                          </label>

                          <div className="flex items-center gap-2">
                            {formData.approverSignatureUrl && (
                              <button
                                type="button"
                                onClick={() => setIsDrawingApprover(false)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs"
                              >
                                <Check className="w-3 h-3" /> ดูตัวอย่างลายเซ็น
                              </button>
                            )}
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
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Readiness Status */}
              {missingChecklist.length === 0 ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-[11px] text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ข้อมูลและลายเซ็นครบถ้วน พร้อมบันทึกและแนบ PDF บก.111 แล้ว</span>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    ยังขาดข้อมูล: <b>{missingChecklist.join(', ')}</b>
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Clean Centered A4 Document Preview */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-200/80 flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleSwitchModalTab('edit')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-red-600" />
                <span>← กลับไปแก้ไขข้อมูล / เซ็นชื่อ</span>
              </button>
              <span className="text-xs text-gray-600 font-medium">
                ตัวอย่างเอกสารใบรับรองแทนใบเสร็จรับเงิน (ขนาด A4)
              </span>
            </div>

            <div className="w-full overflow-x-auto flex justify-center pb-4">
              <div className="scale-[0.52] sm:scale-[0.75] md:scale-[0.9] lg:scale-100 origin-top transition-transform shadow-lg">
                <SubstituteReceiptCertificateView data={formData} />
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSwitchModalTab(modalTab === 'edit' ? 'preview' : 'edit')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition cursor-pointer shadow-2xs"
            >
              {modalTab === 'edit' ? (
                <>
                  <Eye className="w-4 h-4 text-red-600" />
                  <span>ดูตัวอย่าง A4</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 text-red-600" />
                  <span>แก้ไขข้อมูล / เซ็นชื่อ</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>พิมพ์ (Print)</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-gray-600" />
              <span>ดาวน์โหลด PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
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
                  {saveButtonLabel ||
                    (signingRole === 'requester'
                      ? 'บันทึกลายเซ็นผู้เบิกและแนบ PDF บก.111'
                      : signingRole === 'approver'
                      ? 'ลงนามผู้อนุมัติและอัปเดต PDF'
                      : 'บันทึกและแนบในคำขอ (Attach PDF)')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
