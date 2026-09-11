"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  KanbanSquare,
  Plus,
  Search,
  X,
  RotateCcw,
  User,
  UserCheck,
  Layers,
  Tag,
  Loader2,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  Briefcase,
  FileCheck2,
  Filter,
  Workflow,
  ChevronRight,
  FolderKanban,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { getBDKanbanProjects, updateBDProject, acceptBDProject, getBDWorkflowTemplates } from '@/app/actions/bd';
import KanbanCard, { stripEmojis } from './KanbanCard';
import SortableColumn from './SortableColumn';
import BDProjectDetailView from '../projects/[id]/BDProjectDetailView';

const COLUMNS = [
  { id: 'PENDING_REVIEW', title: 'รอการพิจารณา (Pending)' },
  { id: 'IN_PROGRESS', title: 'กำลังดำเนินการ (In Progress)' },
  { id: 'ON_HOLD', title: 'ระงับชั่วคราว (On Hold)' },
  { id: 'COMPLETED', title: 'เสร็จสิ้น (Completed)' },
];

export default function KanbanBoardClient({ currentUser }: { currentUser: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Accept Modal State
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [pendingAcceptProject, setPendingAcceptProject] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [accepting, setAccepting] = useState(false);

  // Detail Modal State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Active Drag State
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterWorkType, setFilterWorkType] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchProjects = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await getBDKanbanProjects();
      if (res.success) {
        setProjects(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await getBDWorkflowTemplates();
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchProjects(false);
    fetchTemplates();
  }, [fetchProjects, fetchTemplates]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => {
      if (p.owner) map.set(p.owner.id, stripEmojis(p.owner.fullName));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const uniqueWorkTypes = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => {
      if (p.workType) map.set(p.workType.id, stripEmojis(p.workType.name));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects]);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.tags) {
        p.tags.forEach((t: string) => {
          const cleaned = stripEmojis(t);
          if (cleaned) set.add(cleaned);
        });
      }
    });
    return Array.from(set);
  }, [projects]);

  // Handle My Tasks quick toggle
  const toggleMyTasks = () => {
    if (!currentUser?.id) return;
    if (myTasksOnly) {
      setMyTasksOnly(false);
      setFilterAssignee('');
    } else {
      setMyTasksOnly(true);
      setFilterAssignee(currentUser.id);
    }
  };

  const handleAssigneeChange = (val: string) => {
    setFilterAssignee(val);
    if (val === currentUser?.id) {
      setMyTasksOnly(true);
    } else {
      setMyTasksOnly(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterAssignee('');
    setFilterWorkType('');
    setFilterTag('');
    setMyTasksOnly(false);
    setStatusFilter('');
  };

  const hasActiveFilters = Boolean(
    searchQuery || filterAssignee || filterWorkType || filterTag || myTasksOnly || statusFilter
  );

  // Status Metrics
  const metrics = useMemo(() => {
    const pending = projects.filter(p => p.status === 'PENDING_REVIEW').length;
    const inProgress = projects.filter(p => p.status === 'IN_PROGRESS').length;
    const onHold = projects.filter(p => p.status === 'ON_HOLD').length;
    const completed = projects.filter(p => p.status === 'COMPLETED').length;
    return {
      total: projects.length,
      pending,
      inProgress,
      onHold,
      completed,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      if (filterAssignee && p.ownerId !== filterAssignee) return false;
      if (filterWorkType && p.workTypeId !== filterWorkType) return false;
      if (filterTag && !(p.tags || []).includes(filterTag)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, searchQuery, filterAssignee, filterWorkType, filterTag, statusFilter]);

  const columnsData = useMemo(() => {
    const data: Record<string, any[]> = {
      PENDING_REVIEW: [],
      IN_PROGRESS: [],
      ON_HOLD: [],
      COMPLETED: []
    };

    filteredProjects.forEach(p => {
      if (data[p.status]) {
        data[p.status].push(p);
      }
    });

    return data;
  }, [filteredProjects]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Rely on dragEnd to prevent flicker
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Find target column
    let overId = over.id as string;
    let targetStatus = overId;

    if (!COLUMNS.find(c => c.id === overId)) {
      const overProject = projects.find(p => p.id === overId);
      if (overProject) {
        targetStatus = overProject.status;
      }
    }

    if (!COLUMNS.find(c => c.id === targetStatus)) return;
    if (project.status === targetStatus) return;

    const sourceStatus = project.status;

    // 1. Moving from COMPLETED to something else
    if (sourceStatus === 'COMPLETED' && targetStatus !== 'COMPLETED') {
      const confirmed = window.confirm("คุณต้องการเปิดงานนี้ใหม่อีกครั้งใช่หรือไม่? (Do you want to reopen this job?)");
      if (!confirmed) return;
    }

    // 2. Moving to COMPLETED: Block if sub-projects are incomplete
    if (targetStatus === 'COMPLETED') {
      const subProjects = project.subProjects || [];
      const incompleteSubProjects = subProjects.filter((sp: any) => sp.status !== 'COMPLETED');
      if (incompleteSubProjects.length > 0) {
        alert(`ไม่สามารถทำเครื่องหมายว่าเสร็จสิ้นได้ เนื่องจากยังมี ${incompleteSubProjects.length} โครงการย่อยที่ยังไม่เสร็จสิ้น`);
        return;
      }
    }

    // 3. Moving from PENDING_REVIEW to IN_PROGRESS
    if (sourceStatus === 'PENDING_REVIEW' && targetStatus === 'IN_PROGRESS') {
      setPendingAcceptProject(project);

      // Select default template if available
      const workTypeMatch = templates.find(t => t.workTypes?.some((wt: any) => wt.id === project.workTypeId));
      if (workTypeMatch) setSelectedTemplateId(workTypeMatch.id);
      else setSelectedTemplateId('');

      setShowAcceptModal(true);
      return;
    }

    // Optimistic Update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: targetStatus } : p));

    // Call API for normal status changes
    const res = await updateBDProject(projectId, { status: targetStatus });
    if (!res.success) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะงาน");
      fetchProjects(true);
    }
  };

  const handleAcceptBrief = async () => {
    if (!pendingAcceptProject) return;
    setAccepting(true);

    const res = await acceptBDProject(pendingAcceptProject.id, selectedTemplateId || undefined);

    setAccepting(false);
    if (res.success) {
      setShowAcceptModal(false);
      setPendingAcceptProject(null);
      fetchProjects(true);
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการรับงาน');
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptModal(false);
    setPendingAcceptProject(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col h-screen overflow-hidden">
      {/* Top Navigation & Breadcrumbs Strip */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 shrink-0 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Title Area */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-red-500/20 text-white flex items-center justify-center shrink-0">
              <KanbanSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Link href="/bd/dashboard" className="hover:text-red-600 transition-colors">Business Development</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800">กระดานงาน BD (Kanban)</span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                  กระดานงาน BD (Kanban Board)
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Real-time Flow
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Navigation links */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/bd/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">แดชบอร์ด</span>
            </Link>

            <Link
              href="/bd/my-work"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">งานของฉัน</span>
            </Link>

            <button
              onClick={() => fetchProjects(false)}
              disabled={refreshing}
              title="รีเฟรชข้อมูล"
              className="p-2 rounded-xl text-slate-500 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-all shadow-2xs"
            >
              <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>

            <Link
              href="/bd/intake"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-sm shadow-red-500/25 transition-all hover:shadow-md hover:shadow-red-500/35 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างบรีฟใหม่</span>
            </Link>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Total */}
          <button
            onClick={() => setStatusFilter('')}
            className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
              statusFilter === ''
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200/70 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${statusFilter === '' ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <FolderKanban className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold truncate">ทั้งหมด</span>
            </div>
            <span className="text-xs font-bold ml-1">{metrics.total}</span>
          </button>

          {/* Pending Review */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'PENDING_REVIEW' ? '' : 'PENDING_REVIEW')}
            className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
              statusFilter === 'PENDING_REVIEW'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50/50 hover:bg-amber-100/50 border-amber-200/60 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${statusFilter === 'PENDING_REVIEW' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold truncate">รอพิจารณา</span>
            </div>
            <span className="text-xs font-bold ml-1">{metrics.pending}</span>
          </button>

          {/* In Progress */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
            className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-blue-50/50 hover:bg-blue-100/50 border-blue-200/60 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${statusFilter === 'IN_PROGRESS' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold truncate">กำลังทำ</span>
            </div>
            <span className="text-xs font-bold ml-1">{metrics.inProgress}</span>
          </button>

          {/* On Hold */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'ON_HOLD' ? '' : 'ON_HOLD')}
            className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
              statusFilter === 'ON_HOLD'
                ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                : 'bg-slate-100/70 hover:bg-slate-200/70 border-slate-200/80 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${statusFilter === 'ON_HOLD' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold truncate">ระงับชั่วคราว</span>
            </div>
            <span className="text-xs font-bold ml-1">{metrics.onHold}</span>
          </button>

          {/* Completed */}
          <button
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED')}
            className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50/50 hover:bg-emerald-100/50 border-emerald-200/60 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${statusFilter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold truncate">เสร็จสิ้น</span>
            </div>
            <span className="text-xs font-bold ml-1">{metrics.completed}</span>
          </button>
        </div>
      </header>

      {/* Filter & Search Toolbar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-6 py-2.5 flex flex-wrap gap-2.5 items-center justify-between shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโปรเจกต์ หรือรหัส..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-400"
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

          {/* Quick "My Tasks" Button */}
          {currentUser?.id && (
            <button
              onClick={toggleMyTasks}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                myTasksOnly
                  ? 'bg-red-500 text-white border-red-500 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>งานของฉัน</span>
            </button>
          )}

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={filterAssignee}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="py-1.5 pl-8 pr-7 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">ผู้รับผิดชอบทั้งหมด</option>
              {uniqueAssignees.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Work Type Filter */}
          <div className="relative">
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              className="py-1.5 pl-8 pr-7 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">ประเภทงานทั้งหมด</option>
              {uniqueWorkTypes.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Tags Filter */}
          {uniqueTags.length > 0 && (
            <div className="relative">
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="py-1.5 pl-8 pr-7 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">แท็กทั้งหมด</option>
                {uniqueTags.map(t => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
              <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>

        {/* Count Label */}
        <div className="text-xs font-medium text-slate-500">
          แสดง <span className="font-bold text-slate-800">{filteredProjects.length}</span> จาก {projects.length} งาน
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-sm font-medium text-slate-500">กำลังโหลดข้อมูลกระดานงาน BD...</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-5 h-full items-start pb-2">
              {COLUMNS.map(column => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  projects={columnsData[column.id]}
                >
                  <div className="flex flex-col gap-3 min-h-[150px]">
                    <SortableContext items={columnsData[column.id].map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {columnsData[column.id].map(project => (
                        <KanbanCard
                          key={project.id}
                          project={project}
                          onClick={(id) => setSelectedProjectId(id)}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </SortableColumn>
              ))}
            </div>
          </DndContext>
        )}
      </div>

      {/* Slide-over Detail Modal */}
      {selectedProjectId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[80] flex justify-end transition-opacity">
          <div className="bg-white w-full max-w-5xl h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <BDProjectDetailView
              id={selectedProjectId}
              isModal={true}
              onClose={() => {
                setSelectedProjectId(null);
                fetchProjects(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Accept Brief Modal */}
      {showAcceptModal && pendingAcceptProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">รับมอบหมายงาน (Accept Brief)</h2>
                <p className="text-xs text-slate-500">ย้ายสถานะไปยังขั้นตอน "กำลังดำเนินการ"</p>
              </div>
            </div>

            {/* Target Project Card */}
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {stripEmojis(pendingAcceptProject.code) || 'BD-PROJECT'}
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1 line-clamp-1">
                {stripEmojis(pendingAcceptProject.name)}
              </h4>
              {pendingAcceptProject.workType && (
                <span className="inline-block text-xs text-blue-600 font-medium">
                  {stripEmojis(pendingAcceptProject.workType.name)}
                </span>
              )}
            </div>

            {/* Template Selection */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Workflow className="w-4 h-4 text-slate-500" />
                เลือก Workflow Template
              </label>
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl p-3 pr-8 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">-- ไม่ใช้ Template (สร้างรายการงานเองภายหลัง) --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {stripEmojis(t.name)} ({t.tasks?.length || 0} ขั้นตอน)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                เมื่อเลือก Template ระบบจะสร้างรายการงาน (Tasks) ย่อยตามขั้นตอนที่กำหนดไว้โดยอัตโนมัติ
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelAccept}
                disabled={accepting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAcceptBrief}
                disabled={accepting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                ยืนยันการรับงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
