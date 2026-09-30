export const dynamic = "force-dynamic";

import React from "react";
import prisma from "@/app/lib/db";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import EditDeliveryForm from "./EditDeliveryForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const delivery = await prisma.repairDelivery.findUnique({
    where: { id },
    select: { deliveryNumber: true },
  });
  return {
    title: delivery
      ? `แก้ไขใบส่งมอบงาน ${delivery.deliveryNumber} | Sales CRM`
      : "แก้ไขใบส่งมอบงาน | Sales CRM",
  };
}

export default async function EditDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const unwrappedParams = await params;
  const id = unwrappedParams.id;

  const repairDelivery = await prisma.repairDelivery.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          quotation: true,
        },
      },
    },
  });

  if (!repairDelivery) return notFound();

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-36">
        <EditDeliveryForm initialData={repairDelivery} currentUser={session} />
      </div>
    </main>
  );
}
