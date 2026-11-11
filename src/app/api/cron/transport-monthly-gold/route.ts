import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { evaluateTransportStaffMonthlyGold, evaluateLogisticsManagerMonthlyGold } from '@/app/actions/coins';
import { isAuthorizedCronRequest, getTargetPreviousMonthBangkok } from '@/app/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { month, year } = getTargetPreviousMonthBangkok(request);

    // Find all active users with transport/logistics roles
    const transportUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { contains: 'logistics', mode: 'insensitive' } },
          { role: { contains: 'shipping', mode: 'insensitive' } },
          { role: { contains: 'transport', mode: 'insensitive' } },
          { role: { contains: 'จัดส่ง', mode: 'insensitive' } },
          { role: { contains: 'ขนส่ง', mode: 'insensitive' } }
        ],
        employeeId: { not: '' }
      }
    });

    const results = [];

    for (const user of transportUsers) {
      const roleLower = (user.role || '').toLowerCase();

      const isManager = roleLower.includes('manager') ||
                        roleLower.includes('ผู้จัดการ') ||
                        roleLower.includes('หัวหน้า') ||
                        user.role === 'Admin';

      if (isManager) {
        const res = await evaluateLogisticsManagerMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Manager', result: res });
      } else {
        const res = await evaluateTransportStaffMonthlyGold(user.id, month, year);
        results.push({ user: user.fullName, role: 'Staff', result: res });
      }
    }

    return NextResponse.json({ success: true, month, year, results });
  } catch (error) {
    console.error('Error running Transport monthly gold cron:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
