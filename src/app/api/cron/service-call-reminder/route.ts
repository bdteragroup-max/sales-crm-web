import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all cases needing follow-up
    const casesToNotify = await prisma.serviceCallLog.findMany({
      where: {
        followUpDate: { lte: today },
        status: { not: "System running smoothly" },
        OR: [
          { followUpNotifiedAt: null },
          { followUpNotifiedAt: { lt: today } }
        ]
      },
      include: {
        responsible: true
      }
    });

    if (casesToNotify.length === 0) {
      return NextResponse.json({ message: "No cases to notify" });
    }

    const now = new Date();
    const notifications = [];

    for (const log of casesToNotify) {
      if (!log.responsibleId) continue;
      
      notifications.push({
        userId: log.responsibleId,
        title: "แจ้งเตือนติดตามผล Service Call",
        message: `เคส ${log.caseNumber} ถึงกำหนดติดตามผลลูกค้า: ${log.companyName}`,
        type: "SERVICE_CALL_REMINDER",
        linkUrl: `/service/calls/${log.id}`,
        isRead: false,
        createdAt: now,
      });
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    // Update followUpNotifiedAt
    await prisma.serviceCallLog.updateMany({
      where: { id: { in: casesToNotify.map(c => c.id) } },
      data: { followUpNotifiedAt: now }
    });

    return NextResponse.json({ 
      message: `Sent ${notifications.length} notifications`,
      cases: casesToNotify.map(c => c.caseNumber)
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
