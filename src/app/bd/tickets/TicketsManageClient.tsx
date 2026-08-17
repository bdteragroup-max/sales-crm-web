"use client";

import React, { useState, useEffect } from 'react';
import { getAllTickets, getTicketStats, acceptTicket } from '@/app/actions/tickets';
import { LifeBuoy, Search, Filter, AlertCircle, CheckCircle2, Clock, Activity, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function TicketsManageClient() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, NEW, IN_PROGRESS, RESOLVED
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ticketsRes, statsRes] = await Promise.all([
      getAllTickets(),
      getTicketStats()
    ]);

    if (ticketsRes.success && ticketsRes.data) setTickets(ticketsRes.data);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    setLoading(false);
  };

  const handleAccept = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await Swal.fire({
      title: 'ยืนยันการรับงาน',
      text: 'คุณต้องการรับงานนี้ใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626', // red-600 to match theme
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ใช่, รับงานเลย',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      const res = await acceptTicket(id);
      if (res.success) {
        Swal.fire({
          title: 'รับงานสำเร็จ!',
          text: 'ระบบได้บันทึกคุณเป็นผู้ดูแลงานนี้แล้ว',
          icon: 'success',
          confirmButtonColor: '#dc2626',
        });
        fetchData();
      } else {
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: res.error || 'เกิดข้อผิดพลาดในการรับงาน',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      }
    }
  };

  const filteredTickets = tickets.filter(t => {
    // Status
    if (statusFilter === 'NEW' && t.status !== 'SUBMITTED') return false;
    if (statusFilter === 'IN_PROGRESS' && t.status !== 'ACKNOWLEDGED' && t.status !== 'IN_PROGRESS') return false;
    if (statusFilter === 'RESOLVED' && t.status !== 'RESOLVED') return false;

    // Urgency
    if (urgencyFilter !== 'ALL' && t.urgency !== urgencyFilter) return false;

    // Category
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.reporter?.fullName ?? t.reporterName ?? '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> ใหม่ (ยังไม่มีผู้รับ)</span>;
      case 'ACKNOWLEDGED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><AlertCircle className="w-3 h-3 mr-1" /> รับงานแล้ว</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Activity className="w-3 h-3 mr-1" /> กำลังดำเนินการ</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> ปิดงาน</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
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

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'LOW':
        return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Low</span>;
      case 'MEDIUM':
        return <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Medium</span>;
      case 'HIGH':
        return <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">High</span>;
      case 'CRITICAL':
        return <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-bold">Critical</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <LifeBuoy className="mr-2 text-red-600" />
          ระบบรับแจ้งปัญหา (Ticketing System)
        </h1>
        <p className="text-gray-500 mt-1">รับเรื่อง แผนการแก้ไข และติดตามความคืบหน้า</p>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium mb-1">ปัญหาทั้งหมด</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200 bg-yellow-50">
            <div className="text-yellow-700 text-sm font-medium mb-1 flex items-center"><Clock className="w-4 h-4 mr-1" /> รอดำเนินการ (New)</div>
            <div className="text-2xl font-bold text-yellow-800">{stats.new}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 bg-blue-50">
            <div className="text-blue-700 text-sm font-medium mb-1 flex items-center"><Activity className="w-4 h-4 mr-1" /> กำลังแก้ไข</div>
            <div className="text-2xl font-bold text-blue-800">{stats.inProgress}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 bg-green-50">
            <div className="text-green-700 text-sm font-medium mb-1 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> ปิดงานแล้ว</div>
            <div className="text-2xl font-bold text-green-800">{stats.resolved}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-medium mb-1">เวลาเฉลี่ยปิดงาน (ชม.)</div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgResolutionHours}</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหา Ticket ID, หัวข้อ หรือ ชื่อผู้แจ้ง..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-red-500 focus:border-red-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="QUESTION">Question</option>
            <option value="ACCOUNT_ACCESS">Account Access</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-red-500 focus:border-red-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="NEW">ใหม่ (รอดำเนินการ)</option>
            <option value="IN_PROGRESS">กำลังแก้ไข</option>
            <option value="RESOLVED">ปิดงานแล้ว</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความรุนแรง</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-red-500 focus:border-red-500"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">หัวข้อปัญหา</th>
                  <th className="px-6 py-4">ผู้แจ้ง</th>
                  <th className="px-6 py-4">ความรุนแรง</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4">ผู้รับผิดชอบ</th>
                  <th className="px-6 py-4 text-right">แอคชั่น</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm font-semibold text-red-600">{ticket.ticketNumber}</div>
                      <div className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString('th-TH')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">{ticket.title}</div>
                      {ticket.progressPercent > 0 && ticket.status !== 'RESOLVED' && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                            <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${ticket.progressPercent}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{ticket.progressPercent}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        {ticket.reporter?.fullName ?? ticket.reporterName ?? 'Unknown'}
                        {!ticket.reporterId && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200" title="Reported from external source (no CRM account)">
                            External
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{ticket.reporter?.role ?? ticket.reporterEmail ?? ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {getCategoryBadge(ticket.category)}
                        {getUrgencyBadge(ticket.urgency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {ticket.assignee ? ticket.assignee.fullName : <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {ticket.status === 'SUBMITTED' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/bd/tickets/${ticket.id}`}
                            className="inline-flex items-center text-gray-700 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 transition"
                          >
                            ดูรายละเอียด
                          </Link>
                          <button
                            onClick={(e) => handleAccept(e, ticket.id)}
                            className="inline-flex items-center text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md transition"
                          >
                            รับงาน
                          </button>
                        </div>
                      ) : (
                        <Link
                          href={`/bd/tickets/${ticket.id}`}
                          className="inline-flex items-center text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition"
                        >
                          จัดการ <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
