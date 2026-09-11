"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Clock,
  Zap,
  Flame,
  Calendar,
  Building2,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  Send,
  Loader2,
  X,
  Search,
  Check,
  Palette,
  Info,
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  HelpCircle,
  Factory,
  Laptop,
  TrendingUp,
  UserCheck,
  Code2,
  Lightbulb,
  Rocket,
  Wrench,
  Calculator,
  BadgeDollarSign,
  Megaphone,
  Headphones,
  Package,
  FlaskConical,
  Users,
  LifeBuoy,
  Radio,
  ExternalLink,
  Database,
} from 'lucide-react';
import { getBDWorkTypes, createBDProject, getParentBDProjects } from '@/app/actions/bd';

interface Props {
  currentUser?: {
    id: string;
    fullName: string;
    employeeId?: string;
    role?: string;
  } | null;
}

const PRESET_COLORS = [
  { label: 'แดงแบรนด์', value: '#ff2301', bgClass: 'bg-[#ff2301]' },
  { label: 'น้ำเงิน', value: '#3b82f6', bgClass: 'bg-blue-500' },
  { label: 'เขียวมรกต', value: '#10b981', bgClass: 'bg-emerald-500' },
  { label: 'ม่วง', value: '#8b5cf6', bgClass: 'bg-purple-500' },
  { label: 'ส้มอำพัน', value: '#f59e0b', bgClass: 'bg-amber-500' },
  { label: 'คราม', value: '#6366f1', bgClass: 'bg-indigo-500' },
  { label: 'ฟ้าไซแอน', value: '#06b6d4', bgClass: 'bg-cyan-500' },
];

function getWorkTypeIcon(name: string = '') {
  const lower = name.toLowerCase().trim();
  const cls = "w-3.5 h-3.5 shrink-0";

  // 1. Marketing / MKT
  if (lower.includes('mkt') || lower.includes('market') || lower.includes('การตลาด')) {
    return <Megaphone className={`${cls} text-rose-500`} />;
  }
  // 2. Dev / Software / Systems (must precede EV so 'dev' does not match 'ev')
  if (lower.includes('dev') || lower.includes('soft') || lower.includes(' it') || lower.startsWith('it') || lower.includes('ระบบ') || lower.includes('code') || lower.includes('แอป')) {
    return <Code2 className={`${cls} text-indigo-600`} />;
  }
  // 3. EV Charging
  if (lower === 'ev' || lower.startsWith('ev ') || lower.endsWith(' ev') || lower.includes(' ev ') || lower.includes('ชาร์จ') || lower.includes('station')) {
    return <Zap className={`${cls} text-emerald-500`} />;
  }
  // 4. Accounting / Finance
  if (lower.includes('บัญชี') || lower.includes('account') || lower.includes('finance') || lower.includes('การเงิน')) {
    return <Calculator className={`${cls} text-emerald-600`} />;
  }
  // 5. Sales
  if (lower.includes('sale') || lower.includes('ขาย')) {
    return <BadgeDollarSign className={`${cls} text-blue-600`} />;
  }
  // 6. Service
  if (lower.includes('service') || lower.includes('บริการ') || lower.includes('ซ่อม')) {
    return <Headphones className={`${cls} text-cyan-600`} />;
  }
  // 7. Store / Inventory
  if (lower.includes('store') || lower.includes('สต็อก') || lower.includes('stock')) {
    return <Package className={`${cls} text-amber-600`} />;
  }
  // 8. R&D / Engineering
  if (lower.includes('r&d') || lower.includes('rnd') || lower.includes('วิศวกรรม') || lower.includes('engineer')) {
    return <FlaskConical className={`${cls} text-violet-600`} />;
  }
  // 9. HR
  if (lower.includes('hr') || lower.includes('บุคคล') || lower.includes('สรรหา')) {
    return <Users className={`${cls} text-pink-500`} />;
  }
  // 10. Database
  if (lower.includes('data') || lower.includes('ฐานข้อมูล') || lower.includes('db')) {
    return <Database className={`${cls} text-purple-600`} />;
  }
  // 11. External / Outsource
  if (lower.includes('outsource') || lower.includes('ภายนอก') || lower.includes('external')) {
    return <ExternalLink className={`${cls} text-orange-500`} />;
  }
  // 12. Branch
  if (lower.includes('branch') || lower.includes('สาขา')) {
    return <Building2 className={`${cls} text-blue-600`} />;
  }
  // 13. Factory / Warehouse
  if (lower.includes('factory') || lower.includes('โรงงาน') || lower.includes('คลัง')) {
    return <Factory className={`${cls} text-indigo-600`} />;
  }
  // 14. Opportunity / โอกาส
  if (lower.includes('โอกาส') || lower.includes('opportunity')) {
    return <Lightbulb className={`${cls} text-amber-500`} />;
  }
  // 15. Expansion / ขยายธุรกิจ
  if (lower.includes('ขยายธุรกิจ') || lower.includes('expansion')) {
    return <Rocket className={`${cls} text-sky-500`} />;
  }
  // 16. Research / หาข้อมูล
  if (lower.includes('หาข้อมูล') || lower.includes('research') || lower.includes('สำรวจ')) {
    return <Search className={`${cls} text-teal-600`} />;
  }
  // 17. Internal Development / พัฒนาภายใน
  if (lower.includes('พัฒนาภายใน') || lower.includes('internal')) {
    return <Wrench className={`${cls} text-emerald-600`} />;
  }
  // 18. Kaizen
  if (lower.includes('kaizen') || lower.includes('ปรับปรุง') || lower.includes('พัฒนา')) {
    return <TrendingUp className={`${cls} text-teal-600`} />;
  }
  // 19. RFID
  if (lower.includes('rfid')) {
    return <Radio className={`${cls} text-cyan-500`} />;
  }
  // 20. Project / โครงการ
  if (lower.includes('project') || lower.includes('โครงการ')) {
    return <FolderTree className={`${cls} text-slate-600`} />;
  }
  // 21. Cross / ทุกฝ่าย / Support
  if (lower.includes('ทุกฝ่าย') || lower.includes('support') || lower.includes('help')) {
    return <LifeBuoy className={`${cls} text-blue-600`} />;
  }

  return <Briefcase className={`${cls} text-slate-500`} />;
}

export default function IntakeClientPage({ currentUser }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParentId = searchParams.get('parentId') || '';

  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [parentProjects, setParentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    workTypeId: '',
    customWorkType: '',
    urgency: 'Normal',
    deadline: '',
    intakeDate: new Date().toISOString().split('T')[0],
    parentId: initialParentId,
    color: '#ff2301',
  });

  const [error, setError] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const parentDropdownRef = useRef<HTMLDivElement>(null);

  // Close parent dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(event.target as Node)) {
        setParentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Work Types and Parent Projects
  useEffect(() => {
    async function loadData() {
      try {
        const [workTypesRes, parentsRes] = await Promise.all([
          getBDWorkTypes(),
          getParentBDProjects(),
        ]);

        if (workTypesRes.success && workTypesRes.data) {
          setWorkTypes(workTypesRes.data);
          if (workTypesRes.data.length > 0 && !formData.workTypeId) {
            setFormData(prev => ({ ...prev, workTypeId: workTypesRes.data[0].id }));
          }
        }

        if (parentsRes.success && parentsRes.data) {
          setParentProjects(parentsRes.data);
        }
      } catch (err) {
        console.error('Error loading intake data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Preset Date Handlers
  const setQuickDeadline = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setFormData(prev => ({ ...prev, deadline: target.toISOString().split('T')[0] }));
  };

  const setEndOfMonthDeadline = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFormData(prev => ({ ...prev, deadline: endOfMonth.toISOString().split('T')[0] }));
  };

  const clearDeadline = () => {
    setFormData(prev => ({ ...prev, deadline: '' }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.objective.trim() || !formData.workTypeId) {
      setError('กรุณากรอกชื่อโครงการ วัตถุประสงค์ และเลือกประเภทงานให้ครบถ้วน');
      return;
    }

    if (formData.workTypeId === 'OTHER' && !formData.customWorkType.trim()) {
      setError('กรุณาระบุประเภทงานเพิ่มเติม');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await createBDProject({
        name: formData.name.trim(),
        objective: formData.objective.trim(),
        workTypeId: formData.workTypeId,
        customWorkType: formData.customWorkType.trim() || undefined,
        urgency: formData.urgency,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        intakeDate: formData.intakeDate ? new Date(formData.intakeDate) : undefined,
        parentId: formData.parentId || undefined,
        color: formData.color || undefined,
      });

      if (res.success) {
        router.push('/bd/dashboard?msg=brief_submitted');
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกคำขอ');
      }
    } catch (err: any) {
      setError(err?.message || 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format deadline preview
  const formatDeadlinePreview = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const due = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const dateFormatted = due.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });

    if (diffDays < 0) {
      return { text: `เกินกำหนด ${Math.abs(diffDays)} วัน (${dateFormatted})`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: `ครบกำหนดวันนี้ (${dateFormatted})`, isDueToday: true };
    }
    return { text: `อีก ${diffDays} วัน (${dateFormatted})`, isNormal: true };
  };

  const deadlineInfo = formatDeadlinePreview(formData.deadline);
  const selectedWorkType = workTypes.find(wt => wt.id === formData.workTypeId);
  const selectedParent = parentProjects.find(p => p.id === formData.parentId);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#ff2301] animate-spin" />
        <p className="text-sm font-medium text-slate-500">กำลังเตรียมแบบฟอร์ม BD Intake...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-900">
      {/* Top Header & Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <Link href="/bd/dashboard" className="hover:text-[#ff2301] transition-colors flex items-center gap-1">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  แดชบอร์ด BD
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-semibold">แบบฟอร์มแจ้งเปิดงานโครงการ (BD Intake)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] border border-red-100 flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    แจ้งเปิดงานพัฒนาธุรกิจ
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
                      BD Intake Brief
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    กรอกข้อมูลข้อกำหนด วัตถุประสงค์ และเป้าหมายเพื่อเสนอเปิดโครงการพัฒนาธุรกิจใหม่
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation Group */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="inline-flex bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
                <Link
                  href="/bd/dashboard"
                  className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-slate-900 transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                  แดชบอร์ด
                </Link>
                <Link
                  href="/bd/my-work"
                  className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-slate-900 transition-all flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  งานของฉัน
                </Link>
                <Link
                  href="/bd/kanban"
                  className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-slate-900 transition-all flex items-center gap-1.5"
                >
                  <KanbanSquare className="w-3.5 h-3.5 text-slate-500" />
                  กระดานงาน
                </Link>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: 2-Column Split Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-xl text-sm flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-rose-400 hover:text-rose-700 p-0.5 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Fields (7 cols on lg, 8 cols on xl) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Section 1: ข้อมูลโครงการ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">ข้อมูลโครงการ (Project Information)</h2>
                  <p className="text-xs text-slate-500">ระบุชื่อและวัตถุประสงค์หลักของงานที่ต้องการเปิด</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                      ชื่อโครงการ / คำร้องขอ <span className="text-[#ff2301]">*</span>
                    </label>
                    <span className="text-xs text-slate-400">
                      {formData.name.length > 0 ? `${formData.name.length} ตัวอักษร` : 'ระบุให้กระชับและชัดเจน'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น ขยายสถานีชาร์จ EV สาขาพัทยาเหนือ, ติดตั้งระบบคลังสินค้าอัตโนมัติ"
                    className="w-full text-sm sm:text-base border border-slate-200 rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none transition-all shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                      วัตถุประสงค์ & รายละเอียดงาน <span className="text-[#ff2301]">*</span>
                    </label>
                    <span className="text-xs text-slate-400">ผลลัพธ์และขอบเขตงานที่คาดหวัง</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={formData.objective}
                    onChange={e => setFormData({ ...formData, objective: e.target.value })}
                    placeholder="อธิบายสิ่งที่ต้องการให้ดำเนินการ เหตุผลความจำเป็น และเป้าหมายที่คาดว่าจะได้รับ..."
                    className="w-full text-sm border border-slate-200 rounded-xl p-4 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none transition-all resize-y shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: การจำแนกประเภทงาน */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">ประเภทงาน (Work Type)</h2>
                  <p className="text-xs text-slate-500">เลือกประเภทงานที่ตรงกับโครงการ หรือระบุประเภทงานใหม่</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {workTypes.map(wt => {
                    const isSelected = formData.workTypeId === wt.id;
                    return (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, workTypeId: wt.id })}
                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${isSelected
                          ? 'border-[#ff2301] bg-red-50/50 shadow-xs ring-1 ring-[#ff2301]'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getWorkTypeIcon(wt.name)}
                            <span
                              className={`text-xs sm:text-sm font-semibold truncate ${isSelected ? 'text-[#ff2301]' : 'text-slate-800'
                                }`}
                            >
                              {wt.name}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-[#ff2301] text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {wt.defaultTemplate && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 w-fit">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>มี Workflow สำเร็จรูป</span>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* "อื่นๆ" Option */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, workTypeId: 'OTHER' })}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${formData.workTypeId === 'OTHER'
                      ? 'border-[#ff2301] bg-red-50/50 shadow-xs ring-1 ring-[#ff2301]'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span
                          className={`text-xs sm:text-sm font-semibold ${formData.workTypeId === 'OTHER' ? 'text-[#ff2301]' : 'text-slate-800'
                            }`}
                        >
                          อื่นๆ (กำหนดเอง)
                        </span>
                      </div>
                      {formData.workTypeId === 'OTHER' && (
                        <div className="w-4 h-4 rounded-full bg-[#ff2301] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">ระบุชื่อประเภทงานเฉพาะ</span>
                  </button>
                </div>

                {/* Custom Work Type Input */}
                {formData.workTypeId === 'OTHER' && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      โปรดระบุชื่อประเภทงานใหม่ <span className="text-[#ff2301]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customWorkType}
                      onChange={e => setFormData({ ...formData, customWorkType: e.target.value })}
                      placeholder="เช่น การร่วมทุนทางธุรกิจ (Joint Venture), นวัตกรรมพลังงานใหม่"
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none transition-all shadow-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: ระดับความเร่งด่วน */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shadow-xs">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">ระดับความเร่งด่วน (Urgency Level)</h2>
                  <p className="text-xs text-slate-500">กำหนดลำดับความสำคัญเพื่อให้ทีมบริหารจัดสรรทรัพยากรได้เหมาะสม</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Normal */}
                <div
                  onClick={() => setFormData({ ...formData, urgency: 'Normal' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.urgency === 'Normal'
                    ? 'border-slate-800 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800 hover:bg-slate-50/60'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`w-4 h-4 ${formData.urgency === 'Normal' ? 'text-slate-300' : 'text-slate-500'
                          }`}
                      />
                      <span className="text-sm font-bold">ปกติ (Normal)</span>
                    </div>
                    {formData.urgency === 'Normal' && (
                      <div className="w-4 h-4 rounded-full bg-white text-slate-900 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${formData.urgency === 'Normal' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                  >
                    มีรอบเวลาดำเนินงานตามมาตรฐาน ไม่กระทบไทม์ไลน์วิกฤติ
                  </p>
                </div>

                {/* High */}
                <div
                  onClick={() => setFormData({ ...formData, urgency: 'High' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.urgency === 'High'
                    ? 'border-amber-500 bg-amber-500 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800 hover:bg-slate-50/60'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap
                        className={`w-4 h-4 ${formData.urgency === 'High' ? 'text-amber-100' : 'text-amber-500'
                          }`}
                      />
                      <span className="text-sm font-bold">ด่วน (High)</span>
                    </div>
                    {formData.urgency === 'High' && (
                      <div className="w-4 h-4 rounded-full bg-white text-amber-600 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${formData.urgency === 'High' ? 'text-amber-100' : 'text-slate-500'
                      }`}
                  >
                    ต้องเร่งประสานงานและติดตามสถานะอย่างต่อเนื่อง
                  </p>
                </div>

                {/* Urgent */}
                <div
                  onClick={() => setFormData({ ...formData, urgency: 'Urgent' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${formData.urgency === 'Urgent'
                    ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800 hover:bg-slate-50/60'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Flame
                        className={`w-4 h-4 ${formData.urgency === 'Urgent' ? 'text-rose-100' : 'text-rose-500'
                          }`}
                      />
                      <span className="text-sm font-bold">ด่วนมาก (Urgent)</span>
                    </div>
                    {formData.urgency === 'Urgent' && (
                      <div className="w-4 h-4 rounded-full bg-white text-rose-600 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${formData.urgency === 'Urgent' ? 'text-rose-100' : 'text-slate-500'
                      }`}
                  >
                    โครงการวิกฤติ ต้องเปิดเคสและเริ่มดำเนินงานทันที
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: แผนเวลาและโครงสร้างโครงการ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">แผนเวลา & การเชื่อมโยงโครงการ (Timeline & Hierarchy)</h2>
                  <p className="text-xs text-slate-500">กำหนดวันที่รับงาน กำหนดส่งมอบ และเลือกโครงการแม่หากเป็นงานย่อย</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Intake Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      วันที่เปิดรับเรื่อง (Intake Date)
                    </label>
                    <input
                      type="date"
                      value={formData.intakeDate}
                      onChange={e => setFormData({ ...formData, intakeDate: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none shadow-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">วันที่ส่งข้อมูลคำขอเข้าสู่ระบบ</p>
                  </div>

                  {/* Deadline with Quick Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        กำหนดส่งมอบเป้าหมาย (Deadline)
                      </label>
                      {formData.deadline && (
                        <button
                          type="button"
                          onClick={clearDeadline}
                          className="text-[11px] text-rose-500 hover:text-rose-700 font-medium"
                        >
                          ล้างวันที่
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none shadow-xs"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-400 font-medium">ปุ่มลัด:</span>
                      <button
                        type="button"
                        onClick={() => setQuickDeadline(7)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                      >
                        +7 วัน
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDeadline(14)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                      >
                        +14 วัน
                      </button>
                      <button
                        type="button"
                        onClick={setEndOfMonthDeadline}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                      >
                        สิ้นเดือนนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDeadline(30)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                      >
                        +30 วัน
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parent Project Searchable Combobox */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-slate-500" />
                      ส่วนของโครงการหลัก (Parent Project - ไม่บังคับ)
                    </label>
                    {formData.parentId && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, parentId: '' })}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                      >
                        เปลี่ยนเป็นโครงการเดี่ยว
                      </button>
                    )}
                  </div>

                  <div className="relative" ref={parentDropdownRef}>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="พิมพ์เพื่อค้นหาโครงการหลัก หรือปล่อยว่างหากเป็นโครงการเดี่ยว..."
                        value={
                          parentDropdownOpen
                            ? parentSearch
                            : selectedParent?.name || ''
                        }
                        onChange={e => {
                          setParentSearch(e.target.value);
                          setParentDropdownOpen(true);
                          if (formData.parentId) setFormData({ ...formData, parentId: '' });
                        }}
                        onFocus={() => {
                          setParentDropdownOpen(true);
                          setParentSearch('');
                        }}
                        className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] outline-none shadow-xs"
                      />
                      {(formData.parentId || parentSearch) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, parentId: '' });
                            setParentSearch('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {parentDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                        <div
                          className="px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-500 flex items-center justify-between"
                          onClick={() => {
                            setFormData({ ...formData, parentId: '' });
                            setParentDropdownOpen(false);
                          }}
                        >
                          <span>-- ไม่ใช่โครงการย่อย (เป็นโครงการหลักเดี่ยว) --</span>
                          {!formData.parentId && <Check className="w-3.5 h-3.5 text-[#ff2301]" />}
                        </div>

                        {parentProjects
                          .filter(p =>
                            p.name.toLowerCase().includes(parentSearch.toLowerCase())
                          )
                          .map(p => {
                            const isSelected = formData.parentId === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`px-3.5 py-2.5 hover:bg-red-50/60 cursor-pointer text-xs transition-colors flex items-center justify-between ${isSelected
                                  ? 'bg-red-50 text-[#ff2301] font-semibold'
                                  : 'text-slate-700'
                                  }`}
                                onClick={() => {
                                  setFormData({ ...formData, parentId: p.id });
                                  setParentDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <FolderTree className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{p.name}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#ff2301] shrink-0" />}
                              </div>
                            );
                          })}

                        {parentProjects.filter(p =>
                          p.name.toLowerCase().includes(parentSearch.toLowerCase())
                        ).length === 0 && (
                            <div className="p-4 text-xs text-slate-400 text-center">
                              ไม่พบโครงการหลักที่ตรงกับคำค้นหา
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    หากเลือกโครงการหลัก งานนี้จะถูกผูกเป็น Sub-project ภายใต้โครงการดังกล่าว
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5: สีประจำโครงการ (Color Theme) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shadow-xs">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">ธีมสีประจำโครงการ (Project Theme Color)</h2>
                  <p className="text-xs text-slate-500">เลือกสีสัญลักษณ์เพื่อเน้นการมองเห็นบนแดชบอร์ดและกระดานคัมบัง</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {PRESET_COLORS.map(c => {
                  const isSelected = formData.color === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${isSelected
                        ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${c.bgClass} shadow-xs border border-white/40`}
                      />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Footer Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <p className="text-xs text-slate-400">
                เมื่อกดส่งข้อมูล ระบบจะสร้างโครงการในสถานะ <span className="font-semibold text-amber-600">รอการพิจารณา</span> เพื่อให้ทีม BD ตรวจสอบ
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#ff2301] text-white text-xs font-bold rounded-xl hover:bg-[#e01f01] active:scale-[0.98] transition-all shadow-sm hover:shadow disabled:opacity-60 flex items-center justify-center gap-2 min-w-[140px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      กำลังส่งคำขอ...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      ส่งคำขอ (Submit Brief)
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Right Column: Sticky Live Card Preview & Guide (5 cols on lg, 4 cols on xl) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Live Dashboard Card Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-[#ff2301]" />
                  ตัวอย่างการ์ดบนแดชบอร์ด (Live Preview)
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  อัปเดตแบบเรียลไทม์
                </span>
              </div>

              {/* The Mock Dashboard Card (Styled like /bd/dashboard project cards) */}
              <div
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden"
                style={{ borderTop: `4px solid ${formData.color}` }}
              >
                {/* Header Row: Category & Status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
                    {getWorkTypeIcon(
                      formData.workTypeId === 'OTHER'
                        ? formData.customWorkType || 'อื่นๆ'
                        : selectedWorkType?.name || 'ประเภทงาน'
                    )}
                    <span className="text-xs font-semibold text-slate-600 truncate">
                      {formData.workTypeId === 'OTHER'
                        ? formData.customWorkType || 'อื่นๆ (กำหนดเอง)'
                        : selectedWorkType?.name || 'ประเภทงาน'}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 border border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                    รอการพิจารณา
                  </span>
                </div>

                {/* Urgency Badge (Above Title) */}
                {formData.urgency !== 'Normal' && (
                  <div className="mb-2">
                    {formData.urgency === 'Urgent' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        <Flame className="w-3 h-3 text-rose-500" />
                        ด่วนมาก (Urgent)
                      </span>
                    )}
                    {formData.urgency === 'High' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Zap className="w-3 h-3 text-amber-500" />
                        ด่วน (High)
                      </span>
                    )}
                  </div>
                )}

                {/* Project Title */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 min-h-[44px]">
                  {formData.name || 'พิมพ์ชื่อโครงการของคุณในแบบฟอร์ม...'}
                </h3>

                {/* Sub-project indicator */}
                {selectedParent && (
                  <div className="mt-1 mb-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <FolderTree className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[200px]">โครงการย่อยของ: {selectedParent.name}</span>
                  </div>
                )}

                {/* Objective Snippet */}
                <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 min-h-[42px]">
                  {formData.objective || 'วัตถุประสงค์และขอบเขตงานจะปรากฏที่นี่เมื่อคุณเริ่มพิมพ์...'}
                </p>

                {/* Card Footer: Owner & Deadline */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {/* Owner / Requester */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-red-100 text-[#ff2301] flex items-center justify-center font-bold text-[10px] shrink-0 border border-red-200">
                      {currentUser?.fullName?.charAt(0) || 'U'}
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[110px]">
                      {currentUser?.fullName || 'ผู้ส่งคำร้อง'}
                    </span>
                  </div>

                  {/* Deadline Badge */}
                  {deadlineInfo ? (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${deadlineInfo.isOverdue
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : deadlineInfo.isDueToday
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                    >
                      {deadlineInfo.text}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      ไม่มีกำหนดส่ง
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                การ์ดนี้จะแสดงบนแดชบอร์ดโครงการ BD ทันทีหลังได้รับการอนุมัติ
              </p>
            </div>

            {/* Workflow & Intake Tips Box */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <HelpCircle className="w-4 h-4 text-[#ff2301]" />
                ขั้นตอนหลังการส่ง Brief (Next Steps)
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-red-100">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">ตรวจสอบความพร้อมของข้อมูล</div>
                    <div className="text-slate-500 text-[11px]">
                      ทีม BD และผู้จัดการจะตรวจสอบเป้าหมาย ความเป็นไปได้ และจัดสรรทรัพยากร
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-blue-100">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">อนุมัติ & มอบหมายผู้รับผิดชอบ</div>
                    <div className="text-slate-500 text-[11px]">
                      เมื่ออนุมัติ สถานะจะเปลี่ยนเป็น <span className="font-medium text-emerald-600">กำลังดำเนินการ (IN_PROGRESS)</span> และแต่งตั้ง Project Owner
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-emerald-100">
                    <KanbanSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">แตกงานย่อย & ดำเนินการผ่าน Kanban</div>
                    <div className="text-slate-500 text-[11px]">
                      ทีมงานสามารถบันทึกกิจกรรม อัปเดต Task Checklist และรายงานความคืบหน้ารายสัปดาห์
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <Info className="w-4 h-4 text-[#ff2301] shrink-0" />
                <span>
                  ต้องการความช่วยเหลือเพิ่มเติม? ติดต่อฝ่ายพัฒนาธุรกิจ (BD) ผ่านระบบ Ticket
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

