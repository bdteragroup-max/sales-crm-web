export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";
import EstimationsClientPage from "./EstimationsClientPage";
import { isSuperUser } from "@/app/lib/roleHelper";

export const metadata = {
  title: "ประเมินราคางานซ่อมและประกอบ | Sales CRM",
  description: "ระบบประเมินราคาค่าบริการ ตรวจสอบความต้องการ และมอบหมายงานช่าง",
};

export default async function EstimationsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const employee = user?.employeeId
    ? await prisma.employees.findUnique({ where: { emp_id: user.employeeId } })
    : null;

  const currentUser = {
    ...user,
    fullName: employee?.name || user?.fullName || "ผู้ใช้งานระบบ",
  };

  // Fetch service team members for assignment (MGR role only)
  let serviceTeamMembers: any[] = [];
  const isSuperAdmin = isSuperUser(currentUser.role);
  const isManager =
    isSuperAdmin ||
    (currentUser.role || "")
      .toLowerCase()
      .includes("service engineer mgr") ||
    (currentUser.role || "").toLowerCase().includes("project manager") ||
    (currentUser.role || "").toLowerCase().includes("ผู้จัดการโครงการ") ||
    currentUser.role === "ผู้จัดการ";

  if (isManager) {
    const rawMembers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: "service", mode: "insensitive" } },
          { role: { contains: "บริการ", mode: "insensitive" } },
          { role: { contains: "ช่าง", mode: "insensitive" } },
          { role: { contains: "project", mode: "insensitive" } },
          { role: { contains: "โปรเจค", mode: "insensitive" } },
          { role: { contains: "design", mode: "insensitive" } },
          { role: { contains: "ออกแบบ", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        employeeId: true,
        employeeSale: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const employeeIds = rawMembers
      .map((u) => u.employeeId)
      .filter((id): id is string => Boolean(id));

    const nicknameMap = new Map<string, string>();
    if (employeeIds.length > 0) {
      try {
        const hrEmployees = await prisma.employees.findMany({
          where: { emp_id: { in: employeeIds } },
          select: { emp_id: true, nickname: true },
        });
        hrEmployees.forEach((e: any) => {
          if (e.nickname) nicknameMap.set(e.emp_id, e.nickname);
        });
      } catch (e) {
        console.warn("Could not fetch nicknames from prisma.employees", e);
      }
    }

    serviceTeamMembers = rawMembers.map((u) => {
      const nickname =
        (u.employeeId ? nicknameMap.get(u.employeeId) : null) ||
        u.employeeSale?.nickname ||
        null;
      return {
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        nickname: nickname,
      };
    });
  }

  // Fetch only requirements that are sent to service
  // MGR sees all. Non-MGR sees only unassigned or assigned to them.
  const records = await prisma.customerRequirement.findMany({
    where: {
      isSentToService: true,
      ...(isManager
        ? {}
        : {
            OR: [
              { assignedToUserId: null },
              { assignedToUserId: currentUser.id },
            ],
          }),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-gray-50/60 min-h-0 custom-scrollbar">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <EstimationsClientPage
          currentUser={currentUser}
          initialRecords={records}
          serviceTeamMembers={serviceTeamMembers}
          isManager={isManager}
        />
      </div>
    </main>
  );
}
