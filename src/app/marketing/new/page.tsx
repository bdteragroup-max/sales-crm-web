import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import NewLeadClient from './NewLeadClient'
import prisma from '@/app/lib/db'

export default async function NewMarketingLeadPage() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  
  if (!payload?.userId) {
    redirect('/')
  }

  const dbUsers = await prisma.user.findMany({
    where: { 
      isActive: true,
    },
    select: { 
      id: true, 
      fullName: true,
      employeeId: true
    },
    orderBy: { fullName: 'asc' }
  })

  let salesReps: any[] = []
  if (dbUsers.length > 0) {
    const { teraDb } = await import('@/app/lib/teraDb')
    const employeeIds = dbUsers.map(u => u.employeeId).filter(Boolean) as string[]
    let hrEmployeeMap = new Map<string, string>()
    
    if (employeeIds.length > 0) {
      const hrEmployees = await teraDb.employees.findMany({
        where: { emp_id: { in: employeeIds } },
        select: { emp_id: true, nickname: true }
      })
      hrEmployeeMap = new Map(hrEmployees.map(e => [e.emp_id, e.nickname || '']))
    }

    salesReps = dbUsers.map(u => ({
      id: u.id,
      fullName: u.fullName,
      nickname: u.employeeId ? hrEmployeeMap.get(u.employeeId) || null : null
    }))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">สร้างข้อมูลติดต่อใหม่ (New Lead)</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">เพิ่มข้อมูลผู้ติดต่อใหม่เข้าระบบ</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <NewLeadClient userId={payload.userId as string} salesReps={salesReps} />
      </div>
    </div>
  )
}
