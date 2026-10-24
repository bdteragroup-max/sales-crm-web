"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { createMaterialRequisition } from '@/app/actions/requisitions';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Eraser,
  FileSpreadsheet,
  Building2,
  Wrench,
  MapPin,
  Calendar,
  CheckCircle,
  HelpCircle,
  X,
  Clock,
  AlertTriangle,
  Briefcase,
  Truck,
  ShieldAlert,
  Info,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

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

interface RequisitionFormProps {
  users: UserOption[];
  currentUser: any;
  projects?: ProjectOption[];
  initialProjectId?: string;
  initialType?: string;
  initialBranch?: string;
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

const EQUIPMENT_CONDITION_OPTIONS = [
  'สมบูรณ์พร้อมใช้งาน',
  'มีรอยขีดข่วนทั่วไป',
  'อุปกรณ์เสริมครบกล่อง',
  'ต้องระมัดระวังพิเศษ',
];

const EQUIPMENT_UNITS = ['เครื่อง', 'ตัว', 'ชุด', 'กล่อง', 'อัน', 'ปาก', 'ชิ้น'];
const MATERIAL_UNITS = ['เมตร', 'ม้วน', 'เส้น', 'EA', 'กล่อง', 'ถุง', 'ชุด', 'ท่อน'];

export default function RequisitionForm({
  users,
  currentUser,
  projects = [],
  initialProjectId,
  initialType = 'PROJECT',
  initialBranch = 'BKK-HQ',
}: RequisitionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const sigPad = useRef<any>(null);
  const [signatureFileUrl, setSignatureFileUrl] = useState<string | null>(null);

  // 1. Requisition Type
  const [requisitionType, setRequisitionType] = useState<'PROJECT' | 'BORROW_EQUIPMENT'>(
    initialType === 'BORROW_EQUIPMENT' ? 'BORROW_EQUIPMENT' : 'PROJECT'
  );

  // Shared Common Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [company, setCompany] = useState('Group'); // Group, Electric, Power
  const [branch, setBranch] = useState(initialBranch || 'BKK-HQ');

  // Approver Selection
  const [approverId, setApproverId] = useState('');
  const [approverSearch, setApproverSearch] = useState('');
  const [isApproverOpen, setIsApproverOpen] = useState(false);
  const approverRef = useRef<HTMLDivElement>(null);

  // 2. Specific Fields for "PROJECT"
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '');
  const [projectName, setProjectName] = useState<string>('');
  const [destinationSite, setDestinationSite] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  // 3. Specific Fields for "BORROW_EQUIPMENT"
  const [borrowPurpose, setBorrowPurpose] = useState<string>('');
  const [usageLocation, setUsageLocation] = useState<string>('');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [relatedProjectId, setRelatedProjectId] = useState<string>(initialProjectId || '');
  const [relatedProjectName, setRelatedProjectName] = useState<string>('');
  const [relatedProjectSearch, setRelatedProjectSearch] = useState('');
  const [isRelatedProjectOpen, setIsRelatedProjectOpen] = useState(false);
  const relatedProjectRef = useRef<HTMLDivElement>(null);

  // 4. Items State (Dynamic based on type)
  const [projectItems, setProjectItems] = useState([
    { detail: '', quantity: 1, unit: 'เมตร', job: '', remark: '' }
  ]);

  const [equipmentItems, setEquipmentItems] = useState([
    { detail: '', assetCode: '', quantity: 1, unit: 'เครื่อง', condition: 'สมบูรณ์พร้อมใช้งาน', remark: '' }
  ]);

  // Handle Initial Project prefill
  useEffect(() => {
    if (initialProjectId && projects.length > 0) {
      const p = projects.find(item => item.id === initialProjectId);
      if (p) {
        setSelectedProjectId(p.id);
        const name = `${p.projectNumber ? p.projectNumber + ' - ' : ''}${p.name}`;
        setProjectName(name);
        setProjectSearch(name);
        setRelatedProjectId(p.id);
        setRelatedProjectName(name);
        setRelatedProjectSearch(name);
        if (p.siteAddress) {
          setDestinationSite(p.siteAddress);
          setUsageLocation(p.siteAddress);
        }
      }
    }
  }, [initialProjectId, projects]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (approverRef.current && !approverRef.current.contains(event.target as Node)) {
        setIsApproverOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (relatedProjectRef.current && !relatedProjectRef.current.contains(event.target as Node)) {
        setIsRelatedProjectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredApprovers = users.filter(u =>
    u.fullName.toLowerCase().includes(approverSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    (p.name && p.name.toLowerCase().includes(projectSearch.toLowerCase())) ||
    (p.projectNumber && p.projectNumber.toLowerCase().includes(projectSearch.toLowerCase())) ||
    (p.clientName && p.clientName.toLowerCase().includes(projectSearch.toLowerCase())) ||
    (p.province && p.province.toLowerCase().includes(projectSearch.toLowerCase()))
  );

  const filteredRelatedProjects = projects.filter(p =>
    (p.name && p.name.toLowerCase().includes(relatedProjectSearch.toLowerCase())) ||
    (p.projectNumber && p.projectNumber.toLowerCase().includes(relatedProjectSearch.toLowerCase())) ||
    (p.clientName && p.clientName.toLowerCase().includes(relatedProjectSearch.toLowerCase()))
  );

  const handleSelectProject = (p: ProjectOption) => {
    setSelectedProjectId(p.id);
    const fullName = `${p.projectNumber ? p.projectNumber + ' - ' : ''}${p.name}`;
    setProjectName(fullName);
    setProjectSearch(fullName);
    if (p.siteAddress) {
      setDestinationSite(p.siteAddress);
    }
    setIsProjectDropdownOpen(false);

    // Auto-update empty projectItems' job field
    setProjectItems(prev => prev.map(item => ({
      ...item,
      job: item.job ? item.job : fullName,
    })));
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

  // ── Project Items Methods ──
  const addProjectItem = () => {
    setProjectItems([...projectItems, { detail: '', quantity: 1, unit: 'เมตร', job: projectName || '', remark: '' }]);
  };

  const removeProjectItem = (index: number) => {
    if (projectItems.length > 1) {
      setProjectItems(projectItems.filter((_, i) => i !== index));
    }
  };

  const updateProjectItem = (index: number, field: string, value: any) => {
    const newItems = [...projectItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setProjectItems(newItems);
  };

  // ── Equipment Items Methods ──
  const addEquipmentItem = () => {
    setEquipmentItems([
      ...equipmentItems,
      { detail: '', assetCode: '', quantity: 1, unit: 'เครื่อง', condition: 'สมบูรณ์พร้อมใช้งาน', remark: '' }
    ]);
  };

  const removeEquipmentItem = (index: number) => {
    if (equipmentItems.length > 1) {
      setEquipmentItems(equipmentItems.filter((_, i) => i !== index));
    }
  };

  const updateEquipmentItem = (index: number, field: string, value: any) => {
    const newItems = [...equipmentItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEquipmentItems(newItems);
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
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!data || data.length === 0) {
          Swal.fire({ icon: 'warning', title: 'ไม่พบข้อมูลในไฟล์ Excel' });
          return;
        }

        let foundCompany = 'Group';
        let foundDeliveryDateText = '';
        let detectedProjectName = '';
        const parsedItems: Array<{ detail: string; quantity: number; unit: string; job: string; remark: string }> = [];

        // Check rows 0..3 for metadata
        for (let r = 0; r < Math.min(4, data.length); r++) {
          const row = data[r] || [];
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim();
            if (val.includes('เดินทางวันที่')) {
              foundDeliveryDateText = val;
            }
          }
        }

        // Check company tick on row 2
        if (data[2]) {
          const r2 = data[2];
          if (r2[3] === '/' || r2[3] === '✓') foundCompany = 'Group';
          else if (r2[4] === '/' || r2[4] === '✓') foundCompany = 'Electric';
          else if (r2[5] === '/' || r2[5] === '✓') foundCompany = 'Power';
        }

        // Find items start row
        let startRow = 4;
        for (let r = 0; r < Math.min(10, data.length); r++) {
          const row = data[r] || [];
          if (row.some(cell => String(cell).includes('รายการเบิก') || String(cell).includes('ลำดับ'))) {
            startRow = r + 1;
            break;
          }
        }

        for (let r = startRow; r < data.length; r++) {
          const row = data[r] || [];
          const detail = row[1] !== undefined ? String(row[1]).trim() : '';

          if (!detail || detail.startsWith('...') || detail.includes('ผู้ขอเบิก') || detail.includes('ผู้รับของ') || detail.includes('ผู้อนุมัติ')) {
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
            remark
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
            text: `ดึงข้อมูลจากชีต "${firstSheetName}" เข้าสู่ตารางวัสดุโครงการเรียบร้อยแล้ว`,
            timer: 2500,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: 'info',
            title: 'ไม่พบรายการอุปกรณ์ในไฟล์',
            text: 'โปรดตรวจสอบว่ารูปแบบคอลัมน์ตรงกับแบบฟอร์มเบิกของโครงการ'
          });
        }
      } catch (err: any) {
        console.error("Excel import error:", err);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการอ่านไฟล์',
          text: err.message || 'ไม่สามารถเปิดอ่านไฟล์ Excel ได้'
        });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Form Submission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation for Project Material Issue
    if (requisitionType === 'PROJECT') {
      if (projectItems.some(i => !i.detail.trim())) {
        Swal.fire({ icon: 'warning', title: 'กรุณากรอกรายละเอียดรายการวัสดุให้ครบถ้วน' });
        return;
      }
      if (!projectName.trim() && !destinationSite.trim()) {
        Swal.fire({ icon: 'warning', title: 'กรุณาระบุโครงการ หรือไซต์งานติดตั้งหน้างาน' });
        return;
      }
    }

    // 2. Validation for Equipment Borrowing
    if (requisitionType === 'BORROW_EQUIPMENT') {
      if (equipmentItems.some(i => !i.detail.trim())) {
        Swal.fire({ icon: 'warning', title: 'กรุณากรอกชื่อเครื่องมือ/อุปกรณ์ที่ขอยืมให้ครบถ้วน' });
        return;
      }
      if (!borrowPurpose.trim()) {
        Swal.fire({ icon: 'warning', title: 'กรุณาระบุวัตถุประสงค์ในการยืมเครื่องมือ' });
        return;
      }
      if (!usageLocation.trim()) {
        Swal.fire({ icon: 'warning', title: 'กรุณาระบุสถานที่นำเครื่องมือไปใช้งาน' });
        return;
      }
    }

    if (!approverId) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้อนุมัติ' });
      return;
    }

    if (!signatureFileUrl && sigPad.current?.isEmpty()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาลงลายมือชื่อผู้ขอเบิก หรืออัปโหลดไฟล์ลายเซ็น' });
      return;
    }

    setLoading(true);
    try {
      const signatureDataUrl = signatureFileUrl || sigPad.current.getTrimmedCanvas().toDataURL('image/png');

      const payload = requisitionType === 'PROJECT'
        ? {
            date,
            company,
            items: projectItems,
            approverId,
            requesterSignatureUrl: signatureDataUrl,
            requisitionType: 'PROJECT',
            projectId: selectedProjectId || null,
            projectName: projectName || (projectItems[0]?.job || null),
            branch,
            destinationSite: destinationSite || null,
            deliveryDate: deliveryDate || null,
            deliveryNote: deliveryNote || null,
          }
        : {
            date,
            company,
            items: equipmentItems, // each item has detail, assetCode, quantity, unit, condition, remark
            approverId,
            requesterSignatureUrl: signatureDataUrl,
            requisitionType: 'BORROW_EQUIPMENT',
            projectId: relatedProjectId || null,
            projectName: relatedProjectName || null,
            branch,
            destinationSite: usageLocation, // stores location of use
            deliveryDate: expectedReturnDate || null, // stores expected return date (optional)
            deliveryNote: borrowPurpose, // stores borrow purpose
          };

      const res = await createMaterialRequisition(payload);

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: requisitionType === 'PROJECT' ? 'สร้างใบเบิกของโครงการเรียบร้อยแล้ว' : 'สร้างใบเบิกยืมเครื่องมือเรียบร้อยแล้ว',
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
    } catch (error: any) {
      console.error("Save error:", error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 md:p-8 space-y-8">

      {/* ── 1. Requisition Type Selector (Distinct Choice Cards) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-800">
            เลือกประเภทการเบิก <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-slate-400">
            (ฟอร์มกรอกข้อมูลจะปรับเปลี่ยนอัตโนมัติตามประเภทที่เลือก)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: เบิกของงานโครงการ */}
          <button
            type="button"
            onClick={() => setRequisitionType('PROJECT')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
              requisitionType === 'PROJECT'
                ? 'bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 ${
                requisitionType === 'PROJECT' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-500'
              }`}>
                <Building2 size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-base">
                    เบิกของงานโครงการ
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Project Material Issue
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สำหรับเบิกใช้วัสดุและอุปกรณ์ติดตั้งเข้าโครงการจริง เช่น สายไฟ, ท่อ, น็อต, ข้อต่อ (ตัดยอดเข้าต้นทุนโครงการ <strong>ไม่มีการส่งคืน</strong>)
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-100/60 flex items-center justify-between text-xs text-blue-700 font-semibold">
              <span className="inline-flex items-center gap-1">
                <FileSpreadsheet size={13} /> รองรับการ Import ไฟล์ Excel โครงการ
              </span>
              {requisitionType === 'PROJECT' && (
                <span className="inline-flex items-center gap-1 text-blue-700 font-bold bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                  <Check size={12} strokeWidth={3} /> กำลังเลือก
                </span>
              )}
            </div>
          </button>

          {/* Option 2: เบิกยืมเครื่องมือ/อุปกรณ์ */}
          <button
            type="button"
            onClick={() => setRequisitionType('BORROW_EQUIPMENT')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
              requisitionType === 'BORROW_EQUIPMENT'
                ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 ${
                requisitionType === 'BORROW_EQUIPMENT' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'bg-slate-100 text-slate-500'
              }`}>
                <Wrench size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-base">
                    เบิกยืมสโตร์ (เครื่องมือ/อุปกรณ์)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    Store Borrowing
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  สำหรับยืมเครื่องมือช่าง หรืออุปกรณ์ทดสอบส่วนกลางไปใช้งานชั่วคราว เช่น สว่าน, ตู้เชื่อม, เครื่องวัด (นำมาส่งคืนสโตร์เมื่อใช้งานเสร็จ)
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100/60 flex items-center justify-between text-xs text-amber-800 font-semibold">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> กำหนดส่งคืน (ถ้ามี) + ตรวจสภาพตอนคืน
              </span>
              {requisitionType === 'BORROW_EQUIPMENT' && (
                <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                  <Check size={12} strokeWidth={3} /> กำลังเลือก
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ── 2. CONDITIONAL SECTION: FORM DETAILS ── */}

      {/* CASE A: FOR PROJECT MATERIAL ISSUE */}
      {requisitionType === 'PROJECT' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-bold block text-blue-950">
                ข้อมูลงานโครงการและการจัดส่งวัสดุ (Project & Delivery Information)
              </strong>
              <p className="text-blue-800 mt-0.5">
                ระบุโครงการ ไซต์งานติดตั้ง และกำหนดวันที่ต้องการให้วัสดุส่งถึงหน้างาน เพื่อให้สโตร์จัดเตรียมและส่งมอบวัสดุเข้าโครงการ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สาขา / คลังสินค้าผู้จัดส่ง <span className="text-red-500">*</span>
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm font-semibold text-slate-800"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selector with Autocomplete */}
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
                  placeholder="พิมพ์ค้นหาโครงการ หรือระบุชื่องานติดตั้ง..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                  required
                />
                {projectSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectSearch('');
                      setProjectName('');
                      setSelectedProjectId('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Dropdown Options */}
              {isProjectDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        className="px-4 py-2.5 hover:bg-blue-50/60 cursor-pointer text-xs transition-colors"
                        onClick={() => handleSelectProject(p)}
                      >
                        <div className="font-bold text-slate-800">
                          {p.projectNumber ? `${p.projectNumber} - ` : ''}{p.name}
                        </div>
                        {(p.clientName || p.province) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {p.clientName ? `ลูกค้า: ${p.clientName}` : ''} {p.province ? `• ${p.province}` : ''}
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

            {/* Destination Site / Installation Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สถานที่จัดส่ง / ไซต์งานติดตั้ง (Site Address) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={destinationSite}
                onChange={(e) => setDestinationSite(e.target.value)}
                placeholder="เช่น โรงงานนิชชินโบ Zone C อ.บางปะอิน จ.อยุธยา"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                required
              />
            </div>

            {/* Delivery Date / Travel Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                วันเดินทาง / กำหนดของถึงหน้างาน (Delivery Date)
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
              />
            </div>

            {/* Delivery Note & Transport Method */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                วิธีการจัดส่ง & ข้อมูลผู้รับของหน้างาน (Transport / Delivery Note)
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="เช่น รถสโตร์นำส่งหน้างาน / ช่างเบิกใส่รถไปเอง / ผู้รับของ: ช่างสมคิด โทร 081-xxx-xxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* CASE B: FOR EQUIPMENT BORROWING */}
      {requisitionType === 'BORROW_EQUIPMENT' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
            <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-bold block text-amber-950">
                ข้อมูลการเบิกยืมเครื่องมือ/อุปกรณ์ (Equipment Borrowing Information)
              </strong>
              <p className="text-amber-900 mt-0.5">
                ระบุวัตถุประสงค์ในการยืม สถานที่นำไปใช้งาน และกำหนดวันที่ส่งคืนสโตร์ (ถ้ามี)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Branch / Warehouse */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สาขา / คลังสินค้าที่ขอยืม <span className="text-red-500">*</span>
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm font-semibold text-slate-800"
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Return Date (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>กำหนดวันที่ต้องส่งคืนสโตร์ (Expected Return Date)</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (ไม่จำเป็นต้องระบุ)
                </span>
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm bg-white text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                หากยังไม่แน่ใจวันส่งคืน สามารถเว้นว่างไว้ได้ หรือกดแจ้งขอส่งคืนผ่านระบบเมื่อเสร็จงาน
              </p>
            </div>

            {/* Borrow Purpose (Required) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                วัตถุประสงค์ในการยืมเครื่องมือ (Borrow Purpose) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={borrowPurpose}
                onChange={(e) => setBorrowPurpose(e.target.value)}
                placeholder="เช่น นำไปตรวจเช็คและทดสอบระบบไฟฟ้าหน้างาน หรือระบุวัตถุประสงค์..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                required
              />

              {/* Quick Purpose Suggestion Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 font-medium mr-1">เลือกด่วน:</span>
                {BORROW_PURPOSE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setBorrowPurpose(tag)}
                    className="px-2.5 py-0.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 rounded-lg text-[11px] font-medium transition-colors border border-slate-200"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage Location (Required) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สถานที่นำเครื่องมือไปใช้งาน (Usage Location) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={usageLocation}
                onChange={(e) => setUsageLocation(e.target.value)}
                placeholder="เช่น ไซต์งานนิชชินโบ, แผนก Service, Workshop สาขา..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                required
              />
            </div>

            {/* Optional Related Project */}
            <div ref={relatedProjectRef} className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>โครงการที่เกี่ยวข้อง (Related Project)</span>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                />
                {relatedProjectSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setRelatedProjectSearch('');
                      setRelatedProjectName('');
                      setRelatedProjectId('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {isRelatedProjectOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredRelatedProjects.length > 0 ? (
                    filteredRelatedProjects.map((p) => (
                      <div
                        key={p.id}
                        className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-xs"
                        onClick={() => handleSelectRelatedProject(p)}
                      >
                        <div className="font-bold text-slate-800">{p.name}</div>
                        {p.clientName && <div className="text-[10px] text-slate-500">{p.clientName}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2.5 text-xs text-slate-400">ไม่พบโครงการ</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. COMMON: DATE & COMPANY ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {requisitionType === 'BORROW_EQUIPMENT' ? 'วันที่เริ่มยืม (Borrow Date)' : 'วันที่ทำรายการเบิก (Date)'}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none text-xs sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">สังกัดบริษัท (Company)</label>
          <div className="flex items-center gap-5 mt-2.5">
            {['Group', 'Electric', 'Power'].map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-slate-700">
                <input
                  type="radio"
                  name="company"
                  value={c}
                  checked={company === c}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. CONDITIONAL ITEMS TABLE ── */}

      {/* TABLE A: PROJECT MATERIAL ITEMS */}
      {requisitionType === 'PROJECT' && (
        <div className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-900">
                รายการวัสดุ/อุปกรณ์โครงการ ({projectItems.length} รายการ)
              </label>
              <p className="text-xs text-slate-500">
                กรอกรายการวัสดุ หรือกดปุ่มนำเข้าจากไฟล์ Excel ของโครงการ
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Excel Import Button (Active only in PROJECT mode) */}
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-300 shadow-xs">
                <FileSpreadsheet size={15} />
                <span>นำเข้าจากไฟล์ Excel (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleExcelImport}
                />
              </label>

              {/* Add Material Item Button */}
              <button
                type="button"
                onClick={addProjectItem}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Plus size={15} /> <span>เพิ่มรายการวัสดุ</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-700 font-bold">
                  <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3">รายการวัสดุ / อุปกรณ์</th>
                  <th className="px-3 py-3 w-28 text-center">จำนวน</th>
                  <th className="px-3 py-3 w-28 text-center">หน่วย</th>
                  <th className="px-4 py-3 w-44">งานที่ใช้ / Sub-Job</th>
                  <th className="px-4 py-3 w-40">หมายเหตุ</th>
                  <th className="px-2 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {projectItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.detail}
                        onChange={(e) => updateProjectItem(index, 'detail', e.target.value)}
                        placeholder="เช่น สายไฟ VCT-G 3C x 6, Cable gland M32, ท่อ PVC..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateProjectItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm text-center font-bold text-slate-800"
                        required
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        list="material-units"
                        value={item.unit}
                        onChange={(e) => updateProjectItem(index, 'unit', e.target.value)}
                        placeholder="หน่วย..."
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm text-center"
                        required
                      />
                      <datalist id="material-units">
                        {MATERIAL_UNITS.map(u => <option key={u} value={u} />)}
                      </datalist>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.job}
                        onChange={(e) => updateProjectItem(index, 'job', e.target.value)}
                        placeholder="เช่น งานติดตั้ง Zone C..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) => updateProjectItem(index, 'remark', e.target.value)}
                        placeholder="หมายเหตุ..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs sm:text-sm"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeProjectItem(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                        disabled={projectItems.length === 1}
                        title="ลบรายการ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <Info size={14} className="text-blue-600 shrink-0" />
            <span>วัสดุอุปกรณ์รายการนี้จะถูกตัดยอดเข้าต้นทุนโครงการจริง ไม่ต้องนำส่งคืนสโตร์</span>
          </div>
        </div>
      )}

      {/* TABLE B: EQUIPMENT BORROW ITEMS */}
      {requisitionType === 'BORROW_EQUIPMENT' && (
        <div className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-900">
                รายการเครื่องมือและอุปกรณ์ที่ขอยืม ({equipmentItems.length} รายการ)
              </label>
              <p className="text-xs text-slate-500">
                ระบุชื่อเครื่องมือ รหัสทรัพย์สิน (ถ้ามี) จำนวน และสภาพของเครื่องมือก่อนนำออกจากสโตร์
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Add Tool Button */}
              <button
                type="button"
                onClick={addEquipmentItem}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Plus size={15} /> <span>เพิ่มเครื่องมือที่ยืม</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-amber-200/80 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-200 text-xs text-amber-950 font-bold">
                  <th className="px-3 py-3 w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3">ชื่อเครื่องมือ / รายการอุปกรณ์</th>
                  <th className="px-3 py-3 w-32">รหัส / Serial No.</th>
                  <th className="px-3 py-3 w-24 text-center">จำนวน</th>
                  <th className="px-3 py-3 w-28 text-center">หน่วย</th>
                  <th className="px-3 py-3 w-44">สภาพก่อนยืม</th>
                  <th className="px-4 py-3 w-40">อุปกรณ์เสริม / หมายเหตุ</th>
                  <th className="px-2 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {equipmentItems.map((item, index) => (
                  <tr key={index} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.detail}
                        onChange={(e) => updateEquipmentItem(index, 'detail', e.target.value)}
                        placeholder="เช่น สว่านกระแทกไร้สาย 18V, ตู้เชื่อม, Clamp Meter Fluke..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm font-medium"
                        required
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.assetCode}
                        onChange={(e) => updateEquipmentItem(index, 'assetCode', e.target.value)}
                        placeholder="เช่น TL-012..."
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateEquipmentItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm text-center font-bold text-slate-800"
                        required
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        list="equipment-units"
                        value={item.unit}
                        onChange={(e) => updateEquipmentItem(index, 'unit', e.target.value)}
                        placeholder="หน่วย..."
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm text-center"
                        required
                      />
                      <datalist id="equipment-units">
                        {EQUIPMENT_UNITS.map(u => <option key={u} value={u} />)}
                      </datalist>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={item.condition}
                        onChange={(e) => updateEquipmentItem(index, 'condition', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs bg-white"
                      >
                        {EQUIPMENT_CONDITION_OPTIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) => updateEquipmentItem(index, 'remark', e.target.value)}
                        placeholder="เช่น แบต 2 ก้อน + สายชาร์จ..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs sm:text-sm"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeEquipmentItem(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                        disabled={equipmentItems.length === 1}
                        title="ลบรายการ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <ShieldAlert size={15} className="text-amber-600 shrink-0" />
            <span>เครื่องมือและอุปกรณ์ทั้งหมดเป็นทรัพย์สินส่วนกลาง กรุณาดูแลรักษาให้อยู่ในสภาพพร้อมใช้งาน และนำส่งคืนตามกำหนดเวลา</span>
          </div>
        </div>
      )}

      {/* ── 5. APPROVER SELECTION ── */}
      <div className="pt-4 border-t border-slate-100">
        <div className="max-w-md" ref={approverRef}>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {requisitionType === 'BORROW_EQUIPMENT' ? 'ผู้อนุมัติการยืมเครื่องมือ (Approver)' : 'ผู้อนุมัติโครงการ (Project Approver)'}{' '}
            <span className="text-red-500">*</span>
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-xs sm:text-sm"
              required={!approverId}
            />
            {isApproverOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filteredApprovers.length > 0 ? (
                  filteredApprovers.map(u => (
                    <div
                      key={u.id}
                      className="px-4 py-2.5 cursor-pointer hover:bg-slate-50 text-slate-700 text-xs sm:text-sm flex items-center justify-between"
                      onClick={() => {
                        setApproverId(u.id);
                        setApproverSearch(u.fullName);
                        setIsApproverOpen(false);
                      }}
                    >
                      <span className="font-semibold">{u.fullName}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2.5 text-slate-400 text-xs">ไม่พบรายชื่อผู้อนุมัติ</div>
                )}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ระบบจะส่ง Web Push Notification และข้อความแจ้งเตือนไปยังผู้อนุมัติโดยอัตโนมัติ
          </p>
        </div>
      </div>

      {/* ── 6. SIGNATURE SECTION ── */}
      <div className="pt-4 border-t border-slate-100 flex flex-col items-center">
        <label className="block text-xs font-bold text-slate-700 mb-2.5 text-center">
          ลายมือชื่อผู้ขอเบิก (Requester Signature) <span className="text-red-500">*</span>
        </label>
        
        {signatureFileUrl ? (
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 flex items-center justify-center p-2 w-full max-w-[400px] h-[150px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureFileUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={() => setSignatureFileUrl(null)}
              className="absolute top-2 right-2 p-1.5 bg-white shadow-xs border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
              title="ลบไฟล์"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50 relative group shadow-xs">
            <SignatureCanvas
              ref={sigPad}
              canvasProps={{
                className: 'w-full max-w-[400px] h-[150px] cursor-crosshair'
              }}
            />
            <button
              type="button"
              onClick={clearSignature}
              className="absolute top-2 right-2 p-1.5 bg-white shadow-xs border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
              title="ลบลายเซ็น"
            >
              <Eraser size={15} />
            </button>
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <label className="cursor-pointer text-xs text-red-600 hover:text-red-700 font-bold underline">
            หรืออัปโหลดไฟล์รูปลายเซ็น
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="mt-2.5 text-center">
          <p className="text-slate-900 font-bold text-xs sm:text-sm">({currentUser?.fullName || 'ผู้ขอเบิก'})</p>
          <p className="text-slate-400 text-[11px]">ผู้ขอเบิก</p>
        </div>
      </div>

      {/* ── 7. SUBMIT BUTTONS ── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors text-xs sm:text-sm"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold transition-all shadow-md text-xs sm:text-sm disabled:opacity-50 text-white ${
            requisitionType === 'BORROW_EQUIPMENT'
              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
          }`}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          <span>
            {loading
              ? 'กำลังบันทึก...'
              : requisitionType === 'BORROW_EQUIPMENT'
              ? 'บันทึกและขออนุมัติเบิกยืมเครื่องมือ'
              : 'บันทึกและขออนุมัติเบิกของโครงการ'}
          </span>
        </button>
      </div>

    </form>
  );
}
