import { getUser } from "@/app/lib/dal";
import { redirect } from "next/navigation";
import prisma from "@/app/lib/db";
import PlanViewerClient, { type PlanViewerOrder, type PlanViewerJobFallback } from "./PlanViewerClient";

export const dynamic = "force-dynamic";

export default async function ViewInstallationPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getUser();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const installationOrder = await prisma.installationOrder.findFirst({
    where: {
      OR: [{ jobId: id }, { id }],
    },
    include: {
      job: {
        select: {
          id: true,
          jobNumber: true,
          customerName: true,
          item: true,
          sellerName: true,
          quotationNumber: true,
        },
      },
    },
    orderBy: [{ planUpdatedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (!installationOrder) {
    const jobFallback: PlanViewerJobFallback | null = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        item: true,
      },
    });

    if (!jobFallback) {
      redirect("/service/installation");
    }

    return <PlanViewerClient order={null} jobFallback={jobFallback} canEditPlan={false} />;
  }

  const planUpdater = installationOrder.planUpdatedBy
    ? await prisma.user.findUnique({
        where: { id: installationOrder.planUpdatedBy },
        select: { fullName: true },
      })
    : null;

  const roleLower = (session.role || "").toLowerCase();
  const canEditPlan =
    installationOrder.technician === session.fullName ||
    roleLower.includes("admin") ||
    roleLower === "ผู้ดูแลระบบ" ||
    roleLower === "ผู้จัดการ" ||
    roleLower.includes("manager") ||
    roleLower.includes("mgr");

  const serializedOrder: PlanViewerOrder = {
    id: installationOrder.id,
    installationNo: installationOrder.installationNo,
    jobId: installationOrder.jobId,
    jobNumber: installationOrder.job?.jobNumber || null,
    sellerName: installationOrder.job?.sellerName || installationOrder.sender || null,
    quotationNo: installationOrder.quotationNo || installationOrder.job?.quotationNumber || null,
    company: installationOrder.company || installationOrder.job?.customerName || null,
    jobName: installationOrder.jobName || installationOrder.job?.item || null,
    siteAddress: installationOrder.siteAddress || installationOrder.address || null,
    status: installationOrder.status,
    technician: installationOrder.technician || null,
    technicianPhone: installationOrder.technicianPhone || null,
    plannedStartDate: installationOrder.plannedStartDate ? installationOrder.plannedStartDate.toISOString() : null,
    plannedEndDate: installationOrder.plannedEndDate ? installationOrder.plannedEndDate.toISOString() : null,
    workLocation: installationOrder.workLocation || null,
    workPlan: installationOrder.workPlan || null,
    technicianNote: installationOrder.technicianNote || null,
    planUpdatedAt: installationOrder.planUpdatedAt ? installationOrder.planUpdatedAt.toISOString() : null,
    planUpdatedByName: planUpdater?.fullName || null,
  };

  return <PlanViewerClient order={serializedOrder} jobFallback={null} canEditPlan={canEditPlan} />;
}
