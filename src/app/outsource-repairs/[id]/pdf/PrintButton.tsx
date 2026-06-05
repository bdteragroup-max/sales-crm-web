"use client"
import { useRouter } from "next/navigation"
import { Printer, ArrowLeft } from "lucide-react"

export default function PrintButton() {
  const router = useRouter()

  return (
    <>
      <button onClick={() => router.back()} className="ro-fab-btn ro-fab-back">
        <ArrowLeft size={16} /> กลับ
      </button>
      <button onClick={() => window.print()} className="ro-fab-btn ro-fab-print">
        <Printer size={16} /> สั่งพิมพ์
      </button>
    </>
  )
}
