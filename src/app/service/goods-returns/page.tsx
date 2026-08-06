import { getGoodsReturns } from "@/app/actions/goodsReturns";
import GoodsReturnsClientPage from "./GoodsReturnsClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "ใบส่งคืนสินค้า (Goods Returns) | Sales CRM",
};

export default async function GoodsReturnsPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const res = await getGoodsReturns();
  const goodsReturns = res.success ? res.data : [];

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

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-6">
      <GoodsReturnsClientPage 
        initialData={goodsReturns as any} 
        currentUser={session}
        companies={rawCompanies as any}
        jobs={rawJobs as any}
        quotations={rawQuotations as any}
      />
    </main>
  );
}
