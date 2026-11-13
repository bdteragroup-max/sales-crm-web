'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { createMaterialRequisition } from '@/app/actions/requisitions';
import {
  Save,
  Loader2,
  Eraser,
  FileSpreadsheet,
  Building2,
  Wrench,
  Calendar,
  CheckCircle,
  X,
  Clock,
  ShieldCheck,
  Check,
  Upload,
  FileSignature,
  UserCheck,
  Package,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import RequisitionItemsSection, {
  type ProjectItem,
  type EquipmentItem,
  type ClaimItem,
} from './RequisitionItemsSection';

interface UserOption {
  id: string;
  fullName: string;
}

interface ProjectOption {
  id: string;
  projectNumber: string;
  name: string;
  clientName?: string | null;
  siteAddress?: string | null;
  province?: string | null;
}

interface CurrentUserInfo {
  id?: string;
  fullName?: string | null;
}

interface RequisitionFormProps {
  users: UserOption[];
  currentUser: CurrentUserInfo | null;
  projects?: ProjectOption[];
  initialProjectId?: string;
  initialType?: string;
  initialBranch?: string;
  savedSignatureUrl?: string | null;
}

const BRANCH_OPTIONS = [
  { code: 'BKK-HQ', name: 'สำนักงานใหญ่ (BKK-HQ)' },
  { code: 'BKK-WH', name: 'คลังสินค้ากลาง (Tera Warehouse 62)' },
  { code: 'KK01', name: 'สาขาขอนแก่น (KK01)' },
  { code: 'CMI01', name: 'สาขาเชียงใหม่ (CMI01)' },
  { code: 'PSNL01', name: 'สาขาพิษณุโลก (PSNL01)' },
  { code: 'SN01', name: 'สาขาสกลนคร (SN01)' },
  { code: 'UB01', name: 'สาขาอุบลราชธานี (UB01)' },
  { code: 'SRT01', name: 'สาขาสุราษฎร์ธานี (SRT01)' },
  { code: 'UDN01', name: 'สาขาอุดรธานี (UDN01)' },
  { code: 'SRN01', name: 'สาขาสุรินทร์ (SRN01)' },
  { code: 'ROI01', name: 'สาขาร้อยเอ็ด (ROI01)' },
  { code: 'KRI01', name: 'สาขากาญจนบุรี (KRI01)' },
  { code: 'SMK', name: 'สาขาสมุทรสาคร (SMK)' },
  { code: 'OTHER', name: 'สาขาอื่นๆ / ไซต์งานต่างจังหวัด' },
];

const BORROW_PURPOSE_TAGS = [
  'ทดสอบระบบหน้างาน',
  'ติดตั้งระบบ Inverter',
  'งานซ่อมบำรุง / Service',
  'ตรวจวัดค่าไฟฟ้า & กราวด์',
  'งานช่างทั่วไป / สำรองใช้งาน',
];

const CLAIM_REASON_TAGS = [
  'เคลมเปลี่ยนตัวใหม่ในประกัน',
  'เบิกอะไหล่ทดแทนงานเคลม',
  'ส่งมอบสินค้าเคลมให้ลูกค้า',
  'ทดแทนอุปกรณ์ชำรุดหน้างาน',
];

const TYPE_META = {
  PROJECT: {
    shortTitle: 'เบิกโครงการ',
    desktopTitle: 'เบิกของงานโครงการ',
    badgeEn: 'Project Issue',
    mobileHint: 'ตัดยอดเข้าโครงการ • ไม่คืนของ • รองรับ Excel',
    submitLabel: 'บันทึกและขออนุมัติเบิกของโครงการ',
    mobileSubmitLabel: 'ส่งใบเบิกโครงการ',
    btnClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
  },
  BORROW_EQUIPMENT: {
    shortTitle: 'เบิกยืมสโตร์',
    desktopTitle: 'เบิกยืมสโตร์ (อุปกรณ์)',
    badgeEn: 'Store Borrowing',
    mobileHint: 'ยืมเครื่องมือ/อุปกรณ์ชั่วคราว • มีกำหนดส่งคืนสโตร์',
    submitLabel: 'บันทึกและขออนุมัติเบิกยืมเครื่องมือ',
    mobileSubmitLabel: 'ส่งใบเบิกยืมอุปกรณ์',
    btnClass: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
  },
  CLAIM: {
    shortTitle: 'เบิกเคลม',
    desktopTitle: 'เบิกเคลมสินค้า / อะไหล่',
    badgeEn: 'Claim Issue',
    mobileHint: 'เบิกตัดจ่ายสินค้าเคลมให้ลูกค้า • ไม่คืนของ',
    submitLabel: 'บันทึกและขออนุมัติใบเบิกเคลม',
    mobileSubmitLabel: 'ส่งใบเบิกเคลม',
    btnClass: 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20',
  },
} as const;

type SigPadHandle = SignatureCanvas | null;

function extractSignatureDataUrl(padRef: React.RefObject<SigPadHandle>): string | null {
  const pad = padRef.current;
  if (!pad || pad.isEmpty()) return null;
  try {
    return pad.getTrimmedCanvas().toDataURL('image/png');
  } catch {
    try {
      return pad.getCanvas().toDataURL('image/png');
    } catch {
      return null;
    }
  }
}

function subscribeLocalSignature(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => { };
  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key === 'crm_user_signature') {
      onStoreChange();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

function getSavedLocalSignature(): string | null {
  try {
    return localStorage.getItem('crm_user_signature');
  } catch {
    return null;
  }
}

function getServerSavedLocalSignature(): string | null {
  return null;
}

function SectionBadge({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black inline-flex items-center justify-center shrink-0">
        {step}
      </span>
      <h2 className="text-sm sm:text-base font-black text-slate-900">{label}</h2>
    </div>
  );
}

export default function RequisitionForm({
  users,
  currentUser,
  projects = [],
  initialProjectId,
  initialType = 'PROJECT',
  initialBranch = 'BKK-HQ',
  savedSignatureUrl = null,
}: RequisitionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<SigPadHandle>(null);
  const [signatureFileUrl, setSignatureFileUrl] = useState<string | null>(null);
  const localSavedSignatureUrl = useSyncExternalStore(
    subscribeLocalSignature,
    getSavedLocalSignature,
    getServerSavedLocalSignature
  );

  // Derive initial project details synchronously from server props when opened from a project page
  const initialMatchedProject = initialProjectId
    ? projects.find((item) => item.id === initialProjectId) ?? null
    : null;
  const initialMatchedProjectName = initialMatchedProject
    ? `${initialMatchedProject.projectNumber ? initialMatchedProject.projectNumber + ' - ' : ''}${initialMatchedProject.name}`
    : '';
  const initialMatchedSite = initialMatchedProject?.siteAddress || '';

  // 1. Requisition Type
  const [requisitionType, setRequisitionType] = useState<'PROJECT' | 'BORROW_EQUIPMENT' | 'CLAIM'>(
    initialType === 'BORROW_EQUIPMENT'
      ? 'BORROW_EQUIPMENT'
      : initialType === 'CLAIM'
        ? 'CLAIM'
        : 'PROJECT'
  );

  // Shared Common Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [company, setCompany] = useState('Group');
  const [branch, setBranch] = useState(initialBranch || 'BKK-HQ');

  // Approver Selection
  const [approverId, setApproverId] = useState('');
  const [approverSearch, setApproverSearch] = useState('');
  const [isApproverOpen, setIsApproverOpen] = useState(false);
  const approverRef = useRef<HTMLDivElement>(null);

  // 2. Specific Fields for "PROJECT"
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialMatchedProject?.id || initialProjectId || '');
  const [projectName, setProjectName] = useState<string>(initialMatchedProjectName);
  const [destinationSite, setDestinationSite] = useState<string>(initialMatchedSite);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  const [projectSearch, setProjectSearch] = useState(initialMatchedProjectName);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  // 3. Specific Fields for "BORROW_EQUIPMENT"
  const [borrowPurpose, setBorrowPurpose] = useState<string>('');
  const [usageLocation, setUsageLocation] = useState<string>(initialMatchedSite);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [relatedProjectId, setRelatedProjectId] = useState<string>(initialMatchedProject?.id || initialProjectId || '');
  const [relatedProjectName, setRelatedProjectName] = useState<string>(initialMatchedProjectName);
  const [relatedProjectSearch, setRelatedProjectSearch] = useState(initialMatchedProjectName);
  const [isRelatedProjectOpen, setIsRelatedProjectOpen] = useState(false);
  const relatedProjectRef = useRef<HTMLDivElement>(null);

  // 3.5 Specific Fields for "CLAIM"
  const [claimSelectedProjectId, setClaimSelectedProjectId] = useState<string>(initialMatchedProject?.id || initialProjectId || '');
  const [claimRefName, setClaimRefName] = useState<string>(initialMatchedProjectName);
  const [claimProjectSearch, setClaimProjectSearch] = useState(initialMatchedProjectName);
  const [isClaimProjectOpen, setIsClaimProjectOpen] = useState(false);
  const claimProjectRef = useRef<HTMLDivElement>(null);
  const [claimDestinationSite, setClaimDestinationSite] = useState<string>(initialMatchedSite);
  const [claimDeliveryDate, setClaimDeliveryDate] = useState<string>('');
  const [claimReasonNote, setClaimReasonNote] = useState<string>('');

  // 4. Items State (Dynamic based on type)
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([
    { detail: '', quantity: 1, unit: 'เมตร', job: '', remark: '' },
  ]);

  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([
    { detail: '', assetCode: '', quantity: 1, unit: 'เครื่อง', condition: 'สมบูรณ์พร้อมใช้งาน', remark: '' },
  ]);

  const [claimItems, setClaimItems] = useState<ClaimItem[]>([
    { detail: '', assetCode: '', quantity: 1, unit: 'เครื่อง', job: '', remark: '' },
  ]);

  const effectiveSavedSig = savedSignatureUrl || localSavedSignatureUrl || null;

  // Calibrate SignatureCanvas internal resolution to match responsive container on mobile/desktop
  const calibrateSignaturePad = useCallback(() => {
    const pad = sigPad.current;
    if (!pad) return;
    const canvas: HTMLCanvasElement | null = pad.getCanvas?.() ?? null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      const wasEmpty = pad.isEmpty();
      const strokes = !wasEmpty ? pad.toData() : null;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      pad.clear();
      if (strokes && strokes.length > 0) {
        try {
          pad.fromData(strokes);
        } catch {
          // ignore restore errors
        }
      }
    }
  }, []);

  useEffect(() => {
    if (signatureFileUrl) return;
    const t1 = setTimeout(calibrateSignaturePad, 60);
    const t2 = setTimeout(calibrateSignaturePad, 250);
    window.addEventListener('resize', calibrateSignaturePad);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', calibrateSignaturePad);
    };
  }, [signatureFileUrl, calibrateSignaturePad]);

  // Click/touch outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (approverRef.current && !approverRef.current.contains(event.target as Node)) {
        setIsApproverOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (relatedProjectRef.current && !relatedProjectRef.current.contains(event.target as Node)) {
        setIsRelatedProjectOpen(false);
      }
      if (claimProjectRef.current && !claimProjectRef.current.contains(event.target as Node)) {
        setIsClaimProjectOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const filteredApprovers = users.filter((u) =>
    u.fullName.toLowerCase().includes(approverSearch.toLowerCase())
  );

  const filterProjectsByQuery = (query: string) => {
    const q = query.toLowerCase();
    return projects.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.projectNumber && p.projectNumber.toLowerCase().includes(q)) ||
        (p.clientName && p.clientName.toLowerCase().includes(q)) ||
        (p.province && p.province.toLowerCase().includes(q))
    );
  };

  const filteredProjects = filterProjectsByQuery(projectSearch);
  const filteredRelatedProjects = filterProjectsByQuery(relatedProjectSearch);
  const filteredClaimProjects = filterProjectsByQuery(claimProjectSearch);

  const handleSelectProject = (p: ProjectOption) => {
    setSelectedProjectId(p.id);
    const fullName = `${p.projectNumber ? p.projectNumber + ' - ' : ''}${p.name}`;
    setProjectName(fullName);
    setProjectSearch(fullName);
    if (p.siteAddress) {
      setDestinationSite(p.siteAddress);
    }
    setIsProjectDropdownOpen(false);

    setProjectItems((prev) =>
      prev.map((item) => ({
        ...item,
        job: item.job ? item.job : fullName,
      }))
    );
  };

  const handleSelectRelatedProject = (p: ProjectOption) => {
    setRelatedProjectId(p.id);
    const fullName = `${p.projectNumber ? p.projectNumber + ' - ' : ''}${p.name}`;
    setRelatedProjectName(fullName);
    setRelatedProjectSearch(fullName);
    if (p.siteAddress && !usageLocation) {
      setUsageLocation(p.siteAddress);
    }
    setIsRelatedProjectOpen(false);
  };

  const handleSelectClaimProject = (p: ProjectOption) => {
    setClaimSelectedProjectId(p.id);
    const fullName = `${p.projectNumber ? p.projectNumber + ' - ' : ''}${p.name}${p.clientName ? ` (${p.clientName})` : ''}`;
    setClaimRefName(fullName);
    setClaimProjectSearch(fullName);
    if (p.siteAddress) {
      setClaimDestinationSite(p.siteAddress);
    }
    setIsClaimProjectOpen(false);

    setClaimItems((prev) =>
      prev.map((item) => ({
        ...item,
        job: item.job ? item.job : fullName,
      }))
    );
  };

  // ── Project Items Methods ──
  const addProjectItem = () => {
    setProjectItems((prev) => [
      ...prev,
      { detail: '', quantity: 1, unit: 'เมตร', job: projectName || '', remark: '' },
    ]);
  };

  const removeProjectItem = (index: number) => {
    if (projectItems.length > 1) {
      setProjectItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateProjectItem = (index: number, field: keyof ProjectItem, value: string | number) => {
    setProjectItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ── Equipment Items Methods ──
  const addEquipmentItem = () => {
    setEquipmentItems((prev) => [
      ...prev,
      { detail: '', assetCode: '', quantity: 1, unit: 'เครื่อง', condition: 'สมบูรณ์พร้อมใช้งาน', remark: '' },
    ]);
  };

  const removeEquipmentItem = (index: number) => {
    if (equipmentItems.length > 1) {
      setEquipmentItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateEquipmentItem = (index: number, field: keyof EquipmentItem, value: string | number) => {
    setEquipmentItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ── Claim Items Methods ──
  const addClaimItem = () => {
    setClaimItems((prev) => [
      ...prev,
      { detail: '', assetCode: '', quantity: 1, unit: 'เครื่อง', job: claimRefName || '', remark: '' },
    ]);
  };

  const removeClaimItem = (index: number) => {
    if (claimItems.length > 1) {
      setClaimItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateClaimItem = (index: number, field: keyof ClaimItem, value: string | number) => {
    setClaimItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const clearSignature = () => {
    if (sigPad.current) {
      sigPad.current.clear();
    }
    setSignatureFileUrl(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureFileUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Excel Import (Only for Project Material Issue) ──
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        if (!data || data.length === 0) {
          Swal.fire({ icon: 'warning', title: 'ไม่พบข้อมูลในไฟล์ Excel' });
          return;
        }

        let foundCompany = 'Group';
        let foundDeliveryDateText = '';
        let detectedProjectName = '';
        const parsedItems: ProjectItem[] = [];

        for (let r = 0; r < Math.min(4, data.length); r++) {
          const row = data[r] || [];
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim();
            if (val.includes('เดินทางวันที่')) {
              foundDeliveryDateText = val;
            }
          }
        }

        if (data[2]) {
          const r2 = data[2];
          if (r2[3] === '/' || r2[3] === '✓') foundCompany = 'Group';
          else if (r2[4] === '/' || r2[4] === '✓') foundCompany = 'Electric';
          else if (r2[5] === '/' || r2[5] === '✓') foundCompany = 'Power';
        }

        let startRow = 4;
        for (let r = 0; r < Math.min(10, data.length); r++) {
          const row = data[r] || [];
          if (row.some((cell) => String(cell).includes('รายการเบิก') || String(cell).includes('ลำดับ'))) {
            startRow = r + 1;
            break;
          }
        }

        for (let r = startRow; r < data.length; r++) {
          const row = data[r] || [];
          const detail = row[1] !== undefined ? String(row[1]).trim() : '';

          if (
            !detail ||
            detail.startsWith('...') ||
            detail.includes('ผู้ขอเบิก') ||
            detail.includes('ผู้รับของ') ||
            detail.includes('ผู้อนุมัติ')
          ) {
            continue;
          }

          const quantity = Number(row[2]) || 1;
          const unit = row[3] !== undefined ? String(row[3]).trim() : 'EA';
          const job = row[4] !== undefined ? String(row[4]).trim() : '';
          const remark = row[5] !== undefined ? String(row[5]).trim() : '';

          if (!detectedProjectName && job) {
            detectedProjectName = job;
          }

          parsedItems.push({
            detail,
            quantity,
            unit,
            job: job || projectName,
            remark,
          });
        }

        if (parsedItems.length > 0) {
          setProjectItems(parsedItems);
          if (foundCompany) setCompany(foundCompany);
          if (foundDeliveryDateText && !deliveryNote) {
            setDeliveryNote(foundDeliveryDateText);
          }
          if (detectedProjectName && !projectName) {
            setProjectName(detectedProjectName);
            setProjectSearch(detectedProjectName);
          }

          Swal.fire({
            icon: 'success',
            title: `นำเข้าสำเร็จ ${parsedItems.length} รายการ`,
            text: `ดึงข้อมูลจากชีต "${firstSheetName}" เข้าสู่รายการวัสดุโครงการเรียบร้อยแล้ว`,
            timer: 2500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: 'info',
            title: 'ไม่พบรายการอุปกรณ์ในไฟล์',
            text: 'โปรดตรวจสอบว่ารูปแบบคอลัมน์ตรงกับแบบฟอร์มเบิกของโครงการ',
          });
        }
      } catch (err: unknown) {
        console.error('Excel import error:', err);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการอ่านไฟล์',
          text: err instanceof Error ? err.message : 'ไม่สามารถเปิดอ่านไฟล์ Excel ได้',
        });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const warnAndScroll = async (title: string, sectionId: string) => {
    await Swal.fire({ icon: 'warning', title, confirmButtonText: 'ตกลง' });
    scrollToSection(sectionId);
  };

  // ── Form Submission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requisitionType === 'PROJECT') {
      if (!projectName.trim() && !destinationSite.trim()) {
        await warnAndScroll('กรุณาระบุโครงการ หรือไซต์งานติดตั้งหน้างาน', 'sec-info');
        return;
      }
      if (projectItems.some((i) => !i.detail.trim() || !i.unit.trim())) {
        await warnAndScroll('กรุณากรอกรายละเอียดและหน่วยของรายการวัสดุให้ครบถ้วน', 'sec-items');
        return;
      }
    }

    if (requisitionType === 'BORROW_EQUIPMENT') {
      if (!borrowPurpose.trim()) {
        await warnAndScroll('กรุณาระบุวัตถุประสงค์ในการยืมเครื่องมือ', 'sec-info');
        return;
      }
      if (!usageLocation.trim()) {
        await warnAndScroll('กรุณาระบุสถานที่นำเครื่องมือไปใช้งาน', 'sec-info');
        return;
      }
      if (equipmentItems.some((i) => !i.detail.trim() || !i.unit.trim())) {
        await warnAndScroll('กรุณากรอกชื่อเครื่องมือและหน่วยให้ครบถ้วน', 'sec-items');
        return;
      }
    }

    if (requisitionType === 'CLAIM') {
      if (!claimRefName.trim() && !claimDestinationSite.trim()) {
        await warnAndScroll('กรุณาระบุชื่องานเคลม/ชื่อลูกค้า หรือสถานที่จัดส่ง', 'sec-info');
        return;
      }
      if (claimItems.some((i) => !i.detail.trim() || !i.unit.trim())) {
        await warnAndScroll('กรุณากรอกรายการสินค้า/อะไหล่ที่เบิกเคลมและหน่วยให้ครบถ้วน', 'sec-items');
        return;
      }
    }

    if (!approverId) {
      setIsApproverOpen(true);
      await warnAndScroll('กรุณาเลือกผู้อนุมัติจากรายชื่อ', 'sec-approver');
      return;
    }

    const drawnDataUrl = extractSignatureDataUrl(sigPad);
    const signatureDataUrl = signatureFileUrl || drawnDataUrl;
    if (!signatureDataUrl) {
      await warnAndScroll('กรุณาลงลายมือชื่อผู้ขอเบิก หรือดึงลายเซ็นเดิม / อัปโหลดรูป', 'sec-signature');
      return;
    }

    setLoading(true);
    try {
      try {
        localStorage.setItem('crm_user_signature', signatureDataUrl);
      } catch {
        // ignore storage errors
      }

      const payload =
        requisitionType === 'PROJECT'
          ? {
            date,
            company,
            items: projectItems,
            approverId,
            requesterSignatureUrl: signatureDataUrl,
            requisitionType: 'PROJECT',
            projectId: selectedProjectId || null,
            projectName: projectName || projectItems[0]?.job || null,
            branch,
            destinationSite: destinationSite || null,
            deliveryDate: deliveryDate || null,
            deliveryNote: deliveryNote || null,
          }
          : requisitionType === 'CLAIM'
            ? {
              date,
              company,
              items: claimItems.map((it) => ({
                ...it,
                job: it.job || claimRefName || '',
              })),
              approverId,
              requesterSignatureUrl: signatureDataUrl,
              requisitionType: 'CLAIM',
              projectId: claimSelectedProjectId || null,
              projectName: claimRefName || claimItems[0]?.job || null,
              branch,
              destinationSite: claimDestinationSite || null,
              deliveryDate: claimDeliveryDate || null,
              deliveryNote: claimReasonNote || null,
            }
            : {
              date,
              company,
              items: equipmentItems,
              approverId,
              requesterSignatureUrl: signatureDataUrl,
              requisitionType: 'BORROW_EQUIPMENT',
              projectId: relatedProjectId || null,
              projectName: relatedProjectName || null,
              branch,
              destinationSite: usageLocation,
              deliveryDate: expectedReturnDate || null,
              deliveryNote: borrowPurpose,
            };

      const res = await createMaterialRequisition(payload);

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title:
            requisitionType === 'PROJECT'
              ? 'สร้างใบเบิกของโครงการเรียบร้อยแล้ว'
              : requisitionType === 'CLAIM'
                ? 'สร้างใบเบิกเคลมสินค้าเรียบร้อยแล้ว'
                : 'สร้างใบเบิกยืมเครื่องมือเรียบร้อยแล้ว',
          text: 'ระบบได้ส่งการแจ้งเตือนไปยังผู้อนุมัติเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false,
        });
        router.push('/requisitions');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกข้อมูลได้',
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Save error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
      setLoading(false);
    }
  };

  const activeItemCount =
    requisitionType === 'PROJECT'
      ? projectItems.length
      : requisitionType === 'BORROW_EQUIPMENT'
        ? equipmentItems.length
        : claimItems.length;

  const activeMeta = TYPE_META[requisitionType];

  // Shared responsive field classes (16px font & >=44px tap target prevents iOS Safari zoom)
  const fieldBase =
    'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-base sm:text-sm';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-8"
    >
      {/* Mobile Quick Section Anchor Bar */}
      <nav
        aria-label="ทางลัดหัวข้อแบบฟอร์ม"
        className="md:hidden sticky top-0 z-20 -mx-3.5 -mt-3.5 px-3.5 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-100 rounded-t-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        {[
          { id: 'sec-type', label: '1. ประเภท' },
          { id: 'sec-info', label: '2. ข้อมูลงาน' },
          { id: 'sec-items', label: `3. รายการ (${activeItemCount})` },
          { id: 'sec-approver', label: '4. อนุมัติ' },
          { id: 'sec-signature', label: '5. เซ็นชื่อ' },
        ].map((nav) => (
          <button
            key={nav.id}
            type="button"
            onClick={() => scrollToSection(nav.id)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
          >
            {nav.label}
          </button>
        ))}
      </nav>

      {/* ── 1. Requisition Type Selector ── */}
      <div id="sec-type" className="space-y-3 scroll-mt-14">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-sm font-bold text-slate-800">
            เลือกประเภทการเบิก <span className="text-red-500">*</span>
          </label>
          <span className="hidden sm:inline text-xs text-slate-400">
            (ฟอร์มกรอกข้อมูลจะปรับเปลี่ยนอัตโนมัติตามประเภทที่เลือก)
          </span>
        </div>

        {/* Compact 3-Column Touch Tabs on Mobile (< lg) */}
        <div className="lg:hidden space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                {
                  type: 'PROJECT' as const,
                  title: TYPE_META.PROJECT.shortTitle,
                  icon: Building2,
                  activeCard: 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20',
                  activeIcon: 'bg-blue-600 text-white',
                },
                {
                  type: 'BORROW_EQUIPMENT' as const,
                  title: TYPE_META.BORROW_EQUIPMENT.shortTitle,
                  icon: Wrench,
                  activeCard: 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20',
                  activeIcon: 'bg-amber-600 text-white',
                },
                {
                  type: 'CLAIM' as const,
                  title: TYPE_META.CLAIM.shortTitle,
                  icon: ShieldCheck,
                  activeCard: 'bg-violet-50 border-violet-600 text-violet-950 ring-2 ring-violet-500/20',
                  activeIcon: 'bg-violet-600 text-white',
                },
              ]
            ).map((opt) => {
              const Icon = opt.icon;
              const isSelected = requisitionType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setRequisitionType(opt.type)}
                  className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-center min-h-[82px] transition-all active:scale-[0.98] ${isSelected
                      ? `${opt.activeCard} shadow-sm`
                      : 'bg-white border-slate-200 text-slate-600'
                    }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? opt.activeIcon : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="text-xs font-black leading-tight">{opt.title}</span>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600 text-center">
            {activeMeta.mobileHint}
          </div>
        </div>

        {/* Rich Cards on Desktop (>= lg) */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-4">
          {/* Option 1: PROJECT */}
          <button
            type="button"
            onClick={() => setRequisitionType('PROJECT')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${requisitionType === 'PROJECT'
                ? 'bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${requisitionType === 'PROJECT'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-500'
                  }`}
              >
                <Building2 size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 text-base">
                    {TYPE_META.PROJECT.desktopTitle}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {TYPE_META.PROJECT.badgeEn}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สำหรับเบิกใช้วัสดุและอุปกรณ์ติดตั้งเข้าโครงการจริง เช่น สายไฟ, ท่อ, น็อต, ข้อต่อ
                  (ตัดยอดเข้าต้นทุนโครงการ <strong>ไม่มีการส่งคืน</strong>)
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-100/60 flex items-center justify-between text-xs text-blue-700 font-semibold">
              <span className="inline-flex items-center gap-1">
                <FileSpreadsheet size={13} /> รองรับ Import Excel โครงการ
              </span>
              {requisitionType === 'PROJECT' && (
                <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                  <Check size={12} strokeWidth={3} /> กำลังเลือก
                </span>
              )}
            </div>
          </button>

          {/* Option 2: BORROW_EQUIPMENT */}
          <button
            type="button"
            onClick={() => setRequisitionType('BORROW_EQUIPMENT')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${requisitionType === 'BORROW_EQUIPMENT'
                ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${requisitionType === 'BORROW_EQUIPMENT'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 text-slate-500'
                  }`}
              >
                <Wrench size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 text-base">
                    {TYPE_META.BORROW_EQUIPMENT.desktopTitle}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {TYPE_META.BORROW_EQUIPMENT.badgeEn}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สำหรับยืมเครื่องมือช่าง หรืออุปกรณ์ทดสอบส่วนกลางไปใช้งานชั่วคราว เช่น สว่าน, ตู้เชื่อม,
                  เครื่องวัด (นำมาส่งคืนสโตร์เมื่อใช้งานเสร็จ)
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100/60 flex items-center justify-between text-xs text-amber-800 font-semibold">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> กำหนดส่งคืน + ตรวจสภาพตอนคืน
              </span>
              {requisitionType === 'BORROW_EQUIPMENT' && (
                <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                  <Check size={12} strokeWidth={3} /> กำลังเลือก
                </span>
              )}
            </div>
          </button>

          {/* Option 3: CLAIM */}
          <button
            type="button"
            onClick={() => setRequisitionType('CLAIM')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${requisitionType === 'CLAIM'
                ? 'bg-gradient-to-br from-violet-50/90 via-purple-50/40 to-white border-violet-600 ring-2 ring-violet-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${requisitionType === 'CLAIM'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                    : 'bg-slate-100 text-slate-500'
                  }`}
              >
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 text-base">
                    {TYPE_META.CLAIM.desktopTitle}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-900">
                    {TYPE_META.CLAIM.badgeEn}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สำหรับเบิกสินค้าตัวใหม่หรืออะไหล่ทดแทนเพื่อนำไปเคลม/เปลี่ยนให้ลูกค้า (เบิกตัดจ่ายถาวร{' '}
                  <strong>ไม่มีการคืนสินค้า</strong>)
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-violet-100/60 flex items-center justify-between text-xs text-violet-800 font-semibold">
              <span className="inline-flex items-center gap-1">
                <CheckCircle size={13} /> เบิกตัดจ่าย • ไม่มีการคืนสินค้าเข้าสโตร์
              </span>
              {requisitionType === 'CLAIM' && (
                <span className="inline-flex items-center gap-1 text-violet-800 font-bold bg-violet-200/80 px-2.5 py-0.5 rounded-full">
                  <Check size={12} strokeWidth={3} /> กำลังเลือก
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ── 2. CONDITIONAL SECTION: FORM DETAILS ── */}
      <div id="sec-info" className="scroll-mt-14 space-y-5">
        {requisitionType === 'PROJECT' && (
          <div className="space-y-4 sm:space-y-5 animate-fadeIn">
            <div className="p-3.5 sm:p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs sm:text-sm font-bold block text-blue-950">
                  ข้อมูลงานโครงการและการจัดส่งวัสดุ (Project & Delivery)
                </strong>
                <p className="text-blue-800 mt-0.5 leading-snug">
                  ระบุโครงการ ไซต์งานติดตั้ง และกำหนดวันที่ต้องการให้วัสดุส่งถึงหน้างาน
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สาขา / คลังสินค้าผู้จัดส่ง <span className="text-red-500">*</span>
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={`${fieldBase} font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={projectRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  โครงการ / ชื่องานติดตั้ง (Project) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setProjectName(e.target.value);
                      setSelectedProjectId('');
                      setIsProjectDropdownOpen(true);
                    }}
                    onFocus={() => setIsProjectDropdownOpen(true)}
                    placeholder="พิมพ์ค้นหาโครงการ หรือระบุชื่องาน..."
                    className={`${fieldBase} pr-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                  {projectSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProjectSearch('');
                        setProjectName('');
                        setSelectedProjectId('');
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
                      aria-label="ล้างค่าโครงการ"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {isProjectDropdownOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-3 hover:bg-blue-50/70 active:bg-blue-100/70 cursor-pointer text-xs transition-colors"
                          onClick={() => handleSelectProject(p)}
                        >
                          <div className="font-bold text-slate-800">
                            {p.projectNumber ? `${p.projectNumber} - ` : ''}
                            {p.name}
                          </div>
                          {(p.clientName || p.province) && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {p.clientName ? `ลูกค้า: ${p.clientName}` : ''}{' '}
                              {p.province ? `• ${p.province}` : ''}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400">
                        ไม่พบโครงการในระบบ (คุณสามารถพิมพ์ชื่องานเองได้โดยตรง)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สถานที่จัดส่ง / ไซต์งานติดตั้ง (Site Address) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={destinationSite}
                  onChange={(e) => setDestinationSite(e.target.value)}
                  placeholder="เช่น โรงงานนิชชินโบ Zone C อ.บางปะอิน..."
                  className={`${fieldBase} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  วันเดินทาง / กำหนดของถึงหน้างาน
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={`${fieldBase} appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  วิธีการจัดส่ง & ข้อมูลผู้รับของหน้างาน
                </label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="เช่น รถสโตร์นำส่งหน้างาน / ช่างสมคิด โทร 081-xxx-xxxx"
                  className={`${fieldBase} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
                />
              </div>
            </div>
          </div>
        )}

        {requisitionType === 'BORROW_EQUIPMENT' && (
          <div className="space-y-4 sm:space-y-5 animate-fadeIn">
            <div className="p-3.5 sm:p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
              <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs sm:text-sm font-bold block text-amber-950">
                  ข้อมูลการเบิกยืมเครื่องมือ/อุปกรณ์ (Equipment Borrowing)
                </strong>
                <p className="text-amber-900 mt-0.5 leading-snug">
                  ระบุวัตถุประสงค์ในการยืม สถานที่นำไปใช้งาน และกำหนดวันที่ส่งคืนสโตร์ (ถ้ามี)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สาขา / คลังสินค้าที่ขอยืม <span className="text-red-500">*</span>
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={`${fieldBase} font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between gap-2">
                  <span>กำหนดวันที่ต้องส่งคืนสโตร์</span>
                  <span className="text-[11px] text-slate-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className={`${fieldBase} appearance-none text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  เว้นว่างไว้ได้ หรือกดแจ้งส่งคืนผ่านระบบเมื่อใช้งานเสร็จ
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  วัตถุประสงค์ในการยืมเครื่องมือ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={borrowPurpose}
                  onChange={(e) => setBorrowPurpose(e.target.value)}
                  placeholder="เช่น นำไปตรวจเช็คและทดสอบระบบไฟฟ้าหน้างาน..."
                  className={`${fieldBase} focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">เลือกด่วน:</span>
                  {BORROW_PURPOSE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBorrowPurpose(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${borrowPurpose === tag
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 border-slate-200'
                        }`}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สถานที่นำเครื่องมือไปใช้งาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={usageLocation}
                  onChange={(e) => setUsageLocation(e.target.value)}
                  placeholder="เช่น ไซต์งานนิชชินโบ, แผนก Service..."
                  className={`${fieldBase} focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                />
              </div>

              <div ref={relatedProjectRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between gap-2">
                  <span>โครงการที่เกี่ยวข้อง</span>
                  <span className="text-[11px] text-slate-400 font-normal">ถ้ามี (ไม่บังคับ)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={relatedProjectSearch}
                    onChange={(e) => {
                      setRelatedProjectSearch(e.target.value);
                      setRelatedProjectName(e.target.value);
                      setRelatedProjectId('');
                      setIsRelatedProjectOpen(true);
                    }}
                    onFocus={() => setIsRelatedProjectOpen(true)}
                    placeholder="ค้นหาเพื่อผูกกับโครงการ (ถ้ามี)..."
                    className={`${fieldBase} pr-10 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500`}
                  />
                  {relatedProjectSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setRelatedProjectSearch('');
                        setRelatedProjectName('');
                        setRelatedProjectId('');
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
                      aria-label="ล้างค่าโครงการที่เกี่ยวข้อง"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {isRelatedProjectOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredRelatedProjects.length > 0 ? (
                      filteredRelatedProjects.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-3 hover:bg-amber-50 active:bg-amber-100 cursor-pointer text-xs"
                          onClick={() => handleSelectRelatedProject(p)}
                        >
                          <div className="font-bold text-slate-800">{p.name}</div>
                          {p.clientName && <div className="text-[11px] text-slate-500">{p.clientName}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400">ไม่พบโครงการ</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {requisitionType === 'CLAIM' && (
          <div className="space-y-4 sm:space-y-5 animate-fadeIn">
            <div className="p-3.5 sm:p-4 bg-violet-50/80 border border-violet-200/90 rounded-2xl flex items-start gap-3 text-xs text-violet-950">
              <ShieldCheck className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs sm:text-sm font-bold block text-violet-950">
                  ข้อมูลการเบิกเคลมสินค้า / อะไหล่ทดแทน (ไม่มีการคืนสินค้า)
                </strong>
                <p className="text-violet-900 mt-0.5 leading-snug">
                  ระบุชื่องานเคลมหรือชื่อลูกค้า สถานที่จัดส่ง และสาเหตุการเคลม
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สาขา / คลังสินค้าผู้จ่ายของเคลม <span className="text-red-500">*</span>
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={`${fieldBase} font-semibold text-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={claimProjectRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่องานเคลม / ลูกค้า / เลขอ้างอิง <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={claimProjectSearch}
                    onChange={(e) => {
                      setClaimProjectSearch(e.target.value);
                      setClaimRefName(e.target.value);
                      setClaimSelectedProjectId('');
                      setIsClaimProjectOpen(true);
                    }}
                    onFocus={() => setIsClaimProjectOpen(true)}
                    placeholder="เช่น งานเคลม หจก.แพร่มณีรัตน / JR69-11006..."
                    className={`${fieldBase} pr-10 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                  />
                  {claimProjectSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setClaimProjectSearch('');
                        setClaimRefName('');
                        setClaimSelectedProjectId('');
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
                      aria-label="ล้างค่างานเคลม"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {isClaimProjectOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filteredClaimProjects.length > 0 ? (
                      filteredClaimProjects.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-3 hover:bg-violet-50/70 active:bg-violet-100/70 cursor-pointer text-xs transition-colors"
                          onClick={() => handleSelectClaimProject(p)}
                        >
                          <div className="font-bold text-slate-800">
                            {p.projectNumber ? `${p.projectNumber} - ` : ''}
                            {p.name}
                          </div>
                          {(p.clientName || p.province) && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {p.clientName ? `ลูกค้า: ${p.clientName}` : ''}{' '}
                              {p.province ? `• ${p.province}` : ''}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400">
                        พิมพ์ระบุชื่องานเคลม ชื่อลูกค้า หรือเลขใบแจ้งซ่อมได้โดยตรง
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สถานที่จัดส่ง / ปลายทางลูกค้าเคลม <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={claimDestinationSite}
                  onChange={(e) => setClaimDestinationSite(e.target.value)}
                  placeholder="เช่น ส่งลูกค้าหน้างาน จ.แพร่..."
                  className={`${fieldBase} focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between gap-2">
                  <span>วันที่ต้องการรับของ / วันจัดส่งเคลม</span>
                  <span className="text-[11px] text-slate-400 font-normal">(ถ้ามี)</span>
                </label>
                <input
                  type="date"
                  value={claimDeliveryDate}
                  onChange={(e) => setClaimDeliveryDate(e.target.value)}
                  className={`${fieldBase} appearance-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สาเหตุการเคลม & วิธีการจัดส่ง
                </label>
                <input
                  type="text"
                  value={claimReasonNote}
                  onChange={(e) => setClaimReasonNote(e.target.value)}
                  placeholder="เช่น เคลมเปลี่ยนตัวใหม่ในประกัน เนื่องจากบอร์ดไหม้..."
                  className={`${fieldBase} focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500`}
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">เลือกด่วน:</span>
                  {CLAIM_REASON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setClaimReasonNote(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${claimReasonNote === tag
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-slate-100 hover:bg-violet-100 hover:text-violet-900 text-slate-600 border-slate-200'
                        }`}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. COMMON: DATE & COMPANY ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <span>{requisitionType === 'BORROW_EQUIPMENT' ? 'วันที่เริ่มยืม (Borrow Date)' : 'วันที่ทำรายการเบิก (Date)'}</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${fieldBase} appearance-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">สังกัดบริษัท (Company)</label>
            <div className="grid grid-cols-3 gap-2">
              {['Group', 'Electric', 'Power'].map((c) => {
                const isSelected = company === c;
                return (
                  <label
                    key={c}
                    className={`min-h-[44px] px-2.5 rounded-xl border-2 flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="company"
                      value={c}
                      checked={isSelected}
                      onChange={(e) => setCompany(e.target.value)}
                      className="sr-only"
                    />
                    {isSelected && <Check size={14} strokeWidth={3} />}
                    <span>{c}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. ITEMS SECTION (Mobile Card Editor + Desktop Table) ── */}
      <div id="sec-items" className="scroll-mt-14">
        <RequisitionItemsSection
          requisitionType={requisitionType}
          projectItems={projectItems}
          onAddProjectItem={addProjectItem}
          onRemoveProjectItem={removeProjectItem}
          onUpdateProjectItem={updateProjectItem}
          onExcelImport={handleExcelImport}
          equipmentItems={equipmentItems}
          onAddEquipmentItem={addEquipmentItem}
          onRemoveEquipmentItem={removeEquipmentItem}
          onUpdateEquipmentItem={updateEquipmentItem}
          claimItems={claimItems}
          claimRefName={claimRefName}
          onAddClaimItem={addClaimItem}
          onRemoveClaimItem={removeClaimItem}
          onUpdateClaimItem={updateClaimItem}
        />
      </div>

      {/* ── 5. APPROVER SELECTION ── */}
      <div id="sec-approver" className="pt-4 border-t border-slate-100 scroll-mt-14">
        <SectionBadge
          step={4}
          label={
            requisitionType === 'BORROW_EQUIPMENT'
              ? 'ผู้อนุมัติการยืมเครื่องมือ (Approver)'
              : requisitionType === 'CLAIM'
                ? 'ผู้อนุมัติการเบิกเคลม (Claim Approver)'
                : 'ผู้อนุมัติโครงการ (Project Approver)'
          }
        />
        <div className="max-w-md" ref={approverRef}>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            เลือกหัวหน้า / ผู้มีอำนาจอนุมัติ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={approverSearch}
              onChange={(e) => {
                setApproverSearch(e.target.value);
                setIsApproverOpen(true);
                if (approverId) setApproverId('');
              }}
              onFocus={() => setIsApproverOpen(true)}
              placeholder="พิมพ์เพื่อค้นหาผู้อนุมัติ (PM / หัวหน้าช่าง / ผู้จัดการ)..."
              className={`${fieldBase} pr-10 focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
            />
            {approverSearch && (
              <button
                type="button"
                onClick={() => {
                  setApproverSearch('');
                  setApproverId('');
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="ล้างค่าผู้อนุมัติ"
              >
                <X size={16} />
              </button>
            )}
            {isApproverOpen && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                {filteredApprovers.length > 0 ? (
                  filteredApprovers.map((u) => (
                    <div
                      key={u.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm flex items-center justify-between ${approverId === u.id ? 'bg-red-50/70 text-red-900 font-bold' : ''
                        }`}
                      onClick={() => {
                        setApproverId(u.id);
                        setApproverSearch(u.fullName);
                        setIsApproverOpen(false);
                      }}
                    >
                      <span className="font-semibold">{u.fullName}</span>
                      {approverId === u.id && <Check size={15} className="text-red-600 shrink-0" />}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-400 text-xs">ไม่พบรายชื่อผู้อนุมัติ</div>
                )}
              </div>
            )}
          </div>
          {approverId ? (
            <p className="text-xs text-emerald-700 font-semibold mt-1.5 inline-flex items-center gap-1">
              <UserCheck size={14} /> เลือกผู้อนุมัติแล้ว: {approverSearch}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1.5">
              ระบบจะส่งแจ้งเตือนไปยังผู้อนุมัติโดยอัตโนมัติ
            </p>
          )}
        </div>
      </div>

      {/* ── 6. SIGNATURE SECTION (Calibrated Touch Pad + One-Tap Saved Reuse) ── */}
      <div id="sec-signature" className="pt-4 border-t border-slate-100 scroll-mt-14 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-[460px] mx-auto">
          <label className="text-xs sm:text-sm font-bold text-slate-800 inline-flex items-center gap-1.5">
            <FileSignature size={16} className="text-slate-600" />
            <span>
              ลายมือชื่อผู้ขอเบิก (Signature) <span className="text-red-500">*</span>
            </span>
          </label>

          <div className="flex items-center gap-2">
            {effectiveSavedSig && (
              <button
                type="button"
                onClick={() => setSignatureFileUrl(effectiveSavedSig)}
                className="min-h-[34px] px-3 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors"
              >
                ดึงลายเซ็นเดิม
              </button>
            )}
            <button
              type="button"
              onClick={clearSignature}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold inline-flex items-center gap-1 transition-colors"
            >
              <Eraser size={14} />
              <span>ล้าง</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {signatureFileUrl ? (
            <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 flex items-center justify-center p-2 w-full max-w-[460px] h-[170px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureFileUrl}
                alt="Signature"
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setSignatureFileUrl(null)}
                className="absolute top-2 right-2 w-9 h-9 bg-white shadow-xs border border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                title="ลบรูปลายเซ็น"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-[460px] h-[175px] border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50/70 shadow-2xs">
              <SignatureCanvas
                ref={sigPad}
                penColor="#0f172a"
                canvasProps={{
                  className: 'w-full h-full cursor-crosshair touch-none select-none block',
                  style: { touchAction: 'none' },
                }}
              />
              <div className="pointer-events-none absolute inset-x-8 bottom-6 border-b border-dashed border-slate-300/90 flex justify-center">
                <span className="translate-y-4 bg-slate-50/90 px-2 text-[10px] text-slate-400 font-medium">
                  ใช้นิ้วหรือปากกาเซ็นชื่อในกรอบนี้
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <label className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs text-slate-700 font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors">
              <Upload size={14} className="text-red-600" />
              <span>อัปโหลดรูปลายเซ็น</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="mt-2.5 text-center">
            <p className="text-slate-900 font-bold text-xs sm:text-sm">
              ({currentUser?.fullName || 'ผู้ขอเบิก'})
            </p>
            <p className="text-slate-400 text-[11px]">ผู้ขอเบิก</p>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Cancel Button */}
      <div className="md:hidden pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full min-h-[44px] px-4 py-2.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-xs"
        >
          ยกเลิกและย้อนกลับ
        </button>
      </div>

      {/* ── 7A. DESKTOP SUBMIT BAR ── */}
      <div className="hidden md:flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors text-sm"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold transition-all shadow-md text-sm disabled:opacity-50 text-white ${activeMeta.btnClass}`}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{loading ? 'กำลังบันทึก...' : activeMeta.submitLabel}</span>
        </button>
      </div>

      {/* ── 7B. MOBILE STICKY BOTTOM SUBMIT BAR (pl-20 clears Sidebar floating menu button) ── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 pl-20 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        <button
          type="submit"
          disabled={loading}
          className={`w-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-md text-sm disabled:opacity-50 text-white active:scale-[0.99] ${activeMeta.btnClass}`}
        >
          {loading ? <Loader2 className="animate-spin shrink-0" size={17} /> : <Save className="shrink-0" size={17} />}
          <span className="truncate">
            {loading ? 'กำลังบันทึก...' : activeMeta.mobileSubmitLabel}
          </span>
          {!loading && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 text-[11px] font-bold shrink-0">
              <Package size={12} /> {activeItemCount}
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
