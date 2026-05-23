'use client'

import React from 'react'
import { login } from '@/app/actions/auth'
import { useActionState } from 'react'
import { LogIn, Mail, Lock, Loader2, ArrowRight, BadgeCheck } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-brand-red/20">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-red/5 rounded-full blur-[120px] -z-10 animate-pulse delay-1000"></div>

      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-red to-red-500 flex items-center justify-center font-bold text-2xl text-white shadow-2xl shadow-brand-red/20 mb-4 transform hover:scale-110 transition-transform duration-300">
            S
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">เข้าสู่ระบบ</h1>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
          <form action={action} className="space-y-5">
            {state?.message && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {state.message}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1" htmlFor="employeeId">รหัสพนักงาน</label>
              <div className="relative group">
                <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  placeholder="TG001"
                  className={`w-full bg-gray-50 border ${state?.errors?.employeeId ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                />
              </div>
              {state?.errors?.employeeId && (
                <p className="text-xs text-brand-red mt-1 ml-1">{state.errors.employeeId[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="password">รหัสผ่าน</label>
                <Link href="/forgot-password" className="text-xs text-brand-red hover:text-red-700 font-medium transition-colors">ลืมรหัสผ่าน?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="PIN / Password"
                  className={`w-full bg-gray-50 border ${state?.errors?.password ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                />
              </div>
              {state?.errors?.password && (
                <p className="text-xs text-brand-red mt-1 ml-1">{state.errors.password[0]}</p>
              )}
            </div>

            <button
              disabled={pending}
              type="submit"
              className="w-full bg-brand-red text-white font-semibold py-3 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-red/20 group"
            >
              {pending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>


        </div>
        
        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-xs tracking-widest uppercase font-bold">SalesCRM v0.1.0 &bull; Secure Auth</p>
        </div>
      </div>
    </div>
  )
}
