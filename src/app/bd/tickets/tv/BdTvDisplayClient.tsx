'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getBdCombinedWorkload, BdCombinedWorkload } from '@/app/actions/bd-combined'
import { refreshTvSession } from '@/app/actions/auth'
import { UserCircle2, CheckCircle2, AlertCircle, RefreshCw, X, Ticket, FolderKanban, ChevronLeft, ChevronRight } from 'lucide-react'

export default function BdTvDisplayClient() {
  const router = useRouter()
  const [workloads, setWorkloads] = useState<BdCombinedWorkload[]>([])
  const [teamAverages, setTeamAverages] = useState<{ avgTicketProgress: number; avgProjectProgress: number } | null>(null)
  const [teamMonthlyTotals, setTeamMonthlyTotals] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date())
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Auto-rotation state
  const [currentPage, setCurrentPage] = useState(0)
  const [currentIssuePage, setCurrentIssuePage] = useState(0)
  const ITEMS_PER_PAGE = 10 // Increased to accommodate 10 staff members on one screen
  const ISSUES_PER_PAGE = 4 // Auto-rotate issues

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return (
      selectedMonth.getMonth() === now.getMonth() &&
      selectedMonth.getFullYear() === now.getFullYear()
    )
  }, [selectedMonth])

  const fetchData = async (targetDate?: Date) => {
    try {
      const monthToFetch = targetDate || selectedMonth
      const start = new Date(monthToFetch.getFullYear(), monthToFetch.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(monthToFetch.getFullYear(), monthToFetch.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)

      const result = await getBdCombinedWorkload({ startDate: start, endDate: end })
      if (result.success && result.data) {
        setWorkloads(result.data.userWorkloads)
        setTeamAverages(result.data.teamAverages)
        setTeamMonthlyTotals(result.data.teamMonthlyTotals || null)
        setIssues(result.data.identifiedIssues || [])
        setLastUpdated(new Date())
        setError(null)
      } else {
        if (result.error?.includes('Unauthorized')) {
          router.push('/login')
          return
        }
        console.error('Failed to fetch BD workloads:', result.error)
        setError(result.error || 'Unknown error occurred')
      }
    } catch (err: any) {
      console.error('Network error fetching BD workloads:', err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    setSelectedMonth(prev)
    fetchData(prev)
  }

  const handleNextMonth = () => {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    setSelectedMonth(next)
    fetchData(next)
  }

  const resetToCurrentMonth = () => {
    const now = new Date()
    setSelectedMonth(now)
    fetchData(now)
  }

  // Silent session refresh
  const refreshSessionBackground = async () => {
    try {
      const result = await refreshTvSession()
      if (!result.success) {
        console.error('Session refresh failed:', result.error)
        router.push('/login')
      }
    } catch (err) {
      console.error('Network error during session refresh', err)
    }
  }

  // Initial setup for fetching and polling
  useEffect(() => {
    fetchData(selectedMonth)
    // Poll data every 15 seconds
    const dataIntervalId = setInterval(() => {
      fetchData(selectedMonth)
    }, 15000) 
    
    // Initial session refresh to get the 2-hour short token, then every 30 mins
    refreshSessionBackground()
    const sessionIntervalId = setInterval(refreshSessionBackground, 30 * 60 * 1000)

    return () => {
      clearInterval(dataIntervalId)
      clearInterval(sessionIntervalId)
    }
  }, [selectedMonth])

  // Auto-rotation logic
  useEffect(() => {
    let rotationInterval: NodeJS.Timeout;
    
    rotationInterval = setInterval(() => {
      // Rotate workloads
      if (workloads.length > ITEMS_PER_PAGE) {
        setCurrentPage((prev) => (prev + 1) % Math.ceil(workloads.length / ITEMS_PER_PAGE))
      }
      // Rotate issues
      if (issues.length > ISSUES_PER_PAGE) {
        setCurrentIssuePage((prev) => (prev + 1) % Math.ceil(issues.length / ISSUES_PER_PAGE))
      }
    }, 10000) // Rotate every 10 seconds

    return () => clearInterval(rotationInterval)
  }, [workloads.length, issues.length, ITEMS_PER_PAGE, ISSUES_PER_PAGE])

  const displayedWorkloads = workloads.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  if (loading && workloads.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  const totalTicketsWaiting = workloads.reduce((acc, w) => acc + (w.tickets?.waiting || 0), 0)
  const totalTicketsInProgress = workloads.reduce((acc, w) => acc + (w.tickets?.inProgress || 0), 0)
  const totalTicketsActive = totalTicketsWaiting + totalTicketsInProgress

  const totalTicketsCompletedThisMonth = teamMonthlyTotals?.completedThisMonth ?? 
    workloads.reduce((acc, w) => acc + (w.tickets?.completedThisMonth || 0), 0)

  const totalTicketsAssignedThisMonth = teamMonthlyTotals?.assignedThisMonth ?? 
    workloads.reduce((acc, w) => acc + (w.tickets?.assignedThisMonth || 0), 0)

  const totalProjectsInProgress = workloads.reduce((acc, w) => acc + (w.projects?.inProgress || 0), 0)

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col p-8">
      {/* Header */}
      <header className="flex justify-between items-start mb-8 border-b border-gray-800 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">ภาพรวมภาระงาน Business Development</h1>
            
            {/* Month Navigation Pill */}
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-2 py-1 text-sm shadow-inner">
              <button 
                onClick={handlePrevMonth} 
                className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-purple-300 select-none">
                {selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={handleNextMonth} 
                className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {!isCurrentMonth && (
                <button 
                  onClick={resetToCurrentMonth}
                  className="ml-2 text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded-md transition-colors font-medium shadow-sm"
                >
                  เดือนปัจจุบัน
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {/* 1. Monthly Completed Tickets */}
            <div className="bg-emerald-950/40 border border-emerald-800/60 px-4 py-2 rounded-xl flex flex-col justify-center shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider block">Tickets เสร็จสิ้นเดือนนี้</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-emerald-300">{totalTicketsCompletedThisMonth}</span>
                <span className="text-xs text-emerald-500/80">รายการ</span>
              </div>
            </div>

            {/* 2. Monthly Assigned Tickets */}
            <div className="bg-indigo-950/40 border border-indigo-800/60 px-4 py-2 rounded-xl flex flex-col justify-center shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider block">Tickets รับเข้าเดือนนี้</span>
                <Ticket className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-indigo-300">{totalTicketsAssignedThisMonth}</span>
                <span className="text-xs text-indigo-500/80">รายการ</span>
              </div>
            </div>

            {/* 3. Active Tickets (Waiting + In Progress) */}
            <div className="bg-gray-800/80 border border-gray-700 px-4 py-2 rounded-xl flex flex-col justify-center shadow-lg">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Tickets ค้างอยู่ (WIP)</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-white">{totalTicketsActive}</span>
                <span className="text-xs text-gray-400">
                  (รอ: {totalTicketsWaiting} / กำลังทำ: {totalTicketsInProgress})
                </span>
              </div>
            </div>

            {/* 4. Projects in progress */}
            <div className="bg-blue-950/40 border border-blue-800/60 px-4 py-2 rounded-xl flex flex-col justify-center shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider block">Projects/Tasks กำลังทำ</span>
                <FolderKanban className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-blue-300">{totalProjectsInProgress}</span>
                <span className="text-xs text-blue-500/80">รายการ</span>
              </div>
            </div>

            {/* 5. Averages */}
            {teamAverages && (
              <>
                <div className="bg-purple-950/30 border border-purple-800/50 px-4 py-2 rounded-xl flex flex-col justify-center shadow-lg">
                  <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider block">ความคืบหน้า Tickets</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-bold text-purple-300">{teamAverages.avgTicketProgress}%</span>
                    <span className="text-xs text-purple-500/80">เฉลี่ย</span>
                  </div>
                </div>
                <div className="bg-sky-950/30 border border-sky-800/50 px-4 py-2 rounded-xl flex flex-col justify-center shadow-lg">
                  <span className="text-sky-400 text-xs font-semibold uppercase tracking-wider block">ความคืบหน้า Projects</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-bold text-sky-300">{teamAverages.avgProjectProgress}%</span>
                    <span className="text-xs text-sky-500/80">เฉลี่ย</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Close button for non-TV usage */}
          <button 
            onClick={() => router.push('/bd/dashboard')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors self-end mb-2 group"
            title="Close TV Mode"
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </button>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>มีปัญหาการเชื่อมต่อ - กำลังลองใหม่...</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>
              อัปเดตล่าสุด: {lastUpdated ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'ยังไม่มี'}
            </span>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 xl:gap-6 flex-1 content-start">
        {displayedWorkloads.map((bd) => (
          <div key={bd.userId} className="bg-gray-800 rounded-2xl border border-gray-700 flex flex-col shadow-xl overflow-hidden">
            {/* Header: Name */}
            <div className="flex items-center gap-3 p-3 border-b border-gray-700 bg-gray-800/80">
              <div className="bg-gray-700 p-1.5 rounded-xl">
                <UserCircle2 className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold truncate max-w-[200px]" title={bd.name}>{bd.name}</h2>
              </div>
            </div>

            {/* Split Content */}
            <div className="flex flex-1 divide-x divide-gray-700">
              
              {/* Left Column: Tickets */}
              <div className="flex-1 p-3 bg-gray-800/40 flex flex-col">
                <div className="flex items-center justify-between mb-3 text-purple-400">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="w-4 h-4" />
                    <h3 className="font-bold text-xs uppercase tracking-wider">Tickets</h3>
                  </div>
                  <span className="text-[10px] text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded font-medium">
                    รายเดือน
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">รอดำเนินการ:</span>
                    <span className="font-bold text-orange-400 text-sm">{bd.tickets.waiting}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">กำลังทำ (WIP):</span>
                    <span className="font-bold text-blue-400 text-sm">{bd.tickets.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-emerald-950/40 -mx-1 px-1.5 py-1 rounded-lg border border-emerald-900/40">
                    <span className="text-emerald-300 font-medium">เสร็จสิ้นเดือนนี้:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-emerald-400 text-sm">{bd.tickets.completedThisMonth ?? 0}</span>
                      {(bd.tickets.completedToday || 0) > 0 && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-semibold" title="เสร็จวันนี้">
                          +{bd.tickets.completedToday}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 pt-0.5">
                    <span>รับมอบหมาย:</span>
                    <span className="font-semibold text-indigo-300">{bd.tickets.assignedThisMonth ?? 0}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] text-gray-500">ความคืบหน้า</span>
                    <span className="font-bold text-xs text-gray-300">{bd.tickets.avgProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" 
                      style={{ width: `${bd.tickets.avgProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Projects */}
              <div className="flex-1 p-3 bg-gray-900/40 flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-sky-400">
                  <FolderKanban className="w-4 h-4" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Projects / Tasks</h3>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">กำลังทำ:</span>
                    <span className="font-bold text-blue-400 text-sm">{bd.projects.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">คงเหลือ:</span>
                    <span className="font-bold text-orange-400 text-sm">{bd.projects.remaining}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500">ความคืบหน้า</span>
                    <span className="font-bold text-sm text-gray-300">{bd.projects.avgProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-sky-500 h-1.5 rounded-full transition-all duration-1000" 
                      style={{ width: `${bd.projects.avgProgress}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination Indicators for Employees */}
      {workloads.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center gap-2 mt-4 mb-4">
          {Array.from({ length: Math.ceil(workloads.length / ITEMS_PER_PAGE) }).map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full transition-colors ${i === currentPage ? 'bg-blue-500' : 'bg-gray-700'}`}
            />
          ))}
        </div>
      )}

      {/* Identified Issues (Blocked Tasks) */}
      {issues.length > 0 && (
        <div className="mt-4 bg-gray-800 border border-red-900/50 rounded-2xl p-4 shadow-xl shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wider text-sm">Identified Issues (ติดปัญหา)</h3>
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
                {issues.length}
              </span>
            </div>
            {issues.length > ISSUES_PER_PAGE && (
              <div className="flex gap-1.5">
                {Array.from({ length: Math.ceil(issues.length / ISSUES_PER_PAGE) }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentIssuePage ? 'bg-red-500' : 'bg-gray-700'}`} />
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {issues.slice(currentIssuePage * ISSUES_PER_PAGE, (currentIssuePage + 1) * ISSUES_PER_PAGE).map((issue, idx) => (
              <div key={idx} className="bg-red-950/30 border border-red-900/30 p-3 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="text-red-300 font-semibold text-sm truncate" title={issue.projectName}>{issue.projectName}</span>
                    <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-md whitespace-nowrap">{issue.assigneeName}</span>
                  </div>
                  <p className="text-white font-medium text-sm mb-2 truncate" title={issue.name}>{issue.name}</p>
                </div>
                <p className="text-red-400 text-xs line-clamp-2" title={issue.blockedReason}>{issue.blockedReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
