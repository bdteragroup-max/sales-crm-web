"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function createFacilityRepairCore(data: {
  equipmentName: string;
  issueDetail: string;
  location: string;
  photoUrl?: string;
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  sourceModule: string;
}) {
  const req = await prisma.facilityRepairRequest.create({
    data: {
      requestNumber: `FR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`,
      ...data,
      logs: {
        create: {
          userId: data.reporterId || null,
          action: "Report Repair",
          details: "Created a new facility repair request"
        }
      }
    }
  });
  
  
  const techAdmins = await prisma.user.findMany({
    where: { role: { in: ['TECHNICIAN', 'ADMIN'] } }
  });
  if (techAdmins.length > 0) {
    await prisma.notification.createMany({
      data: techAdmins.map((u) => ({
        userId: u.id,
        title: "แจ้งซ่อมใหม่",
        message: data.reporterName ? data.reporterName + " แจ้งซ่อม: " + data.equipmentName : "พนักงาน แจ้งซ่อม: " + data.equipmentName,
        link: "/facility-repairs/" + req.id
      }))
    });
  }

  return req;
}

export async function createFacilityRepair(data: any) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const req = await createFacilityRepairCore({
    ...data,
    reporterId: user.id,
    reporterName: user.fullName,
    reporterEmail: user.email,
    sourceModule: "general"
  });

  revalidatePath('/facility-repairs');
  return req;
}

export async function getFacilityRepairs(filters?: any) {
  return await prisma.facilityRepairRequest.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
    include: { reporter: true, assignee: true }
  });
}

export async function assignFacilityRepair(id: string, assigneeId: string) {
  const user = await getUser();
  if (!user || (user.role !== 'TECHNICIAN' && user.role !== 'ADMIN')) {
    throw new Error("Unauthorized: Only Technicians or Admins can assign tasks");
  }

  const req = await prisma.facilityRepairRequest.update({
    where: { id },
    data: {
      assigneeId,
      status: "ASSIGNED",
      logs: {
        create: {
          userId: user.id,
          action: "Responsible",
          details: `Assigned to ${assigneeId}`
        }
      }
    }
  });

  
  const request2 = await prisma.facilityRepairRequest.findUnique({ where: { id } });
  if (request2?.reporterId) {
    await prisma.notification.create({
      data: {
        userId: request2.reporterId,
        title: "ใบแจ้งซ่อมของคุณได้รับการรับผิดชอบแล้ว",
        message: "ช่างได้เข้ารับผิดชอบงานซ่อม " + request2.equipmentName + " ของคุณแล้ว",
        link: "/tickets"
      }
    });
  }

  revalidatePath('/facility-repairs');
  revalidatePath(`/facility-repairs/${id}`);
  revalidatePath('/technician/facility-repairs');
  return req;
}

export async function updateFacilityRepairStatus(id: string, status: string, expectedCompletionDate?: Date) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const request = await prisma.facilityRepairRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Not found");

  if (user.role !== 'ADMIN' && request.assigneeId !== user.id) {
    throw new Error("Unauthorized: Only the assigned Technician or an Admin can update this status");
  }

  const dataToUpdate: any = { status };
  if (expectedCompletionDate) dataToUpdate.expectedCompletionDate = expectedCompletionDate;
  if (status === 'COMPLETED') dataToUpdate.completedAt = new Date();

  const req = await prisma.facilityRepairRequest.update({
    where: { id },
    data: {
      ...dataToUpdate,
      logs: {
        create: {
          userId: user.id,
          action: "Update Status",
          details: `Status updated to ${status}`
        }
      }
    }
  });

  
  const currentReq = await prisma.facilityRepairRequest.findUnique({ where: { id } });
  if (currentReq?.reporterId) {
    await prisma.notification.create({
      data: {
        userId: currentReq.reporterId,
        title: "อัปเดตสถานะการซ่อม",
        message: "งานซ่อม " + currentReq.equipmentName + " ของคุณถูกเปลี่ยนสถานะเป็น " + status,
        link: "/tickets"
      }
    });
  }

  revalidatePath('/facility-repairs');
  revalidatePath(`/facility-repairs/${id}`);
  revalidatePath('/technician/facility-repairs');
  return req;
}\n