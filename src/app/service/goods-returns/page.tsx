import { getGoodsReturns } from "@/app/actions/goodsReturns";
import GoodsReturnsClientPage from "./GoodsReturnsClientPage";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "ใบส่งคืนสินค้า (Goods Returns) | Sales CRM",
  description: "ระบบจัดการและติดตามเอกสารส่งคืนสินค้า คืนซ่อม และเคลมของเสีย",
};

export default async function GoodsReturnsPage() {
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <GoodsReturnsClientPage
          initialData={goodsReturns as any}
          currentUser={session}
          companies={rawCompanies as any}
          jobs={rawJobs as any}
          quotations={rawQuotations as any}
        />
      </div>
    </main>
  );
}
