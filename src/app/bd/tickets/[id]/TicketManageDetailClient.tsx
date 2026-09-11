"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  getTicketById,
  addComment,
  updateResolutionPlan,
  resolveTicket,
  reassignTicket,
  convertTicketToProject,
  convertTicketToTask,
  updateTicketCategory,
  addTicketAttachments,
  acceptTicket,
} from '@/app/actions/tickets';
import { getAllUsersForBD, getBDWorkTypes, getAllBDProjects } from '@/app/actions/bd';
import {
  LifeBuoy,
  AlertCircle,
  Clock,
  CheckCircle2,
  Activity,
  MessageSquare,
  Paperclip,
  ChevronLeft,
  Send,
  Loader2,
  Save,
  UserPlus,
  FolderSync,
  X,
  Upload,
  Trash2,
  Copy,
  Check,
  Phone,
  Mail,
  User,
  Calendar,
  ExternalLink,
  Eye,
  Maximize2,
  FileText,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  KeyRound,
  Tag,
  Zap,
  Flame,
  AlertTriangle,
  ArrowRight,
  Layers,
  Download,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

function isImageUrl(url: string) {
  if (!url) return false;
  return (
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) ||
    url.includes('uploadsService') ||
    url.includes('image')
  );
}

function getFileNameFromUrl(url: string) {
  try {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    const rawName = parts[parts.length - 1];
    return decodeURIComponent(rawName);
  } catch {
    return 'attachment-file';
  }
}

function formatThaiDateTime(dateInput: string | Date | null | undefined) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRelativeTimeThai(dateInput: string | Date | null | undefined) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;
  if (diffDays === 1) return 'เมื่อวานนี้';
  if (diffDays < 30) return `${diffDays} วันที่แล้ว`;
  return `${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
}

export default function TicketManageDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied state
  const [copied, setCopied] = useState(false);

  // Lightbox preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // HR/BD Ticket attachment states
  const [hrAttachFiles, setHrAttachFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const hrAttachInputRef = useRef<HTMLInputElement>(null);

  // Category
  const [ticketCategory, setTicketCategory] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // BD specific states
  const [resolutionPlan, setResolutionPlan] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Reassign states
  const [showReassign, setShowReassign] = useState(false);
  const [bdUsers, setBdUsers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Convert states
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertType, setConvertType] = useState<'PROJECT' | 'TASK'>('PROJECT');
  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [projectDetails, setProjectDetails] = useState({
    name: '',
    objective: '',
    workTypeId: '',
    urgency: 'Normal',
  });
  const [taskDetails, setTaskDetails] = useState({ projectId: '', name: '' });
  const [isConverting, setIsConverting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTicket();
    fetchUsers();
  }, [ticketId]);

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchTicket = async () => {
    setLoading(true);
    const res = await getTicketById(ticketId);
    if (res.success && res.data) {
      setTicket(res.data);
      setResolutionPlan(res.data.resolutionPlan || '');
      setProgressPercent(res.data.progressPercent || 0);
      setTicketCategory(res.data.category || 'OTHER');
    } else {
      setError(res.error || 'ไม่พบข้อมูล Ticket นี้');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const res = await getAllUsersForBD();
    if (res.success && res.data) {
      const filtered = res.data.filter(
        (u: any) =>
          u.role.includes('Business Development') ||
          u.role.includes('BD Intern') ||
          u.role.includes('admin') ||
          u.role.includes('SUPER_ADMIN')
      );
      setBdUsers(filtered.length > 0 ? filtered : res.data);
    }
  };

  const handleCopyTicketNumber = () => {
    if (!ticket?.ticketNumber) return;
    navigator.clipboard.writeText(ticket.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uploadFiles = async (files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        urls.push(data.url);
      }
    }
    return urls;
  };

  const handleAcceptTicket = async () => {
    setIsAccepting(true);
    try {
      const res = await acceptTicket(ticketId);
      if (res.success) {
        Swal.fire({
          title: 'รับมอบหมายงานสำเร็จ!',
          text: 'คุณได้เข้ามารับผิดชอบ Ticket นี้เรียบร้อยแล้ว สถานะเปลี่ยนเป็น "รับงานแล้ว"',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 2000,
          showConfirmButton: false,
        });
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถรับงานได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleAddTicketAttachments = async () => {
    if (hrAttachFiles.length === 0) return;
    setIsUploadingAttachments(true);
    try {
      const urls = await uploadFiles(hrAttachFiles);
      if (urls.length === 0) {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถอัปโหลดไฟล์ได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
        return;
      }
      const res = await addTicketAttachments(ticketId, urls);
      if (res.success) {
        setHrAttachFiles([]);
        if (hrAttachInputRef.current) hrAttachInputRef.current.value = '';
        fetchTicket();
        Swal.fire({
          title: 'แนบไฟล์สำเร็จ',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถแนบไฟล์ได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        attachmentUrls = await uploadFiles(attachments);
      }

      const res = await addComment(ticketId, commentText, attachmentUrls);
      if (res.success) {
        setCommentText('');
        setAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถส่งข้อความได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePlan = async () => {
    setIsSaving(true);
    try {
      const res = await updateResolutionPlan(ticketId, resolutionPlan, progressPercent);
      if (res.success) {
        Swal.fire({
          title: 'บันทึกความคืบหน้าสำเร็จ',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถบันทึกได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCategory = async (newCategory: string) => {
    setTicketCategory(newCategory);
    setIsUpdatingCategory(true);
    try {
      const res = await updateTicketCategory(ticketId, newCategory);
      if (res.success) {
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่สามารถอัปเดตหมวดหมู่ได้',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
        setTicketCategory(ticket.category);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleResolve = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการปิดงาน (Resolve Ticket)',
      text: 'คุณได้ดำเนินการแก้ไขและตรวจสอบความถูกต้องเรียบร้อยแล้วใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ปิดงานสำเร็จ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      const res = await resolveTicket(ticketId);
      if (res.success) {
        Swal.fire({
          title: 'ปิดงานเรียบร้อยแล้ว',
          text: 'Ticket ได้รับการปรับสถานะเป็น RESOLVED',
          icon: 'success',
          confirmButtonColor: '#10b981',
        });
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'เกิดข้อผิดพลาดในการปิดงาน',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
      setIsSaving(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedAssignee) return;
    setIsReassigning(true);
    try {
      const res = await reassignTicket(ticketId, selectedAssignee);
      if (res.success) {
        setShowReassign(false);
        Swal.fire({
          title: 'มอบหมายงานสำเร็จ',
          icon: 'success',
          confirmButtonColor: '#2563eb',
        });
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'ไม่มีสิทธิ์หรือเกิดข้อผิดพลาด',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReassigning(false);
    }
  };

  const openConvertModal = async () => {
    setShowConvertModal(true);
    setProjectDetails((prev) => ({
      ...prev,
      name: ticket.title,
      objective: ticket.description,
    }));
    setTaskDetails((prev) => ({ ...prev, name: ticket.title }));

    if (workTypes.length === 0) {
      const wtRes = await getBDWorkTypes();
      if (wtRes.success) setWorkTypes(wtRes.data || []);
    }
    if (projects.length === 0) {
      const pRes = await getAllBDProjects();
      if (pRes.success) setProjects(pRes.data || []);
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      let res;
      if (convertType === 'PROJECT') {
        res = await convertTicketToProject(ticketId, projectDetails);
      } else {
        res = await convertTicketToTask(ticketId, taskDetails);
      }

      if (res?.success) {
        setShowConvertModal(false);
        Swal.fire({
          title: 'แปลงสำเร็จเรียบร้อย',
          icon: 'success',
          confirmButtonColor: '#8b5cf6',
        });
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res?.error || 'เกิดข้อผิดพลาด',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  // Modern badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            ใหม่ (รอรับเรื่อง)
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            รับงานแล้ว
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            กำลังดำเนินการ
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ปิดงานสำเร็จ
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
            <FolderSync className="w-3.5 h-3.5 text-purple-600" />
            แปลงเป็น Project แล้ว
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md shadow-sm">
            <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Critical (วิกฤต)
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> High (สูง)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
            <Clock className="w-3 h-3 text-blue-600" /> Medium (ปานกลาง)
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
            <Info className="w-3 h-3 text-slate-500" /> Low (ต่ำ)
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'BUG':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50/80 border border-rose-200 px-2.5 py-0.5 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Bug / ข้อผิดพลาด
          </span>
        );
      case 'FEATURE_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-2.5 py-0.5 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Feature Request
          </span>
        );
      case 'QUESTION':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200 px-2.5 py-0.5 rounded-md">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" /> สอบถามการใช้งาน
          </span>
        );
      case 'ACCOUNT_ACCESS':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50/80 border border-purple-200 px-2.5 py-0.5 rounded-md">
            <KeyRound className="w-3.5 h-3.5 text-purple-600" /> สิทธิ์การใช้งาน / บัญชี
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
            <Tag className="w-3.5 h-3.5 text-slate-500" /> อื่นๆ
          </span>
        );
    }
  };

  // Stepper calculations
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 0;
      case 'ACKNOWLEDGED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'RESOLVED':
        return 3;
      default:
        return 0;
    }
  };

  const stepsList = [
    { key: 'SUBMITTED', title: 'แจ้งปัญหา', desc: 'สร้างรายการในระบบ' },
    { key: 'ACKNOWLEDGED', title: 'รับเรื่อง', desc: 'BD ตอบรับและมอบหมาย' },
    { key: 'IN_PROGRESS', title: 'ดำเนินการแก้ไข', desc: 'วางแผนและแก้ไขปัญหา' },
    { key: 'RESOLVED', title: 'ปิดงานสำเร็จ', desc: 'ตรวจสอบและเสร็จสิ้น' },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">กำลังโหลดข้อมูล Ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">ไม่พบข้อมูล Ticket</h2>
        <p className="text-sm text-slate-600 mb-6">{error}</p>
        <Link
          href="/bd/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition"
        >
          <ChevronLeft className="w-4 h-4" /> กลับไปหน้ารายการ
        </Link>
      </div>
    );
  }

  const currentStepIdx = getStepIndex(ticket.status);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Header & Breadcrumbs Bar */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Breadcrumb & Identifier */}
            <div className="flex items-center gap-3">
              <Link
                href="/bd/tickets"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition"
                title="กลับไปหน้ารวม Ticket"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400">BD Management</span>
                <span className="text-slate-300">/</span>
                <Link
                  href="/bd/tickets"
                  className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                >
                  ปัญหาระบบ (Tickets)
                </Link>
                <span className="text-slate-300">/</span>
                <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-200 transition">
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wide">
                    {ticket.ticketNumber}
                  </span>
                  <button
                    onClick={handleCopyTicketNumber}
                    className="text-slate-400 hover:text-slate-700"
                    title="คัดลอกเลข Ticket"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {getStatusBadge(ticket.status)}
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* If SUBMITTED: Show prominent Accept and Assign buttons */}
              {ticket.status === 'SUBMITTED' && (
                <>
                  <button
                    onClick={handleAcceptTicket}
                    disabled={isAccepting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 fill-current" />
                    )}
                    รับมอบหมายงานนี้ (Accept)
                  </button>
                  <button
                    onClick={() => setShowReassign(!showReassign)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    มอบหมายให้ผู้อื่น
                  </button>
                </>
              )}

              {/* If ACKNOWLEDGED or IN_PROGRESS */}
              {(ticket.status === 'ACKNOWLEDGED' || ticket.status === 'IN_PROGRESS') && (
                <>
                  <button
                    onClick={openConvertModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-xl transition shadow-xs"
                  >
                    <FolderSync className="w-4 h-4 text-purple-600" />
                    แปลงเป็น Project/Task
                  </button>
                  <button
                    onClick={() => setShowReassign(!showReassign)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-xs"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    มอบหมายใหม่
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ปิดงานสำเร็จ (Resolve)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Reassign Panel (Dropdown) */}
        {showReassign && (
          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-md flex flex-col md:flex-row items-stretch md:items-end gap-3 transition-all animate-in fade-in slide-in-from-top-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                เลือกผู้รับผิดชอบใหม่ (ทีม BD)
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              >
                <option value="">-- เลือกผู้รับผิดชอบ --</option>
                {bdUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReassign}
                disabled={!selectedAssignee || isReassigning}
                className="flex-1 md:flex-initial px-5 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 shadow-sm transition flex items-center justify-center gap-2"
              >
                {isReassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                ยืนยันการมอบหมาย
              </button>
              <button
                onClick={() => setShowReassign(false)}
                className="px-4 py-2.5 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Visual Lifecycle Stepper Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                ขั้นตอนการดำเนินงาน (Workflow Lifecycle)
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              สถานะ: {ticket.status}
            </span>
          </div>

          {ticket.status === 'CONVERTED' ? (
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                <FolderSync className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-900">
                  Ticket นี้ถูกแปลงเป็น Project / Task แล้ว
                </p>
                <p className="text-xs text-purple-700">
                  กระบวนการแก้ไขและการติดตามงานถูกย้ายไปควบคุมในระบบ BD Projects เรียบร้อยแล้ว
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
              {stepsList.map((step, idx) => {
                const isPassed = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;
                const isFuture = currentStepIdx < idx;

                return (
                  <div
                    key={step.key}
                    className={`relative p-3.5 rounded-xl border transition-all ${isCurrent
                      ? 'bg-gradient-to-br from-indigo-50/90 to-blue-50/40 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                      : isPassed
                        ? 'bg-slate-50/80 border-slate-200 text-slate-700'
                        : 'bg-white border-slate-200/60 opacity-60'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                          }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-xs font-bold ${isCurrent
                          ? 'text-indigo-900'
                          : isPassed
                            ? 'text-slate-800'
                            : 'text-slate-500'
                          }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column - Main Details (8 cols / 2-span) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Problem Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-transparent">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {getCategoryBadge(ticket.category)}
                  {getUrgencyBadge(ticket.urgency)}
                  {ticket.sourceModule && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md uppercase">
                      Module: {ticket.sourceModule}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">
                    {formatThaiDateTime(ticket.createdAt)} ({getRelativeTimeThai(ticket.createdAt)})
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {ticket.title}
                </h1>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    รายละเอียดปัญหาที่พบ
                  </h3>
                  <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-xl text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                    {ticket.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </div>
                </div>

                {/* Attachments Section */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      ไฟล์แนบและภาพถ่าย ({ticket.attachments.length})
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {ticket.attachments.map((url: string, i: number) => {
                        const isImg = isImageUrl(url);
                        const fileName = getFileNameFromUrl(url);

                        if (isImg) {
                          return (
                            <div
                              key={i}
                              onClick={() => setPreviewImage(url)}
                              className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video cursor-pointer hover:shadow-md hover:border-indigo-400 transition"
                            >
                              <img
                                src={url}
                                alt={`Attachment ${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white text-xs font-medium">
                                <Maximize2 className="w-4 h-4" />
                                <span>คลิกเพื่อดูรูป</span>
                              </div>
                              <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                Image #{i + 1}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/80 hover:border-slate-300 transition text-sm text-slate-700"
                          >
                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-slate-800 truncate">{fileName}</p>
                              <p className="text-[10px] text-slate-400">คลิกเพื่อเปิด / ดาวน์โหลด</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Attachments Uploader (BD/HR) */}
                {ticket.status !== 'RESOLVED' && ticket.status !== 'CONVERTED' && (
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 hover:border-indigo-400 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          แนบไฟล์หรือหลักฐานเพิ่มเติม (ทีม BD / HR)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          รองรับ JPG, PNG, PDF, Excel, Word (ไฟล์จะถูกจัดเก็บเข้า Ticket นี้)
                        </p>
                      </div>

                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 rounded-lg text-xs font-medium transition shadow-2xs self-start sm:self-auto">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>เลือกไฟล์แนบ</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          ref={hrAttachInputRef}
                          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => {
                            if (e.target.files) setHrAttachFiles(Array.from(e.target.files));
                          }}
                        />
                      </label>
                    </div>

                    {hrAttachFiles.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {hrAttachFiles.map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs text-slate-700 shadow-2xs"
                            >
                              <span className="truncate max-w-[160px]">{f.name}</span>
                              <button
                                type="button"
                                onClick={() => setHrAttachFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddTicketAttachments}
                          disabled={isUploadingAttachments}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition shadow-2xs"
                        >
                          {isUploadingAttachments ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          อัปโหลดไฟล์ที่เลือก ({hrAttachFiles.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* BD Work Area & Resolution Plan */}
            {ticket.status !== 'SUBMITTED' && ticket.status !== 'CONVERTED' && (
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/60 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      พื้นที่การแก้ไขปัญหา (BD Resolution Dashboard)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                    ความคืบหน้า: {progressPercent}%
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Interactive Progress Slider with Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ปรับระดับความคืบหน้า
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[0, 25, 50, 75, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setProgressPercent(preset)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${progressPercent === preset
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progressPercent}
                        onChange={(e) => setProgressPercent(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Resolution Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>บันทึกแผนงาน / สาเหตุและการแก้ไข (ผู้แจ้งมองเห็นข้อมูลนี้ได้)</span>
                      <span className="text-[11px] text-slate-400 font-normal">Auto-formatted</span>
                    </label>
                    <textarea
                      value={resolutionPlan}
                      onChange={(e) => setResolutionPlan(e.target.value)}
                      rows={4}
                      placeholder="ระบุสาเหตุที่พบ, วิธีการแก้ไขชั่วคราว/ถาวร, หรือข้อแนะนำ..."
                      className="w-full rounded-xl border border-slate-300 p-3.5 text-sm bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSavePlan}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      บันทึกความคืบหน้า
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Discussion & Comments Feed */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    กระดานสนทนา / สอบถามเพิ่มเติม ({ticket.comments?.length || 0})
                  </h3>
                </div>
              </div>

              {/* Comments List */}
              <div className="p-6 space-y-4 max-h-[520px] overflow-y-auto">
                {ticket.comments?.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-2">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">ยังไม่มีการสนทนาใน Ticket นี้</p>
                    <p className="text-xs text-slate-400 mt-0.5">คุณสามารถพิมพ์ข้อความตอบกลับหรือสอบถามข้อมูลเพิ่มเติมได้จากด้านล่าง</p>
                  </div>
                ) : (
                  ticket.comments.map((c: any) => {
                    const isBDTeam =
                      c.user?.role?.includes('Business Development') ||
                      c.user?.role?.includes('BD Intern') ||
                      c.userId === ticket.assigneeId;

                    return (
                      <div
                        key={c.id}
                        className={`flex gap-3 ${isBDTeam ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isBDTeam
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                            }`}
                        >
                          {(c.user?.fullName || 'U').charAt(0)}
                        </div>

                        {/* Content Bubble */}
                        <div
                          className={`max-w-[82%] rounded-2xl p-4 text-sm shadow-2xs ${isBDTeam
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold ${isBDTeam ? 'text-indigo-100' : 'text-slate-800'}`}>
                              {c.user?.fullName || 'ผู้ใช้งาน'}
                            </span>
                            {c.user?.role && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${isBDTeam ? 'bg-indigo-500/50 text-indigo-100' : 'bg-slate-200 text-slate-600'
                                  }`}
                              >
                                {c.user.role}
                              </span>
                            )}
                            <span className={`text-[10px] ml-auto ${isBDTeam ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {getRelativeTimeThai(c.createdAt)}
                            </span>
                          </div>

                          <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                            {c.message}
                          </div>

                          {/* Comment Attachments */}
                          {c.attachments && c.attachments.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                              {c.attachments.map((url: string, i: number) => {
                                const isImg = isImageUrl(url);
                                if (isImg) {
                                  return (
                                    <div
                                      key={i}
                                      onClick={() => setPreviewImage(url)}
                                      className="cursor-pointer w-20 h-14 rounded-lg overflow-hidden border border-white/30 hover:opacity-90 transition"
                                    >
                                      <img
                                        src={url}
                                        alt={`Comment attachment ${i + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-1 text-xs underline ${isBDTeam ? 'text-indigo-100' : 'text-indigo-600'
                                      }`}
                                  >
                                    <Paperclip className="w-3.5 h-3.5" /> ไฟล์แนบ {i + 1}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Box */}
              {ticket.status !== 'RESOLVED' && (
                <div className="p-4 border-t border-slate-200 bg-slate-50/70">
                  <form onSubmit={handleAddComment} className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="พิมพ์ข้อความตอบกลับผู้แจ้ง... (กด Ctrl + Enter เพื่อส่ง)"
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            handleAddComment(e);
                          }
                        }}
                        rows={2}
                        className="w-full rounded-xl border border-slate-300 p-3 pr-12 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition shadow-2xs"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || (!commentText.trim() && attachments.length === 0)}
                        className="absolute right-2.5 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 transition shadow-xs"
                        title="ส่งข้อความ"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>แนบไฟล์หรือภาพ</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files) setAttachments(Array.from(e.target.files));
                          }}
                        />
                      </label>

                      {attachments.length > 0 && (
                        <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                          <span>เลือกแล้ว {attachments.length} ไฟล์</span>
                          <button
                            type="button"
                            onClick={() => setAttachments([])}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Context & Metadata (4 cols / 1-span) */}
          <div className="space-y-6">
            {/* Quick Assignee Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  ผู้รับผิดชอบงาน (BD Assignee)
                </h3>
                {ticket.assignee && ticket.status !== 'RESOLVED' && ticket.status !== 'CONVERTED' && (
                  <button
                    onClick={() => setShowReassign(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    เปลี่ยน
                  </button>
                )}
              </div>

              {ticket.assignee ? (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
                    {ticket.assignee.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {ticket.assignee.fullName}
                    </p>
                    <p className="text-xs text-indigo-600 font-medium truncate">
                      {ticket.assignee.role || 'Business Development'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                  <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    ยังไม่มีผู้รับผิดชอบ
                  </p>
                  <button
                    onClick={handleAcceptTicket}
                    disabled={isAccepting}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1"
                  >
                    {isAccepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    กดรับงานนี้ทันที
                  </button>
                </div>
              )}
            </div>

            {/* Reporter Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5 pb-2.5 border-b border-slate-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                ข้อมูลผู้แจ้งปัญหา (Reporter)
              </h3>

              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                  {(ticket.reporter?.fullName ?? ticket.reporterName ?? 'U').charAt(0)}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {ticket.reporter?.fullName ?? ticket.reporterName ?? 'ไม่ระบุชื่อ'}
                    </p>
                    {ticket.reporter?.employeeId && (
                      <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                        {ticket.reporter.employeeId}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    {ticket.reporter?.role ?? ticket.reporterEmail ?? 'ผู้ใช้งานระบบ'}
                  </p>

                  {/* Direct Contact Phone */}
                  {ticket.reporter?.phoneNumber && (
                    <div className="pt-2">
                      <a
                        href={`tel:${ticket.reporter.phoneNumber}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{ticket.reporter.phoneNumber}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Classification & Settings Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span>การจัดหมวดหมู่ (Classification)</span>
                {isUpdatingCategory && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  หมวดหมู่ปัญหา (Category)
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => handleUpdateCategory(e.target.value)}
                  disabled={
                    isUpdatingCategory ||
                    ticket.status === 'RESOLVED' ||
                    ticket.status === 'CONVERTED'
                  }
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-medium"
                >
                  <option value="BUG">Bug / ข้อผิดพลาดระบบ</option>
                  <option value="FEATURE_REQUEST">Feature Request / ฟังก์ชันใหม่</option>
                  <option value="QUESTION">Question / สอบถามการใช้งาน</option>
                  <option value="ACCOUNT_ACCESS">Account Access / สิทธิ์ระบบ</option>
                  <option value="OTHER">Other / อื่นๆ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 block font-semibold">ระดับความด่วน</span>
                  <span className="font-bold text-slate-800">{ticket.urgency}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 block font-semibold">ระบบต้นทาง</span>
                  <span className="font-bold text-slate-800 uppercase">{ticket.sourceModule || 'CRM'}</span>
                </div>
              </div>
            </div>

            {/* Audit Trail & Action Timeline Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2.5 border-b border-slate-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                ประวัติการดำเนินการ (Audit Timeline)
              </h3>

              <div className="relative border-l-2 border-slate-200 ml-3 space-y-4">
                {ticket.logs?.map((log: any) => (
                  <div key={log.id} className="relative pl-5">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full" />
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-800">{log.action}</h4>
                        <time className="text-[10px] text-slate-400 font-mono">
                          {formatThaiDateTime(log.createdAt)}
                        </time>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                      )}
                      <p className="text-[10px] text-indigo-600 mt-1 font-medium">
                        โดย {log.user?.fullName ?? 'ระบบอัตโนมัติ'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-xs font-mono text-slate-300 truncate max-w-[70%]">
                {getFileNameFromUrl(previewImage)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                  title="ปิด (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image display */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
              <img
                src={previewImage}
                alt="Enlarged Preview"
                className="max-h-[82vh] max-w-[92vw] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderSync className="w-5 h-5 text-purple-600" />
                แปลง Ticket เป็น Project / Task
              </h2>
              <button
                onClick={() => setShowConvertModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Segmented Control */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setConvertType('PROJECT')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${convertType === 'PROJECT'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  สร้าง Project ใหม่
                </button>
                <button
                  type="button"
                  onClick={() => setConvertType('TASK')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${convertType === 'TASK'
                    ? 'bg-white text-purple-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  เพิ่มเป็น Task ในโปรเจกต์เดิม
                </button>
              </div>

              {convertType === 'PROJECT' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      ชื่อโปรเจกต์
                    </label>
                    <input
                      type="text"
                      value={projectDetails.name}
                      onChange={(e) => setProjectDetails({ ...projectDetails, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      วัตถุประสงค์ / รายละเอียด
                    </label>
                    <textarea
                      value={projectDetails.objective}
                      onChange={(e) =>
                        setProjectDetails({ ...projectDetails, objective: e.target.value })
                      }
                      rows={3}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      ประเภทงาน (Work Type)
                    </label>
                    <select
                      value={projectDetails.workTypeId}
                      onChange={(e) =>
                        setProjectDetails({ ...projectDetails, workTypeId: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="">-- เลือกประเภทงาน --</option>
                      {workTypes.map((wt) => (
                        <option key={wt.id} value={wt.id}>
                          {wt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      ความเร่งด่วน
                    </label>
                    <select
                      value={projectDetails.urgency}
                      onChange={(e) =>
                        setProjectDetails({ ...projectDetails, urgency: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="Normal">Normal (ปกติ)</option>
                      <option value="Urgent">Urgent (ด่วน)</option>
                      <option value="Critical">Critical (วิกฤต)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      เลือกโปรเจกต์เป้าหมาย
                    </label>
                    <select
                      value={taskDetails.projectId}
                      onChange={(e) =>
                        setTaskDetails({ ...taskDetails, projectId: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="">-- เลือกโปรเจกต์ --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      ชื่องานย่อย (Task Name)
                    </label>
                    <input
                      type="text"
                      value={taskDetails.name}
                      onChange={(e) => setTaskDetails({ ...taskDetails, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2.5">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConvert}
                disabled={
                  isConverting ||
                  (convertType === 'PROJECT' && (!projectDetails.name || !projectDetails.workTypeId)) ||
                  (convertType === 'TASK' && (!taskDetails.name || !taskDetails.projectId))
                }
                className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-40 transition"
              >
                {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ยืนยันการแปลงงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
