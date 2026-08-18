"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const serviceCallSchema = z.object({
  receivedDate: z.string().or(z.date()),
  companyName: z.string().min(1, "Company Name is required"),
  contactName: z.string().min(1, "Contact Name is required"),
  contactPhone: z.string().optional().nullable(),
  inverterModel: z.string().min(1, "Inverter Model is required"),
  reportedIssue: z.string().min(1, "Reported Issue is required"),
  responsibleId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const serviceCallUpdateSchema = z.object({
  status: z.string().optional(),
  analyzedCause: z.string().optional().nullable(),
  recommendedSolution: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createServiceCallLog(data: z.infer<typeof serviceCallSchema>) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  // Generate SV-YYYYMMDD-NNN
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  const latestCall = await prisma.serviceCallLog.findFirst({
    where: {
      caseNumber: {
        startsWith: `SV-${dateStr}-`,
      },
    },
    orderBy: {
      caseNumber: "desc",
    },
  });

  let nextNum = 1;
  if (latestCall) {
    const parts = latestCall.caseNumber.split("-");
    if (parts.length === 3) {
      nextNum = parseInt(parts[2], 10) + 1;
    }
  }
  const caseNumber = `SV-${dateStr}-${String(nextNum).padStart(3, "0")}`;

  const validated = serviceCallSchema.parse(data);

  const result = await prisma.serviceCallLog.create({
    data: {
      caseNumber,
      receivedDate: new Date(validated.receivedDate),
      companyName: validated.companyName,
      contactName: validated.contactName,
      contactPhone: validated.contactPhone,
      inverterModel: validated.inverterModel,
      reportedIssue: validated.reportedIssue,
      responsibleId: validated.responsibleId,
      notes: validated.notes,
      createdBy: user.id,
      status: "Received notification",
    }
  });

  revalidatePath('/service/calls');
  revalidatePath('/service-mgr/calls');
  return result;
}

export async function getServiceCallLogs(filters?: { status?: string, responsibleId?: string }) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const where: any = {};
  if (filters?.status && filters.status !== "ALL") where.status = filters.status;
  if (filters?.responsibleId && filters.responsibleId !== "ALL") where.responsibleId = filters.responsibleId;

  const logs = await prisma.serviceCallLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      responsible: { select: { fullName: true } },
      creator: { select: { fullName: true } },
    }
  });
  return logs;
}

export async function getServiceCallLogById(id: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const log = await prisma.serviceCallLog.findUnique({
    where: { id },
    include: {
      responsible: { select: { fullName: true, id: true } },
      creator: { select: { fullName: true, id: true } },
    }
  });

  if (!log) throw new Error("Not found");
  return log;
}

export async function updateServiceCallLog(id: string, data: z.infer<typeof serviceCallUpdateSchema>) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await prisma.serviceCallLog.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  if (user.role === "Service" && existing.responsibleId !== user.id && existing.createdBy !== user.id) {
    throw new Error("You can only edit cases assigned to you");
  }

  const validated = serviceCallUpdateSchema.parse(data);
  const result = await prisma.serviceCallLog.update({
    where: { id },
    data: {
      ...validated,
      followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : null,
    }
  });

  revalidatePath(`/service/calls/${id}`);
  revalidatePath('/service/calls');
  revalidatePath('/service-mgr/calls');
  return result;
}

export async function getServiceCallDashboardStats() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const allLogs = await prisma.serviceCallLog.findMany({ select: { status: true } });
  
  let openCount = 0;
  let closedCount = 0;
  
  for (const log of allLogs) {
    const isClosed = log.status?.includes('smoothly') || 
                     log.status?.includes('Customer has not yet made changes') || 
                     log.status?.includes('ปกติ') || 
                     log.status?.includes('ปิดเคส') || 
                     log.status?.includes('ระบบเดินได้เรียบร้อย') || 
                     log.status?.includes('ลูกค้ายังไม่แก้ไข');
                     
    if (isClosed) {
      closedCount++;
    } else {
      openCount++;
    }
  }
  
  const totalCount = allLogs.length;

  return { openCount, closedCount, totalCount };
}

export async function importServiceCallsPreview(records: any[]) {
  const user = await getUser();
  if (!user || (user.role !== "Service Engineer MGR" && user.role !== "Service Engineer MGR." && user.role !== "SUPER_ADMIN")) throw new Error("Unauthorized");

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true }
  });

  const results = records.map(record => {
    let matchedUser = null;
    const respName = record.responsibleName ? String(record.responsibleName).trim() : null;
    
    if (respName) {
      matchedUser = users.find(u => 
        u.fullName.toLowerCase().includes(respName.toLowerCase()) || 
        respName.toLowerCase().includes(u.fullName.toLowerCase())
      );
    }

    return {
      ...record,
      matchedUserId: matchedUser?.id || null,
      matchedUserName: matchedUser?.fullName || null
    };
  });

  return results;
}

export async function importServiceCallsCommit(records: any[]) {
  const user = await getUser();
  if (!user || (user.role !== "Service Engineer MGR" && user.role !== "Service Engineer MGR." && user.role !== "SUPER_ADMIN")) throw new Error("Unauthorized");

  // Filter out any records that are already imported by sequence no (legacyNo) to prevent duplicates
  const legacyNos = records.map(r => Number(r.legacyNo)).filter(n => !isNaN(n));
  const existing = await prisma.serviceCallLog.findMany({
    where: { legacyNo: { in: legacyNos } },
    select: { legacyNo: true }
  });
  const existingSet = new Set(existing.map(e => e.legacyNo));

  const toImport = records.filter(r => !existingSet.has(Number(r.legacyNo)));

  if (toImport.length === 0) return { count: 0 };

  // Note: createMany might fail if caseNumber is not unique, so we'll generate caseNumbers
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  const latestCall = await prisma.serviceCallLog.findFirst({
    where: { caseNumber: { startsWith: `SV-${dateStr}-` } },
    orderBy: { caseNumber: "desc" },
  });

  let nextNum = 1;
  if (latestCall) {
    const parts = latestCall.caseNumber.split("-");
    if (parts.length === 3) nextNum = parseInt(parts[2], 10) + 1;
  }

  const dataToInsert = toImport.map((r, idx) => {
    const caseNumber = `SV-${dateStr}-${String(nextNum + idx).padStart(3, "0")}`;
    
    // Convert dates
    let receivedDate = new Date();
    if (r.receivedDate) {
      const parsed = new Date(r.receivedDate);
      if (!isNaN(parsed.getTime())) receivedDate = parsed;
    }
    
    // Status normalization
    const isClosed = r.status?.includes("ปกติ") || r.status === "System running smoothly";
    
    return {
      caseNumber,
      legacyNo: Number(r.legacyNo) || null,
      receivedDate,
      companyName: r.companyName || "Unknown",
      contactName: r.contactName || "Unknown",
      contactPhone: r.contactPhone || null,
      inverterModel: r.inverterModel || "Unknown",
      reportedIssue: r.reportedIssue || "Unknown",
      analyzedCause: r.analyzedCause || null,
      recommendedSolution: r.recommendedSolution || null,
      status: r.status || "Received notification",
      responsibleId: r.matchedUserId || null,
      responsibleName: r.responsibleName || null,
      notes: r.notes || null,
      createdBy: user.id,
      // If it's closed in the past, no need to follow up
      followUpDate: isClosed ? null : null, 
    };
  });

  const result = await prisma.serviceCallLog.createMany({
    data: dataToInsert,
    skipDuplicates: true
  });

  revalidatePath('/service/calls');
  revalidatePath('/service-mgr/calls');
  
  return result;
}

export async function getServiceUsers() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  return await prisma.user.findMany({
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: 'asc' }
  });
}
