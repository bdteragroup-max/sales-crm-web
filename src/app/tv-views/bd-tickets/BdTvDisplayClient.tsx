'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBdCombinedWorkload, BdCombinedWorkload } from '@/app/actions/bd-combined'
import { refreshTvSession } from '@/app/actions/auth'
import { UserCircle2, Clock, CheckCircle2, AlertCircle, RefreshCw, X, Ticket, FolderKanban } from 'lucide-react'

export default function BdTvDisplayClient() {
  const router = useRouter()
  const [workloads, setWorkloads] = useState<BdCombinedWorkload[]>([])
  const [teamAverages, setTeamAverages] = useState<{ avgTicketProgress: number; avgProjectProgress: number } | null>(null)
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Auto-rotation state
  const [currentPage, setCurrentPage] = useState(0)
  const [currentIssuePage, setCurrentIssuePage] = useState(0)
  const ITEMS_PER_PAGE = 8 // Adjust based on TV screen size
  const ISSUES_PER_PAGE = 4 // Auto-rotate issues

  const fetchData = async () => {
    try {
      const result = await getBdCombinedWorkload()
      if (result.success && result.data) {
        setWorkloads(result.data.userWorkloads)
        setTeamAverages(result.data.teamAverages)
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
      // On network error during refresh, we don't immediately redirect as the token 
      // is 2 hours long. It will retry on the next interval.
    }
  }

  // Initial setup for fetching and polling
  useEffect(() => {
    fetchData()
    // Poll data every 15 seconds
    const dataIntervalId = setInterval(fetchData, 15000) 
    
    // Initial session refresh to get the 2-hour short token, then every 30 mins
    refreshSessionBackground()
    const sessionIntervalId = setInterval(refreshSessionBackground, 30 * 60 * 1000)

    return () => {
      clearInterval(dataIntervalId)
      clearInterval(sessionIntervalId)
    }
  }, [])

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

  const totalTickets = workloads.reduce((acc, w) => acc + w.tickets.inProgress + w.tickets.waiting, 0)
  const totalProjectsInProgress = workloads.reduce((acc, w) => acc + w.projects.inProgress, 0)

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">ภาพรวมภาระงาน Business Development</h1>
          <div className="flex gap-6 mt-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg flex flex-col justify-center">
              <span className="text-gray-400 text-sm block">Support Tickets (รวม)</span>
              <span className="text-2xl font-bold">{totalTickets}</span>
            </div>
            <div className="bg-blue-900/30 border border-blue-800/50 px-4 py-2 rounded-lg flex flex-col justify-center">
              <span className="text-blue-400 text-sm block">Projects/Tasks (กำลังทำ)</span>
              <span className="text-2xl font-bold text-blue-400">{totalProjectsInProgress}</span>
            </div>
            {teamAverages && (
              <>
                <div className="bg-purple-900/20 border border-purple-800/40 px-4 py-2 rounded-lg flex flex-col justify-center">
                  <span className="text-purple-400 text-sm block">ความคืบหน้า Tickets เฉลี่ย</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-purple-400">{teamAverages.avgTicketProgress}%</span>
                  </div>
                </div>
                <div className="bg-sky-900/20 border border-sky-800/40 px-4 py-2 rounded-lg flex flex-col justify-center">
                  <span className="text-sky-400 text-sm block">ความคืบหน้า Projects เฉลี่ย</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-sky-400">{teamAverages.avgProjectProgress}%</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 content-start">
        {displayedWorkloads.map((bd) => (
          <div key={bd.userId} className="bg-gray-800 rounded-2xl border border-gray-700 flex flex-col shadow-xl overflow-hidden">
            {/* Header: Name */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-700 bg-gray-800/80">
              <div className="bg-gray-700 p-2 rounded-xl">
                <UserCircle2 className="w-6 h-6 text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold truncate max-w-[250px]" title={bd.name}>{bd.name}</h2>
              </div>
            </div>

            {/* Split Content */}
            <div className="flex flex-1 divide-x divide-gray-700">
              
              {/* Left Column: Tickets */}
              <div className="flex-1 p-4 bg-gray-800/40 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-purple-400">
                  <Ticket className="w-5 h-5" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">Support Tickets</h3>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">รอดำเนินการ:</span>
                    <span className="font-bold text-orange-400">{bd.tickets.waiting}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">กำลังดำเนินการ:</span>
                    <span className="font-bold text-blue-400">{bd.tickets.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">เสร็จสิ้นวันนี้:</span>
                    <span className="font-bold text-green-400">{bd.tickets.completedToday}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500">ความคืบหน้า</span>
                    <span className="font-bold text-sm text-gray-300">{bd.tickets.avgProgress}%</span>
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
              <div className="flex-1 p-4 bg-gray-900/40 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-sky-400">
                  <FolderKanban className="w-5 h-5" />
                  <h3 className="font-bold text-sm uppercase tracking-wider">Projects / Tasks</h3>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">กำลังดำเนินการ:</span>
                    <span className="font-bold text-blue-400">{bd.projects.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">คงเหลือ:</span>
                    <span className="font-bold text-orange-400">{bd.projects.remaining}</span>
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
