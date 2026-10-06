"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  getBDProjectDetails, 
  acceptBDProject, 
  getBDWorkflowTemplates, 
  updateBDProject, 
  addBDComment, 
  claimBDBrief, 
  releaseBDBrief, 
  createBDTask, 
  getAllUsersForBD 
} from '@/app/actions/bd';
import Link from 'next/link';
import BDTaskItem from './BDTaskItem';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Users, 
  User as UserIcon, 
  Layers, 
  Tag as TagIcon, 
  Plus, 
  Search, 
  Edit3, 
  MessageSquare, 
  AlertTriangle, 
  Check, 
  X, 
  ChevronRight, 
  Send, 
  ListChecks, 
  Briefcase, 
  ShieldAlert, 
  Trash2, 
  Filter, 
  Sparkles, 
  ExternalLink,
  FolderGit2,
  Share2,
  FileText,
  Activity as ActivityIcon
} from 'lucide-react';

export default function BDProjectDetailView({ id, isModal = false, onClose }: { id: string; isModal?: boolean; onClose?: () => void }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showAutoCompletePrompt, setShowAutoCompletePrompt] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showOnlyBD, setShowOnlyBD] = useState(true);

  // Add Task Modal State
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskChecklist, setNewTaskChecklist] = useState<string[]>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Tags State
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Mentions State
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter States for Tasks and Subprojects
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [subProjectSearch, setSubProjectSearch] = useState('');
  const [subProjectFilter, setSubProjectFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const loadData = async () => {
    const res = await getBDProjectDetails(id);
    if (res.success && res.data) {
      setProject(res.data);
      checkAutoCompleteConditions(res.data);
    } else {
      setError(res.error || 'Failed to load project details');
    }
    setLoading(false);
    
    const tRes = await getBDWorkflowTemplates();
    if (tRes.success && tRes.data) {
      setTemplates(tRes.data);
    }

    const uRes = await getAllUsersForBD();
    if (uRes.success && uRes.data) {
      setAllUsers(uRes.data);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const checkAutoCompleteConditions = (projData: any) => {
    if (!projData.tasks || projData.tasks.length === 0) return;
    if (projData.status === 'COMPLETED' || projData.status === 'ON_HOLD') return;

    const allFinished = projData.tasks.every((t: any) => t.status === 'COMPLETED' || t.status === 'SKIPPED');
    const noBlocked = projData.tasks.every((t: any) => !t.blockedReason);

    if (allFinished && noBlocked) {
      setShowAutoCompletePrompt(true);
    }
  };

  const handleCompleteProject = async () => {
    if (project.subProjects && project.subProjects.length > 0) {
      const incomplete = project.subProjects.filter((sp: any) => sp.status !== 'COMPLETED');
      if (incomplete.length > 0) {
        alert(`ไม่สามารถปิดโครงการนี้ได้ เนื่องจากมี ${incomplete.length} โครงการย่อยที่ยังไม่เสร็จสิ้น`);
        return;
      }
    }

    const res = await updateBDProject(id, { status: 'COMPLETED' });
    if (res.success) {
      setShowAutoCompletePrompt(false);
      loadData();
    } else {
      alert(res.error || 'Failed to complete project');
    }
  };

  const handleAccept = async () => {
    const res = await acceptBDProject(id, selectedTemplateId || undefined);
    if (res.success) {
      setLoading(true);
      const projRes = await getBDProjectDetails(id);
      if (projRes.success && projRes.data) setProject(projRes.data);
      setLoading(false);
      setShowAcceptModal(false);
    } else {
      alert(res.error || 'Failed to accept project');
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    const res = await addBDComment(id, commentText, mentionedUserIds);
    if (res.success) {
      setCommentText('');
      setMentionedUserIds([]);
      loadData();
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const lastWord = textBeforeCursor.split(/[\s\n]+/).pop();

    if (lastWord && lastWord.startsWith('@')) {
      setShowMentionMenu(true);
      setMentionQuery(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleMentionSelect = (user: any) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = commentText.slice(0, cursorPosition);
    const textAfterCursor = commentText.slice(cursorPosition);
    const lastWordIndex = textBeforeCursor.lastIndexOf('@');
    
    const newTextBefore = textBeforeCursor.slice(0, lastWordIndex);
    const newText = `${newTextBefore}@${user.fullName} ${textAfterCursor}`;
    setCommentText(newText);
    setShowMentionMenu(false);
    
    if (!mentionedUserIds.includes(user.id)) {
      setMentionedUserIds([...mentionedUserIds, user.id]);
    }
    textareaRef.current?.focus();
  };

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const tag = newTag.trim();
      const currentTags = project.tags || [];
      if (!currentTags.includes(tag)) {
        const updatedTags = [...currentTags, tag];
        const res = await updateBDProject(id, { tags: updatedTags });
        if (res.success) {
          setProject({ ...project, tags: updatedTags });
          setNewTag('');
          setIsAddingTag(false);
        }
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const currentTags = project.tags || [];
    const updatedTags = currentTags.filter((t: string) => t !== tagToRemove);
    const res = await updateBDProject(id, { tags: updatedTags });
    if (res.success) {
      setProject({ ...project, tags: updatedTags });
    }
  };

  const handleClaimBrief = async () => {
    const res = await claimBDBrief(id);
    if (res.success) {
      loadData();
      setSelectedTemplateId(project.workType?.defaultTemplateId || '');
      setShowAcceptModal(true);
    } else {
      alert(res.error || 'Failed to claim brief');
    }
  };

  const handleReleaseBrief = async () => {
    if (!confirm('ยืนยันที่จะปล่อยโครงการนี้กลับสู่ส่วนกลางหรือไม่?')) return;
    const res = await releaseBDBrief(id);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || 'Failed to release brief');
    }
  };

  const startEdit = () => {
    setEditForm({
      name: project.name,
      objective: project.objective || '',
      urgency: project.urgency || 'Normal',
      deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
      intakeDate: project.intakeDate ? new Date(project.intakeDate).toISOString().split('T')[0] : '',
      color: project.color || '#ffffff',
      memberIds: project.members ? project.members.map((m: any) => m.id) : []
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    const res = await updateBDProject(id, {
      name: editForm.name,
      objective: editForm.objective,
      urgency: editForm.urgency,
      deadline: editForm.deadline ? new Date(editForm.deadline) : null,
      intakeDate: editForm.intakeDate ? new Date(editForm.intakeDate) : null,
      color: editForm.color !== '#ffffff' ? editForm.color : null,
      memberIds: editForm.memberIds,
    });
    setSavingEdit(false);
    
    if (res.success) {
      setIsEditing(false);
      loadData();
    } else {
      alert(res.error || 'Failed to update project');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    setAddingTask(true);
    
    const checklistPayload = newTaskChecklist.length > 0 ? newTaskChecklist.map((label, idx) => ({
      id: `chk_${Date.now()}_${idx}`,
      label,
      checked: false
    })) : undefined;

    const res = await createBDTask(id, newTaskName, checklistPayload);
    setAddingTask(false);
    if (res.success) {
      setShowAddTaskModal(false);
      setNewTaskName('');
      setNewTaskChecklist([]);
      setNewChecklistItemText('');
      loadData();
    } else {
      alert(res.error || 'Failed to add task');
    }
  };

  // Metrics & Stats
  const totalTasks = project?.tasks?.length || 0;
  const completedTasks = project?.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
  const activeTasks = project?.tasks?.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalSubProjects = project?.subProjects?.length || 0;
  const completedSubProjects = project?.subProjects?.filter((sp: any) => sp.status === 'COMPLETED').length || 0;
  const activeSubProjects = project?.subProjects?.filter((sp: any) => sp.status === 'IN_PROGRESS' || sp.status === 'PENDING_REVIEW').length || 0;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!project?.tasks) return [];
    if (taskFilter === 'COMPLETED') return project.tasks.filter((t: any) => t.status === 'COMPLETED');
    if (taskFilter === 'ACTIVE') return project.tasks.filter((t: any) => t.status !== 'COMPLETED');
    return project.tasks;
  }, [project?.tasks, taskFilter]);

  // Filtered Subprojects
  const filteredSubProjects = useMemo(() => {
    if (!project?.subProjects) return [];
    return project.subProjects.filter((sp: any) => {
      const matchesSearch = subProjectSearch === '' || sp.name.toLowerCase().includes(subProjectSearch.toLowerCase()) || sp.owner?.fullName?.toLowerCase().includes(subProjectSearch.toLowerCase());
      const matchesFilter = 
        subProjectFilter === 'ALL' ? true :
        subProjectFilter === 'COMPLETED' ? sp.status === 'COMPLETED' :
        sp.status !== 'COMPLETED';
      return matchesSearch && matchesFilter;
    });
  }, [project?.subProjects, subProjectSearch, subProjectFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-700 font-medium text-sm">กำลังโหลดข้อมูลโครงการ...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-sm flex flex-col items-center gap-3 text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">ไม่พบข้อมูลโครงการ</h2>
          <p className="text-gray-500 text-sm">{error || 'ไม่พบโครงการที่ค้นหาในระบบ'}</p>
          <Link href="/bd/dashboard" className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับสู่แดชบอร์ด
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isModal ? 'p-4 md:p-6' : 'min-h-screen bg-gray-50/80 p-4 md:p-8'}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. TOP COMMAND BAR (SYMMETRICAL HEADER) */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left Header Wing */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {!isModal && (
                  <Link 
                    href="/bd/dashboard" 
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors bg-gray-100/70 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200/60"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> แดชบอร์ด
                  </Link>
                )}

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  project.status === 'IN_PROGRESS' 
                    ? 'bg-red-600 text-white border-red-600 shadow-xs shadow-red-200' 
                    : project.status === 'COMPLETED' 
                      ? 'bg-gray-900 text-white border-gray-900' 
                      : project.status === 'ON_HOLD' 
                        ? 'bg-white text-red-600 border-red-500' 
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {project.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : project.status === 'COMPLETED' ? 'เสร็จสิ้น' : project.status === 'ON_HOLD' ? 'ระงับชั่วคราว' : 'รอตรวจสอบ'}
                </span>

                {/* Urgency Badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  project.urgency === 'Urgent' 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : project.urgency === 'High' 
                      ? 'bg-red-50/70 text-red-600 border-red-200' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  ความเร่งด่วน: {project.urgency === 'Urgent' ? 'ด่วนมาก' : project.urgency === 'High' ? 'ด่วน' : 'ปกติ'}
                </span>

                {/* Work Type Pill */}
                {project.workType && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    ประเภท: <strong className="text-gray-900">{project.workType.name}</strong>
                  </span>
                )}
              </div>

              {/* Sub-project Parent Navigation */}
              {project.parent && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>โครงการย่อยของ:</span>
                  <Link 
                    href={`/bd/projects/${project.parent.id}`} 
                    className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 hover:underline"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    {project.parent.name}
                  </Link>
                </div>
              )}

              {/* Project Title */}
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {project.name}
                </h1>
              </div>

              {/* Lead / Requester Meta */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>ผู้รับผิดชอบหลัก:</span>
                  <span className="font-semibold text-gray-800">
                    {project.owner?.fullName || 'ยังไม่กำหนด (Unassigned)'}
                  </span>
                </div>
                <div className="hidden sm:inline-block text-gray-300">|</div>
                <div className="flex items-center gap-1.5">
                  <span>ผู้ขอเปิด:</span>
                  <span className="font-semibold text-gray-800">{project.requester?.fullName || '-'}</span>
                </div>
              </div>
            </div>

            {/* Right Action Wing */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button 
                onClick={startEdit} 
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-all shadow-xs active:scale-98"
              >
                <Edit3 className="w-4 h-4 text-gray-500" />
                แก้ไขโครงการ
              </button>

              {/* Claim Button */}
              {project.ownerId === null && (
                <button 
                  onClick={handleClaimBrief}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-xs shadow-red-200 transition-all active:scale-98"
                >
                  <UserIcon className="w-4 h-4" />
                  {project.status === 'PENDING_REVIEW' ? 'รับบรีฟ (Claim)' : 'รับเป็นผู้รับผิดชอบ'}
                </button>
              )}

              {/* Accept & Release when pending */}
              {project.status === 'PENDING_REVIEW' && project.ownerId !== null && (
                <>
                  <button 
                    onClick={() => {
                      setSelectedTemplateId(project.workType?.defaultTemplateId || '');
                      setShowAcceptModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-xs shadow-red-200 transition-all active:scale-98"
                  >
                    <Check className="w-4 h-4" /> รับบรีฟ
                  </button>
                  <button 
                    onClick={handleReleaseBrief}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-xl text-sm font-semibold transition-all active:scale-98"
                  >
                    สละสิทธิ์ (Release)
                  </button>
                </>
              )}

              {/* Complete manually if needed */}
              {project.status === 'IN_PROGRESS' && (
                <button 
                  onClick={handleCompleteProject}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 text-gray-300" />
                  ปิดโครงการ
                </button>
              )}

              {isModal && onClose && (
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* 2. ON_HOLD BLOCKED WARNING NOTIFICATION */}
        {project.status === 'ON_HOLD' && project.blockedReason && (
          <div className="bg-red-50/90 border border-red-200/90 p-4 rounded-2xl flex items-start gap-3.5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900">โครงการนี้ถูกระงับชั่วคราว (On Hold)</h3>
              <p className="text-xs text-red-800 mt-0.5">
                <strong>สาเหตุ:</strong> {project.blockedReason} | <strong>รอจาก:</strong> {project.waitingOn || 'บุคคลภายนอก'}
              </p>
            </div>
          </div>
        )}

        {/* 3. SYMMETRICAL 4-METRIC KPI DASHBOARD TILES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Tile 1: Progress */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">ความคืบหน้ารวม</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <ListChecks className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold text-gray-900">{progressPercent}%</span>
                <span className="text-xs text-gray-500 font-medium">({completedTasks}/{totalTasks} งาน)</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
                <div 
                  className="h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tile 2: Status & Urgency */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะโครงการ</span>
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                {project.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : project.status}
              </div>
              <p className="text-xs text-gray-500">
                รับงาน: {project.intakeDate ? new Date(project.intakeDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
              </p>
            </div>
          </div>

          {/* Tile 3: Sub-projects Summary */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">โครงการย่อย</span>
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-extrabold text-gray-900">{totalSubProjects}</span>
                <span className="text-xs text-gray-500 font-medium">โครงการย่อย</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-gray-900 font-semibold">{completedSubProjects} เสร็จสิ้น</span>
                <span>•</span>
                <span className="text-red-600 font-semibold">{activeSubProjects} กำลังทำ</span>
              </div>
            </div>
          </div>

          {/* Tile 4: Team & Assignees */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">ทีมงานรับผิดชอบ</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 truncate mb-1">
                {project.owner?.fullName || 'ยังไม่มี Lead'}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {project.members && project.members.length > 0 
                  ? `ร่วมกับสมาชิกอีก ${project.members.length} คน` 
                  : 'ยังไม่มีสมาชิกเพิ่มเติม'}
              </p>
            </div>
          </div>

        </div>

        {/* 4. SYMMETRICAL 2-COLUMN MAIN BODY (50% / 50% SPLIT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* ======================================================== */}
          {/* LEFT WING: PROJECT SCOPE & TASK WORKFLOW                  */}
          {/* ======================================================== */}
          <div className="space-y-6">
            
            {/* Card 1: Project Scope & Metadata */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">วัตถุประสงค์และรายละเอียด</h2>
                    <p className="text-xs text-gray-500">ขอบเขตงานและเป้าหมายของโครงการ</p>
                  </div>
                </div>
                <button 
                  onClick={startEdit}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> แก้ไข
                </button>
              </div>

              {/* Objective Text */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/60 mb-5">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {project.objective || 'ไม่มีการระบุวัตถุประสงค์'}
                </p>
              </div>

              {/* Symmetrical 2x2 Meta Grid */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">ประเภทงาน</span>
                  <span className="text-xs font-semibold text-gray-900">{project.workType?.name || '-'}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">ผู้ขอเปิดงาน</span>
                  <span className="text-xs font-semibold text-gray-900">{project.requester?.fullName || '-'}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">วันที่รับงาน (Intake)</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {project.intakeDate ? new Date(project.intakeDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50/60 border border-gray-100">
                  <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">กำหนดส่ง (Deadline)</span>
                  <span className={`text-xs font-semibold ${project.deadline ? 'text-red-600' : 'text-gray-900'}`}>
                    {project.deadline ? new Date(project.deadline).toLocaleDateString('th-TH') : 'ไม่มีกำหนด'}
                  </span>
                </div>
              </div>

              {/* Project Tags Section */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-gray-400" /> แท็กโครงการ (Tags)
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5">
                  {(project.tags || []).map((tag: string) => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200/80 group"
                    >
                      <span>{tag}</span>
                      <button 
                        onClick={() => handleRemoveTag(tag)} 
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="ลบแท็ก"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        placeholder="พิมพ์แท็ก..."
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={handleAddTag}
                        autoFocus
                        className="w-24 text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                      <button 
                        onClick={() => setIsAddingTag(false)} 
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingTag(true)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50/70 hover:bg-red-50 border border-red-200/70 px-2.5 py-1 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" /> เพิ่มแท็ก
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Workflow & Tasks Management */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6">
              
              {/* Task Header with symmetrical controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">ขั้นตอนการทำงาน (Tasks)</h2>
                    <p className="text-xs text-gray-500">จัดการลำดับงานและความคืบหน้า</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAddTaskModal(true)} 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-red-200 transition-all active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มงาน
                  </button>
                </div>
              </div>

              {/* Task Filter Pills */}
              <div className="flex items-center gap-1.5 my-4">
                <button 
                  onClick={() => setTaskFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    taskFilter === 'ALL' 
                      ? 'bg-red-600 text-white shadow-xs' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  ทั้งหมด ({totalTasks})
                </button>
                <button 
                  onClick={() => setTaskFilter('ACTIVE')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    taskFilter === 'ACTIVE' 
                      ? 'bg-red-600 text-white shadow-xs' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  กำลังทำ ({activeTasks})
                </button>
                <button 
                  onClick={() => setTaskFilter('COMPLETED')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    taskFilter === 'COMPLETED' 
                      ? 'bg-red-600 text-white shadow-xs' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  เสร็จสิ้น ({completedTasks})
                </button>
              </div>

              {/* Task Items List */}
              {filteredTasks.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
                  <ListChecks className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">ไม่มีรายการงานในตัวกรองนี้</p>
                  <p className="text-xs text-gray-400 mt-0.5">คุณสามารถกดปุ่ม "เพิ่มงาน" เพื่อสร้างขั้นตอนการทำงานใหม่</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task: any) => (
                    <BDTaskItem key={task.id} task={task} onTaskUpdated={loadData} />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT WING: SUB-PROJECTS & ACTIVITIES                      */}
          {/* ======================================================== */}
          <div className="space-y-6">
            
            {/* Card 3: Sub-projects Directory (12 Subprojects) */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6">
              
              {/* Symmetrical Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900">โครงการย่อย (Sub-projects)</h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        {totalSubProjects}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">ระบบงานย่อยที่อยู่ภายใต้โครงการหลักนี้</p>
                  </div>
                </div>

                <Link 
                  href={`/bd/intake?parentId=${project.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-200/80 rounded-xl text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มโครงการย่อย
                </Link>
              </div>

              {/* Search & Filter Bar */}
              <div className="my-4 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="ค้นหาชื่อระบบย่อย หรือผู้รับผิดชอบ..."
                    value={subProjectSearch}
                    onChange={e => setSubProjectSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
                  />
                  {subProjectSearch && (
                    <button 
                      onClick={() => setSubProjectSearch('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setSubProjectFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      subProjectFilter === 'ALL' 
                        ? 'bg-red-600 text-white shadow-xs' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                    }`}
                  >
                    ทั้งหมด ({totalSubProjects})
                  </button>
                  <button 
                    onClick={() => setSubProjectFilter('IN_PROGRESS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      subProjectFilter === 'IN_PROGRESS' 
                        ? 'bg-red-600 text-white shadow-xs' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                    }`}
                  >
                    กำลังดำเนินการ ({activeSubProjects})
                  </button>
                  <button 
                    onClick={() => setSubProjectFilter('COMPLETED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      subProjectFilter === 'COMPLETED' 
                        ? 'bg-red-600 text-white shadow-xs' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                    }`}
                  >
                    เสร็จสิ้น ({completedSubProjects})
                  </button>
                </div>
              </div>

              {/* Sub-projects Scrollable Card Container */}
              {filteredSubProjects.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
                  <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">ไม่พบโครงการย่อย</p>
                  <p className="text-xs text-gray-400 mt-0.5">ลองปรับคำค้นหา หรือกดเพิ่มโครงการย่อยใหม่</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredSubProjects.map((sp: any) => {
                    const isSpCompleted = sp.status === 'COMPLETED';
                    return (
                      <Link 
                        key={sp.id} 
                        href={`/bd/projects/${sp.id}`}
                        className="group block p-3.5 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/20 bg-white transition-all shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                isSpCompleted ? 'bg-gray-900' : 'bg-red-600'
                              }`} />
                              <h4 className="font-semibold text-sm text-gray-900 group-hover:text-red-600 transition-colors truncate">
                                {sp.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 pl-4">
                              <UserIcon className="w-3 h-3 text-gray-400" />
                              <span className="truncate">{sp.owner?.fullName || 'ยังไม่กำหนด'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${
                              isSpCompleted 
                                ? 'bg-gray-900 text-white border-gray-900' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {isSpCompleted ? 'เสร็จสิ้น' : 'กำลังทำ'}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card 4: Activity Log & Discussion Stream */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">บันทึกกิจกรรมและการสื่อสาร</h2>
                    <p className="text-xs text-gray-500">ประวัติการทำงานและความคิดเห็น ({project.activities?.length || 0})</p>
                  </div>
                </div>
              </div>

              {/* Discussion Composer */}
              <div className="my-4 relative">
                <textarea 
                  ref={textareaRef}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-gray-400 resize-none bg-gray-50/50 focus:bg-white" 
                  placeholder="เขียนความคิดเห็นหรือบันทึกงาน (พิมพ์ @ เพื่อแท็กเพื่อนร่วมทีม)..."
                  rows={3}
                  value={commentText}
                  onChange={handleCommentChange}
                />
                
                {/* Mention Autocomplete Dropdown */}
                {showMentionMenu && (
                  <div className="absolute bottom-full mb-1 left-0 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-xl z-20">
                    <div className="p-2 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase">
                      แท็กเพื่อนร่วมงาน
                    </div>
                    {allUsers.filter(u => u.fullName.toLowerCase().includes(mentionQuery)).length > 0 ? (
                      allUsers.filter(u => u.fullName.toLowerCase().includes(mentionQuery)).map(u => (
                        <div 
                          key={u.id} 
                          onClick={() => handleMentionSelect(u)}
                          className="px-3 py-2 hover:bg-red-50 cursor-pointer text-xs flex items-center gap-2 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px]">
                            {u.fullName.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-800">{u.fullName}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-400">ไม่พบรายชื่อที่ค้นหา</div>
                    )}
                  </div>
                )}

                <div className="mt-2 flex justify-end">
                  <button 
                    onClick={handlePostComment}
                    disabled={!commentText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shadow-red-200 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Send className="w-3.5 h-3.5" />
                    ส่งความคิดเห็น
                  </button>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="pt-2 border-t border-gray-100">
                {project.activities && project.activities.length > 0 ? (
                  <div className="max-h-[360px] overflow-y-auto pr-1 space-y-4">
                    {project.activities.map((activity: any, idx: number) => (
                      <div key={activity.id} className="flex gap-3 text-xs">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {activity.user?.fullName ? activity.user.fullName.charAt(0) : 'U'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{activity.user?.fullName}</span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(activity.createdAt).toLocaleDateString('th-TH', { 
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          <p className="text-gray-700">
                            {activity.action.replace('_', ' ').toLowerCase()}
                          </p>

                          {activity.details && (
                            <div className="mt-1.5 p-2 bg-white rounded-lg border border-gray-200/80 text-gray-800 text-xs">
                              {activity.details}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-6">ยังไม่มีประวัติกิจกรรม</p>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* MODALS SECTION (RED, WHITE, GRAY STYLED)                 */}
      {/* ======================================================== */}

      {/* 1. ACCEPT BRIEF MODAL */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">รับมอบหมายงาน (Accept Brief)</h2>
                <p className="text-xs text-gray-500">เลือก Template สำหรับสร้างรายการงานเริ่มต้น</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Workflow Template
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">-- ไม่ใช้ Template (สร้างงานเองภายหลัง) --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-2.5">
              <button 
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAccept}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-xs shadow-red-200"
              >
                ยืนยันการรับงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT DETAILS MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">แก้ไขรายละเอียดโครงการ</h2>
                  <p className="text-xs text-gray-500">ปรับปรุงข้อมูลทั่วไป ขอบเขตงาน และทีมงาน</p>
                </div>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">ชื่อโครงการ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">วัตถุประสงค์ / รายละเอียด</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-28 resize-none"
                  value={editForm.objective}
                  onChange={e => setEditForm({...editForm, objective: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">ความเร่งด่วน</label>
                  <select 
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                    value={editForm.urgency}
                    onChange={e => setEditForm({...editForm, urgency: e.target.value})}
                  >
                    <option value="Normal">ปกติ (Normal)</option>
                    <option value="High">ด่วน (High)</option>
                    <option value="Urgent">ด่วนมาก (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">วันที่รับงาน (Intake Date)</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                    value={editForm.intakeDate}
                    onChange={e => setEditForm({...editForm, intakeDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">กำหนดส่ง (Deadline)</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                    value={editForm.deadline}
                    onChange={e => setEditForm({...editForm, deadline: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">สีการ์ดโครงการ (Color)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-12 h-10 border border-gray-300 rounded-xl cursor-pointer p-0.5 bg-white"
                      value={editForm.color || '#ffffff'}
                      onChange={e => setEditForm({...editForm, color: e.target.value})}
                    />
                    <span className="text-xs font-mono uppercase text-gray-600">{editForm.color || '#FFFFFF'}</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">สมาชิกในทีม (Team Members)</label>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mb-2.5 items-start sm:items-center">
                    <input 
                      type="text" 
                      placeholder="ค้นหารายชื่อสมาชิก..." 
                      className="border border-gray-300 rounded-xl p-2 text-xs w-full sm:w-64 outline-none focus:ring-1 focus:ring-red-500"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showOnlyBD} 
                        onChange={e => setShowOnlyBD(e.target.checked)} 
                        className="rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                      แสดงเฉพาะแผนก BD
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50/50">
                    {allUsers.filter(u => {
                      const matchesSearch = u.fullName.toLowerCase().includes(memberSearch.toLowerCase());
                      const isBDRole = ['Business Development', 'BD Intern'].includes(u.role);
                      const matchesBD = showOnlyBD ? isBDRole : true;
                      return matchesSearch && matchesBD;
                    }).map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                        <input 
                          type="checkbox"
                          className="rounded text-red-600 focus:ring-red-500 accent-red-600"
                          checked={editForm.memberIds?.includes(u.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm({...editForm, memberIds: [...(editForm.memberIds || []), u.id]});
                            } else {
                              setEditForm({...editForm, memberIds: (editForm.memberIds || []).filter((id: string) => id !== u.id)});
                            }
                          }}
                        />
                        <span className="truncate">{u.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-8 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                disabled={savingEdit}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-xs shadow-red-200 disabled:opacity-50"
              >
                {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. AUTO COMPLETE CELEBRATION MODAL */}
      {showAutoCompletePrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">งานทั้งหมดเสร็จสิ้นแล้ว!</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              งาน (Tasks) ในโครงการนี้ได้รับการดำเนินการครบถ้วนแล้ว และไม่มีงานที่ติดปัญหา<br/>
              คุณต้องการปิดสถานะโครงการเป็น <strong className="text-gray-900 font-bold">COMPLETED</strong> เลยหรือไม่?
            </p>

            <div className="flex justify-center gap-2.5">
              <button 
                onClick={() => setShowAutoCompletePrompt(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
              >
                ยังไม่ปิด (เก็บไว้ก่อน)
              </button>
              <button 
                onClick={handleCompleteProject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-xs shadow-red-200"
              >
                ยืนยันปิดโครงการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADD TASK MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">เพิ่มงานใหม่</h2>
                <p className="text-xs text-gray-500">กำหนดชื่องานและเช็คลิสต์ย่อย</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">ชื่องาน (Task Name)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="เช่น ตรวจสอบโครงสร้างระบบ"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  เช็คลิสต์ย่อย (Checklist) - ถ้ามี
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 border border-gray-300 rounded-xl p-2 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                    value={newChecklistItemText}
                    onChange={e => setNewChecklistItemText(e.target.value)}
                    placeholder="พิมพ์รายการเช็คลิสต์..."
                    onKeyDown={e => { 
                      if (e.key === 'Enter' && newChecklistItemText.trim()) {
                        e.preventDefault();
                        setNewTaskChecklist([...newTaskChecklist, newChecklistItemText.trim()]);
                        setNewChecklistItemText('');
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newChecklistItemText.trim()) {
                        setNewTaskChecklist([...newTaskChecklist, newChecklistItemText.trim()]);
                        setNewChecklistItemText('');
                      }
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-xs font-semibold border border-gray-200"
                  >
                    + เพิ่ม
                  </button>
                </div>

                {newTaskChecklist.length > 0 && (
                  <ul className="space-y-1.5 mt-3 bg-gray-50/70 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                    {newTaskChecklist.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setNewTaskChecklist(newTaskChecklist.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-2.5">
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                disabled={addingTask}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleAddTask}
                disabled={addingTask || !newTaskName.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-xs shadow-red-200 disabled:opacity-50"
              >
                {addingTask ? 'กำลังบันทึก...' : 'บันทึกงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
