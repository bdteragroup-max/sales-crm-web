import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateAccountingMonthlyGold } from '@/app/actions/coins';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Determine the month and year for the previous month (if run on 1st of month)
    const now = new Date();
    now.setDate(now.getDate() - 1); 
    const month = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();

    // Find all active Accounting users
    const acctUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'accounting', mode: 'insensitive' } },
          { role: { contains: 'บัญชี', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];
    for (const user of acctUsers) {
      const res = await evaluateAccountingMonthlyGold(user.id, month, year);
      results.push({ user: user.fullName, result: res });
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Accounting monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
