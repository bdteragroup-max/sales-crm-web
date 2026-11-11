import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluatePurchasingMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    // Find all active users with purchasing/procurement roles or positions
    const purchasingUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'purchasing', mode: 'insensitive' } },
          { role: { contains: 'procurement', mode: 'insensitive' } },
          { role: { contains: 'จัดซื้อ', mode: 'insensitive' } },
          { position: { contains: 'purchasing', mode: 'insensitive' } },
          { position: { contains: 'procurement', mode: 'insensitive' } },
          { position: { contains: 'จัดซื้อ', mode: 'insensitive' } }
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
