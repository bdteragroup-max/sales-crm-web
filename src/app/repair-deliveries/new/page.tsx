import React from "react"
import { getUser } from "@/app/lib/dal"
import NewDeliveryForm from "./NewDeliveryForm"
import { Printer } from "lucide-react"

export const metadata = {
  title: "บันทึกใบส่งมอบงานใหม่ - TERA",
}

export default async function NewDeliveryPage() {
  const session = await getUser()

  return (
    <div className="flex-1 w-full h-full bg-gray-50/50 p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
      {/* Action bar for PDF generation */}
      <div className="w-full max-w-7xl mx-auto mb-4 flex justify-end">
        <a 
          href="/repair-deliveries/blank/pdf" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:border-red-300 hover:text-red-600 shadow-sm transition-all"
        >
          <Printer size={16} />
          พิมพ์แบบฟอร์มเปล่า (Blank PDF)
        </a>
      </div>

      <div className="w-full mx-auto">
        <NewDeliveryForm currentUser={session} />
      </div>
    </div>
  )
}
