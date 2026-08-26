import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluatePurchasingMonthlyGold } from '@/app/actions/coins';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    now.setDate(now.getDate() - 1); // Go back 1 day just in case it runs at 00:00 on the 1st
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Find all users with purchasing/procurement roles
    const purchasingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'purchasing', mode: 'insensitive' } },
          { role: { contains: 'procurement', mode: 'insensitive' } },
          { role: { contains: 'จัดซื้อ', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    
    for (const user of purchasingUsers) {
      const res = await evaluatePurchasingMonthlyGold(user.id, month, year);
      results.push({ user: user.fullName, result: res });
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Purchasing monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
