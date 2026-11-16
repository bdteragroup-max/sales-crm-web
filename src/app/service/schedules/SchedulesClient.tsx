'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  addWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { th } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  Edit3,
  X,
  Save,
  Clock,
  Briefcase,
  CheckCircle2,
  Download,
  AlertCircle,
  Wrench,
  ExternalLink,
  ClipboardList,
  Phone,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UserData {
  id: string;
  fullName: string;
  nickname?: string | null;
  role: string;
  employeeId?: string | null;
}

interface ServiceSchedule {
  id: string;
  userId: string;
  date: string; // ISO string
  status: string;
  jobType: string | null;
  jobDescription: string | null;
  duration: string | null;
  province: string | null;
}

interface Holiday {
  date: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  emp_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface ServiceUser extends UserData {
  employeeId: string;
  serviceSchedules: ServiceSchedule[];
}

interface InstallationScheduleOrder {
  id: string;
  installationNo: string;
  jobId: string | null;
  jobNumber: string | null;
  sellerName: string | null;
  company: string;
  jobName: string;
  technician: string | null;
  technicianPhone: string | null;
  status: string;
  isPlanned: boolean;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  installationDate: string | null;
  startDateKey: string;
  endDateKey: string;
  dateKeys: string[];
  startTimeBkk: string;
  endTimeBkk: string | null;
  workLocation: string | null;
  workPlan: string | null;
  technicianNote: string | null;
  matchedUserIds: string[];
}

interface SchedulesClientProps {
  currentUser: UserData;
  provinces: string[];
}

function formatBkkDateTimeLabel(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const datePart = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} • ${timePart === '24:00' ? '00:00' : timePart} น.`;
}

function getInstallationDayTimeLabel(order: InstallationScheduleOrder, dayKey: string): string {
  if (!order.isPlanned) {
    return 'รอลงเวลาแผน';
  }
  if (order.startDateKey === order.endDateKey) {
    return order.endTimeBkk
      ? `${order.startTimeBkk}-${order.endTimeBkk} น.`
      : `${order.startTimeBkk} น.`;
  }
  if (dayKey === order.startDateKey) {
    return `เริ่ม ${order.startTimeBkk} น.`;
  }
  if (dayKey === order.endDateKey) {
    return `ถึง ${order.endTimeBkk || order.startTimeBkk} น.`;
  }
  return 'ต่อเนื่องทั้งวัน';
}

export default function SchedulesClient({ currentUser, provinces }: SchedulesClientProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [installationOrders, setInstallationOrders] = useState<InstallationScheduleOrder[]>([]);
  const [showInstallations, setShowInstallations] = useState(true);
  const [showUnplannedInstallations, setShowUnplannedInstallations] = useState(true);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationScheduleOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState<{
    id?: string;
    status: string;
    jobType: string;
    jobDescription: string;
    duration: string;
    province: string;
  }>({
    status: 'ออฟฟิศ',
    jobType: '',
    jobDescription: '',
    duration: 'เต็มวัน',
    province: ''
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [customJobType, setCustomJobType] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Derived dates
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
    }
  }, [currentDate, viewMode]);

  const daysInView = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');
      const res = await fetch(`/api/service/schedules?startDate=${startStr}&endDate=${endStr}`);
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data = await res.json();
      setUsers(data.users || []);
      setHolidays(data.holidays || []);
      setLeaveRequests(data.leaveRequests || []);
      setInstallationOrders(data.installationOrders || []);
    } catch (error) {
      console.error(error);
      showToast('โหลดข้อมูลล้มเหลว', 'error');
    } finally {
      setLoading(false);
    }
  };

  const visibleInstallations = useMemo(() => {
    if (!showInstallations) return [];
    if (showUnplannedInstallations) return installationOrders;
    return installationOrders.filter((o) => o.isPlanned);
  }, [installationOrders, showInstallations, showUnplannedInstallations]);

  const installationsByUserDay = useMemo(() => {
    const map: Record<string, Record<string, InstallationScheduleOrder[]>> = {};
    for (const order of visibleInstallations) {
      for (const uid of order.matchedUserIds) {
        if (!map[uid]) map[uid] = {};
        for (const dayKey of order.dateKeys) {
          if (!map[uid][dayKey]) map[uid][dayKey] = [];
          map[uid][dayKey].push(order);
        }
      }
    }
    return map;
  }, [visibleInstallations]);

  const unmatchedInstallations = useMemo(
    () => visibleInstallations.filter((o) => o.matchedUserIds.length === 0),
    [visibleInstallations]
  );

  useEffect(() => {
    let active = true;
    const startStr = format(dateRange.start, 'yyyy-MM-dd');
    const endStr = format(dateRange.end, 'yyyy-MM-dd');
    fetch(`/api/service/schedules?startDate=${startStr}&endDate=${endStr}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch schedules');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setUsers(data.users || []);
        setHolidays(data.holidays || []);
        setLeaveRequests(data.leaveRequests || []);
        setInstallationOrders(data.installationOrders || []);
      })
      .catch((error) => {
        console.error(error);
        if (active) showToast('โหลดข้อมูลล้มเหลว', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dateRange]);

  const expandLeaveToDays = (leave: LeaveRequest): string[] => {
    const days = [];
    const startDateStr = leave.start_date.substring(0, 10);
    const endDateStr = leave.end_date.substring(0, 10);

    const current = new Date(`${startDateStr}T00:00:00Z`);
    const end = new Date(`${endDateStr}T00:00:00Z`);

    while (current <= end) {
      days.push(current.toISOString().substring(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return days;
  };

  const userLeavesMap = useMemo(() => {
    const map: Record<string, Record<string, LeaveRequest>> = {};
    for (const leave of leaveRequests) {
      if (!map[leave.emp_id]) map[leave.emp_id] = {};
      const dates = expandLeaveToDays(leave);
      for (const date of dates) {
        map[leave.emp_id][date] = leave;
      }
    }
    return map;
  }, [leaveRequests]);

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const roleStr = (currentUser.role || '').toLowerCase();
  const isServiceManager = roleStr.includes('mgr') || roleStr.includes('manager');
  const isServiceStaff = roleStr.includes('service') || roleStr.includes('ช่าง') || roleStr.includes('บริการ');

  const canEdit = (userId: string) => {
    // Watthika Mumthong can edit everyone
    if (currentUser.employeeId === 'TP65004' || currentUser.fullName.includes('วัฐฐิกา')) return true;

    // Service Engineer MGR can edit everyone
    if (isServiceManager && isServiceStaff) return true;

    // Admins can edit everyone
    if (roleStr === 'admin' || roleStr === 'แอดมิน') return true;

    // Service Engineer / Service can edit themselves
    if (isServiceStaff && currentUser.id === userId) return true;

    // All other roles (Sales, etc.) cannot edit
    return false;
  };

  const openModal = (user: ServiceUser, date: Date, existingSchedule?: ServiceSchedule) => {
    if (!canEdit(user.id)) {
      showToast('คุณไม่มีสิทธิ์แก้ไขตารางงานของบุคคลนี้', 'error');
      return;
    }

    let isStandardType = false;
    let initialJobType = existingSchedule?.jobType || '';
    if (['installation', 'repair', 'survey', 'meeting', 'training', 'other'].includes(initialJobType)) {
      isStandardType = true;
    }

    if (initialJobType && !isStandardType) {
      setCustomJobType(initialJobType);
      initialJobType = 'other_custom';
    } else {
      setCustomJobType('');
    }

    setSelectedUser(user);
    setSelectedDate(date);
    setFormData({
      id: existingSchedule?.id,
      status: existingSchedule?.status || 'ออฟฟิศ',
      jobType: initialJobType,
      jobDescription: existingSchedule?.jobDescription || '',
      duration: existingSchedule?.duration || 'เต็มวัน',
      province: existingSchedule?.province || ''
    });
    setIsModalOpen(true);
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedDate) return;

    if (formData.status === 'ออกต่างจังหวัด' && !formData.province) {
      showToast('กรุณาระบุจังหวัดเมื่อเลือกออกต่างจังหวัด', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/service/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          userId: selectedUser.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          status: formData.status,
          jobType: formData.jobType === 'other_custom' ? customJobType : formData.jobType,
          jobDescription: formData.jobDescription,
          duration: formData.duration,
          province: formData.province
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      showToast('บันทึกข้อมูลเรียบร้อย', 'success');
      setIsModalOpen(false);
      fetchSchedules(); // refresh
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'บันทึกล้มเหลว', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (!formData.id) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/service/schedules?id=${formData.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('ลบข้อมูลเรียบร้อย', 'success');
      setShowDeleteConfirm(false);
      setIsModalOpen(false);
      fetchSchedules();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'ลบล้มเหลว', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ออฟฟิศ': return 'bg-purple-200 text-purple-900 border-purple-300';
      case 'ออกต่างจังหวัด': return 'bg-orange-200 text-orange-900 border-orange-300';
      case 'ลา': return 'bg-red-200 text-red-900 border-red-300';
      case 'WFH': return 'bg-green-200 text-green-900 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const exportToExcel = () => {
    const data: Record<string, string>[] = [];
    const days = eachDayOfInterval(dateRange);

    users.forEach(user => {
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const schedule = user.serviceSchedules.find(s => s.date.substring(0, 10) === dateKey);
        const dayInstallations = installationsByUserDay[user.id]?.[dateKey] || [];
        if (day.getDay() === 0 && !schedule && dayInstallations.length === 0) return;

        const leave = userLeavesMap[user.employeeId]?.[dateKey];
        const holiday = holidays.find(h => h.date.substring(0, 10) === dateKey);

        let statusStr = '';
        let provinceStr = '';
        let jobTypeStr = '';
        let descStr = '';
        let durationStr = '';

        if (holiday) {
          statusStr = `วันหยุด: ${holiday.name}`;
        } else if (leave) {
          statusStr = `ลา (${leave.status === 'approved' ? 'อนุมัติ' : 'รออนุมัติ'})`;
        } else if (schedule) {
          statusStr = schedule.status;
          provinceStr = schedule.province || '';

          if (schedule.jobType) {
            jobTypeStr = schedule.jobType === 'installation' ? 'ติดตั้ง (Installation)' :
              schedule.jobType === 'repair' ? 'ซ่อม / PM' :
                schedule.jobType === 'survey' ? 'ดูหน้างาน (Site survey)' :
                  schedule.jobType === 'meeting' ? 'ประชุม (Meeting)' :
                    schedule.jobType === 'training' ? 'อบรม (Training)' :
                      schedule.jobType === 'other' ? 'อื่นๆ' : schedule.jobType;
          }
          descStr = schedule.jobDescription || '';
          durationStr = schedule.duration || '';
        } else {
          statusStr = 'ยังไม่ระบุ';
        }

        const installationStr = dayInstallations
          .map(o => `${o.installationNo} (${getInstallationDayTimeLabel(o, dateKey)}) ${o.company}`)
          .join(' | ');

        data.push({
          'ชื่อพนักงาน': user.fullName,
          'วันที่': format(day, 'dd/MM/yyyy', { locale: th }),
          'สถานะ': statusStr,
          'จังหวัด': provinceStr,
          'ประเภทงาน': jobTypeStr,
          'รายละเอียด': descStr,
          'ช่วงเวลา': durationStr,
          'งานติดตั้ง (/service/installation)': installationStr,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedules");
    XLSX.writeFile(wb, `Service_Schedules_${format(dateRange.start, 'yyyyMMdd')}_to_${format(dateRange.end, 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          ตารางงานเซอร์วิส (Service Schedules)
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>

          <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              รายสัปดาห์
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              รายเดือน
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full lg:w-auto">
            <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-center flex-1 sm:min-w-[200px] truncate">
              {viewMode === 'week'
                ? `${format(dateRange.start, 'd MMM yyyy', { locale: th })} - ${format(dateRange.end, 'd MMM yyyy', { locale: th })}`
                : format(currentDate, 'MMMM yyyy', { locale: th })
              }
            </h2>
            <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowInstallations(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showInstallations
                  ? 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>งานติดตั้ง ({installationOrders.length})</span>
            </button>

            {showInstallations && (
              <button
                type="button"
                onClick={() => setShowUnplannedInstallations(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  showUnplannedInstallations
                    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{showUnplannedInstallations ? '✓ รวมใบงานรอลงเวลา' : 'เฉพาะที่มีเวลาแผน'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              วันนี้
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full min-w-max border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-blue-50 text-blue-900 border-b-2 border-r-2 border-white p-3 text-left min-w-[150px] font-bold shadow-[0_2px_0_white]">
                    SERVICE / NAME
                  </th>
                  {daysInView.map(day => {
                    const isWknd = day.getDay() === 0;
                    return (
                      <th
                        key={day.toISOString()}
                        className={`p-3 text-center min-w-[155px] border-b-2 border-r border-gray-200 font-semibold shadow-[0_2px_0_white]
                          ${isWknd ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-900'}
                          ${isToday(day) ? 'ring-2 ring-blue-500 ring-inset' : ''}
                        `}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs uppercase opacity-80">{format(day, 'EEE', { locale: th })}</span>
                          <span className="text-lg">{format(day, 'd')}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={daysInView.length + 1} className="p-8 text-center text-gray-500">
                      ไม่พบข้อมูลพนักงาน
                    </td>
                  </tr>
                ) : (
                  users.map((user, i) => (
                    <tr key={user.id} className="group hover:bg-gray-50 transition-colors">
                      <td className={`p-3 border-r border-b border-gray-200 bg-white font-medium sticky left-0 z-10 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                            {user.fullName.charAt(0)}
                          </div>
                          <span className="truncate">
                            {user.fullName}
                            {user.nickname ? ` (${user.nickname})` : ''}
                          </span>
                        </div>
                      </td>
                      {daysInView.map(day => {
                        const dayIsoLocal = format(day, 'yyyy-MM-dd');
                        const holiday = holidays.find(h => h.date.substring(0, 10) === dayIsoLocal);
                        const leave = userLeavesMap[user.employeeId]?.[dayIsoLocal];
                        const schedules = user.serviceSchedules.filter(s => s.date.substring(0, 10) === dayIsoLocal);
                        const dayInstallations = installationsByUserDay[user.id]?.[dayIsoLocal] || [];

                        const isHoliday = !!holiday;
                        const editable = canEdit(user.id) && !isHoliday;

                        return (
                          <td
                            key={day.toISOString()}
                            className={`p-2 border-r border-b border-gray-200 relative align-top max-w-[190px] ${editable ? 'hover:bg-blue-50/50' : ''}`}
                            onClick={(e) => {
                              if (editable && e.target === e.currentTarget) {
                                openModal(user, day);
                              }
                            }}
                          >
                            {isHoliday ? (
                              <div className="bg-red-50 text-red-700 border-red-200 p-2 rounded-md border text-center text-sm font-bold flex flex-col justify-center h-full min-h-[4rem] cursor-not-allowed">
                                <span>วันหยุด</span>
                                <span className="text-xs opacity-90 mt-1">{holiday.name}</span>
                              </div>
                            ) : (
                              <div className="w-full h-full min-h-[4rem] flex flex-col gap-1.5 p-0.5 pointer-events-none">
                                {leave && (
                                  <div className={`flex items-center justify-center gap-1 text-xs px-2 py-1 rounded-md text-center font-bold pointer-events-auto ${leave.status === 'approved' ? 'bg-red-100 text-red-700 border-red-300 border' : 'bg-yellow-100 text-yellow-700 border-yellow-300 border opacity-90'}`}>
                                    {leave.status === 'approved' ? (
                                      <><CheckCircle2 className="w-3 h-3" /> ลา (อนุมัติ)</>
                                    ) : (
                                      <><Clock className="w-3 h-3" /> ลา (รออนุมัติ)</>
                                    )}
                                  </div>
                                )}

                                {schedules.length > 0 && schedules.map(schedule => (
                                  <div
                                    key={schedule.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (editable) openModal(user, day, schedule);
                                    }}
                                    className={`flex flex-col gap-0.5 items-center justify-center rounded-md border p-1.5 text-xs transition-transform pointer-events-auto ${editable ? 'cursor-pointer hover:scale-[1.02]' : ''} ${getStatusColor(schedule.status)}`}
                                  >
                                    <span className="font-bold flex items-center gap-1">
                                      {schedule.status}
                                      {schedule.duration && schedule.duration !== 'เต็มวัน' && <span className="text-[10px] bg-white/50 px-1 rounded">{schedule.duration}</span>}
                                    </span>
                                    {schedule.province && (
                                      <span className="text-[11px] opacity-90 flex items-center gap-1 justify-center">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        {schedule.province}
                                      </span>
                                    )}
                                    {schedule.jobType && (
                                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-black/10 mt-0.5">
                                        {schedule.jobType === 'installation' ? 'ติดตั้ง' :
                                          schedule.jobType === 'repair' ? 'ซ่อม/PM' :
                                            schedule.jobType === 'survey' ? 'ดูหน้างาน' :
                                              schedule.jobType === 'meeting' ? 'ประชุม' :
                                                schedule.jobType === 'training' ? 'อบรม' :
                                                  schedule.jobType === 'other' ? 'อื่นๆ' : schedule.jobType}
                                      </span>
                                    )}
                                  </div>
                                ))}

                                {/* Synced Installation Orders from /service/installation */}
                                {dayInstallations.map(order => (
                                  <button
                                    key={`${order.id}-${dayIsoLocal}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedInstallation(order);
                                    }}
                                    title={`${order.installationNo} • ${order.company}`}
                                    className={`w-full text-left rounded-md border p-1.5 text-[11px] transition-all pointer-events-auto cursor-pointer shadow-2xs ${
                                      order.isPlanned
                                        ? 'bg-sky-50 border-sky-300 text-sky-950 hover:bg-sky-100'
                                        : 'bg-amber-50/90 border-amber-200 text-amber-950 hover:bg-amber-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 font-bold">
                                      <span className="inline-flex items-center gap-1 truncate">
                                        <Wrench className={`w-3 h-3 shrink-0 ${order.isPlanned ? 'text-sky-600' : 'text-amber-600'}`} />
                                        <span className="truncate">{getInstallationDayTimeLabel(order, dayIsoLocal)}</span>
                                      </span>
                                    </div>
                                    <div className="font-semibold text-[11px] truncate mt-0.5 text-slate-900">
                                      {order.company}
                                    </div>
                                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 mt-0.5">
                                      <span className="font-mono truncate">{order.installationNo}</span>
                                      <span className="truncate opacity-80">{order.status}</span>
                                    </div>
                                  </button>
                                ))}

                                {schedules.length === 0 && !leave && (
                                  <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {editable && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openModal(user, day);
                                        }}
                                        className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 flex items-center gap-1 pointer-events-auto cursor-pointer"
                                      >
                                        <Edit3 className="w-3 h-3" /> เพิ่ม
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Installation orders in range whose assignee isn't in serviceUsers */}
      {unmatchedInstallations.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-amber-200/80 shadow-xs p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
              <span>งานติดตั้งจาก /service/installation ที่ผู้รับผิดชอบไม่อยู่ในตารางทีมเซอร์วิส ({unmatchedInstallations.length} งาน)</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unmatchedInstallations.map(order => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedInstallation(order)}
                className="text-left p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50 transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-red-600">{order.installationNo}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-800">
                    {order.isPlanned ? `${order.startTimeBkk}${order.endTimeBkk ? `-${order.endTimeBkk}` : ''} น.` : 'รอลงเวลา'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">{order.company}</div>
                <div className="text-[11px] text-slate-600 truncate">
                  ช่าง: <strong className="text-slate-900">{order.technician || 'ยังไม่ระบุช่าง'}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  {order.isPlanned
                    ? formatBkkDateTimeLabel(order.plannedStartDate)
                    : `วันที่ใบงาน: ${formatBkkDateTimeLabel(order.installationDate)}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedUser && selectedDate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white shadow-2xl w-full sm:max-w-md h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-red-600" />
                อัปเดตตารางงาน
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={saveSchedule} className="p-5 flex flex-col gap-4 flex-1">
              <div className="flex flex-col gap-1 mb-2 bg-red-50 p-3 rounded-lg border border-red-100">
                <span className="text-sm text-red-800 font-medium flex items-center gap-2">
                  <User className="w-4 h-4" /> พนักงาน: {selectedUser.fullName}
                </span>
                <span className="text-sm text-red-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> วันที่: {format(selectedDate, 'EEEE d MMMM yyyy', { locale: th })}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                  required
                >
                  <option value="ออฟฟิศ">ออฟฟิศ</option>
                  <option value="ออกต่างจังหวัด">ออกต่างจังหวัด</option>
                  <option value="ลา">ลา</option>
                  <option value="WFH">WFH (Work From Home)</option>
                </select>
              </div>

              {/* Only show work details if not on leave */}
              {formData.status !== 'ลา' && (
                <>
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จังหวัด {formData.status === 'ออกต่างจังหวัด' && '(จำเป็น)'}
                    </label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        list="province-options"
                        value={formData.province || ''}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        placeholder="-- ค้นหาหรือเลือกจังหวัด --"
                        className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                        required={formData.status === 'ออกต่างจังหวัด'}
                      />
                      <datalist id="province-options">
                        {provinces.map(p => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน</label>
                    <div className="relative">
                      <Briefcase className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={formData.jobType}
                        onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                        className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="">-- เลือกประเภทงาน --</option>
                        <option value="installation">ติดตั้ง (Installation)</option>
                        <option value="repair">ซ่อม / PM</option>
                        <option value="survey">ดูหน้างาน (Site survey)</option>
                        <option value="meeting">ประชุม (Meeting)</option>
                        <option value="training">อบรม (Training)</option>
                        <option value="other">อื่นๆ</option>
                        <option value="other_custom">ระบุประเภทงานเอง...</option>
                      </select>
                    </div>
                    {formData.jobType === 'other_custom' && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                        <input
                          type="text"
                          value={customJobType}
                          onChange={(e) => setCustomJobType(e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                          placeholder="พิมพ์ระบุประเภทงาน..."
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดงาน / สถานที่</label>
                      <input
                        type="text"
                        value={formData.jobDescription}
                        onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="เช่น ซ่อมตู้ปั๊มน้ำ, ติดตั้งที่ รพ."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ช่วงเวลา</label>
                    <div className="relative">
                      <Clock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="เต็มวัน">เต็มวัน</option>
                        <option value="ครึ่งเช้า">ครึ่งเช้า</option>
                        <option value="ครึ่งบ่าย">ครึ่งบ่าย</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex-1"></div>
              <div className="flex justify-end gap-3 mt-4 pt-5 border-t border-gray-100 bg-white sticky bottom-0 z-10 pb-2">
                {formData.id && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving}
                    className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors mr-auto"
                    title="ลบรายการ"
                  >
                    ลบ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm border border-gray-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-600 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={deleteSchedule}
                disabled={saving}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium flex items-center justify-center gap-2 min-w-[80px] transition-colors"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Installation Detail Modal */}
      {selectedInstallation && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedInstallation(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-slate-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-red-600 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    รายละเอียดงานติดตั้ง (/service/installation)
                  </h3>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {selectedInstallation.installationNo}
                  {selectedInstallation.jobNumber ? ` • ${selectedInstallation.jobNumber}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInstallation(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">ลูกค้า</div>
                  <div className="font-bold text-slate-900">{selectedInstallation.company}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{selectedInstallation.jobName}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                  {selectedInstallation.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div className="space-y-0.5">
                  <div className="text-slate-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    ช่างผู้รับผิดชอบ
                  </div>
                  <div className="font-bold text-slate-900">
                    {selectedInstallation.technician || 'ยังไม่ระบุช่าง'}
                  </div>
                  {selectedInstallation.technicianPhone && (
                    <a
                      href={`tel:${selectedInstallation.technicianPhone}`}
                      className="inline-flex items-center gap-1 text-red-600 hover:underline font-medium"
                    >
                      <Phone className="w-3 h-3" />
                      {selectedInstallation.technicianPhone}
                    </a>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedInstallation.isPlanned ? 'วัน-เวลาติดตั้งตามแผน' : 'วันที่ใบงานติดตั้ง'}
                  </div>
                  {selectedInstallation.isPlanned ? (
                    <div className="space-y-0.5 font-semibold text-slate-900">
                      <div>เริ่ม: {formatBkkDateTimeLabel(selectedInstallation.plannedStartDate)}</div>
                      {selectedInstallation.plannedEndDate && (
                        <div>สิ้นสุด: {formatBkkDateTimeLabel(selectedInstallation.plannedEndDate)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-amber-800">
                        {formatBkkDateTimeLabel(selectedInstallation.installationDate)}
                      </div>
                      <div className="text-[11px] text-amber-700">ยังไม่ได้กำหนดเวลาแผนติดตั้ง</div>
                    </div>
                  )}
                </div>
              </div>

              {selectedInstallation.workLocation && (
                <div className="p-3 rounded-xl bg-red-50/50 border border-red-200/70 text-xs space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>สถานที่หน้างาน</span>
                  </div>
                  {/^https?:\/\//i.test(selectedInstallation.workLocation.trim()) ? (
                    <>
                      <a
                        href={selectedInstallation.workLocation.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        เปิดแผนที่ Google Maps
                      </a>
                      <p className="text-[11px] text-slate-500 break-all">
                        {selectedInstallation.workLocation.trim()}
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-700 break-words">{selectedInstallation.workLocation}</p>
                  )}
                </div>
              )}

              {selectedInstallation.workPlan && (
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
                    <span>ขั้นตอนการทำงาน</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    {selectedInstallation.workPlan
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                      .map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                  </ol>
                </div>
              )}

              {selectedInstallation.technicianNote && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="font-bold text-slate-700">อุปกรณ์ / หมายเหตุช่าง</div>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedInstallation.technicianNote}</p>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/service/installation"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
              >
                ไปหน้างานติดตั้งรวม →
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {selectedInstallation.jobId && (
                  <>
                    <Link
                      href={`/jobs/${selectedInstallation.jobId}/installation-schedule`}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                    >
                      {selectedInstallation.isPlanned ? 'แก้ไขแผน/เวลา' : 'กำหนดวัน-เวลา'}
                    </Link>
                    <Link
                      href={`/jobs/${selectedInstallation.jobId}/installation-plan`}
                      className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                    >
                      ดูหน้าแผนงาน
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-xl flex items-center gap-3 z-[300] animate-fade-in ${toast.type === 'success'
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
