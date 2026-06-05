import React from "react";
import prisma from "@/app/lib/db";
import { notFound } from "next/navigation";
import EditDeliveryForm from "./EditDeliveryForm";

export default async function EditDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  const id = unwrappedParams.id;
  
  const repairDelivery = await prisma.repairDelivery.findUnique({
    where: { id },
  });

  if (!repairDelivery) return notFound();

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full">
        <EditDeliveryForm initialData={repairDelivery} />
      </div>
    </main>
  );
}
