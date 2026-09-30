import React from "react";
import EditGoodsReturnClientPage from "./EditGoodsReturnClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "แก้ไขใบส่งคืนสินค้า | Sales CRM",
  description: "แก้ไขและปรับปรุงข้อมูลใบส่งคืนสินค้า",
};

export default async function EditGoodsReturnPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const rawCompanies = await prisma.company.findMany({
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true, address: true },
  });

  const rawJobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, jobNumber: true, item: true },
  });

  const rawQuotations = await prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, quotationNumber: true, subject: true },
  });

  const goodsReturn = await prisma.goodsReturn.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      job: true,
      quotation: true,
    },
  });

  if (!goodsReturn) {
    redirect("/service/goods-returns");
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <EditGoodsReturnClientPage
          companies={rawCompanies as any}
          jobs={rawJobs as any}
          quotations={rawQuotations as any}
          currentUser={session}
          initialGoodsReturn={goodsReturn}
        />
      </div>
    </main>
  );
}
