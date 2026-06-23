"use server";

import prisma from "@/app/lib/db";
import { revalidatePath } from "next/cache";
import {
  pushLineMessage,
  estimationRequestMessage,
  estimationCompletedMessage,
  estimationAssignedMessage,
  getLineUserIdByEmpId,
  getLineUserIdByCrmUserId,
  getServiceManagerLineIds,
  pushLineMessageToTeam
} from "@/app/lib/lineNotify";
import { getUser } from "@/app/lib/dal";
import { checkAndAwardServiceGold } from "@/app/actions/coins";

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

  // Notify Service Manager
  const teamLineIds = await getServiceManagerLineIds();
  if (teamLineIds.length > 0) {
    await pushLineMessageToTeam(teamLineIds, [msg], 'service');
  }

  revalidatePath("/sales/requirements");
  revalidatePath("/service/estimations");
  
  return { success: true };
}

async function generateBoqNumber(): Promise<string> {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
  );
  
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `BOQ-${year}${month}-`;

  const highestBoq = await prisma.customerRequirement.findFirst({
    where: {
      boqNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      boqNumber: 'desc',
    },
  });

  let nextSequence = 1;
  if (highestBoq && highestBoq.boqNumber) {
    const sequencePart = highestBoq.boqNumber.replace(prefix, '');
    const currentSequence = parseInt(sequencePart, 10);
    if (!isNaN(currentSequence)) {
      nextSequence = currentSequence + 1;
    }
  }

  return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
}

export async function submitEstimation(
  requirementId: string,
  data: { estimatedPrice: number; estimationNote: string },
  servicePersonName: string
) {
  const boqNumber = await generateBoqNumber();
  const techUser = await prisma.user.findFirst({ where: { fullName: servicePersonName } });
  const userId = techUser?.id;

  const req = await prisma.customerRequirement.update({
    where: { id: requirementId },
    data: {
      estimationStatus: "ESTIMATED",
      estimatedPrice: data.estimatedPrice,
      estimationNote: data.estimationNote,
      estimatedBy: servicePersonName,
      estimatedByUserId: userId,
      estimatedAt: new Date(),
      boqNumber: boqNumber,
    },
  });

  if (userId) {
    await checkAndAwardServiceGold(userId);
  }

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

export async function assignEstimation(
  requirementId: string,
  assignedToUserId: string,
  assignedToName: string,
  dueDate: Date,
  assignedBy: string
) {
  const req = await prisma.customerRequirement.update({
    where: { id: requirementId },
    data: {
      assignedTo: assignedToName,
      assignedToUserId: assignedToUserId,
      estimationDueDate: dueDate,
    },
  });

  // Items extraction for message
  const items = [];
  const fd = req.formData as any;
  if (fd["สินค้า_INVERTER"]) items.push("Inverter");
  if (fd["สินค้า_MDB"]) items.push("MDB");
  if (fd["สินค้า_DB"]) items.push("DB");
  if (fd["สินค้า_CONTROL"]) items.push("Control");

  const msg = estimationAssignedMessage(
    req.companyName,
    items,
    dueDate,
    assignedBy,
    req.id
  );

  // Notify the assigned Service Engineer
  const assignedLineId = await getLineUserIdByCrmUserId(assignedToUserId);
  if (assignedLineId) {
    await pushLineMessage(assignedLineId, [msg], 'service');
  }

  revalidatePath("/service/estimations");
  
  return { success: true };
}
