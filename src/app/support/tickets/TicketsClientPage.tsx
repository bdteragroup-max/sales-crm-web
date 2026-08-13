"use client";

import React, { useState, useEffect } from 'react';
import { getMyTickets, createTicket } from '@/app/actions/tickets';
import { LifeBuoy, Plus, Search, Filter, AlertCircle, FileText, CheckCircle2, Clock, Activity, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TicketsClientPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('MEDIUM');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const res = await getMyTickets();
    if (res.success && res.data) {
      setTickets(res.data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError('กรุณากรอกหัวข้อและรายละเอียดให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        attachmentUrls = await uploadFiles(attachments);
      }

      const res = await createTicket({
        title,
        description,
        urgency,
        attachments: attachmentUrls,
      });

      if (res.success) {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        setAttachments([]);
        setUrgency('MEDIUM');
        fetchTickets();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการสร้างรายการ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING') return t.status === 'SUBMITTED';
    if (filterStatus === 'IN_PROGRESS') return t.status === 'ACKNOWLEDGED' || t.status === 'IN_PROGRESS';
    if (filterStatus === 'RESOLVED') return t.status === 'RESOLVED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> รอดำเนินการ</span>;
      case 'ACKNOWLEDGED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><AlertCircle className="w-3 h-3 mr-1" /> รับทราบปัญหาแล้ว</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Activity className="w-3 h-3 mr-1" /> กำลังแก้ไข</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> แก้ไขแล้ว (ปิดงาน)</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <LifeBuoy className="mr-2 text-red-600" />
            แจ้งปัญหาระบบ (Support Tickets)
          </h1>
          <p className="text-gray-500 mt-1">ติดตามและแจ้งปัญหาการใช้งานระบบให้ทีมงานทราบ</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex justify-center items-center bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-1" />
          แจ้งปัญหาใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filterStatus === status 
                  ? 'bg-red-50 text-red-700 font-medium border border-red-200' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'ALL' && 'ทั้งหมด'}
              {status === 'PENDING' && 'รอดำเนินการ'}
              {status === 'IN_PROGRESS' && 'กำลังดำเนินการ'}
              {status === 'RESOLVED' && 'เสร็จสิ้น'}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">ไม่มีรายการปัญหา</h3>
          <p className="text-gray-500 mt-1">คุณยังไม่เคยแจ้งปัญหาระบบ หรือไม่มีรายการในสถานะนี้</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <Link href={`/support/tickets/${ticket.id}`} key={ticket.id} className="block">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-red-300 hover:shadow-md transition cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                      {ticket.ticketNumber}
                    </span>
                    {getUrgencyBadge(ticket.urgency)}
                  </div>
                  <div>{getStatusBadge(ticket.status)}</div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">{ticket.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{ticket.description}</p>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500 gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span>แจ้งเมื่อ: {new Date(ticket.createdAt).toLocaleDateString('th-TH')}</span>
                    {ticket.assignee && (
                      <span className="flex items-center">
                        ผู้รับผิดชอบ: {ticket.assignee.fullName}
                      </span>
                    )}
                  </div>
                  
                  {ticket.status !== 'SUBMITTED' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${ticket.progressPercent === 100 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${ticket.progressPercent}%` }}
                        ></div>
                      </div>
                      <span className="font-medium text-gray-700">{ticket.progressPercent}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        แจ้งปัญหาใหม่
                      </h3>
                      
                      {error && (
                        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                          {error}
                        </div>
                      )}

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อปัญหา <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="เช่น ไม่สามารถอัปโหลดไฟล์ในระบบ PR ได้"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด <span className="text-red-500">*</span></label>
                          <textarea 
                            required
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="อธิบายขั้นตอนที่ทำให้เกิดปัญหา หรือสิ่งที่พบเห็น..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความรุนแรง</label>
                          <select 
                            value={urgency}
                            onChange={(e) => setUrgency(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="LOW">Low - ไม่เร่งด่วน ใช้งานส่วนอื่นได้</option>
                            <option value="MEDIUM">Medium - ปานกลาง กระทบการทำงานบ้าง</option>
                            <option value="HIGH">High - สูง ทำงานต่อไม่ได้</option>
                            <option value="CRITICAL">Critical - วิกฤต ระบบล่ม/กระทบรายได้โดยตรง</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">แนบไฟล์ / รูปภาพ (ถ้ามี)</label>
                          <input 
                            type="file" 
                            multiple
                            onChange={handleFileChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:bg-red-400"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'บันทึกแจ้งปัญหา'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
