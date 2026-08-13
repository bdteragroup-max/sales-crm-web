"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getTicketById, addComment, updateResolutionPlan, resolveTicket, reassignTicket } from '@/app/actions/tickets';
import { getAllUsersForBD } from '@/app/actions/bd'; // We can reuse this for getting users to reassign
import { LifeBuoy, AlertCircle, Clock, CheckCircle2, Activity, MessageSquare, Paperclip, ChevronLeft, Send, Loader2, Save, UserPlus } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function TicketManageDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // BD specific states
  const [resolutionPlan, setResolutionPlan] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Reassign states
  const [showReassign, setShowReassign] = useState(false);
  const [bdUsers, setBdUsers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

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

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>;
  if (error || !ticket) return <div className="p-12 text-center text-red-600">{error}</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Link href="/bd/tickets" className="inline-flex items-center text-red-600 hover:text-red-800 font-medium">
          <ChevronLeft className="w-4 h-4 mr-1" /> กลับไปหน้ารายการ
        </Link>
        <div className="flex gap-2">
          {ticket.status !== 'RESOLVED' && ticket.status !== 'SUBMITTED' && (
            <button
              onClick={() => setShowReassign(!showReassign)}
              className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> มอบหมายงานใหม่
            </button>
          )}
          {ticket.status !== 'RESOLVED' && ticket.status !== 'SUBMITTED' && (
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
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">ไฟล์แนบจากผู้แจ้ง</h3>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center bg-white border border-gray-200 rounded p-2 text-sm text-red-600 hover:bg-red-50 transition">
                        <Paperclip className="w-4 h-4 mr-2" /> ไฟล์แนบ {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BD Work Area */}
          {ticket.status !== 'SUBMITTED' && ticket.status !== 'RESOLVED' && (
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
                {ticket.reporter.fullName.charAt(0)}
              </div>
              <div>
                <div className="text-sm text-gray-900 font-medium">{ticket.reporter.fullName}</div>
                <div className="text-xs text-gray-500">{ticket.reporter.role}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleString('th-TH')}</div>
              </div>
            </div>
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
                  <p className="text-xs text-gray-400 mt-1">โดย {log.user.fullName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
