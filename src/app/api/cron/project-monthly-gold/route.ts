import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateProjectMemberMonthlyGold, evaluateProjectAdminMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    // Find all active users who are either Project Engineers or Project Admins
    const projectUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'project', mode: 'insensitive' } },
          { role: { contains: 'engineer', mode: 'insensitive' } },
          { role: { contains: 'โปรเจค', mode: 'insensitive' } },
          { role: { contains: 'วิศวกร', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];

    for (const user of projectUsers) {
      const roleLower = (user.role || '').toLowerCase();

      const isProjectAdmin = roleLower.includes('admin project') ||
                             roleLower.includes('project admin') ||
                             roleLower.includes('admin') ||
                             user.role === 'Admin';

      if (isProjectAdmin) {
        const res = await evaluateProjectAdminMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Admin', result: res });
      } else {
        const res = await evaluateProjectMemberMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Engineer/Member', result: res });
      }
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Project monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
