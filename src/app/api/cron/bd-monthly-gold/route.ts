import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateBDMonthlyGold } from '@/app/actions/coins';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Determine the month and year. We run this at the end of the month, so current month is the target.
    // If run on the 1st of the next month, we might need to target the previous month.
    // Let's use the current date and subtract a day to be safe (if cron runs at midnight on the 1st).
    const now = new Date();
    // Go back 1 day just in case it runs at 00:00 on the 1st
    now.setDate(now.getDate() - 1); 
    const month = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();

    // Find all BD users
    const bdUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'business development', mode: 'insensitive' } },
          { role: { contains: 'bd', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    for (const user of bdUsers) {
      const res = await evaluateBDMonthlyGold(user.id, month, year);
      results.push({ user: user.fullName, result: res });
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running BD monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
