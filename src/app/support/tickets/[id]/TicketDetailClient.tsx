"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getTicketById, addComment } from '@/app/actions/tickets';
import { LifeBuoy, AlertCircle, Clock, CheckCircle2, Activity, MessageSquare, Paperclip, ChevronLeft, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    setLoading(true);
    const res = await getTicketById(ticketId);
    if (res.success && res.data) {
      setTicket(res.data);
    } else {
      setError(res.error || 'ไม่พบข้อมูล');
    }
    setLoading(false);
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
        fetchTicket(); // refresh
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"><Clock className="w-4 h-4 mr-1" /> รอดำเนินการ</span>;
      case 'ACKNOWLEDGED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><AlertCircle className="w-4 h-4 mr-1" /> รับทราบปัญหาแล้ว</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><Activity className="w-4 h-4 mr-1" /> กำลังแก้ไข</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-4 h-4 mr-1" /> แก้ไขแล้ว (ปิดงาน)</span>;
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link href="/support/tickets" className="inline-flex items-center text-red-600 hover:text-red-800 mb-6 font-medium">
        <ChevronLeft className="w-4 h-4 mr-1" /> กลับไปหน้ารายการแจ้งปัญหา
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
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

            {/* BD Resolution Plan Section */}
            {ticket.status !== 'SUBMITTED' && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Activity className="w-5 h-5 mr-2 text-red-600" /> แผนการแก้ไขและความคืบหน้า
                </h3>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">ความคืบหน้า</span>
                    <span className="text-sm font-medium text-red-600">{ticket.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${ticket.progressPercent === 100 ? 'bg-green-500' : 'bg-red-600'}`} 
                      style={{ width: `${ticket.progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">บันทึกจากทีมงาน (Resolution Plan)</h4>
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {ticket.resolutionPlan || <span className="text-gray-500 italic">ทีมงานรับทราบปัญหาแล้วและกำลังประเมินแผนการแก้ไข</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">ข้อมูลผู้แจ้ง</h3>
              <div className="text-sm text-gray-900 font-medium">{ticket.reporter.fullName}</div>
              <div className="text-xs text-gray-500">{ticket.reporter.role}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleString('th-TH')}</div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">ผู้รับผิดชอบ (BD)</h3>
              {ticket.assignee ? (
                <div className="text-sm text-gray-900 font-medium">{ticket.assignee.fullName}</div>
              ) : (
                <div className="text-sm text-gray-500 italic">ยังไม่มีผู้รับผิดชอบ</div>
              )}
            </div>

            {/* Status Timeline */}
            <div>
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

      {/* Comments Section */}
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
              const isMine = c.userId === ticket.reporterId; // in reporter view, mine is reporter
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
                  placeholder="พิมพ์ข้อความที่นี่..."
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
  );
}
