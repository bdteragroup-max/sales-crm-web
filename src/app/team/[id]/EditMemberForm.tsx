'use client'

import React from 'react'
import { updateUser, deactivateUser } from '@/app/actions/user'
import { useActionState } from 'react'
import { 
  Lock, User, Loader2, Save, Phone, 
  ShieldCheck, BadgeCheck, Building, Users, Briefcase, 
  Network, Calendar, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface EditMemberFormProps {
  member: any
}

export default function EditMemberForm({ member }: EditMemberFormProps) {
  const [state, action, pending] = useActionState(updateUser, undefined)

  // Format date for input
  const formattedStartDate = member.employeeSale?.startDate 
    ? new Date(member.employeeSale.startDate).toISOString().split('T')[0] 
    : ''

  return (
    <>
      {/* Redirection Loader Overlay */}
      {pending && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-100 border-t-brand-red rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-brand-red rounded-xl shadow-lg shadow-red-200 flex items-center justify-center">
                <Save className="text-white animate-pulse" size={20} />
              </div>
            </div>
          </div>
          <p className="mt-6 text-gray-900 font-black text-xl tracking-tight">กำลังบันทึกและนำทาง...</p>
          <p className="mt-2 text-gray-400 text-sm font-medium">กรุณารอสักครู่ ระบบกำลังอัปเดตข้อมูลพนักงาน</p>
        </div>
      )}

      <form action={action} className="space-y-8">
        <input type="hidden" name="id" value={member.id} />
        
        {state?.message && (
          <div className={`p-4 rounded-xl border ${state.message.includes('สำเร็จ') || state.message.includes('เรียบร้อย') ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'} text-sm animate-in fade-in slide-in-from-top-2 duration-300`}>
            {state.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Basic Info Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-brand-red">
                <User size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">ข้อมูลพื้นฐาน</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="fullName">ชื่อ-นามสกุล</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="สมชาย ใจดี"
                  defaultValue={(state?.data?.fullName as string) ?? member.fullName}
                  className={`w-full bg-gray-50 border ${state?.errors?.fullName ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                />
              </div>
              {state?.errors?.fullName && <p className="text-xs text-brand-red mt-1 ml-1">{state.errors.fullName[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="nickname">ชื่อเล่น</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  placeholder="ชาย"
                  defaultValue={(state?.data?.nickname as string) ?? member.employeeSale?.nickname}
                  className="w-full bg-gray-50 border border-gray-200 group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="employeeId">รหัสพนักงาน</label>
                <div className="relative group">
                  <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                  <input
                    id="employeeId"
                    name="employeeId"
                    type="text"
                    placeholder="EMP-001"
                    defaultValue={(state?.data?.employeeId as string) ?? member.employeeId}
                    className={`w-full bg-gray-50 border ${state?.errors?.employeeId ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                  />
                </div>
                {state?.errors?.employeeId && <p className="text-xs text-brand-red mt-1 ml-1">{state.errors.employeeId[0]}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="phoneNumber">เบอร์โทรศัพท์</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="081-234-5678"
                    defaultValue={(state?.data?.phoneNumber as string) ?? member.phoneNumber}
                    className={`w-full bg-gray-50 border ${state?.errors?.phoneNumber ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                  />
                </div>
                {state?.errors?.phoneNumber && <p className="text-xs text-brand-red mt-1 ml-1">{state.errors.phoneNumber[0]}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="role">สิทธิ์การใช้งาน</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <select
                  id="role"
                  name="role"
                  defaultValue={(state?.data?.role as string) ?? member.role}
                  className={`w-full bg-gray-50 border ${state?.errors?.role ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-10 py-3.5 text-gray-900 appearance-none outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                >
                  <option value="">เลือกตำแหน่ง</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Business Development">Business Development</option>
                  <option value="Purchasing Manager">Purchasing Manager</option>
                  <option value="Warehouse Manager">Warehouse Manager</option>
                  <option value="ผู้จัดการคลังสินค้าและจัดซื้อ">ผู้จัดการคลังสินค้าและจัดซื้อ</option>
                  <option value="Purchasing">Purchasing</option>
                  <option value="Accounting Manager">Accounting Manager</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Service Engineer MGR">Service Engineer MGR</option>
                  <option value="Service Engineer">Service Engineer</option>
                  <option value="Service">Service</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Marketing Manager">Marketing Manager</option>
                  <option value="Project">Project</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Project Engineer">Project Engineer</option>
                  <option value="Admin Project">Admin Project</option>
                  <option value="ตัวแทนฝ่ายขาย">ตัวแทนฝ่ายขาย</option>
                  <option value="ผู้จัดการ">ผู้จัดการ</option>
                </select>
              </div>
            </div>

            <div className="pt-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-brand-red">
                <Lock size={16} />
                <span className="text-sm font-bold">เปลี่ยนรหัสผ่าน</span>
              </div>
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="กรอกเพื่อเปลี่ยนรหัสผ่านใหม่"
                    className={`w-full bg-white border ${state?.errors?.password ? 'border-brand-red' : 'border-gray-200'} group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10`}
                  />
                </div>
                <p className="text-[11px] text-gray-400 font-medium">* เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)</p>
                {state?.errors?.password && <p className="text-xs text-brand-red mt-1 ml-1">{state.errors.password[0]}</p>}
              </div>
            </div>
          </div>

          {/* Work Info Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                <Briefcase size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">ข้อมูลการทำงาน</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="branch">สาขา / สำนักงานใหญ่</label>
              <div className="relative group">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="branch"
                  name="branch"
                  type="text"
                  placeholder="สำนักงานใหญ่"
                  defaultValue={(state?.data?.branch as string) ?? member.employeeSale?.branch}
                  className="w-full bg-gray-50 border border-gray-200 group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="teamLeader">หัวหน้าทีม</label>
              <div className="relative group">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="teamLeader"
                  name="teamLeader"
                  type="text"
                  placeholder="คุณวิชัย"
                  defaultValue={(state?.data?.teamLeader as string) ?? member.employeeSale?.teamLeader}
                  className="w-full bg-gray-50 border border-gray-200 group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="position">ตำแหน่งงาน</label>
              <div className="relative group">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="position"
                  name="position"
                  type="text"
                  placeholder="Account Executive"
                  defaultValue={(state?.data?.position as string) ?? member.employeeSale?.position ?? member.position}
                  className="w-full bg-gray-50 border border-gray-200 group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="department">แผนก</label>
              <div className="relative group">
                <Network className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="ฝ่ายขาย"
                  defaultValue={(state?.data?.department as string) ?? member.employeeSale?.department}
                  className="w-full bg-gray-50 border border-gray-200 group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-red/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1" htmlFor="startDate">วันที่เริ่มงาน</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-red transition-colors" size={18} />
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={(state?.data?.startDate as string) ?? formattedStartDate}
                  className="w-full bg-gray-50 border border-gray-200 group-hover:border-gray-300 focus:border-brand-red rounded-xl pl-12 pr-4 py-3.5 text-gray-900 outline-none transition-all focus:ring-4 focus:ring-brand-red/10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-gray-100">
          <Link 
            href="/team"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            กลับไปที่รายการทีม
          </Link>
          <button
            disabled={pending}
            type="submit"
            className="w-full sm:flex-1 bg-brand-red text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200 group"
          >
            {pending ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <>
                <Save size={22} />
                บันทึกการแก้ไขข้อมูล
              </>
            )}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="pt-8 mt-4 border-t border-gray-100">
          <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
            <h3 className="text-brand-red font-black text-sm uppercase tracking-wider mb-2">เขตอันตราย (Danger Zone)</h3>
            <p className="text-gray-500 text-xs mb-6">หากพนักงานลาออกหรือต้องการนำออกจากทีม คุณสามารถนำสมาชิกนี้ออกจากทีมได้ ระบบจะเก็บข้อมูลประวัติการขายไว้ทั้งหมด แต่จะไม่แสดงในหน้ารายการทีมอีก</p>
            <button
              type="button"
              onClick={async () => {
                if (confirm('ยืนยันที่จะนำสมาชิกนี้ออกจากทีมหรือไม่? (ข้อมูลประวัติการขายจะถูกเก็บไว้)')) {
                  const res = await deactivateUser(member.id);
                  if (res && !res.success) alert(res.message);
                }
              }}
              className="px-6 py-3 bg-white border border-brand-red text-brand-red font-bold rounded-xl hover:bg-brand-red hover:text-white transition-all text-xs uppercase tracking-widest"
            >
              นำออกจากทีม (Remove from Team)
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
