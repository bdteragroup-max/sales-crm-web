'use client'

import React, { useState } from 'react'
import { Target, Save, Users, User, CheckCircle2, PhoneCall } from 'lucide-react'
import { upsertMonthlyTarget, upsertTelesalesKPI } from '@/app/actions/settings'

interface SettingsClientPageProps {
  staffList: any[]
  initialTargets: any[]
  initialTelesalesKPIs: any[]
  isManager?: boolean
}

export default function SettingsClientPage({ 
  staffList, 
  initialTargets, 
  initialTelesalesKPIs,
  isManager = true 
}: SettingsClientPageProps) {
  
  const [activeTab, setActiveTab] = useState<'sales' | 'telesales'>('sales')
  
  // Sales targets state
  const [targets, setTargets] = useState<{ [key: string]: number }>(() => {
    const initial: { [key: string]: number } = {}
    initialTargets.forEach(t => {
      initial[t.userId || 'team'] = t.amount
    })
    return initial
  })

  // Telesales KPIs state
  const [telesalesKPIs, setTelesalesKPIs] = useState<{
    [key: string]: {
      weeklyCallGoal: number
      monthlyCallGoal: number
      appointmentGoal: number
      connectionRateMin: number
    }
  }>(() => {
    const initial: { [key: string]: any } = {}
    initialTelesalesKPIs.forEach(k => {
      initial[k.userId || 'team'] = {
        weeklyCallGoal: k.weeklyCallGoal ?? 300,
        monthlyCallGoal: k.monthlyCallGoal ?? 1200,
        appointmentGoal: k.appointmentGoal ?? 20,
        connectionRateMin: Math.round((k.connectionRateMin ?? 0.6) * 100)
      }
    })
    return initial
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Handler for sales target inputs
  const handleAmountChange = (id: string, value: string) => {
    const amount = parseFloat(value) || 0
    setTargets(prev => ({ ...prev, [id]: amount }))
  }

  // Handler for telesales KPI inputs
  const handleTelesalesChange = (id: string, field: string, value: string) => {
    const num = parseFloat(value) || 0
    setTelesalesKPIs(prev => {
      const existing = prev[id] || { weeklyCallGoal: 300, monthlyCallGoal: 1200, appointmentGoal: 20, connectionRateMin: 60 }
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: num
        }
      }
    })
  }

  // Save Sales Target
  const handleSaveSales = async (userId: string | null) => {
    setIsSubmitting(true)
    setStatus(null)
    const amount = targets[userId || 'team'] || 0
    
    const res = await upsertMonthlyTarget({
      userId,
      month: currentMonth,
      year: currentYear,
      amount
    })

    if (res.success) {
      setStatus({ type: 'success', message: `บันทึกเป้าหมายยอดขาย ${userId ? 'รายบุคคล' : 'ภาพรวมทีม'} สำเร็จ` })
    } else {
      setStatus({ type: 'error', message: res.error || 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setIsSubmitting(false)
  }

  // Save Telesales KPI
  const handleSaveTelesales = async (userId: string | null) => {
    setIsSubmitting(true)
    setStatus(null)
    const kpi = telesalesKPIs[userId || 'team'] || {
      weeklyCallGoal: 300,
      monthlyCallGoal: 1200,
      appointmentGoal: 20,
      connectionRateMin: 60
    }
    
    const res = await upsertTelesalesKPI({
      userId,
      month: currentMonth,
      year: currentYear,
      weeklyCallGoal: kpi.weeklyCallGoal,
      monthlyCallGoal: kpi.monthlyCallGoal,
      appointmentGoal: kpi.appointmentGoal,
      connectionRateMin: kpi.connectionRateMin / 100 // convert percent to float for DB (e.g. 60 -> 0.6)
    })

    if (res.success) {
      setStatus({ type: 'success', message: `บันทึกเป้าหมาย KPI สายโทร ${userId ? 'รายบุคคล' : 'ภาพรวมทีม'} สำเร็จ` })
    } else {
      setStatus({ type: 'error', message: res.error || 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-10 px-6 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-brand-red rounded-2xl flex items-center justify-center shadow-sm">
            <Target size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">ตั้งค่าเป้าหมายและ KPI</h1>
            <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">
              เดือน {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Tab Toggle Switch */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            onClick={() => { setActiveTab('sales'); setStatus(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'sales'
                ? 'bg-white text-brand-red shadow-md'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Target size={14} />
            เป้าหมายยอดขาย
          </button>
          <button
            onClick={() => { setActiveTab('telesales'); setStatus(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'telesales'
                ? 'bg-white text-brand-red shadow-md'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <PhoneCall size={14} />
            KPI สายโทร
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-4 ${
          status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <Target size={20} />}
          <span className="font-bold text-sm">{status.message}</span>
        </div>
      )}

      {/* SALES TAB PANEL */}
      {activeTab === 'sales' && (
        <div className={isManager ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "max-w-2xl mx-auto w-full"}>
          {/* Team Target Section */}
          {isManager && (
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <Users className="text-brand-red" size={20} />
                <h2 className="text-lg font-black text-gray-900">เป้าหมายรวมของทีม (Sales)</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">เป้าหมายยอดขายรวม (บาท)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                    <input 
                      type="number" 
                      value={targets['team'] || ''}
                      onChange={(e) => handleAmountChange('team', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-8 pr-4 text-lg font-black text-gray-900 outline-none focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleSaveSales(null)}
                  disabled={isSubmitting}
                  className="w-full bg-brand-red hover:bg-red-700 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกเป้าหมายทีม'}
                </button>
              </div>
            </div>
          )}

          {/* Individual Targets Section */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6 overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <User className="text-gray-400" size={20} />
              <h2 className="text-lg font-black text-gray-900">
                {isManager ? 'เป้าหมายยอดขายรายบุคคล' : 'เป้าหมายของฉัน'}
              </h2>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {staffList.map((staff) => (
                <div key={staff.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-4 group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red font-black flex items-center justify-center border border-red-100 group-hover:bg-brand-red group-hover:text-white transition-all">
                      {staff.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{staff.fullName}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{staff.position || 'ตัวแทนฝ่ายขาย'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative w-32">
                      <input 
                        type="number" 
                        value={targets[staff.id] || ''}
                        onChange={(e) => handleAmountChange(staff.id, e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-brand-red transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => handleSaveSales(staff.id)}
                      disabled={isSubmitting}
                      className="p-2 text-brand-red hover:bg-red-50 rounded-lg transition-all"
                      title="บันทึก"
                    >
                      <Save size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TELESALES KPI TAB PANEL */}
      {activeTab === 'telesales' && (
        <div className="space-y-8">
          {/* Team Target Section */}
          {isManager && (
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <Users className="text-brand-red" size={20} />
                <h2 className="text-lg font-black text-gray-900">เป้าหมาย KPI รวมของทีม (Telesales)</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">โทรต่อสัปดาห์ (สาย)</label>
                  <input 
                    type="number" 
                    value={telesalesKPIs['team']?.weeklyCallGoal ?? ''}
                    onChange={(e) => handleTelesalesChange('team', 'weeklyCallGoal', e.target.value)}
                    placeholder="300"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black text-gray-900 outline-none focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">โทรต่อเดือน (สาย)</label>
                  <input 
                    type="number" 
                    value={telesalesKPIs['team']?.monthlyCallGoal ?? ''}
                    onChange={(e) => handleTelesalesChange('team', 'monthlyCallGoal', e.target.value)}
                    placeholder="1200"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black text-gray-900 outline-none focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">นัดหมายต่อเดือน (ครั้ง)</label>
                  <input 
                    type="number" 
                    value={telesalesKPIs['team']?.appointmentGoal ?? ''}
                    onChange={(e) => handleTelesalesChange('team', 'appointmentGoal', e.target.value)}
                    placeholder="20"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black text-gray-900 outline-none focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">อัตราติดต่อสำเร็จขั้นต่ำ (%)</label>
                  <input 
                    type="number" 
                    value={telesalesKPIs['team']?.connectionRateMin ?? ''}
                    onChange={(e) => handleTelesalesChange('team', 'connectionRateMin', e.target.value)}
                    placeholder="60"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-black text-gray-900 outline-none focus:ring-4 focus:ring-red-100 focus:border-brand-red transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => handleSaveTelesales(null)}
                  disabled={isSubmitting}
                  className="bg-brand-red hover:bg-red-700 text-white rounded-2xl px-8 py-4 font-black text-sm uppercase tracking-widest shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก KPI ทีม'}
                </button>
              </div>
            </div>
          )}

          {/* Individual Representative Section */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6 flex flex-col">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <User className="text-gray-400" size={20} />
              <h2 className="text-lg font-black text-gray-900">
                {isManager ? 'เป้าหมาย KPI รายบุคคล' : 'เป้าหมาย KPI ของฉัน'}
              </h2>
            </div>
            
            <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {staffList.map((staff) => {
                const kpi = telesalesKPIs[staff.id] || {
                  weeklyCallGoal: 300,
                  monthlyCallGoal: 1200,
                  appointmentGoal: 20,
                  connectionRateMin: 60
                }
                return (
                  <div key={staff.id} className="p-6 rounded-[24px] bg-gray-50 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-white hover:shadow-md transition-all">
                    {/* Member Header */}
                    <div className="flex items-center gap-3 md:w-1/4 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red font-black flex items-center justify-center border border-red-100 group-hover:bg-brand-red group-hover:text-white transition-all">
                        {staff.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{staff.fullName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{staff.position || 'ตัวแทนฝ่ายขาย'}</p>
                      </div>
                    </div>
                    
                    {/* Granular Settings Grid */}
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">เป้าโทร/สัปดาห์</span>
                        <input 
                          type="number" 
                          value={kpi.weeklyCallGoal}
                          onChange={(e) => handleTelesalesChange(staff.id, 'weeklyCallGoal', e.target.value)}
                          placeholder="300"
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-brand-red transition-all"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">เป้าโทร/เดือน</span>
                        <input 
                          type="number" 
                          value={kpi.monthlyCallGoal}
                          onChange={(e) => handleTelesalesChange(staff.id, 'monthlyCallGoal', e.target.value)}
                          placeholder="1200"
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-brand-red transition-all"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">เป้านัดหมาย/เดือน</span>
                        <input 
                          type="number" 
                          value={kpi.appointmentGoal}
                          onChange={(e) => handleTelesalesChange(staff.id, 'appointmentGoal', e.target.value)}
                          placeholder="20"
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-brand-red transition-all"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ต่อสายติดขั้นต่ำ (%)</span>
                        <input 
                          type="number" 
                          value={kpi.connectionRateMin}
                          onChange={(e) => handleTelesalesChange(staff.id, 'connectionRateMin', e.target.value)}
                          placeholder="60"
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-brand-red transition-all"
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center md:justify-end">
                      <button 
                        onClick={() => handleSaveTelesales(staff.id)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-xl px-4 py-2 text-xs font-black tracking-widest transition-all"
                        title="บันทึก"
                      >
                        <Save size={14} />
                        บันทึก
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
