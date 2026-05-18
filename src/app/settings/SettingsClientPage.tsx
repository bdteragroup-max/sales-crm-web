'use client'

import React, { useState } from 'react'
import { Target, Save, Users, User, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { upsertMonthlyTarget } from '@/app/actions/settings'

interface SettingsClientPageProps {
  staffList: any[]
  initialTargets: any[]
  isManager?: boolean
}

export default function SettingsClientPage({ staffList, initialTargets, isManager = true }: SettingsClientPageProps) {
  const [targets, setTargets] = useState<{ [key: string]: number }>(() => {
    const initial: { [key: string]: number } = {}
    initialTargets.forEach(t => {
      initial[t.userId || 'team'] = t.amount
    })
    return initial
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const handleAmountChange = (id: string, value: string) => {
    const amount = parseFloat(value) || 0
    setTargets(prev => ({ ...prev, [id]: amount }))
  }

  const handleSave = async (userId: string | null) => {
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
      setStatus({ type: 'success', message: `บันทึกเป้าหมาย ${userId ? 'รายบุคคล' : 'ภาพรวมทีม'} สำเร็จ` })
    } else {
      setStatus({ type: 'error', message: res.error || 'เกิดข้อผิดพลาดในการบันทึก' })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-10 px-6 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 text-brand-red rounded-2xl flex items-center justify-center shadow-sm">
            <Target size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">ตั้งค่าเป้าหมายการขาย</h1>
            <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">เดือน {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</p>
          </div>
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

      <div className={isManager ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "max-w-2xl mx-auto w-full"}>
        
        {/* Team Target Section */}
        {isManager && (
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <Users className="text-brand-red" size={20} />
              <h2 className="text-lg font-black text-gray-900">เป้าหมายรวมของทีม</h2>
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
                onClick={() => handleSave(null)}
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
              {isManager ? 'เป้าหมายรายบุคคล' : 'เป้าหมายของฉัน'}
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
                    onClick={() => handleSave(staff.id)}
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
    </div>
  )
}
