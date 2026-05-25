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
    <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-6 custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full pb-32">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            แก้ไขใบรับซ่อม
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Edit Repair Order • {repairOrder.job?.jobNumber || '-'}
          </p>
        </div>
        
        <EditRepairOrderForm 
          initialData={repairOrder} 
          users={users} 
          companies={companies} 
        />
      </div>
    </main>
  );
}
