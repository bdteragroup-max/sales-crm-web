'use client'

import React from 'react'
import { signup } from '@/app/actions/user'
import { useActionState } from 'react'
import { 
  Lock, User, Loader2, ArrowRight, Phone, 
  ShieldCheck, BadgeCheck, Building, Users, Briefcase, 
  Network, Calendar, Key
} from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-brand-red/20">
      {/* Background Effects */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-[120px] -z-10 animate-pulse delay-1000"></div>

      <div className="w-full max-w-2xl">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-red to-red-500 flex items-center justify-center font-bold text-2xl text-white shadow-2xl shadow-brand-red/20 mb-4 transform hover:scale-110 transition-transform duration-300">
            S
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ลงทะเบียนผู้ใช้งาน</h1>
          <p className="text-gray-500 mt-2 text-center">สำหรับการลงทะเบียนพนักงานขาย กรุณาติดต่อผู้จัดการของท่าน</p>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
          <form action={action} className="space-y-6">
            {state?.message && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {state.message}
              </div>
            )}

            {/* Registration Code Section (High Visibility) */}
            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
              <label className="text-sm font-bold text-indigo-900 flex items-center gap-2" htmlFor="registrationCode">
                <Key size={16} /> รหัสลงทะเบียนสำหรับผู้จัดการ
              </label>
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input
                  id="registrationCode"
                  name="registrationCode"
                  type="password"
                  placeholder="กรอกรหัสลงทะเบียน (ถ้ามี)"
                  className="w-full bg-white border border-indigo-200 group-hover:border-indigo-300 focus:border-indigo-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-indigo-500 italic">* เฉพาะหัวหน้าทีม/ผู้จัดการที่ต้องการสร้างบัญชีใหม่ครั้งแรกเท่านั้น</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info Section */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">ข้อมูลพื้นฐาน</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1" htmlFor="fullName">ชื่อ-นามสกุล</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="สมชาย ใจดี"
                      defaultValue={state?.data?.fullName as string}
                      className={`w-full bg-gray-50 border ${state?.errors?.fullName ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1" htmlFor="employeeId">รหัสพนักงาน</label>
                  <div className="relative group">
                    <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                    <input
                      id="employeeId"
                      name="employeeId"
                      type="text"
                      placeholder="EMP-001"
                      defaultValue={state?.data?.employeeId as string}
                      className={`w-full bg-gray-50 border ${state?.errors?.employeeId ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1" htmlFor="phoneNumber">เบอร์โทรศัพท์</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      placeholder="081-234-5678"
                      defaultValue={state?.data?.phoneNumber as string}
                      className={`w-full bg-gray-50 border ${state?.errors?.phoneNumber ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1" htmlFor="role">สิทธิ์การใช้งาน</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                    <select
                      id="role"
                      name="role"
                      defaultValue={state?.data?.role as string}
                      className={`w-full bg-gray-50 border ${state?.errors?.role ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-10 py-3 text-gray-900 appearance-none outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                    >
                      <option value="ผู้จัดการ">ผู้จัดการ</option>
                      <option value="ตัวแทนฝ่ายขาย">ตัวแทนฝ่ายขาย</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1" htmlFor="password">รหัสผ่าน</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className={`w-full bg-gray-50 border ${state?.errors?.password ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                    />
                  </div>
                </div>
              </div>

              {/* Work Info Section */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">ข้อมูลการทำงาน</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="branch">สาขา</label>
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
                    <input
                      id="branch"
                      name="branch"
                      type="text"
                      placeholder="สำนักงานใหญ่"
                      defaultValue={state?.data?.branch as string}
                      className="w-full bg-slate-50 border border-slate-200 group-hover:border-slate-300 focus:border-red-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="position">ตำแหน่ง</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
                    <input
                      id="position"
                      name="position"
                      type="text"
                      placeholder="Sales Manager"
                      defaultValue={state?.data?.position as string}
                      className="w-full bg-slate-50 border border-slate-200 group-hover:border-slate-300 focus:border-red-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="department">แผนก</label>
                  <div className="relative group">
                    <Network className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
                    <input
                      id="department"
                      name="department"
                      type="text"
                      placeholder="ฝ่ายขาย"
                      defaultValue={state?.data?.department as string}
                      className="w-full bg-slate-50 border border-slate-200 group-hover:border-slate-300 focus:border-red-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                   <p className="text-xs text-slate-400 leading-relaxed italic">
                     * หากท่านเป็นพนักงานขายทั่วไป กรุณางดการลงทะเบียนที่หน้านี้ และติดต่อหัวหน้าทีมของท่านเพื่อขอรับบัญชีผู้ใช้งาน
                   </p>
                </div>
              </div>
            </div>

            <button
              disabled={pending}
              type="submit"
              className="w-full bg-brand-red text-white font-semibold py-4 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-red/20 group text-lg"
            >
              {pending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  ลงทะเบียนผู้จัดการใหม่
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-gray-500 text-sm">
              มีบัญชีผู้ใช้อยู่แล้ว?{' '}
              <Link href="/login" className="text-brand-red font-medium hover:text-red-700 transition-colors">
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
