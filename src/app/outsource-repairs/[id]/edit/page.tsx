import React from "react";
import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { notFound, redirect } from "next/navigation";
import EditOutsourceRepairForm from "./EditOutsourceRepairForm";

export const metadata = {
  title: "แก้ไขใบส่งซ่อมภายนอก | Sales CRM",
};

export default async function EditOutsourceRepairPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getUser();
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const usersData = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      employeeSale: {
        select: { position: true }
      }
    },
    orderBy: { fullName: 'asc' }
  });

  const users = usersData.map((u: any) => ({
    id: u.id,
    name: u.fullName,
    position: u.employeeSale?.position || 'Sales Rep'
  }));

  const outsourceRepair = await prisma.outsourceRepair.findUnique({
    where: { id },
  });

  if (!outsourceRepair) notFound();

  return (
    <div className="p-4 md:p-8 bg-gray-50/50 min-h-full">
      <EditOutsourceRepairForm users={users} currentUserId={session.id} initialData={outsourceRepair} />
    </div>
  );
}
