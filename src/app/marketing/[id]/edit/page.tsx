import { getMarketingLeadById } from '@/app/actions/marketing'
import EditLeadClient from './EditLeadClient'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const { id } = await Promise.resolve(params);
  const { success, data: lead } = await getMarketingLeadById(id)

  if (!success || !lead) {
    redirect('/marketing')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/marketing/${lead.id}`}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <ArrowLeft size={20} className="text-gray-500 group-hover:text-gray-900" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-900">แก้ไขข้อมูล Marketing Lead</h1>
              <p className="text-xs font-bold text-gray-500">
                รหัสอ้างอิง: <span className="font-mono">{lead.id.slice(-6).toUpperCase()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <EditLeadClient lead={lead} />
        </div>
      </div>
    </div>
  )
}
