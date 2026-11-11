import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateMarketingStaffMonthlyGold, evaluateMarketingManagerMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    // Find all active users with marketing roles
    const marketingUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'marketing', mode: 'insensitive' } },
          { role: { contains: 'การตลาด', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];

    for (const user of marketingUsers) {
      const roleLower = (user.role || '').toLowerCase();

      const isManager = roleLower.includes('manager') ||
                        roleLower.includes('ผู้จัดการ') ||
                        user.role === 'Admin';

      if (isManager) {
        const res = await evaluateMarketingManagerMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Manager', result: res });
      } else {
        const res = await evaluateMarketingStaffMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Staff', result: res });
      }
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Marketing monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
