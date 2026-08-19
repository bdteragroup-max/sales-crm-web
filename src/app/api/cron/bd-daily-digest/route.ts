import { NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { pushLineMessage, bdDailyDigestMessage } from "@/app/lib/lineNotify";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Fetch Department Config
    const config = await prisma.departmentLineConfig.findUnique({
      where: { department: "BD" }
    });

    if (!config || !config.isActive || !config.lineGroupId) {
      return NextResponse.json({ message: "BD Department LINE config not found or inactive." });
    }

    // 2. Duplicate Guard: Check lastDigestSentAt (Thai time day comparison)
    const now = new Date();
    
    if (config.lastDigestSentAt) {
      // Convert to Thai time (UTC+7) manually
      const lastSentTh = new Date(config.lastDigestSentAt.getTime() + 7 * 60 * 60 * 1000);
      const nowTh = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      
      if (
        lastSentTh.getUTCFullYear() === nowTh.getUTCFullYear() &&
        lastSentTh.getUTCMonth() === nowTh.getUTCMonth() &&
        lastSentTh.getUTCDate() === nowTh.getUTCDate()
      ) {
        return NextResponse.json({ message: "Digest already sent today.", skipped: true });
      }
    }

    // 3. Gather Statistics
    const thaiMidnight = new Date(now);
    thaiMidnight.setUTCHours(thaiMidnight.getUTCHours() + 7); // Shift to Thai time
    thaiMidnight.setUTCHours(0, 0, 0, 0); // Thai midnight
    thaiMidnight.setUTCHours(thaiMidnight.getUTCHours() - 7); // Shift back to UTC

    // Tickets
    const newTickets = await prisma.supportTicket.count({
      where: { createdAt: { gte: thaiMidnight } }
    });

    const closedTickets = await prisma.supportTicket.count({
      where: { 
        status: { in: ["RESOLVED", "CLOSED"] },
        updatedAt: { gte: thaiMidnight } 
      }
    });

    const openTicketsHigh = await prisma.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] }, urgency: { in: ["HIGH", "CRITICAL"] } } });
    const openTicketsMed = await prisma.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] }, urgency: "MEDIUM" } });
    const openTicketsLow = await prisma.supportTicket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] }, urgency: "LOW" } });

    // BD Projects/Tasks
    const tasksCompleted = await prisma.bDTask.count({
      where: { 
        status: "COMPLETED",
        updatedAt: { gte: thaiMidnight }
      }
    });

    const tasksBlocked = await prisma.bDTask.findMany({
      where: { 
        status: "BLOCKED",
      },
      select: { name: true, blockedReason: true }
    });

    const tasksOverdue = await prisma.bDTask.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: now }
      },
      select: { name: true }
    });

    // 4. Send Message
    const thDateStr = new Date(now.getTime() + 7 * 60 * 60 * 1000).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const digestData = {
      date: thDateStr,
      newTickets,
      closedTickets,
      openTicketsHigh,
      openTicketsMed,
      openTicketsLow,
      tasksCompleted,
      tasksBlocked,
      tasksOverdue
    };

    const message = bdDailyDigestMessage(digestData);
    await pushLineMessage(config.lineGroupId, [message], 'crm');

    // 5. Update lastDigestSentAt
    await prisma.departmentLineConfig.update({
      where: { id: config.id },
      data: { lastDigestSentAt: now }
    });

    return NextResponse.json({ success: true, digestData });

  } catch (error) {
    console.error("BD Daily Digest Cron Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
