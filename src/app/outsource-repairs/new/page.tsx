export const dynamic = "force-dynamic";

import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import NewOutsourceRepairForm from "./NewOutsourceRepairForm";

export const metadata = {
  title: "สร้างใบส่งซ่อมภายนอก | Sales CRM",
};

export default async function NewOutsourceRepairPage(
  props: { searchParams?: Promise<{ jobId?: string }> }
) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

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

  let initialJob: any = null;
  if (searchParams.jobId) {
    initialJob = await prisma.job.findUnique({
      where: { id: searchParams.jobId },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        companyCode: true,
        sellerName: true,
        item: true,
      },
    });
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-36">
        <NewOutsourceRepairForm
          users={users}
          currentUserId={session.id}
          initialJob={initialJob}
        />
      </div>
    </main>
  );
}
