import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import NewOutsourceRepairForm from "./NewOutsourceRepairForm";

export const metadata = {
  title: "สร้างใบส่งซ่อมภายนอก | Sales CRM",
};

export default async function NewOutsourceRepairPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

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

  return (
    <div className="p-4 md:p-8 bg-gray-50/50 min-h-full">
      <div className="max-w-5xl mx-auto">
        <NewOutsourceRepairForm users={users} currentUserId={session.id} />
      </div>
    </div>
  );
}
