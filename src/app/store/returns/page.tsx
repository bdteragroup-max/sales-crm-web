/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getGoodsReturns } from "@/app/actions/goodsReturns";
import StoreReturnsClient from "./StoreReturnsClient";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "ใบส่งคืนสินค้า คลังสินค้า | Sales CRM",
  description: "ระบบจัดการใบส่งคืนสินค้าเข้าคลังสินค้า เปลี่ยนสเปคสินค้า และส่งซ่อม",
};

export default async function StoreReturnsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getGoodsReturns();
  const goodsReturns = res.success ? res.data : [];

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
      <StoreReturnsClient
        initialData={goodsReturns as any}
        currentUser={session}
        companies={rawCompanies as any}
        jobs={rawJobs as any}
        quotations={rawQuotations as any}
      />
    </main>
  );
}

