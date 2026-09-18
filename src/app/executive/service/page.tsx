import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import ExecutiveServiceClient from "./ExecutiveServiceClient";

export const metadata = {
  title: "Service Forecast & Overview - TERA",
};

export const dynamic = "force-dynamic";

export default async function ExecutiveServicePage(props: { searchParams?: Promise<any> | any }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const timeframe = searchParams.timeframe || "month";

  const session = await getUser();
  if (!session) {
    redirect("/");
  }

  const roleStr = (session.role || "").toLowerCase();
  const isExecutive = roleStr === 'ผู้บริหาร' || roleStr === 'executive' || roleStr === 'super_admin';
  if (!isExecutive) {
    redirect("/dashboard");
  }

  // Fetch all service jobs (repair, service, inspection, claim) for instant reactive filtering
  const allServiceJobs = await prisma.job.findMany({
    where: {
      OR: [
        { jobType: { contains: "ซ่อม" } }, 
        { jobType: { contains: "บริการ" } },
        { jobType: { contains: "ตรวจเช็ค" } },
        { jobType: { contains: "เคลม" } }
      ],
    },
    include: {
      quotation: true,
      installationOrders: true,
      repairOrder: true,
      stepLogs: {
        orderBy: { completedAt: 'desc' },
        take: 3
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch installations (sales + service)
  const allInstallations = await prisma.installationOrder.findMany({
    include: { job: true },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch Outsource repairs
  const allOutsource = await prisma.outsourceRepair.findMany({
    include: { job: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 font-ibm-thai">
      <ExecutiveServiceClient
        allServiceJobs={allServiceJobs}
        allInstallations={allInstallations}
        allOutsource={allOutsource}
        timeframe={timeframe}
        currentUser={session}
      />
    </div>
  );
}

