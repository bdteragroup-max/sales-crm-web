import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateBDMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    // Find all BD users (role or position containing business development or bd)
    const bdUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'business development', mode: 'insensitive' } },
          { role: { contains: 'bd', mode: 'insensitive' } },
          { position: { contains: 'business development', mode: 'insensitive' } },
          { position: { contains: 'bd', mode: 'insensitive' } }
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
