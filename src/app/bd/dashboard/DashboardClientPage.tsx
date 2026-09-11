"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  LayoutGrid,
  List,
  FolderKanban,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ArrowUpRight,
  BarChart3,
  Sparkles,
  X,
  RefreshCw,
  Briefcase,
  Layers,
  CheckSquare,
  AlertCircle,
  Building2,
  Factory,
  Laptop,
  Database,
  TrendingUp,
  Zap,
  Radio,
  ArrowUpDown,
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
  LifeBuoy
} from 'lucide-react';
import { getBDProjects, deleteBDProject, updateBDProject, getAllUsersForBD } from '@/app/actions/bd';

interface DashboardClientPageProps {
  currentUser?: {
    id: string;
    fullName?: string | null;
    role?: string | null;
  } | null;
}

export default function DashboardClientPage({ currentUser }: DashboardClientPageProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Filtering states
  const [statusTab, setStatusTab] = useState<'ALL' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'ATTENTION' | 'COMPLETED' | 'MY_CASES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedWorkType, setSelectedWorkType] = useState('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState('ALL');
  const [sortBy, setSortBy] = useState<'updated' | 'urgency' | 'deadline' | 'name'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showInsights, setShowInsights] = useState(false);

  // Modals state
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ name: '', urgency: '', status: '', completedAt: '' });
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [resProjects, resUsers] = await Promise.all([
        getBDProjects(),
        getAllUsersForBD()
      ]);

      if (resProjects.success && resProjects.data) {
        setProjects(resProjects.data);
      }

      if (resUsers.success && resUsers.data) {
        setTeamMembers(
          resUsers.data.filter((u: any) =>
            ['Business Development', 'BD Intern', 'ผู้จัดการ', 'Admin', 'SUPER_ADMIN'].includes(u.role)
          )
        );
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Delete project
  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await deleteBDProject(projectToDelete);
      if (res.success) {
        setProjects(prev => prev.filter(p => p.id !== projectToDelete));
        setProjectToDelete(null);
      } else {
        alert(res.error || 'ลบโครงการไม่สำเร็จ');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const handleEdit = (project: any) => {
    setEditingProject(project);
    let completedAtStr = '';
    if (project.completedAt) {
      completedAtStr = new Date(project.completedAt).toISOString().split('T')[0];
    } else if (project.status === 'COMPLETED') {
      completedAtStr = new Date().toISOString().split('T')[0];
    }
    setEditFormData({
      name: project.name || '',
      urgency: project.urgency || 'Normal',
      status: project.status || 'PENDING_REVIEW',
      completedAt: completedAtStr
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingProject) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: editFormData.name,
        urgency: editFormData.urgency,
        status: editFormData.status,
      };

      if (payload.status === 'COMPLETED') {
        payload.completedAt = editFormData.completedAt ? new Date(editFormData.completedAt) : new Date();
      } else {
        payload.completedAt = null;
      }

      const res = await updateBDProject(editingProject.id, payload);
      if (res.success) {
        setProjects(prev =>
          prev.map(p => (p.id === editingProject.id ? { ...p, ...payload } : p))
        );
        setEditingProject(null);
      } else {
        alert(res.error || 'อัปเดตโครงการไม่สำเร็จ');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unique work types present in projects
  const uniqueWorkTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    projects.forEach(p => {
      if (p.workType) {
        const existing = map.get(p.workType.id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(p.workType.id, { id: p.workType.id, name: p.workType.name, count: 1 });
        }
      }
    });
    return Array.from(map.values());
  }, [projects]);

  // Overall KPI Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const pendingReview = projects.filter(p => p.status === 'PENDING_REVIEW').length;
    const completed = projects.filter(p => p.status === 'COMPLETED').length;

    // Blocked projects specifically
    const blockedProjects = projects.filter(p => {
      if (p.status === 'COMPLETED') return false;
      return !!p.blockedReason || p.tasks?.some((t: any) => t.blockedReason);
    });

    // Urgent projects specifically
    const urgentProjects = projects.filter(p => p.status !== 'COMPLETED' && p.urgency === 'Urgent');

    // Attention required: Urgent OR has blocker OR overdue
    const attention = projects.filter(p => {
      if (p.status === 'COMPLETED') return false;
      const isUrgent = p.urgency === 'Urgent';
      const isBlocked = !!p.blockedReason || p.tasks?.some((t: any) => t.blockedReason);
      const isOverdue = p.deadline && new Date(p.deadline) < new Date();
      return isUrgent || isBlocked || isOverdue;
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const inProgressRate = total > 0 ? Math.round((inProgress / total) * 100) : 0;

    return {
      total,
      inProgress,
      inProgressRate,
      pendingReview,
      completed,
      attention,
      urgentCount: urgentProjects.length,
      blockedCount: blockedProjects.length,
      blockedProjects,
      completionRate
    };
  }, [projects]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    const activeUserId = currentUser?.id || '';

    return projects.filter(p => {
      // 1. Status Tab filter
      if (statusTab === 'IN_PROGRESS' && p.status !== 'IN_PROGRESS') return false;
      if (statusTab === 'PENDING_REVIEW' && p.status !== 'PENDING_REVIEW') return false;
      if (statusTab === 'COMPLETED' && p.status !== 'COMPLETED') return false;
      if (statusTab === 'ATTENTION') {
        const isUrgent = p.urgency === 'Urgent';
        const isBlocked = !!p.blockedReason || p.tasks?.some((t: any) => t.blockedReason);
        const isOverdue = p.deadline && new Date(p.deadline) < new Date();
        if (!isUrgent && !isBlocked && !isOverdue) return false;
      }
      if (statusTab === 'MY_CASES') {
        const isOwner = p.ownerId === activeUserId || p.requesterId === activeUserId;
        const isMember = p.members?.some((m: any) => m.id === activeUserId);
        const hasMyTask = p.tasks?.some((t: any) => t.assigneeId === activeUserId);
        if (!isOwner && !isMember && !hasMyTask) return false;
      }

      // 2. Owner filter
      if (selectedOwner !== 'ALL') {
        const isOwner = p.ownerId === selectedOwner;
        const isMember = p.members?.some((m: any) => m.id === selectedOwner);
        if (!isOwner && !isMember) return false;
      }

      // 3. Work Type filter
      if (selectedWorkType !== 'ALL' && p.workTypeId !== selectedWorkType) {
        return false;
      }

      // 4. Urgency filter
      if (selectedUrgency !== 'ALL' && p.urgency !== selectedUrgency) {
        return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(query);
        const matchType = p.workType?.name?.toLowerCase().includes(query);
        const matchRequester = p.requester?.fullName?.toLowerCase().includes(query);
        const matchOwner = p.owner?.fullName?.toLowerCase().includes(query);
        const matchTasks = p.tasks?.some((t: any) => t.name?.toLowerCase().includes(query));
        if (!matchName && !matchType && !matchRequester && !matchOwner && !matchTasks) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') {
        const urgencyWeight: Record<string, number> = { Urgent: 3, High: 2, Normal: 1 };
        return (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
      }
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: updated
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [projects, statusTab, selectedOwner, selectedWorkType, selectedUrgency, searchQuery, sortBy, currentUser]);

  // Helper for Work Type styling
  const getWorkTypeStyle = (name: string = '') => {
    const lower = name.toLowerCase().trim();

    // 1. Marketing / MKT
    if (lower.includes('mkt') || lower.includes('market') || lower.includes('การตลาด')) {
      return { badge: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };
    }
    // 2. Dev / Software / Systems (must precede EV check so 'dev' does not match 'ev')
    if (lower.includes('dev') || lower.includes('soft') || lower.includes(' it') || lower.startsWith('it') || lower.includes('ระบบ') || lower.includes('code') || lower.includes('แอป')) {
      return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' };
    }
    // 3. EV Charging
    if (lower === 'ev' || lower.startsWith('ev ') || lower.endsWith(' ev') || lower.includes(' ev ') || lower.includes('ชาร์จ') || lower.includes('station')) {
      return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    }
    // 4. Accounting / Finance
    if (lower.includes('บัญชี') || lower.includes('account') || lower.includes('finance') || lower.includes('การเงิน')) {
      return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    }
    // 5. Sales
    if (lower.includes('sale') || lower.includes('ขาย')) {
      return { badge: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' };
    }
    // 6. Service
    if (lower.includes('service') || lower.includes('บริการ') || lower.includes('ซ่อม')) {
      return { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/80', dot: 'bg-cyan-500' };
    }
    // 7. Store / Inventory
    if (lower.includes('store') || lower.includes('สต็อก') || lower.includes('stock')) {
      return { badge: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' };
    }
    // 8. R&D / Engineering
    if (lower.includes('r&d') || lower.includes('rnd') || lower.includes('วิศวกรรม') || lower.includes('engineer')) {
      return { badge: 'bg-violet-50 text-violet-700 border-violet-200/80', dot: 'bg-violet-500' };
    }
    // 9. HR
    if (lower.includes('hr') || lower.includes('บุคคล') || lower.includes('สรรหา')) {
      return { badge: 'bg-pink-50 text-pink-700 border-pink-200/80', dot: 'bg-pink-500' };
    }
    // 10. Database
    if (lower.includes('data') || lower.includes('ฐานข้อมูล') || lower.includes('db')) {
      return { badge: 'bg-purple-50 text-purple-700 border-purple-200/80', dot: 'bg-purple-500' };
    }
    // 11. External / Outsource
    if (lower.includes('outsource') || lower.includes('ภายนอก') || lower.includes('external')) {
      return { badge: 'bg-orange-50 text-orange-700 border-orange-200/80', dot: 'bg-orange-500' };
    }
    // 12. Branch
    if (lower.includes('branch') || lower.includes('สาขา')) {
      return { badge: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' };
    }
    // 13. Factory / Warehouse
    if (lower.includes('factory') || lower.includes('โรงงาน') || lower.includes('คลัง')) {
      return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' };
    }
    // 14. Opportunity / โอกาส
    if (lower.includes('โอกาส') || lower.includes('opportunity')) {
      return { badge: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' };
    }
    // 15. Expansion / ขยายธุรกิจ
    if (lower.includes('ขยายธุรกิจ') || lower.includes('expansion')) {
      return { badge: 'bg-sky-50 text-sky-700 border-sky-200/80', dot: 'bg-sky-500' };
    }
    // 16. Research / หาข้อมูล
    if (lower.includes('หาข้อมูล') || lower.includes('research') || lower.includes('สำรวจ')) {
      return { badge: 'bg-teal-50 text-teal-700 border-teal-200/80', dot: 'bg-teal-500' };
    }
    // 17. Internal Development / พัฒนาภายใน
    if (lower.includes('พัฒนาภายใน') || lower.includes('internal')) {
      return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    }
    // 18. Kaizen
    if (lower.includes('kaizen') || lower.includes('ปรับปรุง')) {
      return { badge: 'bg-teal-50 text-teal-700 border-teal-200/80', dot: 'bg-teal-500' };
    }
    // 19. RFID
    if (lower.includes('rfid')) {
      return { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200/80', dot: 'bg-cyan-500' };
    }
    // 20. Project / โครงการ
    if (lower.includes('project') || lower.includes('โครงการ')) {
      return { badge: 'bg-slate-100 text-slate-800 border-slate-300/80', dot: 'bg-slate-500' };
    }
    // 21. Cross / ทุกฝ่าย / Support
    if (lower.includes('ทุกฝ่าย') || lower.includes('support') || lower.includes('help')) {
      return { badge: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' };
    }

    return {
      badge: 'bg-slate-50 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-500'
    };
  };

  // Helper for Work Type Icon
  const getWorkTypeIcon = (name: string = '', customClass?: string) => {
    const lower = name.toLowerCase().trim();
    const cls = customClass || "w-3.5 h-3.5 shrink-0";

    // 1. Marketing / MKT
    if (lower.includes('mkt') || lower.includes('market') || lower.includes('การตลาด')) {
      return <Megaphone className={`${cls} ${customClass ? '' : 'text-rose-500'}`} />;
    }
    // 2. Dev / Software / Systems (must precede EV so 'dev' does not match 'ev')
    if (lower.includes('dev') || lower.includes('soft') || lower.includes(' it') || lower.startsWith('it') || lower.includes('ระบบ') || lower.includes('code') || lower.includes('แอป')) {
      return <Code2 className={`${cls} ${customClass ? '' : 'text-indigo-600'}`} />;
    }
    // 3. EV Charging
    if (lower === 'ev' || lower.startsWith('ev ') || lower.endsWith(' ev') || lower.includes(' ev ') || lower.includes('ชาร์จ') || lower.includes('station')) {
      return <Zap className={`${cls} ${customClass ? '' : 'text-emerald-500'}`} />;
    }
    // 4. Accounting / Finance
    if (lower.includes('บัญชี') || lower.includes('account') || lower.includes('finance') || lower.includes('การเงิน')) {
      return <Calculator className={`${cls} ${customClass ? '' : 'text-emerald-600'}`} />;
    }
    // 5. Sales
    if (lower.includes('sale') || lower.includes('ขาย')) {
      return <BadgeDollarSign className={`${cls} ${customClass ? '' : 'text-blue-600'}`} />;
    }
    // 6. Service
    if (lower.includes('service') || lower.includes('บริการ') || lower.includes('ซ่อม')) {
      return <Headphones className={`${cls} ${customClass ? '' : 'text-cyan-600'}`} />;
    }
    // 7. Store / Inventory
    if (lower.includes('store') || lower.includes('สต็อก') || lower.includes('stock')) {
      return <Package className={`${cls} ${customClass ? '' : 'text-amber-600'}`} />;
    }
    // 8. R&D / Engineering
    if (lower.includes('r&d') || lower.includes('rnd') || lower.includes('วิศวกรรม') || lower.includes('engineer')) {
      return <FlaskConical className={`${cls} ${customClass ? '' : 'text-violet-600'}`} />;
    }
    // 9. HR
    if (lower.includes('hr') || lower.includes('บุคคล') || lower.includes('สรรหา')) {
      return <Users className={`${cls} ${customClass ? '' : 'text-pink-500'}`} />;
    }
    // 10. Database
    if (lower.includes('data') || lower.includes('ฐานข้อมูล') || lower.includes('db')) {
      return <Database className={`${cls} ${customClass ? '' : 'text-purple-600'}`} />;
    }
    // 11. External / Outsource
    if (lower.includes('outsource') || lower.includes('ภายนอก') || lower.includes('external')) {
      return <ExternalLink className={`${cls} ${customClass ? '' : 'text-orange-500'}`} />;
    }
    // 12. Branch
    if (lower.includes('branch') || lower.includes('สาขา')) {
      return <Building2 className={`${cls} ${customClass ? '' : 'text-blue-600'}`} />;
    }
    // 13. Factory / Warehouse
    if (lower.includes('factory') || lower.includes('โรงงาน') || lower.includes('คลัง')) {
      return <Factory className={`${cls} ${customClass ? '' : 'text-indigo-600'}`} />;
    }
    // 14. Opportunity / โอกาส
    if (lower.includes('โอกาส') || lower.includes('opportunity')) {
      return <Lightbulb className={`${cls} ${customClass ? '' : 'text-amber-500'}`} />;
    }
    // 15. Expansion / ขยายธุรกิจ
    if (lower.includes('ขยายธุรกิจ') || lower.includes('expansion')) {
      return <Rocket className={`${cls} ${customClass ? '' : 'text-sky-500'}`} />;
    }
    // 16. Research / หาข้อมูล
    if (lower.includes('หาข้อมูล') || lower.includes('research') || lower.includes('สำรวจ')) {
      return <Search className={`${cls} ${customClass ? '' : 'text-teal-600'}`} />;
    }
    // 17. Internal Development / พัฒนาภายใน
    if (lower.includes('พัฒนาภายใน') || lower.includes('internal')) {
      return <Wrench className={`${cls} ${customClass ? '' : 'text-emerald-600'}`} />;
    }
    // 18. Kaizen
    if (lower.includes('kaizen') || lower.includes('ปรับปรุง') || lower.includes('พัฒนา')) {
      return <TrendingUp className={`${cls} ${customClass ? '' : 'text-teal-600'}`} />;
    }
    // 19. RFID
    if (lower.includes('rfid')) {
      return <Radio className={`${cls} ${customClass ? '' : 'text-cyan-500'}`} />;
    }
    // 20. Project / โครงการ
    if (lower.includes('project') || lower.includes('โครงการ')) {
      return <FolderKanban className={`${cls} ${customClass ? '' : 'text-slate-600'}`} />;
    }
    // 21. Cross / ทุกฝ่าย / Support
    if (lower.includes('ทุกฝ่าย') || lower.includes('support') || lower.includes('help')) {
      return <LifeBuoy className={`${cls} ${customClass ? '' : 'text-blue-600'}`} />;
    }

    return <Briefcase className={`${cls} ${customClass ? '' : 'text-slate-500'}`} />;
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs whitespace-nowrap">
            <Activity className="w-3 h-3 text-blue-600 shrink-0 animate-pulse" />
            กำลังดำเนินการ
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            รอการพิจารณา
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 whitespace-nowrap">
            <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />
            ระงับชั่วคราว
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            เสร็จสิ้น
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  // Helper for Urgency Badge
  const renderUrgencyBadge = (urgency: string) => {
    if (urgency === 'Urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
          <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ด่วนมาก
        </span>
      );
    }
    if (urgency === 'High') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ด่วน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-normal bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
        ปกติ
      </span>
    );
  };

  // Helper for Deadline badge
  const renderDeadlineBadge = (deadlineStr: string | null) => {
    if (!deadlineStr) {
      return (
        <span className="inline-flex items-center gap-1 text-2xs text-slate-400 whitespace-nowrap">
          <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
          <span>ไม่ระบุกำหนด</span>
        </span>
      );
    }
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateFormatted = deadline.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 whitespace-nowrap">
          <Calendar className="w-3 h-3 text-rose-600 shrink-0" />
          <span>{dateFormatted}</span>
          <span className="text-2xs font-bold text-rose-800 ml-0.5">(เกิน {Math.abs(diffDays)} วัน)</span>
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>ครบกำหนดวันนี้</span>
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-2xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>{dateFormatted}</span>
          <span className="text-2xs font-semibold text-amber-800 ml-0.5">(เหลือ {diffDays} วัน)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-2xs text-slate-500 whitespace-nowrap">
        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
        <span>กำหนด: {dateFormatted}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-8 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-rose-200 border-t-brand-red rounded-full animate-spin" />
          <p className="text-slate-600 font-medium text-sm animate-pulse">กำลังโหลดข้อมูลแดชบอร์ดโครงการ BD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800">

      {/* 1. Symmetrical Top Hero Header */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* Left: Section Breadcrumb, Title & Active Stat Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
                <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span>ธุรกิจและการพัฒนา (BD)</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-700 font-semibold">ภาพรวมโครงการ (Overview)</span>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                    แดชบอร์ดโครงการพัฒนาธุรกิจ
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 whitespace-nowrap">
                    <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    กำลังดำเนินการ {metrics.inProgress} โครงการ
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Harmonious Single-Row Action Cluster */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Linked Module Tabs */}
              <div className="inline-flex p-1 bg-slate-100/90 rounded-xl text-xs font-medium text-slate-600 border border-slate-200/50">
                <Link
                  href="/bd/kanban"
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="เปิดกระดานงาน Kanban"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
                  <span>กระดานงาน</span>
                </Link>
                <Link
                  href="/bd/my-work"
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="ดูงานของฉัน"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>งานของฉัน</span>
                </Link>
                <Link
                  href="/bd/reports"
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-white transition-all flex items-center gap-1.5 whitespace-nowrap"
                  title="ดูรายงานสรุป"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>รายงาน</span>
                </Link>
              </div>

              {/* Primary CTA */}
              <Link
                href="/bd/intake"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/30 transition-all whitespace-nowrap shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>สร้างโครงการใหม่</span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 2. Symmetrical 4-Card Executive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* KPI Card 1: All Projects + Completion Rate */}
          <button
            onClick={() => setStatusTab('ALL')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${statusTab === 'ALL'
              ? 'border-slate-400 ring-2 ring-slate-400/20 bg-slate-50/40'
              : 'border-slate-200/80 hover:border-slate-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">โครงการทั้งหมด</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-slate-900 data">{metrics.total}</span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>

            {/* Completion Rate Mini Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-2xs text-slate-500 font-medium">
                <span>สำเร็จแล้ว {metrics.completed} โครงการ</span>
                <span className="text-emerald-700 font-bold">{metrics.completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
            </div>
          </button>

          {/* KPI Card 2: In Progress */}
          <button
            onClick={() => setStatusTab('IN_PROGRESS')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${statusTab === 'IN_PROGRESS'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
              : 'border-slate-200/80 hover:border-blue-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">กำลังดำเนินการ</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-blue-900 data">{metrics.inProgress}</span>
              <span className="text-xs text-blue-600 font-medium">โครงการ Active</span>
            </div>

            <div className="flex items-center gap-1.5 text-2xs text-blue-700 font-medium pt-1">
              <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">คิดเป็น {metrics.inProgressRate}% ของโครงการทั้งหมด</span>
            </div>
          </button>

          {/* KPI Card 3: Pending Review / New Briefs */}
          <button
            onClick={() => setStatusTab('PENDING_REVIEW')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${statusTab === 'PENDING_REVIEW'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-slate-200/80 hover:border-amber-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">รอพิจารณา / บรีฟใหม่</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-amber-900 data">{metrics.pendingReview}</span>
              <span className="text-xs text-amber-600 font-medium">รอเริ่มงาน</span>
            </div>

            <div className="text-2xs text-amber-700 font-medium truncate pt-1">
              <span>บรีฟใหม่ที่ต้องประเมินและจัดสรรทีม</span>
            </div>
          </button>

          {/* KPI Card 4: Attention Required (Urgent / Blocked) */}
          <button
            onClick={() => setStatusTab('ATTENTION')}
            className={`text-left p-5 rounded-2xl bg-white border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-md flex flex-col justify-between h-36 ${statusTab === 'ATTENTION'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
              : 'border-slate-200/80 hover:border-rose-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">ต้องดูแลด่วน</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-bold text-rose-900 data">{metrics.attention}</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full">
                Priority
              </span>
            </div>

            <div className="text-2xs text-rose-700 font-medium truncate pt-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>ติดปัญหา {metrics.blockedCount} · ด่วนมาก {metrics.urgentCount}</span>
            </div>
          </button>

        </div>

        {/* 3. Integrated Control Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 md:p-5 space-y-4">

          {/* Row 1: Status Segmented Tabs (Left) & Tools/Switcher (Right) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">

            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${statusTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ทั้งหมด</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-2xs">
                  {metrics.total}
                </span>
              </button>
              <button
                onClick={() => setStatusTab('IN_PROGRESS')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${statusTab === 'IN_PROGRESS'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-blue-600'
                  }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>กำลังทำ</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-2xs">
                  {metrics.inProgress}
                </span>
              </button>
              <button
                onClick={() => setStatusTab('PENDING_REVIEW')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${statusTab === 'PENDING_REVIEW'
                  ? 'bg-white text-amber-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-amber-700'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>รอพิจารณา</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-2xs">
                  {metrics.pendingReview}
                </span>
              </button>
              <button
                onClick={() => setStatusTab('ATTENTION')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${statusTab === 'ATTENTION'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-rose-600'
                  }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>ต้องดูแลด่วน</span>
                {metrics.attention > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-2xs font-bold">
                    {metrics.attention}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatusTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${statusTab === 'COMPLETED'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-emerald-600'
                  }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>เสร็จสิ้น</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-2xs">
                  {metrics.completed}
                </span>
              </button>
              {currentUser && (
                <button
                  onClick={() => setStatusTab('MY_CASES')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${statusTab === 'MY_CASES'
                    ? 'bg-white text-brand-red shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-brand-red'
                    }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>งานของฉัน</span>
                </button>
              )}
            </div>

            {/* Right: Quick Insights Toggle & View Mode Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${showInsights
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-red" />
                <span>สถิติเชิงลึก</span>
                {metrics.blockedCount > 0 && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                )}
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                  title="มุมมองการ์ด (Grid)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                  title="มุมมองตาราง (Table)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Row 2: Symmetrical Search & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">

            {/* Search Input: Spans 4 cols */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโครงการ, บรีฟ, ผู้ร้องขอ..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Work Type Filter: Spans 2 cols */}
            <div className="md:col-span-2 relative">
              <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedWorkType}
                onChange={e => setSelectedWorkType(e.target.value)}
                className="w-full pl-8 pr-6 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer appearance-none truncate"
              >
                <option value="ALL">ทุกหมวดหมู่งาน</option>
                {uniqueWorkTypes.map(wt => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name} ({wt.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Urgency Filter: Spans 2 cols */}
            <div className="md:col-span-2 relative">
              <Flame className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedUrgency}
                onChange={e => setSelectedUrgency(e.target.value)}
                className="w-full pl-8 pr-6 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer appearance-none"
              >
                <option value="ALL">ทุกความเร่งด่วน</option>
                <option value="Urgent">ด่วนมาก (Urgent)</option>
                <option value="High">ด่วน (High)</option>
                <option value="Normal">ปกติ (Normal)</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Owner / Assignee Filter: Spans 2 cols */}
            <div className="md:col-span-2 relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
                className="w-full pl-8 pr-6 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer truncate appearance-none"
              >
                <option value="ALL">ผู้รับผิดชอบทั้งหมด</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sorter & Reset: Spans 2 cols */}
            <div className="md:col-span-2 flex items-center gap-1.5">
              <div className="relative flex-1">
                <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full pl-8 pr-6 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red text-slate-700 cursor-pointer appearance-none"
                >
                  <option value="updated">อัปเดตล่าสุด</option>
                  <option value="urgency">ความเร่งด่วน</option>
                  <option value="deadline">กำหนดส่ง</option>
                  <option value="name">ชื่อโครงการ</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {(selectedWorkType !== 'ALL' || selectedUrgency !== 'ALL' || selectedOwner !== 'ALL' || searchQuery || statusTab !== 'ALL') && (
                <button
                  onClick={() => {
                    setSelectedWorkType('ALL');
                    setSelectedUrgency('ALL');
                    setSelectedOwner('ALL');
                    setSearchQuery('');
                    setStatusTab('ALL');
                  }}
                  className="p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shrink-0"
                  title="รีเซ็ตตัวกรองทั้งหมด"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Quick Insights Drawer (Seamless Slide-down) */}
          {showInsights && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
              {/* Category Breakdown */}
              <div>
                <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  สัดส่วนโครงการตามประเภทงาน (คลิกเพื่อกรอง)
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueWorkTypes.map(wt => {
                    const style = getWorkTypeStyle(wt.name);
                    const isSelected = selectedWorkType === wt.id;
                    return (
                      <button
                        key={wt.id}
                        onClick={() => setSelectedWorkType(isSelected ? 'ALL' : wt.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : `${style.badge} hover:bg-white`
                          }`}
                      >
                        {getWorkTypeIcon(wt.name, isSelected ? 'w-3.5 h-3.5 shrink-0 text-white' : undefined)}
                        <span>{wt.name}</span>
                        <span className="px-1 text-2xs rounded bg-white/60 text-slate-700 font-bold ml-0.5">
                          {wt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blocked Projects Radar */}
              <div>
                <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  โครงการที่ติดปัญหาและต้องการความช่วยเหลือ ({metrics.blockedCount})
                </h4>
                {metrics.blockedProjects.length === 0 ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ยอดเยี่ยม! ไม่มีโครงการใดที่ติดปัญหาหรือรอการอนุมัติในขณะนี้</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {metrics.blockedProjects.slice(0, 3).map(bp => {
                      const firstBlocked = bp.tasks?.find((t: any) => t.blockedReason);
                      const reason = firstBlocked?.blockedReason || bp.blockedReason || 'ติดปัญหาภายนอก';
                      const waiting = firstBlocked?.waitingOn || bp.waitingOn;

                      return (
                        <div
                          key={bp.id}
                          className="p-2 bg-white border border-rose-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="truncate mr-2">
                            <Link
                              href={`/bd/projects/${bp.id}`}
                              className="font-bold text-slate-900 hover:text-brand-red transition-colors truncate block"
                            >
                              {bp.name}
                            </Link>
                            <span className="text-rose-600 text-2xs font-medium">
                              {reason} {waiting ? `(รอ: ${waiting})` : ''}
                            </span>
                          </div>
                          <Link
                            href={`/bd/projects/${bp.id}`}
                            className="text-brand-red font-semibold hover:underline shrink-0 text-2xs flex items-center gap-0.5"
                          >
                            ดู <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Symmetrical Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>
              แสดง <strong className="text-slate-900 font-semibold">{filteredProjects.length}</strong> จาก {projects.length} โครงการ
            </span>
            {selectedWorkType !== 'ALL' && (
              <span className="text-brand-red font-medium text-2xs">
                กำลังกรอง: {uniqueWorkTypes.find(w => w.id === selectedWorkType)?.name}
              </span>
            )}
          </div>

        </div>

        {/* 4. Symmetrical Main Content Section */}
        {filteredProjects.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-rose-50 text-brand-red rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-rose-100">
              <FolderKanban className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">ไม่พบโครงการตามเงื่อนไข</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูโครงการทั้งหมดในระบบ
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  setSelectedWorkType('ALL');
                  setSelectedUrgency('ALL');
                  setSelectedOwner('ALL');
                  setSearchQuery('');
                  setStatusTab('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
              <Link
                href="/bd/intake"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-red hover:bg-red-700 rounded-xl transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>สร้างโครงการ</span>
              </Link>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Symmetrical Grid Cards View (3 Equal Columns) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
            {filteredProjects.map((project) => {
              const typeStyle = getWorkTypeStyle(project.workType?.name);
              const totalTasks = project.tasks?.length || 0;
              const completedTasks = project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
              const progressPercent = totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : project.status === 'COMPLETED' ? 100 : 0;

              // Blocker
              const firstBlockedTask = project.tasks?.find((t: any) => t.blockedReason);
              const isBlocked = !!firstBlockedTask || !!project.blockedReason;
              const blockerText = firstBlockedTask?.blockedReason || project.blockedReason;
              const waitingText = firstBlockedTask?.waitingOn || project.waitingOn;

              // Next pending task
              const nextPendingTask = project.tasks?.find((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-2xs h-full"
                >
                  {/* Card Main Body */}
                  <div className="p-5 pb-3.5 flex-1 flex flex-col justify-between space-y-3">

                    {/* Row 1: Category & Status (Opposite sides, NEVER collide) */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap truncate max-w-[60%] ${typeStyle.badge}`}>
                        {getWorkTypeIcon(project.workType?.name)}
                        <span className="truncate">{project.workType?.name || 'ทั่วไป'}</span>
                      </span>
                      <div className="shrink-0">
                        {renderStatusBadge(project.status)}
                      </div>
                    </div>

                    {/* Row 2: Title & Urgency */}
                    <div>
                      {project.urgency && project.urgency !== 'Normal' && (
                        <div className="mb-1.5">
                          {renderUrgencyBadge(project.urgency)}
                        </div>
                      )}
                      <Link
                        href={`/bd/projects/${project.id}`}
                        className="text-base font-bold text-slate-900 group-hover:text-brand-red transition-colors line-clamp-2 tracking-tight leading-snug block"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {project.objective || `โครงการพัฒนาธุรกิจ · ผู้ร้องขอ: ${project.requester?.fullName || 'ไม่ระบุ'}`}
                      </p>
                    </div>

                    {/* Row 3: Progress Bar */}
                    <div className="pt-0.5">
                      <div className="flex items-center justify-between text-2xs font-semibold text-slate-500 mb-1">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3 text-slate-400" />
                          <span>ความคืบหน้า</span>
                        </span>
                        <span className="text-slate-800 font-bold data">
                          {totalTasks > 0
                            ? `${completedTasks}/${totalTasks} งาน (${progressPercent}%)`
                            : project.status === 'COMPLETED'
                              ? '100% เสร็จสิ้น'
                              : '0% (รอเริ่มงาน)'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${project.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : isBlocked
                              ? 'bg-rose-500'
                              : progressPercent > 0
                                ? 'bg-brand-red'
                                : 'bg-transparent'
                            }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Row 4: Status / Next Step / Blocker (Symmetrical container on all cards) */}
                    <div className="min-h-[44px] flex items-center">
                      {isBlocked ? (
                        <div className="w-full p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-2xs block text-rose-900 leading-tight">ติดปัญหา:</span>
                            <span className="truncate block text-2xs leading-tight">{blockerText} {waitingText ? `(รอ: ${waitingText})` : ''}</span>
                          </div>
                        </div>
                      ) : nextPendingTask ? (
                        <div className="w-full p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                          <div className="truncate mr-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <div className="truncate">
                              <span className="text-slate-400 text-2xs block leading-tight">ขั้นตอนถัดไป:</span>
                              <span className="font-medium text-slate-900 truncate block text-xs leading-tight">{nextPendingTask.name}</span>
                            </div>
                          </div>
                          {nextPendingTask.assignee?.fullName && (
                            <span className="shrink-0 text-2xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                              {nextPendingTask.assignee.fullName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      ) : project.status === 'COMPLETED' ? (
                        <div className="w-full p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-2xs font-medium truncate">โครงการเสร็จสิ้นสมบูรณ์แล้ว</span>
                        </div>
                      ) : (
                        <div className="w-full p-2.5 bg-slate-50/70 border border-slate-200/50 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-2xs text-slate-500 truncate">บรีฟใหม่ · รอจัดสรรขั้นตอนงาน</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Row 5: Metadata Row (Owner on Left, Deadline on Right - Symmetrical, Never Squeezed) */}
                  <div className="px-5 py-2.5 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate flex-1 mr-1">
                      <div className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-2xs font-bold text-slate-700 uppercase shrink-0">
                        {project.owner?.fullName?.charAt(0) || project.requester?.fullName?.charAt(0) || 'B'}
                      </div>
                      <span className="text-xs font-medium text-slate-700 truncate" title={project.owner?.fullName || project.requester?.fullName}>
                        {project.owner?.fullName || project.requester?.fullName || 'ยังไม่ระบุ'}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {renderDeadlineBadge(project.deadline)}
                    </div>
                  </div>

                  {/* Row 6: Bottom Action Bar */}
                  <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                    <Link
                      href={`/bd/projects/${project.id}`}
                      className="text-xs font-semibold text-slate-600 hover:text-brand-red transition-colors flex items-center gap-1 group/link"
                    >
                      <span>ดูรายละเอียด</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไขข้อมูลโครงการ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setProjectToDelete(project.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="ลบโครงการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Symmetrical Data Table View */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                        <span>ชื่อโครงการ</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>หมวดหมู่งาน</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        <span>สถานะ</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-slate-400" />
                        <span>ความเร่งด่วน</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>ความคืบหน้า</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ขั้นตอนถัดไป</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>กำหนดส่ง</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredProjects.map((project) => {
                    const typeStyle = getWorkTypeStyle(project.workType?.name);
                    const totalTasks = project.tasks?.length || 0;
                    const completedTasks = project.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
                    const progressPercent = totalTasks > 0
                      ? Math.round((completedTasks / totalTasks) * 100)
                      : project.status === 'COMPLETED' ? 100 : 0;

                    const pendingTask = project.tasks?.find((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
                    const firstBlockedTask = project.tasks?.find((t: any) => t.blockedReason);

                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-rose-50/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/bd/projects/${project.id}`}
                            className="font-bold text-slate-900 group-hover:text-brand-red transition-colors block leading-snug"
                          >
                            {project.name}
                          </Link>
                          <div className="text-2xs text-slate-400 mt-0.5">
                            ผู้ร้องขอ: {project.requester?.fullName || 'ไม่ระบุ'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${typeStyle.badge}`}>
                            {getWorkTypeIcon(project.workType?.name)}
                            <span>{project.workType?.name || 'ทั่วไป'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(project.status)}
                          {firstBlockedTask && (
                            <div className="text-2xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[140px]">
                                ติดปัญหา: {firstBlockedTask.blockedReason}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderUrgencyBadge(project.urgency)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="w-28">
                            <div className="flex items-center justify-between text-2xs text-slate-500 font-medium mb-1">
                              <span>{progressPercent}%</span>
                              <span>{completedTasks}/{totalTasks}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${project.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-brand-red'
                                  }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {pendingTask ? (
                            <div>
                              <div className="font-semibold text-slate-800 truncate max-w-[160px]">
                                {pendingTask.name}
                              </div>
                              <div className="text-2xs text-slate-400 mt-0.5">
                                {pendingTask.assignee?.fullName || 'ยังไม่ระบุ'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-2xs">ไม่มีงานค้าง</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderDeadlineBadge(project.deadline) || (
                            <span className="text-2xs text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/bd/projects/${project.id}`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="เปิดดูรายละเอียด"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleEdit(project)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setProjectToDelete(project.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="ลบโครงการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modern Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-50 text-brand-red">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">แก้ไขข้อมูลโครงการ</h2>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                  <span>ชื่อโครงการ</span>
                </label>
                <input
                  type="text"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red outline-none transition-all"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  <span>สถานะโครงการ</span>
                </label>
                <select
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red outline-none transition-all cursor-pointer"
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="PENDING_REVIEW">รอการพิจารณา (Pending Review)</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการ (In Progress)</option>
                  <option value="ON_HOLD">ระงับชั่วคราว (On Hold)</option>
                  <option value="COMPLETED">เสร็จสิ้น (Completed)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-slate-400" />
                  <span>ความเร่งด่วน</span>
                </label>
                <select
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red outline-none transition-all cursor-pointer"
                  value={editFormData.urgency}
                  onChange={e => setEditFormData({ ...editFormData, urgency: e.target.value })}
                >
                  <option value="Normal">ปกติ (Normal)</option>
                  <option value="High">ด่วน (High)</option>
                  <option value="Urgent">ด่วนมาก (Urgent)</option>
                </select>
              </div>

              {editFormData.status === 'COMPLETED' && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>วันที่เสร็จสิ้นโครงการ</span>
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-brand-red outline-none transition-all"
                    value={editFormData.completedAt}
                    onChange={e => setEditFormData({ ...editFormData, completedAt: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-brand-red text-white rounded-xl hover:bg-red-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>บันทึกการเปลี่ยนแปลง</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Delete Confirmation Dialog */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-sm text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 mb-4 border border-rose-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">ยืนยันการลบโครงการ</h3>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบโครงการนี้? ข้อมูลงานย่อย (Tasks) และบันทึกกิจกรรมทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
            </p>

            <div className="flex justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-2xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <span>ยืนยันการลบ</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
