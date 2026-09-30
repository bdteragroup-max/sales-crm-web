import { Suspense } from "react";
import ServiceCallsClientPage from "./ServiceCallsClientPage";
import { getServiceCallLogs } from "@/app/actions/service-calls";
import { getUser } from "@/app/lib/dal";
import prisma from "@/app/lib/db";

export const metadata = {
  title: "บันทึกแจ้งปัญหาลูกค้า (Service Call Log)",
};

export const dynamic = "force-dynamic";

export default async function ServiceCallsPage() {
  const [user, initialLogs, rawUsers] = await Promise.all([
    getUser(),
    getServiceCallLogs({}),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const users = JSON.parse(JSON.stringify(rawUsers));

  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400 font-bold">กำลังโหลด...</div>}>
      <ServiceCallsClientPage
        initialLogs={initialLogs}
        users={users}
        userRole={user?.role || ""}
      />
    </Suspense>
  );
}
