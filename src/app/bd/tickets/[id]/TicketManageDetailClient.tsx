"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getTicketById, addComment, updateResolutionPlan, resolveTicket, reassignTicket, convertTicketToProject, convertTicketToTask, updateTicketCategory, addTicketAttachments } from '@/app/actions/tickets';
import { getAllUsersForBD, getBDWorkTypes, getAllBDProjects } from '@/app/actions/bd';
import { LifeBuoy, AlertCircle, Clock, CheckCircle2, Activity, MessageSquare, Paperclip, ChevronLeft, Send, Loader2, Save, UserPlus, FolderSync, X, Upload, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function TicketManageDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HR-side ticket attachment states
  const [hrAttachFiles, setHrAttachFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const hrAttachInputRef = useRef<HTMLInputElement>(null);

  const [ticketCategory, setTicketCategory] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // BD specific states
  const [resolutionPlan, setResolutionPlan] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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

  const [projectDetails, setProjectDetails] = useState({ name: '', objective: '', workTypeId: '', urgency: 'Normal' });
  const [taskDetails, setTaskDetails] = useState({ projectId: '', name: '' });
  const [isConverting, setIsConverting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTicket();
    fetchUsers();
  }, [ticketId]);

  const fetchTicket = async () => {
    setLoading(true);
    const res = await getTicketById(ticketId);
    if (res.success && res.data) {
      setTicket(res.data);
      setResolutionPlan(res.data.resolutionPlan || '');
      setProgressPercent(res.data.progressPercent || 0);
      setTicketCategory(res.data.category || 'OTHER');
    } else {
      setError(res.error || 'ไม่พบข้อมูล');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const res = await getAllUsersForBD(); // This might return all users, but we can filter BD in frontend or just show all for admin
    if (res.success && res.data) {
      // Filter for BD roles roughly
      const filtered = res.data.filter((u: any) => u.role.includes('Business Development') || u.role.includes('BD Intern'));
      setBdUsers(filtered);
    }
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

  const handleAddTicketAttachments = async () => {
    if (hrAttachFiles.length === 0) return;
    setIsUploadingAttachments(true);
    try {
      const urls = await uploadFiles(hrAttachFiles);
      if (urls.length === 0) {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถอัปโหลดไฟล์ได้', icon: 'error', confirmButtonColor: '#dc2626' });
        return;
      }
      const res = await addTicketAttachments(ticketId, urls);
      if (res.success) {
        setHrAttachFiles([]);
        if (hrAttachInputRef.current) hrAttachInputRef.current.value = '';
        fetchTicket();
        Swal.fire({ title: 'แนบไฟล์สำเร็จ', icon: 'success', confirmButtonColor: '#dc2626', timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: res.error || 'ไม่สามารถแนบไฟล์ได้', icon: 'error', confirmButtonColor: '#dc2626' });
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePlan = async () => {
    setIsSaving(true);
    const res = await updateResolutionPlan(ticketId, resolutionPlan, progressPercent);
    if (res.success) fetchTicket();
    setIsSaving(false);
  };

  const handleUpdateCategory = async (newCategory: string) => {
    setTicketCategory(newCategory);
    setIsUpdatingCategory(true);
    const res = await updateTicketCategory(ticketId, newCategory);
    if (res.success) {
      fetchTicket();
    } else {
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: res.error || 'ไม่สามารถอัปเดตหมวดหมู่ได้',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
      setTicketCategory(ticket.category); // Revert
    }
    setIsUpdatingCategory(false);
  };

  const handleResolve = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการปิดงาน',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการปิดงานนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ใช่, ปิดงาน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      const res = await resolveTicket(ticketId);
      if (res.success) {
        Swal.fire({
          title: 'ปิดงานสำเร็จ',
          icon: 'success',
          confirmButtonColor: '#dc2626'
        });
        fetchTicket();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'เกิดข้อผิดพลาดในการปิดงาน',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        });
      }
      setIsSaving(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedAssignee) return;
    setIsReassigning(true);
    const res = await reassignTicket(ticketId, selectedAssignee);
    if (res.success) {
      setShowReassign(false);
      Swal.fire({
        title: 'มอบหมายงานสำเร็จ',
        icon: 'success',
        confirmButtonColor: '#dc2626'
      });
      fetchTicket();
    } else {
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: res.error || 'ไม่มีสิทธิ์หรือเกิดข้อผิดพลาด',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
    setIsReassigning(false);
  };

  const openConvertModal = async () => {
    setShowConvertModal(true);
    setProjectDetails(prev => ({ ...prev, name: ticket.title, objective: ticket.description }));
    setTaskDetails(prev => ({ ...prev, name: ticket.title }));

    // Fetch options if not fetched
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
    let res;
    if (convertType === 'PROJECT') {
      res = await convertTicketToProject(ticketId, projectDetails);
    } else {
      res = await convertTicketToTask(ticketId, taskDetails);
    }

    if (res?.success) {
      setShowConvertModal(false);
      Swal.fire({
        title: 'แปลงสำเร็จ',
        icon: 'success',
        confirmButtonColor: '#dc2626'
      });
      fetchTicket();
    } else {
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: res?.error || 'เกิดข้อผิดพลาด',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
    setIsConverting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><Clock className="w-4 h-4 mr-1" /> ใหม่ (ยังไม่มีผู้รับ)</span>;
      case 'ACKNOWLEDGED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><AlertCircle className="w-4 h-4 mr-1" /> รับงานแล้ว</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><Activity className="w-4 h-4 mr-1" /> กำลังดำเนินการ</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-4 h-4 mr-1" /> ปิดงาน</span>;
      case 'CONVERTED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"><FolderSync className="w-4 h-4 mr-1" /> แปลงเป็นโปรเจกต์แล้ว</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'LOW':
        return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Low (ต่ำ)</span>;
      case 'MEDIUM':
        return <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Medium (ปานกลาง)</span>;
      case 'HIGH':
        return <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">High (สูง)</span>;
      case 'CRITICAL':
        return <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-bold">Critical (วิกฤต)</span>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'BUG':
        return <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">Bug</span>;
      case 'FEATURE_REQUEST':
        return <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">Feature</span>;
      case 'QUESTION':
        return <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Question</span>;
      case 'ACCOUNT_ACCESS':
        return <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">Access</span>;
      default:
        return <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">Other</span>;
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>;
  if (error || !ticket) return <div className="p-12 text-center text-red-600">{error}</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link href="/bd/tickets" className="inline-flex items-center text-red-600 hover:text-red-800 font-medium">
          <ChevronLeft className="w-4 h-4 mr-1" /> กลับไปหน้ารายการ
        </Link>
        <div className="flex gap-2">
          {ticket.status !== 'RESOLVED' && ticket.status !== 'SUBMITTED' && ticket.status !== 'CONVERTED' && (
            <button
              onClick={() => openConvertModal()}
              className="flex items-center px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <FolderSync className="w-4 h-4 mr-1.5" /> แปลงเป็น Project/Task
            </button>
          )}
          {ticket.status !== 'RESOLVED' && ticket.status !== 'SUBMITTED' && ticket.status !== 'CONVERTED' && (
            <button
              onClick={() => setShowReassign(!showReassign)}
              className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> มอบหมายงานใหม่
            </button>
          )}
          {ticket.status !== 'RESOLVED' && ticket.status !== 'SUBMITTED' && ticket.status !== 'CONVERTED' && (
            <button
              onClick={handleResolve}
              disabled={isSaving}
              className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> ปิดงาน
            </button>
          )}
        </div>
      </div>

      {showReassign && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex items-end gap-4 shadow-sm">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกผู้รับผิดชอบใหม่</label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">-- เลือก BD --</option>
              {bdUsers.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleReassign}
            disabled={!selectedAssignee || isReassigning}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
          >
            {isReassigning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ยืนยัน'}
          </button>
          <button
            onClick={() => setShowReassign(false)}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ยกเลิก
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                    {ticket.ticketNumber}
                  </span>
                  {getCategoryBadge(ticket.category)}
                  {getUrgencyBadge(ticket.urgency)}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
              </div>
              <div>
                {getStatusBadge(ticket.status)}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">รายละเอียดปัญหา</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">ไฟล์แนบ</h3>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center bg-white border border-gray-200 rounded p-2 text-sm text-red-600 hover:bg-red-50 transition">
                        <Paperclip className="w-4 h-4 mr-2" /> ไฟล์แนบ {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* HR/BD: Add attachments to ticket */}
              {ticket.status !== 'RESOLVED' && ticket.status !== 'CONVERTED' && (
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center">
                    <Upload className="w-4 h-4 mr-2 text-red-500" /> แนบไฟล์เพิ่มเติม (ทีม BD/HR)
                  </h3>
                  <div className="flex flex-col gap-3">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:border-red-400 hover:text-red-600 transition w-fit">
                        <Paperclip className="w-4 h-4" />
                        <span>เลือกไฟล์</span>
                      </div>
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

                    {hrAttachFiles.length > 0 && (
                      <div className="space-y-1">
                        {hrAttachFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-1.5 text-sm">
                            <span className="text-gray-700 truncate max-w-[200px]">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => setHrAttachFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {hrAttachFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddTicketAttachments}
                        disabled={isUploadingAttachments}
                        className="flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-red-400 w-fit"
                      >
                        {isUploadingAttachments ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        อัปโหลด {hrAttachFiles.length} ไฟล์
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BD Work Area */}
          {ticket.status === 'CONVERTED' ? (
            <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-200 overflow-hidden mb-6">
              <div className="p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-2 flex items-center">
                  <FolderSync className="w-5 h-5 mr-2" /> รายการนี้ถูกแปลงเป็นโปรเจกต์หรืองานย่อยแล้ว
                </h3>
                <p className="text-purple-700">สถานะและแผนการแก้ไขของรายการนี้จะถูกระงับ เพื่อย้ายไปติดตามในระบบ BD Project แทน</p>
              </div>
            </div>
          ) : ticket.status !== 'SUBMITTED' && ticket.status !== 'RESOLVED' && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
              <div className="p-4 border-b border-red-100 bg-red-50">
                <h3 className="text-lg font-semibold text-red-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-red-600" /> พื้นที่ทำงานของ BD (Resolution Plan)
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ความคืบหน้า (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(Number(e.target.value))}
                    className="w-full accent-red-600"
                  />
                  <div className="text-right text-sm font-medium text-red-600">{progressPercent}%</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    บันทึกแผนการแก้ไข / สาเหตุ (สำหรับให้ผู้แจ้งดู)
                  </label>
                  <textarea
                    value={resolutionPlan}
                    onChange={(e) => setResolutionPlan(e.target.value)}
                    rows={4}
                    placeholder="ระบุสิ่งที่กำลังดำเนินการ หรือสาเหตุของปัญหา..."
                    className="w-full rounded-lg border border-gray-300 p-3 focus:ring-red-500 focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSavePlan}
                    disabled={isSaving}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    บันทึกความคืบหน้า
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Discussion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-red-600" /> สนทนา / ถาม-ตอบ
              </h3>
            </div>

            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              {ticket.comments.length === 0 ? (
                <div className="text-center text-gray-500 py-8 italic">ยังไม่มีการสนทนาในรายการนี้</div>
              ) : (
                ticket.comments.map((c: any) => {
                  const isMine = c.user.role.includes('Business Development') || c.userId === ticket.assigneeId; // Approximate for BD view
                  return (
                    <div key={c.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMine ? 'bg-red-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                        {!isMine && <div className="text-xs font-semibold text-red-600 mb-1">{c.user.fullName} ({c.user.role})</div>}
                        <div className="whitespace-pre-wrap text-sm">{c.message}</div>

                        {c.attachments && c.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {c.attachments.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className={`block text-xs underline ${isMine ? 'text-red-200' : 'text-red-600'}`}>
                                ไฟล์แนบ {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className={`text-[10px] mt-2 ${isMine ? 'text-red-200' : 'text-gray-500'}`}>
                          {new Date(c.createdAt).toLocaleString('th-TH')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {ticket.status !== 'RESOLVED' && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="พิมพ์ข้อความตอบกลับผู้แจ้ง..."
                      className="flex-1 rounded-lg border border-gray-300 p-3 focus:ring-red-500 focus:border-red-500 resize-none h-12 min-h-[48px]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition disabled:bg-red-400 flex items-center justify-center"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center text-sm text-gray-600 hover:text-red-600">
                      <Paperclip className="w-4 h-4 mr-1" /> แนบไฟล์รูปภาพ/เอกสาร
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files) {
                            setAttachments(Array.from(e.target.files));
                          }
                        }}
                      />
                    </label>
                    {attachments.length > 0 && (
                      <span className="text-xs text-red-600 font-medium">เลือกไว้ {attachments.length} ไฟล์</span>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">ข้อมูลผู้แจ้ง</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">
                {(ticket.reporter?.fullName ?? ticket.reporterName ?? 'U').charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-900 font-medium">{ticket.reporter?.fullName ?? ticket.reporterName ?? 'Unknown'}</div>
                  {!ticket.reporterId && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200" title="Reported from external source (no CRM account)">
                      External
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{ticket.reporter?.role ?? ticket.reporterEmail ?? 'No Role'}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleString('th-TH')}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex justify-between items-center">
              หมวดหมู่ปัญหา
              {isUpdatingCategory && <Loader2 className="w-3 h-3 text-red-600 animate-spin" />}
            </h3>
            <select
              value={ticketCategory}
              onChange={(e) => handleUpdateCategory(e.target.value)}
              disabled={isUpdatingCategory || ticket.status === 'RESOLVED' || ticket.status === 'CONVERTED'}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-red-500 focus:border-red-500"
            >
              <option value="BUG">Bug</option>
              <option value="FEATURE_REQUEST">Feature Request</option>
              <option value="QUESTION">Question</option>
              <option value="ACCOUNT_ACCESS">Account Access</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">ผู้รับผิดชอบ (BD)</h3>
            {ticket.assignee ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold">
                  {ticket.assignee.fullName.charAt(0)}
                </div>
                <div>
                  <div className="text-sm text-gray-900 font-medium">{ticket.assignee.fullName}</div>
                  <div className="text-xs text-gray-500">{ticket.assignee.role}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">ยังไม่มีผู้รับผิดชอบ</div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">ไทม์ไลน์สถานะ</h3>
            <div className="relative border-l border-gray-200 ml-3 space-y-4">
              {ticket.logs.map((log: any, i: number) => (
                <div key={log.id} className="mb-4 ml-4">
                  <div className="absolute w-3 h-3 bg-gray-200 rounded-full -left-1.5 border border-white mt-1.5"></div>
                  <time className="mb-1 text-xs font-normal leading-none text-gray-400">
                    {new Date(log.createdAt).toLocaleString('th-TH')}
                  </time>
                  <h3 className="text-sm font-semibold text-gray-900">{log.action}</h3>
                  {log.details && <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>}
                  <p className="text-xs text-gray-400 mt-1">โดย {log.user?.fullName ?? 'System / External'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <FolderSync className="w-5 h-5 mr-2 text-purple-600" />
                แปลงเป็น Project / Task
              </h2>
              <button onClick={() => setShowConvertModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="flex gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="convertType"
                    checked={convertType === 'PROJECT'}
                    onChange={() => setConvertType('PROJECT')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-medium text-gray-900">สร้างเป็น Project ใหม่</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="convertType"
                    checked={convertType === 'TASK'}
                    onChange={() => setConvertType('TASK')}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-medium text-gray-900">เพิ่มเป็น Task ย่อยในโปรเจกต์เดิม</span>
                </label>
              </div>

              {convertType === 'PROJECT' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโปรเจกต์</label>
                    <input
                      type="text"
                      value={projectDetails.name}
                      onChange={e => setProjectDetails({ ...projectDetails, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด / วัตถุประสงค์</label>
                    <textarea
                      value={projectDetails.objective}
                      onChange={e => setProjectDetails({ ...projectDetails, objective: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 h-24 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน (Work Type)</label>
                    <select
                      value={projectDetails.workTypeId}
                      onChange={e => setProjectDetails({ ...projectDetails, workTypeId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">-- เลือกประเภทงาน --</option>
                      {workTypes.map(wt => (
                        <option key={wt.id} value={wt.id}>{wt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ความเร่งด่วน</label>
                    <select
                      value={projectDetails.urgency}
                      onChange={e => setProjectDetails({ ...projectDetails, urgency: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">เลือกโปรเจกต์เป้าหมาย</label>
                    <select
                      value={taskDetails.projectId}
                      onChange={e => setTaskDetails({ ...taskDetails, projectId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">-- เลือกโปรเจกต์ --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน (Task Name)</label>
                    <input
                      type="text"
                      value={taskDetails.name}
                      onChange={e => setTaskDetails({ ...taskDetails, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConvert}
                disabled={isConverting || (convertType === 'PROJECT' && (!projectDetails.name || !projectDetails.workTypeId)) || (convertType === 'TASK' && (!taskDetails.name || !taskDetails.projectId))}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 flex items-center"
              >
                {isConverting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                ยืนยันการแปลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
