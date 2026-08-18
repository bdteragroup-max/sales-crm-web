"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PhoneCall, Plus, Search, FileText, CheckCircle2, Clock, AlertCircle, Upload } from "lucide-react";

interface ServiceCallsClientPageProps {
  initialLogs: any[];
  userRole?: string;
}

export default function ServiceCallsClientPage({ initialLogs = [], userRole = "" }: ServiceCallsClientPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Local filtering based on status and search
  const filteredLogs = initialLogs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchCase = log.caseNumber?.toLowerCase().includes(term);
    const matchCompany = log.companyName?.toLowerCase().includes(term);
    const matchModel = log.inverterModel?.toLowerCase().includes(term);
    const matchTech = log.responsible?.fullName?.toLowerCase().includes(term) || log.responsibleName?.toLowerCase().includes(term);

    const matchesSearch = matchCase || matchCompany || matchModel || matchTech;

    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      const isPending = log.status === "Received notification" || log.status === "Waiting for on-site inspection" || log.status === "เปิดเคส" || log.status === "รอนัดหมาย";
      const isCompleted = log.status.includes("smoothly") || log.status.includes("ปิดเคส") || log.status.includes("ปกติ") || log.status.includes("Customer has not yet made changes") || log.status.includes("ระบบเดินได้เรียบร้อย") || log.status.includes("ลูกค้ายังไม่แก้ไข");
      const isInProgress = !isPending && !isCompleted; // Anything else is in progress, including old English strings

      if (statusFilter === "Pending") matchesStatus = isPending;
      else if (statusFilter === "In Progress") matchesStatus = isInProgress;
      else if (statusFilter === "Completed") matchesStatus = isCompleted;
      else matchesStatus = log.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const isLogPending = (log: any) => log.status === "Received notification" || log.status === "Waiting for on-site inspection" || log.status === "เปิดเคส" || log.status === "รอนัดหมาย";
  const isLogCompleted = (log: any) => log.status?.includes("smoothly") || log.status?.includes("ปิดเคส") || log.status?.includes("ปกติ") || log.status?.includes("Customer has not yet made changes") || log.status?.includes("ระบบเดินได้เรียบร้อย") || log.status?.includes("ลูกค้ายังไม่แก้ไข");
  const isLogInProgress = (log: any) => !isLogPending(log) && !isLogCompleted(log);

  const totalCount = initialLogs.length;
  const pendingCount = initialLogs.filter(isLogPending).length;
  const completedCount = initialLogs.filter(isLogCompleted).length;
  const inProgressCount = initialLogs.filter(isLogInProgress).length;

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
            <PhoneCall size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              บันทึกแจ้งปัญหาลูกค้า
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Service Call Log
            </p>
          </div>
        </div>
      </header>

      {/* ── KPI Summary Strip ── */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
        {[
          { label: "ทั้งหมด (Total)", value: totalCount, icon: <FileText size={14} />, color: "text-gray-400", bg: "bg-gray-50" },
          { label: "รอดำเนินการ (Pending)", value: pendingCount, icon: <AlertCircle size={14} />, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "กำลังดำเนินการ (In Progress)", value: inProgressCount, icon: <Clock size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "ปิดเคสแล้ว (Completed)", value: completedCount, icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((k) => (
          <div key={k.label} className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 ${k.bg}`}>
            <span className={k.color}>{k.icon}</span>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {k.label}
              </p>
              <p className={`text-sm md:text-lg font-black ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation (now just actions) ── */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 text-[#ff2301] border-[#ff2301] bg-red-50/50">
            <FileText size={14} /> รายการทั้งหมด ({filteredLogs.length})
          </div>
          <Link
            href="/service/calls/new"
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Plus size={14} /> บันทึกใหม่
          </Link>
          {(userRole === "Service Engineer MGR." || userRole === "SUPER_ADMIN") && (
            <Link
              href="/service-mgr/calls/import"
              className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 border-transparent text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all ml-2"
            >
              <Upload size={14} /> Import from Excel
            </Link>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 space-y-6">
          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อบริษัท, โมเดล, Case No..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] placeholder-gray-300 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-[11px] font-black uppercase tracking-widest border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff2301]/20 focus:border-[#ff2301] transition-all"
            >
              <option value="ALL">สถานะทั้งหมด (All)</option>
              <option value="Pending">รอดำเนินการ (Pending)</option>
              <option value="In Progress">กำลังดำเนินการ (In Progress)</option>
              <option value="Completed">ปิดเคสแล้ว (Completed)</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Case No.
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    วันที่รับแจ้ง
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    ลูกค้า / บริษัท
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest max-w-[200px]">
                    ปัญหาที่แจ้ง
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    โมเดล
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    สถานะ
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    ผู้รับผิดชอบ
                  </th>
                  <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="py-3 px-5 whitespace-nowrap font-medium text-gray-900">
                        {log.caseNumber}
                      </td>
                      <td className="py-3 px-5 text-gray-500 whitespace-nowrap">
                        {format(new Date(log.receivedDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-gray-900 line-clamp-1">{log.companyName}</div>
                        <div className="text-[11px] text-gray-400">{log.contactName}</div>
                      </td>
                      <td className="py-3 px-5">
                        <p className="line-clamp-2 text-gray-600 text-xs">{log.reportedIssue}</p>
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {log.inverterModel}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${isLogCompleted(log)
                            ? 'bg-emerald-100 text-emerald-700'
                            : isLogPending(log)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                          {isLogCompleted(log) ? 'Completed' : isLogPending(log) ? 'Pending' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-600 whitespace-nowrap text-xs">
                        {log.responsible?.fullName || log.responsibleName || <span className="text-gray-400 italic">ยังไม่ระบุ</span>}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <Link
                          href={`/service/calls/${log.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-[#ff2301] hover:text-red-800 transition-colors"
                        >
                          เปิดเอกสาร <Search size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
