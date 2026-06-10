"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";

export async function getTelesaleLogContext(contactId: string, companyId: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  // 1. Fetch contact and company details
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { company: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // 2. Fetch last 5 telesales history logs for this company
  const history = await prisma.telesale.findMany({
    where: { companyId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  // 3. Fetch latest quotation for this company
  const latestQuotation = await prisma.quotation.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  // 4. Fetch all active sales representatives
  const activeReps = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });

  return {
    contact: JSON.parse(JSON.stringify(contact)),
    history: JSON.parse(JSON.stringify(history)),
    latestQuotation: JSON.parse(JSON.stringify(latestQuotation)),
    activeReps: JSON.parse(JSON.stringify(activeReps)),
  };
}

export async function checkDuplicatePhoneNumber(phone: string, excludeContactId: string) {
  const currentUser = await getUser();
  if (!currentUser) {
    return { duplicate: false };
  }

  const trimmedPhone = (phone || "").trim();
  if (!trimmedPhone) return { duplicate: false };

  const matchedContact = await prisma.contact.findFirst({
    where: {
      mobilePhone: trimmedPhone,
      id: { not: excludeContactId },
    },
    include: { company: true },
  });

  if (matchedContact) {
    return {
      duplicate: true,
      contactName: matchedContact.contactName,
      companyName: matchedContact.company.companyName,
    };
  }

  return { duplicate: false };
}

export async function saveTelesaleLog(data: {
  contactId: string;
  companyId: string;
  telesaleId?: string;
  callStatus: string;
  callOutcome: string;
  conversationSummary?: string;
  callbackAt?: string;
  forwardTo?: string;
  contactName: string;
  mobilePhone: string;
}) {
  const currentUser = await getUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const parseDate = (d?: string) => {
      if (!d) return null;
      if (d.includes('T')) {
        return new Date(`${d}:00+07:00`);
      }
      return new Date(`${d}T00:00:00+07:00`);
    };

    // 1. Create a Telesale log entry
    let outcomeSummary = data.callOutcome;
    if (data.callStatus !== "รับสาย") {
      outcomeSummary = data.callStatus;
    }

    const operations: any[] = [
      prisma.telesale.create({
        data: {
          companyId: data.companyId,
          userId: currentUser.id,
          callDate: new Date(),
          callStatus: data.callStatus,
          callOutcome: data.callStatus === "รับสาย" ? data.callOutcome : null,
          conversationSummary: data.callStatus === "รับสาย" ? data.conversationSummary : `สายโทรแบบ: ${data.callStatus}`,
          callbackAt: data.callbackAt ? parseDate(data.callbackAt) : null,
          forwardTo: data.callStatus === "รับสาย" ? data.forwardTo : null,
          result: outcomeSummary,
        },
      }),
      prisma.company.update({
        where: { id: data.companyId },
        data: { updatedAt: new Date() }
      })
    ];

    // If resolving an existing callback, mark it as resolved
    if (data.telesaleId) {
      operations.push(
        prisma.telesale.update({
          where: { id: data.telesaleId },
          data: { 
            callbackAt: null, 
            result: `โทรกลับแล้ว - ${outcomeSummary}`
          }
        })
      );
    }

    await prisma.$transaction(operations);

    // 2. Update the Contact row if name or phone changed in the form
    await prisma.contact.update({
      where: { id: data.contactId },
      data: {
        contactName: data.contactName.trim(),
        mobilePhone: data.mobilePhone.trim(),
      },
    });

    // 3. Perform revalidation
    revalidatePath("/clients");
    revalidatePath("/telesales");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error saving telesale log:", error);
    return { success: false, error: "ไม่สามารถบันทึกประวัติการโทรได้" };
  }
}
