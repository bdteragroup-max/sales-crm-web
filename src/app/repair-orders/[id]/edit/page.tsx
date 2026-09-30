import React from "react";
import prisma from "@/app/lib/db";
import { notFound } from "next/navigation";
import EditRepairOrderForm from "./EditRepairOrderForm";

export default async function EditRepairOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  const id = unwrappedParams.id;
  
  // Here, id is the RepairOrder ID
  const repairOrder = await prisma.repairOrder.findUnique({
    where: { id },
    include: { job: true }
  });

  if (!repairOrder) return notFound();

  const [users, companies] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true, role: true } }),
    prisma.company.findMany({ select: { id: true, companyName: true, address: true, province: true, district: true, subDistrict: true, postalCode: true, taxId: true } })
  ]);

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50/80 min-h-0 custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-36">
        <EditRepairOrderForm 
          initialData={repairOrder} 
          users={users} 
          companies={companies} 
        />
      </div>
    </main>
  );
}
