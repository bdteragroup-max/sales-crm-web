'use client';

import React, { useState, useMemo, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/app/actions/expenseActions';
import { isSalesOrMarketingManager } from '@/app/lib/roleHelper';
import {
  Plus,
  Trash2,
  Pencil,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  User,
  MapPin,
  Search,
  Car,
  Utensils,
  Megaphone,
  Briefcase,
  Users,
  Package,
  MoreHorizontal,
  Receipt,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  ArrowUpDown,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Gauge,
} from 'lucide-react';

interface SalesRepItem {
  id: string;
  fullName: string;
  role?: string;
  hrBranch?: string;
}

interface ExpenseItem {
  id: string;
  branch: string;
  salespersonId: string | null;
  expenseType: string;
  amount: number;
  date: string;
  notes?: string | null;
  odometer?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ExpenseManagerProps {
  initialExpenses: ExpenseItem[];
  currentUser: any;
  salesReps: SalesRepItem[];
}

interface CategoryMeta {
  value: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  badgeClass: string;
  activeTileClass: string;
  barColor: string;
  quickTags: string[];
}

const CATEGORY_CONFIG: CategoryMeta[] = [
  {
    value: 'ค่าเดินทาง (Travel)',
    label: 'ค่าเดินทาง',
    subLabel: 'Travel',
    icon: Car,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    activeTileClass: 'border-blue-600 bg-blue-50/70 text-blue-700 ring-2 ring-blue-600/15',
    barColor: 'bg-blue-500',
    quickTags: ['ค่าน้ำมันเชื้อเพลิง', 'ค่าทางด่วน', 'ค่าที่จอดรถ', 'เดินทางพบลูกค้า'],
  },
  {
    value: 'ค่าอาหาร (Meals)',
    label: 'ค่าอาหาร',
    subLabel: 'Meals',
    icon: Utensils,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    activeTileClass: 'border-orange-500 bg-orange-50/70 text-orange-700 ring-2 ring-orange-500/15',
    barColor: 'bg-orange-500',
    quickTags: ['อาหารมื้อออกตลาด', 'เครื่องดื่มรับรองลูกค้า', 'ค่าอาหารเดินทางต่างจังหวัด'],
  },
  {
    value: 'ค่าการตลาด (Marketing)',
    label: 'ค่าการตลาด',
    subLabel: 'Marketing',
    icon: Megaphone,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    activeTileClass: 'border-purple-600 bg-purple-50/70 text-purple-700 ring-2 ring-purple-600/15',
    barColor: 'bg-purple-500',
    quickTags: ['ค่าบูธ/ออกงานอีเวนต์', 'สื่อประชาสัมพันธ์', 'ของที่ระลึกลูกค้า'],
  },
  {
    value: 'ค่าดำเนินการ (Operations)',
    label: 'ค่าดำเนินการ',
    subLabel: 'Operations',
    icon: Briefcase,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeTileClass: 'border-emerald-600 bg-emerald-50/70 text-emerald-700 ring-2 ring-emerald-600/15',
    barColor: 'bg-emerald-500',
    quickTags: ['ค่าส่งเอกสาร/พัสดุ', 'ค่าธรรมเนียมราชการ', 'ค่าดำเนินการหน้างาน'],
  },
  {
    value: 'ค่ารับรอง (Entertainment)',
    label: 'ค่ารับรอง',
    subLabel: 'Entertainment',
    icon: Users,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    activeTileClass: 'border-rose-600 bg-rose-50/70 text-rose-700 ring-2 ring-rose-600/15',
    barColor: 'bg-rose-500',
    quickTags: ['เลี้ยงรับรองลูกค้า', 'ของเยี่ยมลูกค้า', 'กระเช้าแสดงความยินดี'],
  },
  {
    value: 'ค่าอุปกรณ์ (Supplies)',
    label: 'ค่าอุปกรณ์',
    subLabel: 'Supplies',
    icon: Package,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    activeTileClass: 'border-amber-500 bg-amber-50/70 text-amber-800 ring-2 ring-amber-500/15',
    barColor: 'bg-amber-500',
    quickTags: ['อุปกรณ์สำนักงาน', 'วัสดุสิ้นเปลืองหน้างาน', 'อุปกรณ์ตัวอย่างสินค้า'],
  },
  {
    value: 'อื่นๆ (Other)',
    label: 'อื่นๆ',
    subLabel: 'Other',
    icon: MoreHorizontal,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    activeTileClass: 'border-slate-700 bg-slate-100 text-slate-900 ring-2 ring-slate-700/15',
    barColor: 'bg-slate-500',
    quickTags: ['ค่าใช้จ่ายเบ็ดเตล็ด', 'สำรองจ่ายเร่งด่วน'],
  },
];

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_FULL_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function getBangkokDateISO(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target);
}

function extractDateISO(raw: string | Date | null | undefined): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatThaiDateDisplay(raw: string | Date | null | undefined): string {
  const iso = extractDateISO(raw);
  if (!iso) return '-';
  const [yStr, mStr, dStr] = iso.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return iso;
  return `${d} ${THAI_SHORT_MONTHS[m - 1] || ''} ${y + 543}`;
}

function formatThaiMonthOption(ym: string): string {
  const [yStr, mStr] = ym.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return ym;
  return `${THAI_FULL_MONTHS[m - 1] || ''} ${y + 543}`;
}

function getCategoryMeta(expenseType: string | null | undefined): CategoryMeta {
  if (!expenseType) return CATEGORY_CONFIG[CATEGORY_CONFIG.length - 1];
  const exact = CATEGORY_CONFIG.find((c) => c.value === expenseType);
  if (exact) return exact;
  const lower = expenseType.toLowerCase();
  if (lower.includes('travel') || lower.includes('เดินทาง')) return CATEGORY_CONFIG[0];
  if (lower.includes('meal') || lower.includes('อาหาร')) return CATEGORY_CONFIG[1];
  if (lower.includes('marketing') || lower.includes('การตลาด')) return CATEGORY_CONFIG[2];
  if (lower.includes('operation') || lower.includes('ดำเนินการ')) return CATEGORY_CONFIG[3];
  if (lower.includes('entertain') || lower.includes('รับรอง')) return CATEGORY_CONFIG[4];
  if (lower.includes('suppl') || lower.includes('อุปกรณ์')) return CATEGORY_CONFIG[5];
  return CATEGORY_CONFIG[CATEGORY_CONFIG.length - 1];
}

function formatCurrency(val: number): string {
  return Number(val || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ITEMS_PER_PAGE = 15;

export default function ExpenseManager({
  initialExpenses,
  currentUser,
  salesReps,
}: ExpenseManagerProps) {
  const router = useRouter();
  const formCardRef = useRef<HTMLDivElement>(null);
  const repDropdownRef = useRef<HTMLDivElement>(null);

  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses || []);
  const [isPending, startTransition] = useTransition();

  // Feedback banners
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form visibility & edit mode
  const [isFormExpanded, setIsFormExpanded] = useState<boolean>(true);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Delete modal
  const [deletingItem, setDeletingItem] = useState<ExpenseItem | null>(null);

  // Searchable employee picker inside form
  const [isRepPickerOpen, setIsRepPickerOpen] = useState(false);
  const [repPickerSearch, setRepPickerSearch] = useState('');

  // Table Filters & Sorting & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const roleLower = (currentUser?.role || '').toLowerCase();
  const isManager =
    isSalesOrMarketingManager(currentUser?.role) ||
    roleLower.includes('ผู้จัดการ') ||
    roleLower.includes('manager') ||
    roleLower === 'admin';

  const todayISO = useMemo(() => getBangkokDateISO(0), []);
  const yesterdayISO = useMemo(() => getBangkokDateISO(-1), []);
  const currentMonthKey = useMemo(() => todayISO.slice(0, 7), [todayISO]);

  const [formData, setFormData] = useState({
    amount: '',
    date: todayISO,
    expenseType: CATEGORY_CONFIG[0].value,
    notes: '',
    odometer: '',
    salespersonId: currentUser?.id || '',
  });

  useEffect(() => {
    setExpenses(initialExpenses || []);
  }, [initialExpenses]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (repDropdownRef.current && !repDropdownRef.current.contains(e.target as Node)) {
        setIsRepPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Lookup map for salesperson details
  const repMap = useMemo(() => {
    const map = new Map<string, SalesRepItem>();
    salesReps.forEach((r) => map.set(r.id, r));
    if (currentUser?.id && !map.has(currentUser.id)) {
      map.set(currentUser.id, {
        id: currentUser.id,
        fullName: currentUser.fullName || 'ผู้ใช้งานปัจจุบัน',
        role: currentUser.role,
        hrBranch: currentUser.employeeSale?.branch || 'Head Office',
      });
    }
    return map;
  }, [salesReps, currentUser]);

  const selectedFormRep = repMap.get(formData.salespersonId) || {
    id: currentUser?.id || '',
    fullName: currentUser?.fullName || 'ไม่ระบุ',
    hrBranch: currentUser?.employeeSale?.branch || 'Head Office',
  };

  const filteredPickerReps = useMemo(() => {
    const q = repPickerSearch.trim().toLowerCase();
    if (!q) return salesReps;
    return salesReps.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.hrBranch || '').toLowerCase().includes(q)
    );
  }, [salesReps, repPickerSearch]);

  // Available months from expenses + current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonthKey]);
    expenses.forEach((exp) => {
      const iso = extractDateISO(exp.date);
      if (iso.length >= 7) set.add(iso.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentMonthKey]);

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = expenses.filter((exp) => {
      if (selectedRepFilter !== 'ALL' && exp.salespersonId !== selectedRepFilter) {
        return false;
      }
      if (selectedCategory !== 'ALL') {
        const meta = getCategoryMeta(exp.expenseType);
        if (meta.value !== selectedCategory && exp.expenseType !== selectedCategory) {
          return false;
        }
      }
      if (selectedMonth !== 'ALL') {
        const iso = extractDateISO(exp.date);
        if (!iso.startsWith(selectedMonth)) return false;
      }
      if (q) {
        const rep = exp.salespersonId ? repMap.get(exp.salespersonId) : undefined;
        const repName = (rep?.fullName || '').toLowerCase();
        const branchName = (exp.branch || rep?.hrBranch || '').toLowerCase();
        const notes = (exp.notes || '').toLowerCase();
        const type = (exp.expenseType || '').toLowerCase();
        const odo = exp.odometer != null ? String(exp.odometer) : '';
        const amt = String(exp.amount || '');
        if (
          !repName.includes(q) &&
          !branchName.includes(q) &&
          !notes.includes(q) &&
          !type.includes(q) &&
          !odo.includes(q) &&
          !amt.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const dateA = extractDateISO(a.date);
      const dateB = extractDateISO(b.date);
      if (sortBy === 'date_desc') {
        return dateB.localeCompare(dateA) || (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'date_asc') {
        return dateA.localeCompare(dateB) || (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (sortBy === 'amount_desc') {
        return Number(b.amount) - Number(a.amount);
      }
      return Number(a.amount) - Number(b.amount);
    });
  }, [expenses, selectedRepFilter, selectedCategory, selectedMonth, searchQuery, sortBy, repMap]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMonth, selectedCategory, selectedRepFilter, sortBy]);

  // Summary KPIs
  const metrics = useMemo(() => {
    const filteredTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const filteredCount = filteredExpenses.length;
    const avgPerItem = filteredCount > 0 ? filteredTotal / filteredCount : 0;

    // Current month (respecting selectedRepFilter so managers filtering 1 rep see that rep's monthly total)
    const thisMonthItems = expenses.filter((e) => {
      if (selectedRepFilter !== 'ALL' && e.salespersonId !== selectedRepFilter) return false;
      return extractDateISO(e.date).startsWith(currentMonthKey);
    });
    const thisMonthTotal = thisMonthItems.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Category breakdown on filteredExpenses
    const catTotals = new Map<string, { meta: CategoryMeta; amount: number; count: number }>();
    CATEGORY_CONFIG.forEach((c) => {
      catTotals.set(c.value, { meta: c, amount: 0, count: 0 });
    });

    let travelCount = 0;
    filteredExpenses.forEach((e) => {
      const meta = getCategoryMeta(e.expenseType);
      if (meta.value.includes('Travel')) travelCount += 1;
      const entry = catTotals.get(meta.value)!;
      entry.amount += Number(e.amount || 0);
      entry.count += 1;
    });

    const breakdown = Array.from(catTotals.values())
      .filter((item) => item.count > 0)
      .sort((a, b) => b.amount - a.amount);

    const topCategory = breakdown[0] || null;
    const topCategoryPct =
      topCategory && filteredTotal > 0 ? Math.round((topCategory.amount / filteredTotal) * 100) : 0;

    return {
      filteredTotal,
      filteredCount,
      avgPerItem,
      thisMonthTotal,
      thisMonthCount: thisMonthItems.length,
      breakdown,
      topCategory,
      topCategoryPct,
      travelCount,
    };
  }, [filteredExpenses, expenses, selectedRepFilter, currentMonthKey]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const activeCategoryMeta = useMemo(
    () => getCategoryMeta(formData.expenseType),
    [formData.expenseType]
  );
  const isTravelSelected = formData.expenseType.includes('Travel');

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMonth !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedRepFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMonth('ALL');
    setSelectedCategory('ALL');
    setSelectedRepFilter('ALL');
    setSortBy('date_desc');
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setError(null);
    setFormData({
      amount: '',
      date: todayISO,
      expenseType: CATEGORY_CONFIG[0].value,
      notes: '',
      odometer: '',
      salespersonId: currentUser?.id || '',
    });
  };

  const handleStartEdit = (exp: ExpenseItem) => {
    setError(null);
    setEditingExpenseId(exp.id);
    setIsFormExpanded(true);
    const meta = getCategoryMeta(exp.expenseType);
    setFormData({
      amount: String(exp.amount ?? ''),
      date: extractDateISO(exp.date) || todayISO,
      expenseType: meta.value,
      notes: exp.notes || '',
      odometer: exp.odometer != null ? String(exp.odometer) : '',
      salespersonId: exp.salespersonId || currentUser?.id || '',
    });
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleQuickTagClick = (tag: string) => {
    setFormData((prev) => {
      const current = prev.notes.trim();
      if (!current) return { ...prev, notes: tag };
      if (current.includes(tag)) return prev;
      return { ...prev, notes: `${current}, ${tag}` };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmt = parseFloat(formData.amount);
    if (!parsedAmt || parsedAmt <= 0) {
      setError('กรุณากรอกจำนวนเงินให้มากกว่า 0 บาท');
      return;
    }
    if (!formData.notes.trim()) {
      setError('กรุณาระบุรายละเอียดหรือหมายเหตุการใช้จ่าย');
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append('amount', formData.amount);
      data.append('date', formData.date);
      data.append('expenseType', formData.expenseType);
      data.append('notes', formData.notes.trim());
      if (isTravelSelected && formData.odometer) {
        data.append('odometer', formData.odometer);
      }
      if (isManager && formData.salespersonId) {
        data.append('salespersonId', formData.salespersonId);
      }

      if (editingExpenseId) {
        const res = await updateExpense(editingExpenseId, data);
        if (res.success && res.expense) {
          setExpenses((prev) =>
            prev.map((item) => (item.id === editingExpenseId ? res.expense : item))
          );
          resetForm();
          showToast('อัปเดตรายการค่าใช้จ่ายเรียบร้อยแล้ว');
          router.refresh();
        } else {
          setError(res.error || 'ไม่สามารถอัปเดตข้อมูลได้');
        }
      } else {
        const res = await createExpense(data);
        if (res.success && res.expense) {
          setExpenses((prev) => [res.expense, ...prev]);
          setFormData((prev) => ({
            ...prev,
            amount: '',
            notes: '',
            odometer: '',
          }));
          showToast('บันทึกรายการค่าใช้จ่ายเรียบร้อยแล้ว');
          router.refresh();
        } else {
          setError(res.error || 'บันทึกข้อมูลไม่สำเร็จ');
        }
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    startTransition(async () => {
      const res = await deleteExpense(targetId);
      if (res.success) {
        setExpenses((prev) => prev.filter((ex) => ex.id !== targetId));
        if (editingExpenseId === targetId) {
          resetForm();
        }
        setDeletingItem(null);
        showToast('ลบรายการค่าใช้จ่ายเรียบร้อยแล้ว');
        router.refresh();
      } else {
        setError(res.error || 'ลบข้อมูลไม่สำเร็จ');
        setDeletingItem(null);
      }
    });
  };

  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) return;
    const rows = filteredExpenses.map((exp, idx) => {
      const rep = exp.salespersonId ? repMap.get(exp.salespersonId) : undefined;
      const meta = getCategoryMeta(exp.expenseType);
      return {
        ลำดับ: idx + 1,
        วันที่: formatThaiDateDisplay(exp.date),
        พนักงานผู้เบิก: rep?.fullName || 'ไม่ระบุ',
        สาขา: exp.branch || rep?.hrBranch || '-',
        หมวดหมู่: meta.label,
        รายละเอียด: exp.notes || '-',
        'เลขไมล์ (กม.)': exp.odometer != null ? Number(exp.odometer) : '',
        'จำนวนเงิน (บาท)': Number(exp.amount || 0),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 38 },
      { wch: 14 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `รายงานค่าใช้จ่ายฝ่ายขาย_${todayISO}.xlsx`);
  };

  const toggleDateSort = () => {
    setSortBy((prev) => (prev === 'date_desc' ? 'date_asc' : 'date_desc'));
  };

  const toggleAmountSort = () => {
    setSortBy((prev) => (prev === 'amount_desc' ? 'amount_asc' : 'amount_desc'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 text-xs font-bold animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. SYMMETRICAL PAGE HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
            <Link href="/dashboard" className="hover:text-slate-700 font-medium transition-colors">
              หน้าหลัก
            </Link>
            <span>/</span>
            <Link href="/sales" className="hover:text-slate-700 font-medium transition-colors">
              งานขาย
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">บันทึกค่าใช้จ่าย</span>
            <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-600 border border-slate-200 shadow-2xs">
              <ShieldCheck size={12} className="text-[#ff2301]" />
              {isManager ? 'มุมมองหัวหน้าทีม / ผู้จัดการ' : 'มุมมองพนักงานขาย'}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#ff2301] text-white flex items-center justify-center shadow-sm shrink-0">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                บันทึกและติดตามค่าใช้จ่าย
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                จัดการค่าเดินทาง ค่ารับรอง และค่าใช้จ่ายในการปฏิบัติงานอย่างเป็นระบบ เชื่อมโยงผลประกอบการแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* Symmetrical Action Buttons */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredExpenses.length === 0}
            className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>ส่งออก Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFormExpanded((prev) => !prev)}
            className={`h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-all border ${
              isFormExpanded
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                : 'bg-[#ff2301] hover:bg-red-700 text-white border-[#ff2301]'
            }`}
          >
            {isFormExpanded ? (
              <>
                <ChevronUp size={15} />
                <span>ย่อฟอร์มบันทึก</span>
              </>
            ) : (
              <>
                <Plus size={15} />
                <span>เพิ่มค่าใช้จ่ายใหม่</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 2. SYMMETRICAL 4-CARD KPI STRIP ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Filtered Total */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">ยอดรวมตามตัวกรอง</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight truncate">
              ฿{formatCurrency(metrics.filteredTotal)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100">
            <span>จำนวนรายการที่แสดง</span>
            <span className="text-slate-700 font-bold tabular-nums">
              {metrics.filteredCount.toLocaleString()} รายการ
            </span>
          </div>
        </div>

        {/* Card 2: Current Month Total */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">ยอดใช้จ่ายเดือนนี้</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight truncate">
              ฿{formatCurrency(metrics.thisMonthTotal)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100">
            <span>{formatThaiMonthOption(currentMonthKey)}</span>
            <span className="text-slate-700 font-bold tabular-nums">
              {metrics.thisMonthCount.toLocaleString()} รายการ
            </span>
          </div>
        </div>

        {/* Card 3: Top Expense Category */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">หมวดหมู่ที่ใช้จ่ายสูงสุด</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-xl font-black text-slate-900 tracking-tight truncate">
              {metrics.topCategory ? metrics.topCategory.meta.label : 'ยังไม่มีข้อมูล'}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100">
            <span>
              {metrics.topCategory
                ? `฿${formatCurrency(metrics.topCategory.amount)}`
                : '฿0.00'}
            </span>
            <span className="text-purple-700 font-bold tabular-nums">
              {metrics.topCategory ? `${metrics.topCategoryPct}% ของยอดรวม` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Average per Entry */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">ค่าเฉลี่ยต่อรายการ</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight truncate">
              ฿{formatCurrency(metrics.avgPerItem)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-2 border-t border-slate-100">
            <span>หมวดค่าเดินทาง</span>
            <span className="text-slate-700 font-bold tabular-nums">
              {metrics.travelCount.toLocaleString()} ครั้ง
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. SYMMETRICAL QUICK-ENTRY & EDIT FORM CARD ─── */}
      {isFormExpanded && (
        <div
          ref={formCardRef}
          className={`bg-white rounded-2xl border shadow-2xs transition-all ${
            editingExpenseId
              ? 'border-amber-300 ring-2 ring-amber-400/20'
              : 'border-slate-200/80'
          }`}
        >
          {/* Card Header Bar */}
          <div
            className={`px-5 md:px-6 py-3.5 border-b rounded-t-2xl flex flex-wrap items-center justify-between gap-3 ${
              editingExpenseId
                ? 'bg-amber-50/70 border-amber-200/80'
                : 'bg-slate-50/60 border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  editingExpenseId
                    ? 'bg-amber-500 text-white'
                    : 'bg-[#ff2301]/10 text-[#ff2301]'
                }`}
              >
                {editingExpenseId ? <Pencil size={15} /> : <Plus size={16} />}
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {editingExpenseId ? 'แก้ไขรายการค่าใช้จ่าย' : 'บันทึกรายการค่าใช้จ่ายใหม่'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {editingExpenseId
                    ? 'ปรับปรุงข้อมูลแล้วกดปุ่มบันทึกการแก้ไขด้านล่าง'
                    : 'เลือกหมวดหมู่ กรอกยอดเงินและรายละเอียดให้ครบถ้วน'}
                </p>
              </div>
            </div>

            {/* Quick Date Shortcuts */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                ตั้งวันที่ด่วน:
              </span>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, date: todayISO }))}
                className={`h-8 px-3 rounded-lg text-xs font-bold border transition-all ${
                  formData.date === todayISO
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, date: yesterdayISO }))}
                className={`h-8 px-3 rounded-lg text-xs font-bold border transition-all ${
                  formData.date === yesterdayISO
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                เมื่อวาน
              </button>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-8 px-3 rounded-lg text-xs font-bold bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 inline-flex items-center gap-1 transition-all"
                >
                  <X size={13} />
                  <span>ยกเลิกแก้ไข</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-[#ff2301]" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-700"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Step 1: Symmetrical 7-Tile Category Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  1. เลือกหมวดหมู่ค่าใช้จ่าย <span className="text-[#ff2301]">*</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  หมวดที่เลือก: <strong className="text-slate-700">{activeCategoryMeta.label}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {CATEGORY_CONFIG.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = formData.expenseType === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          expenseType: cat.value,
                        }))
                      }
                      className={`relative h-[72px] px-2.5 py-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                        isActive
                          ? cat.activeTileClass
                          : 'bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-current/15 flex items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      <Icon size={18} className="shrink-0" />
                      <span className="text-xs font-black leading-tight truncate max-w-full">
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-semibold opacity-70 leading-none">
                        {cat.subLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Symmetrical 4-Column Core Fields (All exact h-11, zero layout shift) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Col 1: Amount */}
              <div className="space-y-1.5">
                <label className="h-5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    2. จำนวนเงิน <span className="text-[#ff2301]">*</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">สกุลเงิน บาท</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-[#ff2301]">
                    ฿
                  </span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full h-11 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-[#ff2301] focus:ring-3 focus:ring-[#ff2301]/10 rounded-xl pl-8 pr-12 text-sm font-black text-slate-900 tabular-nums outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                    บาท
                  </span>
                </div>
              </div>

              {/* Col 2: Date */}
              <div className="space-y-1.5">
                <label className="h-5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    3. วันที่ใช้จ่าย <span className="text-[#ff2301]">*</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {formatThaiDateDisplay(formData.date)}
                  </span>
                </label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-11 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-[#ff2301] focus:ring-3 focus:ring-[#ff2301]/10 rounded-xl pl-10 pr-3 text-sm font-bold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Col 3: Salesperson (Searchable Combobox for Manager / Symmetrical Locked Box for Rep) */}
              <div className="space-y-1.5" ref={repDropdownRef}>
                <label className="h-5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>4. พนักงานผู้เบิก</span>
                  <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[110px]">
                    {selectedFormRep.hrBranch || 'Head Office'}
                  </span>
                </label>

                {isManager ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRepPickerOpen((prev) => !prev)}
                      className="w-full h-11 bg-slate-50/70 hover:bg-white border border-slate-200 focus:border-[#ff2301] rounded-xl px-3.5 text-left flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={15} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {selectedFormRep.fullName}
                        </span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 shrink-0 transition-transform ${
                          isRepPickerOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isRepPickerOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                          <div className="relative">
                            <Search
                              size={13}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              autoFocus
                              placeholder="ค้นหาชื่อพนักงาน หรือ สาขา..."
                              value={repPickerSearch}
                              onChange={(e) => setRepPickerSearch(e.target.value)}
                              className="w-full h-8 bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#ff2301]"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                          {currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  salespersonId: currentUser.id,
                                }));
                                setIsRepPickerOpen(false);
                                setRepPickerSearch('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-red-50/60 flex items-center justify-between gap-2 text-xs font-bold text-[#ff2301]"
                            >
                              <span>บันทึกในชื่อของฉัน ({currentUser.fullName})</span>
                              {formData.salespersonId === currentUser.id && <Check size={13} />}
                            </button>
                          )}

                          {filteredPickerReps.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-slate-400 font-semibold">
                              ไม่พบรายชื่อพนักงาน
                            </div>
                          ) : (
                            filteredPickerReps.map((rep) => {
                              const selected = formData.salespersonId === rep.id;
                              return (
                                <button
                                  key={rep.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      salespersonId: rep.id,
                                    }));
                                    setIsRepPickerOpen(false);
                                    setRepPickerSearch('');
                                  }}
                                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors ${
                                    selected ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{rep.fullName}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">
                                      {rep.hrBranch || 'Head Office'}
                                    </p>
                                  </div>
                                  {selected && (
                                    <Check size={14} className="text-[#ff2301] shrink-0" />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-11 bg-slate-100/80 border border-slate-200/80 rounded-xl px-3.5 flex items-center gap-2 text-slate-700">
                    <User size={15} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-bold truncate">
                      {currentUser?.fullName || 'ผู้ใช้งานปัจจุบัน'}
                    </span>
                  </div>
                )}
              </div>

              {/* Col 4: Odometer (Always rendered in Col 4 so layout never jumps!) */}
              <div className="space-y-1.5">
                <label className="h-5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>5. เลขไมล์รถ (Odometer)</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isTravelSelected ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {isTravelSelected ? 'ไม่บังคับ' : 'เฉพาะค่าเดินทาง'}
                  </span>
                </label>

                {isTravelSelected ? (
                  <div className="relative">
                    <Gauge
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="เช่น 45210"
                      value={formData.odometer}
                      onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                      className="w-full h-11 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 rounded-xl pl-10 pr-11 text-sm font-bold text-slate-900 tabular-nums outline-none transition-all"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                      กม.
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-11 bg-slate-100/70 border border-slate-200/70 rounded-xl px-3.5 flex items-center gap-2 text-slate-400 select-none">
                    <Gauge size={15} className="shrink-0 opacity-60" />
                    <span className="text-xs font-semibold truncate">
                      กรอกเฉพาะหมวดค่าเดินทาง
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Symmetrical Note + Quick Preset Chips + Action Buttons Row */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700">
                  6. รายละเอียด / หมายเหตุการใช้จ่าย <span className="text-[#ff2301]">*</span>
                </label>

                {/* Quick Suggestion Chips per Category */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 mr-0.5">
                    ข้อความด่วน:
                  </span>
                  {activeCategoryMeta.quickTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleQuickTagClick(tag)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-bold transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aligned h-11 Input + h-11 Action Buttons */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-8 xl:col-span-9 relative">
                  <FileText
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="ระบุรายละเอียด เช่น ค่าน้ำมันเดินทางพบลูกค้า บจก. เอบีซี..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full h-11 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-[#ff2301] focus:ring-3 focus:ring-[#ff2301]/10 rounded-xl pl-10 pr-9 text-sm font-semibold text-slate-900 outline-none transition-all"
                  />
                  {formData.notes && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, notes: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title="ล้างข้อความ"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="lg:col-span-4 xl:col-span-3 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isPending}
                    className="col-span-1 h-11 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    <span>ล้างค่า</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className={`col-span-2 h-11 text-white font-black text-xs rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 ${
                      editingExpenseId
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-[#ff2301] hover:bg-red-700'
                    }`}
                  >
                    {isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : editingExpenseId ? (
                      <Check size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    <span>
                      {isPending
                        ? 'กำลังบันทึก...'
                        : editingExpenseId
                        ? 'บันทึกการแก้ไข'
                        : 'บันทึกค่าใช้จ่าย'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ─── 4. SYMMETRICAL EXPENSE HISTORY & ANALYTICS CARD ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Top Bar + Symmetrical 4-Column Filter Grid */}
        <div className="p-5 md:p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                ทะเบียนประวัติค่าใช้จ่าย
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                แสดงผล{' '}
                <strong className="text-slate-800">{filteredExpenses.length.toLocaleString()}</strong>{' '}
                รายการ จากทั้งหมด {expenses.length.toLocaleString()} รายการ
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-8 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-[#ff2301] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={13} />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Symmetrical 4-Column Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Filter 1: Search */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="ค้นหารายละเอียด, ชื่อพนักงาน, สาขา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-[#ff2301] rounded-xl pl-9 pr-8 text-xs font-semibold text-slate-900 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter 2: Month */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-[#ff2301] rounded-xl px-3 text-xs font-bold text-slate-800 outline-none transition-all"
            >
              <option value="ALL">ทุกเดือน (ทั้งหมด)</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  เดือน {formatThaiMonthOption(ym)}
                </option>
              ))}
            </select>

            {/* Filter 3: Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-[#ff2301] rounded-xl px-3 text-xs font-bold text-slate-800 outline-none transition-all"
            >
              <option value="ALL">ทุกหมวดหมู่ค่าใช้จ่าย</option>
              {CATEGORY_CONFIG.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} ({cat.subLabel})
                </option>
              ))}
            </select>

            {/* Filter 4: Employee Filter (Managers) OR Sort Selector (Sales Reps) so 4 columns stay 100% symmetrical */}
            {isManager && salesReps.length > 1 ? (
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="w-full h-10 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-[#ff2301] rounded-xl px-3 text-xs font-bold text-slate-800 outline-none transition-all"
              >
                <option value="ALL">พนักงานทุกคน ({salesReps.length} คน)</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName} {rep.hrBranch ? `(${rep.hrBranch})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-10 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-[#ff2301] rounded-xl px-3 text-xs font-bold text-slate-800 outline-none transition-all"
              >
                <option value="date_desc">เรียงตาม: วันที่ล่าสุดก่อน</option>
                <option value="date_asc">เรียงตาม: วันที่เก่าสุดก่อน</option>
                <option value="amount_desc">เรียงตาม: ยอดเงินมาก → น้อย</option>
                <option value="amount_asc">เรียงตาม: ยอดเงินน้อย → มาก</option>
              </select>
            )}
          </div>

          {/* Category Proportional Distribution Strip */}
          {metrics.breakdown.length > 0 && metrics.filteredTotal > 0 && (
            <div className="pt-2 space-y-2.5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                {metrics.breakdown.map((item) => {
                  const pct = Math.max(1, (item.amount / metrics.filteredTotal) * 100);
                  return (
                    <div
                      key={item.meta.value}
                      style={{ width: `${pct}%` }}
                      title={`${item.meta.label}: ฿${formatCurrency(item.amount)}`}
                      className={`${item.meta.barColor} h-full transition-all`}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {metrics.breakdown.map((item) => {
                  const pct = Math.round((item.amount / metrics.filteredTotal) * 100);
                  const isFilteredCat = selectedCategory === item.meta.value;
                  return (
                    <button
                      key={item.meta.value}
                      type="button"
                      onClick={() =>
                        setSelectedCategory((prev) =>
                          prev === item.meta.value ? 'ALL' : item.meta.value
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                        isFilteredCat
                          ? item.meta.badgeClass + ' ring-2 ring-slate-900/10'
                          : 'bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.meta.barColor}`} />
                      <span>{item.meta.label}</span>
                      <span className="text-slate-900 tabular-nums">
                        ฿{formatCurrency(item.amount)}
                      </span>
                      <span className="text-slate-400 tabular-nums">({pct}%)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Receipt size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {expenses.length === 0
                ? 'ยังไม่มีประวัติการบันทึกค่าใช้จ่าย'
                : 'ไม่พบรายการค่าใช้จ่ายที่ตรงกับตัวกรอง'}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {expenses.length === 0
                ? 'เริ่มต้นบันทึกรายการแรกได้จากแบบฟอร์มด้านบน'
                : 'ลองเปลี่ยนคำค้นหา เดือน หรือหมวดหมู่เพื่อดูรายการอื่น'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Symmetrical Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5 w-[140px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={toggleDateSort}
                        className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                      >
                        <span>วันที่ใช้จ่าย</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="py-3.5 px-5 w-[220px] whitespace-nowrap">
                      พนักงานผู้เบิก / สาขา
                    </th>
                    <th className="py-3.5 px-5 w-[170px] whitespace-nowrap">หมวดหมู่</th>
                    <th className="py-3.5 px-5">รายละเอียด / หมายเหตุ</th>
                    <th className="py-3.5 px-5 w-[160px] text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={toggleAmountSort}
                        className="inline-flex items-center justify-end gap-1 hover:text-slate-900 transition-colors ml-auto"
                      >
                        <span>จำนวนเงิน</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="py-3.5 px-5 w-[110px] text-center whitespace-nowrap">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExpenses.map((exp) => {
                    const rep = exp.salespersonId ? repMap.get(exp.salespersonId) : undefined;
                    const repName = rep?.fullName || 'ไม่ระบุชื่อ';
                    const branchLabel = exp.branch || rep?.hrBranch || 'Head Office';
                    const meta = getCategoryMeta(exp.expenseType);
                    const CatIcon = meta.icon;
                    const isBeingEdited = editingExpenseId === exp.id;

                    return (
                      <tr
                        key={exp.id}
                        className={`transition-colors ${
                          isBeingEdited
                            ? 'bg-amber-50/60'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-3.5 px-5 text-xs font-bold text-slate-700 whitespace-nowrap tabular-nums">
                          {formatThaiDateDisplay(exp.date)}
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200/80">
                              {repName.trim().charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate max-w-[165px]">
                                {repName}
                              </p>
                              <p className="text-[11px] font-medium text-slate-400 truncate max-w-[165px]">
                                {branchLabel}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${meta.badgeClass}`}
                          >
                            <CatIcon size={13} />
                            <span>{meta.label}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                              {exp.notes || '-'}
                            </span>
                            {exp.odometer != null && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold tabular-nums">
                                <MapPin size={11} />
                                <span>ไมล์ {Number(exp.odometer).toLocaleString()} กม.</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-slate-900 tabular-nums">
                            ฿{formatCurrency(exp.amount)}
                          </span>
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(exp)}
                              disabled={isPending}
                              title="แก้ไขรายการ"
                              className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white hover:bg-amber-50 hover:border-amber-200 text-slate-500 hover:text-amber-600 flex items-center justify-center transition-colors disabled:opacity-40"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingItem(exp)}
                              disabled={isPending}
                              title="ลบรายการ"
                              className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-[#ff2301] flex items-center justify-center transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200/80">
                    <td colSpan={4} className="py-3.5 px-5 text-xs font-bold text-slate-600">
                      ยอดรวมทั้งหมดตามเงื่อนไขที่กรอง ({filteredExpenses.length.toLocaleString()} รายการ)
                    </td>
                    <td className="py-3.5 px-5 text-right text-base font-black text-[#ff2301] tabular-nums whitespace-nowrap">
                      ฿{formatCurrency(metrics.filteredTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Symmetrical Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedExpenses.map((exp) => {
                const rep = exp.salespersonId ? repMap.get(exp.salespersonId) : undefined;
                const repName = rep?.fullName || 'ไม่ระบุชื่อ';
                const branchLabel = exp.branch || rep?.hrBranch || 'Head Office';
                const meta = getCategoryMeta(exp.expenseType);
                const CatIcon = meta.icon;

                return (
                  <div key={exp.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${meta.badgeClass}`}
                          >
                            <CatIcon size={12} />
                            <span>{meta.label}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                            {formatThaiDateDisplay(exp.date)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          {repName}{' '}
                          <span className="text-slate-400 font-medium">({branchLabel})</span>
                        </p>
                      </div>

                      <p className="text-sm font-black text-[#ff2301] tabular-nums shrink-0">
                        ฿{formatCurrency(exp.amount)}
                      </p>
                    </div>

                    <p className="text-xs font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                      {exp.notes || '-'}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {exp.odometer != null && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                            <MapPin size={12} /> ไมล์ {Number(exp.odometer).toLocaleString()} กม.
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(exp)}
                          className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 inline-flex items-center gap-1"
                        >
                          <Pencil size={12} /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(exp)}
                          className="h-8 px-3 rounded-lg border border-red-200 text-xs font-bold text-red-600 inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} /> ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Symmetrical Pagination Footer */}
            {totalPages > 1 && (
              <div className="px-5 md:px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  หน้า <strong className="text-slate-900">{currentPage}</strong> จาก{' '}
                  <strong className="text-slate-900">{totalPages}</strong> (แสดงหน้าละ{' '}
                  {ITEMS_PER_PAGE} รายการ)
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>ก่อนหน้า</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── 5. DELETE CONFIRMATION MODAL ─── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#ff2301] flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  ยืนยันการลบรายการค่าใช้จ่าย
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  คุณต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{getCategoryMeta(deletingItem.expenseType).label}</span>
                <span className="text-[#ff2301] tabular-nums">
                  ฿{formatCurrency(deletingItem.amount)}
                </span>
              </div>
              <p className="text-slate-600 font-medium truncate">
                {deletingItem.notes || '-'}
              </p>
              <p className="text-[11px] text-slate-400">
                วันที่ {formatThaiDateDisplay(deletingItem.date)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeletingItem(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="h-10 rounded-xl bg-[#ff2301] hover:bg-red-700 text-xs font-black text-white inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>ยืนยันลบรายการ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
