import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import { redirect } from 'next/navigation'
import LeadImportClient from './LeadImportClient'
import { getActiveSalesReps, getImportHistoryLogs } from '@/app/actions/marketing-import'

export const metadata = {
  title: 'Lead Import & Duplicate Detection | ระบบนำเข้าและตรวจจับข้อมูลลูกค้าซ้ำ',
  description: 'นำเข้าข้อมูลลูกค้าผ่านไฟล์ Excel/CSV พร้อมระบบตรวจสอบเบอร์โทรและชื่อซ้ำอัตโนมัติ ส่งต่องานฝ่ายขาย'
}

export default async function ImportLeadsPage() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  if (!payload?.userId) {
    redirect('/login')
  }

  const [salesReps, historyLogs] = await Promise.all([
    getActiveSalesReps(),
    getImportHistoryLogs()
  ])

  return (
    <LeadImportClient
      salesReps={salesReps}
      initialHistory={historyLogs}
    />
  )
}
