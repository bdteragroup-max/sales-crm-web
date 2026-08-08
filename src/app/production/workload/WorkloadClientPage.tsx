"use client"

import React, { useState, useEffect } from 'react'
import { Search, Users, GripVertical, X, Clipboard, PlayCircle, AlertTriangle, CheckCircle, Calendar, AlertCircle, MoreVertical, Flag, Clock, Filter, LayoutGrid, List, Wrench, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WorkloadClientPageProps {
  jobs: any[]
  technicians: any[]
  currentUser: any
}

export default function WorkloadClientPage({ jobs: initialJobs, technicians, currentUser }: WorkloadClientPageProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState(initialJobs)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [cabinetTypeFilter, setCabinetTypeFilter] = useState('all')
  const [issueFilter, setIssueFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
  }, [jobs])

  // Mock Logic for advanced fields based on Job ID
  const getMockPriority = (job: any) => {
    const val = parseInt(job.id.slice(-1), 16) || 0;
    if (val < 4) return 'P1';
    if (val < 10) return 'P2';
    return 'P3';
  }

  const getMockSubStatus = (job: any) => {
    if (job.status === 'QC_FAILED') return 'ติดปัญหา';
    if (job.status === 'PENDING') return 'รอเริ่ม';
    const subStatuses = ['Wiring Control', 'Power Wiring', 'ประกอบโครงตู้', 'ตรวจสาย'];
    const val = parseInt(job.id.slice(-2), 16) || 0;
    return subStatuses[val % subStatuses.length];
  }

  const getMockProgress = (job: any) => {
    if (job.status === 'COMPLETED') return 100;
    if (job.status === 'PENDING') return 0;
    const val = parseInt(job.id.slice(-2), 16) || 50;
    return 10 + (val % 80);
  }

  const getMockHours = (job: any) => {
    const total = 12 + (parseInt(job.id.slice(-1), 16) || 4);
    const progress = getMockProgress(job);
    const spent = Math.round((progress / 100) * total);
    return { spent, total };
  }

  const getMockIssue = (job: any) => {
    if (job.status !== 'QC_FAILED') return null;
    const issues = [
      { type: 'รอจัดซื้อ', text: 'รอ MCCB 250A' },
      { type: 'รอวิศวกร', text: 'รอแบบไฟฟ้า' },
      { type: 'รอซ่อม/แก้ไข', text: 'สายไฟชำรุด' }
    ];
    const val = parseInt(job.id.slice(-1), 16) || 0;
    return issues[val % issues.length];
  }

  const getCabinetType = (job: any) => {
    const types = ['MDB', 'DB', 'Control', 'Main Control', 'PLC Control'];
    const val = parseInt(job.id.slice(-1), 16) || 0;
    return `ตู้ ${types[val % types.length]}`;
  }

  const getMockDates = (job: any) => {
    const d = new Date();
    const val = parseInt(job.id.slice(-1), 16) || 2;
    // Due Date
    const dueDays = (val % 10) - 1; // -1 to 8 days from now
    d.setDate(d.getDate() + dueDays);
    const dueTime = d.getTime();

    // ETA Date
    const etaDays = dueDays + (val % 3 === 0 ? 1 : (val % 2 === 0 ? -1 : 0));
    const etaDate = new Date();
    etaDate.setDate(etaDate.getDate() + etaDays);
    const etaTime = etaDate.getTime();

    const isOverdue = new Date().getTime() > dueTime;
    const isDueToday = dueDays === 0;
    const isEtaLate = etaTime > dueTime;

    const format = (date: Date) => {
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    }

    return {
      dueText: format(d),
      etaText: format(etaDate),
      isOverdue,
      isDueToday,
      isEtaLate,
      daysLate: isEtaLate ? Math.ceil((etaTime - dueTime) / (1000 * 3600 * 24)) : 0
    };
  }

  const getMockCapacity = (techId: string) => {
    const val = parseInt(techId.slice(-1), 16) || 5;
    const cap = (val % 6) * 15 + 40; // 40 to 115%
    return Math.min(cap, 100);
  }

  const getMockNextQueue = (techId: string) => {
    const val = parseInt(techId.slice(-1), 16) || 0;
    if (val % 3 === 0) return 'ว่าง';
    const fakeNum = 10 + (val % 20);
    return `ORD69-080${fakeNum}-CAB-01`;
  }

  // KPI Calculations
  const activeJobs = jobs.filter(j => j.status !== 'COMPLETED')
  const totalJobsCount = activeJobs.length
  const inProgressCount = activeJobs.filter(j => j.status === 'IN_PROGRESS').length
  const issueCount = activeJobs.filter(j => j.status === 'QC_FAILED').length

  let p1Count = 0;
  let dueTodayCount = 0;
  let overdueCount = 0;

  activeJobs.forEach(j => {
    if (getMockPriority(j) === 'P1') p1Count++;
    const dates = getMockDates(j);
    if (dates.isDueToday) dueTodayCount++;
    if (dates.isOverdue) overdueCount++;
  });

  // Filter
  const filteredActiveJobs = activeJobs.filter(job => {
    const matchSearch = job.jobNumber?.toLowerCase().includes(search.toLowerCase()) ||
      job.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      job.order?.company?.companyName?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'QC_FAILED' && job.status === 'QC_FAILED') ||
      (statusFilter === 'IN_PROGRESS' && job.status === 'IN_PROGRESS') ||
      (statusFilter === 'PENDING' && job.status === 'PENDING');

    const mockPriority = getMockPriority(job);
    const matchPriority = priorityFilter === 'all' || mockPriority === priorityFilter;

    const mockType = getCabinetType(job);
    const matchType = cabinetTypeFilter === 'all' || mockType === cabinetTypeFilter;

    const mockIssue = getMockIssue(job);
    const matchIssue = issueFilter === 'all' || (mockIssue && mockIssue.type === issueFilter);

    return matchSearch && matchStatus && matchPriority && matchType && matchIssue;
  })

  const getJobsForTechnician = (techId: string) => {
    return filteredActiveJobs.filter(j => j.technicianId === techId)
  }

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    const element = e.currentTarget as HTMLElement
    const dragImage = element.cloneNode(true) as HTMLElement
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.opacity = '1'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 20, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDrop = async (e: React.DragEvent, targetTechId: string) => {
    e.preventDefault()
    const jobId = e.dataTransfer.getData('text/plain')
    setDragOverCol(null)
    setDraggingId(null)
    if (!jobId) return

    const updatedJobs = jobs.map(job =>
      job.id === jobId ? { ...job, technicianId: targetTechId } : job
    )
    setJobs(updatedJobs)

    try {
      const res = await fetch(`/api/production/workload/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, newTechnicianId: targetTechId })
      })
      if (!res.ok) throw new Error('Failed to update')
      router.refresh()
    } catch (err) {
      setJobs(initialJobs)
      alert('ไม่สามารถอัปเดตผู้รับผิดชอบได้')
    }
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4 max-w-[1920px] mx-auto text-gray-800">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">กระดานช่าง (Technician Workload)</h1>
            <p className="text-xs font-bold text-gray-500 mt-0.5">ภาพรวมงานของช่างทุกคน แบบเรียลไทม์</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-gray-400 hidden lg:inline-flex items-center gap-1.5 mr-2">
            <RefreshCw size={12} /> อัปเดตล่าสุด {lastUpdated} น.
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold transition-colors ${showFilters ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white hover:bg-gray-50 text-gray-600'}`}
          >
            <Filter size={16} /> ฟิลเตอร์
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา Job, ลูกค้า, เลขที่ใบสั่ง..."
              className="pl-9 pr-4 py-2 w-full rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPI Ribbon (7 blocks) */}
      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
        {[
          { label: 'ช่างทั้งหมด', count: technicians.length, unit: 'คน', icon: <Users size={18} className="text-blue-500" />, border: 'border-l-blue-500' },
          { label: 'งานทั้งหมด', count: totalJobsCount, unit: 'งาน', icon: <Clipboard size={18} className="text-blue-500" />, border: 'border-l-blue-500' },
          { label: 'กำลังทำ', count: inProgressCount, unit: 'งาน', icon: <Wrench size={18} className="text-emerald-500" />, border: 'border-l-emerald-500' },
          { label: 'ติดปัญหา', count: issueCount, unit: 'งาน', icon: <AlertTriangle size={18} className="text-orange-400" />, border: 'border-l-orange-400' },
          { label: 'งานด่วน (P1)', count: p1Count, unit: 'งาน', icon: <Flag size={18} className="text-red-500" />, border: 'border-l-red-500' },
          { label: 'ครบกำหนดวันนี้', count: dueTodayCount, unit: 'งาน', icon: <Calendar size={18} className="text-purple-500" />, border: 'border-l-purple-500' },
          { label: 'เกินกำหนด', count: overdueCount, unit: 'งาน', icon: <Clock size={18} className="text-red-500" />, border: 'border-l-red-500' },
        ].map((kpi, i) => (
          <div key={i} className={`flex-1 min-w-[140px] bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm border-l-4 ${kpi.border} flex items-start gap-3`}>
            <div className="mt-0.5">{kpi.icon}</div>
            <div>
              <p className="text-[11px] font-black text-gray-500 mb-1">{kpi.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-gray-900 leading-none">{kpi.count}</span>
                <span className="text-[10px] font-bold text-gray-400">{kpi.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={`flex flex-wrap gap-2 transition-all duration-300 ${showFilters ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden pointer-events-none'}`}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none hover:bg-gray-50">
            <option value="all">สถานะทั้งหมด</option>
            <option value="PENDING">รอเริ่ม</option>
            <option value="IN_PROGRESS">กำลังทำ</option>
            <option value="QC_FAILED">ติดปัญหา</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none hover:bg-gray-50">
            <option value="all">ความเร่งด่วนทั้งหมด</option>
            <option value="P1">P1 (Urgent)</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <select value={cabinetTypeFilter} onChange={e => setCabinetTypeFilter(e.target.value)} className="text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none hover:bg-gray-50">
            <option value="all">ประเภทงานทั้งหมด</option>
            <option value="ตู้ MDB">ตู้ MDB</option>
            <option value="ตู้ DB">ตู้ DB</option>
            <option value="ตู้ Control">ตู้ Control</option>
            <option value="ตู้ Main Control">ตู้ Main Control</option>
            <option value="ตู้ PLC Control">ตู้ PLC Control</option>
          </select>
          <select value={issueFilter} onChange={e => setIssueFilter(e.target.value)} className="text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none hover:bg-gray-50">
            <option value="all">ฝ่ายที่รอแก้ไขทั้งหมด</option>
            <option value="รอจัดซื้อ">รอจัดซื้อ</option>
            <option value="รอวิศวกร">รอวิศวกร</option>
            <option value="รอซ่อม/แก้ไข">รอซ่อม/แก้ไข</option>
          </select>
        </div>
        <div className="flex bg-white rounded-lg border border-gray-200 p-1 ml-auto">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === 'card' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <LayoutGrid size={14} /> มุมมองการ์ด
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === 'table' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <List size={14} /> มุมมองตาราง
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        /* Kanban Board */
        <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
          <div className="h-full flex gap-4 min-w-max items-start">
            {technicians.map((tech, i) => {
              const techJobs = getJobsForTechnician(tech.id)
              const isDragOver = dragOverCol === tech.id
              const capacity = getMockCapacity(tech.id)

              const techInProgress = techJobs.filter(j => j.status === 'IN_PROGRESS').length
              const techIssue = techJobs.filter(j => j.status === 'QC_FAILED').length

              const initialColor = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-green-100 text-green-600'][i % 5];

              return (
                <div
                  key={tech.id}
                  className={`w-[320px] flex flex-col bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${isDragOver ? 'border-red-400 shadow-md scale-[1.01]' : 'border-gray-200 shadow-sm'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(tech.id) }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => handleDrop(e, tech.id)}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${initialColor}`}>
                        {tech.fullName?.substring(0, 2) || 'ช่าง'}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <h3 className="font-black text-gray-900 text-sm truncate">{tech.fullName}</h3>
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-500">Capacity {capacity}%</span>
                        <span className="text-gray-400">เหลือรับงานเพิ่มได้ {capacity < 80 ? '2' : (capacity < 95 ? '1' : '0')} งาน</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${capacity > 90 ? 'bg-red-500' : (capacity > 75 ? 'bg-orange-500' : 'bg-green-500')}`} style={{ width: `${capacity}%` }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
                      <div>
                        <p className="text-lg font-black text-gray-900">{techJobs.length}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">งาน</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900">{techInProgress}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">กำลังทำ</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-red-500">{techIssue}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">ติดปัญหา</p>
                      </div>
                    </div>
                  </div>

                  {/* Column Body */}
                  <div className="p-3 bg-gray-50/50 space-y-3 overflow-y-auto custom-scrollbar h-[calc(100vh-420px)] min-h-[300px]">
                    {techJobs.map(job => {
                      const priority = getMockPriority(job);
                      const subStatus = getMockSubStatus(job);
                      const progress = getMockProgress(job);
                      const hours = getMockHours(job);
                      const issue = getMockIssue(job);
                      const dates = getMockDates(job);

                      const pColors: any = { P1: 'bg-red-50 text-red-600', P2: 'bg-yellow-50 text-yellow-600', P3: 'bg-blue-50 text-blue-600' };
                      const leftBorders: any = { PENDING: 'border-l-gray-300', IN_PROGRESS: 'border-l-blue-500', QC_FAILED: 'border-l-orange-500', COMPLETED: 'border-l-green-500' };

                      return (
                        <div
                          key={job.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, job.id)}
                          onDragEnd={() => setDraggingId(null)}
                          className={`
                          bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-red-300 transition-all border-l-4 ${leftBorders[job.status]}
                          ${draggingId === job.id ? 'opacity-40 scale-95' : 'opacity-100'}
                        `}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-black text-gray-900">{job.jobNumber}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${pColors[priority]}`}>{priority}</span>
                          </div>

                          <p className="text-[11px] font-bold text-gray-600 leading-tight mb-1 line-clamp-1">{job.order?.company?.companyName || 'ไม่ระบุลูกค้า'}</p>
                          <p className="text-[10px] font-bold text-gray-500 mb-2">{getCabinetType(job)}</p>

                          {issue ? (
                            <div className="mb-3 space-y-1">
                              <div className="flex items-center gap-1 text-orange-500 text-[10px] font-black">
                                <AlertTriangle size={10} /> ติดปัญหา
                              </div>
                              <p className="text-[10px] font-bold text-gray-500">รอ {issue.type}</p>
                              <p className="text-[10px] font-bold text-gray-900">รอฝ่าย: {issue.type.replace('รอ', '')}</p>
                              <p className="text-[10px] font-bold text-gray-900">รายละเอียด: {issue.text}</p>
                            </div>
                          ) : (
                            <div className="mb-3">
                              <p className={`text-[10px] font-black mb-1 ${job.status === 'PENDING' ? 'text-gray-400' : 'text-blue-600'}`}>{job.status === 'PENDING' ? 'รอเริ่ม' : 'กำลังประกอบ'}</p>
                              <p className="text-[10px] font-bold text-gray-500 mb-1.5">{subStatus}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                                <span className="text-[9px] font-black text-gray-500">{progress}%</span>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-gray-400">
                                <Clock size={9} /> {hours.spent} / {hours.total} ชม.
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-1 text-[9px] font-bold border-t border-gray-100 pt-2 mt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Due {dates.dueText}</span>
                              <span className="flex items-center gap-1 text-gray-500">
                                ETA {dates.etaText}
                                {dates.isEtaLate ? <span className="text-red-500">+{dates.daysLate} วัน</span> : <CheckCircle2 size={10} className="text-green-500" />}
                              </span>
                            </div>
                            <span className="text-gray-400">อัปเดต {lastUpdated}</span>
                          </div>
                        </div>
                      )
                    })}

                    <div className="h-10 flex items-center justify-center border border-dashed border-gray-200 bg-gray-50 rounded-xl text-gray-400 text-[10px] font-bold hover:bg-gray-100 cursor-pointer transition-colors">
                      + รับงานเพิ่มได้
                    </div>
                  </div>

                  {/* Column Footer */}
                  <div className="p-3 border-t border-gray-100 bg-white rounded-b-2xl">
                    <p className="text-[9px] font-bold text-gray-500">คิวงานถัดไป: <span className={getMockNextQueue(tech.id) === 'ว่าง' ? 'text-green-500' : 'text-gray-900'}>{getMockNextQueue(tech.id)}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="flex-1 overflow-auto custom-scrollbar pb-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-gray-50/80 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Job No.</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Customer</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Cabinet</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Technician</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Progress</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Due / ETA</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredActiveJobs.map((job, idx) => {
                const priority = getMockPriority(job);
                const subStatus = getMockSubStatus(job);
                const progress = getMockProgress(job);
                const hours = getMockHours(job);
                const issue = getMockIssue(job);
                const dates = getMockDates(job);
                const tech = technicians.find(t => t.id === job.technicianId);
                const techColor = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-green-100 text-green-600'][(idx % 5) % 5];
                const pColors: any = { P1: 'bg-red-50 text-red-600 border-red-100', P2: 'bg-yellow-50 text-yellow-600 border-yellow-100', P3: 'bg-blue-50 text-blue-600 border-blue-100' };

                return (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-gray-900">{job.jobNumber}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${pColors[priority]}`}>{priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-bold text-gray-600">
                      {job.order?.company?.companyName || 'ไม่ระบุลูกค้า'}
                    </td>
                    <td className="px-4 py-3 text-[10px] font-bold text-gray-500">
                      {getCabinetType(job)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 ${techColor}`}>
                          {tech?.fullName?.substring(0, 2) || 'ช่าง'}
                        </div>
                        <span className="text-[11px] font-bold text-gray-900">{tech?.fullName || 'ไม่ระบุช่าง'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-[10px] font-black ${job.status === 'PENDING' ? 'text-gray-400' : 'text-blue-600'}`}>{job.status === 'PENDING' ? 'รอเริ่ม' : 'กำลังประกอบ'}</p>
                      <p className="text-[9px] font-bold text-gray-500">{subStatus}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="text-[9px] font-black text-gray-500">{progress}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                        <Clock size={9} /> {hours.spent} / {hours.total} ชม.
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-[9px] font-bold">
                        <span className="text-gray-500">Due {dates.dueText}</span>
                        <span className="flex items-center gap-1 text-gray-500">
                          ETA {dates.etaText}
                          {dates.isEtaLate ? <span className="text-red-500">+{dates.daysLate} วัน</span> : <CheckCircle2 size={10} className="text-green-500" />}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {issue ? (
                        <div className="flex items-start gap-1">
                          <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-orange-500">{issue.type}</p>
                            <p className="text-[9px] font-bold text-gray-500 line-clamp-1">{issue.text}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Global Footer Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-auto shrink-0">
        <div>
          <h4 className="text-[10px] font-black text-gray-500 mb-3">สรุปงานตามสถานะ</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-600"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300"></span> รอเริ่ม</span> <span className="text-gray-900 font-black">5 งาน</span></div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-600"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> กำลังทำ</span> <span className="text-gray-900 font-black">9 งาน</span></div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-600"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> ติดปัญหา</span> <span className="text-gray-900 font-black">3 งาน</span></div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-600"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400"></span> รอ QC</span> <span className="text-gray-900 font-black">0 งาน</span></div>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-gray-500 mb-3">สรุปปัญหาที่ติดค้าง</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-600"><span>รอจัดซื้อ</span> <span className="text-gray-900">2 งาน</span></div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-600"><span>รอวิศวกร</span> <span className="text-gray-900">1 งาน</span></div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-600"><span>รอแบบ/ข้อมูล</span> <span className="text-gray-900">0 งาน</span></div>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-gray-500 mb-3">งานใกล้ครบกำหนด (3 วัน)</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-gray-900 font-black w-24 truncate">ORD69-08010-CAB-03</span>
              <span className="text-gray-500 flex-1 truncate">Test Company A</span>
              <span className="text-gray-900">10 ส.ค.</span>
              <span className="bg-red-50 text-red-600 px-1 rounded">P1</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-gray-900 font-black w-24 truncate">ORD69-08007-CAB-05</span>
              <span className="text-gray-500 flex-1 truncate">Test Company J</span>
              <span className="text-gray-900">8 ส.ค.</span>
              <span className="bg-red-50 text-red-600 px-1 rounded">P1</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-gray-500 mb-3">ความเร่งด่วน</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="bg-red-50 text-red-600 px-1.5 rounded font-black">P1 ด่วน</span>
              <span className="text-gray-500">เสี่ยงกระทบส่งมอบ</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="bg-yellow-50 text-yellow-600 px-1.5 rounded font-black">P2 ปกติ</span>
              <span className="text-gray-500">ดำเนินการตามแผน</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="bg-blue-50 text-blue-600 px-1.5 rounded font-black">P3 รอได้</span>
              <span className="text-gray-500">ยังไม่กระทบกำหนดส่ง</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
