"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { checkAndAwardServiceGold } from "@/app/actions/coins";

function getBkkBeYear() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return (now.getFullYear() + 543).toString().slice(-2);
}

export async function createInstallationOrder(jobId?: string, autoData?: any) {
  try {
    const session = await getUser();

    let prefill = { ...autoData };

    if (jobId && !autoData) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { quotation: true }
      });
      if (job) {
        const company = job.quotation?.companyId ? await prisma.company.findUnique({
          where: { id: job.quotation.companyId }
        }) : null;

        prefill = {
          jobId: job.id,
          jobName: job.item || job.jobNumber,
          company: company?.companyName || "",
          customer: job.customerName || "",
          address: company?.address || "",
          quotationNo: job.quotationNumber || job.quotation?.quotationNumber || "",
          technician: session?.fullName || "",
        };
      }
    }

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const beYear = (now.getFullYear() + 543).toString().slice(-2);
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const prefix = `JI${beYear}-${day}${month}`;

    const count = await prisma.installationOrder.count({
      where: {
        installationNo: {
          startsWith: `${prefix}-`
        }
      }
    });

    const installationNo = `${prefix}-${String(count + 1).padStart(2, "0")}`;

    const { workInspect, workInstall, workRepair, workTraining, workOther, ...restData } = prefill;

    let techUserId = undefined;
    if (prefill.technician) {
      const techUser = await prisma.user.findFirst({ where: { fullName: prefill.technician } });
      techUserId = techUser?.id;
    }

    const newInstallation = await prisma.installationOrder.create({
      data: {
        installationNo,
        installationDate: new Date(),
        status: "Draft",
        checklist: { workInspect, workInstall, workRepair, workTraining, workOther },
        jobId: jobId || undefined,
        technicianUserId: techUserId,
        ...restData,
      } as any,
    });

    try {
      const { getLineUserIdByEmpId, pushLineMessage, pushLineMessageToTeam, installationAssignedMessage, newInstallationOrderMessage, getServiceManagerLineIds } = await import('@/app/lib/lineNotify');

      // Notify Service Team about the new order
      const teamLineIds = await getServiceManagerLineIds();
      if (teamLineIds.length > 0) {
        await pushLineMessageToTeam(teamLineIds, [newInstallationOrderMessage(newInstallation)], 'service');
      }

      // Notify Technician if already assigned
      if (newInstallation.technician && newInstallation.installationDate) {
        const techUser = await prisma.user.findFirst({ where: { fullName: newInstallation.technician as string } });
        if (techUser?.employeeId) {
          const lineId = await getLineUserIdByEmpId(techUser.employeeId);
          if (lineId) {
            await pushLineMessage(lineId, [installationAssignedMessage(newInstallation)], 'service');
          }
        }
      }
    } catch (err) {
      console.error("Line notify error (Installation created):", err);
    }

    revalidatePath("/jobs");
    return { success: true, installationOrderId: newInstallation.id };
  } catch (error: any) {
    console.error("Failed to create installation order:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInstallationOrder(id: string, data: any) {
  try {
    const existingOrder = await prisma.installationOrder.findUnique({ where: { id } });
    const { workInspect, workInstall, workRepair, workTraining, workOther, ...restData } = data;

    let techUserId = existingOrder?.technicianUserId;
    if (data.technician && data.technician !== existingOrder?.technician) {
      const techUser = await prisma.user.findFirst({ where: { fullName: data.technician } });
      techUserId = techUser?.id || null;
    }

    const updatedOrder = await prisma.installationOrder.update({
      where: { id },
      data: {
        ...restData,
        technicianUserId: techUserId,
        checklist: { workInspect, workInstall, workRepair, workTraining, workOther },
      },
    });

    if (techUserId && updatedOrder.status === "Completed") {
      await checkAndAwardServiceGold(techUserId);
    }

    const wasAssigned = !!(existingOrder?.technician && existingOrder?.installationDate);
    const isAssigned = !!(updatedOrder.technician && updatedOrder.installationDate);
    const changedTech = existingOrder?.technician !== updatedOrder.technician;
    const changedDate = existingOrder?.installationDate?.getTime() !== updatedOrder.installationDate?.getTime();

    if (isAssigned && (!wasAssigned || changedTech || changedDate)) {
      try {
        const { getLineUserIdByEmpId, pushLineMessage, pushLineMessageToTeam, installationAssignedMessage, getServiceManagerLineIds } = await import('@/app/lib/lineNotify');
        const techUser = await prisma.user.findFirst({ where: { fullName: updatedOrder.technician as string } });

        // Notify Technician
        if (techUser?.employeeId) {
          const lineId = await getLineUserIdByEmpId(techUser.employeeId);
          if (lineId) {
            await pushLineMessage(lineId, [installationAssignedMessage(updatedOrder)], 'service');
          }
        }

        // Notify Service Team
        const teamLineIds = await getServiceManagerLineIds();
        if (teamLineIds.length > 0) {
          await pushLineMessageToTeam(teamLineIds, [installationAssignedMessage(updatedOrder)], 'service');
        }
      } catch (err) {
        console.error("Line notify error (Installation updated):", err);
      }
    }

    revalidatePath("/jobs");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update installation order:", error);
    return { success: false, error: error.message };
  }
}

export async function getInstallationOrders(filters?: any) {
  try {
    const data = await prisma.installationOrder.findMany({
      where: filters,
      include: {
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to get installation orders:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteInstallationOrder(id: string) {
  try {
    await prisma.installationOrder.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete installation order:", error);
    return { success: false, error: error.message };
  }
}

export async function updateInstallationPlan(orderId: string, data: any) {
  try {
    const session = await getUser();
    if (!session) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const existingOrder = await prisma.installationOrder.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return { success: false, error: "Order not found." };
    }

    const role = (session.role || '').toLowerCase();
    const isOwnerOrAdmin =
      existingOrder.technician === session.fullName ||
      role.includes('admin') || role === 'ผู้ดูแลระบบ' || role === 'ผู้จัดการ' ||
      role.includes('manager') || role.includes('mgr');
    if (!isOwnerOrAdmin) {
      return { success: false, error: "Unauthorized. เฉพาะช่างผู้รับผิดชอบงาน, ผู้จัดการ หรือผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขแผนงานได้" };
    }

    const { plannedStartDate, plannedEndDate, workLocation, workPlan, technicianNote } = data;

    const updatedOrder = await prisma.installationOrder.update({
      where: { id: orderId },
      data: {
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        workLocation,
        workPlan,
        technicianNote,
        planUpdatedAt: new Date(),
        planUpdatedBy: session.id,
      },
      include: {
        job: true
      }
    });

    // Attempt to send line notify if possible
    try {
      const { pushLineMessage, installationPlanUpdatedMessage } = await import("@/app/lib/lineNotify");
      const message = installationPlanUpdatedMessage(updatedOrder, session.fullName || "Technician");

      const groupId = process.env.LINE_GROUP_ID; // Fallback to group id if no specific line user is found
      if (groupId) {
        await pushLineMessage(groupId, [message]);
      }
    } catch (lineError) {
      console.error("Line notify failed", lineError);
    }

    revalidatePath("/jobs");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update installation plan:", error);
    return { success: false, error: error.message };
  }
}

export async function getPendingInstallationCount() {
  try {
    const existingOrders = await prisma.installationOrder.findMany({
      select: { jobId: true }
    });

    const existingJobIds = existingOrders.map(o => o.jobId).filter(Boolean) as string[];

    const pendingJobsCount = await prisma.job.count({
      where: {
        jobType: {
          contains: 'ติดตั้ง'
        },
        id: {
          notIn: existingJobIds
        }
      }
    });

    return pendingJobsCount;
  } catch (error) {
    console.error("Failed to get pending installation count:", error);
    return 0;
  }
}
