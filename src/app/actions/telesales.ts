"use server";

import prisma from "@/app/lib/db";
import { getUser } from "@/app/lib/dal";
import { revalidatePath } from "next/cache";
import { checkAndAwardDailyCallCoins } from "@/app/actions/coins";

export async function getCompanyFullHistory(companyId: string) {
  const history = await prisma.telesale.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });
  
  const contacts = await prisma.contact.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  return {
    history: JSON.parse(JSON.stringify(history)),
    contacts: JSON.parse(JSON.stringify(contacts)),
    company: JSON.parse(JSON.stringify(company)),
  };
}

export async function saveTelesaleData(formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyName = formData.get("companyName") as string;
    if (!companyName) {
      return { success: false, error: "ชื่อบริษัทเป็นสิ่งจำเป็น (Company Name is required)" };
    }

    const callDateRaw = formData.get("callDate") as string;
    const callStatus = formData.get("callStatus") as string;
    const callOutcome = formData.get("callOutcome") as string;
    const branch = formData.get("branch") as string;
    const contactPerson = formData.get("contactPerson") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const customerType = formData.get("customerType") as string;
    const customerStatus = formData.get("customerStatus") as string;
    const forwardTo = formData.get("forwardTo") as string;
    const conversationSummary = formData.get("conversationSummary") as string;

    const needsOrProblems = formData.get("needsOrProblems") as string;
    const meetingObjective = formData.get("meetingObjective") as string;

    const competitorName = formData.get("competitorName") as string;
    const competitorPrice = parseFloat(formData.get("competitorPrice") as string) || null;
    const competitorPromotion = formData.get("competitorPromotion") as string;

    const lastMeetingDateRaw = formData.get("lastMeetingDate") as string;
    const callbackAtRaw = formData.get("callbackAt") as string;
    const visitDateRaw = formData.get("visitDate") as string;
    const resultArr = formData.getAll("result"); // Multiple checkboxes
    const result = resultArr.length > 0 ? resultArr.join(", ") : null;

    const parseDate = (d?: string) => {
      if (!d) return null;
      if (d.includes('T')) {
        return new Date(`${d}:00+07:00`);
      }
      return new Date(`${d}T00:00:00+07:00`);
    };

    const callbackTime = parseDate(callbackAtRaw);
    if (callbackTime) {
      const fifteenMinsBefore = new Date(callbackTime.getTime() - 15 * 60000);
      const fifteenMinsAfter = new Date(callbackTime.getTime() + 15 * 60000);
      
      const overlapping = await prisma.telesale.findFirst({
        where: {
          userId: user.id,
          callbackAt: {
            gte: fifteenMinsBefore,
            lte: fifteenMinsAfter
          }
        }
      });

      if (overlapping && overlapping.callbackAt) {
        return { success: false, error: `มีคิวโทรกลับซ้อนทับในช่วงเวลานี้แล้ว (${overlapping.callbackAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)` };
      }
    }

    // Upsert company
    let company = await prisma.company.findFirst({
      where: { companyName },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName,
          customerType,
          customerStatus,
        },
      });
    } else {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          customerType: customerType || company.customerType,
          customerStatus: customerStatus || company.customerStatus,
        },
      });
    }

    const finalContactPerson = contactPerson || (phoneNumber ? companyName : "");
    let contact = null;
    if (finalContactPerson) {
      contact = await prisma.contact.findFirst({
        where: {
          companyId: company.id,
          contactName: finalContactPerson,
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            contactName: finalContactPerson,
            mobilePhone: phoneNumber || null,
          },
        });
      } else if (phoneNumber) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { mobilePhone: phoneNumber },
        });
      }
    }

    // Create Telesale Record
    const telesale = await prisma.telesale.create({
      data: {
        companyId: company.id,
        userId: user.id,
        callDate: parseDate(callDateRaw),
        callStatus,
        callOutcome,
        forwardTo,
        conversationSummary,
        needsOrProblems,
        meetingObjective,
        competitorName,
        competitorPrice,
        competitorPromotion,
        lastMeetingDate: parseDate(lastMeetingDateRaw),
        callbackAt: parseDate(callbackAtRaw),
        visitDate: parseDate(visitDateRaw),
        result,
      },
    });

    const visitDate = parseDate(visitDateRaw);
    if (visitDate) {
      await prisma.schedule.upsert({
        where: { telesaleId: telesale.id },
        create: {
          userId: user.id,
          companyId: company.id,
          title: `นัดหมายเข้าพบลูกค้า: ${companyName}`,
          description: `วัตถุประสงค์: ${meetingObjective || "-"}\n${needsOrProblems ? `สิ่งที่ลูกค้าต้องการ: ${needsOrProblems}` : ""}`,
          date: visitDate,
          status: "Planned",
          telesaleId: telesale.id,
        },
        update: {
          userId: user.id,
          companyId: company.id,
          title: `นัดหมายเข้าพบลูกค้า: ${companyName}`,
          description: `วัตถุประสงค์: ${meetingObjective || "-"}\n${needsOrProblems ? `สิ่งที่ลูกค้าต้องการ: ${needsOrProblems}` : ""}`,
          date: visitDate,
        }
      });
    }

    const marketingLeadId = formData.get("marketingLeadId") as string;
    if (marketingLeadId) {
      await (prisma as any).marketingLead.update({
        where: { id: marketingLeadId },
        data: {
          assignedTo: { connect: { id: user.id } },
        }
      });
      await prisma.$executeRaw`UPDATE "MarketingLead" SET "isContacted" = true WHERE id = ${marketingLeadId}`;
      revalidatePath("/marketing");
      revalidatePath("/marketing/[id]", "page");
      revalidatePath("/sales/leads");
    }

    await checkAndAwardDailyCallCoins(user.id);

    revalidatePath("/telesales");
    return { success: true };
  } catch (error) {
    console.error("Telesale Save Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

export async function updateTelesaleData(id: string, formData: FormData) {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const companyName = formData.get("companyName") as string;
    if (!companyName) {
      return { success: false, error: "ชื่อบริษัทเป็นสิ่งจำเป็น" };
    }

    const callDateRaw = formData.get("callDate") as string;
    const callStatus = formData.get("callStatus") as string;
    const callOutcome = formData.get("callOutcome") as string;
    const contactPerson = formData.get("contactPerson") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const customerType = formData.get("customerType") as string;
    const customerStatus = formData.get("customerStatus") as string;
    const forwardTo = formData.get("forwardTo") as string;
    const conversationSummary = formData.get("conversationSummary") as string;
    const needsOrProblems = formData.get("needsOrProblems") as string;
    const meetingObjective = formData.get("meetingObjective") as string;
    const competitorName = formData.get("competitorName") as string;
    const competitorPrice = parseFloat(formData.get("competitorPrice") as string) || null;
    const competitorPromotion = formData.get("competitorPromotion") as string;
    const lastMeetingDateRaw = formData.get("lastMeetingDate") as string;
    const callbackAtRaw = formData.get("callbackAt") as string;
    const visitDateRaw = formData.get("visitDate") as string;
    const resultArr = formData.getAll("result");
    const result = resultArr.length > 0 ? resultArr.join(", ") : null;

    const parseDate = (d?: string) => {
      if (!d) return null;
      if (d.includes('T')) {
        return new Date(`${d}:00+07:00`);
      }
      return new Date(`${d}T00:00:00+07:00`);
    };

    const callbackTime = parseDate(callbackAtRaw);
    if (callbackTime) {
      const fifteenMinsBefore = new Date(callbackTime.getTime() - 15 * 60000);
      const fifteenMinsAfter = new Date(callbackTime.getTime() + 15 * 60000);
      
      const overlapping = await prisma.telesale.findFirst({
        where: {
          userId: user.id,
          id: { not: id },
          callbackAt: {
            gte: fifteenMinsBefore,
            lte: fifteenMinsAfter
          }
        }
      });

      if (overlapping && overlapping.callbackAt) {
        return { success: false, error: `มีคิวโทรกลับซ้อนทับในช่วงเวลานี้แล้ว (${overlapping.callbackAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)` };
      }
    }

    // Find company
    let company = await prisma.company.findFirst({
      where: { companyName },
    });

    if (!company) {
      company = await prisma.company.create({
        data: { companyName, customerType, customerStatus },
      });
    } else {
      await prisma.company.update({
        where: { id: company.id },
        data: { customerType, customerStatus },
      });
    }

    const finalContactPerson = contactPerson || (phoneNumber ? companyName : "");
    if (finalContactPerson) {
      let contact = await prisma.contact.findFirst({
        where: {
          companyId: company.id,
          contactName: finalContactPerson,
        },
      });

      if (!contact) {
        await prisma.contact.create({
          data: {
            companyId: company.id,
            contactName: finalContactPerson,
            mobilePhone: phoneNumber || null,
          },
        });
      } else if (phoneNumber) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { mobilePhone: phoneNumber },
        });
      }
    }

    const telesale = await prisma.telesale.update({
      where: { id },
      data: {
        companyId: company.id,
        callDate: parseDate(callDateRaw),
        callStatus,
        callOutcome,
        forwardTo,
        conversationSummary,
        needsOrProblems,
        meetingObjective,
        competitorName,
        competitorPrice,
        competitorPromotion,
        lastMeetingDate: parseDate(lastMeetingDateRaw),
        callbackAt: parseDate(callbackAtRaw),
        visitDate: parseDate(visitDateRaw),
        result,
      },
    });

    const visitDate = parseDate(visitDateRaw);
    if (visitDate) {
      await prisma.schedule.upsert({
        where: { telesaleId: telesale.id },
        create: {
          userId: user.id,
          companyId: company.id,
          title: `นัดหมายเข้าพบลูกค้า: ${companyName}`,
          description: `วัตถุประสงค์: ${meetingObjective || "-"}\n${needsOrProblems ? `สิ่งที่ลูกค้าต้องการ: ${needsOrProblems}` : ""}`,
          date: visitDate,
          status: "Planned",
          telesaleId: telesale.id,
        },
        update: {
          userId: user.id,
          companyId: company.id,
          title: `นัดหมายเข้าพบลูกค้า: ${companyName}`,
          description: `วัตถุประสงค์: ${meetingObjective || "-"}\n${needsOrProblems ? `สิ่งที่ลูกค้าต้องการ: ${needsOrProblems}` : ""}`,
          date: visitDate,
        }
      });
    } else {
      await prisma.schedule.deleteMany({
        where: { telesaleId: telesale.id }
      });
    }

    const marketingLeadId = formData.get("marketingLeadId") as string;
    if (marketingLeadId) {
      await (prisma as any).marketingLead.update({
        where: { id: marketingLeadId },
        data: {
          assignedTo: { connect: { id: user.id } },
        }
      });
      await prisma.$executeRaw`UPDATE "MarketingLead" SET "isContacted" = true WHERE id = ${marketingLeadId}`;
      revalidatePath("/marketing");
      revalidatePath("/marketing/[id]", "page");
      revalidatePath("/sales/leads");
    }

    revalidatePath("/telesales");
    return { success: true };
  } catch (error) {
    console.error("Telesale Update Error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" };
  }
}
