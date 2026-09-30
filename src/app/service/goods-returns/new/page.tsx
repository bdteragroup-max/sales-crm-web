import React from "react";
import NewGoodsReturnClientPage from "./NewGoodsReturnClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "สร้างใบส่งคืนสินค้า | Sales CRM",
  description: "จัดทำเอกสารส่งคืนสินค้า คืนของเสีย หรือส่งซ่อม",
};

export default async function NewGoodsReturnPage() {
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

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <NewGoodsReturnClientPage
          companies={rawCompanies as any}
          jobs={rawJobs as any}
          quotations={rawQuotations as any}
          currentUser={session}
        />
      </div>
    </main>
  );
}
