'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPurchaseRequest } from '@/app/actions/procurement';
import { 
  Save, 
  ArrowLeft, 
  Layers, 
  Calendar, 
  User, 
  FileText, 
  Sparkles, 
  Building2, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Plus,
  Tag,
  Zap,
  BatteryCharging,
  Trash2,
  Table,
  FileEdit,
  Receipt,
  Briefcase,
  Lightbulb,
  Printer,
  Paperclip,
  UploadCloud,
  FileSpreadsheet,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  File
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import PrintablePurchaseRequisitionModal from '../components/PrintablePurchaseRequisitionModal';

export interface PRAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  prNote: string;
  targetDeliveryDate: string | null;
  status: string;
  companyName: string;
}

interface LinkedOrder {
  id: string;
  orderNumber: string;
  prNote: string;
  targetDeliveryDate: string | null;
  status: string;
  companyName: string;
}

export interface SystemPRRecord {
  id: number;
  prNumber: string;
  projectName: string;
  itemList: string;
  requestedBy: string;
  recordedAt: string | null;
  note?: string;
}

export interface PRItemRow {
  id: string;
  code: string;        // รหัสสินค้า/บริการ เช่น TRD-0001
  description: string; // รายละเอียด เช่น ค่าแรงงานติดตั้งแผงโซล่า 11.6kW
  details?: string;    // รายละเอียดเฉพาะ เช่น สเปก, รุ่น, หมายเหตุเฉพาะรายการ (จะแสดงในวงเล็บใน PDF)
  warehouse: string;   // คลัง เช่น 01
  quantity: string | number; // จำนวน เช่น 1.00
  unit: string;        // หน่วย เช่น EA, ชุด, งาน
  unitPrice: string | number; // ราคาต่อหน่วย เช่น 0.00
}

export const formatItemRowsToString = (rows: PRItemRow[]): string => {
  const validRows = rows.filter(r => (r.code && r.code.trim()) || (r.description && r.description.trim()) || (r.details && r.details.trim()));
  if (validRows.length === 0) return '';
  return validRows.map((r, idx) => {
    const codePart = r.code?.trim() ? `[${r.code.trim()}] ` : '';
    const descPart = r.description?.trim() || '';
    const cleanDetails = r.details?.trim().replace(/^\((.*)\)$/, '$1') || '';
    const detailsPart = cleanDetails ? ` (${cleanDetails})` : '';
    const whPart = r.warehouse?.trim() ? ` (คลัง: ${r.warehouse.trim()})` : '';
    const qty = parseFloat(String(r.quantity)) || 0;
    const unitPart = r.unit?.trim() ? ` ${r.unit.trim()}` : ' EA';
    const price = parseFloat(String(r.unitPrice)) || 0;
    const pricePart = price > 0 ? ` @ ${price.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.` : '';
    return `${idx + 1}. ${codePart}${descPart}${detailsPart}${whPart} - ${qty.toFixed(2)}${unitPart}${pricePart}`;
  }).join('\n');
};

export const parseStringToItemRows = (text: string): PRItemRow[] => {
  if (!text || !text.trim()) {
    return [
      {
        id: 'row-1',
        code: '',
        description: '',
        warehouse: '',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      }
    ];
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return [
      {
        id: 'row-1',
        code: '',
        description: '',
        warehouse: '',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      }
    ];
  }

  return lines.map((line, idx) => {
    let code = '';
    let description = line;
    let warehouse = '01';
    let quantity = '1.00';
    let unit = 'EA';
    let unitPrice = '0.00';

    // Remove leading numbering like "1. " or "1) "
    description = description.replace(/^\d+[\.\)]\s*/, '');

    // Extract code if in brackets: [TRD-0001]
    const codeMatch = description.match(/^\[([^\]]+)\]\s*/);
    if (codeMatch) {
      code = codeMatch[1].trim();
      description = description.slice(codeMatch[0].length);
    } else {
      const codeWordMatch = description.match(/^([A-Z0-9]{2,8}(?:-[A-Z0-9]+)?)\s+/i);
      if (codeWordMatch) {
        code = codeWordMatch[1].trim();
        description = description.slice(codeWordMatch[0].length);
      }
    }

    // Extract warehouse if in (คลัง: 01)
    const whMatch = description.match(/\(คลัง:\s*([^\)]+)\)/i);
    if (whMatch) {
      warehouse = whMatch[1].trim();
      description = description.replace(whMatch[0], '').trim();
    }

    // Extract price if @ 0.00 บ.
    const priceMatch = description.match(/@\s*([0-9\.,]+)\s*(?:บ\.|บาท)?/i);
    if (priceMatch) {
      unitPrice = priceMatch[1].replace(/,/g, '').trim();
      description = description.replace(priceMatch[0], '').trim();
    }

    // Extract qty & unit if - 1.00 EA or จำนวน 2 ตัว
    const qtyUnitMatch = description.match(/-\s*([0-9\.,]+)\s*([A-Za-zก-๙]+)?/i) ||
                         description.match(/จำนวน\s*([0-9\.,]+)\s*([A-Za-zก-๙]+)?/i);
    if (qtyUnitMatch) {
      quantity = qtyUnitMatch[1].replace(/,/g, '').trim();
      if (qtyUnitMatch[2]) {
        unit = qtyUnitMatch[2].trim();
      }
      description = description.replace(qtyUnitMatch[0], '').trim();
    }

    // Extract details if in parentheses (excluding warehouse which was already stripped)
    let details = '';
    const detailsMatch = description.match(/\(([^)]+)\)\s*$/);
    if (detailsMatch) {
      details = detailsMatch[1].trim();
      description = description.slice(0, detailsMatch.index).trim();
    }

    if (!code && description.includes('ค่าแรง')) {
      code = 'TRD-0001';
    }

    return {
      id: `row-${idx + 1}-${Date.now()}`,
      code: code || '',
      description: description.trim(),
      details: details.trim(),
      warehouse: warehouse || '01',
      quantity: quantity || '1.00',
      unit: unit || 'EA',
      unitPrice: unitPrice || '0.00'
    };
  });
};

interface CreatePRFormProps {
  defaultOrderId?: string;
  defaultNote?: string;
  defaultProject?: string;
  defaultPrNumber?: string;
  defaultItemList?: string;
  defaultRequestedBy?: string;
  defaultAttachments?: PRAttachment[];
  currentUser: {
    name: string;
    email: string;
  };
  projectSuggestions: string[];
  systemPrs?: SystemPRRecord[];
  pendingOrders: PendingOrder[];
  linkedOrder: LinkedOrder | null;
  latestPrNumber: string | null;
}

export const EXAMPLE_PR_DATA = {
  projectName: 'JB69-090056 – Mr. Suwat (Piyanuch)’s Residence',
  prNumber: 'PR69-E100601',
  itemList: '1. [TRD-0001] ค่าแรงงานติดตั้งแผงโซล่า 11.6kW (Inverter Huawei 10kW + แผง Jinko 580W) (คลัง: 01) - 1.00 EA @ 0.00 บ.',
  requestedBy: 'รติมา มาตะยา (Ratima Mataya)',
  companyCode: 'E' as const,
};

export default function CreatePRForm({
  defaultOrderId = '',
  defaultNote = '',
  defaultProject = '',
  defaultPrNumber = '',
  defaultItemList = '',
  defaultRequestedBy = '',
  defaultAttachments = [],
  currentUser,
  projectSuggestions = [],
  systemPrs = [],
  pendingOrders = [],
  linkedOrder: initialLinkedOrder = null,
  latestPrNumber
}: CreatePRFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Active linked order state
  const [activeLinkedOrder, setActiveLinkedOrder] = useState<LinkedOrder | null>(initialLinkedOrder);

  // Derive initial company code from defaultPrNumber or fall back to 'E' (TE Electric)
  const initialCompanyCode: 'E' | 'P' | 'G' = 
    defaultPrNumber?.includes('-E') ? 'E' :
    defaultPrNumber?.includes('-P') ? 'P' :
    defaultPrNumber?.includes('-G') ? 'G' :
    'E';

  const [selectedCompanyCode, setSelectedCompanyCode] = useState<'E' | 'P' | 'G'>(initialCompanyCode);
  const [showOrderSelector, setShowOrderSelector] = useState(false);

  // View mode for Item List: 'table' (Express grid) or 'text' (Free textarea)
  const [viewMode, setViewMode] = useState<'table' | 'text'>('table');
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(0);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Supplier attachments state
  const [attachments, setAttachments] = useState<PRAttachment[]>(defaultAttachments || []);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getFileBadge = (filename: string, fileType?: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
      return { icon: <FileText size={18} className="text-red-500" />, badge: 'PDF', bg: 'bg-red-50 border-red-200 text-red-700' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { icon: <FileSpreadsheet size={18} className="text-emerald-600" />, badge: 'EXCEL', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || fileType?.startsWith('image/')) {
      return { icon: <ImageIcon size={18} className="text-purple-600" />, badge: 'IMG', bg: 'bg-purple-50 border-purple-200 text-purple-700' };
    }
    if (['doc', 'docx'].includes(ext)) {
      return { icon: <FileText size={18} className="text-blue-600" />, badge: 'WORD', bg: 'bg-blue-50 border-blue-200 text-blue-700' };
    }
    return { icon: <File size={18} className="text-gray-500" />, badge: ext.toUpperCase() || 'FILE', bg: 'bg-gray-50 border-gray-200 text-gray-700' };
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingAttachments(true);
    const newAttachments: PRAttachment[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadStatusText(`กำลังอัปโหลด (${i + 1}/${fileArray.length}): ${file.name}...`);

      if (file.size > 50 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'ไฟล์มีขนาดใหญ่เกินไป',
          text: `ไฟล์ ${file.name} มีขนาดเกิน 50MB กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 50MB`,
          confirmButtonColor: '#dc2626'
        });
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'uploadsService');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          newAttachments.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            url: data.url,
            size: file.size,
            type: file.type || '',
            uploadedAt: new Date().toISOString()
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'อัปโหลดไม่สำเร็จ',
            text: data.error || `ไม่สามารถอัปโหลดไฟล์ ${file.name} ได้`,
            confirmButtonColor: '#dc2626'
          });
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
          text: err?.message || 'ไม่สามารถส่งไฟล์ไปยังเซิร์ฟเวอร์ได้',
          confirmButtonColor: '#dc2626'
        });
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }

    setIsUploadingAttachments(false);
    setUploadStatusText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // State for items in Express-style table
  const [itemRows, setItemRows] = useState<PRItemRow[]>(() => {
    if (defaultItemList) {
      return parseStringToItemRows(defaultItemList);
    }
    return [
      {
        id: 'row-1',
        code: '',
        description: '',
        details: '',
        warehouse: '',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      }
    ];
  });

  // Today formatted as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Current active user using the application
  const activeUserName = currentUser.name || currentUser.email || '';

  const [formData, setFormData] = useState({
    prNumber: defaultPrNumber || '',
    projectName: defaultProject || '',
    itemList: defaultItemList || '',
    requestedBy: defaultRequestedBy || activeUserName || '',
    recordedAt: todayStr,
    note: defaultNote,
    orderId: defaultOrderId
  });

  // Resolved display data for the reference section (live sync with form inputs)
  const displayRefData = {
    projectName: formData.projectName || '(ยังไม่ได้ระบุโครงการ)',
    prNumber: formData.prNumber || '(ยังไม่ได้ระบุเลขที่ PR)',
    itemList: formData.itemList || '(ยังไม่ได้ระบุรายการสินค้า)',
    requestedBy: formData.requestedBy || '(ยังไม่ได้ระบุผู้ขอซื้อ)',
    isLive: true
  };

  // Table row modification handlers
  const handleUpdateRow = (index: number, field: keyof PRItemRow, value: any) => {
    setItemRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const formatted = formatItemRowsToString(updated);
      setFormData(f => ({ ...f, itemList: formatted }));
      return updated;
    });
  };

  const handleAddRow = (preset?: Partial<PRItemRow>) => {
    setItemRows(prev => {
      const newRow: PRItemRow = {
        id: `row-${Date.now()}-${prev.length + 1}`,
        code: preset?.code || '',
        description: preset?.description || '',
        details: preset?.details || '',
        warehouse: preset?.warehouse || '',
        quantity: preset?.quantity || '1.00',
        unit: preset?.unit || 'EA',
        unitPrice: preset?.unitPrice || '0.00'
      };
      const updated = [...prev, newRow];
      setFormData(f => ({ ...f, itemList: formatItemRowsToString(updated) }));
      return updated;
    });
    setFocusedRowIndex(itemRows.length);
  };

  const handleRemoveRow = (index: number) => {
    setItemRows(prev => {
      if (prev.length <= 1) {
        const resetRow: PRItemRow = {
          id: `row-${Date.now()}`,
          code: '',
          description: '',
          details: '',
          warehouse: '01',
          quantity: '1.00',
          unit: 'EA',
          unitPrice: '0.00'
        };
        const updated = [resetRow];
        setFormData(f => ({ ...f, itemList: '' }));
        return updated;
      }
      const updated = prev.filter((_, i) => i !== index);
      setFormData(f => ({ ...f, itemList: formatItemRowsToString(updated) }));
      return updated;
    });
  };

  const handleSwitchMode = (mode: 'table' | 'text') => {
    if (mode === 'table' && viewMode === 'text') {
      const parsed = parseStringToItemRows(formData.itemList);
      setItemRows(parsed);
    } else if (mode === 'text' && viewMode === 'table') {
      const formatted = formatItemRowsToString(itemRows);
      setFormData(f => ({ ...f, itemList: formatted }));
    }
    setViewMode(mode);
  };

  // Grand totals for Express table
  const totalAmount = itemRows.reduce((sum, r) => {
    const q = parseFloat(String(r.quantity)) || 0;
    const p = parseFloat(String(r.unitPrice)) || 0;
    return sum + (q * p);
  }, 0);

  const totalQuantity = itemRows.reduce((sum, r) => {
    const q = parseFloat(String(r.quantity)) || 0;
    return sum + q;
  }, 0);

  // Load factual example data handler
  const handleLoadExampleData = () => {
    setSelectedCompanyCode(EXAMPLE_PR_DATA.companyCode);
    const exampleRows: PRItemRow[] = [
      {
        id: `row-${Date.now()}`,
        code: 'TRD-0001',
        description: 'ค่าแรงงานติดตั้งแผงโซล่า 11.6kW',
        details: 'Inverter Huawei 10kW + แผง Jinko 580W',
        warehouse: '01',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      }
    ];
    setItemRows(exampleRows);
    setFormData(prev => ({
      ...prev,
      prNumber: EXAMPLE_PR_DATA.prNumber,
      projectName: EXAMPLE_PR_DATA.projectName,
      itemList: formatItemRowsToString(exampleRows),
      requestedBy: EXAMPLE_PR_DATA.requestedBy,
    }));
    Swal.fire({
      icon: 'success',
      title: 'โหลดข้อมูลจริงตามระบบแล้ว',
      text: `เติมข้อมูลโครงการ, เลข PR: ${EXAMPLE_PR_DATA.prNumber}, รายการ: ${EXAMPLE_PR_DATA.itemList} และผู้ขอซื้อ: ${EXAMPLE_PR_DATA.requestedBy} เรียบร้อยแล้ว`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Clear form handler (retains the active user as requester)
  const handleClearForm = () => {
    const blankRows: PRItemRow[] = [
      {
        id: `row-${Date.now()}`,
        code: '',
        description: '',
        details: '',
        warehouse: '01',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      }
    ];
    setItemRows(blankRows);
    setAttachments([]);
    setFormData({
      prNumber: '',
      projectName: '',
      itemList: '',
      requestedBy: activeUserName,
      recordedAt: todayStr,
      note: '',
      orderId: ''
    });
    setActiveLinkedOrder(null);
  };

  // Smart PR Number Generator
  const generateSuggestedPrNumber = (companyCode: 'E' | 'P' | 'G') => {
    const now = new Date();
    const bYear = (now.getFullYear() + 543).toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `PR${bYear}-${companyCode}${mm}${dd}`;

    // If latest PR matches today's prefix, increment sequence
    if (latestPrNumber && latestPrNumber.startsWith(prefix)) {
      const seqStr = latestPrNumber.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) {
        return `${prefix}${String(seq + 1).padStart(2, '0')}`;
      }
    }

    return `${prefix}01`;
  };

  // Pre-generate PR number on mount if empty
  useEffect(() => {
    if (!formData.prNumber) {
      const suggested = generateSuggestedPrNumber(selectedCompanyCode);
      setFormData(prev => ({ ...prev, prNumber: suggested }));
    }
  }, []);

  // Handle company prefix click
  const handleSelectCompany = (code: 'E' | 'P' | 'G') => {
    setSelectedCompanyCode(code);
    const suggested = generateSuggestedPrNumber(code);
    setFormData(prev => ({ ...prev, prNumber: suggested }));
  };

  // Handle linking a pending factory order
  const handleLinkOrder = (order: PendingOrder) => {
    setActiveLinkedOrder(order);
    setShowOrderSelector(false);
    setFormData(prev => {
      let updatedNote = prev.note;
      if (order.prNote && !updatedNote.includes(order.prNote)) {
        updatedNote = updatedNote ? `${updatedNote}\n[จากฝ่ายผลิต: ${order.prNote}]` : `[จากฝ่ายผลิต: ${order.prNote}]`;
      }
      return {
        ...prev,
        orderId: order.id,
        projectName: prev.projectName ? prev.projectName : `Order ${order.orderNumber} (${order.companyName})`,
        note: updatedNote
      };
    });
  };

  // Handle unlinking order
  const handleUnlinkOrder = () => {
    setActiveLinkedOrder(null);
    setFormData(prev => ({
      ...prev,
      orderId: ''
    }));
  };

  // Append template snippet into Item List
  const handleInsertTemplate = (snippet: string) => {
    if (snippet === EXAMPLE_PR_DATA.itemList || snippet.includes('ค่าแรงติดตั้ง')) {
      handleAddRow({
        code: '',
        description: 'ค่าแรงงานติดตั้งแผงโซล่า 11.6kW',
        warehouse: '01',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      });
      return;
    }
    if (viewMode === 'table') {
      handleAddRow({
        code: '',
        description: snippet.replace(/^[-\d\.\)]\s*/, ''),
        warehouse: '01',
        quantity: '1.00',
        unit: 'EA',
        unitPrice: '0.00'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        itemList: prev.itemList ? `${prev.itemList.trim()}\n${snippet}` : snippet
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.prNumber.trim()) {
      setError('กรุณาระบุเลขที่ PR');
      setLoading(false);
      return;
    }

    if (!formData.projectName.trim()) {
      setError('กรุณาระบุชื่อโครงการ / ออเดอร์');
      setLoading(false);
      return;
    }

    const finalItemList = (viewMode === 'table' ? formatItemRowsToString(itemRows) : formData.itemList).trim();

    if (!finalItemList) {
      setError('กรุณาระบุรายการสินค้าที่ต้องการขอซื้อ');
      setLoading(false);
      return;
    }

    try {
      const res = await createPurchaseRequest({
        prNumber: formData.prNumber.trim().toUpperCase(),
        projectName: formData.projectName.trim(),
        itemList: finalItemList,
        requestedBy: formData.requestedBy.trim(),
        recordedAt: formData.recordedAt || null,
        note: formData.note.trim() || undefined,
        orderId: formData.orderId || undefined,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      if (res.success) {
        const result = await Swal.fire({
          icon: 'success',
          title: res.isOverwritten ? 'อัปเดตข้อมูล PR สำเร็จ!' : 'สร้างใบขอซื้อ (PR) สำเร็จ!',
          html: `
            <div class="text-left text-sm space-y-2 mt-2">
              <div class="p-3 bg-red-50 text-red-900 border border-red-200 rounded-lg">
                <span class="font-bold">เลขที่ PR:</span> <span class="font-mono font-bold">${formData.prNumber.toUpperCase()}</span>
              </div>
              <div class="text-gray-600">
                <div><span class="font-semibold">โครงการ:</span> ${formData.projectName}</div>
                <div><span class="font-semibold">ผู้ขอซื้อ:</span> ${formData.requestedBy || '-'}</div>
                ${attachments.length > 0 ? `<div><span class="font-semibold">เอกสารแนบ:</span> ${attachments.length} ไฟล์</div>` : ''}
              </div>
            </div>
          `,
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonColor: '#dc2626',
          denyButtonColor: '#2563eb',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'ดูรายการ PR ทั้งหมด',
          denyButtonText: '🖨️ พิมพ์ / โหลด PDF',
          cancelButtonText: 'สร้าง PR ถัดไป'
        });

        if (result.isConfirmed) {
          router.push('/admin/procurement/pr');
        } else if (result.isDenied) {
          setShowPrintModal(true);
        } else {
          // Reset for next PR
          const nextSuggested = generateSuggestedPrNumber(selectedCompanyCode);
          setAttachments([]);
          setFormData({
            prNumber: nextSuggested,
            projectName: '',
            itemList: '',
            requestedBy: currentUser.name || currentUser.email || '',
            recordedAt: todayStr,
            note: '',
            orderId: ''
          });
          setActiveLinkedOrder(null);
        }
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1.5">
              <Link href="/dashboard" className="hover:text-red-600 transition-colors">หน้าหลัก</Link>
              <span>/</span>
              <Link href="/admin/procurement/dashboard" className="hover:text-red-600 transition-colors">ฝ่ายจัดซื้อ</Link>
              <span>/</span>
              <Link href="/admin/procurement/pr" className="hover:text-red-600 transition-colors">รายการขอซื้อ (PR)</Link>
              <span>/</span>
              <span className="text-red-600 font-semibold">สร้าง PR ใหม่</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center shrink-0 shadow-xs">
                <FileText size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  สร้างใบขอซื้อสินค้า (Create Purchase Request)
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  ออกเอกสารคำขอจัดซื้อวัตถุดิบและอุปกรณ์ เชื่อมโยงกับคำสั่งผลิตและโครงการอย่างเป็นระบบ
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 rounded-xl border border-red-200 transition-all shadow-xs"
              title="ดูตัวอย่าง / พิมพ์เอกสารใบขอซื้อ PR (PDF)"
            >
              <Printer size={15} />
              <span>พรีวิว / พิมพ์ PDF</span>
            </button>
            <Link 
              href="/admin/procurement/pr" 
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-xl border border-gray-200 transition-all shadow-xs"
            >
              <ArrowLeft size={15} /> กลับสู่หน้ารายการ PR
            </Link>
          </div>
        </div>
      </div>

      {/* Linked Order Banner if present */}
      {activeLinkedOrder && (
        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 text-white rounded-xl shadow-xs mt-0.5">
                <Package size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    คำสั่งผลิตที่เชื่อมโยง
                  </span>
                  <span className="font-mono font-bold text-red-800 text-base">
                    #{activeLinkedOrder.orderNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                    {activeLinkedOrder.status}
                  </span>
                </div>
                
                <div className="mt-2 text-xs text-gray-700 space-y-1">
                  <div>
                    <span className="font-semibold text-gray-900">ลูกค้า/บริษัท:</span> {activeLinkedOrder.companyName}
                  </div>
                  {activeLinkedOrder.targetDeliveryDate && (
                    <div>
                      <span className="font-semibold text-gray-900">กำหนดส่งมอบของฝ่ายผลิต:</span>{' '}
                      {new Date(activeLinkedOrder.targetDeliveryDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  {activeLinkedOrder.prNote && (
                    <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-800 border border-gray-200 mt-1">
                      <span className="font-bold text-gray-900">ข้อความจากฝ่ายผลิต:</span> {activeLinkedOrder.prNote}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUnlinkOrder}
              className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
            >
              <X size={14} /> ยกเลิกการเชื่อมโยง
            </button>
          </div>
        </div>
      )}

      {/* Pending Orders quick selector if not linked */}
      {!activeLinkedOrder && pendingOrders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-800">
              <Layers size={16} className="text-red-600 flex-shrink-0" />
              <span>
                มี <strong className="text-red-600 font-bold">{pendingOrders.length} คำสั่งผลิต</strong> ที่ฝ่ายผลิตต้องการขอเปิด PR
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOrderSelector(!showOrderSelector)}
              className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg border border-red-200 transition-colors shadow-xs"
            >
              {showOrderSelector ? 'ปิดตัวเลือกออเดอร์' : 'เลือกเชื่อมโยงกับคำสั่งผลิต'}
            </button>
          </div>

          {showOrderSelector && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => handleLinkOrder(order)}
                  className="p-3 bg-gray-50/70 hover:bg-red-50/40 rounded-xl border border-gray-200 hover:border-red-300 cursor-pointer transition-all text-xs space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span className="font-mono text-red-600">#{order.orderNumber}</span>
                    <span className="text-gray-500 font-normal truncate max-w-[150px]">{order.companyName}</span>
                  </div>
                  {order.prNote && (
                    <p className="text-gray-600 line-clamp-1 italic">
                      &quot;{order.prNote}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Error Notice */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-sm font-semibold flex items-center gap-2 shadow-xs">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main PR Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Symmetrical 2-Column Grid (50% / 50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Column 1 (Left 50%): Document Info & Requester */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                  <Tag size={15} />
                </span>
                ข้อมูลเอกสาร & การระบุตัวตน (Document & ID)
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                ส่วนที่ 1/3
              </span>
            </div>

            {/* Company Selector for Prefix */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                เลือกบริษัทในเครือ (Company Prefix) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCompany('E')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                    selectedCompanyCode === 'E'
                      ? 'bg-red-600 border-red-600 text-white shadow-sm ring-2 ring-red-500/20'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono text-sm flex items-center gap-1">
                    <Zap size={14} className={selectedCompanyCode === 'E' ? 'text-white' : 'text-red-600'} />
                    <span>TE</span>
                  </span>
                  <span className="text-[10px] font-normal opacity-90">Electric</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectCompany('P')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                    selectedCompanyCode === 'P'
                      ? 'bg-gray-900 border-gray-900 text-white shadow-sm ring-2 ring-gray-900/20'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono text-sm flex items-center gap-1">
                    <BatteryCharging size={14} className={selectedCompanyCode === 'P' ? 'text-white' : 'text-gray-500'} />
                    <span>TP</span>
                  </span>
                  <span className="text-[10px] font-normal opacity-90">Power</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectCompany('G')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                    selectedCompanyCode === 'G'
                      ? 'bg-gray-700 border-gray-700 text-white shadow-sm ring-2 ring-gray-700/20'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono text-sm flex items-center gap-1">
                    <Building2 size={14} className={selectedCompanyCode === 'G' ? 'text-white' : 'text-gray-500'} />
                    <span>TG</span>
                  </span>
                  <span className="text-[10px] font-normal opacity-90">Group</span>
                </button>
              </div>
            </div>

            {/* Symmetrical 2-Column Grid for PR Number & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PR Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    เลขที่ PR <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = generateSuggestedPrNumber(selectedCompanyCode);
                      setFormData(prev => ({ ...prev, prNumber: suggested }));
                    }}
                    className="text-[10px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-0.5"
                  >
                    <Sparkles size={11} /> แนะนำเลข
                  </button>
                </div>
                <input 
                  type="text" 
                  required
                  value={formData.prNumber}
                  onChange={e => setFormData({ ...formData, prNumber: e.target.value.toUpperCase() })}
                  className="w-full font-mono font-bold text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm bg-gray-50/50"
                  placeholder="เช่น PR69-E100601"
                />
              </div>

              {/* Document Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  วันที่เอกสาร <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="date" 
                    required
                    value={formData.recordedAt}
                    onChange={e => setFormData({ ...formData, recordedAt: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm text-gray-800 bg-white"
                  />
                  <Calendar size={15} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Symmetrical 2-Column Grid for Requester & Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Requester */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    ผู้ขอซื้อ <span className="text-red-500">*</span>
                  </label>
                  {activeUserName && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, requestedBy: activeUserName }))}
                      className="text-[10px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-0.5"
                    >
                      <User size={11} /> ใช้ชื่อฉัน
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.requestedBy}
                    onChange={e => setFormData({ ...formData, requestedBy: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pl-9 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm text-gray-800 bg-white"
                    placeholder="ชื่อผู้ขอซื้อ / แผนก"
                  />
                  <User size={15} className="absolute left-3 top-2.5 text-gray-400" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  ผู้มีอำนาจขอซื้อตามระเบียบ
                </p>
              </div>

              {/* Project / Job Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  โครงการ / ออเดอร์ <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  list="project-datalist"
                  value={formData.projectName}
                  onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm text-gray-800 bg-white"
                  placeholder="พิมพ์หรือเลือกโครงการ..."
                />
                <datalist id="project-datalist">
                  {projectSuggestions.map((proj, idx) => (
                    <option key={idx} value={proj} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Quick project suggestions */}
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">ค่ายอดนิยม:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Safety Stock / สต็อก',
                  'งานสำนักงาน / ส่วนกลาง',
                  'งานซ่อมบำรุง'
                ].map((quick, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, projectName: quick }))}
                    className={`text-[11px] px-2 py-0.5 rounded-lg transition-colors ${
                      formData.projectName === quick 
                        ? 'bg-red-50 text-red-700 font-semibold border border-red-200' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {quick}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2 (Right 50%): Factual Reference Data & Context */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                  <Sparkles size={15} />
                </span>
                ข้อมูลอ้างอิงจริงตามระบบ (Factual Reference)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors shrink-0"
                >
                  ล้างค่า
                </button>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>อ้างอิงตามที่กรอก</span>
                </span>
              </div>
            </div>

            {/* Symmetrical 2x2 Display Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/60 rounded-xl p-3.5 border border-gray-200/70">
              {/* Project Name */}
              <div className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Briefcase size={14} className="text-gray-700" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-gray-400 font-medium block text-[10px]">ชื่อโครงการ (Project Name):</span>
                  <span className={`font-semibold break-words block ${displayRefData.projectName && !displayRefData.projectName.startsWith('(') ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                    {displayRefData.projectName}
                  </span>
                </div>
              </div>

              {/* PR Number */}
              <div className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Receipt size={14} className="text-red-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-gray-400 font-medium block text-[10px]">เลขที่ PR (PR Number):</span>
                  <span className={`font-mono font-bold block ${displayRefData.prNumber && !displayRefData.prNumber.startsWith('(') ? 'text-red-600' : 'text-gray-400 italic font-normal'}`}>
                    {displayRefData.prNumber}
                  </span>
                </div>
              </div>

              {/* Procurement Item */}
              <div className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Package size={14} className="text-gray-700" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-gray-400 font-medium block text-[10px] mb-1">รายการจัดซื้อ (Procurement Item):</span>
                  {displayRefData.itemList && !displayRefData.itemList.startsWith('(') ? (
                    <div className="space-y-1.5 text-xs font-semibold text-gray-900">
                      {displayRefData.itemList.split('\n').filter(Boolean).map((line, idx) => (
                        <div key={idx} className="whitespace-pre-line break-words leading-relaxed py-0.5">
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-400 italic block text-xs">
                      {displayRefData.itemList || '(ยังไม่ได้ระบุรายการสินค้า)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Requester */}
              <div className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <User size={14} className="text-gray-700" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-gray-400 font-medium block text-[10px]">ผู้ขอซื้อ (Requester):</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-semibold ${displayRefData.requestedBy && !displayRefData.requestedBy.startsWith('(') ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {displayRefData.requestedBy}
                    </span>
                    {displayRefData.isLive && formData.requestedBy && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 font-semibold shrink-0">
                        Active User
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments Indicator in Reference Card */}
            {attachments.length > 0 && (
              <div className="flex items-center justify-between text-xs bg-red-50/70 border border-red-200/80 rounded-xl px-3.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Paperclip size={13} />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-500 font-medium block">เอกสารแนบจากผู้ขาย (Supplier Quotes):</span>
                    <span className="text-xs font-bold text-red-700 truncate block">
                      แนบแล้ว {attachments.length} ไฟล์ ({attachments.map(a => a.name).join(', ')})
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200/80 text-red-800 font-bold shrink-0">
                  พร้อมแนบใน PR
                </span>
              </div>
            )}

            <p className="text-[11px] text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lightbulb size={13} className="text-amber-500 shrink-0" />
                <span>ข้อมูลอ้างอิงจะอัปเดตแบบเรียลไทม์ตามข้อมูลที่พิมพ์ในฟอร์ม</span>
              </span>
              <button
                type="button"
                onClick={handleLoadExampleData}
                className="text-red-600 hover:text-red-700 font-semibold text-[11px]"
              >
                โหลดข้อมูลตัวอย่างจริง
              </button>
            </p>
          </div>
        </div>

        {/* Section 2: Full-width Symmetrical Item List Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <Package size={15} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  รายการสินค้าและรายละเอียด (Item List) <span className="text-red-500">*</span>
                </h2>
                <p className="text-[11px] text-gray-400">
                  ระบุรายละเอียดรายการสินค้า คลัง และราคาต่อหน่วย สำหรับนำไปเปิดใบสั่งซื้อ (PO) ในระบบ Express
                </p>
              </div>
            </div>

            {/* Mode Switcher: Express Table vs Free Text */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => handleSwitchMode('table')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-red-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="สลับมุมมองตารางระบบ Express"
              >
                <Table size={13} className={viewMode === 'table' ? 'text-white' : 'text-gray-500'} />
                ตาราง Express
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('text')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'text'
                    ? 'bg-red-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="สลับมุมมองข้อความอิสระ"
              >
                <FileEdit size={13} className={viewMode === 'text' ? 'text-white' : 'text-gray-500'} />
                ข้อความอิสระ
              </button>
            </div>
          </div>

          {/* Quick Draft Template Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-400">แทรกด่วน:</span>
            <button
              type="button"
              onClick={() => handleInsertTemplate(EXAMPLE_PR_DATA.itemList)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors flex items-center gap-1 border border-red-200 shadow-xs"
            >
              <Plus size={12} /> ค่าแรงติดตั้ง 11.6kW
            </button>
            <button
              type="button"
              onClick={() => handleInsertTemplate('- สเปก / ยี่ห้อ: ')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> สเปก/ยี่ห้อ
            </button>
            <button
              type="button"
              onClick={() => handleInsertTemplate('- จำนวน: ... หน่วย')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> จำนวน & หน่วย
            </button>
            <button
              type="button"
              onClick={() => handleInsertTemplate('- กำหนดต้องการใช้วันที่: ')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> วันที่ต้องการใช้
            </button>
            <button
              type="button"
              onClick={() => handleInsertTemplate('- สถานที่จัดส่ง: ')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> สถานที่จัดส่ง
            </button>
          </div>

          {viewMode === 'table' ? (
            /* Express Accounting Grid in Red, White, Gray */
            <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="h-1 bg-red-600 w-full" />
              
              {/* Subheader bar */}
              <div className="bg-gray-100 px-3.5 py-2 border-b border-gray-200 flex items-center justify-between text-gray-700 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 tracking-tight">
                    ตารางรายการสินค้า (Express Accounting Grid)
                  </span>
                  <span className="text-[10px] bg-white text-gray-700 font-semibold px-2 py-0.5 rounded border border-gray-200">
                    {itemRows.length} รายการ
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 flex items-center gap-3">
                  <span className="hidden sm:inline">คลิกช่องเพื่อพิมพ์แก้ไข</span>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-xs bg-red-50 border border-red-300"></span>
                    <span className="text-[10px]">ช่องที่กำลังกรอก (Focus)</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100/90 text-gray-800 font-semibold border-b border-gray-300 text-left select-none">
                      <th className="w-12 py-2 px-2 border-r border-gray-200 text-center font-bold">No.</th>
                      <th className="min-w-[220px] py-2 px-2.5 border-r border-gray-200 font-bold">
                        รายละเอียดสินค้า / บริการ
                      </th>
                      <th className="min-w-[200px] py-2 px-2.5 border-r border-gray-200 font-bold">
                        รายละเอียดเฉพาะ <span className="text-[10px] font-normal text-red-600 block sm:inline font-mono">(แสดงในวงเล็บใน PDF)</span>
                      </th>
                      <th className="w-36 py-2 px-2.5 border-r border-gray-200 text-right font-bold">จำนวน</th>
                      <th className="w-28 py-2 px-2.5 border-r border-gray-200 text-right font-bold">ราคาต่อหน่วย</th>
                      <th className="w-28 py-2 px-2.5 border-r border-gray-200 text-right font-bold">รวมเงิน</th>
                      <th className="w-10 py-2 px-1 text-center font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map((row, idx) => {
                      const isActiveRow = focusedRowIndex === idx;
                      const qtyNum = parseFloat(String(row.quantity)) || 0;
                      const priceNum = parseFloat(String(row.unitPrice)) || 0;
                      const lineTotal = (qtyNum * priceNum).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors border-b border-gray-200 ${
                            isActiveRow 
                              ? 'border-b-2 border-red-600 bg-red-50/15' 
                              : 'hover:bg-gray-50/50'
                          }`}
                          onClick={() => setFocusedRowIndex(idx)}
                        >
                          {/* No. */}
                          <td className="py-1 px-2 border-r border-gray-200 text-center font-mono text-[11px] text-gray-500 bg-gray-50/50">
                            {idx + 1}
                          </td>

                          {/* Description */}
                          <td className="py-0 px-0 border-r border-gray-200">
                            <input
                              type="text"
                              value={row.description}
                              onChange={e => handleUpdateRow(idx, 'description', e.target.value)}
                              onFocus={() => setFocusedRowIndex(idx)}
                              placeholder="ระบุรายละเอียดสินค้า / งานบริการ..."
                              className="w-full h-8 px-2 text-xs font-medium text-gray-900 bg-transparent border-0 outline-none focus:bg-red-50/40 focus:ring-1 focus:ring-red-400 transition-colors"
                            />
                          </td>

                          {/* Specific Item Details */}
                          <td className="py-0 px-0 border-r border-gray-200">
                            <div className="flex items-center h-8 px-1.5 focus-within:bg-red-50/40 focus-within:ring-1 focus-within:ring-red-400 transition-colors">
                              <span className="text-[11px] font-mono text-gray-400 select-none mr-0.5">(</span>
                              <input
                                type="text"
                                value={row.details || ''}
                                onChange={e => handleUpdateRow(idx, 'details', e.target.value)}
                                onFocus={() => setFocusedRowIndex(idx)}
                                placeholder="สเปก, รุ่น, ขนาด, หมายเหตุเฉพาะ..."
                                className="w-full text-xs text-gray-700 bg-transparent border-0 outline-none placeholder:text-gray-400"
                              />
                              <span className="text-[11px] font-mono text-gray-400 select-none ml-0.5">)</span>
                            </div>
                          </td>

                          {/* Quantity & Unit */}
                          <td className="py-0 px-0 border-r border-gray-200">
                            <div className="flex items-center h-8">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={row.quantity}
                                onChange={e => handleUpdateRow(idx, 'quantity', e.target.value)}
                                onFocus={() => setFocusedRowIndex(idx)}
                                placeholder="1.00"
                                className="w-20 h-full px-1.5 text-xs text-right font-mono font-medium text-gray-900 bg-transparent border-0 outline-none focus:bg-red-50/40 focus:ring-1 focus:ring-red-400 transition-colors"
                              />
                              <input
                                type="text"
                                list="unit-suggestions"
                                value={row.unit}
                                onChange={e => handleUpdateRow(idx, 'unit', e.target.value.toUpperCase())}
                                onFocus={() => setFocusedRowIndex(idx)}
                                placeholder="EA"
                                className="w-14 h-full px-1 text-[11px] text-center font-bold text-red-700 bg-red-50/40 border-0 outline-none focus:bg-red-100/50 transition-colors uppercase"
                                title="หน่วยนับ (เช่น EA, ชุด, งาน)"
                              />
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="py-0 px-0 border-r border-gray-200">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.unitPrice}
                              onChange={e => handleUpdateRow(idx, 'unitPrice', e.target.value)}
                              onFocus={() => setFocusedRowIndex(idx)}
                              placeholder="0.00"
                              className="w-full h-8 px-2 text-xs text-right font-mono font-medium text-gray-900 bg-transparent border-0 outline-none focus:bg-red-50/40 focus:ring-1 focus:ring-red-400 transition-colors"
                            />
                          </td>

                          {/* Line Total */}
                          <td className="py-1 px-2.5 border-r border-gray-200 text-right font-mono font-semibold text-xs text-gray-800 bg-gray-50/30">
                            {lineTotal}
                          </td>

                          {/* Action delete */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRow(idx);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="ลบแถวนี้"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty spreadsheet ledger rows */}
                    {[...Array(Math.max(0, 4 - itemRows.length))].map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8 border-b border-gray-200/70 hover:bg-gray-50/40">
                        <td className="border-r border-gray-200/80 text-center text-[11px] text-gray-300 font-mono select-none">
                          {itemRows.length + i + 1}
                        </td>
                        <td className="border-r border-gray-200/80"></td>
                        <td className="border-r border-gray-200/80"></td>
                        <td className="border-r border-gray-200/80"></td>
                        <td className="border-r border-gray-200/80"></td>
                        <td className="border-r border-gray-200/80"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Datalist for unit suggestions */}
              <datalist id="unit-suggestions">
                <option value="EA" />
                <option value="ชุด" />
                <option value="งาน" />
                <option value="ตัว" />
                <option value="ม้วน" />
                <option value="เมตร" />
                <option value="แผง" />
                <option value="กล่อง" />
                <option value="ท่อน" />
              </datalist>

              {/* Table Footer Controls and Grand Total */}
              <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddRow()}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-xs flex items-center gap-1.5 text-xs"
                  >
                    <Plus size={14} /> เพิ่มแถวรายการ (Add Row)
                  </button>

                  <span className="text-gray-300">|</span>

                  <span className="text-[11px] text-gray-500 font-medium">เพิ่มด่วน:</span>
                  <button
                    type="button"
                    onClick={() => handleAddRow({ description: 'ค่าแรงงานติดตั้งแผงโซล่า 11.6kW', details: 'Inverter Huawei 10kW + แผง Jinko 580W', quantity: '1.00', unit: 'EA', unitPrice: '0.00' })}
                    className="px-2 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 font-medium border border-gray-200 text-[11px] transition-colors"
                  >
                    + ค่าแรงงาน 11.6kW
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRow({ description: 'อุปกรณ์ติดตั้งและท่อร้อยสาย', details: 'ท่อ EMT 1/2", ราง Wireway, ข้อต่อ', quantity: '1.00', unit: 'ชุด', unitPrice: '0.00' })}
                    className="px-2 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 font-medium border border-gray-200 text-[11px] transition-colors"
                  >
                    + อุปกรณ์/ท่อร้อยสาย
                  </button>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  <div className="text-gray-600">
                    รวมจำนวน: <span className="font-mono font-bold text-gray-900">{totalQuantity.toFixed(2)}</span>
                  </div>
                  <div className="px-3.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-800 shadow-2xs">
                    <span className="text-[11px] font-medium mr-1.5 text-gray-500">รวมเป็นเงินทั้งสิ้น:</span>
                    <span className="font-mono font-bold text-sm text-red-600">
                      ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <textarea 
                required
                rows={6}
                value={formData.itemList}
                onChange={e => {
                  setFormData({ ...formData, itemList: e.target.value });
                  const parsed = parseStringToItemRows(e.target.value);
                  setItemRows(parsed);
                }}
                className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm font-mono leading-relaxed bg-white"
                placeholder={`ระบุรายการสินค้า เช่น:\n1. [TRD-0001] ค่าแรงงานติดตั้งแผงโซล่า 11.6kW (คลัง: 01) - 1.00 EA @ 0.00 บ.\n2. [MAT-0001] สายไฟ THW 1x2.5 sq.mm. สีดำ (คลัง: 01) - 5.00 ม้วน @ 1,200.00 บ.`}
              />
            </div>
          )}
        </div>

        {/* Section 3: Supplier Documents & Quotations Attachment Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <Paperclip size={15} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  เอกสารแนบจากผู้ขาย / ซัพพลายเออร์ (Supplier Attachments & Quotations)
                  {attachments.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
                      {attachments.length} ไฟล์
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-gray-400">
                  แนบใบเสนอราคา (Quotation), สเปกสินค้า, แคตตาล็อก, หรือตารางเทียบราคาที่หามาเอง เพื่อให้ฝ่ายจัดซื้อใช้เปิด PO ได้ทันที
                </p>
              </div>
            </div>

            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              ส่วนที่ 3/4
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files);
              }
            }}
            className="hidden"
          />

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files);
              }
            }}
            onClick={() => {
              if (!isUploadingAttachments) {
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-red-500 bg-red-50/60 scale-[1.005] ring-4 ring-red-500/10'
                : 'border-gray-200 hover:border-red-400 hover:bg-red-50/10 bg-gray-50/40'
            }`}
          >
            {isUploadingAttachments ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <Loader2 size={32} className="animate-spin text-red-600" />
                <p className="text-xs font-bold text-gray-800">{uploadStatusText || 'กำลังอัปโหลดเอกสาร...'}</p>
                <p className="text-[11px] text-gray-400">ระบบกำลังจัดเก็บไฟล์ลงใน Storage อย่างปลอดภัย กรุณารอสักครู่</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center text-red-600 hover:scale-105 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์เอกสารมาวางที่นี่
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    รองรับ PDF, Excel (.xlsx, .xls), Word (.docx), รูปภาพ (PNG, JPG) ขนาดไม่เกิน 50MB ต่อไฟล์
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-1 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-red-600 transition shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Paperclip size={13} className="text-red-500" />
                  เลือกไฟล์จากเครื่อง
                </button>
              </div>
            )}
          </div>

          {/* Attached Files List */}
          {attachments.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>รายการเอกสารที่แนบไว้ ({attachments.length} ไฟล์):</span>
                <span className="text-[11px] text-gray-400 font-normal">คลิกชื่อหรือไอคอนเพื่อเปิดดูเอกสาร</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map((file) => {
                  const badgeInfo = getFileBadge(file.name, file.type);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200/90 bg-white hover:border-red-300 hover:shadow-xs transition-all group"
                    >
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 min-w-0 flex-1 pr-2"
                        title="คลิกเพื่อดูไฟล์ตัวเต็ม"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                          {badgeInfo.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded font-mono font-bold border ${badgeInfo.bg}`}>
                              {badgeInfo.badge}
                            </span>
                            {file.size ? <span>{formatFileSize(file.size)}</span> : null}
                          </div>
                        </div>
                      </a>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="เปิดดูเอกสารในแท็บใหม่"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(file.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบเอกสารนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Notes & Symmetrical Bottom Action Bar */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <FileEdit size={15} />
              </span>
              หมายเหตุเพิ่มเติม & สรุปดำเนินการ (Notes & Submission)
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              ส่วนที่ 4/4
            </span>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              หมายเหตุเพิ่มเติม / ข้อตกลงจัดซื้อ (Note & Delivery Conditions)
            </label>
            <textarea 
              rows={3}
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm leading-relaxed bg-white"
              placeholder="เช่น ต้องการส่งด่วนภายในวันที่..., แนะนำร้านค้าหรือผู้ขาย, เงื่อนไขการชำระเงินมัดจำ..."
            />
          </div>

          {/* Symmetrical Bottom Action Bar */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <Lightbulb size={13} className="text-amber-500 shrink-0" />
              <span>ตรวจสอบข้อมูลก่อนบันทึก ระบบจะสร้างเลขที่ PR และจัดเก็บในฐานข้อมูล</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm transition-colors shadow-2xs flex items-center gap-1.5"
                title="ดูตัวอย่าง / พิมพ์เอกสารใบขอซื้อ PR (PDF)"
              >
                <Printer size={16} />
                <span>พรีวิว / พิมพ์ PDF</span>
              </button>

              <Link
                href="/admin/procurement/pr"
                className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-sm transition-colors shadow-2xs"
              >
                ยกเลิก
              </Link>

              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-w-[160px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    <span>บันทึกและสร้าง PR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Printable Express PR Modal */}
      <PrintablePurchaseRequisitionModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        prData={{
          prNumber: formData.prNumber || 'PR69-XXXXXX',
          projectName: formData.projectName || '',
          itemList: viewMode === 'table' ? formatItemRowsToString(itemRows) : formData.itemList,
          requestedBy: formData.requestedBy || '',
          recordedAt: formData.recordedAt,
          note: formData.note,
          attachments: attachments,
          itemRows: itemRows.map(r => ({
            code: r.code,
            description: r.description,
            details: r.details,
            quantity: r.quantity,
            unit: r.unit,
            unitPrice: r.unitPrice
          }))
        }}
      />
    </div>
  );
}

