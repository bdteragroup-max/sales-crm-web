'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, User, MapPin, Edit3, X, Save, Clock, Briefcase, CheckCircle2, Download, AlertCircle } from 'lucide-react';
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

interface SchedulesClientProps {
  currentUser: UserData;
  provinces: string[];
}

export default function SchedulesClient({ currentUser, provinces }: SchedulesClientProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
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
      const startStr = dateRange.start.toISOString();
      const endStr = dateRange.end.toISOString();
      const res = await fetch(`/api/service/schedules?startDate=${startStr}&endDate=${endStr}`);
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data = await res.json();
      setUsers(data.users || []);
      setHolidays(data.holidays || []);
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      console.error(error);
      showToast('โหลดข้อมูลล้มเหลว', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const expandLeaveToDays = (leave: LeaveRequest): string[] => {
    const days = [];
    const current = new Date(leave.start_date);
    while (current <= new Date(leave.end_date)) {
      days.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
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
          date: selectedDate.toISOString(),
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
    } catch (error: any) {
      showToast(error.message || 'บันทึกล้มเหลว', 'error');
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
    } catch (error: any) {
      showToast(error.message || 'ลบล้มเหลว', 'error');
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
    const data: any[] = [];
    const days = eachDayOfInterval(dateRange);

    users.forEach(user => {
      days.forEach(day => {
        if (day.getDay() === 0) return; // Skip Sunday

        const dateKey = format(day, 'yyyy-MM-dd');
        const schedule = user.serviceSchedules.find(s => isSameDay(parseISO(s.date), day));
        const leave = userLeavesMap[user.employeeId]?.[dateKey];
        const holiday = holidays.find(h => isSameDay(parseISO(h.date), day));

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

        data.push({
          'ชื่อพนักงาน': user.fullName,
          'วันที่': format(day, 'dd/MM/yyyy', { locale: th }),
          'สถานะ': statusStr,
          'จังหวัด': provinceStr,
          'ประเภทงาน': jobTypeStr,
          'รายละเอียด': descStr,
          'ช่วงเวลา': durationStr
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
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
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

          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            วันนี้
          </button>
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
                        className={`p-3 text-center min-w-[140px] border-b-2 border-r border-gray-200 font-semibold shadow-[0_2px_0_white]
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
                        const holiday = holidays.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dayIsoLocal);
                        const leave = userLeavesMap[user.employeeId]?.[dayIsoLocal];
                        const schedules = user.serviceSchedules.filter(s => format(new Date(s.date), 'yyyy-MM-dd') === dayIsoLocal);

                        const isHoliday = !!holiday;
                        const editable = canEdit(user.id) && !isHoliday;

                        return (
                          <td
                            key={day.toISOString()}
                            className={`p-2 border-r border-b border-gray-200 relative ${editable ? 'hover:bg-blue-50/50' : ''}`}
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
                              <div className="w-full h-full min-h-[4rem] flex flex-col gap-1 p-1 pointer-events-none">
                                {leave && (
                                  <div className={`flex items-center justify-center gap-1 text-xs px-2 py-1 rounded-md text-center font-bold pointer-events-auto ${leave.status === 'approved' ? 'bg-red-100 text-red-700 border-red-300 border' : 'bg-yellow-100 text-yellow-700 border-yellow-300 border opacity-90'}`}>
                                    {leave.status === 'approved' ? (
                                      <><CheckCircle2 className="w-3 h-3" /> ลา (อนุมัติ)</>
                                    ) : (
                                      <><Clock className="w-3 h-3" /> ลา (รออนุมัติ)</>
                                    )}
                                  </div>
                                )}

                                {schedules.length > 0 ? (
                                  schedules.map(schedule => (
                                    <div 
                                      key={schedule.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (editable) openModal(user, day, schedule);
                                      }}
                                      className={`flex-1 flex flex-col gap-1 items-center justify-center rounded-md border p-1 text-sm transition-transform pointer-events-auto ${editable ? 'cursor-pointer hover:scale-[1.02]' : ''} ${getStatusColor(schedule.status)}`}
                                    >
                                      <span className="font-bold flex items-center gap-1">
                                          {schedule.status}
                                          {schedule.duration && schedule.duration !== 'เต็มวัน' && <span className="text-[10px] bg-white/50 px-1 rounded">{schedule.duration}</span>}
                                      </span>
                                      {schedule.province && (
                                        <span className="text-xs opacity-90 flex items-center gap-1 justify-center">
                                          <MapPin className="w-3 h-3" />
                                          {schedule.province}
                                        </span>
                                      )}
                                      {schedule.jobType && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/10 mt-1">
                                          {schedule.jobType === 'installation' ? 'ติดตั้ง' :
                                            schedule.jobType === 'repair' ? 'ซ่อม/PM' :
                                              schedule.jobType === 'survey' ? 'ดูหน้างาน' :
                                                schedule.jobType === 'meeting' ? 'ประชุม' :
                                                  schedule.jobType === 'training' ? 'อบรม' : 
                                                    schedule.jobType === 'other' ? 'อื่นๆ' : schedule.jobType}
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  !leave && (
                                    <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      {editable && (
                                        <button 
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
                                  )
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

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-xl flex items-center gap-3 z-[300] animate-fade-in ${
          toast.type === 'success' 
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
