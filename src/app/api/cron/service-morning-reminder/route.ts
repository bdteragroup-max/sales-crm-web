import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getServiceManagerLineIds, pushLineMessageToTeam, morningScheduleMessage } from '@/app/lib/lineNotify';

export async function GET(request: Request) {
  try {
    // Get start and end of today in BKK time
    const now = new Date();
    const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    // Create Date objects for midnight today and midnight tomorrow
    const startOfToday = new Date(bkkTime);
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(bkkTime);
    endOfToday.setHours(23, 59, 59, 999);

    // Fetch all InstallationOrders scheduled for today
    const orders = await prisma.installationOrder.findMany({
      where: {
        installationDate: {
          gte: startOfToday,
          lte: endOfToday,
        }
      },
      include: {
        job: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const teamLineIds = await getServiceManagerLineIds();
    if (teamLineIds.length === 0) {
      return NextResponse.json({ message: 'No Service Team found' }, { status: 404 });
    }

    const dateString = bkkTime.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const msg = morningScheduleMessage(orders, dateString);
    await pushLineMessageToTeam(teamLineIds, [msg], 'service');

    return NextResponse.json({ success: true, count: orders.length });
  } catch (error) {
    console.error('Error in service morning reminder cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
