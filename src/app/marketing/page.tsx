import { cookies } from 'next/headers'
import { decrypt } from '@/app/lib/session'
import prisma from '@/app/lib/db'
import { redirect } from 'next/navigation'
import { getMarketingLeads } from '@/app/actions/marketing'
import Link from 'next/link'
import { PlusCircle, Search, LayoutDashboard, Calendar, Edit3, FileText } from 'lucide-react'
import DeleteLeadButton from './components/DeleteLeadButton'

export default async function MarketingDashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  if (payload?.userId) {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    const roleStr = (user?.role || '').toUpperCase();
    const isServiceOrProjectOnly = ["SERVICE", "SERVICE_ENGINEER", "SERVICE_MGR", "PROJECT", "บริการ", "โปรเจค", "โครงการ"].some(r => roleStr.includes(r)) && !["MARKETING", "MANAGER", "SUPER_ADMIN", "การตลาด", "ผู้จัดการ"].some(r => roleStr.includes(r));
    if (isServiceOrProjectOnly) {
      redirect('/marketing/kanban');
    }
  }

  const resolvedParams = await searchParams
  const searchQuery = typeof resolvedParams.search === 'string' ? resolvedParams.search : ''

  const result = await getMarketingLeads()
  let leads = result.data || []

  if (searchQuery) {
    const s = searchQuery.toLowerCase()
    leads = leads.filter((l: any) => 
      l.customerName.toLowerCase().includes(s) || 
      (l.phoneNumber && l.phoneNumber.includes(s)) ||
      (l.productOfInterest && l.productOfInterest.toLowerCase().includes(s))
    )
  }

  const renderWorkflowStepper = (isForwarded: boolean, status?: string, isContacted?: boolean) => {
    const isLost = status?.includes('ไม่สำเร็จ') || status?.includes('ปฏิเสธ')
    const isWon = ['รอติดตั้ง', 'ปิดการขาย', 'รอส่งมอบ', 'เปิดบิลแล้ว'].includes(status || '')
    
    // Determine current stage
    let currentStage = 0 // 0 = New Lead
    if (isForwarded) currentStage = 1 // 1 = Forwarded
    if (status || isContacted) currentStage = 2 // 2 = Quotation in progress or sales contacted
    if (isWon || isLost) currentStage = 3 // 3 = Finished

    return (
      <div className="flex flex-col gap-1.5 w-full min-w-[180px]">
        <div className="flex items-center justify-between gap-1 w-full">
           {/* Step 1: New Lead */}
           <div className={`h-1.5 flex-1 rounded-full bg-brand-red`} />
           
           {/* Step 2: Forwarded */}
           <div className={`h-1.5 flex-1 rounded-full transition-all ${
             currentStage >= 1 ? 'bg-brand-red' : 'bg-gray-100'
           }`} />
           
           {/* Step 3: Quotation Status */}
           <div className={`h-1.5 flex-1 rounded-full transition-all ${
             currentStage >= 2 
               ? (isLost ? 'bg-gray-400' : isWon ? 'bg-emerald-500' : 'bg-amber-400') 
               : 'bg-gray-100'
           }`} />
        </div>
        <div className="text-[10px] font-bold mt-0.5 flex justify-between items-center">
           <span className={isForwarded ? 'text-gray-400' : 'text-brand-red'}>
             {isForwarded ? 'ส่งต่อแล้ว' : 'Lead ใหม่'}
           </span>
           <span className={
              !isForwarded ? 'text-gray-300' : 
              isLost ? 'text-gray-500' : 
              isWon ? 'text-emerald-600' : 
              'text-amber-600'
            }>
               {isWon || isLost ? status : 
                 status ? `ส่งใบเสนอราคา (${status})` : 
                 isContacted ? 'โทรติดต่อแล้ว' : 
                 isForwarded ? 'รอฝ่ายขายติดต่อ' : 'รอพิจารณาส่งต่อ'}
            </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto w-full overflow-hidden sm:overflow-visible">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-md shadow-red-200">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Marketing Leads</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">จัดการข้อมูลลูกค้าติดต่อเข้า</p>
          </div>
        </div>
        
        <Link 
          href="/marketing/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md active:scale-95"
        >
          <PlusCircle size={14} />
          เพิ่ม Lead ใหม่
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form method="GET" action="/marketing" className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              name="search"
              defaultValue={searchQuery}
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร..." 
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all w-full sm:w-64"
            />
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-gray-50/50 text-xs uppercase font-black text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-gray-100">ลูกค้า / ติดต่อ</th>
                <th className="px-6 py-4 border-b border-gray-100">ความสนใจ (Product)</th>
                <th className="px-6 py-4 border-b border-gray-100">สถานะล่าสุด (Stage)</th>
                <th className="px-6 py-4 border-b border-gray-100">ฝ่ายขายที่ดูแล</th>
                <th className="px-6 py-4 border-b border-gray-100">วันที่รับเรื่อง</th>
                <th className="px-6 py-4 border-b border-gray-100 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">{lead.customerName}</p>
                    {lead.phoneNumber && <p className="text-xs text-gray-500 font-medium mt-0.5">{lead.phoneNumber}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800">{lead.productOfInterest || '-'}</p>
                    {lead.productType && <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-bold uppercase">{lead.productType}</span>}
                  </td>
                  <td className="px-6 py-4">
                    {renderWorkflowStepper(lead.isForwarded, lead.quotation?.status, lead.isContacted)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 font-medium">
                      {lead.isForwarded ? (lead.assignedTo?.fullName || lead.quotation?.salesperson?.fullName || 'ไม่ระบุ') : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-medium flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400" />
                    {new Date(lead.createdAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/marketing/${lead.id}/edit`}
                        className="inline-flex items-center justify-center p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit3 size={16} />
                      </Link>
                      <Link 
                        href={`/marketing/${lead.id}`}
                        className="inline-flex items-center justify-center p-2 text-brand-red bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <FileText size={16} />
                      </Link>
                      <DeleteLeadButton leadId={lead.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    ยังไม่มีข้อมูล Marketing Lead
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
