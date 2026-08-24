import prisma from "@/app/lib/db";
import { NextResponse } from "next/server";
import { sendPushToUser } from "@/app/lib/pushNotification";

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
    const pushPromises = [];

    for (const log of casesToNotify) {
      if (!log.responsibleId) continue;
      
      pushPromises.push(
        sendPushToUser(log.responsibleId, {
          title: "แจ้งเตือนติดตามผล Service Call",
          body: `เคส ${log.caseNumber} ถึงกำหนดติดตามผลลูกค้า: ${log.companyName}`,
          category: "SERVICE_CALL_REMINDER",
          url: `/service/calls/${log.id}`
        })
      );
    }

    if (pushPromises.length > 0) {
      await Promise.all(pushPromises);
    }

    // Update followUpNotifiedAt
    await prisma.serviceCallLog.updateMany({
      where: { id: { in: casesToNotify.map(c => c.id) } },
      data: { followUpNotifiedAt: now }
    });

    return NextResponse.json({ 
      message: `Sent ${pushPromises.length} notifications`,
      cases: casesToNotify.map(c => c.caseNumber)
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
