export const dynamic = "force-dynamic";

import React from "react";
import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import NewDeliveryForm from "./NewDeliveryForm";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "สร้างใบส่งมอบงานใหม่ | Sales CRM",
};

export default async function NewDeliveryPage(props: {
  searchParams?: Promise<any> | any;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const jobId = searchParams.jobId;

  let initialData = null;
  if (jobId) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        quotation: true,
        installationOrders: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (job) {
      // Find company explicitly if we have companyCode
      let companyAddress = "";
      if (job.quotation?.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: job.quotation.companyId },
        });
        if (company) companyAddress = company.address || "";
      }

      initialData = {
        jobId: job.id,
        company: job.companyCode || "",
        customer: job.customerName || "",
        jobName: job.item || job.jobNumber || "",
        quotationNo:
          job.quotationNumber || job.quotation?.quotationNumber || "",
        address: companyAddress,
        sender: job.sellerName || "",
        technician: job.installationOrders?.[0]?.technician || "",
        jobNumber: job.jobNumber,
      };
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-36">
        <NewDeliveryForm currentUser={session} initialData={initialData} />
      </div>
    </main>
  );
}
