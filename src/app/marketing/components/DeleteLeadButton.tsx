'use client'

import React, { useState } from 'react'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { deleteMarketingLead } from '@/app/actions/marketing'
import { useRouter } from 'next/navigation'

export default function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteMarketingLead(leadId)
    if (result.success) {
      setShowModal(false)
      // Will refresh the route automatically due to revalidatePath
      router.refresh()
    } else {
      setIsDeleting(false)
      alert(result.error || 'ไม่สามารถลบข้อมูลได้')
    }
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        disabled={isDeleting}
        className={`inline-flex items-center justify-center p-2 text-brand-red bg-red-50 hover:bg-red-200 rounded-lg transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="ลบข้อมูล"
      >
        <Trash2 size={16} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-brand-red" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                ยืนยันการลบข้อมูล
              </h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">
                คุณต้องการลบข้อมูล Lead นี้ใช่หรือไม่? การกระทำนี้จะไม่สามารถย้อนกลับได้
              </p>
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setShowModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-brand-red hover:bg-red-700 shadow-md shadow-red-200 transition-colors flex justify-center items-center gap-2"
                >
                  {isDeleting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    'ยืนยันลบ'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

