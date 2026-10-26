import React from "react"
import { getUser } from "@/app/lib/dal"
import prisma from "@/app/lib/db"
import { notFound } from "next/navigation"
import { Sarabun } from "next/font/google"
import RequisitionPDFClient from "./RequisitionPDFClient"

const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const req = await prisma.materialRequisition.findUnique({
    where: { id },
    select: { requisitionNumber: true, requisitionType: true },
  })

  if (!req) return { title: "ใบเบิก / ยืมวัสดุและอุปกรณ์ | Tera Group" }

  const isBorrow =
    req.requisitionType === "BORROW_EQUIPMENT" ||
    req.requisitionType === "BORROW" ||
    req.requisitionType === "EQUIPMENT"

  const docTitle = isBorrow ? "ใบยืมเครื่องมือและอุปกรณ์" : "ใบเบิกวัสดุอุปกรณ์งานโครงการ"
  return {
    title: `${docTitle} ${req.requisitionNumber} | Tera Group`,
  }
}

export default async function RequisitionPDF({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getUser()
  if (!session) return notFound()

  const { id } = await params

  const requisition = await prisma.materialRequisition.findUnique({
    where: { id },
    include: {
      requester: true,
      approver: true,
    },
  })

  if (!requisition) return notFound()

  // Optional project lookup if projectId is present
  const project = requisition.projectId
    ? await prisma.project.findUnique({
        where: { id: requisition.projectId },
        select: { projectNumber: true, name: true, clientName: true, siteAddress: true },
      })
    : null

  return (
    <div className={sarabun.className}>
      <RequisitionPDFClient requisition={requisition} project={project} />
    </div>
  )
}
