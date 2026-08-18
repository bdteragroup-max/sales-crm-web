"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getServiceCallLogs, getServiceCallDashboardStats, getServiceUsers, updateServiceCallLog } from "@/app/actions/service-calls";
import { Upload, Search, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Swal from "sweetalert2";

export default function ServiceMgrCallsClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ openCount: 0, closedCount: 0, totalCount: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterResponsible, setFilterResponsible] = useState("ALL");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterStatus, filterResponsible]);

  const fetchInitialData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        getServiceCallDashboardStats(),
        getServiceUsers()
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getServiceCallLogs({ status: filterStatus, responsibleId: filterResponsible });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async (logId: string, currentUserId: string | null) => {
    const options: any = {};
    users.forEach(u => {
      options[u.id] = u.fullName;
    });

    const { value: newUserId } = await Swal.fire({
      title: 'เปลี่ยนผู้รับผิดชอบ',
      input: 'select',
      inputOptions: options,
      inputValue: currentUserId || "",
      showCancelButton: true,
      inputPlaceholder: 'เลือกพนักงาน'
    });

    if (newUserId && newUserId !== currentUserId) {
      try {
        await updateServiceCallLog(logId, { responsibleId: newUserId });
        Swal.fire({ icon: 'success', title: 'เปลี่ยนผู้รับผิดชอบสำเร็จ', timer: 1500, showConfirmButton: false });
        fetchLogs();
      } catch (e: any) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: e.message });
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">แดชบอร์ดจัดการแจ้งปัญหา (MGR)</h1>
        <Link href="/service-mgr/calls/import" className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded shadow hover:bg-emerald-700 transition">
          <Upload className="w-5 h-5" /> Import Excel (ข้อมูลเก่า)
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><AlertCircle className="w-5 h-5" /> รวมทั้งหมด</div>
          <div className="text-3xl font-bold">{stats.totalCount}</div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><Clock className="w-5 h-5" /> กำลังดำเนินการ (Open)</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.openCount}</div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
          <div className="flex items-center gap-2 text-gray-500 mb-2"><CheckCircle className="w-5 h-5" /> ปิดงานแล้ว (Closed)</div>
          <div className="text-3xl font-bold text-green-600">{stats.closedCount}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">สถานะ</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border p-2 rounded">
            <option value="ALL">ทั้งหมด</option>
            <option value="Received notification">Received notification</option>
            <option value="System running smoothly">System running smoothly</option>
            <option value="Customer has not yet made changes">Customer has not yet made changes</option>
            <option value="System still has issues">System still has issues</option>
            <option value="Machine broken">Machine broken</option>
            <option value="Waiting for on-site inspection">Waiting for on-site inspection</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">ผู้รับผิดชอบ</label>
          <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className="border p-2 rounded">
            <option value="ALL">ทุกคน</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 text-sm font-semibold text-gray-700">Case No.</th>
                <th className="p-3 text-sm font-semibold text-gray-700">วันที่รับแจ้ง</th>
                <th className="p-3 text-sm font-semibold text-gray-700">บริษัท / ลูกค้า</th>
                <th className="p-3 text-sm font-semibold text-gray-700">สถานะ</th>
                <th className="p-3 text-sm font-semibold text-gray-700">ผู้รับผิดชอบ</th>
                <th className="p-3 text-sm font-semibold text-gray-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center">กำลังโหลด...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center">ไม่พบข้อมูล</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm">{log.caseNumber}</td>
                  <td className="p-3 text-sm">{format(new Date(log.receivedDate), 'dd/MM/yyyy')}</td>
                  <td className="p-3 text-sm">
                    <div className="font-semibold">{log.companyName}</div>
                    <div className="text-gray-500 text-xs">{log.contactName}</div>
                  </td>
                  <td className="p-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${log.status?.includes('smoothly') || log.status?.includes('ปกติ') || log.status?.includes('ปิดเคส') || log.status?.includes('Customer has not yet made changes') || log.status?.includes('ระบบเดินได้เรียบร้อย') || log.status?.includes('ลูกค้ายังไม่แก้ไข') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={log.responsible ? "text-blue-700 font-medium" : "text-gray-500"}>
                        {log.responsible?.fullName || log.responsibleName || 'ยังไม่ระบุ'}
                      </span>
                      <button 
                        onClick={() => handleReassign(log.id, log.responsibleId)}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      >
                        เปลี่ยน
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    <Link href={`/service/calls/${log.id}`} className="text-blue-600 hover:underline">ดู/แก้ไข</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
