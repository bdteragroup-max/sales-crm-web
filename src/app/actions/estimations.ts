"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import {
  pushLineMessage,
  estimationRequestMessage,
  estimationCompletedMessage,
  getLineUserIdByEmpId,
  getLineUserIdByCrmUserId
} from "@/app/lib/lineNotify";

export async function sendRequirementForEstimation(requirementId: string) {
  const req = await prisma.customerRequirement.update({
    where: { id: requirementId },
    data: {
      isSentToService: true,
      estimationStatus: "PENDING",
    },
  });

  // Items extraction
  const items = [];
  const fd = req.formData as any;
  if (fd["สินค้า_INVERTER"]) items.push("Inverter");
  if (fd["สินค้า_MDB"]) items.push("MDB");
  if (fd["สินค้า_DB"]) items.push("DB");
  if (fd["สินค้า_CONTROL"]) items.push("Control");

  const msg = estimationRequestMessage(req.companyName, items, req.salesperson, req.id);

  // Notify Service users
  const serviceUsers = await prisma.user.findMany({
    where: { 
      OR: [
        { role: { contains: "service", mode: "insensitive" } },
        { role: { contains: "บริการ", mode: "insensitive" } },
        { role: { contains: "ช่าง", mode: "insensitive" } }
      ]
    },
    select: { employeeId: true }
  });

  const empIdsToNotify = new Set<string>();
  serviceUsers.forEach((u) => {
    if (u.employeeId) empIdsToNotify.add(u.employeeId);
  });

  for (const empId of empIdsToNotify) {
    const lineId = await getLineUserIdByEmpId(empId);
    if (lineId) {
      await pushLineMessage(lineId, [msg]);
    }
  }

  revalidatePath("/sales/requirements");
  revalidatePath("/service/estimations");
  
  return { success: true };
}

export async function submitEstimation(
  requirementId: string,
  data: { estimatedPrice: number; estimationNote: string },
  servicePersonName: string
) {
  const req = await prisma.customerRequirement.update({
    where: { id: requirementId },
    data: {
      estimationStatus: "ESTIMATED",
      estimatedPrice: data.estimatedPrice,
      estimationNote: data.estimationNote,
      estimatedBy: servicePersonName,
      estimatedAt: new Date(),
    },
  });

  const msg = estimationCompletedMessage(
    req.companyName,
    data.estimatedPrice,
    data.estimationNote,
    servicePersonName,
    req.id
  );

  // Notify the Salesperson who created it
  if (req.userId) {
    const salesLineId = await getLineUserIdByCrmUserId(req.userId);
    if (salesLineId) {
      await pushLineMessage(salesLineId, [msg]);
    }
  }

  revalidatePath("/sales/requirements");
  revalidatePath("/service/estimations");
  
  return { success: true };
}
