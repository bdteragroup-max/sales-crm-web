import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { sendPushToUser } from '@/app/lib/pushNotification';

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.headers.get('Authorization')?.replace('Bearer ', '');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    // Assuming cron runs every 15 minutes, we look for appointments starting between 60 and 75 minutes from now.
    const in60Minutes = new Date(now.getTime() + 60 * 60 * 1000);
    const in75Minutes = new Date(now.getTime() + 75 * 60 * 1000);

    const upcomingSchedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: in60Minutes,
          lt: in75Minutes,
        },
        status: 'Planned', // assuming 'Planned' is the status for upcoming schedules
      },
    });

    let notifiedCount = 0;

    for (const schedule of upcomingSchedules) {
      if (!schedule.userId) continue;

      // Ensure we don't send duplicate notifications by checking if one exists recently (within an hour)
      // `sendPushToUser` does rate limiting, but we can also just call it.
      await sendPushToUser(schedule.userId, {
        title: 'แจ้งเตือนนัดหมายล่วงหน้า 1 ชั่วโมง',
        body: `คุณมีนัดหมาย: ${schedule.title || 'ไม่ระบุชื่อนัดหมาย'} ในอีก 1 ชั่วโมง`,
        url: '/schedule',
        category: 'APPOINTMENT_REMINDER',
      });
      notifiedCount++;
    }

    return NextResponse.json({ success: true, notified: notifiedCount });
  } catch (error: any) {
    console.error('Error in appointment reminder cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
