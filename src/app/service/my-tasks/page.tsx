import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import MyTasksClient from "./MyTasksClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "งานของฉัน (My Tasks) | Sales CRM",
  description: "ระบบจัดการและติดตามงานติดตั้งและตรวจเช็คที่ได้รับมอบหมาย",
};

export default async function MyTasksPage() {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  // Lookup nickname from employees or employeeSale
  const employee = session?.employeeId
    ? await prisma.employees.findUnique({
        where: { emp_id: session.employeeId },
        select: { emp_id: true, nickname: true, name: true },
      })
    : null;

  const currentUser = {
    ...session,
    nickname: employee?.nickname || null,
  };

  // Get orders assigned to this technician
  const orders = await prisma.installationOrder.findMany({
    where: {
      OR: [
        { technicianUserId: session.id },
        { technician: session.fullName },
        ...(employee?.name ? [{ technician: employee.name }] : []),
        { technician: { contains: session.fullName, mode: "insensitive" } },
      ],
    },
    orderBy: [
      { plannedStartDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return <MyTasksClient orders={orders} currentUser={currentUser} />;
}
