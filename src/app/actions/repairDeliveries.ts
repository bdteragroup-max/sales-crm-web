"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { notifyUsers } from "@/app/lib/pushNotification";

let repairDeliveryExtendedInitialized = false;

export async function ensureRepairDeliveryExtendedSchema() {
  if (repairDeliveryExtendedInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "RepairDelivery"
        ADD COLUMN IF NOT EXISTS "photosBefore" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "photosAfter" JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "comments" TEXT,
        ADD COLUMN IF NOT EXISTS "salespersonId" TEXT,
        ADD COLUMN IF NOT EXISTS "signedCompletedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "salesAckStatus" TEXT DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "salesAckAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "salesAckById" TEXT,
        ADD COLUMN IF NOT EXISTS "salesAckByName" TEXT,
        ADD COLUMN IF NOT EXISTS "salesAckNote" TEXT,
        ADD COLUMN IF NOT EXISTS "accountingSentAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "accountingStatus" TEXT DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "accountingAckAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "accountingAckById" TEXT,
        ADD COLUMN IF NOT EXISTS "accountingAckByName" TEXT,
        ADD COLUMN IF NOT EXISTS "accountingInvoiceNo" TEXT,
        ADD COLUMN IF NOT EXISTS "accountingNote" TEXT;
    `);
    repairDeliveryExtendedInitialized = true;
  } catch (err) {
    console.warn("[RepairDelivery] Schema check warning:", err);
  }
}

async function resolveDeliverySalesperson(input: {
  id?: string;
  salespersonId?: string | null;
  sender?: string | null;
  quotationNo?: string | null;
  jobId?: string | null;
}): Promise<{ id: string | null; fullName: string | null }> {
  try {
    if (input.salespersonId) {
      const u = await prisma.user.findUnique({
        where: { id: input.salespersonId },
        select: { id: true, fullName: true },
      });
      if (u) return { id: u.id, fullName: u.fullName };
    }

    if (input.quotationNo) {
      const q = await prisma.quotation.findFirst({
        where: { quotationNumber: input.quotationNo.trim() },
        select: {
          salespersonId: true,
          salesperson: { select: { fullName: true } },
        },
      });
      if (q?.salespersonId) {
        return {
          id: q.salespersonId,
          fullName: q.salesperson?.fullName || input.sender || null,
        };
      }
    }

    if (input.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
        include: {
          quotation: {
            select: {
              salespersonId: true,
              salesperson: { select: { fullName: true } },
            },
          },
        },
      });
      if (job?.quotation?.salespersonId) {
        return {
          id: job.quotation.salespersonId,
          fullName:
            job.quotation.salesperson?.fullName ||
            job.sellerName ||
            input.sender ||
            null,
        };
      }
    }

    if (input.id) {
      const scRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "assignedSalesId", "assignedSalesName" FROM "ServiceCallLog" WHERE "linkedDeliveryId" = $1 LIMIT 1`,
        input.id
      );
      if (scRows[0]?.assignedSalesId) {
        return {
          id: scRows[0].assignedSalesId,
          fullName: scRows[0].assignedSalesName || input.sender || null,
        };
      }
    }

    if (input.sender && input.sender.trim()) {
      const u = await prisma.user.findFirst({
        where: {
          fullName: { equals: input.sender.trim(), mode: "insensitive" },
        },
        select: { id: true, fullName: true },
      });
      if (u) return { id: u.id, fullName: u.fullName };
    }
  } catch (err) {
    console.warn("[resolveDeliverySalesperson] warning:", err);
  }
  return { id: null, fullName: input.sender || null };
}

async function handleDeliverySignedNotification(deliveryId: string, extraSalespersonId?: string | null) {
  try {
    await ensureRepairDeliveryExtendedSchema();
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "RepairDelivery" WHERE "id" = $1 LIMIT 1`,
      deliveryId
    );
    const d = rows[0];
    if (!d) return;

    const hasSigned = Boolean(
      (d.sigSenderUrl && d.sigReceiverUrl) ||
        ((d.sigSenderUrl || d.sigReceiverUrl) && d.status === "Completed")
    );
    if (!hasSigned) return;

    const resolved = await resolveDeliverySalesperson({
      id: deliveryId,
      salespersonId: extraSalespersonId || d.salespersonId,
      sender: d.sender,
      quotationNo: d.quotationNo,
      jobId: d.jobId,
    });

    const nextSalespersonId = resolved.id || d.salespersonId || null;
    const nextSenderName = resolved.fullName || d.sender || null;
    const nextSignedAt = d.signedCompletedAt ? new Date(d.signedCompletedAt) : new Date();
    const nextAckStatus = d.salesAckStatus === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : "PENDING";

    await prisma.$executeRawUnsafe(
      `UPDATE "RepairDelivery"
         SET "salespersonId" = $1,
             "sender" = COALESCE($2, "sender"),
             "signedCompletedAt" = $3,
             "salesAckStatus" = $4
       WHERE "id" = $5`,
      nextSalespersonId,
      nextSenderName,
      nextSignedAt,
      nextAckStatus,
      deliveryId
    );

    if (nextSalespersonId) {
      await notifyUsers([nextSalespersonId], {
        title: `ใบส่งมอบงานเซ็นครบแล้ว (${d.deliveryNumber})`,
        body: `ลูกค้า ${d.company || d.customer || "-"} และเซอร์วิสเซ็นส่งมอบงานเรียบร้อยแล้ว กรุณาเปิดตรวจสอบและกดรับทราบ`,
        url: `/sales/delivery-acknowledgements?deliveryId=${deliveryId}`,
        category: "REPAIR_DELIVERY_SIGNED",
      });
    }
  } catch (err) {
    console.warn("[handleDeliverySignedNotification] warning:", err);
  }
}

function getBkkBeYear() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return (now.getFullYear() + 543).toString().slice(-2);
}

// Manually or Automatically created
export async function createRepairDelivery(jobId?: string, autoData?: any) {
  try {
    const session = await getUser();
    
    let prefill = { ...autoData };

    if (jobId && !autoData) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { quotation: true }
      });
      if (job) {
        // Find company manually since relation isn't explicitly defined in Prisma schema
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

    const beYear = getBkkBeYear();
    
    // Fetch all records for the current year to find the true maximum number
    const allRecords = await prisma.repairDelivery.findMany({
      where: { deliveryNumber: { startsWith: `DN${beYear}-` } },
      select: { deliveryNumber: true },
    });
    
    let maxNumber = 0;
    for (const record of allRecords) {
      if (record.deliveryNumber) {
        const parts = record.deliveryNumber.split('-');
        if (parts.length >= 2) {
          // Parse the last part as integer
          const numStr = parts[parts.length - 1];
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    let nextNumber = maxNumber + 1;
    let newDelivery = null;
    let attempts = 0;
    let deliveryNumber = "";

    await ensureRepairDeliveryExtendedSchema();
    const {
      photosBefore,
      photosAfter,
      comments,
      salespersonId,
      signedCompletedAt,
      salesAckStatus,
      ...corePrefill
    } = prefill;

    while (!newDelivery && attempts < 10) {
      deliveryNumber = `DN${beYear}-${String(nextNumber).padStart(4, "0")}`;
      try {
        newDelivery = await prisma.repairDelivery.create({
          data: {
            deliveryNumber,
            deliveryDate: new Date(),
            status: prefill?.status || (prefill?.sigReceiverUrl ? "Completed" : "Draft"),
            ...corePrefill,
          } as any,
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint failed, try the next number
          nextNumber++;
          attempts++;
        } else {
          throw error;
        }
      }
    }

    if (!newDelivery) {
      throw new Error("Failed to generate a unique delivery number after multiple attempts.");
    }

    if (
      photosBefore !== undefined ||
      photosAfter !== undefined ||
      comments !== undefined ||
      salespersonId !== undefined
    ) {
      await prisma.$executeRawUnsafe(
        `UPDATE "RepairDelivery"
           SET "photosBefore" = $1::jsonb,
               "photosAfter" = $2::jsonb,
               "comments" = $3,
               "salespersonId" = COALESCE($4, "salespersonId")
         WHERE "id" = $5`,
        JSON.stringify(photosBefore || []),
        JSON.stringify(photosAfter || []),
        comments || "",
        salespersonId || null,
        newDelivery.id
      );
    }

    await handleDeliverySignedNotification(newDelivery.id, salespersonId);

    revalidatePath("/repair-deliveries");
    revalidatePath("/sales/delivery-acknowledgements");
    return { success: true, repairDeliveryId: newDelivery.id };
  } catch (error: any) {
    console.error("Failed to create delivery note:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRepairDelivery(id: string, data: any) {
  try {
    await ensureRepairDeliveryExtendedSchema();
    const {
      photosBefore,
      photosAfter,
      comments,
      salespersonId,
      signedCompletedAt,
      salesAckStatus,
      salesAckAt,
      salesAckById,
      salesAckByName,
      salesAckNote,
      ...coreData
    } = data;

    await prisma.repairDelivery.update({
      where: { id },
      data: coreData,
    });

    if (photosBefore !== undefined || photosAfter !== undefined || comments !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "RepairDelivery" SET "photosBefore" = $1::jsonb, "photosAfter" = $2::jsonb, "comments" = $3 WHERE "id" = $4`,
        JSON.stringify(photosBefore || []),
        JSON.stringify(photosAfter || []),
        comments ?? "",
        id
      );
    }

    if (salespersonId !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "RepairDelivery" SET "salespersonId" = $1 WHERE "id" = $2`,
        salespersonId || null,
        id
      );
    }

    await handleDeliverySignedNotification(id, salespersonId);

    revalidatePath("/repair-deliveries");
    revalidatePath(`/repair-deliveries/${id}`);
    revalidatePath("/sales/delivery-acknowledgements");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update delivery note:", error);
    return { success: false, error: error.message };
  }
}

export async function getRepairDeliveries(filters?: any) {
  try {
    await ensureRepairDeliveryExtendedSchema();
    const data = await prisma.repairDelivery.findMany({
      where: filters,
      include: {
        job: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (data.length > 0) {
      const extRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          "id",
          "photosBefore",
          "photosAfter",
          "comments",
          "salespersonId",
          "signedCompletedAt",
          "salesAckStatus",
          "salesAckAt",
          "salesAckById",
          "salesAckByName",
          "salesAckNote",
          "accountingSentAt",
          "accountingStatus",
          "accountingAckAt",
          "accountingAckById",
          "accountingAckByName",
          "accountingInvoiceNo",
          "accountingNote"
        FROM "RepairDelivery"
      `);
      const extMap = new Map(extRows.map((r) => [r.id, r]));
      const enriched = data.map((d) => ({
        ...d,
        ...(extMap.get(d.id) || {}),
      }));
      return { success: true, data: enriched };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to get delivery notes:", error);
    return { success: false, error: error.message };
  }
}

export async function getSignedDeliveriesForSales(
  userId?: string,
  userFullName?: string,
  isManagerOrAdmin?: boolean
) {
  try {
    await ensureRepairDeliveryExtendedSchema();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        r.*
      FROM "RepairDelivery" r
      WHERE (r."sigSenderUrl" IS NOT NULL AND r."sigReceiverUrl" IS NOT NULL)
         OR ((r."sigSenderUrl" IS NOT NULL OR r."sigReceiverUrl" IS NOT NULL) AND r."status" = 'Completed')
      ORDER BY
        CASE WHEN COALESCE(r."salesAckStatus", 'PENDING') = 'PENDING' THEN 0 ELSE 1 END ASC,
        r."signedCompletedAt" DESC NULLS LAST,
        r."updatedAt" DESC
      LIMIT 150
    `);

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const normalized = rows.map((r) => ({
      ...r,
      photosBefore: parseJsonArray(r.photosBefore),
      photosAfter: parseJsonArray(r.photosAfter),
      salesAckStatus: r.salesAckStatus || "PENDING",
    }));

    if (isManagerOrAdmin || !userId) {
      return normalized;
    }

    const cleanName = (userFullName || "").trim().toLowerCase();
    return normalized.filter((r) => {
      if (r.salespersonId === userId) return true;
      if (cleanName && (r.sender || "").trim().toLowerCase() === cleanName) return true;
      if (!r.salespersonId && !r.sender) return true;
      return false;
    });
  } catch (err) {
    console.warn("[getSignedDeliveriesForSales] warning:", err);
    return [];
  }
}

export async function acknowledgeRepairDelivery(
  deliveryId: string,
  note?: string
) {
  try {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    await ensureRepairDeliveryExtendedSchema();
    await prisma.$executeRawUnsafe(
      `UPDATE "RepairDelivery"
         SET "salesAckStatus" = 'ACKNOWLEDGED',
             "salesAckAt" = NOW(),
             "salesAckById" = $1,
             "salesAckByName" = $2,
             "salesAckNote" = $3,
             "accountingSentAt" = COALESCE("accountingSentAt", NOW()),
             "accountingStatus" = COALESCE("accountingStatus", 'PENDING')
       WHERE "id" = $4`,
      user.id,
      user.fullName,
      note?.trim() || null,
      deliveryId
    );

    // Notify Accounting / Finance users
    try {
      const dRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "deliveryNumber", "company", "customer", "quotationNo" FROM "RepairDelivery" WHERE "id" = $1 LIMIT 1`,
        deliveryId
      );
      const d = dRows[0];
      const accountingUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { contains: "accounting", mode: "insensitive" } },
            { role: { contains: "บัญชี", mode: "insensitive" } },
            { role: { contains: "finance", mode: "insensitive" } },
            { role: { contains: "การเงิน", mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const accountingIds = accountingUsers.map((u) => u.id);
      if (accountingIds.length > 0 && d) {
        await notifyUsers(accountingIds, {
          title: `รับเอกสารส่งมอบงานจากเซลล์ (${d.deliveryNumber})`,
          body: `เซลล์ (${user.fullName}) ยืนยันรับทราบการส่งมอบงานลูกค้า ${
            d.company || d.customer || "-"
          }${d.quotationNo ? ` (QT: ${d.quotationNo})` : ""} แล้ว กรุณาตรวจสอบเพื่อดำเนินการทางบัญชี`,
          url: `/accounting/delivery-handovers?deliveryId=${deliveryId}`,
          category: "DELIVERY_TO_ACCOUNTING",
        });
      }
    } catch (notifyErr) {
      console.warn("[acknowledgeRepairDelivery] Accounting notify warning:", notifyErr);
    }

    revalidatePath("/sales/delivery-acknowledgements");
    revalidatePath("/accounting/delivery-handovers");
    revalidatePath("/repair-deliveries");
    return {
      success: true,
      salesAckStatus: "ACKNOWLEDGED",
      salesAckByName: user.fullName,
      salesAckAt: new Date().toISOString(),
      salesAckNote: note?.trim() || null,
      accountingStatus: "PENDING",
      accountingSentAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[acknowledgeRepairDelivery] error:", err);
    return { success: false, error: err?.message || "ไม่สามารถบันทึกรับทราบได้" };
  }
}

export async function getAccountingDeliveryHandovers() {
  try {
    await ensureRepairDeliveryExtendedSchema();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        r.*
      FROM "RepairDelivery" r
      WHERE r."salesAckStatus" = 'ACKNOWLEDGED'
      ORDER BY
        CASE WHEN COALESCE(r."accountingStatus", 'PENDING') = 'PENDING' THEN 0 ELSE 1 END ASC,
        r."accountingSentAt" DESC NULLS LAST,
        r."salesAckAt" DESC NULLS LAST,
        r."updatedAt" DESC
      LIMIT 200
    `);

    if (rows.length === 0) return [];

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    // Enrich with linked Quotations & ServiceCallLogs
    const quotationNos = Array.from(
      new Set(rows.map((r) => (r.quotationNo || "").trim()).filter(Boolean))
    );
    const deliveryIds = rows.map((r) => r.id);

    const [quotations, serviceCalls] = await Promise.all([
      quotationNos.length > 0
        ? prisma.quotation.findMany({
            where: { quotationNumber: { in: quotationNos } },
            select: {
              id: true,
              quotationNumber: true,
              subject: true,
              totalAmountBeforeVat: true,
              actualClosingAmount: true,
              poNumber: true,
              status: true,
              salesperson: { select: { fullName: true } },
              jobs: {
                select: {
                  id: true,
                  jobNumber: true,
                  paymentMethod: true,
                  creditTerms: true,
                },
                take: 1,
              },
            },
          })
        : Promise.resolve([]),
      deliveryIds.length > 0
        ? prisma
            .$queryRawUnsafe(
              `SELECT
                 "id",
                 "caseNumber",
                 "inverterModel",
                 "serialNumber",
                 "reportedIssue",
                 "analyzedCause",
                 "recommendedSolution",
                 "onsiteResult",
                 "partsUsed",
                 "linkedDeliveryId",
                 "linkedQuotationId",
                 "linkedQuotationNo"
               FROM "ServiceCallLog"
               WHERE "linkedDeliveryId" = ANY($1::text[])`,
              deliveryIds
            )
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const quotationMap = new Map(
      (quotations as any[]).map((q) => [q.quotationNumber, q])
    );
    const serviceCallMap = new Map(
      (serviceCalls as any[]).map((sc) => [
        sc.linkedDeliveryId,
        {
          ...sc,
          partsUsed: parseJsonArray(sc.partsUsed),
        },
      ])
    );

    return rows.map((r) => {
      const linkedQt = r.quotationNo
        ? quotationMap.get(String(r.quotationNo).trim()) || null
        : null;
      const linkedSc = serviceCallMap.get(r.id) || null;
      return {
        ...r,
        photosBefore: parseJsonArray(r.photosBefore),
        photosAfter: parseJsonArray(r.photosAfter),
        accountingStatus: r.accountingStatus || "PENDING",
        linkedQuotation: linkedQt,
        linkedServiceCall: linkedSc,
      };
    });
  } catch (err) {
    console.warn("[getAccountingDeliveryHandovers] warning:", err);
    return [];
  }
}

export async function confirmAccountingDeliveryHandover(
  deliveryId: string,
  payload: {
    invoiceNo?: string;
    note?: string;
    status?: "PENDING" | "BILLED";
  }
) {
  try {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    await ensureRepairDeliveryExtendedSchema();
    const nextStatus = payload.status || "BILLED";
    const cleanInvoice = payload.invoiceNo?.trim() || null;
    const cleanNote = payload.note?.trim() || null;

    await prisma.$executeRawUnsafe(
      `UPDATE "RepairDelivery"
         SET "accountingStatus" = $1,
             "accountingAckAt" = NOW(),
             "accountingAckById" = $2,
             "accountingAckByName" = $3,
             "accountingInvoiceNo" = $4,
             "accountingNote" = $5
       WHERE "id" = $6`,
      nextStatus,
      user.id,
      user.fullName,
      cleanInvoice,
      cleanNote,
      deliveryId
    );

    // Notify the salesperson back that Accounting has processed / billed the delivery
    try {
      const dRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "deliveryNumber", "company", "customer", "salespersonId", "salesAckById" FROM "RepairDelivery" WHERE "id" = $1 LIMIT 1`,
        deliveryId
      );
      const d = dRows[0];
      const targetSalesIds = Array.from(
        new Set([d?.salespersonId, d?.salesAckById].filter(Boolean))
      ) as string[];
      if (targetSalesIds.length > 0 && d && nextStatus === "BILLED") {
        await notifyUsers(targetSalesIds, {
          title: `ฝ่ายบัญชีรับเอกสาร/วางบิลแล้ว (${d.deliveryNumber})`,
          body: `ลูกค้า ${d.company || d.customer || "-"}${
            cleanInvoice ? ` • เลขที่บิล/ใบแจ้งหนี้: ${cleanInvoice}` : ""
          } ดำเนินการโดย ${user.fullName}`,
          url: `/sales/delivery-acknowledgements?deliveryId=${deliveryId}`,
          category: "ACCOUNTING_DELIVERY_BILLED",
        });
      }
    } catch (notifyErr) {
      console.warn("[confirmAccountingDeliveryHandover] Sales notify warning:", notifyErr);
    }

    revalidatePath("/accounting/delivery-handovers");
    revalidatePath("/sales/delivery-acknowledgements");
    revalidatePath("/repair-deliveries");
    return {
      success: true,
      accountingStatus: nextStatus,
      accountingAckByName: user.fullName,
      accountingAckAt: new Date().toISOString(),
      accountingInvoiceNo: cleanInvoice,
      accountingNote: cleanNote,
    };
  } catch (err: any) {
    console.error("[confirmAccountingDeliveryHandover] error:", err);
    return {
      success: false,
      error: err?.message || "ไม่สามารถบันทึกข้อมูลทางบัญชีได้",
    };
  }
}

export async function getPendingAccountingDeliveryCount(): Promise<number> {
  try {
    await ensureRepairDeliveryExtendedSchema();
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int AS cnt
      FROM "RepairDelivery"
      WHERE "salesAckStatus" = 'ACKNOWLEDGED'
        AND COALESCE("accountingStatus", 'PENDING') = 'PENDING'
    `);
    return Number(rows[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

export async function getPendingSalesDeliveryAckCount(): Promise<number> {
  try {
    const user = await getUser();
    if (!user) return 0;
    const roleStr = (user.role || "").toLowerCase();
    const isSuperOrMgr =
      user.role === "SUPER_ADMIN" ||
      user.role === "ผู้จัดการ" ||
      roleStr.includes("manager") ||
      roleStr.includes("ผู้จัดการ");
    const items = await getSignedDeliveriesForSales(
      user.id,
      user.fullName,
      isSuperOrMgr
    );
    return items.filter((i) => i.salesAckStatus !== "ACKNOWLEDGED").length;
  } catch {
    return 0;
  }
}

export async function deleteRepairDelivery(id: string) {
  try {
    await prisma.repairDelivery.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete delivery note:", error);
    return { success: false, error: error.message };
  }
}

export async function searchSalespeople(query: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        fullName: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        employeeSale: { select: { position: true, nickname: true } },
      },
      take: 10,
      orderBy: { fullName: "asc" },
    });
    return { success: true, data: users };
  } catch (error: any) {
    console.error("Failed to search salespeople:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getPendingRepairDeliveryCount() {
  try {
    return await prisma.repairDelivery.count({
      where: {
        status: "Draft"
      }
    });
  } catch (error) {
    console.error("Failed to get pending repair delivery count:", error);
    return 0;
  }
}

export async function searchCompaniesForDelivery(query: string) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const cleanDigits = q.replace(/\D/g, "");
  const isPhoneQuery = cleanDigits.length >= 3;

  try {
    const searchConditions: any[] = [
      {
        companyName: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        contacts: {
          some: {
            OR: [
              {
                contactName: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                mobilePhone: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              ...(isPhoneQuery
                ? [
                    {
                      mobilePhone: {
                        contains: cleanDigits,
                        mode: "insensitive",
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      },
    ];

    const companies = await prisma.company.findMany({
      where: {
        OR: searchConditions,
      },
      include: {
        assignedUser: { select: { fullName: true } },
        contacts: {
          select: {
            id: true,
            contactName: true,
            position: true,
            mobilePhone: true,
          },
        },
      },
      take: 10,
    });

    return companies;
  } catch (error) {
    console.error("Error searching companies for delivery:", error);
    return [];
  }
}
