import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import RepairOrdersClientPage from "./RepairOrdersClientPage";

export default async function RepairOrdersPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const userRole = session.role || "";


  const rawRepairOrders = await prisma.repairOrder.findMany({
    include: {
      job: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  
  const rawCompanies = await prisma.company.findMany({
    orderBy: { companyName: 'asc' }
  });

  const rawUsers = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: 'asc' }
  });

  const repairOrders = JSON.parse(JSON.stringify(rawRepairOrders));
  const companies = JSON.parse(JSON.stringify(rawCompanies));
  const users = JSON.parse(JSON.stringify(rawUsers));

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-[#fafbfc] p-4 md:p-6">
      <RepairOrdersClientPage
        initialRepairOrders={repairOrders}
        companies={companies}
        users={users}
        userRole={userRole}
      />
    </main>
  );
}
