export const dynamic = "force-dynamic";

import React from "react";
import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { notFound, redirect } from "next/navigation";
import EditOutsourceRepairForm from "./EditOutsourceRepairForm";

export const metadata = {
  title: "แก้ไขใบส่งซ่อมภายนอก | Sales CRM",
};

export default async function EditOutsourceRepairPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUser();
  if (!session) redirect("/login");

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const usersData = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      role: true,
      employeeSale: {
        select: { position: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const users = usersData.map((u: any) => ({
    id: u.id,
    name: u.fullName,
    position: u.employeeSale?.position || u.role || "เจ้าหน้าที่",
  }));

  const outsourceRepair = await prisma.outsourceRepair.findUnique({
    where: { id },
    include: {
      job: true,
    },
  });

  if (!outsourceRepair) notFound();

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-36">
        <EditOutsourceRepairForm
          users={users}
          currentUserId={session.id}
          initialData={outsourceRepair}
        />
      </div>
    </main>
  );
}
