'use client'

import React, { useState, useEffect } from 'react'
import { requestPasswordReset, verifyOtpAndResetPassword } from '@/app/actions/auth'
import { useActionState } from 'react'
import { KeyRound, Smartphone, Mail, Lock, Loader2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1)
  const [requestState, requestAction, requestPending] = useActionState(requestPasswordReset, undefined)
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAndResetPassword, undefined)

  // Switch to step 2 when OTP is sent
  useEffect(() => {
    if (requestState?.message?.includes('ส่งรหัส OTP เรียบร้อยแล้ว')) {
      setStep(2)
    }
  }, [requestState])

  const isSuccess = verifyState?.message?.includes('รีเซ็ตรหัสผ่านเรียบร้อยแล้ว')
  const currentState = step === 1 ? requestState : verifyState
  const isPending = requestPending || verifyPending

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-red-500/20">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[120px] -z-10 animate-pulse delay-1000"></div>

      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/login" className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center font-bold text-2xl text-white shadow-2xl shadow-red-500/20 mb-4 transform hover:scale-110 transition-transform duration-300">
            S
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ลืมรหัสผ่าน?</h1>
          <p className="text-slate-500 mt-2 text-center">
            {step === 1 
              ? 'กรอกเบอร์โทรศัพท์ของคุณเพื่อรับรหัส OTP' 
              : 'กรอกรหัส OTP และตั้งรหัสผ่านใหม่ของคุณ'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
          {!isSuccess ? (
            <div className="space-y-6">
              {(verifyState?.message || requestState?.message) && (
                <div className={`p-4 rounded-xl border ${(verifyState?.message || requestState?.message)?.includes('OTP') ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-red-600'} text-sm animate-in fade-in slide-in-from-top-2 duration-300`}>
                  {verifyState?.message || requestState?.message}
                </div>
              )}

              {step === 1 ? (
                <form action={requestAction} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="phoneNumber">เบอร์โทรศัพท์</label>
                    <div className="relative group">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        placeholder="081-234-5678"
                        required
                        className={`w-full bg-slate-50 border ${requestState?.errors?.phoneNumber ? 'border-red-500' : 'border-slate-200'} group-hover:border-slate-300 focus:border-red-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-4 focus:ring-red-600/10`}
                      />
                    </div>
                    {requestState?.errors?.phoneNumber && (
                      <p className="text-xs text-red-600 mt-1 ml-1">{requestState.errors.phoneNumber[0]}</p>
                    )}
                  </div>

                  <button
                    disabled={isPending}
                    type="submit"
                    className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20 group"
                  >
                    {isPending ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        ขอรหัส OTP
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form action={verifyAction} className="space-y-6">
                  <input type="hidden" name="phoneNumber" value={requestState?.phoneNumber || ''} />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="otp">รหัส OTP 6 หลัก</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        required
                        className="w-full bg-slate-50 border border-slate-200 group-hover:border-slate-300 focus:border-red-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-4 focus:ring-red-600/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="password">รหัสผ่านใหม่</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="w-full bg-slate-50 border border-slate-200 group-hover:border-slate-300 focus:border-red-600 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-4 focus:ring-red-600/10"
                      />
                    </div>
                  </div>

                  <button
                    disabled={isPending}
                    type="submit"
                    className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20 group"
                  >
                    {isPending ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        ยืนยันและรีเซ็ตรหัสผ่าน
                        <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-slate-500 text-sm hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    ขอ OTP ใหม่
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-4 space-y-6 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">รีเซ็ตสำเร็จ!</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {verifyState?.message}
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors"
              >
                <ArrowLeft size={18} />
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          )}

          {!isSuccess && step === 1 && (
            <div className="mt-8 text-center pt-6 border-t border-slate-100">
              <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-red-600 font-medium transition-colors">
                <ArrowLeft size={16} />
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-xs tracking-widest uppercase font-bold">SalesCRM v0.1.0 &bull; Secure Auth</p>
        </div>
      </div>
    </div>
  )
}
