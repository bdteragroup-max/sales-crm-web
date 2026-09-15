'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  History,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Layers,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Eye,
  MousePointer,
  Sparkles
} from 'lucide-react'
import {
  getEntitySnapshotHistory,
  PerformanceSnapshot
} from '@/app/actions/ads-performance'

interface SnapshotHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    entityType: 'CAMPAIGN' | 'AD_SET' | 'AD'
    entityId: string
    title: string
    subtitle?: string
  } | null
}

export default function SnapshotHistoryModal({
  isOpen,
  onClose,
  item
}: SnapshotHistoryModalProps) {
  const [history, setHistory] = useState<PerformanceSnapshot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !item) {
      setHistory([])
      return
    }

    let isMounted = true
    setLoading(true)

    getEntitySnapshotHistory(item.entityType, item.entityId)
      .then(res => {
        if (isMounted && res.success) {
          setHistory(res.history || [])
        }
      })
      .catch(err => {
        console.error('Error fetching snapshot history:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  ประวัติ Snapshot ผลโฆษณา (Version History)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {item.entityType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.title} {item.subtitle ? `• ${item.subtitle}` : ''} ({item.entityId})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
              <span className="text-xs font-medium">กำลังโหลดไทม์ไลน์ประวัติ Snapshot...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              ไม่พบประวัติ Snapshot ก่อนหน้าสำหรับรายการนี้
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((snap, idx) => {
                const prevSpend = snap.previousSpend !== undefined ? snap.previousSpend : 0
                const prevInbox = snap.previousMessageInbox !== undefined ? snap.previousMessageInbox : 0
                const prevReach = snap.previousReach !== undefined ? snap.previousReach : 0
                const prevClicks = snap.previousClicks !== undefined ? snap.previousClicks : 0

                const deltaSpend = snap.spend - prevSpend
                const deltaInbox = snap.messageInbox - prevInbox
                const deltaReach = snap.reach - prevReach
                const deltaClicks = snap.clicks - prevClicks

                // Rates
                const ctr = snap.impressions > 0 ? (snap.clicks / snap.impressions) * 100 : null
                const cpc = snap.clicks > 0 ? snap.spend / snap.clicks : null
                const cpm = snap.impressions > 0 ? (snap.spend / snap.impressions) * 1000 : null
                const costPerResult = snap.messageInbox > 0 ? snap.spend / snap.messageInbox : null

                const isLatest = idx === 0

                return (
                  <div
                    key={snap.id || snap.snapshotId || idx}
                    className={`rounded-xl border p-4 transition-all ${isLatest
                      ? 'bg-rose-50/30 border-rose-200 shadow-xs'
                      : 'bg-white border-slate-200'
                      }`}
                  >
                    {/* Top Row: Version & Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white">
                          v{snap.version || (history.length - idx)}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {snap.snapshotId}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                            เวอร์ชันปัจจุบัน (Latest)
                          </span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          แหล่งที่มา: {snap.source || 'Manual'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Data as of: {new Date(snap.capturedAt).toLocaleString('th-TH')}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{snap.enteredBy}</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Cumulative Metrics & Deltas */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          ค่าใช้จ่ายสะสม (Spend)
                        </span>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          ฿{snap.spend.toLocaleString('th-TH')}
                        </div>
                        {snap.previousSpend !== undefined && (
                          <div className={`text-[10px] font-mono mt-0.5 flex items-center gap-0.5 ${deltaSpend >= 0 ? 'text-rose-600' : 'text-amber-600'
                            }`}>
                            {deltaSpend >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            <span>{deltaSpend >= 0 ? '+' : ''}฿{deltaSpend.toLocaleString('th-TH')}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          ข้อความทักสะสม (Inbox)
                        </span>
                        <div className="font-mono font-bold text-blue-700 text-sm">
                          {snap.messageInbox.toLocaleString('th-TH')}
                        </div>
                        {snap.previousMessageInbox !== undefined && (
                          <div className={`text-[10px] font-mono mt-0.5 flex items-center gap-0.5 ${deltaInbox >= 0 ? 'text-blue-600' : 'text-amber-600'
                            }`}>
                            {deltaInbox >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            <span>{deltaInbox >= 0 ? '+' : ''}{deltaInbox.toLocaleString('th-TH')}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          การเข้าถึง (Reach)
                        </span>
                        <div className="font-mono font-bold text-slate-700 text-sm">
                          {snap.reach.toLocaleString('th-TH')}
                        </div>
                        {snap.previousReach !== undefined && deltaReach !== 0 && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {deltaReach > 0 ? `+${deltaReach.toLocaleString()}` : deltaReach.toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          การมองเห็น (Imp)
                        </span>
                        <div className="font-mono font-bold text-slate-700 text-sm">
                          {snap.impressions.toLocaleString('th-TH')}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                          คลิกสะสม (Clicks)
                        </span>
                        <div className="font-mono font-bold text-slate-700 text-sm">
                          {snap.clicks.toLocaleString('th-TH')}
                        </div>
                        {snap.previousClicks !== undefined && deltaClicks !== 0 && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {deltaClicks > 0 ? `+${deltaClicks.toLocaleString()}` : deltaClicks.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calculated KPIs row */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
                      <div>
                        <span className="text-slate-400">CTR: </span>
                        <span className="font-bold text-slate-800">{ctr !== null ? `${ctr.toFixed(2)}%` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">CPC: </span>
                        <span className="font-bold text-slate-800">{cpc !== null ? `฿${cpc.toFixed(2)}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">CPM: </span>
                        <span className="font-bold text-slate-800">{cpm !== null ? `฿${cpm.toFixed(2)}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Cost/Result: </span>
                        <span className="font-extrabold text-rose-700">{costPerResult !== null ? `฿${costPerResult.toFixed(2)}` : '—'}</span>
                      </div>
                    </div>

                    {/* Optional Notes */}
                    {snap.notes && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span><strong>หมายเหตุ:</strong> {snap.notes}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            ปิด (Close)
          </button>
        </div>
      </div>
    </div>
  )
}
