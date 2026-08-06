import React from "react";
import EditGoodsReturnClientPage from "./EditGoodsReturnClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "แก้ไขใบส่งคืนสินค้า | Sales CRM",
};

export default async function EditGoodsReturnPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const rawCompanies = await prisma.company.findMany({
    orderBy: { companyName: 'asc' },
    select: { id: true, companyName: true, address: true }
  });

  const rawJobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, jobNumber: true, item: true }
  });
  
  const rawQuotations = await prisma.quotation.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, quotationNumber: true, subject: true }
  });

  const goodsReturn = await prisma.goodsReturn.findUnique({
    where: { id: params.id }
  });

  if (!goodsReturn) {
    redirect("/service/goods-returns");
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#fafbfc] p-4 md:p-6">
      <EditGoodsReturnClientPage 
        companies={rawCompanies as any} 
        jobs={rawJobs as any}
        quotations={rawQuotations as any}
        currentUser={session} 
        initialGoodsReturn={goodsReturn}
      />
    </main>
  );
}
