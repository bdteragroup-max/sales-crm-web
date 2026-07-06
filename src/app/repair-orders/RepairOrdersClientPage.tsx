"use client";

import React, { useState } from "react";
import { Wrench, Plus, Search, FileText, CheckCircle2, Clock, Trash2, Edit2, FileDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRepairOrder, updateRepairOrderStatus, updateRepairOrderTechnician } from "@/app/actions/repairOrders";
import { getCurrentStepDef } from "@/app/lib/job-workflow";

interface RepairOrdersClientPageProps {
  initialRepairOrders?: any[];
  companies?: any[];
  users?: any[];
  userRole?: string;
}

export default function RepairOrdersClientPage({
  initialRepairOrders = [],
  companies = [],
  users = [],
  userRole,
}: RepairOrdersClientPageProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isUpdatingTech, setIsUpdatingTech] = useState<string | null>(null);

  const filteredRepairs = initialRepairOrders.filter((ro) => {
    const term = searchTerm.toLowerCase();
    const matchJob = ro.job?.jobNumber?.toLowerCase().includes(term);
    const matchCompany = ro.customerCompany?.toLowerCase().includes(term) || ro.company?.toLowerCase().includes(term) || ro.job?.customerName?.toLowerCase().includes(term);
    const matchTech = ro.technicianName?.toLowerCase().includes(term);
    
    // Status filter mapping:
    let matchStatus = true;
    const step = ro.job?.currentStep;
    if (statusFilter === "Pending Repair") matchStatus = ["service_receive", "sales_quote", "customer_approval"].includes(step);
    else if (statusFilter === "Under Repair") matchStatus = ["service_repair", "service_outsource", "purchase_followup", "service_receive_back", "service_qc"].includes(step);
    else if (statusFilter === "Completed") matchStatus = ["service_return", "accounting"].includes(step) || !!ro.sentDate;
    else if (statusFilter === "Returned") matchStatus = !!ro.sentDate;

    return (matchJob || matchCompany || matchTech) && matchStatus;
  });

  const totalCount = initialRepairOrders.length;
  const pendingCount = initialRepairOrders.filter((ro) => ["service_receive", "sales_quote", "customer_approval"].includes(ro.job?.currentStep)).length;
  const underRepairCount = initialRepairOrders.filter((ro) => ["service_repair", "service_outsource", "purchase_followup", "service_receive_back", "service_qc"].includes(ro.job?.currentStep)).length;
  const completedCount = initialRepairOrders.filter((ro) => ["service_return", "accounting"].includes(ro.job?.currentStep) || !!ro.sentDate).length;

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบใบรับซ่อมนี้ใช่หรือไม่?')) {
      await deleteRepairOrder(id);
    }
  };

  const handleStatusChange = async (jobId: string, newStep: string) => {
    if (!jobId) return;
    setIsUpdating(jobId);
    try {
      await updateRepairOrderStatus(jobId, newStep);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleTechnicianChange = async (jobId: string, techName: string) => {
    if (!jobId) return;
    setIsUpdatingTech(jobId);
    try {
      await updateRepairOrderTechnician(jobId, techName);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการอัปเดตช่าง");
    } finally {
      setIsUpdatingTech(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm md:overflow-hidden overflow-visible">
      {/* ── Top Header Bar ── */}
      <header className="shrink-0 md:h-20 py-4 md:py-0 border-b border-gray-100 px-6 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between bg-white w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#ff2301] flex items-center justify-center shadow-lg shadow-red-200">
            <Wrench size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              ใบรับซ่อม
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Repair Orders Management
            </p>
          </div>
        </div>
      </header>

      {/* ── KPI Summary Strip ── */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
        {[
          { label: "ทั้งหมด (Total)", value: totalCount, icon: <FileText size={14} />, color: "text-gray-400", bg: "bg-gray-50" },
          { label: "รอซ่อม (Pending)", value: pendingCount, icon: <Clock size={14} />, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "กำลังซ่อม (Under Repair)", value: underRepairCount, icon: <Wrench size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "เสร็จสิ้น (Completed)", value: completedCount, icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
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
            <FileText size={14} /> รายการทั้งหมด ({filteredRepairs.length})
          </div>
          <Link
            href="/repair-orders/new"
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Plus size={14} /> บันทึกใหม่
          </Link>
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
                  placeholder="ค้นหาชื่อบริษัท, เลขที่งานซ่อม, ชื่อช่างซ่อม..."
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
                <option value="">สถานะทั้งหมด (All)</option>
                <option value="Pending Repair">รอซ่อม (Pending Repair)</option>
                <option value="Under Repair">กำลังซ่อม (Under Repair)</option>
                <option value="Completed">ซ่อมเสร็จ (Completed)</option>
                <option value="Returned">ส่งคืนแล้ว (Returned)</option>
              </select>
            </div>

            {/* Datalist for technicians */}
            <datalist id="technician-list">
              {users?.filter(u => u.role?.toLowerCase().includes("service") || u.role?.toLowerCase().includes("ช่าง") || u.role?.toLowerCase().includes("บริการ")).map((u: any) => (
                <option key={u.id} value={u.fullName} />
              ))}
              {users?.filter(u => !u.role?.toLowerCase().includes("service") && !u.role?.toLowerCase().includes("ช่าง") && !u.role?.toLowerCase().includes("บริการ")).map((u: any) => (
                <option key={u.id} value={u.fullName} />
              ))}
            </datalist>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      วันที่รับซ่อม
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      เลขที่งาน
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      ลูกค้า
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest max-w-[200px]">
                      สินค้าเบื้องต้น (จาก Sales)
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      พนักงานขาย
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      ประเภทงาน
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      ผู้รับซ่อม
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      ช่างซ่อม
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      สถานะ
                    </th>
                    <th className="py-4 px-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRepairs.length > 0 ? (
                    filteredRepairs.map((record: any) => (
                      <tr key={record.id} className="group hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-5 text-[11px] font-bold text-gray-400 whitespace-nowrap">
                          {record.createdAt
                            ? new Date(record.createdAt).toLocaleDateString("th-TH", {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-4 px-5">
                          {record.jobId ? (
                            <Link href={`/jobs?jobId=${record.jobId}`} className="text-xs font-black text-blue-600 hover:text-blue-800 hover:underline font-mono transition-colors">
                              {record.job?.jobNumber || "—"}
                            </Link>
                          ) : (
                            <span className="text-xs font-black text-gray-800 font-mono">
                              {record.job?.jobNumber || "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 max-w-[200px]">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {record.customerCompany || record.job?.customerName || "—"}
                          </p>
                        </td>
                        <td className="py-4 px-5 max-w-[200px]">
                          <p className="text-xs text-gray-600 truncate" title={record.job?.item || ""}>
                            {record.job?.item || "—"}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-[11px] font-bold text-gray-600 truncate">
                            {record.job?.sellerName || "—"}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                            {record.workType || record.job?.jobType || "—"}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <p className="text-[11px] font-bold text-gray-600">
                            {record.receiverName || "—"}
                          </p>
                        </td>
                        <td className="py-4 px-5">
                          {record.jobId ? (
                            <div className="relative inline-block">
                              <input
                                type="text"
                                list="technician-list"
                                defaultValue={record.technicianName || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (record.technicianName || "")) {
                                    handleTechnicianChange(record.jobId, e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                disabled={isUpdatingTech === record.jobId}
                                placeholder="ระบุช่างซ่อม..."
                                className={`inline-flex px-2.5 py-1 rounded-xl text-[11px] font-bold tracking-wide outline-none bg-purple-50 text-purple-700 border border-purple-100 focus:ring-2 focus:ring-purple-300 w-[140px] ${isUpdatingTech === record.jobId ? "opacity-50" : ""}`}
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-gray-400">
                              {record.technicianName || "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          {record.jobId ? (
                            <div className="relative inline-block">
                              <select
                                value={record.job?.currentStep || ""}
                                onChange={(e) => handleStatusChange(record.jobId, e.target.value)}
                                disabled={isUpdating === record.jobId}
                                className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider appearance-none cursor-pointer outline-none pr-6 ${
                                  ["service_return", "accounting", "closed"].includes(record.job?.currentStep) || record.sentDate ? 'bg-emerald-100 text-emerald-600' :
                                  ["service_repair", "service_outsource", "purchase_followup", "service_receive_back", "service_qc"].includes(record.job?.currentStep) ? 'bg-blue-100 text-blue-600' :
                                  'bg-amber-100 text-amber-600'
                                } ${isUpdating === record.jobId ? "opacity-50" : ""}`}
                              >
                                <option value="service_receive">รอรับซ่อม</option>
                                <option value="service_repair">กำลังซ่อม</option>
                                <option value="service_outsource">ส่งซ่อมภายนอก</option>
                                <option value="service_qc">ตรวจสอบคุณภาพ (QC)</option>
                                <option value="service_return">ส่งคืนแล้ว</option>
                                <option value="closed">เสร็จสิ้น (Closed)</option>
                                <option value="accounting">รอบัญชีออกบิล</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500">
                                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                              รอรับซ่อม
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/repair-orders/${record.jobId}/print`}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="พิมพ์ PDF"
                            >
                              <FileDown size={16} />
                            </Link>
                            <Link
                              href={`/repair-orders/${record.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit2 size={16} />
                            </Link>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <Wrench size={36} strokeWidth={1} />
                          <p className="text-xs font-bold uppercase tracking-widest">
                            {searchTerm ? "ไม่พบข้อมูลที่ค้นหา" : "ยังไม่มีใบรับซ่อม"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  );
}
