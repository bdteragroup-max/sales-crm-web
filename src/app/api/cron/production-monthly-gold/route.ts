import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateProductionManagerMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    const productionManagers = await prisma.user.findMany({
      where: {
        isActive: true,
        employeeId: { not: '' },
        AND: [
          {
            OR: [
              { role: { contains: 'ผลิต', mode: 'insensitive' } },
              { role: { contains: 'production', mode: 'insensitive' } },
              { role: { contains: 'โรงงาน', mode: 'insensitive' } }
            ]
          },
          {
            OR: [
              { role: { contains: 'manager', mode: 'insensitive' } },
              { role: { contains: 'mgr', mode: 'insensitive' } },
              { role: { contains: 'ผู้จัดการ', mode: 'insensitive' } },
              { role: { contains: 'หัวหน้า', mode: 'insensitive' } }
            ]
          }
        ]
      }
    });

    const results = [];
    for (const user of productionManagers) {
      const res = await evaluateProductionManagerMonthlyGold(user.id, month, year);
      results.push({ user: user.fullName, result: res });
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Production Manager monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

