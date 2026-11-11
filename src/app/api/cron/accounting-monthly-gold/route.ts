import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateAccountingMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

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
